const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const updatesFile = path.join(ROOT, 'public', 'pages', 'atualizacoes.html');
const FEDERATION_PORTAL_ID = 'release-2026-07-14-hollow-nexus-frm-global-v4';
const FEDERATION_BUTTONS_ID = 'release-2026-07-14-frm-buttons-links-v1';
const FEDERATION_COMPLETE_ID = 'release-2026-07-14-frm-complete-v1';
const FEDERATION_POLISH_ID = 'release-2026-07-14-frm-polish-v2';
const FEDERATION_NO_MOCK_ID = 'release-2026-07-14-frm-no-mock-v1';
let changed = false;

const FEDERATION_PORTAL_CARD = String.raw`
          <article class="va-card va-update-card" id="release-2026-07-14-hollow-nexus-frm-global-v4"><span class="va-update-dot"></span><div class="va-update-meta"><span>14/07/2026 • 00:04 BRT</span><span>Site</span><span>Federação</span></div><h3>Site migrado para o shell global Hollow Nexus FRM</h3><p class="va-muted">A dashboard segue a referência visual e as páginas antigas passam a abrir dentro da nova estrutura da federação.</p></article>
`;
const FEDERATION_BUTTONS_CARD = String.raw`
          <article class="va-card va-update-card" id="release-2026-07-14-frm-buttons-links-v1"><span class="va-update-dot"></span><div class="va-update-meta"><span>14/07/2026 • 00:14 BRT</span><span>Site</span><span>Navegação</span></div><h3>Botões do portal FRM normalizados e versão antiga bloqueada</h3><p class="va-muted">A navegação foi endurecida para manter todos os botões apontando para páginas funcionais dentro do visual Hollow Nexus FRM.</p></article>
`;
const FEDERATION_COMPLETE_CARD = String.raw`
          <article class="va-card va-update-card" id="release-2026-07-14-frm-complete-v1"><span class="va-update-dot"></span><div class="va-update-meta"><span>14/07/2026 • 00:24 BRT</span><span>Site</span><span>Federação completa</span></div><h3>Migração completa das áreas FRM sem páginas vazias</h3><p class="va-muted">As áreas novas foram transformadas em páginas próprias, funcionais e proporcionais, evitando remendos do site antigo.</p></article>
`;
const FEDERATION_POLISH_CARD = String.raw`
          <article class="va-card va-update-card" id="release-2026-07-14-frm-polish-v2"><span class="va-update-dot"></span><div class="va-update-meta"><span>14/07/2026 • 12:58 BRT</span><span>Site</span><span>Polimento FRM</span></div><h3>Eventos, calendário, rankings e convites ajustados para a estrutura FRM</h3><p class="va-muted">Separação de competições/eventos, dados reais no início, calendário mensal e convite por Correio foram preparados para acabar com páginas remendadas.</p></article>
`;
const FEDERATION_NO_MOCK_CARD = String.raw`
          <article class="va-card va-update-card" id="release-2026-07-14-frm-no-mock-v1">
            <span class="va-update-dot"></span>
            <div class="va-update-meta"><span>14/07/2026 • 20:30 BRT</span><span>Site</span><span>No Mock</span></div>
            <h3>Revisão No Mock e resposta de convites por DM</h3>
            <p class="va-muted">Cards falsos e placeholders foram removidos do fluxo principal: o site mostra dados reais ou estado vazio honesto.</p>
            <ul class="va-update-list">
              <li class="site">Dashboard, competições, calendário e notícias passam por uma camada final sem mock.</li>
              <li class="site">Entrar / Painel vira avatar circular quando existe sessão válida.</li>
              <li class="site">Convites de clube enviados ao Discord levam links seguros de aceitar ou recusar.</li>
              <li class="fix">Links antigos como /, /index.html, times, jogadores e recrutamento são reescritos para a estrutura FRM.</li>
            </ul>
          </article>
`;

