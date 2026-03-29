import * as XLSX from "xlsx";

// ============================================
// TIPOS
// ============================================

export interface ExportColumn<T> {
  key: keyof T | string;
  header: string;
  formatter?: (value: any, row: T) => string | number;
  width?: number;
}

export interface ExportOptions {
  filename: string;
  sheetName?: string;
  includeTimestamp?: boolean;
}

// ============================================
// EXPORTAR PARA CSV
// ============================================

/**
 * Exporta dados para arquivo CSV
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions
): void {
  if (data.length === 0) {
    console.warn("Nenhum dado para exportar");
    return;
  }

  // Cabeçalhos
  const headers = columns.map((col) => col.header);

  // Linhas de dados
  const rows = data.map((row) =>
    columns.map((col) => {
      const value = getNestedValue(row, col.key as string);
      if (col.formatter) {
        return col.formatter(value, row);
      }
      return formatValue(value);
    })
  );

  // Montar CSV
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  // Adicionar BOM para suporte a caracteres especiais
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

  // Download
  const filename = options.includeTimestamp
    ? `${options.filename}_${getTimestamp()}.csv`
    : `${options.filename}.csv`;

  downloadBlob(blob, filename);
}

// ============================================
// EXPORTAR PARA EXCEL
// ============================================

/**
 * Exporta dados para arquivo Excel (.xlsx)
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions
): void {
  if (data.length === 0) {
    console.warn("Nenhum dado para exportar");
    return;
  }

  // Preparar dados para o Excel
  const headers = columns.map((col) => col.header);
  const rows = data.map((row) =>
    columns.map((col) => {
      const value = getNestedValue(row, col.key as string);
      if (col.formatter) {
        return col.formatter(value, row);
      }
      return formatValue(value);
    })
  );

  // Criar worksheet
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Configurar largura das colunas
  const colWidths = columns.map((col) => ({
    wch: col.width || Math.max(col.header.length, 15),
  }));
  worksheet["!cols"] = colWidths;

  // Criar workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    options.sheetName || "Dados"
  );

  // Download
  const filename = options.includeTimestamp
    ? `${options.filename}_${getTimestamp()}.xlsx`
    : `${options.filename}.xlsx`;

  XLSX.writeFile(workbook, filename);
}

// ============================================
// EXPORTAR RELATÓRIO COMPLETO
// ============================================

interface ReportSheet<T> {
  name: string;
  data: T[];
  columns: ExportColumn<T>[];
}

/**
 * Exporta múltiplas folhas para um único arquivo Excel
 */
export function exportReport<T extends Record<string, any>>(
  sheets: ReportSheet<T>[],
  options: ExportOptions
): void {
  const workbook = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    const headers = sheet.columns.map((col) => col.header);
    const rows = sheet.data.map((row) =>
      sheet.columns.map((col) => {
        const value = getNestedValue(row, col.key as string);
        if (col.formatter) {
          return col.formatter(value, row);
        }
        return formatValue(value);
      })
    );

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Configurar largura das colunas
    const colWidths = sheet.columns.map((col) => ({
      wch: col.width || Math.max(col.header.length, 15),
    }));
    worksheet["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  });

  const filename = options.includeTimestamp
    ? `${options.filename}_${getTimestamp()}.xlsx`
    : `${options.filename}.xlsx`;

  XLSX.writeFile(workbook, filename);
}

// ============================================
// COLUNAS PRÉ-DEFINIDAS PARA CORRESPONDÊNCIAS
// ============================================

export const CORRESPONDENCIA_COLUMNS: ExportColumn<any>[] = [
  { key: "id", header: "ID", width: 25 },
  { key: "moradorNome", header: "Morador", width: 25 },
  { key: "bloco", header: "Bloco", width: 10 },
  { key: "apartamento", header: "Apartamento", width: 12 },
  {
    key: "tipo",
    header: "Tipo",
    width: 12,
    formatter: (value) => formatTipo(value),
  },
  {
    key: "status",
    header: "Status",
    width: 12,
    formatter: (value) => formatStatus(value),
  },
  {
    key: "dataRegistro",
    header: "Data Registro",
    width: 18,
    formatter: (value) => formatDate(value),
  },
  {
    key: "dataRetirada",
    header: "Data Retirada",
    width: 18,
    formatter: (value) => (value ? formatDate(value) : "-"),
  },
  { key: "registradoPor", header: "Registrado Por", width: 20 },
  { key: "retiradoPor", header: "Retirado Por", width: 20 },
  { key: "remetente", header: "Remetente", width: 20 },
  { key: "codigoRastreio", header: "Código Rastreio", width: 20 },
];

// ============================================
// HELPERS
// ============================================

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, part) => acc?.[part], obj);
}

function formatValue(value: any): string | number {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date) {
    return formatDate(value);
  }
  if (typeof value === "object" && value.toDate) {
    return formatDate(value.toDate());
  }
  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }
  return value;
}

function formatDate(value: any): string {
  if (!value) return "";
  const date = value instanceof Date ? value : value.toDate?.() || new Date(value);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTipo(tipo: string): string {
  const tipos: Record<string, string> = {
    carta: "Carta",
    encomenda: "Encomenda",
    sedex: "Sedex",
    pac: "PAC",
    documento: "Documento",
    outros: "Outros",
  };
  return tipos[tipo] || tipo;
}

function formatStatus(status: string): string {
  const statuses: Record<string, string> = {
    pendente: "Pendente",
    retirado: "Retirado",
    devolvido: "Devolvido",
  };
  return statuses[status] || status;
}

function getTimestamp(): string {
  const now = new Date();
  return now
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default {
  exportToCSV,
  exportToExcel,
  exportReport,
  CORRESPONDENCIA_COLUMNS,
};
