# Servidor Hetzner — Acesso Rápido

## SSH
- **IP**: 46.225.191.114
- **Usuário**: root
- **Chave SSH**: ~/.ssh/hetzner_key
- **Comando**: `ssh -i ~/.ssh/hetzner_key root@46.225.191.114`

## Infraestrutura
- **OS**: Ubuntu 22.04.5 LTS
- **Recursos**: 2 vCPU | 4GB RAM + 4GB Swap | 38GB disco
- **Proxy**: Traefik v3.6 (via Coolify)
- **SSL**: LetsEncrypt
- **Rede Docker**: coolify
- **Painel Coolify**: http://46.225.191.114:8000

## App Correspondência
- **Container**: app-correspondencia
- **Porta**: 3000
- **Código no servidor**: /apps/correspondencia/
- **Domínio**: appcorrespondencia.com.br
- **DNS**: Cloudflare → Hetzner (Traefik) → Container

## Status Atual Verificado em 27/03/2026
- **SSH**: OK com `~/.ssh/hetzner_key`
- **Container `app-correspondencia`**: online
- **Variáveis públicas e Resend**: configuradas no container
- **Variáveis privadas do Firebase Admin**: ausentes no servidor (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`)

## Variáveis Obrigatórias para o Build Atual
```bash
NEXT_PUBLIC_BASE_URL=https://appcorrespondencia.com.br
NEXT_PUBLIC_APP_URL=https://appcorrespondencia.com.br
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=correspondencia-9a73a
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
RESEND_API_KEY=...
EMAIL_FROM=nao-responda@appcorrespondencia.com.br
EMAIL_REPLY_TO=suporte@appcorrespondencia.com.br
FIREBASE_PROJECT_ID=correspondencia-9a73a
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@correspondencia-9a73a.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Preparação Recomendada no Servidor
```bash
cd /apps/correspondencia
cp .env.local .env.local.backup-$(date +%F-%H%M%S)
```

Depois adicione no `.env.local` do servidor:
```bash
FIREBASE_PROJECT_ID=correspondencia-9a73a
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@correspondencia-9a73a.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Comandos Úteis
```bash
# Listar containers
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker ps"

# Logs do container
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker logs app-correspondencia --tail 50"

# Restart container
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker restart app-correspondencia"

# Rebuild e restart
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "cd /apps/correspondencia && docker build -t app-correspondencia:latest . && docker stop app-correspondencia && docker rm app-correspondencia && docker run -d --name app-correspondencia --network coolify -l 'traefik.enable=true' -l 'traefik.http.routers.corresp-http.entrypoints=http' -l 'traefik.http.routers.corresp-http.rule=Host(\`appcorrespondencia.com.br\`) || Host(\`www.appcorrespondencia.com.br\`)' -l 'traefik.http.routers.corresp-https.entrypoints=https' -l 'traefik.http.routers.corresp-https.rule=Host(\`appcorrespondencia.com.br\`) || Host(\`www.appcorrespondencia.com.br\`)' -l 'traefik.http.routers.corresp-https.tls.certresolver=letsencrypt' -l 'traefik.http.services.corresp.loadbalancer.server.port=3000' app-correspondencia:latest"
```

## Observação
- O deploy do build atual fica bloqueado até as credenciais privadas do Firebase Admin serem adicionadas ao servidor.
