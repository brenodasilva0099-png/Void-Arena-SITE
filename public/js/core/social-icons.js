(function () {
  const labels = { discord: 'Discord', steam: 'Steam', xbox: 'Xbox', tiktok: 'TikTok', youtube: 'YouTube', twitter: 'Twitter/X', spotify: 'Spotify', riot: 'Riot ID', ea: 'EA ID', psn: 'PSN', instagram: 'Instagram', website: 'Site' };
  const bg = { discord: '#5865F2', steam: '#111827', xbox: '#107C10', tiktok: '#050505', youtube: '#ff0033', twitter: '#050505', spotify: '#1DB954', riot: '#d71920', ea: '#ff1744', psn: '#075db3', instagram: '#c13584', website: '#22d3ee' };
  const mark = { discord: '☁', steam: 'S', xbox: 'X', tiktok: '♪', youtube: '▶', twitter: '𝕏', spotify: '≋', riot: 'R', ea: 'EA', psn: 'PS', instagram: '◎', website: '↗' };
  function ensureCss() { if (document.querySelector('link[href="/css/social-profile-polish.css"]')) return; const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/css/social-profile-polish.css'; document.head.appendChild(link); }
  function svg(key) {
    const k = String(key || '').toLowerCase(); const text = mark[k] || '↗'; const color = bg[k] || '#334155'; const fontSize = text.length > 1 ? 28 : 42;
    return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="24" fill="${color}"/><circle cx="48" cy="48" r="43" fill="rgba(255,255,255,.08)"/><text x="48" y="58" text-anchor="middle" font-size="${fontSize}" font-family="Arial Black,Arial,sans-serif" font-weight="900" fill="white">${text}</text></svg>`)}`;
  }
  function iconHtml(key) { ensureCss(); return `<img class="va-social-logo-img" src="${svg(key)}" alt="" loading="lazy" />`; }
  function label(key) { return labels[String(key || '').toLowerCase()] || key; }
  ensureCss();
  window.VoidArenaSocial = { iconHtml, label };
}());
