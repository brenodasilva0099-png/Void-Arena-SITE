(function () {
  'use strict';

  const BUILD = '2026-07-18-page-integrity-v1';
  const REQUIRED_STYLES = [
    '/css/league-critical.css',
    '/css/league-polish.css',
    '/css/league-auth-ui.css'
  ];

  function absolutePath(value) {
    try { return new URL(value, location.origin).pathname; }
    catch { return String(value || '').split('?')[0]; }
  }

  function findStylesheet(pathname) {
    return Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .find((link) => absolutePath(link.href || link.getAttribute('href')) === pathname);
  }

  function appendStylesheet(pathname, reason) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${pathname}?v=${BUILD}&recovery=${Date.now()}`;
    link.dataset.hnlIntegrityRecovery = reason || 'missing';
    document.head.appendChild(link);
    return link;
  }

  function ensureBodyClass() {
    if (document.querySelector('.frm-shell') || document.body?.dataset?.frmModule) {
      document.body.classList.add('frm-polish-page');
    }
  }

  function styleLooksHealthy() {
    const shell = document.querySelector('.frm-shell');
    const main = document.querySelector('.frm-main');
    if (!shell || !main) return true;
    const shellStyle = getComputedStyle(shell);
    const mainStyle = getComputedStyle(main);
    return ['grid', 'flex'].includes(shellStyle.display)
      && Number.parseFloat(mainStyle.width || '0') > 100
      && Number.parseFloat(mainStyle.paddingLeft || '0') >= 8;
  }

  function addEmergencyLayout() {
    if (document.getElementById('hnl-emergency-layout')) return;
    const style = document.createElement('style');
    style.id = 'hnl-emergency-layout';
    style.textContent = [
      '.frm-shell{display:grid!important;grid-template-columns:254px minmax(0,1fr)!important;min-height:100vh!important}',
      '.frm-sidebar{position:sticky!important;top:0!important;height:100vh!important;overflow:auto!important;background:#090c18!important}',
      '.frm-main{min-width:0!important;width:100%!important;padding:18px 22px!important}',
      '.frm-card,.frm-page-hero,.frm-stat,.frm-footer{border:1px solid rgba(139,92,246,.28)!important;background:#111827!important}',
      '@media(max-width:1180px){.frm-shell{grid-template-columns:1fr!important}.frm-sidebar{position:relative!important;height:auto!important}}'
    ].join('');
    document.head.appendChild(style);
    document.documentElement.dataset.hnlEmergencyLayout = BUILD;
  }

  function watchStylesheet(link, pathname) {
    if (!link || link.dataset.hnlIntegrityWatched) return;
    link.dataset.hnlIntegrityWatched = '1';
    link.addEventListener('error', () => appendStylesheet(pathname, 'load-error'), { once: true });
  }

  function ensureStyles() {
    REQUIRED_STYLES.forEach((pathname) => {
      const existing = findStylesheet(pathname);
      watchStylesheet(existing || appendStylesheet(pathname, 'missing-link'), pathname);
    });
  }

  function verify() {
    ensureBodyClass();
    ensureStyles();
    requestAnimationFrame(() => {
      if (!styleLooksHealthy()) {
        REQUIRED_STYLES.forEach((pathname) => appendStylesheet(pathname, 'computed-style-failure'));
        addEmergencyLayout();
      }
      document.body?.classList.remove('hnl-page-loading');
      document.body?.classList.add('hnl-page-ready');
      document.documentElement.dataset.hnlPageIntegrity = BUILD;
    });
  }

  function start() {
    ensureBodyClass();
    ensureStyles();
    verify();
    setTimeout(verify, 300);
    setTimeout(verify, 1200);
    window.addEventListener('pageshow', verify);
    window.addEventListener('focus', verify);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) verify(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
