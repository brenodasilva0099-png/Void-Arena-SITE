const fs = require('node:fs/promises');
const path = require('node:path');
const session = require('express-session');

const Store = session.Store;

function resolveSessionDir() {
  const base = process.env.SESSION_DATA_DIR || process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  return path.resolve(base, 'sessions');
}

function safeSessionId(sid = '') {
  return String(sid || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 180);
}

function sessionFilePath(dir, sid) {
  return path.join(dir, `${safeSessionId(sid)}.json`);
}

function maxAgeFromSession(sess = {}) {
  const maxAge = Number(sess?.cookie?.originalMaxAge || sess?.cookie?.maxAge || 0);
  return Number.isFinite(maxAge) && maxAge > 0 ? maxAge : 1000 * 60 * 60 * 24 * 7;
}

class FileSessionStore extends Store {
  constructor(options = {}) {
    super();
    this.dir = options.dir || resolveSessionDir();
    this.ttlMs = Number(options.ttlMs || process.env.SESSION_TTL_MS || 1000 * 60 * 60 * 24 * 7) || 1000 * 60 * 60 * 24 * 7;
    this.cleanupIntervalMs = Number(options.cleanupIntervalMs || process.env.SESSION_CLEANUP_INTERVAL_MS || 1000 * 60 * 30) || 1000 * 60 * 30;
    this.ready = fs.mkdir(this.dir, { recursive: true });
    this.startCleanup();
  }

  startCleanup() {
    const timer = setInterval(() => {
      this.cleanupExpired().catch((error) => console.warn('Sessao cleanup falhou:', error.message));
    }, this.cleanupIntervalMs);
    timer.unref?.();
  }

  async readRecord(sid) {
    await this.ready;
    const file = sessionFilePath(this.dir, sid);
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw);
  }

  get(sid, callback) {
    this.readRecord(sid)
      .then(async (record) => {
        if (!record?.session) return callback(null, null);
        if (record.expiresAt && new Date(record.expiresAt).getTime() <= Date.now()) {
          await this.destroyAsync(sid).catch(() => {});
          return callback(null, null);
        }
        return callback(null, record.session);
      })
      .catch((error) => {
        if (error.code === 'ENOENT') return callback(null, null);
        return callback(error);
      });
  }

  set(sid, sess, callback = () => {}) {
    this.ready
      .then(async () => {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + maxAgeFromSession(sess || { cookie: { maxAge: this.ttlMs } })).toISOString();
        const record = {
          sid: safeSessionId(sid),
          savedAt: now.toISOString(),
          expiresAt,
          session: sess
        };
        await fs.writeFile(sessionFilePath(this.dir, sid), JSON.stringify(record), 'utf8');
        callback(null);
      })
      .catch(callback);
  }

  touch(sid, sess, callback = () => {}) {
    this.get(sid, (error, current) => {
      if (error) return callback(error);
      this.set(sid, { ...(current || {}), ...(sess || {}) }, callback);
    });
  }

  destroyAsync(sid) {
    return this.ready.then(() => fs.unlink(sessionFilePath(this.dir, sid))).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }

  destroy(sid, callback = () => {}) {
    this.destroyAsync(sid).then(() => callback(null)).catch(callback);
  }

  async cleanupExpired() {
    await this.ready;
    const files = await fs.readdir(this.dir).catch(() => []);
    const now = Date.now();
    await Promise.all(files.filter((file) => file.endsWith('.json')).map(async (file) => {
      const full = path.join(this.dir, file);
      try {
        const raw = await fs.readFile(full, 'utf8');
        const record = JSON.parse(raw);
        if (record.expiresAt && new Date(record.expiresAt).getTime() <= now) {
          await fs.unlink(full);
        }
      } catch {
        await fs.unlink(full).catch(() => {});
      }
    }));
  }
}

function createSessionStore() {
  const store = new FileSessionStore();
  console.log(`Sessao persistente ativa em: ${store.dir}`);
  return store;
}

module.exports = { FileSessionStore, createSessionStore, resolveSessionDir };
