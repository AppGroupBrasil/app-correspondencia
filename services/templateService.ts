import { supabase } from '@/app/lib/supabase';
import { MessageTemplate, MessageCategory } from '../types/template';

const TABLE_NAME = 'message_templates';

export const TemplateService = {
  getTemplates: async (condoId: string): Promise<MessageTemplate[]> => {
    try {
      const { data, error } = await supabase.from(TABLE_NAME).select('*').eq('condo_id', condoId);
      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id,
        condoId: d.condo_id,
        category: d.category,
        title: d.title,
        content: d.content,
        isActive: d.is_active,
        createdAt: d.criado_em,
        updatedAt: d.atualizado_em,
      } as MessageTemplate));
    } catch (error) {
      console.error('Error fetching templates:', error);
      return [];
    }
  },

  getActiveTemplate: async (condoId: string, category: MessageCategory): Promise<MessageTemplate | null> => {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('condo_id', condoId)
        .eq('category', category)
        .eq('is_active', true)
        .limit(1)
        .single();
      
      if (error || !data) return null;
      return {
        id: data.id,
        condoId: data.condo_id,
        category: data.category,
        title: data.title,
        content: data.content,
        isActive: data.is_active,
      } as MessageTemplate;
    } catch (error) {
      console.error('Error fetching active template:', error);
      return null;
    }
  },

  saveTemplate: async (template: MessageTemplate): Promise<void> => {
    try {
      const { error } = await supabase.from(TABLE_NAME).upsert({
        id: template.id || undefined,
        condo_id: template.condoId,
        category: template.category,
        title: template.title,
        content: template.content,
        is_active: template.isActive !== false,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving template:', error);
      throw error;
    }
  },

  initializeDefaults: async (condoId: string) => {
    const defaults: Partial<MessageTemplate>[] = [
      {
        category: 'ARRIVAL',
        title: 'Chegada Padrão',
        content: 'Olá {MORADOR}, chegou uma encomenda para a unidade {UNIDADE} ({BLOCO}). Rastreio: {RASTREIO}.',
        isActive: true
      },
      {
        category: 'PICKUP',
        title: 'Retirada Padrão',
        content: 'Olá {MORADOR}, sua encomenda foi retirada em {DATA_HORA}.',
        isActive: true
      }
    ];

    for (const def of defaults) {
      const exists = await TemplateService.getActiveTemplate(condoId, def.category as MessageCategory);
      if (!exists) {
        await TemplateService.saveTemplate({
          ...def,
          condoId,
        } as MessageTemplate);
      }
    }
  }
};