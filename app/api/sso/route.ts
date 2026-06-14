import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createServerClient } from '@/app/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// SSO da central (App Condomínio) — login único.
// A central assina o token com a chave PRIVADA (RS256); aqui só verificamos pela
// pública do JWKS. O hub redireciona p/ ${site}/sso?token=<JWT curto> → a página
// faz POST /api/sso { token } → verifica RS256/JWKS → JIT provisiona usuário+condomínio
// no Supabase (service_role) → gera um magiclink (admin.generateLink) e devolve o
// token_hash. O cliente troca por sessão GoTrue real via supabase.auth.verifyOtp.
// Nada sensível trafega: a verificação é por chave pública e a sessão é nativa do GoTrue.
// ─────────────────────────────────────────────────────────────────────────────

const ISS = 'auth-central';
const AUDIENCE = process.env.SSO_AUDIENCE || 'app-correspondencia';
const JWKS_URL = process.env.SSO_JWKS_URL || 'https://auth.appgroupbrasil.com.br/api/v1/sso/jwks.json';

const JWKS_TTL = 5 * 60 * 1000;
let jwksCache: Map<string, crypto.KeyObject> | null = null;
let jwksCacheAt = 0;

async function carregarJwks(): Promise<Map<string, crypto.KeyObject>> {
  if (jwksCache && Date.now() - jwksCacheAt < JWKS_TTL) return jwksCache;
  const res = await fetch(JWKS_URL, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`JWKS ${res.status}`);
  const body: any = await res.json();
  const chaves = new Map<string, crypto.KeyObject>();
  for (const k of body.keys || []) {
    if (k.kty !== 'RSA') continue;
    chaves.set(k.kid || 'default', crypto.createPublicKey({ key: k, format: 'jwk' }));
  }
  jwksCache = chaves;
  jwksCacheAt = Date.now();
  return chaves;
}

const jsonSeg = (s: string) => JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));

async function verificarSso(token: string): Promise<any> {
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) throw new Error('formato');
  const head = jsonSeg(h);
  const chaves = await carregarJwks();
  const candidatos = head.kid && chaves.has(head.kid) ? [chaves.get(head.kid)!] : [...chaves.values()];
  if (candidatos.length === 0) throw new Error('JWKS sem chave RSA');
  const assinado = new TextEncoder().encode(`${h}.${p}`);
  const sig = new Uint8Array(Buffer.from(s, 'base64url'));
  const ok = candidatos.some((chave) => crypto.verify('RSA-SHA256', assinado, chave, sig));
  if (!ok) throw new Error('assinatura inválida');
  const c = jsonSeg(p);
  const agora = Math.floor(Date.now() / 1000);
  if (c.iss !== ISS) throw new Error('iss inválido');
  if (c.aud !== AUDIENCE) throw new Error('aud inválido');
  if (c.exp && c.exp < agora - 30) throw new Error('token expirado');
  return c;
}

function mapearRole(perfil: string): 'adminMaster' | 'admin' | 'responsavel' | 'porteiro' | 'morador' {
  const r = (perfil || '').toLowerCase();
  if (r === 'master' || r === 'superadmin') return 'adminMaster';
  if (r === 'gestor' || r === 'sindico' || r === 'admin' || r === 'administrador') return 'admin';
  if (r === 'supervisor' || r === 'responsavel') return 'responsavel';
  if (r === 'porteiro' || r === 'funcionario') return 'porteiro';
  return 'morador';
}

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token ausente' }, { status: 400 });
    }

    let c: any;
    try {
      c = await verificarSso(token);
    } catch (err: any) {
      console.warn('[SSO] falha:', err?.message);
      return NextResponse.json({ error: 'SSO inválido' }, { status: 401 });
    }

    const email = String(c.email || '').toLowerCase().trim();
    if (!email) return NextResponse.json({ error: 'SSO sem email' }, { status: 401 });
    const nome = c.nome || email;
    const role = mapearRole(c.perfil);
    const condominioId: string | null = c.condominio_id || null;
    const condominioNome: string = c.condominio_nome || 'Condomínio';

    const admin = createServerClient();

    // Upsert do condomínio pelo id da central (read-only; cria se novo).
    if (condominioId) {
      const { data: existeCond } = await admin.from('condominios').select('id').eq('id', condominioId).maybeSingle();
      if (!existeCond) {
        await admin.from('condominios').insert({ id: condominioId, nome: condominioNome, status: 'ativo' });
      }
    }

    // JIT idempotente por email. users.id = uid do Supabase Auth.
    const { data: perfilExistente } = await admin.from('users').select('id').eq('email', email).maybeSingle();

    if (perfilExistente) {
      await admin
        .from('users')
        .update({ nome, role, ...(condominioId ? { condominio_id: condominioId } : {}), ativo: true, aprovado: true })
        .eq('id', perfilExistente.id);
    } else {
      const senha = crypto.randomBytes(24).toString('hex') + 'Aa1!';
      const { data: novo, error: errAuth } = await admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
      });
      if (errAuth || !novo?.user) {
        console.error('[SSO] createUser falhou:', errAuth?.message);
        return NextResponse.json({ error: 'Falha ao provisionar usuário' }, { status: 500 });
      }
      const uid = novo.user.id;
      const { error: errIns } = await admin.from('users').insert({
        id: uid,
        email,
        nome,
        role,
        condominio_id: condominioId,
        ativo: true,
        aprovado: true,
        criado_em: new Date().toISOString(),
      });
      if (errIns) {
        await admin.auth.admin.deleteUser(uid);
        console.error('[SSO] insert users falhou:', errIns.message);
        return NextResponse.json({ error: 'Falha ao salvar perfil' }, { status: 500 });
      }
    }

    // Sessão nativa do GoTrue: gera magiclink e devolve o token_hash p/ o cliente trocar.
    const { data: link, error: errLink } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    if (errLink || !link?.properties?.hashed_token) {
      console.error('[SSO] generateLink falhou:', errLink?.message);
      return NextResponse.json({ error: 'Falha ao gerar sessão' }, { status: 500 });
    }

    return NextResponse.json({ token_hash: link.properties.hashed_token, email, role });
  } catch (err: any) {
    console.error('[SSO] erro:', err?.message);
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 });
  }
}
