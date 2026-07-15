const fs = require('node:fs');
const path = require('node:path');

const jsFile = path.join(__dirname, '..', 'public', 'js', 'core', 'federation-polish.js');
fs.mkdirSync(path.dirname(jsFile), { recursive: true });

const js = String.raw`
(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const page = document.body.dataset.frmModule || '';
  const logo = '/api/brand/icon?v=frm-js-safe-v1';

  async function api(url, opt){
    const res = await fetch(url, { credentials:'include', cache:'no-store', ...(opt || {}) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.success === false) throw new Error(data.message || String(res.status));
    return data;
  }
  function esc(v){ return String(v ?? '').replace(/[&<>\"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch])); }
  function arr(data, keys){ for (const key of keys) if (Array.isArray(data && data[key])) return data[key]; return Array.isArray(data) ? data : []; }
  function nameOf(u){ return (u && (u.profile?.username || u.profile?.displayName || u.name || u.username || u.discordId)) || 'Atleta'; }
  function teamName(t){ return (t && (t.name || t.teamName || t.tag)) || 'Clube'; }
  function img(v){ return v || logo; }
  function empty(t){ return '<div class="frm-empty">' + esc(t) + '</div>'; }
  function fmt(v){ if(!v) return 'data em definicao'; const d = new Date(v); return isNaN(d) ? String(v) : d.toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' }); }

  async function setupTop(){
    try {
      const me = await api('/api/me');
      const u = me.user || {};
      $$('[data-frm-login]').forEach(a => { a.innerHTML = '<img class="frm-profile-avatar" src="' + esc(img(u.avatar)) + '" alt="Perfil"/>'; a.classList.remove('frm-btn'); a.title = 'Abrir perfil'; });
    } catch {}
    try {
      const n = await api('/api/notifications');
      $$('[data-frm-unread],[data-frm-mail]').forEach(b => b.textContent = String(n.unread || 0));
    } catch {}
  }

  async function overview(){
    try { return await api('/api/federation/overview'); }
    catch {
      const [t,p,e] = await Promise.allSettled([api('/api/teams'), api('/api/players'), api('/api/events')]);
      return { teams:t.value?.teams || [], players:arr(p.value || {}, ['players','users','items']), events:e.value?.events || [], stats:{} };
    }
  }
  async function allData(){
    const [t,p,o,r] = await Promise.allSettled([api('/api/teams'), api('/api/players'), overview(), api('/api/federation/ranking-settings')]);
    return { teams:t.value?.teams || o.value?.teams || [], players:arr(p.value || o.value || {}, ['players','users','items']), events:o.value?.events || [], overview:o.value || {}, settings:r.value?.settings || {} };
  }

  async function dashboard(){
    const d = await overview();
    const s = d.stats || {};
    const vals = { clubes:s.clubes ?? (d.teams || []).length ?? 0, atletas:s.atletas ?? (d.players || []).length ?? 0, competicoes:s.competicoes ?? (d.events || []).length ?? 0, partidas:s.partidas ?? 0, gols:s.gols ?? 0 };
    Object.entries(vals).forEach(([k,v]) => $$('[data-stat="' + k + '"]').forEach(el => el.textContent = String(v)));
    if ($('#seasonDates')) $('#seasonDates').textContent = 'Inicio ' + fmt(d.season?.startAt || '2026-07-18T19:30:00-03:00') + ' • Termino ' + fmt(d.season?.endAt || '2026-07-31T23:59:00-03:00');
    const rank = $('#homeClubRanking');
    if (rank) { const teams = (d.teams || []).slice(0,5); rank.innerHTML = teams.length ? teams.map((t,i) => '<div class="frm-list-row"><b class="frm-rank-badge">' + (i+1) + '</b><div><strong>' + esc(teamName(t)) + '</strong><br><small>' + esc(t.tag || 'Sem pontuacao registrada') + '</small></div><span>0 pts</span></div>').join('') : empty('Nenhum clube cadastrado ainda.'); }
  }

  async function competitions(){
    const box = $('#competitionsList'); if (!box) return;
    const d = await overview();
    const ev = d.events || [];
    const nexus = ev.find(e => /nexus|cup/i.test(String(e.name || e.title || ''))) || d.nexusCup || { name:'Nexus Cup 1ª Edição', matchFormat:'MD3', teamLimit:32, startAt:'2026-07-18T19:30:00-03:00' };
    const list = [nexus, {name:'Liga Hollow Nexus', soon:true}, {name:'Copa Hollow Nexus', soon:true}, {name:'Supercopa HNX', soon:true}, {name:'Torneio de Novatos', soon:true}];
    box.innerHTML = list.map(e => '<article class="frm-card"><span class="frm-pill ' + (e.soon ? '' : 'green') + '">' + (e.soon ? 'Em breve' : 'Ativa') + '</span><h2>' + esc(e.name || e.title) + '</h2><p>' + (e.soon ? 'Competicao planejada. Ainda indisponivel.' : 'Formato ' + esc(e.matchFormat || 'MD3') + ' • Limite ' + esc(e.teamLimit || 32) + ' clubes • Inicio 18/07/2026 19:30') + '</p><a class="frm-btn ' + (e.soon ? '' : 'primary') + '" href="' + (e.soon ? '/pages/calendario.html' : '/pages/eventos.html') + '">' + (e.soon ? 'Calendario' : 'Detalhes / inscricao') + '</a></article>').join('');
  }

  function calendar(){
    const grid = $('#calendarGrid'); if (!grid) return;
    const names = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];
    let html = names.map(n => '<div class="frm-calendar-head">' + n + '</div>').join('');
    for (let i=0;i<3;i++) html += '<div class="frm-day out"></div>';
    for (let day=1; day<=31; day++) {
      const items = [];
      if (day === 18) items.push('<a class="frm-event-dot" href="/pages/competicoes.html">Nexus Cup 1ª Edição • 19:30</a>');
      if (day === 20) items.push('<a class="frm-event-dot" href="/pages/eventos.html">Café com Leite • Discord</a>');
      html += '<div class="frm-day"><strong>' + day + '</strong>' + items.join('') + '</div>';
    }
    grid.innerHTML = html;
  }

  async function events(){
    const form = $('#cafeQueueForm');
    if (form) form.outerHTML = '<div class="frm-card"><h2>Como participar</h2><p>O Café com Leite acontece pelo Discord oficial. Entre no servidor, acompanhe o canal do evento e siga as instruções da equipe para entrar na fila, confirmar presença e registrar pontuação.</p><a class="frm-btn discord" href="/api/discord/server/open" target="_blank" rel="noopener noreferrer">Abrir Discord</a></div>';
    const q = $('#cafeQueue'); if (q) q.innerHTML = empty('Fila controlada pelo Discord oficial.');
    const r = $('#cafeRanking');
    if (r) { try { const d = await api('/api/federation/cafe-com-leite'); r.innerHTML = (d.ranking || []).length ? d.ranking.map((x,i) => '<div class="frm-list-row"><b>' + (i+1) + '</b><div><strong>' + esc(x.name) + '</strong><br><small>' + Number(x.matches || 0) + ' participacoes</small></div><span>' + Number(x.points || 0) + ' pts</span></div>').join('') : empty('Ranking individual começa zerado.'); } catch { r.innerHTML = empty('Ranking individual começa zerado.'); } }
  }

  async function clubs(){
    const [td,pd] = await Promise.allSettled([api('/api/teams'), api('/api/players')]);
    const teams = td.value?.teams || [];
    const players = arr(pd.value || {}, ['players','users','items']);
    const box = $('#clubsList'); if (!box) return;
    box.innerHTML = teams.length ? teams.map(t => '<article class="frm-card"><div class="frm-list-row"><img class="frm-team-logo" src="' + esc(img(t.logo || t.logoUrl)) + '"><div><h3><a href="/pages/perfil-clube.html?id=' + encodeURIComponent(t.id || '') + '">' + esc(teamName(t)) + '</a></h3><p>' + esc(t.tag || 'Clube afiliado') + '</p></div><span class="frm-pill">' + ((t.playerDetails || t.players || []).length) + '/5</span></div><p>Capitão: ' + esc(t.captainName || t.ownerName || 'não definido') + '</p><div class="frm-toolbar"><a class="frm-btn" href="/pages/elencos.html">Ver elenco</a>' + (t.canManage ? '<button class="frm-btn primary" data-invite="' + esc(t.id) + '">Convidar jogador</button>' : '') + '</div></article>').join('') : empty('Nenhum clube cadastrado ainda.');
    $$('[data-invite]').forEach(btn => btn.onclick = () => inviteModal(btn.dataset.invite, teams, players));
  }

  function inviteModal(teamId, teams, players){
    const team = teams.find(t => String(t.id) === String(teamId));
    const panel = $('#frmModalPanel'); if (!panel) return;
    panel.innerHTML = '<h2>Convidar jogador para ' + esc(teamName(team)) + '</h2><p class="frm-muted">O jogador receberá convite no Correio do site.</p><select class="frm-select" id="invitePlayer">' + players.map(p => '<option value="' + esc(p.id || p.discordId) + '">' + esc(nameOf(p)) + '</option>').join('') + '</select><select class="frm-select" id="inviteSlot" style="margin-top:10px"><option value="player">Titular</option><option value="reserve">Reserva</option></select><textarea class="frm-textarea" id="inviteNote" placeholder="Mensagem opcional" style="margin-top:10px"></textarea><div class="frm-toolbar" style="margin-top:12px"><button class="frm-btn primary" id="sendInvite">Enviar convite</button><button class="frm-btn" id="closeInvite">Cancelar</button></div>';
    $('#frmModal')?.classList.add('open');
    $('#closeInvite').onclick = () => $('#frmModal')?.classList.remove('open');
    $('#sendInvite').onclick = async () => { await api('/api/federation/team-invites',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ teamId, playerId:$('#invitePlayer').value, rosterSlot:$('#inviteSlot').value, note:$('#inviteNote').value }) }); $('#frmModal')?.classList.remove('open'); alert('Convite enviado para o Correio do jogador.'); };
  }

  async function rosters(){
    const d = await api('/api/teams').catch(() => ({teams:[]}));
    const box = $('#rostersList'); if (!box) return;
    box.innerHTML = (d.teams || []).length ? d.teams.map(t => '<article class="frm-card"><h2>' + esc(teamName(t)) + '</h2><div class="frm-list">' + ([...(t.playerDetails || []), ...(t.reserveDetails || [])].map(p => '<div class="frm-list-row"><img class="frm-avatar" src="' + esc(img(p.avatar)) + '"><div><strong>' + esc(p.name) + '</strong><br><small>' + esc(p.type === 'reserve' ? 'Reserva' : 'Titular') + '</small></div><span class="frm-pill">' + esc(p.profile?.primaryPosition || 'Jogador') + '</span></div>').join('') || empty('Elenco ainda não preenchido.')) + '</div></article>').join('') : empty('Nenhum elenco cadastrado.');
  }

  async function players(){
    const [pd,td] = await Promise.allSettled([api('/api/players'), api('/api/teams')]);
    const players = arr(pd.value || {}, ['players','users','items']);
    const teams = td.value?.teams || [];
    const box = $('#playersList') || $('#marketPlayers'); if (!box) return;
    box.innerHTML = players.length ? players.map(p => { const club = teams.find(t => JSON.stringify(t).includes(p.discordId || p.id || '')); return '<article class="frm-card"><div class="frm-list-row"><img class="frm-avatar" src="' + esc(img(p.avatar)) + '"><div><h3><a href="/pages/perfil-jogador.html?id=' + encodeURIComponent(p.id || p.discordId || '') + '">' + esc(nameOf(p)) + '</a></h3><p>' + esc(club ? teamName(club) : 'Livre no mercado') + '</p></div><span class="frm-pill">' + esc(p.profile?.primaryPosition || 'Atleta') + '</span></div></article>'; }).join('') : empty('Nenhum atleta registrado ainda.');
  }

  async function rankings(){
    const d = await allData();
    const cr = $('#clubRanking'), pr = $('#playerRanking');
    if (cr) cr.innerHTML = d.teams.length ? d.teams.map((t,i) => { const s = d.settings['club:' + t.id] || {}; return '<tr><td>' + (i+1) + '</td><td><a href="/pages/perfil-clube.html?id=' + encodeURIComponent(t.id || '') + '">' + esc(teamName(t)) + '</a></td><td>' + Number(s.points || 0) + '</td><td>' + Number(s.wins || 0) + '</td></tr>'; }).join('') : '<tr><td colspan="4">Nenhum clube cadastrado.</td></tr>';
    if (pr) pr.innerHTML = d.players.length ? d.players.map((p,i) => { const s = d.settings['player:' + (p.id || p.discordId)] || {}; return '<tr><td>' + (i+1) + '</td><td><a href="/pages/perfil-jogador.html?id=' + encodeURIComponent(p.id || p.discordId || '') + '">' + esc(nameOf(p)) + '</a></td><td>' + esc(p.profile?.primaryPosition || 'Atleta') + '</td><td>' + Number(s.points || 0) + '</td></tr>'; }).join('') : '<tr><td colspan="4">Nenhum jogador cadastrado.</td></tr>';
  }

  async function notifications(){
    const d = await api('/api/notifications').catch(() => ({notifications:[]}));
    const box = $('#notificationsList'); if (!box) return;
    box.innerHTML = (d.notifications || []).length ? d.notifications.map(n => '<div class="frm-list-row"><div>✉</div><div><strong>' + esc(n.title || 'Mensagem') + '</strong><br><small>' + esc(n.message || n.note || '') + '</small><br><small>' + fmt(n.createdAt) + '</small></div><div class="frm-toolbar">' + (n.type === 'recruitment_invite' && n.status === 'pending' ? '<button class="frm-btn primary" data-act="accept" data-id="' + esc(n.id) + '">Aceitar</button><button class="frm-btn danger" data-act="decline" data-id="' + esc(n.id) + '">Recusar</button>' : '<span class="frm-pill">' + esc(n.status || 'info') + '</span>') + '</div></div>').join('') : empty('Nenhuma mensagem no Correio.');
    $$('[data-act]').forEach(b => b.onclick = async () => { await api('/api/notifications/' + encodeURIComponent(b.dataset.id) + '/action', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action:b.dataset.act }) }); notifications(); setupTop(); });
  }

  function tactics(){
    const board = $('#tacticBoard'); if (!board || board.dataset.ready) return; board.dataset.ready = '1';
    let tools = document.querySelector('.frm-board-tools');
    if (!tools) { tools = document.createElement('div'); tools.className = 'frm-board-tools'; tools.innerHTML = '<button class="frm-btn" data-add-player>Adicionar jogador</button><button class="frm-btn" data-add-opp>Adicionar adversário</button><button class="frm-btn" data-reset-board>Resetar</button><span class="frm-pill">Arraste jogadores e bola</span>'; board.parentNode.insertBefore(tools, board); }
    function add(label, opp){ const el = document.createElement('div'); el.className = 'frm-player-token' + (opp ? ' opp' : ''); el.dataset.token = 'custom-' + Date.now() + Math.random(); el.style.left = opp ? '70%' : '30%'; el.style.top = '50%'; el.innerHTML = '<span contenteditable="true">' + esc(label) + '</span><b>' + (opp ? 'ADV' : 'HN') + '</b>'; board.appendChild(el); }
    tools.querySelector('[data-add-player]')?.addEventListener('click', () => add('Jogador', false));
    tools.querySelector('[data-add-opp]')?.addEventListener('click', () => add('Adversário', true));
    tools.querySelector('[data-reset-board]')?.addEventListener('click', () => { localStorage.removeItem('frm:tactic'); location.reload(); });
    let drag = null;
    board.addEventListener('pointerdown', ev => { const token = ev.target.closest('[data-token]'); if (!token) return; drag = token; token.setPointerCapture?.(ev.pointerId); });
    board.addEventListener('pointermove', ev => { if (!drag) return; const r = board.getBoundingClientRect(); const x = Math.max(3, Math.min(97, (ev.clientX-r.left)/r.width*100)); const y = Math.max(5, Math.min(95, (ev.clientY-r.top)/r.height*100)); drag.style.left = x + '%'; drag.style.top = y + '%'; });
    board.addEventListener('pointerup', () => { drag = null; });
  }

  async function support(){ const f = $('#supportForm'); if(!f || f.dataset.ready) return; f.dataset.ready='1'; f.onsubmit = async ev => { ev.preventDefault(); const fd = new FormData(f); const st = $('#supportStatus'); try { const d = await api('/api/support/tickets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({area:fd.get('area'),page:fd.get('page'),message:fd.get('message'),summary:fd.get('message')})}); if(st) st.textContent='Ticket enviado: ' + (d.ticket?.protocol || d.protocol || 'registrado'); f.reset(); } catch(e) { if(st) st.textContent='Erro: ' + e.message; } }; }
  async function affiliate(){ const f = $('#clubCreateForm'); if(!f || f.dataset.ready) return; f.dataset.ready='1'; f.onsubmit = async ev => { ev.preventDefault(); const fd = new FormData(f); const st = $('#clubCreateStatus'); try { const d = await api('/api/federation/clubs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(fd.entries()))}); if(st) st.textContent='Clube criado com sucesso.'; setTimeout(() => location.href='/pages/perfil-clube.html?id=' + encodeURIComponent(d.team?.id || ''), 700); } catch(e) { if(st) st.textContent='Erro: ' + e.message; } }; }

  (async function init(){ setupTop(); if(page==='dashboard') dashboard(); if(page==='competitions') competitions(); if(page==='calendar') calendar(); if(page==='events') events(); if(page==='clubs') clubs(); if(page==='rosters') rosters(); if(page==='players' || page==='market') players(); if(page==='rankings') rankings(); if(page==='notifications' || page==='mail') notifications(); if(page==='tactics') tactics(); if(page==='support') support(); if(page==='affiliate') affiliate(); })();
})();
`;

const before = fs.existsSync(jsFile) ? fs.readFileSync(jsFile, 'utf8') : '';
if (before !== js) {
  fs.writeFileSync(jsFile, js, 'utf8');
  console.log('[Federacao] JS polish safe aplicado.');
} else {
  console.log('[Federacao] JS polish safe ja estava aplicado.');
}
