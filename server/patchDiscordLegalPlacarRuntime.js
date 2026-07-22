const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const PAGES = path.join(PUBLIC, 'pages');
const BUILD = '2026-07-22-discord-legal-placar-v4';
const LOGO = '/assets/hollow-nexus-official.svg';
const RELEASE_ID = 'release-2026-07-21-discord-legal-placar';
let changed = false;

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (read(file) !== content) {
    fs.writeFileSync(file, content, 'utf8');
    changed = true;
  }
}

function walkHtml(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory()
      ? walkHtml(full)
      : (entry.isFile() && entry.name.endsWith('.html') ? [full] : []);
  });
}

const topItems = [
  ['inicio', 'Início', '/pages/dashboard.html'],
  ['competitivo', 'Competitivo', '/pages/competicoes.html'],
  ['clubes', 'Clubes', '/pages/clubes.html'],
  ['jogadores', 'Jogadores', '/pages/atletas.html'],
  ['cafe', 'Café com Leite', '/pages/cafe-com-leite.html'],
  ['admin', 'Administração', '/pages/administracao.html']
];

const sideGroups = [
  ['Competitivo', [
    ['♕', 'Competições', '/pages/competicoes.html'],
    ['◇', 'Eventos', '/pages/eventos.html'],
    ['⌘', 'Chaveamento', '/pages/chaveamento.html'],
    ['≡', 'Grupos', '/pages/grupos.html'],
    ['◎', 'Resultados', '/pages/resultados.html'],
    ['▥', 'Rankings', '/pages/rankings.html'],
    ['□', 'Calendário', '/pages/calendario.html']
  ]],
  ['Clubes', [
    ['◈', 'Clubes Participantes', '/pages/clubes.html'],
    ['+', 'Cadastrar Clube', '/pages/cadastrar-clube.html'],
    ['▱', 'Elencos', '/pages/elencos.html'],
    ['▣', 'Prancheta Tática', '/pages/prancheta-tatica.html'],
    ['↔', 'Transferências', '/pages/transferencias.html']
  ]],
  ['Jogadores', [
    ['♙', 'Jogadores Registrados', '/pages/atletas.html'],
    ['✦', 'Mercado / Recrutamento', '/pages/mercado.html'],
    ['▥', 'Ranking de Jogadores', '/pages/rankings.html'],
    ['⌗', 'Placar Café com Leite', '/pages/placar.html']
  ]],
  ['Administração', [
    ['▤', 'Formulários', '/pages/formularios.html'],
    ['ⓘ', 'Permissões', '/pages/permissoes.html'],
    ['⚙', 'Configurações', '/pages/configuracoes.html'],
    ['◉', 'Análise de Partidas', '/pages/analise-partidas.html']
  ]]
];

function topNav(active = '') {
  return `<nav class="frm-tabs">${topItems.map(([key, label, href]) => `<a class="${key === active ? 'active' : ''}" href="${href}"${key === 'admin' ? ' data-admin-only hidden' : ''}>${label}</a>`).join('')}</nav>`;
}

function sideNav(activeHref = '') {
  return sideGroups.map(([title, links]) => {
    const admin = title === 'Administração';
    return `<div class="frm-nav-title"${admin ? ' data-admin-section hidden' : ''}>${title}</div>${links.map(([icon, label, href]) => `<a class="${href === activeHref ? 'active' : ''}" href="${href}"${admin ? ' data-admin-only hidden' : ''}><i>${icon}</i><b>${label}</b></a>`).join('')}`;
  }).join('');
}

function footer() {
  return `<footer class="frm-footer"><div><div class="frm-footer-brand"><img src="${LOGO}" alt="Hollow Nexus League"><div><strong>the HOLLOW NEXUS <span class="frm-accent">LEAGUE</span></strong><p>Liga Comunitária de Rematch</p></div></div><p>Competições, clubes, jogadores e eventos em uma plataforma comunitária independente.</p></div><div><h4>Liga</h4><div class="hnl-footer-links"><a href="/pages/sobre-a-liga.html">Sobre a Liga</a><a href="/pages/regulamento.html">Regulamento</a><a href="/pages/atualizacoes.html">Atualizações</a><a href="/pages/suporte.html">Suporte</a></div></div><div><h4>Links rápidos</h4><div class="hnl-footer-links"><a href="/pages/competicoes.html">Competições</a><a href="/pages/clubes.html">Clubes</a><a href="/pages/atletas.html">Jogadores</a><a href="/pages/placar.html">Placar 3x3 / 5x5</a></div></div><div><h4>Contato</h4><div class="hnl-footer-links"><a href="/api/discord/server/open" target="_blank" rel="noopener">Discord Oficial</a><a href="/pages/suporte.html">Abrir suporte</a></div></div><div><h4>Legal</h4><div class="hnl-footer-links"><a href="/pages/termos.html">Termos de Uso</a><a href="/pages/privacidade.html">Privacidade</a></div><p>Liga independente, sem afiliação com Rematch, Sloclap, Kepler Interactive ou Discord.</p><p>© 2026 The Hollow Nexus League.</p></div></footer>`;
}

