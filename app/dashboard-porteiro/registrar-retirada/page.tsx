"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import withAuth from "@/components/withAuth";
import ModalRetiradaProfissional from "@/components/ModalRetiradaProfissional";
import { supabase } from "@/app/lib/supabase";
import {
  Package,
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.condominioId]);

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

      const dados: CorrespondenciaDocument[] = (data || []).map((d: any) => ({
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
      }));
      
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

  const iniciarScanner = () => {
    setError("");
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
      setError("Erro ao acessar câmeras.");
      setShowScanner(false);
    });
  };

  const startHtml5Scanner = (cameraId: string) => {
    if(scannerRef.current) scannerRef.current.clear();
    const scanner = new Html5Qrcode("qr-reader-modal-porteiro");
    scannerRef.current = scanner;
    scanner.start(
      cameraId,
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        scanner.stop().then(() => {
          scanner.clear();
          setShowScanner(false);
          let codigoLimpo = decodedText.trim();
          if (codigoLimpo.includes("/")) codigoLimpo = codigoLimpo.split("/").pop()!;
          setBusca(codigoLimpo);
        }).catch(console.error);
      },
      () => {} 
    ).catch(console.error);
  };

  const pararScanner = () => {
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

  const handleSelecionarItem = async (item: CorrespondenciaDocument) => {
      setCorrespondenciaSelecionada(item);
      await prepararMensagemRetirada(item);
      setShowModal(true);
  };

  const handleRetiradaSuccess = () => {
    setShowModal(false);
    setCorrespondenciaSelecionada(null);
    setMensagemRetirada("");
    setBusca("");
    if (correspondenciaSelecionada) {
      setTodosPendentes((prev) => prev.filter((i) => i.id !== correspondenciaSelecionada.id));
    }
    setError("");
    setSelectedIdsPendentes([]);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="min-h-screen flex flex-col items-center pt-20 pb-8 px-4">
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

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-6 animate-in fade-in slide-in-from-bottom-2">
            
            {/* BUSCA E QR CODE */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
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
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#057321] focus:border-[#057321] outline-none transition-all"
                />
                <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
                {loading && (
                  <div className="absolute right-3 top-3.5">
                    <Loader2 size={20} className="text-[#057321] animate-spin" />
                  </div>
                )}
              </div>

              <button onClick={iniciarScanner} className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-all flex items-center justify-center gap-2 font-medium shadow-sm whitespace-nowrap">
                <QrCode size={20} className="text-green-400" /> Ler QR
              </button>
              <button onClick={() => verificarSeJaFoiRetirada()} disabled={loading || !busca.trim()} className="px-6 py-3 bg-[#057321] text-white rounded-lg hover:bg-[#046019] disabled:opacity-50 transition-all font-medium shadow-sm">
                  Buscar
              </button>
            </div>

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

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-700 animate-fade-in">
                <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                <span className="text-sm font-medium">{error}</span>
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
              onClose={() => {
                setShowModal(false);
                setCorrespondenciaSelecionada(null);
                setMensagemRetirada("");
                setTimeout(() => inputRef.current?.focus(), 100);
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