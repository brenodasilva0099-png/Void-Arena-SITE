const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const configHtmlFile = path.join(ROOT, 'public/pages/configuracoes.html');
const configJsFile = path.join(ROOT, 'public/js/pages/configuracoes.js');
const cssFile = path.join(ROOT, 'public/css/organization.css');
let changed = false;

function patchHtml() {
  if (!fs.existsSync(configHtmlFile)) return;
  let html = fs.readFileSync(configHtmlFile, 'utf8');
  let local = false;

  if (!html.includes('id="roleNotifyRoleCards"')) {
    const oldRole = '<label>Cargos do Discord<select name="roleIds" id="roleNotifyRoles" multiple size="8"></select><small class="va-muted">Segure Ctrl para selecionar mais de um cargo.</small></label>';
    const newRole = [
      '<label>Cargos do Discord',
      '<select name="roleIds" id="roleNotifyRoles" multiple size="8" style="display:none"></select>',
      '<div class="va-role-picker">',
      '<div class="va-role-picker-head"><span>Selecionar cargos</span><small id="roleNotifyRoleCount">0 selecionado(s)</small></div>',
      '<input id="roleNotifyRoleSearch" class="va-player-picker-search" placeholder="Buscar cargo por nome ou servidor..." autocomplete="off" />',
      '<div id="roleNotifyRoleCards" class="va-role-picker-cards"><div class="va-role-card skeleton">Carregando cargos...</div></div>',
      '<small class="va-muted">Clique nos cards para marcar ou desmarcar vários cargos.</small>',
      '</div>',
      '</label>'
    ].join('');
    if (html.includes(oldRole)) {
      html = html.replace(oldRole, newRole);
      local = true;
    }
  }

  if (!html.includes('id="dmHistoryRefreshBtn"')) {
    html = html.replace('<button id="loadDmHistoryBtn" class="va-btn" type="button">Ver conversa</button>', '<button id="loadDmHistoryBtn" class="va-btn" type="button">Ver conversa</button><button id="dmHistoryRefreshBtn" class="va-btn" type="button">Atualizar</button>');
    local = true;
  }

  if (local) {
    fs.writeFileSync(configHtmlFile, html, 'utf8');
    changed = true;
  }
}

function patchJs() {
  if (!fs.existsSync(configJsFile)) return;
  let js = fs.readFileSync(configJsFile, 'utf8');
  let local = false;

  if (!js.includes('roleNotifyRoleCards')) {
    js = js.replace("  const roleNotifyRoles = document.getElementById('roleNotifyRoles');", [
      "  const roleNotifyRoles = document.getElementById('roleNotifyRoles');",
      "  const roleNotifyRoleSearch = document.getElementById('roleNotifyRoleSearch');",
      "  const roleNotifyRoleCards = document.getElementById('roleNotifyRoleCards');",
      "  const roleNotifyRoleCount = document.getElementById('roleNotifyRoleCount');",
      "  let roleNotifyRolesCache = [];"
    ].join('\n'));
    local = true;
  }

  if (!js.includes('function renderRoleCards')) {
    const helper = [
      "  function selectedRoleSet() { return new Set(selectedRoleIds().map(String)); }",
      "",
      "  function roleSearchText(role = {}) { return [role.name, role.id, role.guildName, role.mention].join(' ').toLowerCase(); }",
      "",
      "  function syncRoleCount() {",
      "    if (!roleNotifyRoleCount) return;",
      "    const count = selectedRoleIds().length;",
      "    roleNotifyRoleCount.textContent = String(count) + ' selecionado(s)';",
      "  }",
      "",
      "  function toggleRoleId(roleId = '') {",
      "    if (!roleNotifyRoles || !roleId) return;",
      "    const option = Array.from(roleNotifyRoles.options || []).find((item) => String(item.value) === String(roleId));",
      "    if (!option) return;",
      "    option.selected = !option.selected;",
      "    syncRoleCount();",
      "    renderRoleCards();",
      "  }",
      "",
      "  function renderRoleCards(roles = roleNotifyRolesCache) {",
      "    if (!roleNotifyRoleCards) return;",
      "    roleNotifyRolesCache = Array.isArray(roles) ? roles : [];",
      "    const selected = selectedRoleSet();",
      "    const query = String(roleNotifyRoleSearch?.value || '').trim().toLowerCase();",
      "    const filtered = roleNotifyRolesCache.filter((role) => !query || roleSearchText(role).includes(query)).slice(0, 120);",
      "    syncRoleCount();",
      "    if (!filtered.length) { roleNotifyRoleCards.innerHTML = '<div class=\"va-role-card empty\"><strong>Nenhum cargo encontrado</strong><span>Ajuste a busca.</span></div>'; return; }",
      "    roleNotifyRoleCards.innerHTML = filtered.map((role) => {",
      "      const id = String(role.id || '');",
      "      const active = selected.has(id);",
      "      const guild = role.guildName ? ' • ' + esc(role.guildName) : '';",
      "      const dot = role.color && role.color !== '#000000' ? '<span class=\"va-role-dot\" style=\"background:' + esc(role.color) + '\"></span>' : '<span class=\"va-role-dot\"></span>';",
      "      return '<button type=\"button\" class=\"va-role-card ' + (active ? 'active' : '') + '\" data-role-card-id=\"' + esc(id) + '\">' + dot + '<span><strong>' + esc(role.name || id) + '</strong><small>' + esc(id + guild) + '</small></span><em>' + (active ? 'Selecionado' : 'Selecionar') + '</em></button>';",
      "    }).join('');",
      "    roleNotifyRoleCards.querySelectorAll('[data-role-card-id]').forEach((card) => { card.addEventListener('click', () => toggleRoleId(card.dataset.roleCardId || '')); });",
      "  }",
      ""
    ].join('\n');
    js = js.replace('  function renderRoleOptions(roles = []) {', helper + '  function renderRoleOptions(roles = []) {');
    local = true;
  }

  if (!js.includes('renderRoleCards(sorted);')) {
    js = js.replace("    roleNotifyRoles.innerHTML = sorted.map((role) => `<option value=\"${esc(role.id)}\" ${current.has(String(role.id)) ? 'selected' : ''}>${esc(roleLabel(role))}</option>`).join('');", "    roleNotifyRoles.innerHTML = sorted.map((role) => `<option value=\"${esc(role.id)}\" ${current.has(String(role.id)) ? 'selected' : ''}>${esc(roleLabel(role))}</option>`).join('');\n    renderRoleCards(sorted);");
    local = true;
  }

  if (!js.includes('roleNotifyRoleSearch?.addEventListener')) {
    js = js.replace("  document.getElementById('reloadRoleNotifyBtn')?.addEventListener('click', loadRoleNotifications);", "  document.getElementById('reloadRoleNotifyBtn')?.addEventListener('click', loadRoleNotifications);\n  roleNotifyRoleSearch?.addEventListener('input', () => renderRoleCards());");
    local = true;
  }

  if (!js.includes('dmHistoryRefreshBtn')) {
    js = js.replace("  const dmHistoryList = document.getElementById('dmHistoryList');", "  const dmHistoryList = document.getElementById('dmHistoryList');\n  const dmHistoryRefreshBtn = document.getElementById('dmHistoryRefreshBtn');");
    js = js.replace("  document.getElementById('loadDmHistoryBtn')?.addEventListener('click', () => loadDmHistory());", "  document.getElementById('loadDmHistoryBtn')?.addEventListener('click', () => loadDmHistory());\n  dmHistoryRefreshBtn?.addEventListener('click', () => loadDmHistory());");
    local = true;
  }

  if (local) {
    fs.writeFileSync(configJsFile, js, 'utf8');
    changed = true;
  }
}

