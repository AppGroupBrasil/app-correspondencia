WITH latest_bloco AS (
  SELECT id, nome, condominio_id
  FROM public.blocos
  ORDER BY criado_em DESC
  LIMIT 1
),
updated AS (
  UPDATE public.users
  SET condominio_id = (SELECT condominio_id FROM latest_bloco),
      bloco_id = (SELECT id FROM latest_bloco),
      bloco_nome = (SELECT nome FROM latest_bloco),
      bloco = (SELECT nome FROM latest_bloco),
      unidade_nome = COALESCE(unidade_nome, '100'),
      apartamento = COALESCE(apartamento, '100'),
      ativo = COALESCE(ativo, true),
      aprovado = COALESCE(aprovado, true),
      status = COALESCE(status, 'ativo')
  WHERE role = 'morador'
    AND (bloco_id IS NULL OR condominio_id IS NULL OR bloco_nome IS NULL)
  RETURNING id
)
INSERT INTO public.users (
  id,
  nome,
  email,
  role,
  condominio_id,
  bloco_id,
  bloco_nome,
  bloco,
  unidade_nome,
  apartamento,
  ativo,
  aprovado,
  status,
  criado_em
)
SELECT
  gen_random_uuid(),
  'Morador (Seu Teste)',
  'morador.manual@teste.com',
  'morador',
  latest_bloco.condominio_id,
  latest_bloco.id,
  latest_bloco.nome,
  latest_bloco.nome,
  '100',
  '100',
  true,
  true,
  'ativo',
  NOW()
FROM latest_bloco
WHERE NOT EXISTS (SELECT 1 FROM updated)
  AND NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE role = 'morador'
      AND condominio_id = latest_bloco.condominio_id
      AND bloco_id = latest_bloco.id
  );
