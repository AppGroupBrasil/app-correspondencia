import { useState, useEffect, useCallback } from 'react';
import { db } from '@/app/lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { MessageTemplate, MessageCategory } from '../types/template';
// AQUI ESTAVA O ERRO: Mudamos de parseMessage para replaceVariables
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

  // Busca templates em tempo real
  useEffect(() => {
    if (!condoId) return;

    const q = query(collection(db, 'message_templates'), where('condoId', '==', condoId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MessageTemplate));
      setTemplates(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [condoId]);

  // Função para pegar a mensagem formatada
  const getFormattedMessage = useCallback(async (category: MessageCategory, variables: Record<string, string>) => {
    // 1. Tenta achar o template personalizado do condomínio
    const template = templates.find(t => t.category === category && t.isActive);
    
    let content = "";

    // 2. Se existir, usa. Se não, usa o PADRÃO BONITO.
    if (template && template.content) {
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
    
    const id = `${condoId}_${template.category}`;
    const docRef = doc(db, 'message_templates', id);
    
    await setDoc(docRef, {
      ...template,
      condoId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  };

  const refresh = async () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 500);
  };

  return {
    templates,
    loading,
    getFormattedMessage,
    saveTemplate,
    refresh
  };
}