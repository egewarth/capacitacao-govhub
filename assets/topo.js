// Topo comum a todas as páginas (marca, busca, Início/Trilhas, Dúvidas, conta Google), o rodapé
// e o aviso de sincronização. Cada página tem só <header class="site" id="topo"></header>.
import { el, svg, ICONES, botaoGoogle } from './dom.js';
import { carregarCatalogo, carregarTrilha } from './trilha.js';
import { buscarAulas } from './hub-nucleo.js';
import { hrefDoItem } from './progresso-nucleo.js';

export const EMAIL_CONTATO = 'govhub@unb.br';

export function montarTopo(progresso, { ativo = null } = {}) {
  const raiz = document.getElementById('topo');
  const link = (href, texto, chave) => el('a', { href, 'aria-current': ativo === chave ? 'page' : null }, texto);
  const conta = el('div', { class: 'conta', id: 'conta' });
  raiz.replaceChildren(el('div', { class: 'site-nav' },
    el('a', { class: 'marca', href: 'index.html' },
      el('img', { src: 'assets/logo/logomarca-horizontal-white.svg', alt: 'Gov Hub', width: 103, height: 24 }),
      el('span', {}, 'Trilhas de capacitação')),
    montarBusca(),
    el('div', { class: 'nav-actions' },
      el('nav', { class: 'nav-links', 'aria-label': 'Principal' },
        link('index.html', 'Início', 'inicio'), link('trilhas.html', 'Trilhas', 'trilhas')),
      el('a', { class: 'btn-contact', href: 'mailto:' + EMAIL_CONTATO, title: 'Dúvidas ou contato: ' + EMAIL_CONTATO, 'aria-label': 'Dúvidas? Escreva para ' + EMAIL_CONTATO },
        svg(ICONES.email), el('span', {}, 'Dúvidas?')),
      conta)));
  montarConta(conta, progresso);
  montarAviso(progresso);
  document.body.append(el('footer', { class: 'site' }, 'Trilhas de capacitação · Gov Hub · estrutura baseada em ',
    el('a', { href: 'https://diataxis.fr/' }, 'Diátaxis')));
}

// ---- Busca: títulos das aulas das trilhas abertas --------------------------------------
function montarBusca() {
  const lista = el('ul', { class: 'search-results', id: 'busca-resultados', hidden: true });
  const status = el('span', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
  const campo = el('input', {
    type: 'search', id: 'busca', placeholder: 'Buscar conteúdo das trilhas…', autocomplete: 'off',
    'aria-label': 'Buscar conteúdo das trilhas', 'aria-controls': 'busca-resultados',
  });
  let trilhas = null;
  async function carregar() {
    if (trilhas) return trilhas;
    const catalogo = await carregarCatalogo();
    const abertas = catalogo.trilhas.filter((t) => t.status !== 'em-breve');
    trilhas = await Promise.all(abertas.map((t) => carregarTrilha(t.slug)));
    return trilhas;
  }
  function fechar() { lista.hidden = true; }
  async function buscar() {
    const termo = campo.value;
    if (!termo.trim()) { fechar(); status.textContent = ''; return; }
    let todas;
    try { todas = await carregar(); } catch { return; }
    if (campo.value !== termo) return;   // a pessoa continuou digitando
    const achados = buscarAulas(todas, termo);
    const variasTrilhas = todas.length > 1;
    lista.replaceChildren(...(achados.length ? achados.map((a) => el('li', {},
      el('a', { class: 'search-result-item', href: hrefDoItem(a.trilha, a.item) },
        el('img', { src: a.item.icone, alt: '' }),
        el('span', {},
          el('span', { class: 'search-result-title' }, a.item.titulo),
          el('span', { class: 'search-result-level' },
            (variasTrilhas ? a.trilhaTitulo + ' · ' : '') + `Nível ${a.nivel} · ${a.nivelTitulo}`)))))
      : [el('li', { class: 'search-empty' }, 'Nada encontrado. Tente outro termo.')]));
    lista.hidden = false;
    status.textContent = achados.length ? `${achados.length} resultado${achados.length > 1 ? 's' : ''}` : 'Nada encontrado';
  }
  campo.addEventListener('input', buscar);
  campo.addEventListener('focus', () => { if (campo.value.trim()) buscar(); });
  campo.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowDown') { const a = lista.querySelector('a'); if (a && !lista.hidden) { ev.preventDefault(); a.focus(); } }
  });
  lista.addEventListener('keydown', (ev) => {
    const links = [...lista.querySelectorAll('a')];
    const i = links.indexOf(document.activeElement);
    if (ev.key === 'ArrowDown' && i < links.length - 1) { ev.preventDefault(); links[i + 1].focus(); }
    if (ev.key === 'ArrowUp') { ev.preventDefault(); (i > 0 ? links[i - 1] : campo).focus(); }
  });
  const caixa = el('div', { class: 'site-search', role: 'search' },
    el('span', { class: 'search-icon' }, svg(ICONES.busca)), campo, lista, status);
  document.addEventListener('click', (ev) => { if (!caixa.contains(ev.target)) fechar(); });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && !lista.hidden) { fechar(); campo.focus(); }
  });
  return caixa;
}

