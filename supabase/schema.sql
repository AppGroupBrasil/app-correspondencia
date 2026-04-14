-- ============================================
-- APP CORRESPONDÊNCIA — Schema PostgreSQL (Supabase)
-- Migração de Firebase Firestore → PostgreSQL
-- ============================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABELA: condominios
-- ============================================
CREATE TABLE IF NOT EXISTS condominios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  logo_url TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: blocos
-- ============================================
CREATE TABLE IF NOT EXISTS blocos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_blocos_condominio ON blocos(condominio_id);

-- ============================================
-- TABELA: users (perfis vinculados ao auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  whatsapp TEXT,
  cpf TEXT,
  role TEXT NOT NULL DEFAULT 'morador' CHECK (role IN ('adminMaster', 'admin', 'responsavel', 'porteiro', 'morador')),
  condominio_id UUID REFERENCES condominios(id) ON DELETE SET NULL,
  bloco_id UUID REFERENCES blocos(id) ON DELETE SET NULL,
  bloco_nome TEXT,
  apartamento TEXT,
  unidade_nome TEXT,
  foto_url TEXT,
  assinatura_padrao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  aprovado BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_condominio ON users(condominio_id);
CREATE INDEX idx_users_bloco ON users(bloco_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_condominio_role ON users(condominio_id, role);

-- ============================================
-- TABELA: unidades
-- ============================================
CREATE TABLE IF NOT EXISTS unidades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  bloco_id UUID REFERENCES blocos(id) ON DELETE SET NULL,
  identificacao TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_unidades_condominio ON unidades(condominio_id);

-- ============================================
-- TABELA: porteiros
-- ============================================
CREATE TABLE IF NOT EXISTS porteiros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  whatsapp TEXT,
  turno TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_porteiros_condominio ON porteiros(condominio_id);

-- ============================================
-- TABELA: correspondencias
-- ============================================
CREATE TABLE IF NOT EXISTS correspondencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  bloco_id UUID REFERENCES blocos(id) ON DELETE SET NULL,
  bloco_nome TEXT,
  morador_id UUID REFERENCES users(id) ON DELETE SET NULL,
  morador_nome TEXT,
  apartamento TEXT,
  protocolo TEXT NOT NULL,
  observacao TEXT,
  local_armazenamento TEXT DEFAULT 'Portaria',
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'retirada')),
  imagem_url TEXT,
  pdf_url TEXT,
  recibo_url TEXT,
  morador_telefone TEXT,
  morador_email TEXT,
  criado_por TEXT,
  criado_por_nome TEXT,
  criado_por_cargo TEXT,
  compartilhado_via TEXT[] DEFAULT '{}',
  -- Dados de retirada (embutido)
  retirado_em TIMESTAMPTZ,
  dados_retirada JSONB,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_corresp_condominio ON correspondencias(condominio_id);
CREATE INDEX idx_corresp_status ON correspondencias(condominio_id, status);
CREATE INDEX idx_corresp_morador ON correspondencias(morador_id);
CREATE INDEX idx_corresp_protocolo ON correspondencias(protocolo);
CREATE INDEX idx_corresp_retirada ON correspondencias(condominio_id, status, retirado_em DESC);

-- ============================================
-- TABELA: avisos_rapidos
-- ============================================
CREATE TABLE IF NOT EXISTS avisos_rapidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enviado_por_id UUID REFERENCES users(id) ON DELETE SET NULL,
  enviado_por_nome TEXT,
  enviado_por_role TEXT,
  morador_id UUID REFERENCES users(id) ON DELETE SET NULL,
  morador_nome TEXT,
  morador_telefone TEXT,
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  bloco_id UUID REFERENCES blocos(id) ON DELETE SET NULL,
  bloco_nome TEXT,
  apartamento TEXT,
  mensagem TEXT,
  protocolo TEXT NOT NULL,
  foto_url TEXT,
  link_url TEXT,
  status TEXT DEFAULT 'enviado',
  data_envio TIMESTAMPTZ DEFAULT NOW(),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_avisos_condominio ON avisos_rapidos(condominio_id);

