// app/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV === 'development') {
    console.warn('[Supabase] Variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são necessárias.');
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// O gateway (Kong) do Supabase self-hosted exige `apikey` até na rota
// /storage/v1/object/public/. Uma tag <img> não envia header, então anexamos a
// anon key (já pública, embutida no bundle) na query string para o navegador
// conseguir carregar a imagem. Sem isso o storage responde 401 e a imagem quebra.
export function comApiKeyStorage(url?: string | null): string {
  if (!url) return '';
  if (!url.includes('/storage/v1/object/')) return url;
  if (url.includes('apikey=')) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}apikey=${supabaseAnonKey}`;
}

// Cliente para server-side (API routes)
export function createServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
