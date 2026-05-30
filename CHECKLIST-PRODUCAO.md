# Checklist de Produção — App Correspondência

## Antes do Deploy

### 1. Local
- [ ] `npm install` sem erros
- [ ] `npm run dev` roda
- [ ] `npm run build` conclui sem erros
- [ ] `.env.local` preenchido (Supabase + Resend)

### 2. Repositório Git
- [ ] Commit e push para o remote principal
- [ ] `.gitignore` cobre `.env.local`, `.env.supabase`, `node_modules`, `.next`, `out`, `android/app/build`

### 3. Supabase
- [ ] Containers Supabase saudáveis no servidor (`docker ps | grep supabase`)
- [ ] Schema aplicado (tabelas: users, condominios, blocos, unidades, porteiros, correspondencias, retiradas, avisos_rapidos, configuracoes, configuracoes_retirada, message_templates)
- [ ] Bucket de Storage criado para anexos de correspondência
- [ ] Policies RLS revisadas

### 4. Resend
- [ ] Domínio `appcorrespondencia.com.br` verificado em https://resend.com/domains
- [ ] API Key ativa
- [ ] `EMAIL_FROM` apontando para domínio verificado

## Deploy

### 5. Servidor Hetzner
- [ ] SSH OK com `~/.ssh/hetzner_key`
- [ ] Traefik + rede `coolify` ativos
- [ ] Imagem `app-correspondencia:latest` construída e carregada (ver `SERVIDOR-HETZNER.md`)
- [ ] Container responde em https://appcorrespondencia.com.br

### 6. Variáveis no container `app-correspondencia`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `SUPABASE_JWT_SECRET`
- [ ] `RESEND_API_KEY`
- [ ] `EMAIL_FROM`
- [ ] `EMAIL_REPLY_TO`
- [ ] `SMTP_ADMIN_EMAIL`
- [ ] `NEXT_PUBLIC_BASE_URL`

## Após Deploy

### 7. Testes funcionais
- [ ] Site carrega
- [ ] Login funciona
- [ ] Dashboard do porteiro abre
- [ ] Nova correspondência: cadastrar + anexar foto + salvar
- [ ] E-mail de notificação chega via Resend
- [ ] QR Code gerado
- [ ] Retirada com assinatura funciona
- [ ] Dashboard do morador lista correspondências
- [ ] Aviso rápido envia (push/WhatsApp/e-mail)

### 8. Segurança
- [ ] Rotas autenticadas redirecionam sem sessão
- [ ] Usuário não vê dados de outro condomínio (RLS)
- [ ] Headers `X-Content-Type-Options`, `Referrer-Policy` ativos
- [ ] Chaves privadas ausentes no bundle do client

### 9. Performance
- [ ] TTFB < 1s, LCP < 3s
- [ ] Imagens servidas otimizadas (AVIF/WebP)
- [ ] Sem erros no console do navegador

## Monitoramento
- [ ] `docker logs app-correspondencia` sem erros recorrentes
- [ ] Backup do Postgres do Supabase agendado
- [ ] Dashboard Coolify acessível

## Suporte
1. Logs: `ssh -i ~/.ssh/hetzner_key root@46.225.191.114 "docker logs app-correspondencia --tail 200"`
2. Conferir env vars do container: `docker exec app-correspondencia env`
3. Conferir Postgres: `docker exec -it supabase-db psql -U postgres`
