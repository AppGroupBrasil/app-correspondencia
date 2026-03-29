# 🌐 Guia de Configuração de Domínio — Hetzner (Docker + Traefik)

Para que o seu aplicativo funcione profissionalmente, configure seu domínio personalizado (ex: `appcorrespondencia.com.br`).

## 1. Infraestrutura Atual

- **Servidor:** Hetzner (IP: 46.225.191.114)
- **Container:** Docker com Next.js (porta 3000)
- **Proxy reverso:** Traefik v3.6 (SSL automático via Let's Encrypt)
- **DNS:** Cloudflare → Hetzner
- **Painel:** Coolify (http://46.225.191.114:8000)

## 2. No Provedor de DNS (Cloudflare)

1. Faça login no [Cloudflare](https://dash.cloudflare.com/).
2. Selecione o domínio `appcorrespondencia.com.br`.
3. Vá em **DNS** > **Records**.
4. Configure os registros:

| Tipo  | Nome/Host | Valor               | Proxy |
| :---- | :-------- | :------------------ | :---- |
| A     | @         | `46.225.191.114`    | DNS only |
| CNAME | www       | `appcorrespondencia.com.br` | DNS only |

> **Nota:** Use "DNS only" (nuvem cinza) para que o Traefik gerencie o SSL próprio.

## 3. Certificado SSL (Let's Encrypt)

O Traefik provisiona automaticamente um certificado SSL via Let's Encrypt. Os labels no `deploy-run.sh` já configuram isso:
```bash
-l 'traefik.http.routers.corresp-https.tls.certresolver=letsencrypt'
```

## 4. Variáveis de Ambiente no Docker

No arquivo `deploy-run.sh`, configure:
```bash
-e NEXT_PUBLIC_BASE_URL=https://appcorrespondencia.com.br
-e NEXT_PUBLIC_APP_URL=https://appcorrespondencia.com.br
-e RESEND_API_KEY=re_sua_chave_aqui
-e EMAIL_FROM=nao-responda@appcorrespondencia.com.br
```

## 5. Autorizar no Firebase Authentication

Para que o login funcione no domínio:

1. No [Console do Firebase](https://console.firebase.google.com/), vá em **Authentication**.
2. Clique na aba **Settings** > **Authorized domains**.
3. Adicione `appcorrespondencia.com.br` à lista.
