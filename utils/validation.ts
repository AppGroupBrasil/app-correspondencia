// utils/validation.ts

import { VALIDACAO, MENSAGENS } from '@/constants/porteiro.constants'
import { PorteiroFormData } from '@/types/porteiro.types'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export const validarFormularioPorteiro = (
  formData: PorteiroFormData,
  isCriar: boolean
): ValidationResult => {
  const errors: string[] = []

  // Validar nome
  if (!formData.nome.trim()) {
    errors.push(MENSAGENS.ERRO.NOME_OBRIGATORIO)
  }

  // Validar email
  if (!formData.email.trim()) {
    errors.push(MENSAGENS.ERRO.EMAIL_OBRIGATORIO)
  } else if (!VALIDACAO.EMAIL_REGEX.test(formData.email)) {
    errors.push(MENSAGENS.ERRO.EMAIL_INVALIDO)
  }

  // Validar senha (apenas ao criar)
  if (isCriar) {
    if (!formData.senha) {
      errors.push(MENSAGENS.ERRO.SENHA_OBRIGATORIA)
    } else if (formData.senha.length < VALIDACAO.SENHA_MIN_LENGTH) {
      errors.push(MENSAGENS.ERRO.SENHA_MINIMA)
    }

    if (formData.senha !== formData.confirmarSenha) {
      errors.push(MENSAGENS.ERRO.SENHAS_NAO_CONFEREM)
    }
  }

  // Validar WhatsApp
  if (!formData.whatsapp.trim()) {
    errors.push(MENSAGENS.ERRO.WHATSAPP_OBRIGATORIO)
  } else {
    const whatsappNumeros = formData.whatsapp.replace(/\D/g, '')
    if (!VALIDACAO.WHATSAPP_REGEX.test(whatsappNumeros)) {
      errors.push(MENSAGENS.ERRO.WHATSAPP_INVALIDO)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export const formatarWhatsApp = (valor: string): string => {
  const numeros = valor.replace(/\D/g, '')
  
  if (numeros.length <= 10) {
    return numeros.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  
  return numeros.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
}
