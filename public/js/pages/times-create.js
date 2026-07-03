(function () {
  const form = document.getElementById('teamCreateForm');
  const status = document.getElementById('teamCreateStatus');
  const toggle = document.getElementById('toggleTeamFormBtn');
  const clear = document.getElementById('clearTeamFormBtn');

  if (!form) return;

  function setStatus(message, type = '') {
    if (!status) return;
    status.textContent = message;
    status.className = `va-status ${type}`.trim();
  }

  function split(value = '') {
    return String(value || '').split(',').map((item) => item.trim()).filter(Boolean).slice(0, 5);
  }

  function collect() {
    const data = new FormData(form);
    const players = split(data.get('players'));
    const reserves = split(data.get('reserves'));
    return {
      name: data.get('name'),
      tag: data.get('tag'),
      logo: data.get('logo'),
      players,
      reserves,
      playerAccounts: {
        players: split(data.get('playerAccounts')).slice(0, players.length),
        reserves: split(data.get('reserveAccounts')).slice(0, reserves.length)
      },
      socials: {
        discord: data.get('socialDiscord'),
        instagram: data.get('socialInstagram'),
        youtube: data.get('socialYoutube')
      }
    };
  }

  toggle?.addEventListener('click', () => {
    form.hidden = !form.hidden;
    toggle.textContent = form.hidden ? 'Abrir cadastro' : 'Fechar cadastro';
  });

  clear?.addEventListener('click', () => {
    form.reset();
    setStatus('');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('Salvando time...');
    try {
      await VoidArena.request('/api/teams', { method: 'POST', body: JSON.stringify(collect()) });
      setStatus('Time criado com sucesso. Recarregando lista...', 'ok');
      form.reset();
      setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setStatus(`Erro ao criar time: ${error.message}`, 'err');
    }
  });
}());
