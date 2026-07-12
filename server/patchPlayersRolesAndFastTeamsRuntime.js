const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const recruitmentFile = path.join(ROOT, 'public/js/pages/recruitment.js');
const teamsFile = path.join(ROOT, 'public/js/pages/times.js');
let changed = false;

function patchRecruitment() {
  if (!fs.existsSync(recruitmentFile)) return;
  let src = fs.readFileSync(recruitmentFile, 'utf8');
  const before = src;

  if (!src.includes('async function loadPlayerRoles()')) {
    const helpers = `
  function discordIdsForRoles() { return Array.from(new Set((directory.players || []).map((p) => String(p.discordId || '').trim()).filter((id) => /^\\d{16,22}$/.test(id)))); }
  function rolesCell(player = {}) { return '<div class="va-public-role-strip va-directory-role-strip">' + rolesHtml(player.roles) + '</div>'; }
  async function loadPlayerRoles() {
    const ids = discordIdsForRoles();
    if (!ids.length) return;
    const data = await VoidArena.request('/api/discord/member-roles/batch', {
      method: 'POST',
      timeoutMs: 16000,
      body: JSON.stringify({ discordIds: ids })
    });
    const byId = data.rolesByDiscordId || {};
    directory.players = (directory.players || []).map((player) => {
      const id = String(player.discordId || '').trim();
      return id && Array.isArray(byId[id]) ? { ...player, roles: byId[id] } : player;
    });
    renderDirectory();
  }
`;
    src = src.replace('  function renderDirectory() {', helpers + '\n  function renderDirectory() {');
  }

  src = src.replace('<th>Posição/região</th><th>Ação</th>', '<th>Posição/região</th><th>Cargos Discord</th><th>Ação</th>');
  src = src.replace('<td colspan="5">Nenhum jogador encontrado ainda.</td>', '<td colspan="6">Nenhum jogador encontrado ainda.</td>');
  src = src.replace('</td><td>${esc(playerMeta(p))}</td><td>${actionButtons(p)}</td></tr>', '</td><td>${esc(playerMeta(p))}</td><td>${rolesCell(p)}</td><td>${actionButtons(p)}</td></tr>');

  const oldLoad = "async function loadDirectory() { setStatus(directoryStatus, 'Carregando banco de jogadores...'); directory = await VoidArena.request('/api/players/directory', { timeoutMs: 20000 }); const pending = consumePendingRecruitment(); if (pending && typeSelect) { directory.selectedPlayer = pending; typeSelect.value = 'recruitment'; setStatus(recruitmentStatus, `Jogador selecionado para recrutamento: ${pending.name}`, 'ok'); } fillTeamSelect(); renderSelectedPlayer(); renderDirectory(); }";
  const newLoad = "async function loadDirectory() { setStatus(directoryStatus, 'Carregando banco de jogadores...'); directory = await VoidArena.request('/api/players/directory', { timeoutMs: 20000 }); const pending = consumePendingRecruitment(); if (pending && typeSelect) { directory.selectedPlayer = pending; typeSelect.value = 'recruitment'; setStatus(recruitmentStatus, `Jogador selecionado para recrutamento: ${pending.name}`, 'ok'); } fillTeamSelect(); renderSelectedPlayer(); renderDirectory(); loadPlayerRoles().catch(() => {}); }";
  src = src.replace(oldLoad, newLoad);

  if (src !== before) {
    fs.writeFileSync(recruitmentFile, src, 'utf8');
    changed = true;
  }
}

function patchTeams() {
  if (!fs.existsSync(teamsFile)) return;
  let src = fs.readFileSync(teamsFile, 'utf8');
  const before = src;
  const oldBoot = "try { await VoidArena.bootLayout('times'); await loadDirectory(); resetRoster(); updateLogoPreview(); await refreshTeams(); }";
  const newBoot = "try { await VoidArena.bootLayout('times'); resetRoster(); updateLogoPreview(); await refreshTeams(); loadDirectory().then(() => { upgradeRosterSelects(); updateLeadershipOptions(); }).catch(() => {}); }";
  src = src.replace(oldBoot, newBoot);
  if (src !== before) {
    fs.writeFileSync(teamsFile, src, 'utf8');
    changed = true;
  }
}

patchRecruitment();
patchTeams();
console.log(changed ? 'Patch aplicado: cargos dos jogadores e Times mais rapido.' : 'Patch ignorado: cargos/Times ja ajustados.');