function hero(title, text, icon, kicker = 'Hollow Nexus League') {
  return `<section class="frm-page-hero"><div><span class="hnl-section-kicker">${kicker}</span><h1>${title}</h1><p>${text}</p></div><div class="hnl-hero-icon" aria-hidden="true">${icon}</div></section>`;
}

function shell({ title, page = '', tab = '', href = '', module = '', heroHtml = '', body = '', extraHead = '', extraScripts = '' }) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Hollow Nexus League</title><meta name="description" content="Hollow Nexus League — ${title}"><link rel="icon" href="${LOGO}">${extraHead}<script src="/js/core/league-navigation.js?v=${BUILD}"></script><link rel="stylesheet" href="/css/league-critical.css?v=${BUILD}"><link rel="stylesheet" href="/css/league-polish.css?v=${BUILD}"><link rel="stylesheet" href="/css/league-experience.css?v=${BUILD}"><link rel="stylesheet" href="/css/discord-legal-placar.css?v=${BUILD}"><meta name="discord-only-auth-build" content="${BUILD}"></head><body class="frm-polish-page" data-page="${page}" data-hnl-module="${module}" data-frm-module="${module}"><div class="frm-shell"><aside class="frm-sidebar"><div class="frm-brand"><img src="${LOGO}" alt="Hollow Nexus League"><div><small>the</small><strong>HOLLOW NEXUS <span>LEAGUE</span></strong><p>Liga Comunitária</p></div></div><nav class="frm-nav">${sideNav(href)}</nav></aside><main class="frm-main"><header class="frm-header">${topNav(tab)}<div class="frm-header-actions"><a class="frm-btn" data-frm-login href="/pages/login.html?next=%2Fpages%2Fperfil.html"><span aria-hidden="true">◉</span> Entrar com Discord</a><a class="frm-btn discord" href="/api/discord/server/open" target="_blank" rel="noopener">💬 Discord</a><a class="frm-icon" href="/pages/notificacoes.html">🔔<b class="frm-badge" data-frm-unread>0</b></a><a class="frm-icon" href="/pages/correio.html">✉<b class="frm-badge" data-frm-mail>0</b></a></div></header>${heroHtml}<div id="pageStatus"></div>${body}${footer()}</main></div><div class="frm-modal" id="frmModal"><div class="frm-modal-panel" id="frmModalPanel"></div></div><script src="/js/core/social-icons.js?v=${BUILD}"></script><script src="/js/core/league-experience.js?v=${BUILD}"></script>${extraScripts}<script src="/js/core/league-auth-ui.js?v=${BUILD}"></script><script src="/js/core/league-page-integrity.js?v=${BUILD}"></script></body></html>`;
}

const loginBody = `<section class="hnl-discord-login-layout"><article class="hnl-card hnl-discord-login-card"><div class="hnl-discord-brand"><span class="hnl-discord-brand-mark" aria-hidden="true">◉</span><div><h2>Uma conta, o mesmo membro</h2><p>O acesso é feito exclusivamente pelo Discord.</p></div></div><p>Ao entrar, o site reconhece sua identidade no servidor e conecta corretamente seu perfil, cargos, clube e participação nos eventos da Hollow Nexus League.</p><a class="hnl-btn discord hnl-discord-primary" data-discord-oauth href="/auth/discord?next=%2Fpages%2Fperfil.html">💬 Continuar com Discord</a><p class="hnl-discord-login-note">Você autoriza no próprio Discord. A Hollow Nexus não recebe sua senha. O OAuth solicita sua identidade básica e o e-mail disponibilizado pelo Discord para reconhecer ou recuperar sua conta.</p><p class="hnl-discord-login-status" data-discord-login-status hidden></p><p class="hnl-auth-consent">Ao continuar, você confirma que leu os <a href="/pages/termos.html">Termos de Uso</a> e a <a href="/pages/privacidade.html">Política de Privacidade</a>.</p></article><div class="hnl-auth-benefits"><article class="hnl-card hnl-auth-benefit"><span aria-hidden="true">◎</span><h3>Reconhecimento automático</h3><p>Nome, avatar e Discord ID mantêm seu perfil reconhecível entre site, bot e servidor.</p></article><article class="hnl-card hnl-auth-benefit"><span aria-hidden="true">♜</span><h3>Cargos e permissões</h3><p>Acesso de jogador, capitão, diretor e administração acompanha as permissões válidas do servidor.</p></article><article class="hnl-card hnl-auth-benefit"><span aria-hidden="true">◈</span><h3>Clube e inscrições</h3><p>Capitães e diretores conseguem representar o time e enviar inscrições para validação no Discord.</p></article><article class="hnl-card hnl-auth-benefit"><span aria-hidden="true">⌗</span><h3>Ranking e vantagens</h3><p>Resultados, Placar 3x3/5x5, Café com Leite, notificações e benefícios ficam ligados à conta correta.</p></article><article class="hnl-card hnl-auth-steps"><h2>Como o acesso funciona</h2><div class="hnl-event-steps"><div><strong>1. Abra o Discord</strong><span>O botão leva à tela oficial de autorização.</span></div><div><strong>2. Confira os dados</strong><span>Revise a identidade solicitada e autorize.</span></div><div><strong>3. Volte reconhecido</strong><span>O Discord devolve você ao ponto do site em que estava.</span></div><div><strong>4. Use as vantagens</strong><span>Perfil, clube, inscrições e ranking ficam conectados.</span></div></div></article></div></section>`;

const loginPage = shell({
  title: 'Entrar com Discord',
  page: 'login',
  heroHtml: hero('Entrar com Discord', 'Login único para reconhecimento no servidor, cargos, clubes, inscrições, rankings e vantagens da comunidade.', '💬', 'Acesso seguro'),
  body: loginBody
});

const termsSections = [
  ['01', 'Aceitação e alcance', '<p>Estes Termos regulam o uso do site, do bot, do servidor Discord e das funções da Hollow Nexus League, incluindo perfis, clubes, inscrições, filas, partidas, chaveamentos, rankings, Placar e eventos comunitários.</p><p>Ao acessar ou utilizar esses recursos, você concorda com estes Termos, com a Política de Privacidade e com as regras específicas divulgadas para cada competição ou evento.</p>'],
  ['02', 'Elegibilidade e responsabilidade', '<p>Você deve cumprir a idade mínima exigida pelo Discord e pelas leis aplicáveis. Se ainda não tiver capacidade legal para aceitar estes Termos sozinho, seu responsável legal deverá conhecer e autorizar sua participação.</p><p>Você responde pelas ações realizadas com sua conta e deve manter o acesso ao Discord protegido.</p>'],
  ['03', 'Login exclusivo pelo Discord', '<p>A autenticação pública da plataforma é feita exclusivamente pelo OAuth do Discord. Não oferecemos criação de conta por senha, e-mail ou Google.</p><p>A autorização permite reconhecer a mesma pessoa entre site, bot e servidor, aplicar cargos e permissões, vincular clube, validar inscrições, entregar notificações e atribuir resultados ou vantagens à conta correta.</p><p class="hnl-legal-callout">A Hollow Nexus não recebe sua senha do Discord. Os dados usados no login e as finalidades do tratamento estão detalhados na Política de Privacidade.</p>'],
  ['04', 'Uso permitido', '<ul><li>Criar e manter um perfil verdadeiro e adequado à comunidade.</li><li>Participar de clubes, filas, partidas, eventos e rankings conforme as regras publicadas.</li><li>Enviar resultados, prints e comprovantes autênticos para validação.</li><li>Usar as ferramentas do site e do bot somente para finalidades da liga.</li></ul>'],
  ['05', 'Clubes, capitães e diretores', '<p>Somente os responsáveis reconhecidos pelo sistema — como capitão, diretor ou proprietário compatível de um clube antigo — podem editar o clube e representar o time. Administradores globais podem moderar registros, mas isso não transfere automaticamente a liderança esportiva do clube.</p><p>O responsável deve manter nome, tag, elenco, redes sociais e demais informações corretas, além de possuir autorização dos integrantes para cadastrá-los.</p>'],
  ['06', 'Inscrições e validação no Discord', '<p>Uma solicitação de inscrição não garante vaga. Ela pode ser enviada ao sistema de validação do Discord e só se torna efetiva após a confirmação da organização, observados limite de clubes, prazo, requisitos, eventual taxa e regras do evento.</p><p>A organização pode pedir correções, recusar dados incompletos ou cancelar inscrições que violem as regras.</p>'],
  ['07', 'Resultados, rankings e Placar Café com Leite', '<p>O Placar representa os rankings individuais 3x3 e 5x5 das partidas realizadas pelo sistema Café com Leite do bot. Filas, patentes, pontos, vitórias, empates, derrotas, gols, assistências, defesas e MVP dependem dos registros recebidos e validados.</p><p>A staff pode corrigir erros evidentes, invalidar partidas, rever provas e aplicar critérios de desempate ou penalidades divulgados previamente.</p>'],
  ['08', 'Premiações e vantagens', '<p>Quando anunciadas, premiações e vantagens seguem as regras específicas do evento. No Café com Leite informado atualmente, o primeiro colocado recebe R$ 35, o segundo R$ 15 e o terceiro inicia a temporada seguinte uma patente acima das patentes iniciais.</p><p>O pagamento ou benefício depende da confirmação do resultado, elegibilidade, ausência de fraude e fornecimento seguro dos dados necessários pelo canal oficial. Desclassificação ou violação das regras pode cancelar a premiação.</p>'],
  ['09', 'Condutas proibidas e moderação', '<ul><li>Fraudar identidade, inscrição, resultado, prova, ranking, premiação ou vínculo com clube.</li><li>Explorar falhas, contornar permissões, automatizar abuso ou interferir no funcionamento do site e do bot.</li><li>Assediar, ameaçar, discriminar, aplicar golpes, divulgar dados pessoais ou publicar conteúdo ilegal.</li><li>Fingir ser staff, capitão, diretor ou outro membro.</li></ul><p>A organização pode limitar recursos, remover conteúdo, suspender contas, desclassificar participantes e preservar registros necessários à apuração, respeitando o contexto e a gravidade.</p>'],
  ['10', 'Conteúdo enviado', '<p>Você mantém os direitos sobre logos, imagens, textos, links, prints e demais conteúdos que enviar. Ao publicá-los, concede à Hollow Nexus uma autorização não exclusiva e limitada para armazenar, exibir, adaptar ao layout e usar esse material na operação, divulgação e histórico da liga.</p><p>Você declara possuir permissão para utilizar o conteúdo e não deve enviar material que viole direitos de terceiros.</p>'],
  ['11', 'Disponibilidade e alterações do serviço', '<p>O site e o bot podem passar por manutenção, mudanças de integração ou indisponibilidade de serviços externos. Empregamos backups e controles técnicos, mas não prometemos operação ininterrupta nem ausência total de falhas.</p><p>Funções podem ser ajustadas para segurança, estabilidade ou evolução da comunidade, sem apagar deliberadamente dados válidos fora dos processos previstos.</p>'],
  ['12', 'Serviços e marcas de terceiros', '<p>Discord, Rematch, Sloclap, Kepler Interactive e as redes sociais exibidas no perfil possuem seus próprios termos e políticas. A Hollow Nexus League é comunitária e independente, sem afiliação, patrocínio ou endosso dessas empresas.</p>'],
  ['13', 'Privacidade e direitos', '<p>O tratamento de dados segue a Política de Privacidade e, quando aplicável, a Lei Geral de Proteção de Dados (LGPD). Você pode solicitar confirmação, acesso, correção ou exclusão nos limites legais e operacionais pelo suporte oficial.</p>'],
  ['14', 'Atualizações destes Termos', '<p>Podemos revisar estes Termos para acompanhar novas funções, integrações, regras, eventos ou exigências de segurança. Mudanças relevantes serão registradas na página Atualizações, identificando se afetam o Site, o Bot ou ambos, e poderão ser comunicadas no Discord.</p>'],
  ['15', 'Contato e solução de dúvidas', '<p>Use a página de Suporte ou o Discord Oficial para dúvidas, contestação de resultado, correção cadastral, privacidade ou denúncia. Informe somente os dados necessários para a análise.</p>']
];

function legalIndex(sections) {
  return sections.map(([number, title]) => `<a href="#sec-${number}">${number}. ${title}</a>`).join('');
}

function legalBody({ version, summary, sections, policy = false }) {
  return `<section class="hnl-legal-layout"><aside class="hnl-card hnl-legal-summary"><span class="hnl-legal-version">Versão ${version}</span><h2>${policy ? 'Privacidade em resumo' : 'Termos em resumo'}</h2><p>${summary}</p><div class="hnl-legal-index">${legalIndex(sections)}</div><div class="hnl-legal-links"><a class="hnl-btn primary" href="${policy ? '/pages/termos.html' : '/pages/privacidade.html'}">${policy ? 'Ver Termos' : 'Ver Privacidade'}</a><a class="hnl-btn" href="/pages/suporte.html">Abrir suporte</a></div></aside><div class="hnl-legal-sections">${sections.map(([number, title, content]) => `<article class="hnl-card hnl-legal-section" id="sec-${number}"><h2><span>${number}</span>${title}</h2>${content}</article>`).join('')}<article class="hnl-card hnl-legal-section"><p><strong>Última revisão:</strong> 21/07/2026. Esta redação organiza as práticas atuais da plataforma e deve ser revisada por profissional jurídico quando a operação exigir avaliação formal.</p></article></div></section>`;
}

const termsPage = shell({
  title: 'Termos de Uso',
  page: 'termos',
  heroHtml: hero('Termos de Uso', 'Regras atuais para conta Discord, clubes, competições, Café com Leite, premiações, moderação e integrações.', '§', 'Central legal'),
  body: legalBody({ version: '2026.07.21', summary: 'Use a plataforma com uma conta Discord legítima, respeite as regras da comunidade e envie somente informações verdadeiras.', sections: termsSections })
});

const privacySections = [
  ['01', 'Quem opera e onde esta política se aplica', '<p>Esta Política descreve o tratamento de dados realizado pela comunidade Hollow Nexus League no site, no bot e nas integrações usadas para organizar suas atividades. Para exercer direitos, use o suporte oficial indicado ao final.</p>'],
  ['02', 'Dados recebidos no login Discord', '<p>O login OAuth pode fornecer Discord ID, nome de usuário, nome público, avatar e e-mail quando disponibilizado pela conta. Também podemos consultar cargos e participação no servidor por meio do bot para aplicar permissões.</p><p class="hnl-legal-callout">Não recebemos sua senha do Discord. O token de acesso é usado no fluxo técnico de autenticação e não é exibido como credencial do seu perfil.</p>'],
  ['03', 'Outros dados tratados', '<ul><li>Perfil público, região, posição, bio, redes sociais e identificadores de jogo informados por você.</li><li>Clubes, responsáveis, elencos, inscrições e solicitações.</li><li>Filas, partidas, resultados, rankings, patentes, provas, anexos e histórico de validação.</li><li>Notificações, mensagens operacionais, tickets e registros de segurança.</li><li>Cookies de sessão e dados técnicos necessários para manter o acesso e diagnosticar falhas.</li></ul>'],
  ['04', 'Finalidades', '<p>Usamos os dados para reconhecer sua conta, manter sessão, aplicar permissões, exibir perfis, vincular clubes, processar inscrições, operar filas e partidas, validar resultados, atualizar rankings e Placar, entregar notificações, prevenir fraude, prestar suporte e recuperar o serviço por backups.</p>'],
  ['05', 'Visibilidade pública e escolhas', '<p>Nome público, avatar, clube, posição, ranking, estatísticas e conexões preenchidas podem aparecer em perfis e listas públicas. Campos opcionais devem conter apenas informações que você deseja compartilhar com a comunidade.</p>'],
  ['06', 'Bases e necessidade do tratamento', '<p>Tratamos dados conforme a finalidade e a base legal aplicável, observando necessidade, transparência, segurança e os demais princípios da LGPD. Alguns dados são necessários para prestar as funções solicitadas; outros são opcionais e podem ser removidos do perfil.</p>'],
  ['07', 'Compartilhamento e operadores técnicos', '<p>Não vendemos dados pessoais. Informações podem ser processadas pelo Discord e por serviços técnicos de hospedagem, armazenamento, banco ou backup necessários à operação. Staff autorizada acessa apenas o que precisa para moderação, suporte, validação e segurança.</p>'],
  ['08', 'Retenção e backups', '<p>Dados ficam armazenados enquanto a conta, atividade ou finalidade permanecer necessária. Registros de competição, segurança e prevenção de fraude podem ser preservados por período compatível com a finalidade. Backups podem manter versões temporárias até seu ciclo de substituição.</p>'],
  ['09', 'Cookies e sessão', '<p>Usamos cookies estritamente necessários para manter a sessão Discord autenticada e protegida. Eles não substituem a política do Discord nem servem, por si só, para publicidade comportamental da Hollow Nexus.</p>'],
  ['10', 'Segurança', '<p>Aplicamos sessão protegida, OAuth com estado assinado, permissões por cargo, rotas administrativas restritas e backups. Nenhum sistema é totalmente imune a incidentes; reporte suspeitas pelo suporte e nunca envie senhas ou tokens em campos públicos.</p>'],
  ['11', 'Direitos do titular', '<p>Nos termos aplicáveis da LGPD, você pode solicitar confirmação de tratamento, acesso, correção, informação sobre compartilhamento, anonimização, bloqueio ou eliminação quando cabível, além de outros direitos previstos em lei. Podemos solicitar confirmação de identidade antes de atender.</p>'],
  ['12', 'Crianças e adolescentes', '<p>O acesso depende de uma conta Discord válida e deve respeitar a idade mínima do serviço e a legislação local. Participantes sem capacidade legal devem contar com autorização e acompanhamento do responsável.</p>'],
  ['13', 'Atualizações e contato', '<p>Mudanças relevantes serão registradas em Atualizações e podem ser anunciadas no Discord. Para dúvidas ou solicitações, abra um ticket na página de Suporte ou procure a staff no Discord Oficial.</p>']
];

const privacyPage = shell({
  title: 'Política de Privacidade',
  page: 'privacidade',
  heroHtml: hero('Política de Privacidade', 'Como a Hollow Nexus usa dados do Discord, perfis, clubes, inscrições, rankings, mensagens e sessões.', '◌', 'Central legal'),
  body: legalBody({ version: '2026.07.21', summary: 'Coletamos apenas o necessário para reconhecer membros e operar o site, o bot e os eventos; não vendemos dados pessoais.', sections: privacySections, policy: true })
});

const placarBody = `<section class="hnl-placar-overview">
  <article class="hnl-card hnl-placar-intro">
    <span class="hnl-chip green">Dados do bot + Discord</span>
    <h2>Ranking Café com Leite 3x3 e 5x5</h2>
    <p>O Placar mostra todos os membros do servidor, inclusive quem ainda não jogou. As estatísticas 3x3 e 5x5 continuam separadas e são preenchidas pelas partidas do sistema Café com Leite.</p>
    <div class="hnl-queue-grid">
      <div class="hnl-queue-card"><strong id="queue3v3">0/6</strong><span>Fila Café com Leite 3x3</span></div>
      <div class="hnl-queue-card"><strong id="queue5v5">0/10</strong><span>Fila Café com Leite 5x5</span></div>
      <div class="hnl-queue-card"><strong id="placarMemberCount">0</strong><span>Membros no Placar</span></div>
    </div>
  </article>
  <article class="hnl-card">
    <span class="hnl-section-kicker">Patentes da temporada</span>
    <h2>Faixas de pontuação</h2>
    <p>As patentes são calculadas pelo bot conforme os pontos validados em cada fila.</p>
    <div class="hnl-placar-ranks" id="placarRanks"><div class="hnl-rank-chip"><strong>Patentes</strong><span>carregando...</span></div></div>
  </article>
