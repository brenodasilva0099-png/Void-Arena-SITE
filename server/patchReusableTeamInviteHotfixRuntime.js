const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const appFile = path.join(__dirname, 'app.js');
const routesFile = path.join(__dirname, 'routes', 'publicTeam.routes.js');
const clientFile = path.join(ROOT, 'public', 'js', 'core', 'league-experience.js');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, content) { if (read(file) !== content) fs.writeFileSync(file, content, 'utf8'); }

let app = read(appFile);
let routes = read(routesFile);
let client = read(clientFile);

// Corrige o erro "$(...).forEach is not a function" introduzido por patches antigos.
client = client
  .replace(/\$\('\[data-remove-club-member\]'\s*,\s*box\)\.forEach/g, "$$('[data-remove-club-member]', box).forEach")
  .replace(/\$\('\[data-remove-club-member\]'\)\.forEach/g, "$$('[data-remove-club-member]').forEach");

// Sempre usa a identidade mais confiável para remover um integrante.
client = client.replace(
  "const memberKey = String(player.id || player.userId || player.discordId || player.name || '').trim();",
  "const memberKey = String(player.discordId || player.userId || player.id || player.account || player.name || '').trim();"
);

// Interface do perfil: link único, reutilizável e sem seleção prévia de jogador.
client = client
  .replace(/<h3>Convidar jogador<\/h3>/g, '<h3>Link reutilizável do clube</h3>')
  .replace(/<h3>Convite por link<\/h3>/g, '<h3>Link reutilizável do clube</h3>')
  .replace(/<div class="hnl-field"><label>Jogador<\/label><select class="hnl-select" id="clubInvitePlayer"><\/select><\/div>/g, '<div class="hnl-field full"><p class="frm-muted">Gere um único link e envie para quantos jogadores precisar. Cada jogador abre logado, aceita e entra no elenco. O link continua válido até expirar.</p></div>')
  .replace(/id="sendClubInvite" type="button">Enviar convite<\/button>/g, 'id="sendClubInvite" type="button">Gerar link reutilizável</button>')
  .replace(/id="sendClubInvite" type="button">Gerar link de convite<\/button>/g, 'id="sendClubInvite" type="button">Gerar link reutilizável</button>')
  .replace("body: JSON.stringify({ rosterSlot: $('#clubInviteSlot')?.value, note: $('#clubInviteNote')?.value })", "body: JSON.stringify({ rosterSlot: $('#clubInviteSlot')?.value, note: $('#clubInviteNote')?.value, reusable: true })")
  .replace('Link criado. Envie ao jogador; ele precisa abrir logado e aceitar.', 'Link reutilizável criado. Envie para todos os jogadores; cada um entra com a própria conta Discord.')
  .replace("const playersData = await api('/api/league/players').catch(() => ({ players: [] }));\n    const select = $('#clubInvitePlayer');\n    if (select) select.innerHTML = (playersData.players || []).map((player) => `<option value=\"${esc(player.id || player.discordId || '')}\">${esc(player.name || 'Jogador')} ${player.team ? '— ' + esc(player.team.name) : '— Livre'}</option>`).join('');\n", '');

// Torna o convite reutilizável: aceitar não encerra o link para os próximos jogadores.
routes = routes
  .replace(
    "        status: 'pending',\n        createdBy: user?.id || '',",
    "        status: 'pending',\n        reusable: true,\n        useCount: 0,\n        acceptedUsers: [],\n        rejectedUsers: [],\n        createdBy: user?.id || '',"
  )
  .replace(
    "return res.json({ success: true, message: 'Link de convite criado.', inviteUrl:",
    "return res.json({ success: true, message: 'Link reutilizável criado.', reusable: true, inviteUrl:"
  )
  .replace(
    "return res.json({ success: true, invite: { rosterSlot: match.invite.rosterSlot, note: match.invite.note || '', expiresAt: match.invite.expiresAt }, team:",
    "return res.json({ success: true, invite: { rosterSlot: match.invite.rosterSlot, note: match.invite.note || '', expiresAt: match.invite.expiresAt, reusable: true, useCount: Number(match.invite.useCount || 0) }, team:"
  );

