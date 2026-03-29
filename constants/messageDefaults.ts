import { MessageCategory } from "../types/template";

export const DEFAULT_TITLES: Partial<Record<MessageCategory, string>> = {
  ARRIVAL: "Chegada Padrão",
  PICKUP: "Retirada Padrão",
  WARNING: "Aviso Rápido Padrão",
  GENERAL: "Aviso Geral Padrão",
};

export const DEFAULT_CONTENT: Partial<Record<MessageCategory, string>> = {
  ARRIVAL: `AVISO DE CORRESPONDÊNCIA

Olá, {MORADOR}!
Unidade: {UNIDADE} ({BLOCO})

Você recebeu uma correspondência
━━━━━━━━━━━━━━━━
│ PROTOCOLO: {PROTOCOLO}
│ Local: {LOCAL}
│ Recebido por: {RECEBIDO_POR}
│ Chegada: {DATA_HORA}
━━━━━━━━━━━━━━━━

FOTO E QR CODE:`,

  PICKUP: `CONFIRMAÇÃO DE RETIRADA

Olá, {MORADOR}!
Unidade: {UNIDADE} ({BLOCO})

Sua encomenda foi retirada com sucesso.
━━━━━━━━━━━━━━━━
│ Retirado em: {DATA_HORA}
━━━━━━━━━━━━━━━━

Obrigado!`,

  WARNING: `AVISO (PORTARIA)

{MENSAGEM}`,

  GENERAL: `AVISO GERAL

{MENSAGEM}`,
};
