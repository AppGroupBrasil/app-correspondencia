"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Building2, // Blocos
  Users,     // Moradores
  UserCog,   // Porteiros
  Clock,     // Aprovar
  ChevronDown, 
  Settings,   // Ícone do título
  MessageSquare // Ícone de Mensagens
} from "lucide-react";

export default function MenuGestaoCondominio() {
  const router = useRouter();
  // Estado: false = fechado, true = aberto
  const [isOpen, setIsOpen] = useState(true); // Alterei para true para já vir aberto se preferir (opcional)

  const itens = [
    { 
      label: "Blocos", 
      subLabel: "Gerenciar", 
      icon: Building2, 
      url: "/dashboard-responsavel/blocos" 
    },
    { 
      label: "Moradores", 
      subLabel: "Gerenciar", 
      icon: Users, 
      url: "/dashboard-responsavel/moradores" 
    },
    { 
      label: "Porteiros", 
      subLabel: "Gerenciar", 
      icon: UserCog, 
      url: "/dashboard-responsavel/porteiros" 
    },
    { 
      label: "Aprovar", 
      subLabel: "Cadastros", 
      icon: Clock, 
      url: "/dashboard-responsavel/aprovacoes" 
    },
    { 
      label: "Mensagens", 
      subLabel: "Configurar", 
      icon: MessageSquare, 
      url: "/dashboard-responsavel/configuracao-mensagens" 
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
      {/* --- CABEÇALHO (CLICÁVEL) --- */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-[#057321] transition-all hover:bg-green-100"
      >
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-full shadow-sm text-[#057321]">
            <Settings size={20} />
          </div>
          <div className="text-left">
            <h2 className="text-lg font-bold text-gray-900 uppercase">
              Gestão de Cadastros e Configurações
            </h2>
            <p className="text-xs text-gray-500 font-medium md:hidden">
              {isOpen ? "Clique para fechar" : "Clique para ver opções"}
            </p>
          </div>
        </div>
        
        {/* Seta giratória */}
        <div className={`text-[#057321] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          <ChevronDown size={24} />
        </div>
      </button>

      {/* --- CONTEÚDO (ACORDEÃO) --- */}
      <div 
        className={`
          transition-all duration-300 ease-in-out overflow-hidden bg-white
          ${isOpen ? 'max-h-[600px] opacity-100 border-t border-gray-100' : 'max-h-0 opacity-0'}
        `}
      >
        {/* Ajustei o grid para grid-cols-5 para caber o novo botão na mesma linha em telas grandes */}
        <div className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          {itens.map((item, index) => (
            <button
              key={index}
              onClick={() => router.push(item.url)}
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-[#057321] hover:text-white hover:border-[#057321] transition-all group shadow-sm"
            >
              <div className="mb-2 p-3 bg-white rounded-full shadow-sm group-hover:bg-white/20 group-hover:text-white text-[#057321] transition-colors">
                <item.icon size={24} />
              </div>
              <span className="font-bold text-sm">{item.label}</span>
              <span className="text-xs text-gray-500 group-hover:text-green-100 mt-1">
                {item.subLabel}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}