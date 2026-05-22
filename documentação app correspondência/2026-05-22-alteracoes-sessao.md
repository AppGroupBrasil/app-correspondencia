# Alterações — Sessão 2026-05-22

Resumo das correções e melhorias aplicadas em produção (deploy via GitHub Actions → servidor Hetzner).

---

## 1. Cadastro de morador — erro `condominio_nome` no schema cache

**Sintoma:** ao finalizar cadastro (Passo 3 de 3), aparecia:
> Erro ao salvar dados do usuário: Could not find the 'condominio_nome' column of 'users' in the schema cache

**Causa:** o frontend (`app/cadastro-morador/page.tsx`) enviava `condominio_nome` dentro do objeto `dados`, e a API espalhava esses campos direto no `INSERT` da tabela `users` — que não tem essa coluna.

**Correção:** [app/api/criar-usuario/route.ts](../app/api/criar-usuario/route.ts) — removida a chave `condominio_nome` antes do insert (mantida apenas para o e-mail de notificação ao admin).

**Commit:** `600dedb` — `fix(criar-usuario): remove condominio_nome do insert na tabela users`

---

## 2. Cadastro de morador — erro `numero_unidade` (e demais campos extras)

**Sintoma:** após a correção #1, surgiu o mesmo erro com outra coluna:
> Could not find the 'numero_unidade' column of 'users' in the schema cache

**Causa:** o frontend enviava vários campos que não existem na tabela `users` (`numero_unidade`, `unidade_id`, `perfil`, `perfil_morador`, etc.). A correção #1 só removia uma coluna específica.

**Correção:** substituí a estratégia de blacklist por **whitelist** das colunas reais da tabela `users` (conforme [supabase/schema.sql](../supabase/schema.sql)):

```
telefone, whatsapp, cpf, bloco_id, bloco_nome, apartamento,
unidade_nome, foto_url, assinatura_padrao, ativo, aprovado
```

Campos extras enviados pelo frontend são descartados. Adicionalmente, `numero_unidade` é mapeado para a coluna existente `apartamento`.

**Arquivo:** [app/api/criar-usuario/route.ts](../app/api/criar-usuario/route.ts)
**Commit:** `374d814` — `fix(criar-usuario): whitelist de colunas validas no insert em users`

---

## 3. Moradores não apareciam no perfil master

**Sintoma:** adminMaster acessava `/dashboard-admin/moradores` e a lista ficava só carregando / aparecia vazia, embora houvesse moradores cadastrados em vários condomínios.

**Causa:** em [components/GerenciarMoradores.tsx](../components/GerenciarMoradores.tsx), a flag de modo master era:

```ts
const isMaster = user?.role === "adminMaster" && !targetCondominioId;
```

Quando o adminMaster tem `condominio_id` no próprio registro de `users` (caso comum), `targetCondominioId` vira esse ID, `isMaster` fica `false`, e a query filtra **apenas o condomínio dele** — escondendo moradores dos demais condomínios.

**Correção:** trocada a condição para depender apenas da prop explícita:

```ts
const isMaster = user?.role === "adminMaster" && !adminCondominioId;
```

Agora, quando o master entra sem selecionar condomínio (sem prop `adminCondominioId`), vê **todos os moradores** de **todos os condomínios** (RLS já permite via `users_read_same_condo` com `get_my_role() = 'adminMaster'`). Quando navega com um condomínio escolhido via prop, filtra normalmente.

**Commit:** `a5b7147` — `fix(moradores): master ve todos condominios independente do proprio condominio_id`

---

## 4. Checkbox "Lembrar login e senha" na tela de login

**Pedido:** opção para o usuário não precisar digitar credenciais a cada acesso.

**Implementação:** [app/login/page.tsx](../app/login/page.tsx)

- Novo state `lembrar` (boolean).
- `useEffect` no mount lê `localStorage.getItem('appcorresp:lembrar')`; se houver dados salvos, preenche email/senha e marca o checkbox.
- No login bem-sucedido:
  - se `lembrar = true`: grava `{ email, senha }` em `localStorage` (chave `appcorresp:lembrar`).
  - se `lembrar = false`: remove a chave.
- Checkbox renderizado logo acima do botão "Entrar".

**Observação de segurança:** as credenciais ficam em `localStorage` em texto-claro. Adequado para uso pessoal no próprio dispositivo; **não recomendado em dispositivos compartilhados**. Caso o requisito mude, alternativa é armazenar só o e-mail e usar persistência de sessão do Supabase (refresh token já é persistido por padrão).

**Commit:** `135ff6a` — `feat(login): checkbox lembrar login e senha`

---

## Resumo dos commits enviados ao `main` (auto-deploy via GitHub Actions)

| Commit    | Descrição                                                                       |
|-----------|---------------------------------------------------------------------------------|
| `600dedb` | fix(criar-usuario): remove condominio_nome do insert na tabela users            |
| `374d814` | fix(criar-usuario): whitelist de colunas validas no insert em users             |
| `a5b7147` | fix(moradores): master ve todos condominios independente do proprio condominio_id |
| `135ff6a` | feat(login): checkbox lembrar login e senha                                     |

Todos com deploy `success` pelo workflow `.github/workflows/deploy.yml` (Hetzner blue/green via `deploy.sh`).
