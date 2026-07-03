# Persistência do SITE Void Arena

O SITE não deve manter um banco próprio separado. Ele usa o BOT como banco central por meio de `server/storage.js`, que encaminha chamadas para a API interna do BOT.

## Dados que precisam carregar sempre

- usuário logado e perfil salvo;
- redes sociais/conexões;
- times criados pelo usuário;
- logo, jogadores, reservas e redes sociais do time;
- inscrições em eventos;
- eventos e configurações;
- pontuação, rankings e resultados validados.

## Contrato SITE -> BOT

O SITE deve usar estes dados pela API interna do BOT:

- `/internal/storage/readUsers`
- `/internal/storage/saveUser`
- `/internal/storage/readTeams`
- `/internal/storage/saveTeam`
- `/internal/storage/readEvents`
- `/internal/storage/saveTournamentEvent`
- `/internal/storage/createEventRegistrationRequest`
- `/internal/storage/approveEventRegistrationRequest`
- `/internal/storage/readBracket`
- `/internal/storage/writeBracket`

## Variáveis necessárias no Render do SITE

```env
BOT_API_URL=https://void-arena-bot.onrender.com
BOT_API_KEY=mesma_chave_do_bot
SESSION_SECRET=uma_chave_grande_e_fixa
```

A `SESSION_SECRET` deve permanecer igual entre deploys. Se ela for trocada, o usuário pode precisar logar novamente, mas os dados salvos no banco continuam preservados.

## Regra de atualização

Antes de uma nova versão do SITE ou BOT, o BOT mantém backup latest no GitHub. Se uma nova versão subir e o banco local vier vazio, o BOT restaura o latest automaticamente.

## Proibido

- salvar dados reais apenas em localStorage;
- depender de arquivo do SITE para usuário/time/evento;
- criar outro banco paralelo no SITE;
- fazer seed antigo sobrescrever banco real;
- editar `GITHUB_BACKUP_BASELINE_PATH` fixo sem necessidade.
