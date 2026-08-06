import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/lib/supabase';
import { MessageTemplate, MessageCategory } from '../types/template';
import { replaceVariables } from '../utils/templateParser';

// --- DEFINIÇÃO DOS MODELOS PADRÃO BONITOS ---
const DEFAULT_ARRIVAL_TEMPLATE = `AVISO DE CORRESPONDÊNCIA

Olá, {MORADOR}!
Unidade: {UNIDADE} ({BLOCO})

Você recebeu uma correspondência
━━━━━━━━━━━━━━━━
│ PROTOCOLO: {PROTOCOLO}
│ Local: {LOCAL}
│ Recebido por: {RECEBIDO_POR}
│ Chegada: {DATA_HORA}
━━━━━━━━━━━━━━━━

FOTO E QR CODE:`;

const DEFAULT_PICKUP_TEMPLATE = `CONFIRMAÇÃO DE RETIRADA

Olá, {MORADOR}!
Unidade: {UNIDADE} ({BLOCO})

Sua encomenda foi retirada com sucesso.
━━━━━━━━━━━━━━━━
│ PROTOCOLO: {PROTOCOLO}
│ Retirado por: {QUEM_RETIROU}
│ Data: {DATA_HORA}
━━━━━━━━━━━━━━━━

Se não reconhece esta retirada, entre em contato.`;

const DEFAULT_WARNING_TEMPLATE = `AVISO RÁPIDO

Olá, {MORADOR}!

{MENSAGEM}

Atenciosamente,
{CONDOMINIO}`;

export function useTemplates(condoId: string) {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!condoId) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('condo_id', condoId);

    if (!error && data) {
      setTemplates(data.map((d: any) => ({
        id: d.id,
        condoId: d.condo_id,
        category: d.category,
        title: d.title,
        content: d.content,
        isActive: d.is_active,
      } as MessageTemplate)));
    }

    setLoading(false);
  }, [condoId]);

  // Busca templates sob demanda. Realtime foi removido para evitar
  // conflitos de múltiplas assinaturas do mesmo canal em páginas modais.
  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // A tela de registro fica aberta enquanto o texto é alterado no modal, que
  // usa outra instância deste hook. Sem o aviso, o envio continuaria usando o
  // modelo carregado na abertura da página.
  useEffect(() => {
    const aoAtualizar = (evento: Event) => {
      const alvo = (evento as CustomEvent<{ condoId?: string }>).detail?.condoId;
      if (!alvo || alvo === condoId) fetchTemplates();
    };

    window.addEventListener('templates:updated', aoAtualizar);
    return () => window.removeEventListener('templates:updated', aoAtualizar);
  }, [condoId, fetchTemplates]);

  // Função para pegar a mensagem formatada
  const getFormattedMessage = useCallback(async (category: MessageCategory, variables: Record<string, string>) => {
    // 1. Tenta achar o template personalizado do condomínio
    const template = templates.find(t => t.category === category && t.isActive);
    
    let content = "";

    // 2. Se existir, usa. Se não, usa o PADRÃO BONITO.
    if (template?.content) {
      content = template.content;
    } else {
      switch (category) {
        case 'ARRIVAL':
          content = DEFAULT_ARRIVAL_TEMPLATE;
          break;
        case 'PICKUP':
          content = DEFAULT_PICKUP_TEMPLATE;
          break;
        case 'WARNING':
          content = DEFAULT_WARNING_TEMPLATE;
          break;
        default:
          content = "Você tem uma nova mensagem.";
      }
    }

    // 3. Substitui as variáveis usando a função correta
    return replaceVariables(content, variables);
  }, [templates]);

  // Função para salvar/atualizar template.
  // A tabela não tem chave única em (condo_id, category), então o upsert com
  // onConflict era recusado pelo banco e nada era gravado: aqui a linha é
  // procurada antes para decidir entre update e insert.
  const saveTemplate = async (template: MessageTemplate) => {
    if (!condoId) throw new Error('Condomínio não identificado.');

    const registro = {
      condo_id: condoId,
      category: template.category,
      title: template.title || null,
      content: template.content,
      is_active: template.isActive !== false,
    };

    const { data: existente, error: buscaErr } = await supabase
      .from('message_templates')
      .select('id')
      .eq('condo_id', condoId)
      .eq('category', template.category)
      .limit(1);

    if (buscaErr) throw buscaErr;

    const { error } = existente && existente.length
      ? await supabase.from('message_templates').update(registro).eq('id', existente[0].id)
      : await supabase.from('message_templates').insert(registro);

    if (error) throw error;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('templates:updated', { detail: { condoId } }));
    }
  };

  const refresh = async () => {
    await fetchTemplates();
  };

  return {
    templates,
    loading,
    getFormattedMessage,
    saveTemplate,
    refresh
  };
}