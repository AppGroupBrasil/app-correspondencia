"use client";

import { useState, useCallback } from "react";
import imageCompression from "browser-image-compression";

interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  fileType?: string;
}

interface UseImageCompressionReturn {
  compressImage: (file: File, options?: CompressionOptions) => Promise<File>;
  compressMultiple: (files: File[], options?: CompressionOptions) => Promise<File[]>;
  isCompressing: boolean;
  progress: number;
  error: string | null;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxSizeMB: 1, // Máximo 1MB
  maxWidthOrHeight: 1920, // Máximo 1920px
  useWebWorker: true,
  fileType: "image/jpeg",
};

/**
 * Hook para compressão de imagens no frontend
 * Reduz significativamente o tamanho das imagens antes do upload
 */
export const useImageCompression = (): UseImageCompressionReturn => {
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const compressImage = useCallback(
    async (file: File, options?: CompressionOptions): Promise<File> => {
      const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

      // Verifica se é uma imagem
      if (!file.type.startsWith("image/")) {
        throw new Error("O arquivo não é uma imagem válida");
      }

      // Se já for menor que o limite, retorna o original
      if (file.size / 1024 / 1024 < (mergedOptions.maxSizeMB || 1)) {
        return file;
      }

      setIsCompressing(true);
      setError(null);
      setProgress(0);

      try {
        const compressedFile = await imageCompression(file, {
          ...mergedOptions,
          onProgress: (p) => setProgress(Math.round(p)),
        });

        return compressedFile;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro ao comprimir imagem";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsCompressing(false);
        setProgress(100);
      }
    },
    []
  );

  const compressMultiple = useCallback(
    async (files: File[], options?: CompressionOptions): Promise<File[]> => {
      setIsCompressing(true);
      setError(null);

      try {
        const compressedFiles = await Promise.all(
          files.map((file) => compressImage(file, options))
        );
        return compressedFiles;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erro ao comprimir imagens";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsCompressing(false);
      }
    },
    [compressImage]
  );

  return {
    compressImage,
    compressMultiple,
    isCompressing,
    progress,
    error,
  };
};

export default useImageCompression;
