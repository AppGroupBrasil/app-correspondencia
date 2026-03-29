import { useState, useEffect } from 'react';
import { useTemplates } from '../hooks/useTemplates';
import { MessageCategory, MessageTemplate } from '../types/template';
import { getAvailableVariables } from '../utils/templateParser';
import { DEFAULT_CONTENT, DEFAULT_TITLES } from '@/constants/messageDefaults';
import { RefreshCw, Lock, Unlock } from 'lucide-react';

interface TemplateManagerProps {
  condoId: string;
}

const CATEGORIES: { key: MessageCategory; label: string }[] = [
  { key: 'ARRIVAL', label: 'Chegada de Encomenda' },
  { key: 'PICKUP', label: 'Retirada de Encomenda' },
  { key: 'WARNING', label: 'Avisos Rápidos (Portaria)' },
];

export default function TemplateManager({ condoId }: TemplateManagerProps) {
  const { templates, loading, saveTemplate, refresh } = useTemplates(condoId);
  const [activeCategory, setActiveCategory] = useState<MessageCategory>('ARRIVAL');
  const [localTemplate, setLocalTemplate] = useState<Partial<MessageTemplate>>({});

  useEffect(() => {
    const found = templates.find(t => t.category === activeCategory);

    if (found) {
      setLocalTemplate(found);
    } else {
      setLocalTemplate({
        condoId,
        category: activeCategory,
        title: DEFAULT_TITLES[activeCategory] || '',
        content: DEFAULT_CONTENT[activeCategory] || '',
        isActive: true,
        isMandatory: false,
      });
    }
  }, [activeCategory, templates, condoId]);

  const handleSave = async () => {
    if (!localTemplate.content || !localTemplate.title) return;

    try {
      await saveTemplate(localTemplate as MessageTemplate);
      alert('Salvo com sucesso!');
    } catch (error) {
      alert('Erro ao salvar.');
    }
  };

  const insertVariable = (variable: string) => {
    setLocalTemplate(prev => ({
      ...prev,
      content: (prev.content || '') + ` {${variable}}`,
    }));
  };

  if (loading) return <div className="p-4 text-[#057321]">Carregando...</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-green-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Gerenciador de Mensagens</h2>
        <button onClick={refresh}>
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap ${
              activeCategory === cat.key ? 'bg-[#057321] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <input
          value={localTemplate.title || ''}
          onChange={e => setLocalTemplate({ ...localTemplate, title: e.target.value })}
          className="w-full p-3 border rounded-lg"
          placeholder="Título da mensagem"
        />

        <div className="flex flex-wrap gap-2 p-2 bg-gray-50 border rounded-lg">
          {getAvailableVariables(activeCategory).map(v => (
            <button
              key={v}
              onClick={() => insertVariable(v)}
              className="text-xs font-bold bg-white border px-2 py-1 rounded text-[#057321]"
            >
              {`{${v}}`}
            </button>
          ))}
        </div>

        <textarea
          rows={15}
          value={localTemplate.content || ''}
          onChange={e => setLocalTemplate({ ...localTemplate, content: e.target.value })}
          className="w-full p-3 border rounded-lg font-mono text-sm"
          placeholder="Texto da mensagem..."
        />

        {/* --- ÁREA DE DEPURAÇÃO VISUAL (BORDA VERMELHA) --- */}
        <div className="border-4 border-red-500 p-4 rounded-xl bg-red-50">
          <h3 className="font-bold text-red-700 mb-2">ÁREA DE CONTROLE (PORTARIA)</h3>

          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={localTemplate.isActive ?? true}
              onChange={e => setLocalTemplate({ ...localTemplate, isActive: e.target.checked })}
              className="w-5 h-5"
            />
            <span>Ativar Modelo</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <div className="p-2 bg-white rounded-full border">
              {localTemplate.isMandatory ? (
                <Lock size={24} className="text-red-600" />
              ) : (
                <Unlock size={24} className="text-green-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localTemplate.isMandatory ?? false}
                  onChange={e => setLocalTemplate({ ...localTemplate, isMandatory: e.target.checked })}
                  className="w-6 h-6"
                />
                <span className="font-bold text-lg">BLOQUEAR PORTARIA?</span>
              </div>
              <p className="text-sm text-gray-600">Se marcado, o porteiro NÃO consegue editar a mensagem.</p>
            </div>
          </label>
        </div>

        <button onClick={handleSave} className="w-full py-3 bg-[#057321] text-white font-bold rounded-lg">
          SALVAR ALTERAÇÕES
        </button>
      </div>
    </div>
  );
}
