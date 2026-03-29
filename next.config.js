/** @type {import('next').NextConfig} */

// Detecta se é build de App ou Web
const isAppBuild = process.env.BUILD_TARGET === 'app';

const nextConfig = {
  // Modo App = Exportação Estática | Modo Web = Standalone (para Docker) ou Padrão
  output: isAppBuild ? 'export' : 'standalone',
  reactStrictMode: false,
  compress: true,
  trailingSlash: false,
  
  // Configuração de imagens otimizada
  images: {
    // App precisa de unoptimized. Web pode usar otimização.
    unoptimized: isAppBuild,
    // Usar remotePatterns em vez de domains (deprecated)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.firebasestorage.app',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    // Tamanhos de dispositivo para otimização
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Rewrites para arquivos especiais
  async rewrites() {
    return [
      {
        source: '/google7e64177092e9a42d.html',
        destination: '/api/google-verification',
      },
      {
        source: '/google41280a339a8af673.html',
        destination: '/api/google-verification',
      },
    ];
  },

  // Headers de segurança
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Otimizações experimentais
  experimental: {
    optimizePackageImports: ['lucide-react', 'firebase'],
  },
};

module.exports = nextConfig;
