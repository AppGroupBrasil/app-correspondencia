import { NextResponse } from "next/server";
import { BUILD_ID } from "@/app/lib/build-id";

// Sem cache em lugar nenhum do caminho: esta resposta é justamente o que
// revela que o aparelho está com uma versão velha.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(
    { buildId: BUILD_ID },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "CDN-Cache-Control": "no-store",
      },
    }
  );
}
