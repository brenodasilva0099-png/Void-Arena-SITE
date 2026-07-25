const fs = require('node:fs');
const path = require('node:path');

const routesFile = path.join(__dirname, 'routes', 'publicTeam.routes.js');
const clientFile = path.join(__dirname, '..', 'public', 'js', 'core', 'league-experience.js');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, content) { if (read(file) !== content) fs.writeFileSync(file, content, 'utf8'); }

let routes = read(routesFile);
let client = read(clientFile);

if (!routes.includes('hnl-team-invite-links-v1')) {
  const anchor = 'function registerPublicTeamRoutes(app) {';
  if (!routes.includes(anchor)) throw new Error('Registro das rotas de time não encontrado.');
  const helpers = `// hnl-team-invite-links-v1
function hashTeamInviteToken(token = '') {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function validTeamInvites(team = {}) {
  const now = Date.now();
  return (Array.isArray(team.joinInvites) ? team.joinInvites : []).filter((invite) => {
    if (!invite || !invite.tokenHash) return false;
    const expires = Date.parse(invite.expiresAt || 0);
    return invite.status !== 'expired' && (!Number.isFinite(expires) || expires > now - 7 * 24 * 60 * 60 * 1000);
  }).slice(-30);
}

function findTeamInvite(teams = [], token = '') {
  const tokenHash = hashTeamInviteToken(token);
  for (const team of teams) {
    const invite = validTeamInvites(team).find((item) => item.tokenHash === tokenHash);
    if (invite) return { team, invite, tokenHash };
  }
  return null;
}

function normalizedIdentity(value = '') {
  return String(value || '').trim().replace(/^<@!?/, '').replace(/>$/, '').toLowerCase();
}

function userIdentitySet(user = {}) {
  return new Set([
    user.id,
    user.discordId,
    user.name,
    user.discordTag,
    user.profile?.username
  ].map(normalizedIdentity).filter(Boolean));
}

function teamContainsUser(team = {}, user = {}) {
  const identities = userIdentitySet(user);
  if (!identities.size) return false;
  const values = [
    team.ownerUserId, team.ownerDiscordId, team.ownerName,
    team.directorUserId, team.directorDiscordId, team.directorName,
    team.captainUserId, team.captainDiscordId, team.captainName,
    ...(Array.isArray(team.players) ? team.players : []),
    ...(Array.isArray(team.reserves) ? team.reserves : []),
    ...(Array.isArray(team.playerAccounts?.players) ? team.playerAccounts.players : []),
    ...(Array.isArray(team.playerAccounts?.reserves) ? team.playerAccounts.reserves : []),
    ...(Array.isArray(team.playerDetails) ? team.playerDetails.flatMap((item) => [item?.id, item?.userId, item?.discordId, item?.account, item?.name]) : []),
    ...(Array.isArray(team.reserveDetails) ? team.reserveDetails.flatMap((item) => [item?.id, item?.userId, item?.discordId, item?.account, item?.name]) : [])
  ].map(normalizedIdentity).filter(Boolean);
  return values.some((value) => identities.has(value));
}

function addUserToTeam(team = {}, user = {}, rosterSlot = 'player') {
  const next = {
    ...team,
    players: Array.isArray(team.players) ? [...team.players] : [],
    reserves: Array.isArray(team.reserves) ? [...team.reserves] : [],
    playerDetails: Array.isArray(team.playerDetails) ? [...team.playerDetails] : [],
    reserveDetails: Array.isArray(team.reserveDetails) ? [...team.reserveDetails] : [],
    playerAccounts: {
      ...(team.playerAccounts || {}),
      players: Array.isArray(team.playerAccounts?.players) ? [...team.playerAccounts.players] : [],
      reserves: Array.isArray(team.playerAccounts?.reserves) ? [...team.playerAccounts.reserves] : []
    }
  };
  if (teamContainsUser(next, user)) return next;
  const name = clean(user.profile?.username || user.name || user.discordTag || 'Jogador', 80);
  const account = clean(user.discordId || user.id || '', 80);
  const detail = { id: clean(user.id || '', 80), userId: clean(user.id || '', 80), discordId: clean(user.discordId || '', 40), name, role: rosterSlot === 'reserve' ? 'Reserva' : 'Titular' };
  if (rosterSlot === 'reserve') {
    next.reserves.push(name);
    next.reserveDetails.push(detail);
    next.playerAccounts.reserves.push(account);
  } else {
    next.players.push(name);
    next.playerDetails.push(detail);
    next.playerAccounts.players.push(account);
  }
  next.updatedAt = new Date().toISOString();
  return next;
}

`;
  routes = routes.replace(anchor, helpers + anchor);
}

