const fs = require('node:fs');
const path = require('node:path');

function patch(file, pairs = []) {
  if (!fs.existsSync(file)) return { file, changed: false, missing: true };
  let src = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const [from, to] of pairs) {
    if (src.includes(from) && !src.includes(to)) {
      src = src.replace(from, to);
      changed = true;
    }
  }
  if (changed) fs.writeFileSync(file, src, 'utf8');
  return { file, changed };
}

const root = path.join(__dirname, '..');
const results = [];

results.push(patch(path.join(root, 'public', 'pages', 'times.html'), [
  ['<form id="teamCreateForm" class="va-form-grid two">', '<form id="teamCreateForm" class="va-form-grid two" autocomplete="off">'],
  ['<input name="logo" type="text" placeholder="Cole uma URL ou use a área ao lado" />', '<input name="logo" type="text" maxlength="9000000" placeholder="Cole uma URL ou use a área ao lado" />']
]));

results.push(patch(path.join(root, 'public', 'js', 'pages', 'times.js'), [
  ['if (file.size > 550000) return setCreateStatus(\'Imagem muito pesada. Use uma imagem menor ou cole uma URL.\', \'err\');', 'if (file.size > 9000000) return setCreateStatus(\'Imagem muito pesada. Use uma imagem menor ou cole uma URL.\', \'err\');'],
  ['function logo(team) { const fallback = initials(team); return `<div class="va-team-logo">${logoImg(team.logo, `Logo ${team.name || \'time\'}`, fallback)}</div>`; }', 'function logo(team) { const fallback = initials(team); const src = team.logo || team.logoOriginal || team.logoUrl || team.badgeUrl || team.escudo || team.imageUrl || team.avatar || \'\'; return `<div class="va-team-logo">${logoImg(src, `Logo ${team.name || \'time\'}`, fallback)}</div>`; }'],
  ['const bannerLogo = safeLogoUrl(team.logo) ? logoImg(team.logo, \'\', fallback) : \'\';', 'const teamLogoSrc = team.logo || team.logoOriginal || team.logoUrl || team.badgeUrl || team.escudo || team.imageUrl || team.avatar || \'\'; const bannerLogo = safeLogoUrl(teamLogoSrc) ? logoImg(teamLogoSrc, \'\', fallback) : \'\';'],
  ['<div class="va-public-team-logo">${logoImg(team.logo, `Logo ${team.name || \'time\'}`, fallback)}</div>', '<div class="va-public-team-logo">${logoImg(teamLogoSrc, `Logo ${team.name || \'time\'}`, fallback)}</div>']
]));

results.push(patch(path.join(root, 'public', 'js', 'pages', 'times-manage.js'), [
  ['<label class="wide">Logo / escudo<input name="logo" maxlength="650000" placeholder="https://... ou data:image/..." /></label>', '<label class="wide">Logo / escudo<input name="logo" maxlength="9000000" autocomplete="off" data-lpignore="true" data-form-type="other" placeholder="https://... ou data:image/..." /></label>']
]));

console.log('Patch limites/logos de times:', results.map((r) => `${path.basename(r.file)}:${r.changed ? 'alterado' : 'ok'}`).join(', '));
