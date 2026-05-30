-- ============================================
-- APP CORRESPONDENCIA - Schema PostgreSQL (Supabase)
-- ESPELHO FIEL DA PRODUCAO - gerado via pg_dump --schema-only (2026-05-31)
-- Fonte da verdade da RLS. Inclui admin_condominios + is_admin_of_condo
-- (feature administradora multi-condominio).
-- ============================================

--
-- PostgreSQL database dump
--

-- Dumped from database version 15.6
-- Dumped by pg_dump version 15.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: get_my_condominio_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_condominio_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT condominio_id FROM users WHERE id = auth.uid();
$$;


--
-- Name: get_my_condominios(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_condominios() RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT condominio_id
  FROM admin_condominios
  WHERE admin_id = auth.uid();
$$;


--
-- Name: get_my_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_my_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;


--
-- Name: is_admin_of_condo(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin_of_condo(condo_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_condominios ac
    JOIN users u ON u.id = ac.admin_id
    WHERE ac.admin_id = auth.uid()
      AND ac.condominio_id = condo_id
      AND u.role = 'admin'
  );
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_condominios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_condominios (
    admin_id uuid NOT NULL,
    condominio_id uuid NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: avisos_rapidos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.avisos_rapidos (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    enviado_por_id uuid,
    enviado_por_nome text,
    enviado_por_role text,
    morador_id uuid,
    morador_nome text,
    morador_telefone text,
    condominio_id uuid NOT NULL,
    bloco_id uuid,
    bloco_nome text,
    apartamento text,
    mensagem text,
    protocolo text NOT NULL,
    foto_url text,
    link_url text,
    status text DEFAULT 'enviado'::text,
    data_envio timestamp with time zone DEFAULT now(),
    criado_em timestamp with time zone DEFAULT now(),
    imagem_url text,
    tipo text
);


--
-- Name: blocos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blocos (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    condominio_id uuid NOT NULL,
    nome text NOT NULL,
    ordem integer DEFAULT 0,
    criado_em timestamp with time zone DEFAULT now(),
    ativo boolean DEFAULT true,
    atualizado_em timestamp with time zone
);


--
-- Name: condominios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.condominios (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    nome text NOT NULL,
    cnpj text,
    endereco text,
    telefone text,
    email text,
    logo_url text,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    status text DEFAULT 'ativo'::text,
    criado_por uuid,
    email_login text
);


--
-- Name: configuracoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configuracoes (
    id text NOT NULL,
    condominio_id uuid,
    whatsapp_link text,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now()
);


--
-- Name: configuracoes_retirada; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configuracoes_retirada (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    condominio_id uuid NOT NULL,
    assinatura_morador_obrigatoria boolean DEFAULT false,
    assinatura_porteiro_obrigatoria boolean DEFAULT false,
    foto_obrigatoria boolean DEFAULT false,
    cpf_obrigatorio boolean DEFAULT false,
    telefone_obrigatorio boolean DEFAULT false,
    permitir_retirada_terceiro boolean DEFAULT false,
    texto_termos text,
    nivel_compressao_foto integer DEFAULT 60,
    metodo_assinatura text DEFAULT 'canvas'::text,
    validar_cpf boolean DEFAULT false,
    permitir_retirada_parcial boolean DEFAULT false,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now()
);


--
-- Name: correspondencias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.correspondencias (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    condominio_id uuid NOT NULL,
    bloco_id uuid,
    bloco_nome text,
    morador_id uuid,
    morador_nome text,
    apartamento text,
    protocolo text NOT NULL,
    observacao text,
    local_armazenamento text DEFAULT 'Portaria'::text,
    status text DEFAULT 'pendente'::text NOT NULL,
    imagem_url text,
    pdf_url text,
    recibo_url text,
    morador_telefone text,
    morador_email text,
    criado_por text,
    criado_por_nome text,
    criado_por_cargo text,
    compartilhado_via text[] DEFAULT '{}'::text[],
    retirado_em timestamp with time zone,
    dados_retirada jsonb,
    criado_em timestamp with time zone DEFAULT now(),
    CONSTRAINT correspondencias_status_check CHECK ((status = ANY (ARRAY['pendente'::text, 'retirada'::text])))
);


--
-- Name: message_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_templates (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    condo_id uuid NOT NULL,
    category text NOT NULL,
    title text,
    content text NOT NULL,
    is_active boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    CONSTRAINT message_templates_category_check CHECK ((category = ANY (ARRAY['ARRIVAL'::text, 'PICKUP'::text, 'WARNING'::text, 'GENERAL'::text])))
);


--
-- Name: porteiros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.porteiros (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    condominio_id uuid NOT NULL,
    nome text NOT NULL,
    email text,
    whatsapp text,
    turno text,
    ativo boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    uid uuid
);


--
-- Name: retiradas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.retiradas (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    correspondencia_id uuid,
    protocolo text,
    condominio_id uuid NOT NULL,
    nome_quem_retirou text,
    cpf_quem_retirou text,
    telefone_quem_retirou text,
    nome_porteiro text,
    data_hora_retirada timestamp with time zone,
    assinatura_morador text,
    assinatura_porteiro text,
    foto_comprovante_url text,
    observacoes text,
    codigo_verificacao text,
    status text DEFAULT 'concluida'::text,
    criado_em timestamp with time zone DEFAULT now()
);


--
-- Name: unidades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unidades (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    condominio_id uuid NOT NULL,
    bloco_id uuid,
    identificacao text NOT NULL,
    criado_em timestamp with time zone DEFAULT now(),
    tipo text,
    status text,
    proprietario text,
    bloco_setor text
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email text NOT NULL,
    nome text NOT NULL,
    telefone text,
    whatsapp text,
    cpf text,
    role text DEFAULT 'morador'::text NOT NULL,
    condominio_id uuid,
    bloco_id uuid,
    bloco_nome text,
    apartamento text,
    unidade_nome text,
    foto_url text,
    assinatura_padrao text,
    ativo boolean DEFAULT true,
    aprovado boolean DEFAULT true,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    status text DEFAULT 'ativo'::text,
    aprovado_em timestamp with time zone,
    aprovado_por uuid,
    rejeitado boolean DEFAULT false,
    rejeitado_em timestamp with time zone,
    rejeitado_por uuid,
    status_aprovacao text,
    complemento text,
    perfil_morador text,
    perfil text,
    unidade_id uuid,
    bloco text,
    precisa_redefinir_senha boolean DEFAULT false,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['adminMaster'::text, 'admin'::text, 'responsavel'::text, 'porteiro'::text, 'morador'::text])))
);


