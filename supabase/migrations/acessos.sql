-- Registro de acessos (logins) por condomínio, usado no painel Master
-- ("Gerenciar Condomínios" → coluna "Acessos (7 dias)") para acompanhar
-- quem está usando o app e com que frequência.
--
-- Rode UMA vez no SQL Editor do Supabase. A aplicação é tolerante: enquanto a
-- tabela não existir, a coluna apenas mostra 0 e nada quebra.

-- ============================================
-- 1. TABELA
-- ============================================
CREATE TABLE IF NOT EXISTS acessos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acessos_condo_data ON acessos(condominio_id, criado_em DESC);

-- ============================================
-- 2. RLS
-- ============================================
ALTER TABLE acessos ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado registra o próprio acesso (ao logar).
DROP POLICY IF EXISTS "acessos_insert" ON acessos;
CREATE POLICY "acessos_insert" ON acessos FOR INSERT TO authenticated WITH CHECK (
  condominio_id = get_my_condominio_id()
  OR get_my_role() = 'adminMaster'
  OR is_admin_of_condo(condominio_id)
);

-- Master vê tudo; responsável/admin veem o(s) próprio(s) condomínio(s).
DROP POLICY IF EXISTS "acessos_read" ON acessos;
CREATE POLICY "acessos_read" ON acessos FOR SELECT USING (
  get_my_role() = 'adminMaster'
  OR condominio_id = get_my_condominio_id()
  OR is_admin_of_condo(condominio_id)
);
