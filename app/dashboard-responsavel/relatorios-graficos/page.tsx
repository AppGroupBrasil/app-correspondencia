"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  RefreshCw,
  TrendingUp,
  Package,
  Clock,
  Users,
} from "lucide-react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import {
  CorrespondenciasLineChart,
  CorrespondenciasBarChart,
  StatusDoughnutChart,
  BlocosPieChart,
  ChartCard,
} from "@/components/charts";
import {
  exportToCSV,
  exportToExcel,
  exportReport,
  CORRESPONDENCIA_COLUMNS,
} from "@/utils/exportData";

interface Correspondencia {
  id: string;
  moradorNome: string;
  bloco: string;
  apartamento: string;
  tipo: string;
  status: string;
  dataRegistro: any;
  dataRetirada?: any;
  registradoPor: string;
  retiradoPor?: string;
  remetente?: string;
  codigoRastreio?: string;
}

type PeriodoFiltro = "7dias" | "30dias" | "90dias" | "ano" | "todos";

export default function RelatoriosGraficosPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [correspondencias, setCorrespondencias] = useState<Correspondencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("30dias");
  const [refreshing, setRefreshing] = useState(false);

  // Buscar correspondências
  useEffect(() => {
    if (!user?.condominioId) return;

    const fetchData = async () => {
      try {
        const ref = collection(db, "correspondencias");
        const q = query(
          ref,
          where("condominioId", "==", user.condominioId),
          orderBy("dataRegistro", "desc")
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Correspondencia[];
        setCorrespondencias(data);
      } catch (error) {
        console.error("Erro ao buscar correspondências:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.condominioId]);

  // Filtrar por período
  const correspondenciasFiltradas = useMemo(() => {
    if (periodo === "todos") return correspondencias;

    const agora = new Date();
    let dataLimite: Date;

    switch (periodo) {
      case "7dias":
        dataLimite = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30dias":
        dataLimite = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90dias":
        dataLimite = new Date(agora.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "ano":
        dataLimite = new Date(agora.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return correspondencias;
    }

    return correspondencias.filter((c) => {
      const data = c.dataRegistro?.toDate?.() || new Date(c.dataRegistro);
      return data >= dataLimite;
    });
  }, [correspondencias, periodo]);

  // Calcular estatísticas
  const estatisticas = useMemo(() => {
    const total = correspondenciasFiltradas.length;
    const pendentes = correspondenciasFiltradas.filter(
      (c) => c.status === "pendente"
    ).length;
    const retiradas = correspondenciasFiltradas.filter(
      (c) => c.status === "retirado"
    ).length;
    const devolvidas = correspondenciasFiltradas.filter(
      (c) => c.status === "devolvido"
    ).length;

    // Tempo médio de retirada
    const retiradosComTempo = correspondenciasFiltradas.filter(
      (c) => c.status === "retirado" && c.dataRetirada
    );
    let tempoMedio = 0;
    if (retiradosComTempo.length > 0) {
      const tempos = retiradosComTempo.map((c) => {
        const registro = c.dataRegistro?.toDate?.() || new Date(c.dataRegistro);
        const retirada = c.dataRetirada?.toDate?.() || new Date(c.dataRetirada);
        return (retirada.getTime() - registro.getTime()) / (1000 * 60 * 60);
      });
      tempoMedio = tempos.reduce((a, b) => a + b, 0) / tempos.length;
    }

    return { total, pendentes, retiradas, devolvidas, tempoMedio };
  }, [correspondenciasFiltradas]);

  // Dados para gráficos
  const dadosPorDia = useMemo(() => {
    const porDia = new Map<string, number>();
    correspondenciasFiltradas.forEach((c) => {
      const data = c.dataRegistro?.toDate?.() || new Date(c.dataRegistro);
      const key = data.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });
      porDia.set(key, (porDia.get(key) || 0) + 1);
    });
    return Array.from(porDia.entries())
      .map(([label, value]) => ({ label, value }))
      .slice(-14); // Últimos 14 dias
  }, [correspondenciasFiltradas]);

  const dadosPorTipo = useMemo(() => {
    const porTipo = new Map<string, number>();
    const tipoLabels: Record<string, string> = {
      carta: "Carta",
      encomenda: "Encomenda",
      sedex: "Sedex",
      pac: "PAC",
      documento: "Documento",
      outros: "Outros",
    };
    correspondenciasFiltradas.forEach((c) => {
      const label = tipoLabels[c.tipo] || c.tipo;
      porTipo.set(label, (porTipo.get(label) || 0) + 1);
    });
    return Array.from(porTipo.entries()).map(([label, value]) => ({
      label,
      value,
    }));
  }, [correspondenciasFiltradas]);

  const dadosPorStatus = useMemo(() => {
    return [
      {
        label: "Pendentes",
        value: estatisticas.pendentes,
        color: "#F59E0B",
      },
      {
        label: "Retiradas",
        value: estatisticas.retiradas,
        color: "#10B981",
      },
      {
        label: "Devolvidas",
        value: estatisticas.devolvidas,
        color: "#EF4444",
      },
    ];
  }, [estatisticas]);

  const dadosPorBloco = useMemo(() => {
    const porBloco = new Map<string, number>();
    correspondenciasFiltradas.forEach((c) => {
      porBloco.set(c.bloco, (porBloco.get(c.bloco) || 0) + 1);
    });
    return Array.from(porBloco.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [correspondenciasFiltradas]);

  // Handlers de exportação
  const handleExportCSV = () => {
    exportToCSV(correspondenciasFiltradas, CORRESPONDENCIA_COLUMNS, {
      filename: "relatorio_correspondencias",
      includeTimestamp: true,
    });
  };

  const handleExportExcel = () => {
    exportToExcel(correspondenciasFiltradas, CORRESPONDENCIA_COLUMNS, {
      filename: "relatorio_correspondencias",
      sheetName: "Correspondências",
      includeTimestamp: true,
    });
  };

  const handleExportRelatorioCompleto = () => {
    // Preparar dados de resumo
    const resumo = [
      {
        metrica: "Total de Correspondências",
        valor: estatisticas.total,
      },
      {
        metrica: "Pendentes",
        valor: estatisticas.pendentes,
      },
      {
        metrica: "Retiradas",
        valor: estatisticas.retiradas,
      },
      {
        metrica: "Devolvidas",
        valor: estatisticas.devolvidas,
      },
      {
        metrica: "Tempo Médio de Retirada (horas)",
        valor: estatisticas.tempoMedio.toFixed(1),
      },
    ];

    exportReport(
      [
        {
          name: "Resumo",
          data: resumo,
          columns: [
            { key: "metrica", header: "Métrica", width: 30 },
            { key: "valor", header: "Valor", width: 15 },
          ],
        },
        {
          name: "Correspondências",
          data: correspondenciasFiltradas,
          columns: CORRESPONDENCIA_COLUMNS,
        },
        {
          name: "Por Tipo",
          data: dadosPorTipo,
          columns: [
            { key: "label", header: "Tipo", width: 15 },
            { key: "value", header: "Quantidade", width: 12 },
          ],
        },
        {
          name: "Por Bloco",
          data: dadosPorBloco,
          columns: [
            { key: "label", header: "Bloco", width: 15 },
            { key: "value", header: "Quantidade", width: 12 },
          ],
        },
      ],
      {
        filename: "relatorio_completo_correspondencias",
        includeTimestamp: true,
      }
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simular refresh
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="w-8 h-8 border-4 border-[#057321] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-[#057321]" />
              Relatórios e Gráficos
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Análise detalhada das correspondências
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro de período */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value as PeriodoFiltro)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#057321]"
              >
                <option value="7dias">Últimos 7 dias</option>
                <option value="30dias">Últimos 30 dias</option>
                <option value="90dias">Últimos 90 dias</option>
                <option value="ano">Último ano</option>
                <option value="todos">Todo o período</option>
              </select>
            </div>

            {/* Botão refresh */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title="Atualizar dados"
            >
              <RefreshCw
                className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
            </button>

            {/* Botões de exportação */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                <FileText className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </button>
              <button
                onClick={handleExportRelatorioCompleto}
                className="flex items-center gap-2 px-4 py-2 bg-[#057321] text-white rounded-lg hover:bg-[#046119] transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Relatório Completo
              </button>
            </div>
          </div>
        </div>

        {/* Cards de métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {estatisticas.total}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Pendentes
                </p>
                <p className="text-3xl font-bold text-yellow-600">
                  {estatisticas.pendentes}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Taxa de Retirada
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {estatisticas.total > 0
                    ? Math.round(
                        (estatisticas.retiradas / estatisticas.total) * 100
                      )
                    : 0}
                  %
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Tempo Médio
                </p>
                <p className="text-3xl font-bold text-purple-600">
                  {estatisticas.tempoMedio < 24
                    ? `${Math.round(estatisticas.tempoMedio)}h`
                    : `${Math.round(estatisticas.tempoMedio / 24)}d`}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ChartCard
            title="Correspondências por Período"
            subtitle="Últimos 14 dias"
          >
            <CorrespondenciasLineChart data={dadosPorDia} title="" height={280} />
          </ChartCard>

          <ChartCard title="Status das Correspondências">
            <StatusDoughnutChart data={dadosPorStatus} title="" height={280} />
          </ChartCard>

          <ChartCard title="Correspondências por Tipo">
            <CorrespondenciasBarChart data={dadosPorTipo} title="" height={280} />
          </ChartCard>

          <ChartCard title="Correspondências por Bloco">
            <BlocosPieChart data={dadosPorBloco} title="" height={280} />
          </ChartCard>
        </div>

        {/* Tabela resumida */}
        <ChartCard title="Últimas Correspondências" subtitle="10 mais recentes">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Morador
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Bloco/Apt
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Tipo
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody>
                {correspondenciasFiltradas.slice(0, 10).map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {c.moradorNome}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {c.bloco} / {c.apartamento}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {c.tipo}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          c.status === "pendente"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : c.status === "retirado"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {(
                        c.dataRegistro?.toDate?.() || new Date(c.dataRegistro)
                      ).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      </main>
    </div>
  );
}
