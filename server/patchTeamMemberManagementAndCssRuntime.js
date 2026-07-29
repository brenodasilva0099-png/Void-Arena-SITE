const fs = require('node:fs');
const path = require('node:path');

const appFile = path.join(__dirname, 'app.js');
const routesFile = path.join(__dirname, 'routes', 'publicTeam.routes.js');
const clientFile = path.join(__dirname, '..', 'public', 'js', 'core', 'league-experience.js');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, content) { if (read(file) !== content) fs.writeFileSync(file, content, 'utf8'); }

let app = read(appFile);
let routes = read(routesFile);
let client = read(clientFile);

if (!app.includes("const fs = require('node:fs');")) {
  app = app.replace("const path = require('node:path');", "const path = require('node:path');\nconst fs = require('node:fs');");
}

if (!app.includes('hnl-dedicated-critical-css-v1')) {
  const anchor = "  app.get(/^\\/(?:css|js|assets|uploads|images|img)\\/.+/, (req, res) => {";
  if (!app.includes(anchor)) throw new Error('Rota genérica de assets não encontrada para instalar CSS dedicado.');
  const cssRoutes = `  // hnl-dedicated-critical-css-v1
  app.get(['/css/league-experience.css', '/css/league-critical.css'], (req, res) => {
    const fileName = path.basename(req.path);
    const cssFile = path.join(PUBLIC_DIR, 'css', fileName);
    fs.readFile(cssFile, (error, data) => {
      if (error) {
        console.error('[CSS/Critical] Falha ao ler', fileName, error.message);
        return res.status(404).type('text/plain; charset=utf-8').send('CSS não encontrado.');
      }
      res.status(200);
      res.set('Content-Type', 'text/css; charset=utf-8');
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('X-HNL-CSS-Route', 'hnl-dedicated-critical-css-v1');
      res.set('Content-Length', String(data.length));
      return res.end(data);
    });
  });

`;
  app = app.replace(anchor, cssRoutes + anchor);
}

if (!routes.includes('function removeMemberFromTeam(team = {}, memberKey = \'\')')) {
  const anchor = 'function registerPublicTeamRoutes(app) {';
  if (!routes.includes(anchor)) throw new Error('Registro das rotas de time não encontrado.');
  const helpers = `function normalizedMemberKey(value = '') {
  return String(value || '').trim().replace(/^<@!?/, '').replace(/>$/, '').toLowerCase();
}

function memberMatches(key = '', detail = {}, name = '', account = '') {
  const identities = [detail.id, detail.userId, detail.discordId, detail.account, detail.name, name, account]
    .map(normalizedMemberKey)
    .filter(Boolean);
  return identities.includes(normalizedMemberKey(key));
}

function removeMemberFromTeam(team = {}, memberKey = '') {
  const key = normalizedMemberKey(memberKey);
  if (!key) return { team, removed: false };

  const leadership = [
    team.ownerUserId, team.ownerDiscordId, team.ownerName,
    team.directorUserId, team.directorDiscordId, team.directorName,
    team.captainUserId, team.captainDiscordId, team.captainName
  ].map(normalizedMemberKey).filter(Boolean);
  if (leadership.includes(key)) {
    const error = new Error('Esse integrante ocupa um cargo de liderança. Transfira o cargo antes de removê-lo do elenco.');
    error.code = 'LEADERSHIP_MEMBER';
    throw error;
  }

  const next = { ...team, playerAccounts: { ...(team.playerAccounts || {}) } };
  let removed = false;

  function filterSlot(detailKey, namesKey, accountKey) {
    const details = Array.isArray(team[detailKey]) ? team[detailKey] : [];
    const names = Array.isArray(team[namesKey]) ? team[namesKey] : [];
    const accounts = Array.isArray(team.playerAccounts?.[accountKey]) ? team.playerAccounts[accountKey] : [];
    const length = Math.max(details.length, names.length, accounts.length);
    const kept = [];

    for (let index = 0; index < length; index += 1) {
      const detail = details[index] && typeof details[index] === 'object' ? details[index] : {};
      const name = detail.name || names[index] || '';
      const account = detail.discordId || detail.account || accounts[index] || '';
      if (memberMatches(key, detail, name, account)) {
        removed = true;
        continue;
      }
      if (!name && !account && !Object.keys(detail).length) continue;
      kept.push({ ...detail, name: name || detail.name || '', discordId: account || detail.discordId || '' });
    }

    next[detailKey] = kept;
    next[namesKey] = kept.map((item) => item.name).filter(Boolean);
    next.playerAccounts[accountKey] = kept.map((item) => item.discordId || item.account || '').filter(Boolean);
  }

  filterSlot('playerDetails', 'players', 'players');
  filterSlot('reserveDetails', 'reserves', 'reserves');
  next.updatedAt = new Date().toISOString();
  return { team: next, removed };
}

`;
  routes = routes.replace(anchor, helpers + anchor);
}

