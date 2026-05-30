# Deploy — App Correspondência

Este é o fluxo **oficial** para publicar uma nova versão em produção. Tempo total: ~3 a 5 min.

## Pré-requisitos

- Estar no diretório local do projeto.
- Chave SSH `~/.ssh/hetzner_key` configurada.
- `.env.local` com as variáveis Supabase (necessárias para o build args).
- Build local sem erros: `npm run build` (opcional mas recomendado).

## Fluxo resumido

1. Editar código localmente, testar com `npm run dev` ou `npm run build`.
2. Enviar o código para `/apps/correspondencia-build/` no servidor.
3. Buildar a imagem `app-correspondencia:new` no servidor.
4. Tagear a imagem atual como backup, promover `:new` para `:latest`.
5. Recriar o container.
6. Validar HTTP 200 e logs.

## Passo a passo

### 1. Enviar o código

Da raiz do projeto local, no Git Bash / WSL:

```bash
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "mkdir -p /apps/correspondencia-build && rm -rf /apps/correspondencia-build/* /apps/correspondencia-build/.[!.]*"

tar --exclude=node_modules --exclude=.next --exclude=out \
    --exclude=android/app/build --exclude=android/.gradle \
    --exclude=.git --exclude='*.bak' --exclude=artifacts --exclude=.vscode \
    -czf - . | ssh -i ~/.ssh/hetzner_key root@46.225.191.114 \
    "tar -xzf - -C /apps/correspondencia-build/"
```

### 2. Buildar a imagem no servidor

As chaves Supabase **públicas** (anon key + URL) precisam ser passadas como build-args porque o Next.js as embute no bundle do client em tempo de build.

```bash
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "cd /apps/correspondencia-build && docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://supabase.appcorrespondencia.com.br \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY='<ANON_KEY_DE_CREDENCIAIS.md>' \
  --build-arg NEXT_PUBLIC_BASE_URL=https://appcorrespondencia.com.br \
  --build-arg NEXT_PUBLIC_APP_URL=https://appcorrespondencia.com.br \
  -t app-correspondencia:new ."
```

> Para conveniência, o valor real de `NEXT_PUBLIC_SUPABASE_ANON_KEY` está em `docs/CREDENCIAIS.md` (gitignored).

### 3. Backup + swap do container

```bash
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "\
TAG=backup-\$(date +%Y%m%d-%H%M); \
docker tag app-correspondencia:latest app-correspondencia:\$TAG && \
echo BACKUP=app-correspondencia:\$TAG && \
docker tag app-correspondencia:new app-correspondencia:latest && \
docker stop app-correspondencia && docker rm app-correspondencia && \
docker run -d --name app-correspondencia --network coolify --restart unless-stopped \
  --env-file /root/.env-correspondencia \
  -l 'traefik.enable=true' \
  -l 'traefik.http.routers.corresp-http.entrypoints=http' \
  -l 'traefik.http.routers.corresp-http.rule=Host(\`appcorrespondencia.com.br\`) || Host(\`www.appcorrespondencia.com.br\`)' \
  -l 'traefik.http.routers.corresp-https.entrypoints=https' \
  -l 'traefik.http.routers.corresp-https.rule=Host(\`appcorrespondencia.com.br\`) || Host(\`www.appcorrespondencia.com.br\`)' \
  -l 'traefik.http.routers.corresp-https.tls=true' \
  -l 'traefik.http.routers.corresp-https.tls.certresolver=letsencrypt' \
  -l 'traefik.http.services.corresp.loadbalancer.server.port=3000' \
  app-correspondencia:latest"
```

A saída imprime a tag de backup — **anote** caso precise reverter.

### 4. Validar

```bash
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "\
docker ps --filter name=app-correspondencia --format '{{.Status}}'; \
docker logs app-correspondencia --tail 20; \
curl -sI https://appcorrespondencia.com.br | head -3"
```

Esperado:
- `Up X seconds`
- Log com `✓ Ready in <ms>`
- `HTTP/2 200`

## Rollback

```bash
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "\
docker tag app-correspondencia:backup-YYYYMMDD-HHMM app-correspondencia:latest && \
docker stop app-correspondencia && docker rm app-correspondencia && \
docker run -d --name app-correspondencia --network coolify --restart unless-stopped \
  --env-file /root/.env-correspondencia \
  -l 'traefik.enable=true' \
  -l 'traefik.http.routers.corresp-http.entrypoints=http' \
  -l 'traefik.http.routers.corresp-http.rule=Host(\`appcorrespondencia.com.br\`) || Host(\`www.appcorrespondencia.com.br\`)' \
  -l 'traefik.http.routers.corresp-https.entrypoints=https' \
  -l 'traefik.http.routers.corresp-https.rule=Host(\`appcorrespondencia.com.br\`) || Host(\`www.appcorrespondencia.com.br\`)' \
  -l 'traefik.http.routers.corresp-https.tls=true' \
  -l 'traefik.http.routers.corresp-https.tls.certresolver=letsencrypt' \
  -l 'traefik.http.services.corresp.loadbalancer.server.port=3000' \
  app-correspondencia:latest"
```

Substitua `backup-YYYYMMDD-HHMM` pela tag desejada. Para listar:

```bash
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker images app-correspondencia"
```

## Mudar variável de ambiente sem rebuild

Para mudar uma chave **server-only** (ex.: `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`):

1. Editar `/root/.env-correspondencia` no servidor.
2. `docker restart app-correspondencia`.

Para mudar uma chave `NEXT_PUBLIC_*` é necessário **rebuild** (ela está embutida no bundle do client).

## Limpeza periódica

```bash
# Remover imagens backup antigas (manter as 3 mais recentes)
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "\
docker images app-correspondencia --format '{{.Tag}} {{.ID}}' | grep '^backup-' | sort -r | tail -n +4 | awk '{print \$2}' | xargs -r docker rmi"

# Remover camadas órfãs
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker image prune -f"
```

## Mobile (Android)

O fluxo de deploy mobile **não** passa pelo servidor — gera APK/AAB local via Capacitor:

```bash
npm run build:mobile
npx cap open android
# Android Studio: Build > Generate Signed App Bundle / APK
```

Detalhes do keystore e fluxo Play Store estão em `docs/CREDENCIAIS.md` (se aplicável) e nas instruções globais do desenvolvedor.
