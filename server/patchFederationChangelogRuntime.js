const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const updatesFile = path.join(ROOT, 'public', 'pages', 'atualizacoes.html');
const RELEASE_ID = 'release-2026-07-14-frm-js-full-safe-v2';
let changed = false;

const RELEASE_CARD = String.raw`
          <article class="va-card va-update-card" id="release-2026-07-14-frm-js-full-safe-v2">
            <span class="va-update-dot"></span>
            <div class="va-update-meta"><span>14/07/2026 • 22:55 BRT</span><span>Site</span><span>FRM JS</span></div>
            <h3>Funções FRM restauradas em JS seguro</h3>
            <p class="va-muted">O JS do portal foi refeito sem quebrar o deploy e voltou a cobrir calendário, competições, clubes, convites, rankings, perfis, transferências e prancheta.</p>
            <ul class="va-update-list">
              <li class="site">Calendário marca a Nexus Cup 1ª Edição no dia 18/07/2026.</li>
              <li class="site">Clubes e atletas carregam dados reais, com links para perfis públicos.</li>
              <li class="site">Rankings exibem cadastrados e editor administrativo de pontos.</li>
              <li class="site">Prancheta 5v5 ganhou tokens padrão, botões de adicionar e arraste persistente.</li>
              <li class="fix">A correção usa JS seguro, sem template string aninhada que derruba o start do Render.</li>
            </ul>
          </article>
`;

function patchUpdatesPage() {
  if (!fs.existsSync(updatesFile)) return;
  let html = fs.readFileSync(updatesFile, 'utf8');
  const before = html;
  if (!html.includes(RELEASE_ID)) html = html.replace('<div class="va-timeline">', '<div class="va-timeline">' + RELEASE_CARD);
  [
    'Void Arena 5.1.3 • Atual',
    'Void Arena 5.1.3 • Atualizado em 13/07/2026 às 20:20 BRT',
    'Hollow Nexus FRM • Atualizado em 13/07/2026 às 23:28 BRT',
    'Hollow Nexus FRM • Atualizado em 13/07/2026 às 23:40 BRT',
    'Hollow Nexus FRM • Atualizado em 13/07/2026 às 23:58 BRT',
    'Hollow Nexus FRM • Atualizado em 14/07/2026 às 00:04 BRT',
    'Hollow Nexus FRM • Atualizado em 14/07/2026 às 00:14 BRT',
    'Hollow Nexus FRM • Atualizado em 14/07/2026 às 00:24 BRT',
    'Hollow Nexus FRM • Atualizado em 14/07/2026 às 12:58 BRT',
    'Hollow Nexus FRM • Atualizado em 14/07/2026 às 20:30 BRT',
    'Hollow Nexus FRM • Atualizado em 14/07/2026 às 20:56 BRT',
    'Hollow Nexus FRM • Atualizado em 14/07/2026 às 21:37 BRT'
  ].forEach((text) => {
    html = html.replace('<span class="va-version-pill">' + text + '</span>', '<span class="va-version-pill">Hollow Nexus FRM • Atualizado em 14/07/2026 às 22:55 BRT</span>');
  });
  [
    'Navegação global, assets blindados, tickets de suporte e dados preservados.',
    'Portal Hollow Nexus FRM integrado com dados vivos preservados.',
    'Portal Hollow Nexus FRM isolado, limpo e pronto para migração gradual.',
    'Dashboard Hollow Nexus FRM recriada pela referência visual.',
    'Site migrado para o shell global Hollow Nexus FRM.',
    'Botões funcionais no shell Hollow Nexus FRM.',
    'Migração completa Hollow Nexus FRM com páginas funcionais.',
    'Polimento FRM com eventos, calendário, rankings e convites.',
    'Revisão No Mock do Hollow Nexus FRM.',
    'Dados reais ligados no Hollow Nexus FRM.',
    'Final fixes do Hollow Nexus FRM aplicados.'
  ].forEach((text) => {
    html = html.replace('<h2 class="va-update-title">' + text + '</h2>', '<h2 class="va-update-title">Funções FRM restauradas com JS seguro.</h2>');
  });
  ['tickets/histórico','portal FRM','dashboard FRM','shell FRM','botões FRM','FRM completo','FRM polish','No Mock','dados reais','final fixes'].forEach((label) => {
    html = html.replace('<span><strong>Site</strong><b>' + label + '</b></span>', '<span><strong>Site</strong><b>FRM JS seguro</b></span>');
  });
  if (html !== before) { fs.writeFileSync(updatesFile, html, 'utf8'); changed = true; }
}

patchUpdatesPage();
try { require('./patchFederationRouteRegistrationRuntime'); } catch (error) { console.error('[Federacao] Falha ao registrar rotas FRM:', error.message); }
try { require('./patchFederationFixRouteRegistrationRuntime'); } catch (error) { console.error('[Federacao] Falha ao registrar rotas finais FRM:', error.message); }
try { require('./patchFederationButtonsRuntime'); } catch (error) { console.error('[Federacao] Falha ao aplicar patch de botoes FRM:', error.message); }
try { require('./patchRecruitmentDeclineDmRuntime'); } catch (error) { console.error('[Federacao] Falha na DM de recusa:', error.message); }
try { require('./patchFederationPolishCssRuntime'); } catch (error) { console.error('[Federacao] Falha no CSS polish:', error.message); }
try { require('./patchFederationPolishJsRuntime'); } catch (error) { console.error('[Federacao] Falha no JS polish:', error.message); }
try { require('./patchFederationPolishPagesRuntime'); } catch (error) { console.error('[Federacao] Falha nas paginas polish:', error.message); }
try { require('./patchFederationNoMockRuntime'); } catch (error) { console.error('[Federacao] Falha no No Mock:', error.message); }
try { require('./patchFederationRealDataRuntime'); } catch (error) { console.error('[Federacao] Falha nos dados reais FRM:', error.message); }
try { require('./patchFederationFinalFixesRuntime'); } catch (error) { console.error('[Federacao] Falha nos final fixes FRM:', error.message); }
try { require('./patchFederationFinalJsRuntime'); } catch (error) { console.error('[Federacao] Falha no JS final FRM:', error.message); }
console.log(changed ? '[Atualizacoes] FRM JS seguro registrado.' : '[Atualizacoes] FRM JS seguro ja estava registrado.');
