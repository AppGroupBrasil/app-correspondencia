UPDATE public.users AS morador
SET whatsapp = responsavel.whatsapp
FROM public.users AS responsavel
WHERE morador.role = 'morador'
  AND responsavel.role = 'responsavel'
  AND morador.condominio_id = responsavel.condominio_id
  AND (morador.whatsapp IS NULL OR morador.whatsapp = '')
  AND responsavel.whatsapp IS NOT NULL
  AND responsavel.whatsapp <> '';
