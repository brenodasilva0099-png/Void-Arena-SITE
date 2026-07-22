const storage = require('./storage');
const { callBot } = require('./services/botApi.service');

const CHANNEL_ID = '1529298839121428592';
const CAPTAIN_ROLE_ID = '1500546857460564158';
const VOID_ARENA_ROLE_ID = '1523438475716853851';
const TEAM_OUTREACH_ROLE_ID = '1494869755914621168';
const MARKER_CHANNEL = 'hnl-system-publications';
const PUBLICATION_KEY = 'team-registration-guidance-2026-v1';
const CONTENT_REVISION = 'current-site-flow-v1';

const GUIDANCE_MESSAGE = `📣 **AVISOS — ᵗʰᵉ 𝙷𝚘𝚕𝚕𝚘𝚠 𝙽𝚎𝚡𝚞𝚜 ʟᴇᴀɢᴜᴇ**

🛡️ **CAPITÃES E RESPONSÁVEIS PELOS TIMES**

<@&${TEAM_OUTREACH_ROLE_ID}> **se o seu time ainda não está no servidor, acesse o site e compartilhe o link com todos os integrantes.** Assim, cada jogador poderá entrar com o Discord, ser reconhecido pelo sistema e participar dos eventos e campeonatos da liga.

🌐 **Site oficial:** https://hollow-nexus-league.onrender.com
📌 **Canal destas orientações:** <#${CHANNEL_ID}>

**Quem deve fazer o cadastro**
• Capitães com o cargo <@&${CAPTAIN_ROLE_ID}> são responsáveis por cadastrar e manter o elenco do time atualizado.
• Jogadores e capitães precisam entrar no site usando a própria conta do Discord.
• Depois do reconhecimento, o jogador deve resgatar o cargo Void Arena <@&${VOID_ARENA_ROLE_ID}> quando essa opção estiver disponível.

**Passo a passo no site**
1. Clique em **Entrar com Discord**.
2. Abra **Clubes**.
3. Clique em **Cadastrar Clube**.
4. Informe nome, tag, diretor/dono, capitão, titulares, reservas, logo/escudo e as conexões ou redes sociais do time.
5. Revise os dados e envie o cadastro.

**Como funciona o vínculo do elenco**
• Selecionar um jogador não o adiciona automaticamente ao time.
• O jogador recebe um convite nas notificações do site e também poderá receber uma DM do bot.
• O vínculo só é concluído depois que o próprio jogador aceita o convite.

✅ **Antes de finalizar**
• Todos os integrantes devem estar no servidor e registrados no site com Discord.
• Use somente jogadores reais do elenco e mantenha titulares e reservas atualizados.
• Confira se capitão, dono/diretor e conexões do time estão corretos.

⚠️ Não compartilhe contas e não cadastre jogadores sem a autorização deles. Em caso de dúvida ou erro no cadastro, chame a organização neste canal.`;

const state = {
  key: PUBLICATION_KEY,
  revision: CONTENT_REVISION,
  channelId: CHANNEL_ID,
  status: 'scheduled',
  publishedAt: null,
  updatedAt: null,
  discordMessageId: null,
  action: null,
  target: null,
  error: null
};

let running = null;

function parseMarker(message = {}) {
  try {
    const payload = JSON.parse(String(message.content || ''));
    return payload?.type === 'discord_publication' && payload?.key === PUBLICATION_KEY ? payload : null;
  } catch {
    return null;
  }
}

async function existingPublications() {
  const messages = await storage.readChatMessages({ channelId: MARKER_CHANNEL, limit: 100 });
  return messages.map(parseMarker).filter((marker) => marker?.status === 'published');
}

async function resolveTarget() {
  const [channelsData, rolesData] = await Promise.all([
    callBot('/internal/discord/channels', { method: 'GET' }),
    callBot('/internal/discord/roles', { method: 'GET' })
      .catch(() => callBot('/internal/discord/mentions', { method: 'GET' }))
  ]);
  const channels = Array.isArray(channelsData?.channels) ? channelsData.channels : [];
  const roles = Array.isArray(rolesData?.roles) ? rolesData.roles : [];
  const channel = channels.find((item) => String(item?.id || '') === CHANNEL_ID);
  const requiredRoles = [CAPTAIN_ROLE_ID, VOID_ARENA_ROLE_ID, TEAM_OUTREACH_ROLE_ID];
  const resolvedRoles = requiredRoles.map((id) => roles.find((role) => String(role?.id || '') === id)).filter(Boolean);
  const missingRoles = requiredRoles.filter((id) => !resolvedRoles.some((role) => String(role?.id || '') === id));

  if (!channel) throw new Error(`Canal ${CHANNEL_ID} não encontrado no servidor do bot.`);
  if (missingRoles.length) throw new Error(`Cargo(s) não encontrado(s): ${missingRoles.join(', ')}.`);

  return {
    channel: {
      id: CHANNEL_ID,
      name: channel.name || channel.displayName || 'canal',
      guildId: channel.guildId || '',
      guildName: channel.guildName || ''
    },
    roles: resolvedRoles.map((role) => ({ id: String(role.id), name: role.name || 'cargo' }))
  };
}

