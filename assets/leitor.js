// Leitor da trilha (doc.html): barra lateral com os níveis, aula em Markdown e a sequência
// anterior/próxima, sem recarregar a página. Links antigos doc.html?path=... continuam valendo.
import { progresso } from './progresso.js';
import { carregarTrilha } from './trilha.js';
import { montarConta, montarAviso } from './conta.js';
import { el } from './dom.js';
import { caminhoSeguro } from './caminho.js';
import { contar, hrefDoItem, idsDoDoc, localizar, todosFeitos, vizinhos } from './progresso-nucleo.js';

const $ = (id) => document.getElementById(id);
let niveis = [];
let atual = { path: null, item: null };   // item: nó da trilha, ou null para página fora dela
let diagramas = 0;

// ---- URL e Markdown -----------------------------------------------------------
function lerUrl() {
  const p = new URLSearchParams(location.search);
  const bruto = p.get('path') || 'README.md';
  // Só normaliza o que é seguro; o resto chega intacto a abrir(), que o recusa sem buscar.
  return { path: caminhoSeguro(bruto) ? bruto.replace(/^\.?\/+/, '') : bruto, item: p.get('item') };
}
function resolver(base, rel) {
  const dir = base.includes('/') ? base.slice(0, base.lastIndexOf('/') + 1) : '';
  const u = new URL(dir + rel, 'http://_/');
  return decodeURIComponent(u.pathname.slice(1));
}
function slug(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function idsNosTitulos(raiz) {
  raiz.querySelectorAll('h1,h2,h3,h4').forEach((h) => { if (!h.id) h.id = slug(h.textContent); });
}
// Links relativos do .md apontam para outros .md: viram doc.html?path=... (e o leitor
// intercepta o clique). Imagens relativas são resolvidas a partir da pasta do documento.
function corrigirLinks(raiz, path) {
  raiz.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || /^[a-z]+:/i.test(href)) return;
    const i = href.indexOf('#');
    const frag = i >= 0 ? href.slice(i) : '';
    const alvo = i >= 0 ? href.slice(0, i) : href;
    if (alvo === '') { a.setAttribute('href', frag); return; }
    let r = resolver(path, alvo);
    if (r.endsWith('/')) r += 'index.md';
    a.setAttribute('href', r.endsWith('.md') ? 'doc.html?path=' + r + frag : r + frag);
  });
  raiz.querySelectorAll('img[src]').forEach((img) => {
    const s = img.getAttribute('src');
    if (!s || /^[a-z]+:/i.test(s) || s.startsWith('/')) return;
    img.setAttribute('src', resolver(path, s));
  });
}

// Blocos ```mermaid viram diagramas. Sem a biblioteca (CDN bloqueado), o bloco continua
// visível como código — o conteúdo nunca desaparece.
function desenharDiagramas(raiz) {
  const blocos = raiz.querySelectorAll('pre > code.language-mermaid');
  if (!blocos.length || typeof mermaid === 'undefined') return;
  // Cores literais da paleta de assets/govhub.css: o Mermaid não lê variáveis CSS.
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    fontSize: 15,
    fontFamily: "'Reddit Sans',-apple-system,BlinkMacSystemFont,sans-serif",
    // useMaxWidth:false — com true, o Mermaid estica diagramas pequenos até a largura
    // da página e o texto muda de escala entre um diagrama e outro.
    flowchart: { padding: 12, nodeSpacing: 45, rankSpacing: 55, useMaxWidth: false },
    themeVariables: {
      primaryColor: '#F2F1F6', primaryTextColor: '#0A005A', primaryBorderColor: '#613EFF',
      secondaryColor: '#FFFFFF', secondaryTextColor: '#0A005A', secondaryBorderColor: '#BE006E',
      tertiaryColor: '#FFFFFF', tertiaryBorderColor: '#E9DFFF',
      lineColor: '#0A005A', textColor: '#2D3748', fontSize: '15px',
    },
  });
  // Sem esperar a fonte, o Mermaid mede as caixas com a métrica errada e corta os rótulos.
  // E cada diagrama é desenhado por mermaid.render: mermaid.run() desenha todos dentro do
  // primeiro bloco quando a página tem mais de um.
  const fontes = document.fonts && document.fonts.load
    ? document.fonts.load("15px 'Reddit Sans'").then(() => document.fonts.ready)
    : Promise.resolve();
  fontes.then(() => {
    blocos.forEach((code) => {
      const fonte = code.textContent;
      const div = el('div', { class: 'mermaid' });
      code.parentNode.replaceWith(div);
      diagramas += 1;
      mermaid.render('diagrama-' + diagramas, fonte)
        .then((r) => { div.innerHTML = r.svg; })
        .catch(() => { div.replaceChildren(el('pre', {}, el('code', {}, fonte))); });
    });
  });
}

