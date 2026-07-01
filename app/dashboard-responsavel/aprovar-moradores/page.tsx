"use client";

import AprovarMoradores from "@/components/AprovarMoradores";
import Navbar from "@/components/Navbar";
import withAuth from "@/components/withAuth";

function AprovarMoradoresPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {/* Espaçamento superior ajustado para Mobile (pt-38) e Desktop (pt-40) */}
      <main className="pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" style={{ paddingTop: 'calc(6rem + env(safe-area-inset-top))' }}>
        <AprovarMoradores />
      </main>
    </div>
  );
}

export default withAuth(AprovarMoradoresPage, ["responsavel", "adminMaster"]);