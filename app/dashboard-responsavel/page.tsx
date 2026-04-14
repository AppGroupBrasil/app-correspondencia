"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  LogOut,
  User,
  Building2,
  Home,
  Plus,
  List,
  FileText,
  Zap,
  AlertTriangle,
  Columns,
  Smartphone,
  CheckSquare,
  Download,
  Link as LinkIcon,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Monitor,
  UserCog,
  Users,
  HelpCircle,
  Share2
} from "lucide-react";

import TutorialGuide from "@/components/TutorialGuide";
import GerarFolder from "@/components/GerarFolder";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import withAuth from "@/components/withAuth";

function DashboardResponsavel() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [layoutMode, setLayoutMode] = useState<"original" | "colunas" | "linha">("original");
  const [isMounted, setIsMounted] = useState(false);
  const [isCadastrosOpen, setIsCadastrosOpen] = useState(false);
  const [stats, setStats] = useState({
    blocos: 0,
    unidades: 0,
    moradores: 0,
    pendentes: 0,
  });
  const [showInfo, setShowInfo] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    const savedLayout = localStorage.getItem("layout_pref_responsavel");
    if (savedLayout === "original" || savedLayout === "colunas" || savedLayout === "linha") {
      setLayoutMode(savedLayout);
    } else {
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setLayoutMode("linha");
      } else {
        setLayoutMode("original");
      }
    }
  }, []);

  useEffect(() => {
    if (user?.condominioId) {
        carregarEstatisticas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const changeLayout = (mode: "original" | "colunas" | "linha") => {
    setLayoutMode(mode);
    localStorage.setItem("layout_pref_responsavel", mode);
  };

  const toggleCadastros = () => {
    setIsCadastrosOpen(!isCadastrosOpen);
  };

  const reiniciarTutorial = () => {
    localStorage.removeItem("tutorial_dashboard_full_v4");
    window.location.reload();
  };

  const carregarEstatisticas = async () => {
    if (!user?.condominioId) return;
    try {
      // 1. Contagem de Blocos
      const { count: blocosCount } = await supabase
        .from("blocos")
        .select("*", { count: "exact", head: true })
        .eq("condominio_id", user.condominioId);

      // 2. Contagem TOTAL de Moradores (Todos que existem)
      const { count: totalGeral } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("condominio_id", user.condominioId)
        .eq("role", "morador");

      // 3. Contagem de Moradores APROVADOS (Ativos)
      const { count: totalAprovados } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("condominio_id", user.condominioId)
        .eq("role", "morador")
        .eq("aprovado", true);

      // 4. Cálculo: Pendentes = Total Geral - Aprovados
      const totalPendentes = (totalGeral || 0) - (totalAprovados || 0);

      setStats({
        blocos: blocosCount || 0,
        unidades: 0,
        moradores: totalAprovados || 0,
        pendentes: totalPendentes,
      });

    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  const compartilharOuCopiarLink = async () => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/cadastro-morador`;

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Cadastro de Morador',
                text: `Olá! Utilize este link para se cadastrar no sistema do condomínio ${user?.nome || ''}:`,
                url: link,
            });
            return;
        } catch (err) {
            console.log('Compartilhamento cancelado ou erro, tentando copiar...');
        }
    }

    navigator.clipboard
      .writeText(link)
      .then(() => {
        alert("Link de cadastro copiado para a área de transferência!");
      })
      .catch(() => {
        alert("Erro ao copiar link. Tente manualmente: " + link);
      });
  };

  const getRoleLabel = (role: string) => {
    const r: any = { responsavel: "Responsável", admin: "Admin", adminMaster: "Admin Master" };
    return r[role] || role;
  };

  const MenuGestaoContent = () => (
    <>
      <div
        id="tour-gestao-cadastros"
        onClick={toggleCadastros}
        className="bg-[#057321] px-4 py-4 flex items-center justify-center gap-3 cursor-pointer hover:bg-[#046119] transition-colors select-none w-full relative"
      >
        <Users size={24} className="text-white" />
        <h3 className="text-sm font-bold text-white uppercase tracking-widest">
          Gestão de Cadastros e Configurações
        </h3>
        <div className="absolute right-4">
          {isCadastrosOpen ? (
            <ChevronUp size={20} className="text-white" />
          ) : (
            <ChevronDown size={20} className="text-white" />
          )}
        </div>
      </div>

      {isCadastrosOpen && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 p-4 bg-gray-50 animate-in slide-in-from-top-2 duration-300 border-t border-gray-100">
          <div
            id="btn-gestao-blocos"
            onClick={() => router.push("/dashboard-responsavel/blocos")}
            className="group flex flex-col items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:bg-[#057321] cursor-pointer transition-all shadow-sm"
          >
            <Building2 size={22} className="text-[#057321] group-hover:text-white transition-colors" />
            <span className="font-bold text-gray-700 text-[11px] group-hover:text-white transition-colors">
              Blocos
            </span>
          </div>

          <div
            id="btn-gestao-moradores"
            onClick={() => router.push("/dashboard-responsavel/moradores")}
            className="group flex flex-col items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:bg-[#057321] cursor-pointer transition-all shadow-sm"
          >
            <Home size={22} className="text-[#057321] group-hover:text-white transition-colors" />
            <span className="font-bold text-gray-700 text-[11px] group-hover:text-white transition-colors">
              Moradores
            </span>
          </div>

          <div
            id="btn-gestao-porteiros"
            onClick={() => router.push("/dashboard-responsavel/porteiros")}
            className="group flex flex-col items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:bg-[#057321] cursor-pointer transition-all shadow-sm"
          >
            <UserCog size={22} className="text-[#057321] group-hover:text-white transition-colors" />
            <span className="font-bold text-gray-700 text-[11px] group-hover:text-white transition-colors">
              Porteiros
            </span>
          </div>

          <div
            id="btn-gestao-aprovacoes"
            onClick={() => router.push("/dashboard-responsavel/aprovar-moradores")}
            className="group flex flex-col items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:bg-[#057321] cursor-pointer transition-all shadow-sm relative"
          >
            <CheckSquare size={22} className="text-[#057321] group-hover:text-white transition-colors" />
            <span className="font-bold text-gray-700 text-[11px] group-hover:text-white transition-colors">
              Aprovar
            </span>
            
            {stats.pendentes > 0 && (
                <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
            )}
          </div>

          <div
            id="btn-gestao-mensagens"
            onClick={() => router.push("/dashboard-responsavel/configuracao-mensagens")}
            className="group flex flex-col items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:bg-[#057321] cursor-pointer transition-all shadow-sm"
          >
            <MessageSquare size={22} className="text-[#057321] group-hover:text-white transition-colors" />
            <span className="font-bold text-gray-700 text-[11px] group-hover:text-white transition-colors">
              Mensagens
            </span>
          </div>

          <div
            id="btn-gestao-link"
            onClick={compartilharOuCopiarLink}
            className="group flex flex-col items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:bg-[#057321] cursor-pointer transition-all shadow-sm"
          >
            <Share2 size={22} className="text-[#057321] group-hover:text-white transition-colors" />
            <span className="font-bold text-gray-700 text-[11px] group-hover:text-white transition-colors">
              Link Cadastro
            </span>
          </div>

          <div
            id="btn-gestao-impressao"
            className="group flex flex-col items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:bg-[#057321] cursor-pointer transition-all shadow-sm relative overflow-hidden"
          >
            <Download size={22} className="text-[#057321] group-hover:text-white transition-colors" />
            <span className="font-bold text-gray-700 text-[11px] group-hover:text-white transition-colors text-center">
              Impressão
            </span>

            <div className="absolute inset-0 opacity-0 z-10 flex items-center justify-center">
              <GerarFolder
                condominioId={user?.condominioId || ""}
                condominioNome={user?.nome || ""}
                condominioEndereco=""
                responsavelNome={user?.nome}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (!isMounted) return null;

  const ActionCard = ({
    id,
    onClick,
    icon,
    title,
    subtitle,
  }: {
    id: string;
    onClick: () => void;
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
  }) => (
    <button
      id={id}
      onClick={onClick}
      className="
        group w-full
        rounded-2xl
        bg-gradient-to-b from-[#057321] to-[#046119]
        hover:from-[#046119] hover:to-[#035218]
        text-white
        shadow-md hover:shadow-lg
        border border-white/10
        transition-all
        px-6 py-7
        flex items-center gap-5
        min-h-[125px]
      "
    >
      <div
        className="
          shrink-0
          w-16 h-16 rounded-2xl
          bg-white
          flex items-center justify-center
          border border-white/60
          shadow-sm
        "
      >
        <div className="text-[#057321]">{icon}</div>
      </div>

      <div className="text-left">
        <div className="text-xl font-extrabold leading-tight">{title}</div>
        {subtitle ? (
          <div className="text-sm text-white mt-1 font-semibold leading-snug">{subtitle}</div>
        ) : null}
      </div>

      <div className="ml-auto opacity-60 group-hover:opacity-100 transition-opacity text-white/90">
        <span className="text-3xl">›</span>
      </div>
    </button>
  );

  const ColunaButton = ({
    id,
    onClick,
    icon: Icon,
    title,
  }: {
    id: string;
    onClick: () => void;
    icon: any;
    title: string;
  }) => (
    <button
      id={id}
      onClick={onClick}
      className="
        w-full
        flex items-center gap-4
        px-5 py-5
        bg-gradient-to-r from-[#057321] to-[#046119]
        hover:from-[#046119] hover:to-[#035218]
        text-white
        rounded-2xl
        shadow-md
        active:scale-[0.99]
        transition-all
        h-[92px]
      "
    >
      <span className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center border border-white/60 shadow-sm">
        <Icon size={30} className="text-[#057321]" />
      </span>
      <span className="text-base font-extrabold uppercase tracking-wide text-left leading-tight">
        {title}
      </span>
      <span className="ml-auto text-3xl opacity-70">›</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50/30 relative">
      <header className="bg-gradient-to-r from-[#057321] to-[#046119] shadow-md sticky top-0 z-[100]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-app-correspondencia.png"
                alt="Logo"
                width={45}
                height={45}
                className="rounded-lg border border-gray-200 object-cover"
              />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-white">App Correspondência</h1>
                <p className="text-sm text-green-100">Painel do Responsável</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {user && (
                <button
                  id="menu-minha-conta"
                  onClick={() => router.push("/minha-conta")}
                  className="flex items-center gap-2 px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-all"
                >
                  <User size={22} className="text-white" />
                  <div className="hidden sm:block text-left">
                    <span className="block text-xs font-semibold text-green-100">{getRoleLabel(user.role)}</span>
                    <span className="block text-sm font-bold text-white">{user.nome?.split(" ")[0]}</span>
                  </div>
                </button>
              )}

              <button
                id="btn-sair"
                onClick={logout}
                className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-sm"
              >
                <LogOut size={20} />
                <span className="hidden sm:inline font-medium">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        <div className="flex flex-col xl:flex-row items-center justify-between gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div id="tour-boas-vindas" className="text-center sm:text-left w-full xl:w-auto">
            <h1 className="text-2xl font-bold text-gray-900">👋 Olá, {user?.nome?.split(" ")[0]}!</h1>
          </div>

          <div className="grid grid-cols-3 sm:flex w-full sm:w-auto bg-gray-100 rounded-lg p-1 shadow-inner gap-1">
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 px-1 sm:px-3 py-2 rounded-md bg-white text-[#057321] shadow-sm cursor-default">
              <Building2 className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              <div className="text-[10px] sm:text-sm font-medium leading-tight text-center sm:text-left">
                <span className="block sm:inline">Blocos: </span>
                <strong className="text-xs sm:text-sm">{stats.blocos}</strong>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 px-1 sm:px-3 py-2 rounded-md bg-white text-[#057321] shadow-sm cursor-default">
              <Users className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              <div className="text-[10px] sm:text-sm font-medium leading-tight text-center sm:text-left">
                <span className="block sm:inline">Moradores: </span>
                <strong className="text-xs sm:text-sm">{stats.moradores}</strong>
              </div>
            </div>

            <button 
               onClick={() => router.push('/dashboard-responsavel/aprovar-moradores')}
               className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 px-1 sm:px-3 py-2 rounded-md shadow-sm transition-all duration-300 ${
                  stats.pendentes > 0 
                  ? "bg-red-100 text-red-700 border border-red-200 animate-pulse cursor-pointer hover:bg-red-200" 
                  : "bg-white text-[#057321] cursor-default"
               }`}
            >
              <CheckSquare className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              <div className="text-[10px] sm:text-sm font-medium leading-tight text-center sm:text-left">
                <span className="block sm:inline">Pendentes: </span>
                <strong className="text-xs sm:text-sm">{stats.pendentes}</strong>
              </div>
            </button>
          </div>

          <div
            id="tour-layout-switcher"
            className="flex w-full sm:w-auto justify-center sm:justify-start bg-gray-100 rounded-lg p-1 shadow-inner"
          >
            <button
              onClick={() => changeLayout("original")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${
                layoutMode === "original" ? "bg-white text-[#057321] shadow-sm" : "text-gray-400 hover:text-gray-600"
              }`}
              title="Visualização ideal para Computadores"
            >
              <Monitor size={18} /> <span className="hidden sm:inline">WEB</span>
              <span className="sm:hidden">WEB</span>
            </button>

            <button
              onClick={() => changeLayout("colunas")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${
                layoutMode === "colunas" ? "bg-white text-[#057321] shadow-sm" : "text-gray-400 hover:text-gray-600"
              }`}
              title="Visualização em duas colunas"
            >
              <Columns size={18} /> <span className="hidden sm:inline">COLUNA</span>
              <span className="sm:hidden">COLUNA</span>
            </button>

            <button
              onClick={() => changeLayout("linha")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${
                layoutMode === "linha" ? "bg-white text-[#057321] shadow-sm" : "text-gray-400 hover:text-gray-600"
              }`}
              title="Visualização ideal para Celulares"
            >
              <Smartphone size={18} /> <span className="hidden sm:inline">CELULAR</span>
              <span className="sm:hidden">CELULAR</span>
            </button>
          </div>
        </div>

        {showInfo && (
          <div className="relative mb-8 bg-white border border-[#057321] rounded-xl py-2 px-4 flex items-center justify-center shadow-sm">
            <button
              onClick={() => setShowInfo(false)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
            >
              ✕
            </button>
            <div className="flex flex-col sm:flex-row items-center gap-2 text-center w-full justify-center">
              <div className="flex items-center gap-2 text-[#057321]">
                <div className="bg-green-50 p-1 rounded-full">
                  <AlertTriangle size={16} />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wide">Envio inteligente:</h2>
              </div>
              <p className="text-red-600 font-medium text-xs sm:text-sm leading-tight">
                O sistema busca o WhatsApp do morador e envia Link + PDF + Qr Code e E-mail automaticamente.
              </p>
            </div>
          </div>
        )}

        {layoutMode !== "colunas" && (
          <div className="rounded-2xl border border-green-100 overflow-hidden mb-8 shadow-sm bg-white transition-all duration-300 w-full">
            <MenuGestaoContent />
          </div>
        )}

        {layoutMode === "original" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 w-full">
            <ActionCard
              id="btn-novo-aviso"
              onClick={() => router.push("/dashboard-responsavel/nova-correspondencia")}
              icon={<Plus size={30} />}
              title="AVISO DE CORRESPONDÊNCIA"
              subtitle="Aviso completo com protocolo, foto e Qr Code."
            />
            <ActionCard
              id="btn-avisos-rapidos"
              onClick={() => router.push("/dashboard-responsavel/avisos-rapidos")}
              icon={<Zap size={30} />}
              title="AVISOS RÁPIDOS"
              subtitle="Avisos com protocolo e foto"
            />
            <ActionCard
              id="btn-registrar-retirada"
              onClick={() => router.push("/dashboard-responsavel/registrar-retirada")}
              icon={<FileText size={30} />}
              title="REGISTRAR RETIRADA"
              subtitle="Assinaturas e recibos de retirada"
            />
            <ActionCard
              id="btn-avisos-enviados"
              onClick={() => router.push("/dashboard-responsavel/correspondencias")}
              icon={<List size={30} />}
              title="AVISOS ENVIADOS"
              subtitle="Veja retiradas e avisos enviados"
            />
          </div>
        )}

        {layoutMode === "colunas" && (
          <div className="w-full mb-8">
            <div className="bg-green-50 rounded-xl border-2 border-[#057321] overflow-hidden flex flex-col shadow-sm w-full">
              <div className="bg-[#057321] p-2 text-center">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">MENU PRINCIPAL</h3>
              </div>

              <div className="p-4 flex flex-col gap-4">
                <div className="rounded-xl overflow-hidden border border-green-200">
                  <MenuGestaoContent />
                </div>

                <ColunaButton
                  id="btn-novo-aviso"
                  onClick={() => router.push("/dashboard-responsavel/nova-correspondencia")}
                  icon={Plus}
                  title="NOVO AVISO"
                />

                <ColunaButton
                  id="btn-avisos-rapidos"
                  onClick={() => router.push("/dashboard-responsavel/avisos-rapidos")}
                  icon={Zap}
                  title="AVISOS RÁPIDOS"
                />

                <ColunaButton
                  id="btn-registrar-retirada"
                  onClick={() => router.push("/dashboard-responsavel/registrar-retirada")}
                  icon={FileText}
                  title="REGISTRAR RETIRADA"
                />

                <ColunaButton
                  id="btn-avisos-enviados"
                  onClick={() => router.push("/dashboard-responsavel/correspondencias")}
                  icon={List}
                  title="AVISOS ENVIADOS"
                />
              </div>
            </div>
          </div>
        )}

        {layoutMode === "linha" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 w-full">
            <button
              id="btn-novo-aviso"
              onClick={() => router.push("/dashboard-responsavel/nova-correspondencia")}
              className="aspect-square w-full flex flex-col items-center justify-center gap-2 p-3 bg-gradient-to-r from-[#057321] to-[#046119] text-white rounded-2xl hover:from-[#046119] hover:to-[#035218] transition-all font-bold shadow-md"
            >
              <Plus size={40} />
              <span className="text-center text-sm leading-tight">
                Novo
                <br />
                Aviso
              </span>
            </button>

            <button
              id="btn-avisos-rapidos"
              onClick={() => router.push("/dashboard-responsavel/avisos-rapidos")}
              className="aspect-square w-full flex flex-col items-center justify-center gap-2 p-3 bg-gradient-to-r from-[#057321] to-[#046119] text-white rounded-2xl hover:from-[#046119] hover:to-[#035218] transition-all font-bold shadow-md"
            >
              <Zap size={40} />
              <span className="text-center text-sm leading-tight">
                Avisos
                <br />
                Rápidos
              </span>
            </button>

            <button
              id="btn-registrar-retirada"
              onClick={() => router.push("/dashboard-responsavel/registrar-retirada")}
              className="aspect-square w-full flex flex-col items-center justify-center gap-2 p-3 bg-gradient-to-r from-[#057321] to-[#046119] text-white rounded-2xl hover:from-[#046119] hover:to-[#035218] transition-all font-bold shadow-md"
            >
              <FileText size={40} />
              <span className="text-center text-sm leading-tight">
                Registrar
                <br />
                Retirada
              </span>
            </button>

            <button
              id="btn-avisos-enviados"
              onClick={() => router.push("/dashboard-responsavel/correspondencias")}
              className="aspect-square w-full flex flex-col items-center justify-center gap-2 p-3 bg-gradient-to-r from-[#057321] to-[#046119] text-white rounded-2xl hover:from-[#046119] hover:to-[#035218] transition-all font-bold shadow-md"
            >
              <List size={40} />
              <span className="text-center text-sm leading-tight">
                Avisos
                <br />
                Enviados
              </span>
            </button>
          </div>
        )}
      </main>

      <button
        onClick={reiniciarTutorial}
        className="fixed bottom-6 right-6 bg-[#057321] text-white p-3 rounded-full shadow-lg hover:bg-[#046119] transition-all z-50 flex items-center justify-center"
        title="Reiniciar Tutorial"
      >
        <HelpCircle size={28} />
      </button>

      <TutorialGuide
        chaveLocalStorage="tutorial_dashboard_full_v4"
        passos={[
          {
            element: "#tour-boas-vindas",
            popover: {
              title: "Bem-vindo(a)!",
              description:
                "App Correspondência, sistema de registro e avisos de correspondência pelo WhatsApp, e-mail e aplicativo.",
            },
          },
          {
            element: "#menu-minha-conta",
            popover: { title: "Minha Conta", description: "Altere sua senha, e-mail e dados pessoais." },
          },
          { element: "#btn-sair", popover: { title: "Sair", description: "Clique aqui para sair do sistema." } },
          {
            element: "#tour-layout-switcher",
            popover: {
              title: "Mudar Layout",
              description:
                "Para uma melhor visualização ao acessar no computador, escolha a opção WEB. No celular, escolha a opção CELULAR.",
            },
          },
          {
            element: "#btn-novo-aviso",
            popover: {
              title: "Novo Aviso",
              description:
                "Função para registro completo da correspondência com protocolo, foto, Qr Code e informações de quem registrou e para quem se destina.",
            },
          },
          {
            element: "#btn-avisos-rapidos",
            popover: {
              title: "Avisos Rápidos",
              description: "Ideal para enviar avisos de correspondência simples apenas com foto e protocolo.",
            },
          },
          {
            element: "#btn-registrar-retirada",
            popover: {
              title: "Registrar Retirada",
              description:
                "Registre a retirada da correspondência com assinatura digital do porteiro e morador. O morador também receberá o recibo.",
            },
          },
          {
            element: "#btn-avisos-enviados",
            popover: {
              title: "Enviados",
              description: "Relação de todos os avisos enviados no modo +Aviso de Correspondência.",
            },
          },
          {
            element: "#tour-gestao-cadastros",
            popover: {
              title: "Área de Gestão",
              description: "Aqui você realiza o cadastro de blocos, moradores e porteiros, além de configurar o sistema.",
            },
          },
          { element: "#btn-gestao-blocos", popover: { title: "Blocos", description: "Cadastre os blocos um a um ou em lote." } },
          { element: "#btn-gestao-moradores", popover: { title: "Moradores", description: "Cadastre moradores manualmente ou importe via planilha." } },
          { element: "#btn-gestao-porteiros", popover: { title: "Porteiros", description: "Cadastre, edite e exclua os porteiros do sistema." } },
          { element: "#btn-gestao-aprovacoes", popover: { title: "Aprovações", description: "Aprove moradores pendentes." } },
          { element: "#btn-gestao-mensagens", popover: { title: "Mensagens", description: "Cadastre mensagens e configure permissões." } },
          { element: "#btn-gestao-link", popover: { title: "Link de Cadastro", description: "Copie o link de cadastro e compartilhe com moradores." } },
          { element: "#btn-gestao-impressao", popover: { title: "Impressão", description: "Gere um folder/cartaz com QR Code para cadastro." } },
        ]}
      />
    </div>
  );
}

export default withAuth(DashboardResponsavel, ["responsavel", "admin", "adminMaster"]);