// Catálogo de trilhas (index.html): um card por trilha, com o progresso de quem lê.
import { progresso } from './progresso.js';
import { montarConta, montarAviso } from './conta.js';
import { carregarCatalogo } from './trilha.js';
import { el } from './dom.js';

const $ = (id) => document.getElementById(id);
const CATEGORIAS = { negocial: 'Negocial', tecnica: 'Técnica' };
montarConta($('conta'), progresso);
montarAviso(progresso);

let catalogo = null;
try { catalogo = await carregarCatalogo(); } catch { catalogo = null; }

function card(t) {
  const feitos = progresso.feitos();
  const feitas = t.aulas.filter((id) => feitos[id]).length;
  const pct = t.aulas.length ? Math.round((feitas / t.aulas.length) * 100) : 0;
  const ultima = progresso.ultimaAula();
  const mapa = 'mapa.html?trilha=' + encodeURIComponent(t.slug);
  const tituloId = 'trilha-' + t.slug;
  return el('article', { class: 'trilha-card', 'aria-labelledby': tituloId },
    CATEGORIAS[t.categoria] ? el('p', { class: 'categoria ' + t.categoria }, CATEGORIAS[t.categoria]) : null,
    el('h3', { id: tituloId }, t.titulo),
    el('p', {}, t.descricao),
    el('p', { class: 'numeros' }, `${t.aulas.length} aulas · ${t.niveis} níveis`),
    el('div', { class: 'progresso' },
      el('span', {}, pct + '%'),
      el('span', { class: 'barra', 'aria-hidden': 'true' }, el('span', { style: `width:${pct}%` })),
      el('span', { class: 'sr-only' }, `${feitas} de ${t.aulas.length} aulas concluídas`)),
    el('div', { class: 'acoes' },
      el('a', { class: 'btn btn-cta', href: mapa }, feitas ? 'Abrir a trilha' : 'Começar a trilha'),
      ultima && ultima.trilha === t.slug
        ? el('a', { class: 'continuar', href: 'doc.html?trilha=' + encodeURIComponent(t.slug) + '&path=' + ultima.path }, 'Continuar de onde parei')
        : null));
}

function pintar() {
  if (!catalogo || !catalogo.trilhas.length) {
    $('catalogo').replaceChildren(el('p', { class: 'msg' }, 'Não foi possível carregar as trilhas. Tente recarregar a página.'));
    return;
  }
  $('catalogo').replaceChildren(...catalogo.trilhas.map(card));
}

progresso.aoMudar(pintar);
pintar();
