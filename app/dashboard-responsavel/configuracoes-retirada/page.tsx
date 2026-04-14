"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import withAuth from "@/components/withAuth";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/app/lib/supabase";
import { 
  Settings, 
  Save, 
  AlertCircle, 
  CheckCircle, 
} from "lucide-react";
import type { ConfiguracoesRetirada } from "@/types/retirada.types";

// IMPORTS DE PADRONIZAÇÃO
import Navbar from "@/components/Navbar";
import BotaoVoltar from "@/components/BotaoVoltar";

function ConfiguracoesRetiradaPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [config, setConfig] = useState<ConfiguracoesRetirada>({
    assinaturaMoradorObrigatoria: true,
    assinaturaPorteiroObrigatoria: true,
    fotoDocumentoObrigatoria: false,
    selfieObrigatoria: false,
    geolocalizacaoObrigatoria: false,
    enviarWhatsApp: true,
    enviarEmail: true,
    enviarSMS: false,
    verificarMoradorAutorizado: true,
    permitirRetiradaTerceiro: true,
    exigirCodigoConfirmacao: false,
    incluirFotoCorrespondencia: true,
    incluirQRCode: true,
    incluirLogoCondominio: false,
    permitirRetiradaParcial: false,
    exigirAvaliacaoServico: false,
  });

  useEffect(() => {
    carregarConfiguracoes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const carregarConfiguracoes = async () => {
    if (!user?.condominioId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("configuracoes_retirada")
        .select("*")
        .eq("condominio_id", user.condominioId)
        .single();

      if (data && !error) {
        setConfig(data as ConfiguracoesRetirada);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      setMessage({ type: "error", text: "Erro ao carregar configurações" });
    } finally {
      setLoading(false);
    }
  };

  const salvarConfiguracoes = async () => {
    if (!user?.condominioId) {
      setMessage({ type: "error", text: "Condomínio não identificado" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("configuracoes_retirada")
        .upsert({ ...config, condominio_id: user.condominioId }, { onConflict: "condominio_id" });
      if (error) throw error;

      setMessage({ type: "success", text: "Configurações salvas com sucesso!" });

      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      setMessage({ type: "error", text: "Erro ao salvar configurações" });
    } finally {
      setSaving(false);
    }
  };

  const toggleConfig = (key: keyof ConfiguracoesRetirada) => {
    setConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#057321] mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 1. NAVBAR GLOBAL */}
      <Navbar />

      {/* 2. ESPAÇAMENTO CORRETO (pt-20) */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12">
        
        {/* 3. BOTÃO VOLTAR PADRONIZADO */}
        <BotaoVoltar url="/dashboard-responsavel/registrar-retirada" />

        <div className="space-y-6">
            
            {/* Cabeçalho da Página */}
            <div className="bg-white p-6 rounded-xl shadow-sm flex items-center gap-4">
                <div className="bg-green-50 p-3 rounded-lg text-[#057321]">
                    <Settings size={28} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Configurações de Retirada</h1>
                    <p className="text-gray-600">Personalize as regras e notificações</p>
                </div>
            </div>

            {/* Mensagem de Feedback */}
            {message && (
            <div
                className={`p-4 rounded-lg flex items-start gap-3 animate-fade-in ${
                message.type === "success"
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
            >
                {message.type === "success" ? (
                <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
                ) : (
                <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                )}
                <p className={`text-sm font-medium ${message.type === "success" ? "text-green-800" : "text-red-800"}`}>
                {message.text}
                </p>
            </div>
            )}

            {/* Campos Obrigatórios */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                Regras de Validação
            </h2>
            <div className="space-y-6">
                <ToggleOption
                label="Assinatura do Morador"
                description="Exigir assinatura na tela do celular"
                checked={config.assinaturaMoradorObrigatoria}
                onChange={() => toggleConfig("assinaturaMoradorObrigatoria")}
                />
                <ToggleOption
                label="Assinatura do Porteiro"
                description="Exigir visto do porteiro responsável"
                checked={config.assinaturaPorteiroObrigatoria}
                onChange={() => toggleConfig("assinaturaPorteiroObrigatoria")}
                />
                <ToggleOption
                label="Foto do Documento"
                description="Obrigatório fotografar RG/CNH de quem retira"
                checked={config.fotoDocumentoObrigatoria}
                onChange={() => toggleConfig("fotoDocumentoObrigatoria")}
                />
                <ToggleOption
                label="Selfie de Segurança"
                description="Capturar foto do rosto no ato da retirada"
                checked={config.selfieObrigatoria}
                onChange={() => toggleConfig("selfieObrigatoria")}
                />
            </div>
            </div>

            {/* Notificações */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                Notificações Automáticas
            </h2>
            <div className="space-y-6">
                <ToggleOption
                label="Enviar WhatsApp"
                description="Link direto para o morador (via API Web)"
                checked={config.enviarWhatsApp}
                onChange={() => toggleConfig("enviarWhatsApp")}
                />
                <ToggleOption
                label="Enviar E-mail"
                description="Notificar via e-mail cadastrado"
                checked={config.enviarEmail}
                onChange={() => toggleConfig("enviarEmail")}
                />
            </div>
            </div>

            {/* Personalização do Recibo */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                Design do Recibo PDF
            </h2>
            <div className="space-y-6">
                <ToggleOption
                label="Foto da Encomenda"
                description="Mostrar foto do pacote no PDF"
                checked={config.incluirFotoCorrespondencia}
                onChange={() => toggleConfig("incluirFotoCorrespondencia")}
                />
                <ToggleOption
                label="QR Code de Validação"
                description="Código para autenticidade do recibo"
                checked={config.incluirQRCode}
                onChange={() => toggleConfig("incluirQRCode")}
                />
                <ToggleOption
                label="Logo do Condomínio"
                description="Exibir logo no cabeçalho"
                checked={config.incluirLogoCondominio}
                onChange={() => toggleConfig("incluirLogoCondominio")}
                />
            </div>
            </div>

            {/* Botão Salvar Flutuante ou Fixo */}
            <div className="sticky bottom-4 md:relative md:bottom-auto z-20">
                <button
                    onClick={salvarConfiguracoes}
                    disabled={saving}
                    className="w-full md:w-auto ml-auto flex items-center justify-center gap-2 px-8 py-4 bg-[#057321] text-white rounded-xl hover:bg-[#046019] disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-lg font-bold text-lg"
                >
                    <Save size={24} />
                    {saving ? "Salvando..." : "Salvar Alterações"}
                </button>
            </div>
        </div>
      </main>
    </div>
  );
}

// Toggle Component
interface ToggleOptionProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

function ToggleOption({ label, description, checked, onChange }: ToggleOptionProps) {
  return (
    <div className="flex items-center justify-between gap-4 cursor-pointer" onClick={onChange}>
      <div className="flex-1">
        <h3 className="text-base font-semibold text-gray-900">{label}</h3>
        <p className="text-sm text-gray-500 leading-tight">{description}</p>
      </div>
      <button
        type="button"
        className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? "bg-[#057321]" : "bg-gray-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export default withAuth(ConfiguracoesRetiradaPage, ["responsavel", "adminMaster"]);