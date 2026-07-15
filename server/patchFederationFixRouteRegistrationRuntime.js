const fs = require('node:fs');
const path = require('node:path');

const indexFile = path.join(__dirname, '..', 'site', 'index.js');

if (fs.existsSync(indexFile)) {
  let src = fs.readFileSync(indexFile, 'utf8');
  let changed = false;
  if (!src.includes("federationFixes.routes")) {
    src = src.replace(
      "const { registerDiscordServerLinkRoutes } = require('../server/routes/discordServerLink.routes');",
      "const { registerDiscordServerLinkRoutes } = require('../server/routes/discordServerLink.routes');\nconst { registerFederationFixRoutes } = require('../server/routes/federationFixes.routes');"
    );
    changed = true;
  }
  if (!src.includes('registerFederationFixRoutes(app);')) {
    src = src.replace('registerDiscordServerLinkRoutes(app);', 'registerDiscordServerLinkRoutes(app);\nregisterFederationFixRoutes(app);');
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(indexFile, src, 'utf8');
    console.log('[Federacao] Rotas extras de ranking, clubes e transferencias registradas.');
  } else {
    console.log('[Federacao] Rotas extras FRM ja estavam registradas.');
  }
}
