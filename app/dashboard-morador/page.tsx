"use client";
import { useState, useEffect } from "react";
import { db, auth } from "@/app/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
  getDoc,
  doc,
} from "firebase/firestore";
import { Package, Mail, Clock, FileText, ChevronRight, Share2, Check, MapPin } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import withAuth from "@/components/withAuth";

function DashboardMoradorPage() {
  useAuth(); 
  const [loading, setLoading] = useState(true);
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [unidadeNome, setUnidadeNome] = useState("");
  const [totalCorrespondencias, setTotalCorrespondencias] = useState(0);
  const [pendentes, setPendentes] = useState(0);
  
  const [dadosCondominio, setDadosCondominio] = useState<any>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // 1. Carregar dados do usuário
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const primeiroNome = (userData.nome || "Morador").split(" ")[0];
            setNomeUsuario(primeiroNome);
            setUnidadeNome(userData.unidadeNome || "-");

            // 2. Buscar Dados Completos do Condomínio
            if (userData.condominioId) {
                const condDoc = await getDoc(doc(db, "condominios", userData.condominioId));
                
                if (condDoc.exists()) {
                    const data = condDoc.data();
                    setDadosCondominio({
                        nome: data.nome || "Seu Condomínio",
                        cnpj: data.cnpj || "",
                        endereco: data.endereco || "",
                        logoUrl: data.logoUrl || ""
                    });
                }
            }
          }

          // 3. Carregar estatísticas
          const q = query(
            collection(db, "correspondencias"),
            where("moradorId", "==", currentUser.uid)
          );
          const snapshot = await getDocs(q);
          
          setTotalCorrespondencias(snapshot.size);
          setPendentes(snapshot.docs.filter(doc => doc.data().status === "pendente").length);
          
        } catch (err) {
          console.error("Erro ao carregar dados:", err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const compartilharLink = () => {
    if (!dadosCondominio?.cnpj) {
        alert("O cadastro deste condomínio está incompleto (Sem CNPJ).");
        return;
    }
    
    // AJUSTE CRÍTICO PARA CAPACITOR/MOBILE:
    // No app mobile, window.location.origin retorna 'capacitor://localhost'
    // Precisamos forçar o domínio da Web (Produção/Hetzner) para que o link funcione para quem recebe.
    // Configure NEXT_PUBLIC_APP_URL no seu .env.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || globalThis.window.location.origin;
    
    const link = `${baseUrl}/cadastro-morador?cnpj=${dadosCondominio.cnpj.replaceAll(/\D/g, "")}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'App Correspondência',
            text: `Olá! Sou vizinho do ${dadosCondominio.nome}. Cadastre-se para receber encomendas:`,
            url: link,
        }).catch((error) => console.log('Compartilhamento cancelado', error));
    } else {
        navigator.clipboard.writeText(link);
        setLinkCopiado(true);
        setTimeout(() => setLinkCopiado(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-[#057321] mx-auto"></div>
          <p className="mt-4 text-gray-500 font-medium">Carregando informações...</p>
        </div>
      </div>
    );
  }

  return (
    // AJUSTE VISUAL: paddingTop com 'env' para não ficar atrás do relógio no iPhone
    // px-4 adicionado para padding lateral padrão em telas pequenas
    <div 
      className="space-y-6 pb-24 px-4 w-full min-h-screen bg-gray-50"
      style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}
    > 
      
      {/* Boas-vindas */}
      <div className="bg-gradient-to-r from-[#057321] to-[#046119] text-white p-6 rounded-2xl shadow-md mt-2">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-1">Olá, {nomeUsuario}! 👋</h1>
                
                <p className="text-green-100 text-sm sm:text-base flex items-center gap-1">
                    <MapPin size={14} /> 
                    {dadosCondominio?.nome || "Seu Condomínio"}
                </p>
                
                <div className="mt-3 inline-block bg-white/20 px-3 py-1 rounded-lg text-xs font-bold backdrop-blur-sm border border-white/10">
                    Unidade: {unidadeNome}
                </div>
            </div>
            
            {dadosCondominio?.logoUrl && (
                <img 
                    src={dadosCondominio.logoUrl} 
                    alt="Logo" 
                    className="w-12 h-12 rounded-lg object-cover bg-white p-1"
                />
            )}
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/dashboard-morador/correspondencias" className="block group">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-yellow-400 transition-all relative overflow-hidden">
                <div className="absolute right-0 top-0 w-24 h-24 bg-yellow-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wide">Pendentes</p>
                        <p className="text-4xl font-extrabold text-gray-900 mt-1">{pendentes}</p>
                        <p className="text-xs text-yellow-600 font-medium mt-1 flex items-center gap-1">
                            <Clock size={12} /> Aguardando retirada
                        </p>
                    </div>
                    <div className="bg-yellow-100 text-yellow-700 p-3 rounded-xl">
                        <Package size={24} />
                    </div>
                </div>
            </div>
        </Link>

        <Link href="/dashboard-morador/correspondencias" className="block group">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-[#057321] transition-all relative overflow-hidden">
                <div className="absolute right-0 top-0 w-24 h-24 bg-green-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-wide">Total Recebido</p>
                        <p className="text-4xl font-extrabold text-gray-900 mt-1">{totalCorrespondencias}</p>
                        <p className="text-xs text-[#057321] font-medium mt-1 flex items-center gap-1">
                            <Mail size={12} /> Histórico completo
                        </p>
                    </div>
                    <div className="bg-green-100 text-[#057321] p-3 rounded-xl">
                        <FileText size={24} />
                    </div>
                </div>
            </div>
        </Link>
      </div>

      {/* Botão Compartilhar */}
      <button 
        onClick={compartilharLink}
        className="flex items-center justify-between w-full bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:border-blue-500 active:bg-blue-50 transition-all group cursor-pointer"
      >
        <div className="flex items-center gap-4">
            <div className="bg-blue-600 text-white p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                <Share2 size={24} />
            </div>
            <div className="text-left">
                <h3 className="font-bold text-gray-900 text-lg">Familiares e Vizinhos</h3>
                <p className="text-gray-500 text-sm">
                    {linkCopiado ? "Link copiado!" : "Envie o link de cadastro"}
                </p>
                <p className="text-xs text-orange-600 mt-1 font-medium">
                    O morador só receberá avisos após a ativação.
                </p>
            </div>
        </div>
        {linkCopiado ? <Check className="text-green-600" /> : <ChevronRight className="text-gray-400 group-hover:text-blue-600" />}
      </button>

      {/* Botão Minhas Encomendas */}
      <Link 
        href="/dashboard-morador/correspondencias"
        className="flex items-center justify-between w-full bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:border-[#057321] active:bg-gray-50 transition-all group"
      >
        <div className="flex items-center gap-4">
            <div className="bg-[#057321] text-white p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                <Package size={24} />
            </div>
            <div className="text-left">
                <h3 className="font-bold text-gray-900 text-lg">Minhas Encomendas</h3>
                <p className="text-gray-500 text-sm">Toque para ver a lista completa</p>
            </div>
        </div>
        <ChevronRight className="text-gray-400 group-hover:text-[#057321]" />
      </Link>

      {/* Como funciona */}
      <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-[#057321] rounded-full"></div>
            Como funciona?
        </h3>
        <ul className="space-y-4">
          {[
            "Você recebe uma notificação (WhatsApp/App) quando chega algo.",
            "Confira os detalhes (remetente, foto) aqui no app.",
            "Vá até a portaria e apresente seu documento ou QR Code.",
            "O porteiro registra a entrega e pronto!"
          ].map((item, index) => (
            <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                <span className="flex-shrink-0 w-6 h-6 bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-[#057321]">
                    {index + 1}
                </span>
                <span className="mt-0.5">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default withAuth(DashboardMoradorPage, ["morador"]);