// Mapa da trilha (mapa.html?trilha=<slug>): níveis e aulas montados a partir de docs/trilhas/<slug>.json,
// com o mesmo desenho que o gerador escrevia no antigo roadmap.html.
import { progresso } from './progresso.js';
import { montarConta, montarAviso } from './conta.js';
import { carregarCatalogo, carregarTrilha, escolherTrilha } from './trilha.js';
import { contar, hrefDoItem } from './progresso-nucleo.js';
import { el } from './dom.js';

const $ = (id) => document.getElementById(id);
const CLASSE_TIPO = { tutorial: 't-tut', guia: 't-gui', referencia: 't-ref', explicacao: 't-exp', desafio: 't-des', pesquisa: 't-res' };

function no(slug, item) {
  const classes = ['node', CLASSE_TIPO[item.tipo] || ''];
  if (item.papel === 'support' || item.papel === 'optional') classes.push('support');
  if (item.papel === 'capstone') classes.push('capstone');
  if (item.papel === 'advanced') classes.push('advanced');
  return el('div', { class: classes.join(' ').trim(), 'data-id': item.id },
    el('button', {
      class: 'check', type: 'button', 'aria-pressed': 'false',
      'aria-label': 'Marcar como concluído: ' + item.titulo,
      onclick: (ev) => { ev.preventDefault(); progresso.alternar([item.id]); },
    }),
    el('div', { class: 'node-body' },
      el('a', { class: 'node-title', href: hrefDoItem(slug, item) }, item.titulo),
      el('span', { class: 'meta' },
        el('span', { class: 'tag-tipo' }, el('img', { src: item.icone, alt: '', width: 18, height: 18 }), item.tipo_nome),
        el('span', { class: 'role' }, item.papel_nome))));
}

function montar(slug, trilha) {
  const niveis = trilha.niveis;
  const atalhos = el('nav', { class: 'atalhos', 'aria-label': 'Níveis da trilha' },
    el('span', { class: 'atalhos-rot' }, 'Ir para:'),
    el('div', { class: 'atalhos-lista' }, ...niveis.map((n) =>
      el('a', { href: '#nivel-' + n.numero }, el('b', {}, String(n.numero)), ' ' + n.titulo))));
  const blocos = niveis.map((n) => el('div', { class: 'level' },
    el('div', { class: 'milestone', id: 'nivel-' + n.numero },
      el('span', { class: 'num', 'aria-hidden': 'true' }, String(n.numero)),
      el('div', {},
        el('h2', {}, el('span', { class: 'sr-only' }, `Nível ${n.numero} · `), n.titulo),
        el('p', {}, n.descricao))),
    el('div', { class: 'nodes' }, ...n.itens.map((i) => no(slug, i)))));
  $('roadmap').replaceChildren(
    el('div', { class: 'start' }, 'Comece por aqui'),
    atalhos, ...blocos,
    el('div', { class: 'finish' }, 'Fim da trilha: ' + trilha.titulo));
}

function pintar(trilha) {
  const feitos = progresso.feitos();
  document.querySelectorAll('.node').forEach((n) => {
    const feito = !!feitos[n.dataset.id];
    n.classList.toggle('done', feito);
    n.querySelector('.check').setAttribute('aria-pressed', String(feito));
  });
  const c = contar(feitos, trilha.niveis);
  $('ptxt').textContent = `${c.feitas} de ${c.total} concluídas`;
  $('pfill').style.width = c.percentual + '%';
}

montarConta($('conta'), progresso);
montarAviso(progresso);

const pedido = new URLSearchParams(location.search).get('trilha');
let catalogo = null;
try { catalogo = await carregarCatalogo(); } catch { catalogo = null; }
// mapa.html sem ?trilha= (ou com uma que não existe): a trilha da última aula, senão dashboards, senão a primeira.
const ultima = progresso.ultimaAula();
const slug = [pedido, ultima && ultima.trilha, 'dashboards']
  .find((s) => s && escolherTrilha(catalogo, s) === s) || escolherTrilha(catalogo, null);
let trilha = null;
if (slug) { try { trilha = await carregarTrilha(slug); } catch { trilha = null; } }

if (!trilha) {
  $('trilha-titulo').textContent = 'Trilha não encontrada';
  $('roadmap').replaceChildren(el('p', { class: 'msg-mapa' }, 'Não foi possível carregar esta trilha. ',
    el('a', { href: 'index.html' }, 'Ver todas as trilhas')));
  $('ptxt').textContent = '';
  $('reset').disabled = true;
} else {
  if (pedido !== slug) history.replaceState(null, '', 'mapa.html?trilha=' + encodeURIComponent(slug) + location.hash);
  document.title = trilha.titulo + ' · Mapa da trilha · Gov Hub';
  $('link-mapa').href = 'mapa.html?trilha=' + encodeURIComponent(slug);
  $('trilha-titulo').textContent = trilha.titulo;
  $('trilha-descricao').textContent = trilha.descricao;
  if (trilha.diagrama) {
    $('trilha-diagrama-img').src = trilha.diagrama;
    $('trilha-diagrama-img').alt = '';   // a legenda visível já traz o texto; evita ler duas vezes
    $('trilha-diagrama-legenda').textContent = trilha.diagrama_alt;
    $('trilha-diagrama').hidden = false;
  }
  montar(slug, trilha);
  $('reset').addEventListener('click', () => {
    if (confirm('Apagar todo o seu progresso? Ele vale para todas as trilhas e, com a conta conectada, apaga também na nuvem.')) progresso.zerar();
  });
  progresso.aoMudar(() => pintar(trilha));
  pintar(trilha);
  if (location.hash) { const alvo = document.getElementById(location.hash.slice(1)); if (alvo) alvo.scrollIntoView(); }
}
