// Lista de trilhas (trilhas.html): um card por trilha, com o progresso de quem lê.
// Trilha com `status: em-breve` aparece desabilitada.
import { progresso } from './progresso.js';
import { montarTopo } from './topo.js';
import { carregarCatalogo } from './trilha.js';
import { el } from './dom.js';

const CATEGORIAS = { negocial: 'Negocial', tecnica: 'Técnica' };
montarTopo(progresso, { ativo: 'trilhas' });

let catalogo = null;
try { catalogo = await carregarCatalogo(); } catch { catalogo = null; }

function card(t) {
  const emBreve = t.status === 'em-breve';
  const feitos = progresso.feitos();
  const feitas = t.aulas.filter((id) => feitos[id]).length;
  const pct = t.aulas.length ? Math.round((feitas / t.aulas.length) * 100) : 0;
  const ultima = progresso.ultimaAula();
  const mapa = 'mapa.html?trilha=' + encodeURIComponent(t.slug);
  const tituloId = 'trilha-' + t.slug;
  return el('article', { class: 'track-card' + (emBreve ? ' track-card-disabled' : ''), 'aria-labelledby': tituloId },
    CATEGORIAS[t.categoria] ? el('span', { class: 'track-badge' }, CATEGORIAS[t.categoria]) : null,
    emBreve ? el('span', { class: 'track-soon-badge' }, 'Em breve disponível') : null,
    el('h2', { id: tituloId }, t.titulo),
    el('p', {}, t.descricao),
    el('div', { class: 'track-meta' }, `${t.aulas.length} aulas · ${t.niveis} níveis`),
    el('div', { class: 'track-progress-row' },
      el('span', { class: 'track-progress-pct', 'aria-hidden': 'true' }, pct + '%'),
      el('div', { class: 'progress-track', 'aria-hidden': 'true' }, el('div', { class: 'progress-fill', style: `width:${pct}%` })),
      el('span', { class: 'sr-only' }, `${feitas} de ${t.aulas.length} aulas concluídas`)),
    emBreve
      ? el('button', { class: 'btn-primario', type: 'button', disabled: true }, 'Em breve disponível')
      : el('a', { class: 'btn-primario', href: mapa }, feitas ? 'Abrir a trilha' : 'Começar a trilha'),
    !emBreve && ultima && ultima.trilha === t.slug
      ? el('a', { class: 'track-continue-link', href: 'doc.html?trilha=' + encodeURIComponent(t.slug) + '&path=' + ultima.path }, 'Continuar de onde parei')
      : null);
}

function pintar() {
  if (!catalogo || !catalogo.trilhas.length) {
    document.getElementById('catalogo').replaceChildren(el('p', { class: 'msg' }, 'Não foi possível carregar as trilhas. Tente recarregar a página.'));
    return;
  }
  document.getElementById('catalogo').replaceChildren(...catalogo.trilhas.map(card));
}

progresso.aoMudar(pintar);
pintar();
