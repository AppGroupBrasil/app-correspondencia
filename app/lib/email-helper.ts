/**
 * Helper para envio de emails via API
 * Este arquivo NÃO deve importar os templates. Ele apenas dispara a API.
 */

import { buildAuthenticatedJsonHeaders } from '@/app/lib/client-auth';

type EmailTipo = 
  | 'confirmacao-cadastro' 
  | 'aprovacao-morador' 
  | 'nova-correspondencia' 
  | 'recibo-retirada'
  | 'aviso-rapido';

interface EnviarEmailParams {
  destinatario: string;
  tipo: EmailTipo;
  dados: Record<string, any>;
  condominioId?: string;
}

interface EmailResponse {
  success: boolean;
  data?: { emailId?: string };
  error?: string;
}

/**
 * Função base para envio de emails
 */
async function enviarEmail({ destinatario, tipo, dados, condominioId }: EnviarEmailParams): Promise<EmailResponse> {
  try {
    const headers = await buildAuthenticatedJsonHeaders();
    const response = await fetch('/api/email', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        destinatario,
        tipo,
        dados,
        condominioId,
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Email Helper] Erro ao enviar e-mail:', result);
      return { success: false, error: result.error };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('[Email Helper] Erro ao chamar API de e-mail:', error);
    return { success: false, error: 'Erro ao enviar e-mail' };
  }
}

/**
 * Envia email de confirmação de cadastro
 */
export async function enviarConfirmacaoCadastro(
  email: string,
  nomeMorador: string,
  condominioNome: string,
  blocoNome: string,
  numeroUnidade: string,
  condominioId?: string
): Promise<EmailResponse> {
  return enviarEmail({
    destinatario: email,
    tipo: 'confirmacao-cadastro',
    dados: {
      nomeMorador,
      condominioNome,
      blocoNome,
      numeroUnidade
    },
    condominioId,
  });
}

/**
 * Envia email de aprovação de morador
 */
export async function enviarAprovacaoMorador(
  email: string,
  nomeMorador: string,
  condominioNome: string,
  condominioId?: string
): Promise<EmailResponse> {
  const baseUrl = globalThis.window === undefined ? '' : globalThis.window.location.origin;
  return enviarEmail({
    destinatario: email,
    tipo: 'aprovacao-morador',
    dados: {
      nomeMorador,
      condominioNome,
      email,
      loginUrl: `${baseUrl}/login`
    },
    condominioId,
  });
}

/**
 * Envia email de nova correspondência
 */
export async function enviarNovaCorrespondencia(
  email: string,
  nomeMorador: string,
  tipoCorrespondencia: string,
  dataChegada: string,
  horaChegada: string,
  condominioNome: string,
  blocoNome: string,
  numeroUnidade: string,
  localRetirada?: string,
  condominioId?: string
): Promise<EmailResponse> {
  const baseUrl = globalThis.window === undefined ? '' : globalThis.window.location.origin;
  return enviarEmail({
    destinatario: email,
    tipo: 'nova-correspondencia',
    dados: {
      nomeMorador,
      tipoCorrespondencia,
      dataChegada,
      horaChegada,
      condominioNome,
      blocoNome,
      numeroUnidade,
      localRetirada: localRetirada || 'Portaria do condomínio',
      dashboardUrl: `${baseUrl}/dashboard-morador`
    },
    condominioId,
  });
}

/**
 * Envia email de recibo de retirada
 */
export async function enviarReciboRetirada(
  email: string,
  nomeMorador: string,
  tipoCorrespondencia: string,
  dataRetirada: string,
  horaRetirada: string,
  quemRetirou: string,
  responsavelEntrega: string,
  condominioNome: string,
  condominioId?: string
): Promise<EmailResponse> {
  return enviarEmail({
    destinatario: email,
    tipo: 'recibo-retirada',
    dados: {
      nomeMorador,
      tipoCorrespondencia,
      dataRetirada,
      horaRetirada,
      quemRetirou,
      responsavelEntrega,
      condominioNome
    },
    condominioId,
  });
}

/**
 * Envia email de aviso rápido
 */
export async function enviarAvisoRapido(
  email: string,
  titulo: string,
  mensagem: string,
  condominioNome: string,
  fotoUrl?: string,
  condominioId?: string
): Promise<EmailResponse> {
  return enviarEmail({
    destinatario: email,
    tipo: 'aviso-rapido',
    dados: {
      titulo,
      mensagem,
      condominioNome,
      fotoUrl
    },
    condominioId,
  });
}
