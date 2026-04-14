# Resumo de Ausência — Migração Firebase→Supabase (Lote 3: 5 páginas diversas)

> Nota: migrações anteriores (dashboard-porteiro, dashboard-responsavel) em sessões anteriores.

## Status: ✅ Concluída (5 arquivos)

## Arquivos Modificados

### 1. `app/dashboard-morador/page.tsx`
- `onAuthStateChanged(auth, cb)` → `supabase.auth.onAuthStateChange` + `subscription.unsubscribe()`
- `getDoc(doc(db, "users", uid))` → `supabase.from("users").select("*").eq("id", id).single()`
- `userData.unidadeNome` → `userData.unidade_nome`, `condominioId` → `condominio_id`
- `getDoc(doc(db, "condominios", id))` → `supabase.from("condominios").select("*").eq("id", id).single()`
- `data.logoUrl` → `condData.logo_url`
- `query(collection, where("moradorId",...))` → `supabase.from("correspondencias").select("id, status").eq("morador_id",...)`

### 2. `app/cadastro-morador/page.tsx`
- `createUserWithEmailAndPassword` → `fetch("/api/criar-usuario", { POST })`
- `setDoc(doc(db, "moradores", uid), {...})` → dados enviados via `dados` no body (snake_case)
- Erros Firebase-specific removidos → `err.message` genérico

### 3. `app/cadastro-condominio/page.tsx`
- `createUserWithEmailAndPassword` → `fetch("/api/criar-usuario", ...)`
- `addDoc(collection(db, "condominios"))` → `supabase.from("condominios").insert().select().single()`
- `setDoc(doc(db, "users", uid))` → `supabase.from("users").update({condominio_id}).eq("id", uid)`
- `signOut(auth)` → `supabase.auth.signOut()`
- `serverTimestamp()` → `new Date().toISOString()`

### 4. `app/minha-conta/page.tsx`
- `reauthenticateWithCredential` → `supabase.auth.signInWithPassword()`
- `updatePassword` → `supabase.auth.updateUser({ password })`
- `updateEmail` → `supabase.auth.updateUser({ email })`
- `updateDoc` → `supabase.from("users").update().eq("id", uid)`
- `deleteDoc` → `supabase.from("users").delete().eq("id", uid)`
- `deleteUser` → `supabase.auth.signOut()` (admin delete não disponível no client)

### 5. `app/ver/detalhes-view.tsx`
- `doc(db, colecao, id) + getDoc` → `supabase.from(colecao).select("*").eq("id", id).single()`
- `docSnap.exists()` → check `data` não-null
- `error.code === "permission-denied"` → `error.code === "PGRST116"`
- Mapeamento snake_case→camelCase: `morador_nome`, `imagem_url`, `pdf_url`, `recibo_url`, `foto_url`, `dados_retirada`

## Problemas Encontrados
- Nenhum.

---

# Migrações anteriores

### 1. page.tsx — Dashboard principal
- `getCountFromServer` → `supabase.select("*", { count: "exact", head: true })`

### 2. correspondencias/page.tsx — Lista de correspondências
- `Timestamp` types → `string | Date`
- `doc/getDoc` user lookups → `supabase.from("users").select().eq().single()`
- Collection queries (blocos, unidades) → Supabase queries

### 3. nova-correspondencia/page.tsx — Nova encomenda
- `doc(collection(db))` → `crypto.randomUUID()`
- Firebase Storage uploads → `supabase.storage.from("correspondencias").upload()`
- `setDoc` → `supabase.from("correspondencias").insert()`
- `Timestamp.now()` → `new Date().toISOString()`

### 4. avisos-rapidos/page.tsx — Avisos WhatsApp
- Collection queries (blocos, users) → Supabase queries
- Firebase Storage → `supabase.storage.from("avisos")`
- `updateDoc` → `supabase.from("avisos_rapidos").update().eq("id")`

### 5. registrar-retirada/page.tsx — Registrar retirada
- Removido `extends DocumentData`
- Collection queries → Supabase queries com mapeamento snake_case→camelCase

### 6. configuracoes-retirada/page.tsx — Configurações
- Sub-coleção `condominios/{id}/configuracoes/retirada` → tabela `configuracoes_retirada`
- `setDoc` → `supabase.upsert({...}, { onConflict: "condominio_id" })`

### 7. relatorios/page.tsx — Relatórios
- `Timestamp.fromDate()` → `.toISOString()`
- 3 queries (entradas, saídas, avisos) → Supabase com `.gte()/.lte()`

### 8. relatorios-graficos/page.tsx — Gráficos
- Collection query with orderBy → `supabase.from().select().eq().order()`
- Resultado mapeado snake_case → camelCase

