const fs = require('node:fs');
const path = require('node:path');

const AUTH_FILE = path.join(__dirname, 'routes', 'discordAuthStable.routes.js');
const AUTH_UI_FILE = path.join(__dirname, '..', 'public', 'js', 'core', 'league-auth-ui.js');
const MARKER = 'hnl-discord-auth-recovery-guard-v1';
let changed = false;

if (fs.existsSync(AUTH_FILE)) {
  let source = fs.readFileSync(AUTH_FILE, 'utf8');
  if (!source.includes(MARKER)) {
    const anchor = `async function syncPendingDiscordUser(pending = {}) {
  let user = pending.discordId ? await findUserByDiscordId(pending.discordId) : null;
  if (!user && pending.email) user = await findUserByEmail(pending.email);
  return saveUser({`;
    const replacement = `async function syncPendingDiscordUser(pending = {}) {
  const recoveryGuardBuild = '${MARKER}';
  let user = pending.discordId ? await findUserByDiscordId(pending.discordId) : null;
  if (!user && pending.email) user = await findUserByEmail(pending.email);

  if (!user) {
    const expectedUsers = Math.max(1, Number(process.env.RECOVERY_EXPECTED_USERS || 11) || 11);
    const expectedTeams = Math.max(1, Number(process.env.RECOVERY_EXPECTED_TEAMS || 3) || 3);
    const database = await require('../storage').readDatabaseStatus().catch((error) => ({ error: error.message }));
    const users = Number(database?.users || 0);
    const teams = Number(database?.teams || 0);

    if (database?.error || users < expectedUsers || teams < expectedTeams) {
      const error = new Error('Os dados antigos da Arena ainda estão sendo recuperados. Nenhuma conta vazia foi criada.');
      error.code = 'DATA_RECOVERY_PENDING';
      error.recovery = { build: recoveryGuardBuild, users, teams, expectedUsers, expectedTeams };
      throw error;
    }
  }

  return saveUser({`;

    if (!source.includes(anchor)) {
      throw new Error('[Discord/Auth] Não foi possível localizar a sincronização do usuário pendente para aplicar a proteção de recuperação.');
    }
    source = source.replace(anchor, replacement);
    new Function(source);
    fs.writeFileSync(AUTH_FILE, source, 'utf8');
    changed = true;
  }
}

if (fs.existsSync(AUTH_UI_FILE)) {
  let ui = fs.readFileSync(AUTH_UI_FILE, 'utf8');
  if (!ui.includes('data_recovery_pending:')) {
    ui = ui.replace(
      "discord_state_error: 'A autorização expirou. Inicie o login novamente.'",
      "discord_state_error: 'A autorização expirou. Inicie o login novamente.',\n      data_recovery_pending: 'Seus dados antigos estão sendo recuperados. Aguarde o BOT concluir a restauração e tente novamente.'"
    );
    fs.writeFileSync(AUTH_UI_FILE, ui, 'utf8');
    changed = true;
  }
}

console.log(changed
  ? '[Discord/Auth] Proteção contra criação de conta vazia durante recuperação aplicada.'
  : '[Discord/Auth] Proteção de recuperação já estava aplicada.');
