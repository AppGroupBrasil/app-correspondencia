"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useAvisosRapidos } from "@/hooks/useAvisosRapidos";
import { useTemplates } from "@/hooks/useTemplates"; 
import { parseTemplate } from "@/utils/templateParser"; 
import { supabase } from "@/app/lib/supabase";
import Navbar from "@/components/Navbar";
import BotaoVoltar from "@/components/BotaoVoltar"; 
import withAuth from "@/components/withAuth";
import UploadImagem from "@/components/UploadImagem";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import {
  Building2, User, Phone, Home, X, Zap, CheckCircle, AlertCircle,
  History, Search, Send, Loader2, Settings
} from "lucide-react";

// --- FUNÇÃO AUXILIAR DE IMAGEM OTIMIZADA ---
const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 450;
        let width = img.width;
        let height = img.height;
        
        if (width > MAX_WIDTH) {
          height = height * (MAX_WIDTH / width);
          width = MAX_WIDTH;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() });
            resolve(newFile);
          } else { resolve(file); }
        }, "image/jpeg", 0.5);
      };
    };
  });
};

interface Bloco { id: string; nome: string; condominioId: string; }
interface Morador { id: string; nome: string; apartamento: string; telefone?: string; blocoId?: string; blocoNome?: string; condominioId?: string; role?: string; aprovado?: boolean; }

const CardMorador = memo(({ morador, aoClicar }: { morador: Morador, aoClicar: (m: Morador) => void }) => (
    <button onClick={() => aoClicar(morador)} className="bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border-2 border-green-200 hover:border-[#057321] rounded-xl p-4 transition-all text-left shadow-sm hover:shadow-md group w-full">
      <div className="flex items-start gap-3">
        <div className="bg-gradient-to-br from-[#057321] to-[#046119] p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform flex-shrink-0">
          <Home className="text-white" size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col mb-1">
             {morador.blocoNome ? (
                 <span className="text-xs font-bold text-[#057321] uppercase bg-green-100 px-2 py-0.5 rounded w-fit mb-1">Bloco {morador.blocoNome}</span>
             ) : ( <span className="text-xs font-bold text-gray-500 uppercase bg-gray-100 px-2 py-0.5 rounded w-fit mb-1">Sem Bloco</span> )}
             <span className="font-bold text-gray-900 text-lg leading-tight">Apto {morador.apartamento}</span>
          </div>
          <div className="flex items-center gap-2 mb-2"><User className="text-gray-500 flex-shrink-0" size={14} /><p className="text-gray-700 text-sm truncate">{morador.nome}</p></div>
          <div className="flex items-center gap-2"><Phone className={`flex-shrink-0 ${morador.telefone ? "text-green-600" : "text-red-500"}`} size={14} /><p className={`text-xs ${morador.telefone ? "text-green-700" : "text-red-600"}`}>{morador.telefone || "Sem WhatsApp"}</p></div>
        </div>
        <div className="flex-shrink-0 self-center"><div className="bg-[#057321] text-white px-3 py-1 rounded-full text-xs font-bold group-hover:bg-[#046119] transition-all">Avisar</div></div>
      </div>
    </button>
));
CardMorador.displayName = "CardMorador";

function AvisosRapidosPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const { templates } = useTemplates(user?.condominioId || "");
  const warningTemplate = templates.find(t => t.category === 'WARNING');

  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [blocoSelecionado, setBlocoSelecionado] = useState<Bloco | null>(null);
  const [modalAberto, setModalAberto] = useState<boolean>(false);
  const [termoBusca, setTermoBusca] = useState("");
  const [resultadosBusca, setResultadosBusca] = useState<Morador[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [termoBuscaModal, setTermoBuscaModal] = useState("");
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [sucesso, setSucesso] = useState<string>("");
  const [erro, setErro] = useState<string>("");
  const [modalEnvioAberto, setModalEnvioAberto] = useState(false);
  const [moradorParaEnvio, setMoradorParaEnvio] = useState<Morador | null>(null);
  const [imagemAviso, setImagemAviso] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [protocoloGerado, setProtocoloGerado] = useState("");
  
  const cacheBlocos = useRef<Record<string, Morador[]>>({});

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const LINK_SISTEMA = `${baseUrl}/login`;
  
  const MSG_PADRAO = "Olá *{{NOME}}*! Chegou correspondência.\nProtocolo: *{{PROTOCOLO}}*\n{{FOTO}}\nCompareça à portaria.";
  const [mensagemTemplate, setMensagemTemplate] = useState<string>(MSG_PADRAO);

  useEffect(() => {
    if (warningTemplate) {
      setMensagemTemplate(warningTemplate.content);
    } else {
      const msgSalva = localStorage.getItem("aviso_msg_template");
      if (msgSalva) setMensagemTemplate(msgSalva);
    }
  }, [warningTemplate]);

  useEffect(() => { if (user?.condominioId) carregarBlocos(); }, [user]);

  const carregarBlocos = async () => {
    try {
      setLoadingData(true);
      const { data: blocosRaw, error: blocosErr } = await supabase
        .from("blocos")
        .select("*")
        .eq("condominio_id", user?.condominioId);
      if (blocosErr) throw blocosErr;
      const blocosData: Bloco[] = (blocosRaw || []).map((d: any) => ({ id: d.id, nome: d.nome, condominioId: d.condominio_id }));
      blocosData.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { numeric: true }));
      setBlocos(blocosData);
    } catch (error) { console.error(error); setErro("Erro ao carregar blocos"); } finally { setLoadingData(false); }
  };

  const realizarBusca = async () => {
    if (!termoBusca.trim()) { setResultadosBusca([]); return; }
    setBuscando(true);
    try {
        const termoLimpo = termoBusca.toLowerCase().trim();
        const { data: usersRaw, error: usersErr } = await supabase
          .from("users")
          .select("*")
          .eq("condominio_id", user?.condominioId)
          .eq("role", "morador");
        if (usersErr) throw usersErr;
        const resultados: Morador[] = [];
        (usersRaw || []).forEach((data: any) => {
            const nome = (data.nome || "").toLowerCase();
            const apto = (data.unidade_nome || data.apartamento || "").toString().toLowerCase();
            if (nome.includes(termoLimpo) || apto.includes(termoLimpo)) {
                resultados.push({
                    id: data.id, nome: data.nome, apartamento: data.unidade_nome || data.apartamento || "?",
                    telefone: data.whatsapp || data.telefone || "", blocoId: data.bloco_id, blocoNome: data.bloco_nome,
                    condominioId: data.condominio_id, role: data.role, aprovado: data.aprovado,
                });
            }
        });
        const listaFiltrada = resultados.filter(m => m.aprovado === true || m.aprovado === undefined);
        setResultadosBusca(listaFiltrada);
        if(listaFiltrada.length === 0) setErro("Nenhum morador encontrado.");
    } catch (err) { console.error(err); } finally { setBuscando(false); }
  };

  const carregarMoradoresDoBloco = async (bloco: Bloco) => {
    try {
        setBlocoSelecionado(bloco);
        setTermoBuscaModal("");
        if (cacheBlocos.current[bloco.id]) { setMoradores(cacheBlocos.current[bloco.id]); setModalAberto(true); return; }
        setLoadingData(true);
        const { data: moradoresRaw, error: moradoresErr } = await supabase
          .from("users")
          .select("*")
          .eq("condominio_id", user?.condominioId)
          .eq("bloco_id", bloco.id)
          .eq("role", "morador");
        if (moradoresErr) throw moradoresErr;
        let moradoresData: Morador[] = (moradoresRaw || []).map((data: any) => ({
            id: data.id, nome: data.nome, apartamento: data.unidade_nome || data.apartamento || "?",
            telefone: data.whatsapp || data.telefone || "", blocoId: data.bloco_id, blocoNome: data.bloco_nome || bloco.nome,
            condominioId: data.condominio_id, role: data.role, aprovado: data.aprovado,
        }));
        moradoresData = moradoresData.filter(m => m.aprovado === true || m.aprovado === undefined);
        moradoresData.sort((a, b) => a.apartamento.localeCompare(b.apartamento, "pt-BR", { numeric: true }));
        cacheBlocos.current[bloco.id] = moradoresData;
        setMoradores(moradoresData);
        setModalAberto(true);
    } catch (e) { console.error(e); } finally { setLoadingData(false); }
  };

  const prepararEnvio = useCallback((morador: Morador) => {
    if (!morador.telefone) { setErro(`O morador ${morador.nome} não possui WhatsApp.`); setTimeout(() => setErro(""), 3000); return; }
    const protocolo = `AV-${Math.floor(Date.now() / 1000).toString().slice(-6)}`;
    setMoradorParaEnvio(morador);
    setProtocoloGerado(protocolo);
    setImagemAviso(null);
    setModalEnvioAberto(true);
  }, []);

  const confirmarEnvio = async () => {
    if (!moradorParaEnvio) return;
    
    // 1. Geração local do ID
    const avisoId = crypto.randomUUID();

    // 2. Preparação dos dados
    const telefoneDoMorador = moradorParaEnvio.telefone || "";
    let cleanPhone = telefoneDoMorador.replace(/\D/g, "");
    if (cleanPhone.startsWith("0")) cleanPhone = cleanPhone.substring(1);
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11) cleanPhone = "55" + cleanPhone;

    const dataHoraFormatada = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const usuarioAny = user as any;
    const nomeCondominio = usuarioAny?.condominioNome || usuarioAny?.nomeCondominio || "Condomínio";
    
    // --- LÓGICA DE TRATAMENTO DE IMAGEM ---
    const linkReal = `${baseUrl}/ver?id=${avisoId}`;
    const temFoto = !!imagemAviso; 

    const conteudoParaMensagem = temFoto ? linkReal : "*(Foto não foi anexada)*";

    let mensagemFinal = "";
    if (mensagemTemplate && mensagemTemplate.length > 10) {
        mensagemFinal = parseTemplate(mensagemTemplate, {
           NOME: moradorParaEnvio.nome.split(' ')[0],
           PROTOCOLO: protocoloGerado,
           FOTO: conteudoParaMensagem, 
           DATA: dataHoraFormatada,
           CONDOMINIO: nomeCondominio,
           BLOCO: moradorParaEnvio.blocoNome || "",
           APTO: moradorParaEnvio.apartamento
        });
    } else {
        mensagemFinal = `*AVISO DE CORRESPONDÊNCIA*\n\nOlá, *${moradorParaEnvio.nome.split(' ')[0]}*!\nUnidade: *${moradorParaEnvio.apartamento}*\n\nVocê recebeu uma correspondência.\nProtocolo: *${protocoloGerado}*\n\n${conteudoParaMensagem}\n\nCompareça à portaria para retirada.`;
    }

    // --- LIMPEZA GERAL DE CHAVES "{" e "}" ---
    // Isso remove qualquer chave que tenha sobrado do template, ex: {Morador -> Morador
    mensagemFinal = mensagemFinal.replace(/[{}]/g, "");
    
    const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(mensagemFinal)}`;

    const target = typeof window !== 'undefined' && (window as any).Capacitor ? "_system" : "_blank";
    window.open(whatsappLink, target);

    setSucesso(`Aviso enviado para ${moradorParaEnvio.nome}!`);
    setTimeout(() => setSucesso(""), 4000);
    setModalEnvioAberto(false);
    setModalAberto(false);

    // 4. BACKGROUND TASK
    (async () => {
        try {
            let publicFotoUrl = "";
            if (imagemAviso) {
                const arquivoFinal = await compressImage(imagemAviso);
                const fotoPath = `avisos/${avisoId}_${Date.now()}.jpg`;
                const { error: upErr } = await supabase.storage
                  .from("avisos")
                  .upload(fotoPath, arquivoFinal);
                if (upErr) throw upErr;
                const { data: urlData } = supabase.storage
                  .from("avisos")
                  .getPublicUrl(fotoPath);
                publicFotoUrl = urlData.publicUrl;
            }

            const { error: insertErr } = await supabase.from("avisos_rapidos").insert({
                id: avisoId,
                enviado_por_id: user?.uid || "",
                enviado_por_nome: user?.nome || "Porteiro",
                enviado_por_role: user?.role || "porteiro",
                morador_id: moradorParaEnvio.id,
                morador_nome: moradorParaEnvio.nome,
                morador_telefone: moradorParaEnvio.telefone || "",
                condominio_id: user?.condominioId || "",
                bloco_id: moradorParaEnvio.blocoId || "",
                bloco_nome: blocoSelecionado?.nome || moradorParaEnvio.blocoNome || "",
                apartamento: moradorParaEnvio.apartamento,
                mensagem: mensagemFinal,
                protocolo: protocoloGerado,
                foto_url: publicFotoUrl,
                imagem_url: publicFotoUrl,
                link_url: temFoto ? linkReal : "", 
                criado_em: new Date().toISOString(),
                status: "pendente",
                tipo: "aviso_rapido"
            });
            if (insertErr) throw insertErr;
            
        } catch (bgError) {
            console.error("❌ [Background] Erro:", bgError);
        }
    })();
  };

  const fecharModal = () => { setModalAberto(false); setBlocoSelecionado(null); setMoradores([]); setTermoBuscaModal(""); };
  const moradoresFiltradosNoModal = moradores.filter((m) => { const busca = termoBuscaModal.toLowerCase(); return m.nome.toLowerCase().includes(busca) || m.apartamento.toLowerCase().includes(busca); });

  const getBackUrl = () => {
      if (!user) return '#';
      if (user.role === 'responsavel' || user.role === 'adminMaster') return '/dashboard-responsavel';
      return '/dashboard-porteiro';
  };

  const getHistoricoUrl = () => {
      if (!user) return '#';
      if (user.role === 'responsavel' || user.role === 'adminMaster') return '/dashboard-responsavel/historico-avisos';
      return '/dashboard-porteiro/historico-avisos';
  };

  if (authLoading || !user) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
            <Loader2 className="animate-spin text-[#057321]" size={48} />
            <p className="text-gray-500 font-medium">Carregando sistema...</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50/30">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-28">
        <BotaoVoltar url={getBackUrl()} />
        
        <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-[#057321] rounded-xl shadow-sm p-6 mt-4 flex justify-between items-center">
          <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-gradient-to-br from-[#057321] to-[#046119] p-3 rounded-full shadow-md"><Zap className="text-white" size={28} /></div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Avisos Rápidos
                </h1>
              </div>
              <p className="text-gray-600 ml-14">Gerencie os avisos e envie mensagens rapidamente.</p>
          </div>
          
          {(user.role === 'responsavel' || user.role === 'adminMaster') && (
             <Link href="/dashboard-responsavel/configuracao-mensagens">
                <button className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#057321] bg-white border border-[#057321] rounded-lg hover:bg-green-50 transition-colors shadow-sm">
                    <Settings size={18} />
                    Configurar Mensagens
                </button>
             </Link>
          )}
        </div>

        {sucesso && (<div className="mb-6 bg-green-50 border-l-4 border-green-500 rounded-xl p-4 flex items-center gap-3 animate-pulse"><CheckCircle className="text-green-600" size={28} /><p className="font-bold text-green-800">✅ {sucesso}</p></div>)}
        {erro && (<div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-xl p-4 flex items-center gap-3"><AlertCircle className="text-red-600" size={28} /><p className="font-bold text-red-800">❌ {erro}</p></div>)}

        <div className="mb-6 grid grid-cols-1">
            <button onClick={() => router.push(getHistoricoUrl())} className="bg-[#057321] border-2 border-[#046019] text-white px-6 py-4 rounded-xl shadow-md hover:bg-[#046019] transition-all flex items-center justify-center gap-3 h-20 w-full">
                <History size={24} /> <span className="font-bold text-sm uppercase">Histórico</span>
            </button>
        </div>

        <div className="mb-6 mt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Buscar Morador</h2>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex gap-2">
                <div className="relative flex-1"><Search className="absolute left-3 top-3.5 text-gray-400" size={20} /><input type="text" value={termoBusca} onChange={(e) => { setTermoBusca(e.target.value); if(!e.target.value) setResultadosBusca([]); }} onKeyDown={(e) => e.key === 'Enter' && realizarBusca()} className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#057321] outline-none" placeholder="Buscar por Nome ou Apto..." /></div>
                <button onClick={realizarBusca} className="bg-[#057321] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#046019]">{buscando ? "..." : "Buscar"}</button>
            </div>
        </div>

        {resultadosBusca.length > 0 ? (
            <div className="animate-fade-in mb-12"><div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-gray-900">Resultados ({resultadosBusca.length})</h2><button onClick={() => { setTermoBusca(""); setResultadosBusca([]); }} className="text-red-600 text-sm underline">Limpar</button></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{resultadosBusca.map(morador => <CardMorador key={morador.id} morador={morador} aoClicar={prepararEnvio} />)}</div></div>
        ) : (
            loadingData && blocos.length === 0 ? (<div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#057321] mx-auto"></div></div>) : (<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">{blocos.map((bloco) => (<button key={bloco.id} onClick={() => carregarMoradoresDoBloco(bloco)} className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 border-2 border-gray-100 hover:border-[#057321] flex flex-col items-center gap-3"><div className="bg-gradient-to-br from-[#057321] to-[#046119] p-4 rounded-full shadow-md group-hover:scale-110 transition-transform"><Building2 className="text-white" size={32} /></div><div className="text-center"><p className="font-bold text-gray-900 text-lg">{bloco.nome}</p><p className="text-xs text-gray-500 mt-1">Ver moradores</p></div></button>))}</div>)
        )}
      </main>
      {modalAberto && blocoSelecionado && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col"><div className="bg-gradient-to-r from-[#057321] to-[#046119] p-6 flex items-center justify-between flex-shrink-0"><div className="flex items-center gap-3"><div className="bg-white p-2 rounded-full"><Building2 className="text-[#057321]" size={20} /></div><div><h2 className="text-2xl font-bold text-white">{blocoSelecionado.nome}</h2><p className="text-green-100 text-sm">{moradores.length} moradores</p></div></div><button onClick={fecharModal} className="bg-white/20 hover:bg-white/30 p-2 rounded-full"><X className="text-white" size={24} /></button></div><div className="p-4 bg-gray-50 border-b"><div className="relative"><input type="text" placeholder={`Filtrar no ${blocoSelecionado.nome}...`} value={termoBuscaModal} onChange={(e) => setTermoBuscaModal(e.target.value)} className="w-full border border-gray-300 rounded-lg pl-10 p-3 focus:ring-2 focus:ring-[#057321] outline-none" autoFocus /><Search className="absolute left-3 top-3.5 text-gray-400" size={18} /></div></div><div className="p-6 overflow-y-auto flex-1">{loadingData ? <div className="text-center py-8"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#057321] mx-auto"></div></div> : moradoresFiltradosNoModal.length === 0 ? <div className="text-center py-8 text-gray-500">Nenhum morador.</div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{moradoresFiltradosNoModal.map(morador => <CardMorador key={morador.id} morador={morador} aoClicar={prepararEnvio} />)}</div>}</div></div></div>)}
      {modalEnvioAberto && moradorParaEnvio && (<div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200"><div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 p-6"><h3 className="text-xl font-bold text-gray-900 mb-1">Confirmar Aviso</h3><p className="text-gray-500 text-sm mb-4">Enviar mensagem para <strong>{moradorParaEnvio.nome}</strong>?</p><div className="bg-gray-50 p-3 rounded-lg mb-4 border border-gray-200"><p className="text-sm font-bold text-gray-700">Protocolo Gerado:</p><p className="text-2xl font-mono text-[#057321] tracking-wider">{protocoloGerado}</p></div><div className="mb-6"><div className="flex justify-between items-center mb-2"><label className="block text-sm font-medium text-gray-700">Adicionar Foto</label><span className="text-sm font-extrabold text-red-600 bg-red-50 px-3 py-1 rounded border border-red-100">(FOTO OPCIONAL)</span></div><UploadImagem onUpload={setImagemAviso} /></div><div className="flex gap-3"><button onClick={() => setModalEnvioAberto(false)} className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50">Cancelar</button><button onClick={confirmarEnvio} className="flex-1 py-3 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl font-bold shadow-md flex items-center justify-center gap-2"><Send size={32} /> Enviar WhatsApp</button></div></div></div>)}
    </div>
  );
}

export default withAuth(AvisosRapidosPage, ["porteiro", "responsavel", "adminMaster"]);
