(async function () {
  const list = document.getElementById('rankingList'); const st = document.getElementById('rankingStatus');
  try { await VoidArena.bootLayout('rankings'); const data = await VoidArena.request('/api/teams'); const teams = data.teams || [];
    list.innerHTML = teams.length ? teams.map((t, i) => `<div class="va-item"><strong>#${i+1} ${VoidArena.escapeHtml(t.name)}</strong><div class="va-muted">Ranking base. Estatísticas avançadas entram na próxima etapa.</div></div>`).join('') : '<div class="va-item">Nenhum time para ranquear.</div>';
    st.textContent = 'Ranking base carregado.'; st.className='va-status ok';
  } catch (e) { st.textContent = `❌ ${e.message}`; st.className='va-status err'; }
}());
