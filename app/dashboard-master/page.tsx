"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import withAuth from "@/components/withAuth";
import { db } from "@/app/lib/firebase";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import {
  Building2,
  Users,
  Package,
  Shield,
  TrendingUp,
  Activity,
  Settings,
  BarChart3,
  Bell,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface DashboardStats {
  totalCondominios: number;
  totalUsuarios: number;
  totalCorrespondencias: number;
  correspondenciasPendentes: number;
  correspondenciasHoje: number;
  usuariosAtivos: number;
}

interface RecentActivity {
  id: string;
  tipo: string;
  descricao: string;
  data: Date;
  condominioNome?: string;
}

function DashboardMasterPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalCondominios: 0,
    totalUsuarios: 0,
    totalCorrespondencias: 0,
    correspondenciasPendentes: 0,
    correspondenciasHoje: 0,
    usuariosAtivos: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Buscar total de condomínios
        const condominiosSnap = await getDocs(collection(db, "condominios"));
        const totalCondominios = condominiosSnap.size;

        // Buscar total de usuários
        const usersSnap = await getDocs(collection(db, "users"));
        const totalUsuarios = usersSnap.size;
        const usuariosAtivos = usersSnap.docs.filter(
          (doc) => doc.data().ativo !== false
        ).length;

        // Buscar correspondências
        const correspondenciasSnap = await getDocs(collection(db, "correspondencias"));
        const totalCorrespondencias = correspondenciasSnap.size;
        const correspondenciasPendentes = correspondenciasSnap.docs.filter(
          (doc) => doc.data().status === "pendente"
        ).length;

        // Correspondências de hoje
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const correspondenciasHoje = correspondenciasSnap.docs.filter((doc) => {
          const criadoEm = doc.data().criadoEm?.toDate?.();
          return criadoEm && criadoEm >= hoje;
        }).length;

        setStats({
          totalCondominios,
          totalUsuarios,
          totalCorrespondencias,
          correspondenciasPendentes,
          correspondenciasHoje,
          usuariosAtivos,
        });

        // Buscar atividades recentes
        const activities: RecentActivity[] = correspondenciasSnap.docs
          .slice(0, 5)
          .map((doc) => ({
            id: doc.id,
            tipo: "correspondencia",
            descricao: `Nova correspondência registrada - ${doc.data().protocolo || "S/N"}`,
            data: doc.data().criadoEm?.toDate?.() || new Date(),
            condominioNome: doc.data().condominioNome,
          }));

        setRecentActivities(activities);
      } catch (error) {
        console.error("Erro ao buscar estatísticas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const menuItems = [
    {
      title: "Condomínios",
      description: "Gerenciar todos os condomínios",
      icon: Building2,
      href: "/dashboard-admin/condominios",
      color: "bg-blue-500",
      stats: stats.totalCondominios,
    },
    {
      title: "Usuários",
      description: "Gerenciar usuários do sistema",
      icon: Users,
      href: "/dashboard-admin/moradores",
      color: "bg-purple-500",
      stats: stats.totalUsuarios,
    },
    {
      title: "Responsáveis",
      description: "Gerenciar responsáveis",
      icon: Shield,
      href: "/dashboard-admin/responsaveis",
      color: "bg-amber-500",
      stats: null,
    },
    {
      title: "Porteiros",
      description: "Gerenciar porteiros",
      icon: Users,
      href: "/dashboard-admin/porteiros",
      color: "bg-teal-500",
      stats: null,
    },
    {
      title: "Configurações",
      description: "Configurações do sistema",
      icon: Settings,
      href: "/dashboard-admin/configuracoes",
      color: "bg-gray-500",
      stats: null,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#057321] mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100"
      style={{ paddingTop: "calc(4rem + env(safe-area-inset-top))" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-[#057321] to-[#046119] rounded-xl shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Painel Admin Master
              </h1>
              <p className="text-gray-500 text-sm">
                Bem-vindo, {user?.nome?.split(" ")[0] || "Administrador"}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                Total
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalCondominios}</p>
            <p className="text-sm text-gray-500">Condomínios</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-purple-100 rounded-xl">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                {stats.usuariosAtivos} ativos
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalUsuarios}</p>
            <p className="text-sm text-gray-500">Usuários</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-amber-100 rounded-xl">
                <Package className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                {stats.correspondenciasPendentes} pendentes
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.totalCorrespondencias}</p>
            <p className="text-sm text-gray-500">Correspondências</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-green-100 rounded-xl">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                Hoje
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.correspondenciasHoje}</p>
            <p className="text-sm text-gray-500">Novas hoje</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Menu Items */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#057321]" />
              Gestão do Sistema
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {menuItems.map((item) => (
                <button
                  key={item.title}
                  onClick={() => router.push(item.href)}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-lg hover:border-[#057321]/20 transition-all text-left group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 ${item.color} rounded-xl shadow-sm`}>
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    {item.stats !== null && (
                      <span className="text-2xl font-bold text-gray-900">
                        {item.stats}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-[#057321] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-500">{item.description}</p>
                  <div className="mt-3 flex items-center text-[#057321] text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Acessar <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#057321]" />
              Atividade Recente
            </h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {recentActivities.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-green-100 rounded-lg mt-0.5">
                          <Package className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activity.descricao}
                          </p>
                          {activity.condominioNome && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {activity.condominioNome}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {activity.data.toLocaleString("pt-BR")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Nenhuma atividade recente</p>
                </div>
              )}
            </div>

            {/* System Status */}
            <div className="mt-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Status do Sistema
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Firebase</span>
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    Conectado
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">API de Email</span>
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    Operacional
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Storage</span>
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    Ativo
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(DashboardMasterPage, ["adminMaster"]);
