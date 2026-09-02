(function(){
  if(window.__HollowNexusV2AuditFixes)return;
  window.__HollowNexusV2AuditFixes=true;

  const path=(location.pathname||'/').toLowerCase();
  const page=(path.split('/').pop()||'index.html').toLowerCase();
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
  const escapeHtml=(value='')=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));

  async function request(url){
    const response=await fetch(url,{credentials:'include',cache:'no-store'});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.message||`Falha (${response.status})`);
    return data;
  }

  function polishLogin(){
    document.title='Hollow Nexus League | Acesso';
    const brand=$('.brand-title');
    if(brand)brand.textContent='HOLLOW NEXUS LEAGUE';
    const serverEyebrow=$('.brand-row .eyebrow');
    if(serverEyebrow)serverEyebrow.textContent='Liga comunitária de Rematch';
    const badge=$('.hero-message-card .mini-badge');
    if(badge)badge.textContent='HNL · Acesso oficial';
    const headline=$('.hero-message-card h3');
    if(headline)headline.textContent='Sua central competitiva da Hollow Nexus League.';
    const description=$('.hero-message-card p:not(.discord-recommendation)');
    if(description)description.textContent='Acompanhe competições, clubes, jogadores, partidas, rankings e toda a operação da liga em um único painel.';
    const recommendation=$('.discord-recommendation');
    if(recommendation)recommendation.textContent='Use sua conta vinculada ao Discord para liberar cargos, permissões, clube e recursos do servidor.';
    const image=$('.brand-row img');
    if(image)image.alt='Hollow Nexus League';
  }

  if(path==='/'||page==='index.html'){
    polishLogin();
    return;
  }

  const header=$('.hn2-header');
  if(!header)return;

  const ACCESS_BY_PATH={
    '/pages/dashboard.html':'dashboard',
    '/pages/eventos.html':'eventos',
    '/pages/inscricao.html':'eventos',
    '/pages/chaveamento.html':'chaveamento',
    '/pages/grupos.html':'grupos',
    '/pages/sumulas.html':'sumulas',
    '/pages/times.html':'times',
    '/pages/jogadores.html':'jogadores',
    '/pages/perfil.html':'perfil',
    '/pages/recrutamento.html':'recrutamento',
    '/pages/rankings.html':'rankings',
    '/pages/pontuacao.html':'pontuacao',
    '/pages/placar.html':'placar',
    '/pages/resultados.html':'resultados',
    '/pages/estatisticas.html':'estatisticas',
    '/pages/analise-partidas.html':'analise-partidas',
    '/pages/scrims.html':'scrims',
    '/pages/chat.html':'chat',
    '/pages/formularios.html':'formularios',
    '/pages/configuracoes.html':'configuracoes',
    '/pages/permissoes.html':'permissoes',
    '/pages/termos.html':'termos'
  };
  const ADMIN_PATHS=new Set(['/pages/painel-completo.html','/pages/administracao.html']);

  function normalizedPath(anchor){
    try{return new URL(anchor.href,location.origin).pathname.toLowerCase();}catch{return'';}
  }

  $$('a[href]',header).forEach(anchor=>{
    const target=normalizedPath(anchor);
    const key=ACCESS_BY_PATH[target];
    if(key)anchor.dataset.hnAccessKey=key;
    if(ADMIN_PATHS.has(target))anchor.dataset.hnAdminOnly='1';
  });

  const tools=$('.hn2-head-tools',header);
  const profile=$('.hn2-profile',header);
  let notificationButton=$('.hn2-notifications',header);
  if(tools&&!notificationButton){
    notificationButton=document.createElement('button');
    notificationButton.className='hn2-notifications';
    notificationButton.type='button';
    notificationButton.title='Notificações';
    notificationButton.setAttribute('aria-label','Abrir notificações');
    notificationButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg><span class="hn2-notification-badge" hidden></span>';
    tools.insertBefore(notificationButton,profile||tools.firstChild);
  }

  function openFallbackNotifications(items=[]){
    let overlay=$('#hn2NotificationOverlay');
    if(!overlay){
      overlay=document.createElement('div');
      overlay.id='hn2NotificationOverlay';
      overlay.className='va-modal-shell hn2-notification-overlay';
      overlay.hidden=true;
      overlay.addEventListener('click',event=>{if(event.target===overlay||event.target.closest('[data-hn2-notification-close]'))overlay.hidden=true;});
      document.body.appendChild(overlay);
    }
    const body=items.length?items.map(item=>`<article class="hn2-notification-item"><strong>${escapeHtml(item.title||'Notificação')}</strong><p>${escapeHtml(item.note||item.message||'')}</p></article>`).join(''):'<p class="hn2-empty-copy">Nenhuma notificação no momento.</p>';
    overlay.innerHTML=`<div class="va-modal-card hn2-notification-card"><button class="va-modal-close" type="button" data-hn2-notification-close>×</button><span class="hn2-panel-kicker">Hollow Nexus</span><h2>Notificações</h2>${body}</div>`;
    overlay.hidden=false;
  }

  let latestNotifications=[];
  async function refreshNotifications(){
    if(!notificationButton)return;
    try{
      const data=await request('/api/notifications');
      latestNotifications=Array.isArray(data.notifications)?data.notifications:[];
      const unread=Number(data.unread||0);
      const badge=$('.hn2-notification-badge',notificationButton);
      if(badge){badge.textContent=unread>99?'99+':String(unread);badge.hidden=!unread;}
      notificationButton.classList.toggle('has-unread',unread>0);
    }catch{
      const badge=$('.hn2-notification-badge',notificationButton);
      if(badge)badge.hidden=true;
    }
  }

  notificationButton?.addEventListener('click',event=>{
    event.preventDefault();
    const open=window.VoidArena?.openNotifications;
    if(typeof open==='function')open();
    else openFallbackNotifications(latestNotifications);
  });
  refreshNotifications();
  window.setInterval(refreshNotifications,60000);

  function filterSearchResults(accessData){
    const access=accessData?.access||{};
    $$('#hn2SearchResults a[href]').forEach(anchor=>{
      const target=normalizedPath(anchor);
      const key=ACCESS_BY_PATH[target];
      const denied=(key&&Object.prototype.hasOwnProperty.call(access,key)&&access[key]===false)||(ADMIN_PATHS.has(target)&&!accessData?.isAdmin);
      anchor.hidden=Boolean(denied);
    });
  }

  function refreshMenuLabels(){
    const menu=$('.hn2-menu',header);
    if(!menu)return;
    const children=Array.from(menu.children);
    children.forEach((node,index)=>{
      if(node.tagName!=='SPAN')return;
      let visible=false;
      for(let i=index+1;i<children.length&&children[i].tagName!=='SPAN';i++){
        if(!children[i].hidden){visible=true;break;}
      }
      node.hidden=!visible;
    });
  }

  function showAccessDenied(){
    if(document.body.classList.contains('hn2-access-denied'))return;
    document.body.classList.add('hn2-access-denied');
    const main=$('.frm-main,.va-main,main');
    if(!main)return;
    const card=document.createElement('section');
    card.className='hn2-panel hn2-access-denied-card';
    card.innerHTML='<span class="hn2-panel-kicker">Acesso restrito</span><h1>Área sem permissão</h1><p>Seu perfil atual não possui acesso liberado para esta área da Hollow Nexus.</p><a class="va-btn primary" href="/pages/dashboard.html">Voltar para o início</a>';
    main.appendChild(card);
  }

  let accessSnapshot=null;
  async function applyAccess(){
    try{
      const data=await request('/api/access/me');
      accessSnapshot=data;
      const access=data.access||{};
      $$('[data-hn-access-key]',header).forEach(anchor=>{
        const key=anchor.dataset.hnAccessKey;
        if(Object.prototype.hasOwnProperty.call(access,key))anchor.hidden=access[key]===false;
      });
      $$('[data-hn-admin-only]',header).forEach(anchor=>anchor.hidden=!data.isAdmin);
      refreshMenuLabels();
      filterSearchResults(data);

      const currentKey=ACCESS_BY_PATH[path];
      const currentDenied=(currentKey&&Object.prototype.hasOwnProperty.call(access,currentKey)&&access[currentKey]===false)||(ADMIN_PATHS.has(path)&&!data.isAdmin);
      if(currentDenied)showAccessDenied();
    }catch{
      // Mantém o comportamento degradado existente: não bloqueia a navegação se o serviço de acesso estiver temporariamente indisponível.
    }
  }
  applyAccess();

  const search=$('#hn2SiteSearch',header);
  search?.addEventListener('input',()=>requestAnimationFrame(()=>{if(accessSnapshot)filterSearchResults(accessSnapshot);}));

  async function hydrateProfile(){
    if(!profile)return;
    try{
      const data=await request('/api/me');
      const user=data.user||{};
      const name=user?.profile?.username||user?.name||user?.username||'Perfil';
      const avatar=user?.avatar||user?.profile?.avatar||'';
      const label=$('span:last-child',profile);
      if(label)label.textContent=name;
      profile.title=`Abrir perfil de ${name}`;
      const dot=$('.hn2-avatar-dot',profile);
      if(dot&&avatar){
        dot.textContent='';
        const img=document.createElement('img');
        img.src=avatar;
        img.alt='';
        dot.appendChild(img);
      }
    }catch{}
  }
  hydrateProfile();
})();
