"use client";

import HistoricoRetiradas from "@/components/HistoricoRetiradas";
import withAuth from "@/components/withAuth";

function HistoricoResponsavelPage() {
  return (
    // AJUSTE: Substituí o Fragment (<>) por uma div com configurações de tela cheia
    // e proteção para a área segura (Notch/Entalhe) do celular.
    <div 
      className="min-h-screen bg-gray-50"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <HistoricoRetiradas 
        voltarUrl="/dashboard-responsavel" 
        tituloPerfil="Administração/Síndico"
      />
    </div>
  );
}

export default withAuth(HistoricoResponsavelPage, ["responsavel", "admin", "adminMaster"]);