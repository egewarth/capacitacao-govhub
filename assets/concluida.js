// Página de conclusão (concluida.html?trilha=<slug>): parabeniza quem terminou ou lista o que falta.
import { progresso } from './progresso.js';
import { montarConta, montarAviso } from './conta.js';
import { carregarCatalogo, carregarTrilha } from './trilha.js';
import { contar, hrefDoItem, pendentes } from './progresso-nucleo.js';
import { el } from './dom.js';

const $ = (id) => document.getElementById(id);
const MOSTRAR = 3;

montarConta($('conta'), progresso);
montarAviso(progresso);

const pedido = new URLSearchParams(location.search).get('trilha');
let trilha = null;
try {
  const catalogo = await carregarCatalogo();
  if (catalogo.trilhas.some((t) => t.slug === pedido)) trilha = await carregarTrilha(pedido);
} catch { trilha = null; }
if (!trilha) location.replace('index.html');

function pintar() {
  const feitos = progresso.feitos();
  const c = contar(feitos, trilha.niveis);
  const faltam = pendentes(feitos, trilha.niveis);
  const completa = faltam.length === 0;
  const mapa = 'mapa.html?trilha=' + encodeURIComponent(trilha.slug);
  document.title = (completa ? 'Trilha concluída' : 'Fim da trilha') + ' · ' + trilha.titulo + ' · Gov Hub';
  $('titulo').textContent = trilha.titulo;
  $('selo').hidden = !completa;
  $('acoes-completa').hidden = !completa;
  $('pendentes').hidden = completa;
  $('voltar-mapa').href = mapa;
  $('topo-mapa').href = mapa;
  if (completa) {
    $('eyebrow').textContent = 'Trilha concluída';
    $('resumo').textContent = `Você concluiu as ${c.total} aulas dos ${trilha.niveis.length} níveis. Parabéns!`;
    return;
  }
  $('eyebrow').textContent = 'Você chegou ao fim da trilha';
  $('resumo').textContent = `${c.feitas} de ${c.total} aulas concluídas`;
  $('pendentes-titulo').textContent = faltam.length === 1 ? 'Ainda falta 1 aula' : `Ainda faltam ${faltam.length} aulas`;
  const itens = faltam.slice(0, MOSTRAR).map((i) => el('li', {},
    el('a', { href: hrefDoItem(trilha.slug, i) }, i.titulo),
    i.papel !== 'core' ? ' · ' + i.papel_nome : null));
  if (faltam.length > MOSTRAR) itens.push(el('li', {}, `… e mais ${faltam.length - MOSTRAR}`));
  $('pendentes-lista').replaceChildren(...itens);
  $('ver-pendentes').href = mapa;
}

if (trilha) {
  progresso.aoMudar(pintar);
  pintar();
}
