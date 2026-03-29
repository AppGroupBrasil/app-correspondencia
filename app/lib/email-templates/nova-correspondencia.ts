import {
  emailBaseTemplate,
  buttonGreen,
  infoBoxGreen,
  warningBox,
} from './base-template';

/**
 * Dados esperados para o email de nova correspondência
 * ⚠️ ESTE TIPO PRECISA SER EXPORTADO
 */
export interface NovaCorrespondenciaData {
  nomeMorador: string;
  tipoCorrespondencia: string;
  dataChegada: string;
  horaChegada: string;
  condominioNome: string;
  blocoNome: string;
  numeroUnidade: string;
  localRetirada: string;
  dashboardUrl: string;
}

/**
 * Template de email - Nova Correspondência
 */
export const emailNovaCorrespondencia = (
  data: NovaCorrespondenciaData
): string => {
  // Emoji baseado no tipo da correspondência
  const emoji = data.tipoCorrespondencia
    .toLowerCase()
    .includes('encomenda')
    ? '📦'
    : '✉️';

  const content = `
    <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 24px;">
      Olá, ${data.nomeMorador}! ${emoji}
    </h2>

    <p style="margin: 0 0 24px 0; color: #374151; font-size: 18px; line-height: 1.6;">
      <strong style="color: #057321;">Você tem uma nova correspondência!</strong>
    </p>

    ${infoBoxGreen(`
      <strong style="font-size: 16px;">Detalhes da correspondência:</strong><br><br>
      ${emoji} <strong>Tipo:</strong> ${data.tipoCorrespondencia}<br>
      📅 <strong>Data de chegada:</strong> ${data.dataChegada}<br>
      🕐 <strong>Horário:</strong> ${data.horaChegada}<br>
      📍 <strong>Condomínio:</strong> ${data.condominioNome}<br>
      🏢 <strong>Bloco:</strong> ${data.blocoNome}<br>
      🚪 <strong>Unidade:</strong> ${data.numeroUnidade}
    `)}

    ${warningBox(`
      <strong>Local de retirada:</strong> ${data.localRetirada}<br><br>
      Não esqueça de levar um documento com foto para retirar sua correspondência.
    `)}

    <div style="text-align: center;">
      ${buttonGreen('Ver Correspondências', data.dashboardUrl)}
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 18px;">
      📋 Próximos passos:
    </h3>

    <ol style="margin: 0; padding-left: 20px; color: #374151; font-size: 15px; line-height: 1.8;">
      <li>Acesse o sistema para ver mais detalhes</li>
      <li>Dirija-se ao local de retirada</li>
      <li>Apresente um documento com foto</li>
      <li>Retire sua correspondência</li>
    </ol>

    <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
      Obrigado por usar o APP Correspondência! 📬
    </p>
  `;

  return emailBaseTemplate(content);
};
