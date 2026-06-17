# Alterações — Sessão 2026-06-17

Correções e melhorias aplicadas em produção (deploy via GitHub Actions → servidor Hetzner, blue/green por `deploy.sh`).

Dois commits no `main`:

| Commit    | Descrição                                                                 |
|-----------|---------------------------------------------------------------------------|
| `59e7fc5` | fix: imagens 401 do storage, modal de template cortado e erro JSON        |
| `675b671` | Gerenciar Condominios: colunas de cadastro, acessos e avisos              |

Ambos com deploy `success` pelo workflow `.github/workflows/deploy.yml`.

---

## 1. Erro "Unexpected token '<', <!DOCTYPE" no cadastro de novo morador

**Sintoma:** ao cadastrar um novo morador aparecia:
> Erro: Unexpected token '<', "<!DOCTYPE"... is not valid JSON

**Causa:** **não era bug de código.** A API (`/api/criar-usuario`) e o Supabase sempre respondem JSON corretamente (verificado por probes em produção). O erro era **transitório**: quando o gateway (Kong/Traefik) ou o container da app estava momentaneamente fora, o proxy devolvia uma página HTML de erro (502/504) e o `res.json()` quebrava ao tentar parsear `<!DOCTYPE...`.

**Correção:** parsing resiliente em [components/GerenciarMoradores.tsx](../components/GerenciarMoradores.tsx). Helper `parseApiResponse(res)` que lê `res.text()` e tenta `JSON.parse`; se falhar, devolve mensagem amigável em vez de estourar:
> Servidor temporariamente indisponível. Aguarde alguns instantes e tente novamente.

Aplicado nos dois pontos: criação individual e importação em lote.

---

## 2. Imagens das correspondências não apareciam (ícone quebrado / 401)

**Sintoma:** lista de correspondências mostrava ícone de imagem quebrada.

**Causa:** o Supabase é self-hosted atrás do **Kong**, que exige `apikey` **até na rota pública** `/storage/v1/object/public/`. Uma tag `<img>` não envia header, então o storage respondia **401** e a imagem quebrava.

**Correção:**
- [app/lib/supabase.ts](../app/lib/supabase.ts) — novo helper `comApiKeyStorage(url)` que anexa `?apikey=<anon key>` na query string de URLs de storage (a anon key já é pública/`NEXT_PUBLIC`, segura no bundle).
- [hooks/useCorrespondencias.ts](../hooks/useCorrespondencias.ts) — aplica o helper em `imagemUrl`, `pdfUrl`, `reciboUrl` na **leitura/render** (linhas ~265-267 e no embed de PDF). A coluna `imagem_url` no banco continua guardando a URL **crua**, sem a key; a key só é anexada na hora de exibir.

---

## 3. Cabeçalho cortado no modal de "Modelo de mensagem" (WhatsApp)

**Sintoma:** no mobile o cabeçalho do modal ficava cortado, sem botão de voltar/fechar visível.

**Causa:** o container do modal não limitava altura nem tinha rolagem; em telas baixas o topo era empurrado para fora.

**Correção:** [app/dashboard-responsavel/avisos-rapidos/page.tsx](../app/dashboard-responsavel/avisos-rapidos/page.tsx) (~linha 574):
- Container: `max-h-[90vh] flex flex-col`.
- Header: `flex-shrink-0` (sempre visível).
- Corpo: `overflow-y-auto flex-1` (rola só o conteúdo).

Esse modal só existe na tela do responsável (a do porteiro não tem).

---

## 4. Gerenciar Condomínios (perfil Master) — 3 colunas novas

**Pedido:** no painel do Master, em "Gerenciar Condomínios", ter controle de quem usa o app e desde quando — data de cadastro e nível de uso (acessos / avisos da última semana).

**Implementação:** [components/GerenciarCondominios.tsx](../components/GerenciarCondominios.tsx)

Colunas adicionadas (entre "Endereço" e "Status"):

