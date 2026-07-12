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
  if (html.includes('id="dmHistoryPlayerCards"')) return;

  const oldText = '<label>Selecionar jogador do servidor<select id="dmHistoryPlayerSelect" size="8"><option value="">Carregando jogadores...</option></select></label><div class="va-actions"><input id="dmHistoryDiscordId" placeholder="Discord ID manual / reserva" /><button id="loadDmHistoryBtn" class="va-btn" type="button">Ver conversa</button></div><div id="dmHistoryList" class="va-list"></div>';
  const newText = [
    '<div class="va-player-picker">',
    '  <div class="va-player-picker-head">',
    '    <span>Selecionar jogador do servidor</span>',
    '    <small id="dmHistoryPlayerCount">Carregando...</small>',
    '  </div>',
    '  <input id="dmHistoryPlayerSearch" class="va-player-picker-search" placeholder="Buscar por nome, Discord ID ou cargo..." autocomplete="off" />',
    '  <select id="dmHistoryPlayerSelect" size="8" style="display:none"><option value="">Carregando jogadores...</option></select>',
    '  <div id="dmHistoryPlayerCards" class="va-player-picker-cards"><div class="va-player-card skeleton">Carregando jogadores...</div></div>',
    '</div>',
    '<div class="va-actions"><input id="dmHistoryDiscordId" placeholder="Discord ID manual / reserva" /><button id="loadDmHistoryBtn" class="va-btn" type="button">Ver conversa</button></div><div id="dmHistoryList" class="va-list"></div>'
  ].join('');

  if (html.includes(oldText)) {
    html = html.replace(oldText, newText);
  } else {
    html = html.replace('<div id="dmHistoryList" class="va-list"></div></div>', '<div id="dmHistoryPlayerCards" class="va-player-picker-cards"></div><div id="dmHistoryList" class="va-list"></div></div>');
  }

  fs.writeFileSync(configHtmlFile, html, 'utf8');
  changed = true;
}

