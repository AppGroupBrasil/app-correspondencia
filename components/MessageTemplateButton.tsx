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
          "px-4 py-2.5 bg-[#057321] text-white text-sm font-bold rounded-xl shadow-md hover:bg-[#046119] transition-all flex items-center gap-2 uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
        }
        title="Configurar Mensagem Automática"
        type="button"
      >
        <MessageCircle size={20} />
        {label}
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
