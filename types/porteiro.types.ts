// types/porteiro.types.ts

export interface Porteiro {
  id: string
  uid: string
  nome: string
  email: string
  whatsapp: string
  condominioId: string
  role: 'porteiro'
  ativo: boolean
  criadoEm: any
  atualizadoEm?: any
}

export interface PorteiroFormData {
  nome: string
  email: string
  senha: string
  confirmarSenha: string
  whatsapp: string
}

export type FilterStatus = 'todos' | 'ativos' | 'bloqueados'
export type ModalMode = 'criar' | 'editar'

export interface PorteiroFilters {
  searchTerm: string
  status: FilterStatus
}
