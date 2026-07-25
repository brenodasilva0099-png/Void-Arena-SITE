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

function field(title, value, full = false, fallback = '-') {
  return `
    <div class="field ${full ? 'full' : ''}">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(value || fallback)}</span>
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

function recoveryNotice(item = {}) {
  const recovery = item.recovery && typeof item.recovery === 'object' ? item.recovery : null;
  if (!recovery) return '';

  const incomplete = Boolean(recovery.incomplete);
  const title = incomplete ? '⚠️ Recuperação parcial do histórico' : '✅ Registro recuperado do backup';
  const message = incomplete
    ? (recovery.note || 'Algumas respostas não estavam disponíveis no histórico. Solicite ao jogador que confirme ou reenvie os campos marcados como não recuperados.')
    : (recovery.note || 'O registro completo foi recuperado de um snapshot do banco.');

  return `
    <div class="full" style="padding:14px 16px;border-radius:16px;border:1px solid ${incomplete ? 'rgba(251,191,36,.48)' : 'rgba(34,197,94,.42)'};background:${incomplete ? 'rgba(245,158,11,.12)' : 'rgba(34,197,94,.10)'};color:#f8fafc;line-height:1.5">
      <strong style="display:block;margin-bottom:5px;color:${incomplete ? '#fde68a' : '#bbf7d0'}">${escapeHtml(title)}</strong>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
}

function renderCard(item) {
  const date = item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : 'Data desconhecida';
  const comments = Array.isArray(item.comments) ? item.comments : [];
  const label = item.userName || item.discordTag || 'Jogador';
  const recoveryIncomplete = Boolean(item.recovery?.incomplete);
  const missingFallback = recoveryIncomplete ? 'Não recuperado' : '-';

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
          ${recoveryNotice(item)}
          ${field('Nome Real / Código Steam', item.realNameSteamCode, false, missingFallback)}
          ${field('Idade', item.age, false, missingFallback)}
          ${field('Discord', item.discordTag || item.discordId, false, recoveryIncomplete ? 'Não recuperado' : 'Não vinculado')}
          ${field('Posição Principal', item.primaryPosition, false, missingFallback)}
          ${field('Posição Secundária', item.secondaryPosition, false, missingFallback)}
          ${field('Estilo de Jogo', item.playStyle, false, missingFallback)}
          ${field('Experiência / Horas', item.experienceHours, false, missingFallback)}
          ${field('Time anterior', item.previousTeam, false, missingFallback)}
          ${field('Disponibilidade', item.availability, true, missingFallback)}
          ${field('Pontos fortes', item.strengths, true, missingFallback)}
          ${field('Pontos fracos', item.weaknesses, true, missingFallback)}
          ${field('Por que deseja entrar?', item.reason, true, missingFallback)}
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

async function hasCanonicalSession() {
  try {
    const response = await fetch(`/api/auth/session?t=${Date.now()}`, {
      credentials: 'same-origin',
      cache: 'no-store'
    });
    const data = await response.json().catch(() => ({}));
    return Boolean(response.ok && (data.authenticated || data.user?.discordId || data.user?.id));
  } catch {
    return false;
  }
}

async function loadForms() {
  const response = await fetch(`/api/player-applications?t=${Date.now()}`);
  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    const authenticated = await hasCanonicalSession();
    if (!authenticated) {
      const next = `${location.pathname}${location.search}${location.hash}`;
      location.href = `/pages/login.html?next=${encodeURIComponent(next)}`;
      return;
    }

    list.innerHTML = '';
    empty.hidden = false;
    empty.textContent = 'Sua sessão continua ativa, mas os formulários ainda estão sincronizando. Aguarde alguns segundos e recarregue.';
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