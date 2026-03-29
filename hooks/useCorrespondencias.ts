"use client";

import { useState, useCallback } from "react";
import { db, storage } from "@/app/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  updateDoc,
  orderBy
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
    const r = ref(storage, path);
    await uploadBytes(r, blob);
    return await getDownloadURL(r);
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
                const u = await getDoc(doc(db, "users", params.moradorId));
                if (u.exists()) {
                    emailDestino = u.data().email;
                    nomeMorador = u.data().nome;
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

        // 4. Salvar no Firestore
        setProgressMessage("Salvando dados...");
        const docRef = await addDoc(collection(db, "correspondencias"), {
            ...params,
            moradorNome: nomeMorador,
            protocolo,
            imagemUrl,
            status: "pendente",
            criadoEm: serverTimestamp(),
            criadoPor: porteiro,
            moradorEmail: emailDestino,
            dataHora: new Date().toLocaleString()
        });

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
                const qrUrl = `${API_BASE_URL}/ver?id=${docRef.id}`;
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
                const pdfUrl = await uploadToStorage(pdfBlob, `correspondencias/pdf_${protocolo}.pdf`);
                await updateDoc(docRef, { pdfUrl });
            } catch (e) { console.error("Erro ao gerar PDF background:", e); }
        }, 500);

        setLoading(false);
        setProgressMessage("");
        return { id: docRef.id, protocolo };

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
    // 🛡️ Proteção contra ID inválido (Evita erro do Firebase e Loop)
    if (!condominioId) {
        console.warn("Hook: Tentativa de listar sem condominioId");
        return [];
    }

    try {
        setLoading(true);
        let q = query(
            collection(db, "correspondencias"), 
            where("condominioId", "==", condominioId),
            orderBy("criadoEm", "desc")
        );
        
        if (filtroStatus) {
             q = query(
                collection(db, "correspondencias"), 
                where("condominioId", "==", condominioId),
                where("status", "==", filtroStatus),
                orderBy("criadoEm", "desc") // Nota: Requer índice no Firebase se usar status+data
            );
        }

        const snap = await getDocs(q);
        const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setLoading(false);
        return lista;
    } catch (e: any) {
        console.error("Erro ao listar correspondências:", e);
        // Não jogamos erro aqui para não quebrar a UI, apenas logamos
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
          const ref = doc(db, "correspondencias", id);
          
          let assinaturaUrl = "";
          if (dadosRetirada.assinaturaBase64) {
             const resp = await fetch(dadosRetirada.assinaturaBase64);
             const blob = await resp.blob();
             assinaturaUrl = await uploadToStorage(blob, `assinaturas/${id}_${Date.now()}.png`);
          }

          await updateDoc(ref, {
              status: "retirada",
              retiradoEm: serverTimestamp(),
              retiradoPor: dadosRetirada.nomeRecebedor,
              assinaturaUrl
          });
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
        const d = await getDoc(doc(db, "correspondencias", id));
        if (d.exists()) return d.data().pdfUrl;
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
