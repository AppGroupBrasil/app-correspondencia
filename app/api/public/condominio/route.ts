import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/app/lib/supabase";

export const dynamic = "force-dynamic";

async function listarBlocos(supabaseAdmin: any, condominioId: string) {
  const { data } = await supabaseAdmin
    .from("blocos")
    .select("id, nome")
    .eq("condominio_id", condominioId)
    .order("nome");

  return (data || []).map((b: any) => ({ id: b.id, nome: b.nome || "Sem Nome" }));
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ error: "Content-Type inválido" }, { status: 415 });
    }

    const body = (await request.json()) as { cnpj?: string; condominioId?: string };
    const cnpjOriginal = body.cnpj?.trim() || "";
    const cnpjNormalizado = cnpjOriginal.replace(/\D/g, "");

    // Link/QR Code de convite chega com o id do condomínio; digitação manual, com CNPJ.
    const condominioId = (body.condominioId || "").trim();
    const ehUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(condominioId);

    if (condominioId && !ehUuid) {
      return NextResponse.json({ error: "Condomínio inválido" }, { status: 400 });
    }

    if (!condominioId && cnpjNormalizado.length !== 14) {
      return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });
    }

    const supabaseAdmin = createServerClient();

    if (condominioId) {
      const { data: porId } = await supabaseAdmin
        .from("condominios")
        .select("id, nome")
        .eq("id", condominioId)
        .maybeSingle();

      if (!porId) {
        return NextResponse.json({ error: "Condomínio não encontrado" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        condominio: { id: porId.id, nome: porId.nome || "Condomínio" },
        blocos: await listarBlocos(supabaseAdmin, porId.id),
      });
    }

    const cnpjMascarado = `${cnpjNormalizado.slice(0, 2)}.${cnpjNormalizado.slice(2, 5)}.${cnpjNormalizado.slice(5, 8)}/${cnpjNormalizado.slice(8, 12)}-${cnpjNormalizado.slice(12, 14)}`;

    // Só variantes derivadas dos dígitos entram no filtro: interpolar o texto
    // cru do usuário permitiria injetar condições extras no `or` do PostgREST.
    const { data: candidatos, error: condErr } = await supabaseAdmin
      .from("condominios")
      .select("id, nome, cnpj, status, criado_em")
      .or(`cnpj.eq.${cnpjNormalizado},cnpj.eq.${cnpjMascarado}`)
      .limit(50);

    if (condErr) {
      console.warn("[Public API] Falha na busca direta por CNPJ, usando varredura:", condErr.message);
    }

    const filtrar = (lista: any[] | null) =>
      (lista || []).filter((c: any) => (c.cnpj || "").replace(/\D/g, "") === cnpjNormalizado);

    let casam = filtrar(candidatos);

    if (casam.length === 0) {
      const { data: todos } = await supabaseAdmin
        .from("condominios")
        .select("id, nome, cnpj, status, criado_em");
      casam = filtrar(todos);
    }

    if (casam.length === 0) {
      return NextResponse.json({ error: "Condomínio não encontrado" }, { status: 404 });
    }

    let condominioData = casam[0];

    // Mesmo CNPJ cadastrado em mais de um condomínio: manda o morador sempre
    // para o mesmo registro — ativo, com blocos cadastrados, mais antigo — em
    // vez de depender da ordem que o banco devolver.
    if (casam.length > 1) {
      console.warn(
        "[Public API] CNPJ duplicado em condominios:",
        cnpjNormalizado,
        casam.map((c: any) => c.id)
      );

      const { data: blocosDup } = await supabaseAdmin
        .from("blocos")
        .select("condominio_id")
        .in("condominio_id", casam.map((c: any) => c.id));

      const comBlocos = new Set((blocosDup || []).map((b: any) => b.condominio_id));
      const peso = (c: any) =>
        ((c.status || "ativo") === "ativo" ? 2 : 0) + (comBlocos.has(c.id) ? 1 : 0);

      condominioData = [...casam].sort(
        (a: any, b: any) =>
          peso(b) - peso(a) ||
          String(a.criado_em || "").localeCompare(String(b.criado_em || ""))
      )[0];
    }

    return NextResponse.json({
      success: true,
      condominio: {
        id: condominioData.id,
        nome: condominioData.nome || "Condomínio",
      },
      blocos: await listarBlocos(supabaseAdmin, condominioData.id),
    });
  } catch (error) {
    console.error("[Public API] Erro ao buscar condomínio:", error);
    return NextResponse.json({ error: "Erro interno ao buscar condomínio" }, { status: 500 });
  }
}