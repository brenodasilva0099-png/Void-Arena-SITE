const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const APP_FILE = path.join(__dirname, 'app.js');
const PUBLIC_DIR = path.join(ROOT, 'public');
const PAGES_DIR = path.join(PUBLIC_DIR, 'pages');
const AUTH_JS_FILE = path.join(PUBLIC_DIR, 'js', 'core', 'discord-auth-avatar.js');
const AUTH_CSS_FILE = path.join(PUBLIC_DIR, 'css', 'discord-auth-avatar.css');
const UPDATES_FILE = path.join(PAGES_DIR, 'atualizacoes.html');
const BUILD = '2026-07-18-discord-avatar-session-v1';
const UPDATE_ID = 'release-2026-07-18-discord-avatar-session';
let changed = false;

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (read(file) !== content) {
    fs.writeFileSync(file, content, 'utf8');
    changed = true;
  }
}

function walkHtml(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory()
      ? walkHtml(full)
      : (entry.isFile() && entry.name.endsWith('.html') ? [full] : []);
  });
}

function authStatusRouteBlock() {
  return String.raw`  app.get('/api/auth/session', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const userId = String(req.session?.userId || '');
    if (!userId) {
      return res.json({ success: true, authenticated: false, user: null });
    }

    try {
      let user = await findUserById(userId);
      if (!user) {
        return res.json({ success: true, authenticated: false, pending: true, user: null });
      }

      try {
        user = await refreshDiscordProfile(user);
      } catch {}

      return res.json({
        success: true,
        authenticated: true,
        user: safeUser(user)
      });
    } catch (error) {
      return res.json({ success: true, authenticated: false, pending: true, user: null, message: error.message });
    }
  });

`;
}

function robustCallbackCompletionBlock() {
  return String.raw`      const next = String(req.session.oauthReturnTo || '/pages/perfil.html');
      const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/pages/perfil.html';
      const statelessMaxAge = Number(process.env.SESSION_MAX_AGE_MS || 1000 * 60 * 60 * 24 * 30) || 1000 * 60 * 60 * 24 * 30;

      const completeDiscordLogin = () => {
        req.session.userId = user.id;
        req.session.authenticatedAt = new Date().toISOString();
        delete req.session.oauthReturnTo;

        return req.session.save((sessionError) => {
          if (sessionError) {
            return res.status(500).send('Erro ao salvar a sessão do Discord: ' + sessionError.message);
          }

          try {
            if (typeof signStatelessSessionPayload === 'function') {
              res.cookie('void.arena.login', signStatelessSessionPayload({
                userId: user.id,
                exp: Date.now() + statelessMaxAge
              }), {
                httpOnly: true,
                sameSite: 'lax',
                secure: req.secure || String(req.headers['x-forwarded-proto'] || '').includes('https'),
                path: '/',
                maxAge: statelessMaxAge
              });
            }
          } catch {}

          return res.redirect(safeNext);
        });
      };

      if (typeof req.session.regenerate === 'function') {
        return req.session.regenerate((regenerateError) => {
          if (regenerateError) {
            return res.status(500).send('Erro ao iniciar a sessão do Discord: ' + regenerateError.message);
          }
          req.session.oauthReturnTo = safeNext;
          return completeDiscordLogin();
        });
      }

      return completeDiscordLogin();`;
}

function patchApp() {
  let src = read(APP_FILE);
  if (!src) return;

  if (!src.includes("app.get('/api/auth/session'")) {
    const anchor = "  app.get('/api/me', async (req, res) => {";
    if (src.includes(anchor)) {
      src = src.replace(anchor, authStatusRouteBlock() + anchor);
    }
  }

  const oldCompletion = /      req\.session\.userId = user\.id;\n      const next = String\(req\.session\.oauthReturnTo \|\| '\/pages\/perfil\.html'\);\n      delete req\.session\.oauthReturnTo;\n      return req\.session\.save\(\(\) => res\.redirect\(next\.startsWith\('\/'\) && !next\.startsWith\('\/\/'\) \? next : '\/pages\/perfil\.html'\)\);/;

  if (oldCompletion.test(src)) {
    src = src.replace(oldCompletion, () => robustCallbackCompletionBlock());
  }

  write(APP_FILE, src);
}

