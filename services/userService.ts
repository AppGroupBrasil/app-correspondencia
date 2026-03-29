import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  DocumentData,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  deleteUser as deleteAuthUser,
  User as FirebaseUser,
} from "firebase/auth";
import { auth, db } from "@/app/lib/firebase";

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
  dataCadastro: Timestamp;
  ultimoAcesso?: Timestamp;
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

const COLLECTION_NAME = "users";

/**
 * Busca um usuário pelo ID
 */
export async function buscarUsuarioPorId(userId: string): Promise<User | null> {
  const ref = doc(db, COLLECTION_NAME, userId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as User;
}

/**
 * Busca um usuário pelo UID do Firebase Auth
 */
export async function buscarUsuarioPorUid(uid: string): Promise<User | null> {
  const ref = collection(db, COLLECTION_NAME);
  const q = query(ref, where("uid", "==", uid));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as User;
}

/**
 * Busca usuários de um condomínio
 */
export async function buscarUsuariosPorCondominio(
  condominioId: string,
  role?: UserRole
): Promise<User[]> {
  const ref = collection(db, COLLECTION_NAME);
  let q;

  if (role) {
    q = query(
      ref,
      where("condominioId", "==", condominioId),
      where("role", "==", role),
      orderBy("nome", "asc")
    );
  } else {
    q = query(
      ref,
      where("condominioId", "==", condominioId),
      orderBy("nome", "asc")
    );
  }

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as User[];
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
  const ref = collection(db, COLLECTION_NAME);
  const q = query(
    ref,
    where("condominioId", "==", condominioId),
    where("role", "==", "morador"),
    where("aprovado", "==", false),
    orderBy("dataCadastro", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as User[];
}

/**
 * Cria um novo usuário
 */
export async function criarUsuario(dados: NovoUsuario): Promise<string> {
  // Cria o usuário no Firebase Auth
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    dados.email,
    dados.senha
  );

  const usuario = {
    uid: userCredential.user.uid,
    email: dados.email,
    nome: dados.nome,
    role: dados.role,
    condominioId: dados.condominioId,
    bloco: dados.bloco || null,
    apartamento: dados.apartamento || null,
    telefone: dados.telefone || null,
    cpf: dados.cpf || null,
    ativo: true,
    aprovado: dados.role !== "morador", // Moradores precisam de aprovação
    dataCadastro: Timestamp.now(),
  };

  const ref = collection(db, COLLECTION_NAME);
  const docRef = await addDoc(ref, usuario);

  return docRef.id;
}

/**
 * Atualiza um usuário
 */
export async function atualizarUsuario(
  userId: string,
  dados: Partial<User>
): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, userId);
  await updateDoc(ref, dados as DocumentData);
}

/**
 * Aprova um morador
 */
export async function aprovarMorador(userId: string): Promise<void> {
  await atualizarUsuario(userId, { aprovado: true });
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
  await atualizarUsuario(userId, { ativo });
}

/**
 * Exclui um usuário
 */
export async function excluirUsuario(userId: string): Promise<void> {
  const ref = doc(db, COLLECTION_NAME, userId);
  await deleteDoc(ref);
}

/**
 * Envia e-mail de redefinição de senha
 */
export async function enviarRedefinicaoSenha(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Atualiza o último acesso do usuário
 */
export async function atualizarUltimoAcesso(userId: string): Promise<void> {
  await atualizarUsuario(userId, { ultimoAcesso: Timestamp.now() });
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
