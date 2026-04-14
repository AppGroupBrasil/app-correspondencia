SELECT nome, email, whatsapp
FROM public.users
WHERE role = 'morador'
ORDER BY criado_em DESC
LIMIT 5;
