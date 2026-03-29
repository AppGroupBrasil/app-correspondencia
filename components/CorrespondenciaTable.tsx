"use client";
import { useEffect, useMemo, useState } from "react";
import AssinaturaModal from "./AssinaturaModal";
import { Timestamp } from "firebase/firestore";
import { MessageCircle, Mail, FileText, CheckCircle } from "lucide-react";

export interface Linha {
  id: string;
  protocolo: string;
  moradorNome?: string;
  apartamento?: string;
  blocoNome?: string;
  condominioId: string;
  status: "pendente" | "retirada";
  imagemUrl?: string;
  pdfUrl?: string;
  reciboUrl?: string;
  criadoEm?: Timestamp;
  retiradoEm?: Timestamp;
  compartilhadoVia?: string[];
}

interface Props {
  dados: Linha[];
  onRetirar: (linha: Linha, moradorAssDataUrl: string, porteiroAssDataUrl?: string, salvarPadrao?: boolean) => Promise<{
    reciboUrl: string;
    whatsLink: string;
    mailtoLink: string;
  } | null>;
  carregando?: boolean;
  getPorteiroAssinaturaUrl: () => Promise<string | null>;
  onCompartilhar?: (id: string, via: "whatsapp" | "email", pdfUrl: string, protocolo: string, moradorNome: string) => Promise<void>;
  onAbrirModalRetirada?: (linha: Linha) => void;
}

