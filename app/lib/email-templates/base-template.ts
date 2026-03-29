// Template base HTML para e-mails
// Padrão verde do sistema: #057321

export const emailBaseTemplate = (content: string): string => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>APP Correspondência</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          
          <!-- Header Verde -->
          <tr>
            <td style="background-color: #057321; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                📬 APP Correspondência
              </h1>
              <p style="margin: 10px 0 0 0; color: #e0f2e5; font-size: 14px;">
                Sistema de Gestão de Correspondências
              </p>
            </td>
          </tr>

          <!-- Conteúdo Principal -->
          <tr>
            <td style="padding: 40px 30px;">
              ${content}

              <!-- BOX DE INFORMAÇÕES DE ACESSO (ADICIONADO AQUI) -->
              <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 20px; margin-top: 40px; text-align: center;">
                <p style="margin: 0 0 10px 0; color: #1e293b; font-weight: bold; font-size: 15px;">
                  📲 Consulte seus avisos de onde estiver
                </p>
                <p style="margin: 0 0 15px 0; color: #475569; font-size: 14px; line-height: 1.5;">
                  Acesse <a href="https://www.appcorrespondencia.com.br" style="color: #057321; text-decoration: underline; font-weight: bold;" target="_blank">www.appcorrespondencia.com.br</a><br>
                  ou baixe o <strong>App Correspondência</strong> na sua loja de aplicativos.
                </p>
                <div style="background-color: #ffffff; padding: 10px; border-radius: 4px; display: inline-block;">
                  <p style="margin: 0; color: #64748b; font-size: 12px;">
                    🔑 <strong>Dica de Acesso:</strong> Digite seu e-mail e a senha padrão <strong>123456</strong>.<br>
                    <span style="font-style: italic;">(Não esqueça de alterar sua senha após o primeiro acesso)</span>
                  </p>
                </div>
              </div>
              <!-- FIM DO BOX -->

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">
                Este é um e-mail automático. Por favor, não responda.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} APP Correspondência — Todos os direitos reservados
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Botão verde padrão
export const buttonGreen = (text: string, url: string): string => `
  <table cellpadding="0" cellspacing="0" style="margin: 30px 0;">
    <tr>
      <td align="center" style="background-color: #057321; border-radius: 8px; padding: 14px 32px;">
        <a
          href="${url}"
          target="_blank"
          rel="noopener noreferrer"
          style="color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;"
        >
          ${text}
        </a>
      </td>
    </tr>
  </table>
`;

// Caixa de informação verde
export const infoBoxGreen = (content: string): string => `
  <div style="background-color: #ecfdf5; border-left: 4px solid #057321; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.6;">
      ${content}
    </p>
  </div>
`;

// Caixa de alerta amarela
export const warningBox = (content: string): string => `
  <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
    <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
      ⚠️ ${content}
    </p>
  </div>
`;