"use client";

import { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";

// 1. INTERFACE COM AS PROPRIEDADES CORRIGIDAS
interface AssinaturaDigitalProProps {
  onSave: (assinatura: string) => void;
  assinaturaInicial?: string;
  label: string;
  obrigatorio?: boolean;
  placeholder?: string;
  // PROPRIEDADES ADICIONADAS
  assinaturaPadrao?: string;
  onSaveAsDefault?: (assinaturaDataUrl: string) => void;
}

export default function AssinaturaDigitalPro({
  onSave,
  assinaturaInicial,
  label,
  obrigatorio = false,
  placeholder = "Assine aqui usando o mouse ou toque na tela",
  assinaturaPadrao,
  onSaveAsDefault,
}: AssinaturaDigitalProProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  // Prioriza assinaturaInicial, se não existir, usa a Padrao
  const [assinaturaSalva, setAssinaturaSalva] = useState(assinaturaInicial || assinaturaPadrao || "");

  useEffect(() => {
    const initialSig = assinaturaInicial || assinaturaPadrao;

    if (initialSig && sigCanvas.current && sigCanvas.current.isEmpty()) {
      // Garantir que a imagem seja carregada apenas se o canvas estiver vazio
      sigCanvas.current.fromDataURL(initialSig);
      setAssinaturaSalva(initialSig);
    }
  }, [assinaturaInicial, assinaturaPadrao]);

  function limpar() {
    sigCanvas.current?.clear();
    setAssinaturaSalva("");
    onSave(""); // Garante que o estado pai também seja limpo
  }

  function salvar() {
    if (sigCanvas.current?.isEmpty()) {
      alert("Por favor, assine antes de salvar");
      return;
    }

    const assinatura = sigCanvas.current?.toDataURL() || "";
    setAssinaturaSalva(assinatura);
    onSave(assinatura);
  }

  // NOVA FUNÇÃO PARA SALVAR COMO PADRÃO
  function salvarComoPadrao() {
    if (assinaturaSalva && onSaveAsDefault) {
      onSaveAsDefault(assinaturaSalva);
      alert("Assinatura salva como padrão!");
    } else {
      alert("Nenhuma assinatura para salvar como padrão.");
    }
  }

  // Lógica para desabilitar o botão de salvar como padrão
  const canSaveAsDefault = !!assinaturaSalva && !!onSaveAsDefault;
  const isDefaultSaved = assinaturaPadrao === assinaturaSalva && canSaveAsDefault;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {obrigatorio && <span className="text-red-500 ml-1">*</span>}
      </label>

      {assinaturaSalva ? (
        <div className="border-2 border-primary-300 rounded-lg p-4 bg-primary-50">
          <img
            src={assinaturaSalva}
            alt="Assinatura"
            className="w-full h-40 object-contain bg-white rounded"
          />
          {/* CORREÇÃO DE LAYOUT: USANDO FLEX PARA OS BOTÕES */}
          <div className="flex gap-3 mt-3">
            <button
              type="button"
              onClick={limpar}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Alterar Assinatura
            </button>
            
            {/* BOTÃO SALVAR COMO PADRÃO */}
            {canSaveAsDefault && (
              <button
                type="button"
                onClick={salvarComoPadrao}
                disabled={isDefaultSaved}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition 
                  ${isDefaultSaved 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-indigo-500 text-white hover:bg-indigo-600'
                  }`}
              >
                {isDefaultSaved ? "Padrão Salvo" : "Salvar Padrão"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
          <div className="relative">
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{
                className: "w-full h-40 touch-none",
                style: { touchAction: "none" },
              }}
            />
            {/* ... (Placeholder permanece) ... */}
          </div>
          <div className="flex gap-2 p-3 bg-gray-50 border-t">
            <button
              type="button"
              onClick={limpar}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-white transition"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={salvar}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
            >
              Salvar Assinatura
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        {assinaturaSalva
          ? "✓ Assinatura capturada com sucesso"
          : "Assine no espaço acima para continuar"}
      </p>
    </div>
  );
}