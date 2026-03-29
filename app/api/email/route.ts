import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { ensureSameCondominio, RequestAuthError, requireRequestAuth } from '@/app/lib/server-auth';

export const dynamic = 'force-dynamic';

const EMAIL_RATE_LIMIT_WINDOW_MS = 60_000;
const EMAIL_RATE_LIMIT_MAX_REQUESTS = 10;
const emailRateLimit = new Map<string, { count: number; resetAt: number }>();

// Templates
import { emailConfirmacaoCadastro, ConfirmacaoCadastroData } from '../../lib/email-templates/confirmacao-cadastro';
import { emailAprovacaoMorador, AprovacaoMoradorData } from '../../lib/email-templates/aprovacao-morador';
import { emailNovaCorrespondencia, NovaCorrespondenciaData } from '../../lib/email-templates/nova-correspondencia';
import { emailReciboRetirada, ReciboRetiradaData } from '../../lib/email-templates/recibo-retirada';
import { emailAvisoRapido, AvisoRapidoData } from '../../lib/email-templates/aviso-rapido';

type EmailRequestBody =
  | { tipo: 'confirmacao-cadastro'; destinatario: string; dados: ConfirmacaoCadastroData; condominioId?: string }
  | { tipo: 'aprovacao-morador'; destinatario: string; dados: AprovacaoMoradorData; condominioId?: string }
  | { tipo: 'nova-correspondencia'; destinatario: string; dados: NovaCorrespondenciaData; condominioId?: string }
  | { tipo: 'recibo-retirada'; destinatario: string; dados: ReciboRetiradaData; condominioId?: string }
  | { tipo: 'aviso-rapido'; destinatario: string; dados: AvisoRapidoData; condominioId?: string };

function getAllowedOrigins(): string[] {
  return [
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3003',
  ].filter((value): value is string => Boolean(value));
}

function isAllowedOrigin(request: NextRequest): boolean {
  const allowedOrigins = getAllowedOrigins();
  const originHeader = request.headers.get('origin');
  const refererHeader = request.headers.get('referer');

  if (originHeader) {
    return allowedOrigins.includes(originHeader);
  }

  if (refererHeader) {
    return allowedOrigins.some((origin) => refererHeader.startsWith(origin));
  }

  return false;
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

  const realIp = request.headers.get('x-real-ip');
  return realIp || 'unknown';
}

function isRateLimited(clientIp: string): boolean {
  const now = Date.now();
  const current = emailRateLimit.get(clientIp);

  if (!current || current.resetAt <= now) {
    emailRateLimit.set(clientIp, {
      count: 1,
      resetAt: now + EMAIL_RATE_LIMIT_WINDOW_MS,
    });
    return false;
  }

  if (current.count >= EMAIL_RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  current.count += 1;
  emailRateLimit.set(clientIp, current);
  return false;
}

function isAllowedAttachmentUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && [
      'firebasestorage.googleapis.com',
      'correspondencia-9a73a.firebasestorage.app',
      'storage.googleapis.com',
    ].includes(parsed.hostname);
  } catch {
    return false;
  }
}

// Inicialização lazy do Resend para evitar erro durante o build
let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY não configurada. Configure no arquivo .env.local');
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export async function POST(request: NextRequest) {
  try {
    const authContext = await requireRequestAuth(request);

    if (!isAllowedOrigin(request)) {
      return NextResponse.json({ error: 'Origem não autorizada' }, { status: 403 });
    }

    const clientIp = getClientIp(request);
    if (isRateLimited(clientIp)) {
      return NextResponse.json({ error: 'Limite de requisições excedido' }, { status: 429 });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Content-Type inválido' }, { status: 415 });
    }

    // Validar configuração de email
    const fromEmail = process.env.EMAIL_FROM;
    if (!fromEmail) {
      return NextResponse.json(
        { error: 'EMAIL_FROM não configurado. Configure no arquivo .env.local' },
        { status: 500 }
      );
    }

    const body = (await request.json()) as EmailRequestBody;
    const { tipo, destinatario, dados, condominioId } = body;

    // Validações
    if (!tipo || !destinatario || !dados) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(destinatario)) {
      return NextResponse.json({ error: 'Email de destino inválido' }, { status: 400 });
    }

    if (tipo === 'confirmacao-cadastro') {
      if (authContext.email.toLowerCase() !== destinatario.toLowerCase()) {
        return NextResponse.json({ error: 'Destinatário incompatível com o usuário autenticado' }, { status: 403 });
      }
    } else if (!['porteiro', 'responsavel', 'admin', 'adminMaster'].includes(authContext.role)) {
      return NextResponse.json({ error: 'Usuário sem permissão para enviar este tipo de email' }, { status: 403 });
    }

    ensureSameCondominio(authContext, condominioId);

    let subject = '';
    let htmlContent = '';
    let attachments: { filename: string; path: string }[] = [];

    switch (tipo) {
      case 'confirmacao-cadastro':
        subject = '✅ Cadastro recebido! Aguardando aprovação';
        htmlContent = emailConfirmacaoCadastro(dados);
        break;

      case 'aprovacao-morador':
        subject = '🎉 Seu acesso foi aprovado!';
        htmlContent = emailAprovacaoMorador(dados);
        break;

      case 'nova-correspondencia':
        subject = '📬 Nova correspondência recebida';
        htmlContent = emailNovaCorrespondencia(dados);
        break;

      case 'recibo-retirada':
        subject = '📋 Comprovante de retirada';
        htmlContent = emailReciboRetirada(dados);
        break;

      case 'aviso-rapido': {
        const avisoDados = dados;
        subject = `🔔 Aviso: ${avisoDados.titulo}`;
        htmlContent = emailAvisoRapido(avisoDados);

        // Se tiver URL da foto, adiciona como anexo
        if (avisoDados.fotoUrl && isAllowedAttachmentUrl(avisoDados.fotoUrl)) {
          attachments = [
            {
              filename: 'foto-aviso.jpg',
              path: avisoDados.fotoUrl,
            },
          ];
        }
        break;
      }

      default:
        return NextResponse.json({ error: 'Tipo de email inválido' }, { status: 400 });
    }

    // Obter instância do Resend
    const resend = getResend();
    const replyToEmail = process.env.EMAIL_REPLY_TO;

    // Envio
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: destinatario,
      replyTo: replyToEmail,
      subject,
      html: htmlContent,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (error) {
      console.error('[Email API] Erro Resend:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[Email API] Email enviado com sucesso: ${data?.id}`);
    return NextResponse.json({ success: true, emailId: data?.id });
  } catch (err: any) {
    if (err instanceof RequestAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    console.error('[Email API] Erro interno:', err);
    return NextResponse.json(
      { error: err.message || 'Erro interno ao enviar email' },
      { status: 500 }
    );
  }
}
