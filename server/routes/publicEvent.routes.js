const crypto = require('node:crypto');
const storage = require('../storage');
const { callBot } = require('../services/botApi.service');
const { getSessionUser, requireOwner } = require('../services/access.service');
const { removeRoutes } = require('../utils/expressRoutes');

function requireLogin(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Faca login para continuar.' });
  return next();
}

function cleanText(value = '', max = 160) {
  return String(value || '').trim().slice(0, max);
}

function safeEvent(event = {}, teams = []) {
  const teamById = new Map(teams.map((team) => [String(team.id || ''), team]));
  const registrations = Array.isArray(event.registrations) ? event.registrations : [];
  return {
    id: event.id || '',
    name: event.name || event.title || 'Evento',
    title: event.title || event.name || 'Evento',
    mode: event.mode || 'Mata-mata',
    matchFormat: event.matchFormat || 'MD1',
    structure: event.structure || 'single_elimination',
    teamLimit: Number(event.teamLimit || 16) || 16,
    minimumTeams: Number(event.minimumTeams || 4) || 4,
    startAt: event.startAt || '',
    status: event.status || 'open',
    description: event.description || '',
    registrations: registrations.map((item) => ({
      ...item,
      team: teamById.get(String(item.teamId || '')) || null
    })),
    registeredCount: registrations.length,
    createdAt: event.createdAt || null,
    updatedAt: event.updatedAt || null
  };
}

function normalizeEvent(body = {}, existing = {}) {
  const allowed = new Set(['open', 'closed', 'running', 'finished']);
  const teamLimit = [4, 8, 12, 16, 20, 24, 28, 32].includes(Number(body.teamLimit)) ? Number(body.teamLimit) : Number(existing.teamLimit || 16) || 16;
  return {
    ...existing,
    id: existing.id || body.id || crypto.randomUUID(),
    title: cleanText(body.title || body.name || existing.title || existing.name || 'Novo evento', 80),
    name: cleanText(body.title || body.name || existing.title || existing.name || 'Novo evento', 80),
    mode: cleanText(body.mode || existing.mode || 'Mata-mata', 60),
    matchFormat: cleanText(body.matchFormat || existing.matchFormat || 'MD1', 12),
    structure: cleanText(body.structure || existing.structure || 'single_elimination', 40),
    teamLimit,
    minimumTeams: Math.max(2, Math.min(teamLimit, Number(body.minimumTeams || existing.minimumTeams || 4) || 4)),
    startAt: cleanText(body.startAt || existing.startAt || '', 40),
    status: allowed.has(String(body.status || existing.status || 'open')) ? String(body.status || existing.status || 'open') : 'open',
    description: cleanText(body.description || existing.description || '', 320),
    registrations: Array.isArray(existing.registrations) ? existing.registrations : [],
    updatedAt: new Date().toISOString(),
    createdAt: existing.createdAt || new Date().toISOString()
  };
}

function identity(user = {}) {
  return [user.id, user.discordId, user.name, user.profile?.username].map((v) => String(v || '').trim().toLowerCase()).filter(Boolean);
}

function canRepresent(user = {}, team = {}) {
  const ids = new Set(identity(user));
  if (String(team.ownerUserId || '') === String(user.id || '')) return true;
  const values = [
    ...(Array.isArray(team.players) ? team.players : []),
    ...(Array.isArray(team.reserves) ? team.reserves : []),
    ...(Array.isArray(team.playerAccounts?.players) ? team.playerAccounts.players : []),
    ...(Array.isArray(team.playerAccounts?.reserves) ? team.playerAccounts.reserves : [])
  ].map((v) => String(v || '').trim().toLowerCase());
  return values.some((value) => ids.has(value));
}

async function sendDiscordDm(discordId, content) {
  const token = process.env.DISCORD_TOKEN || '';
  if (!token || !discordId) return { sent: false, skipped: true };
  const dm = await fetch('https://discord.com/api/v10/users/@me/channels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bot ${token}` },
    body: JSON.stringify({ recipient_id: discordId })
  });
  const channel = await dm.json().catch(() => ({}));
  if (!dm.ok || !channel.id) return { sent: false, error: channel.message || `DM ${dm.status}` };
  const sent = await fetch(`https://discord.com/api/v10/channels/${channel.id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bot ${token}` },
    body: JSON.stringify({ content, allowed_mentions: { parse: [] } })
  });
  return { sent: sent.ok, error: sent.ok ? null : `Mensagem ${sent.status}` };
}

