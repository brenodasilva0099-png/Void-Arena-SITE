const positions = ['Goleiro', 'Fixo', 'Ala Defensivo', 'Ala Ofensivo', 'Pivô'];
const styles = ['Defensivo', 'Equilibrado', 'Ofensivo'];

function renderRadioGroup(name, values) {
  const box = document.querySelector(`[data-radio="${name}"]`);
  if (!box) return;

  box.innerHTML = values.map((value) => `
    <label class="option">
      <input type="radio" name="${name}" value="${value}" required>
      <span>${value}</span>
    </label>
  `).join('');
}

renderRadioGroup('primaryPosition', positions);
renderRadioGroup('secondaryPosition', positions);
renderRadioGroup('playStyle', styles);

const form = document.getElementById('applicationForm');
const statusEl = document.getElementById('status');

function formToObject(formData) {
  const data = {};
  for (const [key, value] of formData.entries()) {
    data[key] = String(value || '').trim();
  }
  return data;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  statusEl.className = 'status';
  statusEl.textContent = 'Enviando inscrição...';

  const payload = formToObject(new FormData(form));

  try {
    const response = await fetch('/api/player-applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      location.href = '/';
      return;
    }

    if (!response.ok || data.success === false) {
      throw new Error(data.message || 'Não foi possível enviar inscrição.');
    }

    statusEl.className = 'status ok';
    statusEl.textContent = '✅ Inscrição enviada com sucesso. A equipe vai avaliar suas informações.';
    form.reset();
  } catch (error) {
    statusEl.className = 'status err';
    statusEl.textContent = `❌ ${error.message}`;
  }
});
