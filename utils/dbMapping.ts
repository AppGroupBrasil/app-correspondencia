/**
 * Conversão snake_case (PostgreSQL) ↔ camelCase (JavaScript)
 * Usado na migração Firebase → Supabase para manter compatibilidade
 */

/** Converte um objeto de camelCase para snake_case (para INSERT/UPDATE no Supabase) */
export function toSnakeCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
}

/** Converte um objeto de snake_case para camelCase (para uso no frontend) */
export function toCamelCase<T = Record<string, any>>(obj: Record<string, any>): T {
  const result: Record<string, any> = {};
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result as T;
}

/** Converte um array de objetos de snake_case para camelCase */
export function toCamelCaseArray<T = Record<string, any>>(arr: Record<string, any>[]): T[] {
  return arr.map((item) => toCamelCase<T>(item));
}

/** Converte uma chave individual de camelCase para snake_case */
export function keyToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
