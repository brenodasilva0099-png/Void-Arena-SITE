const originalFetch = global.fetch;

if (typeof originalFetch === 'function' && !global.__VOID_ARENA_FETCH_TIMEOUT_PATCH__) {
  global.__VOID_ARENA_FETCH_TIMEOUT_PATCH__ = true;

  global.fetch = async function voidArenaFetch(input, init = {}) {
    const rawUrl = typeof input === 'string' ? input : String(input?.url || '');
    const botUrl = String(process.env.BOT_API_URL || '').replace(/\/$/, '');
    const looksLikeBot = Boolean(
      (botUrl && rawUrl.startsWith(botUrl)) ||
      rawUrl.includes('void-arena-bot') ||
      rawUrl.includes('localhost:3002')
    );

    if (!looksLikeBot || init.signal) {
      return originalFetch(input, init);
    }

    // Render Free pode deixar o BOT dormindo. 6.5s era pouco e quebrava login/salvamento.
    const timeoutMs = Number(init.timeoutMs || process.env.SITE_BOT_FETCH_TIMEOUT_MS || 45000) || 45000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await originalFetch(input, { ...init, signal: controller.signal });
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error(`Tempo limite atingido na ponte SITE -> BOT (${timeoutMs}ms).`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };
}
