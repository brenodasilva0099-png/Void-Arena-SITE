const fs = require("fs");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, content) {
  fs.writeFileSync(path, content, "utf8");
}

function assertChanged(before, after, label) {
  if (before === after) {
    console.log(`- ${label}: sem alterações necessárias`);
  } else {
    console.log(`- ${label}: OK`);
  }
}

// =========================================================
// 1) SITE: /api/bot deve usar marca do servidor, não avatar/nome do bot
// =========================================================
let app = read("server/app.js");
const appBefore = app;

if (!app.includes("async function fetchDiscordGuildBrandFromBot")) {
  const marker = [
"  async function fetchDiscordApplicationFromApi() {",
"    const token = process.env.DISCORD_TOKEN;",
"    if (!token) return null;",
"",
"    try {",
"      const response = await fetch('https://discord.com/api/v10/applications/@me', {",
"        headers: { Authorization: `Bot ${token}` }",
"      });",
"",
"      if (!response.ok) return null;",
"      return await response.json();",
"    } catch {",
"      return null;",
"    }",
"  }"
].join("\n");

  const insert = marker + "\n\n" + [
"  async function fetchDiscordGuildBrandFromBot() {",
"    try {",
"      const response = await fetch(`${BOT_API_URL}/public/guild-brand?t=${Date.now()}`, {",
"        headers: { Accept: 'application/json' }",
"      });",
"",
"      const data = await response.json().catch(() => ({}));",
"      if (!response.ok || data.success === false) return null;",
"",
"      return data.guild || null;",
"    } catch {",
"      return null;",
"    }",
"  }"
].join("\n");

  if (!app.includes(marker)) {
    throw new Error("Não achei fetchDiscordApplicationFromApi para inserir guild brand.");
  }
  app = app.replace(marker, insert);
}

if (!app.includes("app.get('/api/server-icon.png'")) {
  const marker = "  app.get('/api/bot', async (_req, res) => {";
  const route = [
"  app.get('/api/server-icon.png', async (_req, res) => {",
"    const guildBrand = await fetchDiscordGuildBrandFromBot();",
"    if (guildBrand?.icon) {",
"      res.set('Cache-Control', 'public, max-age=120');",
"      return res.redirect(guildBrand.icon);",
"    }",
"",
"    res.set('Cache-Control', 'no-store');",
"    return res.redirect('/assets/abyss-profile.png');",
"  });",
"",
marker
].join("\n");

  if (!app.includes(marker)) {
    throw new Error("Não achei rota /api/bot para inserir /api/server-icon.png.");
  }
  app = app.replace(marker, route);
}

app = app.replace(
"    const apiBotUser = await fetchDiscordBotUserFromApi();\n    const apiApplication = await fetchDiscordApplicationFromApi();",
"    const guildBrand = await fetchDiscordGuildBrandFromBot();\n    const apiBotUser = await fetchDiscordBotUserFromApi();\n    const apiApplication = await fetchDiscordApplicationFromApi();"
);

app = app.replace(
"    const online = Boolean(client?.user || apiBotUser);",
"    const online = Boolean(client?.user || apiBotUser || guildBrand);"
);

app = app.replace(
"    const applicationName = apiApplication?.name || application?.name || null;\n    const displayName = 'Void Arena';",
"    const applicationName = apiApplication?.name || application?.name || null;\n    const serverName = guildBrand?.name || 'Hollow Nexus';\n    const displayName = serverName;"
);

app = app.replace(
"    const avatar = avatarHash && botId\n      ? discordAvatarUrl({ id: botId, avatar: avatarHash }, 256)\n      : null;",
"    const botAvatar = avatarHash && botId\n      ? discordAvatarUrl({ id: botId, avatar: avatarHash }, 256)\n      : null;\n    const avatar = guildBrand?.icon || botAvatar || null;"
);

app = app.replace(
"      applicationName,\n      displayName,\n      tag,\n      id: botId,\n      guilds: client?.guilds?.cache?.size || 0,\n      avatar,\n      fetchedAt: new Date().toISOString()",
"      applicationName,\n      serverName,\n      guildName: serverName,\n      displayName,\n      tag,\n      id: botId,\n      guildId: guildBrand?.id || null,\n      guilds: client?.guilds?.cache?.size || (guildBrand ? 1 : 0),\n      avatar,\n      guildIcon: guildBrand?.icon || null,\n      botAvatar,\n      fetchedAt: new Date().toISOString()"
);

// reforço definitivo: seu Discord ID sempre é dono/admin, mesmo se env vier zoada
app = app.replace(
"const DEFAULT_OWNER_DISCORD_IDS = ['1235713276277559326'];",
"const DEFAULT_OWNER_DISCORD_IDS = ['1235713276277559326'];"
);

write("server/app.js", app);
assertChanged(appBefore, app, "server/app.js");


// =========================================================
// 2) SITE: dashboard não deve piscar nome/avatar do bot
// =========================================================
let js = read("public/js/dashboard.js");
const jsBefore = js;

js = js.replace(
"    const displayName = data.applicationName || data.displayName || data.name || data.username || (data.tag ? String(data.tag).split('#')[0] : '');\n    if (displayName && botDisplayName) {\n      botDisplayName.textContent = displayName;\n      document.title = `Painel | ${displayName}`;\n    }",
"    const displayName = data.guildName || data.serverName || data.displayName || data.name || 'Hollow Nexus';\n    if (displayName && botDisplayName) {\n      botDisplayName.textContent = displayName;\n      document.title = `Painel | ${displayName}`;\n    }\n\n    const eyebrow = botDisplayName?.closest('.topbar-title')?.querySelector('.eyebrow');\n    if (eyebrow) eyebrow.textContent = 'Servidor';"
);

write("public/js/dashboard.js", js);
assertChanged(jsBefore, js, "public/js/dashboard.js");

let html = read("public/pages/dashboard.html");
const htmlBefore = html;

html = html.replace('src="/assets/abyss-profile.png"', 'src="/api/server-icon.png"');
html = html.replace('<strong id="botDisplayName">Void Arena</strong>', '<strong id="botDisplayName">Hollow Nexus</strong>');
html = html.replace('<p class="eyebrow">Painel do torneio</p>', '<p class="eyebrow">Servidor</p>');
html = html.replace('alt="Perfil Void Arena"', 'alt="Perfil Hollow Nexus"');

write("public/pages/dashboard.html", html);
assertChanged(htmlBefore, html, "public/pages/dashboard.html");

console.log("SITE FINAL FIX OK");
