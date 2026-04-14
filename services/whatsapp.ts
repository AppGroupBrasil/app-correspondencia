import { abrirLink } from "@/utils/platform";

export function normalizarTelefoneWhatsapp(telefone: string) {
  const numeroLimpo = (telefone || "").replace(/\D/g, "");
  if (!numeroLimpo) return "";

  return numeroLimpo.startsWith("55") ? numeroLimpo : `55${numeroLimpo}`;
}

export function buildWhatsAppUrl(telefone: string, mensagem: string) {
  const numeroNormalizado = normalizarTelefoneWhatsapp(telefone);
  if (!numeroNormalizado) return "";

  return `https://wa.me/${numeroNormalizado}?text=${encodeURIComponent(mensagem)}`;
}

export async function enviarNotificacaoWpp(telefone: string, mensagem: string) {
  const link = buildWhatsAppUrl(telefone, mensagem);
  if (!link) return false;

  await abrirLink(link);
  return true;
}