import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
const trilha = JSON.parse(ler('docs/trilhas/trilha.json'));
const TIPOS = ['tutorial', 'guia', 'referencia', 'explicacao', 'desafio', 'pesquisa'];
const PAPEIS = ['core', 'support', 'capstone', 'optional', 'advanced'];

test('trilha.json traz os níveis em ordem, cada um com itens completos', () => {
  assert.ok(Array.isArray(trilha.niveis) && trilha.niveis.length > 0);
  trilha.niveis.forEach((nivel, i) => {
    assert.equal(nivel.numero, i, 'níveis numerados de 0 em diante, sem buracos');
    assert.ok(nivel.titulo && nivel.descricao);
    for (const item of nivel.itens) {
      assert.ok(item.id && item.titulo && item.doc.startsWith('docs/'), JSON.stringify(item));
      assert.ok(TIPOS.includes(item.tipo), item.tipo);
      assert.ok(PAPEIS.includes(item.papel), item.papel);
      assert.ok(item.tipo_nome && item.papel_nome);
      assert.match(item.icone, /^assets\/icones\/[a-z-]+-sober\.svg$/);
    }
  });
});

test('ids dos itens são os data-id do roadmap.html, na mesma ordem', () => {
  const doMapa = [...ler('roadmap.html').matchAll(/data-id="([^"]+)"/g)].map((m) => m[1]);
  const daTrilha = trilha.niveis.flatMap((n) => n.itens.map((i) => i.id));
  assert.deepEqual(daTrilha, doMapa);
});

test('todo documento da trilha existe', () => {
  for (const nivel of trilha.niveis) for (const item of nivel.itens) assert.doesNotThrow(() => ler(item.doc), item.doc);
});
