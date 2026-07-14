const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const pagesDir = path.join(ROOT, 'public', 'pages');
const cssFile = path.join(ROOT, 'public', 'css', 'federation-no-mock.css');
const jsFile = path.join(ROOT, 'public', 'js', 'core', 'federation-no-mock.js');
const BUILD = '2026-07-14-frm-no-mock-v1';
const CSS = '/css/federation-no-mock.css?v=' + BUILD;
const JS = '/js/core/federation-no-mock.js?v=' + BUILD;
let changed = false;

function ensure(file) { fs.mkdirSync(path.dirname(file), { recursive: true }); }
function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function write(file, content) { ensure(file); if (read(file) !== content) { fs.writeFileSync(file, content, 'utf8'); changed = true; } }

const css = String.raw`
/* FRM no-mock final pass */
.frm-profile-chip{width:42px;height:42px;display:inline-grid;place-items:center;border-radius:999px;border:1px solid rgba(168,85,247,.5);background:rgba(139,92,246,.14);box-shadow:0 0 20px rgba(139,92,246,.22);overflow:hidden;text-decoration:none}.frm-profile-chip img{width:100%;height:100%;object-fit:cover;border-radius:999px}.frm-empty{border:1px dashed rgba(168,85,247,.32);border-radius:12px;padding:18px;color:#a7aec5;background:rgba(255,255,255,.025)}.frm-list-row.is-empty{grid-template-columns:1fr}.frm-card[data-real-empty="true"]{opacity:.9}.frm-card h2 small{font-size:12px;color:#a7aec5;font-weight:600}.frm-calendar-note{margin-top:10px;color:#a7aec5}.frm-no-old-warning{display:none!important}a[href="/"],a[href="/index.html"]{cursor:pointer}.frm-main{min-height:100vh}.frm-sidebar{min-height:100vh;background:linear-gradient(180deg,rgba(2,4,10,.98),rgba(2,4,10,.98))!important}.frm-footer a{pointer-events:auto}.frm-socials span[data-disabled="true"]{opacity:.45;filter:grayscale(1)}
`;

