"use client";
import { useRouter } from "next/navigation";
import { 
  Package, 
  List, 
  Settings, 
  Users, 
  ClipboardList,
  UserCog
} from "lucide-react";

interface QuickAction {
  title: string;
  description: string;
  icon: any;
  href: string;
  color: string;
}

export default function QuickActions() {
  const router = useRouter();

  const actions: QuickAction[] = [
    {
      title: "Nova Correspondência",
      description: "Registrar nova correspondência recebida",
      icon: Package,
      href: "/dashboard-responsavel/nova-correspondencia",
      color: "bg-primary-600 hover:bg-primary-700",
    },
    {
      title: "Listar Correspondências",
      description: "Ver todas as correspondências cadastradas",
      icon: List,
      href: "/dashboard-responsavel/correspondencias",
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      title: "Gerenciar Moradores",
      description: "Cadastrar e gerenciar moradores do condomínio",
      icon: Users,
      href: "/dashboard-responsavel/gerenciar-moradores",
      color: "bg-purple-600 hover:bg-purple-700",
    },
    {
      title: "Configurações de Retirada",
      description: "Configurar regras de retirada profissional",
      icon: ClipboardList,
      href: "/dashboard-responsavel/configuracoes-retirada",
      color: "bg-orange-600 hover:bg-orange-700",
    },
    {
      title: "Configurações",
      description: "Ajustar configurações do sistema",
      icon: Settings,
      href: "/dashboard-responsavel/configuracoes",
      color: "bg-gray-600 hover:bg-gray-700",
    },
    {
      title: "Minha Conta",
      description: "Gerenciar informações da sua conta",
      icon: UserCog,
      href: "/minha-conta",
      color: "bg-teal-600 hover:bg-teal-700",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <button
            key={index}
            onClick={() => router.push(action.href)}
            className={`${action.color} text-white p-6 rounded-lg shadow-md transition transform hover:scale-105 text-left`}
          >
            <div className="flex items-start gap-4">
              <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                <Icon size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">{action.title}</h3>
                <p className="text-sm opacity-90">{action.description}</p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}