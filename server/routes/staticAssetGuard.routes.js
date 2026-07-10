const path = require('node:path');
const express = require('express');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');
const ASSET_PREFIXES = ['/css/', '/js/', '/assets/', '/uploads/', '/images/', '/img/'];
const ASSET_EXTENSION_RE = /\.(?:css|js|mjs|png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf|map)$/i;

function isStaticAssetPath(pathname = '') {
  const clean = String(pathname || '').split('?')[0];
  return ASSET_PREFIXES.some((prefix) => clean.startsWith(prefix)) || ASSET_EXTENSION_RE.test(clean);
}

function registerStaticAssetGuard(app) {
  if (!app || app.__voidArenaStaticAssetGuardInstalled) return;
  app.__voidArenaStaticAssetGuardInstalled = true;

  const staticMiddleware = express.static(PUBLIC_DIR, {
    fallthrough: true,
    etag: true,
    maxAge: 0,
    setHeaders(res, filePath) {
      if (/\.(?:css|js|mjs|map)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
      }
      res.setHeader('X-Void-Arena-Static-Guard', '1');
    }
  });

  const guard = (req, res, next) => {
    if (!isStaticAssetPath(req.path)) return next();
    return staticMiddleware(req, res, next);
  };

  app.use(guard);

  const stack = app._router?.stack || app.router?.stack;
  if (Array.isArray(stack) && stack.length > 1) {
    const layer = stack.pop();
    stack.unshift(layer);
  }

  console.log('[Static Guard] Assets estaticos protegidos antes da manutencao/API.');
}

module.exports = { registerStaticAssetGuard, isStaticAssetPath };
