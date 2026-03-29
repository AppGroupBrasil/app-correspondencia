// components/PorteiroFormModal.tsx

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { PorteiroFormData, ModalMode } from '@/types/porteiro.types'
import { MODAL_MODE } from '@/constants/porteiro.constants'
import { formatarWhatsApp } from '@/utils/validation'

interface PorteiroFormModalProps {
  isOpen: boolean
  mode: ModalMode
  initialData?: Partial<PorteiroFormData>
  onClose: () => void
  onSubmit: (data: PorteiroFormData) => void
  loading?: boolean
}

export const PorteiroFormModal = ({
  isOpen,
  mode,
  initialData,
  onClose,
  onSubmit,
  loading = false,
}: PorteiroFormModalProps) => {
  const [formData, setFormData] = useState<PorteiroFormData>({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    whatsapp: '',
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        nome: initialData.nome || '',
        email: initialData.email || '',
        senha: '',
        confirmarSenha: '',
        whatsapp: initialData.whatsapp || '',
      })
    } else {
      setFormData({
        nome: '',
        email: '',
        senha: '',
        confirmarSenha: '',
        whatsapp: '',
      })
    }
  }, [initialData, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleWhatsAppChange = (value: string) => {
    const numeros = value.replace(/\D/g, '')
    setFormData({ ...formData, whatsapp: numeros })
  }

  if (!isOpen) return null

  const isCriar = mode === MODAL_MODE.CRIAR

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-bold">
            {isCriar ? 'Novo Porteiro' : 'Editar Porteiro'}
          </h2>
          <button onClick={onClose} disabled={loading}>
            <X className="w-6 h-6 text-gray-500 hover:text-gray-700" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome Completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              disabled={loading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100"
              disabled={!isCriar || loading}
              required
            />
            {!isCriar && (
              <p className="text-xs text-gray-500 mt-1">
                O email não pode ser alterado
              </p>
            )}
          </div>

          {isCriar && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.senha}
                  onChange={(e) =>
                    setFormData({ ...formData, senha: e.target.value })
                  }
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  disabled={loading}
                  minLength={6}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Mínimo de 6 caracteres
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Senha <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.confirmarSenha}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmarSenha: e.target.value })
                  }
                  className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  disabled={loading}
                  minLength={6}
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formatarWhatsApp(formData.whatsapp)}
              onChange={(e) => handleWhatsAppChange(e.target.value)}
              placeholder="(11) 98765-4321"
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              disabled={loading}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Apenas números (DDD + número)
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
