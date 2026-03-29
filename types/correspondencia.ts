/**
 * Tipos centralizados para Correspondências
 * @module types/correspondencia
 */

import { Timestamp } from "firebase/firestore";

/**
 * Status possíveis de uma correspondência
 */
export type CorrespondenciaStatus = "pendente" | "retirada" | "devolvida" | "extraviada";

/**
 * Tipos de correspondência suportados
 */
export type TipoCorrespondencia = 
  | "carta"
  | "encomenda"
  | "sedex"
  | "pac"
  | "documento"
  | "notificacao"
  | "outros";

/**
 * Interface principal de Correspondência
 */
export interface Correspondencia {
  id: string;
  protocolo: string;
  condominioId: string;
  condominioNome?: string;
  blocoId?: string;
  blocoNome?: string;
  apartamento: string;
  moradorId?: string;
  moradorNome: string;
  moradorEmail?: string;
  tipo?: TipoCorrespondencia;
  descricao?: string;
  remetente?: string;
  imagemUrl?: string;
  pdfUrl?: string;
  reciboUrl?: string;
  status: CorrespondenciaStatus;
  criadoEm: Timestamp | Date;
  criadoPor: string;
  dataHora?: string;
  retiradoEm?: Timestamp | Date;
  retiradoPor?: string;
  assinaturaUrl?: string;
  observacoes?: string;
}

/**
 * Dados para criação de nova correspondência
 */
export interface NovaCorrespondenciaInput {
  condominioId: string;
  condominioNome?: string;
  blocoId?: string;
  blocoNome?: string;
  apartamento: string;
  moradorId?: string;
  moradorNome?: string;
  tipo?: TipoCorrespondencia;
  descricao?: string;
  remetente?: string;
  imagemFile?: File;
  observacoes?: string;
}

/**
 * Dados para registro de retirada
 */
export interface RetiradaInput {
  nomeRecebedor: string;
  documentoRecebedor?: string;
  assinaturaBase64?: string;
  observacoes?: string;
}

/**
 * Filtros para listagem de correspondências
 */
export interface CorrespondenciaFiltros {
  status?: CorrespondenciaStatus;
  blocoId?: string;
  moradorId?: string;
  dataInicio?: Date;
  dataFim?: Date;
}

/**
 * Resultado da criação de correspondência
 */
export interface CriarCorrespondenciaResult {
  id: string;
  protocolo: string;
}