function authAvatarJs() {
  return `(function(){
  const BUILD='${BUILD}';
  const SELECTORS='[data-frm-login],[data-discord-login],.frm-header-actions a[href*="/auth/discord"]';

  function buttons(){
    const found=Array.from(document.querySelectorAll(SELECTORS));
    Array.from(document.querySelectorAll('.frm-header-actions a')).forEach((link)=>{
      const text=String(link.textContent||'').toLowerCase();
      if((text.includes('entrar')||text.includes('painel'))&&!found.includes(link)) found.push(link);
    });
    return found;
  }

  function currentReturnPath(){
    const value=String(location.pathname||'/pages/dashboard.html')+String(location.search||'')+String(location.hash||'');
    return value.startsWith('/')&&!value.startsWith('//')?value:'/pages/perfil.html';
  }

  function loginHref(){
    return '/auth/discord?next='+encodeURIComponent(currentReturnPath());
  }

  function defaultDiscordAvatar(discordId){
    try{
      const index=Number((BigInt(String(discordId||'0'))>>22n)%6n);
      return 'https://cdn.discordapp.com/embed/avatars/'+index+'.png';
    }catch{
      return '/assets/hollow-nexus-official.svg';
    }
  }

  function preserveOriginal(button){
    if(!button.dataset.authOriginalHtml){
      button.dataset.authOriginalHtml=button.innerHTML||'♟ ENTRAR / PAINEL';
      button.dataset.authOriginalClass=button.className||'';
    }
  }

  function showLoggedOut(button){
    preserveOriginal(button);
    button.dataset.loggedIn='0';
    button.dataset.discordLogin=BUILD;
    button.href=loginHref();
    button.title='Entrar com Discord';
    button.setAttribute('aria-label','Entrar com Discord');
    button.className=button.dataset.authOriginalClass||'frm-btn';
    button.classList.remove('hnl-auth-avatar-button');
    button.innerHTML=button.dataset.authOriginalHtml||'♟ ENTRAR / PAINEL';
  }

  function showLoggedIn(button,user){
    preserveOriginal(button);
    const avatar=String(user.avatar||defaultDiscordAvatar(user.discordId));
    const name=String(user.profile?.username||user.name||'Abrir perfil');
    button.dataset.loggedIn='1';
    button.dataset.discordLogin=BUILD;
    button.href='/pages/perfil.html';
    button.title=name+' — abrir perfil';
    button.setAttribute('aria-label',name+' — abrir perfil');
    button.className='hnl-auth-avatar-button';
    button.innerHTML='<img src="'+avatar.replace(/"/g,'&quot;')+'" alt="Avatar de '+name.replace(/"/g,'&quot;')+'"><span class="hnl-auth-online-dot" aria-hidden="true"></span>';
  }

  async function requestSession(){
    const response=await fetch('/api/auth/session?t='+Date.now(),{
      credentials:'include',
      cache:'no-store',
      headers:{Accept:'application/json'}
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(String(response.status));
    return data;
  }

  let running=false;
  async function sync(){
    if(running) return;
    running=true;
    try{
      const data=await requestSession();
      const list=buttons();
      if(data.authenticated&&data.user){
        list.forEach((button)=>showLoggedIn(button,data.user));
        document.documentElement.dataset.discordAuthenticated='1';
      }else{
        list.forEach(showLoggedOut);
        document.documentElement.dataset.discordAuthenticated='0';
      }
      document.documentElement.dataset.discordAvatarBuild=BUILD;
    }catch{
      buttons().forEach(showLoggedOut);
      document.documentElement.dataset.discordAuthenticated='0';
    }finally{
      running=false;
    }
  }

  document.addEventListener('click',(event)=>{
    const button=event.target&&event.target.closest?event.target.closest(SELECTORS):null;
    if(!button||button.dataset.loggedIn==='1') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.assign(loginHref());
  },true);

  let observerTimer=0;
  const observer=new MutationObserver(()=>{
    clearTimeout(observerTimer);
    observerTimer=setTimeout(sync,120);
  });

  function start(){
    sync();
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('focus',sync);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden) sync();});
    setTimeout(sync,900);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
`;
}

