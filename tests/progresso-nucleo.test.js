import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  itensEmOrdem, mesclar, todosFeitos, alternar, idsDoDoc, contar, localizar, vizinhos, hrefDoItem,
} from '../assets/progresso-nucleo.js';

// O glossário aparece duas vezes, como no ROADMAP.md real: o segundo nó ganha o sufixo --2.
const NIVEIS = [
  { numero: 0, titulo: 'Fundamentos', itens: [
    { id: 'explicacao/a', titulo: 'A', doc: 'docs/explicacao/a.md', tipo: 'explicacao', papel: 'core' },
    { id: 'referencia/g', titulo: 'Glossário', doc: 'docs/referencia/g.md', tipo: 'referencia', papel: 'support' },
  ] },
  { numero: 1, titulo: 'Arquitetura', itens: [
    { id: 'explicacao/b', titulo: 'B', doc: 'docs/explicacao/b.md', tipo: 'explicacao', papel: 'core' },
    { id: 'referencia/g--2', titulo: 'Glossário', doc: 'docs/referencia/g.md', tipo: 'referencia', papel: 'support' },
  ] },
];

test('itensEmOrdem achata os níveis na ordem do ROADMAP e anota o nível', () => {
  const ids = itensEmOrdem(NIVEIS).map((i) => `${i.nivel}:${i.id}`);
  assert.deepEqual(ids, ['0:explicacao/a', '0:referencia/g', '1:explicacao/b', '1:referencia/g--2']);
  assert.equal(itensEmOrdem(NIVEIS)[2].nivel_titulo, 'Arquitetura');
});

test('mesclar faz a união e tolera lados vazios', () => {
  assert.deepEqual(mesclar({ a: true }, { b: true }), { a: true, b: true });
  assert.deepEqual(mesclar(null, { b: true }), { b: true });
  assert.deepEqual(mesclar({ a: true, x: false }, undefined), { a: true });
});

test('todosFeitos é falso para lista vazia', () => {
  assert.equal(todosFeitos({ a: true }, []), false);
  assert.equal(todosFeitos({ a: true, b: true }, ['a', 'b']), true);
  assert.equal(todosFeitos({ a: true }, ['a', 'b']), false);
});

test('alternar marca todos se algum falta e desmarca se todos estão marcados', () => {
  const entrada = { 'referencia/g': true };
  const r1 = alternar(entrada, ['referencia/g', 'referencia/g--2']);
  assert.equal(r1.marcou, true);
  assert.deepEqual(r1.feitos, { 'referencia/g': true, 'referencia/g--2': true });
  assert.deepEqual(entrada, { 'referencia/g': true }, 'não muta a entrada');
  const r2 = alternar(r1.feitos, ['referencia/g', 'referencia/g--2']);
  assert.equal(r2.marcou, false);
  assert.deepEqual(r2.feitos, {});
});

test('idsDoDoc devolve todos os nós que apontam para o documento', () => {
  assert.deepEqual(idsDoDoc(NIVEIS, 'docs/referencia/g.md'), ['referencia/g', 'referencia/g--2']);
  assert.deepEqual(idsDoDoc(NIVEIS, 'docs/fora.md'), []);
});

test('contar soma por nível e no total, com percentual arredondado', () => {
  const c = contar({ 'explicacao/a': true, 'referencia/g--2': true, 'lixo/antigo': true }, NIVEIS);
  assert.deepEqual(c.porNivel, { 0: { feitas: 1, total: 2 }, 1: { feitas: 1, total: 2 } });
  assert.equal(c.feitas, 2);
  assert.equal(c.total, 4);
  assert.equal(c.percentual, 50);
  assert.equal(contar({}, []).percentual, 0);
});

test('localizar usa o item quando ele bate com o documento, senão a primeira aparição', () => {
  assert.equal(localizar(NIVEIS, 'docs/referencia/g.md', 'referencia/g--2').id, 'referencia/g--2');
  assert.equal(localizar(NIVEIS, 'docs/referencia/g.md', null).id, 'referencia/g');
  assert.equal(localizar(NIVEIS, 'docs/referencia/g.md', 'explicacao/a').id, 'referencia/g');
  assert.equal(localizar(NIVEIS, 'README.md', null), null);
});

test('vizinhos segue a ordem da trilha e para nas pontas', () => {
  assert.equal(vizinhos(NIVEIS, 'explicacao/a').anterior, null);
  assert.equal(vizinhos(NIVEIS, 'explicacao/a').proxima.id, 'referencia/g');
  assert.equal(vizinhos(NIVEIS, 'explicacao/b').anterior.id, 'referencia/g');
  assert.equal(vizinhos(NIVEIS, 'referencia/g--2').proxima, null);
  assert.deepEqual(vizinhos(NIVEIS, 'nao-existe'), { anterior: null, proxima: null });
});

test('hrefDoItem leva o id do nó codificado', () => {
  assert.equal(hrefDoItem(NIVEIS[1].itens[1]), 'doc.html?path=docs/referencia/g.md&item=referencia%2Fg--2');
});
