import {
  emailBaseTemplate,
  buttonGreen,
  infoBoxGreen,
} from './base-template';

/**
 * Dados esperados para o email de aprovação do morador
 * ⚠️ ESTE TIPO PRECISA SER EXPORTADO
 */
export interface AprovacaoMoradorData {
  nomeMorador: string;
  condominioNome: string;
  email: string;
  loginUrl: string;
}

/**
 * Template de email - Aprovação de Morador
 */
export const emailAprovacaoMorador = (
  data: AprovacaoMoradorData
): string => {
  const content = `
    <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 24px;">
      Parabéns, ${data.nomeMorador}! 🎉
    </h2>

    <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
      Sua conta foi <strong style="color: #057321;">aprovada e ativada</strong> pelo responsável do condomínio!
    </p>

    <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
      Agora você já pode acessar o sistema e acompanhar suas correspondências.
    </p>

    ${infoBoxGreen(`
      <strong>Seus dados de acesso:</strong><br><br>
      📧 <strong>E-mail:</strong> ${data.email}<br>
      🏢 <strong>Condomínio:</strong> ${data.condominioNome}<br><br>
      <em style="font-size: 13px;">Use a senha que você cadastrou no registro.</em>
    `)}

    <div style="text-align: center;">
      ${buttonGreen('Acessar o Sistema', data.loginUrl)}
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 18px;">
      O que você pode fazer agora:
    </h3>

    <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 15px; line-height: 1.8;">
      <li>✅ Visualizar suas correspondências pendentes</li>
      <li>✅ Acompanhar o histórico de entregas</li>
      <li>✅ Receber notificações por e-mail</li>
      <li>✅ Gerenciar suas encomendas</li>
    </ul>

    <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      Bem-vindo ao APP Correspondência! 🚀
    </p>
  `;

  return emailBaseTemplate(content);
};
