import { Metadata } from "next";

// --- CONFIGURAÇÃO DO WHATSAPP (OPEN GRAPH) ---
export const metadata: Metadata = {
  title: "Aviso de Chegada - App Correspondência",
  description: "Você recebeu uma nova correspondência. Clique para ver o comprovante e detalhes.",
  openGraph: {
    title: "📦 Chegou Encomenda!",
    description: "Visualize aqui o comprovante, foto e local de retirada.",
    url: "https://www.appcorrespondencia.com.br",
    siteName: "App Correspondência",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        // ATENÇÃO: O WhatsApp exige o link COMPLETO (https://...)
        // Não funciona se colocar apenas "/logo-zap.png"
        url: "https://www.appcorrespondencia.com.br/logo-zap.png",
        width: 800,
        height: 800,
        alt: "Logo App Correspondência",
      },
    ],
  },
};

export default function VerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}