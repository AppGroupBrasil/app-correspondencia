"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import UploadImagens, { FotoSelecionada } from "@/components/UploadImagens";
import { nomeArquivoFoto } from "@/app/lib/fotos-correspondencia";
import { useRascunho } from "@/hooks/useRascunho";
import { gerarProtocoloUnico } from "@/utils/protocolo";
import { base64ParaFile } from "@/utils/imageCompressor";
import SelectCondominioBlocoMorador from "@/components/SelectCondominioBlocoMorador";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import ModalSucessoEntrada from "@/components/ModalSucessoEntrada";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/app/lib/supabase";
import Navbar from "@/components/Navbar";
import withAuth from "@/components/withAuth";
import { EmailService } from "@/services/emailService";
import {
  Package,
  FileText,
  CheckCircle,
  Loader2,
  Building2,
  Camera,
  MapPin,
  AlertTriangle,
} from "lucide-react";
import { gerarEtiquetaPDF } from "@/utils/gerarEtiquetaPDF";
import BotaoVoltar from "@/components/BotaoVoltar";
import { useTemplates } from "@/hooks/useTemplates";
import { formatPtBrDateTime, buildFinalWhatsappMessage } from "@/utils/messageFormat";
import MessageTemplateButton from "@/components/MessageTemplateButton";

// O que sobrevive ao app ser morto em segundo plano durante a câmera. O morador
// fica de fora de propósito: reapresentar uma seleção antiga arriscaria lançar a
// encomenda no nome errado, e reescolher são dois toques.
interface RascunhoRegistro {
  observacao: string;
  localArmazenamento: string;
  fotos: { id: string; nome: string; base64: string }[];
}

// Cada foto em base64 pesa por volta de meio megabyte no armazenamento local, e
// a cota do navegador fica perto de cinco. Guardar as três primeiras cobre o
// caso real sem arriscar derrubar o rascunho inteiro por falta de espaço.
const MAX_FOTOS_RASCUNHO = 3;

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

