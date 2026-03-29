import { jsPDF } from "jspdf";
import QRCode from "qrcode";

interface DadosEtiqueta {
  protocolo: string;
  condominioNome: string;
  moradorNome: string;
  bloco: string;
  apartamento: string;
  dataChegada: string;
  recebidoPor?: string;
  observacao?: string;
  fotoUrl?: string; 
  logoUrl?: string;
  localRetirada?: string;
  linkPublico?: string;
}

// Cache para logo (carrega uma vez, usa sempre)
let logoCache: string | null = null;

/**
 * Processa imagem de forma otimizada
 * Se já for base64, retorna diretamente
 * Se for URL, faz fetch e converte
 */
async function processarImagem(url: string, isLogo: boolean): Promise<string> {
  if (!url) return "";
  
  // Se já é base64, retorna diretamente (já está otimizado)
  if (url.startsWith("data:")) return url;

  // Para logo, usar cache
  if (isLogo && logoCache) return logoCache;

  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return "";
    const blob = await response.blob();
    const imgBitmap = await createImageBitmap(blob);

    // Dimensões otimizadas para 1/4 A4
    const MAX_WIDTH = isLogo ? 100 : 400; 
    const MAX_HEIGHT = isLogo ? 100 : 560;
    
    let width = imgBitmap.width;
    let height = imgBitmap.height;

    // Calcular proporção
    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
      const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return "";

    if (isLogo) {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(imgBitmap, 0, 0, width, height);
      const result = canvas.toDataURL('image/png', 0.8);
      logoCache = result; // Cachear logo
      return result;
    } else {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imgBitmap, 0, 0, width, height);
      return canvas.toDataURL('image/jpeg', 0.75);
    }
  } catch (e) {
    console.error("Erro ao processar imagem:", e);
    return ""; 
  }
}

const safeText = (text: string | undefined) => text || "-";

function formatarDataEtiqueta(data: any): string {
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

function calcularTamanhoFonte(nomeLength: number): number {
  if (nomeLength > 40) return 10;
  if (nomeLength > 30) return 12;
  if (nomeLength > 24) return 14;
  return 16;
}

function desenharCabecalhoEtiqueta(
  doc: jsPDF, dados: DadosEtiqueta, margin: number, pageWidth: number, logoBase64: string
): void {
  doc.setFillColor("#057321");
  doc.rect(0, 0, pageWidth, 35, "F");

  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", margin, 5.5, 24, 24);
    } catch (e) { console.warn("Erro ao adicionar logo ao PDF:", e); }
  }

  doc.setTextColor(255, 255, 255);
  const nomeCondominio = safeText(dados.condominioNome);
  doc.setFontSize(calcularTamanhoFonte(nomeCondominio.length));
  doc.setFont("helvetica", "bold");
  doc.text(nomeCondominio, margin + 35, 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Sistema de Gestão de Encomendas", margin + 35, 18);

  doc.setFont("helvetica", "bold");
  doc.text(`Resp: ${safeText(dados.recebidoPor)}`, margin + 35, 24);

  doc.setFont("helvetica", "normal");
  doc.text(`Data: ${formatarDataEtiqueta(dados.dataChegada)}`, margin + 35, 30);
}

function desenharFotoQrEtiqueta(
  doc: jsPDF, contentY: number, colWidth: number,
  centerX1: number, centerX2: number,
  fotoBase64: string, qrCodeUrl: string
): void {
  if (fotoBase64) {
    try {
      const imgProps = doc.getImageProperties(fotoBase64);
      const maxW = colWidth - 6;
      const maxH = 65;
      const ratio = Math.min(maxW / imgProps.width, maxH / imgProps.height);
      doc.addImage(fotoBase64, "JPEG", centerX1 - ((imgProps.width * ratio) / 2), contentY, imgProps.width * ratio, imgProps.height * ratio);
    } catch (e) {
      console.error("Erro ao adicionar foto ao PDF:", e);
    }
  } else {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Sem foto", centerX1, contentY + 30, { align: "center" });
  }

  try {
    const qrSize = 45;
    doc.addImage(qrCodeUrl, "PNG", centerX2 - (qrSize / 2), contentY + 5, qrSize, qrSize);
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.text("Apresente este código", centerX2, contentY + qrSize + 8, { align: "center" });
  } catch (e) {
    console.error("Erro ao adicionar QR Code:", e);
  }
}

