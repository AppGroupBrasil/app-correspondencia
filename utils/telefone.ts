// utils/telefone.ts

export const limparTelefone = (valor: string): string =>
  (valor || "").replace(/\D/g, "");

export const formatarTelefone = (valor: string): string => {
  const v = limparTelefone(valor).substring(0, 11);

  if (v.length > 10) return v.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (v.length > 6) return v.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  if (v.length > 2) return v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  if (v.length > 0) return v.replace(/^(\d{0,2})/, "($1");
  return v;
};

export const telefoneValido = (valor: string): boolean => {
  const v = limparTelefone(valor);
  return v.length === 10 || v.length === 11;
};

// Completa o número da planilha com o DDD informado pelo síndico.
// Respeita o DDD que já veio no número; só preenche quando falta.
export const aplicarDddPadrao = (valor: string, ddd: string): string => {
  let v = limparTelefone(valor);
  if (!v) return "";

  // Número exportado com código do país (55 + DDD + número)
  if ((v.length === 12 || v.length === 13) && v.startsWith("55")) v = v.substring(2);

  // Já tem DDD próprio: mantém como está
  if (v.length === 10 || v.length === 11) return v;

  const dddLimpo = limparTelefone(ddd);
  if (dddLimpo.length === 2 && (v.length === 8 || v.length === 9)) return dddLimpo + v;

  return v;
};

export const MSG_TELEFONE_INVALIDO =
  "WhatsApp inválido. Informe DDD + número, ex: (81) 99999-9999";
