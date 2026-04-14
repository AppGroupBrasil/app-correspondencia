"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/app/lib/supabase";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import imageCompression from "browser-image-compression";
import { getApiUrl } from "@/utils/platform";

// --- CONFIGURAÇÃO DE URL (WEB / APP) ---
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || (globalThis.window === undefined ? "https://appcorrespondencia.com.br" : globalThis.window.location.origin);

// --- FUNÇÃO DE PDF (Auxiliar - Fora do Hook para performance) ---
async function gerarPDFProfissional(dados: any): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Cabeçalho Verde
  doc.setFillColor(5, 115, 33);
  doc.rect(0, 0, pageWidth, 50, "F");

  // Tenta carregar Logo
  try {
    // Se estiver no localhost, tenta pegar da pasta public local, senão pega da URL absoluta
    const isLocalhost = typeof globalThis.window !== 'undefined' && globalThis.window.location.hostname === 'localhost';
    const logoUrl = isLocalhost ? "/logo-app-correspondencia.png" : `${API_BASE_URL}/logo-app-correspondencia.png`;
    
    const resp = await fetch(logoUrl);
    if (resp.ok) {
        const blob = await resp.blob();
        const base64 = await new Promise<string>((resolve) => {
            const r = new FileReader();
            r.onloadend = () => resolve(r.result as string);
            r.readAsDataURL(blob);
        });
        doc.addImage(base64, "PNG", 15, 10, 30, 30);
    }
  } catch (e) {
    // Fallback se falhar logo - desenha círculo branco no lugar
    console.warn("Logo não carregada, usando fallback:", e);
    doc.setFillColor(255,255,255);
    doc.circle(30, 25, 15, "F");
  }

  // Textos do Cabeçalho
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text(dados.condominioNome || "Condomínio", 50, 20);
  doc.setFontSize(10);
  doc.text(`Porteiro: ${dados.porteiroNome}`, 50, 30);
  doc.text(`Data: ${dados.dataHora}`, 50, 35);

  // Corpo
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.text("AVISO DE CHEGADA", pageWidth / 2, 70, { align: "center" });

  doc.setFontSize(12);
  doc.text(`Morador: ${dados.moradorNome}`, 20, 90);
  doc.text(`Unidade: ${dados.blocoNome} - ${dados.apartamento}`, 20, 100);
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Protocolo: #${dados.protocolo}`, 20, 115);

  // QR Code
  if (dados.qrCodeDataUrl) {
    doc.addImage(dados.qrCodeDataUrl, "PNG", pageWidth - 70, 85, 50, 50);
  }

  // Foto da Encomenda
  if (dados.imagemUrl) {
      try {
        let imgData = dados.imagemUrl;
        // Se for URL remota, converte para base64
        if (dados.imagemUrl.startsWith('http')) {
            const r = await fetch(dados.imagemUrl);
            const b = await r.blob();
            imgData = await new Promise((res) => {
                const rd = new FileReader();
                rd.onloadend = () => res(rd.result);
                rd.readAsDataURL(b);
            });
        }
        doc.addImage(imgData, "JPEG", 20, 130, 80, 80);
      } catch (e) {
        console.warn("Erro ao carregar foto da encomenda no PDF:", e);
      }
  }

  return doc;
}

