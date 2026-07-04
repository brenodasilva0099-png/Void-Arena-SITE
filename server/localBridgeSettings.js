const fs = require('node:fs/promises');
const path = require('node:path');

const DATA_DIR = path.resolve(process.env.SESSION_DATA_DIR || process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
const FILE = path.join(DATA_DIR, 'site-bridge-settings.json');

async function readAll() {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8')) || {};
  } catch {
    return {};
  }
}

async function writeAll(data = {}) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(data, null, 2));
  return data;
}

async function readBridgeSettings(key = 'scrims') {
  const data = await readAll();
  return data[key] || { enabled: false, siteChannelId: `${key}-main`, discordChannelId: '', updatedAt: null };
}

async function writeBridgeSettings(key = 'scrims', settings = {}) {
  const data = await readAll();
  data[key] = {
    enabled: Boolean(settings.enabled),
    siteChannelId: String(settings.siteChannelId || `${key}-main`).trim() || `${key}-main`,
    discordChannelId: String(settings.discordChannelId || '').trim(),
    updatedAt: new Date().toISOString()
  };
  await writeAll(data);
  return data[key];
}

module.exports = { readBridgeSettings, writeBridgeSettings };
