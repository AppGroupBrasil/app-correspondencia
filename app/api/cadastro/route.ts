import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// Receiver do push de cadastro da central (Fase 2 SSO).
// A central (auth-central) empurra alterações do cadastro read-only via
// POST /api/cadastro com header X-Provisioning-Secret e corpo
// { tipo, entidade, acao, condominio_id, dados }. Espelho local: condominios e
// users. Não cria usuários pelo push (moradores entram por SSO); só sincroniza
// existentes; delete desativa (revoga acesso). Idempotente.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const secret = (process.env.WEBHOOK_SECRET || '').trim();
  const enviado = (req.headers.get('x-provisioning-secret') || '').trim();
  if (!secret || enviado !== secret) {
    return NextResponse.json({ erro: 'secret inválido' }, { status: 403 });
  }
  let ev: any;
  try {
    ev = await req.json();
  } catch {
    return NextResponse.json({ erro: 'JSON inválido' }, { status: 400 });
  }
  const d = ev?.dados || {};
  const condId = ev?.condominio_id;
  const admin = createServerClient();
  try {
    if (ev.entidade === 'condominio' && ev.acao === 'upsert') {
      const id = condId || d.id;
      if (id) {
        const nome = d.nome || d.nome_fantasia || d.razao_social || 'Condomínio';
        const { data: ex } = await admin.from('condominios').select('id').eq('id', id).maybeSingle();
        if (ex) await admin.from('condominios').update({ nome }).eq('id', id);
        else await admin.from('condominios').insert({ id, nome, status: 'ativo' });
      }
      return NextResponse.json({ ok: true });
    }
    if (ev.entidade === 'morador' || ev.entidade === 'funcionario') {
      const email = String(d.email || '').toLowerCase().trim();
      if (!email) return NextResponse.json({ ok: true, ignorado: 'sem email' });
      const { data: u } = await admin.from('users').select('id').eq('email', email).maybeSingle();
      if (!u) return NextResponse.json({ ok: true, ignorado: 'usuário ausente' });
      if (ev.acao === 'delete') {
        await admin.from('users').update({ ativo: false }).eq('id', u.id);
        return NextResponse.json({ ok: true });
      }
      const patch: any = { ativo: true };
      if (d.nome) patch.nome = d.nome;
      if (condId) patch.condominio_id = condId;
      await admin.from('users').update(patch).eq('id', u.id);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: true, ignorado: ev.entidade });
  } catch (e: any) {
    return NextResponse.json({ erro: e?.message || 'erro' }, { status: 500 });
  }
}
