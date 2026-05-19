import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/app/lib/supabase";

function mapearRole(role: string): string {
  const r = (role || "").toLowerCase();
  if (r === "superadmin" || r === "master") return "adminMaster";
  if (r === "admin" || r === "administrador") return "admin";
  if (r === "responsavel" || r === "supervisor") return "responsavel";
  if (r === "porteiro") return "porteiro";
  return "morador";
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-provisioning-secret");
  const expected = process.env.PROVISIONING_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { usuario_id, email, nome, role, status } = body || {};
  if (!usuario_id || !email || !nome) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const ativo = status === "ativa" || status === "trial";
  const roleLocal = mapearRole(role);
  const supabase = createServerClient();

  const { data: existing } = await supabase.from("users").select("id").eq("id", usuario_id).single();
  if (existing) {
    const { error } = await supabase.from("users").update({
      email,
      nome,
      role: roleLocal,
      ativo,
    }).eq("id", usuario_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase.from("users").insert({
      id: usuario_id,
      email,
      nome,
      role: roleLocal,
      ativo,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, usuario_id });
}
