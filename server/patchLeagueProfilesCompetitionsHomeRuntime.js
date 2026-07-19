const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PAGES = path.join(ROOT, 'public', 'pages');
const VERSION_FILE = path.join(ROOT, 'public', 'league-home-competition-profile.json');
const UPDATES_FILE = path.join(PAGES, 'atualizacoes.html');
const BUILD = '2026-07-19-profile-competition-home-v1';
let changed = false;

function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (read(file) !== content) {
    fs.writeFileSync(file, content, 'utf8');
    changed = true;
  }
}
function injectHead(html, content, marker) {
  if (!html || html.includes(marker)) return html;
  return html.includes('</head>') ? html.replace('</head>', `${content}\n</head>`) : `${content}\n${html}`;
}
function injectBody(html, content, marker) {
  if (!html || html.includes(marker)) return html;
  return html.includes('</body>') ? html.replace('</body>', `${content}\n</body>`) : `${html}\n${content}`;
}

const sharedStyle = `<style id="hnl-home-competition-profile-v1">
.hnl-section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:14px}.hnl-section-heading h2,.hnl-section-heading h3{margin:6px 0 4px}.hnl-section-heading p{margin:0;color:var(--hnl-muted,#bcc5d8)}
.hnl-registration-roster,.hnl-registration-detail{margin-top:18px}.hnl-registered-clubs{display:grid;gap:9px}.hnl-registered-club{display:grid;grid-template-columns:32px 48px minmax(0,1fr) auto auto;gap:10px;align-items:center;padding:10px 12px;border:1px solid rgba(159,104,255,.22);border-radius:13px;background:rgba(255,255,255,.025)}.hnl-registered-club img{width:48px;height:48px;border-radius:13px;object-fit:cover;background:#080b14;border:1px solid rgba(159,104,255,.28)}.hnl-registered-club a{color:#fff;text-decoration:none}.hnl-registered-club a:hover{color:#d7baff}.hnl-registered-club small{display:block;color:#abb7ce;margin-top:3px}.hnl-registration-position{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:rgba(155,92,246,.16);font-weight:900}.hnl-btn.mini{min-height:32px;padding:0 10px;font-size:12px}
.hnl-competition-expanded{display:grid;gap:4px}.hnl-registration-empty{padding:15px!important}.hnl-registration-detail{margin-top:14px!important}
.hnl-home-feature-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(290px,.55fr);gap:14px;margin-top:14px}.hnl-home-next{min-height:300px;display:grid;grid-template-columns:minmax(0,1fr) 150px;align-items:center;gap:18px;background:radial-gradient(circle at 88% 32%,rgba(176,92,255,.35),transparent 30%),linear-gradient(130deg,rgba(20,29,47,.98),rgba(40,26,70,.96))!important}.hnl-home-next-copy h2{font-size:clamp(28px,3vw,44px);margin:12px 0 8px}.hnl-home-next-copy>p{max-width:760px}.hnl-home-next-mark{width:128px;height:128px;border-radius:30px;display:grid;place-items:center;font-size:68px;background:rgba(155,92,246,.18);border:1px solid rgba(183,128,255,.45)}.hnl-home-next-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:18px 0}.hnl-home-next-meta span{padding:12px;border-radius:12px;background:rgba(5,9,20,.36);border:1px solid rgba(255,255,255,.07)}.hnl-home-next-meta small,.hnl-home-next-meta b{display:block}.hnl-home-next-meta small{color:#aeb8ce;text-transform:uppercase;font-size:10px;letter-spacing:.08em;margin-bottom:4px}.hnl-home-quick{display:grid;gap:10px;align-content:start}.hnl-home-quick a{display:grid;grid-template-columns:42px minmax(0,1fr) auto;align-items:center;gap:11px;padding:13px;border:1px solid rgba(159,104,255,.22);border-radius:13px;background:rgba(255,255,255,.025);text-decoration:none;color:#fff}.hnl-home-quick a:hover{background:rgba(155,92,246,.10);border-color:rgba(183,128,255,.5)}.hnl-home-quick i{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:rgba(155,92,246,.16);font-style:normal;font-size:20px}.hnl-home-quick small{display:block;color:#abb7ce;margin-top:3px}
.hnl-home-community-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:14px}.hnl-home-list{display:grid;gap:9px}.hnl-home-mini-card{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:11px;align-items:center;padding:10px 12px;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:rgba(255,255,255,.025);text-decoration:none;color:#fff}.hnl-home-mini-card:hover{border-color:rgba(159,104,255,.42);background:rgba(155,92,246,.07)}.hnl-home-mini-card img{width:48px;height:48px;border-radius:13px;object-fit:cover;background:#080b14}.hnl-home-mini-card img.round{border-radius:999px}.hnl-home-mini-card small{display:block;color:#abb7ce;margin-top:3px}.hnl-home-mini-card>b{font-size:20px;color:#cba9ff}.hnl-home-guide{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}.hnl-home-guide article{position:relative;overflow:hidden}.hnl-home-guide-number{font-size:54px;line-height:1;color:rgba(181,126,255,.24);font-weight:1000}.hnl-home-guide h3{margin:8px 0}.hnl-home-pulse{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.hnl-home-pulse-item{padding:16px;border-radius:13px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.08)}.hnl-home-pulse-item strong{display:block;font-size:30px}.hnl-home-pulse-item span{color:#abb7ce}
@media(max-width:1000px){.hnl-home-feature-grid,.hnl-home-community-grid{grid-template-columns:1fr}.hnl-home-next{grid-template-columns:1fr}.hnl-home-next-mark{display:none}.hnl-home-guide,.hnl-home-pulse{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:700px){.hnl-registered-club{grid-template-columns:28px 44px minmax(0,1fr)}.hnl-registered-club>.hnl-chip,.hnl-registered-club>button{grid-column:3}.hnl-home-next-meta,.hnl-home-guide,.hnl-home-pulse{grid-template-columns:1fr}}
</style>`;

