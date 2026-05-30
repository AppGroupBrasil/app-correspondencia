import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServerClient } from '@/app/lib/supabase';
import { emailNovoCadastroAdmin } from '@/app/lib/email-templates/novo-cadastro-admin';
import { requireRequestAuth, RequestAuthError, type AppRole } from '@/app/lib/server-auth';

// Roles que o cadastro público pode criar (auto-registro de morador/condomínio).
const PUBLIC_ROLES = new Set(['morador', 'responsavel']);
// Roles privilegiados: só podem ser criados por um usuário autenticado com
// permissão suficiente. Mapeia role-alvo -> quem pode criá-lo.
const CREATORS_BY_ROLE: Record<string, AppRole[]> = {
  porteiro: ['responsavel', 'admin', 'adminMaster'],
  admin: ['admin', 'adminMaster'],
  adminMaster: ['adminMaster'],
};
const VALID_ROLES = new Set(['morador', 'responsavel', 'porteiro', 'admin', 'adminMaster']);

function buildNormalizedDados(body: Record<string, any>) {
  const normalizedDados = body.dados ? { ...body.dados } : {};

  if (body.status === undefined) {
    // no-op
  } else {
    normalizedDados.status = body.status;
  }

  if (body.aprovado === undefined) {
    // no-op
  } else {
    normalizedDados.aprovado = body.aprovado;
  }

  if (body.ativo === undefined) {
    // no-op
  } else {
    normalizedDados.ativo = body.ativo;
  }

  if (body.blocoId) {
    normalizedDados.bloco_id = body.blocoId;
  }

  if (body.blocoNome) {
    normalizedDados.bloco_nome = body.blocoNome;
    normalizedDados.bloco = body.blocoNome;
  }

  if (body.unidadeNome || body.unidade) {
    normalizedDados.unidade_nome = body.unidadeNome || body.unidade;
  }

  if (body.apartamento) {
    normalizedDados.apartamento = body.apartamento;
  }

  if (body.whatsapp) {
    normalizedDados.whatsapp = body.whatsapp;
  }

  if (body.telefone) {
    normalizedDados.telefone = body.telefone;
  }

  if (body.perfil) {
    normalizedDados.perfil = body.perfil;
    normalizedDados.perfil_morador = body.perfil;
  }

  return normalizedDados;
}

/**
 * Envia e-mail de notificação ao admin quando há um novo cadastro
 */