function patchCss() {
  if (!fs.existsSync(cssFile)) return;
  let css = fs.readFileSync(cssFile, 'utf8');
  if (css.includes('.va-role-picker')) return;
  css += [
    '',
    '/* Void Arena - fluxo premium de notificações por cargo */',
    '.va-role-picker { display: grid; gap: 10px; }',
    '.va-role-picker-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; color: #f8f7ff; font-weight: 950; text-transform: uppercase; letter-spacing: .06em; font-size: 12px; }',
    '.va-role-picker-head small { color: #67e8f9; font-size: 11px; }',
    '.va-role-picker-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 10px; max-height: 330px; overflow: auto; padding-right: 4px; }',
    '.va-role-card { display: grid; grid-template-columns: 14px 1fr auto; align-items: center; gap: 10px; border: 1px solid rgba(139, 92, 246, .28); border-radius: 16px; background: linear-gradient(135deg, rgba(20, 18, 43, .96), rgba(6, 13, 29, .9)); color: #f8f7ff; padding: 11px 12px; text-align: left; cursor: pointer; transition: .16s ease; }',
    '.va-role-card:hover { border-color: rgba(34, 211, 238, .55); transform: translateY(-1px); }',
    '.va-role-card.active { border-color: rgba(34, 211, 238, .88); box-shadow: 0 0 0 2px rgba(34, 211, 238, .12); }',
    '.va-role-card strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    '.va-role-card small { color: #a7f3ff; opacity: .8; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    '.va-role-card em { font-style: normal; color: #ddd6fe; font-size: 11px; font-weight: 900; text-transform: uppercase; }',
    '.va-role-dot { width: 10px; height: 10px; border-radius: 999px; background: linear-gradient(135deg, #8b5cf6, #22d3ee); box-shadow: 0 0 14px rgba(34, 211, 238, .35); }',
    '#dmHistoryList { max-height: 470px; overflow: auto; padding-right: 6px; margin-top: 12px; }',
    '#dmHistoryList .va-item { border-radius: 16px; }',
    '#dmHistoryList .va-item strong:first-child { display: block; margin-bottom: 4px; }',
    '@media (max-width: 860px) { .va-role-picker-cards { grid-template-columns: 1fr; } }',
    ''
  ].join('\n');
  fs.writeFileSync(cssFile, css, 'utf8');
  changed = true;
}

patchHtml();
patchJs();
patchCss();

console.log(changed ? 'Patch aplicado: fluxo melhorado de cargos e conversa.' : 'Patch ignorado: fluxo melhorado de cargos e conversa ja ativo.');
