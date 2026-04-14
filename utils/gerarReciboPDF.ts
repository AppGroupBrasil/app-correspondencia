import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { DadosRetirada } from "@/types/retirada.types";

interface GerarReciboPDFParams {
  correspondencia: any;
  dadosRetirada: DadosRetirada;
  nomeCondominio?: string;
  logoUrl?: string;
  linkPublicoRecibo?: string;
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
  fotoBase64: string; qrCodeBase64: string; codigoVerificacao: string; fotoUrl?: string;
}

function desenharValidacao({
  doc, yPos, pageHeight, margin, contentWidth,
  fotoBase64, qrCodeBase64, codigoVerificacao, fotoUrl
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
  doc.text("REGISTRO VISUAL E VALIDAÇÃO", margin + 3, yPos + 4.5);

  const frameYStart = yPos + 6;
  const frameHeightInner = validationFrameHeight - 6;
  const columnWidth = contentWidth / 2;
  doc.line(margin + columnWidth, frameYStart, margin + columnWidth, yPos + validationFrameHeight);

  if (fotoBase64) {
    try {
      const imgProps = doc.getImageProperties(fotoBase64);
      const maxBoxW = columnWidth - 10;
      const maxBoxH = frameHeightInner - 8;
      const scale = Math.min(maxBoxW / imgProps.width, maxBoxH / imgProps.height);
      const finalW = imgProps.width * scale;
      const finalH = imgProps.height * scale;
      const xImg = margin + (columnWidth - finalW) / 2;
      const yImg = frameYStart + (frameHeightInner - finalH) / 2;
      doc.addImage(fotoBase64, "JPEG", xImg, yImg, finalW, finalH);
    } catch (e) {
      console.warn("Erro ao adicionar foto ao PDF:", e);
    }
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

  const tasks = [
    { id: 'logo', fn: () => logoUrl ? fetchAndCompressImage(logoUrl, false) : Promise.resolve("") },
    { id: 'foto', fn: () => dadosRetirada.fotoComprovanteUrl ? fetchAndCompressImage(dadosRetirada.fotoComprovanteUrl, true) : Promise.resolve("") },
    { id: 'assMorador', fn: () => dadosRetirada.assinaturaMorador ? fetchAndCompressImage(dadosRetirada.assinaturaMorador, false) : Promise.resolve("") },
    { id: 'assPorteiro', fn: () => dadosRetirada.assinaturaPorteiro ? fetchAndCompressImage(dadosRetirada.assinaturaPorteiro, false) : Promise.resolve("") },
    { id: 'qr', fn: () => QRCode.toDataURL(qrCodeData, { width: 250, margin: 1, errorCorrectionLevel: 'L' }) },
  ];

  let completedCount = 0;
  const results = await Promise.all(tasks.map(async (task) => {
    const res = await task.fn();
    completedCount++;
    if (onProgress) onProgress(5 + Math.round((completedCount / tasks.length) * 85));
    return res;
  }));

  const [logoBase64, fotoBase64, assinaturaMoradorBase64, assinaturaPorteiroBase64, qrCodeBase64] = results;

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
  doc.setDrawColor(5, 115, 33);
  doc.setLineWidth(0.2);
  doc.rect(margin, yPosition, contentWidth, 38); 
  yPosition += 5;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);

  const dataEntrada = correspondencia.dataChegada || correspondencia.criadoEm || correspondencia.dataHora || new Date();
  const dataEntradaFmt = formatarData(dataEntrada);

  const infoCorrespondencia = [
    ["Protocolo:", correspondencia.protocolo || "N/A"],
    ["Remetente:", correspondencia.remetente || "Portaria"],
    ["Destinatário:", correspondencia.moradorNome || "Morador"],
    ["Bloco/Apto:", `${correspondencia.blocoNome || ""} - ${correspondencia.apartamento || ""}`],
    ["Chegou em:", dataEntradaFmt],
  ];

  infoCorrespondencia.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin + 3, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), margin + 40, yPosition);
    yPosition += lineHeight;
  });

  yPosition = headerHeight + 10 + 7 + 38 + 8;

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

  yPosition = (headerHeight + 10 + 7 + 38 + 8) + 7 + boxHeightRet + 8;

  // ASSINATURAS
  yPosition = desenharAssinaturas(doc, yPosition, pageWidth, pageHeight, margin, assinaturaMoradorBase64, assinaturaPorteiroBase64);

  // VALIDAÇÃO
  desenharValidacao({ doc, yPos: yPosition, pageHeight, margin, contentWidth, fotoBase64, qrCodeBase64, codigoVerificacao: dadosRetirada.codigoVerificacao, fotoUrl: dadosRetirada.fotoComprovanteUrl });

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  doc.text("Gerado pelo App Correspondência.", pageWidth / 2, pageHeight - 5, { align: "center" });

  if (onProgress) onProgress(100);
  return doc.output("blob");
}