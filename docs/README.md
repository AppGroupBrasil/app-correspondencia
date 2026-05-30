# Documentação — App Correspondência

Documentação operacional do projeto. Leia na ordem abaixo na primeira vez:

1. **[INFRAESTRUTURA.md](INFRAESTRUTURA.md)** — visão geral do servidor, containers, rede e domínios.
2. **[DEPLOY.md](DEPLOY.md)** — passo a passo para gerar uma nova imagem e publicar.
3. **[CREDENCIAIS.md](CREDENCIAIS.md)** — chaves, senhas e tokens. **NÃO** vai para o git (já no `.gitignore`).
4. **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** — comandos úteis, rollback, diagnóstico.

## Estado atual da produção (2026-05-11)

- Domínio: https://appcorrespondencia.com.br
- Stack: Next.js 16 + Supabase self-hosted + Resend
- Servidor: Hetzner (46.225.191.114) com Coolify + Traefik
- Container: `app-correspondencia` (porta 3000)
- Firebase: 100% removido do código

## Documentos relacionados na raiz do projeto

- `SERVIDOR-HETZNER.md` — referência rápida do servidor (espelho resumido do que está aqui).
- `CHECKLIST-PRODUCAO.md` — checklist usado antes de cada lançamento.
- `CONFIGURAR-DOMINIO.md` — passo de configuração de DNS + Supabase Auth para um novo domínio.
- `.env.example` — template de variáveis de ambiente.
