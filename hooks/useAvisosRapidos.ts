"use client";

import { useState } from "react";
import { db } from "@/app/lib/firebase";
import {
  collection,
  addDoc,
  Timestamp,
  query,
  where,
  orderBy,
  getDocs,
  limit,
  doc,
  updateDoc,
} from "firebase/firestore";
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
      const payload = {
        ...dados,
        criadoEm: Timestamp.now(),
        dataEnvio: Timestamp.now(),
        protocolo: dados.protocolo || null,
        fotoUrl: dados.fotoUrl || null,
        status: "enviado" as const,
      };

      const docRef = await addDoc(collection(db, "avisos_rapidos"), payload);
      return docRef.id;
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

      if (extras?.linkUrl !== undefined) updatePayload.linkUrl = extras.linkUrl;
      if (extras?.status !== undefined) updatePayload.status = extras.status;
      if (extras?.fotoUrl !== undefined) updatePayload.fotoUrl = extras.fotoUrl;

      await updateDoc(doc(db, "avisos_rapidos", avisoId), updatePayload);
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
      const avisosRef = collection(db, "avisos_rapidos");
      const q = query(
        avisosRef,
        where("condominioId", "==", targetCondominio),
        orderBy("criadoEm", "desc"),
        limit(limiteBusca)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => normalizeAviso(d.id, d.data()));
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

      const q = query(
        collection(db, "avisos_rapidos"),
        where("condominioId", "==", condId),
        where("criadoEm", ">=", Timestamp.fromDate(hoje)),
        where("criadoEm", "<", Timestamp.fromDate(amanha)),
        orderBy("criadoEm", "desc")
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => normalizeAviso(d.id, d.data()));
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