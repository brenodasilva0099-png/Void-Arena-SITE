# Void Arena 5.0.1 - Integração dos módulos

Esta etapa mantém a estrutura organizada da 5.0 e começa a trazer as funções antigas para páginas próprias.

## Integrado nesta versão

- Chaveamento premium antigo integrado em `/pages/chaveamento.html`.
- Configuração rápida do torneio dentro da página de chaveamento.
- Geração de chaveamento sincronizando HUBs de resultados no BOT.
- Página de configurações com status do SITE/BOT e backups GitHub via BOT.
- Dashboard com KPIs e atalhos.
- Páginas de eventos, times e resultados com renderização mais completa.

## Rotas novas do SITE

- `GET /api/bot/internal-health`
- `GET /api/backups/github/latest`
- `POST /api/backups/github/export`
- `POST /api/backups/github/restore-latest`

As rotas usam a ponte `BOT_API_URL` + `BOT_API_KEY` e são protegidas por dono/admin.
