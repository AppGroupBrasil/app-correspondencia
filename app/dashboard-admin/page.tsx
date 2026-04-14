"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import Navbar from "@/components/Navbar";
import withAuth from "@/components/withAuth";
import { 
  Building2, 
  Users, 
  FileText, 
  LogOut, 
  ShieldCheck, 
  LayoutDashboard
} from "lucide-react";

function DashboardAdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    condominios: 0,
    responsaveis: 0,
    porteiros: 0,
    correspondencias: 0
  });

  useEffect(() => {
    const carregarDados = async () => {
      try {
        // Consultas otimizadas (apenas contagem)
        const { count: condominiosCount } = await supabase
          .from("condominios")
          .select("*", { count: "exact", head: true });

        const { count: responsaveisCount } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("role", "responsavel");

        const { count: porteirosCount } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true })
          .eq("role", "porteiro");

        // Total de correspondências
        const { count: correspondenciasCount } = await supabase
          .from("correspondencias")
          .select("*", { count: "exact", head: true });

        setStats({
          condominios: condominiosCount ?? 0,
          responsaveis: responsaveisCount ?? 0,
          porteiros: porteirosCount ?? 0,
          correspondencias: correspondenciasCount ?? 0
        });
      } catch (error) {
        console.error("Erro ao carregar stats:", error);
      }
    };

    carregarDados();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <LayoutDashboard className="text-blue-600" />
              Painel Administrativo
            </h1>
            <p className="text-gray-600 mt-1">Visão geral do sistema</p>
          </div>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-600 font-medium hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
          >
            <LogOut size={20} /> Sair do Sistema
          </button>
        </div>

        {/* Cards de Estatísticas (Topo) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
           <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-blue-500">
              <p className="text-sm font-bold text-gray-500 uppercase">Condomínios</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">{stats.condominios}</p>
           </div>
           <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-green-500">
              <p className="text-sm font-bold text-gray-500 uppercase">Responsáveis</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.responsaveis}</p>
           </div>
           <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-yellow-500">
              <p className="text-sm font-bold text-gray-500 uppercase">Porteiros</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.porteiros}</p>
           </div>
           <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-purple-500">
              <p className="text-sm font-bold text-gray-500 uppercase">Correspondências</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">{stats.correspondencias}</p>
           </div>
        </div>

        {/* Menu de Ações (Cards Grandes) */}
        <h2 className="text-xl font-bold text-gray-800 mb-4">Gerenciamento</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card Condomínios */}
          <button
            onClick={() => router.push("/dashboard-admin/condominios")}
            className="group bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all border border-gray-100 hover:border-blue-500 text-left flex flex-col gap-4"
          >
            <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Building2 className="text-blue-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600">Condomínios</h3>
              <p className="text-gray-500 text-sm mt-1">Cadastrar e editar condomínios</p>
            </div>
          </button>

          {/* Card Responsáveis */}
          <button
            onClick={() => router.push("/dashboard-admin/responsaveis")}
            className="group bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all border border-gray-100 hover:border-green-500 text-left flex flex-col gap-4"
          >
            <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldCheck className="text-green-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-green-600">Responsáveis</h3>
              <p className="text-gray-500 text-sm mt-1">Gerenciar síndicos e zeladores</p>
            </div>
          </button>

          {/* Card Usuários Gerais */}
          <button
            onClick={() => router.push("/dashboard-admin/moradores")}
            className="group bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all border border-gray-100 hover:border-orange-500 text-left flex flex-col gap-4"
          >
            <div className="bg-orange-100 w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="text-orange-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-600">Todos os Usuários</h3>
              <p className="text-gray-500 text-sm mt-1">Visão geral de porteiros e moradores</p>
            </div>
          </button>

          {/* Card Relatórios */}
          <button
            onClick={() => router.push("/dashboard-admin/configuracoes")}
            className="group bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all border border-gray-100 hover:border-purple-500 text-left flex flex-col gap-4 md:col-span-3"
          >
            <div className="flex items-center gap-4">
                <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="text-purple-600" size={24} />
                </div>
                <div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600">Relatórios Globais</h3>
                <p className="text-gray-500 text-sm mt-1">Acesse dados e métricas de todos os condomínios</p>
                </div>
            </div>
          </button>

        </div>
      </main>
    </div>
  );
}

export default withAuth(DashboardAdminPage, ["adminMaster"]);