"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
// CORREÇÃO: Importamos do arquivo novo (detalhes-view), não mais da pasta [id]
import DetalhesView from "./detalhes-view";

function VisualizarConteudo() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  // Se não tiver ID na URL (?id=...), mostra aviso
  if (!id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
        <p>ID da correspondência não fornecido.</p>
      </div>
    );
  }

  // Renderiza o componente que criamos
  return <DetalhesView id={id} />;
}

export default function VerPageRaiz() {
  return (
    // Suspense é obrigatório para usar useSearchParams no build estático
    <Suspense 
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500 gap-3">
          <Loader2 size={40} className="animate-spin text-[#057321]" />
          <p>Carregando...</p>
        </div>
      }
    >
      <VisualizarConteudo />
    </Suspense>
  );
}