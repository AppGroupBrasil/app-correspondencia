#!/bin/bash
set -uo pipefail
cd /apps/correspondencia
set -a && source .env.local && set +a

# Build
docker build -t app-correspondencia:latest \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="$NEXT_PUBLIC_FIREBASE_API_KEY" \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="$NEXT_PUBLIC_FIREBASE_PROJECT_ID" \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="$NEXT_PUBLIC_FIREBASE_APP_ID" \
  --build-arg NEXT_PUBLIC_BASE_URL="$NEXT_PUBLIC_BASE_URL" \
  --build-arg NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL" \
  . || { echo "BUILD FALHOU"; exit 1; }

# Remove old container
docker rm -f app-correspondencia || true

docker run -d \
  --name app-correspondencia \
  --network coolify \
  --restart unless-stopped \
  -e NEXT_PUBLIC_BASE_URL="$NEXT_PUBLIC_BASE_URL" \
  -e NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL" \
  -e NEXT_PUBLIC_FIREBASE_API_KEY="$NEXT_PUBLIC_FIREBASE_API_KEY" \
  -e NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" \
  -e NEXT_PUBLIC_FIREBASE_PROJECT_ID="$NEXT_PUBLIC_FIREBASE_PROJECT_ID" \
  -e NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" \
  -e NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" \
  -e NEXT_PUBLIC_FIREBASE_APP_ID="$NEXT_PUBLIC_FIREBASE_APP_ID" \
  -e RESEND_API_KEY="$RESEND_API_KEY" \
  -e EMAIL_FROM="$EMAIL_FROM" \
  -e EMAIL_REPLY_TO="$EMAIL_REPLY_TO" \
  -e NEXT_PUBLIC_SUPORTE_WHATSAPP="${NEXT_PUBLIC_SUPORTE_WHATSAPP:-}" \
  -l traefik.enable=true \
  -l 'traefik.http.routers.corresp-http.entrypoints=http' \
  -l 'traefik.http.routers.corresp-http.rule=Host(`appcorrespondencia.com.br`) || Host(`www.appcorrespondencia.com.br`)' \
  -l 'traefik.http.routers.corresp-https.entrypoints=https' \
  -l 'traefik.http.routers.corresp-https.rule=Host(`appcorrespondencia.com.br`) || Host(`www.appcorrespondencia.com.br`)' \
  -l 'traefik.http.routers.corresp-https.tls.certresolver=letsencrypt' \
  -l 'traefik.http.services.corresp.loadbalancer.server.port=3000' \
  app-correspondencia:latest

echo 'Deploy concluido!'
docker ps --filter name=app-correspondencia --format 'Container: {{.Names}} | Status: {{.Status}}'