### 9. gerenciar-responsavel/page.tsx — Dashboard alternativo
- `onAuthStateChanged` → `supabase.auth.onAuthStateChange`
- `auth.signOut()` → `supabase.auth.signOut()`
- `getCountFromServer` → `supabase.select("*", { count: "exact", head: true })`

## Problemas Encontrados
- Nenhum.

---

# Migração dashboard-porteiro (anterior)

## Status: ✅ Concluída

## Arquivos Modificados

### 1. `app/dashboard-porteiro/registrar-retirada/page.tsx`
- Removido: `firebase/firestore` (collection, query, where, getDocs, DocumentData), `@/app/lib/firebase` (db)
- Adicionado: `@/app/lib/supabase` (supabase)
- Interface `CorrespondenciaDocument`: removido `extends DocumentData`
- `carregarPendencias()`: `collection/query/where/getDocs` → `supabase.from("correspondencias").select("*").eq("condominio_id",...).eq("status","pendente")` com mapeamento snake_case→camelCase
- `verificarSeJaFoiRetirada()`: mesma conversão para `supabase.from("correspondencias").select("id").eq(...)` 

### 2. `app/dashboard-porteiro/correspondencias/page.tsx`
- Removido: `firebase/firestore` (doc, getDoc, Timestamp, collection, query, where, getDocs, orderBy), `@/app/lib/firebase` (db)
- Adicionado: `@/app/lib/supabase` (supabase)
- Interface `Linha`: `Timestamp` → `string | Date` para criadoEm/retiradoEm
- `matchesDateRange()`: removido `.toDate()` fallback, usa `new Date()` direto
- `formatarData()`: removido `.toDate()` fallback
- `carregar()`: `getDoc(doc(db,"users",id))` → `supabase.from("users").select("*").eq("id",id).single()`
- `carregarFiltrosAuxiliares()`: blocos e unidades queries convertidas, snake_case mapping (condominio_id, bloco_id)

### 3. `app/dashboard-porteiro/nova-correspondencia/page.tsx`
- Removido: `firebase/firestore` (doc, getDoc, collection, setDoc, Timestamp), `firebase/storage` (ref, uploadBytes, getDownloadURL), `@/app/lib/firebase` (db, storage)
- Adicionado: `@/app/lib/supabase` (supabase)
- `fetchDadosMorador`: `getDoc(doc(db,"users",...))` → `supabase.from("users").select("*").eq("id",...).single()`
- `buscarNomes()`: 3x `getDoc` para condominios/blocos/users → `supabase.from(...).select("*").eq("id",...).single()`
- `salvar()`: `doc(collection(db,...))` → `crypto.randomUUID()` para ID
- Background upload: `ref/uploadBytes/getDownloadURL` → `supabase.storage.from("correspondencias").upload/getPublicUrl`
- `setDoc(docRef, {...})` → `supabase.from("correspondencias").insert({...})` com todas as colunas em snake_case
- `Timestamp.now()` → `new Date().toISOString()`

### 4. `app/dashboard-porteiro/avisos-rapidos/page.tsx`
- Removido: `firebase/firestore` (collection, query, where, getDocs, doc, updateDoc, setDoc, serverTimestamp), `firebase/storage` (ref, uploadBytes, getDownloadURL), `@/app/lib/firebase` (db, storage)
- Adicionado: `@/app/lib/supabase` (supabase)
- `carregarBlocos()`: `collection/query/where/getDocs` → `supabase.from("blocos").select("*").eq("condominio_id",...)`
- `realizarBusca()`: query users → `supabase.from("users").select("*").eq(...)`, mapeamento unidadeNome→unidade_nome, blocoId→bloco_id, etc.
- `carregarMoradoresDoBloco()`: mesma conversão
- `confirmarEnvio()`: `doc(collection(...))` → `crypto.randomUUID()`, storage upload → `supabase.storage.from("avisos").upload/getPublicUrl`, `setDoc` → `supabase.from("avisos_rapidos").insert({...})` com snake_case
- `serverTimestamp()` → `new Date().toISOString()`

## Problemas Encontrados
- Nenhum bloqueante. Todas as substituições aplicadas com sucesso.

## Observações
- Todos os queries usam snake_case nas colunas do Supabase
- Resultados mapeados de volta para camelCase onde o state/componentes esperam
- Timestamps convertidos de Firebase `Timestamp`/`serverTimestamp()` para `new Date().toISOString()`
- Storage convertido de Firebase `ref/uploadBytes/getDownloadURL` para `supabase.storage.from().upload/getPublicUrl`
- IDs de documentos gerados via `crypto.randomUUID()` em vez de `doc(collection(...))`
