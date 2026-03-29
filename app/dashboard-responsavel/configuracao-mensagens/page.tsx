"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import TemplateManager from "@/components/TemplateManager";
import withAuth from "@/components/withAuth";
import { useAuth } from "@/hooks/useAuth";

function ConfiguracaoMensagensPage() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div 
      className="min-h-screen bg-gray-50"
      // AJUSTE CRÍTICO:
      // 'calc(1.5rem + env...)' garante um espaçamento mínimo de 1.5rem (24px)
      // SOMADO à área segura do topo (notch do iPhone).
      style={{ 
        paddingTop: 'calc(1.5rem + env(safe-area-inset-top))',
        paddingBottom: '2rem'
      }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()} 
              className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-7 h-7 text-[#057321]" />
              Configuração de Mensagens
            </h1>
          </div>
          
          <p className="text-sm text-gray-500 sm:ml-auto mt-2 sm:mt-0 max-w-md">
            Personalize os textos automáticos enviados via WhatsApp e E-mail.
          </p>
        </div>

        {/* Componente Gerenciador */}
        {user?.condominioId ? (
          <TemplateManager condoId={user.condominioId} />
        ) : (
          <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200 flex items-center justify-center">
            <span className="animate-pulse">Carregando informações do condomínio...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Proteção de Rota
export default withAuth(ConfiguracaoMensagensPage, ["responsavel", "admin", "adminMaster"]);