// ---- Conta Google ------------------------------------------------------------------------
function iniciais(nome) {
  return nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

function montarConta(raiz, progresso) {
  let desenhado = null;
  function pintar() {
    const u = progresso.usuario();
    const estado = (u ? u.uid : '-') + '|' + progresso.nuvemDisponivel();
    if (estado === desenhado) return;   // marcar aulas não redesenha o menu (que fecharia)
    desenhado = estado;
    if (!u) {
      raiz.replaceChildren(progresso.nuvemDisponivel() ? botaoGoogle(() => progresso.entrar()) : '');
      return;
    }
    const avatar = u.foto
      ? el('img', { class: 'conta-avatar', src: u.foto, alt: '', width: 36, height: 36, referrerpolicy: 'no-referrer' })
      : el('span', { class: 'conta-avatar' }, iniciais(u.nome));
    const menu = el('div', { class: 'conta-menu', id: 'conta-menu', hidden: true },
      el('div', { class: 'conta-menu-nome' }, u.nome),
      u.email ? el('div', { class: 'conta-menu-email' }, u.email) : el('div', { class: 'conta-menu-email' }),
      el('button', { class: 'conta-menu-sair', type: 'button', onclick: () => progresso.sair() }, 'Sair'));
    const botao = el('button', {
      class: 'conta-avatar-btn', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'conta-menu',
      'aria-label': 'Minha conta: ' + u.nome,
      onclick: () => abrir(menu.hidden),
    }, avatar);
    function abrir(sim) { menu.hidden = !sim; botao.setAttribute('aria-expanded', String(sim)); }
    raiz.replaceChildren(botao, menu);
  }
  document.addEventListener('click', (ev) => {
    const menu = raiz.querySelector('.conta-menu');
    if (menu && !menu.hidden && !raiz.contains(ev.target)) {
      menu.hidden = true;
      raiz.querySelector('.conta-avatar-btn').setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (ev) => {
    const menu = raiz.querySelector('.conta-menu');
    if (ev.key === 'Escape' && menu && !menu.hidden) {
      menu.hidden = true;
      const b = raiz.querySelector('.conta-avatar-btn');
      b.setAttribute('aria-expanded', 'false');
      b.focus();
    }
  });
  progresso.aoMudar(pintar);
  pintar();
}

function montarAviso(progresso) {
  const caixa = el('div', { class: 'aviso', role: 'status', 'aria-live': 'polite' });
  document.body.append(caixa);
  let temporizador = null;
  function mostrar(texto, { fixo = false } = {}) {
    caixa.textContent = texto;
    caixa.classList.add('visivel');
    clearTimeout(temporizador);
    if (!fixo) temporizador = setTimeout(esconder, 6000);
  }
  function esconder() {
    caixa.classList.remove('visivel');
    caixa.textContent = '';
  }
  progresso.aoAviso((texto) => mostrar(texto));
  // O Firestore guarda as marcações feitas sem conexão e as envia quando ela volta.
  window.addEventListener('offline', () => {
    if (progresso.usuario()) mostrar('Sem conexão: suas marcações serão sincronizadas quando a conexão voltar.', { fixo: true });
  });
  window.addEventListener('online', esconder);
}
