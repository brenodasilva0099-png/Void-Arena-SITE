const list = document.getElementById('list');
const empty = document.getElementById('empty');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}

function statusLabel(status = '') {
  const map = {
    pending: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    archived: 'Arquivado'
  };
  return map[status] || status || 'Pendente';
}

async function updateStatus(id, status) {
  const notes = status === 'approved'
    ? 'Inscrição aprovada.'
    : status === 'rejected'
      ? 'Inscrição rejeitada.'
      : 'Inscrição arquivada.';

  const response = await fetch(`/api/player-applications/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    alert(data.message || 'Erro ao atualizar inscrição.');
    return;
  }

  await loadForms();
}

async function deleteForm(id, label = '') {
  if (!id) return;
  const ok = confirm(`Excluir este formulário${label ? ` de ${label}` : ''}?\n\nEle será removido do banco atual e marcado para não voltar por backup antigo.`);
  if (!ok) return;

  const card = document.querySelector(`[data-card-id="${CSS.escape(id)}"]`);
  const buttons = card ? Array.from(card.querySelectorAll('button')) : [];
  buttons.forEach((button) => { button.disabled = true; });
  if (card) card.style.opacity = '.55';

  const response = await fetch(`/api/player-applications/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    buttons.forEach((button) => { button.disabled = false; });
    if (card) card.style.opacity = '';
    alert(data.message || 'Erro ao excluir formulário.');
    return;
  }

  if (card) card.remove();
  if (!list.querySelector('.card')) empty.hidden = false;
  await loadForms();
}

async function sendComment(id) {
  const content = prompt('Mensagem para enviar no privado do jogador:');
  if (!content || !content.trim()) return;

  const response = await fetch(`/api/player-applications/${encodeURIComponent(id)}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: content.trim() })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    alert(data.message || 'Erro ao enviar mensagem.');
    return;
  }

  if (data.deliveredToDiscord) {
    alert('✅ Mensagem enviada no privado do jogador.');
  } else {
    alert(`⚠️ Mensagem salva, mas não consegui entregar na DM. Motivo: ${data.dmError || 'DM fechada ou usuário sem Discord vinculado.'}`);
  }

  await loadForms();
}

function field(title, value, full = false) {
  return `
    <div class="field ${full ? 'full' : ''}">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(value || '-')}</span>
    </div>
  `;
}

function avatarMarkup(item = {}) {
  const name = item.userName || item.discordTag || 'Jogador';
  const letter = String(name || 'J').trim().charAt(0).toUpperCase() || 'J';
  const avatar = item.userAvatar || item.avatar || item.profileAvatar || '';

  if (avatar) {
    return `
      <div class="application-avatar-wrap">
        <img class="application-avatar" src="${escapeHtml(avatar)}" alt="Foto de ${escapeHtml(name)}" loading="lazy">
        <span class="application-status">${escapeHtml(statusLabel(item.status))}</span>
      </div>
    `;
  }

  return `
    <div class="application-avatar-wrap">
      <div class="application-avatar application-avatar-fallback">${escapeHtml(letter)}</div>
      <span class="application-status">${escapeHtml(statusLabel(item.status))}</span>
    </div>
  `;
}

function renderCard(item) {
  const date = item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : 'Data desconhecida';
  const comments = Array.isArray(item.comments) ? item.comments : [];
  const label = item.userName || item.discordTag || 'Jogador';

  return `
    <article class="card" data-card-id="${escapeHtml(item.id)}">
      <div class="card-head">
        <div>
          <h2>${escapeHtml(label)}</h2>
          <p>${escapeHtml(date)} • Origem: ${escapeHtml(item.source || 'site')}</p>
          <span class="pill compact-status">${escapeHtml(statusLabel(item.status))}</span>
        </div>
        ${avatarMarkup(item)}
      </div>

      <div class="card-body">
        <div class="grid">
          ${field('Nome Real / Código Steam', item.realNameSteamCode)}
          ${field('Idade', item.age)}
          ${field('Discord', item.discordTag || item.discordId || 'Não vinculado')}
          ${field('Posição Principal', item.primaryPosition)}
          ${field('Posição Secundária', item.secondaryPosition)}
          ${field('Estilo de Jogo', item.playStyle)}
          ${field('Experiência / Horas', item.experienceHours)}
          ${field('Time anterior', item.previousTeam)}
          ${field('Disponibilidade', item.availability, true)}
          ${field('Pontos fortes', item.strengths, true)}
          ${field('Pontos fracos', item.weaknesses, true)}
          ${field('Por que deseja entrar?', item.reason, true)}
        </div>

        ${comments.length ? `
          <div class="comments">
            <strong>Comentários enviados</strong>
            ${comments.slice(-4).map((comment) => `
              <p><b>${escapeHtml(comment.authorName || 'Equipe')}:</b> ${escapeHtml(comment.content || '')}</p>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <div class="actions">
        <button class="btn primary" data-comment="${escapeHtml(item.id)}">Enviar mensagem privada</button>
        <button class="btn" data-status="approved" data-id="${escapeHtml(item.id)}">Aprovar</button>
        <button class="btn" data-status="rejected" data-id="${escapeHtml(item.id)}">Rejeitar</button>
        <button class="btn" data-status="archived" data-id="${escapeHtml(item.id)}">Arquivar</button>
        <button class="btn danger" data-delete="${escapeHtml(item.id)}" data-label="${escapeHtml(label)}">Excluir formulário</button>
      </div>
    </article>
  `;
}

async function loadForms() {
  const response = await fetch(`/api/player-applications?t=${Date.now()}`);
  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    location.href = '/';
    return;
  }

  if (!response.ok || data.success === false) {
    list.innerHTML = '';
    empty.hidden = false;
    empty.textContent = data.message || 'Erro ao carregar formulários.';
    return;
  }

  const applications = Array.isArray(data.applications) ? data.applications : [];
  empty.hidden = applications.length > 0;
  list.innerHTML = applications.map(renderCard).join('');

  document.querySelectorAll('[data-comment]').forEach((button) => {
    button.addEventListener('click', () => sendComment(button.dataset.comment));
  });

  document.querySelectorAll('[data-status][data-id]').forEach((button) => {
    button.addEventListener('click', () => updateStatus(button.dataset.id, button.dataset.status));
  });

  document.querySelectorAll('[data-delete]').forEach((button) => {
    button.addEventListener('click', () => deleteForm(button.dataset.delete, button.dataset.label || ''));
  });
}

loadForms();
setInterval(() => {
  if (!document.hidden) loadForms();
}, 8000);
