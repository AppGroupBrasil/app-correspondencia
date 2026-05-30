# Infraestrutura — App Correspondência

## Servidor

| Item | Valor |
|---|---|
| Provedor | Hetzner |
| IP | 46.225.191.114 |
| OS | Ubuntu 22.04.5 LTS |
| Recursos | 2 vCPU · 4 GB RAM + 4 GB swap · 38 GB disco |
| Acesso SSH | `ssh -i ~/.ssh/hetzner_key root@46.225.191.114` |
| Painel Coolify | http://46.225.191.114:8000 |
| Proxy | Traefik v3.6 (gerenciado pelo Coolify) |
| SSL | LetsEncrypt automático via Traefik |
| Rede Docker | `coolify` |

> O host `simples-manutencao-hetzner` no `~/.ssh/config` aponta para esse mesmo servidor.

## App Correspondência — container

| Item | Valor |
|---|---|
| Nome | `app-correspondencia` |
| Imagem | `app-correspondencia:latest` (construída localmente, ver DEPLOY.md) |
| Porta interna | 3000 |
| Rede | `coolify` |
| Restart policy | `unless-stopped` |
| Domínio público | https://appcorrespondencia.com.br (também `www.appcorrespondencia.com.br`) |
| Env file no host | `/root/.env-correspondencia` (chmod 600) |
| Backups de imagem | tags `app-correspondencia:backup-YYYYMMDD-HHMM` |

## Stack de dados — Supabase self-hosted

URL pública: https://supabase.appcorrespondencia.com.br

Containers (todos rodando em `coolify` network):

| Container | Função |
|---|---|
| `supabase-db` | PostgreSQL 15 |
| `supabase-auth` | GoTrue (autenticação JWT) |
| `supabase-rest` | PostgREST (API REST automática) |
| `supabase-storage` | Storage de arquivos |
| `supabase-realtime` | Subscriptions tempo real |
| `supabase-kong` | API Gateway |
| `supabase-studio` | UI de administração |
| `supabase-meta` | Postgres meta API |

### Tabelas em uso (schema `public`)

`users`, `condominios`, `blocos`, `unidades`, `porteiros`, `correspondencias`, `retiradas`, `avisos_rapidos`, `configuracoes`, `configuracoes_retirada`, `message_templates`.

Schema completo em `supabase/schema.sql` na raiz do projeto.

## E-mail — Resend

- Conta: https://resend.com
- Domínio verificado: `appcorrespondencia.com.br`
- Remetente padrão: `nao-responda@appcorrespondencia.com.br`

## DNS — Cloudflare

- Cloudflare → Hetzner (46.225.191.114) → Traefik → Container
- Apex `appcorrespondencia.com.br` e `www` apontam para o IP do servidor.
- Subdomínio `supabase.appcorrespondencia.com.br` também aponta para o mesmo IP (Traefik roteia internamente).

## Outros apps no mesmo servidor (referência)

O servidor hospeda múltiplos apps em containers separados (AppAvisos, App My, Votação, AppVistoria, AppInterfone, Manutenção, etc.). Cuidado para não confundir nomes ao rodar `docker stop`/`rm` — sempre filtrar por `--filter name=app-correspondencia`.

## Pastas relevantes no servidor

| Caminho | O que é |
|---|---|
| `/apps/correspondencia-build/` | Código-fonte atual usado para buildar a imagem |
| `/apps/correspondencia/` | Snapshot antigo (pré-Supabase). **Não usado** — pode ser apagado |
| `/root/.env-correspondencia` | Env file do container em produção |
| `/root/.ssh/authorized_keys` | Inclui a chave pública do dev |