function patchJs() {
  if (!fs.existsSync(configJsFile)) return;
  let js = fs.readFileSync(configJsFile, 'utf8');
  let localChanged = false;

  if (!js.includes('dmHistoryPlayerSearch')) {
    js = js.replace("  const dmHistoryPlayerSelect = document.getElementById('dmHistoryPlayerSelect');", [
      "  const dmHistoryPlayerSelect = document.getElementById('dmHistoryPlayerSelect');",
      "  const dmHistoryPlayerSearch = document.getElementById('dmHistoryPlayerSearch');",
      "  const dmHistoryPlayerCards = document.getElementById('dmHistoryPlayerCards');",
      "  const dmHistoryPlayerCount = document.getElementById('dmHistoryPlayerCount');",
      "  let dmHistoryPlayersCache = [];"
    ].join('\n'));
    localChanged = true;
  }

  if (!js.includes('function renderDmPlayerCards')) {
    const helper = [
      "  function dmPlayerInitials(player = {}) {",
      "    const name = String(player.name || player.username || player.discordId || '?').trim();",
      "    return name.split(/\\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || '?';",
      "  }",
      "",
      "  function renderDmPlayerCards(players = dmHistoryPlayersCache) {",
      "    if (!dmHistoryPlayerCards) return;",
      "    dmHistoryPlayersCache = Array.isArray(players) ? players : [];",
      "    const query = String(dmHistoryPlayerSearch?.value || '').trim().toLowerCase();",
      "    const selectedId = String(dmHistoryPlayerSelect?.value || dmHistoryDiscordId?.value || '');",
      "    const filtered = dmHistoryPlayersCache.filter((player) => {",
      "      const roles = (player.roles || []).map((role) => role.name || '').join(' ');",
      "      const haystack = [player.name, player.username, player.discordId, player.guildName, roles, player.registered ? 'cadastrado site' : ''].join(' ').toLowerCase();",
      "      return !query || haystack.includes(query);",
      "    }).slice(0, 80);",
      "    if (dmHistoryPlayerCount) dmHistoryPlayerCount.textContent = String(filtered.length) + ' de ' + String(dmHistoryPlayersCache.length || 0);",
      "    if (!filtered.length) {",
      "      dmHistoryPlayerCards.innerHTML = '<div class=\"va-player-card empty\"><strong>Nenhum jogador encontrado</strong><span>Ajuste a busca ou use o Discord ID manual.</span></div>';",
      "      return;",
      "    }",
      "    dmHistoryPlayerCards.innerHTML = filtered.map((player) => {",
      "      const roles = (player.roles || []).slice(0, 3).map((role) => role.name).filter(Boolean).join(', ');",
      "      const active = selectedId && selectedId === String(player.discordId || '');",
      "      const registered = player.registered ? '<span class=\"va-player-pill ok\">cadastrado no site</span>' : '<span class=\"va-player-pill\">membro Discord</span>';",
      "      const avatar = player.avatar ? '<img src=\"' + esc(player.avatar) + '\" alt=\"\" />' : '<span>' + esc(dmPlayerInitials(player)) + '</span>';",
      "      return '<button type=\"button\" class=\"va-player-card ' + (active ? 'active' : '') + '\" data-dm-player-id=\"' + esc(player.discordId || '') + '\">' +",
      "        '<span class=\"va-player-avatar\">' + avatar + '</span>' +",
      "        '<span class=\"va-player-info\"><strong>' + esc(player.name || player.username || player.discordId || 'Jogador') + '</strong><small>' + esc(player.discordId || '') + (player.guildName ? ' • ' + esc(player.guildName) : '') + '</small><em>' + esc(roles || 'Sem cargos exibidos') + '</em></span>' +",
      "        '<span class=\"va-player-meta\">' + registered + '<span>Ver conversa</span></span>' +",
      "      '</button>';",
      "    }).join('');",
      "    dmHistoryPlayerCards.querySelectorAll('[data-dm-player-id]').forEach((card) => {",
      "      card.addEventListener('click', () => {",
      "        const id = card.dataset.dmPlayerId || '';",
      "        if (!id) return;",
      "        if (dmHistoryPlayerSelect) dmHistoryPlayerSelect.value = id;",
      "        if (dmHistoryDiscordId) dmHistoryDiscordId.value = id;",
      "        renderDmPlayerCards();",
      "        loadDmHistory(id);",
      "      });",
      "    });",
      "  }",
      ""
    ].join('\n');
    js = js.replace('  function targetLine(target = {}) {', helper + '  function targetLine(target = {}) {');
    localChanged = true;
  }

  if (!js.includes('renderDmPlayerCards(playersData.players || [])')) {
    js = js.replace('      renderDmPlayerOptions(playersData.players || []);', '      renderDmPlayerOptions(playersData.players || []);\n      renderDmPlayerCards(playersData.players || []);');
    localChanged = true;
  }

  if (!js.includes('dmHistoryPlayerSearch?.addEventListener')) {
    js = js.replace("  dmHistoryPlayerSelect?.addEventListener('change', () => { if (dmHistoryPlayerSelect.value) loadDmHistory(dmHistoryPlayerSelect.value); });", [
      "  dmHistoryPlayerSelect?.addEventListener('change', () => { if (dmHistoryPlayerSelect.value) loadDmHistory(dmHistoryPlayerSelect.value); });",
      "  dmHistoryPlayerSearch?.addEventListener('input', () => renderDmPlayerCards());"
    ].join('\n'));
    localChanged = true;
  }

  if (!js.includes('renderDmPlayerCards();\n    } catch')) {
    js = js.replace("    } catch (error) { dmHistoryList.innerHTML = `<div class=\"va-item\"><strong>Erro ao carregar conversa</strong><div class=\"va-muted\">${esc(error.message)}</div></div>`; }", "      renderDmPlayerCards();\n    } catch (error) { dmHistoryList.innerHTML = `<div class=\"va-item\"><strong>Erro ao carregar conversa</strong><div class=\"va-muted\">${esc(error.message)}</div></div>`; }");
    localChanged = true;
  }

  if (localChanged) {
    fs.writeFileSync(configJsFile, js, 'utf8');
    changed = true;
  }
}

