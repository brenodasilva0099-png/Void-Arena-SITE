(function () {
  'use strict';

  const STORAGE_KEY = 'hnl:tactical-simulator:v3';
  const $ = (selector, root = document) => root?.querySelector?.(selector) || null;
  const $$ = (selector, root = document) => root?.querySelectorAll ? Array.from(root.querySelectorAll(selector)) : [];
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  let steps = [];
  let running = false;
  let refreshQueued = false;

  function normalize(value = '') {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
  }

  function tokenNodes() {
    const board = $('#tacticBoard');
    return board ? $$('.hnl-token', board) : [];
  }

  function tokenData(node) {
    if (!node) return null;
    const caption = $('.hnl-token-caption', node);
    const team = node.dataset.team || (node.classList.contains('ball') ? 'ball' : node.classList.contains('enemy') ? 'enemy' : 'ally');
    return {
      id: node.dataset.id || '',
      name: node.dataset.name || $('b', caption)?.textContent?.trim() || (team === 'ball' ? 'Bola' : 'Jogador'),
      role: node.dataset.role || $('small', caption)?.textContent?.trim() || '',
      team,
      node
    };
  }

  function tokens() {
    return tokenNodes().map(tokenData).filter(Boolean);
  }

  function players(team = '') {
    return tokens().filter((item) => item.team !== 'ball' && (!team || item.team === team));
  }

  function ball() {
    return tokens().find((item) => item.team === 'ball') || null;
  }

  function findPlayer(reference = '', preferredTeam = '') {
    const key = normalize(reference);
    const list = players();
    if (!key) return preferredTeam ? list.find((item) => item.team === preferredTeam) || null : list[0] || null;
    return list.find((item) => normalize(item.name) === key && (!preferredTeam || item.team === preferredTeam))
      || list.find((item) => normalize(item.name).includes(key) && (!preferredTeam || item.team === preferredTeam))
      || list.find((item) => normalize(item.role) === key && (!preferredTeam || item.team === preferredTeam))
      || list.find((item) => normalize(item.role).includes(key) && (!preferredTeam || item.team === preferredTeam))
      || null;
  }

  function goalkeeper(team = 'enemy') {
    const list = players(team);
    return list.find((item) => /gol|gk|goleiro/i.test(`${item.name} ${item.role}`)) || list[0] || null;
  }

  function positionOf(node) {
    return {
      x: Number.parseFloat(node?.style?.left || '50') || 50,
      y: Number.parseFloat(node?.style?.top || '50') || 50
    };
  }

  function moveNode(node, x, y, duration = 620) {
    return new Promise((resolve) => {
      if (!node) { resolve(); return; }
      node.style.transition = `left ${duration}ms cubic-bezier(.2,.75,.25,1),top ${duration}ms cubic-bezier(.2,.75,.25,1),transform ${duration}ms ease`;
      requestAnimationFrame(() => {
        node.style.left = `${Math.max(2, Math.min(98, x))}%`;
        node.style.top = `${Math.max(3, Math.min(97, y))}%`;
      });
      window.setTimeout(() => { node.style.transition = ''; resolve(); }, duration + 40);
    });
  }

  function setStatus(message, type = '') {
    const box = $('#advancedTacticStatus') || $('#tacticStatus');
    if (box) box.innerHTML = `<div class="hnl-notice ${esc(type)}">${esc(message)}</div>`;
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ steps, updatedAt: new Date().toISOString() }));
  }

  function load() {
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem('hnl:tactical-simulator:v2') || '{}');
      steps = Array.isArray(current.steps) ? current.steps : [];
    } catch { steps = []; }
  }

  function actionLabel(step = {}) {
    if (step.type === 'pass') return `${step.from} passa para ${step.to}${step.height === 'high' ? ' pelo alto' : ''}`;
    if (step.type === 'run') return `${step.from} se desloca para ${step.zone}`;
    if (step.type === 'shot') return `${step.from} finaliza no ${step.target}`;
    if (step.type === 'keeper') return `Goleiro tenta defender no ${step.target}`;
    return 'Ação tática';
  }

  function renderSteps() {
    const box = $('#tacticalSequence');
    const count = $('#simulationStepCount');
    if (count) count.textContent = String(steps.length);
    if (!box) return;
    box.innerHTML = steps.length
      ? steps.map((step, index) => `<div class="hnl-tactical-step"><span class="hnl-tactical-step-index">${index + 1}</span><span><b>${esc(actionLabel(step))}</b><small>${esc(step.type)}</small></span><span class="hnl-tactical-step-actions"><button class="hnl-btn" type="button" data-step-up="${index}" title="Subir">↑</button><button class="hnl-btn" type="button" data-step-down="${index}" title="Descer">↓</button><button class="hnl-btn danger" type="button" data-step-remove="${index}" title="Remover">×</button></span></div>`).join('')
      : '<div class="hnl-empty">Nenhuma ação adicionada. Escolha os jogadores ou descreva a jogada.</div>';
    $$('[data-step-remove]', box).forEach((button) => button.addEventListener('click', () => { steps.splice(Number(button.dataset.stepRemove), 1); save(); renderSteps(); }));
    $$('[data-step-up]', box).forEach((button) => button.addEventListener('click', () => reorder(Number(button.dataset.stepUp), -1)));
    $$('[data-step-down]', box).forEach((button) => button.addEventListener('click', () => reorder(Number(button.dataset.stepDown), 1)));
  }

  function reorder(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= steps.length) return;
    [steps[index], steps[target]] = [steps[target], steps[index]];
    save();
    renderSteps();
  }

  function optionMarkup(list, label) {
    return list.length ? `<optgroup label="${esc(label)}">${list.map((item) => `<option value="${esc(item.name)}">${esc(item.name)} — ${esc(item.role || label)}</option>`).join('')}</optgroup>` : '';
  }

  function fillSelect(select, list, placeholder) {
    if (!select) return;
    const previous = select.value;
    select.innerHTML = `<option value="">${esc(placeholder)}</option>${list}`;
    if (previous && Array.from(select.options).some((option) => option.value === previous)) select.value = previous;
  }

  function refreshSelectors() {
    const allies = players('ally');
    const enemies = players('enemy');
    const allyOptions = optionMarkup(allies, 'Aliados');
    fillSelect($('#actionFrom'), allyOptions, allies.length ? 'Selecione quem inicia' : 'Adicione um aliado no campo');
    fillSelect($('#actionTo'), allyOptions, allies.length ? 'Selecione quem recebe' : 'Adicione um aliado no campo');
    fillSelect($('#shotPlayer'), allyOptions, allies.length ? 'Selecione o finalizador' : 'Adicione um aliado no campo');
    const keeper = $('#keeperPlayerInfo');
    if (keeper) keeper.textContent = goalkeeper('enemy') ? `Goleiro adversário: ${goalkeeper('enemy').name}` : enemies.length ? 'O primeiro adversário será usado como goleiro.' : 'Adicione um adversário para simular a defesa.';
  }

  function scheduleRefresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(() => { refreshQueued = false; refreshSelectors(); });
  }

  function updateBuilderFields() {
    const type = $('#actionType')?.value || 'pass';
    $$('[data-action-field]').forEach((field) => {
      const allowed = String(field.dataset.actionField || '').split(' ');
      field.hidden = !allowed.includes(type);
    });
  }

  function addStructuredStep() {
    const type = $('#actionType')?.value || 'pass';
    const from = $('#actionFrom')?.value || '';
    if (type !== 'keeper' && !from) { setStatus('Selecione o jogador da ação.', 'error'); return; }
    if (type === 'pass') {
      const to = $('#actionTo')?.value || '';
      if (!to) { setStatus('Selecione o destino do passe.', 'error'); return; }
      if (to === from) { setStatus('Passador e receptor precisam ser jogadores diferentes.', 'error'); return; }
      steps.push({ type, from, to, height: $('#passHeight')?.value || 'ground' });
    } else if (type === 'run') {
      steps.push({ type, from, zone: $('#runZone')?.value || 'ataque' });
    } else if (type === 'shot') {
      const shooter = $('#shotPlayer')?.value || from;
      if (!shooter) { setStatus('Selecione o finalizador.', 'error'); return; }
      steps.push({ type, from: shooter, target: $('#shotTarget')?.value || 'centro', keeperTarget: $('#keeperDirection')?.value || 'centro' });
    } else {
      if (!goalkeeper('enemy')) { setStatus('Adicione um goleiro ou adversário antes da defesa.', 'error'); return; }
      steps.push({ type: 'keeper', target: $('#keeperDirection')?.value || 'centro' });
    }
    save();
    renderSteps();
    setStatus('Ação adicionada à linha do tempo.', 'success');
  }

  function parseScript(text = '') {
    const statements = String(text || '').split(/\n|\.|;|\bdepois\b|\bem seguida\b|\bent[aã]o\b/gi).map((item) => item.trim()).filter(Boolean);
    const parsed = [];
    const names = players().map((item) => item.name).sort((a, b) => b.length - a.length);
    for (const sentence of statements) {
      const plain = normalize(sentence);
      const mentioned = names.filter((name) => plain.includes(normalize(name)));
      const role = sentence.match(/\b(goleiro|fixo|ala(?: defensivo| ofensivo)?|meio|piv[oô]|atacante|defensor)\b/i)?.[1] || '';
      const actor = mentioned[0] || role;
      if (/passe|passa|toca|lanca/.test(plain)) {
        const to = mentioned[1] || sentence.match(/(?:para|pro|pra)\s+(?:o\s+|a\s+)?([\p{L}\d _-]{2,28})/iu)?.[1]?.trim() || '';
        if (actor && to) parsed.push({ type: 'pass', from: actor, to, height: /alto|aereo|por cima/.test(plain) ? 'high' : 'ground' });
      } else if (/chuta|chute|finaliza/.test(plain)) {
        const vertical = /alto/.test(plain) ? 'alto' : /baixo/.test(plain) ? 'baixo' : 'meio';
        const side = /esquer/.test(plain) ? 'esquerdo' : /direit/.test(plain) ? 'direito' : 'centro';
        if (actor) parsed.push({ type: 'shot', from: actor, target: `${vertical} ${side}`.replace('meio centro', 'centro') });
      } else if (/defende|mergulha|pula/.test(plain)) {
        parsed.push({ type: 'keeper', target: /esquer/.test(plain) ? 'meio esquerdo' : /direit/.test(plain) ? 'meio direito' : 'centro' });
      } else if (/sai|avanca|corre|move|desloca|vai/.test(plain) && actor) {
        parsed.push({ type: 'run', from: actor, zone: /direit/.test(plain) ? 'direita' : /esquer/.test(plain) ? 'esquerda' : /meio|centro/.test(plain) ? 'centro' : 'ataque' });
      }
    }
    return parsed;
  }

  function zoneCoordinates(zone = '', current = { x: 50, y: 50 }) {
    const key = normalize(zone);
    if (/direit/.test(key)) return { x: Math.min(90, current.x + 16), y: 70 };
    if (/esquer/.test(key)) return { x: Math.min(90, current.x + 16), y: 30 };
    if (/centro|meio/.test(key)) return { x: Math.max(50, current.x + 10), y: 50 };
    return { x: Math.min(90, current.x + 22), y: current.y };
  }

  function targetCoordinates(target = 'centro') {
    const key = normalize(target);
    return { x: 97, y: /alto|esquer/.test(key) ? 40 : /baixo|direit/.test(key) ? 60 : 50 };
  }

  async function executeStep(step) {
    if (step.type === 'run') {
      const actor = findPlayer(step.from, 'ally');
      if (!actor) throw new Error(`Jogador não encontrado: ${step.from}`);
      const target = zoneCoordinates(step.zone, positionOf(actor.node));
      await moveNode(actor.node, target.x, target.y, 700);
      return;
    }
    if (step.type === 'pass') {
      const from = findPlayer(step.from, 'ally');
      const to = findPlayer(step.to, 'ally');
      const ballToken = ball();
      if (!from || !to || !ballToken) throw new Error('O passe exige passador, receptor e bola no campo.');
      const start = positionOf(from.node);
      const end = positionOf(to.node);
      await moveNode(ballToken.node, start.x, start.y, 180);
      if (step.height === 'high') ballToken.node.style.transform = 'translate(-50%,-50%) scale(1.4) translateY(-16px)';
      await moveNode(ballToken.node, end.x, end.y, step.height === 'high' ? 800 : 560);
      ballToken.node.style.transform = '';
      return;
    }
    if (step.type === 'keeper') {
      const keeper = goalkeeper('enemy');
      if (!keeper) throw new Error('Goleiro adversário não encontrado.');
      const target = targetCoordinates(step.target);
      await moveNode(keeper.node, 92, target.y, 520);
      return;
    }
    if (step.type === 'shot') {
      const shooter = findPlayer(step.from, 'ally');
      const ballToken = ball();
      if (!shooter || !ballToken) throw new Error('A finalização exige jogador e bola no campo.');
      const start = positionOf(shooter.node);
      const target = targetCoordinates(step.target);
      await moveNode(ballToken.node, start.x, start.y, 180);
      const keeper = goalkeeper('enemy');
      if (keeper) moveNode(keeper.node, 92, targetCoordinates(step.keeperTarget || 'centro').y, 500);
      await moveNode(ballToken.node, target.x, target.y, 680);
      const savedTarget = normalize(step.target);
      const savedKeeper = normalize(step.keeperTarget || 'centro');
      const defended = keeper && savedTarget === savedKeeper;
      if ($('#simulationResult')) $('#simulationResult').textContent = defended ? 'DEFESA' : 'GOL';
      setStatus(defended ? 'O goleiro defendeu a finalização.' : 'Gol na simulação.', defended ? '' : 'success');
    }
  }

  async function execute() {
    if (running) return;
    if (!steps.length) { setStatus('Adicione pelo menos uma ação antes de executar.', 'error'); return; }
    running = true;
    const button = $('#executeTacticalSequence');
    if (button) button.disabled = true;
    const original = new Map(tokenNodes().map((node) => [node.dataset.id, positionOf(node)]));
    if ($('#simulationResult')) $('#simulationResult').textContent = 'EM JOGO';
    setStatus('Executando a sequência tática...');
    try {
      for (let index = 0; index < steps.length; index += 1) {
        const progress = $('#tacticalTimeline span');
        if (progress) progress.style.width = `${Math.round(((index + 1) / steps.length) * 100)}%`;
        await executeStep(steps[index]);
        await sleep(220);
      }
      setStatus('Sequência executada com sucesso.', 'success');
    } catch (error) {
      setStatus(error.message || 'Não foi possível executar a jogada.', 'error');
    } finally {
      if ($('#restoreAfterSimulation')?.checked) {
        await sleep(350);
        await Promise.all(tokenNodes().map((node) => {
          const saved = original.get(node.dataset.id);
          return saved ? moveNode(node, saved.x, saved.y, 260) : Promise.resolve();
        }));
      }
      running = false;
      if (button) button.disabled = false;
    }
  }

  function injectFieldDetails(board) {
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
  }

  function injectLab() {
    const layout = $('.hnl-board-layout');
    const board = $('#tacticBoard');
    if (!layout || !board || $('#advancedTacticalLab')) return;
    injectFieldDetails(board);
    const section = document.createElement('section');
    section.className = 'hnl-tactical-lab';
    section.id = 'advancedTacticalLab';
    section.innerHTML = `<div class="hnl-tactical-lab-grid"><article class="hnl-card"><span class="hnl-section-kicker">Sequência manual</span><h2>Construtor de jogada</h2><p>Escolha jogadores reais da formação e monte a jogada passo a passo.</p><div class="hnl-tactical-builder"><label>Tipo de ação<select class="hnl-select" id="actionType"><option value="pass">Passe</option><option value="run">Deslocamento</option><option value="shot">Finalização</option><option value="keeper">Defesa do goleiro</option></select></label><label data-action-field="pass run">Jogador da ação<select class="hnl-select" id="actionFrom"></select></label><label data-action-field="pass">Destino do passe<select class="hnl-select" id="actionTo"></select></label><label data-action-field="pass">Tipo do passe<select class="hnl-select" id="passHeight"><option value="ground">Rasteiro</option><option value="high">Alto / aéreo</option></select></label><label data-action-field="run">Zona do deslocamento<select class="hnl-select" id="runZone"><option value="centro">Meio / centro</option><option value="direita">Ala direita</option><option value="esquerda">Ala esquerda</option><option value="ataque">Avançar ao ataque</option></select></label><label data-action-field="shot">Finalizador<select class="hnl-select" id="shotPlayer"></select></label><label data-action-field="shot">Alvo do chute<select class="hnl-select" id="shotTarget"><option>alto esquerdo</option><option>alto centro</option><option>alto direito</option><option>meio esquerdo</option><option selected>centro</option><option>meio direito</option><option>baixo esquerdo</option><option>baixo centro</option><option>baixo direito</option></select></label><label data-action-field="shot keeper">Lado do goleiro<select class="hnl-select" id="keeperDirection"><option>alto esquerdo</option><option>alto centro</option><option>alto direito</option><option>meio esquerdo</option><option selected>centro</option><option>meio direito</option><option>baixo esquerdo</option><option>baixo centro</option><option>baixo direito</option></select><small id="keeperPlayerInfo"></small></label><div class="hnl-actions full"><button class="hnl-btn primary" id="addTacticalStep" type="button">Adicionar ação</button><button class="hnl-btn" id="refreshTacticalPlayers" type="button">Atualizar jogadores</button></div></div></article><article class="hnl-card"><span class="hnl-section-kicker">Roteiro em português</span><h2>Descreva a jogada</h2><p>Use o nome ou a posição: deslocamento, passe, passe alto, chute e defesa do goleiro.</p><textarea class="hnl-textarea hnl-tactical-script" id="tacticalScript" placeholder="Goleiro passa para o defensor. Defensor avança pelo meio. Atacante finaliza no baixo direito."></textarea><div class="hnl-tactical-presets"><button class="hnl-btn" type="button" data-script-preset="Goleiro sai pelo meio. Goleiro passa para o Fixo. Fixo passa alto para o Atacante. Atacante finaliza no alto direito.">Saída com goleiro</button><button class="hnl-btn" type="button" data-script-preset="Ala se desloca pela direita. Fixo passa para o Ala. Ala passa para o Atacante. Atacante finaliza no baixo esquerdo.">Triangulação pela ala</button><button class="hnl-btn" type="button" data-script-preset="Meio avança pelo centro. Goleiro passa para o Meio. Meio passa alto para o Atacante. Atacante finaliza no centro.">Passe alto no pivô</button></div><div class="hnl-actions" style="margin-top:12px"><button class="hnl-btn primary" id="parseTacticalScript" type="button">Interpretar e adicionar</button><button class="hnl-btn danger" id="clearTacticalSequence" type="button">Limpar sequência</button></div></article></div><article class="hnl-card"><div class="hnl-console-head"><div><span class="hnl-section-kicker">Simulação</span><h2>Linha do tempo da jogada</h2><p>Reordene, execute a animação e decida se o campo volta à posição inicial.</p></div><div class="hnl-actions"><label class="hnl-check"><input id="restoreAfterSimulation" type="checkbox" checked><span>Restaurar posições</span></label><button class="hnl-btn accent" id="executeTacticalSequence" type="button">▶ Executar jogada</button><button class="hnl-btn primary" id="saveTacticalSequence" type="button">Salvar roteiro</button></div></div><div class="hnl-tactical-timeline" id="tacticalTimeline"><span></span></div><div class="hnl-simulation-score" style="margin:12px 0"><div><strong id="simulationResult">PRONTO</strong><span>Resultado</span></div><div><strong id="simulationStepCount">0</strong><span>Ações</span></div><div><strong>9</strong><span>Zonas de finalização</span></div><div><strong>5v5</strong><span>Formato da prancheta</span></div></div><div id="advancedTacticStatus"></div><div class="hnl-tactical-sequence" id="tacticalSequence"></div></article>`;
    layout.insertAdjacentElement('afterend', section);

    refreshSelectors();
    updateBuilderFields();
    renderSteps();
    $('#actionType')?.addEventListener('change', updateBuilderFields);
    $('#addTacticalStep')?.addEventListener('click', addStructuredStep);
    $('#refreshTacticalPlayers')?.addEventListener('click', () => { refreshSelectors(); setStatus('Lista de jogadores atualizada.', 'success'); });
    $('#parseTacticalScript')?.addEventListener('click', () => {
      const parsed = parseScript($('#tacticalScript')?.value || '');
      if (!parsed.length) { setStatus('Não identifiquei ações. Use frases curtas com jogador, passe, movimento ou chute.', 'error'); return; }
      steps.push(...parsed);
      save();
      renderSteps();
      setStatus(`${parsed.length} ação(ões) interpretada(s).`, 'success');
    });
    $('#clearTacticalSequence')?.addEventListener('click', () => { steps = []; save(); renderSteps(); if ($('#simulationResult')) $('#simulationResult').textContent = 'PRONTO'; });
    $('#executeTacticalSequence')?.addEventListener('click', execute);
    $('#saveTacticalSequence')?.addEventListener('click', () => { save(); setStatus('Roteiro salvo neste navegador.', 'success'); });
    $$('[data-script-preset]').forEach((button) => button.addEventListener('click', () => { if ($('#tacticalScript')) $('#tacticalScript').value = button.dataset.scriptPreset || ''; }));
    new MutationObserver(scheduleRefresh).observe(board, { childList: true, subtree: true });
  }

  async function boot() {
    if (!document.body?.dataset || (document.body.dataset.hnlModule !== 'tactics' && document.body.dataset.frmModule !== 'tactics')) return;
    load();
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if ($('#tacticBoard') && tokenNodes().length) break;
      await sleep(50);
    }
    injectLab();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}());
