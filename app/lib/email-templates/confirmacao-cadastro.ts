import { emailBaseTemplate, infoBoxGreen, warningBox } from './base-template';

/**
 * Dados esperados para o email de confirmação de cadastro
 * ⚠️ ESTE TIPO PRECISA SER EXPORTADO
 */
export interface ConfirmacaoCadastroData {
  nomeMorador: string;
  condominioNome: string;
  blocoNome: string;
  numeroUnidade: string;
}

/**
 * Template de email - Confirmação de Cadastro
 */
export const emailConfirmacaoCadastro = (
  data: ConfirmacaoCadastroData
): string => {
  const content = `
    <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 24px;">
      Olá, ${data.nomeMorador}! 👋
    </h2>

    <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
      Seu cadastro foi realizado com sucesso no <strong>APP Correspondência</strong>!
    </p>

    ${infoBoxGreen(`
      <strong>Dados cadastrados:</strong><br><br>
      📍 <strong>Condomínio:</strong> ${data.condominioNome}<br>
      🏢 <strong>Bloco:</strong> ${data.blocoNome}<br>
      🚪 <strong>Unidade:</strong> ${data.numeroUnidade}
    `)}

    ${warningBox(`
      Seu cadastro está <strong>aguardando aprovação</strong> do responsável do condomínio.
      Você receberá um e-mail assim que sua conta for aprovada.
    `)}

    <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      Enquanto isso, fique atento ao seu e-mail para não perder a notificação de aprovação.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="margin: 0; color: #9ca3af; font-size: 13px;">
      Se você não solicitou este cadastro, por favor ignore este e-mail.
    </p>
  `;

  return emailBaseTemplate(content);
};
