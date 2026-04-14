SELECT nome, email, role, whatsapp, telefone, condominio_id
FROM public.users
WHERE role IN ('morador', 'responsavel')
ORDER BY criado_em DESC
LIMIT 10;