const oldAccept = "      updated.joinInvites = validTeamInvites(updated).map((item) => item.tokenHash === match.tokenHash ? { ...item, status: 'accepted', acceptedBy: user?.id || '', acceptedDiscordId: user?.discordId || '', usedAt: new Date().toISOString() } : item);";
const newAccept = `      const acceptedIdentity = String(user?.discordId || user?.id || '').trim();
      updated.joinInvites = validTeamInvites(updated).map((item) => item.tokenHash === match.tokenHash ? {
        ...item,
        status: 'pending',
        reusable: true,
        useCount: Number(item.useCount || 0) + (currentTeam ? 0 : 1),
        acceptedUsers: Array.from(new Set([...(Array.isArray(item.acceptedUsers) ? item.acceptedUsers : []), acceptedIdentity].filter(Boolean))).slice(-100),
        lastUsedAt: new Date().toISOString()
      } : item);`;
if (routes.includes(oldAccept)) routes = routes.replace(oldAccept, newAccept);

const oldReject = "      const updated = { ...match.team, joinInvites: validTeamInvites(match.team).map((item) => item.tokenHash === match.tokenHash ? { ...item, status: 'rejected', rejectedBy: user?.id || '', rejectedDiscordId: user?.discordId || '', usedAt: new Date().toISOString() } : item), updatedAt: new Date().toISOString() };";
const newReject = `      const rejectedIdentity = String(user?.discordId || user?.id || '').trim();
      const updated = { ...match.team, joinInvites: validTeamInvites(match.team).map((item) => item.tokenHash === match.tokenHash ? {
        ...item,
        status: 'pending',
        reusable: true,
        rejectedUsers: Array.from(new Set([...(Array.isArray(item.rejectedUsers) ? item.rejectedUsers : []), rejectedIdentity].filter(Boolean))).slice(-100),
        lastRejectedAt: new Date().toISOString()
      } : item), updatedAt: new Date().toISOString() };`;
if (routes.includes(oldReject)) routes = routes.replace(oldReject, newReject);
routes = routes.replace("return res.json({ success: true, message: 'Convite recusado.' });", "return res.json({ success: true, message: 'Você recusou este convite para sua conta. O link continua disponível para outros jogadores.' });");

// Entrega assets essenciais diretamente com MIME JavaScript, sem resposta HTML/500.
if (!app.includes('hnl-critical-js-assets-v1')) {
  if (!app.includes("const fs = require('node:fs');")) {
    app = app.replace("const path = require('node:path');", "const path = require('node:path');\nconst fs = require('node:fs');");
  }
  const anchor = "  app.get(/^\\/(?:css|js|assets|uploads|images|img)\\/.+/, (req, res) => {";
  if (!app.includes(anchor)) throw new Error('Rota genérica de assets não encontrada para instalar JS dedicado.');
  const dedicated = `  // hnl-critical-js-assets-v1
  app.get([
    '/js/core/social-icons.js',
    '/js/core/league-navigation.js',
    '/js/core/league-experience.js',
    '/js/core/league-auth-ui.js',
    '/js/core/league-page-integrity.js',
    '/js/pages/team-invite.js',
    '/js/pages/bridge-card.js'
  ], (req, res) => {
    const relative = String(req.path || '').replace(/^\\/+/, '');
    const jsFile = path.join(PUBLIC_DIR, relative);
    fs.readFile(jsFile, (error, data) => {
      if (error) return res.status(404).type('text/plain; charset=utf-8').send('JavaScript não encontrado.');
      res.status(200);
      res.set('Content-Type', 'application/javascript; charset=utf-8');
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('X-HNL-JS-Route', 'hnl-critical-js-assets-v1');
      res.set('Content-Length', String(data.length));
      return res.end(data);
    });
  });

`;
  app = app.replace(anchor, dedicated + anchor);
}

for (const [file, source] of [[appFile, app], [routesFile, routes], [clientFile, client]]) {
  write(file, source);
  new Function(read(file));
}

for (const marker of [
  'hnl-critical-js-assets-v1',
  'Link reutilizável do clube',
  'Gerar link reutilizável',
  'reusable: true',
  'useCount: Number(item.useCount || 0)',
  "$$('[data-remove-club-member]', box).forEach"
]) {
  if (!app.includes(marker) && !routes.includes(marker) && !client.includes(marker)) {
    throw new Error(`Hotfix urgente incompleto: ${marker}`);
  }
}

console.log('[Times/Urgent] Link reutilizável para vários jogadores, remoção funcional e assets JS com MIME correto aplicados.');