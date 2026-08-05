"use client";

import { useState, useEffect } from "react";
import { Shield, Edit2, Trash2, UserCheck, UserX, Plus, X, ShieldCheck } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { getApiUrl } from "@/utils/platform";
import { useAuth } from "@/hooks/useAuth";
import { formatarTelefone, limparTelefone, telefoneValido, MSG_TELEFONE_INVALIDO } from "@/utils/telefone";
import ModalProximoPasso from "@/components/ModalProximoPasso";
import type { PassoId } from "@/app/lib/onboarding";

interface Responsavel {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  condominioId: string;
  status: "ativo" | "inativo";
  criadoEm?: any;
}

interface Condominio {
  id: string;
  nome: string;
}

export default function GerenciarResponsaveis() {
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([]);
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [busca, setBusca] = useState("");
  
  // Formulário
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [condominioSelecionado, setCondominioSelecionado] = useState("");
  const [responsavelEditando, setResponsavelEditando] = useState<Responsavel | null>(null);

  const { role } = useAuth();
  const isMaster = role === "adminMaster";
  const [promovendo, setPromovendo] = useState<Responsavel | null>(null);
  const [promoverCondos, setPromoverCondos] = useState<Set<string>>(new Set());
  const [promovendoSalvando, setPromovendoSalvando] = useState(false);
  const [passoConcluido, setPassoConcluido] = useState<PassoId | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carregar Condomínios
      const { data: condData } = await supabase.from("condominios").select("id, nome");
      setCondominios(condData || []);

      // Carregar Responsáveis
      const { data: userData } = await supabase.from("users").select("*").eq("role", "responsavel");
      const listaResponsaveis = (userData || []).map((u: any) => ({
        id: u.id,
        nome: u.nome,
        email: u.email,
        whatsapp: u.whatsapp,
        condominioId: u.condominio_id,
        status: u.status || "ativo",
        criadoEm: u.criado_em,
      })) as Responsavel[];
      
      setResponsaveis(listaResponsaveis);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const salvarResponsavel = async () => {
    if (!nome.trim() || !email.trim() || !whatsapp.trim() || !condominioSelecionado) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    if (!telefoneValido(whatsapp)) {
      alert(MSG_TELEFONE_INVALIDO);
      return;
    }

    const whatsappLimpo = limparTelefone(whatsapp);

    if (!responsavelEditando && (!senha || senha.length < 6)) {
      alert("Senha deve ter no mínimo 6 caracteres.");
      return;
    }

    try {
      setLoading(true);

      if (responsavelEditando) {
        // Atualizar
        await supabase.from("users").update({
          nome,
          email,
          whatsapp: whatsappLimpo,
          condominio_id: condominioSelecionado,
          atualizado_em: new Date().toISOString()
        }).eq("id", responsavelEditando.id);
        alert("Responsável atualizado com sucesso!");
      } else {
        // Criar via API (para não deslogar o admin)
        const url = getApiUrl("/api/criar-usuario");
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            senha,
            nome,
            whatsapp: whatsappLimpo,
            role: "responsavel",
            condominioId: condominioSelecionado,
            status: "ativo",
          }),
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Erro ao criar responsável");
        setPassoConcluido("responsavel");
      }

      setModalAberto(false);
      limparFormulario();
      carregarDados();

    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const alternarStatus = async (responsavel: Responsavel) => {
    try {
      const novoStatus = responsavel.status === "ativo" ? "inativo" : "ativo";
      await supabase.from("users").update({ status: novoStatus }).eq("id", responsavel.id);
      carregarDados();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
    }
  };

  const abrirPromover = (resp: Responsavel) => {
    const inicial = new Set<string>();
    if (resp.condominioId) inicial.add(resp.condominioId);
    setPromoverCondos(inicial);
    setPromovendo(resp);
  };

  const togglePromoverCondo = (id: string) => {
    const novo = new Set(promoverCondos);
    if (novo.has(id)) novo.delete(id); else novo.add(id);
    setPromoverCondos(novo);
  };

  const confirmarPromocao = async () => {
    if (!promovendo) return;
    if (promoverCondos.size === 0) { alert("Selecione ao menos um condomínio."); return; }
    setPromovendoSalvando(true);
    try {
      const { error: e1 } = await supabase
        .from("users").update({ role: "admin", condominio_id: null }).eq("id", promovendo.id);
      if (e1) throw e1;
      const rows = Array.from(promoverCondos).map(c => ({ admin_id: promovendo.id, condominio_id: c }));
      const { error: e2 } = await supabase
        .from("admin_condominios").upsert(rows, { onConflict: "admin_id,condominio_id" });
      if (e2) throw e2;
      alert(`${promovendo.nome} agora é Administradora.`);
      setPromovendo(null);
      setPromoverCondos(new Set());
      carregarDados();
    } catch (e: any) {
      alert("Falha ao promover: " + (e?.message || e));
    } finally {
      setPromovendoSalvando(false);
    }
  };

  const excluirResponsavel = async (responsavel: Responsavel) => {
    if (!confirm(`Tem certeza que deseja excluir ${responsavel.nome}?`)) return;
    try {
      await supabase.from("users").delete().eq("id", responsavel.id);
      carregarDados();
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const limparFormulario = () => {
    setNome("");
    setEmail("");
    setSenha("");
    setWhatsapp("");
    setCondominioSelecionado("");
    setResponsavelEditando(null);
  };

  const getNomeCondominio = (id: string) => {
    return condominios.find(c => c.id === id)?.nome || "Não vinculado";
  };

  const filtrados = responsaveis.filter(r => 
    r.nome.toLowerCase().includes(busca.toLowerCase()) ||
    r.email.toLowerCase().includes(busca.toLowerCase())
  );
  let tabelaConteudo: React.ReactNode;

  if (loading) {
    tabelaConteudo = <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Carregando...</td></tr>;
  } else if (filtrados.length === 0) {
    tabelaConteudo = <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhum responsável encontrado.</td></tr>;
  } else {
    tabelaConteudo = filtrados.map((resp) => (
      <tr key={resp.id} className="hover:bg-gray-50">
        <td className="px-6 py-4 font-medium text-gray-900">
          {resp.nome}
          <span className="block text-xs text-gray-500 font-normal">{resp.email}</span>
        </td>
        <td className="px-6 py-4">{getNomeCondominio(resp.condominioId)}</td>
        <td className="px-6 py-4">{resp.whatsapp}</td>
        <td className="px-6 py-4">
          <span className={`px-2 py-1 rounded-full text-xs font-bold ${resp.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {resp.status === 'ativo' ? 'Ativo' : 'Inativo'}
          </span>
        </td>
        <td className="px-6 py-4 text-right flex justify-end gap-2">
          <button 
            onClick={() => {
              setResponsavelEditando(resp);
              setNome(resp.nome);
              setEmail(resp.email);
              setWhatsapp(formatarTelefone(resp.whatsapp));
              setCondominioSelecionado(resp.condominioId);
              setModalAberto(true);
            }}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
          >
            <Edit2 size={18} />
          </button>
          <button onClick={() => alternarStatus(resp)} className="p-2 text-yellow-600 hover:bg-yellow-50 rounded">
            {resp.status === 'ativo' ? <UserX size={18} /> : <UserCheck size={18} />}
          </button>
          {isMaster && (
            <button onClick={() => abrirPromover(resp)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded" title="Promover a Administradora">
              <ShieldCheck size={18} />
            </button>
          )}
          <button onClick={() => excluirResponsavel(resp)} className="p-2 text-red-600 hover:bg-red-50 rounded">
            <Trash2 size={18} />
          </button>
        </td>
      </tr>
    ));
  }

  return (
    <div className="space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <ModalProximoPasso
        passoConcluido={passoConcluido}
        role={role}
        onFechar={() => setPassoConcluido(null)}
      />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Shield className="text-green-600" /> Gerenciar Responsáveis
        </h2>
        <button 
          onClick={() => { limparFormulario(); setModalAberto(true); }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
        >
          <Plus size={20} /> Novo Responsável
        </button>
      </div>

      {/* Busca */}
      <div>
        <input 
          type="text" 
          placeholder="Buscar por nome ou email..." 
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none"
        />
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-700 uppercase font-bold">
            <tr>
              <th className="px-6 py-3">Nome</th>
              <th className="px-6 py-3">Condomínio</th>
              <th className="px-6 py-3">Contato</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tabelaConteudo}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="font-bold text-lg">{responsavelEditando ? "Editar Responsável" : "Novo Responsável"}</h3>
              <button onClick={() => setModalAberto(false)}><X size={24} className="text-gray-400" /></button>
            </div>
            
            <div className="space-y-4">
              <input type="text" placeholder="Nome Completo" value={nome} onChange={e => setNome(e.target.value)} className="w-full border p-2 rounded" />
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border p-2 rounded" />
              {!responsavelEditando && <input type="password" placeholder="Senha (mín 6)" value={senha} onChange={e => setSenha(e.target.value)} className="w-full border p-2 rounded" />}
              <input type="tel" inputMode="numeric" maxLength={15} placeholder="WhatsApp (com DDD) - (81) 99999-9999" value={whatsapp} onChange={e => setWhatsapp(formatarTelefone(e.target.value))} className="w-full border p-2 rounded" />
              
              <select value={condominioSelecionado} onChange={e => setCondominioSelecionado(e.target.value)} className="w-full border p-2 rounded bg-white">
                <option value="">Selecione o Condomínio</option>
                {condominios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>

              <button onClick={salvarResponsavel} disabled={loading} className="w-full bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50">
                {loading ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Promover a Administradora */}
      {promovendo && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ShieldCheck className="text-indigo-600" /> Promover a Administradora
              </h3>
              <button onClick={() => setPromovendo(null)}><X size={24} className="text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-700 mb-3">
              <strong>{promovendo.nome}</strong> passará a ter perfil de Administradora, com acesso aos condomínios marcados abaixo.
            </p>
            <div className="max-h-60 overflow-y-auto border rounded-lg p-2 space-y-1 mb-4">
              {condominios.length === 0 ? (
                <p className="text-sm text-gray-500 px-2 py-1">Nenhum condomínio cadastrado.</p>
              ) : condominios.map(c => (
                <label key={c.id} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                  <input type="checkbox" checked={promoverCondos.has(c.id)} onChange={() => togglePromoverCondo(c.id)} />
                  <span>{c.nome}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPromovendo(null)} className="px-4 py-2 border rounded-lg">Cancelar</button>
              <button onClick={confirmarPromocao} disabled={promovendoSalvando} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">
                {promovendoSalvando ? "Promovendo..." : "Promover"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
