const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const TARGETS = {
  assetsApi: path.join(ROOT, 'public', 'assets', 'api.js'),
  coreApi: path.join(ROOT, 'public', 'js', 'core', 'api.js'),
  profile: path.join(ROOT, 'public', 'js', 'pages', 'perfil.js'),
  authUi: path.join(ROOT, 'public', 'js', 'core', 'league-auth-ui.js')
};
const MARKER = 'hnl-canonical-auth-client-v1';
let changed = 0;

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function write(file, content) {
  if (!content || read(file) === content) return false;
  fs.writeFileSync(file, content, 'utf8');
  changed += 1;
  return true;
}

function patchAssetsApi() {
  const file = TARGETS.assetsApi;
  let src = read(file);
  if (!src || src.includes(MARKER)) return;

  src = src.replace(
    "if(response.status===401){ window.location.href='/'; throw new Error('Sessão expirada. Faça login novamente.'); }",
    "if(response.status===401){const session=await fetch('/api/auth/session?t='+Date.now(),{credentials:'include',cache:'no-store',headers:{Accept:'application/json'}}).then((r)=>r.json()).catch(()=>null);if(!session?.authenticated){const next=(location.pathname||'/pages/dashboard.html')+(location.search||'');window.location.href='/pages/login.html?next='+encodeURIComponent(next);}throw new Error(data.message||'A sessão Discord está ativa, mas este recurso ainda não respondeu.');}"
  );
  src = src.replace(
    "async function loadMe(){ const data=await request('/api/me',{timeoutMs:9000}); return data.user; }",
    "async function loadMe(){const data=await request('/api/auth/session',{timeoutMs:7000});if(!data.authenticated||!data.user){const next=(location.pathname||'/pages/dashboard.html')+(location.search||'');location.href='/pages/login.html?next='+encodeURIComponent(next);throw new Error('Faça login com o Discord para continuar.');}return data.user;}"
  );
  src = src.replace("const VA = window.VoidArena || {};", `const AUTH_CLIENT_BUILD='${MARKER}';\n  const VA = window.VoidArena || {};`);
  write(file, src);
}

function patchCoreApi() {
  const file = TARGETS.coreApi;
  let src = read(file);
  if (!src || src.includes(MARKER)) return;

  src = src.replace(
    "if(r.status===401){location.href='/';throw new Error('Sessão expirada. Faça login novamente.')}",
    "if(r.status===401){const s=await fetch('/api/auth/session?t='+Date.now(),{credentials:'include',cache:'no-store',headers:{Accept:'application/json'}}).then(x=>x.json()).catch(()=>null);if(!s?.authenticated){const n=(location.pathname||'/pages/dashboard.html')+(location.search||'');location.href='/pages/login.html?next='+encodeURIComponent(n)}throw new Error(d.message||'A sessão Discord está ativa, mas este recurso ainda não respondeu.')}"
  );
  src = src.replace(
    "async function loadMe(){return(await request('/api/me',{timeoutMs:9000})).user}",
    "async function loadMe(){const d=await request('/api/auth/session',{timeoutMs:7000});if(!d.authenticated||!d.user){const n=(location.pathname||'/pages/dashboard.html')+(location.search||'');location.href='/pages/login.html?next='+encodeURIComponent(n);throw new Error('Faça login com o Discord para continuar.')}return d.user}"
  );
  src = src.replace('(function(){', `(function(){const AUTH_CLIENT_BUILD='${MARKER}';`);
  write(file, src);
}

function patchProfile() {
  const file = TARGETS.profile;
  let src = read(file);
  if (!src || src.includes(MARKER)) return;

  const oldLoad = "  async function load() { if (!document.querySelector('.frm-shell') && typeof VoidArena.bootLayout === 'function') await VoidArena.bootLayout('perfil'); const data = await VoidArena.request('/api/me/profile-v2'); fill(data); setStatus('Perfil carregado.', 'ok'); }";
  const newLoad = `  const AUTH_PROFILE_BUILD = '${MARKER}';\n  async function load() {\n    if (!document.querySelector('.frm-shell') && typeof VoidArena.bootLayout === 'function') await VoidArena.bootLayout('perfil');\n    setStatus('Carregando seus dados persistentes...');\n    let lastError = null;\n    for (let attempt = 0; attempt < 4; attempt += 1) {\n      try {\n        const data = await VoidArena.request('/api/me/profile-v2', { timeoutMs: 8000 });\n        fill(data);\n        setStatus('Perfil carregado.', 'ok');\n        return;\n      } catch (error) {\n        lastError = error;\n        const retryable = /temporariamente|indispon[ií]vel|carregando|503|tempo limite|failed to fetch|network/i.test(String(error?.message || ''));\n        if (!retryable) throw error;\n        setStatus('Sua sessão continua ativa. Aguardando os dados do perfil responderem...');\n        await new Promise((resolve) => setTimeout(resolve, 1200 + attempt * 600));\n      }\n    }\n    throw lastError || new Error('Não foi possível carregar os dados do perfil nesta tentativa.');\n  }`;

  if (src.includes(oldLoad)) src = src.replace(oldLoad, newLoad);
  write(file, src);
}

function patchAuthUi() {
  const file = TARGETS.authUi;
  let src = read(file);
  if (!src || src.includes(MARKER)) return;

  src = src.replace(
    "  const BUILD = '2026-07-24-discord-only-auth-v2';",
    `  const BUILD = '${MARKER}';`
  );
  src = src.replace(
    "    } catch {\n      allButtons().forEach(renderLoggedOut);\n      document.documentElement.dataset.discordAuthenticated = '0';\n    } finally {",
    "    } catch {\n      document.documentElement.dataset.discordAuthenticated = 'pending';\n    } finally {"
  );
  write(file, src);
}

patchAssetsApi();
patchCoreApi();
patchProfile();
patchAuthUi();

for (const file of Object.values(TARGETS)) {
  const source = read(file);
  if (source) new Function(source);
}

console.log(changed
  ? `[Discord/Auth] Cliente canônico aplicado em ${changed} arquivo(s); falso logout e tela preta removidos.`
  : '[Discord/Auth] Cliente canônico já estava aplicado.');