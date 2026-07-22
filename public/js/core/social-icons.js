(function () {
  'use strict';

  const labels = {
    discord: 'Discord', steam: 'Steam', xbox: 'Xbox', tiktok: 'TikTok',
    youtube: 'YouTube', twitter: 'X / Twitter', spotify: 'Spotify',
    riot: 'Riot ID', ea: 'EA ID', psn: 'PSN', instagram: 'Instagram',
    twitch: 'Twitch', website: 'Site', site: 'Site'
  };

  const paths = {
    discord: '<path d="M14 15c6-4 14-4 20 0 3 5 4 10 4 15-3 3-6 5-9 6l-2-3c2-1 3-2 4-3-5 3-10 3-15 0 1 1 2 2 4 3l-2 3c-3-1-6-3-9-6 0-5 1-10 5-15Zm6 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm8 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" fill="white"/>',
    steam: '<circle cx="16" cy="31" r="6" fill="none" stroke="white" stroke-width="3"/><circle cx="32" cy="17" r="7" fill="none" stroke="white" stroke-width="3"/><path d="m21 28 7-7M11 28l-5-2" stroke="white" stroke-width="4" stroke-linecap="round"/>',
    xbox: '<circle cx="24" cy="24" r="16" fill="white"/><path d="M14 16c6 2 8 5 10 8 2-3 4-6 10-8-3 7-6 12-10 18-4-6-7-11-10-18Zm2-4c3-2 6-3 8-3s5 1 8 3c-4-1-6 0-8 2-2-2-4-3-8-2Z" fill="#107c10"/>',
    tiktok: '<path d="M27 10c1 5 4 8 9 9v6c-3 0-6-1-9-3v10a10 10 0 1 1-8-10v6a4 4 0 1 0 2 4V10Z" fill="white"/>',
    youtube: '<rect x="8" y="14" width="32" height="21" rx="7" fill="white"/><path d="m21 20 10 5-10 5Z" fill="#ff0033"/>',
    twitter: '<path d="M13 11h7l6 9 8-9h4L28 23l10 14h-7l-7-10-9 10h-4l11-13Z" fill="white"/>',
    spotify: '<path d="M12 18c9-4 20-3 27 1M14 25c8-3 16-2 23 1M16 31c6-2 13-1 18 1" fill="none" stroke="white" stroke-width="4" stroke-linecap="round"/>',
    riot: '<path d="m9 16 25-7 5 4-4 24-8-2 1-13-3 12-7-2 2-10-4 9-6-2Z" fill="white"/>',
    ea: '<path d="M8 31 19 17h13l8 14h-7l-2-4H20l4-5h5l-1-2h-7l-8 11Zm8-9H9l3-5h8Z" fill="white"/>',
    psn: '<path d="M21 9c8 1 11 4 11 9v12l-6-2V17c0-2-1-3-3-3v25l-6-2V11Zm12 19c8-2 11 1 6 4-5 3-15 5-23 4-8-1-9-4-2-7v3c6 2 14 1 19-1 2-1 2-2 0-3ZM9 27c3-2 7-3 11-3v4c-4 0-8 1-11 3Z" fill="white"/>',
    instagram: '<rect x="10" y="10" width="28" height="28" rx="9" fill="none" stroke="white" stroke-width="3"/><circle cx="24" cy="24" r="7" fill="none" stroke="white" stroke-width="3"/><circle cx="33" cy="15" r="2" fill="white"/>',
    twitch: '<path d="M11 9h29v21l-9 9h-7l-6 5v-5h-7Zm6 6v18h6v4l5-4h6l4-4V15Zm10 4h3v8h-3Zm7 0h3v8h-3Z" fill="white"/>',
    website: '<circle cx="24" cy="24" r="15" fill="none" stroke="white" stroke-width="3"/><path d="M9 24h30M24 9c5 5 7 10 7 15s-2 10-7 15c-5-5-7-10-7-15s2-10 7-15Z" fill="none" stroke="white" stroke-width="2.5"/>'
  };

  const colors = {
    discord: '#5865f2', steam: '#172c47', xbox: '#107c10', tiktok: '#050505',
    youtube: '#ff0033', twitter: '#050505', spotify: '#1db954', riot: '#d1363a',
    ea: '#ff4747', psn: '#006fcd', instagram: '#d62976', twitch: '#9146ff',
    website: '#0ea5e9'
  };

  function keyOf(value = '') {
    const key = String(value || '').toLowerCase().trim();
    return key === 'x' ? 'twitter' : key === 'site' ? 'website' : key;
  }

  function ensureCss() {
    if (document.querySelector('link[href^="/css/social-profile-polish.css"]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/social-profile-polish.css';
    document.head.appendChild(link);
  }

  function iconHtml(value) {
    ensureCss();
    const key = keyOf(value);
    const path = paths[key] || paths.website;
    const color = colors[key] || colors.website;
    return `<svg class="va-social-logo-img" viewBox="0 0 48 48" role="img" aria-label="${labels[key] || 'Conexão'}"><rect width="48" height="48" rx="12" fill="${color}"/>${path}</svg>`;
  }

  function label(value) {
    const key = keyOf(value);
    return labels[key] || String(value || 'Conexão');
  }

  ensureCss();
  window.VoidArenaSocial = Object.freeze({ iconHtml, label });
}());
