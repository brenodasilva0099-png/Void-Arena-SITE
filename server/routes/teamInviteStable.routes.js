const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const storage = require('../storage');
const { getSessionUser, isAdminRecord } = require('../services/access.service');
const { canManageTeam } = require('../services/teamAccess.service');
const { removeRoutes } = require('../utils/expressRoutes');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const SCRIPT_FILE = path.join(PUBLIC_DIR, 'js', 'core', 'team-invite-stable.js');

function requireLogin(req, res, next) {
  if (!req.session?.userId && !req.session?.discordId && !req.session?.discordUser?.id) {
    return res.status(401).json({ success: false, message: 'Faça login com o Discord para continuar.' });
  }
  return next();
}

function clean(value = '', max = 180) {
  return String(value || '').trim().slice(0, max);
}

function normalizeIdentity(value = '') {
  return clean(value, 180).replace(/^<@!?/, '').replace(/>$/, '').toLowerCase();
}

function userIdentities(user = {}) {
  return new Set([
    user.id,
    user.discordId,
    user.name,
    user.discordTag,
    user.profile?.username
  ].map(normalizeIdentity).filter(Boolean));
}

function teamRosterIdentityValues(team = {}) {
  return [
    ...(Array.isArray(team.players) ? team.players : []),
    ...(Array.isArray(team.reserves) ? team.reserves : []),
    ...(Array.isArray(team.playerAccounts?.players) ? team.playerAccounts.players : []),
    ...(Array.isArray(team.playerAccounts?.reserves) ? team.playerAccounts.reserves : []),
    ...(Array.isArray(team.playerDetails)
      ? team.playerDetails.flatMap((item) => [item?.id, item?.userId, item?.discordId, item?.account, item?.name])
      : []),
    ...(Array.isArray(team.reserveDetails)
      ? team.reserveDetails.flatMap((item) => [item?.id, item?.userId, item?.discordId, item?.account, item?.name])
      : [])
  ].map(normalizeIdentity).filter(Boolean);
}

function teamLeadershipIdentityValues(team = {}) {
  return [
    team.ownerUserId,
    team.ownerDiscordId,
    team.ownerName,
    team.directorUserId,
    team.directorDiscordId,
    team.directorName,
    team.captainUserId,
    team.captainDiscordId,
    team.captainName
  ].map(normalizeIdentity).filter(Boolean);
}

function teamRosterContainsUser(team = {}, user = {}) {
  const identities = userIdentities(user);
  return teamRosterIdentityValues(team).some((value) => identities.has(value));
}

function teamContainsUser(team = {}, user = {}) {
  const identities = userIdentities(user);
  return [
    ...teamLeadershipIdentityValues(team),
    ...teamRosterIdentityValues(team)
  ].some((value) => identities.has(value));
}

