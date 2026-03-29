"use client";

import { useState, useEffect } from "react";
import { Shield, Edit2, Trash2, UserCheck, UserX, Plus, X } from "lucide-react";
import { db } from "@/app/lib/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  signOut,
  getAuth,
} from "firebase/auth";
import { deleteApp, initializeApp } from "firebase/app";

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

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carregar Condomínios
      const condSnap = await getDocs(collection(db, "condominios"));
      const listaCondominios = condSnap.docs.map(doc => ({ id: doc.id, nome: doc.data().nome }));
      setCondominios(listaCondominios);

      // Carregar Responsáveis
      const q = query(collection(db, "users"), where("role", "==", "responsavel"));
      const userSnap = await getDocs(q);
      const listaResponsaveis = userSnap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
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

    if (!responsavelEditando && (!senha || senha.length < 6)) {
      alert("Senha deve ter no mínimo 6 caracteres.");
      return;
    }

    try {
      setLoading(true);

      if (responsavelEditando) {
        // Atualizar
        await updateDoc(doc(db, "users", responsavelEditando.id), {
          nome,
          email,
          whatsapp,
          condominioId: condominioSelecionado,
          atualizadoEm: serverTimestamp()
        });
        alert("Responsável atualizado com sucesso!");
      } else {
        const config = db.app.options;
        const secondaryApp = initializeApp(config, `SecondaryResponsavelApp${Date.now()}`);
        const secondaryAuth = getAuth(secondaryApp);

        try {
          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, senha);
          const uid = userCredential.user.uid;

          await setDoc(doc(db, "users", uid), {
            uid,
            nome,
            email,
            whatsapp,
            role: "responsavel",
            condominioId: condominioSelecionado,
            status: "ativo",
            criadoEm: serverTimestamp()
          });

          await signOut(secondaryAuth);
          alert("Responsável criado com sucesso!");
        } finally {
          await deleteApp(secondaryApp);
        }
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
      await updateDoc(doc(db, "users", responsavel.id), { status: novoStatus });
      carregarDados();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
    }
  };

  const excluirResponsavel = async (responsavel: Responsavel) => {
    if (!confirm(`Tem certeza que deseja excluir ${responsavel.nome}?`)) return;
    try {
      await deleteDoc(doc(db, "users", responsavel.id));
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
              setWhatsapp(resp.whatsapp);
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
          <button onClick={() => excluirResponsavel(resp)} className="p-2 text-red-600 hover:bg-red-50 rounded">
            <Trash2 size={18} />
          </button>
        </td>
      </tr>
    ));
  }

  return (
    <div className="space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      
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
              <input type="text" placeholder="WhatsApp (com DDD)" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="w-full border p-2 rounded" />
              
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
    </div>
  );
}
