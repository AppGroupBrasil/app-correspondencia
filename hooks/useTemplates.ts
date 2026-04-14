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

  // Função para salvar/atualizar template
  const saveTemplate = async (template: MessageTemplate) => {
    if (!condoId) return;
    
    const { error } = await supabase
      .from('message_templates')
      .upsert({
        condo_id: condoId,
        category: template.category,
        title: template.title || null,
        content: template.content,
        is_active: template.isActive !== false,
      }, { onConflict: 'condo_id,category' });

    if (error) console.error('Erro ao salvar template:', error);
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