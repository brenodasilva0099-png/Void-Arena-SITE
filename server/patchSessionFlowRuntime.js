const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const TARGETS = [
  path.join(ROOT, 'public/js/core/api.js'),
  path.join(ROOT, 'public/assets/api.js')
];

const RETRY_CORE = "function sleep(ms){return new Promise((resolve)=>setTimeout(resolve,ms))}\nasync function loadMe(){let lastError=null;for(let attempt=0;attempt<24;attempt+=1){try{return(await request('/api/me',{timeoutMs:14000})).user}catch(error){lastError=error;const message=String(error?.message||'');const retryable=/Banco carregando|Tempo limite|Failed to fetch|Falha na requisi[cç][aã]o \\(503\\)|fetch failed|network/i.test(message);if(!retryable)throw error;await sleep(Math.min(1000+attempt*250,3500));}}throw lastError||new Error('Banco carregando sua sessão. Tente novamente em alguns segundos.')}";

const RETRY_ASSETS = "function sleep(ms){return new Promise((resolve)=>setTimeout(resolve,ms))}\nasync function loadMe(){let lastError=null;for(let attempt=0;attempt<24;attempt+=1){try{const data=await request('/api/me',{timeoutMs:14000});return data.user}catch(error){lastError=error;const message=String(error?.message||'');const retryable=/Banco carregando|Tempo limite|Failed to fetch|Falha na requisi[cç][aã]o \\(503\\)|fetch failed|network/i.test(message);if(!retryable)throw error;await sleep(Math.min(1000+attempt*250,3500));}}throw lastError||new Error('Banco carregando sua sessão. Tente novamente em alguns segundos.')}";

function patchFile(file) {
  if (!fs.existsSync(file)) return false;
  let src = fs.readFileSync(file, 'utf8');
  const before = src;

  if (src.includes('async function loadMe(){return(await request(\'/api/me\',{timeoutMs:9000})).user}')) {
    src = src.replace("async function loadMe(){return(await request('/api/me',{timeoutMs:9000})).user}", RETRY_CORE);
  }

  if (src.includes("async function loadMe(){ const data=await request('/api/me',{timeoutMs:9000}); return data.user; }")) {
    src = src.replace("async function loadMe(){ const data=await request('/api/me',{timeoutMs:9000}); return data.user; }", RETRY_ASSETS);
  }

  if (src.includes("async function loadMe(){const data=await request('/api/me',{timeoutMs:9000});return data.user}")) {
    src = src.replace("async function loadMe(){const data=await request('/api/me',{timeoutMs:9000});return data.user}", RETRY_CORE);
  }

  if (src !== before) {
    fs.writeFileSync(file, src, 'utf8');
    return true;
  }
  return false;
}

let changed = 0;
for (const file of TARGETS) {
  if (patchFile(file)) changed += 1;
}

console.log(changed ? `Patch aplicado: fluxo anti-logout com retry em ${changed} arquivo(s).` : 'Patch ignorado: fluxo anti-logout ja estava aplicado ou alvo nao encontrado.');
