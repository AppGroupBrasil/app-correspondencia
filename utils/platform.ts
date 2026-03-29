import { Browser } from "@capacitor/browser";

/**
 * Abre links externos de forma segura na Web e no App (Capacitor)
 * Substitui o window.open
 */
export const abrirLink = async (url?: string | null) => {
  if (!url) return;

  // Verifica se é App Nativo
  const isNative = globalThis.window !== undefined && 
                   !!(globalThis.window as any).Capacitor?.isNativePlatform?.();

  if (isNative) {
    // No celular, abre no navegador do sistema (Chrome/Safari) para não fechar o App
    await Browser.open({ url });
  } else {
    // Na web, abre em nova aba
    globalThis.window?.open(url, "_blank", "noopener,noreferrer");
  }
};

/**
 * Detecta se a URL da API deve ser absoluta (App) ou relativa (Web)
 * Use isso antes de qualquer fetch('/api/...')
 */
export const getApiUrl = (endpoint: string) => {
  // Se for App rodando file://
  const isNative = globalThis.window !== undefined && 
                   !!(globalThis.window as any).Capacitor?.isNativePlatform?.();
                   
  if (isNative) {
     // Pega a URL do .env ou usa o fallback
     const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://appcorrespondencia.com.br";
     
     // Garante que não tenha barras duplicadas (ex: .com//api)
     const cleanBase = baseUrl.replace(/\/$/, '');
     const cleanEndpoint = endpoint.replace(/^\//, '');
     
     return `${cleanBase}/${cleanEndpoint}`;
  }
  
  // Se for Web, retorna o endpoint relativo normal (ex: /api/login)
  return endpoint;
};