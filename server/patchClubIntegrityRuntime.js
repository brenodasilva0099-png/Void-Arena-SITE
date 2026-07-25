const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const stableRoutesFile = path.join(__dirname, 'routes', 'leagueStable.routes.js');
const experienceFile = path.join(ROOT, 'public', 'js', 'core', 'league-experience.js');
const socialIconsFile = path.join(ROOT, 'public', 'js', 'core', 'social-icons.js');
const publicDir = path.join(ROOT, 'public');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, content) { if (read(file) !== content) fs.writeFileSync(file, content, 'utf8'); }

let routes = read(stableRoutesFile);
let client = read(experienceFile);
let changedRoutes = false;
let changedClient = false;
let changedPages = 0;

const oldSafeImage = `function safeImage(value = '') {
  if (value && typeof value === 'object') return safeImage(value.url || value.src || value.href || value.data || value.base64 || '');
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i.test(raw)) return raw.slice(0, 9000000);
  if (/^https?:\/\//i.test(raw)) return raw.slice(0, 4000);
  if (/^\/(assets|uploads|images|img|public)\//i.test(raw)) return raw.slice(0, 1800);
  const found = raw.match(/https?:\/\/[^\s"'<>]+/i);
  return found ? found[0].slice(0, 4000) : '';
}`;

const newSafeImage = `function validDataImage(raw = '') {
  const match = String(raw || '').match(/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,([a-z0-9+/=]+)$/i);
  if (!match || match[2].length < 80 || match[2].length % 4 === 1) return false;
  try { return Buffer.from(match[2], 'base64').length >= 48; }
  catch { return false; }
}

function safeImage(value = '') {
  if (value && typeof value === 'object') return safeImage(value.url || value.src || value.href || value.data || value.base64 || '');
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^data:image\//i.test(raw)) return validDataImage(raw) ? raw : '';
  if (/^https?:\/\//i.test(raw)) return raw.slice(0, 4000);
  if (/^\/(assets|uploads|images|img|public)\//i.test(raw)) return raw.slice(0, 1800);
  const found = raw.match(/https?:\/\/[^\s"'<>]+/i);
  return found ? found[0].slice(0, 4000) : '';
}`;

if (!routes.includes('function validDataImage(raw = \'\')')) {
  if (!routes.includes(oldSafeImage)) throw new Error('Função safeImage esperada não foi encontrada.');
  routes = routes.replace(oldSafeImage, newSafeImage);
  changedRoutes = true;
}

if (!routes.includes('function dedupeTeamsForResponse(teams = [])')) {
  const anchor = `function teamIdentityValues(team = {}) {
  return [team.id, team.name, team.tag].map(normalizeKey).filter(Boolean);
}`;
  if (!routes.includes(anchor)) throw new Error('Âncora de identidade de time não encontrada.');
  const block = `${anchor}

function teamLeadershipKeys(team = {}) {
  return new Set([
    team.ownerUserId, team.ownerDiscordId,
    team.directorUserId, team.directorDiscordId,
    team.captainUserId, team.captainDiscordId
  ].map((value) => String(value || '').trim()).filter(Boolean));
}

function sameClubForResponse(left = {}, right = {}) {
  if (left.id && right.id && String(left.id) === String(right.id)) return true;
  const leftName = normalizeKey(left.name || left.teamName);
  const rightName = normalizeKey(right.name || right.teamName);
  const leftTag = normalizeKey(left.tag);
  const rightTag = normalizeKey(right.tag);
  const sameName = Boolean(leftName && rightName && leftName === rightName);
  const sameTag = Boolean(leftTag && rightTag && leftTag === rightTag);
  if (sameName && sameTag) return true;
  const leftLeaders = teamLeadershipKeys(left);
  const rightLeaders = teamLeadershipKeys(right);
  const overlap = Array.from(leftLeaders).some((key) => rightLeaders.has(key));
  return overlap && (sameName || sameTag);
}

function dedupeTeamsForResponse(teams = []) {
  const groups = [];
  for (const team of Array.isArray(teams) ? teams : []) {
    const group = groups.find((items) => items.some((item) => sameClubForResponse(item, team)));
    if (group) group.push(team);
    else groups.push([team]);
  }
  return groups.map((items) => items.slice().sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime() || 0;
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime() || 0;
    return bTime - aTime;
  })[0]).filter(Boolean);
}`;
  routes = routes.replace(anchor, block);
  changedRoutes = true;
}

if (!routes.includes('teams: dedupeTeamsForResponse(teamsResult.value),')) {
  const from = '    teams: teamsResult.value,';
  if (!routes.includes(from)) throw new Error('Retorno de times do snapshot não encontrado.');
  routes = routes.replace(from, '    teams: dedupeTeamsForResponse(teamsResult.value),');
  changedRoutes = true;
}

const oldClientImage = `  function image(value, fallback = FALLBACK_LOGO) {
    return String(value || fallback);
  }`;
const newClientImage = `  function image(value, fallback = FALLBACK_LOGO) {
    const raw = String(value || '').trim();
    if (!raw) return fallback;
    if (/^data:image\//i.test(raw)) {
      const match = raw.match(/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,([a-z0-9+/=]+)$/i);
      if (!match || match[2].length < 80 || match[2].length % 4 === 1) return fallback;
    }
    return raw;
  }`;
if (!client.includes('match[2].length < 80')) {
  if (!client.includes(oldClientImage)) throw new Error('Helper de imagem do cliente não encontrado.');
  client = client.replace(oldClientImage, newClientImage);
  changedClient = true;
}

if (!client.includes('hnl-social-icons-inlined-v1')) {
  const social = read(socialIconsFile);
  client = `/* hnl-social-icons-inlined-v1 */\n${social}\n\n${client}`;
  changedClient = true;
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && entry.name.endsWith('.html') ? [full] : [];
  });
}

for (const file of walk(publicDir)) {
  const before = read(file);
  const after = before.replace(/\s*<script[^>]+src=["'][^"']*\/js\/core\/social-icons\.js(?:\?[^"']*)?["'][^>]*><\/script>\s*/gi, '\n');
  if (after !== before) {
    fs.writeFileSync(file, after, 'utf8');
    changedPages += 1;
  }
}

write(stableRoutesFile, routes);
write(experienceFile, client);
new Function(read(stableRoutesFile));
new Function(read(experienceFile));

const finalRoutes = read(stableRoutesFile);
const finalClient = read(experienceFile);
for (const marker of ['validDataImage', 'dedupeTeamsForResponse', 'teams: dedupeTeamsForResponse(teamsResult.value)']) {
  if (!finalRoutes.includes(marker)) throw new Error(`Proteção de clubes ausente: ${marker}`);
}
for (const marker of ['hnl-social-icons-inlined-v1', 'match[2].length < 80']) {
  if (!finalClient.includes(marker)) throw new Error(`Proteção visual ausente: ${marker}`);
}

console.log('[Club Integrity] Duplicatas ocultadas por identidade canônica; logos data URI validadas; social-icons incorporado no cliente.', {
  routesChanged: changedRoutes,
  clientChanged: changedClient,
  pagesCleaned: changedPages
});