function patchUpdatesPage() {
  if (!fs.existsSync(updatesFile)) return;
  let html = fs.readFileSync(updatesFile, 'utf8');
  const before = html;
  if (!html.includes(FEDERATION_NO_MOCK_ID)) html = html.replace('<div class="va-timeline">', '<div class="va-timeline">' + FEDERATION_NO_MOCK_CARD);
  if (!html.includes(FEDERATION_POLISH_ID)) html = html.replace('<div class="va-timeline">', '<div class="va-timeline">' + FEDERATION_POLISH_CARD);
  if (!html.includes(FEDERATION_COMPLETE_ID)) html = html.replace('<div class="va-timeline">', '<div class="va-timeline">' + FEDERATION_COMPLETE_CARD);
  if (!html.includes(FEDERATION_BUTTONS_ID)) html = html.replace('<div class="va-timeline">', '<div class="va-timeline">' + FEDERATION_BUTTONS_CARD);
  if (!html.includes(FEDERATION_PORTAL_ID)) html = html.replace('<div class="va-timeline">', '<div class="va-timeline">' + FEDERATION_PORTAL_CARD);
  ['Void Arena 5.1.3 • Atual','Void Arena 5.1.3 • Atualizado em 13/07/2026 às 20:20 BRT','Hollow Nexus FRM • Atualizado em 13/07/2026 às 23:28 BRT','Hollow Nexus FRM • Atualizado em 13/07/2026 às 23:40 BRT','Hollow Nexus FRM • Atualizado em 13/07/2026 às 23:58 BRT','Hollow Nexus FRM • Atualizado em 14/07/2026 às 00:04 BRT','Hollow Nexus FRM • Atualizado em 14/07/2026 às 00:14 BRT','Hollow Nexus FRM • Atualizado em 14/07/2026 às 00:24 BRT','Hollow Nexus FRM • Atualizado em 14/07/2026 às 12:58 BRT'].forEach((text) => { html = html.replace('<span class="va-version-pill">' + text + '</span>','<span class="va-version-pill">Hollow Nexus FRM • Atualizado em 14/07/2026 às 20:30 BRT</span>'); });
  ['Navegação global, assets blindados, tickets de suporte e dados preservados.','Portal Hollow Nexus FRM integrado com dados vivos preservados.','Portal Hollow Nexus FRM isolado, limpo e pronto para migração gradual.','Dashboard Hollow Nexus FRM recriada pela referência visual.','Site migrado para o shell global Hollow Nexus FRM.','Botões funcionais no shell Hollow Nexus FRM.','Migração completa Hollow Nexus FRM com páginas funcionais.','Polimento FRM com eventos, calendário, rankings e convites.'].forEach((text) => { html = html.replace('<h2 class="va-update-title">' + text + '</h2>','<h2 class="va-update-title">Revisão No Mock do Hollow Nexus FRM.</h2>'); });
  ['tickets/histórico','portal FRM','dashboard FRM','shell FRM','botões FRM','FRM completo','FRM polish'].forEach((label) => { html = html.replace('<span><strong>Site</strong><b>' + label + '</b></span>', '<span><strong>Site</strong><b>No Mock</b></span>'); });
  if (html !== before) { fs.writeFileSync(updatesFile, html, 'utf8'); changed = true; }
}

patchUpdatesPage();
try { require('./patchFederationRouteRegistrationRuntime'); } catch (error) { console.error('[Federacao] Falha ao registrar rotas FRM:', error.message); }
try { require('./patchFederationButtonsRuntime'); } catch (error) { console.error('[Federacao] Falha ao aplicar patch de botoes FRM:', error.message); }
try { require('./patchRecruitmentDeclineDmRuntime'); } catch (error) { console.error('[Federacao] Falha na DM de recusa:', error.message); }
try { require('./patchFederationPolishCssRuntime'); } catch (error) { console.error('[Federacao] Falha no CSS polish:', error.message); }
try { require('./patchFederationPolishJsRuntime'); } catch (error) { console.error('[Federacao] Falha no JS polish:', error.message); }
try { require('./patchFederationPolishPagesRuntime'); } catch (error) { console.error('[Federacao] Falha nas paginas polish:', error.message); }
try { require('./patchFederationNoMockRuntime'); } catch (error) { console.error('[Federacao] Falha no No Mock:', error.message); }
console.log(changed ? '[Atualizacoes] Revisao No Mock registrada.' : '[Atualizacoes] Revisao No Mock ja estava registrada.');
