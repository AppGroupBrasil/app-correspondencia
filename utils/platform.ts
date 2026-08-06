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
    return;
  }

  // Navegadores embutidos (WhatsApp, Instagram, WebView) e bloqueadores de
  // pop-up devolvem null aqui e o clique não faz nada: nesse caso a mesma aba
  // resolve. O "noopener" fica fora das features porque ele mesmo zera o
  // retorno e impediria a detecção — a referência é anulada logo abaixo.
  const novaAba = globalThis.window?.open(url, "_blank");
  if (novaAba) {
    try {
      novaAba.opener = null;
    } catch {
      /* alguns navegadores não deixam sobrescrever */
    }
    return;
  }

  globalThis.window?.location.assign(url);
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