</section>
<section class="hnl-card hnl-placar-login" id="placarLoginRequired" hidden>
  <span class="hnl-section-kicker">Reconhecimento necessário</span><h2>Entre com Discord para abrir o Placar</h2>
  <p>O login permite ao bot reconhecer sua conta e carregar a lista atual do servidor, os cargos e os rankings Café com Leite.</p>
  <a class="hnl-btn discord" href="/pages/login.html?next=%2Fpages%2Fplacar.html">Entrar com Discord</a>
</section>
<section class="hnl-card hnl-placar-console" id="placarConsole">
  <div class="hnl-placar-toolbar"><div><h2>Todos os jogadores do servidor</h2><p>Busque um membro e organize a lista do jeito que precisar.</p></div><button id="reloadPlacarBtn" class="hnl-btn" type="button">Atualizar dados</button></div>
  <div class="hnl-placar-tabs" role="tablist" aria-label="Modo do Placar"><button class="hnl-btn hnl-placar-tab active" type="button" role="tab" data-placar-tab="3v3">Placar 3x3</button><button class="hnl-btn hnl-placar-tab" type="button" role="tab" data-placar-tab="5v5">Placar 5x5</button></div>
  <div class="hnl-placar-filters">
    <label><span>Buscar jogador ou cargo</span><input id="placarSearch" type="search" autocomplete="off" placeholder="Nome, Discord ID ou cargo"></label>
    <label><span>Organizar por</span><select id="placarSort"><option value="points-desc">Mais pontos</option><option value="points-asc">Menos pontos</option><option value="recent-desc">Atividade mais recente</option><option value="recent-asc">Sem atividade / mais antigos</option><option value="role-asc">Cargo (A–Z)</option><option value="name-asc">Nome (A–Z)</option><option value="name-desc">Nome (Z–A)</option></select></label>
    <label><span>Filtrar cargo</span><select id="placarRoleFilter"><option value="all">Todos os cargos</option></select></label>
    <strong id="placarResultCount" aria-live="polite">0 membros exibidos</strong>
  </div>
  <section class="hnl-placar-panel" data-placar-panel="3v3"><div class="hnl-table-wrap" tabindex="0" aria-label="Ranking 3x3 rolável"><table class="hnl-rank-table" id="placar3v3Table"></table></div></section>
  <section class="hnl-placar-panel" data-placar-panel="5v5" hidden><div class="hnl-table-wrap" tabindex="0" aria-label="Ranking 5x5 rolável"><table class="hnl-rank-table" id="placar5v5Table"></table></div></section>
  <div id="placarStatus" class="hnl-placar-status">Sincronizando com o bot...</div>
