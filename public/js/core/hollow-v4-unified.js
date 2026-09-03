(()=>{
'use strict';
if(window.__HollowNexusV4Unified)return;
window.__HollowNexusV4Unified=true;

const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
const pathname=(location.pathname||'/').toLowerCase();
const page=(pathname.split('/').pop()||'index.html').toLowerCase();
const isLogin=pathname==='/'||page==='index.html';
const mainPages=new Set(['dashboard.html','eventos.html','times.html','jogadores.html','rankings.html','resultados.html']);
const redirectPages=new Set(['competicoes.html','clubes.html','atletas.html','partidas.html','cafe-com-leite.html','administracao.html']);
const pageMeta={
  'analise-partidas.html':['Partidas','Análise de partidas','Revisão técnica de partidas, registros e desempenho competitivo.'],
  'atualizacoes.html':['Liga','Atualizações','Histórico público das mudanças que afetam a plataforma, jogadores e clubes.'],
  'cadastrar-clube.html':['Clubes','Cadastrar clube','Crie a organização, defina liderança, região, identidade e conexões oficiais.'],
  'calendario.html':['Competitivo','Calendário','Agenda oficial da temporada, eventos, confrontos e datas importantes.'],
  'chat.html':['Administração','Chat Discord','Central administrativa de comunicação e integração com o Discord.'],
  'chaveamento.html':['Competitivo','Chaveamento','Mata-mata, playoffs e progressão oficial das competições.'],
  'competicao.html':['Competições','Detalhes da competição','Formato, participantes, progresso, inscrições e informações oficiais.'],
  'configuracoes.html':['Conta e gestão','Configurações','Preferências, integrações e ajustes da experiência Hollow Nexus.'],
  'convite-time.html':['Clubes','Convite de clube','Gerencie convites e vínculos de jogadores com clubes da liga.'],
  'correio.html':['Conta','Central de notificações','Avisos, convites, atualizações e comunicações importantes da plataforma.'],
  'elencos.html':['Clubes','Elencos','Titulares, reservas, liderança e organização dos clubes cadastrados.'],
  'estatisticas.html':['Partidas','Estatísticas','Desempenho de clubes e jogadores a partir dos registros oficiais.'],
  'federacao.html':['Administração','Gestão da liga','Ferramentas internas para administrar a Hollow Nexus League.'],
  'formularios.html':['Administração','Formulários','Envios, solicitações e gestão dos formulários oficiais da liga.'],
  'grupos.html':['Competitivo','Fase de grupos','Sorteio, organização, classificação e pontuação dos grupos.'],
  'inscricao.html':['Competições','Inscrições','Solicitações de participação e validação de clubes nas competições.'],
  'mercado.html':['Jogadores','Mercado','Jogadores disponíveis, oportunidades e movimentações de recrutamento.'],
  'notificacoes.html':['Conta','Notificações','Convites, atualizações e alertas vinculados ao seu perfil.'],
  'painel-completo.html':['Administração','Painel administrativo','Controle central das áreas administrativas e operacionais da liga.'],
  'perfil-clube.html':['Clubes','Perfil do clube','Identidade, elenco, liderança, conexões e histórico público do clube.'],
  'perfil-jogador.html':['Jogadores','Perfil do jogador','Informações públicas, clube atual, conexões e histórico competitivo.'],
  'perfil.html':['Conta','Meu perfil','Identidade, conexões, preferências e vínculos da sua conta.'],
  'permissoes.html':['Administração','Permissões','Controle de acesso às áreas internas e recursos administrativos.'],
  'placar.html':['Café com Leite','Rankings 3v3 e 5v5','Classificação individual, partidas comunitárias e evolução dos jogadores.'],
  'pontuacao.html':['Rankings','Pontuação','Critérios, classificação e evolução competitiva da liga.'],
  'prancheta-tatica.html':['Clubes','Prancheta tática','Planejamento de jogadas, posicionamento e simulação tática.'],
  'privacidade.html':['Legal','Privacidade','Como a plataforma trata informações, contas e integrações dos usuários.'],
  'recrutamento.html':['Jogadores','Mercado e recrutamento','Encontre jogadores, envie solicitações e acompanhe movimentações.'],
  'regulamento.html':['Liga','Regulamento','Regras gerais de convivência, competições e validação de resultados.'],
  'scrims.html':['Partidas','Scrims','Organização e acompanhamento de partidas de treino entre clubes.'],
  'sobre-a-liga.html':['Liga','Sobre a liga','Conheça a proposta, estrutura e posicionamento da Hollow Nexus League.'],
  'sumulas.html':['Partidas','Súmulas','Envio, revisão e histórico dos registros oficiais de partidas.'],
  'suporte.html':['Suporte','Central de suporte','Ajuda, atendimento e resolução de problemas relacionados à plataforma.'],
  'termos.html':['Legal','Termos de uso','Condições de uso, responsabilidades e regras da plataforma.'],
  'transferencias.html':['Clubes','Transferências','Movimentações de jogadores e histórico de alterações nos elencos.'],
  'treinos.html':['Partidas','Treinos','Organização de sessões de treino e atividades dos clubes.']
};

function cleanLegacyBranding(){
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const nodes=[];
  let node;
  while((node=walker.nextNode()))nodes.push(node);
  for(const textNode of nodes){
    const parent=textNode.parentElement;
    if(!parent||['SCRIPT','STYLE','TEXTAREA','OPTION','CODE','PRE'].includes(parent.tagName))continue;
    const raw=textNode.nodeValue||'';
    const next=raw
      .replace(/Void Arena/gi,'Hollow Nexus')
      .replace(/Federação Hollow Nexus/gi,'Hollow Nexus League')
      .replace(/Correios da Arena/gi,'Central de Notificações')
      .replace(/the\s+HOLLOW\s+NEXUS\s+LEAGUE/gi,'HOLLOW NEXUS LEAGUE');
    if(next!==raw)textNode.nodeValue=next;
  }
}

function enhanceMoreMenu(){
  const details=$('.hn2-more');
  const menu=details?.querySelector('.hn2-menu');
  if(!details||!menu||menu.dataset.hn4Mega==='1')return;
  menu.dataset.hn4Mega='1';
  menu.classList.add('hn4-mega-menu');

  const original=[...menu.children];
  const sections=[];
  let current=null;
  const createSection=(label='Outras áreas')=>{
    const section=document.createElement('section');
    section.className='hn4-more-section';
    const title=document.createElement('h3');
    title.textContent=label;
    section.appendChild(title);
    sections.push(section);
    return section;
  };

  for(const item of original){
    if(item.tagName==='SPAN'){
      current=createSection((item.textContent||'').trim()||'Outras áreas');
      continue;
    }
    if(item.tagName==='A'){
      if(!current)current=createSection();
      current.appendChild(item);
    }
  }

  const heading=document.createElement('div');
  heading.className='hn4-more-heading';
  const headingText=document.createElement('div');
  const small=document.createElement('small');
  small.textContent='Hollow Nexus';
  const strong=document.createElement('strong');
  strong.textContent='Explorar toda a plataforma';
  headingText.append(small,strong);
  const close=document.createElement('button');
  close.type='button';
  close.className='hn4-more-close';
  close.textContent='Fechar';
  close.addEventListener('click',()=>details.removeAttribute('open'));
  heading.append(headingText,close);
  menu.replaceChildren(heading,...sections);
}

function addContextLine(){
  if(isLogin||mainPages.has(page)||redirectPages.has(page))return;
  const meta=pageMeta[page];
  const main=$('.va-main,.frm-main,main');
  const header=$('.hn2-header',main||document);
  if(!meta||!main||$('.hn4-context-line',main))return;

  document.body.classList.add('hn4-unified-secondary');
  const line=document.createElement('div');
  line.className='hn4-context-line';
  const left=document.createElement('div');
  left.className='hn4-context-line-left';
  const accent=document.createElement('i');
  accent.setAttribute('aria-hidden','true');
  const kicker=document.createElement('small');
  kicker.textContent=meta[0];
  const title=document.createElement('span');
  title.textContent=meta[1];
  left.append(accent,kicker,title);
  const brand=document.createElement('b');
  brand.textContent='HOLLOW NEXUS · V4';
  line.append(left,brand);
  if(header)header.insertAdjacentElement('afterend',line);
  else main.insertBefore(line,main.firstChild);
  document.title=`${meta[1]} | Hollow Nexus`;
}

function installFooter(){
  if(isLogin||redirectPages.has(page))return;
  const main=$('.va-main,.frm-main,main');
  if(!main)return;
  $$('.hn4-global-footer').forEach((footer)=>footer.remove());

  const footer=document.createElement('footer');
  footer.className='hn4-global-footer';
  footer.innerHTML=`
    <div class="hn4-footer-brand">
      <img src="/assets/hollow-nexus-official.svg" alt="">
      <div><strong>HOLLOW NEXUS LEAGUE</strong><p>Plataforma competitiva comunitária de Rematch para competições, clubes, jogadores, rankings e partidas.</p></div>
    </div>
    <div class="hn4-footer-col"><h3>Liga</h3><a href="/pages/eventos.html">Competições</a><a href="/pages/times.html">Clubes</a><a href="/pages/jogadores.html">Jogadores</a></div>
    <div class="hn4-footer-col"><h3>Competitivo</h3><a href="/pages/rankings.html">Rankings</a><a href="/pages/resultados.html">Partidas</a><a href="/pages/placar.html">Café com Leite</a></div>
    <div class="hn4-footer-col"><h3>Informações</h3><a href="/pages/atualizacoes.html">Atualizações</a><a href="/pages/regulamento.html">Regulamento</a><a href="/pages/suporte.html">Suporte</a><a href="/pages/termos.html">Termos</a><a href="/pages/privacidade.html">Privacidade</a></div>
    <div class="hn4-footer-copy">© 2026 Hollow Nexus League · Liga comunitária independente.</div>`;
  main.appendChild(footer);
}

function markSecondary(){
  if(isLogin||mainPages.has(page)||redirectPages.has(page))return;
  document.body.classList.add('hn4-unified-secondary');
}

function init(){
  document.body.classList.add('hn4-unified-page');
  if(isLogin){cleanLegacyBranding();return;}
  markSecondary();
  cleanLegacyBranding();
  enhanceMoreMenu();
  addContextLine();
  installFooter();
  document.documentElement.dataset.hnV4Unified='true';
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