| Coluna             | Fonte                                                                 | Observação |
|--------------------|-----------------------------------------------------------------------|------------|
| **Cadastro**       | `condominios.criado_em` (já existia)                                   | Trivial, sem dependência. |
| **Acessos (7 dias)** | tabela nova `acessos` (logins efetivos), contados nos últimos 7 dias | **Não conta refresh** de quem fica logado. |
| **Avisos (7 dias)** | `correspondencias` + `avisos_rapidos`, somados, últimos 7 dias        | Métrica de uso **real**, independe de login. |

Detalhes:
- As três contagens rodam em `carregarCondominios` via `Promise.all` sobre `acessos`, `correspondencias` e `avisos_rapidos` (`select condominio_id` + `gte criado_em` de 7 dias atrás), tabuladas por `condominio_id`.
- A tabela `acessos` é **tolerante**: se não existir, a contagem fica 0 sem quebrar a tela. As outras duas têm RLS `SELECT USING (true)`, então o Master lê tudo sem migração.
- `colSpan` das linhas vazias/loading ajustado de 4 → 7.

### 4.1 Por que "Avisos" e não só "Acessos"

O Master observou que **porteiro costuma deixar o login aberto e só atualizar a página** — isso dispara `TOKEN_REFRESHED`/`INITIAL_SESSION`, **não** `SIGNED_IN`, então **não conta como acesso**. Por isso a coluna "Avisos" (trabalho efetivo registrado) é a métrica confiável de uso; "Acessos" é só complementar.

Confirmado também que **síndico (conta do condomínio), responsável e porteiro** são todos criados com `condominio_id` e logam pelo mesmo `signInWithPassword`, então os três entram na contagem de acessos quando fazem login de verdade.

### 4.2 Registro de acessos no login

[contexts/AuthContext.tsx](../contexts/AuthContext.tsx) — `loadUserProfile`/`syncAuthState` ganharam o parâmetro `registrarAcesso`. O listener `onAuthStateChange` passa `_event === "SIGNED_IN"`, e só nesse caso (login efetivo, não refresh/restore) insere `{ condominio_id, user_id }` em `acessos`. Inserção best-effort: se a tabela não existir, ignora silenciosamente.

### 4.3 Migração do banco

[supabase/migrations/acessos.sql](../supabase/migrations/acessos.sql) — cria a tabela `acessos` (`id`, `condominio_id` FK, `user_id` FK, `criado_em`), índice `(condominio_id, criado_em DESC)` e RLS:
- `acessos_insert`: authenticated insere o próprio acesso (mesmo condomínio, ou adminMaster, ou admin do condomínio).
- `acessos_read`: Master vê tudo; responsável/admin veem o(s) próprio(s) condomínio(s).

**Aplicada manualmente em produção** (não há migração automática neste projeto — o schema vive no Supabase). Comando usado, via SSH no Hetzner:

```bash
ssh -i ~/.ssh/hetzner_key root@46.225.191.114 \
  "docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1" \
  < supabase/migrations/acessos.sql
```

Resultado: `CREATE TABLE`, `CREATE INDEX`, `ALTER TABLE`, 2 policies criadas. As funções de RLS usadas (`get_my_role`, `get_my_condominio_id`, `is_admin_of_condo`) já existiam.

> **Importante para próximas atualizações:** a contagem de "Acessos" começa do zero a partir de 2026-06-17 — logins anteriores não entram retroativamente. "Avisos" reflete o histórico já existente nas tabelas.

---

## Infra / deploy usados nesta sessão

- Servidor Hetzner: `root@46.225.191.114`, chave `~/.ssh/hetzner_key`.
- Postgres do Supabase: container Docker `supabase-db` (acessível por `docker exec ... psql -U postgres -d postgres`).
- Deploy: push no `main` → GitHub Actions (`.github/workflows/deploy.yml`) → SSH Hetzner → blue/green. Conferir status com `gh run list`.