export default function CorrespondenciaTable({ 
  dados, 
  onRetirar, 
  carregando, 
  getPorteiroAssinaturaUrl,
  onCompartilhar,
  onAbrirModalRetirada,
}: Props) {
  const [filtroStatus, setFiltroStatus] = useState<"" | "pendente" | "retirada">("");
  const [busca, setBusca] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [linhaSelecionada, setLinhaSelecionada] = useState<Linha | null>(null);
  const [porteiroAssUrl, setPorteiroAssUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const url = await getPorteiroAssinaturaUrl();
      setPorteiroAssUrl(url);
    })();
  }, [getPorteiroAssinaturaUrl]);

  const lista = useMemo(() => {
    return dados.filter((d) => {
      if (filtroStatus && d.status !== filtroStatus) return false;
      if (busca) {
        const alvo = `${d.protocolo} ${d.moradorNome || ""} ${d.apartamento || ""} ${d.blocoNome || ""}`.toLowerCase();
        if (!alvo.includes(busca.toLowerCase())) return false;
      }
      return true;
    });
  }, [dados, filtroStatus, busca]);

  const handleWhatsApp = async (linha: Linha) => {
    if (!linha.pdfUrl) {
      alert("PDF não disponível. Gere o PDF primeiro.");
      return;
    }

    const mensagem = `Olá ${linha.moradorNome}! Você tem uma correspondência aguardando retirada.\n\nProtocolo: #${linha.protocolo}\n\nVeja o comprovante: ${linha.pdfUrl}`;
    const whatsLink = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
    window.open(whatsLink, "_blank");

    if (onCompartilhar) {
      await onCompartilhar(linha.id, "whatsapp", linha.pdfUrl, linha.protocolo, linha.moradorNome || "");
    }
  };

  const handleEmail = async (linha: Linha) => {
    if (!linha.pdfUrl) {
      alert("PDF não disponível. Gere o PDF primeiro.");
      return;
    }

    const mensagem = `Olá ${linha.moradorNome}! Você tem uma correspondência aguardando retirada.\n\nProtocolo: #${linha.protocolo}\n\nVeja o comprovante: ${linha.pdfUrl}`;
    const mailtoLink = `mailto:?subject=Nova Correspondência - Protocolo ${linha.protocolo}&body=${encodeURIComponent(mensagem)}`;
    window.open(mailtoLink);

    if (onCompartilhar) {
      await onCompartilhar(linha.id, "email", linha.pdfUrl, linha.protocolo, linha.moradorNome || "");
    }
  };

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <input
          placeholder="Buscar por nome, protocolo, apto..."
          className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          className="border border-gray-300 rounded-lg px-4 py-2 bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as any)}
        >
          <option value="">Todos</option>
          <option value="pendente">Pendentes</option>
          <option value="retirada">Retiradas</option>
        </select>
      </div>

      {/* ============================================================
          VISUALIZAÇÃO MOBILE (CARDS)
         ============================================================ */}
      <div className="md:hidden grid grid-cols-1 gap-4">
        {lista.map((l) => {
          const foiCompartilhado = l.compartilhadoVia && l.compartilhadoVia.length > 0;
          
          return (
            <div 
              key={l.id} 
              className={`bg-white rounded-xl shadow-sm border p-4 flex flex-col gap-3 ${foiCompartilhado ? "border-l-4 border-l-green-500" : "border-l-4 border-l-gray-300"}`}
            >
              {/* Topo: Imagem e Infos */}
              <div className="flex gap-3">
                {/* Imagem */}
                <div className="shrink-0">
                  {l.imagemUrl ? (
                    <img src={l.imagemUrl} alt="" className="w-16 h-16 object-cover rounded-lg border bg-gray-50" />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-400">
                      <FileText size={24} />
                    </div>
                  )}
                </div>

                {/* Textos */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-gray-900 text-lg">#{l.protocolo}</span>
                    {l.status === "pendente" ? (
                      <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-bold">Pendente</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-bold">Retirada</span>
                    )}
                  </div>
                  <p className="text-gray-800 font-medium truncate">{l.moradorNome || "Sem nome"}</p>
                  <p className="text-gray-500 text-sm">{l.blocoNome || "-"} / {l.apartamento || "-"}</p>
                  
                  {foiCompartilhado && (
                    <div className="flex items-center gap-1 text-xs text-green-600 mt-1 font-medium">
                      <CheckCircle size={12} />
                      Enviado: {l.compartilhadoVia?.join(", ")}
                    </div>
                  )}
                </div>
              </div>

              {/* Barra de Ações (Ícones + Texto Embaixo) */}
              <div className="pt-3 border-t border-gray-100 grid grid-cols-4 gap-2">
                
                {/* WhatsApp */}
                {l.pdfUrl ? (
                  <button
                    onClick={() => handleWhatsApp(l)}
                    className="flex flex-col items-center justify-center py-2.5 bg-green-700 text-white rounded-lg active:bg-green-800 transition shadow-sm w-full"
                    title="WhatsApp"
                  >
                    <MessageCircle size={20} className="mb-1" />
                    <span className="text-[10px] font-bold leading-none">WhatsApp</span>
                  </button>
                ) : <div className="bg-gray-50 rounded-lg"></div>}

                {/* Email */}
                {l.pdfUrl ? (
                  <button
                    onClick={() => handleEmail(l)}
                    className="flex flex-col items-center justify-center py-2.5 bg-blue-600 text-white rounded-lg active:bg-blue-700 transition shadow-sm w-full"
                    title="Email"
                  >
                    <Mail size={20} className="mb-1" />
                    <span className="text-[10px] font-bold leading-none">E-mail</span>
                  </button>
                ) : <div className="bg-gray-50 rounded-lg"></div>}

                {/* PDF */}
                {l.pdfUrl ? (
                  <a 
                    href={l.pdfUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex flex-col items-center justify-center py-2.5 bg-red-500 text-white rounded-lg active:bg-red-600 transition shadow-sm w-full"
                    title="Ver PDF"
                  >
                    <FileText size={20} className="mb-1" />
                    <span className="text-[10px] font-bold leading-none">PDF</span>
                  </a>
                ) : <div className="bg-gray-50 rounded-lg"></div>}

                {/* Ação Principal: Retirada ou Recibo */}
                {l.status === "pendente" && onAbrirModalRetirada ? (
                  <button
                    onClick={() => onAbrirModalRetirada(l)}
                    className="flex flex-col items-center justify-center py-2.5 bg-gray-700 text-white rounded-lg active:bg-gray-800 transition shadow-sm w-full"
                    title="Registrar Retirada"
                  >
                    <CheckCircle size={20} className="mb-1" />
                    <span className="text-[10px] font-bold leading-none">Retirar</span>
                  </button>
                ) : l.reciboUrl ? (
                   <a 
                    href={l.reciboUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex flex-col items-center justify-center py-2.5 bg-gray-600 text-white rounded-lg active:bg-gray-700 transition shadow-sm w-full"
                    title="Ver Recibo"
                  >
                    <FileText size={20} className="mb-1" />
                    <span className="text-[10px] font-bold leading-none">Recibo</span>
                  </a>
                ) : <div className="bg-gray-50 rounded-lg"></div>} 
                
              </div>
            </div>
          );
        })}
        
        {!lista.length && (
          <div className="text-center py-10 bg-white rounded-xl border text-gray-500">
             {carregando ? "Carregando..." : "Nenhuma correspondência encontrada."}
          </div>
        )}
      </div>

      {/* ============================================================
          VISUALIZAÇÃO DESKTOP (TABELA)
         ============================================================ */}
      <div className="hidden md:block overflow-auto border rounded-lg shadow-sm bg-white">
        <table className="min-w-[900px] w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-3 font-semibold text-gray-600">Foto</th>
              <th className="text-left p-3 font-semibold text-gray-600">Protocolo</th>
              <th className="text-left p-3 font-semibold text-gray-600">Morador</th>
              <th className="text-left p-3 font-semibold text-gray-600">Bloco / Apto</th>
              <th className="text-left p-3 font-semibold text-gray-600">Status</th>
              <th className="text-left p-3 font-semibold text-gray-600">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lista.map((l) => {
              const foiCompartilhado = l.compartilhadoVia && l.compartilhadoVia.length > 0;
              
              return (
                <tr 
                  key={l.id} 
                  className={`hover:bg-gray-50 transition ${foiCompartilhado ? "bg-green-50/50" : ""}`}
                >
                  <td className="p-3">
                    {l.imagemUrl ? (
                      <img src={l.imagemUrl} alt="" className="w-14 h-14 object-cover rounded-lg border" />
                    ) : (
                      <div className="w-14 h-14 bg-gray-100 rounded-lg border flex items-center justify-center text-gray-300">
                        <FileText size={20} />
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-gray-800">#{l.protocolo}</div>
                    {foiCompartilhado && (
                      <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle size={12} />
                        Enviado: {l.compartilhadoVia?.join(", ")}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-gray-700 font-medium">{l.moradorNome || "-"}</td>
                  <td className="p-3 text-gray-600">{l.blocoNome || "-"} / {l.apartamento || "-"}</td>
                  <td className="p-3">
                    {l.status === "pendente" ? (
                      <span className="px-2 py-1 rounded-md bg-yellow-100 text-yellow-800 text-xs font-bold border border-yellow-200">Pendente</span>
                    ) : (
                      <span className="px-2 py-1 rounded-md bg-green-100 text-green-700 text-xs font-bold border border-green-200">Retirada</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {/* Botões Desktop */}
                      {l.pdfUrl && (
                        <button
                          onClick={() => handleWhatsApp(l)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white rounded hover:bg-green-800 transition text-sm font-medium"
                          title="WhatsApp"
                        >
                          <MessageCircle size={16} /> WhatsApp
                        </button>
                      )}
                      
                      {l.pdfUrl && (
                        <button
                          onClick={() => handleEmail(l)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-medium"
                          title="Email"
                        >
                          <Mail size={16} /> Email
                        </button>
                      )}
                      
                      {l.pdfUrl && (
                        <a 
                          href={l.pdfUrl} 
                          target="_blank" 
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition text-sm font-medium" 
                          rel="noreferrer"
                        >
                          <FileText size={16} /> PDF
                        </a>
                      )}
                      
                      {l.status === "pendente" && onAbrirModalRetirada && (
                        <button
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 text-white rounded hover:bg-gray-800 transition text-sm font-medium shadow-sm"
                          onClick={() => onAbrirModalRetirada(l)}
                        >
                          <CheckCircle size={16} /> Retirada
                        </button>
                      )}
                      
                      {l.status === "retirada" && l.reciboUrl && (
                        <a 
                          href={l.reciboUrl} 
                          target="_blank" 
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 transition text-sm font-medium" 
                          rel="noreferrer"
                        >
                          <FileText size={16} /> Recibo
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {!lista.length && (
              <tr>
                <td className="p-8 text-center text-gray-500" colSpan={6}>
                  {carregando ? "Carregando dados..." : "Nenhuma correspondência encontrada com estes filtros."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AssinaturaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        porteiroAssinaturaUrl={porteiroAssUrl || undefined}
        onConfirm={async (moradorData, porteiroData, salvarPadrao) => {
          if (!linhaSelecionada) return;
          const res = await onRetirar(linhaSelecionada, moradorData, porteiroData, salvarPadrao);
          setModalOpen(false);
          if (res?.reciboUrl) {
            window.alert("Retirada concluída com sucesso!");
          }
        }}
      />
    </div>
  );
}