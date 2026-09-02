(function(){
  if(window.__HollowNexusV2Runtime)return;
  window.__HollowNexusV2Runtime=true;

  const path=(location.pathname||'').toLowerCase();
  const page=path.split('/').pop()||'';
  const active=page.startsWith('dashboard')?'dashboard':page.startsWith('competicoes')?'competicoes':page.startsWith('clubes')?'clubes':page.startsWith('atletas')?'atletas':page.startsWith('rankings')?'rankings':page.startsWith('resultados')?'resultados':'';
  const main=document.querySelector('.frm-main');
  if(!main)return;

  document.body.classList.add('hn-v2-runtime');

  const nav=[
    ['dashboard','Início','/pages/dashboard.html'],
    ['competicoes','Competições','/pages/competicoes.html'],
    ['clubes','Clubes','/pages/clubes.html'],
    ['atletas','Jogadores','/pages/atletas.html'],
    ['rankings','Rankings','/pages/rankings.html'],
    ['resultados','Partidas','/pages/resultados.html']
  ];

  const header=document.createElement('header');
  header.className='hn2-header';
  header.innerHTML=`
    <a class="hn2-brand" href="/pages/dashboard.html" aria-label="Hollow Nexus - Início">
      <img src="/assets/hollow-nexus-official.svg" alt="">
      <span>HOLLOW NEXUS</span>
    </a>
    <nav class="hn2-nav" aria-label="Navegação principal">
      ${nav.map(([key,label,href])=>`<a class="${key===active?'active':''}" href="${href}">${label}</a>`).join('')}
    </nav>
    <div class="hn2-actions">
      <a class="hn2-profile" href="/pages/perfil.html">Perfil</a>
      <details class="hn2-more">
        <summary>Mais</summary>
        <div class="hn2-menu">
          <span>Competitivo</span>
          <a href="/pages/cafe-com-leite.html">Café com Leite</a>
          <a href="/pages/chaveamento.html">Chaveamento</a>
          <a href="/pages/grupos.html">Fase de grupos</a>
          <a href="/pages/sumulas.html">Súmulas</a>
          <span>Gestão</span>
          <a href="/pages/formularios.html">Formulários</a>
          <a href="/pages/configuracoes.html">Configurações</a>
          <a href="/pages/administracao.html">Administração</a>
        </div>
      </details>
    </div>`;
  main.insertBefore(header,main.firstChild);

  document.addEventListener('click',event=>{
    const menu=header.querySelector('.hn2-more[open]');
    if(menu&&!menu.contains(event.target))menu.removeAttribute('open');
  });

  if(active==='dashboard'){
    const hero=main.querySelector('.hnl-rematch-hero,.frm-page-hero');
    if(hero){
      hero.classList.add('hn2-home-hero');
      hero.innerHTML=`
        <div class="hn2-home-copy">
          <div class="hn2-kicker">Temporada competitiva</div>
          <h1>HNL <span>Season 01</span></h1>
          <p>A principal experiência competitiva da Hollow Nexus. Competições, clubes, jogadores, rankings e partidas em uma única estrutura.</p>
          <div class="hn2-home-actions">
            <a class="hnl-btn primary" href="/pages/competicoes.html">Acompanhar temporada</a>
            <a class="hnl-btn" href="/pages/rankings.html">Ver classificação</a>
          </div>
        </div>
        <img class="hn2-home-mark" src="/assets/hollow-nexus-official.svg" alt="Símbolo Hollow Nexus">`;

      if(!main.querySelector('.hn2-home-strip')){
        const strip=document.createElement('section');
        strip.className='hn2-home-strip';
        strip.innerHTML=`
          <a class="hn2-home-tile" href="/pages/competicoes.html"><small>Competições</small><strong>HNL e torneios</strong><span>Temporadas, inscrições, calendário e histórico competitivo.</span></a>
          <a class="hn2-home-tile" href="/pages/clubes.html"><small>Clubes</small><strong>Organizações da liga</strong><span>Elencos, direção, capitães, perfis públicos e conexões.</span></a>
          <a class="hn2-home-tile" href="/pages/atletas.html"><small>Jogadores</small><strong>Desempenho individual</strong><span>Perfis, posições, estatísticas, destaques e recrutamento.</span></a>
          <a class="hn2-home-tile" href="/pages/cafe-com-leite.html"><small>Café com Leite</small><strong>Rankings 3v3 e 5v5</strong><span>Pontuação individual e evolução competitiva da comunidade.</span></a>`;
        hero.insertAdjacentElement('afterend',strip);
      }
    }
    document.title='Início | Hollow Nexus';
  }

  if(active==='competicoes')document.title='Competições | Hollow Nexus';
  if(active==='clubes')document.title='Clubes | Hollow Nexus';
  if(active==='atletas')document.title='Jogadores | Hollow Nexus';
  if(active==='rankings')document.title='Rankings | Hollow Nexus';
  if(active==='resultados'){
    document.title='Partidas | Hollow Nexus';
    const h1=main.querySelector('.frm-page-hero h1');
    if(h1&&/resultado/i.test(h1.textContent))h1.textContent='Partidas';
  }
}());