const js = String.raw`
(function(){
 const LOGO='/api/brand/icon?v=2026-07-14-frm-no-mock-v1';
 const $=(s,r=document)=>r.querySelector(s); const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
 const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const fmt=v=>{if(!v)return 'sem data definida';const d=new Date(v);return isNaN(d)?esc(v):d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})};
 const nameOf=u=>u?.profile?.username||u?.profile?.displayName||u?.name||u?.username||u?.discordId||'Atleta';
 const teamName=t=>t?.name||t?.teamName||t?.tag||'Clube';
 async function api(url,opt){const r=await fetch(url,{credentials:'include',cache:'no-store',...(opt||{})});const d=await r.json().catch(()=>({}));if(!r.ok||d.success===false)throw new Error(d.message||String(r.status));return d;}
 function empty(text){return '<div class="frm-empty">'+esc(text)+'</div>'}
 function cardByTitle(title){return $$('.frm-card').find(c=>(c.querySelector('h2')?.textContent||'').trim().toLowerCase().startsWith(title.toLowerCase()))}
 function rewriteOldLinks(){const map={'/':'/pages/dashboard.html','/index.html':'/pages/dashboard.html','/pages/times.html':'/pages/clubes.html','/pages/jogadores.html':'/pages/atletas.html','/pages/recrutamento.html':'/pages/mercado.html'};$$('a[href]').forEach(a=>{const href=a.getAttribute('href');if(map[href])a.setAttribute('href',map[href]);});}
 async function profileButton(){const login=$('[data-frm-login]');if(!login)return;try{const me=await api('/api/me');const u=me.user||{};login.className='frm-profile-chip';login.href='/pages/perfil.html';login.title='Abrir perfil de '+esc(nameOf(u));login.innerHTML='<img alt="Perfil" src="'+esc(u.avatar||LOGO)+'">';}catch{login.className='frm-btn';login.href='/pages/perfil.html';login.innerHTML='♙ Entrar / Painel';}}
 async function notificationBadges(){try{const n=await api('/api/notifications');$$('[data-frm-unread],[data-frm-mail]').forEach(b=>b.textContent=String(n.unread||0));}catch{$$('[data-frm-unread],[data-frm-mail]').forEach(b=>b.textContent='0');}}
 async function overview(){try{return await api('/api/federation/overview')}catch{return{teams:[],players:[],events:[],news:[],stats:{clubes:0,atletas:0,competicoes:0,partidas:0,gols:0},season:{}}}}
 async function news(){try{return (await api('/api/federation/news')).news||[]}catch{return[]}}
 function realCompetitionRows(events){if(!events.length)return empty('Nenhuma competição real cadastrada ainda. Quando uma competição for criada no painel, ela aparece aqui automaticamente.');return events.map(e=>'<div class="frm-list-row"><img class="frm-team-logo" src="'+LOGO+'"><div><strong>'+esc(e.name||e.title||'Competição')+'</strong><br><small>'+esc(e.matchFormat||e.format||'Formato em definição')+' • '+fmt(e.startAt||e.date)+'</small></div><a class="frm-btn" href="/pages/competicoes.html">Abrir</a></div>').join('')}
 function realNewsRows(items){if(!items.length)return empty('Nenhum comunicado oficial publicado ainda.');return items.map(n=>'<div class="frm-list-row"><span>🟣</span><div><strong>'+esc(n.title||'Comunicado')+'</strong><br><small>'+esc(n.message||n.note||'')+'</small></div><small>'+fmt(n.createdAt)+'</small></div>').join('')}
 async function fixDashboard(){const d=await overview();const s=d.stats||{};const vals={clubes:s.clubes??0,atletas:s.atletas??0,competicoes:s.competicoes??0,partidas:s.partidas??0,gols:s.gols??0};Object.entries(vals).forEach(([k,v])=>$$('[data-stat="'+k+'"]').forEach(e=>e.textContent=String(Number(v)||0)));const season=$('#seasonDates');if(season)season.textContent=(d.season?.startAt||d.season?.endAt)?('Início '+fmt(d.season.startAt)+' • Término '+fmt(d.season.endAt)):'Temporada oficial ainda sem datas cadastradas.';const comp=cardByTitle('Competições em destaque');if(comp){const list=comp.querySelector('.frm-list')||comp;list.innerHTML=realCompetitionRows(d.events||[]);comp.dataset.realEmpty=String(!(d.events||[]).length);}const rank=$('#homeClubRanking');if(rank){const teams=(d.teams||[]).slice(0,8);rank.innerHTML=teams.length?teams.map((t,i)=>'<div class="frm-list-row"><b class="frm-rank-badge">'+(i+1)+'</b><div><strong>'+esc(teamName(t))+'</strong><br><small>Pontuação oficial ainda não registrada</small></div><span>0 pts</span></div>').join(''):empty('Nenhum clube cadastrado ainda.');}const newsCard=cardByTitle('Últimas notícias');if(newsCard){const list=newsCard.querySelector('.frm-list')||newsCard;list.innerHTML=realNewsRows(await news());}}
 async function fixCompetitions(){const box=$('#competitionsList');if(!box)return;const d=await overview();const events=d.events||[];box.innerHTML=events.length?events.map(e=>'<article class="frm-card"><span class="frm-pill green">Cadastrada</span><h2>'+esc(e.name||e.title||'Competição')+'</h2><p>Formato '+esc(e.matchFormat||e.format||'em definição')+' • Limite '+esc(e.teamLimit||e.slots||'em definição')+' clubes • Início '+fmt(e.startAt||e.date)+'</p><a class="frm-btn primary" href="/pages/eventos.html">Inscrição / detalhes</a></article>').join(''):empty('Nenhuma competição oficial cadastrada ainda.');}
 async function fixCalendar(){const grid=$('#calendarGrid');if(!grid)return;const d=await overview();const names=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];let html=names.map(x=>'<div class="frm-calendar-head">'+x+'</div>').join('');const events=[];(d.events||[]).forEach(e=>{const dt=new Date(e.startAt||e.date||'');if(!isNaN(dt)&&dt.getMonth()===6&&dt.getFullYear()===2026)events.push({day:dt.getDate(),label:e.name||e.title||'Competição',href:'/pages/competicoes.html'});});for(let i=0;i<3;i++)html+='<div class="frm-day out"></div>';for(let day=1;day<=31;day++){html+='<div class="frm-day"><strong>'+day+'</strong>'+events.filter(e=>e.day===day).map(e=>'<a class="frm-event-dot" href="'+e.href+'">'+esc(e.label)+'</a>').join('')+'</div>';}grid.innerHTML=html;let note=$('.frm-calendar-note');if(!note){note=document.createElement('p');note.className='frm-calendar-note';grid.parentElement.appendChild(note);}note.textContent=events.length?'Calendário alimentado pelas competições reais cadastradas.':'Nenhum evento com data em julho foi cadastrado ainda.';}
 async function fixEvents(){const q=$('#cafeQueue'),r=$('#cafeRanking');if(!q&&!r)return;let data={queue:[],ranking:[]};try{data=await api('/api/federation/cafe-com-leite')}catch{}if(q)q.innerHTML=data.queue?.length?data.queue.map(x=>'<div class="frm-list-row"><img class="frm-avatar" src="'+esc(x.avatar||LOGO)+'"><div><strong>'+esc(x.name)+'</strong><br><small>'+esc(x.role||'Livre')+' • '+esc(x.note||'Sem observação')+'</small></div><span class="frm-pill">Fila</span></div>').join(''):empty('Fila vazia. Nenhuma inscrição no Café com Leite ainda.');if(r)r.innerHTML=data.ranking?.length?data.ranking.map((x,i)=>'<div class="frm-list-row"><b>'+(i+1)+'</b><div><strong>'+esc(x.name)+'</strong><br><small>'+(x.matches||0)+' participações</small></div><span>'+(x.points||0)+' pts</span></div>').join(''):empty('Ranking individual começa zerado.');}
 async function run(){rewriteOldLinks();await profileButton();await notificationBadges();const m=document.body.dataset.frmModule||'';if(m==='dashboard')await fixDashboard();if(m==='competitions')await fixCompetitions();if(m==='calendar')await fixCalendar();if(m==='events')await fixEvents();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,250));else setTimeout(run,250);
})();
`;

