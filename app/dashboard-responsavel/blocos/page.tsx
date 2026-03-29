"use client";

import GerenciarBlocos from "@/components/GerenciarBlocos";
import Navbar from "@/components/Navbar";
import withAuth from "@/components/withAuth";

function BlocosPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {/* Ajustado pt-28 (mobile) e sm:pt-32 (desktop) para afastar do topo */}
      <main className="pt-28 sm:pt-32 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <GerenciarBlocos />
      </main>
    </div>
  );
}

export default withAuth(BlocosPage, ["responsavel", "adminMaster"]);