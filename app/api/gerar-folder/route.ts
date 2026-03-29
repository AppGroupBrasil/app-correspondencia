// app/api/gerar-folder/route.ts

import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { ensureSameCondominio, RequestAuthError, requireRequestAuth } from '@/app/lib/server-auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authContext = await requireRequestAuth(request, ['responsavel', 'admin', 'adminMaster']);
    const { condominioId, condominioNome, condominioEndereco, baseUrl } = await request.json();

    if (!condominioId) {
      return NextResponse.json({ error: 'ID do condomínio é obrigatório' }, { status: 400 });
    }

    ensureSameCondominio(authContext, condominioId);

    // Gerar URL de cadastro com ID do condomínio
    const resolvedBaseUrl = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://appcorrespondencia.com.br';
    const cadastroUrl = `${resolvedBaseUrl}/cadastro-morador?condominio=${condominioId}`;

    // Gerar QR Code como data URL
    const qrCodeDataUrl = await QRCode.toDataURL(cadastroUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Retornar dados para o frontend gerar o PDF
    return NextResponse.json({
      success: true,
      qrCode: qrCodeDataUrl,
      cadastroUrl,
      condominioNome,
      condominioEndereco
    });

  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('Erro ao gerar folder:', error);
    return NextResponse.json({ error: 'Erro ao gerar folder' }, { status: 500 });
  }
}