"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/app/lib/firebase";
import { collection, query, where, orderBy, getDocs, limit } from "firebase/firestore";
import { 
  Search, Download, MessageCircle, Mail, FileText, ArrowLeft, 
  Calendar, Eye, Share2, Printer, X
} from "lucide-react";
import Navbar from "@/components/Navbar"; 

// --- INTERFACES ---
interface Recibo {
  id: string;
  protocolo: string;
  moradorNome: string;
  apartamento: string;
  blocoNome?: string;
  dataRetirada?: any;
  status: string;
  reciboUrl?: string;
  pdfUrl?: string;
  telefoneMorador?: string;
  emailMorador?: string; 
  quemRetirouNome?: string;
  quemRetirouDoc?: string;
}

interface Props {
  voltarUrl: string;
  tituloPerfil: string;
}

// --- COMPONENTE MODAL DE 2ª VIA ---
const ModalSegundaVia = ({ 
  isOpen, 
  onClose, 
  recibo, 
  tituloPerfil 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  recibo: Recibo | null; 
  tituloPerfil: string;
}) => {
  if (!isOpen || !recibo) return null;

  // Definição dos links
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const linkCompartilhamento = `${origin}/ver/${recibo.id}`;
  const linkArquivo = recibo.reciboUrl || recibo.pdfUrl || "";

  // Formatação da Data
  const getDataFormatada = () => {
    if (!recibo.dataRetirada) return "Data não informada";
    // Verifica se é Timestamp do Firestore ou Date normal
    const seconds = recibo.dataRetirada.seconds;
    const date = seconds ? new Date(seconds * 1000) : new Date(recibo.dataRetirada);
    
    return date.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Lógica WhatsApp Corrigida e Ampliada
  const handleWhatsApp = () => {
    // Garante que estamos trabalhando com string
    const rawPhone = String(recibo.telefoneMorador || "").trim();

    // 1. Validação inicial
    if (!rawPhone || rawPhone === "" || rawPhone === "undefined" || rawPhone === "null") {
      alert("O telefone do morador não consta neste registro de correspondência.");
      return;
    }
    
    // 2. Limpeza (remove tudo que não é número)
    let phone = rawPhone.replace(/\D/g, "");

    // 3. Validação pós-limpeza (precisa ter pelo menos 10 dígitos: DDD + Número)
    if (phone.length < 10) {
      alert(`Número de telefone inválido ou incompleto: ${rawPhone}`);
      return;
    }

    // 4. Remove zero à esquerda (ex: 01199...)
    if (phone.startsWith("0")) {
      phone = phone.substring(1);
    }

    // 5. Adiciona DDI 55 se for um número local (10 ou 11 dígitos)
    if (phone.length >= 10 && phone.length <= 11) {
      phone = `55${phone}`;
    }

    const dataFormatada = getDataFormatada();
    
    const msg = `*AVISO DE RETIRADA*

Olá, *${recibo.moradorNome}*!
Unidade: ${recibo.apartamento} ${recibo.blocoNome ? `(${recibo.blocoNome})` : ''}

Sua correspondência foi entregue
━━━━━━━━━━━━━━━━
│ *PROTOCOLO: ${recibo.protocolo}*
│ Status:  ENTREGUE
│ Retirado por: ${recibo.quemRetirouNome || 'Não informado'}
│ Data: ${dataFormatada}
━━━━━━━━━━━━━━━━

Se você não reconhece esta retirada, entre em contato com a portaria imediatamente.

 Acesse o recibo digital:
${linkCompartilhamento}`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Lógica E-mail
  const handleEmail = () => {
    const subject = `2ª Via de Recibo - Protocolo ${recibo.protocolo}`;
    const body = `Olá ${recibo.moradorNome},\n\nSegue o link do seu recibo de retirada: ${linkCompartilhamento}`;
    window.location.href = `mailto:${recibo.emailMorador || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Lógica Imprimir/PDF
  const handleImprimir = () => {
    if (linkArquivo) window.open(linkArquivo, "_blank");
    else alert("Arquivo PDF não disponível para impressão.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
        
        {/* Cabeçalho do Modal */}
        <div className="bg-gradient-to-r from-[#057321] to-[#046119] p-6 text-center relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
            <Share2 className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white">2ª Via do Recibo</h2>
          <p className="text-green-100 text-sm mt-1">Protocolo #{recibo.protocolo}</p>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-gray-600 text-sm">Escolha como deseja compartilhar ou visualizar o recibo de:</p>
            <p className="text-gray-900 font-bold text-lg mt-1">{recibo.moradorNome}</p>
            <p className="text-gray-500 text-xs">Apto {recibo.apartamento} {recibo.blocoNome && `- ${recibo.blocoNome}`}</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button 
              onClick={handleWhatsApp}
              className="flex items-center justify-center gap-3 w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all shadow-sm hover:shadow-md"
            >
              <MessageCircle size={20} /> Enviar via WhatsApp
            </button>

            <button 
              onClick={handleEmail}
              className="flex items-center justify-center gap-3 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-sm hover:shadow-md"
            >
              <Mail size={20} /> Enviar via E-mail
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleImprimir}
                className="flex items-center justify-center gap-2 w-full py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-semibold transition-all shadow-sm hover:shadow-md"
              >
                <Printer size={20} /> Imprimir
              </button>
              <button 
                onClick={handleImprimir}
                className="flex items-center justify-center gap-2 w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition-all shadow-sm hover:shadow-md"
              >
                <Download size={20} /> Baixar PDF
              </button>
            </div>
          </div>
        </div>

        {/* Rodapé Modal */}
        <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
          >
            Fechar janela
          </button>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL (LÓGICA DO HISTÓRICO) ---
export default function HistoricoRetiradas({ voltarUrl, tituloPerfil }: Props) {
  const router = useRouter();
  const [recibos, setRecibos] = useState<Recibo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  // Controle do Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRecibo, setSelectedRecibo] = useState<Recibo | null>(null);

  useEffect(() => {
    carregarHistorico();
  }, []);

  const carregarHistorico = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, "correspondencias"),
        where("status", "==", "retirada"),
        orderBy("retiradoEm", "desc"),
        limit(100)
      );

      const snapshot = await getDocs(q);
      const lista = snapshot.docs.map((doc) => {
        const data = doc.data();

        // TENTATIVA DE ENCONTRAR O TELEFONE EM MÚLTIPLOS CAMPOS
        // Isso resolve o problema se o campo tiver nomes diferentes no BD
        const telefoneEncontrado = 
          data.moradorWhatsapp || 
          data.moradorTelefone || 
          data.whatsapp || 
          data.telefone || 
          data.celular || 
          data.phone ||
          "";

        return {
          id: doc.id,
          protocolo: data.protocolo,
          moradorNome: data.moradorNome,
          apartamento: data.apartamento,
          blocoNome: data.blocoNome,
          dataRetirada: data.retiradoEm,
          status: data.status,
          reciboUrl: data.reciboUrl || data.pdfUrl,
          // Garante que seja string para evitar erros
          telefoneMorador: String(telefoneEncontrado), 
          emailMorador: data.moradorEmail || "",
          quemRetirouNome: data.retiradoPorNome || data.moradorNome,
        } as Recibo;
      });

      setRecibos(lista);
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirModal = (item: Recibo) => {
    setSelectedRecibo(item);
    setModalOpen(true);
  };

  const handleVisualizarDireto = (url?: string) => {
    if (url) window.open(url, "_blank");
    else alert("Recibo não disponível.");
  };

  const filtrados = recibos.filter((r) => {
    const textoBusca = busca.toLowerCase();
    return (
      r.protocolo?.toLowerCase().includes(textoBusca) ||
      r.moradorNome?.toLowerCase().includes(textoBusca) ||
      r.apartamento?.toLowerCase().includes(textoBusca) ||
      (r.blocoNome && r.blocoNome.toLowerCase().includes(textoBusca))
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <ModalSegundaVia 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        recibo={selectedRecibo}
        tituloPerfil={tituloPerfil}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        
        <button 
          onClick={() => router.push(voltarUrl)}
          className="group flex items-center gap-3 bg-white text-gray-700 px-6 py-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:scale-[1.02] hover:border-[#057321] hover:text-[#057321] transition-all duration-200 font-bold mb-10 text-lg"
        >
          <ArrowLeft 
            size={24} 
            className="text-gray-500 group-hover:text-[#057321] transition-colors" 
          />
          Voltar para Dashboard
        </button>

        {/* Cabeçalho */}
        <div className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-[#057321] rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="bg-[#057321] text-white p-4 rounded-xl shadow-md flex-shrink-0">
              <FileText size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Histórico de Recibos</h1>
              <p className="text-gray-600">Consulte e reenvie comprovantes de retirada (2ª Via)</p>
            </div>
          </div>
        </div>

        {/* Busca */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6 border-2 border-gray-100">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="text-gray-400" size={20} />
            </div>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por Protocolo, Nome do Morador ou Unidade (Ex: 101)"
              className="pl-12 w-full border-2 border-gray-300 rounded-lg py-3.5 focus:border-[#057321] focus:ring-2 focus:ring-[#057321]/20 transition-all outline-none text-base"
            />
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Carregando histórico...</div>
          ) : filtrados.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              Nenhum recibo encontrado com os critérios de busca.
            </div>
          ) : (
            <div>
              {/* Versão Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gradient-to-r from-[#057321] to-[#046119] text-white">
                    <tr>
                      <th className="px-6 py-4 font-bold tracking-wide">Retirado Em</th>
                      <th className="px-6 py-4 font-bold tracking-wide">Protocolo</th>
                      <th className="px-6 py-4 font-bold tracking-wide">Morador / Unidade</th>
                      <th className="px-6 py-4 font-bold tracking-wide">Retirado Por</th>
                      <th className="px-6 py-4 text-center font-bold tracking-wide">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtrados.map((item) => {
                      const seconds = item.dataRetirada?.seconds;
                      const date = seconds ? new Date(seconds * 1000) : new Date();
                      const dataFormatada = date.toLocaleString('pt-BR', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit'
                      });

                      return (
                        <tr key={item.id} className="hover:bg-green-50 transition-colors duration-150 border-b border-gray-100">
                          <td className="px-6 py-4 text-gray-600 flex items-center gap-2">
                            <Calendar size={16} className="text-gray-400" />
                            {dataFormatada}
                          </td>
                          <td className="px-6 py-4 font-bold text-[#057321] text-base">
                            #{item.protocolo}
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-gray-900">{item.moradorNome}</p>
                            <p className="text-xs text-gray-500">
                              {item.apartamento} {item.blocoNome ? `- ${item.blocoNome}` : ""}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {item.quemRetirouNome}
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="flex justify-center items-center gap-3">
                              <button
                                onClick={() => handleVisualizarDireto(item.reciboUrl)}
                                className="flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg transition-all font-bold text-xs border border-orange-200"
                                title="Visualizar Recibo"
                              >
                                <Eye size={18} /> Visualizar
                              </button>

                              <button
                                onClick={() => handleAbrirModal(item)}
                                className="flex items-center gap-2 px-4 py-2 bg-[#057321] text-white hover:bg-[#046119] rounded-lg transition-all font-bold text-xs shadow-sm hover:shadow-md"
                                title="Opções de 2ª Via"
                              >
                                <Share2 size={18} /> 2ª Via
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Versão Mobile */}
              <div className="md:hidden flex flex-col gap-4 p-4 bg-gray-50">
                {filtrados.map((item) => {
                  const seconds = item.dataRetirada?.seconds;
                  const date = seconds ? new Date(seconds * 1000) : new Date();
                  const dataFormatada = date.toLocaleString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: '2-digit',
                      hour: '2-digit', minute: '2-digit'
                  });

                  return (
                    <div key={item.id} className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
                      <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
                          <span className="font-bold text-[#057321] text-lg">#{item.protocolo}</span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar size={12} /> {dataFormatada}
                          </span>
                      </div>

                      <div className="mb-3">
                        <p className="text-sm font-bold text-gray-800">{item.moradorNome}</p>
                        <p className="text-xs text-gray-500">
                           Apto {item.apartamento} {item.blocoNome ? `- ${item.blocoNome}` : ""}
                        </p>
                      </div>

                      <div className="mb-4">
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Retirado por</p>
                        <p className="text-sm text-gray-700">{item.quemRetirouNome}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleVisualizarDireto(item.reciboUrl)}
                          className="flex items-center justify-center gap-2 px-3 py-2.5 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg font-bold text-sm"
                        >
                          <Eye size={18} /> Visualizar
                        </button>

                        <button
                          onClick={() => handleAbrirModal(item)}
                          className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#057321] text-white hover:bg-[#046119] rounded-lg font-bold text-sm"
                        >
                          <Share2 size={18} /> 2ª Via
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}