import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/app/lib/supabase';
import { requireRequestAuth, RequestAuthError } from '@/app/lib/server-auth';

export async function POST(req: NextRequest) {
  try {
    try {
      await requireRequestAuth(req, ['adminMaster']);
    } catch (authErr) {
      if (authErr instanceof RequestAuthError) {
        return NextResponse.json({ error: authErr.message }, { status: authErr.status });
      }
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { condominioId, novoEmail } = await req.json();

    if (!condominioId || !novoEmail) {
      return NextResponse.json({ error: 'condominioId e novoEmail são obrigatórios' }, { status: 400 });
    }

    const emailNormalizado = String(novoEmail).trim().toLowerCase();
    const supabase = createServerClient();

    const { data: sindico, error: errSindico } = await supabase
      .from('users')
      .select('id, email')
      .eq('condominio_id', condominioId)
      .eq('role', 'responsavel')
      .limit(1)
      .maybeSingle();

    if (errSindico) throw errSindico;
    if (!sindico) {
      return NextResponse.json({ error: 'Síndico (responsável) não encontrado para este condomínio.' }, { status: 404 });
    }

    const { error: errAuth } = await supabase.auth.admin.updateUserById(sindico.id, {
      email: emailNormalizado,
      email_confirm: true,
    });
    if (errAuth) throw errAuth;

    const { error: errUser } = await supabase
      .from('users')
      .update({ email: emailNormalizado })
      .eq('id', sindico.id);
    if (errUser) throw errUser;

    const { error: errCond } = await supabase
      .from('condominios')
      .update({ email_login: emailNormalizado })
      .eq('id', condominioId);
    if (errCond) throw errCond;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || '';
    const { data: linkData, error: errLink } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: emailNormalizado,
      options: { redirectTo: baseUrl ? `${baseUrl}/login` : undefined },
    });
    if (errLink) throw errLink;

    return NextResponse.json({
      ok: true,
      resetLink: linkData?.properties?.action_link || null,
    });
  } catch (err: any) {
    console.error('Erro em /api/transferir-acesso:', err);
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 });
  }
}
