# Void Arena SITE v4.8 — separado do bot

Este ZIP contém apenas o site/API do Void Arena.

## O que pertence ao SITE

- `public/` — HTML, CSS, JS e assets visuais.
- `site/index.js` — inicializador do site/API.
- `server/app.js` — rotas HTTP, autenticação, painel, eventos, times, rankings, chat e integração com o bot via API interna.
- `server/storage.js` — acesso ao banco JSON compartilhado.
- `data/` — seed/base local do banco.

## Como o SITE conversa com o BOT

O site chama o bot por HTTP usando:

```env
BOT_API_URL=http://localhost:3002
```

O bot precisa estar rodando em outro terminal/processo com `BOT_API_PORT=3002`.

## Banco compartilhado

Use o mesmo `DATA_DIR` no site e no bot:

```env
DATA_DIR=../VoidArena_SHARED_DB
```

Assim os dois usam o mesmo banco JSON local.

## Rodar local em Bash

```bash
cd "$HOME/Downloads/Void_Arena_SITE_v4.8" && npm install && DATA_DIR="$HOME/Downloads/VoidArena_SHARED_DB" BOT_API_URL="http://localhost:3002" PORT=3001 DISCORD_CALLBACK_URL="http://localhost:3001/auth/discord/callback" npm start
```

Abra:

```txt
http://localhost:3001
```

## Render

Se SITE e BOT forem serviços separados no Render, o banco JSON com disco local NÃO será compartilhado entre serviços. Para produção 100% separada, use banco externo real ou mantenha os dois runtimes no mesmo serviço combinado.
