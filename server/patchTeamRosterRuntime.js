const fs = require('node:fs');
const path = require('node:path');

function patchFile(file, replacements = []) {
  if (!fs.existsSync(file)) return { file, changed: false, missing: true };
  let src = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const [from, to] of replacements) {
    if (src.includes(from) && !src.includes(to)) {
      src = src.replace(from, to);
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(file, src, 'utf8');
  return { file, changed };
}

const helper = `
  function isUuidLike(value = '') { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || '').trim()); }
  function cleanRosterValue(value = '') { const raw = String(value || '').trim(); return isUuidLike(raw) ? '' : raw; }
  function validManualRoster(name = '', discord = '') { const safeName = cleanRosterValue(name); const safeDiscord = cleanRosterValue(cleanDiscord(discord)); if (!safeName) return null; if (isUuidLike(safeName) || isUuidLike(safeDiscord)) return null; if (safeName === safeDiscord && /^[0-9a-f-]{20,}$/i.test(safeName)) return null; return { name: safeName, discordId: safeDiscord }; }
  function sanitizeRosterRows(container) { Array.from(container?.querySelectorAll('.va-roster-row') || []).forEach((row) => { const name = row.querySelector('[data-roster-name],[data-name]'); const discord = row.querySelector('[data-roster-discord],[data-discord]'); if (name && isUuidLike(name.value)) name.value = ''; if (discord && isUuidLike(discord.value)) discord.value = ''; }); }
`;

const timesFile = path.join(__dirname, '..', 'public', 'js', 'pages', 'times.js');
const manageFile = path.join(__dirname, '..', 'public', 'js', 'pages', 'times-manage.js');
const publicTeamRoutes = path.join(__dirname, 'routes', 'publicTeam.routes.js');

const results = [];
results.push(patchFile(timesFile, [
  ["  function cleanDiscord(value = '') { return String(value || '').replace(/^<@!?/, '').replace(/>$/, '').trim(); }", "  function cleanDiscord(value = '') { return String(value || '').replace(/^<@!?/, '').replace(/>$/, '').trim(); }" + helper],
  ["  let directoryCache = { freePlayers: [] };", "  let directoryCache = { freePlayers: [] };\n  form?.setAttribute('autocomplete', 'off');"],
  ["<label>Nome<input data-roster-name type=\"text\" maxlength=\"80\" placeholder=\"Nome do jogador\" value=\"${esc(data.name || '')}\" /></label><label>ID Discord<input data-roster-discord type=\"text\" maxlength=\"40\" placeholder=\"ID ou menção do Discord\" value=\"${esc(data.discordId || '')}\" /></label>", "<label>Nome<input data-roster-name type=\"text\" autocomplete=\"off\" data-lpignore=\"true\" data-form-type=\"other\" maxlength=\"80\" placeholder=\"Nome do jogador\" value=\"${esc(data.name || '')}\" /></label><label>ID Discord<input data-roster-discord type=\"text\" autocomplete=\"off\" data-lpignore=\"true\" data-form-type=\"other\" maxlength=\"40\" placeholder=\"ID ou menção do Discord\" value=\"${esc(data.discordId || '')}\" /></label>"],
  ["  function resetRoster() { playersRows.innerHTML = ''; reservesRows.innerHTML = ''; for (let i = 0; i < 5; i += 1) addRosterRow(playersRows, 'player'); addRosterRow(reservesRows, 'reserve'); }", "  function resetRoster() { playersRows.innerHTML = ''; reservesRows.innerHTML = ''; addRosterRow(playersRows, 'player'); updateLeadershipOptions(); }"],
  ["  function collectRows(container) { return Array.from(container?.querySelectorAll('.va-roster-row') || []).filter((row) => row.dataset.inviteOnly !== '1').map((row) => ({ name: row.querySelector('[data-roster-name]')?.value || '', discordId: cleanDiscord(row.querySelector('[data-roster-discord]')?.value || '') })).filter((item) => item.name.trim()); }", "  function collectRows(container) { sanitizeRosterRows(container); return Array.from(container?.querySelectorAll('.va-roster-row') || []).filter((row) => row.dataset.inviteOnly !== '1').map((row) => validManualRoster(row.querySelector('[data-roster-name]')?.value || '', row.querySelector('[data-roster-discord]')?.value || '')).filter(Boolean); }"],
  ["  function collectTeam() { const fd = new FormData(form);", "  function collectTeam() { sanitizeRosterRows(playersRows); sanitizeRosterRows(reservesRows); const fd = new FormData(form);"]
]));

results.push(patchFile(manageFile, [
  ["  function cleanDiscord(value = '') { return String(value || '').replace(/^<@!?/, '').replace(/>$/, '').trim(); }", "  function cleanDiscord(value = '') { return String(value || '').replace(/^<@!?/, '').replace(/>$/, '').trim(); }" + helper],
  ["<label>Nome<input data-name maxlength=\"80\" value=\"${esc(data.name || '')}\" /></label><label>ID Discord<input data-discord maxlength=\"40\" value=\"${esc(data.discordId || data.account || '')}\" /></label>", "<label>Nome<input data-name autocomplete=\"off\" data-lpignore=\"true\" data-form-type=\"other\" maxlength=\"80\" value=\"${esc(cleanRosterValue(data.name || ''))}\" /></label><label>ID Discord<input data-discord autocomplete=\"off\" data-lpignore=\"true\" data-form-type=\"other\" maxlength=\"40\" value=\"${esc(cleanRosterValue(data.discordId || data.account || ''))}\" /></label>"],
  ["  function rows(container) { return Array.from(container.querySelectorAll('.va-roster-row')).filter((row) => row.dataset.inviteOnly !== '1').map((row) => ({ name: row.querySelector('[data-name]')?.value || '', discordId: cleanDiscord(row.querySelector('[data-discord]')?.value || '') })).filter((item) => item.name.trim()); }", "  function rows(container) { sanitizeRosterRows(container); return Array.from(container.querySelectorAll('.va-roster-row')).filter((row) => row.dataset.inviteOnly !== '1').map((row) => validManualRoster(row.querySelector('[data-name]')?.value || '', row.querySelector('[data-discord]')?.value || '')).filter(Boolean); }"],
  ["  function currentMembers(shell) { return Array.from(shell.querySelectorAll('#teamManagePlayers .va-roster-row,#teamManageReserves .va-roster-row')).map((row) => ({ name: row.querySelector('[data-name]')?.value || '', discordId: cleanDiscord(row.querySelector('[data-discord]')?.value || ''), inviteOnly: row.dataset.inviteOnly === '1' })).filter((item) => item.name && !item.inviteOnly); }", "  function currentMembers(shell) { return Array.from(shell.querySelectorAll('#teamManagePlayers .va-roster-row,#teamManageReserves .va-roster-row')).map((row) => { const valid = validManualRoster(row.querySelector('[data-name]')?.value || '', row.querySelector('[data-discord]')?.value || ''); return valid ? { ...valid, inviteOnly: row.dataset.inviteOnly === '1' } : null; }).filter((item) => item && item.name && !item.inviteOnly); }"],
  ["    teamPlayers(team, 'playerDetails', 'players').forEach((p) => addRow(players, p, () => updateLeaderOptions(shell)));", "    teamPlayers(team, 'playerDetails', 'players').filter((p) => validManualRoster(p?.name || p, p?.discordId || p?.account || '')).forEach((p) => addRow(players, p, () => updateLeaderOptions(shell)));"],
  ["    teamPlayers(team, 'reserveDetails', 'reserves').forEach((p) => addRow(reserves, p, () => updateLeaderOptions(shell)));", "    teamPlayers(team, 'reserveDetails', 'reserves').filter((p) => validManualRoster(p?.name || p, p?.discordId || p?.account || '')).forEach((p) => addRow(reserves, p, () => updateLeaderOptions(shell)));"],
  ["    if (!reserves.children.length) addRow(reserves, {}, () => updateLeaderOptions(shell));", "    // Reservas não são criadas automaticamente; só entram se o capitão adicionar.\n    sanitizeRosterRows(players); sanitizeRosterRows(reserves);"]
]));

results.push(patchFile(publicTeamRoutes, [
  ["  if (/^https?:\/\//i.test(raw)) return raw.slice(0, 1800);\n  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(raw)) return raw.slice(0, 2500000);\n  if (/^\/(assets|uploads|images|img|public)\//i.test(raw)) return raw.slice(0, 1200);", "  if (/^https?:\/\//i.test(raw)) return raw.slice(0, 2400);\n  if (/^data:image\/(png|jpe?g|webp|gif|svg\\+xml);base64,/i.test(raw)) return raw.slice(0, 9000000);\n  if (/^\/(assets|uploads|images|img|public)\//i.test(raw)) return raw.slice(0, 1600);"],
  ["function resolveTeamLogo(team = {}) { return firstLogoValue(team.logo, team.logoUrl, team.logoURL, team.teamLogo, team.teamLogoUrl, team.badge, team.badgeUrl, team.escudo, team.image, team.imageUrl, team.avatar, team.icon); }", "function resolveTeamLogo(team = {}) { return firstLogoValue(team.logo, team.logoUrl, team.logoURL, team.teamLogo, team.teamLogoUrl, team.badge, team.badgeUrl, team.escudo, team.image, team.imageUrl, team.avatar, team.icon, team.logoOriginal); }"],
  ["function normalizePlayers(value = []) {", "function isUuidLike(value = '') { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || '').trim()); }\nfunction normalizePlayers(value = []) {"],
  ["  }).filter((item) => item.name).slice(0, 12);", "  }).filter((item) => item.name && !isUuidLike(item.name) && !isUuidLike(item.discordId) && !(item.name === item.discordId && /^[0-9a-f-]{20,}$/i.test(item.name))).slice(0, 12);"]
]));

console.log('Patch roster/logos aplicado:', results.map((r) => `${path.basename(r.file)}:${r.changed ? 'alterado' : 'ok'}`).join(', '));
