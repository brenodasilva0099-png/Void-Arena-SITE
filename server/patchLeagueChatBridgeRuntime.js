const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pagesDir = path.join(ROOT, 'public', 'pages');
const routeFile = path.join(__dirname, 'routes', 'bridge.routes.js');
const clientFile = path.join(ROOT, 'public', 'js', 'pages', 'bridge-card.js');
const chatPage = path.join(pagesDir, 'chat.html');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, content) { if (!fs.existsSync(file) || read(file) !== content) fs.writeFileSync(file, content, 'utf8'); }

let routes = read(routeFile);
let client = read(clientFile);

if (!routes.includes("const { getSessionUser } = require('../services/access.service');")) {
  routes = routes.replace("const localBridgeSettings = require('../localBridgeSettings');", "const localBridgeSettings = require('../localBridgeSettings');\nconst { getSessionUser } = require('../services/access.service');");
}
routes = routes.replace(
  "function requireSession(req, res, next) {\n  if (!req.session?.userId) return res.status(401).json({ success: false, message: 'Faça login para continuar.' });\n  return next();\n}",
  "async function requireSession(req, res, next) {\n  try {\n    const user = await getSessionUser(req);\n    if (!user) return res.status(401).json({ success: false, message: 'Faça login para continuar.' });\n    req.bridgeUser = user;\n    return next();\n  } catch (error) {\n    return res.status(503).json({ success: false, message: 'O chat ainda está sincronizando.', detail: error.message });\n  }\n}"
);
routes = routes.replace(
  "mentions: { members: mentions.members, roles: mentions.roles }",
  "mentions: { members: mentions.members, roles: mentions.roles, channels: channelsData.channels }"
);
routes = routes.replace(
  "const mentions = await readMentions();\n      return res.json({ success: true, ...mentions });",
  "const [mentions, channelsData] = await Promise.all([readMentions(), readChannels()]);\n      return res.json({ success: true, ...mentions, channels: channelsData.channels });"
);
routes = routes.replace(
  "const user = await storage.findUserById(req.session.userId).catch(() => null);",
  "const user = req.bridgeUser || await getSessionUser(req);"
);
routes = routes.replace(
  "authorId: user?.id || req.session.userId || ''",
  "authorId: user?.id || user?.discordId || ''"
);
routes = routes.replace(
  "allowedMentions: { parse: mentionParse }",
  "allowedMentions: { parse: mentionParse }, manual: true"
);

client = client.replace('let mentionData = { members: [], roles: [] };', 'let mentionData = { members: [], roles: [], channels: [] };');
client = client.replace(
  "const members = (mentionData.members || []).map((item) => ({ ...item, type: 'member', label: item.name || item.username || 'Usuário', insert: item.mention || `<@${item.id}>`, icon: item.avatar ? `<img src=\"${esc(item.avatar)}\" alt=\"\" />` : '@', sub: item.username ? `@${item.username}` : (item.guildName || 'Usuário') }));\n    return [...roles, ...members];",
  "const members = (mentionData.members || []).map((item) => ({ ...item, type: 'member', label: item.name || item.username || 'Usuário', insert: item.mention || `<@${item.id}>`, icon: item.avatar ? `<img src=\"${esc(item.avatar)}\" alt=\"\" />` : '@', sub: item.username ? `@${item.username}` : (item.guildName || 'Usuário') }));\n    const channels = (mentionData.channels || []).filter((item) => item.canBridge || ['text', 'announcement'].includes(item.kind)).map((item) => ({ ...item, type: 'channel', label: item.displayName || item.name || 'canal', insert: `<#${item.id}>`, icon: '#', sub: item.guildName || 'Canal' }));\n    return [...roles, ...members, ...channels];"
);
client = client.replace(
  "mentionData = { members: data.members || [], roles: data.roles || [] };",
  "mentionData = { members: data.members || [], roles: data.roles || [], channels: data.channels || [] };"
);
client = client.replace(
  "const memberItems = items.filter((item) => item.type === 'member');",
  "const memberItems = items.filter((item) => item.type === 'member');\n    const channelItems = items.filter((item) => item.type === 'channel');"
);
client = client.replace(
  "menu.innerHTML = group('Cargos', roleItems) + group('Usuários', memberItems);",
  "menu.innerHTML = group('Cargos', roleItems) + group('Usuários', memberItems) + group('Canais', channelItems);"
);
client = client.replace('mentionData = data.mentions || mentionData;', "mentionData = { ...(data.mentions || mentionData), channels: data.channels || data.mentions?.channels || mentionData.channels || [] };");

