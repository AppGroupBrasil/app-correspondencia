import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/app/lib/firebase-admin";

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

    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection("condominios")
      .where("cnpj", "==", cnpjOriginal)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ error: "Condomínio não encontrado" }, { status: 404 });
    }

    const condominioDoc = snapshot.docs[0];
    const condominioData = condominioDoc.data();
    const blocosSnapshot = await adminDb
      .collection("blocos")
      .where("condominioId", "==", condominioDoc.id)
      .get();

    const blocos = blocosSnapshot.docs
      .map((doc) => ({ id: doc.id, nome: doc.data().nome || "Sem Nome" }))
      .sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR"));

    return NextResponse.json({
      success: true,
      condominio: {
        id: condominioDoc.id,
        nome: condominioData.nome || "Condomínio",
      },
      blocos,
    });
  } catch (error) {
    console.error("[Public API] Erro ao buscar condomínio:", error);
    return NextResponse.json({ error: "Erro interno ao buscar condomínio" }, { status: 500 });
  }
}