async function notificarAdminNovoCadastro(dados: {
  nome: string;
  email: string;
  role: string;
  condominioNome?: string;
  blocoNome?: string;
  unidadeNome?: string;
  whatsapp?: string;
}) {
  const adminEmail = process.env.SMTP_ADMIN_EMAIL;
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;

  if (!adminEmail || !resendKey || !fromEmail) {
    console.warn('[Criar Usuário] SMTP_ADMIN_EMAIL, RESEND_API_KEY ou EMAIL_FROM não configurados. Notificação não enviada.');
    return;
  }

  try {
    const resend = new Resend(resendKey);
    const htmlContent = emailNovoCadastroAdmin({
      nomeUsuario: dados.nome,
      emailUsuario: dados.email,
      role: dados.role,
      condominioNome: dados.condominioNome,
      blocoNome: dados.blocoNome,
      unidadeNome: dados.unidadeNome,
      whatsapp: dados.whatsapp,
    });

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: adminEmail,
      subject: `🆕 Novo cadastro: ${dados.nome} (${dados.role})`,
      html: htmlContent,
    });
    if (error) throw error;
    console.log(`[Criar Usuário] ✅ Notificação enviada para ${adminEmail}`);
  } catch (err) {
    console.error('[Criar Usuário] ⚠️ Falha ao notificar novo cadastro:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      senha,
      nome,
      role,
      condominioId,
      dados,
      condominio,
      status,
      aprovado,
      ativo,
      blocoId,
      blocoNome,
      unidade,
      unidadeNome,
      apartamento,
      whatsapp,
      telefone,
      perfil,
    } = body;

    if (!email || !senha || !role) {
      return NextResponse.json({ error: 'Email, senha e role são obrigatórios' }, { status: 400 });
    }

    if (!VALID_ROLES.has(role)) {
      return NextResponse.json({ error: 'Role inválido' }, { status: 400 });
    }

    // Roles privilegiados exigem token de um usuário com permissão. Os roles
    // públicos (morador/responsavel) seguem liberados para o auto-cadastro.
    if (!PUBLIC_ROLES.has(role)) {
      try {
        await requireRequestAuth(req, CREATORS_BY_ROLE[role]);
      } catch (authErr) {
        if (authErr instanceof RequestAuthError) {
          return NextResponse.json({ error: authErr.message }, { status: authErr.status });
        }
        return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
      }
    }

    const normalizedDados = buildNormalizedDados({
      dados,
      status,
      aprovado,
      ativo,
      blocoId,
      blocoNome,
      unidade,
      unidadeNome,
      apartamento,
      whatsapp,
      telefone,
      perfil,
    });

    const supabaseAdmin = createServerClient();

    // Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    });

    if (authError) {
      const msg = authError.message.includes('already been registered')
        ? 'Este email já está em uso.'
        : authError.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const uid = authData.user.id;

    // Se veio dados de condomínio, criar primeiro (usando service_role que bypassa RLS)
    let finalCondominioId = condominioId || null;
    if (condominio) {
      const { data: condData, error: condError } = await supabaseAdmin
        .from('condominios')
        .insert({
          nome: condominio.nome,
          cnpj: condominio.cnpj || null,
          endereco: condominio.endereco || null,
          logo_url: condominio.logo_url || '',
          status: 'ativo',
          criado_por: uid,
          criado_em: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (condError) {
        console.error('Erro ao criar condomínio:', condError);
        await supabaseAdmin.auth.admin.deleteUser(uid);
        return NextResponse.json({ error: 'Erro ao criar condomínio: ' + condError.message }, { status: 500 });
      }
      finalCondominioId = condData.id;
    }

    // Inserir na tabela users — whitelist de colunas que realmente existem
    // no schema da tabela `users` (ver supabase/schema.sql).
    const USERS_COLUMNS = new Set([
      'telefone', 'whatsapp', 'cpf', 'bloco_id', 'bloco_nome',
      'apartamento', 'unidade_nome', 'foto_url', 'assinatura_padrao',
      'ativo', 'aprovado',
    ]);
    const dadosParaInserir: Record<string, any> = {};
    for (const [k, v] of Object.entries(normalizedDados)) {
      if (USERS_COLUMNS.has(k)) dadosParaInserir[k] = v;
    }
    // numero_unidade do form mapeia para a coluna apartamento
    if (!dadosParaInserir.apartamento && (normalizedDados as any).numero_unidade) {
      dadosParaInserir.apartamento = (normalizedDados as any).numero_unidade;
    }

    const userData = {
      id: uid,
      nome,
      email,
      role,
      condominio_id: finalCondominioId,
      ...dadosParaInserir,
      criado_em: new Date().toISOString(),
    };

    const { error: dbError } = await supabaseAdmin.from('users').insert(userData);

    if (dbError) {
      console.error('Erro ao inserir user no banco:', dbError);
      // Tenta remover o auth user pra não ficar órfão
      await supabaseAdmin.auth.admin.deleteUser(uid);
      return NextResponse.json({ error: 'Erro ao salvar dados do usuário: ' + dbError.message }, { status: 500 });
    }

    // 📧 Notificar admin sobre novo cadastro (não bloqueia resposta)
    notificarAdminNovoCadastro({
      nome: nome || normalizedDados.nome || email,
      email,
      role,
      condominioNome: condominio?.nome || normalizedDados.condominio_nome,
      blocoNome: normalizedDados.bloco_nome,
      unidadeNome: normalizedDados.unidade_nome,
      whatsapp: normalizedDados.whatsapp,
    }).catch(() => {});

    return NextResponse.json({ uid, email, condominioId: finalCondominioId });
  } catch (err: any) {
    console.error('Erro na API criar-usuario:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