function inviteHash(token = '') {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function validInvites(team = {}) {
  const now = Date.now();
  return (Array.isArray(team.joinInvites) ? team.joinInvites : [])
    .filter((invite) => {
      if (!invite?.tokenHash) return false;
      const expiresAt = Date.parse(invite.expiresAt || 0);
      return invite.status !== 'expired' && (!Number.isFinite(expiresAt) || expiresAt > now - 7 * 24 * 60 * 60 * 1000);
    })
    .slice(-30);
}

function findInvite(teams = [], token = '') {
  const tokenHash = inviteHash(token);
  for (const team of teams) {
    const invite = validInvites(team).find((item) => item.tokenHash === tokenHash);
    if (invite) return { team, invite, tokenHash };
  }
  return null;
}

function addUserToTeam(team = {}, user = {}, rosterSlot = 'player') {
  // Liderança e elenco são vínculos diferentes. Um criador, diretor ou
  // capitão que não esteja escalado ainda precisa poder aceitar o convite
  // para entrar como titular/reserva.
  if (teamRosterContainsUser(team, user)) return { team, added: false };

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

  const name = clean(user.profile?.username || user.name || user.discordTag || 'Jogador', 80);
  const account = clean(user.discordId || user.id || '', 80);
  const detail = {
    id: clean(user.id || '', 80),
    userId: clean(user.id || '', 80),
    discordId: clean(user.discordId || '', 40),
    account,
    name,
    role: rosterSlot === 'reserve' ? 'Reserva' : 'Titular'
  };

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
  return { team: next, added: true };
}

function registerStableTeamInviteRoutes(app) {
  removeRoutes(app, [
    ['post', '/api/teams/:teamId/invite-link'],
    ['get', '/api/team-invites/:token'],
    ['post', '/api/team-invites/:token/accept'],
    ['post', '/api/team-invites/:token/reject'],
    ['get', '/js/core/team-invite-stable.js']
  ]);

  app.get('/js/core/team-invite-stable.js', (_req, res) => {
    fs.readFile(SCRIPT_FILE, (error, data) => {
      if (error) return res.status(404).type('text/plain; charset=utf-8').send('Script de convite não encontrado.');
      res.status(200);
      res.set('Content-Type', 'application/javascript; charset=utf-8');
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('X-HNL-Team-Invite', 'stable-v1');
      res.set('Content-Length', String(data.length));
      return res.end(data);
    });
  });

  app.post('/api/teams/:teamId/invite-link', requireLogin, async (req, res) => {
    try {
      const [user, teams] = await Promise.all([
        getSessionUser(req),
        storage.readTeams().catch(() => [])
      ]);
      if (!user) return res.status(401).json({ success: false, message: 'Sessão do Discord não encontrada.' });

      const team = teams.find((item) => String(item.id || '') === String(req.params.teamId || ''));
      if (!team) return res.status(404).json({ success: false, message: 'Time não encontrado.' });

      const isAdmin = await isAdminRecord(user).catch(() => false);
      if (!isAdmin && !canManageTeam(user, team)) {
        return res.status(403).json({ success: false, message: 'Apenas dono, diretor ou capitão pode gerar o link.' });
      }

      const rosterSlot = String(req.body?.rosterSlot || 'player').toLowerCase() === 'reserve' ? 'reserve' : 'player';
      const token = crypto.randomBytes(24).toString('hex');
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      const invite = {
        id: `teaminvite_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
        tokenHash: inviteHash(token),
        rosterSlot,
        note: clean(req.body?.note || '', 500),
        status: 'pending',
        reusable: true,
        useCount: 0,
        acceptedUsers: [],
        rejectedUsers: [],
        createdBy: user.id || '',
        createdByDiscordId: user.discordId || '',
        createdAt: now.toISOString(),
        expiresAt
      };

      const saved = await storage.saveTeam({
        ...team,
        joinInvites: [...validInvites(team).filter((item) => item.status === 'pending'), invite].slice(-20),
        updatedAt: now.toISOString()
      });

      const siteUrl = String(
        process.env.SITE_PUBLIC_URL ||
        process.env.PUBLIC_SITE_URL ||
        `${req.protocol}://${req.get('host')}`
      ).replace(/\/$/, '');

      return res.json({
        success: true,
        message: 'Link reutilizável criado.',
        reusable: true,
        inviteUrl: `${siteUrl}/pages/convite-time.html?token=${encodeURIComponent(token)}`,
        expiresAt,
        teamId: saved.id,
        rosterSlot
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.get('/api/team-invites/:token', requireLogin, async (req, res) => {
    try {
      const teams = await storage.readTeams().catch(() => []);
      const match = findInvite(teams, req.params.token || '');
      if (!match) return res.status(404).json({ success: false, message: 'Convite inválido ou não encontrado.' });

      const expiresAt = Date.parse(match.invite.expiresAt || 0);
      if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
        return res.status(410).json({ success: false, message: 'Este convite expirou.' });
      }

      return res.json({
        success: true,
        invite: {
          rosterSlot: match.invite.rosterSlot,
          note: match.invite.note || '',
          expiresAt: match.invite.expiresAt,
          reusable: true,
          useCount: Number(match.invite.useCount || 0)
        },
        team: {
          id: match.team.id,
          name: match.team.name,
          tag: match.team.tag,
          logo: match.team.logo || match.team.logoUrl || match.team.badge || ''
        }
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.post('/api/team-invites/:token/accept', requireLogin, async (req, res) => {
    try {
      const [user, teams] = await Promise.all([
        getSessionUser(req),
        storage.readTeams().catch(() => [])
      ]);
      if (!user) return res.status(401).json({ success: false, message: 'Sessão do Discord não encontrada.' });

      const match = findInvite(teams, req.params.token || '');
      if (!match) return res.status(404).json({ success: false, message: 'Convite inválido ou não encontrado.' });

      const expiresAt = Date.parse(match.invite.expiresAt || 0);
      if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
        return res.status(410).json({ success: false, message: 'Este convite expirou.' });
      }

      const currentTeam = teams.find((item) => teamContainsUser(item, user));
      if (currentTeam && String(currentTeam.id) !== String(match.team.id)) {
        return res.status(409).json({ success: false, message: `Você já pertence ao clube ${currentTeam.name || 'atual'}.` });
      }

      const result = addUserToTeam(match.team, user, match.invite.rosterSlot);
      const acceptedIdentity = clean(user.discordId || user.id || '', 80);
      const updated = {
        ...result.team,
        joinInvites: validInvites(result.team).map((item) => item.tokenHash === match.tokenHash ? {
          ...item,
          status: 'pending',
          reusable: true,
          useCount: Number(item.useCount || 0) + (result.added ? 1 : 0),
          acceptedUsers: Array.from(new Set([
            ...(Array.isArray(item.acceptedUsers) ? item.acceptedUsers : []),
            acceptedIdentity
          ].filter(Boolean))).slice(-100),
          lastUsedAt: new Date().toISOString()
        } : item),
        updatedAt: new Date().toISOString()
      };

      const saved = await storage.saveTeam(updated);
      return res.json({
        success: true,
        message: result.added ? 'Você entrou no elenco.' : 'Você já fazia parte deste clube.',
        team: { id: saved.id, name: saved.name, tag: saved.tag }
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  app.post('/api/team-invites/:token/reject', requireLogin, async (req, res) => {
    try {
      const [user, teams] = await Promise.all([
        getSessionUser(req),
        storage.readTeams().catch(() => [])
      ]);
      if (!user) return res.status(401).json({ success: false, message: 'Sessão do Discord não encontrada.' });

      const match = findInvite(teams, req.params.token || '');
      if (!match) return res.status(404).json({ success: false, message: 'Convite inválido ou não encontrado.' });

      const rejectedIdentity = clean(user.discordId || user.id || '', 80);
      const updated = {
        ...match.team,
        joinInvites: validInvites(match.team).map((item) => item.tokenHash === match.tokenHash ? {
          ...item,
          status: 'pending',
          reusable: true,
          rejectedUsers: Array.from(new Set([
            ...(Array.isArray(item.rejectedUsers) ? item.rejectedUsers : []),
            rejectedIdentity
          ].filter(Boolean))).slice(-100),
          lastRejectedAt: new Date().toISOString()
        } : item),
        updatedAt: new Date().toISOString()
      };

      await storage.saveTeam(updated);
      return res.json({ success: true, message: 'Você recusou este convite. O link continua ativo para outros jogadores.' });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  console.log('[Times/Invite Stable] Rotas diretas de convite reutilizável registradas.');
}

module.exports = { registerStableTeamInviteRoutes };