async function saveMarker(payload = {}) {
  return storage.saveChatMessage({
    channelId: MARKER_CHANNEL,
    source: 'system',
    authorId: 'hollow-nexus-site',
    authorName: 'Hollow Nexus League',
    content: JSON.stringify({
      type: 'discord_publication',
      key: PUBLICATION_KEY,
      revision: CONTENT_REVISION,
      channelId: CHANNEL_ID,
      ...payload
    }),
    attachments: [],
    createdAt: payload.updatedAt || payload.publishedAt || new Date().toISOString()
  });
}

function publicationPayload(content) {
  return {
    discordChannelId: CHANNEL_ID,
    content,
    allowedMentions: {
      parse: [],
      roles: [TEAM_OUTREACH_ROLE_ID],
      repliedUser: false
    }
  };
}

async function publishOnce() {
  const target = await resolveTarget();
  state.target = target;
  const publications = await existingPublications();
  const current = publications.find((marker) => marker.revision === CONTENT_REVISION);

  if (current) {
    Object.assign(state, {
      status: 'published',
      publishedAt: current.publishedAt || null,
      updatedAt: current.updatedAt || null,
      discordMessageId: current.discordMessageId || null,
      action: current.action || 'sent',
      target: current.target || target,
      error: null
    });
    console.log(`[Times/Avisos] Revisão ${CONTENT_REVISION} já publicada no canal ${CHANNEL_ID}.`);
    return { ...state, skipped: true };
  }

  const editable = publications.find((marker) => marker.discordMessageId);
  if (editable) {
    state.status = 'editing';
    await callBot('/internal/discord/edit-message', {
      method: 'PATCH',
      body: JSON.stringify({
        ...publicationPayload(GUIDANCE_MESSAGE),
        discordMessageId: editable.discordMessageId
      })
    });
    const updatedAt = new Date().toISOString();
    const publishedAt = editable.publishedAt || updatedAt;
    await saveMarker({ status: 'published', action: 'edited', publishedAt, updatedAt, discordMessageId: editable.discordMessageId, target });
    Object.assign(state, { status: 'published', publishedAt, updatedAt, discordMessageId: editable.discordMessageId, action: 'edited', target, error: null });
    console.log(`[Times/Avisos] Mensagem ${editable.discordMessageId} atualizada no canal ${CHANNEL_ID}.`);
    return { ...state, skipped: false, edited: true };
  }

  state.status = 'publishing';
  const sent = await callBot('/internal/discord/send-message', {
    method: 'POST',
    body: JSON.stringify(publicationPayload(GUIDANCE_MESSAGE))
  });
  const publishedAt = new Date().toISOString();
  const discordMessageId = sent.discordMessageId || sent.messageId || sent.id || sent.message?.id || null;
  await saveMarker({ status: 'published', action: 'sent', publishedAt, updatedAt: publishedAt, discordMessageId, target });
  Object.assign(state, { status: 'published', publishedAt, updatedAt: publishedAt, discordMessageId, action: 'sent', target, error: null });
  console.log(`[Times/Avisos] Orientações publicadas no canal ${CHANNEL_ID}${discordMessageId ? ` (mensagem ${discordMessageId})` : ''}.`);
  return { ...state, skipped: false };
}

function publishTeamRegistrationGuidance() {
  if (running) return running;
  running = publishOnce().catch((error) => {
    Object.assign(state, { status: 'failed', error: error.message });
    console.error('[Times/Avisos] Falha ao publicar:', error.message);
    return { ...state };
  });
  return running;
}

function publicationState() {
  return {
    ...state,
    messageLength: GUIDANCE_MESSAGE.length,
    mentionedRoleIds: [CAPTAIN_ROLE_ID, VOID_ARENA_ROLE_ID, TEAM_OUTREACH_ROLE_ID],
    notifiedRoleIds: [TEAM_OUTREACH_ROLE_ID]
  };
}

module.exports = {
  CHANNEL_ID,
  CAPTAIN_ROLE_ID,
  VOID_ARENA_ROLE_ID,
  TEAM_OUTREACH_ROLE_ID,
  PUBLICATION_KEY,
  GUIDANCE_MESSAGE,
  publishTeamRegistrationGuidance,
  publicationState
};