</section>`;

const placarPage = shell({
  title: 'Placar Café com Leite',
  page: 'placar',
  tab: 'cafe',
  href: '/pages/placar.html',
  heroHtml: hero('Placar Café com Leite', 'Todos os membros do servidor, com ranking individual 3x3 e 5x5, cargos e atividade no sistema Café com Leite.', '⌗', 'Café com Leite'),
  body: placarBody,
  extraScripts: `<script src="/js/pages/placar.js?v=${BUILD}"></script>`
});

const releaseCard = `<article class="hnl-card va-update-card" id="${RELEASE_ID}"><span class="va-update-dot"></span><div class="va-update-meta"><span>21/07/2026</span><span>Site + Bot</span><span>Discord / Legal / Placar</span></div><h3>Login único pelo Discord, termos revisados e Placar integrado ao visual atual</h3><p class="va-muted">O acesso público foi centralizado no Discord para reconhecer membros, cargos e clubes, enquanto as páginas legais e o ranking Café com Leite foram atualizados.</p><ul class="va-update-list"><li class="site">Google, cadastro local e login por e-mail/senha foram removidos da interface e bloqueados nas rotas públicas.</li><li class="site">A nova tela explica reconhecimento, permissões, clubes, inscrições, notificações e vantagens antes do OAuth.</li><li class="site">Termos e Privacidade agora cobrem login Discord, LGPD, clubes, inscrições, moderação, premiações e conteúdo enviado.</li><li class="bot">O Placar 3x3 e 5x5 agora reúne todos os membros do servidor, preserva as estatísticas reais do Café com Leite e permite organizar por pontos, cargo, atividade ou nome.</li><li class="bot">As regras oficiais da Nexus Cup foram publicadas uma única vez no canal 1524621308682436740 e o formato passou a indicar equipes e tamanho dos grupos como a definir.</li><li class="fix">A lista de jogadores ganhou rolagem vertical própria, cabeçalho fixo e limite de altura para não alongar a página nem afastar a navegação lateral.</li><li class="fix">Placar, Termos, Privacidade e Atualizações foram migrados para a estrutura visual atual e o Placar entrou no menu.</li></ul></article>`;

function updateCards(html = '') {
  const cards = [];
  const seen = new Set();
  const pattern = /<article\b[^>]*class="[^"]*\bva-update-card\b[^"]*"[^>]*>[\s\S]*?<\/article>/gi;
  for (const match of html.matchAll(pattern)) {
    const id = (match[0].match(/\bid="([^"]+)"/i) || [])[1] || `card-${cards.length}`;
    if (seen.has(id) || id === RELEASE_ID) continue;
    seen.add(id);
    cards.push(match[0].replace(/class="([^"]*)"/i, (_all, classes) => {
      const normalized = String(classes).split(/\s+/).filter((name) => name && name !== 'va-card' && name !== 'hnl-card');
      return `class="hnl-card ${normalized.join(' ')}"`;
    }));
  }
  return cards;
}

function updatesPage(previousHtml = '') {
  const cards = updateCards(previousHtml);
  const body = `<section class="hnl-updates-layout"><div class="hnl-update-timeline">${releaseCard}${cards.join('')}</div><aside class="hnl-update-side"><article class="hnl-card"><span class="hnl-section-kicker">Histórico oficial</span><h2>Site e bot</h2><p>Toda mudança relevante deve aparecer aqui marcada como Site, Bot ou Site + Bot.</p></article><article class="hnl-card"><h2>Nesta entrega</h2><p>Login Discord exclusivo, páginas legais revisadas e Placar Café com Leite no shell atual.</p><div class="hnl-legal-links"><a class="hnl-btn" href="/pages/termos.html">Termos</a><a class="hnl-btn" href="/pages/placar.html">Placar</a></div></article></aside></section>`;
  return shell({
    title: 'Atualizações',
    page: 'atualizacoes',
    heroHtml: hero('Atualizações do site e do bot', 'Histórico público e datado das mudanças que afetam jogadores, clubes, capitães e staff.', '↻', 'Changelog oficial'),
    body
  });
}

function activeHrefFor(file) {
  const name = path.basename(file);
  const candidate = `/pages/${name}`;
  return sideGroups.some(([, links]) => links.some(([, , href]) => href === candidate)) ? candidate : '';
}

function activeTabFor(file) {
  const name = path.basename(file);
  if (name === 'dashboard.html') return 'inicio';
  if (['competicoes.html', 'competicao.html', 'eventos.html', 'chaveamento.html', 'grupos.html', 'resultados.html', 'rankings.html', 'calendario.html'].includes(name)) return 'competitivo';
  if (['clubes.html', 'times.html', 'cadastrar-clube.html', 'elencos.html', 'perfil-clube.html', 'prancheta-tatica.html', 'transferencias.html'].includes(name)) return 'clubes';
  if (['atletas.html', 'jogadores.html', 'perfil-jogador.html', 'perfil.html', 'mercado.html', 'recrutamento.html'].includes(name)) return 'jogadores';
  if (['cafe-com-leite.html', 'placar.html'].includes(name)) return 'cafe';
  if (['administracao.html', 'formularios.html', 'permissoes.html', 'configuracoes.html', 'analise-partidas.html'].includes(name)) return 'admin';
  return '';
}

function patchExperienceNavigation(file) {
  let html = read(file);
  if (!html || !html.includes('frm-shell')) return;
  const before = html;
  html = html.replace(/<nav class="frm-tabs">[\s\S]*?<\/nav>/i, topNav(activeTabFor(file)));
  html = html.replace(/<nav class="frm-nav">[\s\S]*?<\/nav>/i, `<nav class="frm-nav">${sideNav(activeHrefFor(file))}</nav>`);
  html = html.replace(/<footer class="frm-footer">[\s\S]*?<\/footer>/i, footer());
  html = html.replace(/<a\b[^>]*\bdata-frm-login\b[^>]*>[\s\S]*?<\/a>/i, '<a class="frm-btn" data-frm-login href="/pages/login.html?next=%2Fpages%2Fperfil.html"><span aria-hidden="true">◉</span> Entrar com Discord</a>');
  if (html !== before) write(file, html);
}

write(path.join(PAGES, 'login.html'), loginPage);
write(path.join(PUBLIC, 'index.html'), loginPage);
write(path.join(PAGES, 'termos.html'), termsPage);
write(path.join(PAGES, 'privacidade.html'), privacyPage);
write(path.join(PAGES, 'placar.html'), placarPage);
write(path.join(PAGES, 'atualizacoes.html'), updatesPage(read(path.join(PAGES, 'atualizacoes.html'))));
walkHtml(PAGES).forEach(patchExperienceNavigation);

write(path.join(PUBLIC, 'discord-legal-placar.json'), JSON.stringify({
  build: BUILD,
  authentication: 'discord-only',
  legacyAuthDisabled: ['google', 'email-password', 'local-registration'],
  legalVersion: '2026.07.21',
  scoreboard: ['cafe-com-leite-3v3', 'cafe-com-leite-5v5'],
  changelogScope: 'site-and-bot',
  updatedAt: '2026-07-21T23:59:00-03:00'
}, null, 2));

console.log(changed
  ? '[Discord/Legal/Placar] Login único, termos, privacidade, changelog e Placar atualizados.'
  : '[Discord/Legal/Placar] Entrega final já estava aplicada.');

const { failures } = require('./auditDiscordLegalPlacar');
if (failures.length) throw new Error('A validação Discord/Legal/Placar encontrou inconsistências.');
