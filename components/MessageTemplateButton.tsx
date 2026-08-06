"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import MessageConfigModal from "@/components/MessageConfigModal";
import { MessageCategory } from "@/types/template";

type Props = {
  condoId: string;
  category: MessageCategory;
  label?: string;
  className?: string;
};

export default function MessageTemplateButton({
  condoId,
  category,
  label = "Mensagem Whatsapp",
  className,
}: Props) {
  const [open, setOpen] = useState(false);

  const disabled = !condoId;

  return (
    <>
      <button
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={
          className ??
          // No celular fica só o ícone, num quadrado que cabe ao lado do título;
          // o texto volta a partir de telas médias.
          "shrink-0 h-11 w-11 sm:w-auto sm:px-4 bg-[#057321] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#046119] transition-all flex items-center justify-center gap-2 uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
        }
        title="Configurar Mensagem Automática"
        aria-label={label}
        type="button"
      >
        <MessageCircle size={18} className="shrink-0" />
        <span className={className ? undefined : "hidden sm:inline"}>{label}</span>
      </button>

      <MessageConfigModal
        isOpen={open}
        onClose={() => setOpen(false)}
        condoId={condoId}
        category={category}
      />
    </>
  );
}
