const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'site', 'index.js');
let source = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
let changed = false;

if (source && !source.includes('registerLeagueExperienceRoutes')) {
  source = source.replace(
    "const { registerLeagueRoutes } = require('../server/routes/league.routes');",
    "const { registerLeagueRoutes } = require('../server/routes/league.routes');\nconst { registerLeagueExperienceRoutes } = require('../server/routes/leagueExperience.routes');"
  );
  source = source.replace(
    'registerLeagueRoutes(app);',
    'registerLeagueRoutes(app);\nregisterLeagueExperienceRoutes(app);'
  );
  fs.writeFileSync(file, source, 'utf8');
  changed = true;
}

console.log(changed
  ? '[League/Experience] Rotas registradas no boot do SITE.'
  : '[League/Experience] Rotas já estavam registradas no boot do SITE.');
