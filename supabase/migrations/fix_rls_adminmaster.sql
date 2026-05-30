-- Corrige políticas RLS para que o adminMaster (condominio_id NULL)
-- consiga ler/gerenciar dados de todos os condomínios.

-- ---------- USERS ----------
DROP POLICY IF EXISTS "users_read_same_condo" ON users;
CREATE POLICY "users_read_same_condo" ON users FOR SELECT USING (
  get_my_role() = 'adminMaster'
  OR (condominio_id = get_my_condominio_id() AND get_my_role() IN ('responsavel','porteiro','admin','adminMaster'))
);

DROP POLICY IF EXISTS "users_update_admin" ON users;
CREATE POLICY "users_update_admin" ON users FOR UPDATE USING (
  get_my_role() = 'adminMaster'
  OR (condominio_id = get_my_condominio_id() AND get_my_role() IN ('responsavel','admin'))
);

DROP POLICY IF EXISTS "users_delete" ON users;
CREATE POLICY "users_delete" ON users FOR DELETE USING (
  get_my_role() = 'adminMaster'
  OR (condominio_id = get_my_condominio_id() AND get_my_role() IN ('responsavel','admin'))
);

-- ---------- UNIDADES ----------
DROP POLICY IF EXISTS "unidades_read" ON unidades;
CREATE POLICY "unidades_read" ON unidades FOR SELECT USING (
  get_my_role() = 'adminMaster' OR condominio_id = get_my_condominio_id()
);

DROP POLICY IF EXISTS "unidades_write" ON unidades;
CREATE POLICY "unidades_write" ON unidades FOR ALL USING (
  get_my_role() = 'adminMaster'
  OR (condominio_id = get_my_condominio_id() AND get_my_role() IN ('responsavel','admin'))
);

-- ---------- PORTEIROS ----------
DROP POLICY IF EXISTS "porteiros_read" ON porteiros;
CREATE POLICY "porteiros_read" ON porteiros FOR SELECT USING (
  get_my_role() = 'adminMaster' OR condominio_id = get_my_condominio_id()
);

DROP POLICY IF EXISTS "porteiros_write" ON porteiros;
CREATE POLICY "porteiros_write" ON porteiros FOR ALL USING (
  get_my_role() = 'adminMaster'
  OR (condominio_id = get_my_condominio_id() AND get_my_role() IN ('responsavel','admin'))
);

-- ---------- BLOCOS ----------
DROP POLICY IF EXISTS "blocos_write" ON blocos;
CREATE POLICY "blocos_write" ON blocos FOR ALL USING (
  get_my_role() = 'adminMaster'
  OR (condominio_id = get_my_condominio_id() AND get_my_role() IN ('responsavel','admin'))
);

-- ---------- CORRESPONDENCIAS ----------
DROP POLICY IF EXISTS "corresp_update" ON correspondencias;
CREATE POLICY "corresp_update" ON correspondencias FOR UPDATE USING (
  get_my_role() = 'adminMaster'
  OR (condominio_id = get_my_condominio_id() AND get_my_role() IN ('porteiro','responsavel','admin'))
);

-- ---------- AVISOS_RAPIDOS ----------
DROP POLICY IF EXISTS "avisos_update" ON avisos_rapidos;
CREATE POLICY "avisos_update" ON avisos_rapidos FOR UPDATE USING (
  get_my_role() = 'adminMaster'
  OR (condominio_id = get_my_condominio_id() AND get_my_role() IN ('porteiro','responsavel','admin'))
);

-- ---------- RETIRADAS ----------
DROP POLICY IF EXISTS "retiradas_read" ON retiradas;
CREATE POLICY "retiradas_read" ON retiradas FOR SELECT USING (
  get_my_role() = 'adminMaster' OR condominio_id = get_my_condominio_id()
);

-- ---------- CONFIGURACOES_RETIRADA ----------
DROP POLICY IF EXISTS "config_read" ON configuracoes_retirada;
CREATE POLICY "config_read" ON configuracoes_retirada FOR SELECT USING (
  get_my_role() = 'adminMaster' OR condominio_id = get_my_condominio_id()
);

DROP POLICY IF EXISTS "config_write" ON configuracoes_retirada;
CREATE POLICY "config_write" ON configuracoes_retirada FOR ALL USING (
  get_my_role() = 'adminMaster'
  OR (condominio_id = get_my_condominio_id() AND get_my_role() IN ('responsavel','admin'))
);