// ---- Barra lateral --------------------------------------------------------------
function montarSumario() {
  $('sumario-niveis').replaceChildren(...niveis.map((nivel) => el('li', { class: 'nivel' },
    el('details', { 'data-nivel': nivel.numero },
      el('summary', {},
        el('span', { class: 'nivel-num', 'aria-hidden': 'true' }, String(nivel.numero)),
        el('span', { class: 'nivel-titulo' }, el('span', { class: 'sr-only' }, `Nível ${nivel.numero} · `), nivel.titulo),
        el('span', { class: 'nivel-contador' })),
      el('ol', { class: 'aulas' }, ...nivel.itens.map((item) => el('li', { class: 'aula', 'data-id': item.id },
        el('button', {
          class: 'check', type: 'button', 'aria-pressed': 'false',
          'aria-label': 'Marcar como concluída: ' + item.titulo,
          onclick: () => progresso.alternar(idsDoDoc(niveis, item.doc)),
        }),
        el('a', { class: 'aula-link', href: hrefDoItem(item) },
          el('span', { class: 'aula-titulo' }, item.titulo),
          el('span', { class: 'aula-meta' },
            el('img', { src: item.icone, alt: '', width: 16, height: 16 }),
            item.tipo_nome,
            item.papel !== 'core' ? ' · ' + item.papel_nome : null)))))))));
}

function marcarAtiva() {
  let ativa = null;
  document.querySelectorAll('.aula').forEach((li) => {
    const eh = !!atual.item && li.dataset.id === atual.item.id;
    li.classList.toggle('ativa', eh);
    const link = li.querySelector('.aula-link');
    if (eh) { link.setAttribute('aria-current', 'page'); ativa = li; } else link.removeAttribute('aria-current');
  });
  if (!ativa) return;
  ativa.closest('details').open = true;
  const sumario = $('sumario');
  const topo = ativa.offsetTop - sumario.clientHeight / 3;
  if (ativa.offsetTop < sumario.scrollTop || ativa.offsetTop > sumario.scrollTop + sumario.clientHeight - 40) sumario.scrollTop = topo;
}

function pintarProgresso() {
  const feitos = progresso.feitos();
  const c = contar(feitos, niveis);
  $('progresso-geral-texto').textContent = `${c.feitas} de ${c.total} aulas concluídas`;
  $('progresso-geral-barra').style.width = c.percentual + '%';
  $('topo-percentual').textContent = c.percentual + '%';
  $('topo-barra').style.width = c.percentual + '%';
  document.querySelectorAll('.aula').forEach((li) => {
    const feito = !!feitos[li.dataset.id];
    li.classList.toggle('feita', feito);
    li.querySelector('.check').setAttribute('aria-pressed', String(feito));
  });
  document.querySelectorAll('details[data-nivel]').forEach((d) => {
    const n = c.porNivel[d.dataset.nivel];
    d.querySelector('.nivel-contador').textContent = `${n.feitas}/${n.total}`;
  });
  pintarRodape();
}

// ---- Contexto e sequência da aula -------------------------------------------------
function pintarContexto() {
  const ctx = $('aula-contexto');
  const item = atual.item;
  ctx.hidden = !item;
  if (!item) { ctx.replaceChildren(); return; }
  ctx.replaceChildren(...[
    el('span', {}, `Nível ${item.nivel} · `, el('b', {}, item.nivel_titulo)),
    el('span', { class: 'tag-tipo' }, el('img', { src: item.icone, alt: '', width: 18, height: 18 }), item.tipo_nome),
    item.papel !== 'core' ? el('span', { class: 'papel' }, item.papel_nome) : null,
  ].filter(Boolean));
}

function apontar(link, item) {
  link.hidden = !item;
  if (!item) return;
  link.href = hrefDoItem(item);
  link.querySelector('.rotulo-titulo').textContent = item.titulo;
}

function pintarRodape() {
  const rodape = $('rodape-aula');
  rodape.hidden = !atual.item;
  if (!atual.item) return;
  const { anterior, proxima } = vizinhos(niveis, atual.item.id);
  apontar($('aula-anterior'), anterior);
  apontar($('aula-proxima'), proxima);
  const feita = todosFeitos(progresso.feitos(), idsDoDoc(niveis, atual.item.doc));
  const cta = $('aula-cta');
  cta.classList.toggle('feita', feita);
  if (!feita) cta.textContent = proxima ? 'Concluir e avançar' : 'Concluir a trilha';
  else cta.textContent = proxima ? 'Próxima aula →' : 'Ver o mapa da trilha';
}

function aoClicarCta() {
  if (!atual.item) return;
  const ids = idsDoDoc(niveis, atual.item.doc);
  const feita = todosFeitos(progresso.feitos(), ids);
  const { proxima } = vizinhos(niveis, atual.item.id);
  if (!feita) progresso.alternar(ids);
  if (proxima) navegar(hrefDoItem(proxima));
  else if (feita) location.href = 'roadmap.html';
}

