(async function () {
  const list = document.getElementById('eventsList'); const st = document.getElementById('eventsStatus');
  try { await VoidArena.bootLayout('eventos'); const data = await VoidArena.request('/api/events'); const events = data.events || [];
    list.innerHTML = events.length ? events.map(e => `<div class="va-item va-event-item"><div>${e.logo ? `<img src="${VoidArena.escapeHtml(e.logo)}" alt="" />` : '<span class="va-orb">🏆</span>'}</div><div><strong>${VoidArena.escapeHtml(e.title || e.name || 'Evento')}</strong><div class="va-muted">${VoidArena.escapeHtml(e.status || 'open')} • ${(e.registrations || []).length || e.registeredCount || 0}/${e.teamLimit || 0} times • ${VoidArena.escapeHtml(e.matchFormat || '')}</div></div></div>`).join('') : '<div class="va-item">Nenhum evento cadastrado.</div>';
    st.textContent = 'Eventos carregados.'; st.className='va-status ok';
  } catch (e) { st.textContent = `❌ ${e.message}`; st.className='va-status err'; }
}());
