"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight, X, PartyPopper } from "lucide-react";
import {
  PASSOS_ONBOARDING,
  PassoId,
  getPasso,
  getProximoPasso,
  rotaDoPasso,
  podeAcessarPasso,
} from "@/app/lib/onboarding";

interface Props {
  passoConcluido: PassoId | null;
  role?: string | null;
  onFechar: () => void;
  mensagem?: string;
}

export default function ModalProximoPasso({ passoConcluido, role, onFechar, mensagem }: Props) {
  const router = useRouter();
  if (!passoConcluido) return null;

  const atual = getPasso(passoConcluido);
  const proximo = getProximoPasso(passoConcluido);
  const podeIr = !!proximo && podeAcessarPasso(proximo, role);

  const irParaProximo = () => {
    if (!proximo || !podeIr) return onFechar();
    const rota = rotaDoPasso(proximo, role);
    onFechar();
    router.push(rota);
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className={`bg-gradient-to-br ${atual.corDe} ${atual.corPara} px-6 py-7 text-white relative`}>
          <button
            onClick={onFechar}
            className="absolute top-3 right-3 text-white/80 hover:text-white"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3">
            {proximo ? <CheckCircle2 size={36} /> : <PartyPopper size={36} />}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
                Passo {atual.numero} concluído
              </p>
              <h2 className="text-xl font-bold leading-tight">
                {mensagem || atual.concluido}
              </h2>
            </div>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="flex items-center gap-2 mb-6">
            {PASSOS_ONBOARDING.map((p) => (
              <div key={p.id} className="flex-1">
                <div
                  className={`h-1.5 rounded-full ${
                    p.numero <= atual.numero ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
                <p
                  className={`text-[10px] mt-1 font-semibold ${
                    p.numero <= atual.numero ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  {p.numero}
                </p>
              </div>
            ))}
          </div>

          {proximo ? (
            <>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                Próximo passo
              </p>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>{proximo.emoji}</span> {proximo.titulo}
              </h3>
              <p className="text-sm text-gray-600 mt-2">{proximo.descricao}</p>

              {podeIr ? (
                <>
                  <button
                    onClick={irParaProximo}
                    className={`mt-6 w-full bg-gradient-to-r ${proximo.corDe} ${proximo.corPara} text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-95 transition`}
                  >
                    {proximo.titulo} <ArrowRight size={18} />
                  </button>
                  <button
                    onClick={onFechar}
                    className="mt-2 w-full text-gray-500 font-medium py-2 text-sm hover:text-gray-700"
                  >
                    Agora não, continuar aqui
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Este passo é feito pelo {proximo.responsavelPor}. Seu acesso não inclui essa tela.
                  </p>
                  <button
                    onClick={onFechar}
                    className="mt-4 w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition"
                  >
                    Entendi
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold text-gray-900">Configuração concluída! 🎉</h3>
              <p className="text-sm text-gray-600 mt-2">
                Condomínio, responsável, moradores e portaria estão cadastrados. O sistema já pode
                registrar e avisar correspondências.
              </p>
              <button
                onClick={onFechar}
                className="mt-6 w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition"
              >
                Concluir
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
