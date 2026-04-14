import { supabase } from "@/app/lib/supabase";

// ============================================
// TIPOS
// ============================================

export type UserRole =
  | "adminMaster"
  | "admin"
  | "responsavel"
  | "porteiro"
  | "morador";

export interface User {
  id: string;
  uid: string;
  email: string;
  nome: string;
  role: UserRole;
  condominioId: string;
  bloco?: string;
  apartamento?: string;
  telefone?: string;
  cpf?: string;
  ativo: boolean;
  aprovado: boolean;
  dataCadastro: string;
  ultimoAcesso?: string;
  fotoUrl?: string;
}

export interface NovoUsuario {
  email: string;
  senha: string;
  nome: string;
  role: UserRole;
  condominioId: string;
  bloco?: string;
  apartamento?: string;
  telefone?: string;
  cpf?: string;
}

// ============================================
// SERVIÇO DE USUÁRIOS
// ============================================

const TABLE_NAME = "users";

function mapUser(d: any): User {
  return {
    id: d.id,
    uid: d.id,
    email: d.email,
    nome: d.nome,
    role: d.role,
    condominioId: d.condominio_id,
    bloco: d.bloco_nome,
    apartamento: d.apartamento,
    telefone: d.telefone,
    cpf: d.cpf,
    ativo: d.ativo,
    aprovado: d.aprovado,
    dataCadastro: d.criado_em,
    ultimoAcesso: d.atualizado_em,
    fotoUrl: d.foto_url,
  };
}

/**
 * Busca um usuário pelo ID
 */
export async function buscarUsuarioPorId(userId: string): Promise<User | null> {
  const { data, error } = await supabase.from(TABLE_NAME).select("*").eq("id", userId).single();
  if (error || !data) return null;
  return mapUser(data);
}

/**
 * Busca um usuário pelo UID 
 */
export async function buscarUsuarioPorUid(uid: string): Promise<User | null> {
  return buscarUsuarioPorId(uid);
}

/**
 * Busca usuários de um condomínio
 */
export async function buscarUsuariosPorCondominio(
  condominioId: string,
  role?: UserRole
): Promise<User[]> {
  let query = supabase.from(TABLE_NAME).select("*").eq("condominio_id", condominioId).order("nome", { ascending: true });

  if (role) {
    query = query.eq("role", role);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(mapUser);
}

/**
 * Busca moradores de um condomínio
 */
export async function buscarMoradores(condominioId: string): Promise<User[]> {
  return buscarUsuariosPorCondominio(condominioId, "morador");
}

/**
 * Busca moradores pendentes de aprovação
 */
export async function buscarMoradoresPendentes(
  condominioId: string
): Promise<User[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("condominio_id", condominioId)
    .eq("role", "morador")
    .eq("aprovado", false)
    .order("criado_em", { ascending: false });

  if (error || !data) return [];
  return data.map(mapUser);
}

/**
 * Cria um novo usuário
 */
export async function criarUsuario(dados: NovoUsuario): Promise<string> {
  // Cria o usuário no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: dados.email,
    password: dados.senha,
  });

  if (authError || !authData.user) throw authError || new Error("Erro ao criar usuário");

  const { error: insertError } = await supabase.from(TABLE_NAME).insert({
    id: authData.user.id,
    email: dados.email,
    nome: dados.nome,
    role: dados.role,
    condominio_id: dados.condominioId,
    bloco_nome: dados.bloco || null,
    apartamento: dados.apartamento || null,
    telefone: dados.telefone || null,
    cpf: dados.cpf || null,
    ativo: true,
    aprovado: dados.role !== "morador",
  });

  if (insertError) throw insertError;
  return authData.user.id;
}

/**
 * Atualiza um usuário
 */
