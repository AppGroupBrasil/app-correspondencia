"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Trash2,
  Upload,
  FileText,
  FileSpreadsheet,
  Plus,
  Search,
  XCircle,
  Loader2,
  Clock
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import BotaoVoltar from "@/components/BotaoVoltar";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// ============================================================================
// 1. Interfaces e Constantes
// ============================================================================

interface Props {
  condominioId?: string;
}

interface Morador {
  id: string;
  nome: string;
  email: string;
  whatsapp: string;
  perfil: string;
  unidadeId: string;
  unidadeNome?: string;
  bloco?: string;
  blocoNome?: string;
  blocoId?: string;
  complemento?: string;
  condominioId: string;
  ativo: boolean;
  criadoEm: any;
}

interface Unidade {
  id: string;
  identificacao: string;
  tipo: string;
  blocoSetor: string;
  blocoId?: string;
}

interface Bloco {
  id: string;
  nome: string;
}

const PERFIS_MORADOR = [
  { value: "proprietario", label: "Proprietário" },
  { value: "locatario", label: "Locatário" },
  { value: "dependente", label: "Dependente" },
  { value: "funcionario", label: "Funcionário" },
  { value: "outro", label: "Outro" },
];

// ============================================================================
// 2. Funções Auxiliares
// ============================================================================

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ordenacaoNatural = (a: string, b: string) => {
  return new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" }).compare(a || "", b || "");
};

const getNomePerfil = (valor: string) => {
  return PERFIS_MORADOR.find((p) => p.value === valor)?.label || valor;
};

const normalizarPerfil = (valorBruto: string): string => {
  const v = (valorBruto || "").toString().trim().toLowerCase();
  if (!v) return "proprietario";
  if (["proprietario", "proprietário"].includes(v)) return "proprietario";
  if (["locatario", "locatário"].includes(v)) return "locatario";
  if (["dependente"].includes(v)) return "dependente";
  if (["funcionario", "funcionário"].includes(v)) return "funcionario";
  const peloLabel = PERFIS_MORADOR.find((p) => p.label.toLowerCase() === v);
  return peloLabel ? peloLabel.value : "proprietario";
};

const validarEmail = (email: string) => {
    const emailLimpo = email.trim();
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(emailLimpo);
};

const gerarSenhaTemporaria = () => {
  const bytes = new Uint32Array(2);
  globalThis.crypto.getRandomValues(bytes);
  return `Tmp!${bytes[0].toString(36)}${bytes[1].toString(36)}`;
};

