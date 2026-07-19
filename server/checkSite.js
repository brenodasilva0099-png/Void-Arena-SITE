const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const CHECK_DIRS = [
  path.join(ROOT, 'server'),
  path.join(ROOT, 'site'),
  path.join(ROOT, 'public', 'js')
];
const SKIP = new Set([
  path.join(ROOT, 'server', 'checkSite.js')
]);

function walkJs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkJs(full);
    return entry.isFile() && entry.name.toLowerCase().endsWith('.js') ? [full] : [];
  });
}

const files = CHECK_DIRS.flatMap(walkJs).filter((file) => !SKIP.has(file));
const failures = [];

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    failures.push({
      file: path.relative(ROOT, file).replace(/\\/g, '/'),
      output: String(result.stderr || result.stdout || '').trim()
    });
  }
}

console.log(`[Check] Sintaxe verificada em ${files.length} arquivo(s) JavaScript.`);
if (failures.length) {
  failures.forEach((failure) => {
    console.error(`\n[Check] ${failure.file}\n${failure.output}`);
  });
  process.exit(1);
}

require('./patchSiteIntegrityRuntime');
require('./auditSitePages');

if (process.exitCode) process.exit(process.exitCode);
console.log('[Check] Sintaxe, páginas e assets aprovados.');
