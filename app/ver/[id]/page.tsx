// app/ver/[id]/page.tsx

import DetalhesView from "../detalhes-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DetalhesView id={id} />;
}

// Necessário para o build estático (Android)
export async function generateStaticParams() {
  return [{ id: '1' }];
}