function patchCss() {
  if (!fs.existsSync(cssFile)) return;
  let css = fs.readFileSync(cssFile, 'utf8');
  if (css.includes('.va-player-picker')) return;
  css += [
    '',
    '/* Void Arena - seletor premium de jogadores nas notificações */',
    '.va-player-picker { display: grid; gap: 10px; margin-top: 10px; }',
    '.va-player-picker-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: #f8f7ff; font-weight: 900; text-transform: uppercase; letter-spacing: .06em; font-size: 12px; }',
    '.va-player-picker-head small { color: #67e8f9; font-size: 11px; }',
    '.va-player-picker-search { width: 100%; border-radius: 14px; border: 1px solid rgba(34, 211, 238, .35); background: rgba(4, 7, 20, .92); color: #f8f7ff; padding: 12px 14px; outline: none; }',
    '.va-player-picker-search:focus { border-color: rgba(139, 92, 246, .75); box-shadow: 0 0 0 3px rgba(139, 92, 246, .18); }',
    '.va-player-picker-cards { display: grid; gap: 10px; max-height: 360px; overflow: auto; padding: 4px 4px 4px 0; }',
    '.va-player-card { width: 100%; display: grid; grid-template-columns: 46px 1fr auto; align-items: center; gap: 12px; text-align: left; border: 1px solid rgba(139, 92, 246, .28); border-radius: 18px; background: linear-gradient(135deg, rgba(21, 18, 45, .96), rgba(7, 13, 28, .92)); color: #f8f7ff; padding: 12px; cursor: pointer; transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease, background .16s ease; }',
    '.va-player-card:hover { transform: translateY(-1px); border-color: rgba(34, 211, 238, .55); box-shadow: 0 12px 28px rgba(0, 0, 0, .24), 0 0 24px rgba(34, 211, 238, .08); }',
    '.va-player-card.active { border-color: rgba(34, 211, 238, .88); box-shadow: 0 0 0 2px rgba(34, 211, 238, .12), 0 0 30px rgba(34, 211, 238, .12); }',
    '.va-player-card.empty, .va-player-card.skeleton { display: block; cursor: default; color: #c9c4e8; }',
    '.va-player-avatar { width: 46px; height: 46px; border-radius: 16px; overflow: hidden; display: grid; place-items: center; background: linear-gradient(135deg, rgba(139, 92, 246, .35), rgba(34, 211, 238, .25)); border: 1px solid rgba(255, 255, 255, .08); font-weight: 950; color: #fff; }',
    '.va-player-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }',
    '.va-player-info { min-width: 0; display: grid; gap: 2px; }',
    '.va-player-info strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }',
    '.va-player-info small { color: #a7f3ff; opacity: .9; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
    '.va-player-info em { color: #c9c4e8; opacity: .82; font-style: normal; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }',
    '.va-player-meta { display: grid; gap: 6px; justify-items: end; color: #ddd6fe; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .05em; }',
    '.va-player-pill { border: 1px solid rgba(167, 139, 250, .35); background: rgba(124, 58, 237, .16); border-radius: 999px; padding: 5px 8px; color: #ddd6fe; white-space: nowrap; }',
    '.va-player-pill.ok { color: #86efac; border-color: rgba(34, 197, 94, .35); background: rgba(22, 163, 74, .12); }',
    '@media (max-width: 760px) { .va-player-card { grid-template-columns: 40px 1fr; } .va-player-meta { grid-column: 1 / -1; justify-items: start; display: flex; flex-wrap: wrap; } }',
    ''
  ].join('\n');
  fs.writeFileSync(cssFile, css, 'utf8');
  changed = true;
}

patchHtml();
patchJs();
patchCss();

console.log(changed ? 'Patch aplicado: seletor premium de jogadores nas conversas.' : 'Patch ignorado: seletor premium de jogadores já ativo.');