// ---- Abrir aula ---------------------------------------------------------------------
function mostrarMensagem(...partes) {
  $('conteudo').replaceChildren(el('p', { class: 'msg' }, ...partes));
}

async function abrir({ path, item }, { foco = false } = {}) {
  atual = { path, item: localizar(niveis, path, item) };
  pintarContexto();
  marcarAtiva();
  pintarRodape();
  const conteudo = $('conteudo');
  conteudo.setAttribute('aria-busy', 'true');
  try {
    // Ponto único por onde passa todo ?path= (URL inicial, links interceptados, voltar/avançar).
    if (!caminhoSeguro(path)) throw new Error('caminho não permitido');
    const r = await fetch(path);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const md = await r.text();
    if (path !== atual.path) return;   // outra aula foi aberta enquanto esta carregava
    if (typeof marked === 'undefined') {
      mostrarMensagem('Não foi possível carregar o leitor de Markdown (CDN bloqueado ou sem internet). ',
        el('a', { href: path }, 'Abrir o arquivo ' + path));
      return;
    }
    conteudo.innerHTML = marked.parse(md);
    idsNosTitulos(conteudo);
    corrigirLinks(conteudo, path);
    desenharDiagramas(conteudo);
    const h1 = conteudo.querySelector('h1');
    document.title = (h1 ? h1.textContent : path) + ' · Trilha de Dashboards · Gov Hub';
    $('fonte').replaceChildren('Fonte: ', el('code', {}, path), ' · ', el('a', { href: path }, 'ver o Markdown'));
    if (atual.item) progresso.registrarUltimaAula(path, atual.item.id);
    const alvo = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (alvo) alvo.scrollIntoView();
    else window.scrollTo(0, 0);
    if (foco && h1) {
      h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: true });
    }
  } catch (e) {
    if (path !== atual.path) return;
    mostrarMensagem('Não foi possível abrir ', el('code', {}, path), ` (${e.message}). `,
      el('a', { href: 'index.html' }, 'Voltar para o início'));
  } finally {
    if (path === atual.path) conteudo.removeAttribute('aria-busy');
  }
}

// ---- Navegação sem recarregar ----------------------------------------------------
function navegar(href) {
  history.pushState(null, '', new URL(href, location.href));
  fecharGaveta();
  abrir(lerUrl(), { foco: true });
}

function interceptarLinks(ev) {
  const a = ev.target.closest('a[href]');
  if (!a || ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || a.target) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || !url.pathname.endsWith('/doc.html') || !url.searchParams.get('path')) return;
  if (url.search === location.search && url.hash) return;   // âncora na mesma aula: o navegador rola
  ev.preventDefault();
  if (url.search === location.search) { fecharGaveta(); return; }   // aula já aberta: sem entrada duplicada no histórico
  navegar(url.href);
}

function aoVoltar() {
  const destino = lerUrl();
  const item = localizar(niveis, destino.path, destino.item);
  const mesmaAula = destino.path === atual.path && (item && item.id) === (atual.item && atual.item.id);
  if (!mesmaAula) abrir(destino);   // se só o #fragmento mudou, o navegador já rolou
}

// ---- Gaveta (celular) -----------------------------------------------------------------
function abrirGaveta() {
  $('sumario').classList.add('aberto');
  $('abrir-sumario').setAttribute('aria-expanded', 'true');
  $('fundo-gaveta').hidden = false;
  const alvo = document.querySelector('.aula.ativa .aula-link') || $('fechar-sumario');
  alvo.focus();
}
function fecharGaveta({ devolverFoco = false } = {}) {
  if (!$('sumario').classList.contains('aberto')) return;
  $('sumario').classList.remove('aberto');
  $('abrir-sumario').setAttribute('aria-expanded', 'false');
  $('fundo-gaveta').hidden = true;
  if (devolverFoco) $('abrir-sumario').focus();
}
function iniciarGaveta() {
  $('abrir-sumario').addEventListener('click', () => {
    if ($('sumario').classList.contains('aberto')) fecharGaveta({ devolverFoco: true });
    else abrirGaveta();
  });
  $('fechar-sumario').addEventListener('click', () => fecharGaveta({ devolverFoco: true }));
  $('fundo-gaveta').addEventListener('click', () => fecharGaveta({ devolverFoco: true }));
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') fecharGaveta({ devolverFoco: true }); });
}

// ---- Início ----------------------------------------------------------------------------
montarConta($('conta'), progresso);
montarAviso(progresso);
try {
  niveis = (await carregarTrilha()).niveis || [];
} catch {
  niveis = [];   // sem trilha.json o leitor ainda abre o Markdown, só sem a barra lateral
}
if (!niveis.length) document.body.classList.add('sem-trilha');
montarSumario();
iniciarGaveta();
$('aula-cta').addEventListener('click', aoClicarCta);
document.addEventListener('click', interceptarLinks);
window.addEventListener('popstate', aoVoltar);
progresso.aoMudar(pintarProgresso);
await abrir(lerUrl());
pintarProgresso();
