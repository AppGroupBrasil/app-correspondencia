"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/app/lib/supabase";
import { X, Save, AlertCircle, ArrowRight, ArrowLeft, Package, Zap, Mail, Check } from "lucide-react";
import AssinaturaDigitalPro from "./AssinaturaDigitalPro";
import UploadImagens, { FotoSelecionada } from "./UploadImagens";
import { gerarReciboPDF } from "@/utils/gerarReciboPDF";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import ModalSucessoRetirada from "./ModalSucessoRetirada";
import { formatarTelefone } from "@/utils/telefone";
import { EmailService } from "@/services/emailService";
import { nomeArquivoRetirada, totalVolumes } from "@/app/lib/fotos-correspondencia";
import { useRascunho } from "@/hooks/useRascunho";
import { liberarRecarga, travarRecarga } from "@/utils/rascunho";
import { chaveMorador } from "@/utils/agruparPendentes";

// --- DEFINIÇÃO DE TIPOS INLINE ---
interface ConfiguracoesRetirada {
  assinaturaMoradorObrigatoria: boolean;
  assinaturaPorteiroObrigatoria: boolean;
  fotoDocumentoObrigatoria: boolean;
  selfieObrigatoria: boolean;
  geolocalizacaoObrigatoria: boolean;
  enviarWhatsApp: boolean;
  enviarEmail: boolean;
  enviarSMS: boolean;
  verificarMoradorAutorizado: boolean;
  permitirRetiradaTerceiro: boolean;
  exigirCodigoConfirmacao: boolean;
  incluirFotoCorrespondencia: boolean;
  incluirQRCode: boolean;
  incluirLogoCondominio: boolean;
  permitirRetiradaParcial: boolean;
  exigirAvaliacaoServico: boolean;
}

interface DadosRetirada {
  nomeQuemRetirou: string;
  cpfQuemRetirou?: string;
  telefoneQuemRetirou?: string;
  nomePorteiro: string;
  dataHoraRetirada: string;
  assinaturaMorador?: string;
  assinaturaPorteiro?: string;
  observacoes?: string;
  codigoVerificacao: string;
  fotoComprovanteUrl?: string;
  modoRegistro?: "rapido" | "completo";
  semComprovacao?: boolean;
  reciboEnviadoPara?: string;
  // Entrega de várias encomendas do mesmo morador de uma vez: guarda os
  // protocolos que saíram juntos, dos dois lados.
  retiradaEmConjunto?: string[];
  protocoloPrincipal?: string;
}

export interface PendenteDoMorador {
  id: string;
  protocolo: string;
  observacao?: string | null;
  criado_em?: string;
}

interface Props {
  correspondencia: any;
  onClose: () => void;
  // Recebe os ids que saíram da portaria (o principal + os do lote) para a
  // lista de pendentes tirar todos de uma vez.
  onSuccess: (idsBaixados?: string[]) => void;
  embedded?: boolean;
  mensagemFormatada?: string;
  modoRapido?: boolean;
  // Entrega em lote aberta pela lista agrupada: já vem com as demais
  // correspondências do morador marcadas, sem nova ida ao banco.
  pendentesDoMorador?: PendenteDoMorador[];
}

const CHAVE_DISPENSA = "appcorresp:dispensa-comprovacao:";

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// Configuração e assinatura padrão mudam raramente, mas eram buscadas a cada
// abertura do modal — duas idas à rede antes de o porteiro poder assinar.
// O cache (com prefetch feito pela tela da lista) deixa o modal abrir pronto.
const TTL_PREFERENCIAS_MS = 5 * 60_000;
const cacheConfig = new Map<string, { at: number; valor: Partial<ConfiguracoesRetirada> }>();
const cacheAssinatura = new Map<string, { at: number; valor: string }>();

const COLUNAS_CONFIG: [keyof ConfiguracoesRetirada, string][] = [
  ["assinaturaMoradorObrigatoria", "assinatura_morador_obrigatoria"],
  ["assinaturaPorteiroObrigatoria", "assinatura_porteiro_obrigatoria"],
  ["fotoDocumentoObrigatoria", "foto_obrigatoria"],
  ["permitirRetiradaTerceiro", "permitir_retirada_terceiro"],
  ["permitirRetiradaParcial", "permitir_retirada_parcial"],
];

// A tabela usa snake_case: atribuir a linha crua zerava todas as flags camelCase.
function mapearConfig(data: any): Partial<ConfiguracoesRetirada> {
  const parcial: Partial<ConfiguracoesRetirada> = {};
  for (const [camel, snake] of COLUNAS_CONFIG) {
    if (typeof data?.[snake] === "boolean") parcial[camel] = data[snake];
  }
  return parcial;
}

function noPrazo(entrada?: { at: number }): boolean {
  return !!entrada && Date.now() - entrada.at < TTL_PREFERENCIAS_MS;
}

// Chamado pela tela de retirada assim que a lista carrega: quando o porteiro
// abre o modal, config e assinatura já estão em memória.
export async function prefetchPreferenciasRetirada(condominioId?: string, uid?: string) {
  const tarefas: Promise<void>[] = [];

  if (condominioId && !noPrazo(cacheConfig.get(condominioId))) {
    tarefas.push(
      (async () => {
        try {
          const { data, error } = await supabase
            .from("configuracoes_retirada")
            .select("*")
            .eq("condominio_id", condominioId)
            .maybeSingle();
          // Sem linha também é resposta: cachear evita repetir a consulta a
          // cada retirada em condomínio que nunca configurou nada.
          if (!error) cacheConfig.set(condominioId, { at: Date.now(), valor: mapearConfig(data) });
        } catch {}
      })()
    );
  }

  if (uid && !noPrazo(cacheAssinatura.get(uid))) {
    tarefas.push(
      (async () => {
        try {
          const { data, error } = await supabase
            .from("users")
            .select("assinatura_padrao")
            .eq("id", uid)
            .maybeSingle();
          // Só cacheia resposta boa: erro de rede cacheado como "sem
          // assinatura" faria o porteiro assinar de novo pelos 5 minutos.
          if (!error) cacheAssinatura.set(uid, { at: Date.now(), valor: data?.assinatura_padrao || "" });
        } catch {}
      })()
    );
  }

  await Promise.all(tarefas);
}

