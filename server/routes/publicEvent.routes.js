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

async function notifyCaptains(event, reason) {
  return callBot('/internal/events/notify-captains', {
    method: 'POST',
    body: JSON.stringify({ event, reason })
  }).catch((error) => ({ success: false, message: error.message, skipped: true }));
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
