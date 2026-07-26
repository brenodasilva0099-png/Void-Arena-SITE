const fs = require('node:fs');
const path = require('node:path');

const storage = require('./storage');

const MARKER = 'hnl-nexus-cup-final-publication-v1';
const FINAL_IMAGE = '/assets/nexus-cup-final.webp?v=20260726';

function isNexusCup(event = {}) {
  const label = `${event.name || ''} ${event.title || ''} ${event.slug || ''}`;
  return /nexus\s*cup/i.test(label);
}

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
    <a href="${FINAL_IMAGE}" target="_blank" rel="noopener" style="display:block;background:#05030d">
      <img src="${FINAL_IMAGE}" alt="Resultado final da Nexus Cup: Flow Theory campeão, Griffin Gaming vice-campeão e Império do Nordeste em terceiro lugar" loading="eager" style="display:block;width:100%;height:auto;max-height:900px;object-fit:contain;margin:auto">
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
console.log('[Resultados/Nexus Cup] Arte final publicada; evento exibido como Encerrado sem remover times ou inscrições.');
