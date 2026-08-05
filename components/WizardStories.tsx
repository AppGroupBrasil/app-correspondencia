"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ArrowRight, Pause, Play } from "lucide-react";
import { PASSOS_ONBOARDING, CHAVE_WIZARD, rotaDoPasso, podeAcessarPasso } from "@/app/lib/onboarding";

const DURACAO_MS = 7000;
const INTERVALO_MS = 50;

interface Props {
  aberto: boolean;
  onFechar: () => void;
  role?: string | null;
}

export default function WizardStories({ aberto, onFechar, role }: Props) {
  const router = useRouter();
  const [indice, setIndice] = useState(0);
  const [progresso, setProgresso] = useState(0);
  const [pausado, setPausado] = useState(false);
  const toqueInicial = useRef<number | null>(null);
  // O swipe dispara um clique sintético na zona de toque; sem essa guarda o
  // wizard pularia dois passos de uma vez.
  const swipeRecente = useRef(false);

  const semSwipe = (fn: () => void) => () => {
    if (swipeRecente.current) return;
    fn();
  };

  const fechar = useCallback(() => {
    try {
      localStorage.setItem(CHAVE_WIZARD, "true");
    } catch {}
    onFechar();
  }, [onFechar]);

  const avancar = useCallback(() => {
    if (indice >= PASSOS_ONBOARDING.length - 1) {
      fechar();
      return;
    }
    setProgresso(0);
    setIndice(indice + 1);
  }, [indice, fechar]);

  const voltar = useCallback(() => {
    setProgresso(0);
    setIndice((i) => Math.max(0, i - 1));
  }, []);

  useEffect(() => {
    if (aberto) {
      setIndice(0);
      setProgresso(0);
      setPausado(false);
    }
  }, [aberto]);

  useEffect(() => {
    if (!aberto || pausado) return;
    const timer = setInterval(() => {
      setProgresso((p) => Math.min(100, p + (INTERVALO_MS / DURACAO_MS) * 100));
    }, INTERVALO_MS);
    return () => clearInterval(timer);
  }, [aberto, pausado, indice]);

  useEffect(() => {
    if (aberto && progresso >= 100) avancar();
  }, [aberto, progresso, avancar]);

  useEffect(() => {
    if (!aberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const onTecla = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") avancar();
      if (e.key === "ArrowLeft") voltar();
      if (e.key === "Escape") fechar();
    };
    window.addEventListener("keydown", onTecla);
    return () => window.removeEventListener("keydown", onTecla);
  }, [aberto, avancar, voltar, fechar]);

  if (!aberto) return null;

  const passo = PASSOS_ONBOARDING[indice];
  const liberado = podeAcessarPasso(passo, role);

  const irParaPasso = () => {
    if (!liberado) return;
    const rota = rotaDoPasso(passo, role);
    fechar();
    router.push(rota);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black flex items-center justify-center">
      <div
        className={`relative w-full h-full sm:h-[92vh] sm:max-w-[430px] sm:rounded-2xl overflow-hidden bg-gradient-to-br ${passo.corDe} ${passo.corPara} select-none`}
        onTouchStart={(e) => {
          toqueInicial.current = e.touches[0].clientX;
          setPausado(true);
        }}
        onTouchEnd={(e) => {
          setPausado(false);
          const inicio = toqueInicial.current;
          toqueInicial.current = null;
          if (inicio === null) return;
          const delta = e.changedTouches[0].clientX - inicio;
          if (Math.abs(delta) <= 40) return;
          swipeRecente.current = true;
          setTimeout(() => {
            swipeRecente.current = false;
          }, 400);
          if (delta < 0) avancar();
          else voltar();
        }}
      >
        {/* Barras de progresso */}
        <div className="absolute top-0 left-0 right-0 flex gap-1 p-3 z-20">
          {PASSOS_ONBOARDING.map((p, i) => (
            <div key={p.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{
                  width: i < indice ? "100%" : i === indice ? `${progresso}%` : "0%",
                  transition: i === indice ? "width 50ms linear" : "none",
                }}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-6 right-3 z-30 flex items-center gap-3">
          <button onClick={() => setPausado((v) => !v)} className="text-white/80 hover:text-white" aria-label="Pausar">
            {pausado ? <Play size={20} /> : <Pause size={20} />}
          </button>
          <button onClick={fechar} className="text-white/80 hover:text-white" aria-label="Fechar guia">
            <X size={24} />
          </button>
        </div>

        {/* Zonas de toque (avançar/voltar) */}
        <button
          className="absolute left-0 top-0 h-full w-1/3 z-10"
          onClick={semSwipe(voltar)}
          aria-label="Passo anterior"
        />
        <button
          className="absolute right-0 top-0 h-full w-1/3 z-10"
          onClick={semSwipe(avancar)}
          aria-label="Próximo passo"
        />

        {/* Conteúdo */}
        <div className="relative z-0 h-full flex flex-col justify-center items-center text-center px-8 text-white">
          <div className="text-7xl mb-6 drop-shadow-lg">{passo.emoji}</div>

          <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/70">
            Passo {passo.numero} de {PASSOS_ONBOARDING.length}
          </p>

          <h2 className="text-3xl font-extrabold mt-3 leading-tight">{passo.chamada}</h2>
          <p className="text-lg font-semibold mt-1 text-white/90">{passo.titulo}</p>

          <p className="text-base text-white/85 mt-5 max-w-xs leading-relaxed">{passo.descricao}</p>
          <p className="text-sm text-white/60 mt-3 max-w-xs">{passo.detalhe}</p>
        </div>

        {/* Rodapé */}
        <div className="absolute bottom-0 left-0 right-0 z-30 p-6 flex flex-col gap-3">
          {liberado ? (
            <button
              onClick={irParaPasso}
              className="w-full bg-white text-gray-900 font-bold py-3.5 rounded-full flex items-center justify-center gap-2 hover:bg-gray-100 transition"
            >
              Ir para o passo {passo.numero} <ArrowRight size={18} />
            </button>
          ) : (
            <div className="w-full bg-white/15 border border-white/25 text-white/90 text-sm font-medium py-3 rounded-2xl text-center px-4">
              Passo feito pelo {passo.responsavelPor}.
            </div>
          )}
          <button onClick={fechar} className="text-white/70 text-sm font-medium hover:text-white">
            {indice === PASSOS_ONBOARDING.length - 1 ? "Concluir guia" : "Pular guia"}
          </button>
        </div>
      </div>
    </div>
  );
}
