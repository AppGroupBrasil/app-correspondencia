import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { DadosRetirada } from "@/types/retirada.types";
import { derivarFotos, MAX_FOTOS, totalVolumes } from "@/app/lib/fotos-correspondencia";

interface GerarReciboPDFParams {
  correspondencia: any;
  dadosRetirada: DadosRetirada;
  nomeCondominio?: string;
  logoUrl?: string;
  linkPublicoRecibo?: string;
  // Fotos da retirada já em base64 (recibo gerado logo após a baixa, sem ida à
  // rede). Sem isso, saem do nome do arquivo gravado em fotoComprovanteUrl.
  fotosComprovante?: string[];
  onProgress?: (progress: number) => void;
}

const IMAGE_TIMEOUT_MS = 6000;

async function compressImageFromUrl(url: string, isPhoto: boolean): Promise<string> {
  const response = await fetch(url, { mode: 'cors' });
  if (!response.ok) return "";
  const blob = await response.blob();
  const img = await createImageBitmap(blob);
  const MAX_WIDTH = isPhoto ? 350 : 200;
  let width = img.width;
  let height = img.height;
  if (width > MAX_WIDTH) { height = height * (MAX_WIDTH / width); width = MAX_WIDTH; }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return "";
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL(isPhoto ? 'image/jpeg' : 'image/png', isPhoto ? 0.5 : undefined);
}

async function fetchAndCompressImage(url: string, isPhoto: boolean = false): Promise<string> {
  if (!url) return "";
  if (url.startsWith("data:")) return url;

  try {
    const timeoutPromise = new Promise<string>((resolve) => {
      setTimeout(() => { resolve(""); }, IMAGE_TIMEOUT_MS);
    });
    return await Promise.race([compressImageFromUrl(url, isPhoto), timeoutPromise]);
  } catch (error) {
    console.warn("fetchAndCompressImage: falha ao processar imagem", error);
    return "";
  }
}

function formatarData(data: any): string {
  if (!data) return "N/D";
  try {
    if (data?.toDate) return data.toDate().toLocaleString("pt-BR");
    if (data?.seconds) return new Date(data.seconds * 1000).toLocaleString("pt-BR");
    if (typeof data === "string" && data.includes("/")) return data;
    const d = new Date(data);
    return Number.isNaN(d.getTime()) ? String(data) : d.toLocaleString("pt-BR");
  } catch {
    return String(data);
  }
}

function desenharAssinaturas(
  doc: jsPDF, yPos: number, pageWidth: number, pageHeight: number,
  margin: number, assinaturaMoradorBase64: string, assinaturaPorteiroBase64: string
): number {
  if (yPos > pageHeight - 70) { doc.addPage(); yPos = 15; }
  if (!assinaturaMoradorBase64 && !assinaturaPorteiroBase64) return yPos;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Assinaturas", margin, yPos);
  yPos += 3;
  const sigW = 50;
  const sigH = 20;
  if (assinaturaMoradorBase64) {
    doc.addImage(assinaturaMoradorBase64, "PNG", margin, yPos, sigW, sigH);
    doc.setLineWidth(0.1);
    doc.line(margin, yPos + sigH, margin + sigW, yPos + sigH);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Morador/Retirante", margin, yPos + sigH + 3);
  }
  if (assinaturaPorteiroBase64) {
    const xPorteiro = pageWidth - margin - sigW;
    doc.addImage(assinaturaPorteiroBase64, "PNG", xPorteiro, yPos, sigW, sigH);
    doc.setLineWidth(0.1);
    doc.line(xPorteiro, yPos + sigH, xPorteiro + sigW, yPos + sigH);
    doc.text("Porteiro Responsável", xPorteiro, yPos + sigH + 3);
  }
  return yPos + sigH + 8;
}

interface ValidacaoParams {
  doc: jsPDF; yPos: number; pageHeight: number; margin: number; contentWidth: number;
  fotosBase64: string[]; qrCodeBase64: string; codigoVerificacao: string; fotoUrl?: string;
}

// Quantas colunas o mosaico usa para caber n fotos na metade esquerda do quadro.
function colunasDoMosaico(quantidade: number): number {
  if (quantidade <= 2) return quantidade;
  if (quantidade <= 4) return 2;
  if (quantidade <= 6) return 3;
  return 4;
}

