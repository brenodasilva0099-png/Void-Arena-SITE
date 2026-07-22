const storage = require('./storage');
const { callBot } = require('./services/botApi.service');

const CHANNEL_ID = '1524621308682436740';
const MARKER_CHANNEL = 'hnl-system-publications';
const PUBLICATION_KEY = 'nexus-cup-rules-2026-v1';

const RULES_MESSAGE = `🏆 **NEXUS CUP — REGRAS OFICIAIS**

✅ **Para participar**
• Inscrição aprovada, elenco confirmado e capitão disponível para os avisos.
• Usar somente jogadores inscritos, comparecer no horário e acompanhar o canal oficial.
• Cumprir cada série em **MD3 (melhor de 3)** e gravar clipes caso queira revisão.

🧩 **Formato**
• **8 equipes** em **2 grupos de 4**, todos contra todos no próprio grupo.
• Avançam os **2 maiores pontuadores de cada grupo**.
• Semifinais: **1º A × 2º B** e **1º B × 2º A**; vencedores fazem a final.

📊 **Pontuação e desempate**
• Derrota: **0 pt** | Vitória 2×1: **3 pts** | Vitória 2×0: **4 pts**.
• Empate duplo: confronto direto.
• Empate triplo: 1) saldo de gols; 2) gols feitos; 3) menos gols sofridos.

⏱️ **Regra da cera**
• Ao dominar a posse, a equipe tem **20s** para fazer a jogada ofensiva.
• O tempo reinicia após desvio, rebote ou perda de posse, quando uma equipe voltar a dominar a bola.
• Há pequena tolerância após os 20s; não peça revisão por poucos segundos.
• No kick-off, o primeiro ataque tem **30s**.
• 1ª infração: advertência | 2ª: perda da partida | posse acima de **40s**: perda da partida.

🛡️ **Quatro jogadores na área**
Permitido apenas nos **30s finais** ou quando o adversário também estiver com 4 jogadores na área. 1ª infração: advertência; 2ª: gol para o adversário.

🎥 **Revisão de lance**
• Obrigatório apresentar **clipe como prova**.
• Não pare a partida para mostrar a prova. O jogo continua e o prejuízo da interrupção é responsabilidade da própria equipe.
• Entregue o clipe ao espectador **logo após a partida**. Se outra partida começar, a prova será invalidada.

❌ **Não pode**
Usar jogador fora do elenco, enviar prova falsa, interromper o jogo para revisão, explorar falhas ou desrespeitar as regras de cera e de área.

⚠️ As penalidades anunciadas serão aplicadas pela staff.
Ao participar, todo o elenco confirma que leu e aceitou estas regras.`;

const state = {
  key: PUBLICATION_KEY,
  channelId: CHANNEL_ID,
  status: 'scheduled',
  publishedAt: null,
  discordMessageId: null,
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

async function existingPublication() {
  const messages = await storage.readChatMessages({ channelId: MARKER_CHANNEL, limit: 100 }).catch(() => []);
  for (const message of messages) {
    const marker = parseMarker(message);
    if (marker?.status === 'published') return marker;
  }
  return null;
}

async function saveMarker(payload = {}) {
  return storage.saveChatMessage({
    channelId: MARKER_CHANNEL,
    source: 'system',
    authorId: 'hollow-nexus-site',
    authorName: 'Hollow Nexus League',
    content: JSON.stringify({ type: 'discord_publication', key: PUBLICATION_KEY, channelId: CHANNEL_ID, ...payload }),
    attachments: [],
    createdAt: payload.publishedAt || new Date().toISOString()
  });
}

async function publishOnce() {
  const existing = await existingPublication();
  if (existing) {
    Object.assign(state, {
      status: 'published',
      publishedAt: existing.publishedAt || null,
      discordMessageId: existing.discordMessageId || null,
      error: null
    });
    console.log(`[Nexus Cup/Regras] Publicação ${PUBLICATION_KEY} já existe no canal ${CHANNEL_ID}.`);
    return { ...state, skipped: true };
  }

  state.status = 'publishing';
  const sent = await callBot('/internal/discord/send-message', {
    method: 'POST',
    body: JSON.stringify({
      discordChannelId: CHANNEL_ID,
      content: RULES_MESSAGE,
      allowedMentions: { parse: [] }
    })
  });

  const publishedAt = new Date().toISOString();
  const discordMessageId = sent.discordMessageId || sent.messageId || sent.id || sent.message?.id || null;
  await saveMarker({ status: 'published', publishedAt, discordMessageId });
  Object.assign(state, { status: 'published', publishedAt, discordMessageId, error: null });
  console.log(`[Nexus Cup/Regras] Regras publicadas no canal ${CHANNEL_ID}${discordMessageId ? ` (mensagem ${discordMessageId})` : ''}.`);
  return { ...state, skipped: false };
}

function publishNexusCupRules() {
  if (running) return running;
  running = publishOnce().catch((error) => {
    Object.assign(state, { status: 'failed', error: error.message });
    console.error('[Nexus Cup/Regras] Falha ao publicar:', error.message);
    return { ...state };
  });
  return running;
}

function publicationState() {
  return { ...state, messageLength: RULES_MESSAGE.length };
}

module.exports = {
  CHANNEL_ID,
  PUBLICATION_KEY,
  RULES_MESSAGE,
  publishNexusCupRules,
  publicationState
};
