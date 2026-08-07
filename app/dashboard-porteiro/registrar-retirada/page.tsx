"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import withAuth from "@/components/withAuth";
import ModalRetiradaProfissional, { prefetchPreferenciasRetirada } from "@/components/ModalRetiradaProfissional";
import { supabase, comApiKeyStorage } from "@/app/lib/supabase";
import {
  Package,
  Zap,
  Search,
  AlertCircle,
  User,
  Home,
  Calendar,
  Clock,
  QrCode,
  X,
  Loader2,
  FileDown,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Filter,
  Trash2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import BotaoVoltar from "@/components/BotaoVoltar";
import { useAuth } from "@/hooks/useAuth";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useTemplates } from "@/hooks/useTemplates";
import { formatPtBrDateTime } from "@/utils/messageFormat";

// --- INTERFACE ---
interface CorrespondenciaDocument {
  id: string;
  protocolo: string;
  moradorNome: string;
  blocoNome: string;
  bloco?: string;     
  apartamento: string;
  unidade?: string;    
  condominioId: string;
  condominioNome: string;
  moradorId: string;
  status: string;
  dataChegada?: any;
  criadoEm?: any;
  tipoCorrespondencia?: string;
  moradorTelefone?: string;
  moradorEmail?: string;
  imagemUrl?: string;
  retiradoEm?: string;
}

