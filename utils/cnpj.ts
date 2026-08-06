// utils/cnpj.ts

export const limparCnpj = (valor: string): string =>
  (valor || "").replace(/\D/g, "");

export const formatarCnpj = (valor: string): string => {
  const v = limparCnpj(valor).substring(0, 14);

  if (v.length > 12) return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, "$1.$2.$3/$4-$5");
  if (v.length > 8) return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, "$1.$2.$3/$4");
  if (v.length > 5) return v.replace(/^(\d{2})(\d{3})(\d{0,3})/, "$1.$2.$3");
  if (v.length > 2) return v.replace(/^(\d{2})(\d{0,3})/, "$1.$2");
  return v;
};

export const cnpjValido = (valor: string): boolean =>
  limparCnpj(valor).length === 14;

export const MSG_CNPJ_INVALIDO =
  "CNPJ inválido. Informe os 14 dígitos, ex: 00.000.000/0000-00";
