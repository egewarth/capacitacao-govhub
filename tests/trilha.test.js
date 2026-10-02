import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escolherTrilha, trilhaParaDoc } from '../assets/trilha.js';

const catalogo = {
  trilhas: [
    { slug: 'analise', aulas: ['explicacao/a', 'explicacao/comum'] },
    { slug: 'dashboards', aulas: ['explicacao/b', 'explicacao/comum'] },
    { slug: 'zeta', aulas: ['explicacao/z', 'explicacao/so-em-duas'] },
    { slug: 'omega', aulas: ['explicacao/so-em-duas'] },
  ],
};

test('escolherTrilha: slug pedido quando existe no catálogo', () => {
  assert.equal(escolherTrilha(catalogo, 'zeta'), 'zeta');
});

test('escolherTrilha: slug desconhecido ou ausente cai na primeira trilha', () => {
  assert.equal(escolherTrilha(catalogo, 'nao-existe'), 'analise');
  assert.equal(escolherTrilha(catalogo, null), 'analise');
});

test('escolherTrilha: catálogo nulo ou vazio dá null', () => {
  assert.equal(escolherTrilha(null, 'dashboards'), null);
  assert.equal(escolherTrilha({ trilhas: [] }, 'dashboards'), null);
});

test('trilhaParaDoc: a preferida vale se tiver a aula', () => {
  assert.equal(trilhaParaDoc(catalogo, 'explicacao/comum', 'analise'), 'analise');
});

test('trilhaParaDoc: aula em duas trilhas sem preferida vai para dashboards', () => {
  assert.equal(trilhaParaDoc(catalogo, 'explicacao/comum'), 'dashboards');
  assert.equal(trilhaParaDoc(catalogo, 'explicacao/comum', null), 'dashboards');
});

test('trilhaParaDoc: preferida sem a aula é ignorada', () => {
  assert.equal(trilhaParaDoc(catalogo, 'explicacao/a', 'dashboards'), 'analise');
  assert.equal(trilhaParaDoc(catalogo, 'explicacao/b', 'analise'), 'dashboards');
  assert.equal(trilhaParaDoc(catalogo, 'explicacao/b', 'nao-existe'), 'dashboards');
});

test('trilhaParaDoc: fora de dashboards, a primeira trilha (ordem do catálogo) que tem a aula', () => {
  assert.equal(trilhaParaDoc(catalogo, 'explicacao/so-em-duas'), 'zeta');
  assert.equal(trilhaParaDoc(catalogo, 'explicacao/so-em-duas', 'omega'), 'omega');
});

test('trilhaParaDoc: aula em nenhuma trilha cai em escolherTrilha', () => {
  assert.equal(trilhaParaDoc(catalogo, 'explicacao/solta'), 'analise');
  assert.equal(trilhaParaDoc(catalogo, 'explicacao/solta', 'zeta'), 'zeta');
  assert.equal(trilhaParaDoc(catalogo, 'explicacao/solta', 'nao-existe'), 'analise');
});

test('trilhaParaDoc: catálogo nulo dá null; trilha sem lista de aulas não quebra', () => {
  assert.equal(trilhaParaDoc(null, 'explicacao/b', 'dashboards'), null);
  assert.equal(trilhaParaDoc({ trilhas: [{ slug: 'x' }] }, 'explicacao/b'), 'x');
});
