import { emailBaseTemplate, infoBoxGreen } from './base-template';

/**
 * Dados para o email de notificação de novo cadastro (enviado ao admin)
 */
export interface NovoCadastroAdminData {
  nomeUsuario: string;
  emailUsuario: string;
  role: string;
  condominioNome?: string;
  blocoNome?: string;
  unidadeNome?: string;
  whatsapp?: string;
}

const ROLE_LABELS: Record<string, string> = {
  morador: 'Morador',
  responsavel: 'Responsável',
  porteiro: 'Porteiro',
  admin: 'Administrador',
  adminMaster: 'Admin Master',
};

/**
 * Template de email — Notificação de novo cadastro para o administrador
 */
export const emailNovoCadastroAdmin = (data: NovoCadastroAdminData): string => {
  const roleLabel = ROLE_LABELS[data.role] || data.role;

  const detalhes = [
    `👤 <strong>Nome:</strong> ${data.nomeUsuario}`,
    `📧 <strong>Email:</strong> ${data.emailUsuario}`,
    `🏷️ <strong>Tipo:</strong> ${roleLabel}`,
    data.condominioNome ? `🏢 <strong>Condomínio:</strong> ${data.condominioNome}` : '',
    data.blocoNome ? `🔲 <strong>Bloco:</strong> ${data.blocoNome}` : '',
    data.unidadeNome ? `🚪 <strong>Unidade:</strong> ${data.unidadeNome}` : '',
    data.whatsapp ? `📱 <strong>WhatsApp:</strong> ${data.whatsapp}` : '',
  ]
    .filter(Boolean)
    .join('<br>');

  const content = `
    <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 24px;">
      🆕 Novo cadastro no sistema
    </h2>

    <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
      Um novo usuário acabou de se cadastrar no <strong>APP Correspondência</strong>.
    </p>

    ${infoBoxGreen(detalhes)}

    <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      Acesse o painel administrativo para revisar e aprovar este cadastro.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="margin: 0; color: #9ca3af; font-size: 12px;">
      Data/Hora: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
    </p>
  `;

  return emailBaseTemplate(content);
};
