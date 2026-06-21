# Void Arena SITE v4.11 — GitHub/Render

Este ZIP é a versão repo-ready do SITE separado.

## O que subir no GitHub

Suba esta pasta como repositório do SITE. Não suba `.env`, `node_modules`, `package-lock.json` nem `data/*.json`.

## Render — Web Service do SITE

- Build Command: `npm install`
- Start Command: `npm start`

Variáveis obrigatórias:

```env
BOT_API_URL=https://URL-DO-BOT-NO-RENDER.onrender.com
BOT_API_KEY=mesma-chave-secreta-do-bot
DISCORD_CLIENT_ID=seu_client_id
DISCORD_CLIENT_SECRET=seu_client_secret
DISCORD_CALLBACK_URL=https://URL-DO-SITE-NO-RENDER.onrender.com/auth/discord/callback
SESSION_SECRET=uma-chave-grande-aleatoria
ADMIN_DISCORD_IDS=seu_id_discord
```

O SITE não é dono do banco. Ele chama a API interna do BOT.
