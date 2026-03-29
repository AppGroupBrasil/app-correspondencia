"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAvisosRapidos, AvisoRapido } from "@/hooks/useAvisosRapidos";
import Navbar from "@/components/Navbar";
import withAuth from "@/components/withAuth";
import BotaoVoltar from "@/components/BotaoVoltar";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  History,
  Home,
  Building2,
  Clock,
  Image as ImageIcon,
  ExternalLink,
  AlertCircle,
  RefreshCcw,
  Search,
  Package,
  FileSpreadsheet,
  FileDown,
  CheckSquare,
  Square,
  Filter,
} from "lucide-react";

// --- FUNÇÃO AUXILIAR PARA ABRIR LINKS (HÍBRIDO WEB/APP) ---
const abrirLinkExterno = (url?: string | null) => {
  if (!url) return;
  // Detecta se está rodando no Capacitor (App Nativo)
  const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;
  const target = isCapacitor ? "_system" : "_blank";
  window.open(url, target);
};

// --- FUNÇÕES AUXILIARES ---
const converterData = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (timestamp?.toDate) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  try {
    const d = new Date(timestamp);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

const formatarData = (timestamp: any) => {
  const data = converterData(timestamp);
  if (!data) return "Data inválida";

  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);

  const horaStr = data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (data.toDateString() === hoje.toDateString()) return `Hoje às ${horaStr}`;
  if (data.toDateString() === ontem.toDateString()) return `Ontem às ${horaStr}`;
  return `${data.toLocaleDateString("pt-BR")} às ${horaStr}`;
};

