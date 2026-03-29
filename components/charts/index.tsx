"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from "chart.js";
import { Line, Bar, Doughnut, Pie } from "react-chartjs-2";

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Cores do tema
const COLORS = {
  primary: "#057321",
  primaryLight: "rgba(5, 115, 33, 0.1)",
  secondary: "#046119",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
  gray: "#6B7280",
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.info,
  COLORS.warning,
  COLORS.success,
  COLORS.danger,
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
];

// ============================================
// GRÁFICO DE LINHA - Correspondências por Período
// ============================================

interface LineChartProps {
  data: { label: string; value: number }[];
  title?: string;
  height?: number;
}

export function CorrespondenciasLineChart({
  data,
  title = "Correspondências por Período",
  height = 300,
}: LineChartProps) {
  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: "Correspondências",
        data: data.map((d) => d.value),
        fill: true,
        borderColor: COLORS.primary,
        backgroundColor: COLORS.primaryLight,
        tension: 0.4,
        pointBackgroundColor: COLORS.primary,
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: "bold",
        },
        color: "#374151",
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 13,
        },
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#6B7280",
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          color: "#6B7280",
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div style={{ height }}>
      <Line data={chartData} options={options} />
    </div>
  );
}

// ============================================
// GRÁFICO DE BARRAS - Correspondências por Tipo
// ============================================

interface BarChartProps {
  data: { label: string; value: number }[];
  title?: string;
  height?: number;
  horizontal?: boolean;
}

export function CorrespondenciasBarChart({
  data,
  title = "Correspondências por Tipo",
  height = 300,
  horizontal = false,
}: BarChartProps) {
  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        label: "Quantidade",
        data: data.map((d) => d.value),
        backgroundColor: CHART_COLORS.slice(0, data.length),
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    indexAxis: horizontal ? "y" : "x",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: "bold",
        },
        color: "#374151",
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: {
          display: horizontal,
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          color: "#6B7280",
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          display: !horizontal,
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          color: "#6B7280",
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div style={{ height }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}

// ============================================
// GRÁFICO DE ROSCA - Status das Correspondências
// ============================================

interface DoughnutChartProps {
  data: { label: string; value: number; color?: string }[];
  title?: string;
  height?: number;
}

export function StatusDoughnutChart({
  data,
  title = "Status das Correspondências",
  height = 300,
}: DoughnutChartProps) {
  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        data: data.map((d) => d.value),
        backgroundColor: data.map((d, i) => d.color || CHART_COLORS[i]),
        borderWidth: 0,
        hoverOffset: 10,
      },
    ],
  };

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: "circle",
          font: {
            size: 12,
          },
          color: "#374151",
        },
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: "bold",
        },
        color: "#374151",
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        cornerRadius: 8,
      },
    },
  };

  return (
    <div style={{ height }}>
      <Doughnut data={chartData} options={options} />
    </div>
  );
}

// ============================================
// GRÁFICO DE PIZZA - Correspondências por Bloco
// ============================================

interface PieChartProps {
  data: { label: string; value: number }[];
  title?: string;
  height?: number;
}

export function BlocosPieChart({
  data,
  title = "Correspondências por Bloco",
  height = 300,
}: PieChartProps) {
  const chartData = {
    labels: data.map((d) => d.label),
    datasets: [
      {
        data: data.map((d) => d.value),
        backgroundColor: CHART_COLORS.slice(0, data.length),
        borderWidth: 2,
        borderColor: "#fff",
        hoverOffset: 10,
      },
    ],
  };

  const options: ChartOptions<"pie"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: {
          padding: 15,
          usePointStyle: true,
          pointStyle: "circle",
          font: {
            size: 12,
          },
          color: "#374151",
        },
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: "bold",
        },
        color: "#374151",
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        cornerRadius: 8,
      },
    },
  };

  return (
    <div style={{ height }}>
      <Pie data={chartData} options={options} />
    </div>
  );
}

// ============================================
// CARD DE GRÁFICO
// ============================================

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function ChartCard({ title, subtitle, children, actions }: ChartCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export default {
  CorrespondenciasLineChart,
  CorrespondenciasBarChart,
  StatusDoughnutChart,
  BlocosPieChart,
  ChartCard,
};
