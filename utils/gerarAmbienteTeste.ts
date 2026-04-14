import { supabase } from "@/app/lib/supabase";
import { getApiUrl } from "@/utils/platform";

interface DadosTeste {
  condominioId: string;
  condominioNome: string;
  whatsappDestino: string; // O WhatsApp do responsável
}

export const gerarAmbienteTeste = async ({ condominioId, condominioNome, whatsappDestino }: DadosTeste) => {
  console.log("🛠️ Iniciando geração de ambiente de teste...");

  try {
    // --- A. CRIAR BLOCO DE TESTE ---
    const { data: blocoData, error: blocoError } = await supabase
      .from("blocos")
      .insert({
        nome: "Bloco Teste",
        condominio_id: condominioId,
        criado_em: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (blocoError) throw blocoError;
    const blocoId = blocoData.id;

    // --- B. CRIAR MORADOR DE TESTE ---
    const sufixo = condominioId.substring(0, 6).toLowerCase();
    const emailMorador = `morador.${sufixo}@teste.com`;
    const senhaPadrao = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase() + "!1";

    // Cria via API (para não deslogar o admin)
    const url = getApiUrl("/api/criar-usuario");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailMorador,
        senha: senhaPadrao,
        nome: "Morador (Seu Teste)",
        role: "morador",
        condominioId,
        dados: {
          status: "ativo",
          aprovado: true,
          bloco_id: blocoId,
          bloco_nome: "Bloco Teste",
          unidade_nome: "100",
          apartamento: "100",
          whatsapp: whatsappDestino.replaceAll(/\D/g, ""),
          ativo: true,
        },
      }),
    });

    if (!res.ok) {
      const result = await res.json();
      throw new Error(result.error || "Erro ao criar morador de teste");
    }

    console.log("✅ Ambiente de teste gerado com sucesso!");

  } catch (error) {
    console.error("❌ Erro ao gerar dados de teste:", error);
  }
};