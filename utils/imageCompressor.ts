/**
 * Utilitário de Compressão de Imagens
 * Otimizado para qualidade de 1/4 de folha A4 (105mm x 148mm)
 * Dimensões: 400x560 pixels @ 96 DPI
 */

// Configurações para 1/4 A4
const CONFIG = {
  // Dimensões máximas (1/4 A4 em pixels @ 96 DPI)
  MAX_WIDTH: 400,
  MAX_HEIGHT: 560,
  
  // Qualidade JPEG (0.0 - 1.0)
  QUALITY: 0.75,
  
  // Tamanho máximo do arquivo em bytes (500KB)
  MAX_FILE_SIZE: 500 * 1024,
  
  // Limite máximo de arquivo aceito (100MB conforme regra do sistema)
  MAX_UPLOAD_SIZE: 100 * 1024 * 1024,
};

export interface CompressionResult {
  file: File;
  base64: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
}

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxFileSize?: number;
  outputFormat?: 'image/jpeg' | 'image/png' | 'image/webp';
}

/**
 * Lê apenas as dimensões do arquivo. O <img> resolve o cabeçalho da imagem sem
 * precisar rasterizar os 50 megapixels da câmera — quem faz isso é o drawImage,
 * que aqui nunca recebe o original.
 */
function lerDimensoes(file: File): Promise<{ width: number; height: number; url: string; img: HTMLImageElement }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height, url, img });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Erro ao carregar imagem'));
    };
    img.src = url;
  });
}

function liberarImagem(img: HTMLImageElement, url: string) {
  img.onload = null;
  img.onerror = null;
  img.src = '';
  URL.revokeObjectURL(url);
}

function blobParaBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Erro ao converter para base64'));
    reader.readAsDataURL(blob);
  });
}

function canvasParaBlob(canvas: HTMLCanvasElement, formato: string, qualidade: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Erro ao comprimir imagem'))),
      formato,
      qualidade
    );
  });
}

/**
 * Comprime uma imagem para qualidade de 1/4 A4
 * Executa compressão instantânea no momento do upload
 *
 * A foto da câmera chega em resolução máxima do aparelho. Decodificá-la inteira
 * (dataURL + drawImage do original) chegava a centenas de MB em celular de 50MP
 * e derrubava o WebView — o app fechava sozinho no meio do registro. Por isso o
 * redimensionamento acontece dentro do decodificador, via createImageBitmap:
 * o bitmap já nasce no tamanho final.
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = CONFIG.MAX_WIDTH,
    maxHeight = CONFIG.MAX_HEIGHT,
    quality = CONFIG.QUALITY,
    maxFileSize = CONFIG.MAX_FILE_SIZE,
    outputFormat = 'image/jpeg',
  } = options;

  // Validar tamanho máximo de upload
  if (file.size > CONFIG.MAX_UPLOAD_SIZE) {
    throw new Error(`Arquivo muito grande. Máximo permitido: 100MB`);
  }

  const originalSize = file.size;

  const { width: origWidth, height: origHeight, url, img } = await lerDimensoes(file);
  const { width, height } = calculateDimensions(origWidth, origHeight, maxWidth, maxHeight);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    liberarImagem(img, url);
    throw new Error('Erro ao criar contexto do canvas');
  }

  // Fundo branco para transparências
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  let bitmap: ImageBitmap | null = null;
  let desenhou = false;
  try {
    if (typeof createImageBitmap === 'function' && (width < origWidth || height < origHeight)) {
      try {
        bitmap = await createImageBitmap(file, {
          resizeWidth: width,
          resizeHeight: height,
          resizeQuality: 'high',
          imageOrientation: 'from-image',
        });
        ctx.drawImage(bitmap, 0, 0, width, height);
        desenhou = true;
      } catch {
        // WebView antigo (imageOrientation 'from-image' só existe do Chrome 81
        // em diante) ou formato que o decodificador recusa: sem isto a foto
        // falharia inteira, quando o caminho do <img> ainda dá conta.
      }
    }

    if (!desenhou) {
      // Imagem já pequena, ou o createImageBitmap não deu conta: cai no <img>.
      ctx.drawImage(img, 0, 0, width, height);
    }
  } finally {
    bitmap?.close();
    liberarImagem(img, url);
  }

  try {
    // Tentar comprimir até atingir tamanho desejado
    let currentQuality = quality;
    let blob = await canvasParaBlob(canvas, outputFormat, currentQuality);
    while (blob.size > maxFileSize && currentQuality > 0.3) {
      currentQuality -= 0.1;
      blob = await canvasParaBlob(canvas, outputFormat, currentQuality);
    }

    const base64 = await blobParaBase64(blob);
    const fileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
    const compressedFile = new File([blob], fileName, {
      type: outputFormat,
      lastModified: Date.now(),
    });

    return {
      file: compressedFile,
      base64,
      originalSize,
      compressedSize: compressedFile.size,
      compressionRatio: Math.round((1 - compressedFile.size / originalSize) * 100),
      width,
      height,
    };
  } finally {
    // Sem isto o WebView segura o buffer do canvas até o próximo GC, e a foto
    // seguinte parte de uma memória já ocupada.
    canvas.width = 0;
    canvas.height = 0;
  }
}

/**
 * Comprime imagem de forma rápida (para preview)
 * Usa qualidade menor para resposta instantânea
 */
export async function compressImageFast(file: File): Promise<CompressionResult> {
  return compressImage(file, {
    maxWidth: 300,
    maxHeight: 420,
    quality: 0.6,
  });
}

/**
 * Comprime imagem para PDF (qualidade otimizada para impressão)
 */
export async function compressImageForPDF(file: File): Promise<CompressionResult> {
  return compressImage(file, {
    maxWidth: CONFIG.MAX_WIDTH,
    maxHeight: CONFIG.MAX_HEIGHT,
    quality: 0.75,
  });
}

/**
 * Converte File para Base64 de forma otimizada
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Erro ao converter para base64'));
    reader.readAsDataURL(file);
  });
}

/**
 * Calcula dimensões mantendo proporção
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  // Se a imagem já é menor que o máximo, manter original
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  // Calcular ratio para manter proporção
  const widthRatio = maxWidth / width;
  const heightRatio = maxHeight / height;
  const ratio = Math.min(widthRatio, heightRatio);

  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  return { width, height };
}

/**
 * Refaz o File a partir do base64 já comprimido. Usado ao restaurar um rascunho:
 * o que sobrevive ao fechamento do app é a string, não o File original.
 */
export function base64ParaFile(base64: string, nome: string): File | null {
  try {
    const separador = base64.indexOf(',');
    if (separador === -1) return null;

    const tipo = /data:([^;]+)/.exec(base64.slice(0, separador))?.[1] || 'image/jpeg';
    const binario = atob(base64.slice(separador + 1));
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);

    return new File([bytes], nome, { type: tipo, lastModified: Date.now() });
  } catch {
    return null;
  }
}

/**
 * Verifica se o arquivo é uma imagem válida
 */
export function isValidImage(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
  return validTypes.includes(file.type) || file.type.startsWith('image/');
}

/**
 * Formata tamanho de arquivo para exibição
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default {
  compressImage,
  compressImageFast,
  compressImageForPDF,
  fileToBase64,
  base64ParaFile,
  isValidImage,
  formatFileSize,
  CONFIG,
};
