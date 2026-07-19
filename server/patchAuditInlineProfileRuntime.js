const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'auditSitePages.js');
if (!fs.existsSync(file)) process.exit(0);
let source = fs.readFileSync(file, 'utf8');
const before = source;

source = source.replace(
  "  const isExperiencePage = /(?:data-hnl-module|league-experience\\.js)/i.test(html);",
  "  const isExperiencePage = /(?:data-hnl-module|league-experience\\.js)/i.test(html);\n  const isInlineProfile = relative === 'public/pages/perfil.html' && html.includes('hnl-profile-critical-v3');"
);
source = source.replace(
  "      if (!html.includes(required)) failures.push(`${relative}: referência obrigatória ausente ${required}`);",
  "      const acceptedInlineProfileAsset = isInlineProfile && required === '/css/league-experience.css';\n      if (!html.includes(required) && !acceptedInlineProfileAsset) failures.push(`${relative}: referência obrigatória ausente ${required}`);"
);
source = source.replace(
  "    for (const marker of ['id=\"profilePageForm\"', 'id=\"profileConnectionsPreview\"', '/css/profile-v2.css', '/js/core/profile-api.js', '/js/pages/perfil.js']) {\n      if (!html.includes(marker)) failures.push(`${relative}: conteúdo obrigatório do perfil ausente ${marker}`);\n    }",
  "    for (const marker of ['id=\"profilePageForm\"', 'id=\"profileConnectionsPreview\"', '/js/core/profile-api.js', '/js/pages/perfil.js']) {\n      if (!html.includes(marker)) failures.push(`${relative}: conteúdo obrigatório do perfil ausente ${marker}`);\n    }\n    if (!html.includes('/css/profile-v2.css') && !html.includes('hnl-profile-critical-v3')) failures.push(`${relative}: estilo do perfil ausente`);"
);

if (source !== before) fs.writeFileSync(file, source, 'utf8');
console.log(source !== before ? '[Audit/Profile] Auditor aceita o estilo crítico inline do perfil.' : '[Audit/Profile] Auditor já aceita o estilo crítico inline do perfil.');