export async function gerarEtiquetaPDF(dados: DadosEtiqueta): Promise<Blob> {
  const doc = new jsPDF({ compress: true });
  const pageWidth = doc.internal.pageSize.getWidth(); 
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  const verdeOficial = "#057321"; 

  const qrContent = dados.linkPublico || JSON.stringify({ p: dados.protocolo, d: dados.dataChegada });
  
  // Processar todas as imagens em paralelo para máxima velocidade
  const [logoBase64, fotoBase64, qrCodeUrl] = await Promise.all([
    processarImagem(dados.logoUrl || "", true),
    dados.fotoUrl?.startsWith("data:") ? Promise.resolve(dados.fotoUrl) : processarImagem(dados.fotoUrl || "", false),
    QRCode.toDataURL(qrContent, { width: 150, margin: 1, errorCorrectionLevel: 'M' })
  ]);

  // ==========================================
  // 1. CABEÇALHO
  // ==========================================
  desenharCabecalhoEtiqueta(doc, dados, margin, pageWidth, logoBase64);

  let y = 50;

  // ==========================================
  // 2. TÍTULO
  // ==========================================
  doc.setTextColor(40, 60, 80); 
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("AVISO DE CHEGADA", pageWidth / 2, y, { align: "center" });
  
  y += 15;

  const drawSection = (title: string, height: number) => {
    doc.setFillColor(verdeOficial);
    doc.roundedRect(margin, y, contentWidth, 8, 1, 1, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(title, margin + 5, y + 5.5);

    doc.setDrawColor(verdeOficial);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, y, contentWidth, height + 8, 1, 1, "S"); 
    
    return y + 12; 
  };
  
  // ==========================================
  // 3. DESTINATÁRIO
  // ==========================================
  let contentY = drawSection("DESTINATÁRIO", 36);
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  const gap = 7;

  doc.setFont("helvetica", "bold"); doc.text("Morador:", margin + 5, contentY);
  doc.setFont("helvetica", "normal"); doc.text(safeText(dados.moradorNome), margin + 25, contentY);

  contentY += gap;
  doc.setFont("helvetica", "bold"); doc.text("Unidade:", margin + 5, contentY);
  doc.setFont("helvetica", "normal"); doc.text(`${safeText(dados.bloco)} - ${safeText(dados.apartamento)}`, margin + 25, contentY);

  contentY += gap;
  doc.setFont("helvetica", "bold"); doc.text("Protocolo:", margin + 5, contentY);
  doc.setFontSize(12); doc.text(`#${safeText(dados.protocolo)}`, margin + 25, contentY);

  y += 55;

  // ==========================================
  // 4. LOCAL DE RETIRADA
  // ==========================================
  contentY = drawSection("LOCAL DE RETIRADA", 16);
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12); 
  doc.setFont("helvetica", "bold");
  
  const local = dados.localRetirada || "Portaria";
  doc.text(local.toUpperCase(), margin + 5, contentY + 4); 

  y += 35;

  // ==========================================
  // 5. OBSERVAÇÕES
  // ==========================================
  const obsTexto = dados.observacao || "Sem observações";
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const obsLines = doc.splitTextToSize(String(obsTexto), contentWidth - 10);
  const obsHeight = Math.max(24, (obsLines.length * 5) + 10);

  contentY = drawSection("OBSERVAÇÕES", obsHeight);
  
  doc.setTextColor(0, 0, 0); 
  doc.text(obsLines, margin + 5, contentY);

  y += (obsHeight + 15);

  // ==========================================
  // 6. FOTO E QR CODE
  // ==========================================
  if (y + 80 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
    y = 20;
  }

  contentY = drawSection("VISUAL E RETIRADA", 80);
  
  const colWidth = contentWidth / 2;
  const centerX1 = margin + (colWidth / 2);
  const centerX2 = margin + colWidth + (colWidth / 2);

  // FOTO + QR CODE
  desenharFotoQrEtiqueta(doc, contentY, colWidth, centerX1, centerX2, fotoBase64, qrCodeUrl);

  // ==========================================
  // RODAPÉ
  // ==========================================
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(verdeOficial);
  doc.rect(0, pageH - 15, pageWidth, 15, "F");

  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255); 
  doc.text("Gerado via App Correspondência", pageWidth / 2, pageH - 6, { align: "center" });

  return doc.output("blob");
}
