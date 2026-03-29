// constants/porteiro.constants.ts

export const FILTER_STATUS = {
  TODOS: 'todos',
  ATIVOS: 'ativos',
  BLOQUEADOS: 'bloqueados',
} as const

export const MODAL_MODE = {
  CRIAR: 'criar',
  EDITAR: 'editar',
} as const

export const MENSAGENS = {
  SUCESSO: {
    PORTEIRO_CRIADO: 'Porteiro cadastrado com sucesso!',
    PORTEIRO_ATUALIZADO: 'Porteiro atualizado com sucesso!',
    PORTEIRO_EXCLUIDO: 'Porteiro excluído com sucesso!',
    PORTEIRO_BLOQUEADO: 'Porteiro bloqueado com sucesso!',
    PORTEIRO_DESBLOQUEADO: 'Porteiro desbloqueado com sucesso!',
  },
  ERRO: {
    CARREGAR_PORTEIROS: 'Erro ao carregar a lista de porteiros',
    SALVAR_PORTEIRO: 'Erro ao salvar porteiro',
    EXCLUIR_PORTEIRO: 'Erro ao excluir porteiro',
    ALTERAR_STATUS: 'Erro ao alterar status do porteiro',
    EMAIL_EM_USO: 'Este email já está em uso',
    AUTENTICACAO: 'Erro ao verificar autenticação',
    NOME_OBRIGATORIO: 'Nome é obrigatório',
    EMAIL_OBRIGATORIO: 'Email é obrigatório',
    EMAIL_INVALIDO: 'Email inválido',
    SENHA_OBRIGATORIA: 'Senha é obrigatória',
    SENHA_MINIMA: 'Senha deve ter no mínimo 6 caracteres',
    SENHAS_NAO_CONFEREM: 'As senhas não conferem',
    WHATSAPP_OBRIGATORIO: 'WhatsApp é obrigatório',
    WHATSAPP_INVALIDO: 'WhatsApp inválido',
  },
}

export const VALIDACAO = {
  SENHA_MIN_LENGTH: 6,
  WHATSAPP_REGEX: /^\d{10,11}$/,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
}

export const TIMEOUT = {
  MENSAGEM_SUCESSO: 4000,
  MENSAGEM_ERRO: 5000,
}
