"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import withAuth from "@/components/withAuth";
import Navbar from "@/components/Navbar";
import BotaoVoltar from "@/components/BotaoVoltar";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  CorrespondenciasLineChart,
  CorrespondenciasBarChart,
  StatusDoughnutChart,
  BlocosPieChart,
  ChartCard,
} from "@/components/charts";
import { 
  FileText, Search, User, Filter, Printer, IdCard, FileSpreadsheet, Loader2, ArrowUpRight, ArrowDownLeft, MessageCircle, BarChart3, Building2, ClipboardList, TrendingUp
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split("T")[0];
}

// Interface unificada para o relatório de atividades
interface ItemRelatorio {
  id: string;
  data: string;
  dataIso: string;
  acao: "Recebimento" | "Retirada" | "Aviso WhatsApp";
  tipo: "Encomenda" | "Aviso";
  destinatario: string;
  bloco: string;
  apartamento: string;
  detalhe: string;
  registradoPor: string;
}

function RelatoriosPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Filtros
  const [dataInicio, setDataInicio] = useState(getDefaultStartDate());
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | "entrada" | "saida" | "aviso">("todos");
  const [blocoFiltro, setBlocoFiltro] = useState("");
  const [moradorFiltro, setMoradorFiltro] = useState("");
  const [porteiroFiltro, setPorteiroFiltro] = useState(""); 

  // Dados
  const [blocos, setBlocos] = useState<any[]>([]);
  const [porteiros, setPorteiros] = useState<any[]>([]); 
  const [resultados, setResultados] = useState<ItemRelatorio[]>([]);

  // Carregar Filtros Iniciais
  useEffect(() => {
    if (user?.condominioId) {
      const carregarDadosIniciais = async () => {
        try {
          // 1. Blocos
          const { data: blocosData } = await supabase
            .from("blocos")
            .select("*")
            .eq("condominio_id", user.condominioId);
          const listaBlocos = (blocosData || []).map((d: any) => ({ id: d.id, nome: d.nome }));
          listaBlocos.sort((a: any, b: any) => a.nome.localeCompare(b.nome, undefined, { numeric: true }));
          setBlocos(listaBlocos);

          // 2. Porteiros (Usuários)
          const { data: usersData } = await supabase
            .from("users")
            .select("*")
            .eq("condominio_id", user.condominioId)
            .in("role", ["porteiro", "responsavel", "adminMaster"]);
          const listaPorteiros = (usersData || []).map((d: any) => ({ id: d.id, nome: d.nome }));
          listaPorteiros.sort((a: any, b: any) => a.nome.localeCompare(b.nome));
          setPorteiros(listaPorteiros);

        } catch (error) {
          console.error("Erro ao carregar filtros:", error);
        }
      };
      carregarDadosIniciais();
    }
  }, [user]);

  const gerarRelatorio = useCallback(async () => {
    if (!user?.condominioId) return;
    setLoading(true);
    setResultados([]);

    try {
      const listaFinal: ItemRelatorio[] = [];
      
      // Datas para consulta (Inicio 00:00 e Fim 23:59)
      const start = new Date(dataInicio);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dataFim);
      end.setHours(23, 59, 59, 999);

      const isoStart = start.toISOString();
      const isoEnd = end.toISOString();

      // ==================================================
      // 1. ENTRADAS (Chegada de Encomendas)
      // ==================================================
      if (tipoFiltro === "todos" || tipoFiltro === "entrada") {
        const { data: entradasData } = await supabase
          .from("correspondencias")
          .select("*")
          .eq("condominio_id", user.condominioId)
          .gte("criado_em", isoStart)
          .lte("criado_em", isoEnd);
        
        (entradasData || []).forEach((d: any) => {
          const dateObj = d.criado_em ? new Date(d.criado_em) : new Date();
          
          listaFinal.push({
            id: `ent-${d.id}`,
            data: dateObj.toLocaleString('pt-BR'),
            dataIso: dateObj.toISOString(),
            acao: "Recebimento",
            tipo: "Encomenda",
            destinatario: d.morador_nome,
            bloco: d.bloco_nome,
            apartamento: d.apartamento,
            detalhe: `Protocolo: ${d.protocolo} (${d.status})`,
            registradoPor: d.criado_por_nome || d.criado_por || "Sistema"
          });
        });
      }

      // ==================================================
      // 2. SAÍDAS (Retirada de Encomendas)
      // ==================================================
      if (tipoFiltro === "todos" || tipoFiltro === "saida") {
        try {
            const { data: saidasData } = await supabase
              .from("correspondencias")
              .select("*")
              .eq("condominio_id", user.condominioId)
              .eq("status", "retirada")
              .gte("retirado_em", isoStart)
              .lte("retirado_em", isoEnd);
            
            (saidasData || []).forEach((d: any) => {
              const dateObj = d.retirado_em ? new Date(d.retirado_em) : new Date();
              
              listaFinal.push({
                id: `sai-${d.id}`,
                data: dateObj.toLocaleString('pt-BR'),
                dataIso: dateObj.toISOString(),
                acao: "Retirada",
                tipo: "Encomenda",
                destinatario: d.morador_nome,
                bloco: d.bloco_nome,
                apartamento: d.apartamento,
                detalhe: `Protocolo: ${d.protocolo}`,
                registradoPor: "Portaria" 
              });
            });
        } catch (e) {
            console.warn("Índice necessário para filtro de Retirada:", e);
        }
      }

      // ==================================================
      // 3. AVISOS (WhatsApp)
      // ==================================================
      if (tipoFiltro === "todos" || tipoFiltro === "aviso") {
        const { data: avisosData } = await supabase
          .from("avisos_rapidos")
          .select("*")
          .eq("condominio_id", user.condominioId)
          .gte("criado_em", isoStart)
          .lte("criado_em", isoEnd);
        
        (avisosData || []).forEach((d: any) => {
          const dateObj = d.criado_em ? new Date(d.criado_em) : new Date();

          listaFinal.push({
            id: `avi-${d.id}`,
            data: dateObj.toLocaleString('pt-BR'),
            dataIso: dateObj.toISOString(),
            acao: "Aviso WhatsApp",
            tipo: "Aviso",
            destinatario: d.morador_nome,
            bloco: d.bloco_nome,
            apartamento: d.apartamento,
            detalhe: d.mensagem ? `Msg: "${d.mensagem.substring(0, 20)}..."` : "Foto enviada",
            registradoPor: d.enviado_por_nome || "Sistema"
          });
        });
      }

      // --- FILTRAGEM EM MEMÓRIA ---
      let filtrados = listaFinal.filter(item => {
        if (blocoFiltro && item.bloco !== blocoFiltro) return false;

        if (porteiroFiltro) {
            const registradoPorLower = item.registradoPor.toLowerCase();
            const filtroLower = porteiroFiltro.toLowerCase();
            if (!registradoPorLower.includes(filtroLower)) return false;
        }

        if (moradorFiltro) {
          const busca = moradorFiltro.toLowerCase();
          const matchNome = item.destinatario.toLowerCase().includes(busca);
          const matchApto = item.apartamento.toLowerCase().includes(busca);
          if (!matchNome && !matchApto) return false;
        }

        return true;
      });

      filtrados.sort((a, b) => b.dataIso.localeCompare(a.dataIso));
      setResultados(filtrados);

    } catch (error) {
      console.error("Erro geral ao gerar relatório:", error);
      alert("Erro ao buscar dados. Verifique os filtros e tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [blocoFiltro, dataFim, dataInicio, moradorFiltro, porteiroFiltro, tipoFiltro, user?.condominioId]);

  useEffect(() => {
    if (!user?.condominioId) return;
    void gerarRelatorio();
  }, [gerarRelatorio, user?.condominioId]);

  const resumo = useMemo(() => {
    const entradas = resultados.filter((item) => item.acao === "Recebimento").length;
    const retiradas = resultados.filter((item) => item.acao === "Retirada").length;
    const avisos = resultados.filter((item) => item.acao === "Aviso WhatsApp").length;
    const blocosAtivos = new Set(resultados.map((item) => item.bloco).filter(Boolean)).size;

    return {
      total: resultados.length,
      entradas,
      retiradas,
      avisos,
      blocosAtivos,
      taxaSaida: entradas > 0 ? Math.round((retiradas / entradas) * 100) : 0,
    };
  }, [resultados]);

  const dadosPorDia = useMemo(() => {
    const porDia = new Map<string, number>();
    resultados.forEach((item) => {
      const key = item.dataIso
        ? new Date(item.dataIso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
        : item.data;
      porDia.set(key, (porDia.get(key) || 0) + 1);
    });
    return Array.from(porDia.entries()).map(([label, value]) => ({ label, value })).slice(-14);
  }, [resultados]);

  const dadosPorTipoAtividade = useMemo(() => {
    const porTipo = new Map<string, number>();
    resultados.forEach((item) => {
      porTipo.set(item.acao, (porTipo.get(item.acao) || 0) + 1);
    });
    return Array.from(porTipo.entries()).map(([label, value]) => ({ label, value }));
  }, [resultados]);

  const dadosPorStatus = useMemo(() => [
    { label: "Recebimentos", value: resumo.entradas, color: "#3B82F6" },
    { label: "Retiradas", value: resumo.retiradas, color: "#10B981" },
    { label: "Avisos", value: resumo.avisos, color: "#F59E0B" },
  ], [resumo]);

  const dadosPorBloco = useMemo(() => {
    const porBloco = new Map<string, number>();
    resultados.forEach((item) => {
      porBloco.set(item.bloco || "Sem bloco", (porBloco.get(item.bloco || "Sem bloco") || 0) + 1);
    });
    return Array.from(porBloco.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [resultados]);

  const dadosPorResponsavel = useMemo(() => {
    const porResponsavel = new Map<string, number>();
    resultados.forEach((item) => {
      porResponsavel.set(item.registradoPor || "Sistema", (porResponsavel.get(item.registradoPor || "Sistema") || 0) + 1);
    });
    return Array.from(porResponsavel.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [resultados]);

  // --- EXPORTAR PDF ---
  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFillColor(5, 115, 33);
    doc.rect(0, 0, 210, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("Relatório de Atividades", 105, 13, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Período: ${new Date(dataInicio).toLocaleDateString()} a ${new Date(dataFim).toLocaleDateString()}`, 14, 28);
    doc.text(`Gerado por: ${user?.nome}`, 14, 33);
    
    const dadosTabela = resultados.map(item => [
        item.data,
        item.acao,
        item.destinatario,
        `${item.bloco} / ${item.apartamento}`,
        item.detalhe,
        item.registradoPor
    ]);

    autoTable(doc, {
        startY: 40,
        head: [['Data/Hora', 'Evento', 'Morador', 'Bloco/Apto', 'Detalhe', 'Resp.']],
        body: dadosTabela,
        headStyles: { fillColor: [5, 115, 33] },
        styles: { fontSize: 8 },
    });

    doc.save(`Relatorio_Atividades_${dataInicio}.pdf`);
  };

  // --- EXPORTAR EXCEL ---
  const handleExportExcel = () => {
    const dadosExcel = resultados.map(item => ({
        "Data/Hora": item.data,
        "Evento": item.acao,
        "Tipo": item.tipo,
        "Morador": item.destinatario,
        "Bloco": item.bloco,
        "Apartamento": item.apartamento,
        "Detalhes": item.detalhe,
        "Registrado Por": item.registradoPor
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `Relatorio_Atividades_${dataInicio}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* 
        AJUSTE DE LAYOUT:
        Substituído 'pt-24' por um cálculo dinâmico.
        '6rem' (aprox 96px) é o espaço base da Navbar.
        'env(safe-area-inset-top)' é o espaço extra necessário no topo do celular (iPhone).
      */}
      <main 
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12"
        style={{ paddingTop: 'calc(6rem + env(safe-area-inset-top))' }}
      >
        <BotaoVoltar url="/dashboard-responsavel" />

        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="text-[#057321]" /> Relatório de Atividades
            </h1>
            <p className="text-gray-600">
              Visão geral de entradas, saídas e avisos enviados.
            </p>
          </div>
        </div>

        {/* CARD DE FILTROS */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="flex items-center gap-2 mb-4 text-[#057321] font-bold border-b pb-2">
            <Filter size={20} /> Filtros de Pesquisa
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Datas */}
            <div>
              <label htmlFor="rel-data-inicio" className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
              <input 
                id="rel-data-inicio"
                type="date" 
                value={dataInicio} 
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="rel-data-fim" className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
              <input 
                id="rel-data-fim"
                type="date" 
                value={dataFim} 
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>

            {/* Tipo de Atividade */}
            <div>
              <label htmlFor="rel-tipo-atividade" className="block text-sm font-medium text-gray-700 mb-1">Tipo de Atividade</label>
              <select 
                id="rel-tipo-atividade"
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value as any)}
                className="w-full border rounded-lg p-2 text-sm bg-white"
              >
                <option value="todos">Tudo (Entradas, Saídas, Avisos)</option>
                <option value="entrada">Apenas Entradas (Chegadas)</option>
                <option value="saida">Apenas Saídas (Retiradas)</option>
                <option value="aviso">Apenas Avisos WhatsApp</option>
              </select>
            </div>

            {/* Bloco */}
            <div>
              <label htmlFor="rel-bloco" className="block text-sm font-medium text-gray-700 mb-1">Bloco</label>
              <select 
                id="rel-bloco"
                value={blocoFiltro}
                onChange={(e) => setBlocoFiltro(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm bg-white"
              >
                <option value="">Todos os Blocos</option>
                {blocos.map(b => (
                  <option key={b.id} value={b.nome}>{b.nome}</option>
                ))}
              </select>
            </div>

            {/* Filtro de Porteiro */}
            <div>
              <label className="flex text-sm font-medium text-gray-700 mb-1 items-center gap-1">
              <IdCard size={14} /> Registrado por
              </label>
              <select 
                value={porteiroFiltro}
                onChange={(e) => setPorteiroFiltro(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm bg-white"
              >
                <option value="">Todos os Funcionários</option>
                {porteiros.map(p => (
                  <option key={p.id} value={p.nome}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Morador */}
            <div className="md:col-span-1 lg:col-span-3">
              <label htmlFor="rel-morador" className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Morador (Nome ou Apto)</label>
              <div className="relative">
                <input 
                  id="rel-morador"
                  type="text"
                  value={moradorFiltro}
                  onChange={(e) => setMoradorFiltro(e.target.value)}
                  placeholder="Ex: João Silva ou 102"
                  className="w-full border rounded-lg p-2 pl-10 text-sm"
                />
                <User size={18} className="absolute left-3 top-2.5 text-gray-400" />
              </div>
            </div>

          </div>

          <div className="mt-6 flex justify-end">
            <button 
              onClick={gerarRelatorio}
              disabled={loading}
              className="bg-[#057321] text-white px-8 py-3 rounded-lg font-bold hover:bg-[#046019] transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><Search size={20} /> Gerar Relatório</>}
            </button>
          </div>
        </div>

        {/* BOTÕES DE EXPORTAÇÃO */}
        {resultados.length > 0 && (
            <div className="flex gap-3 mb-4 justify-end">
                <button onClick={handleExportPDF} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-bold shadow-sm">
                    <Printer size={16} /> Exportar PDF
                </button>
                <button onClick={handleExportExcel} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-bold shadow-sm">
                    <FileSpreadsheet size={16} /> Exportar Excel
                </button>
            </div>
        )}

        {resultados.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total de eventos</p>
                    <p className="text-3xl font-bold text-gray-900">{resumo.total}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#057321]/10 text-[#057321]">
                    <ClipboardList size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Recebimentos</p>
                    <p className="text-3xl font-bold text-blue-600">{resumo.entradas}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                    <ArrowDownLeft size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Taxa de saída</p>
                    <p className="text-3xl font-bold text-green-600">{resumo.taxaSaida}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-green-50 text-green-600">
                    <TrendingUp size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Blocos ativos</p>
                    <p className="text-3xl font-bold text-amber-600">{resumo.blocosAtivos}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                    <Building2 size={24} />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ChartCard title="Movimentação por Dia" subtitle="Últimos 14 pontos do período filtrado">
                <CorrespondenciasLineChart data={dadosPorDia} title="" height={280} />
              </ChartCard>

              <ChartCard title="Distribuição dos Eventos">
                <StatusDoughnutChart data={dadosPorStatus} title="" height={280} />
              </ChartCard>

              <ChartCard title="Eventos por Tipo">
                <CorrespondenciasBarChart data={dadosPorTipoAtividade} title="" height={280} />
              </ChartCard>

              <ChartCard title="Volume por Bloco">
                <BlocosPieChart data={dadosPorBloco} title="" height={280} />
              </ChartCard>

              <ChartCard title="Produtividade por Responsável" subtitle="Registros no período selecionado">
                <CorrespondenciasBarChart data={dadosPorResponsavel} title="" height={280} horizontal />
              </ChartCard>

              <ChartCard title="Resumo Executivo" subtitle="Leitura rápida do período">
                <div className="space-y-4 text-sm text-gray-700">
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                    <span className="flex items-center gap-2 font-medium"><BarChart3 size={18} /> Média diária</span>
                    <strong>{dadosPorDia.length > 0 ? (resumo.total / dadosPorDia.length).toFixed(1) : "0.0"}</strong>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                    <span className="flex items-center gap-2 font-medium"><MessageCircle size={18} /> Avisos enviados</span>
                    <strong>{resumo.avisos}</strong>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                    <span className="flex items-center gap-2 font-medium"><ArrowUpRight size={18} /> Retiradas confirmadas</span>
                    <strong>{resumo.retiradas}</strong>
                  </div>
                </div>
              </ChartCard>
            </div>
          </>
        )}

        {/* TABELA DE RESULTADOS */}
        {resultados.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs border-b">
                  <tr>
                    <th className="px-6 py-3">Data/Hora</th>
                    <th className="px-6 py-3">Evento</th>
                    <th className="px-6 py-3">Morador</th>
                    <th className="px-6 py-3">Unidade</th>
                    <th className="px-6 py-3">Detalhes</th>
                    <th className="px-6 py-3">Resp.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {resultados.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900 whitespace-nowrap text-xs">{item.data}</td>
                      
                      {/* Coluna EVENTO com Ícones e Cores */}
                      <td className="px-6 py-3">
                        {item.acao === "Recebimento" && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                <ArrowDownLeft size={12}/> Entrada
                            </span>
                        )}
                        {item.acao === "Retirada" && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                                <ArrowUpRight size={12}/> Saída
                            </span>
                        )}
                        {item.acao === "Aviso WhatsApp" && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                                <MessageCircle size={12}/> Aviso
                            </span>
                        )}
                      </td>

                      <td className="px-6 py-3">{item.destinatario}</td>
                      <td className="px-6 py-3">
                        <span className="text-gray-500 text-xs block">{item.bloco}</span>
                        <span className="font-bold">Apto {item.apartamento}</span>
                      </td>
                      <td className="px-6 py-3 text-gray-600 text-xs truncate max-w-[250px]" title={item.detalhe}>{item.detalhe}</td>
                      <td className="px-6 py-3 text-gray-600 text-xs font-medium">
                          {item.registradoPor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-gray-50 border-t text-right text-sm text-gray-600 font-medium">
              Total de registros encontrados: {resultados.length}
            </div>
          </div>
        ) : (
          !loading && (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum dado encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">Ajuste os filtros e clique em &quot;Gerar Relatório&quot;.</p>
            </div>
          )
        )}

      </main>
    </div>
  );
}

export default withAuth(RelatoriosPage, ["responsavel", "adminMaster"]);