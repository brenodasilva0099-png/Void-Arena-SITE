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

async function updateStatus(id, status) {
  const reviewNote = status === 'approved'
    ? 'Treino aprovado.'
    : status === 'rejected'
      ? 'Treino rejeitado.'
      : 'Treino marcado como analisado.';

  const response = await fetch(`/api/training-submissions/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, reviewNote })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    alert(data.message || 'Não foi possível atualizar o treino.');
    return;
  }

  await loadTrainings();
}

function renderCard(item, isAdmin) {
  const video = item.video || {};
  const videoUrl = video.url || video.proxyUrl || '';
  const date = item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : 'Data não informada';

  return `
    <article class="card">
      ${videoUrl ? `<video controls src="${escapeHtml(videoUrl)}"></video>` : ''}
      <div class="card-body">
        <strong>${escapeHtml(item.playerName || 'Jogador')}</strong>
        <div class="meta">
          <span class="pill">${escapeHtml(item.type || 'Treino')}</span>
          <span class="pill">${escapeHtml(item.position || 'Posição')}</span>
          <span class="pill status-${escapeHtml(item.status)}">${escapeHtml(labelStatus(item.status))}</span>
        </div>
        <p>${escapeHtml(item.description || 'Sem descrição.')}</p>
        <p><small>${escapeHtml(date)}</small></p>
        <div class="actions">
          ${videoUrl ? `<a class="btn" href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener">Abrir vídeo</a>` : ''}
          ${item.discordMessageId && item.discordChannelId ? `<a class="btn" href="https://discord.com/channels/${escapeHtml(item.guildId || '@me')}/${escapeHtml(item.discordChannelId)}/${escapeHtml(item.discordMessageId)}" target="_blank" rel="noopener">Ver no Discord</a>` : ''}
          ${isAdmin ? `
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
  const response = await fetch('/api/training-submissions');
  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    location.href = '/';
    return;
  }

  if (!response.ok || data.success === false) {
    list.innerHTML = '';
    empty.hidden = false;
    empty.textContent = data.message || 'Erro ao carregar treinos.';
    return;
  }

  const submissions = Array.isArray(data.submissions) ? data.submissions : [];
  empty.hidden = submissions.length > 0;
  list.innerHTML = submissions.map((item) => renderCard(item, data.isAdmin)).join('');

  document.querySelectorAll('[data-status][data-id]').forEach((button) => {
    button.addEventListener('click', () => updateStatus(button.dataset.id, button.dataset.status));
  });
}

loadTrainings();