const profileStyle = `<style id="hnl-profile-critical-v3">
.hnl-profile-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px;margin-bottom:14px;border:1px solid rgba(159,104,255,.25);border-radius:16px;background:linear-gradient(180deg,rgba(20,29,47,.96),rgba(15,22,38,.96))}.hnl-profile-toolbar h2{margin:0 0 5px}.hnl-profile-toolbar p{margin:0;color:#b8c2d7}
.hnl-profile-settings-layout{display:grid;grid-template-columns:minmax(380px,.82fr) minmax(540px,1.35fr);gap:16px;align-items:start}.hnl-profile-settings-layout>.va-card{min-width:0;margin:0}.va-profile-preview-card{overflow:hidden}.va-profile-banner-preview{height:150px;border-radius:16px;background:radial-gradient(circle at 75% 25%,rgba(155,92,246,.38),transparent 35%),linear-gradient(135deg,#111a30,#2a1c48);background-size:cover;background-position:center}.va-profile-page-avatar{width:104px;height:104px;margin:-52px auto 12px;border-radius:999px;display:grid;place-items:center;overflow:hidden;background:#090d18;border:5px solid #121a2a;font-size:34px;font-weight:900}.va-profile-page-avatar img{width:100%;height:100%;object-fit:cover}.va-profile-preview-card>h2,.va-profile-preview-card>p{text-align:center}.va-checklist{display:flex;justify-content:center;flex-wrap:wrap;gap:7px;margin:12px 0}.va-checklist span{padding:6px 9px;border-radius:999px;background:rgba(155,92,246,.12);border:1px solid rgba(155,92,246,.25);font-size:11px;font-weight:800}.va-current-team-card{margin-top:16px;padding:15px;border-radius:15px;background:linear-gradient(135deg,rgba(34,211,238,.15),rgba(139,92,246,.10));border:1px solid rgba(34,211,238,.22)}.va-current-team-row{display:flex;align-items:center;gap:13px}.va-current-team-logo{width:58px;height:58px;border-radius:13px;display:grid;place-items:center;overflow:hidden;background:#080b14;border:1px solid rgba(159,104,255,.28)}.va-current-team-logo img{width:100%;height:100%;object-fit:cover}.va-team-tag{display:inline-flex;padding:4px 8px;border-radius:999px;background:rgba(155,92,246,.16);font-size:11px;font-weight:900}.va-social-card-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px!important}.va-social-card{display:flex!important;align-items:center;gap:10px;min-width:0;padding:11px!important;border-radius:13px!important;border:1px solid rgba(255,255,255,.09)!important;background:rgba(255,255,255,.025)!important;color:#fff!important;text-decoration:none!important}.va-social-card-icon{width:34px;height:34px;flex:0 0 34px;border-radius:10px;display:grid;place-items:center;overflow:hidden;background:rgba(255,255,255,.07)}.va-social-logo-img{width:100%;height:100%;object-fit:contain}.va-social-card-body{min-width:0;display:grid}.va-social-card-body small{overflow:hidden;text-overflow:ellipsis;color:#b9c2d4}.va-social-card-arrow{margin-left:auto}.va-role-list{display:flex;flex-wrap:wrap;gap:6px}.va-role-chip{display:inline-flex;padding:5px 9px;border-radius:999px;background:rgba(88,101,242,.25);border:1px solid rgba(159,104,255,.28);font-size:11px;font-weight:800}.va-player-stat-card{margin-top:18px;padding:16px;border:1px solid rgba(159,104,255,.24);border-radius:15px;background:rgba(7,12,24,.42)}.va-player-stat-card h3{margin:0 0 12px}.va-stat-section{padding-top:13px;margin-top:13px;border-top:1px solid rgba(255,255,255,.07)}.va-stat-title{font-size:11px;font-weight:900;letter-spacing:.07em;text-transform:uppercase;color:#cbb2ff}.va-stat-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:9px!important;margin-top:9px}.va-stat-item{min-width:0;padding:10px;border-radius:11px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)}.va-stat-item strong,.va-stat-item span{display:block!important;white-space:normal!important}.va-stat-item strong{font-size:20px;line-height:1.1;margin-bottom:4px}.va-stat-item span{font-size:11px;color:#aeb9ce}.va-stat-item.gold strong{color:#f7cf5c}.va-profile-page-card .va-form-grid.two{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important}.va-profile-page-card label{display:grid;gap:6px;min-width:0;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;color:#cbd3e5}.va-profile-page-card label.wide{grid-column:1/-1}.va-profile-page-card input,.va-profile-page-card select,.va-profile-page-card textarea{width:100%;min-width:0;box-sizing:border-box;background:#0c1324;color:#fff;border:1px solid rgba(159,104,255,.28);border-radius:10px;padding:11px 12px;text-transform:none;font-weight:600;letter-spacing:0}.va-profile-page-card textarea{min-height:110px;resize:vertical}.va-profile-page-card select option{background:#11182a;color:#fff}.va-profile-page-card .va-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.va-profile-page-card .va-status{margin-top:12px}
@media(max-width:1050px){.hnl-profile-settings-layout{grid-template-columns:1fr}.va-profile-preview-card{order:2}.va-profile-page-card{order:1}}
@media(max-width:680px){.hnl-profile-toolbar{align-items:flex-start;flex-direction:column}.va-profile-page-card .va-form-grid.two,.va-social-card-grid,.va-stat-grid{grid-template-columns:1fr!important}}
</style>`;

