const fs = require('node:fs');
const path = require('node:path');

const appFile = path.join(__dirname, 'app.js');
if (fs.existsSync(appFile)) {
  let src = fs.readFileSync(appFile, 'utf8');
  let changed = false;

  if (src.includes('role && role.id !== guild.id && !role.managed')) {
    src = src.replace(/role && role\.id !== guild\.id && !role\.managed/g, 'role && role.id !== guild.id');
    changed = true;
  }

  if (src.includes('.slice(0, 80);')) {
    src = src.replace(/\.slice\(0, 80\);/g, '.slice(0, 250);');
    changed = true;
  }

  if (!src.includes("app.get('/api/discord/roles'")) {
    const route = `

  app.get('/api/discord/roles', requireAuth, async (_req, res) => {
    try {
      const data = await tryBotInternalApi('/internal/discord/roles', { method: 'GET' }, {
        success: true,
        roles: [],
        message: 'Bot ainda não está online.'
      });
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Não foi possível carregar cargos do Discord: ' + error.message });
    }
  });
`;
    src = src.replace("\n  app.get('/api/discord/mentions', requireAuth, async (_req, res) => {", route + "\n  app.get('/api/discord/mentions', requireAuth, async (_req, res) => {");
    changed = true;
  }

  if (changed) fs.writeFileSync(appFile, src, 'utf8');
}

console.log('Patch aplicado: site carrega todos os cargos do Discord para permissões.');