function HistoricoAvisosResponsavelPage() {
  const { user } = useAuth();
  const { buscarAvisos, buscarAvisosHoje } = useAvisosRapidos();

  const [avisos, setAvisos] = useState<AvisoRapido[]>([]);
  const [filtro, setFiltro] = useState<"todos" | "hoje">("todos");

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [filtroBloco, setFiltroBloco] = useState("todos");
  const [filtroUnidade, setFiltroUnidade] = useState("todos");
  const [filtroPorteiro, setFiltroPorteiro] = useState("todos");
  const [termoBusca, setTermoBusca] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [erro, setErro] = useState<string>("");

  const limparFiltros = () => {
    setDataInicio("");
    setDataFim("");
    setFiltroBloco("todos");
    setFiltroUnidade("todos");
    setFiltroPorteiro("todos");
    setTermoBusca("");
  };

  const carregarAvisos = useCallback(async () => {
    if (!user?.condominioId) return;

    setLoadingLocal(true);
    setErro("");
    setSelectedIds([]);

    try {
      let dados: AvisoRapido[] = [];

      if (filtro === "hoje") dados = await buscarAvisosHoje(user.condominioId);
      else dados = await buscarAvisos({ condominioId: user.condominioId });

      setAvisos(dados || []);
    } catch (error: any) {
      console.error("Erro ao carregar histórico:", error);
      if (error?.message?.includes("index")) {
        setErro("Falta criar um índice no Firebase. Verifique o console do navegador (F12).");
      } else {
        setErro("Não foi possível carregar os avisos. Tente recarregar a página.");
      }
    } finally {
      setLoadingLocal(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.condominioId, filtro]);

  useEffect(() => {
    carregarAvisos();
  }, [carregarAvisos]);

  const opcoesBlocos = useMemo(() => {
    const set = new Set<string>();
    avisos.forEach((a) => {
      const v = (a.blocoNome || "").trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((x, y) => x.localeCompare(y, "pt-BR", { numeric: true }));
  }, [avisos]);

  const opcoesPorteiros = useMemo(() => {
    const set = new Set<string>();
    avisos.forEach((a) => {
      const v = (a.enviadoPorNome || "").trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((x, y) => x.localeCompare(y, "pt-BR", { numeric: true }));
  }, [avisos]);

  const opcoesUnidades = useMemo(() => {
    const set = new Set<string>();
    avisos.forEach((a) => {
      const blocoOk =
        filtroBloco === "todos" ||
        (a.blocoNome || "").trim().toLowerCase() === filtroBloco.trim().toLowerCase();

      if (!blocoOk) return;

      const apto = (a.apartamento || "").trim();
      if (apto) set.add(apto);
    });
    return Array.from(set).sort((x, y) => x.localeCompare(y, "pt-BR", { numeric: true }));
  }, [avisos, filtroBloco]);

  const avisosFiltrados = useMemo(() => {
    const termo = termoBusca.trim().toLowerCase();

    const inicio = dataInicio ? new Date(`${dataInicio}T00:00:00`) : null;
    const fim = dataFim ? new Date(`${dataFim}T23:59:59`) : null;

    return avisos.filter((aviso) => {
      const matchTexto =
        !termo ||
        (aviso.moradorNome || "").toLowerCase().includes(termo) ||
        (aviso.apartamento || "").toLowerCase().includes(termo) ||
        (aviso.blocoNome || "").toLowerCase().includes(termo) ||
        (aviso.protocolo || "").toLowerCase().includes(termo) ||
        (aviso.enviadoPorNome || "").toLowerCase().includes(termo);

      if (!matchTexto) return false;

      if (filtroBloco !== "todos") {
        const b = (aviso.blocoNome || "").trim().toLowerCase();
        if (b !== filtroBloco.trim().toLowerCase()) return false;
      }

      if (filtroUnidade !== "todos") {
        const u = (aviso.apartamento || "").trim().toLowerCase();
        if (u !== filtroUnidade.trim().toLowerCase()) return false;
      }

      if (filtroPorteiro !== "todos") {
        const p = (aviso.enviadoPorNome || "").trim().toLowerCase();
        if (p !== filtroPorteiro.trim().toLowerCase()) return false;
      }

      if (inicio || fim) {
        const d = converterData(aviso.dataEnvio);
        if (!d) return false;
        if (inicio && d < inicio) return false;
        if (fim && d > fim) return false;
      }

      return true;
    });
  }, [avisos, termoBusca, filtroBloco, filtroUnidade, filtroPorteiro, dataInicio, dataFim]);

  useEffect(() => {
    const visiveis = new Set(avisosFiltrados.map((a) => a.id));
    setSelectedIds((prev) => prev.filter((id) => visiveis.has(id)));
  }, [avisosFiltrados]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === avisosFiltrados.length && avisosFiltrados.length > 0) setSelectedIds([]);
    else setSelectedIds(avisosFiltrados.map((a) => a.id));
  };

  const selecionadosVisiveis = useMemo(() => {
    const setSel = new Set(selectedIds);
    return avisosFiltrados.filter((a) => setSel.has(a.id));
  }, [selectedIds, avisosFiltrados]);

  const exportarExcel = () => {
    if (selectedIds.length === 0) return alert("Selecione pelo menos um item.");
    if (selecionadosVisiveis.length === 0)
      return alert("Nenhum item selecionado está visível com os filtros atuais.");

    const dadosExportar = selecionadosVisiveis.map((a) => ({
      Protocolo: a.protocolo || "-",
      Data: formatarData(a.dataEnvio),
      Morador: a.moradorNome || "-",
      Bloco: a.blocoNome || "-",
      Apartamento: a.apartamento || "-",
      Porteiro: a.enviadoPorNome || "-",
      LinkFoto: a.fotoUrl || a.imagemUrl || "Sem foto",
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Avisos");
    XLSX.writeFile(wb, `Avisos_Selecionados_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const exportarPDF = () => {
    if (selectedIds.length === 0) return alert("Selecione pelo menos um item.");
    if (selecionadosVisiveis.length === 0)
      return alert("Nenhum item selecionado está visível com os filtros atuais.");

    const doc = new jsPDF();
    doc.text("Relatório de Avisos de Correspondência", 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 22);

    const tableData = selecionadosVisiveis.map((a) => [
      formatarData(a.dataEnvio),
      a.protocolo || "-",
      a.moradorNome || "-",
      `${a.blocoNome || "-"} - ${a.apartamento || "-"}`,
      a.enviadoPorNome || "-",
    ]);

    autoTable(doc, {
      head: [["Data/Hora", "Protocolo", "Morador", "Unidade", "Porteiro"]],
      body: tableData,
      startY: 25,
    });

    doc.save(`Relatorio_Avisos_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50/30">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-28">
        <BotaoVoltar url="/dashboard-responsavel/avisos-rapidos" />

        <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-[#057321] rounded-xl shadow-sm p-6 mt-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-br from-[#057321] to-[#046119] p-3 rounded-full shadow-md">
              <History className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Histórico de Avisos</h1>
              <p className="text-gray-600">Filtre, selecione e exporte os avisos enviados.</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto">
              <button
                onClick={() => {
                  setFiltro("hoje");
                  limparFiltros();
                }}
                className={`flex-1 md:flex-none px-6 py-2 rounded-md font-bold text-sm transition-all ${
                  filtro === "hoje" ? "bg-white text-[#057321] shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => {
                  setFiltro("todos");
                  limparFiltros();
                }}
                className={`flex-1 md:flex-none px-6 py-2 rounded-md font-bold text-sm transition-all ${
                  filtro === "todos" ? "bg-white text-[#057321] shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Todos
              </button>
            </div>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
              <input
                type="text"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                placeholder="Buscar geral (nome, apto, protocolo, porteiro)..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#057321] outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  limparFiltros();
                  setSelectedIds([]);
                }}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Limpar filtros"
              >
                <Filter size={20} />
              </button>

              <button
                onClick={carregarAvisos}
                className="p-2 text-[#057321] hover:bg-green-50 rounded-lg transition-colors"
                title="Atualizar"
              >
                <RefreshCcw size={20} className={loadingLocal ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Data inicial</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full p-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Data final</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full p-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Bloco</label>
              <select
                value={filtroBloco}
                onChange={(e) => {
                  setFiltroBloco(e.target.value);
                  setFiltroUnidade("todos");
                }}
                className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white"
              >
                <option value="todos">Todos</option>
                {opcoesBlocos.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Unidade (Apto)</label>
              <select
                value={filtroUnidade}
                onChange={(e) => setFiltroUnidade(e.target.value)}
                className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white"
                disabled={opcoesUnidades.length === 0}
              >
                <option value="todos">Todas</option>
                {opcoesUnidades.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Porteiro</label>
              <select
                value={filtroPorteiro}
                onChange={(e) => setFiltroPorteiro(e.target.value)}
                className="w-full p-2 border border-gray-200 rounded-lg text-sm bg-white"
              >
                <option value="todos">Todos</option>
                {opcoesPorteiros.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#057321] text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
            <span className="font-bold text-sm whitespace-nowrap">{selectedIds.length} selecionado(s)</span>
            <div className="h-6 w-[1px] bg-white/30"></div>
            <button
              onClick={exportarPDF}
              className="flex items-center gap-2 hover:bg-white/20 px-3 py-1 rounded-md transition-colors text-sm font-medium"
            >
              <FileDown size={18} /> PDF
            </button>
            <button
              onClick={exportarExcel}
              className="flex items-center gap-2 hover:bg-white/20 px-3 py-1 rounded-md transition-colors text-sm font-medium"
            >
              <FileSpreadsheet size={18} /> Excel
            </button>
            <button onClick={() => setSelectedIds([])} className="ml-2 text-xs hover:text-red-200 underline">
              Limpar
            </button>
          </div>
        )}

        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3 animate-fade-in">
            <AlertCircle className="text-red-500" size={24} />
            <p className="text-red-700 font-medium">{erro}</p>
          </div>
        )}

        {loadingLocal ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#057321] mx-auto"></div>
            <p className="text-gray-600 mt-4">Carregando histórico...</p>
          </div>
        ) : avisosFiltrados.length === 0 && !erro ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-gray-300 text-center">
            <div className="bg-gray-50 p-4 rounded-full mb-4">
              <Package size={48} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Nenhum aviso encontrado</h3>
            <p className="text-gray-500">Tente ajustar os filtros acima.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-2 mb-2">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#057321] font-medium"
              >
                {selectedIds.length === avisosFiltrados.length && avisosFiltrados.length > 0 ? (
                  <CheckSquare className="text-[#057321]" size={20} />
                ) : (
                  <Square className="text-gray-400" size={20} />
                )}
                Selecionar Todos da Lista ({avisosFiltrados.length})
              </button>
            </div>

            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
              {avisosFiltrados.map((aviso) => {
                const isSelected = selectedIds.includes(aviso.id);
                const foto = aviso.fotoUrl || aviso.imagemUrl;

                return (
                  <div
                    key={aviso.id}
                    className={`bg-white rounded-xl shadow-sm border p-5 transition-all group relative overflow-hidden ${
                      isSelected
                        ? "border-[#057321] ring-1 ring-[#057321] bg-green-50/30"
                        : "border-gray-100 hover:shadow-md hover:border-[#057321]/30"
                    }`}
                  >
                    <div onClick={() => toggleSelect(aviso.id)} className="absolute top-4 right-4 cursor-pointer p-1 z-10">
                      {isSelected ? (
                        <CheckSquare className="text-[#057321] fill-green-100" size={24} />
                      ) : (
                        <Square className="text-gray-300 hover:text-gray-500" size={24} />
                      )}
                    </div>

                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#057321] to-[#046119]"></div>

                    <div className="pl-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 cursor-pointer" onClick={() => toggleSelect(aviso.id)}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-[#057321] bg-green-50 px-2 py-0.5 rounded border border-green-100 uppercase tracking-wider">
                            Aviso WhatsApp
                          </span>
                          {aviso.protocolo && (
                            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                              #{aviso.protocolo}
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-gray-900">{aviso.moradorNome}</h3>

                        <div className="flex items-center gap-3 text-gray-600 text-sm mt-0.5">
                          <span className="flex items-center gap-1">
                            <Building2 size={14} /> {aviso.blocoNome || "-"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Home size={14} /> Apto {aviso.apartamento || "-"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t sm:border-t-0 pt-4 sm:pt-0 border-gray-100">
                        {foto && (
                          <button
                            onClick={() => abrirLinkExterno(foto)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-bold transition-colors border border-blue-100 w-full sm:w-auto justify-center"
                          >
                            <ImageIcon size={16} /> Ver Foto <ExternalLink size={12} />
                          </button>
                        )}

                        <div className="text-right min-w-[140px]">
                          <div className="flex items-center justify-end gap-1.5 text-gray-900 font-semibold text-sm">
                            <Clock size={16} className="text-[#057321]" />
                            {formatarData(aviso.dataEnvio)}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">Por: {aviso.enviadoPorNome || "-"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default withAuth(HistoricoAvisosResponsavelPage, ["responsavel", "adminMaster"]);