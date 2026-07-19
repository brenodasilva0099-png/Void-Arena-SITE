const fs = require('node:fs');
const path = require('node:path');

const pagesDir = path.join(__dirname, '..', 'public', 'pages');
const topHref = {
  inicio: '/pages/dashboard.html',
  competitivo: '/pages/competicoes.html',
  clubes: '/pages/clubes.html',
  jogadores: '/pages/atletas.html',
  cafe: '/pages/cafe-com-leite.html',
  admin: '/pages/administracao.html'
};
const pageState = {
  'dashboard.html': ['inicio', ''],
  'competicoes.html': ['competitivo', '/pages/competicoes.html'],
  'competicao.html': ['competitivo', '/pages/competicoes.html'],
  'eventos.html': ['competitivo', '/pages/eventos.html'],
  'chaveamento.html': ['competitivo', '/pages/chaveamento.html'],
  'grupos.html': ['competitivo', '/pages/grupos.html'],
  'resultados.html': ['competitivo', '/pages/resultados.html'],
  'rankings.html': ['competitivo', '/pages/rankings.html'],
  'calendario.html': ['competitivo', '/pages/calendario.html'],
  'clubes.html': ['clubes', '/pages/clubes.html'],
  'times.html': ['clubes', '/pages/clubes.html'],
  'cadastrar-clube.html': ['clubes', '/pages/cadastrar-clube.html'],
  'elencos.html': ['clubes', '/pages/elencos.html'],
  'perfil-clube.html': ['clubes', '/pages/clubes.html'],
  'prancheta-tatica.html': ['clubes', '/pages/prancheta-tatica.html'],
  'transferencias.html': ['clubes', '/pages/transferencias.html'],
  'atletas.html': ['jogadores', '/pages/atletas.html'],
  'jogadores.html': ['jogadores', '/pages/atletas.html'],
  'perfil-jogador.html': ['jogadores', '/pages/atletas.html'],
  'mercado.html': ['jogadores', '/pages/mercado.html'],
  'recrutamento.html': ['jogadores', '/pages/mercado.html'],
  'cafe-com-leite.html': ['cafe', ''],
  'administracao.html': ['admin', ''],
  'formularios.html': ['admin', '/pages/formularios.html'],
  'permissoes.html': ['admin', '/pages/permissoes.html'],
  'configuracoes.html': ['admin', '/pages/configuracoes.html'],
  'analise-partidas.html': ['admin', '/pages/analise-partidas.html']
};

function applyActive(section, targetHref) {
  if (!section) return section;
  let out = section.replace(/<a\s+class="active"/g, '<a class=""');
  if (!targetHref) return out;
  const escaped = targetHref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  out = out.replace(new RegExp(`<a\\s+class="[^"]*"\\s+href="${escaped}"`), `<a class="active" href="${targetHref}"`);
  out = out.replace(new RegExp(`<a\\s+href="${escaped}"`), `<a class="active" href="${targetHref}"`);
  return out;
}

let changed = 0;
for (const [name, [tab, sideHref]] of Object.entries(pageState)) {
  const file = path.join(pagesDir, name);
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  html = html.replace(/<nav class="frm-tabs">[\s\S]*?<\/nav>/i, (section) => applyActive(section, topHref[tab] || ''));
  html = html.replace(/<nav class="frm-nav">[\s\S]*?<\/nav>/i, (section) => applyActive(section, sideHref));
  if (html !== before) {
    fs.writeFileSync(file, html, 'utf8');
    changed += 1;
  }
}

console.log(`[League/Nav] Estado ativo revisado em ${changed} página(s).`);
