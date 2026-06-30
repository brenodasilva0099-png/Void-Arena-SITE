# Void Arena SITE 5.1 — Consolidação total

Esta versão consolida a estrutura nova e reduz a dependência do painel antigo.

## Principais pontos

- Perfil do usuário voltou para a estrutura nova: clique no chip "Logado como" para editar o perfil.
- Ícone/nome do servidor são carregados em todas as páginas via `/api/brand/server`.
- Chaveamento adaptativo para 4, 8, 12, 16, 20, 24, 28 e 32 times.
- Para 4 times, os confrontos ficam balanceados em lados opostos e avançam direto para a final.
- Para 8 times, os vencedores avançam para semifinais.
- Para 20/24/28/32, a estrutura cria rodada inicial + oitavas internas.
- Resultados agora mostram histórico de jogos, prints, status, série e avanço.
- Times agora abrem perfil público com capitão e elenco detalhado.
- Rotas principais foram assumidas por `server/routes/organized.routes.js`.
- Backups continuam centralizados pelo BOT.

## Testes locais

```powershell
npm.cmd run check
npm.cmd start
```