const currentChatPage = read(chatPage);
const stableChatInstalled = currentChatPage.includes('/js/pages/chat-bridge-stable.js');
if (!stableChatInstalled) {
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chat Discord | Hollow Nexus League</title><link rel="icon" href="/assets/hollow-nexus-official.svg"><link rel="stylesheet" href="/css/league-critical.css"><link rel="stylesheet" href="/css/league-polish.css"><link rel="stylesheet" href="/css/league-experience.css"><link rel="stylesheet" href="/css/bridge-card.css"></head><body class="frm-polish-page" data-page="chat" data-bridge-key="chat"><div class="frm-shell"><aside class="frm-sidebar"><div class="frm-brand"><img src="/assets/hollow-nexus-official.svg" alt="Hollow Nexus League"><div><small>the</small><strong>HOLLOW NEXUS <span>LEAGUE</span></strong><p>Liga Comunitária</p></div></div><nav class="frm-nav"><div class="frm-nav-title">Competitivo</div><a href="/pages/competicoes.html"><i>♕</i><b>Competições</b></a><a href="/pages/chaveamento.html"><i>⌘</i><b>Chaveamento</b></a><div class="frm-nav-title">Clubes</div><a href="/pages/clubes.html"><i>◈</i><b>Clubes Participantes</b></a><div class="frm-nav-title">Comunicação</div><a class="active" href="/pages/chat.html"><i>💬</i><b>Chat Discord</b></a><div class="frm-nav-title" data-admin-section hidden>Administração</div><a href="/pages/configuracoes.html" data-admin-only hidden><i>⚙</i><b>Configurações</b></a></nav></aside><main class="frm-main"><header class="frm-header"><nav class="frm-tabs"><a href="/pages/dashboard.html">Início</a><a href="/pages/competicoes.html">Competitivo</a><a href="/pages/clubes.html">Clubes</a><a href="/pages/atletas.html">Jogadores</a><a href="/pages/cafe-com-leite.html">Café com Leite</a><a href="/pages/administracao.html" data-admin-only hidden>Administração</a></nav><div class="frm-header-actions"><a class="frm-btn discord" href="/api/discord/server/open" target="_blank" rel="noopener">💬 Discord</a><a class="frm-icon" href="/pages/notificacoes.html">🔔</a><a class="frm-icon" href="/pages/correio.html">✉</a></div></header><section class="frm-page-hero"><div><span class="hnl-section-kicker">Ponte Discord ↔ SITE</span><h1>Chat do servidor</h1><p>Selecione um canal, visualize o histórico e envie mensagens mencionando usuários, cargos e canais.</p></div><div class="hnl-hero-icon">💬</div></section><section class="va-bridge-shell"><article class="va-bridge-card"><div class="va-bridge-head"><div><h2 id="bridgeTitle">Chat</h2><p id="bridgeSubtitle" class="va-bridge-muted">Canal Discord: não vinculado</p></div><button id="bridgeRefreshBtn" class="va-bridge-icon-btn" type="button">↻</button></div><div class="va-bridge-panel"><h3>Canal da ponte</h3><div class="va-bridge-link-row"><select id="bridgeChannel" class="va-bridge-select"><option value="">Selecionar canal de texto</option></select><button id="bridgeLinkBtn" class="va-btn primary" type="button">Vincular</button></div></div><div id="bridgeMessages" class="va-bridge-messages"></div><div class="va-bridge-compose"><textarea id="bridgeInput" placeholder="Enviar mensagem para o Discord..."></textarea><button class="va-btn secondary" type="button">Marcar @</button><button id="bridgeSendBtn" class="va-btn primary" type="button">Enviar</button></div><div id="bridgeStatus" class="va-status"></div></article></section></main></div><script src="/js/core/api.js"></script><script src="/js/core/league-experience.js"></script><script src="/js/pages/bridge-card.js"></script></body></html>`;
  write(chatPage, html);
}

for (const name of fs.readdirSync(pagesDir).filter((item) => item.endsWith('.html'))) {
  const file = path.join(pagesDir, name);
  let page = read(file);
  if (!page.includes('frm-nav') || page.includes('href="/pages/chat.html"')) continue;
  const entry = '<div class="frm-nav-title">Comunicação</div><a href="/pages/chat.html"><i>💬</i><b>Chat Discord</b></a>';
  const admin = '<div class="frm-nav-title" data-admin-section';
  page = page.includes(admin) ? page.replace(admin, entry + admin) : page.replace('</nav></aside>', entry + '</nav></aside>');
  write(file, page);
}

write(routeFile, routes);
write(clientFile, client);
new Function(read(routeFile));
new Function(read(clientFile));
for (const marker of ['req.bridgeUser = user', "type: 'channel'", "group('Canais'", 'manual: true', 'Ponte Discord ↔ SITE']) {
  if (!read(routeFile).includes(marker) && !read(clientFile).includes(marker) && !read(chatPage).includes(marker)) throw new Error(`Chat incompleto: ${marker}`);
}
console.log(stableChatInstalled
  ? '[Chat/Bridge] Backend atualizado; página estável preservada sem restaurar assets antigos.'
  : '[Chat/Bridge] Chat Discord recolocado no shell atual com canais, usuários, cargos, histórico e envio.');
