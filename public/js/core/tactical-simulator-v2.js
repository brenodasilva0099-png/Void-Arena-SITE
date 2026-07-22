(function () {
  'use strict';

  const STORAGE_KEY = 'hnl:tactical-simulator:v3';
  const KEEPER_SETTINGS_KEY = 'hnl:tactical-keeper:v1';
  const $ = (selector, root = document) => root?.querySelector?.(selector) || null;
  const $$ = (selector, root = document) => root?.querySelectorAll ? Array.from(root.querySelectorAll(selector)) : [];
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  let steps = [];
  let running = false;
  let refreshQueued = false;
  let keeperSettings = {
    mode: 'automatic',
    intelligence: 'adaptive',
    coverage: 'auto',
    manualTarget: 'centro',
    testTarget: 'baixo direito'
  };

  const GOAL_ZONES = [
    'alto esquerdo', 'alto centro', 'alto direito',
    'meio esquerdo', 'centro', 'meio direito',
    'baixo esquerdo', 'baixo centro', 'baixo direito'
  ];
  const KEEPER_CHANCES = { low: 0.28, medium: 0.52, high: 0.76 };

  const ROLE_GROUPS = [
    { id: 'keeper', aliases: ['goleiro', 'gol', 'gk'] },
    { id: 'defender', aliases: ['fixo', 'defensor', 'zagueiro', 'beque', 'def'] },
    { id: 'wing', aliases: ['ala defensivo', 'ala ofensivo', 'ala direito', 'ala esquerdo', 'lateral', 'ala'] },
    { id: 'midfielder', aliases: ['meio campo', 'meio', 'meia', 'armador', 'mei'] },
    { id: 'attacker', aliases: ['centroavante', 'pivo', 'atacante', 'ata'] }
  ];

  const ACTION_HELP = {
    pass: 'Passe move a bola entre dois aliados. Se você deixar alguém em branco, a prancheta escolhe uma opção válida e avisa o ajuste.',
    run: 'Deslocamento move um jogador sem alterar a posse da bola.',
    shot: 'Finalização leva a bola até uma das nove zonas. A reação usa o modo, a inteligência e o lado configurados no painel do goleiro.',
    keeper: 'Movimento isolado do goleiro para ensaiar posicionamento. Nas finalizações, a defesa inteligente reage automaticamente.'
  };

  function normalize(value = '') {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
  }

  function canonicalTarget(value = 'centro') {
    const key = normalize(value).replace('meio centro', 'centro');
    return GOAL_ZONES.find((zone) => normalize(zone) === key) || 'centro';
  }

  function sanitizeKeeperSettings(value = {}) {
    return {
      mode: ['automatic', 'manual'].includes(value.mode) ? value.mode : 'automatic',
      intelligence: ['low', 'medium', 'high', 'adaptive'].includes(value.intelligence) ? value.intelligence : 'adaptive',
      coverage: ['auto', 'left', 'center', 'right'].includes(value.coverage) ? value.coverage : 'auto',
      manualTarget: canonicalTarget(value.manualTarget),
      testTarget: canonicalTarget(value.testTarget || 'baixo direito')
    };
  }

  function saveKeeperSettings() {
    localStorage.setItem(KEEPER_SETTINGS_KEY, JSON.stringify({ ...keeperSettings, updatedAt: new Date().toISOString() }));
  }

  function roleGroup(value = '') {
    const key = normalize(value);
    if (!key) return '';
    return ROLE_GROUPS.find((group) => group.aliases.some((alias) => key === alias || key.includes(alias)))?.id || '';
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

  function findPlayer(reference = '', preferredTeam = '', excluded = []) {
    const key = normalize(reference);
    const blocked = new Set((Array.isArray(excluded) ? excluded : [excluded]).map((item) => normalize(item?.id || item?.name || item)).filter(Boolean));
    const list = players().filter((item) => (!preferredTeam || item.team === preferredTeam) && !blocked.has(normalize(item.id)) && !blocked.has(normalize(item.name)));
    if (!key) return preferredTeam ? list.find((item) => item.team === preferredTeam) || null : list[0] || null;
    const group = roleGroup(key);
    return list.find((item) => normalize(item.name) === key)
      || list.find((item) => normalize(item.name).includes(key) || key.includes(normalize(item.name)))
      || list.find((item) => normalize(item.role) === key)
      || list.find((item) => normalize(item.role).includes(key) || key.includes(normalize(item.role)))
      || (group ? list.find((item) => roleGroup(`${item.name} ${item.role}`) === group) : null)
      || null;
  }

  function goalkeeper(team = 'enemy') {
    const list = players(team);
    const explicit = list.find((item) => roleGroup(`${item.name} ${item.role}`) === 'keeper');
    if (explicit) return explicit;
    return list.sort((a, b) => team === 'enemy'
      ? positionOf(b.node).x - positionOf(a.node).x
      : positionOf(a.node).x - positionOf(b.node).x)[0] || null;
  }

  function sortedAllies() {
    return players('ally').sort((a, b) => positionOf(a.node).x - positionOf(b.node).x || positionOf(a.node).y - positionOf(b.node).y);
  }

  function passReceiver(from, reference = '') {
    const exact = findPlayer(reference, 'ally', from ? [from] : []);
    if (exact) return exact;
    const origin = from ? positionOf(from.node) : { x: 0, y: 50 };
    return players('ally')
      .filter((item) => !from || item.id !== from.id)
      .sort((a, b) => {
        const aPos = positionOf(a.node);
        const bPos = positionOf(b.node);
        const aScore = (aPos.x >= origin.x ? 0 : 80) + Math.abs(aPos.x - origin.x) + Math.abs(aPos.y - origin.y) * 0.35;
        const bScore = (bPos.x >= origin.x ? 0 : 80) + Math.abs(bPos.x - origin.x) + Math.abs(bPos.y - origin.y) * 0.35;
        return aScore - bScore;
      })[0] || null;
  }

  function bestShooter(reference = '') {
    return findPlayer(reference, 'ally') || players('ally').sort((a, b) => positionOf(b.node).x - positionOf(a.node).x)[0] || null;
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
    try {
      keeperSettings = sanitizeKeeperSettings(JSON.parse(localStorage.getItem(KEEPER_SETTINGS_KEY) || '{}'));
    } catch { keeperSettings = sanitizeKeeperSettings(); }
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
    const help = $('#actionHelpText');
    if (help) help.textContent = ACTION_HELP[type] || '';
  }

  function repairStep(rawStep = {}, index = 0) {
    const type = ['pass', 'run', 'shot', 'keeper'].includes(rawStep.type) ? rawStep.type : 'run';
    const notes = [];
    const label = `Ação ${index + 1}`;

    if (type === 'pass') {
      const from = findPlayer(rawStep.from, 'ally') || sortedAllies()[0] || null;
      if (!from) return { error: `${label}: adicione pelo menos um jogador aliado.` };
      const to = passReceiver(from, rawStep.to);
      if (!to) return { error: `${label}: um passe precisa de dois aliados diferentes no campo.` };
      if (!rawStep.from || normalize(rawStep.from) !== normalize(from.name)) notes.push(`${label}: passador ajustado para ${from.name}`);
      if (!rawStep.to || normalize(rawStep.to) !== normalize(to.name)) notes.push(`${label}: receptor ajustado para ${to.name}`);
      return { step: { type, from: from.name, to: to.name, height: rawStep.height === 'high' ? 'high' : 'ground' }, notes };
    }

    if (type === 'run') {
      const from = findPlayer(rawStep.from, 'ally') || sortedAllies()[0] || null;
      if (!from) return { error: `${label}: adicione um aliado para fazer o deslocamento.` };
      if (!rawStep.from || normalize(rawStep.from) !== normalize(from.name)) notes.push(`${label}: jogador ajustado para ${from.name}`);
      return { step: { type, from: from.name, zone: rawStep.zone || 'ataque' }, notes };
    }

    if (type === 'shot') {
      const shooter = bestShooter(rawStep.from);
      if (!shooter) return { error: `${label}: adicione um aliado para finalizar.` };
      if (!rawStep.from || normalize(rawStep.from) !== normalize(shooter.name)) notes.push(`${label}: finalizador ajustado para ${shooter.name}`);
      return { step: { type, from: shooter.name, target: canonicalTarget(rawStep.target) }, notes };
    }

    const keeper = goalkeeper('enemy');
    if (!keeper) return { error: `${label}: adicione pelo menos um adversário para representar o goleiro.` };
    if (roleGroup(`${keeper.name} ${keeper.role}`) !== 'keeper') notes.push(`${label}: ${keeper.name} será usado como goleiro adversário`);
    return { step: { type: 'keeper', target: rawStep.target || 'centro' }, notes };
  }

  function prepareSequence(rawSteps = []) {
    const prepared = [];
    const notes = [];
    const errors = [];
    rawSteps.forEach((rawStep, index) => {
      const result = repairStep(rawStep, index);
      if (result.step) prepared.push(result.step);
      if (result.notes?.length) notes.push(...result.notes);
      if (result.error) errors.push(result.error);
    });
    return { steps: prepared, notes, errors };
  }

  function addStructuredStep() {
    const type = $('#actionType')?.value || 'pass';
    const from = $('#actionFrom')?.value || '';
    let rawStep;
    if (type === 'pass') {
      rawStep = { type, from, to: $('#actionTo')?.value || '', height: $('#passHeight')?.value || 'ground' };
    } else if (type === 'run') {
      rawStep = { type, from, zone: $('#runZone')?.value || 'ataque' };
    } else if (type === 'shot') {
      rawStep = { type, from: $('#shotPlayer')?.value || from, target: $('#shotTarget')?.value || 'centro' };
    } else {
      rawStep = { type: 'keeper', target: $('#keeperDirection')?.value || 'centro' };
    }
    const prepared = prepareSequence([rawStep]);
    if (!prepared.steps.length) { setStatus(prepared.errors[0] || 'Não foi possível montar essa ação.', 'error'); return; }
    steps.push(...prepared.steps);
    save();
    renderSteps();
    setStatus(prepared.notes.length ? `Ação adicionada. ${prepared.notes.join('; ')}.` : 'Ação adicionada à linha do tempo.', 'success');
  }

  function referencesInText(text = '', preferredTeam = 'ally') {
    const plain = normalize(text);
    const found = [];
    players(preferredTeam).forEach((item) => {
      const key = normalize(item.name);
      const index = key ? plain.indexOf(key) : -1;
      if (index >= 0) found.push({ index, value: item.name });
    });
    const rolePattern = /\b(goleiro|gol|gk|fixo|defensor|zagueiro|beque|ala(?:\s+(?:direito|esquerdo|defensivo|ofensivo))?|lateral|meio(?:\s+campo)?|meia|armador|piv[oô]|atacante|centroavante)\b/giu;
    for (const match of String(text || '').matchAll(rolePattern)) found.push({ index: match.index || 0, value: match[0] });
    const seen = new Set();
    return found.sort((a, b) => a.index - b.index).map((item) => item.value).filter((value) => {
      const key = normalize(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function splitScript(text = '') {
    return String(text || '')
      .replace(/\s+e\s+(?=(?:(?:o|a)\s+)?(?:(?:goleiro|fixo|defensor|zagueiro|beque|ala|lateral|meio|meia|armador|piv[oô]|atacante|centroavante)\s+)?(?:faz(?:\s+um)?\s+passe|passa|toca|lan[cç]a|sai|avan[cç]a|corre|se\s+desloca|desloca|vai|chuta|finaliza|defende|mergulha|pula)\b)/giu, '. ')
      .split(/\n|\.|;|,|\bdepois\b|\bem seguida\b|\bent[aã]o\b/gi)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function parseScript(text = '') {
    const statements = splitScript(text);
    const parsed = [];
    let ignored = 0;
    let activeActor = '';
    for (const sentence of statements) {
      const plain = normalize(sentence);
      const actionIndex = plain.search(/faz(?:\s+um)?\s+passe|passa|toca|lanca|sai|avanca|corre|desloca|vai|chuta|finaliza|defende|mergulha|pula/);
      const beforeAction = actionIndex > 0 ? sentence.slice(0, actionIndex) : '';
      const sentenceRefs = referencesInText(sentence, 'ally');
      const actor = referencesInText(beforeAction, 'ally')[0] || activeActor || sentenceRefs[0];
      if (/passe|passa|toca|lanca/.test(plain)) {
        const targetText = sentence.match(/(?:para|pro|pra|ao)\s+(?:o\s+|a\s+)?(.+)$/iu)?.[1] || '';
        const targetRefs = referencesInText(targetText, 'ally');
        const to = targetRefs[0] || sentenceRefs.find((reference) => normalize(reference) !== normalize(actor)) || '';
        parsed.push({ type: 'pass', from: actor, to, height: /alto|aereo|por cima/.test(plain) ? 'high' : 'ground' });
        activeActor = to || actor;
      } else if (/chuta|chute|finaliza/.test(plain)) {
        const vertical = /alto/.test(plain) ? 'alto' : /baixo/.test(plain) ? 'baixo' : 'meio';
        const side = /esquer/.test(plain) ? 'esquerdo' : /direit/.test(plain) ? 'direito' : 'centro';
        parsed.push({ type: 'shot', from: actor, target: `${vertical} ${side}`.replace('meio centro', 'centro') });
        activeActor = actor;
      } else if (/defende|mergulha|pula/.test(plain)) {
        parsed.push({ type: 'keeper', target: /esquer/.test(plain) ? 'meio esquerdo' : /direit/.test(plain) ? 'meio direito' : 'centro' });
      } else if (/sai|avanca|corre|move|desloca|vai/.test(plain)) {
        parsed.push({ type: 'run', from: actor, zone: /direit/.test(plain) ? 'direita' : /esquer/.test(plain) ? 'esquerda' : /meio|centro/.test(plain) ? 'centro' : 'ataque' });
        activeActor = actor;
      } else {
        ignored += 1;
      }
    }
    return { steps: parsed, ignored };
  }

  function zoneCoordinates(zone = '', current = { x: 50, y: 50 }) {
    const key = normalize(zone);
    if (/direit/.test(key)) return { x: Math.min(90, current.x + 16), y: 70 };
    if (/esquer/.test(key)) return { x: Math.min(90, current.x + 16), y: 30 };
    if (/centro|meio/.test(key)) return { x: Math.max(50, current.x + 10), y: 50 };
    return { x: Math.min(90, current.x + 22), y: current.y };
  }

  function targetCoordinates(target = 'centro') {
    const key = normalize(canonicalTarget(target));
    return {
      x: /alto/.test(key) ? 98 : /baixo/.test(key) ? 96 : 97,
      y: /esquer/.test(key) ? 40 : /direit/.test(key) ? 60 : 50
    };
  }

  function targetSide(target = 'centro') {
    const key = normalize(canonicalTarget(target));
    if (/esquer/.test(key)) return 'left';
    if (/direit/.test(key)) return 'right';
    return 'center';
  }

  function targetHeight(target = 'centro') {
    const key = normalize(canonicalTarget(target));
    if (/alto/.test(key)) return 'high';
    if (/baixo/.test(key)) return 'low';
    return 'middle';
  }

  function buildTarget(height = 'middle', side = 'center') {
    const heightLabel = { high: 'alto', middle: 'meio', low: 'baixo' }[height] || 'meio';
    const sideLabel = { left: 'esquerdo', center: 'centro', right: 'direito' }[side] || 'centro';
    return canonicalTarget(height === 'middle' && side === 'center' ? 'centro' : `${heightLabel} ${sideLabel}`);
  }

  function intelligenceLabel(value = keeperSettings.intelligence) {
    return { low: 'Baixa', medium: 'Média', high: 'Alta', adaptive: 'Adaptativa' }[value] || 'Adaptativa';
  }

  function keeperChance(level = keeperSettings.intelligence, shooter = null, actionCount = steps.length) {
    if (KEEPER_CHANCES[level]) return KEEPER_CHANCES[level];
    const shooterX = typeof shooter === 'number' ? shooter : positionOf(shooter?.node).x;
    const distanceFromGoal = Math.max(0, 92 - shooterX);
    const distanceAdjustment = Math.max(-0.1, Math.min(0.12, (distanceFromGoal - 25) * 0.006));
    const buildupAdjustment = Math.min(0.08, Math.max(0, actionCount - 1) * 0.015);
    return Math.max(0.38, Math.min(0.82, 0.58 + distanceAdjustment + buildupAdjustment));
  }

  function planKeeperDefense(shotTarget = 'centro', shooter = null, randomValue = Math.random(), settings = keeperSettings) {
    const config = sanitizeKeeperSettings(settings);
    const target = canonicalTarget(shotTarget);
    if (config.mode === 'manual') {
      const keeperTarget = canonicalTarget(config.manualTarget);
      return {
        mode: 'manual',
        intelligence: config.intelligence,
        coverage: targetSide(keeperTarget),
        chance: null,
        readSuccessful: keeperTarget === target,
        shotTarget: target,
        keeperTarget
      };
    }

    const chance = keeperChance(config.intelligence, shooter);
    const readSuccessful = Number(randomValue) <= chance;
    let keeperTarget;
    if (config.coverage === 'auto') {
      if (readSuccessful) {
        keeperTarget = target;
      } else {
        const alternatives = GOAL_ZONES.filter((zone) => zone !== target);
        keeperTarget = alternatives[Math.floor(((Number(randomValue) * 7.13) % 1) * alternatives.length)] || 'centro';
      }
    } else {
      const shotHeight = targetHeight(target);
      const heights = ['high', 'middle', 'low'];
      const alternativeHeights = heights.filter((height) => height !== shotHeight);
      const chosenHeight = readSuccessful
        ? shotHeight
        : alternativeHeights[Math.floor(((Number(randomValue) * 5.31) % 1) * alternativeHeights.length)] || 'middle';
      keeperTarget = buildTarget(chosenHeight, config.coverage);
    }

    return {
      mode: 'automatic',
      intelligence: config.intelligence,
      coverage: config.coverage,
      chance,
      readSuccessful,
      shotTarget: target,
      keeperTarget: canonicalTarget(keeperTarget)
    };
  }

  function keeperStrategyText() {
    if (keeperSettings.mode === 'manual') return `Manual: mergulho no ${keeperSettings.manualTarget}.`;
    const side = { auto: 'lê o lado do chute', left: 'prioriza o lado esquerdo', center: 'protege o centro', right: 'prioriza o lado direito' }[keeperSettings.coverage];
    return `IA ${intelligenceLabel().toLocaleLowerCase('pt-BR')}: ${side}.`;
  }

  function syncKeeperPanel() {
    const mode = $('#keeperControlMode');
    const intelligence = $('#keeperIntelligence');
    const coverage = $('#keeperCoverage');
    const manualTarget = $('#keeperManualTarget');
    const testTarget = $('#keeperTestTarget');
    if (mode) mode.value = keeperSettings.mode;
    if (intelligence) intelligence.value = keeperSettings.intelligence;
    if (coverage) coverage.value = keeperSettings.coverage;
    if (manualTarget) manualTarget.value = keeperSettings.manualTarget;
    if (testTarget) testTarget.value = keeperSettings.testTarget;
    const manual = keeperSettings.mode === 'manual';
    if ($('#keeperManualField')) $('#keeperManualField').hidden = !manual;
    if (intelligence) intelligence.disabled = manual;
    if (coverage) coverage.disabled = manual;
    const chance = keeperChance(keeperSettings.intelligence, bestShooter());
    if ($('#keeperReadingChance')) $('#keeperReadingChance').textContent = manual ? 'Manual' : `${Math.round(chance * 100)}%`;
    if ($('#keeperCurrentStrategy')) $('#keeperCurrentStrategy').textContent = keeperStrategyText();
  }

  function readKeeperSettingsFromUi() {
    keeperSettings = sanitizeKeeperSettings({
      mode: $('#keeperControlMode')?.value,
      intelligence: $('#keeperIntelligence')?.value,
      coverage: $('#keeperCoverage')?.value,
      manualTarget: $('#keeperManualTarget')?.value,
      testTarget: $('#keeperTestTarget')?.value
    });
    saveKeeperSettings();
    syncKeeperPanel();
    setStatus('Configuração do goleiro salva para as próximas finalizações.', 'success');
  }

  function renderKeeperDecision(decision, defended) {
    if (!decision) return;
    const chance = decision.chance == null ? 'comando manual' : `${Math.round(decision.chance * 100)}% de leitura`;
    const mode = decision.mode === 'manual' ? 'Manual' : `IA ${intelligenceLabel(decision.intelligence)}`;
    const decisionBox = $('#keeperLastDecision');
    if (decisionBox) decisionBox.innerHTML = `<strong>${esc(mode)}: ${esc(decision.keeperTarget)}</strong><span>Chute no ${esc(decision.shotTarget)} · ${esc(chance)}</span>`;
    const result = $('#keeperLastResult');
    if (result) result.textContent = defended ? 'DEFESA' : 'GOL';
    const resultCard = $('#keeperResultCard');
    if (resultCard) {
      resultCard.classList.toggle('success', Boolean(defended));
      resultCard.classList.toggle('danger', !defended);
    }
  }

  function highlightGoalZones(shotTarget = '', keeperTarget = '', defended = false) {
    const target = $('.hnl-goal-target');
    if (!target) return;
    $$('span', target).forEach((cell) => cell.classList.remove('shot-active', 'keeper-active', 'defended'));
    const shotCell = shotTarget ? $$('span', target).find((cell) => cell.dataset.goalZone === canonicalTarget(shotTarget)) : null;
    const keeperCell = keeperTarget ? $$('span', target).find((cell) => cell.dataset.goalZone === canonicalTarget(keeperTarget)) : null;
    shotCell?.classList.add('shot-active');
    keeperCell?.classList.add('keeper-active');
    if (defended && shotCell) shotCell.classList.add('defended');
  }

  function ensureBallOnField() {
    let current = ball();
    if (current) return current;
    $('#addBall')?.click();
    current = ball();
    return current;
  }

  function playbackHud() {
    const board = $('#tacticBoard');
    if (!board) return null;
    let hud = $('#tacticalPlaybackHud', board);
    if (!hud) {
      hud = document.createElement('div');
      hud.className = 'hnl-playback-hud';
      hud.id = 'tacticalPlaybackHud';
      hud.setAttribute('role', 'status');
      hud.setAttribute('aria-live', 'assertive');
      hud.hidden = true;
      board.appendChild(hud);
    }
    return hud;
  }

  function updatePlaybackHud(message, type = '') {
    const hud = playbackHud();
    if (!hud) return;
    hud.hidden = false;
    hud.className = `hnl-playback-hud${type ? ` ${type}` : ''}`;
    hud.textContent = message;
  }

  async function focusBoardForPlayback() {
    const board = $('#tacticBoard');
    if (!board) return;
    const reduced = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
    board.classList.add('is-playback-focus');
    const shouldFocus = $('#focusBoardBeforeSimulation')?.checked !== false;
    if (shouldFocus) {
      board.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center', inline: 'nearest' });
      await sleep(reduced ? 80 : 620);
      for (const number of reduced ? [1] : [3, 2, 1]) {
        updatePlaybackHud(`A jogada começa em ${number}`);
        await sleep(reduced ? 120 : 480);
      }
    }
    updatePlaybackHud('▶ Jogada em andamento');
  }

  function finishPlayback(message, type = 'success') {
    const board = $('#tacticBoard');
    updatePlaybackHud(message, type);
    window.setTimeout(() => {
      const hud = $('#tacticalPlaybackHud');
      if (hud) hud.hidden = true;
      board?.classList.remove('is-playback-focus');
    }, 1800);
  }

  async function executeStep(step) {
    if (step.type === 'run') {
      const actor = findPlayer(step.from, 'ally') || sortedAllies()[0] || null;
      if (!actor) throw new Error('Adicione um jogador aliado antes de executar o deslocamento.');
      const target = zoneCoordinates(step.zone, positionOf(actor.node));
      await moveNode(actor.node, target.x, target.y, 700);
      return;
    }
    if (step.type === 'pass') {
      const from = findPlayer(step.from, 'ally') || sortedAllies()[0] || null;
      const to = passReceiver(from, step.to);
      const ballToken = ensureBallOnField();
      if (!from || !to) throw new Error('Adicione dois aliados diferentes para executar o passe.');
      if (!ballToken) throw new Error('Não foi possível posicionar a bola no campo.');
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
      if (!keeper) throw new Error('Adicione um adversário para representar o goleiro.');
      const target = targetCoordinates(step.target);
      await moveNode(keeper.node, 92, target.y, 520);
      return;
    }
    if (step.type === 'shot') {
      const shooter = bestShooter(step.from);
      const ballToken = ensureBallOnField();
      if (!shooter) throw new Error('Adicione um aliado para executar a finalização.');
      if (!ballToken) throw new Error('Não foi possível posicionar a bola no campo.');
      const start = positionOf(shooter.node);
      const shotTarget = canonicalTarget(step.target);
      const target = targetCoordinates(shotTarget);
      await moveNode(ballToken.node, start.x, start.y, 180);
      const keeper = goalkeeper('enemy');
      const decision = keeper ? planKeeperDefense(shotTarget, shooter) : null;
      let keeperMove = Promise.resolve();
      if (keeper && decision) {
        keeper.node.classList.add('is-goalkeeper-dive');
        keeperMove = moveNode(keeper.node, 92, targetCoordinates(decision.keeperTarget).y, 500);
      }
      await moveNode(ballToken.node, target.x, target.y, 680);
      await keeperMove;
      keeper?.node?.classList.remove('is-goalkeeper-dive');
      const defended = Boolean(keeper && decision && decision.shotTarget === decision.keeperTarget);
      highlightGoalZones(shotTarget, decision?.keeperTarget || '', defended);
      renderKeeperDecision(decision, defended);
      if ($('#simulationResult')) $('#simulationResult').textContent = defended ? 'DEFESA' : 'GOL';
      const reaction = decision?.mode === 'manual'
        ? `comando manual no ${decision.keeperTarget}`
        : `${intelligenceLabel(decision?.intelligence)} no ${decision?.keeperTarget || 'centro'}`;
      setStatus(defended
        ? `Defesa! O goleiro reagiu com ${reaction}.`
        : `Gol. O chute foi no ${shotTarget} e o goleiro tentou ${decision?.keeperTarget || 'sem reação'}.`, defended ? 'success' : '');
      return { defended, decision, shotTarget };
    }
  }

  async function testKeeperDefense() {
    if (running) return;
    const shooter = bestShooter();
    const keeper = goalkeeper('enemy');
    const ballToken = ensureBallOnField();
    if (!shooter) { setStatus('Adicione um jogador aliado para testar a finalização.', 'error'); return; }
    if (!keeper) { setStatus('Adicione um adversário para representar o goleiro.', 'error'); return; }
    if (!ballToken) { setStatus('Não foi possível posicionar a bola para o teste.', 'error'); return; }

    keeperSettings = sanitizeKeeperSettings({ ...keeperSettings, testTarget: $('#keeperTestTarget')?.value });
    saveKeeperSettings();
    syncKeeperPanel();
    running = true;
    const button = $('#testKeeperDefense');
    const executeButton = $('#executeTacticalSequence');
    const originalText = button?.textContent || '🧤 Testar defesa';
    if (button) { button.disabled = true; button.textContent = 'Preparando teste…'; }
    if (executeButton) executeButton.disabled = true;
    const original = new Map(tokenNodes().map((node) => [node.dataset.id, positionOf(node)]));
    if ($('#simulationResult')) $('#simulationResult').textContent = 'TESTE';
    setStatus('Preparando um chute isolado para testar o goleiro.');
    try {
      await focusBoardForPlayback();
      if (button) button.textContent = 'Goleiro reagindo…';
      const outcome = await executeStep({ type: 'shot', from: shooter.name, target: keeperSettings.testTarget });
      await sleep(900);
      await Promise.all(tokenNodes().map((node) => {
        const saved = original.get(node.dataset.id);
        return saved ? moveNode(node, saved.x, saved.y, 280) : Promise.resolve();
      }));
      finishPlayback(outcome?.defended ? '🧤 Defesa concluída' : '⚽ Gol no teste', outcome?.defended ? 'success' : 'error');
    } catch (error) {
      keeper?.node?.classList.remove('is-goalkeeper-dive');
      setStatus(error.message || 'Não foi possível testar a defesa.', 'error');
      finishPlayback('Falha no teste do goleiro', 'error');
    } finally {
      running = false;
      if (button) { button.disabled = false; button.textContent = originalText; }
      if (executeButton) executeButton.disabled = false;
    }
  }

  async function execute() {
    if (running) return;
    if (!steps.length) { setStatus('Adicione pelo menos uma ação antes de executar.', 'error'); return; }
    const prepared = prepareSequence(steps);
    if (prepared.errors.length) {
      setStatus(`Revise a formação antes de executar: ${prepared.errors.join(' ')}`, 'error');
      return;
    }
    steps = prepared.steps;
    save();
    renderSteps();
    ensureBallOnField();
    running = true;
    const button = $('#executeTacticalSequence');
    const originalButtonText = button?.textContent || '▶ Executar roteiro';
    if (button) { button.disabled = true; button.textContent = 'Preparando o campo…'; }
    const original = new Map(tokenNodes().map((node) => [node.dataset.id, positionOf(node)]));
    if ($('#simulationResult')) $('#simulationResult').textContent = 'EM JOGO';
    const progress = $('#tacticalTimeline span');
    if (progress) progress.style.width = '0%';
    setStatus(prepared.notes.length ? `Formação revisada: ${prepared.notes.join('; ')}.` : 'Preparando a sequência tática...');
    let completed = false;
    try {
      await focusBoardForPlayback();
      if (button) button.textContent = 'Jogada em andamento…';
      for (let index = 0; index < steps.length; index += 1) {
        if (progress) progress.style.width = `${Math.round(((index + 1) / steps.length) * 100)}%`;
        await executeStep(steps[index]);
        await sleep(220);
      }
      completed = true;
      setStatus('Sequência executada com sucesso.', 'success');
    } catch (error) {
      setStatus(error.message || 'Não foi possível executar a jogada.', 'error');
      finishPlayback(error.message || 'Falha na jogada', 'error');
    } finally {
      if ($('#restoreAfterSimulation')?.checked) {
        await sleep(350);
        await Promise.all(tokenNodes().map((node) => {
          const saved = original.get(node.dataset.id);
          return saved ? moveNode(node, saved.x, saved.y, 260) : Promise.resolve();
        }));
      }
      running = false;
      if (completed) finishPlayback('Jogada concluída', 'success');
      if (button) { button.disabled = false; button.textContent = originalButtonText; }
    }
  }

  function injectFieldDetails(board) {
    if (!board) return;
    if (!$('.hnl-penalty-arc', board)) {
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
    if (!$('.hnl-goal-target', board)) {
      const goalTarget = document.createElement('div');
      goalTarget.className = 'hnl-goal-target';
      goalTarget.setAttribute('aria-hidden', 'true');
      goalTarget.innerHTML = GOAL_ZONES.map((zone) => `<span data-goal-zone="${esc(zone)}"></span>`).join('');
      board.appendChild(goalTarget);
    }
  }

  function injectLab() {
    const layout = $('.hnl-board-layout');
    const board = $('#tacticBoard');
    if (!layout || !board || $('#advancedTacticalLab')) return;
    board.setAttribute('tabindex', '-1');
    injectFieldDetails(board);
    playbackHud();
    const controlTitle = $('.hnl-board-panel .hnl-card h2');
    if (controlTitle) controlTitle.textContent = '1. Monte a formação';
    const automaticButton = $('#simulateAttack');
    if (automaticButton) automaticButton.textContent = '▶ Simular plano automático';
    const saveFormationButton = $('#saveTactic');
    if (saveFormationButton) saveFormationButton.textContent = 'Salvar posições do campo';
    const resetButton = $('#resetTactic');
    if (resetButton) resetButton.textContent = 'Limpar prancheta';
    const section = document.createElement('section');
    section.className = 'hnl-tactical-lab';
    section.id = 'advancedTacticalLab';
    section.innerHTML = `
      <article class="hnl-card hnl-tactical-guide">
        <div class="hnl-tactical-guide-head">
          <div><span class="hnl-section-kicker">Guia rápido</span><h2>Como montar e assistir a uma jogada</h2><p>Use o plano automático para um teste rápido ou crie um roteiro personalizado com reação inteligente do goleiro.</p></div>
          <span class="hnl-guide-time">Leitura: 1 min</span>
        </div>
        <ol class="hnl-tutorial-steps">
          <li><b>1</b><span><strong>Monte o time</strong><small>Escolha os jogadores e arraste os avatares para as posições desejadas.</small></span></li>
          <li><b>2</b><span><strong>Crie as ações</strong><small>Monte manualmente ou descreva passes, movimentos e chutes em português.</small></span></li>
          <li><b>3</b><span><strong>Configure o goleiro</strong><small>Escolha defesa manual ou automática, inteligência e prioridade de lado.</small></span></li>
          <li><b>4</b><span><strong>Revise e assista</strong><small>Reordene as ações. Ao executar, a página sobe ao campo antes da animação.</small></span></li>
        </ol>
        <details class="hnl-tactical-help">
          <summary>O que cada função faz</summary>
          <div class="hnl-help-grid">
            <p><strong>Plano automático</strong><span>Usa a formação atual e o corredor escolhido para criar um ataque rápido.</span></p>
            <p><strong>Salvar posições</strong><span>Guarda jogadores e posições atuais da prancheta neste navegador.</span></p>
            <p><strong>Salvar roteiro</strong><span>Guarda a sequência personalizada de ações neste navegador.</span></p>
            <p><strong>Restaurar posições</strong><span>Depois da execução, devolve os jogadores aos lugares onde começaram.</span></p>
            <p><strong>Defesa inteligente</strong><span>Define como o goleiro lê o chute e escolhe a zona do mergulho.</span></p>
          </div>
        </details>
      </article>
      <article class="hnl-card hnl-keeper-panel">
        <div class="hnl-keeper-panel-head">
          <div><span class="hnl-section-kicker">🧤 Goleiro</span><h2>Defesa inteligente</h2><p>Controle a reação do goleiro em toda finalização e faça um teste isolado antes de executar o roteiro.</p></div>
          <span class="hnl-keeper-badge">9 zonas de defesa</span>
        </div>
        <div class="hnl-keeper-control-grid">
          <label>Modo de defesa<select class="hnl-select" id="keeperControlMode"><option value="automatic">Defender automaticamente</option><option value="manual">Escolher defesa manualmente</option></select></label>
          <label id="keeperIntelligenceField">Nível de inteligência<select class="hnl-select" id="keeperIntelligence"><option value="low">Baixa — reação tardia</option><option value="medium">Média — equilibrada</option><option value="high">Alta — leitura rápida</option><option value="adaptive">Automática — adapta à jogada</option></select></label>
          <label id="keeperCoverageField">Lado para defender<select class="hnl-select" id="keeperCoverage"><option value="auto">Automático — ler o chute</option><option value="left">Priorizar esquerda</option><option value="center">Proteger o centro</option><option value="right">Priorizar direita</option></select></label>
          <label id="keeperManualField" hidden>Direção manual exata<select class="hnl-select" id="keeperManualTarget"><option>alto esquerdo</option><option>alto centro</option><option>alto direito</option><option>meio esquerdo</option><option selected>centro</option><option>meio direito</option><option>baixo esquerdo</option><option>baixo centro</option><option>baixo direito</option></select></label>
          <label>Direção do chute de teste<select class="hnl-select" id="keeperTestTarget"><option>alto esquerdo</option><option>alto centro</option><option>alto direito</option><option>meio esquerdo</option><option>centro</option><option>meio direito</option><option>baixo esquerdo</option><option>baixo centro</option><option selected>baixo direito</option></select></label>
          <div class="hnl-keeper-test-action"><button class="hnl-btn accent" id="testKeeperDefense" type="button">🧤 Testar defesa</button><small>O teste usa o atacante mais avançado e restaura a formação ao terminar.</small></div>
        </div>
        <div class="hnl-keeper-metrics">
          <div><span>Chance de leitura</span><strong id="keeperReadingChance">--</strong></div>
          <div class="hnl-keeper-strategy"><span>Estratégia atual</span><strong id="keeperCurrentStrategy">Carregando…</strong></div>
          <div id="keeperResultCard"><span>Último resultado</span><strong id="keeperLastResult">PRONTO</strong></div>
          <div class="hnl-keeper-last"><span>Última decisão</span><p id="keeperLastDecision"><strong>Ainda não testado</strong><span>Escolha as opções acima e use “Testar defesa”.</span></p></div>
        </div>
        <div class="hnl-keeper-note"><strong>Como funciona:</strong> baixa, média e alta usam chances fixas de leitura. No automático, a chance se adapta à distância do chute e ao número de ações da jogada. Se você priorizar um lado, o goleiro protege aquele setor mesmo quando o chute vai para outro.</div>
      </article>
      <div class="hnl-tactical-lab-grid">
        <article class="hnl-card">
          <span class="hnl-section-kicker">2A · Sequência manual</span>
          <h2>Criar uma ação</h2>
          <p>Escolha o tipo de ação. Jogador ou receptor em branco será preenchido de forma segura com alguém da formação.</p>
          <div class="hnl-tactical-builder">
            <label>Tipo de ação<select class="hnl-select" id="actionType"><option value="pass">Passe</option><option value="run">Deslocamento</option><option value="shot">Finalização</option><option value="keeper">Defesa do goleiro</option></select></label>
            <p class="hnl-inline-help full" id="actionHelpText"></p>
            <label data-action-field="pass run">Jogador da ação<select class="hnl-select" id="actionFrom"></select></label>
            <label data-action-field="pass">Receptor do passe<select class="hnl-select" id="actionTo"></select></label>
            <label data-action-field="pass">Tipo do passe<select class="hnl-select" id="passHeight"><option value="ground">Rasteiro</option><option value="high">Alto / aéreo</option></select></label>
            <label data-action-field="run">Zona do deslocamento<select class="hnl-select" id="runZone"><option value="centro">Meio / centro</option><option value="direita">Ala direita</option><option value="esquerda">Ala esquerda</option><option value="ataque">Avançar ao ataque</option></select></label>
            <label data-action-field="shot">Finalizador<select class="hnl-select" id="shotPlayer"></select></label>
            <label data-action-field="shot">Alvo do chute<select class="hnl-select" id="shotTarget"><option>alto esquerdo</option><option>alto centro</option><option>alto direito</option><option>meio esquerdo</option><option selected>centro</option><option>meio direito</option><option>baixo esquerdo</option><option>baixo centro</option><option>baixo direito</option></select></label>
            <label data-action-field="keeper">Direção do movimento<select class="hnl-select" id="keeperDirection"><option>alto esquerdo</option><option>alto centro</option><option>alto direito</option><option>meio esquerdo</option><option selected>centro</option><option>meio direito</option><option>baixo esquerdo</option><option>baixo centro</option><option>baixo direito</option></select><small id="keeperPlayerInfo"></small></label>
            <div class="hnl-actions full"><button class="hnl-btn primary" id="addTacticalStep" type="button">+ Adicionar ao roteiro</button><button class="hnl-btn" id="refreshTacticalPlayers" type="button">Atualizar jogadores</button></div>
          </div>
        </article>
        <article class="hnl-card">
          <span class="hnl-section-kicker">2B · Roteiro em português</span>
          <h2>Descrever a jogada</h2>
          <p>Use nomes ou posições. Você pode omitir o receptor ou o goleiro: o sistema encontra uma opção válida e mostra o que ajustou.</p>
          <textarea class="hnl-textarea hnl-tactical-script" id="tacticalScript" placeholder="Goleiro sai pelo meio e passa para o defensor. Depois o atacante finaliza no baixo direito."></textarea>
          <div class="hnl-tactical-presets"><button class="hnl-btn" type="button" data-script-preset="Goleiro sai pelo meio. Goleiro passa para o Fixo. Fixo passa alto para o Atacante. Atacante finaliza no alto direito.">Saída com goleiro</button><button class="hnl-btn" type="button" data-script-preset="Ala se desloca pela direita. Fixo passa para o Ala. Ala passa para o Atacante. Atacante finaliza no baixo esquerdo.">Triangulação pela ala</button><button class="hnl-btn" type="button" data-script-preset="Meio avança pelo centro. Goleiro passa para o Meio. Meio passa alto para o Atacante. Atacante finaliza no centro.">Passe alto no pivô</button></div>
          <div class="hnl-interpretation-feedback" id="tacticalInterpretationFeedback" aria-live="polite"></div>
          <div class="hnl-actions hnl-script-actions"><button class="hnl-btn primary" id="parseTacticalScript" type="button">Interpretar e adicionar</button><button class="hnl-btn danger" id="clearTacticalSequence" type="button">Limpar roteiro</button></div>
        </article>
      </div>
      <article class="hnl-card hnl-tactical-console">
        <div class="hnl-console-head">
          <div><span class="hnl-section-kicker">3 · Revisão e simulação</span><h2>Linha do tempo da jogada</h2><p>Confira a ordem abaixo. Antes de animar, o sistema valida jogadores, receptor, bola e goleiro.</p></div>
          <div class="hnl-actions hnl-execution-actions"><label class="hnl-check"><input id="focusBoardBeforeSimulation" type="checkbox" checked><span>Levar até o campo</span></label><label class="hnl-check"><input id="restoreAfterSimulation" type="checkbox" checked><span>Restaurar posições</span></label><button class="hnl-btn accent" id="executeTacticalSequence" type="button">▶ Executar roteiro</button><button class="hnl-btn primary" id="saveTacticalSequence" type="button">Salvar roteiro</button></div>
        </div>
        <div class="hnl-tactical-timeline" id="tacticalTimeline"><span></span></div>
        <div class="hnl-simulation-score"><div><strong id="simulationResult">PRONTO</strong><span>Resultado</span></div><div><strong id="simulationStepCount">0</strong><span>Ações</span></div><div><strong>9</strong><span>Zonas de finalização</span></div><div><strong>5v5</strong><span>Formato da prancheta</span></div></div>
        <div id="advancedTacticStatus"></div>
        <div class="hnl-tactical-sequence" id="tacticalSequence"></div>
      </article>`;
    layout.insertAdjacentElement('afterend', section);

    refreshSelectors();
    updateBuilderFields();
    syncKeeperPanel();
    renderSteps();
    $('#actionType')?.addEventListener('change', updateBuilderFields);
    $('#addTacticalStep')?.addEventListener('click', addStructuredStep);
    $('#refreshTacticalPlayers')?.addEventListener('click', () => { refreshSelectors(); setStatus('Lista de jogadores atualizada.', 'success'); });
    ['#keeperControlMode', '#keeperIntelligence', '#keeperCoverage', '#keeperManualTarget', '#keeperTestTarget'].forEach((selector) => {
      $(selector)?.addEventListener('change', readKeeperSettingsFromUi);
    });
    $('#testKeeperDefense')?.addEventListener('click', testKeeperDefense);
    $('#parseTacticalScript')?.addEventListener('click', () => {
      const text = $('#tacticalScript')?.value || '';
      const interpretation = parseScript(text);
      const prepared = prepareSequence(interpretation.steps);
      const feedback = $('#tacticalInterpretationFeedback');
      if (!prepared.steps.length || prepared.errors.length) {
        const message = prepared.errors.join(' ') || 'Não identifiquei ações. Use frases curtas com jogador, passe, movimento ou chute.';
        if (feedback) feedback.innerHTML = `<div class="hnl-notice error"><strong>Não adicionei o roteiro.</strong><span>${esc(message)}</span></div>`;
        setStatus(message, 'error');
        return;
      }
      steps.push(...prepared.steps);
      save();
      renderSteps();
      const notes = prepared.notes.length ? `<small>Ajustes automáticos: ${esc(prepared.notes.join('; '))}.</small>` : '<small>Nomes e posições foram encontrados na formação atual.</small>';
      const ignored = interpretation.ignored ? `<small>${interpretation.ignored} trecho(s) sem ação foram ignorados.</small>` : '';
      if (feedback) feedback.innerHTML = `<div class="hnl-notice success"><strong>${prepared.steps.length} ação(ões) reconhecida(s).</strong>${notes}${ignored}</div>`;
      setStatus(`${prepared.steps.length} ação(ões) interpretada(s) e adicionada(s).`, 'success');
    });
    $('#clearTacticalSequence')?.addEventListener('click', () => {
      steps = [];
      save();
      renderSteps();
      if ($('#simulationResult')) $('#simulationResult').textContent = 'PRONTO';
      if ($('#tacticalInterpretationFeedback')) $('#tacticalInterpretationFeedback').innerHTML = '';
      setStatus('Roteiro limpo. A formação no campo foi mantida.');
    });
    $('#executeTacticalSequence')?.addEventListener('click', execute);
    $('#saveTacticalSequence')?.addEventListener('click', () => { save(); setStatus('Roteiro salvo neste navegador.', 'success'); });
    $$('[data-script-preset]').forEach((button) => button.addEventListener('click', () => {
      if ($('#tacticalScript')) $('#tacticalScript').value = button.dataset.scriptPreset || '';
      if ($('#tacticalInterpretationFeedback')) $('#tacticalInterpretationFeedback').innerHTML = '<small>Exemplo carregado. Você pode editar o texto antes de interpretar.</small>';
      $('#tacticalScript')?.focus();
    }));
    new MutationObserver(scheduleRefresh).observe(board, { childList: true, subtree: true });
  }

  window.HNLTacticalSimulator = Object.freeze({
    interpret(text = '') {
      const interpretation = parseScript(text);
      const prepared = prepareSequence(interpretation.steps);
      return { actions: prepared.steps, notes: prepared.notes, errors: prepared.errors, ignored: interpretation.ignored };
    },
    previewKeeper(options = {}) {
      return planKeeperDefense(
        options.shotTarget || 'centro',
        Number.isFinite(Number(options.shooterX)) ? Number(options.shooterX) : 50,
        Number.isFinite(Number(options.random)) ? Number(options.random) : 0.5,
        sanitizeKeeperSettings(options.settings || keeperSettings)
      );
    }
  });

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
