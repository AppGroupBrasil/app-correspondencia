"use client";

import { useState, useRef, ChangeEvent } from "react";
import { Camera, X, Image as ImageIcon, Loader2, CheckCircle } from "lucide-react";
import { compressImage, formatFileSize, isValidImage, CompressionResult } from "@/utils/imageCompressor";

interface UploadImagemProps {
  onUpload: (file: File | null, base64?: string) => void;
}

export default function UploadImagem({ onUpload }: UploadImagemProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{
    original: number;
    compressed: number;
    ratio: number;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar se é uma imagem
    if (!isValidImage(file)) {
      alert("Por favor, selecione uma imagem válida (JPEG, PNG, GIF, WebP)");
      return;
    }

    // Validar tamanho máximo (100MB)
    if (file.size > 100 * 1024 * 1024) {
      alert("Arquivo muito grande. Máximo permitido: 100MB");
      return;
    }

    setIsCompressing(true);

    try {
      // Comprimir imagem instantaneamente para 1/4 A4
      const result: CompressionResult = await compressImage(file, {
        maxWidth: 400,
        maxHeight: 560,
        quality: 0.75,
      });

      // Atualizar preview com imagem comprimida
      setPreview(result.base64);
      
      // Guardar informações de compressão
      setCompressionInfo({
        original: result.originalSize,
        compressed: result.compressedSize,
        ratio: result.compressionRatio,
      });

      // Enviar arquivo comprimido e base64 para o componente pai
      onUpload(result.file, result.base64);

    } catch (error) {
      console.error("Erro ao comprimir imagem:", error);
      
      // Fallback: usar imagem original se compressão falhar
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      onUpload(file);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setCompressionInfo(null);
    onUpload(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {!preview ? (
        <button
          onClick={triggerInput}
          disabled={isCompressing}
          className="w-full group relative flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-white hover:border-[#057321] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
        >
          {isCompressing ? (
            <>
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-3">
                <Loader2 className="text-[#057321] w-8 h-8 animate-spin" />
              </div>
              <span className="text-sm font-semibold text-gray-700">
                Otimizando imagem...
              </span>
              <span className="text-xs text-gray-500 mt-1">
                Comprimindo para melhor qualidade
              </span>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-200 mb-3">
                <Camera className="text-[#057321] w-8 h-8" />
              </div>
              <span className="text-sm font-semibold text-gray-700 group-hover:text-[#057321]">
                Tirar Foto ou Escolher da Galeria
              </span>
              <span className="text-xs text-gray-500 mt-1">
                (Otimização automática)
              </span>
            </>
          )}
        </button>
      ) : (
        <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white p-2">
          <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-gray-100">
            <img
              src={preview}
              alt="Preview da encomenda"
              className="w-full h-full object-contain"
            />
          </div>
          
          <div className="flex items-center justify-between mt-3 px-2 pb-1">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
                <CheckCircle size={16} />
                <span>Foto otimizada</span>
              </div>
              {compressionInfo && (
                <span className="text-xs text-gray-500 mt-0.5">
                  {formatFileSize(compressionInfo.original)} → {formatFileSize(compressionInfo.compressed)}
                  <span className="text-green-600 ml-1">(-{compressionInfo.ratio}%)</span>
                </span>
              )}
            </div>
            <button
              onClick={handleRemove}
              className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <X size={16} />
              Remover
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
