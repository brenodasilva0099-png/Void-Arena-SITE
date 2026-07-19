const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'app.js');
if (!fs.existsSync(file)) process.exit(0);
let source = fs.readFileSync(file, 'utf8');
const before = source;
source = source.replace(
  "const BOT_API_URL = String(process.env.BOT_API_URL || 'http://localhost:3002').replace(/\\\/$/, '');",
  "const BOT_API_URL = String(process.env.BOT_API_URL || process.env.BOT_PUBLIC_URL || 'http://localhost:3002').replace(/\\\/$/, '');"
);
source = source.replace(
  "const botUrl = String(process.env.BOT_API_URL || 'https://void-arena-bot.onrender.com').replace(/\\\/$/, '');",
  "const botUrl = String(process.env.BOT_API_URL || process.env.BOT_PUBLIC_URL || 'https://void-arena-bot.onrender.com').replace(/\\\/$/, '');"
);
if (source !== before) fs.writeFileSync(file, source, 'utf8');
console.log(source !== before ? '[Bot URL] BOT_PUBLIC_URL aplicado em toda a aplicação.' : '[Bot URL] Ponte com o BOT já aceita BOT_PUBLIC_URL.');
