#!/bin/bash
set -euo pipefail

: "${NEXT_PUBLIC_BASE_URL:?NEXT_PUBLIC_BASE_URL não configurada}"
: "${NEXT_PUBLIC_APP_URL:?NEXT_PUBLIC_APP_URL não configurada}"
: "${NEXT_PUBLIC_FIREBASE_API_KEY:?NEXT_PUBLIC_FIREBASE_API_KEY não configurada}"
: "${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:?NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN não configurada}"
: "${NEXT_PUBLIC_FIREBASE_PROJECT_ID:?NEXT_PUBLIC_FIREBASE_PROJECT_ID não configurada}"
: "${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:?NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET não configurada}"
: "${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:?NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID não configurada}"
: "${NEXT_PUBLIC_FIREBASE_APP_ID:?NEXT_PUBLIC_FIREBASE_APP_ID não configurada}"
: "${FIREBASE_PROJECT_ID:?FIREBASE_PROJECT_ID não configurada}"
: "${FIREBASE_CLIENT_EMAIL:?FIREBASE_CLIENT_EMAIL não configurada}"
: "${FIREBASE_PRIVATE_KEY:?FIREBASE_PRIVATE_KEY não configurada}"
: "${RESEND_API_KEY:?RESEND_API_KEY não configurada}"
: "${EMAIL_FROM:?EMAIL_FROM não configurado}"
: "${EMAIL_REPLY_TO:?EMAIL_REPLY_TO não configurado}"

docker build -t app-correspondencia:latest \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="$NEXT_PUBLIC_FIREBASE_API_KEY" \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="$NEXT_PUBLIC_FIREBASE_PROJECT_ID" \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="$NEXT_PUBLIC_FIREBASE_APP_ID" \
  --build-arg NEXT_PUBLIC_BASE_URL="$NEXT_PUBLIC_BASE_URL" \
  --build-arg NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL" \
  --build-arg FIREBASE_PROJECT_ID="$FIREBASE_PROJECT_ID" \
  --build-arg FIREBASE_CLIENT_EMAIL="$FIREBASE_CLIENT_EMAIL" \
  --build-arg FIREBASE_PRIVATE_KEY="$FIREBASE_PRIVATE_KEY" \
  .

docker rm -f app-correspondencia >/dev/null 2>&1 || true

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
  -e FIREBASE_PROJECT_ID="$FIREBASE_PROJECT_ID" \
  -e FIREBASE_CLIENT_EMAIL="$FIREBASE_CLIENT_EMAIL" \
  -e FIREBASE_PRIVATE_KEY="$FIREBASE_PRIVATE_KEY" \
  -e RESEND_API_KEY="$RESEND_API_KEY" \
  -e EMAIL_FROM="$EMAIL_FROM" \
  -e EMAIL_REPLY_TO="$EMAIL_REPLY_TO" \
  -l traefik.enable=true \
  -l 'traefik.http.routers.corresp-http.entrypoints=http' \
  -l 'traefik.http.routers.corresp-http.rule=Host(`appcorrespondencia.com.br`) || Host(`www.appcorrespondencia.com.br`)' \
  -l 'traefik.http.routers.corresp-https.entrypoints=https' \
  -l 'traefik.http.routers.corresp-https.rule=Host(`appcorrespondencia.com.br`) || Host(`www.appcorrespondencia.com.br`)' \
  -l 'traefik.http.routers.corresp-https.tls.certresolver=letsencrypt' \
  -l 'traefik.http.services.corresp.loadbalancer.server.port=3000' \
  app-correspondencia:latest
