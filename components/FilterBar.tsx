"use client";

import { useState, useCallback } from "react";
import { Search, Filter, X, Calendar, ChevronDown } from "lucide-react";

export interface FilterOptions {
  search: string;
  status: string;
  tipo: string;
  bloco: string;
  dataInicio: string;
  dataFim: string;
}

interface FilterBarProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  statusOptions?: { value: string; label: string }[];
  tipoOptions?: { value: string; label: string }[];
  blocoOptions?: { value: string; label: string }[];
  placeholder?: string;
}

const DEFAULT_STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "pendente", label: "Pendente" },
  { value: "retirado", label: "Retirado" },
  { value: "devolvido", label: "Devolvido" },
];

const DEFAULT_TIPO_OPTIONS = [
  { value: "", label: "Todos os tipos" },
  { value: "carta", label: "Carta" },
  { value: "encomenda", label: "Encomenda" },
  { value: "sedex", label: "Sedex" },
  { value: "pac", label: "PAC" },
  { value: "outros", label: "Outros" },
];

/**
 * Componente de barra de filtros avançados
 * Design premium mantendo as cores do sistema
 */
export default function FilterBar({
  filters,
  onFilterChange,
  statusOptions = DEFAULT_STATUS_OPTIONS,
  tipoOptions = DEFAULT_TIPO_OPTIONS,
  blocoOptions = [],
  placeholder = "Pesquisar por nome, apartamento ou protocolo...",
}: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = useCallback(
    (key: keyof FilterOptions, value: string) => {
      onFilterChange({ ...filters, [key]: value });
    },
    [filters, onFilterChange]
  );

  const clearFilters = useCallback(() => {
    onFilterChange({
      search: "",
      status: "",
      tipo: "",
      bloco: "",
      dataInicio: "",
      dataFim: "",
    });
  }, [onFilterChange]);

  const hasActiveFilters =
    filters.status ||
    filters.tipo ||
    filters.bloco ||
    filters.dataInicio ||
    filters.dataFim;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      {/* Barra de pesquisa principal */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => handleChange("search", e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#057321] focus:border-transparent transition-all"
          />
        </div>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
            showAdvanced || hasActiveFilters
              ? "bg-[#057321] text-white border-[#057321]"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          <Filter className="w-4 h-4" />
          <span>Filtros</span>
          {hasActiveFilters && (
            <span className="bg-white text-[#057321] text-xs font-bold px-1.5 py-0.5 rounded-full">
              !
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform ${
              showAdvanced ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Filtros avançados */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#057321] focus:border-transparent"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                value={filters.tipo}
                onChange={(e) => handleChange("tipo", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#057321] focus:border-transparent"
              >
                {tipoOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Bloco */}
            {blocoOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bloco
                </label>
                <select
                  value={filters.bloco}
                  onChange={(e) => handleChange("bloco", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#057321] focus:border-transparent"
                >
                  <option value="">Todos os blocos</option>
                  {blocoOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Data Início */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Início
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="date"
                  value={filters.dataInicio}
                  onChange={(e) => handleChange("dataInicio", e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#057321] focus:border-transparent"
                />
              </div>
            </div>

            {/* Data Fim */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Fim
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="date"
                  value={filters.dataFim}
                  onChange={(e) => handleChange("dataFim", e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#057321] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Botão limpar filtros */}
          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Hook para aplicar filtros aos dados
 */
export function useFilteredData<T extends Record<string, any>>(
  data: T[],
  filters: FilterOptions,
  searchFields: (keyof T)[]
) {
  return data.filter((item) => {
    // Filtro de pesquisa
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = searchFields.some((field) => {
        const value = item[field];
        return value && String(value).toLowerCase().includes(searchLower);
      });
      if (!matchesSearch) return false;
    }

    // Filtro de status
    if (filters.status && item.status !== filters.status) {
      return false;
    }

    // Filtro de tipo
    if (filters.tipo && item.tipo !== filters.tipo) {
      return false;
    }

    // Filtro de bloco
    if (filters.bloco && item.bloco !== filters.bloco) {
      return false;
    }

    // Filtro de data
    if (filters.dataInicio || filters.dataFim) {
      const itemDate = item.dataRegistro?.toDate?.() || new Date(item.dataRegistro);
      
      if (filters.dataInicio) {
        const startDate = new Date(filters.dataInicio);
        if (itemDate < startDate) return false;
      }
      
      if (filters.dataFim) {
        const endDate = new Date(filters.dataFim);
        endDate.setHours(23, 59, 59, 999);
        if (itemDate > endDate) return false;
      }
    }

    return true;
  });
}
