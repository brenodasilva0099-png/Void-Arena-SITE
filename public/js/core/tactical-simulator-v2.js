(function () {
  'use strict';

  const STORAGE_KEY = 'hnl:tactical-simulator:v2';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  let steps = [];
  let running = false;

  function tokenNodes() {
    return $$('.hnl-token', $('#tacticBoard'));
  }

  function tokenData(node) {
    const caption = $('.hnl-token-caption', node);
    return {
      id: node?.dataset?.id || '',
      name: $('b', caption)?.textContent?.trim() || (node?.classList?.contains('ball') ? 'Bola' : 'Jogador'),
      role: $('small', caption)?.textContent?.trim() || '',
      team: node?.classList?.contains('enemy') ? 'enemy' : node?.classList?.contains('ball') ? 'ball' : 'ally',
      node
    };
  }

  function players(includeEnemy = true) {
    return tokenNodes().map(tokenData).filter((item) => item.team !== 'ball' && (includeEnemy || item.team === 'ally'));
  }

  function ball() {
    return tokenNodes().map(tokenData).find((item) => item.team === 'ball') || null;
  }

  function goalkeeper(team = 'enemy') {
    return players(true).find((item) => item.team === team && /gol|gk|goleiro/i.test(`${item.name} ${item.role}`)) || players(true).find((item) => item.team === team) || null;
  }

  function normalize(value = '') {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
  }

  function findPlayer(reference = '', preferredTeam = '') {
    const key = normalize(reference);
    const list = players(true);
    if (!key) return preferredTeam ? list.find((item) => item.team === preferredTeam) || null : list[0] || null;
    return list.find((item) => normalize(item.name) === key)
      || list.find((item) => normalize(item.name).includes(key))
      || list.find((item) => normalize(item.role) === key && (!preferredTeam || item.team === preferredTeam))
      || list.find((item) => normalize(item.role).includes(key) && (!preferredTeam || item.team === preferredTeam))
      || null;
  }

  function positionOf(node) {
    return { x: Number.parseFloat(node?.style?.left || '50') || 50, y: Number.parseFloat(node?.style?.top || '50') || 50 };
  }

  function moveNode(node, x, y, duration = 650) {
    return new Promise((resolve) => {
      if (!node) return resolve();
      node.style.transition = `left ${duration}ms cubic-bezier(.2,.75,.25,1), top ${duration}ms cubic-bezier(.2,.75,.25,1), transform ${duration}ms ease`;
      requestAnimationFrame(() => {
        node.style.left = `${Math.max(2, Math.min(98, x))}%`;
        node.style.top = `${Math.max(3, Math.min(97, y))}%`;
      });
      window.setTimeout(() => {
        node.style.transition = '';
        resolve();
      }, duration + 40);
    });
  }

  function ensureFieldDecorations(board) {
    if (!board || $('.hnl-penalty-arc', board)) return;
    ['left', 'right'].forEach((side) => {
      const arc = document.createElement('div');
      arc.className = `hnl-penalty-arc ${side}`;
      arc.setAttribute('aria-hidden', 'true');
      board.appendChild(arc);
    });
    ['tl', 'tr', 'bl', 'br'].forEach((corner) => {
      const arc = document.createElement('div');
      arc.className = `hnl-corner-arc ${corner}`;
      arc.setAttribute('aria-hidden', 'true');
      board.appendChild(arc);
    });
    const target = document.createElement('div');
    target.className = 'hnl-goal-target';
    target.setAttribute('aria-hidden', 'true');
    for (let index = 0; index < 9; index += 1) target.appendChild(document.createElement('span'));
    board.appendChild(target);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'hnl-play-path');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.innerHTML = '<defs><marker id="hnlArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z"></path></marker></defs><g id="hnlPathLayer"></g>';
    board.appendChild(svg);
  }

  function drawPath(from, to, kind = 'pass') {
    const layer = $('#hnlPathLayer');
    if (!layer || !from || !to) return;
    const a = positionOf(from);
    const b = positionOf(to);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', a.x);
    line.setAttribute('y1', a.y);
    line.setAttribute('x2', b.x);
    line.setAttribute('y2', b.y);
    line.setAttribute('marker-end', 'url(#hnlArrow)');
    line.setAttribute('class', kind === 'shot' ? 'shot' : kind === 'run' ? 'run' : 'pass');
    layer.appendChild(line);
  }

  function clearVisualState() {
    $$('.hnl-token.is-action-source,.hnl-token.is-action-target,.hnl-token.is-goalkeeper-dive').forEach((node) => node.classList.remove('is-action-source', 'is-action-target', 'is-goalkeeper-dive'));
    $('#hnlPathLayer')?.replaceChildren();
    $$('.hnl-goal-target span').forEach((node) => node.classList.remove('active'));
  }

  function targetCoordinates(target = 'centro') {
    const key = normalize(target);
    const upper = /alto|superior/.test(key);
    const lower = /baixo|inferior/.test(key);
    const left = /esquer/.test(key);
    const right = /direit/.test(key);
    return { x: 97, y: upper ? 40 : lower ? 60 : 50, cell: (upper ? 0 : lower ? 6 : 3) + (left ? 0 : right ? 2 : 1) };
  }

  function highlightGoalTarget(target) {
    const { cell } = targetCoordinates(target);
    const cells = $$('.hnl-goal-target span');
    cells.forEach((node, index) => node.classList.toggle('active', index === cell));
  }

  function setStatus(message, type = '') {
    const box = $('#advancedTacticStatus') || $('#tacticStatus');
    if (box) box.innerHTML = `<div class="hnl-notice ${esc(type)}">${esc(message)}</div>`;
  }

  function actionLabel(step = {}) {
    if (step.type === 'pass') return `${step.from || 'Jogador'} passa para ${step.to || 'jogador'}${step.height === 'high' ? ' pelo alto' : ''}`;
    if (step.type === 'run') return `${step.from || 'Jogador'} se desloca para ${step.zone || 'a nova posição'}`;
    if (step.type === 'shot') return `${step.from || 'Jogador'} finaliza no ${step.target || 'centro do gol'}`;
    if (step.type === 'keeper') return `Goleiro tenta defender no ${step.target || 'centro'}`;
    if (step.type === 'wait') return `Espera ${step.duration || 600} ms`;
    return step.text || 'Ação tática';
  }

  function renderSteps() {
    const box = $('#tacticalSequence');
    if (!box) return;
    box.innerHTML = steps.length ? steps.map((step, index) => `<div class="hnl-tactical-step"><span class="hnl-tactical-step-index">${index + 1}</span><span><b>${esc(actionLabel(step))}</b><small>${esc(step.type || 'ação')}</small></span><span class="hnl-tactical-step-actions"><button class="hnl-btn" type="button" data-step-up="${index}" title="Subir">↑</button><button class="hnl-btn" type="button" data-step-down="${index}" title="Descer">↓</button><button class="hnl-btn danger" type="button" data-step-remove="${index}" title="Remover">×</button></span></div>`).join('') : '<div class="hnl-empty">Nenhuma ação adicionada. Use o editor ou descreva a jogada em texto.</div>';
    $$('[data-step-remove]', box).forEach((button) => button.addEventListener('click', () => { steps.splice(Number(button.dataset.stepRemove), 1); save(); renderSteps(); }));
    $$('[data-step-up]', box).forEach((button) => button.addEventListener('click', () => reorder(Number(button.dataset.stepUp), -1)));
    $$('[data-step-down]', box).forEach((button) => button.addEventListener('click', () => reorder(Number(button.dataset.stepDown), 1)));
  }

  function reorder(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= steps.length) return;
    [steps[index], steps[target]] = [steps[target], steps[index]];
    save(); renderSteps();
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ steps, updatedAt: new Date().toISOString() }));
  }

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      steps = Array.isArray(data.steps) ? data.steps : [];
    } catch { steps = []; }
  }

  function playerOptions() {
    const list = players(true);
    return list.map((item) => `<option value="${esc(item.name)}">${esc(item.name)} — ${esc(item.role || (item.team === 'enemy' ? 'Adversário' : 'Aliado'))}</option>`).join('');
  }

  function refreshSelectors() {
    const options = playerOptions();
    ['actionFrom', 'actionTo', 'shotPlayer'].forEach((id) => { const select = $(`#${id}`); if (select) select.innerHTML = options; });
  }

  function parseScript(text = '') {
    const statements = String(text || '').split(/\n|\.|;|\bdepois\b|\bem seguida\b|\bentao\b/gi).map((item) => item.trim()).filter(Boolean);
    const parsed = [];
    for (const sentence of statements) {
      const normalized = normalize(sentence);
      const names = players(true).map((item) => item.name).sort((a, b) => b.length - a.length);
      const mentioned = names.filter((name) => normalized.includes(normalize(name)));
      const roleMatch = sentence.match(/\b(goleiro|fixo|ala(?: defensivo| ofensivo)?|meio|pivo|atacante|ponta(?: direita| esquerda)?)\b/i);
      const actor = mentioned[0] || roleMatch?.[1] || '';
      if (/passe|passa|toca|lanca|lança/.test(normalized)) {
        const receiver = mentioned[1] || (sentence.match(/(?:para|pro|pra)\s+(?:o\s+|a\s+)?([\p{L}\d _-]{2,28})/iu)?.[1] || '').trim();
        parsed.push({ type: 'pass', from: actor, to: receiver, height: /alto|levantado|aereo|aéreo|por cima/.test(normalized) ? 'high' : 'ground' });
      } else if (/chuta|chute|finaliza|finalizacao|finalização/.test(normalized)) {
        const target = /alto/.test(normalized) ? (/esquer/.test(normalized) ? 'alto esquerdo' : /direit/.test(normalized) ? 'alto direito' : 'alto centro') : /baixo/.test(normalized) ? (/esquer/.test(normalized) ? 'baixo esquerdo' : /direit/.test(normalized) ? 'baixo direito' : 'baixo centro') : /esquer/.test(normalized) ? 'meio esquerdo' : /direit/.test(normalized) ? 'meio direito' : 'centro';
        parsed.push({ type: 'shot', from: actor, target });
      } else if (/goleiro|defende|mergulha|pula/.test(normalized) && /esquer|direit|meio|centro|alto|baixo/.test(normalized)) {
        const target = /alto/.test(normalized) ? (/esquer/.test(normalized) ? 'alto esquerdo' : /direit/.test(normalized) ? 'alto direito' : 'alto centro') : /baixo/.test(normalized) ? (/esquer/.test(normalized) ? 'baixo esquerdo' : /direit/.test(normalized) ? 'baixo direito' : 'baixo centro') : /esquer/.test(normalized) ? 'meio esquerdo' : /direit/.test(normalized) ? 'meio direito' : 'centro';
        parsed.push({ type: 'keeper', target });
      } else if (/sai|avanca|avança|corre|move|desloca|vai/.test(normalized)) {
        const zone = /meio|centro/.test(normalized) ? 'centro' : /direit/.test(normalized) ? 'direita' : /esquer/.test(normalized) ? 'esquerda' : /frente|ataque/.test(normalized) ? 'ataque' : 'livre';
        parsed.push({ type: 'run', from: actor, zone });
      }
    }
    return parsed;
  }

  function zoneCoordinates(zone = '', current = { x: 50, y: 50 }) {
    const key = normalize(zone);
    if (/centro|meio/.test(key)) return { x: Math.max(current.x, 50), y: 50 };
    if (/direit/.test(key)) return { x: Math.min(90, current.x + 15), y: 70 };
    if (/esquer/.test(key)) return { x: Math.min(90, current.x + 15), y: 30 };
    if (/ataque|frente/.test(key)) return { x: Math.min(90, current.x + 22), y: current.y };
    return { x: Math.min(90, current.x + 12), y: current.y };
  }

  async function executeStep(step, index) {
    const progress = $('#tacticalTimeline span');
    if (progress) progress.style.width = `${Math.round(((index + 1) / Math.max(1, steps.length)) * 100)}%`;
    clearVisualState();
    if (step.type === 'wait') return sleep(Number(step.duration || 600));
    if (step.type === 'run') {
      const actor = findPlayer(step.from, 'ally');
      if (!actor) throw new Error(`Jogador não encontrado: ${step.from || 'não informado'}`);
      actor.node.classList.add('is-action-source');
      const current = positionOf(actor.node);
      const target = zoneCoordinates(step.zone, current);
      drawPath(actor.node, { style: { left: `${target.x}%`, top: `${target.y}%` } }, 'run');
      return moveNode(actor.node, target.x, target.y, 800);
    }
    if (step.type === 'pass') {
      const from = findPlayer(step.from, 'ally');
      const to = findPlayer(step.to, 'ally');
      const ballToken = ball();
      if (!from || !to || !ballToken) throw new Error('Passe exige passador, receptor e bola no campo.');
      from.node.classList.add('is-action-source');
      to.node.classList.add('is-action-target');
      drawPath(from.node, to.node, 'pass');
      const a = positionOf(from.node);
      const b = positionOf(to.node);
      await moveNode(ballToken.node, a.x, a.y, 250);
      if (step.height === 'high') {
        ballToken.node.style.transform = 'translate(-50%,-50%) scale(1.45) translateY(-18px)';
        await sleep(180);
      }
      await moveNode(ballToken.node, b.x, b.y, step.height === 'high' ? 850 : 620);
      ballToken.node.style.transform = '';
      return;
    }
    if (step.type === 'keeper') {
      const keeper = goalkeeper('enemy');
      if (!keeper) throw new Error('Goleiro adversário não encontrado.');
      keeper.node.classList.add('is-goalkeeper-dive');
      const target = targetCoordinates(step.target);
      const y = target.y < 50 ? 40 : target.y > 50 ? 60 : 50;
      await moveNode(keeper.node, 92, y, 520);
      await sleep(300);
      return;
    }
    if (step.type === 'shot') {
      const shooter = findPlayer(step.from, 'ally');
      const ballToken = ball();
      if (!shooter || !ballToken) throw new Error('Finalização exige cobrador e bola no campo.');
      shooter.node.classList.add('is-action-source');
      const keeper = goalkeeper('enemy');
      const target = targetCoordinates(step.target);
      highlightGoalTarget(step.target);
      drawPath(shooter.node, { style: { left: `${target.x}%`, top: `${target.y}%` } }, 'shot');
      const shooterPos = positionOf(shooter.node);
      await moveNode(ballToken.node, shooterPos.x, shooterPos.y, 220);
      const keeperChoice = normalize(step.keeperTarget || $('#keeperDirection')?.value || 'centro');
      const shotChoice = normalize(step.target);
      if (keeper && step.autoKeeper !== false) {
        keeper.node.classList.add('is-goalkeeper-dive');
        const keeperY = /alto|esquer/.test(keeperChoice) ? 40 : /baixo|direit/.test(keeperChoice) ? 60 : 50;
        moveNode(keeper.node, 92, keeperY, 520);
      }
      await moveNode(ballToken.node, target.x, target.y, 720);
      const defended = keeper && (keeperChoice.includes('esquer') === shotChoice.includes('esquer')) && (keeperChoice.includes('direit') === shotChoice.includes('direit')) && (keeperChoice.includes('alto') === shotChoice.includes('alto')) && (keeperChoice.includes('baixo') === shotChoice.includes('baixo'));
      const result = $('#simulationResult');
      if (result) result.textContent = defended ? 'DEFESA' : 'GOL';
      setStatus(defended ? 'O goleiro leu o canto e defendeu a finalização.' : 'Finalização concluída: gol na simulação.', defended ? '' : 'success');
      await sleep(650);
    }
  }

  async function execute() {
    if (running || !steps.length) return;
    running = true;
    const button = $('#executeTacticalSequence');
    if (button) button.disabled = true;
    const original = new Map(tokenNodes().map((node) => [node.dataset.id, positionOf(node)]));
    const result = $('#simulationResult');
    if (result) result.textContent = 'EM JOGO';
    setStatus('Executando a sequência tática...', '');
    try {
      for (let index = 0; index < steps.length; index += 1) {
        await executeStep(steps[index], index);
        await sleep(250);
      }
      setStatus('Sequência executada. Você pode editar e rodar novamente.', 'success');
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      running = false;
      if (button) button.disabled = false;
      window.setTimeout(() => clearVisualState(), 900);
      if ($('#restoreAfterSimulation')?.checked) {
        await sleep(500);
        for (const node of tokenNodes()) {
          const saved = original.get(node.dataset.id);
          if (saved) await moveNode(node, saved.x, saved.y, 260);
        }
      }
    }
  }

  function addStructuredStep() {
    const type = $('#actionType')?.value || 'pass';
    if (type === 'pass') steps.push({ type, from: $('#actionFrom')?.value || '', to: $('#actionTo')?.value || '', height: $('#passHeight')?.value || 'ground' });
    else if (type === 'run') steps.push({ type, from: $('#actionFrom')?.value || '', zone: $('#runZone')?.value || 'centro' });
    else if (type === 'shot') steps.push({ type, from: $('#shotPlayer')?.value || $('#actionFrom')?.value || '', target: $('#shotTarget')?.value || 'centro', keeperTarget: $('#keeperDirection')?.value || 'centro', autoKeeper: true });
    else if (type === 'keeper') steps.push({ type, target: $('#keeperDirection')?.value || 'centro' });
    save(); renderSteps();
  }

  function injectLab() {
    const layout = $('.hnl-board-layout');
    const board = $('#tacticBoard');
    if (!layout || !board || $('#advancedTacticalLab')) return;
    ensureFieldDecorations(board);
    const section = document.createElement('section');
    section.className = 'hnl-tactical-lab';
    section.id = 'advancedTacticalLab';
    section.innerHTML = `<div class="hnl-tactical-lab-grid"><article class="hnl-card"><span class="hnl-section-kicker">Sequência manual</span><h2>Construtor de jogada</h2><p>Escolha os participantes e monte passes, deslocamentos, finalização e reação do goleiro.</p><div class="hnl-tactical-builder"><label>Tipo de ação<select class="hnl-select" id="actionType"><option value="pass">Passe</option><option value="run">Deslocamento</option><option value="shot">Finalização</option><option value="keeper">Defesa do goleiro</option></select></label><label>Jogador da ação<select class="hnl-select" id="actionFrom"></select></label><label>Destino do passe<select class="hnl-select" id="actionTo"></select></label><label>Tipo do passe<select class="hnl-select" id="passHeight"><option value="ground">Rasteiro</option><option value="high">Alto / aéreo</option></select></label><label>Zona do deslocamento<select class="hnl-select" id="runZone"><option value="centro">Meio / centro</option><option value="direita">Ala direita</option><option value="esquerda">Ala esquerda</option><option value="ataque">Avançar ao ataque</option></select></label><label>Finalizador<select class="hnl-select" id="shotPlayer"></select></label><label>Alvo do chute<select class="hnl-select" id="shotTarget"><option>alto esquerdo</option><option>alto centro</option><option>alto direito</option><option>meio esquerdo</option><option selected>centro</option><option>meio direito</option><option>baixo esquerdo</option><option>baixo centro</option><option>baixo direito</option></select></label><label>Lado do goleiro<select class="hnl-select" id="keeperDirection"><option>alto esquerdo</option><option>alto centro</option><option>alto direito</option><option>meio esquerdo</option><option selected>centro</option><option>meio direito</option><option>baixo esquerdo</option><option>baixo centro</option><option>baixo direito</option></select></label><div class="hnl-actions full"><button class="hnl-btn primary" id="addTacticalStep" type="button">Adicionar ação</button><button class="hnl-btn" id="refreshTacticalPlayers" type="button">Atualizar jogadores</button></div></div></article><article class="hnl-card"><span class="hnl-section-kicker">Roteiro em português</span><h2>Descreva a jogada</h2><p>O interpretador reconhece jogador ou posição, deslocamento, passe, passe alto, finalização, canto e defesa do goleiro.</p><textarea class="hnl-textarea hnl-tactical-script" id="tacticalScript" placeholder="Exemplo: Goleiro sai pelo meio. Goleiro passa para o Fixo. Fixo dá passe alto para o Atacante. Atacante finaliza no alto direito. Goleiro adversário pula no centro."></textarea><div class="hnl-tactical-presets"><button class="hnl-btn" type="button" data-script-preset="Goleiro sai pelo meio. Goleiro passa para o Fixo. Fixo passa alto para o Atacante. Atacante finaliza no alto direito. Goleiro adversário pula no centro.">Saída com goleiro</button><button class="hnl-btn" type="button" data-script-preset="Ala se desloca pela direita. Fixo passa para o Ala. Ala passa para o Atacante. Atacante finaliza no baixo esquerdo.">Triangulação pela ala</button><button class="hnl-btn" type="button" data-script-preset="Meio avança pelo centro. Goleiro passa para o Meio. Meio dá passe alto para o Pivô. Pivô finaliza no centro.">Passe alto no pivô</button></div><div class="hnl-actions" style="margin-top:12px"><button class="hnl-btn primary" id="parseTacticalScript" type="button">Interpretar e adicionar</button><button class="hnl-btn danger" id="clearTacticalSequence" type="button">Limpar sequência</button></div></article></div><article class="hnl-card"><div class="hnl-console-head"><div><span class="hnl-section-kicker">Simulação</span><h2>Linha do tempo da jogada</h2><p>Reordene as ações, execute a animação e escolha se o campo volta à formação inicial.</p></div><div class="hnl-actions"><label class="hnl-check"><input id="restoreAfterSimulation" type="checkbox" checked><span>Restaurar posições</span></label><button class="hnl-btn accent" id="executeTacticalSequence" type="button">▶ Executar jogada</button><button class="hnl-btn primary" id="saveTacticalSequence" type="button">Salvar roteiro</button></div></div><div class="hnl-tactical-timeline" id="tacticalTimeline"><span></span></div><div class="hnl-simulation-score" style="margin:12px 0"><div><strong id="simulationResult">PRONTO</strong><span>Resultado</span></div><div><strong id="simulationStepCount">0</strong><span>Ações</span></div><div><strong>9</strong><span>Zonas de finalização</span></div><div><strong>5v5</strong><span>Formato da prancheta</span></div></div><div id="advancedTacticStatus"></div><div class="hnl-tactical-sequence" id="tacticalSequence"></div></article>`;
    layout.insertAdjacentElement('afterend', section);
    refreshSelectors();
    renderSteps();
    $('#simulationStepCount').textContent = String(steps.length);
    $('#addTacticalStep')?.addEventListener('click', () => { addStructuredStep(); $('#simulationStepCount').textContent = String(steps.length); });
    $('#refreshTacticalPlayers')?.addEventListener('click', refreshSelectors);
    $('#parseTacticalScript')?.addEventListener('click', () => {
      const parsed = parseScript($('#tacticalScript')?.value || '');
      if (!parsed.length) return setStatus('Não consegui identificar ações. Use frases curtas com jogador, passe, movimento ou chute.', 'error');
      steps.push(...parsed); save(); renderSteps(); $('#simulationStepCount').textContent = String(steps.length); setStatus(`${parsed.length} ação(ões) interpretada(s).`, 'success');
    });
    $('#clearTacticalSequence')?.addEventListener('click', () => { steps = []; save(); renderSteps(); $('#simulationStepCount').textContent = '0'; clearVisualState(); });
    $('#executeTacticalSequence')?.addEventListener('click', execute);
    $('#saveTacticalSequence')?.addEventListener('click', () => { save(); setStatus('Roteiro salvo neste navegador.', 'success'); });
    $$('[data-script-preset]').forEach((button) => button.addEventListener('click', () => { const input = $('#tacticalScript'); if (input) input.value = button.dataset.scriptPreset || ''; }));
    const observer = new MutationObserver(() => refreshSelectors());
    observer.observe(board, { childList: true, subtree: true });
  }

  async function boot() {
    if (!document.body?.dataset || (document.body.dataset.hnlModule !== 'tactics' && document.body.dataset.frmModule !== 'tactics')) return;
    load();
    for (let attempt = 0; attempt < 80; attempt += 1) {
      if ($('#tacticBoard') && tokenNodes().length) break;
      await sleep(50);
    }
    injectLab();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}());