export default function ModalRetiradaProfissional({
  correspondencia,
  onClose,
  onSuccess,
  embedded = false,
  mensagemFormatada: mensagemFormatadaProp,
  modoRapido = false,
  pendentesDoMorador,
}: Props) {
  const { user } = useAuth();

  // Registro que agrupa várias correspondências: uma assinatura dá baixa em
  // todas, mas o porteiro precisa ver quantos volumes entregar.
  const volumes = totalVolumes(correspondencia?.imagemUrl);

  // ESTADO PARA CONTROLAR A ETAPA ATUAL
  // No registro rápido já entra na assinatura: os dados vêm do protocolo.
  const [etapaAtual, setEtapaAtual] = useState<'observacoes' | 'assinaturas'>(
    modoRapido ? 'assinaturas' : 'observacoes'
  );
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Processando...");
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [finalPdfUrl, setFinalPdfUrl] = useState("");
  const [finalAvisoUrl, setFinalAvisoUrl] = useState("");
  const [linkSistemaFinal, setLinkSistemaFinal] = useState("");
  const [mensagemFormatada, setMensagemFormatada] = useState("");
  const [moradorPhone, setMoradorPhone] = useState(
    correspondencia.telefoneMorador || correspondencia.moradorTelefone || ""
  );
  const [moradorEmail, setMoradorEmail] = useState(
    correspondencia.emailMorador || correspondencia.moradorEmail || ""
  );

  const [config, setConfig] = useState<ConfiguracoesRetirada>({
    assinaturaMoradorObrigatoria: true,
    assinaturaPorteiroObrigatoria: true,
    fotoDocumentoObrigatoria: false,
    selfieObrigatoria: false,
    geolocalizacaoObrigatoria: false,
    enviarWhatsApp: true,
    enviarEmail: true,
    enviarSMS: false,
    verificarMoradorAutorizado: true,
    permitirRetiradaTerceiro: false,
    exigirCodigoConfirmacao: false,
    incluirFotoCorrespondencia: true,
    incluirQRCode: true,
    incluirLogoCondominio: false,
    permitirRetiradaParcial: false,
    exigirAvaliacaoServico: false,
  });

  const [nomeQuemRetirou, setNomeQuemRetirou] = useState(
    modoRapido ? String(correspondencia?.moradorNome || "") : ""
  );
  const [cpfQuemRetirou, setCpfQuemRetirou] = useState("");
  const [telefoneQuemRetirou, setTelefoneQuemRetirou] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [assinaturaMorador, setAssinaturaMorador] = useState<string>("");
  const [assinaturaPorteiro, setAssinaturaPorteiro] = useState<string>("");

  // O morador costuma levar 4 ou 5 encomendas de uma vez: uma foto por volume,
  // cada etiqueta legível, em vez de uma foto só da pilha inteira.
  const [fotos, setFotos] = useState<FotoSelecionada[]>([]);
  const [salvarPadrao, setSalvarPadrao] = useState(false);
  const [baixaConcluida, setBaixaConcluida] = useState(false);

  // O morador quase sempre tem mais de uma encomenda esperando e leva tudo de
  // uma vez. Como a baixa saía num protocolo só, as outras continuavam na lista
  // da portaria — é a encomenda que "volta" depois de entregue.
  const [outrasPendentes, setOutrasPendentes] = useState<PendenteDoMorador[]>(
    pendentesDoMorador || []
  );
  // Entrega em lote vem da lista já decidida: tudo marcado, o porteiro só
  // desmarca o que ficar na portaria.
  const [idsJuntos, setIdsJuntos] = useState<string[]>(
    (pendentesDoMorador || []).map((item) => item.id)
  );
  const emLote = Boolean(pendentesDoMorador?.length);
  const idsBaixadosRef = useRef<string[]>([]);

  useEffect(() => {
    // Lote montado pela lista: não há o que buscar.
    if (pendentesDoMorador?.length) return;

    let cancelado = false;
    (async () => {
      if (!correspondencia?.id || !user?.condominioId) return;
      try {
        const base = supabase
          .from("correspondencias")
          .select("id, protocolo, observacao, criado_em, morador_nome, bloco_nome, apartamento")
          .eq("condominio_id", user.condominioId)
          .eq("status", "pendente")
          .neq("id", correspondencia.id);

        // Sem morador vinculado (cadastro digitado à mão), nome + unidade é o
        // que identifica o dono — era o caso em que o agrupamento não achava
        // nada e o porteiro assinava uma por uma.
        const apartamento = String(
          correspondencia.apartamento || correspondencia.unidade || ""
        ).trim();
        const moradorNome = String(correspondencia.moradorNome || "").trim();

        const consulta = correspondencia.moradorId
          ? base.eq("morador_id", correspondencia.moradorId)
          : moradorNome && apartamento
            ? base.eq("apartamento", apartamento)
            : null;

        if (!consulta) return;

        const { data } = await consulta.order("criado_em", { ascending: true }).limit(20);

        // O apartamento sozinho traz o bloco vizinho e o homônimo da unidade
        // ao lado: só entra na mesma assinatura quem casa nome + bloco + apto.
        // (Com morador_id vinculado a identidade já está garantida.)
        const chaveAtual = chaveMorador(correspondencia);
        const lista = (data || []).filter((linha: any) =>
          correspondencia.moradorId ? true : chaveMorador(linha) === chaveAtual
        );

        if (!cancelado) setOutrasPendentes(lista);
      } catch {
        /* sem rede: a baixa individual continua funcionando */
      }
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correspondencia?.id, correspondencia?.moradorId, user?.condominioId]);

  const alternarJunto = (id: string) =>
    setIdsJuntos((atual) =>
      atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]
    );

  const protocolosJuntos = outrasPendentes
    .filter((item) => idsJuntos.includes(item.id))
    .map((item) => String(item.protocolo));

  // Preferência do porteiro, guardada no aparelho: uma vez marcada, todo registro
  // rápido baixa sem foto e sem assinatura até ele desmarcar.
  const [dispensaFixa, setDispensaFixa] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    try {
      setDispensaFixa(localStorage.getItem(`${CHAVE_DISPENSA}${user.uid}`) === "1");
    } catch {
      /* storage indisponível: segue exigindo assinatura */
    }
  }, [user?.uid]);

  const alternarDispensaFixa = () => {
    const novo = !dispensaFixa;
    setDispensaFixa(novo);
    try {
      if (!user?.uid) return;
      if (novo) localStorage.setItem(`${CHAVE_DISPENSA}${user.uid}`, "1");
      else localStorage.removeItem(`${CHAVE_DISPENSA}${user.uid}`);
    } catch {
      /* sem persistência: vale só para esta sessão */
    }
  };

  // Foto e assinatura são o trecho mais caro de refazer: se o sistema derrubar
  // o app enquanto a câmera está aberta, reabrir esta correspondência devolve o
  // que já tinha sido preenchido. Enquanto o modal está aberto, nada recarrega.
  const chaveRascunho = `retirada:${correspondencia?.id ?? ""}`;

  // Objeto novo a cada render reiniciaria o intervalo de gravação sem parar.
  const dadosRascunho = useMemo(
    () => ({
      nomeQuemRetirou,
      cpfQuemRetirou,
      telefoneQuemRetirou,
      observacoes,
      assinaturaMorador,
      etapaAtual,
    }),
    [nomeQuemRetirou, cpfQuemRetirou, telefoneQuemRetirou, observacoes, assinaturaMorador, etapaAtual]
  );

  useRascunho({
    chave: chaveRascunho,
    ativo:
      !baixaConcluida &&
      Boolean(
        assinaturaMorador ||
          cpfQuemRetirou.trim() ||
          telefoneQuemRetirou.trim() ||
          observacoes.trim()
      ),
    dados: dadosRascunho,
    restaurar: (salvo) => {
      if (salvo.nomeQuemRetirou) setNomeQuemRetirou(salvo.nomeQuemRetirou);
      setCpfQuemRetirou(salvo.cpfQuemRetirou || "");
      setTelefoneQuemRetirou(salvo.telefoneQuemRetirou || "");
      setObservacoes(salvo.observacoes || "");
      if (salvo.assinaturaMorador) setAssinaturaMorador(salvo.assinaturaMorador);
      if (salvo.etapaAtual) setEtapaAtual(salvo.etapaAtual);
    },
    versaoLeve: (atual) => ({ ...atual, assinaturaMorador: "" }),
  });

  // Trava própria do modal, com identificador separado do rascunho: enquanto
  // esta tela existir nada recarrega, mesmo depois de o rascunho ser
  // descartado — a baixa confirmada ainda sobe recibo, foto e e-mail por trás.
  useEffect(() => {
    const travaModal = `modal-retirada:${chaveRascunho}`;
    travarRecarga(travaModal);
    return () => liberarRecarga(travaModal);
  }, [chaveRascunho]);

  useEffect(() => {
    if (user?.condominioId) carregarConfiguracoes();
    if (user?.uid) carregarAssinaturaPorteiro();

    if ((!moradorPhone || !moradorEmail) && correspondencia?.moradorId) {
      carregarDadosMorador();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, correspondencia]);

  async function carregarDadosMorador() {
    try {
      if (correspondencia.moradorId) {
        const { data } = await supabase
          .from("users")
          .select("whatsapp, telefone, email")
          .eq("id", correspondencia.moradorId)
          .single();
        if (data) {
          if (data.whatsapp || data.telefone) setMoradorPhone(data.whatsapp || data.telefone);
          if (data.email) setMoradorEmail(data.email);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function carregarConfiguracoes() {
    const condominioId = user?.condominioId;
    if (!condominioId) return;

    const emCache = cacheConfig.get(condominioId);
    if (emCache) setConfig((prev) => ({ ...prev, ...emCache.valor }));
    if (noPrazo(emCache)) return;

    try {
      const { data, error } = await supabase
        .from("configuracoes_retirada")
        .select("*")
        .eq("condominio_id", condominioId)
        .maybeSingle();
      if (!error) {
        const parcial = mapearConfig(data);
        cacheConfig.set(condominioId, { at: Date.now(), valor: parcial });
        setConfig((prev) => ({ ...prev, ...parcial }));
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function carregarAssinaturaPorteiro() {
    const uid = user?.uid;
    if (!uid) return;

    const emCache = cacheAssinatura.get(uid);
    if (emCache?.valor) setAssinaturaPorteiro(emCache.valor);
    if (noPrazo(emCache)) return;

    try {
      const { data } = await supabase
        .from("users")
        .select("assinatura_padrao")
        .eq("id", uid)
        .single();
      cacheAssinatura.set(uid, { at: Date.now(), valor: data?.assinatura_padrao || "" });
      if (data?.assinatura_padrao) {
        setAssinaturaPorteiro(data.assinatura_padrao);
      }
    } catch (error) {
      console.error(error);
    }
  }

  function gerarCodigoVerificacao(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  function removerUndefined(obj: any): any {
    const resultado: any = {};
    Object.keys(obj).forEach((key) => {
      if (obj[key] !== undefined) resultado[key] = obj[key];
    });
    return resultado;
  }

  // No registro rápido a assinatura é o único ato do fluxo: sempre exigida,
  // a menos que o porteiro marque a dispensa. A marcação vale só para o registro
  // rápido — no fluxo completo continua valendo a regra do condomínio.
  const dispensaAtiva = modoRapido && dispensaFixa;
  const exigeAssinaturaMorador = !dispensaAtiva && (modoRapido || config.assinaturaMoradorObrigatoria);

  // FUNÇÃO PARA AVANÇAR PARA AS ASSINATURAS
  const avancarParaAssinaturas = () => {
    if (!nomeQuemRetirou.trim()) {
      setError("Nome de quem retirou é obrigatório");
      return;
    }
    
    // Validações adicionais podem ser adicionadas aqui
    setEtapaAtual('assinaturas');
    setError("");
  };

  // FUNÇÃO PARA VOLTAR PARA OBSERVAÇÕES
  const voltarParaObservacoes = () => {
    setEtapaAtual('observacoes');
  };

  // MODIFICAR A FUNÇÃO handleConfirmar para ser chamada apenas na etapa de assinaturas
  async function handleConfirmarRetirada() {
    // Com a dispensa marcada a baixa sai só com a leitura do QR Code. Se a
    // correspondência não trouxer o nome do morador, o registro sai como não
    // identificado em vez de travar o porteiro pedindo um dado que ele não tem.
    const nomeFinal =
      nomeQuemRetirou.trim() ||
      (dispensaAtiva
        ? String(correspondencia?.moradorNome || "").trim() || "Não identificado"
        : "");

    if (!nomeFinal) {
      setError("Informe o nome de quem está retirando");
      if (modoRapido) setEtapaAtual('assinaturas');
      return;
    }
    if (exigeAssinaturaMorador && !assinaturaMorador) {
      setError("Assinatura do morador é obrigatória");
      if (modoRapido) setEtapaAtual("assinaturas");
      return;
    }
    if (!user?.uid || !user?.nome || !user?.condominioId) {
      setError("Erro de autenticação");
      return;
    }

    // Baixa sem nenhuma comprovação: fica registrado no recibo e no histórico.
    const semComprovacao = dispensaAtiva && !assinaturaMorador && fotos.length === 0;

    setLoading(true);
    setMessage("Registrando baixa...");
    setProgress(30);
    setError("");

    try {
      if (salvarPadrao && assinaturaPorteiro && user.uid) {
        cacheAssinatura.set(user.uid, { at: Date.now(), valor: assinaturaPorteiro });
        supabase.from("users").update({
          assinatura_padrao: assinaturaPorteiro,
        }).eq("id", user.uid).then(({ error }) => {
          if (error) console.error("Erro ao salvar assinatura padrão:", error);
        });
      }

      const timestamp = Date.now();

      // As fotos já chegam comprimidas do UploadImagens — sobem ao storage em
      // background, sem recomprimir e sem bloquear a baixa. Só transmissão de
      // rede. Grava-se apenas a primeira URL: o nome do arquivo carrega "2de5"
      // e as demais são derivadas dele, sem coluna nova no banco.
      const totalFotos = fotos.length;
      const fotoUploadPromise: Promise<string> = totalFotos > 0
        ? (async () => {
            try {
              const enviadas = await Promise.all(
                fotos.map(async (foto, indice) => {
                  const fotoFileName = nomeArquivoRetirada(
                    String(correspondencia.protocolo || ""),
                    timestamp,
                    indice + 1,
                    totalFotos
                  );
                  const { error: fotoError } = await supabase.storage
                    .from("retiradas")
                    .upload(fotoFileName, foto.file, { contentType: "image/jpeg" });
                  if (fotoError) {
                    console.error(`Falha ao subir a foto ${indice + 1} da retirada:`, fotoError);
                    return "";
                  }
                  return supabase.storage.from("retiradas").getPublicUrl(fotoFileName).data.publicUrl;
                })
              );
              // Se a primeira falhar, qualquer outra serve de âncora do lote.
              return enviadas.find(Boolean) || "";
            } catch {
              return "";
            }
          })()
        : Promise.resolve("");

      // Recibo, e-mail e mensagem citam os protocolos do lote; se alguma baixa
      // em conjunto não passar, a lista é refeita antes de gerar o comprovante.
      let protocolosEntregues = protocolosJuntos;
      const montarObservacoes = (protocolos: string[]) =>
        [
          observacoes.trim(),
          semComprovacao ? "Baixa registrada sem assinatura e sem foto (dispensadas no registro rápido)." : "",
          protocolos.length > 0
            ? `Entregue junto com o(s) protocolo(s) ${protocolos.map((p) => `#${p}`).join(", ")}.`
            : "",
        ].filter(Boolean).join(" ") || undefined;

      const dadosRetiradaBruto: DadosRetirada = {
        nomeQuemRetirou: nomeFinal,
        cpfQuemRetirou: cpfQuemRetirou.trim() || undefined,
        telefoneQuemRetirou: telefoneQuemRetirou.trim() || undefined,
        nomePorteiro: user?.nome || "Porteiro",
        dataHoraRetirada: new Date().toISOString(),
        assinaturaMorador: assinaturaMorador || undefined,
        assinaturaPorteiro: assinaturaPorteiro || undefined,
        observacoes: montarObservacoes(protocolosJuntos),
        codigoVerificacao: gerarCodigoVerificacao(),
        modoRegistro: modoRapido ? "rapido" : "completo",
        semComprovacao: semComprovacao || undefined,
        retiradaEmConjunto: protocolosJuntos.length > 0 ? protocolosJuntos : undefined,
      };

      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      const linkAviso = `${baseUrl}/ver?id=${encodeURIComponent(correspondencia.id)}&type=aviso`;
      const linkRecibo = `${baseUrl}/ver?id=${encodeURIComponent(correspondencia.id)}&type=recibo`;

      // GRAVAÇÃO CRÍTICA DA BAIXA — feita PRIMEIRO, aguardada e verificada.
      // É a única etapa que precisa concluir antes de liberar o usuário.
      // .select() retorna as linhas afetadas: vazio = não persistiu (RLS ou
      // registro inexistente), caso em que o Supabase não acusa erro.
      const { data: updRows, error: updError } = await supabase
        .from("correspondencias")
        .update({
          status: "retirada",
          retirado_em: new Date().toISOString(),
          dados_retirada: removerUndefined(dadosRetiradaBruto),
        })
        .eq("id", correspondencia.id)
        .eq("status", "pendente")
        .select("id");

      if (updError) throw updError;
      if (!updRows || updRows.length === 0) {
        // Filtro por status pendente evita sobrescrever uma baixa feita em
        // outro terminal enquanto este modal estava aberto.
        const { data: atual } = await supabase
          .from("correspondencias")
          .select("status, retirado_em")
          .eq("id", correspondencia.id)
          .maybeSingle();

        if (atual?.status === "retirada") {
          const quando = atual.retirado_em
            ? new Date(atual.retirado_em).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })
            : "";
          throw new Error(
            `Esta correspondência já foi retirada${quando ? ` em ${quando}` : ""}.`
          );
        }

        throw new Error(
          "Não foi possível registrar a baixa: sem permissão ou correspondência não encontrada."
        );
      }

      idsBaixadosRef.current = [correspondencia.id];

      // Baixa em conjunto: as demais encomendas que o morador levou na mesma
      // hora saem da lista agora, com a mesma assinatura. Também é aguardada —
      // é justamente a etapa que faltava para a encomenda não "voltar".
      if (idsJuntos.length > 0) {
        setMessage("Baixando as demais encomendas...");
        const { data: linhasJuntas, error: erroJunto } = await supabase
          .from("correspondencias")
          .update({
            status: "retirada",
            retirado_em: new Date().toISOString(),
            dados_retirada: removerUndefined({
              ...dadosRetiradaBruto,
              retiradaEmConjunto: undefined,
              protocoloPrincipal: String(correspondencia.protocolo || ""),
            }),
          })
          .in("id", idsJuntos)
          .eq("status", "pendente")
          .select("id");

        if (erroJunto) {
          console.error("Erro ao baixar as encomendas em conjunto:", erroJunto);
          alert(
            "A baixa desta correspondência foi registrada, mas as demais encomendas " +
              "do morador não puderam ser baixadas. Confira a lista de pendentes."
          );
        } else if ((linhasJuntas || []).length < idsJuntos.length) {
          console.warn(
            `Baixa em conjunto: ${(linhasJuntas || []).length} de ${idsJuntos.length} atualizadas.`
          );
        }

        // Só sai da lista o que o banco confirmou ter baixado.
        idsBaixadosRef.current = [
          correspondencia.id,
          ...(linhasJuntas || []).map((linha: any) => linha.id),
        ];

        if ((linhasJuntas || []).length < idsJuntos.length) {
          // Comprovante não pode citar protocolo que continuou pendente.
          const confirmados = new Set(idsBaixadosRef.current);
          protocolosEntregues = outrasPendentes
            .filter((item) => item.id !== correspondencia.id && confirmados.has(item.id))
            .map((item) => String(item.protocolo));
          dadosRetiradaBruto.observacoes = montarObservacoes(protocolosEntregues);
          dadosRetiradaBruto.retiradaEmConjunto =
            protocolosEntregues.length > 0 ? protocolosEntregues : undefined;
        }
      }

      setProgress(100);

      const dataHoje = new Date().toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      });

      setFinalAvisoUrl(linkAviso);
      setLinkSistemaFinal(linkRecibo);

      // ✅ MENSAGEM PADRONIZADA COM LAYOUT CORRIGIDO
      const msgFinal = `*CONFIRMAÇÃO DE RETIRADA*

Olá, *${correspondencia.moradorNome}*!
Unidade: ${correspondencia.apartamento} (${correspondencia.blocoNome})

${volumes > 1 ? `Suas ${volumes} correspondências foram retiradas com sucesso.` : "Sua encomenda foi retirada com sucesso."}
Obrigado!

━━━━━━━━━━━━━━━━
│ Protocolo: ${correspondencia.protocolo}${
        protocolosEntregues.length > 0
          ? `\n│ Também retirados: ${protocolosEntregues.map((p) => `#${p}`).join(", ")}`
          : ""
      }
│ Retirado por: ${nomeFinal}
│ Atendido por: ${user?.nome || "Porteiro"}
│ Retirado em: ${dataHoje}
━━━━━━━━━━━━━━━━`;

      setMensagemFormatada(msgFinal);

      // Baixa confirmada: libera o porteiro imediatamente e descarta o rascunho,
      // que a partir daqui só serviria para reabrir uma retirada já feita.
      setBaixaConcluida(true);
      setLoading(false);
      setShowSuccessModal(true);

      // BACKGROUND: recibo em PDF, uploads e anexos — não bloqueiam a confirmação.
      void (async () => {
        try {
          // Base64 local só para renderizar a foto no PDF (evita ida à rede);
          // no banco fica a URL do storage. Ler o arquivo local não depende do
          // upload: o PDF é gerado enquanto a foto ainda sobe.
          const fotosParaPdf = (
            await Promise.all(
              fotos.map(async (foto) => {
                if (foto.base64) return foto.base64;
                try { return await fileToBase64(foto.file); } catch { return ""; }
              })
            )
          ).filter(Boolean);
          const fotoParaPdf = fotosParaPdf[0] || "";

          const pdfBlob = await gerarReciboPDF({
            correspondencia,
            dadosRetirada: { ...dadosRetiradaBruto, fotoComprovanteUrl: fotoParaPdf },
            fotosComprovante: fotosParaPdf,
            nomeCondominio: correspondencia.condominioNome || "Condomínio",
            logoUrl: "/logo-app-correspondencia.png",
            linkPublicoRecibo: linkRecibo,
          });

          const pdfFileName = `recibo_${correspondencia.protocolo}_${timestamp}.pdf`;
          const { error: uploadError } = await supabase.storage
            .from("correspondencias")
            .upload(pdfFileName, pdfBlob, { contentType: "application/pdf" });

          let publicPdfUrl = "";
          if (!uploadError) {
            publicPdfUrl = supabase.storage
              .from("correspondencias")
              .getPublicUrl(pdfFileName).data.publicUrl;
            setFinalPdfUrl(publicPdfUrl);
          }

          // O comprovante depende só do PDF: dispara agora e segue em paralelo
          // com as gravações abaixo, em vez de esperar a fila inteira.
          const destinatario = (moradorEmail || "").trim();
          const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario);
          const envioEmail =
            destinatario && emailValido
              ? (async () => {
                  const quando = new Date(dadosRetiradaBruto.dataHoraRetirada);
                  const payloadEmail = {
                    nomeMorador: correspondencia.moradorNome || "Morador",
                    tipoCorrespondencia: correspondencia.tipoCorrespondencia || "Correspondência",
                    dataRetirada: quando.toLocaleDateString("pt-BR"),
                    horaRetirada: quando.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
                    quemRetirou: dadosRetiradaBruto.nomeQuemRetirou,
                    responsavelEntrega: dadosRetiradaBruto.nomePorteiro,
                    condominioNome: correspondencia.condominioNome || "Condomínio",
                    protocolo: String(correspondencia.protocolo || ""),
                    protocolosJuntos:
                      protocolosEntregues.length > 0 ? protocolosEntregues : undefined,
                    unidade: [correspondencia.blocoNome, correspondencia.apartamento]
                      .filter(Boolean)
                      .join(" - "),
                    assinaturaUrl: linkRecibo,
                    reciboUrl: publicPdfUrl || undefined,
                  };

                  // Uma retentativa cobre queda momentânea de rede da portaria.
                  let enviado = await EmailService.enviarReciboRetirada(destinatario, payloadEmail);
                  if (!enviado) {
                    await new Promise((r) => setTimeout(r, 5000));
                    enviado = await EmailService.enviarReciboRetirada(destinatario, payloadEmail);
                  }
                  return enviado;
                })().catch((emailErr) => {
                  console.error("Erro ao enviar o comprovante por e-mail:", emailErr);
                  return false;
                })
              : null;

          const fotoUrl = await fotoUploadPromise;

          // Anexa recibo e URL da foto (storage) à baixa já registrada.
          // Mantém base64 como fallback só se o upload da foto falhou.
          dadosRetiradaBruto.fotoComprovanteUrl = fotoUrl || fotoParaPdf || undefined;
          const gravacaoComplementar = (async () => {
            await supabase
              .from("correspondencias")
              .update(
                removerUndefined({
                  recibo_url: publicPdfUrl || undefined,
                  dados_retirada: removerUndefined(dadosRetiradaBruto),
                })
              )
              .eq("id", correspondencia.id);

            // O mesmo PDF vale para o lote inteiro (ele lista todos os
            // protocolos). Sem isso, abrir o recibo das demais mostrava
            // "nenhum anexo de recibo digital encontrado".
            const idsDoLote = idsBaixadosRef.current.filter(
              (id) => id !== correspondencia.id
            );
            if (idsDoLote.length > 0) {
              await supabase
                .from("correspondencias")
                .update(
                  removerUndefined({
                    recibo_url: publicPdfUrl || undefined,
                    dados_retirada: removerUndefined({
                      ...dadosRetiradaBruto,
                      retiradaEmConjunto: undefined,
                      protocoloPrincipal: String(correspondencia.protocolo || ""),
                    }),
                  })
                )
                .in("id", idsDoLote);
            }
          })().catch((gravacaoErr) => {
            // Handler imediato: o `await` desta promise só acontece depois do
            // e-mail (que pode levar segundos com a retentativa), e sem ele a
            // falha vira "unhandled rejection" nesse intervalo.
            console.error("Erro ao anexar recibo e foto à retirada:", gravacaoErr);
          });

          // Histórico em `retiradas` é secundário — best-effort.
          // Colunas em snake_case: o objeto interno é camelCase e o insert
          // rejeitaria as chaves desconhecidas.
          // Uma linha por correspondência entregue: o histórico é consultado
          // por protocolo, e um registro só deixaria as do lote sem rastro.
          // Pelos ids que o banco confirmou, não pelos marcados na tela: se a
          // baixa em conjunto falhou, o histórico não pode dizer que saiu.
          const linhasHistorico = [
            { id: correspondencia.id, protocolo: String(correspondencia.protocolo || "") },
            ...outrasPendentes
              .filter(
                (item) =>
                  item.id !== correspondencia.id &&
                  idsBaixadosRef.current.includes(item.id)
              )
              .map((item) => ({ id: item.id, protocolo: String(item.protocolo || "") })),
          ];

          supabase
            .from("retiradas")
            .insert(
              linhasHistorico.map((linha) => removerUndefined({
                correspondencia_id: linha.id,
                protocolo: linha.protocolo,
                condominio_id: user?.condominioId || "",
                nome_quem_retirou: dadosRetiradaBruto.nomeQuemRetirou,
                cpf_quem_retirou: dadosRetiradaBruto.cpfQuemRetirou,
                telefone_quem_retirou: dadosRetiradaBruto.telefoneQuemRetirou,
                nome_porteiro: dadosRetiradaBruto.nomePorteiro,
                data_hora_retirada: dadosRetiradaBruto.dataHoraRetirada,
                assinatura_morador: dadosRetiradaBruto.assinaturaMorador,
                assinatura_porteiro: dadosRetiradaBruto.assinaturaPorteiro,
                foto_comprovante_url: dadosRetiradaBruto.fotoComprovanteUrl,
                observacoes: dadosRetiradaBruto.observacoes,
                codigo_verificacao: dadosRetiradaBruto.codigoVerificacao,
                // `retiradas` não tem recibo_url: a coluna que existe é a de
                // `correspondencias`, e mandá-la aqui rejeitava o insert inteiro.
                status: "concluida",
                criado_em: new Date().toISOString(),
              }))
            )
            .then(({ error: histError }) => {
              if (histError) console.error("Erro ao registrar histórico de retirada:", histError);
            });

          // Registra no comprovante para quem o recibo foi enviado. O segundo
          // update precisa vir depois do primeiro para não sobrescrevê-lo.
          const enviado = envioEmail ? await envioEmail : false;
          await gravacaoComplementar;

          if (enviado) {
            dadosRetiradaBruto.reciboEnviadoPara = destinatario;
            await supabase
              .from("correspondencias")
              .update({ dados_retirada: removerUndefined(dadosRetiradaBruto) })
              .eq("id", correspondencia.id);
          }
        } catch (bgErr) {
          console.error("Erro no processamento em background da retirada:", bgErr);
        }
      })();
    } catch (err: any) {
      console.error("Erro crítica:", err);
      setError(`Erro: ${err?.message || "Falha ao processar"}`);
      setLoading(false);
    }
  }

  // ADICIONAR MANIPULADOR DE TECLA PARA O TEXTAREA
  const handleKeyDownObservacoes = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      avancarParaAssinaturas();
    }
  };

  const handleCloseSuccess = () => {
    onSuccess(idsBaixadosRef.current);
  };

  if (showSuccessModal) {
    return (
      <ModalSucessoRetirada
        id={correspondencia.id}
        protocolo={correspondencia.protocolo}
        moradorNome={correspondencia.moradorNome}
        telefoneMorador={moradorPhone}
        emailMorador={moradorEmail}
        pdfUrl={linkSistemaFinal}
        avisoUrl={finalAvisoUrl}
        mensagemFormatada={mensagemFormatada}
        onClose={handleCloseSuccess}
      />
    );
  }

  const wrapperClass = embedded
    ? "w-full h-full bg-white flex flex-col"
    : "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4";

  const containerClass = embedded
    ? "flex-1 overflow-y-auto"
    : "bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto";

  return (
    <div className={wrapperClass}>
      <LoadingOverlay isVisible={loading} progress={progress} message={message} />

      <div className={containerClass}>
        {!embedded && (
          <div className="bg-[#057321] text-white p-6 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Indicador de etapa */}
              {modoRapido ? (
                <div className="bg-white/20 rounded-full p-2">
                  <Zap size={20} />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${etapaAtual === 'observacoes' ? 'font-bold text-white' : 'text-green-100'}`}>
                    1. Observações
                  </span>
                  <ArrowRight size={16} className="text-green-200" />
                  <span className={`text-sm ${etapaAtual === 'assinaturas' ? 'font-bold text-white' : 'text-green-100'}`}>
                    2. Assinaturas
                  </span>
                </div>
              )}

              <div>
                <h2 className="text-2xl font-bold">{modoRapido ? "Registro Rápido" : "Registrar Retirada"}</h2>
                <p className="text-green-100 text-sm mt-1">
                  Protocolo: {correspondencia.protocolo}
                  {volumes > 1 && (
                    <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold text-white">
                      {volumes} correspondências
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-[#046119] p-2 rounded-lg transition-colors"
              disabled={loading}
              type="button"
            >
              <X size={24} />
            </button>
          </div>
        )}

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {outrasPendentes.length > 0 && (
            <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <Package className="mt-0.5 flex-shrink-0 text-amber-600" size={20} />
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-900">
                    {emLote
                      ? `Entrega em lote: ${idsJuntos.length + 1} de ${outrasPendentes.length + 1} correspondências.`
                      : `Este morador tem mais ${outrasPendentes.length} ${
                          outrasPendentes.length === 1
                            ? "encomenda pendente"
                            : "encomendas pendentes"
                        }.`}
                  </p>
                  <p className="mt-0.5 text-xs text-amber-800">
                    {emLote
                      ? "Todas já estão marcadas. Desmarque as que ficam na portaria — uma assinatura dá baixa nas marcadas."
                      : "Marque as que estão sendo entregues agora: elas saem da portaria com esta mesma assinatura."}
                  </p>

                  <div className="mt-3 space-y-1.5">
                    {outrasPendentes.map((item) => (
                      <label
                        key={item.id}
                        className="flex cursor-pointer items-start gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2"
                      >
                        <input
                          type="checkbox"
                          checked={idsJuntos.includes(item.id)}
                          onChange={() => alternarJunto(item.id)}
                          disabled={loading}
                          className="mt-0.5 h-4 w-4 accent-[#057321]"
                        />
                        <span className="text-xs leading-snug text-gray-800">
                          <span className="font-bold">#{item.protocolo}</span>
                          {item.criado_em && (
                            <span className="text-gray-500">
                              {" "}
                              · {new Date(item.criado_em).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                          {item.observacao && <span className="block text-gray-600">{item.observacao}</span>}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="mt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIdsJuntos(outrasPendentes.map((item) => item.id))}
                      disabled={loading}
                      className="text-xs font-bold text-[#057321] underline"
                    >
                      Marcar todas
                    </button>
                    {idsJuntos.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIdsJuntos([])}
                        disabled={loading}
                        className="text-xs font-bold text-gray-500 underline"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 1: OBSERVAÇÕES E DADOS BÁSICOS */}
          {etapaAtual === 'observacoes' ? (
            <>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Dados da Correspondência</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Morador:</span>
                    <span className="ml-2 font-medium">{correspondencia.moradorNome}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Bloco/Apto:</span>
                    <span className="ml-2 font-medium">
                      {correspondencia.blocoNome} - {correspondencia.apartamento}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome de quem retirou *
                  </label>
                  <input
                    type="text"
                    value={nomeQuemRetirou}
                    onChange={(e) => setNomeQuemRetirou(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#057321] focus:border-[#057321]"
                    placeholder="Nome completo"
                    disabled={loading}
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">CPF</label>
                    <input
                      type="text"
                      value={cpfQuemRetirou}
                      onChange={(e) => setCpfQuemRetirou(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#057321] focus:border-[#057321]"
                      placeholder="000.000.000-00"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={15}
                      value={telefoneQuemRetirou}
                      onChange={(e) => setTelefoneQuemRetirou(formatarTelefone(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#057321] focus:border-[#057321]"
                      placeholder="(00) 00000-0000"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fotos da Retirada (opcional)
                  </label>
                  <UploadImagens
                    fotos={fotos}
                    onChange={setFotos}
                    textoBotao="Tirar Foto da Retirada"
                    textoAdicionar={"Mais\numa foto"}
                    rotuloFoto="Foto da retirada"
                    rotuloContagem={(quantidade) =>
                      quantidade === 1 ? "1 foto da retirada" : `${quantidade} fotos desta retirada`
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observações <span className="text-xs text-gray-500">(Ctrl+Enter para avançar)</span>
                  </label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    onKeyDown={handleKeyDownObservacoes}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#057321] focus:border-[#057321]"
                    disabled={loading}
                    placeholder="Digite observações sobre a retirada..."
                  />
                </div>

                {/* Botão flutuante quando o textarea tem conteúdo */}
                {observacoes.trim().length > 0 && (
                  <div className="fixed bottom-6 right-6 z-50 animate-bounce">
                    <button
                      onClick={avancarParaAssinaturas}
                      className="bg-green-600 text-white p-3 rounded-full shadow-lg hover:bg-green-700 transition-all flex items-center justify-center"
                      title="Clique para ir às assinaturas"
                      type="button"
                    >
                      <ArrowRight size={24} />
                    </button>
                  </div>
                )}
              </div>

              {/* Botões da etapa de observações */}
              <div className="bg-gray-50 p-6 rounded-b-lg flex justify-between gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all"
                  disabled={loading}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  onClick={avancarParaAssinaturas}
                  disabled={loading || !nomeQuemRetirou.trim()}
                  className="flex items-center gap-2 px-6 py-2 bg-[#057321] text-white rounded-lg hover:bg-[#046119] disabled:bg-gray-400 transition-all"
                  type="button"
                >
                  Próximo: Assinaturas <ArrowRight size={20} />
                </button>
              </div>
            </>
          ) : (
            /* ETAPA 2: ASSINATURAS */
            <>
              <div className="space-y-4">
                {/* REGISTRO RÁPIDO: dados puxados pelo protocolo, só falta assinar */}
                {modoRapido && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex gap-4">
                      {correspondencia.imagemUrl ? (
                        <img
                          src={correspondencia.imagemUrl}
                          alt="Foto da correspondência"
                          className="w-24 h-24 object-cover rounded-lg border border-green-200 bg-white flex-shrink-0"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-lg border border-dashed border-green-300 bg-white flex items-center justify-center text-green-300 flex-shrink-0">
                          <Package size={28} />
                        </div>
                      )}
                      <div className="text-sm space-y-1 min-w-0">
                        <p className="font-bold text-gray-900 text-base truncate">
                          {correspondencia.moradorNome}
                        </p>
                        <p className="text-gray-600">
                          {correspondencia.blocoNome} - {correspondencia.apartamento}
                        </p>
                        <p className="text-gray-600">
                          {correspondencia.tipoCorrespondencia || "Correspondência"} · Protocolo #{correspondencia.protocolo}
                        </p>
                        {volumes > 1 && (
                          <p className="inline-flex items-center gap-1 rounded-md bg-[#057321] px-2 py-0.5 text-xs font-bold text-white">
                            <Package size={12} /> Entregar {volumes} correspondências
                          </p>
                        )}
                        {moradorEmail && (
                          <p className="text-xs text-[#057321] flex items-center gap-1">
                            <Mail size={12} /> Recibo será enviado para {moradorEmail}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Retirado por *
                      </label>
                      <input
                        type="text"
                        value={nomeQuemRetirou}
                        onChange={(e) => setNomeQuemRetirou(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-[#057321] focus:border-[#057321]"
                        placeholder="Nome de quem está retirando"
                        disabled={loading}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Preenchido com o morador. Altere se outra pessoa estiver retirando.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {modoRapido ? "Assinatura de quem retirou" : "Assinaturas Digitais"}
                  </h3>
                  <button
                    onClick={voltarParaObservacoes}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-[#057321]"
                    type="button"
                  >
                    <ArrowLeft size={16} />
                    {modoRapido ? "Mais dados (CPF, foto, obs.)" : "Voltar para Observações"}
                  </button>
                </div>

                {/* Sempre disponível: escondê-la quando não é obrigatória
                    impedia colher a assinatura de quem retirou. */}
                <AssinaturaDigitalPro
                  onSave={setAssinaturaMorador}
                  assinaturaInicial={assinaturaMorador}
                  label={
                    exigeAssinaturaMorador
                      ? "Assinatura de quem retirou *"
                      : "Assinatura de quem retirou"
                  }
                  obrigatorio={exigeAssinaturaMorador}
                />

                <div className="space-y-2">
                  <AssinaturaDigitalPro
                    onSave={setAssinaturaPorteiro}
                    assinaturaInicial={assinaturaPorteiro}
                    label="Assinatura do Porteiro"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="salvarPadrao"
                      checked={salvarPadrao}
                      onChange={(e) => setSalvarPadrao(e.target.checked)}
                      className="w-4 h-4 text-[#057321] border-gray-300 rounded focus:ring-[#057321] cursor-pointer"
                    />
                    <label
                      htmlFor="salvarPadrao"
                      className="text-sm text-gray-600 cursor-pointer select-none flex items-center gap-1"
                    >
                      Salvar esta assinatura como padrão para{" "}
                      <strong>{user?.nome?.split(" ")[0]}</strong>
                    </label>
                  </div>
                </div>

                {/* Resumo dos dados da etapa anterior */}
                <div className={`bg-blue-50 border border-blue-100 rounded-lg p-4 mt-6 ${modoRapido && !cpfQuemRetirou && !observacoes ? "hidden" : ""}`}>
                  <h4 className="font-medium text-blue-900 mb-2">Resumo da Retirada</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-blue-600">Retirado por:</span>
                      <span className="ml-2 font-medium">{nomeQuemRetirou}</span>
                    </div>
                    {cpfQuemRetirou && (
                      <div>
                        <span className="text-blue-600">CPF:</span>
                        <span className="ml-2 font-medium">{cpfQuemRetirou}</span>
                      </div>
                    )}
                    {observacoes && (
                      <div className="col-span-2">
                        <span className="text-blue-600">Observações:</span>
                        <p className="mt-1 text-gray-700 bg-white p-2 rounded border">{observacoes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Botões da etapa de assinaturas */}
              <div className="bg-gray-50 p-6 rounded-b-lg flex flex-wrap justify-between items-center gap-3">
                <button
                  onClick={voltarParaObservacoes}
                  className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all"
                  disabled={loading}
                  type="button"
                >
                  <ArrowLeft size={20} /> {modoRapido ? "Mais dados" : "Voltar"}
                </button>
                <div className="flex flex-wrap items-center gap-3">
                  {modoRapido && (
                    <button
                      onClick={alternarDispensaFixa}
                      disabled={loading}
                      aria-pressed={dispensaFixa}
                      title={
                        dispensaFixa
                          ? "Ativo: as baixas do registro rápido saem só com a leitura do QR Code. Toque para voltar a exigir assinatura."
                          : "Toque para dispensar foto e assinatura em todos os registros rápidos deste aparelho."
                      }
                      className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all disabled:opacity-60 ${
                        dispensaFixa
                          ? "bg-amber-500 text-white hover:bg-amber-600"
                          : "border border-amber-400 text-amber-700 hover:bg-amber-50"
                      }`}
                      type="button"
                    >
                      {dispensaFixa ? <Check size={20} /> : <Zap size={20} />}
                      Sem foto/assinatura
                    </button>
                  )}
                  <button
                    onClick={() => handleConfirmarRetirada()}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2 bg-[#057321] text-white rounded-lg hover:bg-[#046119] disabled:bg-gray-400 transition-all"
                    type="button"
                  >
                    <Save size={20} />
                    {loading ? "Processando..." : "Confirmar Retirada"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}