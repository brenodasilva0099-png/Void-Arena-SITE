# Void Arena SITE v4.9 — Opção 2

Nesta versão o SITE fica separado do BOT, mas não guarda o banco principal localmente.
O SITE acessa todos os dados compartilhados pela API interna do BOT.

## Variáveis principais

```env
PORT=3001
BOT_API_URL=http://localhost:3002
BOT_API_KEY=use-a-mesma-chave-do-bot
DISCORD_CALLBACK_URL=http://localhost:3001/auth/discord/callback
```

## Rodar local

```bash
npm install
PORT=3001 BOT_API_URL="http://localhost:3002" BOT_API_KEY="sua-chave" DISCORD_CALLBACK_URL="http://localhost:3001/auth/discord/callback" npm start
```

O BOT precisa estar rodando antes ou as rotas de banco do site vão retornar erro.
