// O morador quase sempre tem mais de uma correspondência esperando e leva tudo
// de uma vez. A lista agrupada deixa a portaria colher uma assinatura só.

export interface GrupoMorador<T> {
  chave: string;
  moradorNome: string;
  unidade: string;
  itens: T[];
}

const ACENTOS = /[\u0300-\u036f]/g;

const normalizar = (texto: unknown) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(ACENTOS, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const nomeDe = (item: any) => String(item?.moradorNome || item?.morador_nome || "").trim();
const blocoDe = (item: any) =>
  String(item?.blocoNome || item?.bloco_nome || item?.bloco || "").trim();
const aptoDe = (item: any) =>
  String(item?.apartamento || item?.unidade || "").trim();

export const unidadeDe = (item: any) => {
  const bloco = blocoDe(item);
  const apto = aptoDe(item);
  return [bloco, apto].filter(Boolean).join(" - ");
};

// Nome + unidade em vez de morador_id: correspondência cadastrada sem morador
// vinculado também precisa cair no mesmo grupo, senão o porteiro volta a assinar
// uma por uma justamente nos casos digitados à mão.
// Sem nome não dá para afirmar que é a mesma pessoa: cada item fica sozinho,
// para não colher uma assinatura só de dois desconhecidos diferentes.
export const chaveMorador = (item: any) => {
  const nome = normalizar(nomeDe(item));
  if (!nome) return `sem-nome:${String(item?.id ?? Math.random())}`;
  return `${nome}|${normalizar(blocoDe(item))}|${normalizar(aptoDe(item))}`;
};

export function agruparPorMorador<T>(itens: T[]): GrupoMorador<T>[] {
  const grupos = new Map<string, GrupoMorador<T>>();

  for (const item of itens) {
    const chave = chaveMorador(item);
    const grupo = grupos.get(chave);
    if (grupo) {
      grupo.itens.push(item);
      continue;
    }
    grupos.set(chave, {
      chave,
      moradorNome: nomeDe(item) || "Morador não identificado",
      unidade: unidadeDe(item),
      itens: [item],
    });
  }

  return [...grupos.values()];
}
