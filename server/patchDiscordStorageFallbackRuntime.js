const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const AUTH_FILE = path.join(__dirname, 'routes', 'discordAuthStable.routes.js');
const UPDATES_FILE = path.join(ROOT, 'public', 'pages', 'atualizacoes.html');
const VERSION_FILE = path.join(ROOT, 'public', 'discord-storage-fallback.json');
const BUILD = '2026-07-18-discord-storage-fallback-v1';
let changed = false;

function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (read(file) !== content) {
    fs.writeFileSync(file, content, 'utf8');
    changed = true;
  }
}

function patchAuthRoute() {
  let src = read(AUTH_FILE);
  if (!src || src.includes('function pendingDiscordUserFromProfile')) return;

  const helpers = `
function pendingDiscordUserFromProfile(profile = {}) {
  const email = profile.email ? clean(profile.email).toLowerCase() : '';
  const username = clean(profile.global_name || profile.username || 'Discord');
  const discordTag = profile.discriminator && profile.discriminator !== '0'
    ? \`${'${profile.username || username}'}#${'${profile.discriminator}'}\`
    : clean(profile.username || username);
  return safeUser({
    id: null,
    name: username || discordTag,
    email: email || null,
    avatar: discordAvatarUrl(profile, 256),
    provider: 'discord',
    discordId: profile.id,
    discordTag,
    profile: { username: username || discordTag, discord: discordTag },
    socials: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

async function syncPendingDiscordUser(pending = {}) {
  let user = pending.discordId ? await findUserByDiscordId(pending.discordId) : null;
  if (!user && pending.email) user = await findUserByEmail(pending.email);
  return saveUser({
    ...(user || {}),
    id: user?.id || crypto.randomUUID(),
    name: pending.name || user?.name || pending.discordTag || 'Discord',
    email: pending.email || user?.email || null,
    avatar: pending.avatar || user?.avatar || null,
    provider: 'discord',
    discordId: pending.discordId || user?.discordId || null,
    discordTag: pending.discordTag || user?.discordTag || null,
    socials: user?.socials || pending.socials || {},
    profile: { ...(user?.profile || {}), ...(pending.profile || {}) },
    createdAt: user?.createdAt || pending.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}
`;

  src = src.replace('\nfunction registerStableDiscordAuthRoutes(app) {', helpers + '\nfunction registerStableDiscordAuthRoutes(app) {');

  const oldSession = `  app.get('/api/auth/session', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const userId = resolveSessionUserId(req);
    if (!userId) return res.json({ success: true, authenticated: false, user: null });

    try {
      const user = await findUserById(userId);
      if (!user) return res.json({ success: true, authenticated: false, pending: true, user: null });
      if (req.session && !req.session.userId) req.session.userId = user.id;
      setPersistentAuthCookies(req, res, user.id);
      return res.json({ success: true, authenticated: true, user: safeUser(user) });
    } catch (error) {
      return res.json({ success: true, authenticated: false, pending: true, user: null, message: error.message });
    }
  });`;

  const newSession = `  app.get('/api/auth/session', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    let userId = resolveSessionUserId(req);
    const pending = req.session?.pendingDiscordUser || null;

    if (!userId && pending) {
      try {
        const user = await syncPendingDiscordUser(pending);
        req.session.cachedDiscordUser = safeUser(user);
        delete req.session.pendingDiscordUser;
        await saveSession(req, user.id);
        setPersistentAuthCookies(req, res, user.id);
        return res.json({ success: true, authenticated: true, pendingSync: false, storageAvailable: true, user: safeUser(user) });
      } catch (error) {
        return res.json({
          success: true,
          authenticated: true,
          pendingSync: true,
          storageAvailable: false,
          user: safeUser(pending),
          message: 'Login reconhecido. O BOT está acordando e o cadastro será sincronizado automaticamente.'
        });
      }
    }

    if (!userId) return res.json({ success: true, authenticated: false, pendingSync: false, user: null });

    try {
      const user = await findUserById(userId);
      if (!user) return res.json({ success: true, authenticated: false, pending: true, user: null });
      if (req.session) {
        req.session.userId = user.id;
        req.session.cachedDiscordUser = safeUser(user);
      }
      setPersistentAuthCookies(req, res, user.id);
      return res.json({ success: true, authenticated: true, pendingSync: false, storageAvailable: true, user: safeUser(user) });
    } catch (error) {
      const cached = req.session?.cachedDiscordUser;
      if (cached) return res.json({ success: true, authenticated: true, pendingSync: true, storageAvailable: false, user: safeUser(cached), message: error.message });
      return res.json({ success: true, authenticated: false, pending: true, storageAvailable: false, user: null, message: error.message });
    }
  });`;

  src = src.replace(oldSession, newSession);

  const oldStorage = `      const email = profile.email ? clean(profile.email).toLowerCase() : '';
      const username = clean(profile.global_name || profile.username || 'Discord');
      const discordTag = profile.discriminator && profile.discriminator !== '0'
        ? \`${'${profile.username || username}'}#${'${profile.discriminator}'}\`
        : clean(profile.username || username);
      const avatar = discordAvatarUrl(profile, 256);

      let user = await findUserByDiscordId(profile.id);
      if (!user && email) user = await findUserByEmail(email);

      user = await saveUser({
        ...(user || {}),
        id: user?.id || crypto.randomUUID(),
        name: username || user?.name || discordTag,
        email: email || user?.email || null,
        avatar: avatar || user?.avatar || null,
        provider: 'discord',
        discordId: profile.id,
        discordTag,
        socials: user?.socials || {},
        profile: {
          ...(user?.profile || {}),
          username: user?.profile?.username || username || discordTag,
          discord: discordTag
        },
        createdAt: user?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      await regenerateSession(req);
      await saveSession(req, user.id);
      setPersistentAuthCookies(req, res, user.id);
      return res.redirect(next);`;

  const newStorage = `      const pending = pendingDiscordUserFromProfile(profile);

      try {
        const user = await syncPendingDiscordUser(pending);
        await regenerateSession(req);
        req.session.cachedDiscordUser = safeUser(user);
        await saveSession(req, user.id);
        setPersistentAuthCookies(req, res, user.id);
        return res.redirect(next);
      } catch (storageError) {
        await regenerateSession(req);
        req.session.pendingDiscordUser = pending;
        req.session.cachedDiscordUser = pending;
        req.session.authenticatedAt = new Date().toISOString();
        await new Promise((resolve) => req.session.save(() => resolve()));
        console.warn('[Discord/Auth] Storage do BOT indisponível; sessão temporária criada:', storageError.message);
        return res.redirect(next);
      }`;

  src = src.replace(oldStorage, newStorage);
  src = src.replace('OAuth, sessão persistente e status de autenticação registrados.', 'OAuth resiliente, sessão temporária e sincronização automática registrados.');
  write(AUTH_FILE, src);
}

