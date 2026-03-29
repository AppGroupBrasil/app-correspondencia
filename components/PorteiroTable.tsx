// components/PorteiroTable.tsx

import { Edit2, Lock, Unlock, Trash2, Users } from 'lucide-react'
import { Porteiro } from '@/types/porteiro.types'

interface PorteiroTableProps {
  porteiros: Porteiro[]
  onEdit: (porteiro: Porteiro) => void
  onToggleStatus: (porteiro: Porteiro) => void
  onDelete: (porteiro: Porteiro) => void
}

export const PorteiroTable = ({
  porteiros,
  onEdit,
  onToggleStatus,
  onDelete,
}: PorteiroTableProps) => {
  if (porteiros.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-8 text-center text-gray-500">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-semibold">Nenhum porteiro encontrado</p>
          <p className="text-sm mt-2">Clique em &quot;Novo Porteiro&quot; para cadastrar</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                WhatsApp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {porteiros.map((porteiro) => (
              <tr key={porteiro.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {porteiro.nome}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{porteiro.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{porteiro.whatsapp}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {porteiro.ativo ? (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Ativo
                    </span>
                  ) : (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                      Bloqueado
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onEdit(porteiro)}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => onToggleStatus(porteiro)}
                      className={`${
                        porteiro.ativo
                          ? 'text-orange-600 hover:text-orange-900 hover:bg-orange-50'
                          : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                      } p-1 rounded transition-colors`}
                      title={porteiro.ativo ? 'Bloquear' : 'Desbloquear'}
                    >
                      {porteiro.ativo ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                    <button
                      onClick={() => onDelete(porteiro)}
                      className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
