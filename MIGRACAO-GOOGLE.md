# 🦅 Migração da Vercel para o Google (Firebase Hosting)

Este guia explica como tirar seu site da Vercel e hospedá-lo inteiramente no Google Firebase.

## ✅ Pré-requisitos

1.  **Plano Blaze**: Seu projeto no Console do Firebase deve estar no plano "Blaze" (Pay as you go).
    *   *Por que?* O Next.js precisa de processamento no servidor (Cloud Functions) que não está disponível no plano gratuito (Spark).
2.  **Firebase CLI**: Ferramentas de linha de comando instaladas.

## 🚀 Passo 1: Configuração (Já realizada)

O arquivo `firebase.json` já foi configurado para reconhecer seu projeto Next.js automaticamente:

```json
"hosting": {
  "source": ".",
  "frameworksBackend": {
    "region": "us-central1"
  }
}
```

## 📦 Passo 2: Fazer o Deploy

No seu terminal (dentro da pasta do projeto), execute:

1.  **Login no Google:**
    ```bash
    firebase login
    ```

2.  **Ativar o experimento de Frameworks (Necessário para Next.js):**
    ```bash
    firebase experiments:enable webframeworks
    ```

3.  **Fazer o Deploy:**
    ```bash
    firebase deploy
    ```
    *Durante o deploy, o Firebase vai detectar que é um app Next.js, fazer o build e criar as funções necessárias.*

## ⚙️ Passo 3: Configurar o Domínio no Google

Depois que o site estiver no ar (você receberá uma URL como `seu-projeto.web.app`):

1.  Acesse o [Console do Firebase](https://console.firebase.google.com).
2.  Vá em **Hospedagem (Hosting)** no menu lateral.
3.  Clique em **Adicionar domínio personalizado**.
4.  Digite seu domínio (ex: `appcorrespondencia.com.br`).
5.  O Google fornecerá os registros **A** (IPs) para você colocar no registro.br (substituindo os da Vercel).

## 🗑️ Passo 4: Remover da Vercel (Opcional)

Se tudo estiver funcionando no Google:
1.  Acesse o painel da Vercel.
2.  Vá em **Settings** > **General**.
3.  Role até o final e clique em **Delete Project**.
