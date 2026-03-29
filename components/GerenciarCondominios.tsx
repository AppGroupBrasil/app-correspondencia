"use client";
import { useState, useEffect } from "react";
import { db } from "@/app/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Power,
  MapPin,
  Image as ImageIcon,
  X,
} from "lucide-react";

interface Condominio {
  id: string;
  nome: string;
  endereco: string;
  logoUrl?: string;
  status: "ativo" | "inativo";
  criadoEm?: any;

  authUid?: string;
  emailLogin?: string;
}

export default function GerenciarCondominios() {
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativo" | "inativo">("todos");

  // Estados do formulário
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [emailLogin, setEmailLogin] = useState("");
  const [condominioEditando, setCondominioEditando] = useState<Condominio | null>(null);

  useEffect(() => {
    carregarCondominios();
  }, []);

  const carregarCondominios = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "condominios"), orderBy("criadoEm", "desc"));
      const snapshot = await getDocs(q);
      const lista: Condominio[] = snapshot.docs.map((d) => ({
        id: d.id,
        nome: d.data().nome || "",
        endereco: d.data().endereco || "",
        logoUrl: d.data().logoUrl || "",
        status: d.data().status || "ativo",
        criadoEm: d.data().criadoEm,

        authUid: d.data().authUid || "",
        emailLogin: d.data().emailLogin || "",
      }));
      setCondominios(lista);
    } catch (err) {
      console.error("Erro ao carregar:", err);
      alert("Erro ao carregar condomínios");
    } finally {
      setLoading(false);
    }
  };

  const salvarCondominio = async () => {
    if (!nome.trim()) return alert("Nome é obrigatório");
    if (!endereco.trim()) return alert("Endereço é obrigatório");

    try {
      setLoading(true);
      if (condominioEditando) {
        await updateDoc(doc(db, "condominios", condominioEditando.id), {
          nome,
          endereco,
          logoUrl: logoUrl || "",
          emailLogin: emailLogin.trim() || "",
          atualizadoEm: serverTimestamp(),
        });
        alert("Atualizado com sucesso!");
      } else {
        await addDoc(collection(db, "condominios"), {
          nome,
          endereco,
          logoUrl: logoUrl || "",
          emailLogin: emailLogin.trim() || "",
          status: "ativo",
          criadoEm: serverTimestamp(),
        });
        alert("Cadastrado com sucesso!");
      }
      setModalAberto(false);
      limparFormulario();
      await carregarCondominios();
    } catch (err) {
      console.error("Erro ao salvar:", err);
      alert("Erro ao salvar condomínio");
    } finally {
      setLoading(false);
    }
  };

  const transferirAcesso = async () => {
    if (!condominioEditando) return;

    const novoEmail = emailLogin.trim();
    if (!novoEmail) return alert("Informe o novo e-mail do síndico.");

    if (
      !confirm(
        "Isso vai trocar o e-mail de login do síndico e derrubar o acesso do síndico atual. Continuar?"
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      // NOME DA FUNCTION = exatamente o exports.transferirAcessoCondominio
      const fn = httpsCallable(getFunctions(), "transferirAcessoCondominio");
      const res: any = await fn({ condominioId: condominioEditando.id, novoEmail });

      const link = res.data?.resetLink;
      if (link) window.open(link, "_blank");

      alert("Acesso transferido! O link de redefinição foi aberto em uma nova aba.");
      await carregarCondominios();
    } catch (err: any) {
      console.error(err);

      const msg =
        err?.code === "functions/permission-denied"
          ? "Sem permissão (você não é ADMIN_MASTER)."
          : err?.code === "functions/unauthenticated"
          ? "Você precisa estar logado."
          : err?.message || "Erro ao transferir acesso.";

      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const editarCondominio = (c: Condominio) => {
    setCondominioEditando(c);
    setNome(c.nome);
    setEndereco(c.endereco);
    setLogoUrl(c.logoUrl || "");
    setEmailLogin(c.emailLogin || "");
    setModalAberto(true);
  };

  const alternarStatus = async (c: Condominio) => {
    try {
      const novoStatus = c.status === "ativo" ? "inativo" : "ativo";
      await updateDoc(doc(db, "condominios", c.id), {
        status: novoStatus,
        atualizadoEm: serverTimestamp(),
      });
      await carregarCondominios();
    } catch (err) {
      console.error("Erro ao alterar status:", err);
    }
  };

  const excluirCondominio = async (c: Condominio) => {
    if (
      !confirm(
        `ATENÇÃO: Excluir "${c.nome}" apagará TODOS os dados vinculados (blocos, moradores, etc). Continuar?`
      )
    )
      return;

    try {
      setLoading(true);
      await deleteDoc(doc(db, "condominios", c.id));
      alert("Excluído com sucesso!");
      await carregarCondominios();
    } catch (err) {
      console.error("Erro ao excluir:", err);
      alert("Erro ao excluir");
    } finally {
      setLoading(false);
    }
  };

  const limparFormulario = () => {
    setNome("");
    setEndereco("");
    setLogoUrl("");
    setEmailLogin("");
    setCondominioEditando(null);
  };

  const condominiosFiltrados = condominios.filter((c) => {
    const matchBusca =
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.endereco.toLowerCase().includes(busca.toLowerCase());
    const matchStatus = filtroStatus === "todos" || c.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="text-[#057321]" /> Gerenciar Condomínios
          </h1>
          <p className="text-gray-500 text-sm">Cadastre e gerencie os condomínios do sistema.</p>
        </div>
        <button
          onClick={() => {
            limparFormulario();
            setModalAberto(true);
          }}
          className="bg-[#057321] text-white px-6 py-2.5 rounded-lg hover:bg-[#046019] transition-all font-bold flex items-center gap-2 shadow-sm"
        >
          <Plus size={20} /> Novo Condomínio
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome ou endereço..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#057321] focus:outline-none"
          />
        </div>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as any)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#057321] focus:outline-none bg-white"
        >
          <option value="todos">Todos os Status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 uppercase font-bold border-b">
              <tr>
                <th className="px-6 py-3">Condomínio</th>
                <th className="px-6 py-3">Endereço</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    Carregando...
                  </td>
                </tr>
              ) : condominiosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    Nenhum condomínio encontrado.
                  </td>
                </tr>
              ) : (
                condominiosFiltrados.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {c.logoUrl ? (
                          <img
                            src={c.logoUrl}
                            alt={c.nome}
                            className="w-10 h-10 rounded-lg object-cover border"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                            <Building2 size={20} />
                          </div>
                        )}
                        <span className="font-bold text-gray-900">{c.nome}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin size={14} className="text-gray-400" /> {c.endereco}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                          c.status === "ativo"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button
                        onClick={() => editarCondominio(c)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => alternarStatus(c)}
                        className={`p-2 rounded-lg ${
                          c.status === "ativo"
                            ? "text-orange-600 hover:bg-orange-50"
                            : "text-green-600 hover:bg-green-50"
                        }`}
                        title={c.status === "ativo" ? "Desativar" : "Ativar"}
                      >
                        <Power size={18} />
                      </button>
                      <button
                        onClick={() => excluirCondominio(c)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800">
                {condominioEditando ? "Editar Condomínio" : "Novo Condomínio"}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Condomínio *</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full pl-10 p-2.5 border rounded-lg focus:ring-2 focus:ring-[#057321]"
                    placeholder="Ex: Edifício Solar"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço Completo *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                  <textarea
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    className="w-full pl-10 p-2.5 border rounded-lg focus:ring-2 focus:ring-[#057321]"
                    placeholder="Rua, Número, Bairro..."
                    rows={3}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail de acesso (síndico)</label>
                <input
                  type="email"
                  value={emailLogin}
                  onChange={(e) => setEmailLogin(e.target.value)}
                  className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-[#057321]"
                  placeholder="novo.sindico@email.com"
                />
              </div>

              {condominioEditando && (
                <button
                  type="button"
                  onClick={transferirAcesso}
                  disabled={loading}
                  className="w-full px-4 py-2.5 rounded-lg font-bold border hover:bg-gray-50 disabled:opacity-50"
                >
                  Transferir acesso para este e-mail (trocar login + redefinir senha)
                </button>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL do Logo (Opcional)</label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full pl-10 p-2.5 border rounded-lg focus:ring-2 focus:ring-[#057321]"
                    placeholder="https://..."
                  />
                </div>
                {logoUrl && (
                  <div className="mt-2 flex justify-center">
                    <img
                      src={logoUrl}
                      alt="Preview"
                      className="h-16 w-16 rounded-lg object-cover border"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
              <button
                onClick={() => setModalAberto(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={salvarCondominio}
                disabled={loading}
                className="px-6 py-2 bg-[#057321] text-white rounded-lg font-bold hover:bg-[#046019] disabled:opacity-50"
              >
                {loading ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
