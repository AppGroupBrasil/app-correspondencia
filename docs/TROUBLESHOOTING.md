# Troubleshooting — App Correspondência

Atalhos para os problemas mais comuns. Todos os comandos pressupõem `~/.ssh/hetzner_key` configurado.

## Site fora do ar

```bash
# 1. Container está rodando?
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker ps --filter name=app-correspondencia"

# 2. Logs recentes
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker logs app-correspondencia --tail 100"

# 3. Traefik está roteando?
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker logs coolify-proxy --tail 50 | grep -i corresp"

# 4. Resposta direta na porta 3000 (interna)
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker exec app-correspondencia wget -qO- http://localhost:3000 | head -5"

# 5. Resposta pública
curl -sI https://appcorrespondencia.com.br | head -5
```

## Reiniciar o app

```bash
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker restart app-correspondencia"
```

## Verificar variáveis de ambiente atuais

```bash
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker exec app-correspondencia env | grep -vE '^(PATH|HOSTNAME|NODE|HOME|TERM)'"
```

## Acessar o banco

```bash
# psql interativo
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker exec -it supabase-db psql -U postgres"

# Query rápida
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker exec supabase-db psql -U postgres -c 'SELECT COUNT(*) FROM users;'"

# Contagens gerais
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker exec supabase-db psql -U postgres -tAc \"\
SELECT 'condominios:'||COUNT(*) FROM condominios UNION ALL \
SELECT 'unidades:'||COUNT(*) FROM unidades UNION ALL \
SELECT 'users:'||COUNT(*) FROM users UNION ALL \
SELECT 'correspondencias:'||COUNT(*) FROM correspondencias\""
```

## Backup do banco

```bash
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker exec supabase-db pg_dump -U postgres postgres" > backup-$(date +%F).sql
```

## Erro 502 / 504 Bad Gateway

Geralmente Traefik não acha o container. Verificar:

```bash
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker network inspect coolify --format '{{range .Containers}}{{.Name}}{{println}}{{end}}' | grep corresp"
```

Se o container não está na rede `coolify`, recriar com a flag `--network coolify`.

## SSL não renova

Traefik renova via LetsEncrypt automaticamente. Se falhar:

```bash
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker logs coolify-proxy 2>&1 | grep -i 'acme\\|letsencrypt' | tail -20"
```

Causa comum: registro DNS proxied (laranja) no Cloudflare. Desativar proxy enquanto Traefik emite o cert.

## E-mail não chega

```bash
# Logs da rota de email
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker logs app-correspondencia --tail 200 | grep -iE 'resend|email|550|451'"

# Testar API key do Resend
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer <RESEND_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"from":"nao-responda@appcorrespondencia.com.br","to":"seuemail@exemplo.com","subject":"teste","text":"ok"}'
```

Se retornar 401: chave inválida. 403: domínio não verificado.

## Rollback de deploy

Ver `DEPLOY.md` seção "Rollback". Tempo: ~10s.

## Disco cheio no servidor

```bash
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "df -h /; docker system df"

# Limpeza
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker image prune -af; docker container prune -f; docker volume prune -f"
```

Cuidado com `volume prune` — confirmar que nenhum dado importante está em volume órfão antes.

## Build falha no servidor

Erros mais comuns:

| Sintoma | Causa provável | Solução |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL is undefined` | Faltou `--build-arg` no `docker build` | Reenviar com todos os build-args (ver DEPLOY.md) |
| `Error: Cannot find module 'firebase'` | Código velho enviado | Conferir que o tar do passo 1 do deploy usou o código local atualizado |
| `EACCES /apps/correspondencia-build` | Permissões erradas | `chown -R root /apps/correspondencia-build` |

## Logs verbosos do Next.js

```bash
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker logs app-correspondencia --tail 500 --timestamps"
```

## Conferir versão do código rodando

```bash
# Hash da imagem
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker inspect app-correspondencia --format '{{.Image}} created={{.Created}}'"

# Lista de backups disponíveis (rollback targets)
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker images app-correspondencia --format '{{.Tag}}\\t{{.CreatedAt}}\\t{{.Size}}'"
```
