// components/PorteiroFilters.tsx

import { Search } from 'lucide-react'
import { FilterStatus } from '@/types/porteiro.types'
import { FILTER_STATUS } from '@/constants/porteiro.constants'

interface PorteiroFiltersProps {
  searchTerm: string
  filterStatus: FilterStatus
  onSearchChange: (value: string) => void
  onFilterChange: (value: FilterStatus) => void
}

export const PorteiroFilters = ({
  searchTerm,
  filterStatus,
  onSearchChange,
  onFilterChange,
}: PorteiroFiltersProps) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6 grid md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Buscar Porteiro
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Nome, email ou WhatsApp..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filtrar por Status
        </label>
        <select
          value={filterStatus}
          onChange={(e) => onFilterChange(e.target.value as FilterStatus)}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value={FILTER_STATUS.TODOS}>Todos</option>
          <option value={FILTER_STATUS.ATIVOS}>Ativos</option>
          <option value={FILTER_STATUS.BLOQUEADOS}>Bloqueados</option>
        </select>
      </div>
    </div>
  )
}
