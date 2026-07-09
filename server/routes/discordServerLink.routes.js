const { callBot } = require('../services/botApi.service');
const { removeRoutes } = require('../utils/expressRoutes');

function clean(value = '') {
  return String(value || '').trim();
}

function configuredDiscordUrl() {
  return clean(
    process.env.DISCORD_SERVER_URL ||
    process.env.DISCORD_INVITE_URL ||
    process.env.DISCORD_GUILD_INVITE_URL ||
    process.env.SERVER_DISCORD_URL ||
    process.env.PUBLIC_DISCORD_URL ||
    ''
  );
}

function safeDiscordUrl(value = '') {
  const raw = clean(value);
  if (!raw) return '';
  if (/^https:\/\/(discord\.gg|discord\.com\/invite)\//i.test(raw)) return raw;
  if (/^https:\/\/discord\.com\/channels\/\d{16,22}(?:\/\d{16,22})?/i.test(raw)) return raw;
  if (/^(discord\.gg|discord\.com\/invite)\//i.test(raw)) return `https://${raw}`;
  return '';
}

async function resolveDiscordServerLink() {
  const configured = safeDiscordUrl(configuredDiscordUrl());
  if (configured) return { url: configured, source: 'env' };

  const data = await callBot('/public/guild-brand', { method: 'GET' }).catch(() => null);
  const guildId = clean(data?.guild?.id || '');

  if (guildId) {
    return { url: `https://discord.com/channels/${guildId}`, source: 'guild-id' };
  }

  return { url: '', source: 'missing' };
}

function registerDiscordServerLinkRoutes(app) {
  removeRoutes(app, [
    ['get', '/api/discord/server-link'],
    ['get', '/api/discord/server/open']
  ]);

  app.get('/api/discord/server-link', async (_req, res) => {
    const link = await resolveDiscordServerLink();
    if (!link.url) return res.status(404).json({ success: false, message: 'Link do servidor Discord não configurado.' });
    return res.json({ success: true, ...link });
  });

  app.get('/api/discord/server/open', async (_req, res) => {
    const link = await resolveDiscordServerLink();
    if (!link.url) return res.status(404).send('Link do servidor Discord não configurado.');
    return res.redirect(link.url);
  });
}

module.exports = { registerDiscordServerLinkRoutes };
