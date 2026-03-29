"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Permite acesso direto a arquivos de verificação do Google
    if (pathname.startsWith('/google') && pathname.endsWith('.html')) {
      return; // Não redireciona arquivos de verificação
    }

    // Tenta detectar se a URL é um link de protocolo antigo vindo de QR Code
    // Ex: /dashboard-porteiro/635744
    const regex = /\/dashboard-porteiro\/(\d+)/;
    const match = pathname.match(regex);

    if (match) {
      const protocolo = match[1]; // Pega o número (ex: 635744)
      
      // Redireciona imediatamente para a busca passando o parâmetro q
      router.replace(`/dashboard-responsavel/registrar-retirada?q=${protocolo}`);
    }
  }, [pathname, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-600">
      <Loader2 className="h-12 w-12 animate-spin text-green-600 mb-4" />
      <h2 className="text-xl font-semibold">Verificando endereço...</h2>
      <p className="text-sm mt-2">Se for um protocolo válido, você será redirecionado.</p>
    </div>
  );
}