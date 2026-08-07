"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { BUILD_ID } from "@/app/lib/build-id";

const INTERVALO_CHECAGEM = 10 * 60 * 1000;
const ESPACO_ENTRE_CHECAGENS = 30 * 1000;
const CHAVE_TENTATIVA = "app-corresp:recarga-versao";

export default function AtualizacaoAutomatica() {
  const [novaVersao, setNovaVersao] = useState(false);
  const versaoDoServidor = useRef("");
  const checando = useRef(false);
  const ultimaChecagem = useRef(0);

  // Recarregar no meio de um cadastro apagaria foto, assinatura e campos já
  // digitados. Nesses casos o aviso espera o porteiro decidir a hora.
  const semRiscoDePerda = () => {
    if (document.querySelector('[role="dialog"], canvas, video')) return false;
    const campos = Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")
    );
    return !campos.some((campo) => {
      const tipo = (campo as HTMLInputElement).type;
      if (["hidden", "checkbox", "radio", "submit", "button", "file"].includes(tipo)) return false;
      return Boolean(campo.value?.trim());
    });
  };

  const aplicar = useCallback(async () => {
    try {
      sessionStorage.setItem(CHAVE_TENTATIVA, versaoDoServidor.current);
    } catch {}
    try {
      if ("caches" in window) {
        const chaves = await caches.keys();
        await Promise.all(chaves.map((chave) => caches.delete(chave)));
      }
    } catch {}
    window.location.reload();
  }, []);

  const checar = useCallback(async () => {
    if (checando.current || document.hidden) return;
    const agora = Date.now();
    if (agora - ultimaChecagem.current < ESPACO_ENTRE_CHECAGENS) return;
    ultimaChecagem.current = agora;
    checando.current = true;
    try {
      const resposta = await fetch("/api/version", {
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      if (!resposta.ok) return;

      const { buildId } = await resposta.json();
      if (!buildId || buildId === BUILD_ID) return;
      versaoDoServidor.current = buildId;

      // Se já recarregamos por esta versão e o bundle continua o antigo, algo
      // no caminho está servindo cache: mostrar o aviso em vez de entrar em
      // laço de recarga.
      let jaTentada = "";
      try {
        jaTentada = sessionStorage.getItem(CHAVE_TENTATIVA) || "";
      } catch {}

      if (jaTentada === buildId || !semRiscoDePerda()) {
        setNovaVersao(true);
        return;
      }
      await aplicar();
    } catch {
      // Sem rede ou API indisponível: tenta de novo na próxima janela.
    } finally {
      checando.current = false;
    }
  }, [aplicar]);

  useEffect(() => {
    void checar();
    const intervalo = setInterval(() => void checar(), INTERVALO_CHECAGEM);
    // O app no celular fica aberto por dias: a volta do segundo plano é o
    // momento em que a versão nova precisa entrar.
    const aoVoltar = () => {
      if (!document.hidden) void checar();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", aoVoltar);
    window.addEventListener("online", aoVoltar);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", aoVoltar);
      window.removeEventListener("online", aoVoltar);
    };
  }, [checar]);

  if (!novaVersao) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-xl bg-[#057321] px-4 py-3 text-white shadow-lg">
        <RefreshCw size={18} className="shrink-0" />
        <p className="flex-1 text-sm font-medium">Nova versão disponível.</p>
        <button
          onClick={() => void aplicar()}
          className="rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-[#057321] hover:bg-green-50"
        >
          Atualizar
        </button>
      </div>
    </div>
  );
}
