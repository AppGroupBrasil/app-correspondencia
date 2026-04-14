import { supabase } from "@/app/lib/supabase";

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
  dataRegistro: string;
  dataRetirada?: string;
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

const TABLE_NAME = "correspondencias";

function mapCorrespondencia(d: any): Correspondencia {
  return {
    id: d.id,
    condominioId: d.condominio_id,
    moradorId: d.morador_id,
    moradorNome: d.morador_nome,
    bloco: d.bloco_nome,
    apartamento: d.apartamento,
    tipo: d.tipo || "encomenda",
    status: d.status,
    descricao: d.observacao,
    remetente: d.remetente,
    codigoRastreio: d.codigo_rastreio,
    dataRegistro: d.criado_em,
    dataRetirada: d.retirado_em,
    registradoPor: d.criado_por,
    retiradoPor: d.dados_retirada?.nomeRecebedor,
    assinatura: d.dados_retirada?.assinaturaUrl,
    fotoUrl: d.imagem_url,
    observacoes: d.observacao,
  };
}

/**
 * Busca correspondências com filtros opcionais
 */
export async function buscarCorrespondencias(
  condominioId: string,
  filtros?: FiltrosCorrespondencia
): Promise<Correspondencia[]> {
  let query = supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("condominio_id", condominioId)
    .order("criado_em", { ascending: false });

  if (filtros?.status) {
    query = query.eq("status", filtros.status);
  }

  if (filtros?.bloco) {
    query = query.eq("bloco_nome", filtros.bloco);
  }

  if (filtros?.moradorId) {
    query = query.eq("morador_id", filtros.moradorId);
  }

  if (filtros?.dataInicio) {
    query = query.gte("criado_em", filtros.dataInicio.toISOString());
  }

  if (filtros?.dataFim) {
    query = query.lte("criado_em", filtros.dataFim.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapCorrespondencia);
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
  const protocolo = Math.floor(100000 + Math.random() * 900000).toString();
  
  const { data, error } = await supabase.from(TABLE_NAME).insert({
    condominio_id: dados.condominioId,
    morador_id: dados.moradorId || null,
    morador_nome: dados.moradorNome,
    bloco_nome: dados.bloco,
    apartamento: dados.apartamento,
    protocolo,
    observacao: dados.descricao || dados.observacoes,
    status: "pendente",
    criado_por: dados.registradoPor,
    imagem_url: dados.fotoUrl || null,
  }).select("id").single();

  if (error) throw error;
  return data!.id;
}

/**
 * Marca uma correspondência como retirada
 */
export async function marcarComoRetirada(
  correspondenciaId: string,
  retiradoPor: string,
  assinatura?: string
): Promise<void> {
  const { error } = await supabase.from(TABLE_NAME).update({
    status: "retirada",
    retirado_em: new Date().toISOString(),
    dados_retirada: {
      nomeRecebedor: retiradoPor,
      assinaturaUrl: assinatura || null,
    },
  }).eq("id", correspondenciaId);

  if (error) throw error;
}

/**
 * Marca uma correspondência como devolvida
 */
export async function marcarComoDevolvida(
  correspondenciaId: string,
  observacoes?: string
): Promise<void> {
  const { error } = await supabase.from(TABLE_NAME).update({
    status: "devolvido",
    observacao: observacoes || "Devolvido ao remetente",
  }).eq("id", correspondenciaId);

  if (error) throw error;
}

/**
 * Atualiza uma correspondência
 */
export async function atualizarCorrespondencia(
  correspondenciaId: string,
  dados: Partial<Correspondencia>
): Promise<void> {
  const mapped: Record<string, any> = {};
  if (dados.condominioId !== undefined) mapped.condominio_id = dados.condominioId;
  if (dados.moradorId !== undefined) mapped.morador_id = dados.moradorId;
  if (dados.moradorNome !== undefined) mapped.morador_nome = dados.moradorNome;
  if (dados.bloco !== undefined) mapped.bloco = dados.bloco;
  if (dados.apartamento !== undefined) mapped.apartamento = dados.apartamento;
  if (dados.tipo !== undefined) mapped.tipo = dados.tipo;
  if (dados.status !== undefined) mapped.status = dados.status;
  if (dados.descricao !== undefined) mapped.descricao = dados.descricao;
  if (dados.remetente !== undefined) mapped.remetente = dados.remetente;
  if (dados.codigoRastreio !== undefined) mapped.codigo_rastreio = dados.codigoRastreio;
  if (dados.dataRetirada !== undefined) mapped.data_retirada = dados.dataRetirada;
  if (dados.registradoPor !== undefined) mapped.registrado_por = dados.registradoPor;
  if (dados.retiradoPor !== undefined) mapped.retirado_por = dados.retiradoPor;
  if (dados.assinatura !== undefined) mapped.assinatura = dados.assinatura;
  if (dados.fotoUrl !== undefined) mapped.foto_url = dados.fotoUrl;
  if (dados.observacoes !== undefined) mapped.observacao = dados.observacoes;

  const { error } = await supabase.from(TABLE_NAME).update(mapped).eq("id", correspondenciaId);
  if (error) throw error;
}

/**
 * Exclui uma correspondência
 */
export async function excluirCorrespondencia(
  correspondenciaId: string
): Promise<void> {
  const { error } = await supabase.from(TABLE_NAME).delete().eq("id", correspondenciaId);
  if (error) throw error;
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
      const registro = new Date(c.dataRegistro);
      const retirada = new Date(c.dataRetirada!);
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
    .filter((c) => new Date(c.dataRegistro) >= trintaDiasAtras)
    .forEach((c) => {
      const data = new Date(c.dataRegistro).toISOString().split("T")[0];
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