function authAvatarCss() {
  return `/* Discord avatar button ${BUILD} */
.hnl-auth-avatar-button{
  position:relative!important;
  width:44px!important;
  min-width:44px!important;
  height:44px!important;
  min-height:44px!important;
  display:inline-grid!important;
  place-items:center!important;
  padding:0!important;
  overflow:visible!important;
  border-radius:999px!important;
  border:2px solid rgba(168,85,247,.78)!important;
  background:#080b16!important;
  box-shadow:0 0 0 3px rgba(139,92,246,.12),0 0 22px rgba(139,92,246,.38)!important;
  text-decoration:none!important;
  transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease!important;
}
.hnl-auth-avatar-button:hover{
  transform:translateY(-1px) scale(1.04)!important;
  border-color:#c084fc!important;
  box-shadow:0 0 0 4px rgba(139,92,246,.16),0 0 28px rgba(139,92,246,.55)!important;
}
.hnl-auth-avatar-button img{
  width:100%!important;
  height:100%!important;
  display:block!important;
  border-radius:999px!important;
  object-fit:cover!important;
  background:#05060d!important;
}
.hnl-auth-online-dot{
  position:absolute;
  right:-1px;
  bottom:-1px;
  width:12px;
  height:12px;
  border:2px solid #0b1020;
  border-radius:999px;
  background:#22c55e;
  box-shadow:0 0 8px rgba(34,197,94,.65);
}
`;
}

function patchHtml(file) {
  let html = read(file);
  if (!html) return;

  html = html.replace(/\s*<link[^>]+discord-auth-avatar\.css[^>]*>/gi, '');
  html = html.replace(/\s*<script[^>]+discord-auth-avatar\.js[^>]*><\/script>/gi, '');

  if (html.includes('</head>')) {
    html = html.replace('</head>', `  <link rel="stylesheet" href="/css/discord-auth-avatar.css?v=${BUILD}">\n</head>`);
  }

  if (html.includes('</body>')) {
    html = html.replace('</body>', `  <script src="/js/core/discord-auth-avatar.js?v=${BUILD}"></script>\n</body>`);
  }

  write(file, html);
}

function insertUpdate(html, card) {
  if (html.includes('<article class="va-card va-update-card"')) {
    return html.replace('<article class="va-card va-update-card"', card + '\n          <article class="va-card va-update-card"');
  }
  if (html.includes('</main>')) return html.replace('</main>', card + '\n</main>');
  return html + card;
}

function patchUpdates() {
  let html = read(UPDATES_FILE);
  if (!html || html.includes(UPDATE_ID)) return;

  const card = `
          <article class="va-card va-update-card" id="${UPDATE_ID}">
            <span class="va-update-dot"></span>
            <div class="va-update-meta"><span>18/07/2026 • 18:07 BRT</span><span>Site</span><span>Discord/Sessão</span></div>
            <h3>Botão de login passa a exibir o avatar real do Discord</h3>
            <p class="va-muted">A sessão do OAuth Discord foi reforçada no retorno do Render e o cabeçalho ganhou sincronização própria de autenticação.</p>
            <ul class="va-update-list">
              <li class="site">Usuário autenticado vê um botão circular com seu avatar do Discord e acesso direto ao perfil.</li>
              <li class="site">Usuário desconectado continua vendo o botão Entrar/Painel, que abre a autorização do Discord.</li>
              <li class="fix">O callback agora regenera e salva a sessão antes do redirecionamento, com cookie persistente de recuperação.</li>
              <li class="fix">A rota /api/auth/session informa o estado de login sem gerar erro 401 no console.</li>
            </ul>
          </article>
`;

  write(UPDATES_FILE, insertUpdate(html, card));
}

patchApp();
write(AUTH_JS_FILE, authAvatarJs());
write(AUTH_CSS_FILE, authAvatarCss());
[...walkHtml(PAGES_DIR), path.join(PUBLIC_DIR, 'index.html')].forEach(patchHtml);
patchUpdates();

console.log(changed
  ? '[Discord/Auth] Sessao persistente e botao circular de avatar aplicados.'
  : '[Discord/Auth] Sessao persistente e botao circular de avatar ja estavam aplicados.');