if (!routes.includes("['post', '/api/teams/:teamId/invite-link']")) {
  routes = routes.replace(
    "['post', '/api/teams/:teamId/invite-player']",
    "['post', '/api/teams/:teamId/invite-player'], ['post', '/api/teams/:teamId/invite-link'], ['get', '/api/team-invites/:token'], ['post', '/api/team-invites/:token/accept'], ['post', '/api/team-invites/:token/reject']"
  );
}

if (!routes.includes("app.post('/api/teams/:teamId/invite-link'")) {
  const anchor = "  app.delete('/api/teams/:teamId', requireLogin, async (req, res) => {";
  if (!routes.includes(anchor)) throw new Error('Ponto de inserção das rotas de convite não encontrado.');
  const block = `  app.post('/api/teams/:teamId/invite-link', requireLogin, async (req, res) => {
    try {
      const [user, teams] = await Promise.all([getSessionUser(req), storage.readTeams().catch(() => [])]);
      const team = teams.find((item) => String(item.id || '') === String(req.params.teamId || ''));
      if (!team) return res.status(404).json({ success: false, message: 'Time não encontrado.' });
      const isAdmin = await isAdminRecord(user).catch(() => false);
      if (!isAdmin && !canManageTeam(user, team)) return res.status(403).json({ success: false, message: 'Apenas dono, diretor ou capitão pode gerar convite.' });
      const rosterSlot = String(req.body?.rosterSlot || 'player').toLowerCase() === 'reserve' ? 'reserve' : 'player';
      const token = crypto.randomBytes(24).toString('hex');
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      const invite = {
        id: \`teaminvite_\${Date.now()}_\${crypto.randomUUID().slice(0, 8)}\`,
        tokenHash: hashTeamInviteToken(token),
        rosterSlot,
        note: clean(req.body?.note || '', 500),
        status: 'pending',
        createdBy: user?.id || '',
        createdByDiscordId: user?.discordId || '',
        createdAt: now.toISOString(),
        expiresAt
      };
      const saved = await storage.saveTeam({ ...team, joinInvites: [...validTeamInvites(team).filter((item) => item.status === 'pending'), invite], updatedAt: now.toISOString() });
      const siteUrl = String(process.env.SITE_PUBLIC_URL || process.env.PUBLIC_SITE_URL || \`\${req.protocol}://\${req.get('host')}\`).replace(/\/$/, '');
      return res.json({ success: true, message: 'Link de convite criado.', inviteUrl: \`\${siteUrl}/pages/convite-time.html?token=\${encodeURIComponent(token)}\`, expiresAt, teamId: saved.id, rosterSlot });
    } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
  });

  app.get('/api/team-invites/:token', requireLogin, async (req, res) => {
    try {
      const teams = await storage.readTeams().catch(() => []);
      const match = findTeamInvite(teams, req.params.token || '');
      if (!match) return res.status(404).json({ success: false, message: 'Convite inválido ou não encontrado.' });
      const expiresAt = Date.parse(match.invite.expiresAt || 0);
      if (match.invite.status !== 'pending') return res.status(409).json({ success: false, message: 'Este convite já foi utilizado ou recusado.' });
      if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) return res.status(410).json({ success: false, message: 'Este convite expirou.' });
      return res.json({ success: true, invite: { rosterSlot: match.invite.rosterSlot, note: match.invite.note || '', expiresAt: match.invite.expiresAt }, team: { id: match.team.id, name: match.team.name, tag: match.team.tag, logo: resolveTeamLogo(match.team) } });
    } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
  });

  app.post('/api/team-invites/:token/accept', requireLogin, async (req, res) => {
    try {
      const [user, teams] = await Promise.all([getSessionUser(req), storage.readTeams().catch(() => [])]);
      const match = findTeamInvite(teams, req.params.token || '');
      if (!match) return res.status(404).json({ success: false, message: 'Convite inválido ou não encontrado.' });
      const expiresAt = Date.parse(match.invite.expiresAt || 0);
      if (match.invite.status !== 'pending') return res.status(409).json({ success: false, message: 'Este convite já foi utilizado ou recusado.' });
      if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) return res.status(410).json({ success: false, message: 'Este convite expirou.' });
      const currentTeam = teams.find((item) => teamContainsUser(item, user));
      if (currentTeam && String(currentTeam.id) !== String(match.team.id)) return res.status(409).json({ success: false, message: \`Você já está vinculado ao clube \${currentTeam.name || 'atual'}.\` });
      let updated = addUserToTeam(match.team, user, match.invite.rosterSlot);
      updated.joinInvites = validTeamInvites(updated).map((item) => item.tokenHash === match.tokenHash ? { ...item, status: 'accepted', acceptedBy: user?.id || '', acceptedDiscordId: user?.discordId || '', usedAt: new Date().toISOString() } : item);
      updated = await storage.saveTeam(updated);
      return res.json({ success: true, message: currentTeam ? 'Você já fazia parte deste clube.' : 'Convite aceito. Você entrou no elenco.', team: { id: updated.id, name: updated.name, tag: updated.tag } });
    } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
  });

  app.post('/api/team-invites/:token/reject', requireLogin, async (req, res) => {
    try {
      const [user, teams] = await Promise.all([getSessionUser(req), storage.readTeams().catch(() => [])]);
      const match = findTeamInvite(teams, req.params.token || '');
      if (!match) return res.status(404).json({ success: false, message: 'Convite inválido ou não encontrado.' });
      if (match.invite.status !== 'pending') return res.status(409).json({ success: false, message: 'Este convite já foi utilizado ou recusado.' });
      const updated = { ...match.team, joinInvites: validTeamInvites(match.team).map((item) => item.tokenHash === match.tokenHash ? { ...item, status: 'rejected', rejectedBy: user?.id || '', rejectedDiscordId: user?.discordId || '', usedAt: new Date().toISOString() } : item), updatedAt: new Date().toISOString() };
      await storage.saveTeam(updated);
      return res.json({ success: true, message: 'Convite recusado.' });
    } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
  });

`;
  routes = routes.replace(anchor, block + anchor);
}

