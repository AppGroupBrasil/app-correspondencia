"use client";
import Navbar from "@/components/Navbar";

export default function DashboardMoradorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar padrão do sistema */}
      <Navbar />

      {/* 
        Conteúdo Otimizado para Mobile e Desktop 
        Ajuste para Capacitor: O style garante que o padding do topo 
        considere a área do 'notch' (entalhe) do iPhone + o tamanho da Navbar
      */}
      <main 
        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 flex-1"
        style={{ 
          paddingTop: 'calc(6rem + env(safe-area-inset-top))' 
        }}
      >
        {children}
      </main>
    </div>
  );
}