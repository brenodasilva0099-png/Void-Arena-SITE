const storage = require('../storage');

function requireSession(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Faça login para continuar.' });
  return next();
}

function clean(value = '', max = 500) { return String(value || '').trim().slice(0, max); }
function normalizeSocials(raw = {}) {
  return {
    site: clean(raw.site, 180), discord: clean(raw.discord, 180), instagram: clean(raw.instagram, 180), twitch: clean(raw.twitch, 180),
    tiktok: clean(raw.tiktok, 180), youtube: clean(raw.youtube, 180), twitter: clean(raw.twitter, 180), steam: clean(raw.steam, 180),
    xbox: clean(raw.xbox, 180), spotify: clean(raw.spotify, 240), riot: clean(raw.riot, 160), ea: clean(raw.ea, 160), psn: clean(raw.psn, 160)
  };
}
function normalizeProfile(raw = {}) {
  return {
    username: clean(raw.username, 60), realName: clean(raw.realName, 80), country: clean(raw.country, 80), region: clean(raw.region, 80),
    timezone: clean(raw.timezone, 80), primaryPosition: clean(raw.primaryPosition, 60), secondaryPosition: clean(raw.secondaryPosition, 60),
    competitiveRegion: clean(raw.competitiveRegion || raw.region, 80), banner: clean(raw.banner, 1200), discordBanner: clean(raw.discordBanner, 1200),
    bannerSource: clean(raw.bannerSource, 40), bio: clean(raw.bio, 220), steamId: clean(raw.steamId, 80), xboxGamertag: clean(raw.xboxGamertag, 80)
  };
}
function publicUser(user = {}) { return { id: user.id || '', name: user.name || '', discordId: user.discordId || '', avatar: user.avatar || '', profile: normalizeProfile(user.profile || {}), socials: normalizeSocials(user.socials || {}), createdAt: user.createdAt || null, updatedAt: user.updatedAt || null }; }
function playerMatchesUser(player = {}, user = {}) {
  const ids = [user.id, user.discordId, user.name, user.profile?.username].map((v) => String(v || '').trim().toLowerCase()).filter(Boolean);
  return ids.includes(String(player.id || '').trim().toLowerCase()) || ids.includes(String(player.discordId || '').trim().toLowerCase()) || ids.includes(String(player.name || '').trim().toLowerCase());
}
function findCurrentTeam(teams = [], user = {}) {
  return teams.find((team) => String(team.ownerUserId || '') === String(user.id || '')) || teams.find((team) => {
    const details = [...(Array.isArray(team.playerDetails) ? team.playerDetails : []), ...(Array.isArray(team.reserveDetails) ? team.reserveDetails : [])];
    return details.some((player) => playerMatchesUser(player, user));
  }) || null;
}
function buildStats(user = {}, team = null) {
  const base = user.playerStats || user.stats || {};
  const played = Number(base.played || base.matches || 0) || 0;
  const wins = Number(base.wins || 0) || 0;
  const losses = Number(base.losses || 0) || 0;
  const goals = Number(base.goals || 0) || 0;
  const assists = Number(base.assists || 0) || 0;
  const passes = Number(base.passes || 0) || 0;
  const interceptions = Number(base.interceptions || 0) || 0;
  const defenses = Number(base.defenses || 0) || 0;
  const mvp = Number(base.mvp || 0) || 0;
  const points = Number(base.points || base.vap || 0) || 0;
  return { played, wins, losses, winRate: played ? Math.round((wins / played) * 100) : 0, goals, assists, passes, interceptions, defenses, points, mvp, teamId: team?.id || '', teamName: team?.name || '' };
}

function registerProfileV2Routes(app) {
  app.get('/api/me/profile-v2', requireSession, async (req, res) => {
    const [user, teams] = await Promise.all([storage.findUserById(req.session.userId), storage.readTeams().catch(() => [])]);
    if (!user) return res.status(401).json({ success: false, message: 'Sessão inválida.' });
    const team = findCurrentTeam(teams, user);
    return res.json({ success: true, user: publicUser(user), currentTeam: team || null, stats: buildStats(user, team) });
  });

  app.put('/api/me/profile-v2', requireSession, async (req, res) => {
    const user = await storage.findUserById(req.session.userId);
    if (!user) return res.status(401).json({ success: false, message: 'Sessão inválida.' });
    const profilePayload = req.body?.profile && typeof req.body.profile === 'object' ? req.body.profile : {};
    const socialsPayload = req.body?.socials && typeof req.body.socials === 'object' ? req.body.socials : {};
    const saved = await storage.saveUser({
      ...user,
      profile: normalizeProfile({ ...(user.profile || {}), ...profilePayload }),
      socials: normalizeSocials({ ...(user.socials || {}), ...socialsPayload }),
      updatedAt: new Date().toISOString()
    });
    const teams = await storage.readTeams().catch(() => []);
    const team = findCurrentTeam(teams, saved);
    return res.json({ success: true, user: publicUser(saved), currentTeam: team || null, stats: buildStats(saved, team) });
  });
}

module.exports = { registerProfileV2Routes };
