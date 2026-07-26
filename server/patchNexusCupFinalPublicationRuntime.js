const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const storage = require('./storage');

const MARKER = 'hnl-nexus-cup-final-publication-v3-hq';
const FINAL_IMAGE = '/assets/nexus-cup-final.webp?v=20260726-hq3';
const MIN_EXPECTED_BYTES = 300000;
const assetPath = path.join(__dirname, '..', 'public', 'assets', 'nexus-cup-final.webp');
const encodedAssetPath = path.join(__dirname, 'assets', 'nexus-cup-final-hq-base64.txt');

function isNexusCup(event = {}) {
  const label = `${event.name || ''} ${event.title || ''} ${event.slug || ''}`;
  return /nexus\s*cup/i.test(label);
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function installSharpAsset() {
  if (!fs.existsSync(encodedAssetPath)) throw new Error('Fonte da arte nítida não encontrada.');

  const encoded = fs.readFileSync(encodedAssetPath, 'utf8').replace(/\s+/g, '');
  const next = Buffer.from(encoded, 'base64');
  const isWebp = next.length > 12
    && next.subarray(0, 4).toString('ascii') === 'RIFF'
    && next.subarray(8, 12).toString('ascii') === 'WEBP';
  const declaredBytes = next.length >= 8 ? next.readUInt32LE(4) + 8 : 0;
  const complete = next.length >= MIN_EXPECTED_BYTES && declaredBytes === next.length;

  if (!isWebp || !complete) {
    throw new Error(`Arte nítida inválida ou incompleta: bytes=${next.length}, RIFF=${declaredBytes}.`);
  }

  const current = fs.existsSync(assetPath) ? fs.readFileSync(assetPath) : null;
  if (current && sha256(current) === sha256(next)) {
    return { changed: false, bytes: next.length };
  }

  fs.mkdirSync(path.dirname(assetPath), { recursive: true });
  const temp = `${assetPath}.tmp-${process.pid}`;
  fs.writeFileSync(temp, next);
  fs.renameSync(temp, assetPath);
  return { changed: true, bytes: next.length };
}

const installed = installSharpAsset();

if (!storage.__hnlNexusCupClosedReadV1) {
  const originalReadEvents = storage.readEvents.bind(storage);
  storage.readEvents = async (...args) => {
    const events = await originalReadEvents(...args);
    if (!Array.isArray(events)) return events;
    return events.map((event) => isNexusCup(event) ? {
      ...event,
      status: 'finished',
      registrationStatus: 'closed',
      registrationOpen: false,
      isRegistrationOpen: false,
      endedAt: event.endedAt || '2026-07-25T23:59:00-03:00'
    } : event);
  };
  storage.__hnlNexusCupClosedReadV1 = true;
}

const pagePath = path.join(__dirname, '..', 'public', 'pages', 'resultados.html');
if (!fs.existsSync(pagePath)) {
  console.warn('[Resultados/Nexus Cup] Página de Resultados ausente; SITE continuará online.');
  return;
}

let html = fs.readFileSync(pagePath, 'utf8');

const section = `
<section id="nexusCupFinalPublication" data-publication="${MARKER}" style="margin:18px 0 24px">
  <article style="overflow:hidden;border:1px solid rgba(168,85,247,.42);border-radius:22px;background:linear-gradient(145deg,rgba(19,16,42,.98),rgba(8,11,27,.98));box-shadow:0 24px 70px rgba(55,16,110,.28)">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.08);flex-wrap:wrap">
      <div>
        <span style="display:inline-flex;padding:6px 10px;border-radius:999px;background:rgba(245,158,11,.15);border:1px solid rgba(245,158,11,.48);color:#ffd27a;font-weight:800;font-size:12px;letter-spacing:.08em;text-transform:uppercase">Evento encerrado</span>
        <h2 style="margin:10px 0 4px;font-size:clamp(24px,3vw,38px);color:#fff">Nexus Cup — 1ª Edição</h2>
        <p style="margin:0;color:#c9c3e6">Resultado final oficial e agradecimento às equipes participantes.</p>
      </div>
      <strong style="color:#c084fc;font-size:14px;letter-spacing:.08em">25/07/2026</strong>
    </div>
    <a href="${FINAL_IMAGE}" target="_blank" rel="noopener" style="display:flex;justify-content:center;background:#05030d">
      <img src="${FINAL_IMAGE}" width="1448" height="1086" alt="Resultado final da Nexus Cup: Flow Theory campeão, Griffin Gaming vice-campeão e Império do Nordeste em terceiro lugar" loading="eager" decoding="async" style="display:block;width:min(100%,1200px);height:auto;object-fit:contain;image-rendering:auto">
    </a>
    <div style="padding:20px;text-align:center">
      <h3 style="margin:0 0 8px;color:#fff;font-size:24px">Obrigado a todos os times participantes!</h3>
      <p style="margin:0 auto;max-width:850px;color:#d7d2ec;line-height:1.7">Agradecemos por fazerem parte da Nexus Cup — 1ª Edição e por entregarem grandes partidas. Parabéns à <strong style="color:#fbbf24">Flow Theory</strong> pelo título, à <strong style="color:#a78bfa">Griffin Gaming</strong> pelo vice-campeonato e ao <strong style="color:#fb923c">Império do Nordeste</strong> pelo terceiro lugar. Nos vemos na próxima edição!</p>
    </div>
  </article>
</section>`;

if (html.includes('id="nexusCupFinalPublication"')) {
  html = html.replace(/<section id="nexusCupFinalPublication"[\s\S]*?<\/section>/, section.trim());
} else if (html.includes('</main>')) {
  html = html.replace('</main>', `${section}\n</main>`);
} else {
  html = html.replace('</body>', `${section}\n</body>`);
}

fs.writeFileSync(pagePath, html, 'utf8');
console.log(`[Resultados/Nexus Cup] Arte nítida instalada (${installed.bytes} bytes); publicação inserida e evento mantido como Encerrado.`);
