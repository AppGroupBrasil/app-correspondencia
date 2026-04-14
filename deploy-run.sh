#!/bin/bash
# deploy-run.sh — Build + Deploy do App Correspondência (Supabase)
# Uso no servidor: cd /root/appcorrespondencia/app-src && bash /root/appcorrespondencia/deploy-run.sh
set -euo pipefail

# Carregar variáveis de ambiente
set -a
source /root/appcorrespondencia/.env.deploy
set +a

# Validar variáveis obrigatórias
: "${NEXT_PUBLIC_BASE_URL:?NEXT_PUBLIC_BASE_URL não configurada}"
: "${NEXT_PUBLIC_APP_URL:?NEXT_PUBLIC_APP_URL não configurada}"
: "${NEXT_PUBLIC_SUPABASE_URL:?NEXT_PUBLIC_SUPABASE_URL não configurada}"
: "${NEXT_PUBLIC_SUPABASE_ANON_KEY:?NEXT_PUBLIC_SUPABASE_ANON_KEY não configurada}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY não configurada}"
: "${SUPABASE_JWT_SECRET:?SUPABASE_JWT_SECRET não configurada}"
: "${RESEND_API_KEY:?RESEND_API_KEY não configurada}"
: "${EMAIL_FROM:?EMAIL_FROM não configurado}"
: "${EMAIL_REPLY_TO:?EMAIL_REPLY_TO não configurado}"

echo "=== Build da imagem ==="
docker build -t app-correspondencia:latest \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --build-arg NEXT_PUBLIC_BASE_URL="$NEXT_PUBLIC_BASE_URL" \
  --build-arg NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL" \
  .

echo "=== Deploy do container ==="
docker rm -f app-correspondencia >/dev/null 2>&1 || true

BT='`'
docker run -d \
  --name app-correspondencia \
  --network coolify \
  --restart unless-stopped \
  -e NEXT_PUBLIC_BASE_URL="$NEXT_PUBLIC_BASE_URL" \
  -e NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL" \
  -e NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -e SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  -e SUPABASE_JWT_SECRET="$SUPABASE_JWT_SECRET" \
  -e RESEND_API_KEY="$RESEND_API_KEY" \
  -e EMAIL_FROM="$EMAIL_FROM" \
  -e EMAIL_REPLY_TO="$EMAIL_REPLY_TO" \
  -l traefik.enable=true \
  -l traefik.http.routers.corresp-http.entrypoints=http \
  -l "traefik.http.routers.corresp-http.rule=Host(${BT}appcorrespondencia.com.br${BT}) || Host(${BT}www.appcorrespondencia.com.br${BT})" \
  -l traefik.http.routers.corresp-https.entrypoints=https \
  -l "traefik.http.routers.corresp-https.rule=Host(${BT}appcorrespondencia.com.br${BT}) || Host(${BT}www.appcorrespondencia.com.br${BT})" \
  -l traefik.http.routers.corresp-https.tls=true \
  -l traefik.http.routers.corresp-https.tls.certresolver=letsencrypt \
  -l traefik.http.services.corresp.loadbalancer.server.port=3000 \
  app-correspondencia:latest

echo "=== Deploy concluído ==="
docker ps --filter name=app-correspondencia --format "table {{.ID}}\t{{.Status}}\t{{.Names}}"
