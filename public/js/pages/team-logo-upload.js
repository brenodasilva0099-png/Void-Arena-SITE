(function () {
  const MAX_STORED_LOGO_LENGTH = 2400000;
  const TARGET_SIZE = 512;
  let activeLogoInput = null;
  let activeTimer = null;

  function esc(value = '') {
    return String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  }

  function setStatus(input, message, type = '') {
    const form = input?.closest('form');
    const status = form?.querySelector('.va-status') || document.getElementById('createClubStatus') || document.getElementById('clubManageStatus') || document.getElementById('teamCreateStatus') || document.getElementById('teamManageStatus');
    if (!status) return;
    status.textContent = message || '';
    status.className = `va-status ${type}`.trim();
  }

  function extractImageUrl(value = '') {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^data:image\//i.test(raw)) return raw;

    const htmlSrc = raw.match(/(?:src|href)=["']([^"']+)["']/i);
    if (htmlSrc?.[1]) return htmlSrc[1].trim();

    const markdown = raw.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/i);
    if (markdown?.[1]) return markdown[1].trim();

    const url = raw.match(/https?:\/\/[^\s"'<>]+/i);
    if (url?.[0]) return url[0].trim();

    return '';
  }

  function safeLogoUrl(value = '') {
    const raw = extractImageUrl(value) || String(value || '').trim();
    if (!raw) return '';
    if (/^data:image\//i.test(raw)) return raw;
    if (/^blob:/i.test(raw)) return raw;
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^\/(assets|uploads|images|img|public)\//i.test(raw)) return raw;
    return '';
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('Falha ao ler a imagem.'));
      reader.readAsDataURL(file);
    });
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Nao consegui processar essa imagem. Tente PNG, JPG ou WEBP.'));
      };
      img.src = objectUrl;
    });
  }

  async function imageFileToLogoDataUrl(file) {
    if (!file || !/^image\//i.test(file.type || '')) {
      throw new Error('Selecione um arquivo de imagem.');
    }

    if (/svg/i.test(file.type || file.name || '')) {
      throw new Error('SVG nao sera salvo aqui. Use PNG, JPG ou WEBP.');
    }

    if (/gif/i.test(file.type || '') && file.size <= 1400000) {
      const rawGif = await fileToDataUrl(file);
      if (rawGif.length <= MAX_STORED_LOGO_LENGTH) return rawGif;
    }

    const img = await loadImageFromFile(file);
    const scale = Math.min(1, TARGET_SIZE / Math.max(img.naturalWidth || img.width || TARGET_SIZE, img.naturalHeight || img.height || TARGET_SIZE));
    const width = Math.max(1, Math.round((img.naturalWidth || img.width || TARGET_SIZE) * scale));
    const height = Math.max(1, Math.round((img.naturalHeight || img.height || TARGET_SIZE) * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    let dataUrl = canvas.toDataURL('image/webp', 0.86);
    if (!/^data:image\/webp/i.test(dataUrl)) dataUrl = canvas.toDataURL('image/png');

    if (dataUrl.length > 650000) dataUrl = canvas.toDataURL('image/webp', 0.72);
    if (dataUrl.length > MAX_STORED_LOGO_LENGTH) throw new Error('Imagem ainda ficou pesada. Use uma logo menor.');
    return dataUrl;
  }

  function previewForInput(input) {
    const form = input?.closest('form');
    return form?.querySelector('[data-logo-preview]') || document.getElementById('teamLogoPreview');
  }

  function updatePreview(input) {
    const preview = previewForInput(input);
    if (!preview) return;
    const safe = safeLogoUrl(input.value || '');
    preview.innerHTML = safe ? `<img src="${esc(safe)}" alt="Preview da logo" />` : '?';
  }

  function setLogoValue(input, value, message = 'Logo preparada. Agora e so salvar o time.') {
    if (!input) return;
    const safe = safeLogoUrl(value);
    if (!safe) {
      setStatus(input, 'Logo invalida. Cole uma URL direta da imagem ou selecione um arquivo PNG/JPG/WEBP.', 'err');
      return;
    }
    input.value = safe;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    updatePreview(input);
    setStatus(input, message, 'ok');
  }

  async function setLogoFromFile(input, file) {
    try {
      setStatus(input, 'Preparando logo...');
      const dataUrl = await imageFileToLogoDataUrl(file);
      setLogoValue(input, dataUrl, 'Logo carregada do arquivo. Agora e so salvar o time.');
    } catch (error) {
      setStatus(input, error.message || 'Erro ao preparar logo.', 'err');
    }
  }

  function markActive(input) {
    activeLogoInput = input;
    clearTimeout(activeTimer);
    activeTimer = setTimeout(() => { activeLogoInput = null; }, 20000);
    setStatus(input, 'Pode pressionar Ctrl+V agora. Aceita imagem copiada ou link direto da imagem.', 'ok');
  }

  function createUploadTools(input) {
    if (!input || input.dataset.logoUploadEnhanced === '1') return;
    input.dataset.logoUploadEnhanced = '1';
    input.setAttribute('maxlength', String(MAX_STORED_LOGO_LENGTH));

    const tools = document.createElement('div');
    tools.className = 'va-logo-upload-tools';
    tools.tabIndex = 0;
    tools.setAttribute('role', 'button');
    tools.setAttribute('aria-label', 'Arraste uma logo, selecione um arquivo ou cole uma imagem');
    tools.innerHTML = '<div class="va-logo-drop-copy"><strong>Solte a logo aqui</strong><small>PNG, JPG, WEBP ou GIF · também aceita uma imagem copiada</small></div><div class="va-logo-drop-actions"><button class="va-btn hnl-btn mini" type="button" data-logo-file-btn>Escolher arquivo</button><button class="va-btn hnl-btn mini secondary" type="button" data-logo-paste-btn>Colar imagem</button></div><input data-logo-file-input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden />';

    const wrap = input.closest('.va-logo-input-wrap');
    if (wrap) wrap.appendChild(tools);
    else input.insertAdjacentElement('afterend', tools);

    if (!previewForInput(input)) {
      const row = document.createElement('div');
      row.className = 'va-logo-preview-row compact';
      row.innerHTML = '<div class="va-team-logo preview" data-logo-preview>?</div><div><strong>Preview da logo</strong><p class="va-muted">Use link direto, Ctrl+V ou arquivo do PC.</p></div>';
      tools.insertAdjacentElement('afterend', row);
    }

    const fileInput = tools.querySelector('[data-logo-file-input]');
    tools.querySelector('[data-logo-file-btn]')?.addEventListener('click', () => fileInput.click());
    tools.querySelector('[data-logo-paste-btn]')?.addEventListener('click', () => markActive(input));
    fileInput?.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file) setLogoFromFile(input, file);
      fileInput.value = '';
    });
    const cancelDrag = (event) => { event.preventDefault(); event.stopPropagation(); };
    ['dragenter', 'dragover'].forEach((type) => tools.addEventListener(type, (event) => { cancelDrag(event); tools.classList.add('is-dragging'); }));
    ['dragleave', 'dragend'].forEach((type) => tools.addEventListener(type, (event) => { cancelDrag(event); tools.classList.remove('is-dragging'); }));
    tools.addEventListener('drop', (event) => {
      cancelDrag(event);
      tools.classList.remove('is-dragging');
      const file = Array.from(event.dataTransfer?.files || []).find((item) => /^image\//i.test(item.type || ''));
      if (file) setLogoFromFile(input, file);
      else setStatus(input, 'Solte um arquivo de imagem PNG, JPG, WEBP ou GIF.', 'err');
    });
    tools.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInput?.click(); }
    });
    tools.addEventListener('focus', () => { activeLogoInput = input; });
    input.addEventListener('input', () => {
      const extracted = extractImageUrl(input.value || '');
      if (extracted && extracted !== input.value.trim()) input.value = extracted;
      updatePreview(input);
    });
    input.addEventListener('focus', () => { activeLogoInput = input; });
    updatePreview(input);
  }

  function enhanceAll() {
    document.querySelectorAll('input[name="logo"]').forEach(createUploadTools);
    const pasteBox = document.getElementById('logoPasteBox');
    const createInput = document.querySelector('#teamCreateForm input[name="logo"]');
    if (pasteBox && createInput && pasteBox.dataset.logoPasteEnhanced !== '1') {
      pasteBox.dataset.logoPasteEnhanced = '1';
      pasteBox.addEventListener('click', () => markActive(createInput));
      pasteBox.addEventListener('focus', () => { activeLogoInput = createInput; });
      pasteBox.addEventListener('paste', (event) => handlePaste(event, createInput));
    }
  }

  async function handlePaste(event, forcedInput = null) {
    const input = forcedInput || activeLogoInput || (event.target?.matches?.('input[name="logo"]') ? event.target : null);
    if (!input) return;

    const files = Array.from(event.clipboardData?.files || []).filter((file) => /^image\//i.test(file.type || ''));
    if (files[0]) {
      event.preventDefault();
      await setLogoFromFile(input, files[0]);
      return;
    }

    const html = event.clipboardData?.getData('text/html') || '';
    const text = event.clipboardData?.getData('text/plain') || '';
    const url = extractImageUrl(html) || extractImageUrl(text);
    if (url) {
      event.preventDefault();
      setLogoValue(input, url, 'Link da logo colado. Agora e so salvar o time.');
    }
  }

  function injectStyles() {
    if (document.getElementById('vaLogoUploadStyles')) return;
    const style = document.createElement('style');
    style.id = 'vaLogoUploadStyles';
    style.textContent = `
      .va-logo-upload-tools { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; margin-top: 8px; min-height: 88px; padding: 14px; border: 1px dashed rgba(103,232,249,.48); border-radius: 12px; background: rgba(8,18,35,.68); cursor: copy; transition: border-color .16s ease,background .16s ease,transform .16s ease; }
      .va-logo-upload-tools:hover,.va-logo-upload-tools:focus-visible,.va-logo-upload-tools.is-dragging { border-color: #67e8f9; background: rgba(8,48,68,.8); outline: none; }
      .va-logo-upload-tools.is-dragging { transform: scale(1.01); }
      .va-logo-drop-copy { display: grid; gap: 4px; min-width: 210px; }
      .va-logo-drop-copy strong { color: #fff; }
      .va-logo-drop-copy small { color: #aeb8ce; line-height: 1.35; }
      .va-logo-drop-actions { display: flex; flex-wrap: wrap; gap: 8px; }
      .va-logo-input-wrap .va-logo-upload-tools { margin-top: 0; }
      .va-logo-preview-row.compact { margin-top: 10px; }
      .va-team-logo.preview img, .va-public-team-logo img, .va-team-logo img { width: 100%; height: 100%; object-fit: cover; border-radius: inherit; display: block; }
    `;
    document.head.appendChild(style);
  }

  document.addEventListener('paste', handlePaste, true);
  document.addEventListener('DOMContentLoaded', () => { injectStyles(); enhanceAll(); });
  injectStyles();
  enhanceAll();
  new MutationObserver(enhanceAll).observe(document.documentElement, { childList: true, subtree: true });
}());