function injectAssets() {
  if (!fs.existsSync(pagesDir)) return;
  for (const entry of fs.readdirSync(pagesDir)) {
    if (!entry.endsWith('.html')) continue;
    const file = path.join(pagesDir, entry);
    let html = read(file);
    if (!html) continue;
    const before = html;
    if (!html.includes('/css/federation-no-mock.css')) html = html.replace('</head>', `  <link rel="stylesheet" href="${CSS}" />\n</head>`);
    if (!html.includes('/js/core/federation-no-mock.js')) html = html.replace('</body>', `  <script src="${JS}"></script>\n</body>`);
    html = html.replace(/href="\/"/g, 'href="/pages/dashboard.html"').replace(/href="\/index\.html"/g, 'href="/pages/dashboard.html"').replace(/href="\/pages\/times\.html"/g, 'href="/pages/clubes.html"').replace(/href="\/pages\/jogadores\.html"/g, 'href="/pages/atletas.html"').replace(/href="\/pages\/recrutamento\.html"/g, 'href="/pages/mercado.html"');
    if (html !== before) { fs.writeFileSync(file, html, 'utf8'); changed = true; }
  }
}

write(cssFile, css);
write(jsFile, js);
injectAssets();
console.log(changed ? '[Federacao] Camada No Mock aplicada.' : '[Federacao] Camada No Mock ja estava aplicada.');