function mapCorrespondencia(d: any): CorrespondenciaDocument {
  return {
    id: d.id,
    protocolo: d.protocolo,
    moradorNome: d.morador_nome,
    blocoNome: d.bloco_nome,
    bloco: d.bloco,
    apartamento: d.apartamento,
    unidade: d.unidade,
    condominioId: d.condominio_id,
    condominioNome: d.condominio_nome,
    moradorId: d.morador_id,
    status: d.status,
    dataChegada: d.data_chegada,
    criadoEm: d.criado_em,
    tipoCorrespondencia: d.tipo_correspondencia,
    moradorTelefone: d.morador_telefone,
    moradorEmail: d.morador_email,
    imagemUrl: comApiKeyStorage(d.imagem_url),
    retiradoEm: d.retirado_em,
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extrairCandidato(decodedText: string): string {
  const texto = decodedText.trim();
  try {
    if (texto.startsWith("{")) {
      const obj = JSON.parse(texto);
      if (obj?.p) return String(obj.p);
      if (obj?.id) return String(obj.id);
    }
  } catch {}
  try {
    if (/^https?:\/\//i.test(texto) || texto.includes("?")) {
      const url = new URL(texto, "http://local");
      const idParam = url.searchParams.get("id");
      if (idParam) return idParam;
      const ultimo = url.pathname.split("/").filter(Boolean).pop();
      if (ultimo) return ultimo;
    }
  } catch {}
  if (texto.includes("/")) {
    return texto.split("/").filter(Boolean).pop() || texto;
  }
  return texto;
}

function resolverCodigoQR(
  decodedText: string,
  pendentes: { id: string; protocolo: string }[]
): string {
  const candidato = extrairCandidato(decodedText);
  const item = pendentes.find((p) => p.id === candidato);
  return item ? String(item.protocolo) : candidato;
}

function RegistrarRetiradaPorteiroPage() {
  const _router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  // --- ESTADOS GERAIS ---
  const [busca, setBusca] = useState<string>("");
  const [todosPendentes, setTodosPendentes] = useState<CorrespondenciaDocument[]>([]);
  const [correspondenciaSelecionada, setCorrespondenciaSelecionada] = useState<CorrespondenciaDocument | null>(null);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [showModal, setShowModal] = useState<boolean>(false);
  
  const [mensagemRetirada, setMensagemRetirada] = useState<string>("");
  const { getFormattedMessage } = useTemplates(user?.condominioId || "");

  // --- FILTROS (Apenas Datas agora) ---
  const [tempDataInicio, setTempDataInicio] = useState("");
  const [tempDataFim, setTempDataFim] = useState("");
  
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    inicio: "",
    fim: ""
  });

  const [mostrarFiltrosPendentes, setMostrarFiltrosPendentes] = useState(false);
  const [selectedIdsPendentes, setSelectedIdsPendentes] = useState<string[]>([]);

  // --- REGISTRO RÁPIDO (protocolo -> dados -> assinatura) ---
  const [protocoloRapido, setProtocoloRapido] = useState("");
  const [erroRapido, setErroRapido] = useState("");
  const [buscandoRapido, setBuscandoRapido] = useState(false);
  const [modoRapido, setModoRapido] = useState(false);
  const rapidoInputRef = useRef<HTMLInputElement>(null);
  const scanParaRapidoRef = useRef(false);

  // --- SCANNER ---
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // CORREÇÃO TS: Aceita string, null ou undefined
  const normalizeText = (text: string | null | undefined) =>
    String(text || "").toLowerCase().normalize("NFD").replaceAll(/[\u0300-\u036f]/g, "");

  // --- CARREGAMENTO INICIAL ---
  useEffect(() => {
    if (user?.condominioId) {
      carregarPendencias();
      // Adianta config de retirada e assinatura padrão enquanto o porteiro
      // procura a correspondência: o modal abre sem esperar a rede.
      void prefetchPreferenciasRetirada(user.condominioId, user.uid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.condominioId, user?.uid]);

  useEffect(() => {
    return () => {
        if (scannerRef.current?.isScanning) {
            scannerRef.current.stop().catch((err) => console.warn("Scanner stop error", err));
            scannerRef.current.clear();
        }
    };
  }, []);

  const carregarPendencias = async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from("correspondencias")
        .select("*")
        .eq("condominio_id", user?.condominioId)
        .eq("status", "pendente");

      if (err) throw err;

      const dados: CorrespondenciaDocument[] = (data || []).map(mapCorrespondencia);
      
      dados.sort((a, b) => {
         const dA = a.dataChegada || a.criadoEm || "";
         const dB = b.dataChegada || b.criadoEm || "";
         return String(dB).localeCompare(String(dA));
      });
      
      setTodosPendentes(dados);

      const paramQ = searchParams.get("q");
      if (paramQ) setBusca(paramQ);
    } catch (err) {
      console.error(err);
      setError("Falha ao carregar lista de pendências.");
    } finally {
      setLoading(false);
    }
  };

  // --- DATA FORMATADA ---
  const getDataObjeto = (item: CorrespondenciaDocument): Date | null => {
      const raw = item.dataChegada || item.criadoEm;
      if (!raw) return null;
      if (typeof raw === 'object' && 'seconds' in raw) {
          return new Date(raw.seconds * 1000);
      }
      const strDate = String(raw);
      if (strDate.includes('/')) {
          const parts = strDate.split(' ')[0].split('/');
          if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
      const d = new Date(strDate);
      return Number.isNaN(d.getTime()) ? null : d;
  };

  const getDataFormatadaExibicao = (item: CorrespondenciaDocument) => {
      const dataObj = getDataObjeto(item);
      if (!dataObj) return "Data n/d";
      return dataObj.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' });
  };

  // --- FILTROS ---
  const aplicarFiltrosAvancados = () => {
      setFiltrosAplicados({ inicio: tempDataInicio, fim: tempDataFim });
  };

  const limparFiltrosAvancados = () => {
      setTempDataInicio("");
      setTempDataFim("");
      setFiltrosAplicados({ inicio: "", fim: "" });
  };

  const matchDataFiltro = (item: any, filtros: { inicio: string; fim: string }): boolean => {
    if (!filtros.inicio && !filtros.fim) return true;
    const dataItem = getDataObjeto(item);
    if (!dataItem) return false;
    dataItem.setHours(0, 0, 0, 0);
    if (filtros.inicio) {
      const dInicio = new Date(filtros.inicio);
      dInicio.setHours(0, 0, 0, 0);
      dInicio.setMinutes(dInicio.getMinutes() + dInicio.getTimezoneOffset());
      if (dataItem < dInicio) return false;
    }
    if (filtros.fim) {
      const dFim = new Date(filtros.fim);
      dFim.setHours(23, 59, 59, 999);
      dFim.setMinutes(dFim.getMinutes() + dFim.getTimezoneOffset());
      if (dataItem > dFim) return false;
    }
    return true;
  };

  // --- LÓGICA DE FILTRAGEM ---
  const pendentesFiltrados = useMemo(() => {
    return todosPendentes.filter((item) => {
      const termo = normalizeText(busca);
      
      const matchBusca =
        normalizeText(item.protocolo).includes(termo) ||
        normalizeText(item.apartamento || item.unidade).includes(termo) ||
        normalizeText(item.moradorNome).includes(termo) ||
        normalizeText(item.blocoNome || item.bloco).includes(termo);

      const matchData = matchDataFiltro(item, filtrosAplicados);

      return matchBusca && matchData;
    });
  }, [todosPendentes, busca, filtrosAplicados]);

  // --- SELEÇÃO ---
  const toggleSelect = (id: string) => {
    setSelectedIdsPendentes((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIdsPendentes.length === pendentesFiltrados.length && pendentesFiltrados.length > 0) {
      setSelectedIdsPendentes([]);
    } else {
      setSelectedIdsPendentes(pendentesFiltrados.map((i) => i.id));
    }
  };

  // --- EXPORTAR ---
  const exportarExcel = () => {
    if (selectedIdsPendentes.length === 0) return alert("Selecione itens para exportar.");
    const dadosExportar = todosPendentes
      .filter((i) => selectedIdsPendentes.includes(i.id))
      .map((i) => ({
        Protocolo: i.protocolo,
        Data_Chegada: getDataFormatadaExibicao(i),
        Morador: i.moradorNome,
        Unidade: `${i.blocoNome || i.bloco || ""} - ${i.apartamento || i.unidade}`,
        Status: "Pendente",
      }));
    const ws = XLSX.utils.json_to_sheet(dadosExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pendentes");
    XLSX.writeFile(wb, `Inventario_Pendentes_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const exportarPDF = () => {
    if (selectedIdsPendentes.length === 0) return alert("Selecione itens para exportar.");
    const doc = new jsPDF();
    doc.text("Relatório de Pendências (Inventário)", 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 22);
    const dados = todosPendentes.filter((i) => selectedIdsPendentes.includes(i.id));
    const tableData = dados.map((i) => [
      i.protocolo,
      getDataFormatadaExibicao(i),
      i.moradorNome,
      `${i.blocoNome || i.bloco || ""} - ${i.apartamento || i.unidade}`,
      "Aguardando Retirada",
    ]);
    autoTable(doc, {
      head: [["Protocolo", "Chegada", "Morador", "Unidade", "Status"]],
      body: tableData,
      startY: 25,
    });
    doc.save(`Inventario_Pendentes.pdf`);
  };

  const verificarSeJaFoiRetirada = async () => {
    if (pendentesFiltrados.length > 0) return;
    setLoading(true);
    try {
      const termoNumero = busca.trim();
      if (termoNumero) {
        const { data, error: err } = await supabase
          .from("correspondencias")
          .select("id")
          .eq("condominio_id", user?.condominioId)
          .eq("protocolo", termoNumero)
          .eq("status", "retirada");

        if (err) throw err;

        if (!data || data.length === 0) {
          setError("Nenhuma correspondência encontrada com este protocolo.");
        } else {
          setError(`O protocolo #${busca} já consta como RETIRADO.`);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const iniciarScanner = (paraRapido = false) => {
    scanParaRapidoRef.current = paraRapido;
    setError("");
    setErroRapido("");
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setError("A leitura de QR Code exige HTTPS. Abra o sistema em uma URL segura (https://) ou via localhost.");
      return;
    }
    setShowScanner(true);
    Html5Qrcode.getCameras().then((devices) => {
      if (devices?.length) {
        setCameras(devices);
        const backCamera = devices.find((device) => device.label.toLowerCase().includes("back") || device.label.toLowerCase().includes("traseira"));
        const cameraId = backCamera?.id || devices[0].id;
        setSelectedCamera(cameraId);
        startHtml5Scanner(cameraId);
      } else {
        setError("Nenhuma câmera encontrada.");
        setShowScanner(false);
      }
    }).catch((err) => {
      console.error(err);
      const nome = (err && (err.name || err.code)) || "";
      if (String(nome).includes("NotAllowed") || String(err).includes("Permission")) {
        setError("Permissão de câmera negada. Habilite o acesso à câmera nas configurações do navegador.");
      } else if (String(nome).includes("NotFound") || String(nome).includes("OverconstrainedError")) {
        setError("Nenhuma câmera disponível neste dispositivo.");
      } else {
        setError("Erro ao acessar câmeras. Verifique permissões e conexão HTTPS.");
      }
      setShowScanner(false);
    });
  };

  const startHtml5Scanner = (cameraId: string) => {
    // Quem abriu o scanner define o destino do código lido:
    // painel de Registro Rápido ou campo de busca.
    const finalizarScan = (protocolo: string) => {
      if (scanParaRapidoRef.current) {
        scanParaRapidoRef.current = false;
        setProtocoloRapido(protocolo);
        registroRapidoRef.current(protocolo);
      } else {
        setBusca(protocolo);
      }
    };

    if(scannerRef.current) scannerRef.current.clear();
    const scanner = new Html5Qrcode("qr-reader-modal-porteiro");
    scannerRef.current = scanner;
    scanner.start(
      cameraId,
      {
        fps: 15,
        qrbox: (viewWidth: number, viewHeight: number) => {
          const size = Math.floor(Math.min(viewWidth, viewHeight) * 0.85);
          return { width: size, height: size };
        },
        aspectRatio: 1.0,
        disableFlip: false,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      } as any,
      (decodedText) => {
        scanner.stop().then(async () => {
          scanner.clear();
          setShowScanner(false);
          const candidato = extrairCandidato(decodedText);
          const local = todosPendentes.find((p) => p.id === candidato);
          if (local) {
            finalizarScan(String(local.protocolo));
            return;
          }
          if (UUID_REGEX.test(candidato) && user?.condominioId) {
            try {
              const { data } = await supabase
                .from("correspondencias")
                .select("protocolo")
                .eq("id", candidato)
                .eq("condominio_id", user.condominioId)
                .maybeSingle();
              if (data?.protocolo) {
                await carregarPendencias();
                finalizarScan(String(data.protocolo));
                return;
              }
            } catch (e) { console.warn("Falha ao buscar por id do QR:", e); }
          }
          finalizarScan(candidato);
        }).catch(console.error);
      },
      () => {} 
    ).catch(console.error);
  };

  const pararScanner = () => {
    scanParaRapidoRef.current = false;
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current?.clear();
        setShowScanner(false);
      }).catch(console.error);
    } else {
      setShowScanner(false);
    }
  };

  const prepararMensagemRetirada = useCallback(async (corr: CorrespondenciaDocument) => {
      try {
        const nomeUser = user?.nome || "Porteiro";
        const baseUrl = globalThis.window === undefined ? "" : globalThis.window.location.origin;
        const linkSistema = `${baseUrl}/ver?id=${corr.id}`;
        
        // --- CORREÇÃO DO ERRO DE TIPO ---
        // Garantindo que todos os valores sejam strings usando || ""
        const variaveis = {
          MORADOR: corr.moradorNome || "",
          UNIDADE: corr.apartamento || corr.unidade || "", // Aqui estava o erro
          BLOCO: corr.blocoNome || corr.bloco || "",
          PROTOCOLO: String(corr.protocolo),
          PORTEIRO: nomeUser,
          RETIRADO_POR: nomeUser,
          DATA_HORA: formatPtBrDateTime(),
          CONDOMINIO: corr.condominioNome || "Condomínio",
          LINK: linkSistema,
        };
        const msg = await getFormattedMessage("PICKUP", variaveis);
        setMensagemRetirada(msg);
      } catch (e) {
        console.error("Falha ao gerar mensagem PICKUP:", e);
        setMensagemRetirada("");
      }
    }, [getFormattedMessage, user?.nome]);

  const abrirRetirada = useCallback(
    async (item: CorrespondenciaDocument, rapido: boolean) => {
      setModoRapido(rapido);
      setCorrespondenciaSelecionada(item);
      await prepararMensagemRetirada(item);
      setShowModal(true);
    },
    [prepararMensagemRetirada]
  );

  const handleSelecionarItem = async (item: CorrespondenciaDocument) => {
      await abrirRetirada(item, false);
  };

  // Busca pelo protocolo e já abre a retirada com tudo preenchido:
  // o porteiro só colhe a assinatura.
  const iniciarRegistroRapido = useCallback(
    async (codigo: string) => {
      // Leitor de QR e digitação podem trazer "#", espaços ou URL colada.
      const termo = String(codigo || "")
        .trim()
        .replace(/^#+/, "")
        .trim();
      if (!termo) return;

      if (!user?.condominioId) {
        setErroRapido("Sessão sem condomínio vinculado. Entre novamente.");
        return;
      }
      // Evita disparo duplo (Enter repetido / clique durante a busca).
      if (buscandoRapido || showModal) return;

      setErroRapido("");
      setBuscandoRapido(true);
      try {
        const local = todosPendentes.find(
          (p) => String(p.protocolo).trim().toLowerCase() === termo.toLowerCase()
        );
        if (local) {
          await abrirRetirada(local, true);
          return;
        }

        // ilike sem curinga = igualdade sem diferenciar maiúsculas.
        // Se o texto tiver % ou _, cai no eq para não virar busca por padrão.
        const base = supabase
          .from("correspondencias")
          .select("*")
          .eq("condominio_id", user.condominioId);

        const { data, error: err } = await (/[%_]/.test(termo)
          ? base.eq("protocolo", termo)
          : base.ilike("protocolo", termo)
        )
          .order("criado_em", { ascending: false })
          .limit(5);

        if (err) throw err;

        // Protocolo repetido: a pendente tem prioridade sobre uma baixa antiga.
        const encontrada =
          data?.find((c) => c.status === "pendente") || data?.[0];
        if (!encontrada) {
          setErroRapido(`Protocolo #${termo} não encontrado neste condomínio.`);
          return;
        }
        if (encontrada.status === "retirada") {
          const quando = encontrada.retirado_em
            ? new Date(encontrada.retirado_em).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })
            : "";
          setErroRapido(
            `Protocolo #${termo} já consta como RETIRADO${quando ? ` em ${quando}` : ""}.`
          );
          return;
        }

        await abrirRetirada(mapCorrespondencia(encontrada), true);
      } catch (e) {
        console.error(e);
        setErroRapido("Falha ao buscar o protocolo. Tente novamente.");
      } finally {
        setBuscandoRapido(false);
      }
    },
    [todosPendentes, user?.condominioId, abrirRetirada, buscandoRapido, showModal]
  );

  // O callback do scanner é criado uma vez e não enxerga o estado novo;
  // o ref mantém a versão atual da função.
  const registroRapidoRef = useRef(iniciarRegistroRapido);
  useEffect(() => {
    registroRapidoRef.current = iniciarRegistroRapido;
  }, [iniciarRegistroRapido]);

  useEffect(() => {
    const termo = busca.trim();
    if (!termo || showModal || correspondenciaSelecionada) return;
    const match = todosPendentes.find((p) => String(p.protocolo) === termo);
    if (match) {
      handleSelecionarItem(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, todosPendentes]);

  const handleRetiradaSuccess = () => {
    setShowModal(false);
    setCorrespondenciaSelecionada(null);
    setMensagemRetirada("");
    setBusca("");
    const estavaNaLista = correspondenciaSelecionada
      ? todosPendentes.some((i) => i.id === correspondenciaSelecionada.id)
      : false;
    if (correspondenciaSelecionada) {
      setTodosPendentes((prev) => prev.filter((i) => i.id !== correspondenciaSelecionada.id));
    }
    // Item achado pela busca remota (cadastrado em outro terminal):
    // recarrega para o contador de pendentes não ficar defasado.
    if (!estavaNaLista) void carregarPendencias();
    setError("");
    setSelectedIdsPendentes([]);
    const eraRapido = modoRapido;
    setModoRapido(false);
    setProtocoloRapido("");
    setErroRapido("");
    setTimeout(() => {
      if (eraRapido) rapidoInputRef.current?.focus();
      else inputRef.current?.focus();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="min-h-screen flex flex-col items-center pb-8 px-4" style={{ paddingTop: 'calc(6rem + env(safe-area-inset-top))' }}>
        <div className="max-w-4xl w-full">
          
          <div className="mb-6">
            <div className="w-full flex justify-start mb-4">
               <BotaoVoltar url="/dashboard-porteiro" />
            </div>
            
            <div className="bg-white border-l-4 border-[#057321] rounded-xl shadow-sm p-6 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                  <div className="bg-green-100 text-[#057321] p-3 rounded-full">
                    <Package size={32} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Registrar Saída</h1>
                    <p className="text-gray-500 text-sm">Controle de entregas da portaria</p>
                  </div>
              </div>
              <div className="bg-gray-100 px-4 py-2 rounded-lg text-sm font-semibold text-gray-600">
                  {todosPendentes.length} Pendentes
              </div>
            </div>
          </div>

          {/* REGISTRO RÁPIDO: protocolo -> assinatura */}
          <div className="bg-[#057321] rounded-xl shadow-md p-5 mb-6 text-white">
            <div className="flex items-center gap-3 mb-1">
              <div className="bg-white/20 rounded-full p-2">
                <Zap size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold leading-tight">Registro Rápido</h2>
                <p className="text-green-100 text-sm">
                  Digite o protocolo e colha só a assinatura
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <input
                ref={rapidoInputRef}
                type="text"
                inputMode="numeric"
                value={protocoloRapido}
                onChange={(e) => {
                  setProtocoloRapido(e.target.value);
                  setErroRapido("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") iniciarRegistroRapido(protocoloRapido);
                }}
                placeholder="Nº do protocolo"
                className="flex-1 px-4 py-4 rounded-lg text-gray-900 text-xl font-bold tracking-wide text-center sm:text-left outline-none focus:ring-4 focus:ring-white/40 placeholder:font-normal placeholder:text-base placeholder:text-gray-400"
              />
              <button
                onClick={() => iniciarRegistroRapido(protocoloRapido)}
                disabled={buscandoRapido || !protocoloRapido.trim()}
                className="px-6 py-4 bg-white text-[#057321] rounded-lg font-bold hover:bg-green-50 disabled:opacity-60 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {buscandoRapido ? (
                  <>
                    <Loader2 size={20} className="animate-spin" /> Buscando...
                  </>
                ) : (
                  <>
                    <Zap size={20} /> Retirar
                  </>
                )}
              </button>
              <button
                onClick={() => iniciarScanner(true)}
                className="px-6 py-4 bg-white/15 border border-white/40 text-white rounded-lg font-medium hover:bg-white/25 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <QrCode size={20} /> Ler QR
              </button>
            </div>

            {erroRapido && (
              <div className="mt-3 bg-white/15 border border-white/40 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{erroRapido}</span>
              </div>
            )}
          </div>

          {/* REGISTRO COMPLETO: busca -> conferência -> retirada */}
          <div className="bg-[#057321] rounded-xl shadow-md p-5 mb-6 text-white">
            <div className="flex items-center gap-3 mb-1">
              <div className="bg-white/20 rounded-full p-2">
                <Search size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold leading-tight">Registro Completo</h2>
                <p className="text-green-100 text-sm">
                  Busque por nome, protocolo ou apartamento e confira os dados
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && verificarSeJaFoiRetirada()}
                  placeholder="Buscar Nome, Protocolo ou Apto..."
                  className="w-full px-4 py-4 pl-11 rounded-lg text-gray-900 outline-none focus:ring-4 focus:ring-white/40 placeholder:text-gray-400"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                {loading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 size={20} className="text-[#057321] animate-spin" />
                  </div>
                )}
              </div>

              <button
                onClick={() => verificarSeJaFoiRetirada()}
                disabled={loading || !busca.trim()}
                className="px-6 py-4 bg-white text-[#057321] rounded-lg font-bold hover:bg-green-50 disabled:opacity-60 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Search size={20} /> Buscar
              </button>
              <button
                onClick={() => iniciarScanner(false)}
                className="px-6 py-4 bg-white/15 border border-white/40 text-white rounded-lg font-medium hover:bg-white/25 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <QrCode size={20} /> Ler QR
              </button>
            </div>

            {error && (
              <div className="mt-3 bg-white/15 border border-white/40 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-6 animate-in fade-in slide-in-from-bottom-2">

            {/* BOTÃO TOGGLE FILTROS */}
            <button onClick={() => setMostrarFiltrosPendentes(!mostrarFiltrosPendentes)} className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-green-700 mb-2" type="button">
                <Filter size={16} /> {mostrarFiltrosPendentes ? "Ocultar Filtros de Data" : "Filtrar por Data"}
            </button>

            {/* ÁREA DE FILTROS (SÓ DATA AGORA) */}
            {mostrarFiltrosPendentes && (
                <div className="bg-gray-50 rounded-lg border border-gray-100 p-4 mb-4 animate-in slide-in-from-top-2">
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <div className="flex-1">
                            <label htmlFor="filtro-data-inicio" className="text-xs text-gray-500 font-semibold block mb-1">De (Data Inicial)</label>
                            <input id="filtro-data-inicio" type="date" value={tempDataInicio} onChange={(e) => setTempDataInicio(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white" />
                        </div>
                        <div className="flex-1">
                            <label htmlFor="filtro-data-fim" className="text-xs text-gray-500 font-semibold block mb-1">Até (Data Final)</label>
                            <input id="filtro-data-fim" type="date" value={tempDataFim} onChange={(e) => setTempDataFim(e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white" />
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
                        <button onClick={limparFiltrosAvancados} className="px-4 py-2 text-sm text-gray-600 hover:text-red-600 font-medium flex items-center gap-2 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={16} /> Limpar
                        </button>
                        <button onClick={aplicarFiltrosAvancados} className="px-6 py-2 text-sm bg-[#057321] text-white font-bold rounded-lg hover:bg-[#046019] shadow-sm transition-colors">
                            Filtrar Resultados
                        </button>
                    </div>
                </div>
            )}

          </div>

          {/* LISTAGEM */}
          {pendentesFiltrados.length > 0 ? (
              <div className="animate-fade-in space-y-4 pb-20">
                <div className="flex justify-between items-center mb-2 px-2">
                  <h3 className="text-lg font-semibold text-gray-800">{pendentesFiltrados.length} para retirar</h3>
                  <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-green-700">
                    {selectedIdsPendentes.length === pendentesFiltrados.length ? <CheckSquare size={20} className="text-green-600" /> : <Square size={20} />}
                    Todos
                  </button>
                </div>

                <div className="grid gap-4">
                  {pendentesFiltrados.map((item) => {
                    const isSelected = selectedIdsPendentes.includes(item.id);
                    return (
                      <div key={item.id} className={`bg-white p-5 rounded-xl border transition-all relative ${isSelected ? "border-green-500 bg-green-50 ring-1 ring-green-500" : "border-gray-200 hover:shadow-md"}`}>
                        <button type="button" onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }} className="absolute top-5 right-5 cursor-pointer z-10 p-1">
                            {isSelected ? <CheckSquare size={24} className="text-green-600" /> : <Square size={24} className="text-gray-300 hover:text-green-600" />}
                        </button>

                        <button type="button" onClick={() => handleSelecionarItem(item)} className="cursor-pointer pr-10 group w-full text-left">
                           <div className="flex gap-3">
                              <div className="bg-blue-50 p-2.5 rounded-lg text-blue-600 h-fit">
                                {item.tipoCorrespondencia?.toLowerCase().includes("encomenda") ? <Package size={32} /> : <Calendar size={24} />}
                              </div>
                              <div>
                                <p className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                  {item.tipoCorrespondencia || "Correspondência"}
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border">#{item.protocolo}</span>
                                </p>
                                <div className="flex flex-col gap-1 mt-2 text-sm text-gray-600">
                                  <span className="flex items-center gap-1"><User size={14} /> {item.moradorNome}</span>
                                  <span className="flex items-center gap-1"><Home size={14} /> {item.blocoNome || item.bloco} - {item.apartamento || item.unidade}</span>
                                  
                                  {/* DATA CHEGADA NO CARD */}
                                  <div className="flex items-center gap-1.5 mt-2 text-[#057321] font-medium bg-green-50 w-fit px-2 py-1 rounded text-xs border border-green-100">
                                      <Clock size={12} /> 
                                      <span>Chegou: {getDataFormatadaExibicao(item)}</span>
                                  </div>
                                </div>
                              </div>
                           </div>
                           <div className="mt-3 ml-14">
                              <span className="text-green-600 font-medium text-xs bg-green-50 px-3 py-1 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors">
                                Registrar Saída
                              </span>
                           </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
          ) : (
              !loading && !error && (
                 <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                    <Package size={48} className="mx-auto text-gray-200 mb-2" />
                    <p>Nenhuma correspondência encontrada com esses filtros.</p>
                 </div>
              )
          )}

          {selectedIdsPendentes.length > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 z-40 animate-in slide-in-from-bottom-10 fade-in duration-300">
                <span className="font-bold whitespace-nowrap text-sm">{selectedIdsPendentes.length} Sel.</span>
                <button onClick={exportarPDF} className="flex items-center gap-1 hover:bg-white/20 px-2 py-1 rounded transition-colors text-sm"><FileDown size={16} /> PDF</button>
                <button onClick={exportarExcel} className="flex items-center gap-1 hover:bg-white/20 px-2 py-1 rounded transition-colors text-sm"><FileSpreadsheet size={16} /> Excel</button>
                <button onClick={() => setSelectedIdsPendentes([])} className="ml-2 text-xs underline opacity-80 hover:opacity-100">Limpar</button>
              </div>
          )}

          {showModal && correspondenciaSelecionada && (
            <ModalRetiradaProfissional
              correspondencia={correspondenciaSelecionada as any} 
              mensagemFormatada={mensagemRetirada}
              modoRapido={modoRapido}
              onClose={() => {
                setShowModal(false);
                setCorrespondenciaSelecionada(null);
                setMensagemRetirada("");
                const eraRapido = modoRapido;
                setModoRapido(false);
                setTimeout(() => {
                  if (eraRapido) rapidoInputRef.current?.focus();
                  else inputRef.current?.focus();
                }, 100);
              }}
              onSuccess={handleRetiradaSuccess}
            />
          )}

          {showScanner && (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex flex-col items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden relative shadow-2xl">
                    <div className="p-4 bg-gray-900 flex justify-between items-center">
                        <h3 className="text-white font-bold flex items-center gap-2"><QrCode className="text-green-400" /> Escanear Código</h3>
                        <button onClick={pararScanner} className="text-gray-400 hover:text-white"><X size={24} /></button>
                    </div>
                    <div className="p-4 bg-black flex justify-center">
                        <div id="qr-reader-modal-porteiro" className="w-full rounded-lg overflow-hidden border-2 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]"></div>
                    </div>
                    <div className="p-4 bg-gray-100 flex flex-col gap-3">
                          {cameras.length > 1 && (
                             <select value={selectedCamera} onChange={(e) => { if (scannerRef.current) { scannerRef.current.stop().then(() => { setSelectedCamera(e.target.value); startHtml5Scanner(e.target.value); }); } }} className="w-full p-3 border border-gray-300 rounded-lg bg-white">
                                 {cameras.map(cam => <option key={cam.id} value={cam.id}>{cam.label || `Câmera ${cam.id.slice(0,5)}...`}</option>)}
                             </select>
                          )}
                          <p className="text-center text-sm text-gray-600">Aponte a câmera para o QR Code.</p>
                          <button onClick={pararScanner} className="w-full py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-colors">Cancelar</button>
                    </div>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default withAuth(RegistrarRetiradaPorteiroPage, ["porteiro", "responsavel", "adminMaster"]);