--
-- Name: admin_condominios admin_condominios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_condominios
    ADD CONSTRAINT admin_condominios_pkey PRIMARY KEY (admin_id, condominio_id);


--
-- Name: avisos_rapidos avisos_rapidos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avisos_rapidos
    ADD CONSTRAINT avisos_rapidos_pkey PRIMARY KEY (id);


--
-- Name: blocos blocos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocos
    ADD CONSTRAINT blocos_pkey PRIMARY KEY (id);


--
-- Name: condominios condominios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condominios
    ADD CONSTRAINT condominios_pkey PRIMARY KEY (id);


--
-- Name: configuracoes configuracoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracoes
    ADD CONSTRAINT configuracoes_pkey PRIMARY KEY (id);


--
-- Name: configuracoes_retirada configuracoes_retirada_condominio_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracoes_retirada
    ADD CONSTRAINT configuracoes_retirada_condominio_id_key UNIQUE (condominio_id);


--
-- Name: configuracoes_retirada configuracoes_retirada_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracoes_retirada
    ADD CONSTRAINT configuracoes_retirada_pkey PRIMARY KEY (id);


--
-- Name: correspondencias correspondencias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correspondencias
    ADD CONSTRAINT correspondencias_pkey PRIMARY KEY (id);


--
-- Name: message_templates message_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_templates
    ADD CONSTRAINT message_templates_pkey PRIMARY KEY (id);


