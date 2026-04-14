import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase';

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

    // Inserir na tabela users
    const userData = {
      id: uid,
      nome,
      email,
      role,
      condominio_id: finalCondominioId,
      ...normalizedDados,
      criado_em: new Date().toISOString(),
    };

    const { error: dbError } = await supabaseAdmin.from('users').insert(userData);

    if (dbError) {
      console.error('Erro ao inserir user no banco:', dbError);
      // Tenta remover o auth user pra não ficar órfão
      await supabaseAdmin.auth.admin.deleteUser(uid);
      return NextResponse.json({ error: 'Erro ao salvar dados do usuário: ' + dbError.message }, { status: 500 });
    }

    return NextResponse.json({ uid, email, condominioId: finalCondominioId });
  } catch (err: any) {
    console.error('Erro na API criar-usuario:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
