(async function () {
  const list = document.getElementById('teamsList'); const st = document.getElementById('teamsStatus');
  try { await VoidArena.bootLayout('times'); const data = await VoidArena.request('/api/teams'); const teams = data.teams || [];
    list.innerHTML = teams.length ? teams.map(t => `<div class="va-item va-team-item">${t.logo ? `<img src="${VoidArena.escapeHtml(t.logo)}" alt="" />` : `<span>${VoidArena.escapeHtml((t.tag || t.name || '?').slice(0,2).toUpperCase())}</span>`}<div><strong>${VoidArena.escapeHtml(t.name)} ${t.tag ? `(${VoidArena.escapeHtml(t.tag)})` : ''}</strong><div class="va-muted">Titulares: ${(t.players || []).length} • Reservas: ${(t.reserves || []).length} • Capitão: ${VoidArena.escapeHtml(t.ownerName || t.captainName || 'não definido')}</div></div></div>`).join('') : '<div class="va-item">Nenhum time cadastrado.</div>';
    st.textContent = 'Times carregados.'; st.className='va-status ok';
  } catch (e) { st.textContent = `❌ ${e.message}`; st.className='va-status err'; }
}());
