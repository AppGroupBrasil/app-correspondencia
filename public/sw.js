// Service Worker — App Correspondência PWA
const CACHE_NAME = 'app-corresp-v1';

// Assets estáticos para cache (app shell)
const PRECACHE_URLS = [
  '/',
  '/login',
  '/manifest.json',
  '/logo-app-correspondencia.png',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico',
];

// Instalar: pré-cachear app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {
        // Se algum asset falhar, não bloqueia a instalação
      });
    })
  );
  self.skipWaiting();
});

// Ativar: limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first (sempre conteúdo fresco do servidor)
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignorar requests não-GET
  if (request.method !== 'GET') return;

  // Ignorar requests para APIs e supabase
  const url = new URL(request.url);
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('googletagmanager')
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cachear resposta válida
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline: servir do cache
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // Fallback para navegação: servir página principal do cache
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
