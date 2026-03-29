"use client";

import { useEffect, useMemo, useRef, ComponentType } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

/**
 * Higher-Order Component para proteção de rotas
 * @param Component - Componente a ser protegido
 * @param allowedRoles - Array de roles permitidas para acessar o componente
 */
export default function withAuth<P extends object>(
  Component: ComponentType<P>,
  allowedRoles?: string[]
) {
  return function ProtectedRoute(props: P) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const redirectedRef = useRef(false);

    // Determina a rota de fallback baseada no role do usuário
    const fallbackRoute = useMemo(() => {
      const role = user?.role;
      switch (role) {
        case "adminMaster":
          return "/dashboard-master";
        case "admin":
          return "/dashboard-admin";
        case "responsavel":
          return "/dashboard-responsavel";
        case "porteiro":
          return "/dashboard-porteiro";
        case "morador":
          return "/dashboard-morador";
        default:
          return "/login";
      }
    }, [user?.role]);

    useEffect(() => {
      if (loading) return;
      if (redirectedRef.current) return;

      // 1) Não logado - redireciona para login
      if (!user) {
        redirectedRef.current = true;
        if (pathname !== "/login") router.replace("/login");
        return;
      }

      // 2) Sem permissão para a rota atual - redireciona para dashboard apropriado
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        redirectedRef.current = true;
        if (pathname !== fallbackRoute) router.replace(fallbackRoute);
        return;
      }
    }, [user, loading, router, fallbackRoute, pathname]);

    // Exibe loading enquanto verifica autenticação
    if (loading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <Loader2 className="text-[#057321] animate-spin mx-auto" size={48} />
            <p className="text-gray-600 text-sm mt-4 text-center">Verificando acesso...</p>
          </div>
        </div>
      );
    }

    // Evita flash de conteúdo não autorizado
    if (!user) return null;
    if (allowedRoles && !allowedRoles.includes(user.role)) return null;

    return <Component {...props} />;
  };
}
