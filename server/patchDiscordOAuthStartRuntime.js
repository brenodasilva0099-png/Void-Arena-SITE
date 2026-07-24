const fs = require('node:fs');
const path = require('node:path');

const AUTH_FILE = path.join(__dirname, 'routes', 'discordAuthStable.routes.js');
const MARKER = 'hnl-discord-oauth-start-v2';

if (!fs.existsSync(AUTH_FILE)) {
  console.warn('[Discord/Auth] Rota estável não encontrada para corrigir o início do OAuth.');
  module.exports = {};
} else {
  let source = fs.readFileSync(AUTH_FILE, 'utf8');

  if (!source.includes(MARKER)) {
    const startAnchor = "  app.get('/auth/discord', async (req, res) => {";
    const callbackAnchor = "  app.get('/auth/discord/callback', async (req, res) => {";
    const startIndex = source.indexOf(startAnchor);
    const callbackIndex = source.indexOf(callbackAnchor, startIndex + startAnchor.length);

    if (startIndex < 0 || callbackIndex <= startIndex) {
      throw new Error('[Discord/Auth] Não foi possível localizar as rotas de início e callback do Discord.');
    }

    const route = `  app.get('/auth/discord', async (req, res) => {
    const oauthBuild = '${MARKER}';
    const { clientId } = discordCredentials();
    const next = safeNext(req.query.next || req.query.redirect || '/pages/perfil.html');

    // Um cookie assinado antigo não significa que o usuário ainda existe no storage.
    // Antes de pular o OAuth, valide a conta com um limite curto para não travar a rota.
    const currentUserId = resolveSessionUserId(req);
    if (currentUserId) {
      let currentUser = null;
      try {
        currentUser = await Promise.race([
          findUserById(currentUserId),
          new Promise((resolve) => setTimeout(() => resolve(null), 2500))
        ]);
      } catch {}

      if (currentUser) return res.redirect(303, next);

      if (req.session) {
        delete req.session.userId;
        delete req.session.cachedDiscordUser;
        delete req.session.pendingDiscordUser;
        delete req.session.authenticatedAt;
      }
      res.clearCookie(SESSION_COOKIE, { path: '/' });
      res.clearCookie(AUTH_COOKIE, { path: '/' });
      console.warn('[Discord/Auth] Sessão antiga removida antes de iniciar novo OAuth.', { build: oauthBuild });
    }

    if (!clientId) {
      return res.redirect(303, \`/pages/login.html?auth=discord_not_configured&next=\${encodeURIComponent(next)}\`);
    }

    const state = signPayload({
      userId: 'oauth-state',
      next,
      exp: Date.now() + 1000 * 60 * 10,
      nonce: crypto.randomBytes(12).toString('hex')
    });

    if (req.session) {
      req.session.oauthReturnTo = next;
      req.session.oauthState = state;
      await new Promise((resolve) => req.session.save(() => resolve()));
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl(),
      response_type: 'code',
      scope: 'identify email',
      state,
      prompt: 'consent'
    });

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res.redirect(302, \`https://discord.com/oauth2/authorize?\${params.toString()}\`);
  });

`;

    source = source.slice(0, startIndex) + route + source.slice(callbackIndex);

    try {
      new Function(source);
    } catch (error) {
      throw new Error(`[Discord/Auth] Correção da rota inicial gerou JavaScript inválido: ${error.message}`);
    }

    fs.writeFileSync(AUTH_FILE, source, 'utf8');
    console.log('[Discord/Auth] Início do OAuth agora valida e limpa sessões antigas.');
  } else {
    console.log('[Discord/Auth] Início robusto do OAuth já estava aplicado.');
  }
}
