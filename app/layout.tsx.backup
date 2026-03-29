import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "App Correspondência",
  description: "Sistema de Gestão de Correspondência",
  manifest: "/manifest.json",
  // 👇 Instrução para o Google não oferecer tradução
  other: {
    google: "notranslate",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#22c55e",
  // 👇 AJUSTE CRÍTICO PARA CAPACITOR/IPHONE:
  // Isso permite que o app ocupe a tela inteira (atrás do relógio/bateria).
  // Sem isso, o 'env(safe-area-inset-top)' retorna 0px e o layout quebra.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // 👇 suppressHydrationWarning é recomendado pois plugins de navegador
    // podem alterar o HTML e causar erros no console em desenvolvimento.
    <html lang="pt-BR" translate="no" suppressHydrationWarning>
      {/*
         AJUSTE VISUAL:
         - overscroll-none: Evita aquele efeito de "elástico" (bounce) ao rolar
           o topo da página no celular, fazendo parecer mais um app nativo.

         MOLDURA:
         - p-3 no body cria o respiro para a borda aparecer
         - border verde padrão do sistema (#057321)
         - rounded-2xl para cantos arredondados
         - overflow-hidden para respeitar os cantos arredondados
      */}
      <body className="min-h-screen bg-gray-50 antialiased notranslate overscroll-none p-3">
        <div className="min-h-[calc(100vh-1.5rem)] rounded-2xl border border-[#057321] bg-white overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}