// ========================================
// HOOK PRINCIPAL
// ========================================
export function useCorrespondencias() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");

  // Helpers internos
  const comprimirImagem = async (file: File) => {
    try {
        return await imageCompression(file, { maxSizeMB: 0.8, maxWidthOrHeight: 1024 });
    } catch { return file; }
  };

  const uploadToStorage = async (blob: Blob | File, path: string) => {
    const { data, error } = await supabase.storage.from("correspondencias").upload(path, blob, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("correspondencias").getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  // --------------------------------------------------------------------------
  // 1. CRIAR CORRESPONDÊNCIA (Com useCallback)
  // --------------------------------------------------------------------------
  const criarCorrespondenciaCompleta = useCallback(async (params: any) => {
    setLoading(true);
    setProgressMessage("Iniciando registro...");
    try {
        const protocolo = Math.floor(100000 + Math.random() * 900000).toString();
        let imagemUrl = "";
        
        // 1. Upload da Imagem
        if (params.imagemFile) {
            setProgressMessage("Enviando foto...");
            const img = await comprimirImagem(params.imagemFile);
            imagemUrl = await uploadToStorage(img, `correspondencias/${Date.now()}_img`);
        }

        // 2. Buscar dados do Morador
        let emailDestino = "";
        let nomeMorador = params.moradorNome || "";
        if (params.moradorId) {
            try {
                const { data: u } = await supabase.from("users").select("email, nome").eq("id", params.moradorId).single();
                if (u) {
                    emailDestino = u.email;
                    nomeMorador = u.nome;
                }
            } catch (e) {
              console.warn("Erro ao buscar dados do morador:", e);
            }
        }

        // 3. Identificar Porteiro
        let porteiro = "Portaria";
        if (typeof globalThis.window !== 'undefined') {
            const u = localStorage.getItem("user");
            if (u) {
                try { porteiro = JSON.parse(u).nome; } catch(e){ console.warn("Erro ao parsear usuário:", e); }
            }
        }

        // 4. Salvar no Supabase
        setProgressMessage("Salvando dados...");
        const { data: inserted, error: insertError } = await supabase.from("correspondencias").insert({
            condominio_id: params.condominioId,
            bloco_id: params.blocoId || null,
            bloco_nome: params.blocoNome || null,
            morador_id: params.moradorId || null,
            morador_nome: nomeMorador,
            apartamento: params.apartamento || null,
            protocolo,
            observacao: params.observacao || null,
            local_armazenamento: params.localArmazenamento || "Portaria",
            status: "pendente",
            imagem_url: imagemUrl || null,
            morador_telefone: params.moradorTelefone || null,
            morador_email: emailDestino || null,
            criado_por: porteiro,
            criado_por_nome: porteiro,
        }).select("id").single();

        if (insertError) throw insertError;
        const docId = inserted!.id;

        // 5. Enviar E-mail (Sem travar se falhar)
        if (emailDestino) {
            fetch(getApiUrl("/api/email"), {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    tipo: 'nova-correspondencia',
                    destinatario: emailDestino,
                    dados: {
                        nomeMorador,
                        protocolo,
                        condominioNome: params.condominioNome,
                        blocoNome: params.blocoNome,
                        numeroUnidade: params.apartamento,
                        dashboardUrl: `${API_BASE_URL}/login`
                    }
                })
            }).catch(e => console.error("Erro envio email:", e));
        }

        // 6. Gerar PDF em background
        setTimeout(async () => {
            try {
                const qrUrl = `${API_BASE_URL}/ver?id=${docId}`;
                const qr = await QRCode.toDataURL(qrUrl);
                const pdf = await gerarPDFProfissional({
                    ...params,
                    porteiroNome: porteiro,
                    moradorNome: nomeMorador,
                    protocolo,
                    dataHora: new Date().toLocaleString(),
                    imagemUrl,
                    qrCodeDataUrl: qr
                });
                const pdfBlob = pdf.output('blob');
                const pdfUrl = await uploadToStorage(pdfBlob, `pdf_${protocolo}.pdf`);
                await supabase.from("correspondencias").update({ pdf_url: pdfUrl }).eq("id", docId);
            } catch (e) { console.error("Erro ao gerar PDF background:", e); }
        }, 500);

        setLoading(false);
        setProgressMessage("");
        return { id: docId, protocolo };

    } catch (e: any) {
        setError(e.message);
        setLoading(false);
        return null;
    }
  }, []);

  // --------------------------------------------------------------------------
  // 2. LISTAR CORRESPONDÊNCIAS (Com useCallback e Proteção de ID)
  // --------------------------------------------------------------------------
  const listarCorrespondencias = useCallback(async (condominioId: string, filtroStatus?: string) => {
    if (!condominioId) {
        console.warn("Hook: Tentativa de listar sem condominioId");
        return [];
    }

    try {
        setLoading(true);
        let query = supabase
            .from("correspondencias")
            .select("*")
            .eq("condominio_id", condominioId)
            .order("criado_em", { ascending: false });
        
        if (filtroStatus) {
            query = query.eq("status", filtroStatus);
        }

        const { data, error: queryError } = await query;
        if (queryError) throw queryError;

        // Mapear snake_case → camelCase para compatibilidade
        const lista = (data || []).map((d: any) => ({
            id: d.id,
            condominioId: d.condominio_id,
            blocoId: d.bloco_id,
            blocoNome: d.bloco_nome,
            moradorId: d.morador_id,
            moradorNome: d.morador_nome,
            apartamento: d.apartamento,
            protocolo: d.protocolo,
            observacao: d.observacao,
            localArmazenamento: d.local_armazenamento,
            status: d.status,
            imagemUrl: d.imagem_url,
            pdfUrl: d.pdf_url,
            reciboUrl: d.recibo_url,
            moradorTelefone: d.morador_telefone,
            moradorEmail: d.morador_email,
            criadoPor: d.criado_por,
            criadoPorNome: d.criado_por_nome,
            compartilhadoVia: d.compartilhado_via,
            retiradoEm: d.retirado_em,
            dadosRetirada: d.dados_retirada,
            criadoEm: d.criado_em,
            dataHora: d.criado_em ? new Date(d.criado_em).toLocaleString() : "",
        }));
        setLoading(false);
        return lista;
    } catch (e: any) {
        console.error("Erro ao listar correspondências:", e);
        setLoading(false);
        return [];
    }
  }, []);

  // --------------------------------------------------------------------------
  // 3. REGISTRAR RETIRADA (Com useCallback)
  // --------------------------------------------------------------------------
  const registrarRetirada = useCallback(async (id: string, dadosRetirada: any) => {
      try {
          setLoading(true);
          
          let assinaturaUrl = "";
          if (dadosRetirada.assinaturaBase64) {
             const resp = await fetch(dadosRetirada.assinaturaBase64);
             const blob = await resp.blob();
             const { data: uploadData, error: uploadError } = await supabase.storage.from("retiradas").upload(`assinaturas/${id}_${Date.now()}.png`, blob);
             if (!uploadError && uploadData) {
               const { data: urlData } = supabase.storage.from("retiradas").getPublicUrl(uploadData.path);
               assinaturaUrl = urlData.publicUrl;
             }
          }

          const { error: updateError } = await supabase.from("correspondencias").update({
              status: "retirada",
              retirado_em: new Date().toISOString(),
              dados_retirada: {
                nomeRecebedor: dadosRetirada.nomeRecebedor,
                assinaturaUrl
              }
          }).eq("id", id);

          if (updateError) throw updateError;
          setLoading(false);
          return true;
      } catch (e) {
          console.error(e);
          setLoading(false);
          return false;
      }
  }, []);

  const gerarSegundaVia = useCallback(async (id: string) => {
      try {
        const { data } = await supabase.from("correspondencias").select("pdf_url").eq("id", id).single();
        if (data) return data.pdf_url;
        return null;
      } catch (e) { console.warn("Erro ao gerar segunda via:", e); return null; }
  }, []);
  
  const marcarComoCompartilhado = useCallback(async (id: string, tipo: string) => {
      // Implementar lógica de marcação se necessário
  }, []);

  return {
    criarCorrespondenciaCompleta,
    listarCorrespondencias,
    registrarRetirada,
    gerarSegundaVia,
    marcarComoCompartilhado,
    loading,
    error,
    progress,
    progressMessage
  };
}
