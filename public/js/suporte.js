const form = document.getElementById('supportForm');
const statusEl = document.getElementById('status');
const staffPanel = document.getElementById('staffPanel');
const ticketList = document.getElementById('ticketList');
const ticketEmpty = document.getElementById('ticketEmpty');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}

function formatDate(value) {
  if (!value) return 'sem data';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('pt-BR');
}

function statusLabel(value = '') {
  const map = {
    open: 'Aberto',
    pending: 'Pendente',
    reviewing: 'Em análise',
    resolved: 'Resolvido',
    closed: 'Fechado'
  };
  return map[value] || value || 'Aberto';
}

async function submitSupport(event) {
  event.preventDefault();
  statusEl.textContent = 'Enviando...';
  const data = Object.fromEntries(new FormData(form).entries());

  const response = await fetch('/api/support/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const result = await response.json().catch(() => ({}));
  if (response.status === 401) {
    location.href = '/';
    return;
  }
  if (!response.ok || result.success === false) {
    statusEl.textContent = result.message || 'Erro ao enviar suporte.';
    return;
  }

  form.reset();
  statusEl.textContent = `✅ Pedido enviado. Protocolo: ${result.ticket?.id || 'salvo'}`;
  await loadTickets();
}

function renderTicket(ticket = {}) {
  return `
    <article class="card" data-ticket-id="${escapeHtml(ticket.id)}">
      <div class="card-head">
        <div>
          <strong>${escapeHtml(ticket.title || 'Pedido de suporte')}</strong>
          <p class="muted">${escapeHtml(ticket.userName || ticket.discordTag || 'Jogador')} • ${escapeHtml(formatDate(ticket.createdAt))}</p>
        </div>
        <span class="pill">${escapeHtml(statusLabel(ticket.status))}</span>
      </div>
      <div class="card-body">
        <p><b>Área:</b> ${escapeHtml(ticket.category || '-')}</p>
        <p><b>Página:</b> ${escapeHtml(ticket.page || '-')}</p>
        <p>${escapeHtml(ticket.description || '-')}</p>
        <div class="actions">
          <button class="btn" data-ticket-status="reviewing" data-ticket="${escapeHtml(ticket.id)}">Em análise</button>
          <button class="btn success" data-ticket-status="resolved" data-ticket="${escapeHtml(ticket.id)}">Resolvido</button>
          <button class="btn" data-ticket-status="closed" data-ticket="${escapeHtml(ticket.id)}">Fechar</button>
          <button class="btn danger" data-ticket-delete="${escapeHtml(ticket.id)}">Excluir</button>
        </div>
      </div>
    </article>
  `;
}

async function updateTicketStatus(id, status) {
  const response = await fetch(`/api/support/tickets/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    alert(data.message || 'Erro ao atualizar suporte.');
    return;
  }
  await loadTickets();
}

async function deleteTicket(id) {
  if (!confirm('Excluir este pedido de suporte?')) return;
  const response = await fetch(`/api/support/tickets/${encodeURIComponent(id)}`, { method: 'DELETE' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    alert(data.message || 'Erro ao excluir suporte.');
    return;
  }
  await loadTickets();
}

async function loadTickets() {
  const response = await fetch(`/api/support/tickets?t=${Date.now()}`);
  if (response.status === 401 || response.status === 403) {
    staffPanel.hidden = true;
    return;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    staffPanel.hidden = true;
    return;
  }

  const tickets = Array.isArray(data.tickets) ? data.tickets : [];
  staffPanel.hidden = false;
  ticketEmpty.hidden = tickets.length > 0;
  ticketList.innerHTML = tickets.map(renderTicket).join('');

  document.querySelectorAll('[data-ticket-status][data-ticket]').forEach((button) => {
    button.addEventListener('click', () => updateTicketStatus(button.dataset.ticket, button.dataset.ticketStatus));
  });
  document.querySelectorAll('[data-ticket-delete]').forEach((button) => {
    button.addEventListener('click', () => deleteTicket(button.dataset.ticketDelete));
  });
}

form.addEventListener('submit', submitSupport);
loadTickets();
setInterval(() => {
  if (!document.hidden) loadTickets();
}, 10000);
