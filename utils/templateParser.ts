import { MessageCategory } from "../types/template";

export type TemplateVars = Record<string, any>;

/**
 * Substitui variáveis no formato {VAR} dentro do template.
 * Mantém {VAR} caso a variável não exista no objeto vars.
 */
export function replaceVariables(template: string, vars: TemplateVars = {}): string {
  if (!template) return "";

  return template.replace(/\{([A-Z0-9_]+)\}/gi, (match, key) => {
    const value = vars?.[key];
    if (value === undefined || value === null) return match;
    return String(value);
  });
}

/**
 * Alias de compatibilidade: se algum ponto do app usar parseTemplate,
 * funciona igual ao replaceVariables.
 */
export function parseTemplate(template: string, vars: TemplateVars = {}): string {
  return replaceVariables(template, vars);
}

export function getAvailableVariables(category: MessageCategory): string[] {
  switch (category) {
    case "ARRIVAL":
      return [
        "MORADOR",
        "UNIDADE",
        "BLOCO",
        "PROTOCOLO",
        "LOCAL",
        "RECEBIDO_POR",
        "DATA_HORA",
        "CONDOMINIO",
      ];

    case "PICKUP":
      return [
        "MORADOR",
        "UNIDADE",
        "BLOCO",
        "PROTOCOLO",
        "RETIRADO_POR",
        "PORTEIRO",
        "DATA_HORA",
        "LINK",
        "CONDOMINIO",
      ];

    case "WARNING":
    case "GENERAL":
      return ["MENSAGEM", "CONDOMINIO", "DATA_HORA"];

    default:
      return [];
  }
}
