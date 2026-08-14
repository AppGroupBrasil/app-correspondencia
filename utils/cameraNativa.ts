import { base64ParaFile } from "@/utils/imageCompressor";

/**
 * No Android, <input type="file" capture> abre a câmera do sistema e devolve a
 * foto em resolução cheia (12 MP e uns 4 MB). Ler esse arquivo dentro da
 * WebView estoura a memória do processo de renderização, e o Android mata a
 * tela — é o "app reiniciando" que a portaria relata.
 *
 * A câmera nativa do Capacitor reduz a foto no lado do Android, antes de a
 * WebView encostar nela. Como o app roda com a página remota, o arquivo local
 * do aparelho não pode ser lido por fetch (origem diferente): a foto vem como
 * data URL, que já sai pequena depois da redução.
 */
const LARGURA_CAPTURA = 1280;
const QUALIDADE_CAPTURA = 80;

export function ehAppNativo(): boolean {
  if (typeof window === "undefined") return false;
  const capacitor = (window as any).Capacitor;
  return Boolean(capacitor?.isNativePlatform?.());
}

function cancelouCaptura(erro: unknown): boolean {
  const mensagem = String((erro as any)?.message || erro || "").toLowerCase();
  return (
    mensagem.includes("cancel") ||
    mensagem.includes("cancelad") ||
    mensagem.includes("no image picked")
  );
}

/**
 * Abre a câmera nativa e devolve a foto já reduzida. `null` quando o porteiro
 * cancela; erro real é relançado para a tela avisar.
 */
export async function tirarFotoNativa(): Promise<File | null> {
  const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");

  let dataUrl: string | undefined;
  try {
    const foto = await Camera.getPhoto({
      quality: QUALIDADE_CAPTURA,
      width: LARGURA_CAPTURA,
      correctOrientation: true,
      allowEditing: false,
      saveToGallery: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
    });
    dataUrl = foto.dataUrl;
  } catch (erro) {
    if (cancelouCaptura(erro)) return null;
    throw erro;
  }

  if (!dataUrl) return null;
  return base64ParaFile(dataUrl, `encomenda_${Date.now()}.jpg`);
}
