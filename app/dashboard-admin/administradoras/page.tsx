"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/app/lib/supabase";
import withAuth from "@/components/withAuth";
import { ShieldCheck, Plus, X, UserPlus, ArrowDownCircle } from "lucide-react";
import { getApiUrl } from "@/utils/platform";
import { buildAuthenticatedJsonHeaders } from "@/app/lib/client-auth";
import { formatarTelefone, limparTelefone, telefoneValido, MSG_TELEFONE_INVALIDO } from "@/utils/telefone";

interface UsuarioBase {
  id: string;
  nome: string;
  email: string;
  whatsapp?: string;
  role: string;
  condominio_id?: string | null;
  status?: string;
}

interface Condominio {
  id: string;
  nome: string;
}

function AdministradorasPage() {
  const [admins, setAdmins] = useState<UsuarioBase[]>([]);
  const [responsaveis, setResponsaveis] = useState<UsuarioBase[]>([]);
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [vinculos, setVinculos] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [modalPromoverAberto, setModalPromoverAberto] = useState(false);
  const [usuarioPromover, setUsuarioPromover] = useState<string>("");
  const [condosSelecionados, setCondosSelecionados] = useState<Set<string>>(new Set());

  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novoWhatsapp, setNovoWhatsapp] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [novoCondos, setNovoCondos] = useState<Set<string>>(new Set());

  const [editandoAdmin, setEditandoAdmin] = useState<UsuarioBase | null>(null);
  const [editCondos, setEditCondos] = useState<Set<string>>(new Set());

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    setLoading(true);
    try {
      const [{ data: condData }, { data: userData }, { data: vincData }] = await Promise.all([
        supabase.from("condominios").select("id, nome").order("nome"),
        supabase.from("users").select("id, nome, email, whatsapp, role, condominio_id, status").in("role", ["admin", "responsavel"]),
        supabase.from("admin_condominios").select("admin_id, condominio_id"),
      ]);

      setCondominios(condData || []);
      const usuarios = (userData || []) as UsuarioBase[];
      setAdmins(usuarios.filter(u => u.role === "admin"));
      setResponsaveis(usuarios.filter(u => u.role === "responsavel"));

      const mapa: Record<string, string[]> = {};
      (vincData || []).forEach((v: any) => {
        if (!mapa[v.admin_id]) mapa[v.admin_id] = [];
        mapa[v.admin_id].push(v.condominio_id);
      });
      setVinculos(mapa);
    } catch (e) {
      console.error(e);
      alert("Falha ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const sincronizarVinculos = async (adminId: string, novos: string[]) => {
    const atuais = vinculos[adminId] || [];
    const paraAdicionar = novos.filter(c => !atuais.includes(c));
    const paraRemover = atuais.filter(c => !novos.includes(c));

    if (paraAdicionar.length > 0) {
      const rows = paraAdicionar.map(c => ({ admin_id: adminId, condominio_id: c }));
      const { error } = await supabase.from("admin_condominios").insert(rows);
      if (error) throw error;
    }
    if (paraRemover.length > 0) {
      const { error } = await supabase
        .from("admin_condominios")
        .delete()
        .eq("admin_id", adminId)
        .in("condominio_id", paraRemover);
      if (error) throw error;
    }
  };

  const promover = async () => {
    if (!usuarioPromover || condosSelecionados.size === 0) {
      alert("Selecione o usuário e ao menos um condomínio.");
      return;
    }
    setSalvando(true);
    try {
      const { error: updErr } = await supabase
        .from("users")
        .update({ role: "admin", condominio_id: null })
        .eq("id", usuarioPromover);
      if (updErr) throw updErr;

      await sincronizarVinculos(usuarioPromover, Array.from(condosSelecionados));

      alert("Usuário promovido a Administradora!");
      setModalPromoverAberto(false);
      setUsuarioPromover("");
      setCondosSelecionados(new Set());
      await carregar();
    } catch (e: any) {
      alert("Falha ao promover: " + (e?.message || e));
    } finally {
      setSalvando(false);
    }
  };

  const criarNovo = async () => {
    if (!novoNome.trim() || !novoEmail.trim() || !novaSenha || novaSenha.length < 6 || novoCondos.size === 0) {
      alert("Preencha nome, e-mail, senha (mín. 6) e ao menos um condomínio.");
      return;
    }
    if (novoWhatsapp.trim() && !telefoneValido(novoWhatsapp)) {
      alert(MSG_TELEFONE_INVALIDO);
      return;
    }
    setSalvando(true);
    try {
      const res = await fetch(getApiUrl("/api/criar-usuario"), {
        method: "POST",
        headers: await buildAuthenticatedJsonHeaders(),
        body: JSON.stringify({
          email: novoEmail,
          senha: novaSenha,
          nome: novoNome,
          whatsapp: limparTelefone(novoWhatsapp),
          role: "admin",
          condominioId: null,
          status: "ativo",
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao criar administradora");

      const novoId = result.uid;
      if (!novoId) throw new Error("API não retornou o id do usuário criado.");

      await sincronizarVinculos(novoId, Array.from(novoCondos));

      alert("Administradora criada!");
      setModalNovoAberto(false);
      setNovoNome(""); setNovoEmail(""); setNovoWhatsapp(""); setNovaSenha("");
      setNovoCondos(new Set());
      await carregar();
    } catch (e: any) {
      alert("Falha ao criar: " + (e?.message || e));
    } finally {
      setSalvando(false);
    }
  };

  const salvarEdicao = async () => {
    if (!editandoAdmin) return;
    setSalvando(true);
    try {
      await sincronizarVinculos(editandoAdmin.id, Array.from(editCondos));
      setEditandoAdmin(null);
      await carregar();
    } catch (e: any) {
      alert("Falha ao salvar vínculos: " + (e?.message || e));
    } finally {
      setSalvando(false);
    }
  };

  const rebaixar = async (admin: UsuarioBase) => {
    if (!confirm(`Rebaixar ${admin.nome} de Administradora para Responsável? Os vínculos com condomínios serão removidos.`)) return;
    setSalvando(true);
    try {
      await supabase.from("admin_condominios").delete().eq("admin_id", admin.id);
      await supabase.from("users").update({ role: "responsavel" }).eq("id", admin.id);
      await carregar();
    } catch (e: any) {
      alert("Falha ao rebaixar: " + (e?.message || e));
    } finally {
      setSalvando(false);
    }
  };

  const nomeCondo = (id: string) => condominios.find(c => c.id === id)?.nome || id;

  const toggleSet = (set: Set<string>, setSet: (s: Set<string>) => void, id: string) => {
    const novo = new Set(set);
    if (novo.has(id)) novo.delete(id); else novo.add(id);
    setSet(novo);
  };

  const responsaveisDisponiveis = useMemo(
    () => responsaveis.filter(r => r.status !== "inativo"),
    [responsaveis]
  );

  return (
    <div className="space-y-6">
      <div className="border-b pb-4 flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="text-indigo-600" /> Administradoras
          </h1>
          <p className="text-gray-600">Síndicos profissionais com acesso a múltiplos condomínios.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModalPromoverAberto(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <UserPlus size={18} /> Promover Síndico
          </button>
          <button
            onClick={() => setModalNovoAberto(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus size={18} /> Nova Administradora
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Carregando...</p>
      ) : admins.length === 0 ? (
        <p className="text-gray-500">Nenhuma administradora cadastrada ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Nome</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">E-mail</th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase">Condomínios</th>
                <th className="px-4 py-2 text-right text-xs font-bold text-gray-600 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {admins.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{a.nome}</td>
                  <td className="px-4 py-3 text-gray-700">{a.email}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {(vinculos[a.id] || []).length === 0
                      ? <span className="text-red-500 text-sm">Sem condomínios vinculados</span>
                      : (vinculos[a.id] || []).map(nomeCondo).join(", ")}
                  </td>
                  <td className="px-4 py-3 text-right flex justify-end gap-2">
                    <button
                      onClick={() => { setEditandoAdmin(a); setEditCondos(new Set(vinculos[a.id] || [])); }}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 text-sm font-medium"
                    >
                      Vincular condomínios
                    </button>
                    <button
                      onClick={() => rebaixar(a)}
                      className="p-1.5 text-yellow-700 hover:bg-yellow-50 rounded-md"
                      title="Rebaixar para Responsável"
                    >
                      <ArrowDownCircle size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Promover */}
      {modalPromoverAberto && (
        <Modal title="Promover síndico a Administradora" onClose={() => setModalPromoverAberto(false)}>
          <label className="block text-sm font-bold mb-1">Síndico</label>
          <select
            value={usuarioPromover}
            onChange={e => setUsuarioPromover(e.target.value)}
            className="w-full p-2 border rounded-lg mb-4"
          >
            <option value="">Selecione...</option>
            {responsaveisDisponiveis.map(r => (
              <option key={r.id} value={r.id}>{r.nome} — {r.email}</option>
            ))}
          </select>

          <label className="block text-sm font-bold mb-1">Condomínios vinculados</label>
          <CondominioPicker condominios={condominios} selecionados={condosSelecionados} onToggle={id => toggleSet(condosSelecionados, setCondosSelecionados, id)} />

          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setModalPromoverAberto(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
            <button disabled={salvando} onClick={promover} className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">
              {salvando ? "Salvando..." : "Promover"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Novo */}
      {modalNovoAberto && (
        <Modal title="Nova Administradora" onClose={() => setModalNovoAberto(false)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <input value={novoNome} onChange={e => setNovoNome(e.target.value)} placeholder="Nome" className="p-2 border rounded-lg" />
            <input value={novoEmail} onChange={e => setNovoEmail(e.target.value)} placeholder="E-mail" type="email" className="p-2 border rounded-lg" />
            <input type="tel" inputMode="numeric" maxLength={15} value={novoWhatsapp} onChange={e => setNovoWhatsapp(formatarTelefone(e.target.value))} placeholder="WhatsApp - (81) 99999-9999" className="p-2 border rounded-lg" />
            <input value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Senha (mín. 6)" type="password" className="p-2 border rounded-lg" />
          </div>
          <label className="block text-sm font-bold mb-1">Condomínios vinculados</label>
          <CondominioPicker condominios={condominios} selecionados={novoCondos} onToggle={id => toggleSet(novoCondos, setNovoCondos, id)} />
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setModalNovoAberto(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
            <button disabled={salvando} onClick={criarNovo} className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50">
              {salvando ? "Criando..." : "Criar"}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal Editar Vínculos */}
      {editandoAdmin && (
        <Modal title={`Condomínios de ${editandoAdmin.nome}`} onClose={() => setEditandoAdmin(null)}>
          <CondominioPicker condominios={condominios} selecionados={editCondos} onToggle={id => toggleSet(editCondos, setEditCondos, id)} />
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setEditandoAdmin(null)} className="px-4 py-2 border rounded-lg">Cancelar</button>
            <button disabled={salvando} onClick={salvarEdicao} className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CondominioPicker({
  condominios, selecionados, onToggle,
}: { condominios: Condominio[]; selecionados: Set<string>; onToggle: (id: string) => void }) {
  return (
    <div className="max-h-60 overflow-y-auto border rounded-lg p-2 space-y-1">
      {condominios.length === 0 ? (
        <p className="text-sm text-gray-500 px-2 py-1">Nenhum condomínio cadastrado.</p>
      ) : condominios.map(c => (
        <label key={c.id} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
          <input type="checkbox" checked={selecionados.has(c.id)} onChange={() => onToggle(c.id)} />
          <span>{c.nome}</span>
        </label>
      ))}
    </div>
  );
}

export default withAuth(AdministradorasPage, ["adminMaster"]);