-- ============================================
-- TABELA: retiradas (log de auditoria)
-- ============================================
CREATE TABLE IF NOT EXISTS retiradas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  correspondencia_id UUID REFERENCES correspondencias(id) ON DELETE SET NULL,
  protocolo TEXT,
  condominio_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  nome_quem_retirou TEXT,
  cpf_quem_retirou TEXT,
  telefone_quem_retirou TEXT,
  nome_porteiro TEXT,
  data_hora_retirada TIMESTAMPTZ,
  assinatura_morador TEXT,
  assinatura_porteiro TEXT,
  foto_comprovante_url TEXT,
  observacoes TEXT,
  codigo_verificacao TEXT,
  status TEXT DEFAULT 'concluida',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_retiradas_condominio ON retiradas(condominio_id);

-- ============================================
-- TABELA: message_templates
-- ============================================
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condo_id UUID NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('ARRIVAL', 'PICKUP', 'WARNING', 'GENERAL')),
  title TEXT,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_condo ON message_templates(condo_id);

-- ============================================
-- TABELA: configuracoes_retirada
-- ============================================
CREATE TABLE IF NOT EXISTS configuracoes_retirada (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  condominio_id UUID NOT NULL UNIQUE REFERENCES condominios(id) ON DELETE CASCADE,
  assinatura_morador_obrigatoria BOOLEAN DEFAULT FALSE,
  assinatura_porteiro_obrigatoria BOOLEAN DEFAULT FALSE,
  foto_obrigatoria BOOLEAN DEFAULT FALSE,
  cpf_obrigatorio BOOLEAN DEFAULT FALSE,
  telefone_obrigatorio BOOLEAN DEFAULT FALSE,
  permitir_retirada_terceiro BOOLEAN DEFAULT FALSE,
  texto_termos TEXT,
  nivel_compressao_foto INTEGER DEFAULT 60,
  metodo_assinatura TEXT DEFAULT 'canvas',
  validar_cpf BOOLEAN DEFAULT FALSE,
  permitir_retirada_parcial BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FUNÇÃO: atualizar updated_at automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para auto-update
CREATE TRIGGER tr_condominios_updated BEFORE UPDATE ON condominios FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_porteiros_updated BEFORE UPDATE ON porteiros FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_templates_updated BEFORE UPDATE ON message_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_config_updated BEFORE UPDATE ON configuracoes_retirada FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS) — Substitui Firestore Rules
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE condominios ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocos ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE porteiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE correspondencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE avisos_rapidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE retiradas ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes_retirada ENABLE ROW LEVEL SECURITY;

-- Função auxiliar: obter dados do usuário logado
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_condominio_id()
RETURNS UUID AS $$
  SELECT condominio_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---------- CONDOMINIOS ----------
CREATE POLICY "condominios_read" ON condominios FOR SELECT USING (
  id = get_my_condominio_id() OR get_my_role() = 'adminMaster'
);
CREATE POLICY "condominios_insert" ON condominios FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "condominios_update" ON condominios FOR UPDATE USING (
  id = get_my_condominio_id() AND get_my_role() IN ('responsavel', 'admin', 'adminMaster')
);
CREATE POLICY "condominios_delete" ON condominios FOR DELETE USING (
  get_my_role() IN ('admin', 'adminMaster')
);

-- ---------- BLOCOS ----------
CREATE POLICY "blocos_read" ON blocos FOR SELECT USING (
  condominio_id = get_my_condominio_id() OR get_my_role() = 'adminMaster'
);
CREATE POLICY "blocos_write" ON blocos FOR ALL USING (
  condominio_id = get_my_condominio_id() AND get_my_role() IN ('responsavel', 'admin', 'adminMaster')
);

-- ---------- USERS ----------
CREATE POLICY "users_read_self" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_read_same_condo" ON users FOR SELECT USING (
  condominio_id = get_my_condominio_id() AND get_my_role() IN ('responsavel', 'porteiro', 'admin', 'adminMaster')
);
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "users_update_self" ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "users_update_admin" ON users FOR UPDATE USING (
  condominio_id = get_my_condominio_id() AND get_my_role() IN ('responsavel', 'admin', 'adminMaster')
);
CREATE POLICY "users_delete" ON users FOR DELETE USING (
  condominio_id = get_my_condominio_id() AND get_my_role() IN ('responsavel', 'admin', 'adminMaster')
);