--
-- Name: porteiros porteiros_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.porteiros
    ADD CONSTRAINT porteiros_pkey PRIMARY KEY (id);


--
-- Name: retiradas retiradas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.retiradas
    ADD CONSTRAINT retiradas_pkey PRIMARY KEY (id);


--
-- Name: unidades unidades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades
    ADD CONSTRAINT unidades_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_admin_condominios_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_condominios_admin ON public.admin_condominios USING btree (admin_id);


--
-- Name: idx_admin_condominios_condo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_condominios_condo ON public.admin_condominios USING btree (condominio_id);


--
-- Name: idx_avisos_condominio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_avisos_condominio ON public.avisos_rapidos USING btree (condominio_id);


--
-- Name: idx_blocos_condominio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blocos_condominio ON public.blocos USING btree (condominio_id);


--
-- Name: idx_corresp_condominio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_corresp_condominio ON public.correspondencias USING btree (condominio_id);


--
-- Name: idx_corresp_morador; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_corresp_morador ON public.correspondencias USING btree (morador_id);


--
-- Name: idx_corresp_protocolo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_corresp_protocolo ON public.correspondencias USING btree (protocolo);


--
-- Name: idx_corresp_retirada; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_corresp_retirada ON public.correspondencias USING btree (condominio_id, status, retirado_em DESC);


--
-- Name: idx_corresp_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_corresp_status ON public.correspondencias USING btree (condominio_id, status);


--
-- Name: idx_porteiros_condominio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_porteiros_condominio ON public.porteiros USING btree (condominio_id);


--
-- Name: idx_retiradas_condominio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_retiradas_condominio ON public.retiradas USING btree (condominio_id);


--
-- Name: idx_templates_condo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_templates_condo ON public.message_templates USING btree (condo_id);


--
-- Name: idx_unidades_condominio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unidades_condominio ON public.unidades USING btree (condominio_id);


--
-- Name: idx_users_bloco; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_bloco ON public.users USING btree (bloco_id);


--
-- Name: idx_users_condominio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_condominio ON public.users USING btree (condominio_id);


--
-- Name: idx_users_condominio_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_condominio_role ON public.users USING btree (condominio_id, role);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: condominios tr_condominios_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_condominios_updated BEFORE UPDATE ON public.condominios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: configuracoes_retirada tr_config_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_config_updated BEFORE UPDATE ON public.configuracoes_retirada FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: porteiros tr_porteiros_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_porteiros_updated BEFORE UPDATE ON public.porteiros FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: message_templates tr_templates_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_templates_updated BEFORE UPDATE ON public.message_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: users tr_users_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_users_updated BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: admin_condominios admin_condominios_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_condominios
    ADD CONSTRAINT admin_condominios_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: admin_condominios admin_condominios_condominio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_condominios
    ADD CONSTRAINT admin_condominios_condominio_id_fkey FOREIGN KEY (condominio_id) REFERENCES public.condominios(id) ON DELETE CASCADE;


--
-- Name: avisos_rapidos avisos_rapidos_bloco_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avisos_rapidos
    ADD CONSTRAINT avisos_rapidos_bloco_id_fkey FOREIGN KEY (bloco_id) REFERENCES public.blocos(id) ON DELETE SET NULL;


--
-- Name: avisos_rapidos avisos_rapidos_condominio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avisos_rapidos
    ADD CONSTRAINT avisos_rapidos_condominio_id_fkey FOREIGN KEY (condominio_id) REFERENCES public.condominios(id) ON DELETE CASCADE;


