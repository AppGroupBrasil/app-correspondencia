"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export interface CriarAvisoRapidoDTO {
  enviadoPorId: string;
  enviadoPorNome: string;
  enviadoPorRole: string;
  moradorId: string;
  moradorNome: string;
  moradorTelefone: string;
  condominioId: string;
  blocoId: string;
  blocoNome: string;
  apartamento: string;
  mensagem: string; 
  protocolo?: string;
  fotoUrl?: string;
}

export type AvisoRapidoStatus = "enviado" | "erro";

export interface AvisoRapido extends CriarAvisoRapidoDTO {
  id: string;
  criadoEm: any;
  dataEnvio: any;
  status: AvisoRapidoStatus;
  imagemUrl?: string; // legado
  linkUrl?: string;   // opcional
}

const normalizeStatus = (s: any): AvisoRapidoStatus => {
  return s === "erro" ? "erro" : "enviado";
};

const normalizeAviso = (id: string, data: any): AvisoRapido => {
  return {
    id,
    ...data,
    status: normalizeStatus(data.status),
    dataEnvio: data.dataEnvio || data.criadoEm,
    criadoEm: data.criadoEm,
    fotoUrl: data.fotoUrl || data.imagemUrl || null,
  } as AvisoRapido;
};

export function useAvisosRapidos() {
  const { user } = useAuth();
  const condominioId = user?.condominioId;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * Cria o aviso rápido e retorna o ID do documento.
   */
  const registrarAviso = async (dados: CriarAvisoRapidoDTO) => {
    setLoading(true);
    setError("");

    try {
      const { data, error: insertError } = await supabase.from("avisos_rapidos").insert({
        enviado_por_id: dados.enviadoPorId,
        enviado_por_nome: dados.enviadoPorNome,
        enviado_por_role: dados.enviadoPorRole,
        morador_id: dados.moradorId,
        morador_nome: dados.moradorNome,
        morador_telefone: dados.moradorTelefone,
        condominio_id: dados.condominioId,
        bloco_id: dados.blocoId,
        bloco_nome: dados.blocoNome,
        apartamento: dados.apartamento,
        mensagem: dados.mensagem,
        protocolo: dados.protocolo || null,
        foto_url: dados.fotoUrl || null,
        status: "enviado",
      }).select("id").single();

      if (insertError) throw insertError;
      return data!.id;
    } catch (err: any) {
      console.error("❌ Erro ao registrar aviso rápido:", err);
      setError(err?.message || "Falha ao registrar aviso.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Atualiza a mensagem final do aviso.
   */
  const atualizarMensagemAviso = async (
    avisoId: string,
    mensagemFinal: string,
    extras?: {
      linkUrl?: string;
      status?: AvisoRapidoStatus;
      fotoUrl?: string | null;
    }
  ) => {
    if (!avisoId) throw new Error("avisoId inválido para atualizarMensagemAviso");
    setLoading(true);
    setError("");

    try {
      const updatePayload: Record<string, any> = {
        mensagem: mensagemFinal,
      };

      if (extras?.linkUrl !== undefined) updatePayload.link_url = extras.linkUrl;
      if (extras?.status !== undefined) updatePayload.status = extras.status;
      if (extras?.fotoUrl !== undefined) updatePayload.foto_url = extras.fotoUrl;

      const { error: updateError } = await supabase.from("avisos_rapidos").update(updatePayload).eq("id", avisoId);
      if (updateError) throw updateError;
      return true;
    } catch (err: any) {
      console.error("❌ Erro ao atualizar mensagem do aviso:", err);
      setError(err?.message || "Falha ao atualizar mensagem do aviso.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const buscarAvisos = async (params?: { condominioId: string }, limiteBusca = 50) => {
    const targetCondominio = params?.condominioId || condominioId;
    if (!targetCondominio) return [];

    setLoading(true);
    setError("");

    try {
      const { data, error: queryError } = await supabase
        .from("avisos_rapidos")
        .select("*")
        .eq("condominio_id", targetCondominio)
        .order("criado_em", { ascending: false })
        .limit(limiteBusca);

      if (queryError) throw queryError;
      return (data || []).map((d: any) => normalizeAviso(d.id, {
        ...d,
        enviadoPorId: d.enviado_por_id,
        enviadoPorNome: d.enviado_por_nome,
        enviadoPorRole: d.enviado_por_role,
        moradorId: d.morador_id,
        moradorNome: d.morador_nome,
        moradorTelefone: d.morador_telefone,
        condominioId: d.condominio_id,
        blocoId: d.bloco_id,
        blocoNome: d.bloco_nome,
        apartamento: d.apartamento,
        mensagem: d.mensagem,
        protocolo: d.protocolo,
        fotoUrl: d.foto_url,
        linkUrl: d.link_url,
        status: d.status,
        dataEnvio: d.data_envio,
        criadoEm: d.criado_em,
      }));
    } catch (err: any) {
      console.error("❌ Erro ao buscar avisos rápidos:", err);
      setError(err?.message || "Falha ao buscar avisos.");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const buscarAvisosHoje = async (targetCondominioId?: string) => {
    const condId = targetCondominioId || condominioId;
    if (!condId) return [];

    setLoading(true);
    setError("");

    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const amanha = new Date(hoje);
      amanha.setDate(hoje.getDate() + 1);

      const { data, error: queryError } = await supabase
        .from("avisos_rapidos")
        .select("*")
        .eq("condominio_id", condId)
        .gte("criado_em", hoje.toISOString())
        .lt("criado_em", amanha.toISOString())
        .order("criado_em", { ascending: false });

      if (queryError) throw queryError;
      return (data || []).map((d: any) => normalizeAviso(d.id, {
        ...d,
        enviadoPorId: d.enviado_por_id,
        enviadoPorNome: d.enviado_por_nome,
        enviadoPorRole: d.enviado_por_role,
        moradorId: d.morador_id,
        moradorNome: d.morador_nome,
        moradorTelefone: d.morador_telefone,
        condominioId: d.condominio_id,
        blocoId: d.bloco_id,
        blocoNome: d.bloco_nome,
        fotoUrl: d.foto_url,
        linkUrl: d.link_url,
        dataEnvio: d.data_envio,
        criadoEm: d.criado_em,
      }));
    } catch (err: any) {
      console.error("❌ Erro ao buscar avisos de hoje:", err);
      setError(err?.message || "Falha ao buscar avisos de hoje.");
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    registrarAviso,
    atualizarMensagemAviso,
    buscarAvisos,
    buscarAvisosHoje,
    loading,
    error,
  };
}