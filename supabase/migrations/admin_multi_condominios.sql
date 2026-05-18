-- Suporte a "Administradora" (role = 'admin') vinculada a múltiplos condomínios.
-- O role 'admin' passa a se comportar como um adminMaster escopado ao conjunto
-- de condomínios listados na tabela admin_condominios.

-- ============================================
-- 1. TABELA DE VÍNCULO
-- ============================================
CREATE TABLE IF NOT EXISTS admin_condominios (
  admin_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (admin_id, condominio_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_condominios_admin ON admin_condominios(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_condominios_condo ON admin_condominios(condominio_id);

ALTER TABLE admin_condominios ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. FUNÇÃO AUXILIAR
-- ============================================
-- Retorna TRUE se o usuário logado é 'admin' vinculado ao condomínio dado.
CREATE OR REPLACE FUNCTION is_admin_of_condo(condo_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_condominios ac
    JOIN users u ON u.id = ac.admin_id
    WHERE ac.admin_id = auth.uid()
      AND ac.condominio_id = condo_id
      AND u.role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Lista de condomínios do admin logado (usada por queries no client via RPC).
CREATE OR REPLACE FUNCTION get_my_condominios()
RETURNS SETOF UUID AS $$
  SELECT condominio_id
  FROM admin_condominios
  WHERE admin_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- 3. POLICIES DA PRÓPRIA admin_condominios
-- ============================================
DROP POLICY IF EXISTS "admin_condominios_read" ON admin_condominios;
CREATE POLICY "admin_condominios_read" ON admin_condominios FOR SELECT USING (
  get_my_role() = 'adminMaster' OR admin_id = auth.uid()
);

DROP POLICY IF EXISTS "admin_condominios_write" ON admin_condominios;
CREATE POLICY "admin_condominios_write" ON admin_condominios FOR ALL USING (
  get_my_role() = 'adminMaster'
) WITH CHECK (
  get_my_role() = 'adminMaster'
);

-- ============================================
-- 4. RECRIAR POLICIES DAS DEMAIS TABELAS
--    incluindo o role 'admin' multi-condomínio
-- ============================================

-- ---------- CONDOMINIOS ----------
DROP POLICY IF EXISTS "condominios_read" ON condominios;
CREATE POLICY "condominios_read" ON condominios FOR SELECT USING (
  get_my_role() = 'adminMaster'
  OR id = get_my_condominio_id()
  OR is_admin_of_condo(id)
);

DROP POLICY IF EXISTS "condominios_update" ON condominios;
CREATE POLICY "condominios_update" ON condominios FOR UPDATE USING (
  get_my_role() = 'adminMaster'
  OR (id = get_my_condominio_id() AND get_my_role() = 'responsavel')
  OR is_admin_of_condo(id)
);

DROP POLICY IF EXISTS "condominios_delete" ON condominios;
CREATE POLICY "condominios_delete" ON condominios FOR DELETE USING (
  get_my_role() = 'adminMaster' OR is_admin_of_condo(id)
);

-- ---------- BLOCOS ----------
DROP POLICY IF EXISTS "blocos_read" ON blocos;
CREATE POLICY "blocos_read" ON blocos FOR SELECT USING (
  get_my_role() = 'adminMaster'
  OR condominio_id = get_my_condominio_id()
  OR is_admin_of_condo(condominio_id)
);

DROP POLICY IF EXISTS "blocos_write" ON blocos;
CREATE POLICY "blocos_write" ON blocos FOR ALL USING (
  get_my_role() = 'adminMaster'
  OR (condominio_id = get_my_condominio_id() AND get_my_role() = 'responsavel')
  OR is_admin_of_condo(condominio_id)
);

-- ---------- USERS ----------
DROP POLICY IF EXISTS "users_read_same_condo" ON users;
CREATE POLICY "users_read_same_condo" ON users FOR SELECT USING (
  get_my_role() = 'adminMaster'
  OR (condominio_id = get_my_condominio_id() AND get_my_role() IN ('responsavel','porteiro'))
  OR is_admin_of_condo(condominio_id)
);

DROP POLICY IF EXISTS "users_update_admin" ON users;
CREATE POLICY "users_update_admin" ON users FOR UPDATE USING (
  get_my_role() = 'adminMaster'
  OR (condominio_id = get_my_condominio_id() AND get_my_role() = 'responsavel')
  OR is_admin_of_condo(condominio_id)
);

DROP POLICY IF EXISTS "users_delete" ON users;
CREATE POLICY "users_delete" ON users FOR DELETE USING (
  get_my_role() = 'adminMaster'
  OR (condominio_id = get_my_condominio_id() AND get_my_role() = 'responsavel')
  OR is_admin_of_condo(condominio_id)
);

-- ---------- UNIDADES ----------
DROP POLICY IF EXISTS "unidades_read" ON unidades;
CREATE POLICY "unidades_read" ON unidades FOR SELECT USING (
  get_my_role() = 'adminMaster'
  OR condominio_id = get_my_condominio_id()
  OR is_admin_of_condo(condominio_id)
);

DROP POLICY IF EXISTS "unidades_write" ON unidades;
CREATE POLICY "unidades_write" ON unidades FOR ALL USING (
  get_my_role() = 'adminMaster'
  OR (condominio_id = get_my_condominio_id() AND get_my_role() = 'responsavel')
  OR is_admin_of_condo(condominio_id)
);

-- ---------- PORTEIROS ----------
DROP POLICY IF EXISTS "porteiros_read" ON porteiros;
CREATE POLICY "porteiros_read" ON porteiros FOR SELECT USING (
  get_my_role() = 'adminMaster'
  OR condominio_id = get_my_condominio_id()
  OR is_admin_of_condo(condominio_id)
);

DROP POLICY IF EXISTS "porteiros_write" ON porteiros;
CREATE POLICY "porteiros_write" ON porteiros FOR ALL USING (
  get_my_role() = 'adminMaster'
  OR (condominio_id = get_my_condominio_id() AND get_my_role() = 'responsavel')
  OR is_admin_of_condo(condominio_id)
);

-- ---------- CORRESPONDENCIAS ----------
DROP POLICY IF EXISTS "corresp_update" ON correspondencias;
CREATE POLICY "corresp_update" ON correspondencias FOR UPDATE USING (
  get_my_role() = 'adminMaster'
  OR (condominio_id = get_my_condominio_id() AND get_my_role() IN ('porteiro','responsavel'))
  OR is_admin_of_condo(condominio_id)
);

DROP POLICY IF EXISTS "corresp_delete" ON correspondencias;
CREATE POLICY "corresp_delete" ON correspondencias FOR DELETE USING (
  get_my_role() = 'adminMaster' OR is_admin_of_condo(condominio_id)
);

-- ---------- AVISOS_RAPIDOS ----------
DROP POLICY IF EXISTS "avisos_update" ON avisos_rapidos;
CREATE POLICY "avisos_update" ON avisos_rapidos FOR UPDATE USING (
  get_my_role() = 'adminMaster'
  OR (condominio_id = get_my_condominio_id() AND get_my_role() IN ('porteiro','responsavel'))
  OR is_admin_of_condo(condominio_id)
);

-- ---------- RETIRADAS ----------
DROP POLICY IF EXISTS "retiradas_read" ON retiradas;
CREATE POLICY "retiradas_read" ON retiradas FOR SELECT USING (
  get_my_role() = 'adminMaster'
  OR condominio_id = get_my_condominio_id()
  OR is_admin_of_condo(condominio_id)
);

-- ---------- CONFIGURACOES_RETIRADA ----------
DROP POLICY IF EXISTS "config_read" ON configuracoes_retirada;
CREATE POLICY "config_read" ON configuracoes_retirada FOR SELECT USING (
  get_my_role() = 'adminMaster'
  OR condominio_id = get_my_condominio_id()
  OR is_admin_of_condo(condominio_id)
);

DROP POLICY IF EXISTS "config_write" ON configuracoes_retirada;
CREATE POLICY "config_write" ON configuracoes_retirada FOR ALL USING (
  get_my_role() = 'adminMaster'
  OR (condominio_id = get_my_condominio_id() AND get_my_role() = 'responsavel')
  OR is_admin_of_condo(condominio_id)
);
