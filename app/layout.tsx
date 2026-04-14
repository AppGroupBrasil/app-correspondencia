import "./globals.css";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { AuthProvider } from "@/contexts/AuthContext";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.appcorrespondencia.com.br';

export const metadata: Metadata = {
  // ===== METADADOS BÁSICOS =====
  title: {
    default: "AppCorrespondencia | Sistema de Gestão de Correspondências para Condomínios",
    template: "%s | AppCorrespondencia",
  },
  description: "Sistema inteligente de gestão de correspondências para condomínios. Controle total de entregas com notificações automáticas, assinatura digital, registro fotográfico e relatórios completos. Teste grátis por 30 dias.",
  keywords: [
    "gestão de correspondências",
    "sistema para condomínio",
    "controle de entregas",
    "portaria digital",
    "notificação de correspondência",
    "assinatura digital",
    "gestão de encomendas",
    "software para condomínio",
    "app correspondência",
    "sistema de portaria",
    "controle de pacotes",
    "administração de condomínio",
  ],
  authors: [{ name: "AppCorrespondencia" }],
  creator: "AppCorrespondencia",
  publisher: "AppCorrespondencia",
  
  // ===== CONFIGURAÇÕES DE INDEXAÇÃO =====
  metadataBase: new URL(baseUrl),
  alternates: {
    canonical: baseUrl,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // ===== OPEN GRAPH (Facebook, LinkedIn, WhatsApp) =====
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: baseUrl,
    siteName: "AppCorrespondencia",
    title: "AppCorrespondencia | Gestão Inteligente de Correspondências",
    description: "Transforme a gestão de correspondências do seu condomínio. Sistema 100% digital com notificações automáticas, assinatura digital e relatórios completos.",
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "AppCorrespondencia - Sistema de Gestão de Correspondências para Condomínios",
        type: "image/png",
      },
    ],
  },

  // ===== TWITTER CARDS =====
  twitter: {
    card: "summary_large_image",
    title: "AppCorrespondencia | Gestão de Correspondências para Condomínios",
    description: "Sistema inteligente para controle de entregas em condomínios. Notificações automáticas, assinatura digital e relatórios.",
    images: [`${baseUrl}/og-image.png`],
    creator: "@appcorrespondencia",
  },

  // ===== ÍCONES E MANIFEST =====
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/logo-app-correspondencia.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },

  // ===== VERIFICAÇÃO DE PROPRIEDADE =====
  verification: {
    google: "kaxOOcZ9E7TisK11XcK0qSnn4ik2dpct5tq_dkB_XS8",
  },

  // ===== OUTRAS CONFIGURAÇÕES =====
  category: "technology",
  classification: "Business Software",
  other: {
    google: "notranslate",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "AppCorrespondencia",
    "format-detection": "telephone=no",
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#057321" },
    { media: "(prefers-color-scheme: dark)", color: "#057321" },
  ],
  colorScheme: "light",
  // 👇 AJUSTE CRÍTICO PARA CAPACITOR/IPHONE:
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" translate="no" suppressHydrationWarning>
      <head>
        {/* ===== SCHEMA.ORG STRUCTURED DATA (JSON-LD) ===== */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "AppCorrespondencia",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "description": "Sistema inteligente de gestão de correspondências para condomínios. Controle total de entregas com notificações automáticas, assinatura digital e relatórios.",
              "url": baseUrl,
              "author": {
                "@type": "Organization",
                "name": "AppCorrespondencia"
              },
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "BRL",
                "description": "Teste grátis por 30 dias"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "ratingCount": "150"
              },
              "featureList": [
                "Notificações automáticas por e-mail",
                "Assinatura digital na retirada",
                "Registro fotográfico de correspondências",
                "Relatórios e métricas em tempo real",
                "Múltiplos perfis de acesso",
                "Dashboard inteligente"
              ]
            }),
          }}
        />
      </head>
      {/*
         AJUSTE VISUAL:
         - overscroll-none: Evita aquele efeito de "elástico" (bounce) ao rolar
         MOLDURA:
         - p-3 no body cria o respiro para a borda aparecer
         - border verde padrão do sistema (#057321)
      */}
      <body className="min-h-screen bg-slate-50 antialiased notranslate overscroll-none overflow-x-hidden max-w-[100vw]">
        {/* ===== GOOGLE ANALYTICS ===== */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-8EQNKTHZ2C"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-8EQNKTHZ2C');
          `}
        </Script>

        <AuthProvider>
          <main className="min-h-screen w-full overflow-x-hidden">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
