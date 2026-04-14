"use client";

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase'
import { getApiUrl } from '@/utils/platform'
import { Porteiro, PorteiroFormData } from '@/types/porteiro.types'
import { MENSAGENS } from '@/constants/porteiro.constants'

interface UsePorteirosReturn {
  porteiros: Porteiro[]
  loading: boolean
  error: string | null
  criarPorteiro: (formData: PorteiroFormData) => Promise<void>
  atualizarPorteiro: (id: string, formData: Partial<PorteiroFormData>) => Promise<void>
  excluirPorteiro: (id: string) => Promise<void>
  toggleStatus: (porteiro: Porteiro) => Promise<void>
}

export const usePorteiros = (condominioId: string): UsePorteirosReturn => {
  const [porteiros, setPorteiros] = useState<Porteiro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Carregar porteiros em tempo real
  useEffect(() => {
    if (!condominioId) {
      setLoading(false)
      return
    }

    // Busca inicial
    const fetchPorteiros = async () => {
      const { data, error: queryError } = await supabase
        .from('porteiros')
        .select('*')
        .eq('condominio_id', condominioId)
      
      if (queryError) {
        console.error('Erro ao carregar porteiros:', queryError)
        setError(MENSAGENS?.ERRO?.CARREGAR_PORTEIROS || "Erro ao carregar lista.")
        setLoading(false)
        return
      }

      const lista: Porteiro[] = (data || []).map((d: any) => ({
        id: d.id,
        uid: d.uid || d.id,
        nome: d.nome,
        email: d.email,
        whatsapp: d.whatsapp,
        condominioId: d.condominio_id,
        role: 'porteiro',
        ativo: d.ativo,
        criadoEm: d.criado_em,
      } as Porteiro))
      setPorteiros(lista.toSorted((a, b) => a.nome.localeCompare(b.nome)))
      setLoading(false)
      setError(null)
    }

    fetchPorteiros()

    // Realtime subscription
    const channel = supabase.channel(`porteiros-${condominioId}`)
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'porteiros',
      filter: `condominio_id=eq.${condominioId}`,
    }, () => {
      fetchPorteiros()
    })
    channel.subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [condominioId])

  const criarPorteiro = useCallback(
    async (formData: PorteiroFormData) => {
      try {
        const url = getApiUrl('/api/criar-porteiro');

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            senha: formData.senha,
            nome: formData.nome,
            whatsapp: formData.whatsapp,
            condominioId,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || MENSAGENS?.ERRO?.SALVAR_PORTEIRO || "Erro ao salvar.")
        }

        const { uid } = await response.json()

        // Criar documento na tabela porteiros
        const { error: insertError } = await supabase.from('porteiros').insert({
          uid,
          nome: formData.nome,
          email: formData.email,
          whatsapp: formData.whatsapp,
          condominio_id: condominioId,
          ativo: true,
        })

        if (insertError) throw insertError
      } catch (err: any) {
        console.error('Erro ao criar porteiro:', err)
        if (err.message?.includes('email-already-in-use')) {
          throw new Error(MENSAGENS?.ERRO?.EMAIL_EM_USO || "E-mail já está em uso.")
        }
        throw new Error(MENSAGENS?.ERRO?.SALVAR_PORTEIRO || "Erro ao criar porteiro.")
      }
    },
    [condominioId]
  )

  const atualizarPorteiro = useCallback(
    async (id: string, formData: Partial<PorteiroFormData>) => {
      try {
        const updateData: Record<string, any> = {}

        if (formData.nome) updateData.nome = formData.nome
        if (formData.whatsapp) updateData.whatsapp = formData.whatsapp

        const { error: updateError } = await supabase.from('porteiros').update(updateData).eq('id', id)
        if (updateError) throw updateError
      } catch (err) {
        console.error('Erro ao atualizar porteiro:', err)
        throw new Error(MENSAGENS?.ERRO?.SALVAR_PORTEIRO || "Erro ao atualizar.")
      }
    },
    []
  )

  const excluirPorteiro = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase.from('porteiros').delete().eq('id', id)
      if (deleteError) throw deleteError
    } catch (err) {
      console.error('Erro ao excluir porteiro:', err)
      throw new Error(MENSAGENS?.ERRO?.EXCLUIR_PORTEIRO || "Erro ao excluir.")
    }
  }, [])

  const toggleStatus = useCallback(async (porteiro: Porteiro) => {
    try {
      const { error: updateError } = await supabase.from('porteiros').update({
        ativo: !porteiro.ativo,
      }).eq('id', porteiro.id)
      if (updateError) throw updateError
    } catch (err) {
      console.error('Erro ao alterar status:', err)
      throw new Error(MENSAGENS?.ERRO?.ALTERAR_STATUS || "Erro ao alterar status.")
    }
  }, [])

  return {
    porteiros,
    loading,
    error,
    criarPorteiro,
    atualizarPorteiro,
    excluirPorteiro,
    toggleStatus,
  }
}