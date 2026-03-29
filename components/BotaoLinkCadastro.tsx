"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/app/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Check, Share2 } from "lucide-react";

export default function BotaoLinkCadastro() {
  const { user } = useAuth();
  const [cnpjCondominio, setCnpjCondominio] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [loading, setLoading] = useState(true);

  // Buscar o CNPJ do condomínio atual
  useEffect(() => {
    const fetchCnpj = async () => {
      if (user?.condominioId) {
        try {
          const docSnap = await getDoc(doc(db, "condominios", user.condominioId));
          if (docSnap.exists()) {
            setCnpjCondominio(docSnap.data().cnpj);
          }
        } catch (error) {
          console.error("Erro ao buscar CNPJ:", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchCnpj();
  }, [user]);

  const compartilharLink = async () => {
    if (!cnpjCondominio) return alert("CNPJ não encontrado ou carregando...");

    // 🚀 CORREÇÃO CRÍTICA PARA APP:
    // Usa a URL pública (Produção/Hetzner) se definida, senão usa a origem (Localhost)
    // Isso garante que o link funcione quando enviado pelo WhatsApp
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || globalThis.window.location.origin;
    
    // Remove barra no final para evitar duplicidade (ex: .com//cadastro)
    const cleanBase = baseUrl.replace(/\/$/, "");
    const link = `${cleanBase}/cadastro-morador?cnpj=${cnpjCondominio}`;

    // Tenta usar o compartilhamento nativo do celular (Melhor UX)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Cadastro no App Correspondência',
          text: 'Utilize este link para se cadastrar no condomínio:',
          url: link
        });
        return; // Se compartilhou, não precisa copiar
      } catch (err) {
        // Se o usuário cancelou ou deu erro, cai no fallback de copiar abaixo
        console.warn("Compartilhamento cancelado, copiando para área de transferência:", err);
      }
    }

    // Fallback: Copiar para área de transferência
    navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  if (loading || !cnpjCondominio) return null;

  return (
    <button
      onClick={compartilharLink}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm text-sm sm:text-base whitespace-nowrap active:scale-95 ${
        copiado 
          ? "bg-green-600 text-white border-2 border-green-600" 
          : "bg-white text-[#057321] border-2 border-[#057321] hover:bg-green-50"
      }`}
      title="Compartilhar link de cadastro"
    >
      {/* Mostra ícone de Compartilhar se não tiver copiado ainda */}
      {copiado ? <Check size={18} /> : <Share2 size={18} />}
      
      {copiado ? "Link Copiado!" : "Link de Cadastro"}
    </button>
  );
}