export async function atualizarUsuario(
  userId: string,
  dados: Partial<User>
): Promise<void> {
  const updateData: Record<string, any> = {};
  if (dados.nome !== undefined) updateData.nome = dados.nome;
  if (dados.telefone !== undefined) updateData.telefone = dados.telefone;
  if (dados.bloco !== undefined) updateData.bloco_nome = dados.bloco;
  if (dados.apartamento !== undefined) updateData.apartamento = dados.apartamento;
  if (dados.ativo !== undefined) updateData.ativo = dados.ativo;
  if (dados.aprovado !== undefined) updateData.aprovado = dados.aprovado;
  if (dados.fotoUrl !== undefined) updateData.foto_url = dados.fotoUrl;
  if (dados.role !== undefined) updateData.role = dados.role;

  const { error } = await supabase.from(TABLE_NAME).update(updateData).eq("id", userId);
  if (error) throw error;
}

/**
 * Aprova um morador
 */
export async function aprovarMorador(userId: string): Promise<void> {
  await atualizarUsuario(userId, { aprovado: true } as Partial<User>);
}

/**
 * Rejeita um morador (exclui)
 */
export async function rejeitarMorador(userId: string): Promise<void> {
  await excluirUsuario(userId);
}

/**
 * Ativa/desativa um usuário
 */
export async function alterarStatusUsuario(
  userId: string,
  ativo: boolean
): Promise<void> {
  await atualizarUsuario(userId, { ativo } as Partial<User>);
}

/**
 * Exclui um usuário
 */
export async function excluirUsuario(userId: string): Promise<void> {
  const { error } = await supabase.from(TABLE_NAME).delete().eq("id", userId);
  if (error) throw error;
}

/**
 * Envia e-mail de redefinição de senha
 */
export async function enviarRedefinicaoSenha(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

/**
 * Atualiza o último acesso do usuário
 */
export async function atualizarUltimoAcesso(userId: string): Promise<void> {
  const { error } = await supabase.from(TABLE_NAME).update({ atualizado_em: new Date().toISOString() }).eq("id", userId);
  if (error) throw error;
}

// ============================================
// HELPERS
// ============================================

/**
 * Verifica se o usuário tem permissão para uma ação
 */
export function temPermissao(
  user: User,
  permissao: "gerenciar_usuarios" | "gerenciar_correspondencias" | "ver_relatorios"
): boolean {
  const permissoes: Record<UserRole, string[]> = {
    adminMaster: [
      "gerenciar_usuarios",
      "gerenciar_correspondencias",
      "ver_relatorios",
    ],
    admin: ["gerenciar_usuarios", "gerenciar_correspondencias", "ver_relatorios"],
    responsavel: [
      "gerenciar_usuarios",
      "gerenciar_correspondencias",
      "ver_relatorios",
    ],
    porteiro: ["gerenciar_correspondencias"],
    morador: [],
  };

  return permissoes[user.role]?.includes(permissao) || false;
}

/**
 * Retorna o label do role
 */
export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    adminMaster: "Admin Master",
    admin: "Administrador",
    responsavel: "Responsável",
    porteiro: "Porteiro",
    morador: "Morador",
  };

  return labels[role] || role;
}

/**
 * Retorna a rota do dashboard baseado no role
 */
export function getDashboardRoute(role: UserRole): string {
  const routes: Record<UserRole, string> = {
    adminMaster: "/dashboard-master",
    admin: "/dashboard-admin",
    responsavel: "/dashboard-responsavel",
    porteiro: "/dashboard-porteiro",
    morador: "/dashboard-morador",
  };

  return routes[role] || "/";
}

export default {
  buscarUsuarioPorId,
  buscarUsuarioPorUid,
  buscarUsuariosPorCondominio,
  buscarMoradores,
  buscarMoradoresPendentes,
  criarUsuario,
  atualizarUsuario,
  aprovarMorador,
  rejeitarMorador,
  alterarStatusUsuario,
  excluirUsuario,
  enviarRedefinicaoSenha,
  atualizarUltimoAcesso,
  temPermissao,
  getRoleLabel,
  getDashboardRoute,
};
