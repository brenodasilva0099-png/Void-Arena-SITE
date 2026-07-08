const storage = require('../storage');
const { normalizeTeamLogo } = require('../services/teamLogo.service');

function sendNoLogo(res) {
  res.status(404);
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  return res.end();
}

function sendDataImage(res, source = '') {
  const match = String(source || '').match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) return false;
  const [, mime, data] = match;
  try {
    const buffer = Buffer.from(data, 'base64');
    res.status(200);
    res.set('Content-Type', mime);
    res.set('Cache-Control', 'public, max-age=86400');
    res.set('Content-Length', String(buffer.length));
    res.send(buffer);
    return true;
  } catch {
    return false;
  }
}

function registerTeamLogoRoutes(app) {
  app.get('/api/team-logo/:teamId', async (req, res) => {
    try {
      const teams = await storage.readTeams().catch(() => []);
      const team = teams.find((item) => String(item.id || '') === String(req.params.teamId || '')) || null;
      if (!team) return sendNoLogo(res);

      const logo = normalizeTeamLogo(team);
      if (!logo) return sendNoLogo(res);
      if (String(logo).startsWith('data:image/')) return sendDataImage(res, logo) ? undefined : sendNoLogo(res);
      if (/^https?:\/\//i.test(String(logo)) || String(logo).startsWith('/')) return res.redirect(302, logo);
      return sendNoLogo(res);
    } catch {
      return sendNoLogo(res);
    }
  });
}

module.exports = { registerTeamLogoRoutes };
