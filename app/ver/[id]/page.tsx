// app/ver/[id]/page.tsx

import DetalhesView from "../detalhes-view";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ type?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const typeParam = resolvedSearchParams?.type;
  const documentType = typeParam === "aviso" || typeParam === "recibo" ? typeParam : undefined;

  return <DetalhesView id={id} documentType={documentType} />;
}

// Necessário para o build estático (Android)
export async function generateStaticParams() {
  return [{ id: '1' }];
}
