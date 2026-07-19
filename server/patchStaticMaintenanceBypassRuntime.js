const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'app.js');
if (!fs.existsSync(file)) process.exit(0);
let source = fs.readFileSync(file, 'utf8');
const before = source;

const oldBlock = `      req.path === '/api/maintenance' ||
      req.path.startsWith('/assets/') ||
      req.path === '/favicon.png'`;
const newBlock = `      req.path === '/api/maintenance' ||
      req.path.startsWith('/assets/') ||
      req.path.startsWith('/css/') ||
      req.path.startsWith('/js/') ||
      req.path.startsWith('/uploads/') ||
      req.path.startsWith('/images/') ||
      req.path.startsWith('/img/') ||
      /\\.(?:css|js|mjs|json|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|map)$/i.test(req.path) ||
      req.path === '/favicon.png'`;

source = source.replace(oldBlock, newBlock);
if (source !== before) fs.writeFileSync(file, source, 'utf8');
console.log(source !== before
  ? '[Static/Maintenance] CSS, JS, imagens e fontes liberados durante manutenção.'
  : '[Static/Maintenance] Assets estáticos já estão protegidos contra resposta HTML.');
