const fs = require('node:fs');
const path = require('node:path');

const appFile = path.join(__dirname, 'app.js');
const ADMIN_DISCORD_ID = '623932415034916865';
let changed = false;

function patchAppAdminIds() {
  if (!fs.existsSync(appFile)) return;
  let src = fs.readFileSync(appFile, 'utf8');
  const before = src;

  if (!src.includes('const DEFAULT_ADMIN_DISCORD_IDS =')) {
    src = src.replace(
      "const DEFAULT_OWNER_DISCORD_IDS = ['1235713276277559326'];",
      "const DEFAULT_OWNER_DISCORD_IDS = ['1235713276277559326'];\nconst DEFAULT_ADMIN_DISCORD_IDS = ['" + ADMIN_DISCORD_ID + "'];"
    );
  }

  src = src.replace(
    'const ADMIN_DISCORD_IDS = splitUniqueEnvList(process.env.ADMIN_DISCORD_IDS, process.env.OWNER_DISCORD_IDS, DEFAULT_OWNER_DISCORD_IDS);',
    'const ADMIN_DISCORD_IDS = splitUniqueEnvList(process.env.ADMIN_DISCORD_IDS, process.env.OWNER_DISCORD_IDS, DEFAULT_ADMIN_DISCORD_IDS, DEFAULT_OWNER_DISCORD_IDS);'
  );

  if (src !== before) {
    fs.writeFileSync(appFile, src, 'utf8');
    changed = true;
  }
}

patchAppAdminIds();
console.log(changed ? '[Admin] Discord ID ' + ADMIN_DISCORD_ID + ' liberado como admin no SITE.' : '[Admin] Discord ID admin ja estava liberado no SITE.');
