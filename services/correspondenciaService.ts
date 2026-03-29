import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  DocumentData,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "@/app/lib/firebase";

// ============================================
// TIPOS
// ============================================

export interface Correspondencia {
  id: string;
  condominioId: string;
  moradorId?: string;
  moradorNome: string;
  bloco: string;
  apartamento: string;
  tipo: TipoCorrespondencia;
  status: StatusCorrespondencia;
  descricao?: string;
  remetente?: string;
  codigoRastreio?: string;
  dataRegistro: Timestamp;
  dataRetirada?: Timestamp;
  registradoPor: string;
  retiradoPor?: string;
  assinatura?: string;
  fotoUrl?: string;
  observacoes?: string;
}

export type TipoCorrespondencia =
  | "carta"
  | "encomenda"
  | "sedex"
  | "pac"
  | "documento"
  | "outros";

export type StatusCorrespondencia = "pendente" | "retirado" | "devolvido";

export interface NovaCorrespondencia {
  condominioId: string;
  moradorId?: string;
  moradorNome: string;
  bloco: string;
  apartamento: string;
  tipo: TipoCorrespondencia;
  descricao?: string;
  remetente?: string;
  codigoRastreio?: string;
  registradoPor: string;
  fotoUrl?: string;
  observacoes?: string;
}

export interface FiltrosCorrespondencia {
  status?: StatusCorrespondencia;
  tipo?: TipoCorrespondencia;
  bloco?: string;
  dataInicio?: Date;
  dataFim?: Date;
  moradorId?: string;
}

// ============================================
// SERVIÇO DE CORRESPONDÊNCIAS
// ============================================

const COLLECTION_NAME = "correspondencias";

/**
 * Busca correspondências com filtros opcionais
 */
export async function buscarCorrespondencias(
  condominioId: string,
  filtros?: FiltrosCorrespondencia
): Promise<Correspondencia[]> {
  const constraints: QueryConstraint[] = [
    where("condominioId", "==", condominioId),
    orderBy("dataRegistro", "desc"),
  ];

  if (filtros?.status) {
    constraints.push(where("status", "==", filtros.status));
  }

  if (filtros?.tipo) {
    constraints.push(where("tipo", "==", filtros.tipo));
  }

  if (filtros?.bloco) {
    constraints.push(where("bloco", "==", filtros.bloco));
  }

  if (filtros?.moradorId) {
    constraints.push(where("moradorId", "==", filtros.moradorId));
  }

  const ref = collection(db, COLLECTION_NAME);
  const q = query(ref, ...constraints);
  const snapshot = await getDocs(q);

  let correspondencias = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Correspondencia[];

  // Filtros de data (aplicados no cliente pois Firestore não suporta múltiplos orderBy)
  if (filtros?.dataInicio) {
    correspondencias = correspondencias.filter((c) => {
      const data = c.dataRegistro.toDate();
      return data >= filtros.dataInicio!;
    });
  }

  if (filtros?.dataFim) {
    correspondencias = correspondencias.filter((c) => {
      const data = c.dataRegistro.toDate();
      return data <= filtros.dataFim!;
    });
  }

  return correspondencias;
}

/**
 * Busca correspondências pendentes de um morador
 */
export async function buscarCorrespondenciasPendentes(
  condominioId: string,
  moradorId: string
): Promise<Correspondencia[]> {
  return buscarCorrespondencias(condominioId, {
    status: "pendente",
    moradorId,
  });
}

/**
 * Registra uma nova correspondência
 */
export async function registrarCorrespondencia(
  dados: NovaCorrespondencia
): Promise<string> {
  const correspondencia = {
    ...dados,
    status: "pendente" as StatusCorrespondencia,
    dataRegistro: Timestamp.now(),
  };

  const ref = collection(db, COLLECTION_NAME);
  const docRef = await addDoc(ref, correspondencia);

  return docRef.id;
}

/**
 * Marca uma correspondência como retirada
 */
