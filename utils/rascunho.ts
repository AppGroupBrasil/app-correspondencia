/**
 * Rascunho de formulário e trava de recarga.
 *
 * O Android mata o app em segundo plano quando a câmera abre num aparelho com
 * pouca memória: o WebView volta recarregando a página do zero e o porteiro
 * perde foto e dados já digitados. Guardar o que está em tela permite remontar
 * o formulário depois do tranco. A trava serve para o outro lado do problema —
 * nada deve recarregar a página por conta própria no meio de um registro.
 */

const PREFIXO = "appcorresp:rascunho:";
const VALIDADE_MS = 6 * 60 * 60 * 1000;

interface Envelope<T> {
  em: number;
  dados: T;
}

export function lerRascunho<T>(chave: string): T | null {
  try {
    const bruto = localStorage.getItem(PREFIXO + chave);
    if (!bruto) return null;

    const envelope = JSON.parse(bruto) as Envelope<T>;
    if (!envelope?.em || Date.now() - envelope.em > VALIDADE_MS) {
      limparRascunho(chave);
      return null;
    }
    return envelope.dados;
  } catch {
    return null;
  }
}

/**
 * `versaoLeve` entra quando o rascunho completo não cabe: as fotos em base64
 * são o que estoura a cota, e voltar só com os campos digitados é melhor do
 * que voltar sem nada.
 */
export function salvarRascunho<T>(chave: string, dados: T, versaoLeve?: () => T): boolean {
  const gravar = (conteudo: T) => {
    localStorage.setItem(PREFIXO + chave, JSON.stringify({ em: Date.now(), dados: conteudo }));
  };

  try {
    gravar(dados);
    return true;
  } catch {
    if (!versaoLeve) return false;
    try {
      gravar(versaoLeve());
      return true;
    } catch {
      return false;
    }
  }
}

export function limparRascunho(chave: string) {
  try {
    localStorage.removeItem(PREFIXO + chave);
  } catch {}
}

const travas = new Set<string>();

export function travarRecarga(id: string) {
  travas.add(id);
}

export function liberarRecarga(id: string) {
  travas.delete(id);
}

export function recargaTravada(): boolean {
  return travas.size > 0;
}
