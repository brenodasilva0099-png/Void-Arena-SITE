const tabs = document.querySelectorAll('.tab');
const forms = {
  login: document.querySelector('#loginForm'),
  register: document.querySelector('#registerForm')
};
const message = document.querySelector('#authMessage');

function setMessage(text, type = '') {
  message.textContent = text;
  message.className = `auth-message ${type}`.trim();
}

const authQueryMessages = {
  discord_state_error: 'A autenticação com Discord expirou ou falhou. Tente novamente.',
  discord_not_configured: 'O login com Discord ainda não está configurado corretamente no .env.',
  discord_failed: 'Não foi possível concluir o login com Discord agora. Tente novamente.'
};

const authStatus = new URLSearchParams(window.location.search).get('auth');
if (authStatus && authQueryMessages[authStatus]) {
  setMessage(authQueryMessages[authStatus], 'error');
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const selected = tab.dataset.tab;

    tabs.forEach((item) => item.classList.toggle('active', item === tab));
    Object.entries(forms).forEach(([key, form]) => {
      form.classList.toggle('active', key === selected);
    });

    if (!authStatus) setMessage('');
  });
});

async function sendAuth(endpoint, form) {
  const payload = Object.fromEntries(new FormData(form).entries());

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Não foi possível entrar agora.');
  }

  return data;
}

forms.login.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('Entrando...', '');

  try {
    await sendAuth('/api/auth/login', forms.login);
    setMessage('Login feito com sucesso. Redirecionando...', 'success');
    window.location.href = '/pages/dashboard.html';
  } catch (error) {
    setMessage(error.message, 'error');
  }
});

forms.register.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('Criando conta...', '');

  try {
    await sendAuth('/api/auth/register', forms.register);
    setMessage('Conta criada com sucesso. Redirecionando...', 'success');
    window.location.href = '/pages/dashboard.html';
  } catch (error) {
    setMessage(error.message, 'error');
  }
});

fetch('/api/me')
  .then((response) => {
    if (response.ok) window.location.href = '/pages/dashboard.html';
  })
  .catch(() => {});

function getBotPublicUrl() {
  if (window.VOID_ARENA_BOT_URL) {
    return String(window.VOID_ARENA_BOT_URL).replace(/\/$/, "");
  }

  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://localhost:3002";
  }

  return "https://void-arena-bot.onrender.com";
}

function loadServerProfileOnLogin() {
  const iconUrl = `${getBotPublicUrl()}/public/guild-icon.png?v=6`;

  document.querySelectorAll(".brand-image img").forEach((img) => {
    img.alt = "Ícone do servidor Hollow Nexus";
    img.onerror = () => {
      img.onerror = null;
      img.src = "/assets/abyss-profile.png";
    };
    img.src = iconUrl;
  });
}

loadServerProfileOnLogin();