routes = routes.replace(
  "removeRoutes(app, [['get', '/api/teams'], ['post', '/api/teams'], ['put', '/api/teams/:teamId'], ['delete', '/api/teams/:teamId'], ['post', '/api/teams/:teamId/invite-player'], ['get', '/api/teams/:teamId/public'], ['get', '/api/users/:userId/public']]);",
  "removeRoutes(app, [['get', '/api/teams'], ['post', '/api/teams'], ['put', '/api/teams/:teamId'], ['delete', '/api/teams/:teamId'], ['delete', '/api/teams/:teamId/members/:memberKey'], ['post', '/api/teams/:teamId/invite-player'], ['get', '/api/teams/:teamId/public'], ['get', '/api/users/:userId/public']]);"
);

if (!routes.includes("app.delete('/api/teams/:teamId/members/:memberKey'")) {
  const anchor = "  app.delete('/api/teams/:teamId', requireLogin, async (req, res) => {";
  if (!routes.includes(anchor)) throw new Error('Rota de exclusão do time não encontrada para inserir remoção de membro.');
  const memberRoute = `  app.delete('/api/teams/:teamId/members/:memberKey', requireLogin, async (req, res) => {
    try {
      const [user, teams] = await Promise.all([getSessionUser(req), storage.readTeams().catch(() => [])]);
      const existing = teams.find((item) => String(item.id || '') === String(req.params.teamId || ''));
      if (!existing) return res.status(404).json({ success: false, message: 'Time nao encontrado.' });
      const isAdmin = await isAdminRecord(user).catch(() => false);
      if (!isAdmin && !canManageTeam(user, existing)) {
        return res.status(403).json({ success: false, message: 'Apenas administrador, criador, diretor ou capitão pode remover membros.' });
      }
      const result = removeMemberFromTeam(existing, req.params.memberKey || '');
      if (!result.removed) return res.status(404).json({ success: false, message: 'Integrante não encontrado no elenco.' });
      const saved = await storage.saveTeam(result.team);
      const users = await storage.readUsers().catch(() => []);
      return res.json({ success: true, message: 'Integrante removido do elenco.', team: enrichTeam(saved, users, user, { isAdmin }) });
    } catch (error) {
      return res.status(error.code === 'LEADERSHIP_MEMBER' ? 409 : 400).json({ success: false, message: error.message });
    }
  });

`;
  routes = routes.replace(anchor, memberRoute + anchor);
}

