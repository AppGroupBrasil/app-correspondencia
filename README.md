# App Correspondência

<div align="center">

**Sistema Premium de Gestão de Correspondências para Condomínios**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-2.103-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

</div>

---

## Sobre o Projeto

Solução completa para a gestão de correspondências em condomínios residenciais e comerciais. Síndicos, porteiros, responsáveis e moradores recebem notificações automáticas e acompanham o ciclo completo (chegada, aviso, retirada com assinatura digital, histórico).

### Destaques

- Interface responsiva (web + Android via Capacitor)
- Notificações por e-mail e WhatsApp
- Autenticação e RLS via Supabase
- QR Code para consulta rápida

## Funcionalidades por Perfil

| Perfil | Funcionalidades |
|--------|-----------------|
| Admin Master | Gestão completa de todos os condomínios, usuários e configurações |
| Admin | Gestão de condomínios, responsáveis e relatórios |
| Responsável | Gestão de um condomínio, aprovação de moradores, configurações |
| Porteiro | Registro de correspondências, retiradas, avisos rápidos |
| Morador | Visualização de correspondências, histórico, notificações |

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 16, React 19, TypeScript |
| Estilo | Tailwind CSS 3.4 |
| Backend | Supabase (Postgres + Auth + Storage + RLS) |
| E-mail | Resend |
| Mobile | Capacitor (Android) |

## Instalação

```bash
git clone <repo-url> app-correspondencia
cd app-correspondencia
npm install
cp .env.example .env.local
# preencher .env.local com chaves Supabase e Resend
npm run dev
```

## Variáveis de Ambiente

Veja `.env.example`. Resumo:

```env
NEXT_PUBLIC_SUPABASE_URL=https://supabase.seudominio.com.br
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM="App Correspondencia <nao-responda@seudominio.com.br>"
EMAIL_REPLY_TO=suporte@seudominio.com.br
NEXT_PUBLIC_BASE_URL=https://seudominio.com.br
NEXT_PUBLIC_APP_URL=https://seudominio.com.br
```

## Build Mobile (Android)

```bash
npm run build:mobile
npx cap open android
```

## Arquitetura

```
app-correspondencia/
├── app/              # Next.js App Router (páginas + APIs)
│   ├── api/
│   ├── dashboard-*/
│   └── lib/          # Supabase clients, auth helpers
├── components/
├── hooks/
├── types/
├── utils/
├── constants/
├── supabase/         # schema.sql + policies
├── public/
└── android/          # Capacitor
```

## Scripts

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run lint` | Linting |
| `npm run typecheck` | Verificação de tipos |
| `npm run build:mobile` | Build para Capacitor (Android) |

## Segurança

- Autenticação via Supabase Auth (JWT)
- Row Level Security (RLS) em todas as tabelas
- Validação de roles nas API routes
- Credenciais sensíveis apenas em variáveis de ambiente
- Headers de segurança no `next.config.js`

## Deploy

Produção em Hetzner + Docker + Traefik. Detalhes em `SERVIDOR-HETZNER.md` e checklist em `CHECKLIST-PRODUCAO.md`.

## Licença

MIT.
