# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [2.0.0] - 2026-01-16

### 🔒 Segurança

- **CRÍTICO**: Removidas credenciais Firebase hardcoded do código fonte
- **CRÍTICO**: Implementada configuração via variáveis de ambiente
- Corrigida inconsistência nas regras do Firestore (`usuarios` → `users`)
- Atualizado Next.js para versão 16.1.2 (correções de segurança)
- Adicionados headers de segurança no `next.config.js`
- API de email refatorada com inicialização lazy para evitar exposição de chaves

### ✨ Novas Funcionalidades

- **Dashboard Master**: Nova página dedicada para perfil AdminMaster
- **Página de Login**: Rota `/login` dedicada com redirecionamento inteligente
- **Health Check de Email**: Endpoint GET em `/api/email` para verificar configuração
- **Tipos Centralizados**: Novo arquivo `types/correspondencia.ts` com interfaces padronizadas

### 🐛 Correções

- Corrigido redirecionamento do AdminMaster (agora vai para `/dashboard-master`)
- Corrigido link de configuração de avisos rápidos
- Corrigido link de aprovação de moradores
- Corrigido endpoint de API de email (`/api/send` → `/api/email`)
- Corrigido redirecionamento após exclusão de conta
- Corrigidas aspas não escapadas em JSX (GerenciarBlocos, Relatorios, PorteiroTable)
- Removido arquivo vazio `fix-logo-paths.js`
- Corrigido `withAuth` para incluir `adminMaster` no fallbackRoute

### ⚡ Performance

- **Logo**: Otimizada de 4.6MB para 106KB (redução de 97%)
- **Favicon**: Otimizado de 4.6MB para 17KB (redução de 99%)
- **Outras imagens**: app-store.png, google-play.png, logo-zap.png otimizadas
- Configuração de imagens modernizada (`remotePatterns` em vez de `domains`)
- Adicionada otimização de pacotes para `lucide-react` e `firebase`

### 🎨 Design

- Implementado sistema de design premium no Tailwind
- Adicionadas sombras premium (`shadow-premium`, `shadow-card`)
- Adicionados gradientes (`gradient-primary`, `gradient-card`)
- Adicionadas animações suaves (`fade-in`, `fade-in-up`, `slide-in-right`)
- Refatorado `globals.css` com componentes reutilizáveis
- Adicionada scrollbar customizada
- Mantidas cores originais do sistema (#057321)

### 📝 Documentação

- README.md completamente reescrito com documentação profissional
- Adicionado CHANGELOG.md
- Atualizado `.env.example` com todas as variáveis necessárias

### 🔧 Configuração

- Atualizado `next.config.js` com configurações modernas
- Removida opção depreciada `swcMinify`
- Adicionados device sizes e image sizes otimizados
- Configurado `optimizePackageImports` experimental

### 📦 Dependências

- Instalado `@types/react-signature-canvas`
- Atualizado `next` para versão mais recente

---

## [1.0.0] - Versão Original

Versão inicial do AppCorrespondencia.

### Funcionalidades

- Sistema de gestão de correspondências
- Múltiplos perfis de usuário (Admin, Responsável, Porteiro, Morador)
- Notificações por e-mail
- Registro com foto
- Assinatura digital para retirada
- Avisos rápidos
- Relatórios e estatísticas
- Suporte a aplicativo Android via Capacitor
