(function(){
  if(window.__HollowNexusV2Runtime)return;
  window.__HollowNexusV2Runtime=true;

  const pathname=(location.pathname||'/').toLowerCase();
  const page=(pathname.split('/').pop()||'index.html').toLowerCase();
  const isLogin=pathname==='/'||page==='index.html';
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));

  document.body.classList.add('hn-v2-runtime');

  if(isLogin){
    document.body.classList.add('hn-v2-login');
    document.title='Hollow Nexus | Acesso';
    return;
  }

  const main=$('.frm-main, .va-main, main');
  if(!main)return;

  const activeGroup=(()=>{
    if(['dashboard.html'].includes(page))return'dashboard';
    if(['competicoes.html','eventos.html','inscricao.html','chaveamento.html','grupos.html','sumulas.html'].includes(page))return'competicoes';
    if(['clubes.html','times.html','recrutamento.html','convite-time.html','transferencias.html'].includes(page))return'clubes';
    if(['atletas.html','jogadores.html','perfil.html'].includes(page))return'jogadores';
    if(['rankings.html','pontuacao.html','placar.html','cafe-com-leite.html'].includes(page))return'rankings';
    if(['resultados.html','estatisticas.html','analise-partidas.html','scrims.html','treinos.html'].includes(page))return'partidas';
    return'';
  })();

  document.body.classList.add(`hn2-page-${activeGroup||'secondary'}`);
  if(['dashboard.html','eventos.html','competicoes.html','times.html','clubes.html','jogadores.html','atletas.html','rankings.html','resultados.html'].includes(page)){
    document.body.classList.add('hn2-reference-page');
  }else{
    document.body.classList.add('hn2-secondary-page');
  }

  // Remove qualquer header antigo criado antes da camada final.
  $$('.hn-header, .hn2-header[data-hn-v2-header]').forEach(node=>node.remove());

  const nav=[
    ['dashboard','Início','/pages/dashboard.html'],
    ['competicoes','Competições','/pages/eventos.html'],
    ['clubes','Clubes','/pages/times.html'],
    ['jogadores','Jogadores','/pages/jogadores.html'],
    ['rankings','Rankings','/pages/rankings.html'],
    ['partidas','Partidas','/pages/resultados.html']
  ];

  const searchable=[
    ['Início','Temporada HNL, central competitiva','/pages/dashboard.html'],
    ['Competições','Eventos, inscrições, torneios, temporada','/pages/eventos.html'],
    ['Clubes','Times, elencos, capitães, direção','/pages/times.html'],
    ['Jogadores','Atletas, perfis, posições','/pages/jogadores.html'],
    ['Rankings','Classificação, VAP, pontuação','/pages/rankings.html'],
    ['Partidas','Resultados, confrontos, jogos','/pages/resultados.html'],
    ['Café com Leite','Ranking individual 3v3 e 5v5','/pages/placar.html'],
    ['Chaveamento','Mata-mata e playoffs','/pages/chaveamento.html'],
    ['Fase de grupos','Grupos e classificação','/pages/grupos.html'],
    ['Súmulas','Resultados oficiais e estatísticas','/pages/sumulas.html'],
    ['Recrutamento','Mercado de jogadores','/pages/recrutamento.html'],
    ['Perfil','Conta e conexões','/pages/perfil.html'],
    ['Formulários','Envios e gestão','/pages/formularios.html'],
    ['Configurações','Preferências e integrações','/pages/configuracoes.html'],
    ['Permissões','Acessos administrativos','/pages/permissoes.html'],
    ['Chat','Integração Discord','/pages/chat.html'],
    ['Suporte','Ajuda e atendimento','/pages/suporte.html']
  ];

  const menuSections=[
    ['Competitivo',[
      ['Competições','/pages/eventos.html'],['Inscrição','/pages/inscricao.html'],['Chaveamento','/pages/chaveamento.html'],['Fase de grupos','/pages/grupos.html'],['Súmulas','/pages/sumulas.html'],['Café com Leite','/pages/placar.html'],['Pontuação','/pages/pontuacao.html']
    ]],
    ['Clubes e jogadores',[
      ['Clubes','/pages/times.html'],['Jogadores','/pages/jogadores.html'],['Meu perfil','/pages/perfil.html'],['Recrutamento','/pages/recrutamento.html']
    ]],
    ['Partidas',[
      ['Resultados','/pages/resultados.html'],['Estatísticas','/pages/estatisticas.html'],['Análise de partidas','/pages/analise-partidas.html'],['Scrims','/pages/scrims.html'],['Treinos','/pages/treinos.html']
    ]],
    ['Comunidade e gestão',[
      ['Chat','/pages/chat.html'],['Formulários','/pages/formularios.html'],['Configurações','/pages/configuracoes.html'],['Permissões','/pages/permissoes.html'],['Atualizações','/pages/atualizacoes.html'],['Suporte','/pages/suporte.html'],['Administração','/pages/painel-completo.html']
    ]],
    ['Legal',[
      ['Termos de uso','/pages/termos.html'],['Privacidade','/pages/privacidade.html']
    ]]
  ];

  const header=document.createElement('header');
  header.className='hn2-header';
  header.dataset.hnV2Header='1';
  header.innerHTML=`
    <a class="hn2-brand" href="/pages/dashboard.html" aria-label="Hollow Nexus - Início">
      <img src="/assets/hollow-nexus-official.svg" alt=""><span>HOLLOW NEXUS</span>
    </a>
    <nav class="hn2-nav" aria-label="Navegação principal">
      ${nav.map(([key,label,href])=>`<a class="${key===activeGroup?'active':''}" href="${href}">${label}</a>`).join('')}
    </nav>
    <div class="hn2-head-tools">
      <div class="hn2-search-wrap">
        <span class="hn2-search-icon" aria-hidden="true"></span>
        <input id="hn2SiteSearch" type="search" autocomplete="off" placeholder="Buscar..." aria-label="Buscar no Hollow Nexus">
        <div id="hn2SearchResults" class="hn2-search-results" hidden></div>
      </div>
      <a class="hn2-profile" href="/pages/perfil.html" aria-label="Abrir perfil"><span class="hn2-avatar-dot"></span><span>Perfil</span></a>
      <details class="hn2-more"><summary aria-label="Abrir outras áreas">Mais</summary><div class="hn2-menu">
        ${menuSections.map(([label,items])=>`<span>${label}</span>${items.map(([itemLabel,href])=>`<a href="${href}">${itemLabel}</a>`).join('')}`).join('')}
      </div></details>
    </div>`;
  main.insertBefore(header,main.firstChild);

  const searchInput=$('#hn2SiteSearch',header);
  const searchResults=$('#hn2SearchResults',header);
  const renderSearch=()=>{
    const query=(searchInput.value||'').trim().toLowerCase();
    if(!query){searchResults.hidden=true;searchResults.innerHTML='';return;}
    const matches=searchable.filter(([name,desc])=>`${name} ${desc}`.toLowerCase().includes(query)).slice(0,7);
    searchResults.innerHTML=matches.length?matches.map(([name,desc,href])=>`<a href="${href}"><strong>${name}</strong><small>${desc}</small></a>`).join(''):'<div class="hn2-search-empty">Nenhuma área encontrada.</div>';
    searchResults.hidden=false;
  };
  searchInput?.addEventListener('input',renderSearch);
  searchInput?.addEventListener('keydown',event=>{
    if(event.key==='Enter'){
      const first=$('a',searchResults);
      if(first){event.preventDefault();location.href=first.href;}
    }
    if(event.key==='Escape'){searchResults.hidden=true;searchInput.blur();}
  });

  document.addEventListener('click',event=>{
    const menu=$('.hn2-more[open]',header);
    if(menu&&!menu.contains(event.target))menu.removeAttribute('open');
    if(searchResults&&!event.target.closest('.hn2-search-wrap'))searchResults.hidden=true;
  });

  const titleMap={
    'dashboard.html':'Início','eventos.html':'Competições','competicoes.html':'Competições','times.html':'Clubes','clubes.html':'Clubes','jogadores.html':'Jogadores','atletas.html':'Jogadores','rankings.html':'Rankings','resultados.html':'Partidas','perfil.html':'Perfil','placar.html':'Café com Leite','sumulas.html':'Súmulas','chaveamento.html':'Chaveamento','grupos.html':'Fase de grupos','recrutamento.html':'Recrutamento','chat.html':'Chat','formularios.html':'Formulários','configuracoes.html':'Configurações','permissoes.html':'Permissões','suporte.html':'Suporte','termos.html':'Termos de Uso','privacidade.html':'Privacidade'
  };
  if(titleMap[page])document.title=`${titleMap[page]} | Hollow Nexus`;
  else if(/void arena/i.test(document.title))document.title=document.title.replace(/void arena/ig,'Hollow Nexus');

  // Corrige branding visível herdado sem alterar scripts/valores de formulários.
  $$('.va-eyebrow,.frm-eyebrow,.va-title,.va-subtitle,.frm-page-hero h1,.frm-page-hero p,.va-card h1,.va-card h2,.va-card h3').forEach(node=>{
    if(node.children.length===0&&/void arena/i.test(node.textContent||''))node.textContent=(node.textContent||'').replace(/void arena/ig,'Hollow Nexus');
  });

  if(page==='resultados.html'){
    const h1=$('.frm-page-hero h1,.va-topbar h1,.va-title');
    if(h1&&/resultado/i.test(h1.textContent))h1.textContent='Partidas';
  }

  function observe(target,callback){
    if(!target)return;
    callback();
    new MutationObserver(callback).observe(target,{childList:true,subtree:true});
  }

  function text(cell){return (cell?.textContent||'').replace(/\s+/g,' ').trim();}

  // HOME: preenche os cards da referência somente com dados reais disponíveis.
  if(page==='dashboard.html'){
    const latest=$('#homeLatestResult');
    const competition=$('#homeCompetitionSnapshot');
    const clubs=$('#homeClubHighlights');
    const counts={clubs:$('#homeClubCount'),players:$('#homePlayerCount'),events:$('#homeEventCount'),results:$('#homeResultCount')};
    const safeRequest=async url=>{
      try{
        const response=await fetch(url,{credentials:'include',cache:'no-store'});
        const data=await response.json().catch(()=>({}));
        return response.ok?data:{};
      }catch{return {};}
    };
    Promise.all([safeRequest('/api/teams'),safeRequest('/api/players/directory'),safeRequest('/api/events'),safeRequest('/api/match-results')]).then(([teamData,playerData,eventData,resultData])=>{
      const teams=Array.isArray(teamData.teams)?teamData.teams:[];
      const players=Array.isArray(playerData.players)?playerData.players:[];
      const events=Array.isArray(eventData.events)?eventData.events:[];
      const results=(resultData.results||resultData.records||[]).filter(item=>String(item.status||'').toLowerCase()==='validated');
      if(counts.clubs)counts.clubs.textContent=teams.length;
      if(counts.players)counts.players.textContent=players.length;
      if(counts.events)counts.events.textContent=events.length;
      if(counts.results)counts.results.textContent=results.length;

      if(latest){
        const item=results[0];
        if(item){
          const match=item.match||{};const a=match.teamA||{};const b=match.teamB||{};
          latest.innerHTML=`<div class="hn2-score-line"><span>${a.name||a.tag||'Clube A'}</span><strong>${item.seriesScoreA??item.finalScoreA??0} <i>—</i> ${item.seriesScoreB??item.finalScoreB??0}</strong><span>${b.name||b.tag||'Clube B'}</span></div><a href="/pages/resultados.html">Ver todos os resultados</a>`;
        }else latest.innerHTML='<p class="hn2-empty-copy">Ainda não há resultado validado publicado.</p><a href="/pages/resultados.html">Abrir partidas</a>';
      }

      if(competition){
        const active=events.find(e=>['running','open'].includes(String(e.status||'').toLowerCase()))||events[0];
        if(active){
          const registered=Array.isArray(active.registrations)?active.registrations.filter(r=>!['rejected','cancelled'].includes(String(r.status||'').toLowerCase())).length:Number(active.registeredCount||0);
          competition.innerHTML=`<strong>${active.title||active.name||'HNL Season 01'}</strong><span>${active.matchFormat||'Formato a definir'} · ${registered}/${active.teamLimit||'?'} clubes</span><a href="/pages/eventos.html">Acompanhar competição</a>`;
        }else competition.innerHTML='<strong>HNL Season 01</strong><span>Central da temporada oficial.</span><a href="/pages/eventos.html">Abrir competições</a>';
      }

      if(clubs){
        clubs.innerHTML=teams.slice(0,5).map(team=>`<button type="button" class="hn2-club-mini" data-home-team="${String(team.id||'')}"><span class="hn2-club-mark">${team.logo?`<img src="${team.logo}" alt="">`:(team.tag||team.name||'HN').slice(0,2).toUpperCase()}</span><span><strong>${team.name||team.tag||'Clube'}</strong><small>${team.tag||'Organização Hollow Nexus'}</small></span></button>`).join('')||'<p class="hn2-empty-copy">Os clubes cadastrados aparecerão aqui.</p>';
        $$('[data-home-team]',clubs).forEach(btn=>btn.addEventListener('click',()=>location.href='/pages/times.html'));
      }
    });
  }

  // COMPETIÇÕES: tabs funcionais sobre os cards existentes.
  if(['eventos.html','competicoes.html'].includes(page)){
    const list=$('#eventsList');
    const tabs=$$('[data-competition-filter]');
    const applyFilter=filter=>{
      $$('.va-event-card',list).forEach(card=>{
        const content=(card.textContent||'').toLowerCase();
        const matches=filter==='all'||(filter==='running'&&(content.includes('em andamento')||content.includes('aberto')))||(filter==='upcoming'&&(content.includes('em breve')||content.includes('próxim')))||(filter==='finished'&&(content.includes('finalizado')||content.includes('encerr')));
        card.hidden=!matches;
      });
      tabs.forEach(tab=>tab.classList.toggle('active',tab.dataset.competitionFilter===filter));
    };
    tabs.forEach(tab=>tab.addEventListener('click',()=>applyFilter(tab.dataset.competitionFilter||'all')));
    observe(list,()=>{const active=$('[data-competition-filter].active')?.dataset.competitionFilter||'all';applyFilter(active);const count=$$('.va-event-card',list).length;const kpi=$('#competitionCountKpi');if(kpi)kpi.textContent=count;});
  }

  // CLUBES: busca real, destaque e contador.
  if(['times.html','clubes.html'].includes(page)){
    const list=$('#teamsList');const search=$('#clubSearch');const featured=$('#featuredClub');const count=$('#clubCountKpi');
    const refresh=()=>{
      const cards=$$('.va-team-card',list);if(count)count.textContent=cards.length;
      const query=(search?.value||'').trim().toLowerCase();cards.forEach(card=>card.hidden=query&&!String(card.textContent||'').toLowerCase().includes(query));
      if(featured&&cards[0]){
        const id=cards[0].dataset.teamId||'';featured.innerHTML=`<div class="hn2-feature-clone">${cards[0].innerHTML}</div><button class="hn2-inline-link" type="button">Ver perfil do clube</button>`;
        featured.onclick=()=>{const original=id?$(`[data-team-id="${CSS.escape(id)}"]`,list):cards[0];original?.click();};
      }else if(featured&&!cards.length)featured.innerHTML='<p class="hn2-empty-copy">Nenhum clube cadastrado ainda.</p>';
    };
    search?.addEventListener('input',refresh);observe(list,refresh);
  }

  // JOGADORES: busca e card de destaque a partir da tabela real.
  if(['jogadores.html','atletas.html'].includes(page)){
    const table=$('#playerDirectoryTable');const search=$('#playerSearch');const featured=$('#featuredPlayerPanel');const count=$('#playerCountKpi');
    const refresh=()=>{
      const rows=$$('tbody tr',table);if(count)count.textContent=rows.length;
      const query=(search?.value||'').trim().toLowerCase();rows.forEach(row=>row.hidden=query&&!text(row).toLowerCase().includes(query));
      const first=rows[0];
      if(featured&&first){
        const cells=$$('td',first);const name=text(cells[1]||cells[0])||'Jogador';const club=text(cells[2])||'Sem clube';const role=text(cells[3])||'Competitivo';
        featured.innerHTML=`<div class="hn2-player-orb">${name.slice(0,1).toUpperCase()}</div><div><small>DESTAQUE DO DIRETÓRIO</small><h2>${name}</h2><p>${club}</p><span class="hn2-pill">${role}</span></div><button class="hn2-inline-link" type="button">Abrir perfil</button>`;
        featured.querySelector('button')?.addEventListener('click',()=>first.click());
      }
      const leaders=$('#playerLeaders');
      if(leaders){leaders.innerHTML=rows.slice(0,5).map((row,index)=>{const cells=$$('td',row);return `<div class="hn2-leader-row"><b>${index+1}</b><span>${text(cells[1]||cells[0])}</span><small>${text(cells[2])}</small></div>`;}).join('')||'<p class="hn2-empty-copy">Aguardando jogadores.</p>';}
    };
    search?.addEventListener('input',refresh);observe(table,refresh);
  }

  // RANKINGS: podium gerado da classificação real e contadores.
  if(page==='rankings.html'){
    const teamTable=$('#teamRankingTable');const podium=$('#rankingPodium');const playerTable=$('#playerRankingTable');
    const refreshTeams=()=>{
      const rows=$$('tbody tr',teamTable).filter(row=>$$('td',row).length>2);
      if(podium){
        const top=rows.slice(0,3);const order=[1,0,2].filter(index=>top[index]);
        podium.innerHTML=order.map(index=>{const row=top[index];const cells=$$('td',row);const rank=index+1;return `<button type="button" class="hn2-podium-card rank-${rank}"><span class="hn2-podium-rank">${rank}</span><strong>${text(cells[1])||`#${rank}`}</strong><small>${text(cells[2])||''} VAP</small></button>`;}).join('')||'<p class="hn2-empty-copy">A classificação aparecerá aqui assim que houver dados.</p>';
        $$('.hn2-podium-card',podium).forEach((card,i)=>card.addEventListener('click',()=>top[order[i]]?.click()));
      }
      const teamCount=$('#rankedClubCount');if(teamCount)teamCount.textContent=rows.length;
    };
    const refreshPlayers=()=>{const count=$$('tbody tr',playerTable).filter(row=>$$('td',row).length>2).length;const el=$('#rankedPlayerCount');if(el)el.textContent=count;};
    observe(teamTable,refreshTeams);observe(playerTable,refreshPlayers);
  }

  // PARTIDAS: transforma o primeiro resultado em destaque, mantendo toda a lista oficial abaixo.
  if(page==='resultados.html'){
    const list=$('#resultsList');const spotlight=$('#latestMatchSpotlight');const resultCount=$('#matchResultCount');
    const refresh=()=>{
      const cards=$$('.va-result-card',list);if(resultCount)resultCount.textContent=cards.length;
      if(spotlight&&cards[0]){
        spotlight.innerHTML=`<div class="hn2-match-feature-copy"><small>ÚLTIMO RESULTADO VALIDADO</small>${cards[0].innerHTML}</div>`;
      }else if(spotlight)spotlight.innerHTML='<p class="hn2-empty-copy">Nenhum resultado validado foi publicado ainda.</p>';
    };
    observe(list,refresh);
  }
})();
