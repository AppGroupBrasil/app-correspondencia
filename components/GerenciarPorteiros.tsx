"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Edit2, Trash2, UserCheck, UserX, Phone, Mail, Plus, X, Search, 
  FileText, FileSpreadsheet, XCircle 
} from "lucide-react";
import { db, auth } from "@/app/lib/firebase";
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
  getDoc,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { useAuth } from "@/hooks/useAuth";
import BotaoVoltar from "@/components/BotaoVoltar";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Props {
  condominioId?: string;
}

interface Porteiro {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  status: "ativo" | "inativo";
  criadoEm?: any;
  uid?: string;
}

export default function GerenciarPorteiros({ condominioId: adminCondominioId }: Props) {
  const { user } = useAuth();
  const [fetchedCondominioId, setFetchedCondominioId] = useState<string>("");

  const [porteiros, setPorteiros] = useState<Porteiro[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [modalAberto, setModalAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativo" | "inativo">("todos");

  // Estados do formulário
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [porteiroEditando, setPorteiroEditando] = useState<Porteiro | null>(null);

  const targetCondominioId = adminCondominioId || user?.condominioId || fetchedCondominioId;
  const backRoute = "/dashboard-responsavel";

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
      carregarPorteiros();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetCondominioId]);

  const carregarPorteiros = async () => {
    if (!targetCondominioId) return;
    try {
      setLoading(true);
      const q = query(
        collection(db, "users"),
        where("role", "==", "porteiro"),
        where("condominioId", "==", targetCondominioId)
      );
      const snapshot = await getDocs(q);

      const lista = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as Porteiro[];

      // Ordenação Alfabética
      lista.sort((a, b) => a.nome.localeCompare(b.nome));

      setPorteiros(lista);
    } catch (err) {
      console.error("Erro ao carregar porteiros:", err);
      alert("Erro ao carregar lista de porteiros.");
    } finally {
      setLoading(false);
    }
  };

  const salvarPorteiro = async () => {
    if (!targetCondominioId) return alert("Erro: Condomínio não identificado.");
    
    if (!nome.trim()) return alert("Nome é obrigatório");
    if (!email.trim() || !email.includes("@")) return alert("Email válido é obrigatório");
    if (!whatsapp.trim()) return alert("WhatsApp é obrigatório");

    if (!porteiroEditando) {
      if (!senha || senha.length < 6) return alert("Senha deve ter no mínimo 6 caracteres");
      if (senha !== confirmarSenha) return alert("As senhas não conferem");
    }

    setLoading(true);

    try {
      if (porteiroEditando) {
        const dadosAtualizacao: any = {
          nome,
          email,
          whatsapp,
          atualizadoEm: serverTimestamp(),
        };

        if (senha) {
             alert("A senha de acesso não foi alterada (requer redefinição por email). Apenas os dados cadastrais foram salvos.");
        }

        await updateDoc(doc(db, "users", porteiroEditando.id), dadosAtualizacao);
        alert("Dados do porteiro atualizados!");
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        const uid = userCredential.user.uid;

        await setDoc(doc(db, "users", uid), {
          uid,
          nome,
          email,
          whatsapp,
          role: "porteiro",
          condominioId: targetCondominioId,
          status: "ativo",
          criadoEm: serverTimestamp(),
        });

        await signOut(auth);
        alert("Porteiro cadastrado com sucesso! Por segurança, você foi desconectado. Faça login novamente.");
        window.location.href = "/login";
        return;
      }

      limparFormulario();
      setModalAberto(false);
      carregarPorteiros();
    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      if (err.code === "auth/email-already-in-use") alert("Este email já está em uso.");
      else alert("Erro ao salvar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const alternarStatus = async (porteiro: Porteiro) => {
    try {
      const novoStatus = porteiro.status === "ativo" ? "inativo" : "ativo";
      await updateDoc(doc(db, "users", porteiro.id), {
        status: novoStatus,
        atualizadoEm: serverTimestamp(),
      });
      carregarPorteiros();
    } catch (err) {
      console.error("Erro status:", err);
      alert("Erro ao alterar status.");
    }
  };

  const excluirPorteiro = async (porteiro: Porteiro) => {
    if (!confirm(`Deseja realmente excluir "${porteiro.nome}"? O acesso será removido.`)) return;
    try {
      await deleteDoc(doc(db, "users", porteiro.id));
      carregarPorteiros();
    } catch (err) {
      console.error("Erro exclusão:", err);
      alert("Erro ao excluir porteiro.");
    }
  };

  const limparFormulario = () => {
    setNome("");
    setEmail("");
    setSenha("");
    setConfirmarSenha("");
    setWhatsapp("");
    setPorteiroEditando(null);
  };

  const abrirModalNovo = () => {
    limparFormulario();
    setModalAberto(true);
  };

  const editarPorteiro = (p: Porteiro) => {
    setPorteiroEditando(p);
    setNome(p.nome);
    setEmail(p.email);
    setWhatsapp(p.whatsapp);
    setSenha("");
    setConfirmarSenha("");
    setModalAberto(true);
  };

  const porteirosFiltrados = useMemo(() => {
    return porteiros.filter((p) => {
      const termo = busca.toLowerCase();
      const matchBusca =
        p.nome.toLowerCase().includes(termo) ||
        p.email.toLowerCase().includes(termo) ||
        p.whatsapp.includes(termo);

      const matchStatus = filtroStatus === "todos" || p.status === filtroStatus;
      return matchBusca && matchStatus;
    });
  }, [porteiros, busca, filtroStatus]);

  // --- EXPORTAÇÃO ---
  const gerarPDF = () => {
    const docPdf = new jsPDF();
    docPdf.text("Relatório de Porteiros", 14, 15);
    docPdf.setFontSize(10);
    docPdf.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 22);

    const body = porteirosFiltrados.map((p) => [
      p.nome,
      p.email,
      p.whatsapp,
      p.status.toUpperCase(),
    ]);

    autoTable(docPdf, {
      head: [["Nome", "Email", "WhatsApp", "Status"]],
      body,
      startY: 28,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [5, 115, 33] }
    });

    docPdf.save("porteiros.pdf");
  };

  const gerarExcel = () => {
    const dadosExcel = porteirosFiltrados.map((p) => ({
      Nome: p.nome,
      Email: p.email,
      WhatsApp: p.whatsapp,
      Status: p.status.toUpperCase(),
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Porteiros");
    XLSX.writeFile(wb, "porteiros.xlsx");
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
            <h3 className="text-lg font-bold text-gray-900">Nenhum Condomínio Identificado</h3>
            <p className="text-gray-500 mt-1">Não foi possível carregar os dados.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {!adminCondominioId && (
        <div className="w-fit">
            <BotaoVoltar url={backRoute} />
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
             Gerenciar Porteiros
          </h2>
          <p className="text-gray-600 text-sm">Controle de acesso e cadastro da portaria</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
             <button
                onClick={gerarPDF}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-sm transition-colors"
             >
                <FileText size={20} /> <span className="md:hidden lg:inline">PDF</span>
             </button>

             <button
                onClick={gerarExcel}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-sm transition-colors"
             >
                <FileSpreadsheet size={20} /> <span className="md:hidden lg:inline">Excel</span>
             </button>

            <button
              onClick={abrirModalNovo}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#057321] text-white rounded-lg hover:bg-[#046119] font-bold shadow-sm transition-colors"
            >
              <Plus size={20} />
              Novo Porteiro
            </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Porteiro</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Nome, email ou WhatsApp..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-[#057321] focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Status</label>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as any)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321] focus:outline-none bg-white"
          >
            <option value="todos">Todos</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
      </div>

      {/* Lista Mobile */}
      <div className="md:hidden space-y-4">
        {porteirosFiltrados.length === 0 ? (
           <div className="text-center p-8 bg-white rounded-xl text-gray-500 border border-gray-200">Nenhum porteiro encontrado</div>
        ) : (
           porteirosFiltrados.map((porteiro) => (
             <div key={porteiro.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                   <div>
                      <h3 className="font-bold text-gray-900 text-lg">{porteiro.nome}</h3>
                      <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                         <Mail size={14} /> <span className="break-all">{porteiro.email}</span>
                      </div>
                   </div>
                   <span className={`px-2 py-1 text-xs font-bold rounded-full ${porteiro.status === "ativo" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {porteiro.status === "ativo" ? "Ativo" : "Inativo"}
                   </span>
                </div>

                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg flex items-center gap-2">
                   <Phone size={16} className="text-gray-400" />
                   <span className="font-medium">{porteiro.whatsapp}</span>
                </div>

                <div className="flex gap-2 mt-1">
                   <button onClick={() => editarPorteiro(porteiro)} className="flex-1 flex items-center justify-center gap-2 p-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors">
                      <Edit2 size={16} /> Editar
                   </button>
                   <button onClick={() => alternarStatus(porteiro)} className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg font-medium transition-colors ${porteiro.status === "ativo" ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}>
                      {porteiro.status === "ativo" ? <UserX size={16} /> : <UserCheck size={16} />}
                      {porteiro.status === "ativo" ? "Desativar" : "Ativar"}
                   </button>
                   <button onClick={() => excluirPorteiro(porteiro)} className="flex items-center justify-center p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                      <Trash2 size={18} />
                   </button>
                </div>
             </div>
           ))
        )}
      </div>

      {/* Tabela Desktop */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
         <div className="overflow-x-auto">
            <table className="w-full">
               <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                     <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nome</th>
                     <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                     <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">WhatsApp</th>
                     <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                     <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
               </thead>
               <tbody className="bg-white divide-y divide-gray-200">
                  {porteirosFiltrados.length === 0 ? (
                     <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Nenhum porteiro encontrado</td></tr>
                  ) : (
                     porteirosFiltrados.map((porteiro) => (
                        <tr key={porteiro.id} className="hover:bg-gray-50 transition">
                           <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{porteiro.nome}</td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{porteiro.email}</td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{porteiro.whatsapp}</td>
                           <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-0.5 inline-flex text-xs font-bold rounded-full ${porteiro.status === "ativo" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                 {porteiro.status === "ativo" ? "Ativo" : "Inativo"}
                              </span>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              <button onClick={() => editarPorteiro(porteiro)} className="text-blue-600 hover:text-blue-900 font-bold transition-colors">Editar</button>
                              <button onClick={() => alternarStatus(porteiro)} className="text-yellow-600 hover:text-yellow-900 font-bold transition-colors">{porteiro.status === "ativo" ? "Desativar" : "Ativar"}</button>
                              <button onClick={() => excluirPorteiro(porteiro)} className="text-red-600 hover:text-red-900 font-bold transition-colors">Excluir</button>
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
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b pb-2">
              <h3 className="text-lg font-bold text-gray-800">{porteiroEditando ? "Editar Porteiro" : "Novo Porteiro"}</h3>
              <button onClick={() => { setModalAberto(false); limparFormulario(); }} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321] outline-none" placeholder="João Silva" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321] outline-none" placeholder="porteiro@exemplo.com" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp *</label>
                <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321] outline-none" placeholder="(81) 99999-9999" />
              </div>

              {!porteiroEditando && (
                 <>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321] outline-none" placeholder="••••••" />
                        <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha *</label>
                        <input type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#057321] outline-none" placeholder="••••••" />
                    </div>
                 </>
              )}
            </div>

            <div className="flex gap-3 mt-6 pt-4">
              <button onClick={() => { setModalAberto(false); limparFormulario(); }} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors">Cancelar</button>
              <button onClick={salvarPorteiro} disabled={loading} className="flex-1 px-4 py-2 bg-[#057321] text-white rounded-lg hover:bg-[#046119] font-bold disabled:opacity-50 transition-colors shadow-sm">
                 {loading ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}