function patchProfile() {
  const file = path.join(PAGES, 'perfil.html');
  let html = read(file);
  if (!html) return;
  html = html
    .replace(/\s*<link[^>]+href="\/css\/profile-v2\.css(?:\?[^"']*)?"[^>]*>/gi, '')
    .replace(/\s*<link[^>]+href="\/css\/league-experience\.css(?:\?[^"']*)?"[^>]*>/gi, '');
  html = injectHead(html, profileStyle, 'hnl-profile-critical-v3');
  write(file, html);
}

function patchDashboard() {
  const file = path.join(PAGES, 'dashboard.html');
  let html = read(file);
  if (!html) return;
  if (!html.includes('id="homeNextCompetition"')) {
    const content = `<section class="hnl-home-feature-grid"><article class="hnl-card hnl-home-next" id="homeNextCompetition"><div class="hnl-empty">Carregando próxima competição...</div></article><article class="hnl-card"><div class="hnl-section-heading"><div><span class="hnl-section-kicker">Acesso rápido</span><h2>Central da Liga</h2></div></div><div class="hnl-home-quick"><a href="/pages/competicoes.html"><i>♕</i><span><strong>Competições</strong><small>Inscrições, detalhes e clubes confirmados</small></span><b>→</b></a><a href="/pages/chaveamento.html"><i>⌘</i><span><strong>Chaveamento</strong><small>Mata-mata, grupos e organização</small></span><b>→</b></a><a href="/pages/mercado.html"><i>✦</i><span><strong>Mercado</strong><small>Encontre jogadores e envie convites</small></span><b>→</b></a><a href="/pages/cafe-com-leite.html"><i>☕</i><span><strong>Café com Leite</strong><small>Partidas comunitárias e ranking individual</small></span><b>→</b></a></div></article></section><section class="hnl-home-community-grid"><article class="hnl-card"><div class="hnl-section-heading"><div><span class="hnl-section-kicker">Comunidade</span><h2>Clubes mais recentes</h2></div><a class="hnl-btn" href="/pages/clubes.html">Ver clubes</a></div><div class="hnl-home-list" id="homeRecentClubs"></div></article><article class="hnl-card"><div class="hnl-section-heading"><div><span class="hnl-section-kicker">Jogadores</span><h2>Novos perfis</h2></div><a class="hnl-btn" href="/pages/atletas.html">Ver jogadores</a></div><div class="hnl-home-list" id="homeRecentPlayers"></div></article></section><section class="hnl-card" style="margin-top:14px"><div class="hnl-section-heading"><div><span class="hnl-section-kicker">Temporada atual</span><h2>Movimento da plataforma</h2><p>Um resumo vivo da comunidade e do competitivo.</p></div></div><div class="hnl-home-pulse" id="homeSeasonPulse"></div></section><section class="hnl-home-guide"><article class="hnl-card"><span class="hnl-home-guide-number">01</span><h3>Crie ou fortaleça seu clube</h3><p>Monte o elenco, defina capitão e direção, publique conexões e convide jogadores.</p><a class="hnl-btn" href="/pages/cadastrar-clube.html">Cadastrar clube</a></article><article class="hnl-card"><span class="hnl-home-guide-number">02</span><h3>Entre nas competições</h3><p>Solicite a inscrição pelo Discord e acompanhe os clubes já validados em cada evento.</p><a class="hnl-btn" href="/pages/competicoes.html">Abrir competições</a></article><article class="hnl-card"><span class="hnl-home-guide-number">03</span><h3>Jogue, registre e evolua</h3><p>Resultados alimentam rankings, histórico, estatísticas e a evolução da temporada.</p><a class="hnl-btn" href="/pages/resultados.html">Ver resultados</a></article></section>`;
    html = html.replace(/(<footer class="frm-footer">)/i, `${content}$1`);
  }
  html = injectHead(html, sharedStyle, 'hnl-home-competition-profile-v1');
  html = injectBody(html, `<script id="hnl-home-competition-upgrade" src="/js/core/league-home-competitions-upgrade.js?v=${BUILD}"></script>`, 'hnl-home-competition-upgrade');
  write(file, html);
}

function patchCompetitionPage(name) {
  const file = path.join(PAGES, name);
  let html = read(file);
  if (!html) return;
  html = injectHead(html, sharedStyle, 'hnl-home-competition-profile-v1');
  html = injectBody(html, `<script id="hnl-home-competition-upgrade" src="/js/core/league-home-competitions-upgrade.js?v=${BUILD}"></script>`, 'hnl-home-competition-upgrade');
  write(file, html);
}

function patchUpdates() {
  let html = read(UPDATES_FILE);
  if (!html || html.includes('release-2026-07-19-profile-competition-home')) return;
  const card = `<article class="va-card va-update-card" id="release-2026-07-19-profile-competition-home"><span class="va-update-dot"></span><div class="va-update-meta"><span>19/07/2026 • 15:18 BRT</span><span>Site</span><span>Perfis/Competições/Início</span></div><h3>Perfis reorganizados, clubes validados visíveis e início ampliado</h3><p class="va-muted">A área de perfil recebeu estilos críticos internos, as competições passaram a exibir os clubes confirmados e administradores ganharam controle de remoção da inscrição. A página inicial agora reúne competição em destaque, atalhos, novos clubes, jogadores e dados da temporada.</p><ul class="va-update-list"><li class="fix">Perfil não depende mais dos dois estilos que estavam retornando HTML no navegador.</li><li class="site">Estatísticas, conexões e formulário do perfil voltaram a usar grids legíveis e responsivos.</li><li class="site">Cada competição lista os clubes já validados, com logo, tag e perfil público.</li><li class="admin">Somente administradores visualizam o botão para remover a inscrição de um clube.</li><li class="site">A home recebeu próxima competição, acessos rápidos, atividade da temporada, clubes e jogadores recentes.</li></ul></article>`;
  html = html.includes('<article class="va-card va-update-card"') ? html.replace('<article class="va-card va-update-card"', `${card}\n<article class="va-card va-update-card"`) : html.replace('</main>', `${card}\n</main>`);
  write(UPDATES_FILE, html);
}

patchProfile();
patchDashboard();
patchCompetitionPage('competicoes.html');
patchCompetitionPage('competicao.html');
patchUpdates();
write(VERSION_FILE, JSON.stringify({ build: BUILD, updatedAt: '2026-07-19T15:18:00-03:00', profile: 'inline-critical-style', competitions: 'validated-club-roster-admin-removal', dashboard: 'expanded-community-home' }, null, 2));
console.log(changed ? '[League/Profile+Competition+Home] Correções finais aplicadas.' : '[League/Profile+Competition+Home] Correções finais já estavam aplicadas.');
