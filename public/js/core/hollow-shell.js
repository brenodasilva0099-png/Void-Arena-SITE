(function(){
  // O header definitivo é criado por hollow-v2-runtime.js, carregado por último.
  // Este arquivo permanece apenas por compatibilidade com páginas antigas que ainda o referenciam.
  if(window.__HollowNexusLegacyShellCompat)return;
  window.__HollowNexusLegacyShellCompat=true;
  const title=document.title||'';
  if(/Void Arena/i.test(title))document.title=title.replace(/Void Arena/ig,'Hollow Nexus');
}());
