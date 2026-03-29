"use client";

import { useEffect, useState } from "react";
import { db } from "@/app/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Check, X, Trash2, Edit, UserCheck, Ban, Save, XCircle } from "lucide-react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";

import BotaoVoltar from "@/components/BotaoVoltar";
import BotaoLinkCadastro from "@/components/BotaoLinkCadastro";
import { buildAuthenticatedJsonHeaders } from '@/app/lib/client-auth';

interface Morador {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  perfil: string;
  condominioId: string;
  condominioNome?: string;
  blocoId?: string;
  blocoNome?: string;
  unidadeId?: string;
  unidadeNome?: string;
  numeroUnidade?: string;
  ativo: boolean;
  aprovado: boolean;
  criadoEm: any;
  [key: string]: any;
}

interface Bloco {
  id: string;
  nome: string;
}

const PERFIS = [
  { value: "proprietario", label: "Proprietário" },
  { value: "locatario", label: "Locatário" },
  { value: "dependente", label: "Dependente" },
  { value: "funcionario", label: "Funcionário" },
  { value: "outro", label: "Outro" },
];

export default function AprovarMoradores({ condominioId: adminCondominioId }: { condominioId?: string }) {
  const { user } = useAuth();
  
  const [fetchedCondominioId, setFetchedCondominioId] = useState<string>("");
  const targetCondominioId = adminCondominioId || user?.condominioId || fetchedCondominioId;

  const [moradoresPendentes, setMoradoresPendentes] = useState<Morador[]>([]);
  const [moradoresAprovados, setMoradoresAprovados] = useState<Morador[]>([]);
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"pendentes" | "aprovados">("pendentes");
  
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [moradorEditando, setMoradorEditando] = useState<Morador | null>(null);
  
  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editPerfil, setEditPerfil] = useState("");
  const [editBlocoId, setEditBlocoId] = useState("");
  const [editUnidade, setEditUnidade] = useState("");

  useEffect(() => {
    async function garantirCondominioId() {
      if (user?.uid && !user.condominioId && !adminCondominioId) {
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) {
            setFetchedCondominioId(snap.data().condominioId);
          }
        } catch (error) {
          console.error("Erro ao buscar detalhes do usuário", error);
        }
      }
    }
    garantirCondominioId();
  }, [user, adminCondominioId]);

  useEffect(() => {
    if (targetCondominioId) {
      carregarDados();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetCondominioId]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const qBlocos = query(collection(db, "blocos"), where("condominioId", "==", targetCondominioId));
      const snapBlocos = await getDocs(qBlocos);
      const listaBlocos = snapBlocos.docs.map((d) => ({ id: d.id, nome: d.data().nome }));
      setBlocos(listaBlocos.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { numeric: true })));

      const qUsers = query(
        collection(db, "users"),
        where("condominioId", "==", targetCondominioId),
        where("role", "==", "morador")
      );
      const snapUsers = await getDocs(qUsers);
      
      const pendentes: Morador[] = [];
      const aprovados: Morador[] = [];

      snapUsers.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() } as Morador;
        if (data.aprovado === true) {
          aprovados.push(data);
        } else {
          pendentes.push(data);
        }
      });

      pendentes.sort((a, b) => (a.criadoEm?.toMillis() || 0) - (b.criadoEm?.toMillis() || 0));
      aprovados.sort((a, b) => (b.criadoEm?.toMillis() || 0) - (a.criadoEm?.toMillis() || 0));

      setMoradoresPendentes(pendentes);
      setMoradoresAprovados(aprovados);

    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      alert("Erro ao carregar lista de moradores.");
    } finally {
      setLoading(false);
    }
  };

  const enviarEmailAprovacao = async (morador: Morador) => {
    try {
      const headers = await buildAuthenticatedJsonHeaders();
      await fetch('/api/email', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tipo: 'aprovacao-morador',
          destinatario: morador.email,
          condominioId: morador.condominioId,
          dados: {
            nomeMorador: morador.nome,
            condominioNome: morador.condominioNome || "Seu Condomínio",
            email: morador.email,
            loginUrl: `${window.location.origin}/login`,
          },
        }),
      });
    } catch (error) {
      console.error('Erro ao enviar email (silencioso):', error);
    }
  };

  const aprovarMorador = async (morador: Morador) => {
    if (!confirm(`Confirmar aprovação de ${morador.nome}?`)) return;

    try {
      setProcessandoId(morador.id);
      await updateDoc(doc(db, "users", morador.id), {
        aprovado: true,
        ativo: true,
        aprovadoEm: serverTimestamp(),
        aprovadoPor: user?.uid
      });
      enviarEmailAprovacao(morador);
      alert("✅ Morador aprovado com sucesso!");
      carregarDados();
    } catch (err) {
      console.error(err);
      alert("Erro ao aprovar morador.");
    } finally {
      setProcessandoId(null);
    }
  };

  const rejeitarMorador = async (morador: Morador) => {
    if (!confirm(`Rejeitar cadastro de ${morador.nome}? Essa ação não pode ser desfeita.`)) return;
    try {
      setProcessandoId(morador.id);
      await updateDoc(doc(db, "users", morador.id), {
        aprovado: false,
        ativo: false,
        rejeitado: true,
        rejeitadoEm: serverTimestamp(),
        rejeitadoPor: user?.uid
      });
      alert("Cadastro rejeitado.");
      carregarDados();
    } catch (err) {
      alert("Erro ao rejeitar.");
    } finally {
      setProcessandoId(null);
    }
  };

  const excluirMorador = async (morador: Morador) => {
    if (!confirm(`EXCLUIR DEFINITIVAMENTE ${morador.nome}?`)) return;
    try {
      setProcessandoId(morador.id);
      await deleteDoc(doc(db, "users", morador.id));
      carregarDados();
    } catch (err) {
      alert("Erro ao excluir.");
    } finally {
      setProcessandoId(null);
    }
  };

  const toggleStatus = async (morador: Morador) => {
    try {
      await updateDoc(doc(db, "users", morador.id), { ativo: !morador.ativo });
      carregarDados();
    } catch { 
      alert("Erro ao alterar status."); 
    }
  };

  const abrirModalEditar = (morador: Morador) => {
    setMoradorEditando(morador);
    setEditNome(morador.nome);
    setEditEmail(morador.email);
    setEditWhatsapp(morador.whatsapp);
    setEditPerfil(morador.perfil);
    setEditBlocoId(morador.blocoId || "");
    setEditUnidade(morador.numeroUnidade || morador.unidadeNome || "");
    setModalEditarAberto(true);
  };

  const salvarEdicao = async () => {
    if (!moradorEditando) return;
    try {
      const blocoSelecionado = blocos.find(b => b.id === editBlocoId);
      const updates: any = {
        nome: editNome,
        email: editEmail,
        whatsapp: editWhatsapp,
        perfil: editPerfil,
        blocoId: editBlocoId,
        blocoNome: blocoSelecionado?.nome || "",
        numeroUnidade: editUnidade,
        unidadeNome: editUnidade,
        atualizadoEm: serverTimestamp()
      };
      await updateDoc(doc(db, "users", moradorEditando.id), updates);
      setModalEditarAberto(false);
      setMoradorEditando(null);
      alert("Dados atualizados!");
      carregarDados();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar edição.");
    }
  };

  if (loading && !targetCondominioId) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#057321] mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!loading && !targetCondominioId) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
            <XCircle className="text-red-500 mb-2" size={40} />
            <h3 className="text-lg font-bold text-gray-900">Condomínio não identificado</h3>
            <p className="text-gray-500 mt-1">Não foi possível carregar os dados.</p>
        </div>
    );
  }

  const listaAtual = filtro === "pendentes" ? moradoresPendentes : moradoresAprovados;

  return (
    <div className="space-y-6">
      
      {!adminCondominioId && (
        <div className="w-fit mb-6">
            <BotaoVoltar url="/dashboard-responsavel" />
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Aprovar Moradores</h1>
           <p className="text-gray-600 text-sm mt-1">Gerencie solicitações de cadastro e acessos</p>
        </div>
        <BotaoLinkCadastro />
      </div>

      {/* Abas */}
      <div className="bg-white p-1 rounded-lg shadow-sm border border-gray-200 inline-flex w-full sm:w-auto">
        <button
          onClick={() => setFiltro("pendentes")}
          className={`flex-1 sm:flex-none px-6 py-2 text-sm font-medium rounded-md transition-all ${
            filtro === "pendentes"
              ? "bg-yellow-50 text-yellow-700 shadow-sm border border-yellow-100"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          Pendentes
          {moradoresPendentes.length > 0 && (
             <span className="ml-2 bg-yellow-200 text-yellow-800 text-xs px-2 py-0.5 rounded-full">{moradoresPendentes.length}</span>
          )}
        </button>
        <button
          onClick={() => setFiltro("aprovados")}
          className={`flex-1 sm:flex-none px-6 py-2 text-sm font-medium rounded-md transition-all ${
            filtro === "aprovados"
              ? "bg-green-50 text-green-700 shadow-sm border border-green-100"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          Aprovados
          <span className="ml-2 bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{moradoresAprovados.length}</span>
        </button>
      </div>

      {/* Lista */}
      <div className="space-y-4">
        {listaAtual.length === 0 ? (
           <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
              <p className="text-gray-500 text-lg">
                 {filtro === "pendentes" ? "✅ Nenhuma solicitação pendente." : "Nenhum morador aprovado ainda."}
              </p>
           </div>
        ) : (
           listaAtual.map((m) => (
             <div key={m.id} className={`bg-white rounded-xl shadow-sm p-6 border border-gray-200 transition-shadow hover:shadow-md ${!m.aprovado ? 'border-l-4 border-l-yellow-500' : ''}`}>
                <div className="grid md:grid-cols-2 gap-6">
                   <div>
                      <div className="flex items-center gap-2 mb-2">
                         <h3 className="text-lg font-bold text-gray-900">{m.nome}</h3>
                         {m.aprovado && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${m.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                               {m.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                         )}
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                         <p className="flex items-center gap-2"><span className="font-semibold text-gray-700 w-20">Email:</span> {m.email}</p>
                         <p className="flex items-center gap-2"><span className="font-semibold text-gray-700 w-20">WhatsApp:</span> {m.whatsapp}</p>
                         <p className="flex items-center gap-2"><span className="font-semibold text-gray-700 w-20">Perfil:</span> <span className="capitalize bg-gray-100 px-2 rounded">{m.perfil}</span></p>
                      </div>
                   </div>

                   <div className="flex flex-col justify-between">
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4 md:mb-0">
                         <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Dados da Unidade</h4>
                         <div className="flex justify-between text-sm gap-4">
                            <div>
                               <span className="block text-gray-500 text-xs">Bloco</span>
                               <span className="font-bold text-gray-800">{m.blocoNome || "-"}</span>
                            </div>
                            <div>
                               <span className="block text-gray-500 text-xs">Unidade</span>
                               <span className="font-bold text-gray-800">{m.numeroUnidade || m.unidadeNome || "-"}</span>
                            </div>
                            <div className="text-right">
                               <span className="block text-gray-500 text-xs">Data Cadastro</span>
                               <span className="text-gray-800 font-medium text-xs">
                                  {m.criadoEm?.toDate ? m.criadoEm.toDate().toLocaleDateString('pt-BR') : 'N/A'}
                               </span>
                            </div>
                         </div>
                      </div>

                      <div className="flex gap-2 justify-end mt-2">
                         <button
                            onClick={() => abrirModalEditar(m)}
                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                            title="Editar"
                         >
                            <Edit size={18} />
                         </button>

                         {!m.aprovado ? (
                            <>
                               <button
                                  onClick={() => aprovarMorador(m)}
                                  disabled={processandoId === m.id}
                                  className="flex items-center gap-2 px-4 py-2 bg-[#057321] text-white rounded-lg hover:bg-[#046119] font-bold shadow-sm disabled:opacity-50"
                               >
                                  {processandoId === m.id ? '...' : <><Check size={18} /> Aprovar</>}
                               </button>
                               <button
                                  onClick={() => rejeitarMorador(m)}
                                  disabled={processandoId === m.id}
                                  className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-100"
                                  title="Rejeitar"
                               >
                                  <X size={18} />
                               </button>
                            </>
                         ) : (
                            <>
                               <button
                                  onClick={() => toggleStatus(m)}
                                  className={`p-2 rounded-lg border transition-colors ${m.ativo ? 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100' : 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100'}`}
                                  title={m.ativo ? "Bloquear" : "Ativar"}
                               >
                                  {m.ativo ? <Ban size={18} /> : <UserCheck size={18} />}
                               </button>
                               <button
                                  onClick={() => excluirMorador(m)}
                                  className="p-2 text-gray-400 bg-gray-50 hover:bg-red-50 hover:text-red-600 rounded-lg border border-gray-100 transition-colors"
                                  title="Excluir Definitivamente"
                               >
                                  <Trash2 size={18} />
                               </button>
                            </>
                         )}
                      </div>
                   </div>
                </div>
             </div>
           ))
        )}
      </div>

      {/* Modal Editar */}
      {modalEditarAberto && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
                 <h3 className="text-lg font-bold text-gray-800">Editar Morador</h3>
                 <button onClick={() => setModalEditarAberto(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                    <input className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#057321] outline-none" value={editNome} onChange={e => setEditNome(e.target.value)} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#057321] outline-none" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                    <input className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#057321] outline-none" value={editWhatsapp} onChange={e => setEditWhatsapp(e.target.value)} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Bloco</label>
                       <select className="w-full border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-[#057321] outline-none" value={editBlocoId} onChange={e => setEditBlocoId(e.target.value)}>
                          <option value="">Selecione</option>
                          {blocos.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                       </select>
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                       <input className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-[#057321] outline-none" value={editUnidade} onChange={e => setEditUnidade(e.target.value)} />
                    </div>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
                    <select className="w-full border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-[#057321] outline-none" value={editPerfil} onChange={e => setEditPerfil(e.target.value)}>
                       {PERFIS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                 </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 flex gap-3 border-t border-gray-100">
                 <button onClick={() => setModalEditarAberto(false)} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-white transition-colors">Cancelar</button>
                 <button onClick={salvarEdicao} className="flex-1 py-2.5 bg-[#057321] text-white rounded-lg font-medium hover:bg-[#046019] transition-colors flex justify-center items-center gap-2 shadow-sm">
                    <Save size={18} /> Salvar
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}