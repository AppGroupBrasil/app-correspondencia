SELECT nome, email, role, condominio_id, bloco_id, bloco_nome, unidade_nome, apartamento
FROM public.users
WHERE role = 'morador'
ORDER BY criado_em DESC
LIMIT 5;
