"use client";

import { useEffect, useState } from "react";
import { db } from "@/app/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import Image from "next/image";
import { Home, Building2, Users, Building, UserCheck, DoorOpen, CheckCircle, LogOut } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import withAuth from "@/components/withAuth";

function DashboardAdminLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const [condominios, setCondominios] = useState<any[]>([]);
  const [condominioSelecionado, setCondominioSelecionado] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    carregarCondominios();
  }, []);

  const carregarCondominios = async () => {
    try {
      const snapshot = await getDocs(collection(db, "condominios"));
      const lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // Ordenar alfabeticamente
      lista.sort((a: any, b: any) => a.nome.localeCompare(b.nome));
      
      setCondominios(lista);
      
      if (lista.length > 0) {
        const salvo = localStorage.getItem("condominioSelecionado");
        setCondominioSelecionado(salvo || lista[0].id);
      }
    } catch (error) {
      console.error("Erro ao carregar condomínios:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCondominioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const novoId = e.target.value;
    setCondominioSelecionado(novoId);
    localStorage.setItem("condominioSelecionado", novoId);
    
    if (pathname !== '/dashboard-admin') {
       router.push(`${pathname}?condominio=${novoId}`);
    }
  };

  const isActive = (path: string) => pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar Fixa */}
      <nav className="fixed top-0 left-0 right-0 bg-white border-b shadow-sm z-50 h-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <Image
                src="/logo-app-correspondencia.png"
                alt="Logo"
                width={35}
                height={35}
                className="object-contain rounded"
              />
              <span className="font-bold text-[#057321] text-lg hidden sm:block">APP CORRESPONDÊNCIA</span>
            </div>

            {/* Perfil e Sair */}
            <div className="flex items-center space-x-4">
              <span className="text-gray-600 text-sm hidden md:inline">
                Olá, <span className="font-semibold text-gray-800">Admin Master</span>
              </span>
              <button
                onClick={() => {
                  localStorage.removeItem("condominioSelecionado");
                  router.push("/login");
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition border border-red-200"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
        </div>
      </nav>

      {/* Conteúdo */}
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {/* Seleção de Condomínio */}
          <div className="mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <label htmlFor="condominio-admin-select" className="block text-sm font-bold text-gray-700 mb-2">
              Gerenciar Condomínio:
            </label>
            {loading ? (
              <div className="animate-pulse h-10 bg-gray-100 rounded"></div>
            ) : (
              <select
                id="condominio-admin-select"
                value={condominioSelecionado}
                onChange={handleCondominioChange}
                className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-[#057321] focus:border-[#057321] outline-none transition-all font-medium text-gray-900"
              >
                <option value="">Selecione um condomínio...</option>
                {condominios.map((cond) => (
                  <option key={cond.id} value={cond.id}>
                    {cond.nome} {cond.cnpj ? `(${cond.cnpj})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Menu de Navegação (Grid Responsivo) */}
          {condominioSelecionado && (
            <div className="mb-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {[
                  { href: "/dashboard-admin", icon: Home, label: "Início" },
                  { href: "/dashboard-admin/condominios", icon: Building2, label: "Condomínios" },
                  { href: "/dashboard-admin/responsaveis", icon: Users, label: "Responsáveis" },
                  { href: `/dashboard-admin/blocos?condominio=${condominioSelecionado}`, icon: Building, label: "Blocos" },
                  { href: `/dashboard-admin/moradores?condominio=${condominioSelecionado}`, icon: UserCheck, label: "Moradores" },
                  { href: `/dashboard-admin/porteiros?condominio=${condominioSelecionado}`, icon: DoorOpen, label: "Porteiros" },
                  { href: `/dashboard-admin/aprovacoes?condominio=${condominioSelecionado}`, icon: CheckCircle, label: "Aprovações" },
                ].map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all border ${
                      isActive(item.href.split('?')[0])
                        ? "bg-green-50 border-[#057321] text-[#057321] shadow-sm"
                        : "bg-white border-gray-100 text-gray-600 hover:border-green-300 hover:shadow-sm hover:text-gray-900"
                    }`}
                  >
                    <item.icon size={24} className="mb-1" />
                    <span className="text-xs font-bold text-center">{item.label}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Conteúdo da Página Específica */}
          <main className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 min-h-[500px]">
             {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default withAuth(DashboardAdminLayout, ["adminMaster"]);