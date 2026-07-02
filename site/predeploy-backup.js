require('dotenv').config();

const BOT_URL = String(process.env.BOT_API_URL || process.env.PUBLIC_BOT_URL || 'https://void-arena-bot.onrender.com').replace(/\/$/, '');
const TOKEN = process.env.BOT_API_KEY || process.env.INTERNAL_API_TOKEN || process.env.SITE_REALTIME_TOKEN || '';

async function main() {
  if (!TOKEN) {
    console.log('Backup pre-deploy ignorado: BOT_API_KEY/INTERNAL_API_TOKEN não configurado no Render do SITE.');
    return;
  }

  const response = await fetch(`${BOT_URL}/internal/backup/github/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-bot-api-key': TOKEN,
      'x-internal-token': TOKEN
    },
    body: JSON.stringify({
      reason: `pre-site-deploy:${process.env.RENDER_GIT_COMMIT || 'manual'}`
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Falha ao criar backup pre-deploy pelo BOT (${response.status}).`);
  }

  console.log('Backup pre-deploy do banco criado pelo SITE:', data.summary || data.githubBackup || data.manifest || data);
}

main().catch((error) => {
  console.error('Falha no backup pre-deploy do SITE:', error.message);
  process.exit(1);
});
