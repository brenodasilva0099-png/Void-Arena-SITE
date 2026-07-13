const fs = require('node:fs');
const path = require('node:path');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const ASSET_PREFIXES = ['/css/', '/js/', '/assets/', '/uploads/', '/images/', '/img/'];
const ASSET_EXTENSION_RE = /\.(?:css|js|mjs|json|png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf|map)$/i;

function isStaticAssetPath(pathname = '') {
  const clean = String(pathname || '').split('?')[0];
  return ASSET_PREFIXES.some((prefix) => clean.startsWith(prefix)) || ASSET_EXTENSION_RE.test(clean);
}

function assetContentType(filePath = '') {
  const clean = String(filePath || '').toLowerCase().split('?')[0];
  if (clean.endsWith('.css')) return 'text/css; charset=utf-8';
  if (clean.endsWith('.js') || clean.endsWith('.mjs')) return 'application/javascript; charset=utf-8';
  if (clean.endsWith('.json') || clean.endsWith('.map')) return 'application/json; charset=utf-8';
  if (clean.endsWith('.svg')) return 'image/svg+xml';
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.gif')) return 'image/gif';
  if (clean.endsWith('.ico')) return 'image/x-icon';
  if (clean.endsWith('.woff')) return 'font/woff';
  if (clean.endsWith('.woff2')) return 'font/woff2';
  if (clean.endsWith('.ttf')) return 'font/ttf';
  return 'application/octet-stream';
}

function resolveAssetFile(requestPath = '') {
  const raw = String(requestPath || '').split('?')[0];
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }

  const relative = path.normalize(decoded.replace(/^\/+/, ''));
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return null;

  const fullPath = path.join(PUBLIC_DIR, relative);
  const relativeFromPublic = path.relative(PUBLIC_DIR, fullPath);
  if (!relativeFromPublic || relativeFromPublic.startsWith('..') || path.isAbsolute(relativeFromPublic)) return null;

  return { relative, fullPath };
}

function registerStaticAssetGuard(app) {
  if (!app || app.__voidArenaStaticAssetGuardInstalled) return;
  app.__voidArenaStaticAssetGuardInstalled = true;

  const guard = (req, res, next) => {
    if (!isStaticAssetPath(req.path)) return next();

    const asset = resolveAssetFile(req.path);
    if (!asset) {
      return res.status(400).type('text/plain; charset=utf-8').send('Asset inválido.');
    }

    const isCodeAsset = /\.(?:css|js|mjs|map|json)$/i.test(asset.relative);
    res.setHeader(
      'Cache-Control',
      isCodeAsset
        ? 'no-store, no-cache, must-revalidate, proxy-revalidate'
        : 'public, max-age=60, must-revalidate'
    );
    res.setHeader('X-Void-Arena-Static-Guard', 'hard-static-v3');
    res.type(assetContentType(asset.relative));

    fs.stat(asset.fullPath, (statError, stats) => {
      if (statError || !stats.isFile()) {
        console.error('[Static Guard] Asset ausente:', req.path, statError?.message || 'não é arquivo');
        return res.status(404).type('text/plain; charset=utf-8').send('Asset não encontrado.');
      }

      return res.sendFile(asset.fullPath, (sendError) => {
        if (!sendError) return;
        console.error('[Static Guard] Falha ao servir asset:', req.path, sendError.message);
        if (!res.headersSent) {
          return res.status(500).type('text/plain; charset=utf-8').send('Falha ao carregar asset.');
        }
      });
    });
  };

  app.use(guard);

  const stack = app._router?.stack || app.router?.stack;
  if (Array.isArray(stack) && stack.length > 1) {
    const layer = stack.pop();
    stack.unshift(layer);
  }

  console.log('[Static Guard] Assets CSS/JS blindados antes de paginas, API e fallback.');
}

module.exports = { registerStaticAssetGuard, isStaticAssetPath, assetContentType, resolveAssetFile };
