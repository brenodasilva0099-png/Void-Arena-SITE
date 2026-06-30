# Void Arena SITE 5.0 — Reorganização Base

Esta versão não tenta adicionar sistema novo. O objetivo é organizar a base para parar de quebrar partes aleatórias do site.

## O que mudou

- `dashboard.html` virou uma tela inicial limpa.
- O painel gigante antigo foi preservado em `public/pages/painel-completo.html`.
- Áreas principais agora têm páginas próprias:
  - `chaveamento.html`
  - `resultados.html`
  - `eventos.html`
  - `times.html`
  - `rankings.html`
  - `chat.html`
  - `scrims.html`
  - `estatisticas.html`
  - `analise-partidas.html`
  - `configuracoes.html`
  - `termos.html`
- Core frontend novo em `public/js/core/api.js`.
- Rotas críticas reorganizadas em `server/routes/organized.routes.js`.
- Serviços novos em `server/services/`.
- O topo usa `Hollow Nexus`/ícone do servidor por `/api/brand/server` e `/api/bot`.
- Dono/admin tem fallback para Discord ID `1235713276277559326`.

## Importante

O `server/app.js` legado ainda existe porque ele tem muitas rotas antigas. A etapa 5.0 apenas estabiliza e começa a separação. As próximas etapas podem mover cada rota para arquivos menores sem misturar tudo novamente.
