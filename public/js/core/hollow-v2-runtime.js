(function(){
  if(window.__HollowNexusV2Runtime)return;
  window.__HollowNexusV2Runtime=true;

  const pathname=(location.pathname||'/').toLowerCase();
  const page=(pathname.split('/').pop()||'index.html').toLowerCase();
  const isLogin=pathname==='/'||page==='index.html';

  document.body.classList.add('hn-v2-runtime');

  if(isLogin){
    document.body.classList.add('hn-v2-login');
    document.title='Hollow Nexus | Acesso';
    return;
  }

  const main=document.querySelector('.frm-main, .va-main, main');
  if(!main)return;

  const activeGroup=(()=>{
    if(['dashboard.html'].includes(page))return'dashboard';
    if(['competicoes.html','eventos.html','inscricao.html','chaveamento.html','grupos.html','sumulas.html'].includes(page))return'competicoes';
    if(['clubes.html','times.html','recrutamento.html','convite-time.html'].includes(page))return'clubes';
    if(['atletas.html','jogadores.html','perfil.html'].includes(page))return'jogadores';
    if(['rankings.html','pontuacao.html','placar.html','cafe-com-leite.html'].includes(page))return'rankings';
    if(['resultados.html','estatisticas.html','analise-partidas.html','scrims.html','treinos.html'].includes(page))return'partidas';
    return'';
  })();

  document.querySelectorAll('.hn2-header[data-hn-v2-header]').forEach(node=>node.remove());

  const nav=[
    ['dashboard','Início','/pages/dashboard.html'],
    ['competicoes','Competições','/pages/eventos.html'],
    ['clubes','Clubes','/pages/times.html'],
    ['jogadores','Jogadores','/pages/jogadores.html'],
    ['rankings','Rankings','/pages/rankings.html'],
    ['partidas','Partidas','/pages/resultados.html']
  ];

  const menuSections=[
    ['Competitivo',[
      ['Competições','/pages/eventos.html'],
      ['Inscrição','/pages/inscricao.html'],
      ['Chaveamento','/pages/chaveamento.html'],
      ['Fase de grupos','/pages/grupos.html'],
      ['Súmulas','/pages/sumulas.html'],
      ['Café com Leite','/pages/placar.html'],
      ['Pontuação','/pages/pontuacao.html']
    ]],
    ['Clubes e jogadores',[
      ['Clubes','/pages/times.html'],
      ['Jogadores','/pages/jogadores.html'],
      ['Meu perfil','/pages/perfil.html'],
      ['Recrutamento','/pages/recrutamento.html']
    ]],
    ['Partidas',[
      ['Resultados','/pages/resultados.html'],
      ['Estatísticas','/pages/estatisticas.html'],
      ['Análise de partidas','/pages/analise-partidas.html'],
      ['Scrims','/pages/scrims.html'],
      ['Treinos','/pages/treinos.html']
    ]],
    ['Comunidade e gestão',[
      ['Chat','/pages/chat.html'],
      ['Formulários','/pages/formularios.html'],
      ['Configurações','/pages/configuracoes.html'],
      ['Permissões','/pages/permissoes.html'],
      ['Atualizações','/pages/atualizacoes.html'],
      ['Suporte','/pages/suporte.html'],
      ['Administração','/pages/painel-completo.html']
    ]],
    ['Legal',[
      ['Termos de uso','/pages/termos.html'],
      ['Privacidade','/pages/privacidade.html']
    ]]
  ];

  const header=document.createElement('header');
  header.className='hn2-header';
  header.dataset.hnV2Header='1';
  header.innerHTML=`
    <a class="hn2-brand" href="/pages/dashboard.html" aria-label="Hollow Nexus - Início">
      <img src="/assets/hollow-nexus-official.svg" alt="">
      <span>HOLLOW NEXUS</span>
    </a>
    <nav class="hn2-nav" aria-label="Navegação principal">
      ${nav.map(([key,label,href])=>`<a class="${key===activeGroup?'active':''}" href="${href}">${label}</a>`).join('')}
    </nav>
    <div class="hn2-actions">
      <a class="hn2-profile" href="/pages/perfil.html">Perfil</a>
      <details class="hn2-more">
        <summary>Mais</summary>
        <div class="hn2-menu">
          ${menuSections.map(([label,items])=>`<span>${label}</span>${items.map(([itemLabel,href])=>`<a href="${href}">${itemLabel}</a>`).join('')}`).join('')}
        </div>
      </details>
    </div>`;

  main.insertBefore(header,main.firstChild);

  document.addEventListener('click',event=>{
    const menu=header.querySelector('.hn2-more[open]');
    if(menu&&!menu.contains(event.target))menu.removeAttribute('open');
  });

  const titleMap={
    'dashboard.html':'Início',
    'eventos.html':'Competições',
    'competicoes.html':'Competições',
    'times.html':'Clubes',
    'clubes.html':'Clubes',
    'jogadores.html':'Jogadores',
    'atletas.html':'Jogadores',
    'rankings.html':'Rankings',
    'resultados.html':'Partidas'
  };
  if(titleMap[page])document.title=`${titleMap[page]} | Hollow Nexus`;

  if(page==='resultados.html'){
    const h1=main.querySelector('.frm-page-hero h1,.va-topbar h1,.va-title');
    if(h1&&/resultado/i.test(h1.textContent))h1.textContent='Partidas';
  }
})();