--
-- Name: avisos_rapidos avisos_rapidos_enviado_por_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avisos_rapidos
    ADD CONSTRAINT avisos_rapidos_enviado_por_id_fkey FOREIGN KEY (enviado_por_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: avisos_rapidos avisos_rapidos_morador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avisos_rapidos
    ADD CONSTRAINT avisos_rapidos_morador_id_fkey FOREIGN KEY (morador_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: blocos blocos_condominio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocos
    ADD CONSTRAINT blocos_condominio_id_fkey FOREIGN KEY (condominio_id) REFERENCES public.condominios(id) ON DELETE CASCADE;


--
-- Name: configuracoes_retirada configuracoes_retirada_condominio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracoes_retirada
    ADD CONSTRAINT configuracoes_retirada_condominio_id_fkey FOREIGN KEY (condominio_id) REFERENCES public.condominios(id) ON DELETE CASCADE;


--
-- Name: correspondencias correspondencias_bloco_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correspondencias
    ADD CONSTRAINT correspondencias_bloco_id_fkey FOREIGN KEY (bloco_id) REFERENCES public.blocos(id) ON DELETE SET NULL;


--
-- Name: correspondencias correspondencias_condominio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correspondencias
    ADD CONSTRAINT correspondencias_condominio_id_fkey FOREIGN KEY (condominio_id) REFERENCES public.condominios(id) ON DELETE CASCADE;


--
-- Name: correspondencias correspondencias_morador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correspondencias
    ADD CONSTRAINT correspondencias_morador_id_fkey FOREIGN KEY (morador_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: message_templates message_templates_condo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_templates
    ADD CONSTRAINT message_templates_condo_id_fkey FOREIGN KEY (condo_id) REFERENCES public.condominios(id) ON DELETE CASCADE;


--
-- Name: porteiros porteiros_condominio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.porteiros
    ADD CONSTRAINT porteiros_condominio_id_fkey FOREIGN KEY (condominio_id) REFERENCES public.condominios(id) ON DELETE CASCADE;


--
-- Name: retiradas retiradas_condominio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.retiradas
    ADD CONSTRAINT retiradas_condominio_id_fkey FOREIGN KEY (condominio_id) REFERENCES public.condominios(id) ON DELETE CASCADE;


--
-- Name: retiradas retiradas_correspondencia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.retiradas
    ADD CONSTRAINT retiradas_correspondencia_id_fkey FOREIGN KEY (correspondencia_id) REFERENCES public.correspondencias(id) ON DELETE SET NULL;


--
-- Name: unidades unidades_bloco_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades
    ADD CONSTRAINT unidades_bloco_id_fkey FOREIGN KEY (bloco_id) REFERENCES public.blocos(id) ON DELETE SET NULL;


--
-- Name: unidades unidades_condominio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unidades
    ADD CONSTRAINT unidades_condominio_id_fkey FOREIGN KEY (condominio_id) REFERENCES public.condominios(id) ON DELETE CASCADE;


--
-- Name: users users_bloco_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_bloco_id_fkey FOREIGN KEY (bloco_id) REFERENCES public.blocos(id) ON DELETE SET NULL;


--
-- Name: users users_condominio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_condominio_id_fkey FOREIGN KEY (condominio_id) REFERENCES public.condominios(id) ON DELETE SET NULL;


--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: admin_condominios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_condominios ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_condominios admin_condominios_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_condominios_read ON public.admin_condominios FOR SELECT USING (((public.get_my_role() = 'adminMaster'::text) OR (admin_id = auth.uid())));


--
-- Name: admin_condominios admin_condominios_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_condominios_write ON public.admin_condominios USING ((public.get_my_role() = 'adminMaster'::text)) WITH CHECK ((public.get_my_role() = 'adminMaster'::text));


--
-- Name: avisos_rapidos avisos_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY avisos_insert ON public.avisos_rapidos FOR INSERT WITH CHECK ((public.get_my_role() = ANY (ARRAY['porteiro'::text, 'responsavel'::text, 'admin'::text, 'adminMaster'::text])));


--
-- Name: avisos_rapidos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.avisos_rapidos ENABLE ROW LEVEL SECURITY;

--
-- Name: avisos_rapidos avisos_read_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY avisos_read_public ON public.avisos_rapidos FOR SELECT USING (true);


--
-- Name: avisos_rapidos avisos_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY avisos_update ON public.avisos_rapidos FOR UPDATE USING (((public.get_my_role() = 'adminMaster'::text) OR ((condominio_id = public.get_my_condominio_id()) AND (public.get_my_role() = ANY (ARRAY['porteiro'::text, 'responsavel'::text]))) OR public.is_admin_of_condo(condominio_id)));


--
-- Name: blocos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blocos ENABLE ROW LEVEL SECURITY;

--
-- Name: blocos blocos_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY blocos_read ON public.blocos FOR SELECT USING (((public.get_my_role() = 'adminMaster'::text) OR (condominio_id = public.get_my_condominio_id()) OR public.is_admin_of_condo(condominio_id)));


--
-- Name: blocos blocos_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY blocos_write ON public.blocos USING (((public.get_my_role() = 'adminMaster'::text) OR ((condominio_id = public.get_my_condominio_id()) AND (public.get_my_role() = 'responsavel'::text)) OR public.is_admin_of_condo(condominio_id)));


--
-- Name: condominios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.condominios ENABLE ROW LEVEL SECURITY;

--
-- Name: condominios condominios_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY condominios_delete ON public.condominios FOR DELETE USING (((public.get_my_role() = 'adminMaster'::text) OR public.is_admin_of_condo(id)));


--
-- Name: condominios condominios_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY condominios_insert ON public.condominios FOR INSERT WITH CHECK (true);


--
-- Name: condominios condominios_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY condominios_read ON public.condominios FOR SELECT USING (((public.get_my_role() = 'adminMaster'::text) OR (id = public.get_my_condominio_id()) OR public.is_admin_of_condo(id)));


--
-- Name: condominios condominios_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY condominios_update ON public.condominios FOR UPDATE USING (((public.get_my_role() = 'adminMaster'::text) OR ((id = public.get_my_condominio_id()) AND (public.get_my_role() = 'responsavel'::text)) OR public.is_admin_of_condo(id)));


--
-- Name: configuracoes config_geral_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY config_geral_all ON public.configuracoes USING (true) WITH CHECK (true);


--
-- Name: configuracoes_retirada config_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY config_read ON public.configuracoes_retirada FOR SELECT USING (((public.get_my_role() = 'adminMaster'::text) OR (condominio_id = public.get_my_condominio_id()) OR public.is_admin_of_condo(condominio_id)));


--
-- Name: configuracoes_retirada config_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY config_write ON public.configuracoes_retirada USING (((public.get_my_role() = 'adminMaster'::text) OR ((condominio_id = public.get_my_condominio_id()) AND (public.get_my_role() = 'responsavel'::text)) OR public.is_admin_of_condo(condominio_id)));


--
-- Name: configuracoes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

--
-- Name: configuracoes_retirada; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.configuracoes_retirada ENABLE ROW LEVEL SECURITY;

--
-- Name: correspondencias corresp_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY corresp_delete ON public.correspondencias FOR DELETE USING (((public.get_my_role() = 'adminMaster'::text) OR public.is_admin_of_condo(condominio_id)));


--
-- Name: correspondencias corresp_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY corresp_insert ON public.correspondencias FOR INSERT WITH CHECK ((public.get_my_role() = ANY (ARRAY['porteiro'::text, 'responsavel'::text, 'admin'::text, 'adminMaster'::text])));


--
-- Name: correspondencias corresp_read_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY corresp_read_public ON public.correspondencias FOR SELECT USING (true);


--
-- Name: correspondencias corresp_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY corresp_update ON public.correspondencias FOR UPDATE USING (((public.get_my_role() = 'adminMaster'::text) OR ((condominio_id = public.get_my_condominio_id()) AND (public.get_my_role() = ANY (ARRAY['porteiro'::text, 'responsavel'::text]))) OR public.is_admin_of_condo(condominio_id)));


--
-- Name: correspondencias; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.correspondencias ENABLE ROW LEVEL SECURITY;

--
-- Name: message_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: porteiros; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.porteiros ENABLE ROW LEVEL SECURITY;

--
-- Name: porteiros porteiros_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY porteiros_read ON public.porteiros FOR SELECT USING (((public.get_my_role() = 'adminMaster'::text) OR (condominio_id = public.get_my_condominio_id()) OR public.is_admin_of_condo(condominio_id)));


--
-- Name: porteiros porteiros_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY porteiros_write ON public.porteiros USING (((public.get_my_role() = 'adminMaster'::text) OR ((condominio_id = public.get_my_condominio_id()) AND (public.get_my_role() = 'responsavel'::text)) OR public.is_admin_of_condo(condominio_id)));


--
-- Name: retiradas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.retiradas ENABLE ROW LEVEL SECURITY;

--
-- Name: retiradas retiradas_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY retiradas_insert ON public.retiradas FOR INSERT WITH CHECK ((public.get_my_role() = ANY (ARRAY['porteiro'::text, 'responsavel'::text, 'admin'::text, 'adminMaster'::text])));


--
-- Name: retiradas retiradas_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY retiradas_read ON public.retiradas FOR SELECT USING (((public.get_my_role() = 'adminMaster'::text) OR (condominio_id = public.get_my_condominio_id()) OR public.is_admin_of_condo(condominio_id)));


--
-- Name: message_templates templates_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY templates_read ON public.message_templates FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: message_templates templates_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY templates_write ON public.message_templates USING ((public.get_my_role() = ANY (ARRAY['responsavel'::text, 'admin'::text, 'adminMaster'::text])));


--
-- Name: unidades; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;

--
-- Name: unidades unidades_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY unidades_read ON public.unidades FOR SELECT USING (((public.get_my_role() = 'adminMaster'::text) OR (condominio_id = public.get_my_condominio_id()) OR public.is_admin_of_condo(condominio_id)));


--
-- Name: unidades unidades_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY unidades_write ON public.unidades USING (((public.get_my_role() = 'adminMaster'::text) OR ((condominio_id = public.get_my_condominio_id()) AND (public.get_my_role() = 'responsavel'::text)) OR public.is_admin_of_condo(condominio_id)));


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_delete ON public.users FOR DELETE USING (((public.get_my_role() = 'adminMaster'::text) OR ((condominio_id = public.get_my_condominio_id()) AND (public.get_my_role() = 'responsavel'::text)) OR public.is_admin_of_condo(condominio_id)));


--
-- Name: users users_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_insert ON public.users FOR INSERT WITH CHECK (true);


--
-- Name: users users_read_same_condo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_read_same_condo ON public.users FOR SELECT USING (((public.get_my_role() = 'adminMaster'::text) OR ((condominio_id = public.get_my_condominio_id()) AND (public.get_my_role() = ANY (ARRAY['responsavel'::text, 'porteiro'::text]))) OR public.is_admin_of_condo(condominio_id)));


--
-- Name: users users_read_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_read_self ON public.users FOR SELECT USING ((id = auth.uid()));


--
-- Name: users users_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update_admin ON public.users FOR UPDATE USING (((public.get_my_role() = 'adminMaster'::text) OR ((condominio_id = public.get_my_condominio_id()) AND (public.get_my_role() = 'responsavel'::text)) OR public.is_admin_of_condo(condominio_id)));


--
-- Name: users users_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update_self ON public.users FOR UPDATE USING ((id = auth.uid()));


--
-- PostgreSQL database dump complete
--

