"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import withAuth from "@/components/withAuth";
import ModalRetiradaProfissional from "@/components/ModalRetiradaProfissional";
import { supabase } from "@/app/lib/supabase";
import {
  Package,
  Search,
  AlertCircle,
  ArrowLeft,
  User,
  Home,
  Calendar,
  Clock,
  QrCode,
  X,
  Settings,
  Loader2,
  FileDown,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Filter,
  Send,
  MessageCircle,
  Mail,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { Scanner } from "@yudiel/react-qr-scanner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import MessageTemplateButton from "@/components/MessageTemplateButton";
import { useTemplates } from "@/hooks/useTemplates";
import { formatPtBrDateTime } from "@/utils/messageFormat";

interface CorrespondenciaDocument {
  id: string;
  protocolo: string;
  moradorNome: string;
  blocoNome: string;
  apartamento: string;
  condominioId: string;
  condominioNome: string;
  moradorId: string;
  status: string;
  dataChegada?: string;
  tipoCorrespondencia?: string;
  moradorTelefone?: string;
  moradorEmail?: string;

  compartilhadoVia?: string[];
  compartilhadoEm?: any;
  criadoEm?: any;
  dataHora?: any;
}

function RegistrarRetiradaResponsavelPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [busca, setBusca] = useState<string>("");

  const [todosPendentes, setTodosPendentes] = useState<CorrespondenciaDocument[]>([]);
  const [correspondenciaSelecionada, setCorrespondenciaSelecionada] =
    useState<CorrespondenciaDocument | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [mostrarCamera, setMostrarCamera] = useState(false);

  const [mensagemRetirada, setMensagemRetirada] = useState<string>("");

  const { getFormattedMessage } = useTemplates(user?.condominioId || "");

  // ✅ filtros só data de/até + morador
  const [filtroPendenteDataDe, setFiltroPendenteDataDe] = useState("");
  const [filtroPendenteDataAte, setFiltroPendenteDataAte] = useState("");
  const [filtroPendenteMorador, setFiltroPendenteMorador] = useState("");
  const [selectedIdsPendentes, setSelectedIdsPendentes] = useState<string[]>([]);
  const [mostrarFiltrosPendentes, setMostrarFiltrosPendentes] = useState(false);

  const normalizeText = (text: string) =>
    String(text).toLowerCase().normalize("NFD").replaceAll(/[\u0300-\u036f]/g, "");

  const formatarDataHora = (valor: any) => {
    if (!valor) return null;
    try {
      if (valor?.seconds) {
        return new Date(valor.seconds * 1000).toLocaleString("pt-BR");
      }
      const d = new Date(valor);
      if (Number.isNaN(d.getTime())) return null;
      return null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (user?.condominioId) {
      carregarDadosIniciais();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.condominioId]);

  const carregarDadosIniciais = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("correspondencias")
        .select("*")
        .eq("condominio_id", user?.condominioId)
        .eq("status", "pendente");

      if (error) throw error;
      const dados: CorrespondenciaDocument[] = (data || []).map((d: any) => ({
        id: d.id,
        protocolo: d.protocolo,
        moradorNome: d.morador_nome,
        blocoNome: d.bloco_nome,
        apartamento: d.apartamento,
        condominioId: d.condominio_id,
        condominioNome: d.condominio_nome,
        moradorId: d.morador_id,
        status: d.status,
        dataChegada: d.data_chegada,
        tipoCorrespondencia: d.tipo_correspondencia,
        moradorTelefone: d.morador_telefone,
        moradorEmail: d.morador_email,
        compartilhadoVia: d.compartilhado_via,
        compartilhadoEm: d.compartilhado_em,
        criadoEm: d.criado_em,
        dataHora: d.data_hora,
      }));
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

  const matchDataChegada = (dataChegada: string | undefined, dataDe: string, dataAte: string): boolean => {
    if ((!dataDe && !dataAte) || !dataChegada) return true;
    const parts = dataChegada.split(" ")[0].split("/");
    if (parts.length !== 3) return true;
    const [dia, mes, ano] = parts;
    const dataItem = new Date(`${ano}-${mes}-${dia}`);
    if (dataDe && dataItem < new Date(dataDe)) return false;
    if (dataAte) {
      const limiteAte = new Date(dataAte);
      limiteAte.setHours(23, 59, 59, 999);
      if (dataItem > limiteAte) return false;
    }
    return true;
  };

  const pendentesFiltrados = useMemo(() => {
    return todosPendentes.filter((item) => {
      const termo = normalizeText(busca);
      const matchBusca =
        normalizeText(item.protocolo).includes(termo) ||
        normalizeText(item.apartamento).includes(termo) ||
        normalizeText(item.moradorNome).includes(termo) ||
        normalizeText(item.blocoNome || "").includes(termo);

      const matchMorador = normalizeText(item.moradorNome || "").includes(
        normalizeText(filtroPendenteMorador)
      );

      const matchData = matchDataChegada(item.dataChegada, filtroPendenteDataDe, filtroPendenteDataAte);

      return matchBusca && matchMorador && matchData;
    });
  }, [
    todosPendentes,
    busca,
    filtroPendenteMorador,
    filtroPendenteDataDe,
    filtroPendenteDataAte,
  ]);

  const toggleSelect = (id: string) => {
    setSelectedIdsPendentes((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (
      selectedIdsPendentes.length === pendentesFiltrados.length &&
      pendentesFiltrados.length > 0
    ) {
      setSelectedIdsPendentes([]);
    } else {
      setSelectedIdsPendentes(pendentesFiltrados.map((i) => i.id));
    }
  };

  const exportarExcel = () => {
    if (selectedIdsPendentes.length === 0)
      return alert("Selecione itens para exportar.");

    const dadosExportar = todosPendentes
      .filter((i) => selectedIdsPendentes.includes(i.id))
      .map((i) => ({
        Protocolo: i.protocolo,
        Data_Chegada: i.dataChegada,
        Morador: i.moradorNome,
        Unidade: `${i.blocoNome || ""} - ${i.apartamento}`,
        Status: "Pendente",
      }));

    const ws = XLSX.utils.json_to_sheet(dadosExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pendentes");
    XLSX.writeFile(
      wb,
      `Inventario_Pendentes_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  const exportarPDF = () => {
    if (selectedIdsPendentes.length === 0)
      return alert("Selecione itens para exportar.");

    const doc = new jsPDF();
    doc.text("Relatório de Pendências (Inventário)", 14, 15);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 22);

    const dados = todosPendentes.filter((i) =>
      selectedIdsPendentes.includes(i.id)
    );

    const tableData = dados.map((i) => [
      i.protocolo,
      i.dataChegada || "-",
      i.moradorNome,
      `${i.blocoNome || ""} - ${i.apartamento}`,
      "Aguardando Retirada",
    ]);

    autoTable(doc, {
      head: [["Protocolo", "Data Chegada", "Morador", "Unidade", "Status"]],
      body: tableData,
      startY: 25,
    });

    doc.save("Inventario_Pendentes.pdf");
  };

  const verificarSeJaFoiRetirada = async () => {
    if (pendentesFiltrados.length > 0) return;

    setLoading(true);
    try {
      const termoNumero = Number(busca);
      if (Number.isNaN(termoNumero)) {
        setError("Nada encontrado.");
      } else {
        const { data: snap } = await supabase
          .from("correspondencias")
          .select("id")
          .eq("condominio_id", user?.condominioId)
          .eq("protocolo", String(termoNumero))
          .eq("status", "retirada");

        if (!snap || snap.length === 0) {
          setError("Nada encontrado.");
        } else {
          setError(`Protocolo #${busca} JÁ RETIRADO.`);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const processarLeitura = (conteudo: string) => {
    if (!conteudo) return;
    try {
      if (navigator.vibrate) navigator.vibrate(200);
    } catch {}
    let codigoLimpo = conteudo.trim();
    if (codigoLimpo.includes("/"))
      codigoLimpo = codigoLimpo.split("/").pop()!;
    setMostrarCamera(false);
    setBusca(codigoLimpo);
  };

  const prepararMensagemRetirada = useCallback(
    async (corr: CorrespondenciaDocument) => {
      try {
        const nomeUser = user?.nome || "Responsável";
        const baseUrl =
          globalThis.window === undefined ? "" : globalThis.window.location.origin;
        const linkSistema = `${baseUrl}/ver?id=${corr.id}`;

        const variaveis = {
          MORADOR: corr.moradorNome,
          UNIDADE: corr.apartamento,
          BLOCO: corr.blocoNome || "",
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
    },
    [getFormattedMessage, user?.nome]
  );

  const handleRetiradaSuccess = () => {
    setShowModal(false);
    setCorrespondenciaSelecionada(null);
    setMensagemRetirada("");
    setBusca("");
    if (correspondenciaSelecionada) {
      setTodosPendentes((prev) =>
        prev.filter((i) => i.id !== correspondenciaSelecionada?.id)
      );
    }
    setError("");
    setSelectedIdsPendentes([]);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ✅ mini badge de canal
  const getCanalIcon = (canal: string) => {
    const c = canal.toLowerCase();
    if (c.includes("whats")) return <MessageCircle size={12} />;
    if (c.includes("email") || c.includes("mail")) return <Mail size={12} />;
    return <Send size={12} />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="min-h-screen flex flex-col items-center pt-28 pb-8 px-4">
        <div className="max-w-4xl w-full">
          <div className="mb-6">
            <button
              onClick={() => router.push("/dashboard-responsavel")}
              className="group flex items-center gap-3 bg-white text-gray-700 px-6 py-3 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:text-[#057321] transition-all font-bold mb-4 w-fit"
              type="button"
            >
              <ArrowLeft
                size={20}
                className="text-gray-500 group-hover:text-[#057321]"
              />
              Voltar para Dashboard
            </button>

            <div className="bg-white border-l-4 border-green-600 rounded-xl shadow-sm p-6 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-green-100 text-green-700 p-3 rounded-full">
                  <Package size={32} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Registrar Retirada
                  </h1>
                  <p className="text-gray-500 text-sm">Inventário e Baixas</p>
                </div>
              </div>

              <div className="flex bg-gray-100 p-1 rounded-lg">
                <button
                  disabled
                  className="px-4 py-2 rounded-md text-sm font-bold bg-white text-green-700 shadow-sm cursor-default"
                  type="button"
                >
                  Pendentes
                </button>
                <button
                  onClick={() =>
                    router.push("/dashboard-responsavel/historico")
                  }
                  className="px-4 py-2 rounded-md text-sm font-bold text-gray-500 hover:text-gray-700 transition-all hover:bg-gray-200/50"
                  type="button"
                >
                  Histórico
                </button>
              </div>
            </div>
          </div>

          <div className="animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-center gap-3 mb-6">
              <button
                onClick={() =>
                  router.push("/dashboard-responsavel/configuracoes-retirada")
                }
                className="flex-1 py-3 bg-white text-[#057321] rounded-lg shadow-sm border border-[#057321] hover:bg-green-50 transition-all flex items-center justify-center gap-2"
                type="button"
              >
                <Settings size={18} />{" "}
                <span className="font-bold text-sm uppercase">Regras</span>
              </button>
              {user?.role !== "porteiro" && (
                <div className="flex-1">
                  <MessageTemplateButton
                    condoId={user?.condominioId || ""}
                    category="PICKUP"
                    label="Mensagem"
                  />
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mb-6">
              {mostrarCamera ? (
                <div className="mb-6 relative bg-black rounded-xl overflow-hidden shadow-inner aspect-video">
                  <button
                    onClick={() => setMostrarCamera(false)}
                    className="absolute top-2 right-2 z-20 bg-white/20 text-white p-2 rounded-full backdrop-blur-sm"
                    type="button"
                  >
                    <X size={24} />
                  </button>
                  <Scanner
                    onScan={(result) =>
                      result?.[0] && processarLeitura(result[0].rawValue)
                    }
                    styles={{ container: { width: "100%", height: "100%" } }}
                  />
                </div>
              ) : (
                <button
                  onClick={() => setMostrarCamera(true)}
                  className="w-full mb-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-md flex items-center justify-center gap-2 transition-all"
                  type="button"
                >
                  <QrCode size={24} /> Ler QR Code
                </button>
              )}

              <div className="flex flex-col sm:flex-row gap-3 relative mb-4">
                <input
                  ref={inputRef}
                  autoFocus={!mostrarCamera}
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && verificarSeJaFoiRetirada()
                  }
                  placeholder="Buscar Nome, Protocolo..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
                {loading && busca.length === 0 && (
                  <div className="absolute right-28 top-3">
                    <Loader2 size={24} className="text-gray-400 animate-spin" />
                  </div>
                )}
                <button
                  onClick={() => verificarSeJaFoiRetirada()}
                  disabled={!busca.trim() && pendentesFiltrados.length === 0}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                  type="button"
                >
                  <Search size={20} /> Ir
                </button>
              </div>

              <button
                onClick={() =>
                  setMostrarFiltrosPendentes(!mostrarFiltrosPendentes)
                }
                className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-green-700 mb-2"
                type="button"
              >
                <Filter size={16} />{" "}
                {mostrarFiltrosPendentes
                  ? "Ocultar Filtros"
                  : "Filtros Avançados"}
              </button>

              {mostrarFiltrosPendentes && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100 animate-in slide-in-from-top-2">
                  <div>
                    <label htmlFor="filtro-resp-data-de" className="text-xs text-gray-500 font-semibold block mb-1">
                      Data (de)
                    </label>
                    <input
                      id="filtro-resp-data-de"
                      type="date"
                      value={filtroPendenteDataDe}
                      onChange={(e) =>
                        setFiltroPendenteDataDe(e.target.value)
                      }
                      className="w-full p-2 border rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="filtro-resp-data-ate" className="text-xs text-gray-500 font-semibold block mb-1">
                      Data (até)
                    </label>
                    <input
                      id="filtro-resp-data-ate"
                      type="date"
                      value={filtroPendenteDataAte}
                      onChange={(e) =>
                        setFiltroPendenteDataAte(e.target.value)
                      }
                      className="w-full p-2 border rounded-lg text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="filtro-resp-morador" className="text-xs text-gray-500 font-semibold block mb-1">
                      Morador
                    </label>
                    <input
                      id="filtro-resp-morador"
                      type="text"
                      value={filtroPendenteMorador}
                      onChange={(e) =>
                        setFiltroPendenteMorador(e.target.value)
                      }
                      className="w-full p-2 border rounded-lg text-sm"
                    />
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

            {pendentesFiltrados.length > 0 ? (
              <div className="animate-fade-in space-y-4 pb-20">
                <div className="flex justify-between items-center mb-2 px-2">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {pendentesFiltrados.length} encontrados
                  </h3>
                  <button
                    onClick={() => toggleSelectAll()}
                    className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-green-700"
                    type="button"
                  >
                    {selectedIdsPendentes.length ===
                    pendentesFiltrados.length ? (
                      <CheckSquare size={20} className="text-green-600" />
                    ) : (
                      <Square size={20} />
                    )}
                    Todos
                  </button>
                </div>

                {pendentesFiltrados.map((item) => {
                  const isSelected = selectedIdsPendentes.includes(item.id);

                  let avisoCount = 0;
                  if (Array.isArray(item.compartilhadoVia)) {
                    avisoCount = item.compartilhadoVia.length;
                  } else if (item.compartilhadoVia) {
                    avisoCount = 1;
                  }

                  const avisoData =
                    formatarDataHora(item.compartilhadoEm) ||
                    formatarDataHora(item.criadoEm) ||
                    formatarDataHora(item.dataHora) ||
                    null;

                  let canais: string[] = [];
                  if (Array.isArray(item.compartilhadoVia)) {
                    canais = item.compartilhadoVia;
                  } else if (item.compartilhadoVia) {
                    canais = [String(item.compartilhadoVia)];
                  }

                  return (
                    <div
                      key={item.id}
                      className={`relative bg-white rounded-2xl border transition-all overflow-hidden ${
                        isSelected
                          ? "border-green-500 ring-2 ring-green-200 shadow-lg"
                          : "border-gray-200 hover:shadow-xl hover:-translate-y-[1px]"
                      }`}
                    >
                      {/* faixa superior decorativa */}
                      <div className="h-1 w-full bg-gradient-to-r from-green-600 via-emerald-500 to-lime-400" />

                      {/* checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(item.id);
                        }}
                        className="absolute top-4 right-4 cursor-pointer z-10 bg-white/90 rounded-full p-1 shadow"
                      >
                        {isSelected ? (
                          <CheckSquare size={22} className="text-green-600" />
                        ) : (
                          <Square
                            size={22}
                            className="text-gray-300 hover:text-green-600"
                          />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          setCorrespondenciaSelecionada(item);
                          await prepararMensagemRetirada(item);
                          setShowModal(true);
                        }}
                        className="cursor-pointer p-5 pr-12 w-full text-left"
                      >
                        <div className="flex gap-4 items-start">
                          {/* ícone principal */}
                          <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-700 shadow-sm border border-emerald-100">
                            {item.tipoCorrespondencia
                              ?.toLowerCase()
                              .includes("encomenda") ? (
                              <Package size={30} />
                            ) : (
                              <Calendar size={26} />
                            )}
                          </div>

                          {/* conteúdo */}
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-extrabold text-gray-900 text-lg">
                                {item.tipoCorrespondencia || "Correspondência"}
                              </h3>

                              <span className="text-base sm:text-lg font-extrabold bg-emerald-600 text-white px-3 py-1 rounded-full shadow-sm border border-emerald-700 tracking-wide">
                              #{item.protocolo}
                              </span>

                              <span className="text-[11px] font-bold bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full border border-yellow-100 uppercase">
                                Pendente
                              </span>
                            </div>

                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                              <span className="flex items-center gap-2">
                                <User size={14} className="text-gray-400" />
                                {item.moradorNome}
                              </span>

                              <span className="flex items-center gap-2">
                                <Home size={14} className="text-gray-400" />
                                {item.blocoNome} - {item.apartamento}
                              </span>

                              {item.dataChegada && (
                                <span className="flex items-center gap-2">
                                  <Clock size={14} className="text-gray-400" />
                                  {item.dataChegada}
                                </span>
                              )}
                            </div>

                            {/* bloco de avisos */}
                            <div className="mt-4 bg-gray-50 border border-gray-100 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex items-center gap-2 text-sm">
                                <AlertCircle size={16} className="text-emerald-600" />
                                <span className="font-semibold text-gray-700">
                                  Avisos enviados:
                                </span>
                                <span className="font-extrabold text-emerald-700">
                                  {avisoCount}
                                </span>
                              </div>

                              {canais.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {canais.map((c, idx) => (
                                    <span key={`${c}-${idx}`} className="inline-flex items-center gap-1 bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-[11px] font-semibold shadow-sm">
                                      {getCanalIcon(c)}
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {avisoData && (
                                <div className="text-xs text-gray-500 font-medium whitespace-nowrap">
                                  Último aviso: <span className="font-bold">{avisoData}</span>
                                </div>
                              )}
                            </div>

                            <div className="mt-3">
                              <span className="inline-flex items-center gap-2 text-emerald-700 font-bold text-xs bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                Clique para registrar saída
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              !loading &&
              (busca.length > 0 ||
                filtroPendenteMorador ||
                filtroPendenteDataDe ||
                filtroPendenteDataAte) &&
              !error && (
                <div className="text-center py-8 text-gray-400">
                  Nada encontrado.
                </div>
              )
            )}

            {selectedIdsPendentes.length > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-blue-700 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
                <span className="font-bold whitespace-nowrap text-sm">
                  {selectedIdsPendentes.length} Sel.
                </span>
                <button
                  onClick={exportarPDF}
                  className="flex items-center gap-1 hover:bg-white/20 px-2 py-1 rounded transition-colors text-sm"
                  type="button"
                >
                  <FileDown size={16} /> PDF
                </button>
                <button
                  onClick={exportarExcel}
                  className="flex items-center gap-1 hover:bg-white/20 px-2 py-1 rounded transition-colors text-sm"
                  type="button"
                >
                  <FileSpreadsheet size={16} /> Excel
                </button>
                <button
                  onClick={() => setSelectedIdsPendentes([])}
                  className="ml-2 text-xs underline opacity-80 hover:opacity-100"
                  type="button"
                >
                  Limpar
                </button>
              </div>
            )}
          </div>

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
        </div>
      </div>
    </div>
  );
}

export default withAuth(RegistrarRetiradaResponsavelPage, [
  "porteiro",
  "responsavel",
  "adminMaster",
]);
