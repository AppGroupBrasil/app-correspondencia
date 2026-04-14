import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/app/lib/supabase";

const PUBLIC_COLLECTIONS = ["correspondencias", "avisos_rapidos"] as const;
const ALLOWED_BUCKETS = new Set(["correspondencias", "retiradas", "avisos"]);
const DOCUMENT_TYPES = new Set(["aviso", "recibo"]);

function guessContentType(filePath: string) {
  const lowerPath = filePath.toLowerCase();

  if (lowerPath.endsWith(".pdf")) return "application/pdf";
  if (lowerPath.endsWith(".png")) return "image/png";
  if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) return "image/jpeg";
  if (lowerPath.endsWith(".webp")) return "image/webp";

  return "application/octet-stream";
}

function getPublicOrigin(req: NextRequest) {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL;
  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, "");
  }

  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");

  if (forwardedHost) {
    return `${forwardedProto || "https"}://${forwardedHost}`;
  }

  return req.nextUrl.origin;
}

function buildProxyUrl(req: NextRequest, id: string, documentType?: string | null) {
  const proxyUrl = new URL(req.nextUrl.pathname, getPublicOrigin(req));
  proxyUrl.searchParams.set("id", id);
  if (documentType && DOCUMENT_TYPES.has(documentType)) {
    proxyUrl.searchParams.set("type", documentType);
  }
  proxyUrl.searchParams.set("download", "1");
  return proxyUrl.toString();
}

function getDocumentFileUrl(data: Record<string, any>, documentType?: string | null) {
  if (documentType === "recibo") {
    return (
      data?.recibo_url ||
      data?.dados_retirada?.recibo_url ||
      data?.dados_retirada?.reciboUrl ||
      data?.dados_retirada?.foto_comprovante_url ||
      data?.dados_retirada?.fotoComprovanteUrl ||
      ""
    );
  }

  return (
    data?.pdf_url ||
    data?.foto_url ||
    data?.imagem_url ||
    data?.recibo_url ||
    data?.dados_retirada?.recibo_url ||
    data?.dados_retirada?.reciboUrl ||
    ""
  );
}

function extractStorageTarget(fileUrl: string) {
  try {
    const parsedUrl = new URL(fileUrl);
    const publicMarker = "/storage/v1/object/public/";
    const signMarker = "/storage/v1/object/sign/";
    const authenticatedMarker = "/storage/v1/object/authenticated/";

    let marker = "";
    if (parsedUrl.pathname.includes(publicMarker)) marker = publicMarker;
    if (parsedUrl.pathname.includes(signMarker)) marker = signMarker;
    if (parsedUrl.pathname.includes(authenticatedMarker)) marker = authenticatedMarker;
    if (!marker) return null;

    const storagePath = parsedUrl.pathname.split(marker)[1] || "";
    const [bucket, ...objectParts] = storagePath.split("/");
    const objectPath = objectParts.join("/");

    if (!bucket || !objectPath || !ALLOWED_BUCKETS.has(bucket)) {
      return null;
    }

    return { bucket, objectPath };
  } catch {
    return null;
  }
}

async function findPublicRecordById(id: string) {
  const supabaseAdmin = createServerClient();

  for (const collection of PUBLIC_COLLECTIONS) {
    const { data, error } = await supabaseAdmin
      .from(collection)
      .select("*")
      .eq("id", id)
      .single();

    if (!error && data) {
      return data;
    }
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    const shouldDownload = req.nextUrl.searchParams.get("download") === "1";
    const requestedType = req.nextUrl.searchParams.get("type");
    const documentType = requestedType && DOCUMENT_TYPES.has(requestedType) ? requestedType : null;

    if (!id) {
      return NextResponse.json({ error: "ID é obrigatório." }, { status: 400 });
    }

    const record = await findPublicRecordById(id);
    if (!record) {
      return NextResponse.json({ error: "Registro não encontrado." }, { status: 404 });
    }

    const fileUrl = getDocumentFileUrl(record, documentType);
    if (!fileUrl) {
      return NextResponse.json({ url: "", kind: "text" });
    }

    const storageTarget = extractStorageTarget(fileUrl);
    if (!storageTarget) {
      if (shouldDownload) {
        return NextResponse.redirect(fileUrl, { status: 302 });
      }

      return NextResponse.json({ url: fileUrl, kind: "external" });
    }

    const supabaseAdmin = createServerClient();
    if (shouldDownload) {
      const { data, error } = await supabaseAdmin.storage
        .from(storageTarget.bucket)
        .download(storageTarget.objectPath);

      if (error || !data) {
        return NextResponse.json({ error: error?.message || "Falha ao baixar arquivo." }, { status: 500 });
      }

      const arrayBuffer = await data.arrayBuffer();
      const fileName = storageTarget.objectPath.split("/").pop() || "documento";

      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": data.type || guessContentType(storageTarget.objectPath),
          "Content-Disposition": `inline; filename="${fileName}"`,
          "Cache-Control": "private, max-age=300",
        },
      });
    }

    return NextResponse.json({ url: buildProxyUrl(req, id, documentType), kind: "proxy" });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Erro interno." }, { status: 500 });
  }
}