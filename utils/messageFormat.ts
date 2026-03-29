export function formatPtBrDateTime(date = new Date()) {
  const data = date.toLocaleDateString("pt-BR");
  const hora = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${data}, ${hora}`;
}

export function buildFinalWhatsappMessage(baseMessage: string, link?: string) {
  const base = (baseMessage || "").trim();
  const lnk = (link || "").trim();
  return lnk ? `${base}\n\n${lnk}` : base;
}
