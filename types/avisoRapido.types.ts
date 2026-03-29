import { Timestamp } from "firebase/firestore";

/**
 * Interface para Aviso Rápido enviado via WhatsApp
 */
export interface AvisoRapido {
  id: string;
  
  // Informações do envio
  dataEnvio: Timestamp | any; // 'any' adicionado para flexibilidade com datas serializadas
  
  // Quem enviou
  enviadoPorId: string;
  enviadoPorNome: string;
  enviadoPorRole: string; // "porteiro", "responsavel", "adminMaster"
  
  // Para quem foi enviado
  moradorId: string;
  moradorNome: string;
  moradorTelefone: string;
  
  // Localização
  condominioId: string;
  condominioNome?: string;
  blocoId: string;
  blocoNome: string;
  apartamento: string;
  
  // Mensagem enviada
  mensagem: string;
  
  // Status
  status: "enviado" | "erro";
  erroMensagem?: string;

  // --- NOVOS CAMPOS ADICIONADOS ---
  protocolo?: string;   // Protocolo visual (ex: AV-123456)
  fotoUrl?: string;     // URL da foto no Storage
  imagemUrl?: string;   // Campo alternativo para compatibilidade
}

/**
 * Interface para criar novo aviso rápido
 */
export interface CriarAvisoRapidoDTO {
  // Quem enviou
  enviadoPorId: string;
  enviadoPorNome: string;
  enviadoPorRole: string;
  
  // Para quem foi enviado
  moradorId: string;
  moradorNome: string;
  moradorTelefone: string;
  
  // Localização
  condominioId: string;
  condominioNome?: string;
  blocoId: string;
  blocoNome: string;
  apartamento: string;
  
  // Mensagem enviada
  mensagem: string;

  // --- NOVOS CAMPOS ADICIONADOS ---
  protocolo?: string;
  fotoUrl?: string;
}

/**
 * Interface para filtros de consulta de avisos
 */
export interface FiltrosAvisosRapidos {
  condominioId?: string;
  blocoId?: string;
  moradorId?: string;
  enviadoPorId?: string;
  dataInicio?: Date;
  dataFim?: Date;
}

/**
 * Interface para estatísticas de avisos
 */
export interface EstatisticasAvisos {
  totalAvisos: number;
  avisosPorBloco: { [blocoNome: string]: number };
  avisosPorPorteiro: { [porteiroNome: string]: number };
  avisosHoje: number;
  avisosSemana: number;
  avisosMes: number;
}