function desenharValidacao({
  doc, yPos, pageHeight, margin, contentWidth,
  fotosBase64, qrCodeBase64, codigoVerificacao, fotoUrl
}: ValidacaoParams): void {
  const validationFrameHeight = 55;
  if (yPos + validationFrameHeight > pageHeight - 10) { doc.addPage(); yPos = 15; }
  doc.setFillColor(230, 230, 230);
  doc.rect(margin, yPos, contentWidth, 6, "F");
  doc.setDrawColor(150, 150, 150);
  doc.rect(margin, yPos, contentWidth, validationFrameHeight);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text(
    fotosBase64.length > 1
      ? `REGISTRO VISUAL E VALIDAÇÃO (${fotosBase64.length} FOTOS)`
      : "REGISTRO VISUAL E VALIDAÇÃO",
    margin + 3,
    yPos + 4.5
  );

  const frameYStart = yPos + 6;
  const frameHeightInner = validationFrameHeight - 6;
  const columnWidth = contentWidth / 2;
  doc.line(margin + columnWidth, frameYStart, margin + columnWidth, yPos + validationFrameHeight);

  if (fotosBase64.length === 1) {
    try {
      const imgProps = doc.getImageProperties(fotosBase64[0]);
      const maxBoxW = columnWidth - 10;
      const maxBoxH = frameHeightInner - 8;
      const scale = Math.min(maxBoxW / imgProps.width, maxBoxH / imgProps.height);
      const finalW = imgProps.width * scale;
      const finalH = imgProps.height * scale;
      const xImg = margin + (columnWidth - finalW) / 2;
      const yImg = frameYStart + (frameHeightInner - finalH) / 2;
      doc.addImage(fotosBase64[0], "JPEG", xImg, yImg, finalW, finalH);
    } catch (e) {
      console.warn("Erro ao adicionar foto ao PDF:", e);
    }
  } else if (fotosBase64.length > 1) {
    // Várias correspondências entregues de uma vez: mosaico numerado, para o
    // recibo mostrar cada etiqueta em vez de uma pilha de encomendas.
    const colunas = colunasDoMosaico(fotosBase64.length);
    const linhas = Math.ceil(fotosBase64.length / colunas);
    const larguraCelula = (columnWidth - 6) / colunas;
    const alturaCelula = (frameHeightInner - 4) / linhas;

    fotosBase64.forEach((foto, indice) => {
      const coluna = indice % colunas;
      const linha = Math.floor(indice / colunas);
      const xCelula = margin + 3 + coluna * larguraCelula;
      const yCelula = frameYStart + 2 + linha * alturaCelula;
      try {
        const imgProps = doc.getImageProperties(foto);
        const maxBoxW = larguraCelula - 2;
        const maxBoxH = alturaCelula - 2;
        const scale = Math.min(maxBoxW / imgProps.width, maxBoxH / imgProps.height);
        const finalW = imgProps.width * scale;
        const finalH = imgProps.height * scale;
        const xImg = xCelula + (larguraCelula - finalW) / 2;
        const yImg = yCelula + (alturaCelula - finalH) / 2;
        doc.addImage(foto, "JPEG", xImg, yImg, finalW, finalH);
        // Selo com fundo branco: o número tem de aparecer também sobre foto escura.
        doc.setFillColor(255, 255, 255);
        doc.rect(xImg, yImg + finalH - 3, 3, 3, "F");
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        doc.text(String(indice + 1), xImg + 0.9, yImg + finalH - 0.8);
      } catch (e) {
        console.warn(`Erro ao adicionar a foto ${indice + 1} ao PDF:`, e);
      }
    });
  } else {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(fotoUrl ? "(Erro imagem)" : "Sem foto", margin + (columnWidth / 2), frameYStart + (frameHeightInner / 2), { align: "center" });
  }

  if (qrCodeBase64) {
    const qrSize = 35;
    const xQr = margin + columnWidth + (columnWidth - qrSize) / 2;
    const yQr = frameYStart + (frameHeightInner - qrSize) / 2 - 3;
    doc.addImage(qrCodeBase64, "PNG", xQr, yQr, qrSize, qrSize);
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    doc.text("Validação Digital", xQr + (qrSize / 2), yQr + qrSize + 4, { align: "center" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`Cód: ${codigoVerificacao}`, xQr + (qrSize / 2), yQr + qrSize + 8, { align: "center" });
  }
}

export async function gerarReciboPDF({
  correspondencia,
  dadosRetirada,
  nomeCondominio = "Condomínio",
  logoUrl,
  linkPublicoRecibo,
  fotosComprovante,
  onProgress,
}: GerarReciboPDFParams): Promise<Blob> {
  
  if (onProgress) onProgress(5);

  const qrCodeData =
    linkPublicoRecibo ||
    JSON.stringify({
      p: correspondencia.protocolo,
      d: dadosRetirada.dataHoraRetirada,
      c: dadosRetirada.cpfQuemRetirou,
      v: dadosRetirada.codigoVerificacao,
    });

  // Uma retirada pode levar várias correspondências e, por isso, várias fotos.
  // Elas vêm prontas do modal ou saem do nome do arquivo (lote "2de5").
  const fotosDaRetirada = (
    fotosComprovante && fotosComprovante.length > 0
      ? fotosComprovante
      : derivarFotos(dadosRetirada.fotoComprovanteUrl)
  )
    .filter(Boolean)
    .slice(0, MAX_FOTOS);

  const tasks = [
    { id: 'logo', fn: () => logoUrl ? fetchAndCompressImage(logoUrl, false) : Promise.resolve("") },
    { id: 'assMorador', fn: () => dadosRetirada.assinaturaMorador ? fetchAndCompressImage(dadosRetirada.assinaturaMorador, false) : Promise.resolve("") },
    { id: 'assPorteiro', fn: () => dadosRetirada.assinaturaPorteiro ? fetchAndCompressImage(dadosRetirada.assinaturaPorteiro, false) : Promise.resolve("") },
    { id: 'qr', fn: () => QRCode.toDataURL(qrCodeData, { width: 250, margin: 1, errorCorrectionLevel: 'L' }) },
  ];

  let completedCount = 0;
  const totalEtapas = tasks.length + 1;
  const [results, fotosCarregadas] = await Promise.all([
    Promise.all(tasks.map(async (task) => {
      const res = await task.fn();
      completedCount++;
      if (onProgress) onProgress(5 + Math.round((completedCount / totalEtapas) * 85));
      return res;
    })),
    (async () => {
      const carregadas = await Promise.all(
        fotosDaRetirada.map((url) => fetchAndCompressImage(url, true))
      );
      completedCount++;
      if (onProgress) onProgress(5 + Math.round((completedCount / totalEtapas) * 85));
      return carregadas.filter(Boolean);
    })(),
  ]);

  const [logoBase64, assinaturaMoradorBase64, assinaturaPorteiroBase64, qrCodeBase64] = results;
  const fotosBase64 = fotosCarregadas;

  if (onProgress) onProgress(95);

  const doc = new jsPDF({ compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = 15;

  // CABEÇALHO
  const headerHeight = 30;
  doc.setFillColor(5, 115, 33);
  doc.rect(0, 0, pageWidth, headerHeight, "F");
  if (logoBase64) doc.addImage(logoBase64, "PNG", margin, 5, 18, 18);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("RECIBO DE RETIRADA", pageWidth / 2, 14, { align: "center" }); // TÍTULO CORRIGIDO
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(nomeCondominio, pageWidth / 2, 22, { align: "center" });

  yPosition = headerHeight + 10;
  const lineHeight = 5.5;

  // DADOS DA CORRESPONDÊNCIA
  doc.setFillColor(5, 115, 33);
  doc.roundedRect(margin, yPosition, contentWidth, 7, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("DADOS DA CORRESPONDÊNCIA", margin + 3, yPosition + 5);
  yPosition += 7;

  const dataEntrada = correspondencia.dataChegada || correspondencia.criadoEm || correspondencia.dataHora || new Date();
  const dataEntradaFmt = formatarData(dataEntrada);

  // Registro que agrupa várias correspondências: o recibo é a prova de entrega,
  // então precisa dizer quantas peças saíram com aquela assinatura.
  const volumesEntregues = totalVolumes(correspondencia.imagemUrl);

  // Entrega em lote: uma assinatura só vale para as outras encomendas se o
  // recibo trouxer o protocolo de cada uma delas.
  const protocolosJuntos = Array.isArray(dadosRetirada.retiradaEmConjunto)
    ? dadosRetirada.retiradaEmConjunto.filter(Boolean).map(String)
    : [];
  const protocoloPrincipal = String(correspondencia.protocolo || "N/A");
  const linhasProtocolos =
    protocolosJuntos.length > 0
      ? doc.splitTextToSize(
          [protocoloPrincipal, ...protocolosJuntos].map((p) => `#${p}`).join(", "),
          contentWidth - 43
        )
      : [protocoloPrincipal];

  const infoCorrespondencia: [string, string | string[]][] = [
    [
      protocolosJuntos.length > 0
        ? `Protocolos (${protocolosJuntos.length + 1}):`
        : "Protocolo:",
      linhasProtocolos,
    ],
    ...(volumesEntregues > 1
      ? ([["Volumes:", `${volumesEntregues} correspondências`]] as [string, string][])
      : []),
    ["Remetente:", correspondencia.remetente || "Portaria"],
    ["Destinatário:", correspondencia.moradorNome || "Morador"],
    ["Bloco/Apto:", `${correspondencia.blocoNome || ""} - ${correspondencia.apartamento || ""}`],
    ["Chegou em:", dataEntradaFmt],
  ];

  // A caixa cresce com a lista de protocolos: com altura fixa o texto vazava.
  const boxHeightCorresp =
    38 + (linhasProtocolos.length - 1) * lineHeight;

  doc.setDrawColor(5, 115, 33);
  doc.setLineWidth(0.2);
  doc.rect(margin, yPosition, contentWidth, boxHeightCorresp);
  yPosition += 5;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);

  infoCorrespondencia.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin + 3, yPosition);
    doc.setFont("helvetica", "normal");
    const linhas = Array.isArray(value) ? value : [String(value)];
    doc.text(linhas, margin + 40, yPosition);
    yPosition += lineHeight * linhas.length;
  });

  yPosition = headerHeight + 10 + 7 + boxHeightCorresp + 8;

  // DADOS DA RETIRADA
  doc.setFillColor(5, 115, 33);
  doc.roundedRect(margin, yPosition, contentWidth, 7, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("DADOS DA RETIRADA", margin + 3, yPosition + 5);
  yPosition += 7;
  let boxHeightRet = 32;
  if (dadosRetirada.observacoes && dadosRetirada.observacoes.length > 50) boxHeightRet += 8;
  doc.setDrawColor(5, 115, 33);
  doc.rect(margin, yPosition, contentWidth, boxHeightRet);
  yPosition += 5;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);

  const infoRetirada = [
    ["Retirado em:", formatarData(dadosRetirada.dataHoraRetirada)],
    ["Retirado por:", dadosRetirada.nomeQuemRetirou],
    ["Documento (CPF):", dadosRetirada.cpfQuemRetirou || "Não informado"],
    ["Porteiro resp.:", dadosRetirada.nomePorteiro],
  ];
  if (dadosRetirada.observacoes) infoRetirada.push(["Observações:", dadosRetirada.observacoes]);

  infoRetirada.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin + 3, yPosition);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(String(value), 130);
    doc.text(lines, margin + 40, yPosition);
    yPosition += lineHeight * lines.length;
  });

  yPosition = (headerHeight + 10 + 7 + boxHeightCorresp + 8) + 7 + boxHeightRet + 8;

  // ASSINATURAS
  yPosition = desenharAssinaturas(doc, yPosition, pageWidth, pageHeight, margin, assinaturaMoradorBase64, assinaturaPorteiroBase64);

  // VALIDAÇÃO
  desenharValidacao({ doc, yPos: yPosition, pageHeight, margin, contentWidth, fotosBase64, qrCodeBase64, codigoVerificacao: dadosRetirada.codigoVerificacao, fotoUrl: dadosRetirada.fotoComprovanteUrl });

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  doc.text("Gerado pelo App Correspondência.", pageWidth / 2, pageHeight - 5, { align: "center" });

  if (onProgress) onProgress(100);
  return doc.output("blob");
}