async function notifyCaptains(event, reason) {
  const botNotice = await callBot('/internal/events/notify-captains', {
    method: 'POST',
    body: JSON.stringify({ event, reason })
  }).catch((error) => ({ success: false, message: error.message }));
  if (botNotice.success) return botNotice;

  const [teams, users] = await Promise.all([storage.readTeams().catch(() => []), storage.readUsers().catch(() => [])]);
  const usersById = new Map(users.map((user) => [String(user.id || ''), user]));
  const ids = Array.from(new Set(teams.map((team) => usersById.get(String(team.ownerUserId || ''))?.discordId).filter(Boolean)));
  if (!ids.length) return { success: false, skipped: true, message: 'Nenhum capitao com Discord vinculado.' };

  const link = process.env.PUBLIC_SITE_URL || 'https://void-arena-site.onrender.com';
  const text = [
    `🏆 **Novo evento na Void Arena**`,
    `**${event.title || event.name || 'Evento'}** está disponível para inscrição.`,
    `Formato: ${event.matchFormat || 'MD1'} • Vagas: ${event.registeredCount || 0}/${event.teamLimit || '?'}`,
    event.startAt ? `Início: ${event.startAt}` : '',
    `${link}/pages/eventos.html`
  ].filter(Boolean).join('\n');

  const results = [];
  for (const id of ids) results.push({ discordId: id, ...(await sendDiscordDm(id, text).catch((error) => ({ sent: false, error: error.message }))) });
  return { success: results.some((item) => item.sent), fallback: true, attempted: results.length, sent: results.filter((item) => item.sent).length, results };
}

function registerPublicEventRoutes(app) {
  removeRoutes(app, [
    ['get', '/api/events'],
    ['post', '/api/events'],
    ['put', '/api/events/:eventId'],
    ['post', '/api/events/:eventId/register']
  ]);

  app.get('/api/events', async (_req, res) => {
    const [events, teams] = await Promise.all([storage.readEvents().catch(() => []), storage.readTeams().catch(() => [])]);
    return res.json({ success: true, events: events.map((event) => safeEvent(event, teams)) });
  });

  app.post('/api/events', requireOwner, async (req, res) => {
    try {
      const event = await storage.saveTournamentEvent(normalizeEvent(req.body || {}));
      const teams = await storage.readTeams().catch(() => []);
      const notice = await notifyCaptains(safeEvent(event, teams), 'created');
      return res.status(201).json({ success: true, event: safeEvent(event, teams), notice });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.put('/api/events/:eventId', requireOwner, async (req, res) => {
    try {
      const events = await storage.readEvents().catch(() => []);
      const existing = events.find((item) => String(item.id || '') === String(req.params.eventId || ''));
      if (!existing) return res.status(404).json({ success: false, message: 'Evento nao encontrado.' });
      const event = await storage.saveTournamentEvent(normalizeEvent({ ...(req.body || {}), id: existing.id }, existing));
      const teams = await storage.readTeams().catch(() => []);
      const notice = event.status === 'open' ? await notifyCaptains(safeEvent(event, teams), 'published') : { success: true, skipped: true };
      return res.json({ success: true, event: safeEvent(event, teams), notice });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.post('/api/events/:eventId/register', requireLogin, async (req, res) => {
    const [teams, user] = await Promise.all([storage.readTeams().catch(() => []), getSessionUser(req)]);
    const teamId = cleanText(req.body?.teamId || '', 80);
    const team = teams.find((item) => String(item.id || '') === teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Time nao encontrado para inscricao.' });
    if (!canRepresent(user, team)) return res.status(403).json({ success: false, message: 'Voce so pode inscrever um time que voce criou ou esta vinculado.' });
    try {
      const result = await storage.registerTeamInEvent(req.params.eventId, teamId, req.session.userId);
      const freshEvents = await storage.readEvents().catch(() => []);
      const event = freshEvents.find((item) => String(item.id || '') === String(req.params.eventId || '')) || result.event;
      return res.status(result.alreadyRegistered ? 200 : 201).json({ success: true, alreadyRegistered: Boolean(result.alreadyRegistered), registration: result.registration, event: safeEvent(event, teams) });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });
}

module.exports = { registerPublicEventRoutes };
