import { emailBaseTemplate, infoBoxGreen, buttonGreen } from './base-template';

export interface ReciboRetiradaData {
  nomeMorador: string;
  tipoCorrespondencia: string;
  dataRetirada: string;
  horaRetirada: string;
  quemRetirou: string;
  responsavelEntrega: string;
  condominioNome: string;
  assinaturaUrl?: string; // A URL da imagem ou do painel
  protocolo?: string;
  unidade?: string;
  reciboUrl?: string; // PDF do recibo (vai anexado no e-mail)
  // Entrega em lote: os demais protocolos que saíram com a mesma assinatura.
  protocolosJuntos?: string[];
}

export const emailReciboRetirada = (
  data: ReciboRetiradaData
): string => {
  const juntos = (data.protocolosJuntos || []).filter(Boolean);
  const totalItens = juntos.length + 1;
  const content = `
    <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 24px;">
      Comprovante de Retirada 📋
    </h2>

    <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
      Olá, <strong>${data.nomeMorador}</strong>.
    </p>

    <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
      Este e-mail confirma que ${juntos.length > 0
        ? `<strong>${totalItens} correspondências foram retiradas</strong>`
        : 'uma correspondência foi retirada'} na portaria do
      <strong>${data.condominioNome}</strong>.
    </p>

    ${infoBoxGreen(`
      <strong>Detalhes da Retirada:</strong><br><br>
      ${data.protocolo ? `🔖 <strong>Protocolo:</strong> ${data.protocolo}<br>` : ''}
      ${juntos.length > 0
        ? `🔖 <strong>Também retirados:</strong> ${juntos.map((p) => `#${p}`).join(', ')}<br>`
        : ''}
      📦 <strong>Item:</strong> ${juntos.length > 0 ? `${totalItens} correspondências` : data.tipoCorrespondencia}<br>
      ${data.unidade ? `🏢 <strong>Unidade:</strong> ${data.unidade}<br>` : ''}
      📅 <strong>Data:</strong> ${data.dataRetirada}<br>
      🕐 <strong>Hora:</strong> ${data.horaRetirada}<br>
      👤 <strong>Retirado por:</strong> ${data.quemRetirou}<br>
      👮 <strong>Entregue por:</strong> ${data.responsavelEntrega}
    `)}

    ${data.reciboUrl ? `
      <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 1.6;">
        O recibo assinado segue em anexo (PDF).
      </p>
    ` : ''}

    ${/* Aqui entra o botão se houver URL */''}
    ${data.assinaturaUrl ? `
      <div style="text-align: center;">
        ${buttonGreen('Ver Comprovante / Assinatura', data.assinaturaUrl)}
      </div>
    ` : ''}

    <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
      Este registro serve como comprovante digital de entrega finalizada.
    </p>
  `;

  return emailBaseTemplate(content);
};