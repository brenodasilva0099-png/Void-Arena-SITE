function pickString(value) {
  const raw = String(value || '').trim();
  return raw || '';
}

function isUsableImageSource(value = '') {
  const raw = pickString(value);
  return Boolean(raw && (raw.startsWith('data:image/') || /^https?:\/\//i.test(raw) || raw.startsWith('/')));
}

function sourceFromObject(value = null) {
  if (!value || typeof value !== 'object') return '';
  const candidates = [
    value.url,
    value.proxyUrl,
    value.proxyURL,
    value.src,
    value.href,
    value.image,
    value.imageUrl,
    value.logo,
    value.logoUrl,
    value.logoURL,
    value.attachmentUrl,
    value.downloadUrl
  ];
  return candidates.map(pickString).find(isUsableImageSource) || '';
}

function normalizeTeamLogo(team = {}, fallback = '') {
  const candidates = [
    team.logo,
    team.logoUrl,
    team.logoURL,
    team.logo_url,
    team.escudo,
    team.escudoUrl,
    team.escudoURL,
    team.shield,
    team.shieldUrl,
    team.badge,
    team.badgeUrl,
    team.icon,
    team.iconUrl,
    team.avatar,
    team.avatarUrl,
    team.image,
    team.imageUrl,
    team.picture,
    team.photo,
    team.thumbnail,
    sourceFromObject(team.logoFile),
    sourceFromObject(team.logoAttachment),
    sourceFromObject(team.attachment),
    sourceFromObject(team.file),
    sourceFromObject(team.media),
    fallback
  ];

  return candidates.map(pickString).find(isUsableImageSource) || '';
}

function teamInitials(team = {}) {
  return String(team.tag || team.name || 'TM').trim().slice(0, 2).toUpperCase() || 'TM';
}

function svgFallback(team = {}) {
  const label = teamInitials(team).replace(/[&<>"']/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><radialGradient id="g" cx="35%" cy="22%" r="85%"><stop offset="0" stop-color="#7dd3fc"/><stop offset=".45" stop-color="#7c3aed"/><stop offset="1" stop-color="#050816"/></radialGradient></defs><rect width="128" height="128" rx="30" fill="#050816"/><rect x="6" y="6" width="116" height="116" rx="26" fill="url(#g)" opacity=".92"/><text x="64" y="76" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="34" font-weight="900" fill="#fff">${label}</text></svg>`;
}

module.exports = {
  normalizeTeamLogo,
  teamInitials,
  svgFallback,
  isUsableImageSource
};
