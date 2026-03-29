"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface BotaoVoltarProps {
  url?: string; // Opcional, padrão volta para dashboard do responsável
}

export default function BotaoVoltar({ url = "/dashboard-responsavel" }: BotaoVoltarProps) {
  const router = useRouter();

  return (
    <button 
      onClick={() => router.push(url)}
      className="flex items-center gap-2 bg-white border border-[#057321] text-[#057321] px-6 py-3 rounded-xl hover:bg-green-50 transition-all duration-200 font-bold shadow-sm mb-8 text-lg"
    >
      <ArrowLeft size={24} />
      Voltar para Dashboard
    </button>
  );
}