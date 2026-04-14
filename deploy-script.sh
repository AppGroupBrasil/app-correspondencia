#!/bin/bash
# deploy-script.sh — Deploy completo: Local → Servidor Hetzner
# Uso: bash deploy-script.sh
# Pré-requisito: ~/.ssh/hetzner_key configurado
set -euo pipefail

SERVER="root@46.225.191.114"
SSH_KEY="$HOME/.ssh/hetzner_key"
REMOTE_SRC="/root/appcorrespondencia/app-src"
REMOTE_DEPLOY="/root/appcorrespondencia"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== 1/4 — Limpando código antigo no servidor ==="
ssh -i "$SSH_KEY" "$SERVER" "rm -rf $REMOTE_SRC && mkdir -p $REMOTE_SRC"

echo "=== 2/4 — Enviando código-fonte ==="
# Arquivos raiz
scp -i "$SSH_KEY" \
  "$LOCAL_DIR/Dockerfile" \
  "$LOCAL_DIR/package.json" \
  "$LOCAL_DIR/package-lock.json" \
  "$LOCAL_DIR/next.config.js" \
  "$LOCAL_DIR/tsconfig.json" \
  "$LOCAL_DIR/tailwind.config.js" \
  "$LOCAL_DIR/postcss.config.js" \
  "$LOCAL_DIR/deploy-run.sh" \
  "$SERVER:$REMOTE_SRC/"

# Diretórios-fonte
for dir in app components constants contexts hooks services types utils public; do
  if [ -d "$LOCAL_DIR/$dir" ]; then
    scp -i "$SSH_KEY" -r "$LOCAL_DIR/$dir" "$SERVER:$REMOTE_SRC/"
  fi
done

echo "=== 3/4 — Copiando deploy-run.sh ==="
scp -i "$SSH_KEY" "$LOCAL_DIR/deploy-run.sh" "$SERVER:$REMOTE_DEPLOY/deploy-run.sh"

echo "=== 4/4 — Executando build + deploy no servidor ==="
ssh -i "$SSH_KEY" "$SERVER" "cd $REMOTE_SRC && bash $REMOTE_DEPLOY/deploy-run.sh"

echo ""
echo "=== Deploy concluído! ==="
echo "Site: https://appcorrespondencia.com.br"
