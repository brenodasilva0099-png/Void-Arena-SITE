const list = document.getElementById('list');
const empty = document.getElementById('empty');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}

function labelStatus(status = '') {
  const labels = {
    pending: 'Pendente',
    reviewed: 'Analisado',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    archived: 'Arquivado'
  };
  return labels[status] || status || 'Pendente';
}

function videoEndpoint(id) {
  return `/api/training-submissions/${encodeURIComponent(id)}/video`;
}

async function sendTrainingComment(id) {
  const content = prompt('Comentário para enviar no privado do jogador:');

  if (!content || !content.trim()) return;

  const response = await fetch(`/api/training-submissions/${encodeURIComponent(id)}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: content.trim() })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    alert(data.message || 'Não foi possível enviar o comentário.');
    return;
  }

  if (data.deliveredToDiscord) {
    alert('✅ Comentário enviado no privado do jogador.');
  } else {
    alert(`⚠️ Comentário salvo, mas não consegui entregar na DM. Motivo: ${data.dmError || 'DM fechada ou usuário indisponível.'}`);
  }

  await loadTrainings();
}

async function updateStatus(id, status) {
  const reviewNote = status === 'approved'
    ? 'Partida aprovado.'
    : status === 'rejected'
      ? 'Partida rejeitado.'
      : 'Partida marcado como analisado.';

  const response = await fetch(`/api/training-submissions/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, reviewNote })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    alert(data.message || 'Não foi possível atualizar o partida.');
    return;
  }

  await loadTrainings();
}

function ensureVideoModal() {
  let modal = document.getElementById('videoModal');

  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'videoModal';
  modal.className = 'video-modal';
  modal.innerHTML = `
    <div class="video-modal-panel">
      <div class="video-modal-head">
        <strong id="videoModalTitle">🎥 Partida em vídeo</strong>
        <button type="button" class="btn" data-close-video>Fechar</button>
      </div>
      <video id="videoModalPlayer" controls playsinline preload="metadata"></video>
      <p id="videoModalHint" class="video-hint"></p>
    </div>
  `;

  document.body.appendChild(modal);

  modal.addEventListener('click', (event) => {
    if (event.target === modal || event.target.closest('[data-close-video]')) {
      closeVideoModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeVideoModal();
  });

  return modal;
}

function openVideoModal(item) {
  const modal = ensureVideoModal();
  const player = document.getElementById('videoModalPlayer');
  const title = document.getElementById('videoModalTitle');
  const hint = document.getElementById('videoModalHint');

  const src = videoEndpoint(item.id);

  title.textContent = `🎥 ${item.playerName || 'Partida em vídeo'}`;
  hint.textContent = `${item.type || 'Partida'} • ${item.position || 'Posição'} • ${labelStatus(item.status)} • Carregando pelo histórico do Discord...`;

  player.pause();
  player.removeAttribute('src');
  player.load();

  player.onloadedmetadata = () => {
    hint.textContent = `${item.type || 'Partida'} • ${item.position || 'Posição'} • ${labelStatus(item.status)} • Vídeo carregado`;
  };

  player.onerror = () => {
    hint.textContent = 'Não consegui reproduzir esse formato no navegador. Use “Ver no Discord” ou envie em MP4/H.264.';
  };

  player.src = src;
  modal.classList.add('is-open');

  const playPromise = player.play();
  if (playPromise?.catch) {
    playPromise.catch(() => {});
  }
}

function closeVideoModal() {
  const modal = document.getElementById('videoModal');
  const player = document.getElementById('videoModalPlayer');

  if (player) {
    player.pause();
    player.removeAttribute('src');
    player.load();
  }

  if (modal) modal.classList.remove('is-open');
}

function renderCard(item, isAdmin) {
  const video = item.video || {};
  const hasVideo = Boolean(video.url || video.proxyUrl || video.attachmentUrl || video.downloadUrl);
  const date = item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : 'Data não informada';

  return `
    <article class="card">
      <button class="video-preview" type="button" data-open-video="${escapeHtml(item.id)}" ${hasVideo ? '' : 'disabled'}>
        <span class="video-preview-glow"></span>
        <span class="video-preview-icon">${hasVideo ? '▶' : '🎥'}</span>
        <span class="video-preview-info">
          <strong>${hasVideo ? 'Reproduzir partida' : 'Vídeo indisponível'}</strong>
          <small>${escapeHtml(item.type || 'Partida')} • ${escapeHtml(item.position || 'Posição')}</small>
        </span>
      </button>

      <div class="card-body">
        <strong class="player-name">${escapeHtml(item.playerName || 'Jogador')}</strong>
        <div class="meta">
          <span class="pill">${escapeHtml(item.type || 'Partida')}</span>
          <span class="pill">${escapeHtml(item.position || 'Posição')}</span>
          <span class="pill status-${escapeHtml(item.status)}">${escapeHtml(labelStatus(item.status))}</span>
        </div>
        <p>${escapeHtml(item.description || 'Sem descrição.')}</p>
        <p><small>${escapeHtml(date)}</small></p>
        ${Array.isArray(item.comments) && item.comments.length ? `
          <div class="training-comments">
            <strong>Comentários enviados</strong>
            ${item.comments.slice(-3).map((comment) => `
              <p><small>${escapeHtml(comment.authorName || 'Equipe')}:</small> ${escapeHtml(comment.content || '')}</p>
            `).join('')}
          </div>
        ` : ''}
        <div class="actions">
          ${hasVideo ? `<button class="btn" type="button" data-open-video="${escapeHtml(item.id)}">Abrir vídeo</button>` : ''}
          ${item.discordMessageId && item.discordChannelId ? `<a class="btn" href="https://discord.com/channels/${escapeHtml(item.guildId || '@me')}/${escapeHtml(item.discordChannelId)}/${escapeHtml(item.discordMessageId)}" target="_blank" rel="noopener">Ver no Discord</a>` : ''}
          ${isAdmin ? `
            <button class="btn" type="button" data-comment="${escapeHtml(item.id)}">Comentário</button>
            <button class="btn" data-status="reviewed" data-id="${escapeHtml(item.id)}">Analisado</button>
            <button class="btn" data-status="approved" data-id="${escapeHtml(item.id)}">Aprovar</button>
            <button class="btn" data-status="rejected" data-id="${escapeHtml(item.id)}">Rejeitar</button>
          ` : ''}
        </div>
      </div>
    </article>
  `;
}

async function loadTrainings() {
  const response = await fetch(`/api/training-submissions?t=${Date.now()}`);
  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    location.href = '/';
    return;
  }

  if (!response.ok || data.success === false) {
    list.innerHTML = '';
    empty.hidden = false;
    empty.textContent = data.message || 'Erro ao carregar partidas.';
    return;
  }

  const submissions = Array.isArray(data.submissions) ? data.submissions : [];
  window.__trainingSubmissions = submissions;

  empty.hidden = submissions.length > 0;
  list.innerHTML = submissions.map((item) => renderCard(item, data.isAdmin)).join('');

  document.querySelectorAll('[data-status][data-id]').forEach((button) => {
    button.addEventListener('click', () => updateStatus(button.dataset.id, button.dataset.status));
  });

  document.querySelectorAll('[data-open-video]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = window.__trainingSubmissions.find((submission) => String(submission.id) === String(button.dataset.openVideo));
      if (item) openVideoModal(item);
    });
  });

  document.querySelectorAll('[data-comment]').forEach((button) => {
    button.addEventListener('click', () => sendTrainingComment(button.dataset.comment));
  });
}

loadTrainings();
setInterval(() => {
  if (!document.hidden) loadTrainings();
}, 6000);