export async function marcarComoRetirada(
  correspondenciaId: string,
  retiradoPor: string,
  assinatura?: string
): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, correspondenciaId);

  await updateDoc(ref, {
    status: "retirado",
    dataRetirada: Timestamp.now(),
    retiradoPor,
    assinatura: assinatura || null,
  });
}

/**
 * Marca uma correspondência como devolvida
 */
export async function marcarComoDevolvida(
  correspondenciaId: string,
  observacoes?: string
): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, correspondenciaId);

  await updateDoc(ref, {
    status: "devolvido",
    observacoes: observacoes || "Devolvido ao remetente",
  });
}

/**
 * Atualiza uma correspondência
 */
export async function atualizarCorrespondencia(
  correspondenciaId: string,
  dados: Partial<Correspondencia>
): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, correspondenciaId);
  await updateDoc(ref, dados as DocumentData);
}

/**
 * Exclui uma correspondência
 */
export async function excluirCorrespondencia(
  correspondenciaId: string
): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, correspondenciaId);
  await deleteDoc(ref);
}

// ============================================
// ESTATÍSTICAS
// ============================================

export interface EstatisticasCorrespondencia {
  total: number;
  pendentes: number;
  retiradas: number;
  devolvidas: number;
  tempoMedioRetirada: number; // em horas
  porTipo: Record<TipoCorrespondencia, number>;
  porBloco: Record<string, number>;
  porDia: { data: string; quantidade: number }[];
}

/**
 * Calcula estatísticas das correspondências
 */
export function calcularEstatisticas(
  correspondencias: Correspondencia[]
): EstatisticasCorrespondencia {
  const total = correspondencias.length;
  const pendentes = correspondencias.filter((c) => c.status === "pendente").length;
  const retiradas = correspondencias.filter((c) => c.status === "retirado").length;
  const devolvidas = correspondencias.filter((c) => c.status === "devolvido").length;

  // Tempo médio de retirada
  const retiradosComTempo = correspondencias.filter(
    (c) => c.status === "retirado" && c.dataRetirada
  );
  let tempoMedioRetirada = 0;
  if (retiradosComTempo.length > 0) {
    const tempos = retiradosComTempo.map((c) => {
      const registro = c.dataRegistro.toDate();
      const retirada = c.dataRetirada!.toDate();
      return (retirada.getTime() - registro.getTime()) / (1000 * 60 * 60);
    });
    tempoMedioRetirada = tempos.reduce((a, b) => a + b, 0) / tempos.length;
  }

  // Por tipo
  const porTipo = correspondencias.reduce((acc, c) => {
    acc[c.tipo] = (acc[c.tipo] || 0) + 1;
    return acc;
  }, {} as Record<TipoCorrespondencia, number>);

  // Por bloco
  const porBloco = correspondencias.reduce((acc, c) => {
    acc[c.bloco] = (acc[c.bloco] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Por dia (últimos 30 dias)
  const hoje = new Date();
  const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);
  const porDiaMap = new Map<string, number>();

  correspondencias
    .filter((c) => c.dataRegistro.toDate() >= trintaDiasAtras)
    .forEach((c) => {
      const data = c.dataRegistro.toDate().toISOString().split("T")[0];
      porDiaMap.set(data, (porDiaMap.get(data) || 0) + 1);
    });

  const porDia = Array.from(porDiaMap.entries())
    .map(([data, quantidade]) => ({ data, quantidade }))
    .sort((a, b) => a.data.localeCompare(b.data));

  return {
    total,
    pendentes,
    retiradas,
    devolvidas,
    tempoMedioRetirada,
    porTipo,
    porBloco,
    porDia,
  };
}

export default {
  buscarCorrespondencias,
  buscarCorrespondenciasPendentes,
  registrarCorrespondencia,
  marcarComoRetirada,
  marcarComoDevolvida,
  atualizarCorrespondencia,
  excluirCorrespondencia,
  calcularEstatisticas,
};
