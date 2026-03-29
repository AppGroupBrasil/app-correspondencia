"use client";

import { useState, useEffect } from "react";
import withAuth from "@/components/withAuth";
import Navbar from "@/components/Navbar";
import BotaoVoltar from "@/components/BotaoVoltar";
import { db } from "@/app/lib/firebase";
import { collection, query, where, getDocs, Timestamp, orderBy } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { 
  FileText, Search, User, Filter, Printer, IdCard, FileSpreadsheet, Loader2, ArrowUpRight, ArrowDownLeft, MessageCircle
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// Interface unificada para o relatório de atividades
interface ItemRelatorio {
  id: string;
  data: string;
  dataIso: string;
  acao: "Recebimento" | "Retirada" | "Aviso WhatsApp";
  tipo: "Encomenda" | "Aviso";
  destinatario: string;
  bloco: string;
  apartamento: string;
  detalhe: string;
  registradoPor: string;
}

function RelatoriosPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Filtros
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | "entrada" | "saida" | "aviso">("todos");
  const [blocoFiltro, setBlocoFiltro] = useState("");
  const [moradorFiltro, setMoradorFiltro] = useState("");
  const [porteiroFiltro, setPorteiroFiltro] = useState(""); 

  // Dados
  const [blocos, setBlocos] = useState<any[]>([]);
  const [porteiros, setPorteiros] = useState<any[]>([]); 
  const [resultados, setResultados] = useState<ItemRelatorio[]>([]);

  // Carregar Filtros Iniciais
  useEffect(() => {
    if (user?.condominioId) {
      const carregarDadosIniciais = async () => {
        try {
          // 1. Blocos
          const qBlocos = query(collection(db, "blocos"), where("condominioId", "==", user.condominioId));
          const snapBlocos = await getDocs(qBlocos);
          const listaBlocos = snapBlocos.docs.map(d => ({ id: d.id, ...d.data() }));
          listaBlocos.sort((a: any, b: any) => a.nome.localeCompare(b.nome, undefined, { numeric: true }));
          setBlocos(listaBlocos);

          // 2. Porteiros (Usuários)
          const qUsers = query(
            collection(db, "users"), 
            where("condominioId", "==", user.condominioId),
            where("role", "in", ["porteiro", "responsavel", "adminMaster"]) 
          );
          const snapUsers = await getDocs(qUsers);
          const listaPorteiros = snapUsers.docs.map(d => ({ id: d.id, ...d.data() }));
          listaPorteiros.sort((a: any, b: any) => a.nome.localeCompare(b.nome));
          setPorteiros(listaPorteiros);

        } catch (error) {
          console.error("Erro ao carregar filtros:", error);
        }
      };
      carregarDadosIniciais();
    }
  }, [user]);

  const gerarRelatorio = async () => {
    if (!user?.condominioId) return;
    setLoading(true);
    setResultados([]);

    try {
      const listaFinal: ItemRelatorio[] = [];
      
      // Datas para consulta (Inicio 00:00 e Fim 23:59)
      const start = new Date(dataInicio);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dataFim);
      end.setHours(23, 59, 59, 999);

      const timestampStart = Timestamp.fromDate(start);
      const timestampEnd = Timestamp.fromDate(end);

      // ==================================================
      // 1. ENTRADAS (Chegada de Encomendas)
      // ==================================================
      if (tipoFiltro === "todos" || tipoFiltro === "entrada") {
        const qEntrada = query(
          collection(db, "correspondencias"),
          where("condominioId", "==", user.condominioId),
          where("criadoEm", ">=", timestampStart),
          where("criadoEm", "<=", timestampEnd)
        );
        
        const snapEntrada = await getDocs(qEntrada);
        snapEntrada.forEach(doc => {
          const data = doc.data();
          const dateObj = data.criadoEm?.toDate ? data.criadoEm.toDate() : new Date();
          
          listaFinal.push({
            id: `ent-${doc.id}`,
            data: dateObj.toLocaleString('pt-BR'),
            dataIso: dateObj.toISOString(),
            acao: "Recebimento",
            tipo: "Encomenda",
            destinatario: data.moradorNome,
            bloco: data.blocoNome,
            apartamento: data.apartamento,
            detalhe: `Protocolo: ${data.protocolo} (${data.status})`,
            registradoPor: data.criadoPorNome || data.criadoPor || "Sistema"
          });
        });
      }

      // ==================================================
      // 2. SAÍDAS (Retirada de Encomendas)
      // ==================================================
      if (tipoFiltro === "todos" || tipoFiltro === "saida") {
        const qSaida = query(
          collection(db, "correspondencias"),
          where("condominioId", "==", user.condominioId),
          where("status", "==", "retirada"),
          where("retiradoEm", ">=", timestampStart),
          where("retiradoEm", "<=", timestampEnd)
        );
        
        try {
            const snapSaida = await getDocs(qSaida);
            snapSaida.forEach(doc => {
              const data = doc.data();
              const dateObj = data.retiradoEm?.toDate ? data.retiradoEm.toDate() : new Date();
              
              listaFinal.push({
                id: `sai-${doc.id}`,
                data: dateObj.toLocaleString('pt-BR'),
                dataIso: dateObj.toISOString(),
                acao: "Retirada",
                tipo: "Encomenda",
                destinatario: data.moradorNome,
                bloco: data.blocoNome,
                apartamento: data.apartamento,
                detalhe: `Protocolo: ${data.protocolo}`,
                registradoPor: "Portaria" 
              });
            });
        } catch (e) {
            console.warn("Índice necessário para filtro de Retirada:", e);
        }
      }

      // ==================================================
      // 3. AVISOS (WhatsApp)
      // ==================================================
      if (tipoFiltro === "todos" || tipoFiltro === "aviso") {
        const qAvisos = query(
          collection(db, "avisos_rapidos"),
          where("condominioId", "==", user.condominioId),
          where("criadoEm", ">=", timestampStart),
          where("criadoEm", "<=", timestampEnd)
        );
        
        const snapAvisos = await getDocs(qAvisos);
        snapAvisos.forEach(doc => {
          const data = doc.data();
          const dateObj = data.criadoEm?.toDate ? data.criadoEm.toDate() : new Date();

          listaFinal.push({
            id: `avi-${doc.id}`,
            data: dateObj.toLocaleString('pt-BR'),
            dataIso: dateObj.toISOString(),
            acao: "Aviso WhatsApp",
            tipo: "Aviso",
            destinatario: data.moradorNome,
            bloco: data.blocoNome,
            apartamento: data.apartamento,
            detalhe: data.mensagem ? `Msg: "${data.mensagem.substring(0, 20)}..."` : "Foto enviada",
            registradoPor: data.enviadoPorNome || "Sistema"
          });
        });
      }

      // --- FILTRAGEM EM MEMÓRIA ---
      let filtrados = listaFinal.filter(item => {
        if (blocoFiltro && item.bloco !== blocoFiltro) return false;

        if (porteiroFiltro) {
            const registradoPorLower = item.registradoPor.toLowerCase();
            const filtroLower = porteiroFiltro.toLowerCase();
            if (!registradoPorLower.includes(filtroLower)) return false;
        }

        if (moradorFiltro) {
          const busca = moradorFiltro.toLowerCase();
          const matchNome = item.destinatario.toLowerCase().includes(busca);
          const matchApto = item.apartamento.toLowerCase().includes(busca);
          if (!matchNome && !matchApto) return false;
        }

        return true;
      });

      filtrados.sort((a, b) => b.dataIso.localeCompare(a.dataIso));
      setResultados(filtrados);

    } catch (error) {
      console.error("Erro geral ao gerar relatório:", error);
      alert("Erro ao buscar dados. Verifique se os índices do Firebase estão criados.");
    } finally {
      setLoading(false);
    }
  };

  // --- EXPORTAR PDF ---
  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFillColor(5, 115, 33);
    doc.rect(0, 0, 210, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("Relatório de Atividades", 105, 13, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Período: ${new Date(dataInicio).toLocaleDateString()} a ${new Date(dataFim).toLocaleDateString()}`, 14, 28);
    doc.text(`Gerado por: ${user?.nome}`, 14, 33);
    
    const dadosTabela = resultados.map(item => [
        item.data,
        item.acao,
        item.destinatario,
        `${item.bloco} / ${item.apartamento}`,
        item.detalhe,
        item.registradoPor
    ]);

    autoTable(doc, {
        startY: 40,
        head: [['Data/Hora', 'Evento', 'Morador', 'Bloco/Apto', 'Detalhe', 'Resp.']],
        body: dadosTabela,
        headStyles: { fillColor: [5, 115, 33] },
        styles: { fontSize: 8 },
    });

    doc.save(`Relatorio_Atividades_${dataInicio}.pdf`);
  };

  // --- EXPORTAR EXCEL ---
  const handleExportExcel = () => {
    const dadosExcel = resultados.map(item => ({
        "Data/Hora": item.data,
        "Evento": item.acao,
        "Tipo": item.tipo,
        "Morador": item.destinatario,
        "Bloco": item.bloco,
        "Apartamento": item.apartamento,
        "Detalhes": item.detalhe,
        "Registrado Por": item.registradoPor
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `Relatorio_Atividades_${dataInicio}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* 
        AJUSTE DE LAYOUT:
        Substituído 'pt-24' por um cálculo dinâmico.
        '6rem' (aprox 96px) é o espaço base da Navbar.
        'env(safe-area-inset-top)' é o espaço extra necessário no topo do celular (iPhone).
      */}
      <main 
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12"
        style={{ paddingTop: 'calc(6rem + env(safe-area-inset-top))' }}
      >
        <BotaoVoltar url="/dashboard-responsavel" />

        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="text-[#057321]" /> Relatório de Atividades
            </h1>
            <p className="text-gray-600">
              Visão geral de entradas, saídas e avisos enviados.
            </p>
          </div>
        </div>

        {/* CARD DE FILTROS */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="flex items-center gap-2 mb-4 text-[#057321] font-bold border-b pb-2">
            <Filter size={20} /> Filtros de Pesquisa
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Datas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
              <input 
                type="date" 
                value={dataInicio} 
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
              <input 
                type="date" 
                value={dataFim} 
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>

            {/* Tipo de Atividade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Atividade</label>
              <select 
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value as any)}
                className="w-full border rounded-lg p-2 text-sm bg-white"
              >
                <option value="todos">Tudo (Entradas, Saídas, Avisos)</option>
                <option value="entrada">Apenas Entradas (Chegadas)</option>
                <option value="saida">Apenas Saídas (Retiradas)</option>
                <option value="aviso">Apenas Avisos WhatsApp</option>
              </select>
            </div>

            {/* Bloco */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bloco</label>
              <select 
                value={blocoFiltro}
                onChange={(e) => setBlocoFiltro(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm bg-white"
              >
                <option value="">Todos os Blocos</option>
                {blocos.map(b => (
                  <option key={b.id} value={b.nome}>{b.nome}</option>
                ))}
              </select>
            </div>

            {/* Filtro de Porteiro */}
            <div>
              <label className="flex text-sm font-medium text-gray-700 mb-1 items-center gap-1">
              <IdCard size={14} /> Registrado por
              </label>
              <select 
                value={porteiroFiltro}
                onChange={(e) => setPorteiroFiltro(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm bg-white"
              >
                <option value="">Todos os Funcionários</option>
                {porteiros.map(p => (
                  <option key={p.id} value={p.nome}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Morador */}
            <div className="md:col-span-1 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Morador (Nome ou Apto)</label>
              <div className="relative">
                <input 
                  type="text"
                  value={moradorFiltro}
                  onChange={(e) => setMoradorFiltro(e.target.value)}
                  placeholder="Ex: João Silva ou 102"
                  className="w-full border rounded-lg p-2 pl-10 text-sm"
                />
                <User size={18} className="absolute left-3 top-2.5 text-gray-400" />
              </div>
            </div>

          </div>

          <div className="mt-6 flex justify-end">
            <button 
              onClick={gerarRelatorio}
              disabled={loading}
              className="bg-[#057321] text-white px-8 py-3 rounded-lg font-bold hover:bg-[#046019] transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <><Search size={20} /> Gerar Relatório</>}
            </button>
          </div>
        </div>

        {/* BOTÕES DE EXPORTAÇÃO */}
        {resultados.length > 0 && (
            <div className="flex gap-3 mb-4 justify-end">
                <button onClick={handleExportPDF} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-bold shadow-sm">
                    <Printer size={16} /> Exportar PDF
                </button>
                <button onClick={handleExportExcel} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-bold shadow-sm">
                    <FileSpreadsheet size={16} /> Exportar Excel
                </button>
            </div>
        )}

        {/* TABELA DE RESULTADOS */}
        {resultados.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs border-b">
                  <tr>
                    <th className="px-6 py-3">Data/Hora</th>
                    <th className="px-6 py-3">Evento</th>
                    <th className="px-6 py-3">Morador</th>
                    <th className="px-6 py-3">Unidade</th>
                    <th className="px-6 py-3">Detalhes</th>
                    <th className="px-6 py-3">Resp.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {resultados.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900 whitespace-nowrap text-xs">{item.data}</td>
                      
                      {/* Coluna EVENTO com Ícones e Cores */}
                      <td className="px-6 py-3">
                        {item.acao === "Recebimento" && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                <ArrowDownLeft size={12}/> Entrada
                            </span>
                        )}
                        {item.acao === "Retirada" && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                                <ArrowUpRight size={12}/> Saída
                            </span>
                        )}
                        {item.acao === "Aviso WhatsApp" && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                                <MessageCircle size={12}/> Aviso
                            </span>
                        )}
                      </td>

                      <td className="px-6 py-3">{item.destinatario}</td>
                      <td className="px-6 py-3">
                        <span className="text-gray-500 text-xs block">{item.bloco}</span>
                        <span className="font-bold">Apto {item.apartamento}</span>
                      </td>
                      <td className="px-6 py-3 text-gray-600 text-xs truncate max-w-[250px]" title={item.detalhe}>{item.detalhe}</td>
                      <td className="px-6 py-3 text-gray-600 text-xs font-medium">
                          {item.registradoPor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-gray-50 border-t text-right text-sm text-gray-600 font-medium">
              Total de registros encontrados: {resultados.length}
            </div>
          </div>
        ) : (
          !loading && (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum dado encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">Ajuste os filtros e clique em &quot;Gerar Relatório&quot;.</p>
            </div>
          )
        )}

      </main>
    </div>
  );
}

export default withAuth(RelatoriosPage, ["responsavel", "adminMaster"]);