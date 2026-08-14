"use client";

import { ChevronDown, ChevronUp, Home, PackageCheck, User } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  moradorNome: string;
  unidade: string;
  quantidade: number;
  protocolos: string[];
  aberto: boolean;
  onAlternar: () => void;
  onEntregarTodas: () => void;
  children: ReactNode;
}

// Cabeçalho de um morador com várias pendências: o porteiro busca o nome,
// toca em "Entregar todas" e colhe uma assinatura só. A lista fica recolhida
// para não empurrar os outros moradores para fora da tela.
export default function GrupoMoradorCard({
  moradorNome,
  unidade,
  quantidade,
  protocolos,
  aberto,
  onAlternar,
  onEntregarTodas,
  children,
}: Props) {
  const resumo = protocolos.slice(0, 3).map((p) => `#${p}`).join(", ");
  const restantes = protocolos.length - 3;

  return (
    <div className="rounded-2xl border-2 border-[#057321] bg-white shadow-sm overflow-hidden">
      <div className="bg-green-50 p-4 border-b border-green-100">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <User size={18} className="text-[#057321] flex-shrink-0" />
              <span className="truncate">{moradorNome}</span>
            </p>
            {unidade && (
              <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-1">
                <Home size={14} /> {unidade}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {resumo}
              {restantes > 0 && ` +${restantes}`}
            </p>
          </div>

          <span className="bg-[#057321] text-white text-sm font-bold px-3 py-1 rounded-full whitespace-nowrap">
            {quantidade} pendentes
          </span>
        </div>

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <button
            type="button"
            onClick={onEntregarTodas}
            className="flex-1 min-w-[200px] flex items-center justify-center gap-2 bg-[#057321] text-white font-bold py-3 px-4 rounded-xl hover:bg-[#046019] transition-colors shadow-sm"
          >
            <PackageCheck size={20} />
            Entregar todas ({quantidade})
          </button>
          <button
            type="button"
            onClick={onAlternar}
            className="flex items-center gap-1 text-sm font-bold text-[#057321] underline px-2 py-2"
          >
            {aberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {aberto ? "recolher" : `ver as ${quantidade}`}
          </button>
        </div>
      </div>

      {aberto && <div className="p-3 space-y-3 bg-gray-50">{children}</div>}
    </div>
  );
}
