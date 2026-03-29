"use client";

import { useMemo } from "react";
import {
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
} from "lucide-react";

interface Correspondencia {
  id: string;
  status: string;
  dataRegistro: any;
  dataRetirada?: any;
  tipo?: string;
}

interface DashboardMetricsProps {
  correspondencias: Correspondencia[];
  totalMoradores?: number;
  loading?: boolean;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: "green" | "yellow" | "red" | "blue" | "purple";
}

const colorClasses = {
  green: {
    bg: "bg-gradient-to-br from-green-500 to-green-600",
    light: "bg-green-100",
    text: "text-green-600",
  },
  yellow: {
    bg: "bg-gradient-to-br from-yellow-500 to-yellow-600",
    light: "bg-yellow-100",
    text: "text-yellow-600",
  },
  red: {
    bg: "bg-gradient-to-br from-red-500 to-red-600",
    light: "bg-red-100",
    text: "text-red-600",
  },
  blue: {
    bg: "bg-gradient-to-br from-blue-500 to-blue-600",
    light: "bg-blue-100",
    text: "text-blue-600",
  },
  purple: {
    bg: "bg-gradient-to-br from-purple-500 to-purple-600",
    light: "bg-purple-100",
    text: "text-purple-600",
  },
};

function MetricCard({ title, value, subtitle, icon, trend, color }: MetricCardProps) {
  const colors = colorClasses[color];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span
                className={`text-sm font-medium ${
                  trend.isPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {trend.isPositive ? "+" : ""}
                {trend.value}%
              </span>
              <span className="text-sm text-gray-400">vs. mês anterior</span>
            </div>
          )}
        </div>
        <div className={`${colors.bg} p-3 rounded-xl shadow-lg`}>
          <div className="text-white">{icon}</div>
        </div>
      </div>
    </div>
  );
}

function MetricCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
      </div>
    </div>
  );
}

/**
 * Componente de Dashboard com métricas
 * Exibe estatísticas importantes sobre as correspondências
 */
export default function DashboardMetrics({
  correspondencias,
  totalMoradores = 0,
  loading = false,
}: DashboardMetricsProps) {
  const metrics = useMemo(() => {
    if (!correspondencias.length) {
      return {
        total: 0,
        pendentes: 0,
        retiradas: 0,
        tempoMedio: "0h",
        taxaRetirada: 0,
        hoje: 0,
        semana: 0,
      };
    }

    const now = new Date();
    const hoje = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const semanaAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);

    const pendentes = correspondencias.filter((c) => c.status === "pendente");
    const retiradas = correspondencias.filter((c) => c.status === "retirado");

    // Correspondências de hoje
    const corresponenciasHoje = correspondencias.filter((c) => {
      const data = c.dataRegistro?.toDate?.() || new Date(c.dataRegistro);
      return data >= hoje;
    });

    // Correspondências da semana
    const correspondenciasSemana = correspondencias.filter((c) => {
      const data = c.dataRegistro?.toDate?.() || new Date(c.dataRegistro);
      return data >= semanaAtras;
    });

    // Tempo médio de retirada (em horas)
    let tempoMedio = "N/A";
    const retiradosComTempo = retiradas.filter((c) => c.dataRetirada);
    if (retiradosComTempo.length > 0) {
      const tempos = retiradosComTempo.map((c) => {
        const registro = c.dataRegistro?.toDate?.() || new Date(c.dataRegistro);
        const retirada = c.dataRetirada?.toDate?.() || new Date(c.dataRetirada);
        return (retirada.getTime() - registro.getTime()) / (1000 * 60 * 60);
      });
      const media = tempos.reduce((a, b) => a + b, 0) / tempos.length;
      if (media < 24) {
        tempoMedio = `${Math.round(media)}h`;
      } else {
        tempoMedio = `${Math.round(media / 24)}d`;
      }
    }

    // Taxa de retirada
    const taxaRetirada =
      correspondencias.length > 0
        ? Math.round((retiradas.length / correspondencias.length) * 100)
        : 0;

    return {
      total: correspondencias.length,
      pendentes: pendentes.length,
      retiradas: retiradas.length,
      tempoMedio,
      taxaRetirada,
      hoje: corresponenciasHoje.length,
      semana: correspondenciasSemana.length,
    };
  }, [correspondencias]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <MetricCard
        title="Pendentes"
        value={metrics.pendentes}
        subtitle="Aguardando retirada"
        icon={<AlertTriangle className="w-6 h-6" />}
        color="yellow"
      />

      <MetricCard
        title="Retiradas"
        value={metrics.retiradas}
        subtitle={`Taxa: ${metrics.taxaRetirada}%`}
        icon={<CheckCircle className="w-6 h-6" />}
        color="green"
      />

      <MetricCard
        title="Tempo Médio"
        value={metrics.tempoMedio}
        subtitle="Para retirada"
        icon={<Clock className="w-6 h-6" />}
        color="blue"
      />

      <MetricCard
        title="Esta Semana"
        value={metrics.semana}
        subtitle={`Hoje: ${metrics.hoje}`}
        icon={<Calendar className="w-6 h-6" />}
        color="purple"
      />
    </div>
  );
}
