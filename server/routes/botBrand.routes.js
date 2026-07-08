const { fetchBotBrand, fetchGuildBrand } = require('../services/botApi.service');
const { removeRoutes } = require('../utils/expressRoutes');

const FALLBACK_ICON = '/assets/void-arena-current-logo.svg';

async function resolveVoidBrand() {
  const [botBrand, guildBrand] = await Promise.all([
    fetchBotBrand().catch(() => null),
    fetchGuildBrand().catch(() => null)
  ]);

  const bot = botBrand?.bot || null;
  const guild = botBrand?.guild || guildBrand || null;
  const icon = bot?.avatar || guild?.icon || FALLBACK_ICON;
  const name = guild?.name || bot?.name || 'Hollow Nexus';

  return { bot, guild, icon, name };
}

function registerBotBrandRoutes(app) {
  removeRoutes(app, [
    ['get', '/api/brand/server'],
    ['get', '/api/bot'],
    ['get', '/api/bot/avatar']
  ]);

  app.get('/api/brand/server', async (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const brand = await resolveVoidBrand();
    return res.json({
      success: true,
      server: {
        id: brand.guild?.id || brand.bot?.id || null,
        name: brand.name,
        icon: brand.icon,
        fallbackIcon: FALLBACK_ICON,
        source: brand.bot?.avatar ? 'bot-profile' : brand.guild?.icon ? 'guild-profile' : 'fallback'
      },
      bot: brand.bot,
      guild: brand.guild,
      fetchedAt: new Date().toISOString()
    });
  });

  app.get('/api/bot', async (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const brand = await resolveVoidBrand();
    return res.json({
      success: true,
      online: Boolean(brand.bot || brand.guild),
      name: brand.name,
      displayName: brand.name,
      serverName: brand.name,
      guildName: brand.name,
      applicationName: brand.bot?.name || null,
      username: brand.bot?.username || brand.bot?.name || 'Void Arena',
      tag: brand.bot?.tag || brand.name,
      id: brand.bot?.id || brand.guild?.id || null,
      guildId: brand.guild?.id || null,
      guilds: brand.guild ? 1 : 0,
      avatar: brand.icon,
      guildIcon: brand.guild?.icon || null,
      botAvatar: brand.bot?.avatar || null,
      fetchedAt: new Date().toISOString()
    });
  });

  app.get('/api/bot/avatar', async (_req, res) => {
    const brand = await resolveVoidBrand();
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    if (/^https?:\/\//i.test(brand.icon)) return res.redirect(brand.icon);
    return res.redirect(FALLBACK_ICON);
  });
}

module.exports = { registerBotBrandRoutes };
