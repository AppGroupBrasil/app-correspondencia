import { emailBaseTemplate, infoBoxGreen, warningBox } from './base-template';

export interface AvisoRapidoData {
  nomeMorador: string;
  condominioNome: string;
  titulo: string;
  mensagem: string;
  dataEnvio: string;
  autor: string; // Quem enviou (Porteiro, Zelador)
  fotoUrl?: string; // Opcional
}

export const emailAvisoRapido = (data: AvisoRapidoData): string => {
  const content = `
    <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 24px;">
      🔔 Novo Aviso: ${data.titulo}
    </h2>

    <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
      Olá, <strong>${data.nomeMorador}</strong>.
    </p>

    <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
      Você recebeu um aviso rápido da administração do <strong>${data.condominioNome}</strong>.
    </p>

    ${infoBoxGreen(`
      <strong>Mensagem:</strong><br><br>
      "${data.mensagem}"
    `)}

    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 14px; color: #555;">
      📅 <strong>Data:</strong> ${data.dataEnvio}<br>
      👤 <strong>Enviado por:</strong> ${data.autor}
    </div>

    ${data.fotoUrl ? `
      <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 13px;">
        📎 <strong>Nota:</strong> Uma foto foi anexada a este e-mail.
      </p>
    ` : ''}
  `;

  return emailBaseTemplate(content);
};