function patchUpdates() {
  let html = read(UPDATES_FILE);
  if (!html || html.includes('release-2026-07-18-discord-storage-fallback')) return;
  const card = `
          <article class="va-card va-update-card" id="release-2026-07-18-discord-storage-fallback">
            <span class="va-update-dot"></span>
            <div class="va-update-meta"><span>18/07/2026 • 19:36 BRT</span><span>Site</span><span>Discord/Storage/Rotas</span></div>
            <h3>Login Discord não depende mais da disponibilidade instantânea do BOT</h3>
            <p class="va-muted">O SITE agora acorda e tenta novamente o storage remoto. Se o BOT estiver iniciando, a sessão e o avatar são mantidos temporariamente e o cadastro sincroniza quando a API voltar.</p>
            <ul class="va-update-list">
              <li class="fix">Erros transitórios 502, 503, 504 e timeouts recebem novas tentativas progressivas.</li>
              <li class="site">O callback não exibe mais uma tela de erro apenas porque o serviço do BOT está acordando.</li>
              <li class="fix">Jogadores e clubes existentes continuam sendo lidos e gravados somente no storage vivo do BOT.</li>
              <li class="fix">Nenhum backup ou arquivo local substitui os dados atuais.</li>
            </ul>
          </article>`;
  if (html.includes('<article class="va-card va-update-card"')) html = html.replace('<article class="va-card va-update-card"', card + '\n          <article class="va-card va-update-card"');
  else if (html.includes('</main>')) html = html.replace('</main>', card + '\n</main>');
  else html += card;
  write(UPDATES_FILE, html);
}

patchAuthRoute();
patchUpdates();
write(VERSION_FILE, JSON.stringify({ build: BUILD, storageRetries: 7, degradedSession: true, updatedAt: '2026-07-18T19:36:00-03:00' }, null, 2));
console.log(changed ? '[Discord/Auth] Fallback de storage e sessão temporária aplicados.' : '[Discord/Auth] Fallback de storage já estava aplicado.');
