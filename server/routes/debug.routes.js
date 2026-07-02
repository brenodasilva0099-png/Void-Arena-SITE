const fs = require('node:fs');
const path = require('node:path');
const storage = require('../storage');
const { tryBot, BOT_API_URL, BOT_API_KEY } = require('../services/botApi.service');

const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public');

const PAGES = [
  '/pages/dashboard.html',
  '/pages/perfil.html',
  '/pages/eventos.html',
  '/pages/times.html',
  '/pages/chaveamento.html',
  '/pages/resultados.html',
  '/pages/rankings.html',
  '/pages/chat.html',
  '/pages/scrims.html',
  '/pages/estatisticas.html',
  '/pages/analise-partidas.html',
  '/pages/formularios.html',
  '/pages/permissoes.html',
  '/pages/configuracoes.html',
  '/pages/termos.html'
];

function pageInfo(urlPath) {
  const filePath = path.join(PUBLIC_DIR, urlPath.replace(/^\//, ''));
  return {
    path: urlPath,
    exists: fs.existsSync(filePath)
  };
}

function countArray(value) {
  return Array.isArray(value) ? value.length : 0;
}

async function readBotStorage(method) {
  const data = await tryBot(`/internal/storage/${method}`, {
    method: 'POST',
    body: JSON.stringify({ args: [] })
  }, null);
  return data?.result || [];
}

async function buildDebugStatus(req) {
  const [siteDb, botHealth, latestBackup, botTeams, botUsers, botEvents, siteTeams, siteUsers, siteEvents] = await Promise.all([
    storage.readDatabaseStatus().catch((error) => ({ error: error.message })),
    tryBot('/internal/health', { method: 'GET' }, null),
    tryBot('/internal/backup/github/latest', { method: 'GET' }, null),
    readBotStorage('readTeams').catch(() => []),
    readBotStorage('readUsers').catch(() => []),
    readBotStorage('readEvents').catch(() => []),
    storage.readTeams().catch(() => []),
    storage.readUsers().catch(() => []),
    storage.readEvents().catch(() => [])
  ]);

  const botSummary = botHealth?.database || {};
  const latestSummary = latestBackup?.summary || null;

  return {
    success: true,
    generatedAt: new Date().toISOString(),
    request: {
      host: req.headers.host,
      protocol: req.protocol,
      path: req.path
    },
    site: {
      version: process.env.npm_package_version || '5.1.2',
      commit: process.env.RENDER_GIT_COMMIT || null,
      nodeEnv: process.env.NODE_ENV || null,
      botApiUrl: BOT_API_URL,
      hasBotToken: Boolean(BOT_API_KEY),
      database: siteDb,
      localCounts: {
        users: countArray(siteUsers),
        teams: countArray(siteTeams),
        events: countArray(siteEvents)
      }
    },
    bot: {
      reachable: Boolean(botHealth?.success),
      online: Boolean(botHealth?.online),
      tag: botHealth?.tag || null,
      guilds: botHealth?.guilds || 0,
      database: botSummary,
      officialCounts: {
        users: countArray(botUsers),
        teams: countArray(botTeams),
        events: countArray(botEvents)
      },
      error: botHealth?.internalError || null
    },
    backup: {
      reachable: Boolean(latestBackup?.success),
      exportedAt: latestBackup?.exportedAt || null,
      summary: latestSummary,
      path: latestBackup?.githubBackup?.path || null,
      reason: latestBackup?.githubBackup?.reason || null,
      knownGoodBaseline: {
        users: 2,
        teams: 4,
        path: 'backups/2026-07/void-arena-backup-2026-07-02T02-35-01-258Z.json'
      },
      error: latestBackup?.internalError || null
    },
    pages: PAGES.map(pageInfo),
    quickLinks: {
      home: '/',
      dashboard: '/pages/dashboard.html',
      teams: '/pages/times.html',
      bracket: '/pages/chaveamento.html',
      results: '/pages/resultados.html',
      debug: '/debug',
      status: '/debug/status'
    }
  };
}

function debugHtml() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Debug Center | Void Arena</title>
  <style>
    :root { color-scheme: dark; --bg:#080914; --card:#111328; --line:rgba(139,92,246,.32); --text:#f7f2ff; --muted:#b8aed9; --good:#22c55e; --bad:#ef4444; --warn:#f59e0b; --cyan:#22d3ee; }
    *{box-sizing:border-box} body{margin:0;background:radial-gradient(circle at top,#201141 0,#080914 42%,#05050b 100%);color:var(--text);font-family:Inter,system-ui,Segoe UI,Arial,sans-serif;padding:24px}.wrap{max-width:1180px;margin:0 auto}.head{display:flex;gap:16px;align-items:center;justify-content:space-between;margin-bottom:18px}.head h1{margin:0;font-size:clamp(26px,5vw,42px)}.head p{margin:8px 0 0;color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.card{border:1px solid var(--line);background:rgba(17,19,40,.82);border-radius:20px;padding:18px;box-shadow:0 18px 60px rgba(0,0,0,.28)}.card.full{grid-column:1/-1}.label{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.12em;font-weight:900}.value{font-size:30px;font-weight:900;margin-top:8px}.ok{color:var(--good)}.bad{color:var(--bad)}.warn{color:var(--warn)}.links{display:flex;gap:8px;flex-wrap:wrap}.links a,.btn{color:var(--text);text-decoration:none;border:1px solid var(--line);border-radius:999px;padding:9px 12px;background:rgba(139,92,246,.16);font-weight:800}.btn{cursor:pointer}.mono{white-space:pre-wrap;overflow:auto;background:rgba(0,0,0,.28);border-radius:14px;padding:12px;font-family:ui-monospace,Consolas,monospace;font-size:12px;color:#d8d0ff}.pages{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.page{display:flex;justify-content:space-between;gap:10px;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:12px}.pill{font-size:12px;font-weight:900}.loading{color:var(--cyan)}@media(max-width:760px){body{padding:12px}.grid{grid-template-columns:1fr}.head{align-items:flex-start;flex-direction:column}.pages{grid-template-columns:1fr}.value{font-size:24px}}
  </style>
</head>
<body>
  <main class="wrap">
    <header class="head">
      <div><h1>Void Arena Debug Center</h1><p>Status público seguro para validar deploy, bot, banco, backups e páginas.</p></div>
      <button class="btn" onclick="loadStatus()">Atualizar</button>
    </header>
    <section id="app" class="grid"><article class="card full"><strong class="loading">Carregando diagnóstico...</strong></article></section>
  </main>
  <script>
    const app = document.getElementById('app');
    const cls = (ok) => ok ? 'ok' : 'bad';
    function num(v){ return Number.isFinite(Number(v)) ? Number(v) : 0; }
    function card(label, value, extra='', c='') { return '<article class="card"><div class="label">'+label+'</div><div class="value '+c+'">'+value+'</div><p>'+extra+'</p></article>'; }
    function render(data){
      const botCounts = data.bot?.officialCounts || {};
      const backup = data.backup?.summary || {};
      const siteCounts = data.site?.localCounts || {};
      const pages = (data.pages || []).map(p => '<div class="page"><span>'+p.path+'</span><span class="pill '+cls(p.exists)+'">'+(p.exists?'OK':'FALTA')+'</span></div>').join('');
      const links = Object.entries(data.quickLinks || {}).map(([k,v]) => '<a href="'+v+'">'+k+'</a>').join('');
      app.innerHTML =
        card('BOT conectado', data.bot?.reachable ? 'SIM' : 'NÃO', data.bot?.tag || data.bot?.error || '', cls(data.bot?.reachable))+
        card('Times oficiais no BOT', num(botCounts.teams), 'Usuários: '+num(botCounts.users)+' • Eventos: '+num(botCounts.events), num(botCounts.teams)>0?'ok':'bad')+
        card('Latest backup', num(backup.teams)+' times', 'Usuários: '+num(backup.users)+' • Motivo: '+(data.backup?.reason || '-'), num(backup.teams)>0?'ok':'bad')+
        card('Banco local do SITE', num(siteCounts.teams)+' times', 'Normalmente pode ficar vazio se o BOT é o banco oficial.', 'warn')+
        '<article class="card"><div class="label">Commit SITE</div><div class="mono">'+(data.site?.commit || 'sem commit do Render')+'</div></article>'+
        '<article class="card"><div class="label">Backup base boa</div><div class="mono">'+JSON.stringify(data.backup?.knownGoodBaseline || {}, null, 2)+'</div></article>'+
        '<article class="card full"><div class="label">Links rápidos</div><div class="links">'+links+'</div></article>'+
        '<article class="card full"><div class="label">Páginas</div><div class="pages">'+pages+'</div></article>'+
        '<article class="card full"><div class="label">JSON completo</div><div class="mono">'+JSON.stringify(data, null, 2)+'</div></article>';
    }
    async function loadStatus(){
      app.innerHTML = '<article class="card full"><strong class="loading">Carregando diagnóstico...</strong></article>';
      try { render(await (await fetch('/debug/status?t='+Date.now())).json()); }
      catch(e){ app.innerHTML = '<article class="card full"><strong class="bad">Erro: '+e.message+'</strong></article>'; }
    }
    loadStatus();
  </script>
</body>
</html>`;
}

function registerDebugRoutes(app) {
  app.get('/debug', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    return res.type('html').send(debugHtml());
  });

  app.get('/debug/status', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
      return res.json(await buildDebugStatus(req));
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message, generatedAt: new Date().toISOString() });
    }
  });
}

module.exports = { registerDebugRoutes };
