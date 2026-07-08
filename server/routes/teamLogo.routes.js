const storage = require('../storage');
const { normalizeTeamLogo, svgFallback } = require('../services/teamLogo.service');

function sendSvgFallback(res, team = {}) {
  res.status(200);
  res.set('Content-Type', 'image/svg+xml; charset=utf-8');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  return res.send(svgFallback(team));
}

function sendDataImage(res, source = '') {
  const match = String(source || '').match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) return false;
  const [, mime, data] = match;
  const buffer = Buffer.from(data, 'base64');
  res.status(200);
  res.set('Content-Type', mime);
  res.set('Cache-Control', 'public, max-age=86400');
  res.set('Content-Length', String(buffer.length));
  res.send(buffer);
  return true;
}

async function proxyRemoteImage(res, source = '', team = {}) {
  try {
    const upstream = await fetch(source, {
      headers: {
        'User-Agent': 'Void-Arena-Team-Logo-Proxy/1.0',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });

    if (!upstream.ok) return sendSvgFallback(res, team);

    const contentType = upstream.headers.get('content-type') || 'image/png';
    if (!String(contentType).toLowerCase().startsWith('image/')) return sendSvgFallback(res, team);

    const arrayBuffer = await upstream.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.status(200);
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=300');
    res.set('Content-Length', String(buffer.length));
    return res.send(buffer);
  } catch {
    return sendSvgFallback(res, team);
  }
}

function registerTeamLogoRoutes(app) {
  app.get('/api/team-logo/:teamId', async (req, res) => {
    const teams = await storage.readTeams().catch(() => []);
    const team = teams.find((item) => String(item.id || '') === String(req.params.teamId || '')) || null;
    if (!team) return sendSvgFallback(res, { name: 'Time', tag: 'TM' });

    const logo = normalizeTeamLogo(team);
    if (!logo) return sendSvgFallback(res, team);
    if (String(logo).startsWith('data:image/')) return sendDataImage(res, logo) || sendSvgFallback(res, team);
    if (String(logo).startsWith('/')) return res.redirect(logo);
    return proxyRemoteImage(res, logo, team);
  });
}

module.exports = { registerTeamLogoRoutes };
