import { db } from '../app/lib/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  query, 
  where, 
  serverTimestamp, 
  limit 
} from 'firebase/firestore';
import { MessageTemplate, MessageCategory } from '../types/template';

const COLLECTION_NAME = 'message_templates';

export const TemplateService = {
  getTemplates: async (condoId: string): Promise<MessageTemplate[]> => {
    try {
      const q = query(collection(db, COLLECTION_NAME), where('condoId', '==', condoId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MessageTemplate));
    } catch (error) {
      console.error('Error fetching templates:', error);
      return [];
    }
  },

  getActiveTemplate: async (condoId: string, category: MessageCategory): Promise<MessageTemplate | null> => {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('condoId', '==', condoId),
        where('category', '==', category),
        where('isActive', '==', true),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as MessageTemplate;
    } catch (error) {
      console.error('Error fetching active template:', error);
      return null;
    }
  },

  saveTemplate: async (template: MessageTemplate): Promise<void> => {
    try {
      const ref = template.id 
        ? doc(db, COLLECTION_NAME, template.id) 
        : doc(collection(db, COLLECTION_NAME));

      const data = {
        ...template,
        id: ref.id,
        updatedAt: serverTimestamp(),
        createdAt: template.createdAt || serverTimestamp(),
      };

      await setDoc(ref, data, { merge: true });
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