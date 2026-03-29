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
 * Comprime uma imagem para qualidade de 1/4 A4
 * Executa compressão instantânea no momento do upload
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

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        // Calcular novas dimensões mantendo proporção
        let { width, height } = calculateDimensions(
          img.width,
          img.height,
          maxWidth,
          maxHeight
        );

        // Criar canvas para compressão
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Erro ao criar contexto do canvas'));
          return;
        }

        // Fundo branco para transparências
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        // Desenhar imagem com suavização
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Tentar comprimir até atingir tamanho desejado
        let currentQuality = quality;
        let blob: Blob | null = null;
        let base64 = '';

        const tryCompress = () => {
          canvas.toBlob(
            (resultBlob) => {
              if (!resultBlob) {
                reject(new Error('Erro ao comprimir imagem'));
                return;
              }

              // Se ainda muito grande e qualidade > 0.3, reduzir mais
              if (resultBlob.size > maxFileSize && currentQuality > 0.3) {
                currentQuality -= 0.1;
                tryCompress();
                return;
              }

              blob = resultBlob;
              base64 = canvas.toDataURL(outputFormat, currentQuality);

              // Criar novo arquivo
              const fileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
              const compressedFile = new File([blob], fileName, {
                type: outputFormat,
                lastModified: Date.now(),
              });

              resolve({
                file: compressedFile,
                base64,
                originalSize,
                compressedSize: compressedFile.size,
                compressionRatio: Math.round((1 - compressedFile.size / originalSize) * 100),
                width,
                height,
              });
            },
            outputFormat,
            currentQuality
          );
        };

        tryCompress();
      };

      img.onerror = () => reject(new Error('Erro ao carregar imagem'));
      img.src = event.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(file);
  });
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
  isValidImage,
  formatFileSize,
  CONFIG,
};
