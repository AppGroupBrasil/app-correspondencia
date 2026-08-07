// Várias fotos num único registro sem coluna nova: o nome do arquivo carrega a
// posição e o total do lote (foto_123456_1699999999_2de5.jpg). imagem_url
// continua guardando uma URL de imagem comum, então toda tela que não conhece
// lote nenhum segue funcionando como antes — inclusive os registros antigos,
// cujo nome não tem sufixo e valem por uma foto só.

const PADRAO_LOTE = /_(\d+)de(\d+)\.(jpg|jpeg|png|webp)$/i;

export const MAX_FOTOS = 8;

export function nomeArquivoFoto(
  protocolo: string,
  carimbo: number,
  indice: number,
  total: number
): string {
  if (total <= 1) return `foto_${protocolo}_${carimbo}.jpg`;
  return `foto_${protocolo}_${carimbo}_${indice}de${total}.jpg`;
}

// A URL pode chegar com ?apikey=... (comApiKeyStorage): o sufixo do lote é
// procurado só no caminho, e a query volta em cada foto derivada.
function separarConsulta(url: string) {
  const corte = url.indexOf("?");
  if (corte === -1) return { caminho: url, consulta: "" };
  return { caminho: url.slice(0, corte), consulta: url.slice(corte) };
}

/** Todas as fotos do registro, derivadas do nome do arquivo gravado em imagem_url. */
export function derivarFotos(imagemUrl?: string | null): string[] {
  const url = (imagemUrl || "").trim();
  if (!url) return [];

  const { caminho, consulta } = separarConsulta(url);
  const partes = caminho.match(PADRAO_LOTE);
  if (!partes) return [url];

  const total = Math.min(Number(partes[2]) || 1, MAX_FOTOS);
  const extensao = partes[3];

  return Array.from(
    { length: total },
    (_, i) => caminho.replace(PADRAO_LOTE, `_${i + 1}de${total}.${extensao}`) + consulta
  );
}

/** Quantas correspondências este registro representa (1 quando não é lote). */
export function totalVolumes(imagemUrl?: string | null): number {
  const url = (imagemUrl || "").trim();
  if (!url) return 1;

  const partes = separarConsulta(url).caminho.match(PADRAO_LOTE);
  if (!partes) return 1;

  return Math.min(Number(partes[2]) || 1, MAX_FOTOS);
}
