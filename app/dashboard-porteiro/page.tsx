"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import withAuth from "@/components/withAuth";
import { Package, Send, ClipboardCheck, Zap, HelpCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import TutorialGuide from "@/components/TutorialGuide";

function PorteiroPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  // Garante que o componente só renderize no cliente (Correção SSR/Hydration)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Função para reiniciar o tutorial
  const reiniciarTutorial = () => {
    // Remove a chave do localStorage que marca o tutorial como visto
    localStorage.removeItem("tutorial_porteiro_v2");
    // Recarrega a página para o tutorial abrir novamente
    globalThis.window.location.reload();
  };

  // Previne renderização no servidor para evitar mismatch de hidratação
  if (!isMounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      
      {/* 1. Navbar Fixa - Z-index alto para mobile */}
      <div className="relative z-50">
        <Navbar />
      </div>

      {/* 2. Espaçamento Ajustado para Mobile (Safe Area) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
        
        {/* ID: intro-painel */}
        <div id="intro-painel" className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Painel do Porteiro
          </h1>
          <p className="text-gray-600">
            Gerencie as correspondências do condomínio
          </p>
        </div>

        {/* Grid 2x2 Perfeito */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 1. Nova Correspondência */}
          <button
            id="btn-nova-correspondencia"
            onClick={() => router.push("/dashboard-porteiro/nova-correspondencia")}
            className="bg-[#057321] p-8 rounded-xl shadow-md hover:shadow-lg hover:bg-[#046119] transition-all duration-200"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-white/20 rounded-full p-4 backdrop-blur-sm">
                <Package className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Nova Correspondência
                </h2>
                <p className="text-green-100 mt-2 font-medium">
                  Registrar chegada de correspondência
                </p>
              </div>
            </div>
          </button>

          {/* 2. Avisos Rápidos */}
          <button
            id="btn-avisos-rapidos"
            onClick={() => router.push("/dashboard-porteiro/avisos-rapidos")}
            className="bg-[#057321] p-8 rounded-xl shadow-md hover:shadow-lg hover:bg-[#046119] transition-all duration-200"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-white/20 rounded-full p-4 backdrop-blur-sm">
                <Zap className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Avisos Rápidos
                </h2>
                <p className="text-green-100 mt-2 font-medium">
                  Enviar avisos via WhatsApp e Histórico
                </p>
              </div>
            </div>
          </button>

          {/* 3. Avisos Enviados */}
          <button
            id="btn-avisos-enviados"
            onClick={() => router.push("/dashboard-porteiro/correspondencias")}
            className="bg-[#057321] p-8 rounded-xl shadow-md hover:shadow-lg hover:bg-[#046119] transition-all duration-200"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-white/20 rounded-full p-4 backdrop-blur-sm">
                <Send className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Avisos Enviados
                </h2>
                <p className="text-green-100 mt-2 font-medium">
                  Ver todas as correspondências
                </p>
              </div>
            </div>
          </button>

          {/* 4. Registrar Retirada */}
          <button
            id="btn-registrar-retirada"
            onClick={() => router.push("/dashboard-porteiro/registrar-retirada")}
            className="bg-[#057321] p-8 rounded-xl shadow-md hover:shadow-lg hover:bg-[#046119] transition-all duration-200"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-white/20 rounded-full p-4 backdrop-blur-sm">
                <ClipboardCheck className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Registrar Retirada
                </h2>
                <p className="text-green-100 mt-2 font-medium">
                  Buscar por Nome, Apto ou QR Code
                </p>
              </div>
            </div>
          </button>

        </div>
      </main>

      {/* BOTÃO PARA REINICIAR O TUTORIAL */}
      <button
        onClick={reiniciarTutorial}
        className="fixed bottom-6 right-6 bg-[#057321] text-white p-3 rounded-full shadow-lg hover:bg-[#046119] transition-all z-50 flex items-center justify-center"
        title="Reiniciar Tutorial"
      >
        <HelpCircle size={28} />
      </button>

      {/* 👇 TUTORIAL AQUI 👇 */}
      <TutorialGuide 
        chaveLocalStorage="tutorial_porteiro_v2"
        passos={[
          { 
            element: '#intro-painel', 
            popover: { 
              title: 'Painel do Porteiro', 
              description: 'A portaria poderá enviar avisos aos moradores com foto, QR Code e protocolo, além de registrar retiradas de correspondência com identificação e assinatura digital.' 
            } 
          },
          { 
            element: '#btn-nova-correspondencia', 
            popover: { 
              title: 'Nova Correspondência', 
              description: 'Aviso completo com imagem, QR Code, protocolo e informações do porteiro remetente e do morador de destino.' 
            } 
          },
          { 
            element: '#btn-avisos-rapidos', 
            popover: { 
              title: 'Avisos Rápidos', 
              description: 'Envio de avisos simplificados, contendo apenas a foto e o protocolo da correspondência.' 
            } 
          },
          { 
            element: '#btn-avisos-enviados', 
            popover: { 
              title: 'Avisos Enviados', 
              description: 'Histórico de avisos enviados, com opção de gerar segunda via da notificação e do recibo de retirada.' 
            } 
          },
          { 
            element: '#btn-registrar-retirada', 
            popover: { 
              title: 'Registrar Retirada', 
              description: 'Registre a retirada com os dados e assinatura de quem recebeu. O sistema gera um comprovante físico ou digital.' 
            } 
          },
        ]}
      />

    </div>
  );
}

export default withAuth(PorteiroPage, ["porteiro", "responsavel", "adminMaster"]);