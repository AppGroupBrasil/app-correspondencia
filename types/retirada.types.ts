/**
 * Configurações de retirada de correspondências
 */
export interface ConfiguracoesRetirada {
  assinaturaMoradorObrigatoria: boolean;
  assinaturaPorteiroObrigatoria: boolean;
  fotoDocumentoObrigatoria: boolean;
  selfieObrigatoria: boolean;
  geolocalizacaoObrigatoria: boolean;
  enviarWhatsApp: boolean;
  enviarEmail: boolean;
  enviarSMS: boolean;
  verificarMoradorAutorizado: boolean;
  permitirRetiradaTerceiro: boolean;
  exigirCodigoConfirmacao: boolean;
  incluirFotoCorrespondencia: boolean;
  incluirQRCode: boolean;
  incluirLogoCondominio: boolean;
  permitirRetiradaParcial: boolean;
  exigirAvaliacaoServico: boolean;
}

/**
 * Dados da retirada de correspondência
 */
export interface DadosRetirada {
  dataHoraRetirada: string | Date;
  nomeQuemRetirou: string;
  cpfQuemRetirou?: string;
  telefoneQuemRetirou?: string;
  nomePorteiro: string;
  observacoes?: string;
  assinaturaMorador?: string;
  assinaturaPorteiro?: string;
  codigoVerificacao: string;
  fotoComprovanteUrl?: string;
}

/**
 * Resultado do envio de notificações
 */
export interface ResultadoNotificacao {
  whatsapp: {
    enviado: boolean;
    erro?: string;
  };
  email: {
    enviado: boolean;
    erro?: string;
  };
  sms: {
    enviado: boolean;
    erro?: string;
  };
}

/**
 * Padrões default
 */
export const CONFIGURACOES_DEFAULT: ConfiguracoesRetirada = {
  assinaturaMoradorObrigatoria: true,
  assinaturaPorteiroObrigatoria: true,
  fotoDocumentoObrigatoria: false,
  selfieObrigatoria: false,
  geolocalizacaoObrigatoria: false,
  enviarWhatsApp: true,
  enviarEmail: true,
  enviarSMS: false,
  verificarMoradorAutorizado: true,
  permitirRetiradaTerceiro: false,
  exigirCodigoConfirmacao: false,
  incluirFotoCorrespondencia: true,
  incluirQRCode: true,
  incluirLogoCondominio: false,
  permitirRetiradaParcial: false,
  exigirAvaliacaoServico: false,
};