# Deploy Supabase no Hetzner (46.225.191.114)

## Pré-requisitos no servidor
- Docker + Docker Compose instalados
- Traefik configurado (rede `traefik-net` existente)
- DNS configurados:
  - `supabase.appcorrespondencia.com.br` → 46.225.191.114
  - `studio.appcorrespondencia.com.br` → 46.225.191.114
  - `appcorrespondencia.com.br` → 46.225.191.114

## 1. Copiar ficheiros para o servidor

```bash
# No PC local (PowerShell)
scp docker-compose.supabase.yml root@46.225.191.114:/root/appcorrespondencia/
scp .env.supabase root@46.225.191.114:/root/appcorrespondencia/
scp supabase/schema.sql root@46.225.191.114:/root/appcorrespondencia/supabase/
scp supabase/kong.yml root@46.225.191.114:/root/appcorrespondencia/supabase/
```

## 2. Subir Supabase no servidor

```bash
ssh root@46.225.191.114

cd /root/appcorrespondencia
docker compose --env-file .env.supabase -f docker-compose.supabase.yml up -d
```

Aguardar ~30s para todos os serviços iniciarem.

## 3. Verificar serviços

```bash
docker compose -f docker-compose.supabase.yml ps
# Todos devem estar "Up" / "healthy"

# Testar API
curl https://supabase.appcorrespondencia.com.br/rest/v1/ -H "apikey: <ANON_KEY>"
```

## 4. Atualizar o App Next.js

O `.env.local` já está configurado com as URLs do Supabase:
- `NEXT_PUBLIC_SUPABASE_URL=https://supabase.appcorrespondencia.com.br`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>`
- `SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>`

Para rebuild e deploy do app:
```bash
# Build local
npm run build

# Deploy (usar script existente ou Docker)
docker build -t appcorrespondencia-web .
docker stop appcorrespondencia-web 2>/dev/null; docker rm appcorrespondencia-web 2>/dev/null
docker run -d --name appcorrespondencia-web \
  --network traefik-net \
  --restart unless-stopped \
  -e NEXT_PUBLIC_SUPABASE_URL=https://supabase.appcorrespondencia.com.br \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY> \
  -e SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY> \
  -e RESEND_API_KEY=re_RMx7RFH8_YLmejuYa7ZkT1aakQ6hKTA8A \
  -l "traefik.enable=true" \
  -l "traefik.http.routers.appcorrespondencia.rule=Host(\`appcorrespondencia.com.br\`)" \
  -l "traefik.http.routers.appcorrespondencia.entrypoints=websecure" \
  -l "traefik.http.routers.appcorrespondencia.tls.certresolver=letsencrypt" \
  appcorrespondencia-web
```

## 5. Criar primeiro superadmin

Após o Supabase estar rodando, criar o primeiro usuário master:

```bash
# Via Studio: https://studio.appcorrespondencia.com.br
# Ou via API:
curl -X POST 'https://supabase.appcorrespondencia.com.br/auth/v1/admin/users' \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@appcorrespondencia.com.br",
    "password": "SuaSenhaForte123!",
    "email_confirm": true
  }'
```

Depois, na tabela `users`, inserir o perfil com `role = "master"`.

## Chaves geradas

| Variável | Valor |
|----------|-------|
| JWT_SECRET | `de840de6f0dcb0e263da86bf8758c2ec840e1adbc99d0d08366c045644c223a4` |
| ANON_KEY | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc2MTY3MDQ4LCJleHAiOjIwOTE1MjcwNDh9.Q_vuhw2vPR8OTW7xD8Zc_HEsyI5d9S40jBtmghIuG3I` |
| SERVICE_ROLE_KEY | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzYxNjcwNDgsImV4cCI6MjA5MTUyNzA0OH0.hNJldeNhwYajzTVq0ElvaOH_5akl_wcFGbVHIrJ_Ydg` |
