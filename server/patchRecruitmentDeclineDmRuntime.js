const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, 'routes', 'notifications.routes.js');
let changed = false;

if (fs.existsSync(file)) {
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes('FRM_DECLINE_RECRUITMENT_DM_V1')) {
    const needle = "      const saved = await storage.updateChatMessage(raw.id, { content: JSON.stringify(next) }, { channelId: NOTIFICATION_CHANNEL });";
    const insert = String.raw`
      // FRM_DECLINE_RECRUITMENT_DM_V1
      if (notification.type === 'recruitment_invite' && action === 'decline') {
        const captainDiscordId = notification.sender?.discordId || notification.team?.captainDiscordId || notification.captainDiscordId || '';
        if (captainDiscordId) {
          callBot('/internal/discord/message-player', {
            method: 'POST',
            body: JSON.stringify({
              discordId: captainDiscordId,
              content: '❌ **Convite recusado — Hollow Nexus FRM**\n\nO jogador **' + userName(user) + '** recusou o convite para entrar no clube **' + (notification.team?.name || notification.teamName || 'seu clube') + '**.',
              authorId: user?.id || '',
              authorName: userName(user || {}),
              meta: { type: 'recruitment_invite_declined', teamId: notification.team?.id || notification.teamId || '', notificationId: notification.id || '' }
            })
          }).catch(() => null);
        }
      }
`;
    if (src.includes(needle)) {
      src = src.replace(needle, insert + '\n' + needle);
      fs.writeFileSync(file, src, 'utf8');
      changed = true;
    }
  }
}

console.log(changed ? '[Recrutamento] DM de convite recusado aplicada.' : '[Recrutamento] DM de convite recusado ja estava aplicada.');
