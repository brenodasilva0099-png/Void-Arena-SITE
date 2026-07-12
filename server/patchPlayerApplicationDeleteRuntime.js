const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'app.js');
if (!fs.existsSync(file)) {
  console.log('[Formularios] app.js nao encontrado para patch DELETE.');
  process.exit(0);
}

let src = fs.readFileSync(file, 'utf8');
let changed = false;

if (!src.includes("app.delete('/api/player-applications/:id'")) {
  const route = `
  app.delete('/api/player-applications/:id', requireAdmin, async (req, res) => {
    try {
      const data = await callBotInternalApi(\`/internal/player-applications/\${encodeURIComponent(req.params.id)}\`, {
        method: 'DELETE'
      });

      req.app.locals.realtime?.broadcast?.({
        type: 'player-application:delete',
        payload: { id: req.params.id },
        source: 'site'
      });

      return res.json(data);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

`;
  const marker = "  app.patch('/api/player-applications/:id/status', requireAdmin, async (req, res) => {";
  const idx = src.indexOf(marker);
  if (idx >= 0) {
    src = src.slice(0, idx) + route + src.slice(idx);
    changed = true;
  } else {
    console.log('[Formularios] Marcador de status nao encontrado; rota DELETE nao inserida.');
  }
}

if (changed) {
  fs.writeFileSync(file, src, 'utf8');
  console.log('[Formularios] Rota DELETE de inscricao aplicada no SITE.');
} else {
  console.log('[Formularios] Rota DELETE de inscricao ja estava aplicada no SITE.');
}
