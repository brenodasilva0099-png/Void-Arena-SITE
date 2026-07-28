const fs = require('node:fs');
const path = require('node:path');

const appFile = path.join(__dirname, 'app.js');
const ADMIN_DISCORD_IDS = Object.freeze([
  '623932415034916865',
  '544971683157508097',
  '517113675618975759'
]);
let changed = false;

function patchAppAdminIds() {
  if (!fs.existsSync(appFile)) return;
  let src = fs.readFileSync(appFile, 'utf8');
  const before = src;
  const defaultAdminDeclaration = `const DEFAULT_ADMIN_DISCORD_IDS = ${JSON.stringify(ADMIN_DISCORD_IDS)};`;
  const existingDefaultAdmins = src.match(/const DEFAULT_ADMIN_DISCORD_IDS\s*=\s*\[[\s\S]*?\];/)?.[0] || '';

  if (existingDefaultAdmins && !ADMIN_DISCORD_IDS.every((discordId) => existingDefaultAdmins.includes(discordId))) {
    src = src.replace(
      /const DEFAULT_ADMIN_DISCORD_IDS\s*=\s*\[[\s\S]*?\];/,
      defaultAdminDeclaration
    );
  } else if (!existingDefaultAdmins) {
    src = src.replace(
      "const DEFAULT_OWNER_DISCORD_IDS = ['1235713276277559326'];",
      "const DEFAULT_OWNER_DISCORD_IDS = ['1235713276277559326'];\n" + defaultAdminDeclaration
    );
  }

  src = src.replace(
    /const ADMIN_DISCORD_IDS\s*=\s*splitUniqueEnvList\([^;]+\);/,
    'const ADMIN_DISCORD_IDS = splitUniqueEnvList(process.env.ADMIN_DISCORD_IDS, process.env.OWNER_DISCORD_IDS, DEFAULT_ADMIN_DISCORD_IDS, DEFAULT_OWNER_DISCORD_IDS);'
  );

  if (src !== before) {
    fs.writeFileSync(appFile, src, 'utf8');
    changed = true;
  }
}

patchAppAdminIds();
console.log(changed
  ? `[Admin] ${ADMIN_DISCORD_IDS.length} Discord IDs liberados como administradores no SITE.`
  : `[Admin] ${ADMIN_DISCORD_IDS.length} Discord IDs administrativos já estavam sincronizados no SITE.`);
