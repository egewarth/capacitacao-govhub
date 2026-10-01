import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../roadmap.html', import.meta.url), 'utf8');
const nos = [...html.matchAll(/<div class="node[^"]*" data-id="([^"]+)">(.*?)<\/div><\/div>/g)];

test('cada nó do mapa leva ao leitor com o próprio id', () => {
  assert.ok(nos.length > 0);
  for (const [, id, corpo] of nos) {
    assert.ok(corpo.includes(`&amp;item=${encodeURIComponent(id)}"`), id);
  }
});

test('cada nó mostra o tipo com ícone, sem depender de cor', () => {
  for (const [, id, corpo] of nos) {
    assert.match(corpo, /<span class="tag-tipo"><img src="assets\/icones\/[a-z-]+-sober\.svg" alt="" width="18" height="18">/, id);
  }
});

test('o mapa usa a loja de progresso compartilhada', () => {
  assert.match(html, /<script type="module">[\s\S]*from '\.\/assets\/progresso\.js'/);
  assert.doesNotMatch(html, /localStorage/);
});
