const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'site', 'index.js');
let source = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
let changed = false;

if (source && !source.includes('registerCafeRankingRoutes')) {
  source = source.replace(
    "const { registerLeagueExperienceRoutes } = require('../server/routes/leagueExperience.routes');",
    "const { registerLeagueExperienceRoutes } = require('../server/routes/leagueExperience.routes');\nconst { registerCafeRankingRoutes } = require('../server/routes/cafeRanking.routes');"
  );
  source = source.replace(
    'registerLeagueExperienceRoutes(app);',
    'registerLeagueExperienceRoutes(app);\nregisterCafeRankingRoutes(app);'
  );
  fs.writeFileSync(file, source, 'utf8');
  changed = true;
}

console.log(changed
  ? '[Cafe com Leite] Rota de ranking geral registrada no SITE.'
  : '[Cafe com Leite] Rota de ranking geral já estava registrada.');
