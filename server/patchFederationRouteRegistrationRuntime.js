const fs = require('node:fs');
const path = require('node:path');

const indexFile = path.join(__dirname, '..', 'site', 'index.js');
let changed = false;

if (fs.existsSync(indexFile)) {
  let src = fs.readFileSync(indexFile, 'utf8');
  if (!src.includes("registerFederationRoutes")) {
    src = src.replace(
      "const { registerNotificationRoutes } = require('../server/routes/notifications.routes');",
      "const { registerNotificationRoutes } = require('../server/routes/notifications.routes');\nconst { registerFederationRoutes } = require('../server/routes/federation.routes');"
    );
    src = src.replace(
      'registerNotificationRoutes(app);',
      'registerNotificationRoutes(app);\nregisterFederationRoutes(app);'
    );
    fs.writeFileSync(indexFile, src, 'utf8');
    changed = true;
  }
}

console.log(changed ? '[Federacao] Rotas FRM registradas no site/index.js.' : '[Federacao] Rotas FRM ja estavam registradas.');
