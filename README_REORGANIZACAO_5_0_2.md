# Void Arena SITE 5.0.2 — Conexão Chaveamento/Resultados

Nesta etapa:

- A página nova de Chaveamento usa o modelo visual premium e sincroniza HUBs pelo BOT.
- A página nova de Resultados ganhou botão de sincronização de HUBs.
- Adicionada rota `POST /api/result-hubs/sync`.
- O menu modular deixa de empurrar o usuário para o painel antigo por padrão.
- O painel completo antigo fica preservado em `/pages/painel-completo.html` apenas como fallback temporário.

Próximas etapas planejadas:

1. Migrar Eventos e Times com CRUD completo.
2. Migrar Chat/Scrims/Estatísticas.
3. Quebrar `public/js/dashboard.js` legado em módulos reais.
4. Remover o painel legado quando todos os módulos estiverem funcionais.
