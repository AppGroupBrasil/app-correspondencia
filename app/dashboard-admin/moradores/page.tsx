"use client";

import { Suspense } from "react";
import GerenciarMoradores from "@/components/GerenciarMoradores";
import withAuth from "@/components/withAuth";

function MoradoresAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gerenciar Moradores</h1>
        <p className="text-gray-600">Gerencie os moradores do condomínio selecionado</p>
      </div>
      
      <Suspense fallback={<div className="text-gray-500">Carregando...</div>}>
        <GerenciarMoradores />
      </Suspense>
    </div>
  );
}

export default withAuth(MoradoresAdminPage, ["adminMaster"]);
