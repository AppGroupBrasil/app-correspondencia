import "server-only";

import type { NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/app/lib/firebase-admin";

export type AppRole = "adminMaster" | "admin" | "responsavel" | "porteiro" | "morador";

type RequestAuthContext = {
  uid: string;
  email: string;
  role: AppRole;
  condominioId: string;
};

export class RequestAuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function normalizeRole(role: unknown): AppRole | null {
  if (typeof role !== "string") return null;

  switch (role) {
    case "ADMIN_MASTER":
    case "adminMaster":
      return "adminMaster";
    case "ADMIN":
    case "admin":
      return "admin";
    case "RESPONSAVEL":
    case "responsavel":
      return "responsavel";
    case "PORTEIRO":
    case "porteiro":
      return "porteiro";
    case "MORADOR":
    case "morador":
      return "morador";
    default:
      return null;
  }
}

function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

async function getProfile(uid: string) {
  const adminDb = getAdminDb();
  const collections = ["users", "moradores"];

  for (const collectionName of collections) {
    const snapshot = await adminDb.collection(collectionName).doc(uid).get();
    if (snapshot.exists) {
      return snapshot.data() || null;
    }
  }

  return null;
}

export async function requireRequestAuth(
  request: NextRequest,
  allowedRoles?: AppRole[]
): Promise<RequestAuthContext> {
  const token = getBearerToken(request);
  if (!token) {
    throw new RequestAuthError(401, "Token de autenticação ausente.");
  }

  const decodedToken = await getAdminAuth().verifyIdToken(token);
  const profile = await getProfile(decodedToken.uid);
  const role = normalizeRole(profile?.role ?? decodedToken.role);

  if (!profile || !role) {
    throw new RequestAuthError(403, "Perfil do usuário não encontrado ou sem permissão.");
  }

  const authContext: RequestAuthContext = {
    uid: decodedToken.uid,
    email: decodedToken.email || profile.email || "",
    role,
    condominioId: profile.condominioId || "",
  };

  if (allowedRoles && !allowedRoles.includes(authContext.role)) {
    throw new RequestAuthError(403, "Usuário sem permissão para esta operação.");
  }

  return authContext;
}

export function ensureSameCondominio(
  authContext: RequestAuthContext,
  condominioId?: string
) {
  if (!condominioId) {
    return;
  }

  if (["admin", "adminMaster"].includes(authContext.role)) {
    return;
  }

  if (authContext.condominioId !== condominioId) {
    throw new RequestAuthError(403, "Operação fora do condomínio do usuário.");
  }
}