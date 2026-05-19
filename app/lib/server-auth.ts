import "server-only";

import type { NextRequest } from "next/server";
import { createServerClient } from "@/app/lib/supabase";
import { jwtVerify } from "jose";

const APP_SLUG = "app-correspondencia";
const STATUS_VALIDOS_LICENCA = new Set(["ativa", "trial"]);
const JWT_SECRET = process.env.JWT_SECRET || "";

function mapearRoleCentral(role: string): AppRole {
  const r = (role || "").toLowerCase();
  if (r === "superadmin" || r === "master") return "adminMaster";
  if (r === "admin" || r === "administrador") return "admin";
  if (r === "responsavel" || r === "supervisor") return "responsavel";
  if (r === "porteiro") return "porteiro";
  return "morador";
}

async function tryVerifyCentralToken(token: string): Promise<null | { sub: string; email: string; nome: string; apps: Array<{ slug: string; role: string; status: string; expira_em: string | null }> }> {
  if (!JWT_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));
    if (!Array.isArray((payload as any).apps)) return null;
    return payload as any;
  } catch {
    return null;
  }
}

async function ensureProfileFromCentral(uid: string, email: string, nome: string, roleCentral: string): Promise<{ role: AppRole; condominioId: string | null } | null> {
  const supabaseAdmin = createServerClient();
  const { data: existing } = await supabaseAdmin.from("users").select("*").eq("id", uid).single();
  if (existing) {
    const role = ((existing.role as string) || "morador") as AppRole;
    return { role, condominioId: existing.condominio_id || null };
  }
  const roleLocal = mapearRoleCentral(roleCentral);
  const { error } = await supabaseAdmin.from("users").insert({
    id: uid,
    email,
    nome,
    role: roleLocal,
  });
  if (error) {
    console.error("[server-auth] Falha provisionar via central:", error.message);
    return null;
  }
  return { role: roleLocal, condominioId: null };
}

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
  const supabaseAdmin = createServerClient();

  const { data } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", uid)
    .single();

  return data || null;
}

export async function requireRequestAuth(
  request: NextRequest,
  allowedRoles?: AppRole[]
): Promise<RequestAuthContext> {
  const token = getBearerToken(request);
  if (!token) {
    throw new RequestAuthError(401, "Token de autenticação ausente.");
  }

  // 1) Tenta token do auth-central
  const central = await tryVerifyCentralToken(token);
  if (central) {
    const licenca = central.apps.find((a) => a.slug === APP_SLUG);
    if (!licenca || !STATUS_VALIDOS_LICENCA.has(licenca.status)) {
      throw new RequestAuthError(403, "Sem licença ativa para App Correspondência.");
    }
    if (licenca.expira_em && new Date(licenca.expira_em) < new Date()) {
      throw new RequestAuthError(403, "Licença expirada.");
    }
    const provisioned = await ensureProfileFromCentral(central.sub, central.email, central.nome, licenca.role);
    if (!provisioned) {
      throw new RequestAuthError(500, "Falha ao provisionar perfil.");
    }
    const ctx: RequestAuthContext = {
      uid: central.sub,
      email: central.email,
      role: provisioned.role,
      condominioId: provisioned.condominioId || "",
    };
    if (allowedRoles && !allowedRoles.includes(ctx.role)) {
      throw new RequestAuthError(403, "Usuário sem permissão para esta operação.");
    }
    return ctx;
  }

  // 2) Fallback: token Supabase
  const supabaseAdmin = createServerClient();
  const { data: { user: authUser }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !authUser) {
    throw new RequestAuthError(401, "Token inválido ou expirado.");
  }

  const profile = await getProfile(authUser.id);
  const role = normalizeRole(profile?.role);

  if (!profile || !role) {
    throw new RequestAuthError(403, "Perfil do usuário não encontrado ou sem permissão.");
  }

  const authContext: RequestAuthContext = {
    uid: authUser.id,
    email: authUser.email || profile.email || "",
    role,
    condominioId: profile.condominio_id || "",
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