// ============================================================================
// 3. Componente Principal
// ============================================================================
export default function GerenciarMoradores({ condominioId: adminCondominioId }: Readonly<Props>) {
  const { user } = useAuth();
  const [fetchedCondominioId, setFetchedCondominioId] = useState<string>("");

  const [moradores, setMoradores] = useState<Morador[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionados, setSelecionados] = useState<string[]>([]);

  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [moradorEditando, setMoradorEditando] = useState<Morador | null>(null);
  
  const [busca, setBusca] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState("todos");
  const [filtroBlocoId, setFiltroBlocoId] = useState("todos");
  const [filtroUnidadeId, setFiltroUnidadeId] = useState("todos");

  const [form, setForm] = useState({
    nome: "",
    email: "",
    whatsapp: "",
    perfil: "proprietario",
    blocoSelecionado: "",
    numeroApartamento: "",
    complemento: "",
    ativo: true,
    senha: "",
  });

  const [modalImportacao, setModalImportacao] = useState(false);
  const [arquivoImportacao, setArquivoImportacao] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [statusImportacao, setStatusImportacao] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [logImportacao, setLogImportacao] = useState<string[]>([]);

  const targetCondominioId = adminCondominioId || user?.condominioId || fetchedCondominioId;
  const backRoute = user?.role === "porteiro" ? "/dashboard-porteiro" : "/dashboard-responsavel";

  // 🔥 COLEI A FUNÇÃO AQUI PARA VOCÊ
  const formatarTelefone = (valor: string) => {
    let v = valor.replace(/\D/g, "");
    v = v.substring(0, 11);
    if (v.length > 10) return v.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    if (v.length > 6) return v.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    if (v.length > 2) return v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    if (v.length > 0) return v.replace(/^(\d{0,2})/, "($1");
    return v;
  };

  useEffect(() => {
    async function garantirCondominioId() {
      if (user?.uid && !user.condominioId && !adminCondominioId) {
        try {
          const { data } = await supabase
            .from("users")
            .select("condominio_id")
            .eq("id", user.uid)
            .single();
          if (data) setFetchedCondominioId(data.condominio_id);
        } catch (error) {
          console.error("Erro ao buscar detalhes do usuário", error);
        }
      }
    }
    garantirCondominioId();
  }, [user, adminCondominioId]);

  useEffect(() => {
    if (targetCondominioId) carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetCondominioId]);

  const carregarDados = async () => {
    setLoading(true);
    await Promise.all([carregarBlocos(), carregarUnidades(), carregarMoradores()]);
    setLoading(false);
  };

  const carregarBlocos = async () => {
    try {
      const { data, error } = await supabase
        .from("blocos")
        .select("id, nome")
        .eq("condominio_id", targetCondominioId);
      if (error) throw error;
      const mapped = (data || []).map((d: any) => ({ id: d.id, nome: d.nome })) as Bloco[];
      setBlocos(mapped.sort((a, b) => ordenacaoNatural(a.nome, b.nome)));
    } catch (err) {
      console.error("Erro blocos:", err);
    }
  };

  const carregarUnidades = async () => {
    try {
      const { data, error } = await supabase
        .from("unidades")
        .select("id, identificacao, tipo, bloco_setor, bloco_id")
        .eq("condominio_id", targetCondominioId);
      if (error) throw error;
      const mapped = (data || []).map((d: any) => ({
        id: d.id,
        identificacao: d.identificacao,
        tipo: d.tipo,
        blocoSetor: d.bloco_setor,
        blocoId: d.bloco_id,
      })) as Unidade[];
      setUnidades(mapped.sort((a, b) => ordenacaoNatural(a.identificacao, b.identificacao)));
    } catch (err) {
      console.error("Erro unidades:", err);
    }
  };

  const carregarMoradores = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("condominio_id", targetCondominioId)
        .eq("role", "morador");
      if (error) throw error;
      const mapped = (data || []).map((d: any) => ({
        id: d.id,
        nome: d.nome,
        email: d.email,
        whatsapp: d.whatsapp || "",
        perfil: d.perfil || d.perfil_morador || "",
        unidadeId: d.unidade_id || "",
        unidadeNome: d.unidade_nome || "",
        bloco: d.bloco || "",
        blocoNome: d.bloco_nome || "",
        blocoId: d.bloco_id || "",
        complemento: d.complemento || "",
        condominioId: d.condominio_id,
        ativo: d.ativo,
        criadoEm: d.criado_em,
      })) as Morador[];
      setMoradores(mapped);
    } catch (err) {
      console.error("Erro moradores:", err);
    }
  };

  // --- UI Lógica ---

  const toggleSelecionarTodos = (checked: boolean) => {
    if (checked) {
      const idsVisiveis = moradoresFiltrados.map(m => m.id);
      setSelecionados(idsVisiveis);
    } else {
      setSelecionados([]);
    }
  };

  const toggleSelecionarUm = (id: string) => {
    setSelecionados(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const excluirSelecionados = async () => {
    if (selecionados.length === 0) return;
    if (!confirm(`Tem certeza que deseja excluir ${selecionados.length} moradores?`)) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("users").delete().in("id", selecionados);
      if (error) throw error;

      setMoradores(prev => prev.filter(m => !selecionados.includes(m.id)));
      setSelecionados([]);
      alert("Moradores excluídos com sucesso!");
    } catch (err) {
      console.error("Erro ao excluir em massa:", err);
      alert("Ocorreu um erro ao excluir.");
    } finally {
      setLoading(false);
    }
  };

  const atualizarForm = (campo: string, valor: any) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const abrirModalNovo = () => {
    setModoEdicao(false);
    setMoradorEditando(null);
    setForm({
      nome: "",
      email: "",
      whatsapp: "",
      perfil: "proprietario",
      blocoSelecionado: "",
      numeroApartamento: "",
      complemento: "",
      ativo: true,
      senha: "",
    });
    setModalAberto(true);
  };

  const abrirModalEditar = (morador: Morador) => {
    setModoEdicao(true);
    setMoradorEditando(morador);
    
    let blocoIdRestaurado = morador.blocoId || "";
    if (!blocoIdRestaurado) {
      const unidadeVinculada = unidades.find((u) => u.id === morador.unidadeId);
      if (unidadeVinculada?.blocoId) blocoIdRestaurado = unidadeVinculada.blocoId;
    }

    const unidadeVinculada = unidades.find((u) => u.id === morador.unidadeId);

    setForm({
      nome: morador.nome,
      email: morador.email,
      whatsapp: morador.whatsapp,
      perfil: morador.perfil || "proprietario",
      blocoSelecionado: blocoIdRestaurado,
      numeroApartamento: unidadeVinculada ? unidadeVinculada.identificacao : morador.unidadeNome || "",
      complemento: morador.complemento || "",
      ativo: morador.ativo === true || String(morador.ativo) === "true",
      senha: "",
    });
    setModalAberto(true);
  };

  const salvarMorador = async () => {
    if (!targetCondominioId) return;
    const { nome, email, whatsapp, blocoSelecionado, numeroApartamento, senha, perfil, complemento, ativo } = form;

    if (!nome.trim() || !email.trim() || !whatsapp.trim() || !blocoSelecionado || !numeroApartamento) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }
    if (!modoEdicao && !senha.trim()) {
      alert("Senha é obrigatória para novos cadastros.");
      return;
    }

    try {
      setLoading(true);
      let unidadeIdFinal = "";
      
      const unidadeExistente = unidades.find(
        (u) => u.blocoId === blocoSelecionado && u.identificacao === numeroApartamento
      );

      const blocoObj = blocos.find((b) => b.id === blocoSelecionado);
      const nomeDoBloco = blocoObj ? blocoObj.nome : "";

      if (unidadeExistente) {
        unidadeIdFinal = unidadeExistente.id;
      } else {
        const { data: novaUnidadeData, error: unidErr } = await supabase
          .from("unidades")
          .insert({
            identificacao: numeroApartamento,
            tipo: "apartamento",
            bloco_id: blocoSelecionado,
            bloco_setor: nomeDoBloco,
            condominio_id: targetCondominioId,
            status: "ocupado",
            proprietario: nome,
          })
          .select("id")
          .single();
        if (unidErr) throw unidErr;
        unidadeIdFinal = novaUnidadeData.id;
        const novaUnidade: Unidade = {
            id: unidadeIdFinal,
            identificacao: numeroApartamento,
            tipo: "apartamento",
            blocoSetor: nomeDoBloco,
            blocoId: blocoSelecionado,
        };
        setUnidades((prev) => [...prev, novaUnidade].sort((a,b) => ordenacaoNatural(a.identificacao, b.identificacao)));
      }

      const dadosMorador: any = {
        nome: nome.trim(),
        email: email.trim(),
        whatsapp: whatsapp.replace(/\D/g, ""),
        perfil: perfil,
        perfil_morador: perfil,
        unidade_id: unidadeIdFinal,
        unidade_nome: numeroApartamento,
        bloco_id: blocoSelecionado,
        bloco_nome: nomeDoBloco,
        bloco: nomeDoBloco,
        complemento: complemento || "",
        condominio_id: targetCondominioId,
        role: "morador",
        ativo: !!ativo,
        aprovado: true,
        status_aprovacao: "ok",
      };

      if (modoEdicao && moradorEditando) {
        const { error } = await supabase
          .from("users")
          .update({
            ...dadosMorador,
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", moradorEditando.id);
        if (error) throw error;
        alert("Morador atualizado com sucesso!");
      } else {
        const res = await fetch("/api/criar-usuario", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            senha,
            nome: nome.trim(),
            role: "morador",
            condominioId: targetCondominioId,
            dados: dadosMorador,
          }),
        });
        const result = await res.json();
        if (!res.ok) {
          alert(result.error || "Erro ao criar usuário");
        } else {
          alert("Morador cadastrado!");
        }
      }

      setModalAberto(false);
      carregarMoradores();
      if (!unidadeExistente) carregarUnidades();

    } catch (err: any) {
      console.error("Erro ao salvar:", err);
      alert("Erro: " + (err.message || "Erro desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  const alternarStatus = async (morador: Morador) => {
    try {
      const { error } = await supabase
        .from("users")
        .update({
          ativo: !morador.ativo,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", morador.id);
      if (error) throw error;
      setMoradores(prev => prev.map(m => m.id === morador.id ? { ...m, ativo: !m.ativo } : m));
    } catch (err) {
      console.error("Erro status:", err);
      alert("Erro ao alterar status.");
    }
  };

  const excluirMorador = async (morador: Morador) => {
    if (!confirm(`Excluir ${morador.nome}?`)) return;
    try {
      const { error } = await supabase.from("users").delete().eq("id", morador.id);
      if (error) throw error;
      setMoradores(prev => prev.filter(m => m.id !== morador.id));
      setSelecionados(prev => prev.filter(id => id !== morador.id));
    } catch (err) {
      console.error("Erro exclusão:", err);
      alert("Erro ao excluir.");
    }
  };

  const getNomeUnidade = useCallback((unidadeId: string) => {
    const unidade = unidades.find((u) => u.id === unidadeId);
    return unidade ? unidade.identificacao : "-";
  }, [unidades]);

  const moradoresFiltrados = useMemo(() => {
    const filtrados = moradores.filter((morador) => {
      const termo = busca.toLowerCase();
      const matchBusca =
        morador.nome.toLowerCase().includes(termo) ||
        morador.email.toLowerCase().includes(termo) ||
        morador.whatsapp.includes(termo);

      const matchPerfil = filtroPerfil === "todos" || morador.perfil === filtroPerfil;
      const matchBloco = filtroBlocoId === "todos" || morador.blocoId === filtroBlocoId;
      const matchUnidade = filtroUnidadeId === "todos" || morador.unidadeId === filtroUnidadeId;

      return matchBusca && matchPerfil && matchBloco && matchUnidade;
    });

    return filtrados.sort((a, b) => {
      const blocoA = a.blocoNome || a.bloco || "";
      const blocoB = b.blocoNome || b.bloco || "";
      const compBloco = ordenacaoNatural(blocoA, blocoB);
      if (compBloco !== 0) return compBloco;

      const unidA = a.unidadeNome || getNomeUnidade(a.unidadeId) || "";
      const unidB = b.unidadeNome || getNomeUnidade(b.unidadeId) || "";
      const compUnid = ordenacaoNatural(unidA, unidB);
      if (compUnid !== 0) return compUnid;

      return a.nome.localeCompare(b.nome);
    });
  }, [moradores, busca, filtroPerfil, filtroBlocoId, filtroUnidadeId, getNomeUnidade]);

  const unidadesParaFiltro = useMemo(() => {
    const lista = filtroBlocoId === "todos"
      ? unidades
      : unidades.filter((u) => u.blocoId === filtroBlocoId);
    return lista;
  }, [unidades, filtroBlocoId]);

  const gerarPDF = () => {
    const docPdf = new jsPDF();
    docPdf.text("Relatório de Moradores", 14, 15);
    docPdf.setFontSize(10);
    const filtroTexto = filtroBlocoId !== "todos" ? ` | Bloco: ${blocos.find(b => b.id === filtroBlocoId)?.nome}` : "";
    docPdf.text(`Gerado em: ${new Date().toLocaleDateString()} | Total: ${moradoresFiltrados.length}${filtroTexto}`, 14, 22);

    const body = moradoresFiltrados.map((m) => [
      m.nome,
      m.email,
      m.whatsapp,
      getNomePerfil(m.perfil),
      m.blocoNome || m.bloco || "-",
      getNomeUnidade(m.unidadeId),
      m.ativo ? "Ativo" : "Inativo",
    ]);

    autoTable(docPdf, {
      head: [["Nome", "Email", "WhatsApp", "Perfil", "Bloco", "Unidade", "Status"]],
      body,
      startY: 28,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [5, 115, 33] },
    });
    docPdf.save("moradores.pdf");
  };

  const gerarExcel = () => {
    const dadosExcel = moradoresFiltrados.map((m) => ({
      Nome: m.nome,
      Email: m.email,
      WhatsApp: m.whatsapp,
      Perfil: getNomePerfil(m.perfil),
      Bloco: m.blocoNome || m.bloco || "-",
      Unidade: getNomeUnidade(m.unidadeId),
      Status: m.ativo ? "Ativo" : "Inativo",
    }));
    const worksheet = XLSX.utils.json_to_sheet(dadosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Moradores");
    XLSX.writeFile(workbook, "moradores.xlsx");
  };

  // --- IMPORTAÇÃO COM RECUPERAÇÃO E ANTI-BLOQUEIO ---
  const processarImportacao = async () => {
    if (!arquivoImportacao || !targetCondominioId) return;
    setImportando(true);
    setLogImportacao([]);
    setStatusImportacao("Iniciando leitura do arquivo...");

    try {
      const buffer = await arquivoImportacao.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

      if (json.length < 2) throw new Error("Planilha vazia ou sem cabeçalho.");

      const header = json[0].map((h: any) => String(h).trim().toLowerCase());
      const findIdx = (terms: string[]) => header.findIndex((h) => terms.some(t => h.includes(t)));

      const idx = {
        nome: findIdx(["nome", "morador"]),
        email: findIdx(["email", "mail"]),
        whats: findIdx(["whatsapp", "celular", "telefone"]),
        perfil: findIdx(["perfil", "tipo"]),
        bloco: findIdx(["bloco", "torre"]),
        unidade: findIdx(["unidade", "apto", "apartamento"]),
        compl: findIdx(["complemento", "obs"]),
        ativo: findIdx(["ativo", "status"]),
      };

      if (idx.nome === -1 || idx.email === -1 || idx.bloco === -1 || idx.unidade === -1) {
        throw new Error("Colunas obrigatórias não encontradas: Nome, Email, Bloco, Unidade.");
      }

      let criados = 0;
      let atualizados = 0;
      let logsTemp: string[] = [];
      const total = json.length - 1;

      for (let i = 1; i < json.length; i++) {
        // Delay padrão de 1s (sem secondary app, pode ser menor)
        if (i > 1) await delay(1000); 

        setStatusImportacao(`Processando ${i} de ${total}...`);
        
        const row = json[i];
        const nome = String(row[idx.nome] || "").trim();
        const email = String(row[idx.email] || "").trim();
        const blocoRaw = String(row[idx.bloco] || "").trim();
        const unidadeRaw = String(row[idx.unidade] || "").trim();

        if (!nome || !email || !blocoRaw || !unidadeRaw) continue;

        if (!validarEmail(email)) {
            logsTemp.push(`Linha ${i + 1}: E-mail inválido (${email}).`);
            continue;
        }

        const blocoAlvo = blocoRaw.toLowerCase().replace(/^bloco\s*/, "");
        const blocoMatch = blocos.find(b => 
           b.nome.toLowerCase().replace(/^bloco\s*/, "") === blocoAlvo
        );

        if (!blocoMatch) {
            logsTemp.push(`Linha ${i + 1}: Bloco '${blocoRaw}' não existe.`);
            continue;
        }

        let unidadeId = "";
        const unidExistente = unidades.find(u => u.blocoId === blocoMatch.id && u.identificacao === unidadeRaw);
        
        if (unidExistente) {
            unidadeId = unidExistente.id;
        } else {
            const { data: novaUnid, error: unidErr } = await supabase
              .from("unidades")
              .insert({
                identificacao: unidadeRaw,
                tipo: "apartamento",
                bloco_id: blocoMatch.id,
                bloco_setor: blocoMatch.nome,
                condominio_id: targetCondominioId,
                status: "ocupado",
                proprietario: nome,
              })
              .select("id")
              .single();
            if (unidErr) {
              logsTemp.push(`Linha ${i + 1}: Erro ao criar unidade (${unidErr.message})`);
              continue;
            }
            unidadeId = novaUnid.id;
            unidades.push({ id: unidadeId, identificacao: unidadeRaw, tipo: "apt", blocoSetor: blocoMatch.nome, blocoId: blocoMatch.id });
        }

        const dadosMorador = {
            nome,
            email,
            whatsapp: String(row[idx.whats] || "").replace(/\D/g, ""),
            perfil: normalizarPerfil(row[idx.perfil]),
            unidade_id: unidadeId,
            unidade_nome: unidadeRaw,
            bloco_id: blocoMatch.id,
            bloco_nome: blocoMatch.nome,
            complemento: String(row[idx.compl] || ""),
            condominio_id: targetCondominioId,
            role: "morador",
            ativo: true,
            aprovado: true,
        };

        try {
          // 1. Check if user exists in DB
          const { data: existingUsers } = await supabase
            .from("users")
            .select("id")
            .eq("email", email)
            .limit(1);

          if (existingUsers && existingUsers.length > 0) {
            // UPDATE
            const { error } = await supabase
              .from("users")
              .update({
                ...dadosMorador,
                atualizado_em: new Date().toISOString(),
              })
              .eq("id", existingUsers[0].id);
            if (error) throw error;
            atualizados++;
          } else {
            // CREATE via API route
            const res = await fetch("/api/criar-usuario", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email,
                senha: gerarSenhaTemporaria(),
                nome,
                role: "morador",
                condominioId: targetCondominioId,
                dados: {
                  ...dadosMorador,
                  precisa_redefinir_senha: true,
                },
              }),
            });
            const result = await res.json();
            if (!res.ok) {
              if (result.error?.includes("já está em uso") || result.error?.includes("already been registered")) {
                logsTemp.push(`Linha ${i + 1}: E-mail já existe no Auth sem documento correspondente. Revisão manual necessária.`);
              } else {
                logsTemp.push(`Linha ${i + 1}: Erro Auth (${result.error})`);
              }
            } else {
              criados++;
            }
          }
        } catch (e: any) {
          logsTemp.push(`Linha ${i + 1}: Erro Geral (${e.message})`);
        }
      }

      setLogImportacao([`Finalizado: ${criados} criados e ${atualizados} atualizados.`, ...logsTemp]);
      await carregarDados(); 

    } catch (err: any) {
      alert("Erro fatal: " + err.message);
    } finally {
      setImportando(false);
      setStatusImportacao("");
      setCooldown(0);
    }
  };

  if (!targetCondominioId && !loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <XCircle className="text-red-500 mb-2" size={40} />
        <h3 className="text-lg font-bold text-gray-900">Condomínio não identificado</h3>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {importando && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center text-white p-4 transition-all">
            {cooldown > 0 ? (
                <div className="flex flex-col items-center animate-pulse">
                    <Clock size={64} className="text-yellow-400 mb-4" />
                    <h2 className="text-4xl font-bold text-yellow-400 mb-2">{cooldown}s</h2>
                    <p className="text-xl">Resfriando o sistema para evitar bloqueio...</p>
                </div>
            ) : (
                <>
                    <Loader2 className="animate-spin mb-4 text-green-500" size={48} />
                    <h2 className="text-2xl font-bold mb-2">Importando...</h2>
                </>
            )}
            
            <p className="text-lg text-gray-300 mb-8 mt-4 text-center max-w-lg">{statusImportacao}</p>
            
            <div className="bg-white/10 p-4 rounded-lg border border-white/20 max-w-md text-center">
                <p className="font-bold text-yellow-400 mb-1">⚠️ NÃO FECHE ESTA TELA</p>
                <p className="text-sm">Se o sistema pausar, ele voltará sozinho. Pode demorar, mas vai terminar.</p>
            </div>
        </div>
      )}

      <div className="w-fit">
        <BotaoVoltar url={backRoute} />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col xl:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciar Moradores</h1>
          <div className="flex gap-2 items-center">
            <p className="text-gray-600 text-sm">
               Total: <span className="font-bold">{moradores.length}</span>
            </p>
            {selecionados.length > 0 && (
                <button 
                  onClick={excluirSelecionados}
                  className="ml-4 flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold hover:bg-red-200 transition"
                >
                  <Trash2 size={12} />
                  Excluir {selecionados.length} selecionados
                </button>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
           <button onClick={gerarPDF} className="p-3 bg-red-600 text-white rounded hover:bg-red-700" title="PDF"><FileText size={18} /></button>
           <button onClick={gerarExcel} className="p-3 bg-green-600 text-white rounded hover:bg-green-700" title="Excel"><FileSpreadsheet size={18} /></button>
           <button onClick={() => setModalImportacao(true)} className="p-3 bg-white border text-gray-700 rounded hover:bg-gray-50 flex items-center gap-2"><Upload size={18} /> <span className="hidden sm:inline">Importar</span></button>
           <button onClick={abrirModalNovo} className="p-3 bg-[#057321] text-white rounded hover:bg-[#046119] flex items-center gap-2 font-bold"><Plus size={18} /> Novo</button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-xl shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         <div className="relative">
             <Search className="absolute left-3 top-3 text-gray-400" size={18} />
             <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar morador..." className="w-full pl-10 border rounded-lg py-2" />
         </div>
         <select value={filtroPerfil} onChange={e => setFiltroPerfil(e.target.value)} className="border rounded-lg p-2">
             <option value="todos">Todos Perfis</option>
             {PERFIS_MORADOR.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
         </select>
         <select value={filtroBlocoId} onChange={e => { setFiltroBlocoId(e.target.value); setFiltroUnidadeId("todos"); }} className="border rounded-lg p-2">
             <option value="todos">Todos Blocos</option>
             {blocos.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
         </select>
         <select value={filtroUnidadeId} onChange={e => setFiltroUnidadeId(e.target.value)} className="border rounded-lg p-2">
             <option value="todos">Todas Unidades</option>
             {unidadesParaFiltro.map(u => <option key={u.id} value={u.id}>{u.identificacao} {filtroBlocoId === "todos" && `(${u.blocoSetor})`}</option>)}
         </select>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="text-center p-8">Carregando dados...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
           <div className="overflow-x-auto">
             <table className="w-full">
               <thead className="bg-gray-50 border-b">
                 <tr>
                   <th className="px-4 py-3 w-10 text-center">
                     <input 
                       type="checkbox" 
                       className="w-4 h-4 rounded text-green-600 focus:ring-green-500"
                       onChange={(e) => toggleSelecionarTodos(e.target.checked)}
                       checked={moradoresFiltrados.length > 0 && selecionados.length === moradoresFiltrados.length}
                     />
                   </th>
                   {["Nome", "Email", "WhatsApp", "Perfil", "Bloco", "Unidade", "Status", "Ações"].map(h => 
                     <th key={h} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                   )}
                 </tr>
               </thead>
               <tbody className="divide-y">
                 {moradoresFiltrados.length === 0 ? (
                    <tr><td colSpan={9} className="p-8 text-center text-gray-500">Nenhum morador encontrado</td></tr>
                 ) : (
                    moradoresFiltrados.map(m => (
                        <tr key={m.id} className={`hover:bg-gray-50 ${selecionados.includes(m.id) ? 'bg-green-50' : ''}`}>
                            <td className="px-4 py-4 text-center">
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 rounded text-green-600 focus:ring-green-500"
                                  checked={selecionados.includes(m.id)}
                                  onChange={() => toggleSelecionarUm(m.id)}
                                />
                            </td>
                            <td className="px-6 py-4 font-medium">{m.nome}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{m.email}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{m.whatsapp}</td>
                            <td className="px-6 py-4"><span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full font-bold">{getNomePerfil(m.perfil)}</span></td>
                            <td className="px-6 py-4 text-sm">{m.blocoNome || m.bloco || "-"}</td>
                            <td className="px-6 py-4 text-sm font-bold">{getNomeUnidade(m.unidadeId)}</td>
                            <td className="px-6 py-4"><span className={`px-2 py-1 text-xs rounded-full font-bold ${m.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{m.ativo ? 'Ativo' : 'Inativo'}</span></td>
                            <td className="px-6 py-4 flex gap-2">
                                <button onClick={() => abrirModalEditar(m)} className="text-blue-600 font-bold text-sm hover:underline">Editar</button>
                                <button onClick={() => alternarStatus(m)} className="text-yellow-600 font-bold text-sm hover:underline">{m.ativo ? "Desativar" : "Ativar"}</button>
                                <button onClick={() => excluirMorador(m)} className="text-red-600 font-bold text-sm hover:underline">Excluir</button>
                            </td>
                        </tr>
                    ))
                 )}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {modalImportacao && !importando && (
         <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg">
                <h3 className="text-lg font-bold mb-4">Importar Excel</h3>
                <input type="file" accept=".xlsx,.xls" onChange={e => setArquivoImportacao(e.target.files?.[0] || null)} className="mb-4" />
                <div className="bg-gray-100 p-2 text-xs rounded mb-4">
                    Colunas: Nome | Email | WhatsApp | Perfil | Bloco | Unidade
                </div>
                {logImportacao.length > 0 && <div className="max-h-32 overflow-auto bg-gray-50 p-2 mb-4 text-xs">{logImportacao.map((l, i) => <p key={i}>{l}</p>)}</div>}
                <div className="flex gap-2">
                    <button onClick={() => setModalImportacao(false)} className="flex-1 border p-2 rounded">Fechar</button>
                    <button onClick={processarImportacao} disabled={!arquivoImportacao} className="flex-1 bg-green-600 text-white p-2 rounded font-bold">Iniciar</button>
                </div>
            </div>
         </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                {/* Modal Form Content */}
                <div className="flex justify-between mb-4">
                    <h3 className="text-lg font-bold">{modoEdicao ? "Editar" : "Novo"} Morador</h3>
                    <button onClick={() => setModalAberto(false)}>✕</button>
                </div>
                <div className="space-y-3">
                    <input className="w-full border p-2 rounded" placeholder="Nome" value={form.nome} onChange={e => atualizarForm("nome", e.target.value)} />
                    <input className="w-full border p-2 rounded" placeholder="Email" type="email" value={form.email} onChange={e => atualizarForm("email", e.target.value)} />
                    <input className="w-full border p-2 rounded" placeholder="WhatsApp" value={form.whatsapp} maxLength={15} onChange={e => atualizarForm("whatsapp", formatarTelefone(e.target.value))} />
                    {!modoEdicao && <input className="w-full border p-2 rounded" placeholder="Senha (min 6)" type="password" value={form.senha} onChange={e => atualizarForm("senha", e.target.value)} />}
                    <select className="w-full border p-2 rounded" value={form.perfil} onChange={e => atualizarForm("perfil", e.target.value)}>
                        {PERFIS_MORADOR.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                    <select className="w-full border p-2 rounded" value={form.blocoSelecionado} onChange={e => atualizarForm("blocoSelecionado", e.target.value)}>
                        <option value="">Selecione Bloco</option>
                        {blocos.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                    </select>
                    <input className="w-full border p-2 rounded" placeholder="Número Apto (Ex: 101)" value={form.numeroApartamento} onChange={e => atualizarForm("numeroApartamento", e.target.value.replace(/[^0-9]/g, ""))} disabled={!form.blocoSelecionado} />
                    <input className="w-full border p-2 rounded" placeholder="Complemento" value={form.complemento} onChange={e => atualizarForm("complemento", e.target.value)} />
                    <div className="flex items-center gap-2">
                        <input type="checkbox" checked={form.ativo} onChange={e => atualizarForm("ativo", e.target.checked)} />
                        <label>Ativo</label>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button onClick={() => setModalAberto(false)} className="flex-1 border p-2 rounded">Cancelar</button>
                        <button onClick={salvarMorador} className="flex-1 bg-[#057321] text-white p-2 rounded font-bold">{loading ? "..." : "Salvar"}</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
