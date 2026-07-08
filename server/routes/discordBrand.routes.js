const { fetchGuildBrand } = require('../services/botApi.service');
const { removeRoutes } = require('../utils/expressRoutes');

const FALLBACK_ICON = '/assets/hollow-nexus.png';

async function resolveDiscordBrand() {
  const guild = await fetchGuildBrand().catch(() => null);
  const icon = guild?.icon || FALLBACK_ICON;
  const name = guild?.name || 'Hollow Nexus';
  return { guild, icon, name };
}

function registerDiscordBrandRoutes(app) {
  removeRoutes(app, [
    ['get', '/api/brand/server'],
    ['get', '/api/brand/icon'],
    ['get', '/api/bot']
  ]);

  app.get('/api/brand/server', async (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const brand = await resolveDiscordBrand();
    return res.json({
      success: true,
      server: {
        id: brand.guild?.id || null,
        name: brand.name,
        icon: brand.icon,
        fallbackIcon: FALLBACK_ICON,
        source: brand.guild?.icon ? 'discord-server' : 'fallback'
      },
      fetchedAt: new Date().toISOString()
    });
  });

  app.get('/api/brand/icon', async (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const brand = await resolveDiscordBrand();
    return res.redirect(brand.icon || FALLBACK_ICON);
  });

  app.get('/api/bot', async (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const brand = await resolveDiscordBrand();
    return res.json({
      success: true,
      online: Boolean(brand.guild),
      name: brand.name,
      displayName: brand.name,
      serverName: brand.name,
      guildName: brand.name,
      username: 'Void Arena',
      tag: brand.name,
      id: brand.guild?.id || null,
      guildId: brand.guild?.id || null,
      guilds: brand.guild ? 1 : 0,
      avatar: brand.icon,
      guildIcon: brand.guild?.icon || null,
      fetchedAt: new Date().toISOString()
    });
  });
}

module.exports = { registerDiscordBrandRoutes };
