"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import GerenciarBlocos from "@/components/GerenciarBlocos";
import { AlertCircle } from "lucide-react";
import withAuth from "@/components/withAuth";

function BlocosContent() {
  const searchParams = useSearchParams();
  const condominioId = searchParams.get("condominio");

  if (!condominioId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <AlertCircle size={48} className="mb-2 text-yellow-500" />
        <p className="text-lg font-medium">Selecione um condomínio acima</p>
        <p className="text-sm">Utilize o menu superior para escolher o condomínio.</p>
      </div>
    );
  }

  // Passa o ID como prop (precisaremos ajustar o componente também, igual fizemos com Aprovações)
  return <GerenciarBlocos condominioId={condominioId} />;
}

function BlocosAdminPage() {
  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Gerenciar Blocos</h1>
        <p className="text-gray-600">Adicione, edite ou remova blocos do condomínio.</p>
      </div>
      
      <Suspense fallback={
        <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#057321]"></div>
        </div>
      }>
        <BlocosContent />
      </Suspense>
    </div>
  );
}

export default withAuth(BlocosAdminPage, ["adminMaster"]);
