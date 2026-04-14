import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/app/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ error: "Content-Type inválido" }, { status: 415 });
    }

    const body = (await request.json()) as { cnpj?: string };
    const cnpjOriginal = body.cnpj?.trim() || "";
    const cnpjNormalizado = cnpjOriginal.replace(/\D/g, "");

    if (cnpjNormalizado.length !== 14) {
      return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });
    }

    const supabaseAdmin = createServerClient();

    const { data: condominioData, error: condErr } = await supabaseAdmin
      .from("condominios")
      .select("id, nome, cnpj")
      .eq("cnpj", cnpjOriginal)
      .limit(1)
      .single();

    if (condErr || !condominioData) {
      return NextResponse.json({ error: "Condomínio não encontrado" }, { status: 404 });
    }

    const { data: blocosData } = await supabaseAdmin
      .from("blocos")
      .select("id, nome")
      .eq("condominio_id", condominioData.id)
      .order("nome");

    const blocos = (blocosData || []).map((b: any) => ({
      id: b.id,
      nome: b.nome || "Sem Nome",
    }));

    return NextResponse.json({
      success: true,
      condominio: {
        id: condominioData.id,
        nome: condominioData.nome || "Condomínio",
      },
      blocos,
    });
  } catch (error) {
    console.error("[Public API] Erro ao buscar condomínio:", error);
    return NextResponse.json({ error: "Erro interno ao buscar condomínio" }, { status: 500 });
  }
}