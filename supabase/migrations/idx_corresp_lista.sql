-- Índice da listagem de correspondências.
-- Os índices existentes cobrem (condominio_id, status), mas a lista ordena por
-- criado_em DESC — sem esta coluna o Postgres ainda precisa ordenar o resultado.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_corresp_lista
  ON public.correspondencias USING btree (condominio_id, status, criado_em DESC);
