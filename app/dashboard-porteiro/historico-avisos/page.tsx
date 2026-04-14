"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAvisosRapidos, AvisoRapido } from "@/hooks/useAvisosRapidos";
import Navbar from "@/components/Navbar";
import withAuth from "@/components/withAuth";
import BotaoVoltar from "@/components/BotaoVoltar";
import { 
  History, User, Home, Building2, Clock, Image as ImageIcon, 
  ExternalLink, AlertCircle, RefreshCcw, Search, Calendar, Package 
} from "lucide-react";

// --- FUNÇÃO AUXILIAR PARA ABRIR LINKS (HÍBRIDO WEB/APP) ---
const abrirLinkExterno = (url?: string | null) => {
  if (!url) return;
  const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;
  const target = isCapacitor ? "_system" : "_blank";
  window.open(url, target);
};

// --- FUNÇÕES AUXILIARES DE DATA ---
const converterData = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (timestamp?.toDate) return timestamp.toDate(); 
  if (timestamp instanceof Date) return timestamp;
  try {
      return new Date(timestamp);
  } catch {
      return null;
  }
};

const formatarData = (timestamp: any) => {
  const data = converterData(timestamp);
  if (!data || isNaN(data.getTime())) return "Data inválida";
  
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(ontem.getDate() - 1);

  const horaStr = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  if (data.toDateString() === hoje.toDateString()) {
    return `Hoje às ${horaStr}`;
  } else if (data.toDateString() === ontem.toDateString()) {
    return `Ontem às ${horaStr}`;
  } else {
    return `${data.toLocaleDateString("pt-BR")} às ${horaStr}`;
  }
};

function HistoricoAvisosPorteiroPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { buscarAvisos, buscarAvisosHoje } = useAvisosRapidos();

  const [avisos, setAvisos] = useState<AvisoRapido[]>([]);
  const [filtro, setFiltro] = useState<"todos" | "hoje">("hoje");
  const [termoBusca, setTermoBusca] = useState("");
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [erro, setErro] = useState<string>("");

  const carregarAvisos = useCallback(async () => {
    if (!user?.condominioId) return;
    
    setLoadingLocal(true);
    setErro("");

    try {
      let dados: AvisoRapido[] = [];

      if (filtro === "hoje") {
        dados = await buscarAvisosHoje(user.condominioId);
      } else {
        dados = await buscarAvisos({ condominioId: user.condominioId });
      }
      
      setAvisos(dados || []);
      
    } catch (error: any) {
      console.error("Erro ao carregar histórico:", error);
      if (error?.message?.includes("index")) {
        setErro("Há uma limitação na consulta atual. Ajuste o filtro ou recarregue a página.");
      } else {
         setErro("Não foi possível carregar os avisos. Tente recarregar a página.");
      }
    } finally {
      setLoadingLocal(false);
    }
  }, [user?.condominioId, filtro]); 

  useEffect(() => {
    carregarAvisos();
  }, [carregarAvisos]);

  const avisosFiltrados = useMemo(() => {
    if (!termoBusca.trim()) return avisos;
    
    const busca = termoBusca.toLowerCase();
    return avisos.filter(aviso => 
       aviso.moradorNome.toLowerCase().includes(busca) ||
       aviso.apartamento.toLowerCase().includes(busca) ||
       (aviso.blocoNome && aviso.blocoNome.toLowerCase().includes(busca)) ||
       (aviso.protocolo && aviso.protocolo.toLowerCase().includes(busca))
    );
  }, [avisos, termoBusca]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50/30">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-28">
        
        <BotaoVoltar url="/dashboard-porteiro/avisos-rapidos" />

        <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-[#057321] rounded-xl shadow-sm p-6 mt-4">
           <div className="flex items-center gap-3 mb-2">
             <div className="bg-gradient-to-br from-[#057321] to-[#046119] p-3 rounded-full shadow-md">
               <History className="text-white" size={28} />
             </div>
             <div>
                <h1 className="text-3xl font-bold text-gray-900">Histórico de Avisos</h1>
                <p className="text-gray-600">Registro de avisos enviados pelo WhatsApp.</p>
             </div>
           </div>
        </div>

        {/* Barra de Controle: Filtros e Busca */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col lg:flex-row gap-4 items-center justify-between">
            
            {/* Botões de Filtro */}
            <div className="flex bg-gray-100 p-1 rounded-lg w-full lg:w-auto">
                <button
                    onClick={() => setFiltro("hoje")}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-md font-bold transition-all text-sm ${
                    filtro === "hoje" ? "bg-white text-[#057321] shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <Calendar size={16} /> Hoje
                </button>
                <button
                    onClick={() => setFiltro("todos")}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-md font-bold transition-all text-sm ${
                    filtro === "todos" ? "bg-white text-[#057321] shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                    <History size={16} /> Todos
                </button>
            </div>

            {/* Campo de Busca */}
            <div className="relative w-full lg:max-w-md flex-1">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input 
                    type="text" 
                    value={termoBusca}
                    onChange={(e) => setTermoBusca(e.target.value)}
                    placeholder="Buscar por nome, apto ou protocolo..." 
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#057321] focus:border-transparent outline-none"
                />
            </div>

            {/* Botão Atualizar */}
            <button 
                onClick={carregarAvisos}
                className="flex items-center gap-2 text-[#057321] font-bold hover:bg-green-50 px-4 py-2.5 rounded-lg transition-colors"
                title="Atualizar lista"
            >
                <RefreshCcw size={20} className={loadingLocal ? "animate-spin" : ""} />
            </button>
        </div>

        {/* Mensagem de Erro */}
        {erro && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3 animate-fade-in">
                <AlertCircle className="text-red-500" size={24} />
                <p className="text-red-700 font-medium">{erro}</p>
            </div>
        )}

        {/* Lista de Avisos */}
        {loadingLocal ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#057321] mx-auto"></div>
            <p className="text-gray-600 mt-4">Carregando histórico...</p>
          </div>
        ) : avisosFiltrados.length === 0 && !erro ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-gray-300 text-center">
            <div className="bg-gray-50 p-4 rounded-full mb-4">
                <Package size={48} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Nenhum aviso encontrado</h3>
            <p className="text-gray-500">Tente mudar o filtro ou buscar por outro termo.</p>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {avisosFiltrados.map((aviso) => (
              <div key={aviso.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all hover:border-[#057321]/30 group relative overflow-hidden">
                {/* Decoração lateral */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#057321] to-[#046119]"></div>
                
                <div className="pl-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Informações Principais */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-[#057321] bg-green-50 px-2 py-0.5 rounded border border-green-100 uppercase tracking-wider">
                            Aviso WhatsApp
                          </span>
                          {aviso.protocolo && (
                            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                #{aviso.protocolo}
                            </span>
                          )}
                    </div>
                    
                    <div className="flex items-start gap-3">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">{aviso.moradorNome}</h3>
                            <div className="flex items-center gap-3 text-gray-600 text-sm mt-0.5">
                                <span className="flex items-center gap-1"><Building2 size={14}/> {aviso.blocoNome || '-'}</span>
                                <span className="flex items-center gap-1"><Home size={14}/> Apto {aviso.apartamento}</span>
                            </div>
                        </div>
                    </div>
                  </div>

                  {/* Ações e Data */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t sm:border-t-0 pt-4 sm:pt-0 border-gray-100">
                      
                      {(aviso.fotoUrl || aviso.imagemUrl) && (
                        <button 
                          // ✅ CORREÇÃO AQUI: Adicionado || "" para garantir que é string e atualizado helper para aceitar string | undefined
                          onClick={() => abrirLinkExterno(aviso.fotoUrl || aviso.imagemUrl || "")}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-bold transition-colors border border-blue-100 w-full sm:w-auto justify-center"
                        >
                            <ImageIcon size={16} /> Ver Foto <ExternalLink size={12} />
                        </button>
                      )}

                      <div className="text-right min-w-[140px]">
                        <div className="flex items-center justify-end gap-1.5 text-gray-900 font-semibold text-sm">
                            <Clock size={16} className="text-[#057321]" />
                            {formatarData(aviso.dataEnvio)}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">Por: {aviso.enviadoPorNome}</p>
                      </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default withAuth(HistoricoAvisosPorteiroPage, ["porteiro", "responsavel", "adminMaster"]);