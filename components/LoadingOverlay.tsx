"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  isVisible: boolean;
  progress: number;
  message?: string;
}

export function LoadingOverlay({ 
  isVisible, 
  progress, 
  message = "Processando..." 
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm flex flex-col items-center animate-in zoom-in-95 duration-200">
        
        {/* Loading Spinner Verde */}
        <div className="relative mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-gray-100"></div>
            <div className="w-12 h-12 rounded-full border-4 border-t-[#057321] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
        </div>

        <h3 className="text-xl font-bold text-gray-800 mb-1 text-center">{message}</h3>
        <p className="text-sm text-gray-500 mb-6 text-center">Por favor, não feche a página.</p>

        {/* Barra de Progresso */}
        <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden border border-gray-200 relative">
           <div
             className="h-full bg-gradient-to-r from-[#057321] to-[#0a9f2f] transition-all duration-300 ease-out rounded-full relative"
             style={{ width: `${Math.max(5, Math.min(100, progress))}%` }}
           >
             {/* Efeito de brilho passando */}
             <div className="absolute top-0 left-0 bottom-0 right-0 bg-white/20 animate-pulse"></div>
           </div>
        </div>

        {/* Texto de Porcentagem */}
        <div className="flex justify-between w-full mt-2 px-1">
            <span className="text-xs font-semibold text-gray-400">Aguarde...</span>
            <span className="text-xs font-bold text-[#057321]">
            {Math.round(progress)}%
            </span>
        </div>
      </div>
    </div>
  );
}