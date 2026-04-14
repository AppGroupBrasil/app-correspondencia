"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { gerarAmbienteTeste } from "@/utils/gerarAmbienteTeste"; 

export default function CadastroCondominioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState(1);

  // Dados do condomínio
  const [cnpj, setCnpj] = useState("");
  const [nomeCondominio, setNomeCondominio] = useState("");
  const [endereco, setEndereco] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [buscandoCnpj, setBuscandoCnpj] = useState(false);
  const [cnpjConsultado, setCnpjConsultado] = useState(false);
  const [cnpjNaoEncontrado, setCnpjNaoEncontrado] = useState(false);
  const [preenchimentoManual, setPreenchimentoManual] = useState(false);

  // Dados do responsável
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);

  // Máscara de CNPJ
  const formatarCnpj = (valor: string) => {
    let v = valor.replaceAll(/\D/g, "").substring(0, 14);
    if (v.length > 12) return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, "$1.$2.$3/$4-$5");
    if (v.length > 8) return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, "$1.$2.$3/$4");
    if (v.length > 5) return v.replace(/^(\d{2})(\d{3})(\d{0,3})/, "$1.$2.$3");
    if (v.length > 2) return v.replace(/^(\d{2})(\d{0,3})/, "$1.$2");
    return v;
  };

  // Máscara de telefone
  const formatarTelefone = (valor: string) => {
    let v = valor.replaceAll(/\D/g, "").substring(0, 11);
    if (v.length > 10) return v.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    if (v.length > 6) return v.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    if (v.length > 2) return v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    if (v.length > 0) return v.replace(/^(\d{0,2})/, "($1");
    return v;
  };

  // Consulta CNPJ na BrasilAPI
  const consultarCnpj = useCallback(async (cnpjFormatado: string) => {
    const cnpjLimpo = cnpjFormatado.replaceAll(/\D/g, "");
    if (cnpjLimpo.length !== 14) return;

    setBuscandoCnpj(true);
    setCnpjConsultado(false);
    setCnpjNaoEncontrado(false);
    try {
      const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      if (!resp.ok) {
        setCnpjNaoEncontrado(true);
        setCnpjConsultado(true);
        setBuscandoCnpj(false);
        return;
      }
      const data = await resp.json();

      // Preenche nome (razão social ou nome fantasia)
      const nome = data.nome_fantasia || data.razao_social || "";
      if (nome) setNomeCondominio(nome);

      // Monta endereço completo
      const partes = [
        data.logradouro,
        data.numero,
        data.complemento,
        data.bairro,
        data.municipio ? `${data.municipio}/${data.uf}` : "",
        data.cep ? `CEP: ${data.cep}` : "",
      ].filter(Boolean);
      if (partes.length > 0) setEndereco(partes.join(", "));

      setCnpjConsultado(true);
    } catch {
      setCnpjNaoEncontrado(true);
      setCnpjConsultado(true);
    } finally {
      setBuscandoCnpj(false);
    }
  }, []);

  const handleCnpjChange = (valor: string) => {
    const formatado = formatarCnpj(valor);
    setCnpj(formatado);
    setCnpjConsultado(false);
    setCnpjNaoEncontrado(false);
    setPreenchimentoManual(false);
    // Auto-consulta quando completar 14 dígitos
    const limpo = formatado.replaceAll(/\D/g, "");
    if (limpo.length === 14) {
      consultarCnpj(formatado);
    }
  };

  // Validações
  const validarEtapa1 = () => {
    if (!nomeCondominio.trim()) return alert("Nome do condomínio é obrigatório");
    if (!cnpj.trim()) return alert("CNPJ é obrigatório");
    if (!endereco.trim()) return alert("Endereço é obrigatório");
    return true;
  };

  const validarEtapa2 = () => {
    if (!nomeResponsavel.trim()) return alert("Nome do responsável é obrigatório");
    if (!email.trim() || !email.includes("@")) return alert("Email válido é obrigatório");
    if (!senha || senha.length < 6) return alert("Senha deve ter no mínimo 6 caracteres");
    if (senha !== confirmarSenha) return alert("As senhas não conferem");
    if (!whatsapp.trim()) return alert("WhatsApp é obrigatório");
    return true;
  };

  const avancarParaEtapa2 = () => validarEtapa1() && setEtapa(2);
  const voltarParaEtapa1 = () => setEtapa(1);

  const finalizarCadastro = async () => {
    if (!validarEtapa2()) return;

    try {
      setLoading(true);

      // 1. Criar usuário auth + condomínio via API (service_role bypassa RLS)
      const res = await fetch("/api/criar-usuario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          senha,
          nome: nomeResponsavel,
          role: "responsavel",
          dados: {
            whatsapp,
            status: "ativo",
          },
          condominio: {
            nome: nomeCondominio,
            cnpj,
            endereco,
            logo_url: logoUrl || "",
          },
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao criar usuário");
      const uid = result.uid || result.id;
      const condominioId = result.condominioId;

      // 2. 🚀 GERA O AMBIENTE DE TESTE AUTOMATICAMENTE
      try {
          await gerarAmbienteTeste({
            condominioId: condominioId,
            condominioNome: nomeCondominio,
            whatsappDestino: whatsapp
          });
      } catch (error) {
          console.warn("⚠️ Aviso: Ambiente de teste não gerado.", error);
      }

      // Faz logout para que o usuário faça login oficialmente na tela de login
      await supabase.auth.signOut();

      alert(
        `✅ Condomínio cadastrado com sucesso!\n\nCriamos também um "Morador de Teste" para você validar o sistema.\n\nFaça login para começar.`
      );

      router.push("/login"); 
    } catch (err: any) {
      console.error("❌ Erro:", err);
      alert("Erro ao cadastrar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
        className="bg-gradient-to-br from-green-50 to-emerald-100 flex justify-center p-4 w-full overflow-y-auto"
        style={{ 
            minHeight: '100dvh',
            paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
            paddingBottom: '2rem'
        }}
    >
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md my-auto h-fit">
        
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <svg
              className="w-12 h-12"
              style={{ color: "#057321" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>

            <h1 className="text-3xl font-bold text-gray-900">Cadastrar Condomínio</h1>
          </div>

          <p className="text-gray-600">
            {etapa === 1
              ? "Preencha os dados do seu condomínio"
              : "Agora, os dados do responsável"}
          </p>
        </div>

        {/* Indicador de etapas */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
              "text-white bg-[#057321]"
            }`}
          >
            {etapa === 1 ? "1" : "✓"}
          </div>

          <div className="w-16 h-1 bg-gray-300"></div>

          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
              etapa === 2 ? "text-white bg-[#057321]" : "bg-gray-300 text-gray-700"
            }`}
          >
            2
          </div>
        </div>

        {/* Etapa 1 */}
        {etapa === 1 && (
          <div className="space-y-4">

            <div>
              <label htmlFor="cnpj-condominio" className="block text-sm font-medium text-gray-700 mb-1">
                CNPJ do Condomínio <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="cnpj-condominio"
                  type="text"
                  value={cnpj}
                  onChange={(e) => handleCnpjChange(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-[#057321] focus:border-[#057321]"
                />
                {buscandoCnpj && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <svg className="animate-spin h-5 w-5 text-[#057321]" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                )}
                {cnpjConsultado && !buscandoCnpj && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#057321]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              {buscandoCnpj && (
                <p className="text-xs text-[#057321] mt-1 animate-pulse">Buscando dados do CNPJ...</p>
              )}
              {cnpjConsultado && !buscandoCnpj && !cnpjNaoEncontrado && nomeCondominio && (
                <p className="text-xs text-[#057321] mt-1">✓ Dados preenchidos automaticamente</p>
              )}
              {cnpjNaoEncontrado && !buscandoCnpj && !preenchimentoManual && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ CNPJ não encontrado na base de dados.
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Deseja preencher os dados do condomínio manualmente?
                  </p>
                  <button
                    type="button"
                    onClick={() => setPreenchimentoManual(true)}
                    className="mt-2 px-4 py-2 bg-[#057321] text-white text-sm font-medium rounded-lg hover:bg-[#046a1d] transition-colors"
                  >
                    OK, preencher manualmente
                  </button>
                </div>
              )}
              {preenchimentoManual && (
                <p className="text-xs text-blue-600 mt-1">✏️ Preenchimento manual habilitado</p>
              )}
            </div>

            <Input
              label="Nome do Condomínio"
              required
              value={nomeCondominio}
              onChange={setNomeCondominio}
              placeholder={preenchimentoManual ? "Digite o nome do condomínio" : "Preenchido automaticamente pelo CNPJ"}
              disabled={cnpjNaoEncontrado && !preenchimentoManual}
            />

            <TextArea
              label="Endereço Completo"
              required
              value={endereco}
              onChange={setEndereco}
              placeholder={preenchimentoManual ? "Digite o endereço completo" : "Preenchido automaticamente pelo CNPJ"}
              disabled={cnpjNaoEncontrado && !preenchimentoManual}
            />

            {/* 👇 OCULTADO TEMPORARIAMENTE (Bonus futuro)
            <Input
              type="url"
              label="URL do Logo (Opcional)"
              value={logoUrl}
              onChange={setLogoUrl}
            />

            {logoUrl && (
              <img
                src={logoUrl}
                alt="Preview"
                className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200 mx-auto"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
            )}
            */}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => router.push("/login")} 
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 active:bg-gray-100 transition"
              >
                Cancelar
              </button>

              <button
                onClick={avancarParaEtapa2}
                className="flex-1 px-6 py-3 bg-[#057321] text-white rounded-lg font-medium hover:bg-[#045a1a] active:scale-[0.98] transition"
              >
                Próximo →
              </button>
            </div>
          </div>
        )}

        {/* Etapa 2 */}
        {etapa === 2 && (
          <div className="space-y-4">

            <Input
              label="Nome do Responsável"
              required
              value={nomeResponsavel}
              onChange={setNomeResponsavel}
            />

            <Input
              type="email"
              label="Email do Responsável"
              required
              value={email}
              onChange={setEmail}
            />

            <PasswordInput
              label="Senha"
              required
              value={senha}
              onChange={setSenha}
              mostrar={mostrarSenha}
              setMostrar={setMostrarSenha}
            />

            <PasswordInput
              label="Confirmar Senha"
              required
              value={confirmarSenha}
              onChange={setConfirmarSenha}
              mostrar={mostrarConfirmarSenha}
              setMostrar={setMostrarConfirmarSenha}
            />

            {/* 🔥 TELEFONE COM MÁSCARA APLICADA */}
            <Input
              type="tel"
              label="WhatsApp do Responsável"
              required
              value={whatsapp}
              onChange={(val: string) => setWhatsapp(formatarTelefone(val))}
              placeholder="(00) 00000-0000"
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={voltarParaEtapa1}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 active:bg-gray-100 transition"
              >
                ← Voltar
              </button>

              <button
                onClick={finalizarCadastro}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-[#057321] text-white rounded-lg font-medium hover:bg-[#045a1a] disabled:opacity-50 active:scale-[0.98] transition"
              >
                {loading ? "Cadastrando..." : "Finalizar"}
              </button>
            </div>

          </div>
        )}

        {/* Link Login */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Já tem uma conta?{" "}
            <a href="/login" className="text-[#057321] hover:text-[#045a1a] font-medium">
              Fazer Login
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}

/* ---------------------- */
/* COMPONENTES AJUSTADOS  */
/* ---------------------- */

function Input({ label, required, value, onChange, type = "text", placeholder = "", disabled = false }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={type === "tel" ? 15 : undefined}
        className={`w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-[#057321] focus:border-[#057321] ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
      />
    </div>
  );
}

function TextArea({ label, required, value, onChange, placeholder = "", disabled = false }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={3}
        className={`w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-[#057321] focus:border-[#057321] ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
      ></textarea>
    </div>
  );
}

function PasswordInput({
  label,
  required,
  value,
  onChange,
  mostrar,
  setMostrar,
}: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative">
        <input
          type={mostrar ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 text-base focus:ring-[#057321] focus:border-[#057321]"
        />

        <button
          type="button"
          onClick={() => setMostrar(!mostrar)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-2"
        >
          {mostrar ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