client = client.replace(
  "const memberKey = String(player.id || player.userId || player.discordId || player.name || '').trim();",
  "const memberKey = String(player.discordId || player.userId || player.id || player.account || player.name || '').trim();"
);
client = client.replace('<h3>Convidar jogador</h3>', '<h3>Convite por link</h3>');
client = client.replace(
  '<div class="hnl-field"><label>Jogador</label><select class="hnl-select" id="clubInvitePlayer"></select></div>',
  '<div class="hnl-field full"><p class="frm-muted">Gere um link único, envie ao jogador e ele entra no elenco depois de aceitar com a própria conta Discord.</p></div>'
);
client = client.replace('id="sendClubInvite" type="button">Enviar convite</button>', 'id="sendClubInvite" type="button">Gerar link de convite</button>');

const oldHandler = `    $('#sendClubInvite')?.addEventListener('click', async () => {
      try {
        await api(\`/api/teams/\${encodeURIComponent(club.id)}/invite-player\`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId: $('#clubInvitePlayer')?.value, rosterSlot: $('#clubInviteSlot')?.value, note: $('#clubInviteNote')?.value }) });
        $('#clubManageStatus').innerHTML = notice('Convite enviado ao Correio do jogador.', 'success');
      } catch (error) { $('#clubManageStatus').innerHTML = notice(error.message, 'error'); }
    });`;
const newHandler = `    $('#sendClubInvite')?.addEventListener('click', async () => {
      const button = $('#sendClubInvite');
      if (button) button.disabled = true;
      try {
        const result = await api(\`/api/teams/\${encodeURIComponent(club.id)}/invite-link\`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rosterSlot: $('#clubInviteSlot')?.value, note: $('#clubInviteNote')?.value }) });
        const link = String(result.inviteUrl || '');
        $('#clubManageStatus').innerHTML = \`\${notice('Link criado. Envie ao jogador; ele precisa abrir logado e aceitar.', 'success')}<div class="hnl-field" style="margin-top:10px"><label>Link do convite</label><input class="hnl-input" id="generatedTeamInviteLink" readonly value="\${esc(link)}"></div><div class="hnl-actions" style="margin-top:10px"><button class="hnl-btn primary" id="copyTeamInviteLink" type="button">Copiar link</button><a class="hnl-btn" href="\${esc(link)}" target="_blank" rel="noopener">Abrir link</a></div>\`;
        $('#copyTeamInviteLink')?.addEventListener('click', async () => {
          const input = $('#generatedTeamInviteLink');
          try { await navigator.clipboard.writeText(link); $('#copyTeamInviteLink').textContent = 'Copiado'; }
          catch { input?.select(); document.execCommand('copy'); $('#copyTeamInviteLink').textContent = 'Copiado'; }
        });
      } catch (error) { $('#clubManageStatus').innerHTML = notice(error.message, 'error'); }
      finally { if (button) button.disabled = false; }
    });`;
if (client.includes(oldHandler)) client = client.replace(oldHandler, newHandler);

if (!client.includes('generatedTeamInviteLink')) throw new Error('Interface de convite por link não pôde ser aplicada.');
if (!routes.includes("app.post('/api/teams/:teamId/invite-link'")) throw new Error('Rota de geração de link não foi aplicada.');
if (!routes.includes("app.post('/api/team-invites/:token/accept'")) throw new Error('Rota de aceite por link não foi aplicada.');

write(routesFile, routes);
write(clientFile, client);
new Function(read(routesFile));
new Function(read(clientFile));
console.log('[Times/Invite Link] Remoção usa Discord/ID/nome real; link único com aceite e recusa habilitado.');