const oldRoster = "  function rosterHtml(players = []) {\n    return players.length ? players.map((player) => `<div class=\"hnl-profile-row\"><img class=\"hnl-avatar round\" src=\"${esc(image(player.avatar))}\" alt=\"${esc(player.name || '')}\"><div><strong><a href=\"/pages/perfil-jogador.html?id=${encodeURIComponent(player.id || player.discordId || '')}\">${esc(player.name || 'Jogador')}</a></strong><p>${esc(player.rosterRole || 'Jogador')}${player.isCaptain ? ' · Capitão' : ''}</p></div><a class=\"hnl-btn\" href=\"/pages/perfil-jogador.html?id=${encodeURIComponent(player.id || player.discordId || '')}\">Perfil</a></div>`).join('') : empty('Elenco ainda não preenchido.');\n  }";
const newRoster = "  function rosterHtml(players = [], options = {}) {\n    const canManage = options.canManage === true;\n    const teamId = String(options.teamId || '');\n    return players.length ? players.map((player) => {\n      // O ID enriquecido do perfil pode não existir no registro bruto do time.\n      // Discord ID, userId e nome são chaves persistidas e removíveis pela API.\n      const memberKey = String(player.discordId || player.userId || player.name || player.id || '').trim();\n      const remove = canManage && memberKey && !player.isCaptain ? `<button class=\"hnl-btn danger mini\" type=\"button\" data-remove-club-member=\"${esc(memberKey)}\" data-team-id=\"${esc(teamId)}\" data-member-name=\"${esc(player.name || 'jogador')}\">Remover</button>` : '';\n      return `<div class=\"hnl-profile-row\"><img class=\"hnl-avatar round\" src=\"${esc(image(player.avatar))}\" alt=\"${esc(player.name || '')}\"><div><strong><a href=\"/pages/perfil-jogador.html?id=${encodeURIComponent(player.id || player.discordId || '')}\">${esc(player.name || 'Jogador')}</a></strong><p>${esc(player.rosterRole || 'Jogador')}${player.isCaptain ? ' · Capitão' : ''}</p></div><div class=\"hnl-actions\"><a class=\"hnl-btn\" href=\"/pages/perfil-jogador.html?id=${encodeURIComponent(player.id || player.discordId || '')}\">Perfil</a>${remove}</div></div>`;\n    }).join('') : empty('Elenco ainda não preenchido.');\n  }";
if (client.includes(oldRoster)) client = client.replace(oldRoster, newRoster);
client = client.replace(
  "const memberKey = String(player.id || player.userId || player.discordId || player.name || '').trim();",
  "const memberKey = String(player.discordId || player.userId || player.name || player.id || '').trim();"
);

client = client.replace(
  '${rosterHtml(club.roster || [])}',
  '${rosterHtml(club.roster || [], { canManage: club.canManage, teamId: club.id })}'
);

if (!client.includes('data-remove-club-member=')) {
  throw new Error('Botão de remoção de membro não pôde ser instalado no perfil do clube.');
}

if (!client.includes('button.dataset.removeClubMember')) {
  const anchor = "    if (!club.canManage) return;";
  if (!client.includes(anchor)) throw new Error('Ponto de controle do perfil do clube não encontrado.');
  const handler = `    $$('[data-remove-club-member]', box).forEach((button) => button.addEventListener('click', async () => {
      const memberName = button.dataset.memberName || 'este integrante';
      if (!window.confirm(\`Remover \${memberName} do elenco?\`)) return;
      button.disabled = true;
      try {
        await api(\`/api/teams/\${encodeURIComponent(button.dataset.teamId || club.id)}/members/\${encodeURIComponent(button.dataset.removeClubMember || '')}\`, { method: 'DELETE' });
        $('#clubManageStatus').innerHTML = notice('Integrante removido do elenco.', 'success');
        setTimeout(() => location.reload(), 450);
      } catch (error) {
        button.disabled = false;
        $('#clubManageStatus').innerHTML = notice(error.message, 'error');
      }
    }));
`;
  client = client.replace(anchor, handler + anchor);
}

for (const marker of [
  'hnl-dedicated-critical-css-v1',
  "app.delete('/api/teams/:teamId/members/:memberKey'",
  'function removeMemberFromTeam',
  'data-remove-club-member',
  'button.dataset.removeClubMember'
]) {
  if (!app.includes(marker) && !routes.includes(marker) && !client.includes(marker)) {
    throw new Error(`Correção de time/CSS incompleta: ${marker}`);
  }
}

write(appFile, app);
write(routesFile, routes);
write(clientFile, client);
new Function(read(appFile));
new Function(read(routesFile));
new Function(read(clientFile));
console.log('[Times/CSS] Remoção de membros por gestores e CSS crítico com MIME correto aplicados.');
