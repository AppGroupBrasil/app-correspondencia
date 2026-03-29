"use client";

import HistoricoRetiradas from "@/components/HistoricoRetiradas";
import withAuth from "@/components/withAuth";

function HistoricoPorteiroPage() {
  return (
    // A classe ou estilo abaixo garante que o conteúdo não fique atrás
    // da barra de status (relógio/bateria) no celular (iPhone/Android)
    <div 
      className="w-full min-h-screen" 
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <HistoricoRetiradas 
        voltarUrl="/dashboard-porteiro/avisos-rapidos" 
        tituloPerfil="Histórico de Avisos (Portaria)"
      />
    </div>
  );
}

// A lógica de permissões permanece a mesma
export default withAuth(HistoricoPorteiroPage, ["porteiro", "admin", "adminMaster", "responsavel"]);