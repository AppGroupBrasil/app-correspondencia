"use client";

import Navbar from "@/components/Navbar";
import MinhasCorrespondencias from "@/components/MinhasCorrespondencias";
import withAuth from "@/components/withAuth";

function MinhasCorrespondenciasPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* 
        AJUSTE DE LAYOUT:
        1. <main>: Semanticamente correto para o conteúdo principal.
        2. style={{ paddingTop... }}: Cria o espaço necessário para que o conteúdo
           não fique escondido atrás da Navbar fixa nem do relógio do celular.
           '5rem' é uma altura segura média para Navbars.
      */}
      <main 
        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12"
        style={{ 
          paddingTop: 'calc(5rem + env(safe-area-inset-top))' 
        }}
      >
        <MinhasCorrespondencias />
      </main>
    </div>
  );
}

export default withAuth(MinhasCorrespondenciasPage, ["morador"]);