(function(){
  if(window.__HollowNexusV2Shell)return;
  window.__HollowNexusV2Shell=true;

  const page=document.body?.dataset?.page||'';
  const activeMap={
    dashboard:'dashboard',
    eventos:'eventos',
    times:'times',
    jogadores:'jogadores',
    rankings:'rankings',
    resultados:'resultados',
    placar:'rankings'
  };
  const nav=[
    ['dashboard','Início','/pages/dashboard.html'],
    ['eventos','Competições','/pages/eventos.html'],
    ['times','Clubes','/pages/times.html'],
    ['jogadores','Jogadores','/pages/jogadores.html'],
    ['rankings','Rankings','/pages/rankings.html'],
    ['resultados','Partidas','/pages/resultados.html']
  ];

  const shell=document.querySelector('.va-shell');
  if(!shell)return;

  const header=document.createElement('header');
  header.className='hn-header';
  header.innerHTML=`
    <a class="hn-brand" href="/pages/dashboard.html" aria-label="Hollow Nexus - Início">
      <img src="/assets/hollow-nexus-official.svg" alt="" />
      <span>HOLLOW NEXUS</span>
    </a>
    <nav class="hn-nav" aria-label="Navegação principal">
      ${nav.map(([key,label,href])=>`<a data-hn-key="${key}" href="${href}">${label}</a>`).join('')}
    </nav>
    <div class="hn-actions">
      <a class="va-user-pill va-user-avatar-link" href="/pages/perfil.html" aria-label="Abrir perfil"><span class="va-user-pill-avatar">?</span></a>
      <details class="hn-more">
        <summary aria-label="Abrir mais opções">Mais</summary>
        <div class="hn-more-menu">
          <span class="hn-menu-label">Competitivo</span>
          <a href="/pages/placar.html">Café com Leite</a>
          <a href="/pages/chaveamento.html">Chaveamento</a>
          <a href="/pages/grupos.html">Fase de grupos</a>
          <a href="/pages/sumulas.html">Súmulas</a>
          <span class="hn-menu-label">Conta e gestão</span>
          <a href="/pages/perfil.html">Meu perfil</a>
          <a href="/pages/formularios.html">Formulários</a>
          <a href="/pages/configuracoes.html">Configurações</a>
        </div>
      </details>
    </div>`;

  shell.insertBefore(header,shell.firstChild);
  const current=activeMap[page]||page;
  header.querySelectorAll('[data-hn-key]').forEach(link=>link.classList.toggle('active',link.dataset.hnKey===current));

  document.addEventListener('click',event=>{
    const open=header.querySelector('.hn-more[open]');
    if(open&&!open.contains(event.target))open.removeAttribute('open');
  });

  const title=document.title||'';
  if(title.includes('Void Arena'))document.title=title.replace(/Void Arena/g,'Hollow Nexus');
}());
