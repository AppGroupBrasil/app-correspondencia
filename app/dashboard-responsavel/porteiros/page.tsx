"use client";

import GerenciarPorteiros from "@/components/GerenciarPorteiros";
import Navbar from "@/components/Navbar";
import withAuth from "@/components/withAuth";

function PorteirosPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="pt-28 sm:pt-32 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <GerenciarPorteiros />
      </main>
    </div>
  );
}

export default withAuth(PorteirosPage, ["responsavel", "adminMaster"]);