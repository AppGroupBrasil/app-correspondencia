"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/app/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Settings, Save, Phone, Info, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import BotaoVoltar from "@/components/BotaoVoltar"; // Certifique-se de que o caminho está correto
import withAuth from "@/components/withAuth";

function ConfiguracoesAdminPage() {
  const router = useRouter();
  const [whatsappLink, setWhatsappLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCarregar, setLoadingCarregar] = useState(true);

  // Carregar configurações ao montar
  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const carregarConfiguracoes = async () => {
    try {
      setLoadingCarregar(true);
      const docRef = doc(db, "configuracoes", "suporte");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setWhatsappLink(docSnap.data().whatsappLink || "");
      }
    } catch (err) {
      console.error("Erro ao carregar configurações:", err);
      alert("Erro ao carregar configurações");
    } finally {
      setLoadingCarregar(false);
    }
  };

  const salvarConfiguracoes = async () => {
    try {
      if (whatsappLink && !whatsappLink.startsWith("https://")) {
        alert("O link deve começar com https://");
        return;
      }

      setLoading(true);

      await setDoc(doc(db, "configuracoes", "suporte"), {
        whatsappLink,
        atualizadoEm: serverTimestamp(),
      });

      alert("Configurações salvas com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar configurações:", err);
      alert("Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  const testarWhatsApp = () => {
    if (!whatsappLink) {
      alert("Configure o link do WhatsApp primeiro");
      return;
    }
    window.open(whatsappLink, "_blank");
  };

  return (
    <div className="min-h-screen bg-gray-50">
        {/* Navbar opcional se já tiver no layout */}
        
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
            
            <div className="mb-6">
                <BotaoVoltar url="/dashboard-admin" />
            </div>

            {/* Cabeçalho */}
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-[#057321] mb-6 flex items-center gap-4">
                <div className="bg-green-100 p-3 rounded-full text-[#057321]">
                    <Settings size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Configurações do Sistema</h1>
                    <p className="text-gray-600 text-sm">Gerencie as configurações globais e de suporte</p>
                </div>
            </div>

            {/* Conteúdo */}
            {loadingCarregar ? (
                <div className="bg-white p-12 rounded-xl shadow-sm text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#057321] mx-auto mb-4"></div>
                    <p className="text-gray-500">Carregando configurações...</p>
                </div>
            ) : (
                <div className="bg-white p-6 rounded-xl shadow-lg space-y-8">
                    
                    {/* Seção WhatsApp */}
                    <div>
                        <div className="flex items-center gap-2 mb-4 border-b pb-2">
                            <Phone className="text-green-600" size={24} />
                            <h2 className="text-lg font-bold text-gray-800">WhatsApp de Suporte</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Link do WhatsApp (Exibido na tela de Login)
                                </label>
                                <input
                                    type="url"
                                    value={whatsappLink}
                                    onChange={(e) => setWhatsappLink(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#057321] focus:border-[#057321] outline-none transition-all"
                                    placeholder="https://wa.me/5581999618516?text=Olá"
                                />
                                <p className="text-xs text-gray-500 mt-2 italic">
                                    Cole o link completo gerado pelo WhatsApp.
                                </p>
                            </div>

                            {/* Dica de Como Gerar */}
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
                                <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                                <div>
                                    <h3 className="text-sm font-bold text-blue-900 mb-1">Como gerar o link:</h3>
                                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                                        <li>Use o formato: <code className="bg-blue-100 px-1 rounded font-mono">https://wa.me/SEUNUMERO</code></li>
                                        <li>Exemplo: <code className="bg-blue-100 px-1 rounded font-mono">https://wa.me/5581999618516</code></li>
                                        <li>Para mensagem automática, adicione: <code className="bg-blue-100 px-1 rounded font-mono">?text=Olá</code></li>
                                    </ol>
                                </div>
                            </div>

                            {/* Botões de Ação */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <button
                                    onClick={testarWhatsApp}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border-2 border-green-600 text-green-700 rounded-lg font-bold hover:bg-green-50 transition-colors"
                                >
                                    <Phone size={20} /> Testar Link
                                </button>
                                <button
                                    onClick={salvarConfiguracoes}
                                    disabled={loading}
                                    className="flex-[2] flex items-center justify-center gap-2 px-6 py-3 bg-[#057321] text-white rounded-lg font-bold hover:bg-[#046019] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                                >
                                    {loading ? "Salvando..." : <><Save size={20} /> Salvar Alterações</>}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Rodapé Informativo */}
                    <div className="border-t pt-6 text-center">
                        <p className="text-xs text-gray-400">
                            As alterações feitas aqui refletem imediatamente para todos os usuários do sistema.
                        </p>
                    </div>
                </div>
            )}
        </main>
    </div>
  );
}

export default withAuth(ConfiguracoesAdminPage, ["adminMaster"]);
