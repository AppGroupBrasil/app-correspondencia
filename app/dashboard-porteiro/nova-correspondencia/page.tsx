"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import UploadImagem from "@/components/UploadImagem";
import SelectCondominioBlocoMorador from "@/components/SelectCondominioBlocoMorador";
import { LoadingOverlay } from "@/components/LoadingOverlay"; 
import ModalSucessoEntrada from "@/components/ModalSucessoEntrada";
import { useAuth } from "@/hooks/useAuth";
import { db, storage } from "@/app/lib/firebase";
import { doc, getDoc, collection, setDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Navbar from "@/components/Navbar";
import withAuth from "@/components/withAuth";
import { Package, FileText, CheckCircle, Loader2, Building2, Camera, MapPin } from "lucide-react"; 
import { gerarEtiquetaPDF } from "@/utils/gerarEtiquetaPDF"; 
import BotaoVoltar from "@/components/BotaoVoltar";

// Cache para dados já carregados
const dataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function getCachedData(key: string) {
  const cached = dataCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedData(key: string, data: any) {
  dataCache.set(key, { data, timestamp: Date.now() });
}

function NovaCorrespondenciaPorteiroPage() {
  const router = useRouter();
  const { role, condominioId, user } = useAuth() as any;
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Processando...");
  
  const [selectedCondominio, setSelectedCondominio] = useState("");
  const [selectedBloco, setSelectedBloco] = useState("");
  const [selectedMorador, setSelectedMorador] = useState("");
  const [observacao, setObservacao] = useState("");
  const [localArmazenamento, setLocalArmazenamento] = useState("Portaria");

  // Imagem já comprimida pelo componente UploadImagem
  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [imagemBase64, setImagemBase64] = useState<string>("");

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [protocolo, setProtocolo] = useState("");
  const [moradorNome, setMoradorNome] = useState("");
  const [telefoneMorador, setTelefoneMorador] = useState("");
  const [emailMorador, setEmailMorador] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");        
  const [linkPublico, setLinkPublico] = useState(""); 
  
  const [mensagemFormatada, setMensagemFormatada] = useState("");
  
  const backgroundTaskRef = useRef<Promise<void> | null>(null);

  const backRoute = '/dashboard-porteiro';
  const efetivoCondominioId = condominioId || "";

  // Handler otimizado que recebe arquivo já comprimido e base64
  const handleUpload = useCallback((file: File | null, base64?: string) => {
    setImagemFile(file);
    setImagemBase64(base64 || "");
  }, []);

  const limparTelefone = (telefone: string) => telefone.replace(/\D/g, "");

  // Buscar dados do morador com cache
  useEffect(() => {
    if (!selectedMorador) {
      setTelefoneMorador("");
      setEmailMorador("");
      setMoradorNome("");
      return;
    }

    const fetchDadosMorador = async () => {
      const cacheKey = `morador_${selectedMorador}`;
      const cached = getCachedData(cacheKey);
      
      if (cached) {
        setTelefoneMorador(limparTelefone(cached.whatsapp || ""));
        setEmailMorador(cached.email || "");
        setMoradorNome(cached.nome || "");
        return;
      }

      try {
        const mRef = doc(db, "users", selectedMorador);
        const mSnap = await getDoc(mRef);
        if (mSnap.exists()) {
          const data = mSnap.data();
          setCachedData(cacheKey, data);
          setTelefoneMorador(limparTelefone(data.whatsapp || ""));
          setEmailMorador(data.email || "");
          setMoradorNome(data.nome || "");
        }
      } catch (err) {
        console.error("Erro ao buscar morador:", err);
      }
    };
    
    fetchDadosMorador();
  }, [selectedMorador]);

  // Buscar nomes com cache e Promise.all
  const buscarNomes = useCallback(async () => {
    let condominioNome = "", blocoNome = "", nomeMorador = "", apartamento = "";
    
    try {
      const promises: Promise<void>[] = [];

      // Condomínio
      if (efetivoCondominioId) {
        const cacheKey = `cond_${efetivoCondominioId}`;
        const cached = getCachedData(cacheKey);
        if (cached) {
          condominioNome = cached.nome || efetivoCondominioId;
        } else {
          promises.push(
            getDoc(doc(db, "condominios", efetivoCondominioId)).then(snap => {
              const data = snap.data();
              if (data) {
                setCachedData(cacheKey, data);
                condominioNome = data.nome || efetivoCondominioId;
              }
            })
          );
        }
      }

      // Bloco
      if (selectedBloco) {
        const cacheKey = `bloco_${selectedBloco}`;
        const cached = getCachedData(cacheKey);
        if (cached) {
          blocoNome = cached.nome || selectedBloco;
        } else {
          promises.push(
            getDoc(doc(db, "blocos", selectedBloco)).then(snap => {
              const data = snap.data();
              if (data) {
                setCachedData(cacheKey, data);
                blocoNome = data.nome || selectedBloco;
              }
            })
          );
        }
      }

      // Morador
      if (selectedMorador) {
        const cacheKey = `morador_${selectedMorador}`;
        const cached = getCachedData(cacheKey);
        if (cached) {
          nomeMorador = cached.nome || selectedMorador;
          apartamento = cached.apartamento || cached.unidade || cached.unidadeNome || cached.numero || "";
        } else {
          promises.push(
            getDoc(doc(db, "users", selectedMorador)).then(snap => {
              const data = snap.data();
              if (data) {
                setCachedData(cacheKey, data);
                nomeMorador = data.nome || selectedMorador;
                apartamento = data.apartamento || data.unidade || data.unidadeNome || data.numero || "";
              }
            })
          );
        }
      }

      // Executar todas as promises em paralelo
      await Promise.all(promises);

      // Buscar valores do cache após as promises
      if (efetivoCondominioId && !condominioNome) {
        const cached = getCachedData(`cond_${efetivoCondominioId}`);
        condominioNome = cached?.nome || efetivoCondominioId;
      }
      if (selectedBloco && !blocoNome) {
        const cached = getCachedData(`bloco_${selectedBloco}`);
        blocoNome = cached?.nome || selectedBloco;
      }
      if (selectedMorador && !nomeMorador) {
        const cached = getCachedData(`morador_${selectedMorador}`);
        nomeMorador = cached?.nome || selectedMorador;
        apartamento = cached?.apartamento || cached?.unidade || "";
      }

    } catch (err) {
      console.error("Erro ao buscar nomes:", err);
    }
    
    return { condominioNome, blocoNome, moradorNome: nomeMorador, apartamento };
  }, [efetivoCondominioId, selectedBloco, selectedMorador]);

  const salvar = async () => {
    if (!efetivoCondominioId || !selectedBloco || !selectedMorador) {
      alert("Selecione o Bloco e o Morador.");
      return;
    }

    setLoading(true);
    setMessage("Iniciando registro...");
    setProgress(10);

    try {
      // PASSO 1: Gerar protocolo e link IMEDIATAMENTE
      const novoProtocolo = `${Math.floor(Date.now() / 1000).toString().slice(-6)}`;
      const docRef = doc(collection(db, "correspondencias"));
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const novoLinkPublico = `${baseUrl}/ver/${docRef.id}`;
      
      setProtocolo(novoProtocolo);
      setLinkPublico(novoLinkPublico);
      setProgress(30);

      // PASSO 2: Buscar nomes (com cache, muito rápido)
      setMessage("Preparando dados...");
      const nomes = await buscarNomes();
      setProgress(50);

      const nomeUser = user?.nome || "Porteiro";
      const responsavelRegistro = `${nomeUser} (Portaria)`;
      const dataAtual = new Date();
      const dataFormatada = dataAtual.toLocaleDateString('pt-BR');
      const horaFormatada = dataAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // PASSO 3: Gerar mensagem formatada IMEDIATAMENTE
      const templateMensagem = `AVISO DE CORRESPONDÊNCIA

Olá, *${nomes.moradorNome}*!
Unidade: ${nomes.apartamento} (${nomes.blocoNome})

Você recebeu uma correspondência
━━━━━━━━━━━━━━━━
│ PROTOCOLO: ${novoProtocolo}
│ Local: ${localArmazenamento}
│ Recebido por: ${nomeUser}
│ Chegada: ${dataFormatada}, ${horaFormatada}
━━━━━━━━━━━━━━━━

*FOTO E QR CODE:*
${novoLinkPublico}

Aguardamos a sua retirada`;

      setMensagemFormatada(templateMensagem);
      setProgress(70);

      // PASSO 4: Gerar PDF (usando imagem já comprimida)
      setMessage("Gerando etiqueta...");
      const pdfBlob = await gerarEtiquetaPDF({
        protocolo: novoProtocolo,
        condominioNome: nomes.condominioNome,
        moradorNome: nomes.moradorNome,
        bloco: nomes.blocoNome,
        apartamento: nomes.apartamento, 
        dataChegada: dataAtual.toISOString(),
        recebidoPor: responsavelRegistro,
        observacao,
        localRetirada: localArmazenamento,
        fotoUrl: imagemBase64, // Já está em base64 e comprimida!
        logoUrl: "/logo-app-correspondencia.png",
        linkPublico: novoLinkPublico
      });
      
      const localPdfUrl = URL.createObjectURL(pdfBlob);
      setPdfUrl(localPdfUrl);
      setProgress(100);

      // PASSO 5: Mostrar modal de sucesso IMEDIATAMENTE
      setLoading(false);
      setShowSuccessModal(true);

      // PASSO 6: Upload em background (não bloqueia o usuário)
      backgroundTaskRef.current = (async () => {
        try {
          // Upload do PDF
          const pdfRef = ref(storage, `correspondencias/entrada_${novoProtocolo}_${Date.now()}.pdf`);
          await uploadBytes(pdfRef, pdfBlob);
          const publicPdfUrl = await getDownloadURL(pdfRef);
          
          // Upload da foto (já comprimida)
          let publicFotoUrl = "";
          if (imagemFile) {
            const fotoRef = ref(storage, `correspondencias/foto_${novoProtocolo}_${Date.now()}.jpg`);
            await uploadBytes(fotoRef, imagemFile);
            publicFotoUrl = await getDownloadURL(fotoRef);
          }

          // Salvar no Firestore
          await setDoc(docRef, {
            condominioId: efetivoCondominioId,
            blocoId: selectedBloco,
            blocoNome: nomes.blocoNome,
            moradorId: selectedMorador,
            moradorNome: nomes.moradorNome,
            apartamento: nomes.apartamento,
            protocolo: novoProtocolo,
            observacao,
            localArmazenamento,
            status: "pendente", 
            criadoEm: Timestamp.now(),
            criadoPor: user?.email || "porteiro",
            criadoPorNome: nomeUser, 
            criadoPorCargo: "Porteiro",
            imagemUrl: publicFotoUrl,
            pdfUrl: publicPdfUrl,
            moradorTelefone: telefoneMorador,
            moradorEmail: emailMorador
          });

          console.log("✅ [Background] Correspondência salva com sucesso! ID:", docRef.id);

        } catch (err) {
          console.error("❌ [Background] Erro ao salvar:", err);
        }
      })();

    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Ocorreu um erro ao processar. Verifique sua conexão e tente novamente.");
    }
  };

  const handleCloseSuccess = async () => {
    if (backgroundTaskRef.current) await backgroundTaskRef.current;
    
    setObservacao("");
    setImagemFile(null);
    setImagemBase64("");
    setPdfUrl("");
    setLinkPublico("");
    setMensagemFormatada("");
    setSelectedMorador(""); 
    setShowSuccessModal(false);
  };

  const handleImprimir = () => {
    if (pdfUrl) {
      const target = typeof window !== 'undefined' && (window as any).Capacitor ? "_system" : "_blank";
      window.open(pdfUrl, target);
    }
  };

  const handleReenviarEmail = async () => {
    alert("O e-mail já está sendo enviado automaticamente pelo sistema.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50/30">
      <Navbar />
      
      <LoadingOverlay isVisible={loading} progress={progress} message={message} />

      {showSuccessModal && (
        <ModalSucessoEntrada 
          protocolo={protocolo}
          moradorNome={moradorNome}
          telefoneMorador={telefoneMorador}
          emailMorador={emailMorador}
          pdfUrl={pdfUrl}
          linkPublico={linkPublico} 
          mensagemFormatada={mensagemFormatada} 
          onClose={handleCloseSuccess}
          onImprimir={handleImprimir}
          onReenviarEmail={handleReenviarEmail}
        />
      )}
      
      <main className="max-w-4xl mx-auto px-4 pt-28 pb-12">
        
        <BotaoVoltar url={backRoute} />
        
        <div className="mb-8 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-[#057321] to-[#046119]">
            <Building2 className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nova Encomenda</h1>
            <p className="text-gray-600">Painel da Portaria</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-[#057321] to-[#0a9f2f]"></div>
          <div className="p-6 space-y-6">
            
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm">
              <label className="flex items-center gap-2 text-base font-bold text-gray-800 mb-3">
                <Package size={20} className="text-[#057321]" /> Destinatário
              </label>
              <SelectCondominioBlocoMorador 
                onSelect={({ condominioId, blocoId, moradorId }) => { 
                  setSelectedCondominio(condominioId); 
                  setSelectedBloco(blocoId); 
                  setSelectedMorador(moradorId); 
                }} 
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <MapPin size={18} className="text-[#057321]" /> Local de Retirada
              </label>
              <select
                value={localArmazenamento}
                onChange={(e) => setLocalArmazenamento(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-[#057321] focus:ring-4 focus:ring-[#057321]/10 outline-none transition-all bg-white text-gray-800 font-medium cursor-pointer"
              >
                <option value="Portaria">Portaria</option>
                <option value="Administração">Administração</option>
                <option value="Sala de Correspondência">Sala de Correspondência</option>
                <option value="Recepção">Recepção</option>
                <option value="Smart Lockers">Smart Lockers</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <FileText size={18} className="text-[#057321]" /> Detalhes / Observação
              </label>
              <textarea 
                value={observacao} 
                onChange={(e) => setObservacao(e.target.value)} 
                placeholder="Ex: Caixa grande Amazon, Envelope bancário..." 
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-[#057321] focus:ring-4 focus:ring-[#057321]/10 outline-none transition-all placeholder:text-gray-400" 
                rows={3} 
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Camera size={18} className="text-[#057321]" /> Foto da Encomenda (Opcional)
              </label>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 border-dashed hover:border-[#057321] transition-colors">
                <UploadImagem onUpload={handleUpload} />
              </div>
            </div>

            <div className="pt-2">
              <button 
                onClick={salvar} 
                disabled={loading} 
                className="w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r from-[#057321] to-[#046119]"
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle size={24} />} 
                {loading ? "Registrando..." : "Registrar Entrada"}
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

export default withAuth(NovaCorrespondenciaPorteiroPage, ['porteiro', 'responsavel', 'adminMaster']);
