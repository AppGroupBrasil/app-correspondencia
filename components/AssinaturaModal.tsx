"use client";
import { useEffect, useRef, useState } from "react";

interface AssinaturaModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (assinaturaMoradorDataUrl: string, porteiroAssinaturaDataUrl?: string, salvarComoPadrao?: boolean) => void;
  porteiroAssinaturaUrl?: string | null;
}

export default function AssinaturaModal({
  open,
  onClose,
  onConfirm,
  porteiroAssinaturaUrl,
}: AssinaturaModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [salvarPadrao, setSalvarPadrao] = useState(false);
  const [porteiroCanvasRef, setPorteiroCanvasRef] = useState<HTMLCanvasElement | null>(null);
  const [usarCanvasPorteiro, setUsarCanvasPorteiro] = useState<boolean>(!porteiroAssinaturaUrl);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
  }, [open]);

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    setDrawing(true);
    const { x, y } = getXY(e, canvasRef.current!);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing) return;
    const { x, y } = getXY(e, canvasRef.current!);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => setDrawing(false);

  const clear = () => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
  };

  const clearPorteiro = () => {
    if (!porteiroCanvasRef) return;
    const ctx = porteiroCanvasRef.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, porteiroCanvasRef.width, porteiroCanvasRef.height);
  };

  // ✅ FUNÇÃO CORRIGIDA: Calcula coordenadas com escala
  function getXY(e: any, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    
    // Pega coordenadas do mouse/touch
    let clientX = 0;
    let clientY = 0;
    if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    // ✅ CALCULA ESCALA (tamanho real / tamanho CSS)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // ✅ APLICA ESCALA às coordenadas
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Registrar retirada — Assinaturas</h2>
          <button onClick={onClose} className="px-3 py-1 rounded bg-gray-200">Fechar</button>
        </div>

        {/* Assinatura do morador */}
        <div>
          <p className="font-semibold mb-2">Assinatura de quem RETIROU (morador):</p>
          <div className="border rounded p-2 bg-white">
            <canvas
              ref={canvasRef}
              width={900}
              height={250}
              className="w-full h-[250px] touch-none cursor-crosshair"
              onMouseDown={start}
              onMouseMove={move}
              onMouseUp={end}
              onMouseLeave={end}
              onTouchStart={start}
              onTouchMove={move}
              onTouchEnd={end}
            />
          </div>
          <div className="mt-2">
            <button onClick={clear} className="px-3 py-1 rounded bg-gray-100 border">Limpar</button>
          </div>
        </div>

        {/* Assinatura do porteiro */}
        <div className="border-t pt-3">
          <p className="font-semibold mb-2">Assinatura de quem ENTREGOU (porteiro):</p>

          {porteiroAssinaturaUrl && !usarCanvasPorteiro ? (
            <div className="flex items-center gap-3">
              <img src={porteiroAssinaturaUrl} alt="Assinatura porteiro" className="h-20 object-contain border rounded bg-white p-2" />
              <button
                className="px-3 py-1 rounded bg-gray-100 border"
                onClick={() => setUsarCanvasPorteiro(true)}
              >
                Redesenhar / Atualizar
              </button>
            </div>
          ) : (
            <div>
              <div className="border rounded p-2 bg-white">
                <canvas
                  ref={(el) => setPorteiroCanvasRef(el)}
                  width={900}
                  height={180}
                  className="w-full h-[180px] cursor-crosshair"
                  onMouseDown={(e) => {
                    if (!porteiroCanvasRef) return;
                    const ctx = porteiroCanvasRef.getContext("2d")!;
                    ctx.lineWidth = 2;
                    ctx.lineCap = "round";
                    ctx.strokeStyle = "#000";
                    setDrawing(true);
                    
                    // ✅ USA FUNÇÃO COM ESCALA
                    const { x, y } = getXY(e, porteiroCanvasRef);
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                  }}
                  onMouseMove={(e) => {
                    if (!drawing || !porteiroCanvasRef) return;
                    const ctx = porteiroCanvasRef.getContext("2d")!;
                    
                    // ✅ USA FUNÇÃO COM ESCALA
                    const { x, y } = getXY(e, porteiroCanvasRef);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                  }}
                  onMouseUp={() => setDrawing(false)}
                  onMouseLeave={() => setDrawing(false)}
                  onTouchStart={(e) => {
                    if (!porteiroCanvasRef) return;
                    const ctx = porteiroCanvasRef.getContext("2d")!;
                    ctx.lineWidth = 2;
                    ctx.lineCap = "round";
                    ctx.strokeStyle = "#000";
                    setDrawing(true);
                    
                    // ✅ USA FUNÇÃO COM ESCALA
                    const { x, y } = getXY(e, porteiroCanvasRef);
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                  }}
                  onTouchMove={(e) => {
                    if (!drawing || !porteiroCanvasRef) return;
                    const ctx = porteiroCanvasRef.getContext("2d")!;
                    
                    // ✅ USA FUNÇÃO COM ESCALA
                    const { x, y } = getXY(e, porteiroCanvasRef);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                  }}
                  onTouchEnd={() => setDrawing(false)}
                />
              </div>
              <div className="mt-2 flex items-center gap-3">
                <button onClick={clearPorteiro} className="px-3 py-1 rounded bg-gray-100 border">
                  Limpar
                </button>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={salvarPadrao}
                    onChange={(e) => setSalvarPadrao(e.target.checked)}
                  />
                  Salvar/atualizar como assinatura padrão do porteiro
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-100 border">Cancelar</button>
          <button
            onClick={() => {
              const moradorURL = canvasRef.current!.toDataURL("image/png");
              const porteiroURL = usarCanvasPorteiro ? porteiroCanvasRef?.toDataURL("image/png") || undefined : (porteiroAssinaturaUrl ?? undefined);

              onConfirm(moradorURL, porteiroURL, usarCanvasPorteiro ? salvarPadrao : false);
            }}
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            Confirmar retirada
          </button>
        </div>
      </div>
    </div>
  );
}