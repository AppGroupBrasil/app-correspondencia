"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/app/lib/supabase";
import { X, Save, AlertCircle, ArrowRight, ArrowLeft, Package, Zap, Mail, Check } from "lucide-react";
import AssinaturaDigitalPro from "./AssinaturaDigitalPro";
import UploadImagem from "./UploadImagem";
import { gerarReciboPDF } from "@/utils/gerarReciboPDF";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import ModalSucessoRetirada from "./ModalSucessoRetirada";
import { formatarTelefone } from "@/utils/telefone";
import { EmailService } from "@/services/emailService";
import { totalVolumes } from "@/app/lib/fotos-correspondencia";
import { useRascunho } from "@/hooks/useRascunho";
import { liberarRecarga, travarRecarga } from "@/utils/rascunho";

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
}

interface Props {
  correspondencia: any;
  onClose: () => void;
  onSuccess: () => void;
  embedded?: boolean;
  mensagemFormatada?: string;
  modoRapido?: boolean;
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

  const [imagemFile, setImagemFile] = useState<File | null>(null);
  const [salvarPadrao, setSalvarPadrao] = useState(false);
  const [baixaConcluida, setBaixaConcluida] = useState(false);

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

  // FUNÇÃO handleUpload ADICIONADA
  const handleUpload = (file: File | null) => {
    setImagemFile(file);
  };

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
    const semComprovacao = dispensaAtiva && !assinaturaMorador && !imagemFile;

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

      // A foto já chega comprimida do UploadImagem — sobe ao storage em background,
      // sem recomprimir e sem bloquear a baixa. Só transmissão de rede.
      const fotoUploadPromise: Promise<string> = imagemFile
        ? (async () => {
            try {
              const fotoFileName = `retirada_${correspondencia.protocolo}_${timestamp}.jpg`;
              const { error: fotoError } = await supabase.storage
                .from("retiradas")
                .upload(fotoFileName, imagemFile, { contentType: "image/jpeg" });
              if (fotoError) return "";
              return supabase.storage.from("retiradas").getPublicUrl(fotoFileName).data.publicUrl;
            } catch {
              return "";
            }
          })()
        : Promise.resolve("");

      const dadosRetiradaBruto: DadosRetirada = {
        nomeQuemRetirou: nomeFinal,
        cpfQuemRetirou: cpfQuemRetirou.trim() || undefined,
        telefoneQuemRetirou: telefoneQuemRetirou.trim() || undefined,
        nomePorteiro: user?.nome || "Porteiro",
        dataHoraRetirada: new Date().toISOString(),
        assinaturaMorador: assinaturaMorador || undefined,
        assinaturaPorteiro: assinaturaPorteiro || undefined,
        observacoes: [
          observacoes.trim(),
          semComprovacao ? "Baixa registrada sem assinatura e sem foto (dispensadas no registro rápido)." : "",
        ].filter(Boolean).join(" ") || undefined,
        codigoVerificacao: gerarCodigoVerificacao(),
        modoRegistro: modoRapido ? "rapido" : "completo",
        semComprovacao: semComprovacao || undefined,
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
│ Protocolo: ${correspondencia.protocolo}
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
          let fotoParaPdf = "";
          if (imagemFile) {
            try { fotoParaPdf = await fileToBase64(imagemFile); } catch {}
          }

          const pdfBlob = await gerarReciboPDF({
            correspondencia,
            dadosRetirada: { ...dadosRetiradaBruto, fotoComprovanteUrl: fotoParaPdf },
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
          })().catch((gravacaoErr) => {
            // Handler imediato: o `await` desta promise só acontece depois do
            // e-mail (que pode levar segundos com a retentativa), e sem ele a
            // falha vira "unhandled rejection" nesse intervalo.
            console.error("Erro ao anexar recibo e foto à retirada:", gravacaoErr);
          });

          // Histórico em `retiradas` é secundário — best-effort.
          // Colunas em snake_case: o objeto interno é camelCase e o insert
          // rejeitaria as chaves desconhecidas.
          supabase
            .from("retiradas")
            .insert(
              removerUndefined({
                correspondencia_id: correspondencia.id,
                protocolo: correspondencia.protocolo,
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
                recibo_url: publicPdfUrl || undefined,
                status: "concluida",
                criado_em: new Date().toISOString(),
              })
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
    onSuccess();
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
                    Foto da Retirada (opcional)
                  </label>
                  <UploadImagem onUpload={handleUpload} />
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