import { supabase } from "@/app/lib/supabase";

export type ContatoMorador = { telefone: string; email: string };

const LOTE = 150;

/**
 * Completa telefone/e-mail dos moradores que faltam na lista de correspondências
 * usando uma consulta por lote de IDs — antes era uma consulta por linha, o que
 * deixava a tela travada por vários segundos em condomínios grandes.
 */
export async function buscarContatosMoradores(
  lista: any[]
): Promise<Map<string, ContatoMorador>> {
  const contatos = new Map<string, ContatoMorador>();

  const ids = Array.from(
    new Set(
      lista
        .filter((c) => c?.moradorId && (!c.moradorTelefone || !c.moradorEmail))
        .map((c) => String(c.moradorId))
    )
  );
  if (ids.length === 0) return contatos;

  const lotes: string[][] = [];
  for (let i = 0; i < ids.length; i += LOTE) lotes.push(ids.slice(i, i + LOTE));

  try {
    const respostas = await Promise.all(
      lotes.map((lote) =>
        supabase
          .from("users")
          .select("id,whatsapp,telefone,email")
          .in("id", lote)
          .abortSignal(AbortSignal.timeout(15_000))
      )
    );

    respostas.forEach(({ data }) =>
      (data || []).forEach((u: any) =>
        contatos.set(u.id, {
          telefone: u.whatsapp || u.telefone || "",
          email: u.email || "",
        })
      )
    );
  } catch (e) {
    console.warn("Erro ao buscar contatos dos moradores:", e);
  }

  return contatos;
}
