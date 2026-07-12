const fs = require('node:fs');
const path = require('node:path');

const appFile = path.join(__dirname, 'app.js');
const apiFile = path.join(__dirname, '..', 'public', 'assets', 'api.js');

function patchAppRoutes() {
  if (!fs.existsSync(appFile)) return;
  let src = fs.readFileSync(appFile, 'utf8');
  if (src.includes("app.get('/api/support/tickets'")) return;

  const routes = [
"  app.get('/api/support/tickets', requireAdmin, async (req, res) => {",
"    try {",
"      const query = req.query?.status ? ('?status=' + encodeURIComponent(req.query.status)) : '';",
"      const data = await callBotInternalApi('/internal/support/tickets' + query, { method: 'GET' });",
"      return res.json({ success: true, tickets: data.tickets || [] });",
"    } catch (error) {",
"      return res.status(500).json({ success: false, message: error.message });",
"    }",
"  });",
"",
"  app.post('/api/support/tickets', requireAuth, async (req, res) => {",
"    const user = await findUserById(req.session.userId);",
"    if (!user) return res.status(401).json({ success: false, message: 'Sessão inválida.' });",
"    try {",
"      const data = await callBotInternalApi('/internal/support/tickets', {",
"        method: 'POST',",
"        body: JSON.stringify({",
"          ...(req.body || {}),",
"          source: 'site',",
"          userId: user.id || '',",
"          discordId: user.discordId || '',",
"          discordTag: user.profile?.username || user.name || '',",
"          userName: user.profile?.username || user.name || 'Jogador',",
"          userAvatar: user.avatar || user.profile?.avatar || ''",
"        })",
"      });",
"      return res.json(data);",
"    } catch (error) {",
"      return res.status(400).json({ success: false, message: error.message });",
"    }",
"  });",
"",
"  app.patch('/api/support/tickets/:id/status', requireAdmin, async (req, res) => {",
"    try {",
"      const data = await callBotInternalApi('/internal/support/tickets/' + encodeURIComponent(req.params.id) + '/status', {",
"        method: 'PATCH',",
"        body: JSON.stringify({",
"          status: req.body?.status || 'open',",
"          reviewedBy: req.adminUser?.id || '',",
"          reviewedByName: req.adminUser?.profile?.username || req.adminUser?.name || 'Equipe Void Arena'",
"        })",
"      });",
"      return res.json(data);",
"    } catch (error) {",
"      return res.status(400).json({ success: false, message: error.message });",
"    }",
"  });",
"",
"  app.delete('/api/support/tickets/:id', requireAdmin, async (req, res) => {",
"    try {",
"      const data = await callBotInternalApi('/internal/support/tickets/' + encodeURIComponent(req.params.id), { method: 'DELETE' });",
"      return res.json(data);",
"    } catch (error) {",
"      return res.status(400).json({ success: false, message: error.message });",
"    }",
"  });",
""
  ].join('\n');

  const marker = "  app.get('/api/player-applications', requireAdmin, async (_req, res) => {";
  const idx = src.indexOf(marker);
  if (idx < 0) return console.log('[Suporte] Marcador de formularios nao encontrado.');
  src = src.slice(0, idx) + routes + '\n' + src.slice(idx);
  fs.writeFileSync(appFile, src, 'utf8');
  console.log('[Suporte] Rotas de suporte aplicadas no SITE.');
}

function patchNav() {
  if (!fs.existsSync(apiFile)) return;
  let src = fs.readFileSync(apiFile, 'utf8');
  if (src.includes("'/pages/suporte.html'")) return;
  const needle = "['pontuacao','placar','/pages/placar.html','🎮 Placar'],";
  if (!src.includes(needle)) return console.log('[Suporte] Marcador de navegacao nao encontrado.');
  src = src.replace(needle, needle + "['placar','suporte','/pages/suporte.html','🛟 Suporte'],");
  fs.writeFileSync(apiFile, src, 'utf8');
  console.log('[Suporte] Link de suporte inserido na navegacao.');
}

patchAppRoutes();
patchNav();