-- ---------- UNIDADES ----------
CREATE POLICY "unidades_read" ON unidades FOR SELECT USING (
  condominio_id = get_my_condominio_id()
);
CREATE POLICY "unidades_write" ON unidades FOR ALL USING (
  condominio_id = get_my_condominio_id() AND get_my_role() IN ('responsavel', 'admin', 'adminMaster')
);

-- ---------- PORTEIROS ----------
CREATE POLICY "porteiros_read" ON porteiros FOR SELECT USING (
  condominio_id = get_my_condominio_id()
);
CREATE POLICY "porteiros_write" ON porteiros FOR ALL USING (
  condominio_id = get_my_condominio_id() AND get_my_role() IN ('responsavel', 'admin', 'adminMaster')
);

-- ---------- CORRESPONDENCIAS ----------
CREATE POLICY "corresp_read_public" ON correspondencias FOR SELECT USING (TRUE);
CREATE POLICY "corresp_insert" ON correspondencias FOR INSERT WITH CHECK (
  get_my_role() IN ('porteiro', 'responsavel', 'admin', 'adminMaster')
);
CREATE POLICY "corresp_update" ON correspondencias FOR UPDATE USING (
  condominio_id = get_my_condominio_id() AND get_my_role() IN ('porteiro', 'responsavel', 'admin', 'adminMaster')
);
CREATE POLICY "corresp_delete" ON correspondencias FOR DELETE USING (
  get_my_role() IN ('admin', 'adminMaster')
);

-- ---------- AVISOS_RAPIDOS ----------
CREATE POLICY "avisos_read_public" ON avisos_rapidos FOR SELECT USING (TRUE);
CREATE POLICY "avisos_insert" ON avisos_rapidos FOR INSERT WITH CHECK (
  get_my_role() IN ('porteiro', 'responsavel', 'admin', 'adminMaster')
);
CREATE POLICY "avisos_update" ON avisos_rapidos FOR UPDATE USING (
  condominio_id = get_my_condominio_id() AND get_my_role() IN ('porteiro', 'responsavel', 'admin', 'adminMaster')
);

-- ---------- RETIRADAS ----------
CREATE POLICY "retiradas_read" ON retiradas FOR SELECT USING (
  condominio_id = get_my_condominio_id()
);
CREATE POLICY "retiradas_insert" ON retiradas FOR INSERT WITH CHECK (
  get_my_role() IN ('porteiro', 'responsavel', 'admin', 'adminMaster')
);

-- ---------- MESSAGE_TEMPLATES ----------
CREATE POLICY "templates_read" ON message_templates FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "templates_write" ON message_templates FOR ALL USING (
  get_my_role() IN ('responsavel', 'admin', 'adminMaster')
);

-- ---------- CONFIGURACOES_RETIRADA ----------
CREATE POLICY "config_read" ON configuracoes_retirada FOR SELECT USING (
  condominio_id = get_my_condominio_id()
);
CREATE POLICY "config_write" ON configuracoes_retirada FOR ALL USING (
  condominio_id = get_my_condominio_id() AND get_my_role() IN ('responsavel', 'admin', 'adminMaster')
);

-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- Criar buckets para armazenar imagens e PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('correspondencias', 'correspondencias', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avisos', 'avisos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('retiradas', 'retiradas', true) ON CONFLICT DO NOTHING;

-- Políticas de Storage
CREATE POLICY "storage_read_public" ON storage.objects FOR SELECT USING (bucket_id IN ('correspondencias', 'avisos', 'retiradas'));
CREATE POLICY "storage_upload_auth" ON storage.objects FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND bucket_id IN ('correspondencias', 'avisos', 'retiradas')
);
CREATE POLICY "storage_delete_admin" ON storage.objects FOR DELETE USING (
  auth.uid() IS NOT NULL AND bucket_id IN ('correspondencias', 'avisos', 'retiradas')
);
