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
- **Domínio**: appcorrespondencia.com.br
- **DNS**: Cloudflare → Hetzner (Traefik) → Container
- **Stack**: Next.js 16 (standalone) + Supabase + Resend

## Stack de dados
- **Supabase self-hosted**: containers `supabase-db`, `supabase-auth`, `supabase-rest`, `supabase-storage`, `supabase-kong`, `supabase-realtime`, `supabase-studio`, `supabase-meta`
- **URL pública**: https://supabase.appcorrespondencia.com.br
- **Tabelas em uso**: users, condominios, blocos, unidades, porteiros, correspondencias, retiradas, avisos_rapidos, configuracoes, configuracoes_retirada, message_templates

## Variáveis do container app-correspondencia
```
NEXT_PUBLIC_SUPABASE_URL=https://supabase.appcorrespondencia.com.br
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
RESEND_API_KEY=...
EMAIL_FROM=App Correspondencia <nao-responda@appcorrespondencia.com.br>
EMAIL_REPLY_TO=appgroupbrasil@gmail.com
SMTP_ADMIN_EMAIL=App Correspondencia <nao-responda@appcorrespondencia.com.br>
```

## Comandos Úteis
```bash
# Listar containers
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker ps"

# Logs
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker logs app-correspondencia --tail 100"

# Restart
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker restart app-correspondencia"

# Acesso ao Postgres do Supabase
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker exec -it supabase-db psql -U postgres"
```

## Deploy
A imagem `app-correspondencia:latest` em produção é construída a partir do código local da máquina do desenvolvedor (não há git pull automático no servidor). Fluxo:

1. Local: `npm run build` para validar.
2. Local: `docker build -t app-correspondencia:latest .`
3. Local: `docker save app-correspondencia:latest | ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker load"`
4. Servidor: parar/remover/recriar container com o `docker run` (labels Traefik abaixo).

### docker run de referência
```bash
docker stop app-correspondencia && docker rm app-correspondencia && \
docker run -d --name app-correspondencia --network coolify \
  --env-file /root/.env-correspondencia \
  -l 'traefik.enable=true' \
  -l 'traefik.http.routers.corresp-http.entrypoints=http' \
  -l 'traefik.http.routers.corresp-http.rule=Host(`appcorrespondencia.com.br`) || Host(`www.appcorrespondencia.com.br`)' \
  -l 'traefik.http.routers.corresp-https.entrypoints=https' \
  -l 'traefik.http.routers.corresp-https.rule=Host(`appcorrespondencia.com.br`) || Host(`www.appcorrespondencia.com.br`)' \
  -l 'traefik.http.routers.corresp-https.tls=true' \
  -l 'traefik.http.routers.corresp-https.tls.certresolver=letsencrypt' \
  -l 'traefik.http.services.corresp.loadbalancer.server.port=3000' \
  app-correspondencia:latest
```

> Observação: o diretório `/apps/correspondencia/` no servidor é um snapshot antigo (pré-Supabase) e não é mais usado pelo container em produção. Pode ser removido com segurança.
