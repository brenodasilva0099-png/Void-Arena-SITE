const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pagesDir = path.join(ROOT, 'public', 'pages');
const jsFile = path.join(ROOT, 'public', 'js', 'core', 'federation-real-data.js');
const BUILD = '2026-07-14-frm-real-data-v1';
const JS = '/js/core/federation-real-data.js?v=' + BUILD;
let changed = false;

function ensure(file) { fs.mkdirSync(path.dirname(file), { recursive: true }); }
function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function write(file, content) { ensure(file); if (read(file) !== content) { fs.writeFileSync(file, content, 'utf8'); changed = true; } }

const js = String.raw`
(function(){
  const LOGO = '/api/brand/icon?v=2026-07-14-frm-real-data-v1';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const fmt = (v) => { if (!v) return 'sem data definida'; const d = new Date(v); return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); };
  const nameOf = (u) => u?.profile?.username || u?.profile?.displayName || u?.name || u?.username || u?.discordId || 'Jogador';
  const teamName = (t) => t?.name || t?.teamName || t?.title || t?.tag || 'Clube';
  const logoOf = (t) => t?.logo || t?.logoUrl || t?.teamLogo || t?.badge || LOGO;
  const visible = (item) => !['deleted', 'hidden', 'archived'].includes(String(item?.status || '').toLowerCase()) && !item?.deletedAt && !item?.hiddenFromPlayersDirectory;
  async function api(url) {
    const res = await fetch(url, { credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) throw new Error(data.message || String(res.status));
    return data;
  }
  async function firstJson(urls) {
    let last = null;
    for (const url of urls) {
      try { return await api(url); } catch (error) { last = error; }
    }
    if (last) throw last;
    return {};
  }
  function empty(text) { return '<div class="frm-empty">' + esc(text) + '</div>'; }
  function playerListFromOverview(overview) {
    const teams = Array.isArray(overview?.teams) ? overview.teams : [];
    const users = Array.isArray(overview?.players) ? overview.players : [];
    const usersById = new Map(users.map((u) => [String(u.id || ''), u]));
    const usersByDiscord = new Map(users.map((u) => [String(u.discordId || ''), u]).filter(([id]) => id));
    const map = new Map();
    const add = (raw = {}) => {
      const id = String(raw.id || raw.userId || raw.discordId || raw.name || '').trim();
      if (!id) return;
      const key = String(raw.userId || raw.discordId || raw.id || raw.name || '').toLowerCase();
      if (!map.has(key)) map.set(key, raw);
      else map.set(key, { ...map.get(key), ...raw, teams: [...(map.get(key).teams || []), ...(raw.teams || [])] });
    };
    teams.forEach((team) => {
      const roster = [
        ...(Array.isArray(team.playerDetails) ? team.playerDetails : []),
        ...(Array.isArray(team.reserveDetails) ? team.reserveDetails : [])
      ];
      if (!roster.length) {
        (Array.isArray(team.players) ? team.players : []).forEach((name, index) => roster.push({ name, discordId: team.playerAccounts?.players?.[index] || '', type: 'player' }));
        (Array.isArray(team.reserves) ? team.reserves : []).forEach((name, index) => roster.push({ name, discordId: team.playerAccounts?.reserves?.[index] || '', type: 'reserve' }));
      }
      roster.forEach((entry) => {
        const user = usersById.get(String(entry.id || entry.userId || '')) || usersByDiscord.get(String(entry.discordId || entry.account || '')) || null;
        add({
          id: user?.id || entry.id || entry.userId || entry.discordId || entry.name || '',
          userId: user?.id || entry.userId || '',
          discordId: user?.discordId || entry.discordId || entry.account || '',
          name: user ? nameOf(user) : (entry.name || 'Jogador'),
          avatar: user?.avatar || entry.avatar || '',
          profile: user?.profile || entry.profile || {},
          statusLabel: 'Com clube',
          rosterRole: entry.type === 'reserve' ? 'Reserva' : 'Titular',
          teams: [{ id: team.id || '', name: teamName(team), tag: team.tag || '', logo: logoOf(team) }]
        });
      });
    });
    users.filter(visible).forEach((user) => add({
      id: user.id || user.discordId || nameOf(user),
      userId: user.id || '',
      discordId: user.discordId || '',
      name: nameOf(user),
      avatar: user.avatar || '',
      profile: user.profile || {},
      statusLabel: 'Sem clube',
      rosterRole: 'Livre',
      teams: []
    }));
    return Array.from(map.values()).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }
  async function loadPlayers() {
    const box = $('#playersList') || $('#marketPlayers');
    if (!box) return;
    let players = [];
    try {
      const data = await firstJson(['/api/players/directory', '/api/federation/overview']);
      players = Array.isArray(data.players) && data.players.length && data.players[0]?.directoryId !== undefined
        ? data.players
        : playerListFromOverview(data);
    } catch {
      players = [];
    }
    players = players.filter(visible);
    box.innerHTML = players.length ? players.map((p) => {
      const team = Array.isArray(p.teams) && p.teams.length ? p.teams[0] : null;
      const pos = p.primaryPosition || p.profile?.primaryPosition || p.rosterRole || 'Atleta';
      return '<article class="frm-card">'
        + '<div class="frm-list-row"><img class="frm-avatar" src="' + esc(p.avatar || LOGO) + '"><div><h3>' + esc(nameOf(p)) + '</h3><p>' + esc(team ? teamName(team) : 'Sem clube') + '</p><small>' + esc(p.discordId ? 'Discord vinculado' : 'Discord não vinculado') + '</small></div><span class="frm-pill">' + esc(pos) + '</span></div>'
        + '</article>';
    }).join('') : empty('Nenhum jogador registrado foi encontrado no banco real.');
  }
  async function loadClubs() {
    const box = $('#clubsList');
    if (!box) return;
    let teams = [];
    try {
      const data = await firstJson(['/api/teams', '/api/federation/overview']);
      teams = Array.isArray(data.teams) ? data.teams : [];
    } catch { teams = []; }
    teams = teams.filter(visible);
    box.innerHTML = teams.length ? teams.map((t) => {
      const count = (Array.isArray(t.playerDetails) && t.playerDetails.length ? t.playerDetails : (Array.isArray(t.players) ? t.players : [])).length;
      return '<article class="frm-card" data-team-id="' + esc(t.id || '') + '">'
        + '<div class="frm-list-row"><img class="frm-team-logo" src="' + esc(logoOf(t)) + '"><div><h3>' + esc(teamName(t)) + '</h3><p>' + esc(t.tag || 'Clube afiliado') + '</p></div><span class="frm-pill">' + count + '/5</span></div>'
        + '<p>Capitão: ' + esc(t.captainName || t.ownerName || 'não definido') + '</p>'
        + '<div class="frm-toolbar"><a class="frm-btn" href="/pages/elencos.html">Ver elenco</a>' + (t.canManage ? '<button class="frm-btn primary" data-invite="' + esc(t.id || '') + '">Convidar jogador</button>' : '') + '</div>'
        + '</article>';
    }).join('') : empty('Nenhum clube afiliado foi encontrado no banco real.');
  }
  async function loadCompetitions() {
    const box = $('#competitionsList');
    if (!box) return;
    let events = [];
    try {
      const data = await firstJson(['/api/events', '/api/federation/overview']);
      events = Array.isArray(data.events) ? data.events : [];
    } catch { events = []; }
    events = events.filter(visible);
    const nexusFirst = events.slice().sort((a, b) => (/nexus/i.test(String(b.name || b.title || '')) ? 1 : 0) - (/nexus/i.test(String(a.name || a.title || '')) ? 1 : 0));
    box.innerHTML = nexusFirst.length ? nexusFirst.map((e) => {
      const title = e.name || e.title || 'Competição';
      const registered = Number(e.registeredCount ?? (Array.isArray(e.registrations) ? e.registrations.length : 0)) || 0;
      const limit = Number(e.teamLimit || e.slots || 0) || 'em definição';
      return '<article class="frm-card">'
        + '<span class="frm-pill green">' + esc(e.status || 'cadastrada') + '</span>'
        + '<h2>' + esc(title) + '</h2>'
        + '<p>Formato ' + esc(e.matchFormat || e.format || 'em definição') + ' • Vagas ' + esc(registered) + '/' + esc(limit) + ' • Início ' + fmt(e.startAt || e.date) + '</p>'
        + (e.description ? '<p>' + esc(e.description) + '</p>' : '')
        + '<a class="frm-btn primary" href="/pages/eventos.html">Detalhes / inscrição</a>'
        + '</article>';
    }).join('') : empty('Nenhuma competição oficial foi encontrada no banco real.');
  }
  async function loadCalendarFromRealEvents() {
    const grid = $('#calendarGrid');
    if (!grid) return;
    let events = [];
    try { events = (await firstJson(['/api/events', '/api/federation/overview'])).events || []; } catch { events = []; }
    events = events.filter(visible);
    const names = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
    let html = names.map((x) => '<div class="frm-calendar-head">' + x + '</div>').join('');
    const july = [];
    events.forEach((e) => { const d = new Date(e.startAt || e.date || ''); if (!Number.isNaN(d.getTime()) && d.getFullYear() === 2026 && d.getMonth() === 6) july.push({ day: d.getDate(), label: e.name || e.title || 'Competição' }); });
    for (let i = 0; i < 3; i++) html += '<div class="frm-day out"></div>';
    for (let day = 1; day <= 31; day++) html += '<div class="frm-day"><strong>' + day + '</strong>' + july.filter((e) => e.day === day).map((e) => '<a class="frm-event-dot" href="/pages/competicoes.html">' + esc(e.label) + '</a>').join('') + '</div>';
    grid.innerHTML = html;
  }
  async function run() {
    await Promise.allSettled([loadPlayers(), loadClubs(), loadCompetitions(), loadCalendarFromRealEvents()]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(run, 400)); else setTimeout(run, 400);
})();
`;

function inject() {
  if (!fs.existsSync(pagesDir)) return;
  for (const entry of fs.readdirSync(pagesDir)) {
    if (!entry.endsWith('.html')) continue;
    const file = path.join(pagesDir, entry);
    let html = read(file);
    if (!html || html.includes('/js/core/federation-real-data.js')) continue;
    html = html.replace('</body>', `  <script src="${JS}"></script>\n</body>`);
    fs.writeFileSync(file, html, 'utf8');
    changed = true;
  }
}

write(jsFile, js);
inject();
console.log(changed ? '[Federacao] Dados reais de jogadores, clubes e competicoes aplicados.' : '[Federacao] Dados reais FRM ja estavam aplicados.');