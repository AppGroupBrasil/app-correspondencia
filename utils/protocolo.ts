import { supabase } from "@/app/lib/supabase";

/**
 * O protocolo antigo eram os últimos 6 dígitos do relógio em segundos, o que
 * repete o mesmo número a cada 11 dias e meio. Dois registros com o mesmo
 * protocolo no mesmo condomínio confundem a busca da retirada — o porteiro dá
 * baixa em um e o outro continua pendente. Agora o número é sorteado e
 * conferido no banco antes de ser usado.
 */
const TENTATIVAS = 6;

function sortear(digitos: number) {
  const teto = 10 ** digitos;
  const piso = 10 ** (digitos - 1);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return String(piso + (buffer[0] % (teto - piso)));
  }
  return String(piso + Math.floor(Math.random() * (teto - piso)));
}

async function jaExiste(condominioId: string, protocolo: string, prefixo: string) {
  try {
    const { data, error } = await supabase
      .from("correspondencias")
      .select("id")
      .eq("condominio_id", condominioId)
      .eq("protocolo", `${prefixo}${protocolo}`)
      .limit(1);
    if (error) return false; // Sem consulta, o sorteio já é bem melhor que o relógio.
    return (data || []).length > 0;
  } catch {
    return false;
  }
}

export async function gerarProtocoloUnico(condominioId: string, prefixo = "") {
  for (let tentativa = 0; tentativa < TENTATIVAS; tentativa++) {
    const candidato = sortear(6);
    if (!condominioId) return `${prefixo}${candidato}`;
    if (!(await jaExiste(condominioId, candidato, prefixo))) return `${prefixo}${candidato}`;
  }
  // Insistiu e continuou batendo: sai com dois dígitos a mais, aí não colide.
  return `${prefixo}${sortear(8)}`;
}

export interface RegistroRecente {
  id: string;
  protocolo: string;
  status: string;
  criado_em: string;
  observacao: string | null;
}

/**
 * Registro do mesmo morador feito há poucos minutos. Quando o app morre no meio
 * do cadastro, o porteiro refaz tudo e a encomenda entra duas vezes: a segunda
 * fica pendente para sempre depois que a primeira é entregue.
 */
export async function buscarRegistroRecente(
  condominioId: string,
  moradorId: string,
  minutos = 10
): Promise<RegistroRecente | null> {
  if (!condominioId || !moradorId) return null;
  const desde = new Date(Date.now() - minutos * 60_000).toISOString();
  try {
    const { data, error } = await supabase
      .from("correspondencias")
      .select("id,protocolo,status,criado_em,observacao")
      .eq("condominio_id", condominioId)
      .eq("morador_id", moradorId)
      .gte("criado_em", desde)
      .order("criado_em", { ascending: false })
      .limit(1);
    if (error) return null;
    return (data || [])[0] || null;
  } catch {
    return null;
  }
}
