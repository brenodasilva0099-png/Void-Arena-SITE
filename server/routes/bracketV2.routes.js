const storage = require('../storage');
const { requireOwner } = require('../services/access.service');
const { callBot } = require('../services/botApi.service');
const { normalizeTeamLimit, normalizeBracketForResponse, generateAdaptiveBracket, generateGroups } = require('../services/bracket.service');

let lastQuickSettings = {};
function safeStructure(value = '') { const allowed = new Set(['single_elimination', 'groups', 'groups_playoffs']); return allowed.has(String(value)) ? String(value) : 'single_elimination'; }
function safeFormat(value = '') { const allowed = new Set(['MD1', 'MD2', 'MD3', 'MD5']); return allowed.has(String(value)) ? String(value) : 'MD1'; }
function safeTeamSource(value = '') { return String(value || '').trim() === 'registered' ? 'registered' : 'all'; }
async function syncResultHubs(bracket, settings) { return callBot('/internal/results/sync-hubs', { method: 'POST', body: JSON.stringify({ bracket, settings, source: 'site-bracket-v2-routes' }) }).catch((error) => ({ success: false, message: error.message, created: 0, reused: 0, errors: [{ message: error.message }] })); }
function normalizeSettingsPayload(body = {}, current = {}) { return { ...current, activeEventId: String(body.activeEventId ?? current.activeEventId ?? '').trim(), teamSource: safeTeamSource(body.teamSource || current.teamSource), tournamentName: String(body.tournamentName || current.tournamentName || 'Rematch Championship').trim().slice(0, 60), matchFormat: safeFormat(body.matchFormat || current.matchFormat), structure: safeStructure(body.structure || current.structure), teamLimit: normalizeTeamLimit(body.teamLimit || current.teamLimit || 16), groupCount: [2, 4, 5, 6, 7, 8].includes(Number(body.groupCount || current.groupCount)) ? Number(body.groupCount || current.groupCount) : 4, autoCreateMatchChannels: body.autoCreateMatchChannels !== false, discordMatchCategoryId: String(body.discordMatchCategoryId || current.discordMatchCategoryId || '').trim() }; }
function eventRegisteredTeamIds(event = {}) { return new Set((Array.isArray(event.registrations) ? event.registrations : []).filter((registration) => !['rejected', 'cancelled'].includes(String(registration.status || '').toLowerCase())).map((registration) => String(registration.teamId || '').trim()).filter(Boolean)); }
function sourceTeamsForSettings(teams = [], events = [], settings = {}) { const activeEvent = events.find((event) => String(event.id || '') === String(settings.activeEventId || '')) || null; if (!activeEvent || safeTeamSource(settings.teamSource) !== 'registered') return { activeEvent, sourceTeams: teams, sourceLabel: 'todos os times cadastrados' }; const registeredIds = eventRegisteredTeamIds(activeEvent); return { activeEvent, sourceTeams: teams.filter((team) => registeredIds.has(String(team.id || ''))), sourceLabel: 'times inscritos/aprovados no evento' }; }

function registerBracketV2Routes(app) {
  app.put('/api/tournament/settings-v2', requireOwner, async (req, res) => {
    try {
      const current = await storage.readTournamentSettings().catch(() => ({}));
      const payload = normalizeSettingsPayload(req.body || {}, { ...current, ...lastQuickSettings });
      const saved = await storage.writeTournamentSettings(payload);
      lastQuickSettings = { ...payload };
      return res.json({ success: true, settings: { ...saved, activeEventId: payload.activeEventId, teamSource: payload.teamSource } });
    } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
  });

  app.post('/api/bracket/generate-v2', requireOwner, async (req, res) => {
    try {
      const [teams, users, storedSettings, events] = await Promise.all([storage.readTeams(), storage.readUsers(), storage.readTournamentSettings().catch(() => ({})), storage.readEvents().catch(() => [])]);
      const settings = normalizeSettingsPayload(req.body && Object.keys(req.body).length ? req.body : lastQuickSettings, { ...storedSettings, ...lastQuickSettings });
      const limit = normalizeTeamLimit(settings.teamLimit || 16);
      const source = sourceTeamsForSettings(teams, events, settings);
      const selectedTeams = source.sourceTeams.slice(0, limit);
      if (!teams.length) return res.status(400).json({ success: false, message: 'Cadastre pelo menos um time antes de gerar.' });
      if (!selectedTeams.length) return res.status(400).json({ success: false, message: `Nenhum time encontrado usando ${source.sourceLabel}.` });
      const groups = generateGroups(selectedTeams, settings);
      const generated = generateAdaptiveBracket(selectedTeams, limit);
      const bracket = await storage.writeBracket({ slotSize: generated.slotSize, teamLimit: limit, eventId: settings.activeEventId || '', teamSource: safeTeamSource(settings.teamSource), slots: generated.slots, round16: generated.round16, quarters: [], semis: [], finals: [], matchProgress: {}, generatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      const resultHubs = await syncResultHubs(bracket, settings);
      lastQuickSettings = { ...settings };
      return res.json({ success: true, bracket: normalizeBracketForResponse(bracket, teams, users), groups, resultHubs, sourceLabel: source.sourceLabel, settings: { ...settings, teamLimit: limit, teamSource: safeTeamSource(settings.teamSource) } });
    } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
  });
}
module.exports = { registerBracketV2Routes };
