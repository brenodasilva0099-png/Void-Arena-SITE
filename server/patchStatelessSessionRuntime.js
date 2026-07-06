const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'app.js');
if (!fs.existsSync(file)) process.exit(0);
let src = fs.readFileSync(file, 'utf8');
let changed = false;

src = src.replace('maxAge: 1000 * 60 * 60 * 24 * 7,', 'maxAge: Number(process.env.SESSION_MAX_AGE_MS || 1000 * 60 * 60 * 24 * 30) || 1000 * 60 * 60 * 24 * 30,');

if (!src.includes('function signStatelessSessionPayload')) {
  const helpers = `
function parseCookieHeader(header = '') {
  return Object.fromEntries(String(header || '').split(';').map((part) => {
    const index = part.indexOf('=');
    if (index < 0) return null;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key) return null;
    try { return [key, decodeURIComponent(value)]; } catch { return [key, value]; }
  }).filter(Boolean));
}

function signStatelessSessionPayload(payload = {}) {
  const secret = process.env.SESSION_SECRET || 'abyss-tourment-dev-secret';
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return body + '.' + sig;
}

function verifyStatelessSessionPayload(token = '') {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'abyss-tourment-dev-secret').update(body).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (!payload?.userId || !payload?.exp || Date.now() > Number(payload.exp)) return null;
  return payload;
}
`;
  src = src.replace("function createServer({ client }) {", helpers + "\nfunction createServer({ client }) {");
  changed = true;
}

if (!src.includes("const STATELESS_LOGIN_COOKIE = 'void.arena.login';")) {
  const middleware = `
  const STATELESS_LOGIN_COOKIE = 'void.arena.login';
  const STATELESS_LOGIN_MAX_AGE_MS = Number(process.env.SESSION_MAX_AGE_MS || 1000 * 60 * 60 * 24 * 30) || 1000 * 60 * 60 * 24 * 30;
  app.use((req, res, next) => {
    const cookies = parseCookieHeader(req.headers.cookie || '');
    if (!req.session?.userId && cookies[STATELESS_LOGIN_COOKIE]) {
      try {
        const restored = verifyStatelessSessionPayload(cookies[STATELESS_LOGIN_COOKIE]);
        if (restored?.userId) req.session.userId = restored.userId;
      } catch {}
    }
    const originalEnd = res.end;
    res.end = function patchedEnd(...args) {
      try {
        if (req.path === '/api/logout') {
          res.clearCookie(STATELESS_LOGIN_COOKIE, { path: '/' });
        } else if (req.session?.userId) {
          res.cookie(STATELESS_LOGIN_COOKIE, signStatelessSessionPayload({
            userId: req.session.userId,
            exp: Date.now() + STATELESS_LOGIN_MAX_AGE_MS
          }), {
            httpOnly: true,
            sameSite: 'lax',
            secure: req.secure || String(req.headers['x-forwarded-proto'] || '').includes('https'),
            path: '/',
            maxAge: STATELESS_LOGIN_MAX_AGE_MS
          });
        }
      } catch {}
      return originalEnd.apply(this, args);
    };
    return next();
  });
`;
  src = src.replace('  app.use(express.static(PUBLIC_DIR));', middleware + '\n  app.use(express.static(PUBLIC_DIR));');
  changed = true;
}

if (changed) fs.writeFileSync(file, src, 'utf8');
console.log(changed ? 'Patch aplicado: sessão stateless fallback ativa para Render Free.' : 'Patch ignorado: sessão stateless já ativa.');
