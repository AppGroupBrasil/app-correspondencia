"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/app/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { 
  Package, Calendar, Filter, ArrowLeft, CheckCircle, Clock, MapPin, QrCode, FileText, ChevronRight
} from "lucide-react";

export default function MinhasCorrespondencias() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [correspondencias, setCorrespondencias] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Filtros
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");

  useEffect(() => {
    if (!authLoading && user?.uid) {
      buscarCorrespondencias(user.uid);
    }
  }, [user, authLoading]);

  const buscarCorrespondencias = async (userId: string) => {
    try {
      setLoadingData(true);
      const q = query(
        collection(db, "correspondencias"),
        where("moradorId", "==", userId)
      );

      const snapshot = await getDocs(q);
      
      const lista = snapshot.docs.map((doc) => {
        const data = doc.data();
        let dataOrdenacao = new Date();
        let dataFormatada = "Data n/d";

        if (data.criadoEm?.toDate) {
            dataOrdenacao = data.criadoEm.toDate();
            dataFormatada = dataOrdenacao.toLocaleDateString("pt-BR");
        } else if (data.dataChegada) {
            dataOrdenacao = new Date(data.dataChegada);
            dataFormatada = dataOrdenacao.toLocaleDateString("pt-BR");
        }

        return {
          id: doc.id,
          ...data,
          dataOrdenacao,
          dataFormatada,
        };
      });

      lista.sort((a: any, b: any) => b.dataOrdenacao - a.dataOrdenacao);
      setCorrespondencias(lista);
    } catch (error) {
      console.error("Erro ao buscar:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const listaFiltrada = correspondencias.filter((item) => {
    if (filtroStatus !== "todos" && item.status !== filtroStatus) return false;
    if (filtroTipo !== "todos") {
       const tipoItem = item.tipoCorrespondencia || "outros"; 
       if (tipoItem.toLowerCase() !== filtroTipo) return false;
    }
    return true;
  });

  // ✅ CORREÇÃO AQUI:
  // Usamos router.push em vez de window.open para não perder o login no App
  const abrirDetalhes = (id: string) => {
      router.push(`/ver?id=${id}`);
  };

  return (
    <main className="max-w-4xl mx-auto px-4 pt-24 pb-12">
        
      <button 
        onClick={() => router.push("/dashboard-morador")}
        className="flex items-center gap-2 text-gray-600 hover:text-[#057321] font-medium mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        Voltar para o Painel
      </button>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Minhas Encomendas</h1>
        <p className="text-gray-500">Histórico completo de recebimentos e retiradas.</p>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Status</label>
          <div className="relative">
            <Filter className="absolute left-3 top-3 text-gray-400" size={18} />
            <select 
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#057321] outline-none bg-white"
            >
              <option value="todos">Todos</option>
              <option value="pendente">Pendentes</option>
              <option value="retirada">Retiradas</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Tipo</label>
          <div className="relative">
            <Package className="absolute left-3 top-3 text-gray-400" size={18} />
            <select 
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#057321] outline-none bg-white"
            >
              <option value="todos">Todos</option>
              <option value="encomenda">Encomendas</option>
              <option value="carta">Cartas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista */}
      {loadingData ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-[#057321] mx-auto"></div>
          <p className="mt-4 text-gray-500">Buscando suas encomendas...</p>
        </div>
      ) : listaFiltrada.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-gray-300">
          <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="text-gray-400" size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Nenhuma correspondência</h3>
          <p className="text-gray-500 text-sm">Não encontramos registros com esse filtro.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {listaFiltrada.map((item) => {
            const isPendente = item.status === 'pendente';
            
            return (
              <div 
                key={item.id} 
                className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-all hover:shadow-md ${
                  isPendente ? 'border-yellow-400' : 'border-[#057321]/50'
                }`}
              >
                {/* Cabeçalho do Card */}
                <div className="p-5 flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Protocolo
                    </span>
                    <span className="text-4xl font-black text-gray-900 leading-none tracking-tight">
                        #{item.protocolo}
                    </span>
                  </div>

                  {/* Badge de Status */}
                  {isPendente ? (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                      <Clock size={12} /> Aguardando
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                      <CheckCircle size={12} /> Retirado
                    </span>
                  )}
                </div>

                {/* Detalhes */}
                <div className="px-5 pb-4">
                    <h3 className="font-bold text-gray-800 text-lg mb-2">
                        {item.observacao || "Correspondência sem descrição"}
                    </h3>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                            <Calendar size={16} className="text-gray-400"/>
                            <span>{item.dataFormatada}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <MapPin size={16} className="text-gray-400"/>
                            <span>Portaria</span>
                        </div>
                    </div>
                </div>

                {/* Botão de Ação */}
                <button
                    onClick={() => abrirDetalhes(item.id)}
                    className={`w-full py-4 flex items-center justify-center gap-2 font-bold text-sm transition-colors ${
                        isPendente 
                        ? "bg-yellow-50 text-yellow-800 hover:bg-yellow-100 border-t border-yellow-100" 
                        : "bg-green-50 text-green-800 hover:bg-green-100 border-t border-green-100"
                    }`}
                >
                    {isPendente ? (
                        <>
                            <QrCode size={20} />
                            VER CÓDIGO DE RETIRADA
                        </>
                    ) : (
                        <>
                            <FileText size={20} />
                            VER COMPROVANTE
                        </>
                    )}
                    <ChevronRight size={16} className="opacity-50" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}