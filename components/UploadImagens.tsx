"use client";

import { useEffect, useId, useRef, useState, ChangeEvent } from "react";
import { Camera, X, Loader2, Plus, Images, Package } from "lucide-react";
import { compressImage, isValidImage } from "@/utils/imageCompressor";
import { MAX_FOTOS } from "@/app/lib/fotos-correspondencia";
import { liberarRecarga, travarRecarga } from "@/utils/rascunho";
import { ehAppNativo, tirarFotoNativa } from "@/utils/cameraNativa";

export interface FotoSelecionada {
  id: string;
  file: File;
  base64: string;
}

interface UploadImagensProps {
  fotos: FotoSelecionada[];
  onChange: (fotos: FotoSelecionada[]) => void;
  max?: number;
}

/**
 * Captura de uma ou várias fotos no mesmo registro. A primeira foto mantém o
 * fluxo de sempre (câmera direto); as seguintes entram pelo "+", para o
 * porteiro registrar 4 ou 5 encomendas do mesmo morador de uma vez só.
 */
export default function UploadImagens({ fotos, onChange, max = MAX_FOTOS }: UploadImagensProps) {
  const [ocupado, setOcupado] = useState(false);
  const inputCamera = useRef<HTMLInputElement>(null);
  const inputGaleria = useRef<HTMLInputElement>(null);
  const travaId = useId();

  // A câmera manda o app para segundo plano; enquanto houver foto em tela, nada
  // pode recarregar a página por trás do porteiro.
  useEffect(() => {
    if (fotos.length > 0) travarRecarga(travaId);
    else liberarRecarga(travaId);
  }, [fotos.length, travaId]);

  useEffect(() => () => liberarRecarga(travaId), [travaId]);

  const abrir = (input: HTMLInputElement | null) => {
    travarRecarga(travaId);
    input?.click();
  };

  // No aplicativo, a foto vem da câmera nativa já reduzida. O input com
  // capture continua servindo o navegador do computador.
  const abrirCamera = async () => {
    if (!ehAppNativo()) {
      abrir(inputCamera.current);
      return;
    }

    if (fotos.length >= max) {
      alert(`Limite de ${max} fotos por registro.`);
      return;
    }

    travarRecarga(travaId);
    try {
      const arquivo = await tirarFotoNativa();
      if (!arquivo) {
        if (fotos.length === 0) liberarRecarga(travaId);
        return;
      }
      await adicionar([arquivo]);
    } catch (erro) {
      // Permissão negada ou plugin indisponível: cai no seletor do sistema em
      // vez de deixar o porteiro sem conseguir registrar.
      console.error("Erro na câmera nativa, usando o seletor do sistema:", erro);
      abrir(inputCamera.current);
    }
  };

  const adicionar = async (arquivos: File[]) => {
    setOcupado(true);
    const novas: FotoSelecionada[] = [];

    for (const file of arquivos) {
      if (!isValidImage(file)) continue;
      if (file.size > 100 * 1024 * 1024) {
        alert(`"${file.name}" é maior que 100MB e foi ignorado.`);
        continue;
      }
      try {
        // Mesma compressão da foto única: 1/4 de A4, que é o que cabe na etiqueta.
        const resultado = await compressImage(file, {
          maxWidth: 400,
          maxHeight: 560,
          quality: 0.75,
        });
        novas.push({
          id: crypto.randomUUID(),
          file: resultado.file,
          base64: resultado.base64,
        });
      } catch (erro) {
        console.error("Erro ao comprimir imagem:", erro);
        novas.push({ id: crypto.randomUUID(), file, base64: "" });
      }
    }

    if (novas.length > 0) onChange([...fotos, ...novas]);
    setOcupado(false);
  };

  const processar = async (e: ChangeEvent<HTMLInputElement>) => {
    const selecionados = e.target.files;
    if (!selecionados || selecionados.length === 0) {
      // Câmera cancelada: nada a proteger se ainda não há foto nenhuma.
      if (fotos.length === 0) liberarRecarga(travaId);
      return;
    }

    const restantes = max - fotos.length;
    if (restantes <= 0) {
      alert(`Limite de ${max} fotos por registro.`);
      e.target.value = "";
      return;
    }

    const lista = Array.from(selecionados).slice(0, restantes);
    if (selecionados.length > restantes) {
      alert(`Só cabem mais ${restantes} foto(s) neste registro.`);
    }

    await adicionar(lista);
    e.target.value = "";
  };

  const remover = (id: string) => onChange(fotos.filter((f) => f.id !== id));

  const cheio = fotos.length >= max;

  return (
    <div className="w-full">
      <input
        type="file"
        ref={inputCamera}
        onChange={processar}
        accept="image/*"
        capture="environment"
        className="hidden"
      />
      <input
        type="file"
        ref={inputGaleria}
        onChange={processar}
        accept="image/*"
        multiple
        className="hidden"
      />

      {fotos.length === 0 ? (
        <>
          <button
            type="button"
            onClick={() => void abrirCamera()}
            disabled={ocupado}
            className="w-full group relative flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-white hover:border-[#057321] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
          >
            {ocupado ? (
              <>
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-3">
                  <Loader2 className="text-[#057321] w-8 h-8 animate-spin" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Otimizando imagem...</span>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-200 mb-3">
                  <Camera className="text-[#057321] w-8 h-8" />
                </div>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-[#057321]">
                  Tirar Foto da Encomenda
                </span>
                <span className="text-xs text-gray-500 mt-1">(Otimização automática)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => abrir(inputGaleria.current)}
            disabled={ocupado}
            className="mt-2 w-full flex items-center justify-center gap-2 text-xs font-semibold text-gray-500 hover:text-[#057321] py-2 disabled:opacity-50"
          >
            <Images size={14} />
            Escolher várias da galeria
          </button>
        </>
      ) : (
        <div className="w-full rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {fotos.map((foto, indice) => (
              <div
                key={foto.id}
                className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100"
              >
                {foto.base64 ? (
                  <img
                    src={foto.base64}
                    alt={`Correspondência ${indice + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Camera size={20} />
                  </div>
                )}
                <span className="absolute bottom-1 left-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {indice + 1}
                </span>
                <button
                  type="button"
                  onClick={() => remover(foto.id)}
                  aria-label={`Remover foto ${indice + 1}`}
                  className="absolute top-1 right-1 rounded-full bg-red-600/90 p-1 text-white hover:bg-red-700"
                >
                  <X size={12} />
                </button>
              </div>
            ))}

            {!cheio && (
              <button
                type="button"
                onClick={() => void abrirCamera()}
                disabled={ocupado}
                className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-500 hover:border-[#057321] hover:text-[#057321] transition-colors disabled:opacity-50 disabled:cursor-wait"
              >
                {ocupado ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={20} />
                    <span className="text-[10px] font-semibold leading-tight text-center px-1">
                      Outra
                      <br />
                      correspondência
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[#057321]">
              <Package size={14} />
              {fotos.length === 1
                ? "1 correspondência"
                : `${fotos.length} correspondências neste registro`}
            </span>
            <button
              type="button"
              onClick={() => abrir(inputGaleria.current)}
              disabled={ocupado || cheio}
              className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-[#057321] disabled:opacity-40"
            >
              <Images size={14} />
              Galeria
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
