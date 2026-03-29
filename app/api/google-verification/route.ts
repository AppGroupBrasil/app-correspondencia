import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Suporta múltiplos tokens de verificação
  const tokens: Record<string, string> = {
    '/google7e64177092e9a42d.html': 'google-site-verification: google7e64177092e9a42d.html',
    '/google41280a339a8af673.html': 'google-site-verification: google41280a339a8af673.html',
  };

  const content = tokens[path] || 'google-site-verification: google41280a339a8af673.html';

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
