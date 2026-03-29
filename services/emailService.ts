import type { ConfirmacaoCadastroData } from '../app/lib/email-templates/confirmacao-cadastro';
import type { AprovacaoMoradorData } from '../app/lib/email-templates/aprovacao-morador';
import type { NovaCorrespondenciaData } from '../app/lib/email-templates/nova-correspondencia';
import type { ReciboRetiradaData } from '../app/lib/email-templates/recibo-retirada';
import type { AvisoRapidoData } from '../app/lib/email-templates/aviso-rapido'; // <--- 1. NOVO IMPORT AQUI
import { buildAuthenticatedJsonHeaders } from '../app/lib/client-auth';

export const EmailService = {
  /**
   * 1. Confirmação de Cadastro
   */
  enviarConfirmacaoCadastro: async (email: string, dados: ConfirmacaoCadastroData) => {
    return enviarEmailGen(email, 'confirmacao-cadastro', dados);
  },

  /**
   * 2. Aprovação de Morador
   */
  enviarAprovacaoMorador: async (email: string, dados: AprovacaoMoradorData) => {
    return enviarEmailGen(email, 'aprovacao-morador', dados);
  },

  /**
   * 3. Nova Correspondência
   */
  enviarNovaCorrespondencia: async (email: string, dados: NovaCorrespondenciaData) => {
    return enviarEmailGen(email, 'nova-correspondencia', dados);
  },

  /**
   * 4. Recibo de Retirada
   */
  enviarReciboRetirada: async (email: string, dados: ReciboRetiradaData) => {
    return enviarEmailGen(email, 'recibo-retirada', dados);
  },

  /**
   * 5. Aviso Rápido (NOVO) 🔔
   */
  enviarAvisoRapido: async (email: string, dados: AvisoRapidoData) => {
    return enviarEmailGen(email, 'aviso-rapido', dados);
  }
};

// --- Função Auxiliar (Não mexer) ---
async function enviarEmailGen(email: string, tipo: string, dados: any) {
  try {
    const headers = await buildAuthenticatedJsonHeaders();
    // Atenção: mantive o caminho '/api/email' pois você renomeou a pasta para 'email'
    const response = await fetch('/api/email', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tipo,
        destinatario: email,
        dados,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Falha ao enviar e-mail');
    }
    return true;
  } catch (error) {
    console.error(`Erro no EmailService (${tipo}):`, error);
    return false;
  }
}