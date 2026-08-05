export type PassoId = "condominio" | "responsavel" | "moradores" | "portaria";

export interface PassoOnboarding {
  id: PassoId;
  numero: number;
  titulo: string;
  concluido: string;
  chamada: string;
  descricao: string;
  detalhe: string;
  emoji: string;
  corDe: string;
  corPara: string;
  rotaAdmin: string;
  rotaResponsavel: string;
  papeis: string[];
  responsavelPor: string;
}

export const PASSOS_ONBOARDING: PassoOnboarding[] = [
  {
    id: "condominio",
    numero: 1,
    titulo: "Cadastre o condomínio",
    concluido: "Condomínio cadastrado!",
    chamada: "Comece pelo condomínio",
    descricao: "Nome, endereço e logo. É a base de tudo — todos os outros cadastros ficam vinculados a ele.",
    detalhe: "Leva menos de 1 minuto.",
    emoji: "🏢",
    corDe: "from-blue-600",
    corPara: "to-blue-900",
    rotaAdmin: "/dashboard-admin/condominios",
    rotaResponsavel: "/dashboard-admin/condominios",
    papeis: ["adminMaster"],
    responsavelPor: "administrador do sistema",
  },
  {
    id: "responsavel",
    numero: 2,
    titulo: "Cadastre o responsável",
    concluido: "Responsável cadastrado!",
    chamada: "Agora o responsável",
    descricao: "O síndico ou zelador que vai administrar o dia a dia do condomínio no aplicativo.",
    detalhe: "Ele recebe e-mail e senha de acesso.",
    emoji: "🛡️",
    corDe: "from-emerald-600",
    corPara: "to-emerald-900",
    rotaAdmin: "/dashboard-admin/responsaveis",
    rotaResponsavel: "/dashboard-admin/responsaveis",
    papeis: ["adminMaster", "admin"],
    responsavelPor: "administrador do sistema",
  },
  {
    id: "moradores",
    numero: 3,
    titulo: "Cadastre os moradores",
    concluido: "Moradores cadastrados!",
    chamada: "Hora dos moradores",
    descricao: "Um a um ou importando a planilha. Cadastre os blocos antes — cada morador precisa de um bloco existente.",
    detalhe: "Dica: use o modelo de planilha para importar centenas de uma vez.",
    emoji: "👥",
    corDe: "from-orange-500",
    corPara: "to-orange-800",
    rotaAdmin: "/dashboard-admin/moradores",
    rotaResponsavel: "/dashboard-responsavel/moradores",
    papeis: ["adminMaster", "admin", "responsavel"],
    responsavelPor: "síndico ou administrador",
  },
  {
    id: "portaria",
    numero: 4,
    titulo: "Cadastre a sua portaria",
    concluido: "Portaria cadastrada!",
    chamada: "Por último, a portaria",
    descricao: "Os porteiros que vão registrar a entrada e a retirada das correspondências.",
    detalhe: "Com a portaria pronta, o sistema está pronto para uso.",
    emoji: "🔑",
    corDe: "from-violet-600",
    corPara: "to-violet-900",
    rotaAdmin: "/dashboard-admin/porteiros",
    rotaResponsavel: "/dashboard-responsavel/porteiros",
    papeis: ["adminMaster", "admin", "responsavel"],
    responsavelPor: "síndico ou administrador",
  },
];

export const getPasso = (id: PassoId) =>
  PASSOS_ONBOARDING.find((p) => p.id === id)!;

export const getProximoPasso = (id: PassoId): PassoOnboarding | null => {
  const atual = getPasso(id);
  return PASSOS_ONBOARDING.find((p) => p.numero === atual.numero + 1) || null;
};

export const rotaDoPasso = (passo: PassoOnboarding, role?: string | null) =>
  role === "responsavel" ? passo.rotaResponsavel : passo.rotaAdmin;

// withAuth redireciona em silêncio quem não tem o papel; o CTA só aparece se o
// papel realmente conseguir abrir a rota do passo.
export const podeAcessarPasso = (passo: PassoOnboarding, role?: string | null) =>
  !!role && passo.papeis.includes(role);

export const CHAVE_WIZARD = "onboarding_wizard_visto_v1";