function NovaCorrespondenciaResponsavelPage() {
  const router = useRouter();
  const { role, condominioId, user } = useAuth() as any;

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Processando...");

  const backRoute = "/dashboard-responsavel";
  const efetivoCondominioId = condominioId || "";

  const { getFormattedMessage } = useTemplates(efetivoCondominioId);

  const [selectedCondominio, setSelectedCondominio] = useState("");
  const [selectedBloco, setSelectedBloco] = useState("");
  const [selectedMorador, setSelectedMorador] = useState("");
  const [observacao, setObservacao] = useState("");
  const [localArmazenamento, setLocalArmazenamento] = useState("Portaria");
  
  // Fotos já comprimidas pelo componente UploadImagens. Mais de uma foto = um
  // único registro com várias correspondências do mesmo morador.
  const [fotos, setFotos] = useState<FotoSelecionada[]>([]);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [protocolo, setProtocolo] = useState("");
  const [moradorNome, setMoradorNome] = useState("");
  const [telefoneMorador, setTelefoneMorador] = useState("");
  const [emailMorador, setEmailMorador] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [linkPublico, setLinkPublico] = useState("");
  const [mensagemFormatada, setMensagemFormatada] = useState("");

  // O rascunho não sabe para quem era a encomenda: sem aviso, a foto de um
  // registro abandonado apareceria colada no morador seguinte.
  const [rascunhoRecuperado, setRascunhoRecuperado] = useState(false);

  const descartarRascunho = () => {
    setFotos([]);
    setObservacao("");
    setRascunhoRecuperado(false);
  };

  const dadosRascunho = useMemo<RascunhoRegistro>(
    () => ({
      observacao,
      localArmazenamento,
      fotos: fotos
        .slice(0, MAX_FOTOS_RASCUNHO)
        .map((foto) => ({ id: foto.id, nome: foto.file.name, base64: foto.base64 })),
    }),
    [observacao, localArmazenamento, fotos]
  );

  useRascunho<RascunhoRegistro>({
    chave: "nova-correspondencia-responsavel",
    ativo: !showSuccessModal && (fotos.length > 0 || observacao.trim().length > 0),
    dados: dadosRascunho,
    restaurar: (salvo) => {
      if (salvo.observacao) setObservacao(salvo.observacao);
      if (salvo.localArmazenamento) setLocalArmazenamento(salvo.localArmazenamento);

      const recuperadas = (salvo.fotos || [])
        .map((foto) => {
          const file = base64ParaFile(foto.base64, foto.nome || "foto.jpg");
          return file ? { id: foto.id, file, base64: foto.base64 } : null;
        })
        .filter((foto): foto is FotoSelecionada => foto !== null);

      if (recuperadas.length > 0) setFotos(recuperadas);
      if (recuperadas.length > 0 || salvo.observacao) setRascunhoRecuperado(true);
    },
    // Cota estourada: melhor voltar com os campos digitados do que com nada.
    versaoLeve: (atual) => ({ ...atual, fotos: [] }),
  });

  const backgroundTaskRef = useRef<Promise<void> | null>(null);
  // Identifica o registro exibido no modal: impede que a etiqueta de um
  // registro anterior apareça no sucesso do seguinte.
  const submissaoAtualRef = useRef<string>("");


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
        setTelefoneMorador(limparTelefone(cached.whatsapp || cached.telefone || ""));
        setEmailMorador(cached.email || "");
        setMoradorNome(cached.nome || "");
        return;
      }

      try {
        const { data } = await supabase.from("users").select("*").eq("id", selectedMorador).single();
        if (data) {
          setCachedData(cacheKey, data);
          setTelefoneMorador(limparTelefone(data.whatsapp || data.telefone || ""));
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

      if (efetivoCondominioId) {
        const cacheKey = `cond_${efetivoCondominioId}`;
        const cached = getCachedData(cacheKey);
        if (cached) {
          condominioNome = cached.nome || efetivoCondominioId;
        } else {
          promises.push(
            (async () => {
              const { data } = await supabase.from("condominios").select("*").eq("id", efetivoCondominioId).single();
              if (data) {
                setCachedData(cacheKey, data);
                condominioNome = data.nome || efetivoCondominioId;
              }
            })()
          );
        }
      }

      if (selectedBloco) {
        const cacheKey = `bloco_${selectedBloco}`;
        const cached = getCachedData(cacheKey);
        if (cached) {
          blocoNome = cached.nome || selectedBloco;
        } else {
          promises.push(
            (async () => {
              const { data } = await supabase.from("blocos").select("*").eq("id", selectedBloco).single();
              if (data) {
                setCachedData(cacheKey, data);
                blocoNome = data.nome || selectedBloco;
              }
            })()
          );
        }
      }

      if (selectedMorador) {
        const cacheKey = `morador_${selectedMorador}`;
        const cached = getCachedData(cacheKey);
        if (cached) {
          nomeMorador = cached.nome || selectedMorador;
          apartamento = cached.apartamento || cached.unidade || cached.unidadeNome || cached.numero || "";
        } else {
          promises.push(
            (async () => {
              const { data } = await supabase.from("users").select("*").eq("id", selectedMorador).single();
              if (data) {
                setCachedData(cacheKey, data);
                nomeMorador = data.nome || selectedMorador;
                apartamento = data.apartamento || data.unidade || data.unidade_nome || data.numero || "";
              }
            })()
          );
        }
      }

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
      const novoProtocolo = await gerarProtocoloUnico(efetivoCondominioId);
      const docId = crypto.randomUUID();
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
      const novoLinkPublico = `${baseUrl}/ver/${docId}`;
      
      setProtocolo(novoProtocolo);
      setLinkPublico(novoLinkPublico);
      setProgress(30);

      // PASSO 2: Buscar nomes (com cache, muito rápido)
      setMessage("Preparando dados...");
      const nomes = await buscarNomes();
      setProgress(50);

      const nomeUser = user?.nome || "Responsável";
      const responsavelRegistro = `${nomeUser} (Gestão)`;

      // PASSO 3: Gerar mensagem formatada IMEDIATAMENTE
      const variaveis = {
        MORADOR: nomes.moradorNome,
        UNIDADE: nomes.apartamento,
        BLOCO: nomes.blocoNome,
        PROTOCOLO: novoProtocolo,
        LOCAL: localArmazenamento,
        RECEBIDO_POR: nomeUser,
        DATA_HORA: formatPtBrDateTime(),
        CONDOMINIO: nomes.condominioNome || "Condomínio",
      };

      // Um registro pode agrupar várias correspondências (uma foto para cada).
      const totalFotos = fotos.length;
      const volumes = Math.max(totalFotos, 1);

      const msgBase = await getFormattedMessage("ARRIVAL", variaveis);
      const msgComVolumes =
        volumes > 1
          ? `${msgBase}\n\n*São ${volumes} correspondências neste aviso.*`
          : msgBase;
      setMensagemFormatada(buildFinalWhatsappMessage(msgComVolumes, novoLinkPublico));
      setProgress(100);

      // PASSO 4: Liberar a tela IMEDIATAMENTE.
      // Etiqueta, uploads e e-mail não precisam ser esperados aqui — a
      // mensagem de WhatsApp, que é o que se usa em seguida, já está pronta.
      // O botão "Ver PDF" mostra um spinner até a etiqueta ficar pronta.
      setPdfUrl("");
      submissaoAtualRef.current = docId;
      setLoading(false);
      setShowSuccessModal(true);

      // PASSO 5: Gravação e anexos em background (não bloqueiam o usuário)
      backgroundTaskRef.current = (async () => {
        try {
          // A correspondência é gravada primeiro e sem depender de PDF/foto:
          // se a tela for fechada em seguida, o registro já existe. As URLs
          // entram num update logo depois.
          const gravacao = (async () => {
            const { error: insertErr } = await supabase.from("correspondencias").insert({
              id: docId,
              condominio_id: efetivoCondominioId,
              bloco_id: selectedBloco,
              bloco_nome: nomes.blocoNome,
              morador_id: selectedMorador,
              morador_nome: nomes.moradorNome,
              apartamento: nomes.apartamento,
              protocolo: novoProtocolo,
              observacao,
              local_armazenamento: localArmazenamento,
              status: "pendente",
              criado_em: new Date().toISOString(),
              criado_por: user?.email || "responsavel",
              criado_por_nome: nomeUser,
              criado_por_cargo: "Responsável",
              imagem_url: "",
              pdf_url: "",
              morador_telefone: telefoneMorador,
              morador_email: emailMorador,
            });
            if (insertErr) throw insertErr;
          })();
          // Handler imediato: sem ele, uma falha de rede aqui viraria
          // "unhandled rejection" enquanto o fluxo ainda está gerando o PDF.
          // É preciso saber que a encomenda NÃO ficou registrada — antes a
          // falha era silenciosa e a etiqueta já saía impressa.
          gravacao.catch((gravacaoErr) => {
            console.error("❌ [Background] Falha ao gravar a correspondência:", gravacaoErr);
            alert(
              `Falha ao salvar a correspondência (protocolo ${novoProtocolo}).\n` +
              `Verifique a conexão e registre novamente.`
            );
          });

          // As fotos sobem em paralelo entre si e com a geração da etiqueta.
          // Grava-se apenas a primeira em imagem_url: o nome do arquivo carrega
          // "1de5", e as demais são derivadas dele sem consulta nenhuma.
          const publicacaoFoto = (async () => {
            if (totalFotos === 0) return "";
            const carimbo = Date.now();
            let url = "";
            try {
              const enviadas = await Promise.all(
                fotos.map(async (foto, indice) => {
                  const fotoPath = `correspondencias/${nomeArquivoFoto(
                    novoProtocolo,
                    carimbo,
                    indice + 1,
                    totalFotos
                  )}`;
                  const { error: fotoUpErr } = await supabase.storage
                    .from("correspondencias")
                    .upload(fotoPath, foto.file);
                  if (fotoUpErr) {
                    console.error(`⚠️ [Background] Falha na foto ${indice + 1}:`, fotoUpErr);
                    return "";
                  }
                  return supabase.storage.from("correspondencias").getPublicUrl(fotoPath).data
                    .publicUrl;
                })
              );

              // Se a primeira falhar, qualquer outra serve de âncora do lote.
              url = enviadas.find(Boolean) || "";
              if (!url) return "";

              await gravacao;
              await supabase.from("correspondencias").update({ imagem_url: url }).eq("id", docId);
            } catch (fotoErr) {
              console.error("⚠️ [Background] Falha ao publicar as fotos:", fotoErr);
            }
            return url;
          })();

          // O aviso ao morador não espera a etiqueta: só o registro gravado e a
          // foto publicada, que é o que ele vê ao abrir o link.
          const envioEmail = emailMorador
            ? (async () => {
                try {
                  await gravacao;
                  await publicacaoFoto;
                  const now = new Date();
                  await EmailService.enviarNovaCorrespondencia(emailMorador, {
                    nomeMorador: nomes.moradorNome,
                    tipoCorrespondencia:
                      volumes > 1
                        ? `${volumes} correspondências${observacao ? ` — ${observacao}` : ""}`
                        : observacao || "Encomenda",
                    dataChegada: now.toLocaleDateString('pt-BR'),
                    horaChegada: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    condominioNome: nomes.condominioNome || "Condomínio",
                    blocoNome: nomes.blocoNome,
                    numeroUnidade: nomes.apartamento,
                    localRetirada: localArmazenamento,
                    dashboardUrl: novoLinkPublico
                  });
                } catch (emailErr) {
                  console.error("⚠️ [Background] Erro ao enviar e-mail:", emailErr);
                }
              })()
            : null;

          // jsPDF trava a thread da interface: cede um quadro para o modal de
          // sucesso ser pintado antes de gerar a etiqueta.
          await new Promise((r) => setTimeout(r, 50));
          const pdfBlob = await gerarEtiquetaPDF({
            protocolo: novoProtocolo,
            condominioNome: nomes.condominioNome,
            moradorNome: nomes.moradorNome,
            bloco: nomes.blocoNome,
            apartamento: nomes.apartamento,
            dataChegada: new Date().toISOString(),
            recebidoPor: responsavelRegistro,
            // A etiqueta é uma só para o lote; o número de volumes vai no texto
            // e as demais fotos ficam no link público (QR Code).
            observacao:
              volumes > 1
                ? `${volumes} CORRESPONDÊNCIAS${observacao ? ` — ${observacao}` : ""}`
                : observacao,
            localRetirada: localArmazenamento,
            fotoUrl: fotos[0]?.base64 || "", // Já está em base64 e comprimida!
            logoUrl: "/logo-app-correspondencia.png",
            linkPublico: novoLinkPublico,
          });

          // Só publica a etiqueta se este ainda for o registro na tela.
          if (submissaoAtualRef.current === docId) {
            setPdfUrl(URL.createObjectURL(pdfBlob));
          }

          const pdfPath = `correspondencias/entrada_${novoProtocolo}_${Date.now()}.pdf`;
          const { error: pdfUpErr } = await supabase.storage
            .from("correspondencias")
            .upload(pdfPath, pdfBlob);

          await gravacao;

          if (!pdfUpErr) {
            const publicPdfUrl = supabase.storage
              .from("correspondencias")
              .getPublicUrl(pdfPath).data.publicUrl;
            await supabase
              .from("correspondencias")
              .update({ pdf_url: publicPdfUrl })
              .eq("id", docId);
          } else {
            console.error("⚠️ [Background] Falha ao subir a etiqueta:", pdfUpErr);
          }

          console.log("✅ [Background] Correspondência salva! ID:", docId);

          await publicacaoFoto;
          if (envioEmail) await envioEmail;
        } catch (err) {
          console.error("❌ [Background] Erro ao concluir anexos:", err);
        }
      })();

    } catch (err) {
      console.error(err);
      setLoading(false);
      alert("Ocorreu um erro ao processar. Tente novamente.");
    }
  };

  const handleCloseSuccess = () => {
    // Não espera o background: uploads e e-mail seguem sozinhos enquanto a
    // tela já fica livre para o próximo registro.
    submissaoAtualRef.current = "";
    if (pdfUrl.startsWith("blob:")) {
      // Atraso para não invalidar uma aba de impressão recém-aberta.
      const paraLiberar = pdfUrl;
      setTimeout(() => URL.revokeObjectURL(paraLiberar), 60_000);
    }

    setObservacao("");
    setFotos([]);
    setRascunhoRecuperado(false);
    setPdfUrl("");
    setLinkPublico("");
    setMensagemFormatada("");
    setSelectedMorador("");
    setShowSuccessModal(false);
  };

  const handleImprimir = () => {
    if (!pdfUrl) {
      alert("A etiqueta está sendo gerada. Tente novamente em instantes.");
      return;
    }
    const target = typeof window !== 'undefined' && (window as any).Capacitor ? "_system" : "_blank";
    window.open(pdfUrl, target);
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

      <main className="max-w-4xl mx-auto px-4 pb-12" style={{ paddingTop: 'calc(6rem + env(safe-area-inset-top))' }}>
        <BotaoVoltar url={backRoute} />

        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-br from-[#057321] to-[#046119]">
              <Building2 className="text-white" size={32} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Nova Encomenda</h1>
              <p className="text-gray-600">Gestão de Entrada</p>
            </div>
          </div>

          <MessageTemplateButton
            condoId={efetivoCondominioId}
            category="ARRIVAL"
            label="Mensagem Whatsapp"
          />
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
                <Camera size={18} className="text-[#057321]" /> Fotos das Encomendas (Opcional)
              </label>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 border-dashed hover:border-[#057321] transition-colors">
                {rascunhoRecuperado && (
                  <div className="mb-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-blue-600" />
                    <p className="text-xs leading-relaxed text-blue-900">
                      <span className="font-bold">Registro recuperado.</span> Estas fotos e
                      observações vieram de um registro que não foi concluído. Confira se são
                      deste morador.
                      <button
                        type="button"
                        onClick={descartarRascunho}
                        className="ml-2 font-bold underline"
                      >
                        Descartar
                      </button>
                    </p>
                  </div>
                )}
                <UploadImagens fotos={fotos} onChange={setFotos} />
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
                  <p className="text-xs leading-relaxed text-amber-900">
                    <span className="font-bold">Sem foto não há múltiplas correspondências.</span>{" "}
                    Para avisar várias de uma vez ao mesmo morador, tire uma foto de cada
                    correspondência: sai um único aviso, com um protocolo só. Se nenhuma foto for
                    tirada, o registro vale por uma correspondência apenas.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={salvar}
                disabled={loading}
                className="w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r from-[#057321] to-[#046119]"
                type="button"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={24} />
                ) : (
                  <CheckCircle size={24} />
                )}
                {loading ? "Registrando..." : "Registrar Entrada"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default withAuth(NovaCorrespondenciaResponsavelPage, ["responsavel", "adminMaster"]);
