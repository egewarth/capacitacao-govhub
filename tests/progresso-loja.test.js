import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarLoja, CHAVE_ANONIMO, CHAVE_ULTIMA_ANONIMO, CHAVE_CONTA } from '../assets/progresso-loja.js';

const esperar = () => new Promise((r) => setTimeout(r, 0));
const ANA = { uid: 'ana', nome: 'Ana Souza', email: 'ana@exemplo.gov.br', foto: null };
const BETO = { uid: 'beto', nome: 'Beto', email: null, foto: null };

function armazenamentoFalso(inicial = {}) {
  const m = new Map(Object.entries(inicial).map(([k, v]) => [k, JSON.stringify(v)]));
  return {
    get: (k) => (m.has(k) ? m.get(k) : null),
    set: (k, v) => { m.set(k, v); },
    remove: (k) => { m.delete(k); },
    json: (k) => (m.has(k) ? JSON.parse(m.get(k)) : null),
  };
}

// Firestore de mentira: guarda os documentos em memória e entrega cada mudança aos ouvintes,
// como o onSnapshot faz.
function nuvemFalsa(docs = {}) {
  let aoUsuario = () => {};
  const ouvintes = new Map();
  const copia = (uid) => (docs[uid] ? structuredClone(docs[uid]) : { feitos: {}, ultimaAula: null });
  const notificar = (uid) => { const cb = ouvintes.get(uid); if (cb) cb(copia(uid)); };
  const nuvem = {
    docs, chamadas: [], recusar: false,
    aoMudarUsuario(cb) { aoUsuario = cb; },
    async entrar() {},
    async sair() { aoUsuario(null); },
    segurarLeituras: false, pendentes: [],
    async ler(uid) {
      const agora = () => (docs[uid] ? structuredClone(docs[uid]) : null);
      if (!nuvem.segurarLeituras) return agora();
      return new Promise((r) => { nuvem.pendentes.push(() => r(agora())); });
    },
    async gravarTudo(uid, dados) { nuvem.chamadas.push('gravarTudo'); docs[uid] = structuredClone(dados); notificar(uid); },
    async marcar(uid, ids, valor) {
      nuvem.chamadas.push('marcar');
      if (nuvem.recusar) throw Object.assign(new Error('recusado'), { code: 'permission-denied' });
      const d = docs[uid] || (docs[uid] = { feitos: {}, ultimaAula: null });
      for (const id of ids) { if (valor) d.feitos[id] = true; else delete d.feitos[id]; }
      notificar(uid);
    },
    async gravarUltimaAula(uid, ultima) {
      nuvem.chamadas.push('gravarUltimaAula');
      (docs[uid] || (docs[uid] = { feitos: {}, ultimaAula: null })).ultimaAula = ultima;
    },
    ouvir(uid, cb) { ouvintes.set(uid, cb); cb(copia(uid)); return () => ouvintes.delete(uid); },
    logar(usuario) { aoUsuario(usuario); },
  };
  return nuvem;
}

async function lojaLogada({ anonimo = {}, docs = {} } = {}) {
  const arm = armazenamentoFalso(anonimo);
  const nuvem = nuvemFalsa(docs);
  const loja = criarLoja({ armazenamento: arm, criarNuvem: async () => nuvem });
  await loja.iniciar();
  nuvem.logar(ANA);
  await esperar();
  return { arm, nuvem, loja };
}

test('sem nuvem, o progresso fica na chave anônima de sempre', async () => {
  const arm = armazenamentoFalso({ [CHAVE_ANONIMO]: { 'explicacao/a': true } });
  const loja = criarLoja({ armazenamento: arm });
  await loja.iniciar();
  assert.deepEqual(loja.feitos(), { 'explicacao/a': true });
  assert.equal(loja.alternar(['explicacao/b']), true);
  assert.deepEqual(arm.json(CHAVE_ANONIMO), { 'explicacao/a': true, 'explicacao/b': true });
  assert.equal(loja.nuvemDisponivel(), false);
  assert.equal(loja.usuario(), null);
});

test('sem nuvem, um cache de conta antigo é descartado', async () => {
  const arm = armazenamentoFalso({ [CHAVE_CONTA]: { uid: 'ana', usuario: ANA, feitos: { x: true }, ultimaAula: null } });
  const loja = criarLoja({ armazenamento: arm, criarNuvem: async () => null });
  await loja.iniciar();
  assert.equal(loja.usuario(), null);
  assert.deepEqual(loja.feitos(), {});
  assert.equal(arm.get(CHAVE_CONTA), null);
});

test('ao entrar, o progresso anônimo é somado à conta e sai do navegador', async () => {
  const { arm, nuvem, loja } = await lojaLogada({
    anonimo: { [CHAVE_ANONIMO]: { a: true }, [CHAVE_ULTIMA_ANONIMO]: { path: 'docs/a.md', item: 'a' } },
    docs: { ana: { feitos: { b: true }, ultimaAula: null } },
  });
  assert.deepEqual(loja.feitos(), { a: true, b: true });
  assert.deepEqual(nuvem.docs.ana.feitos, { a: true, b: true });
  assert.deepEqual(loja.ultimaAula(), { path: 'docs/a.md', item: 'a' });
  assert.equal(arm.get(CHAVE_ANONIMO), null);
  assert.equal(arm.get(CHAVE_ULTIMA_ANONIMO), null);
  assert.equal(arm.json(CHAVE_CONTA).uid, 'ana');
  assert.equal(loja.usuario().uid, 'ana');
});

test('entrar sem progresso anônimo não regrava a conta', async () => {
  const { nuvem, loja } = await lojaLogada({ docs: { ana: { feitos: { b: true }, ultimaAula: { path: 'docs/b.md', item: 'b' } } } });
  assert.deepEqual(nuvem.chamadas, []);
  assert.deepEqual(loja.feitos(), { b: true });
  assert.deepEqual(loja.ultimaAula(), { path: 'docs/b.md', item: 'b' });
});

test('a primeira entrada de uma conta nova cria o documento', async () => {
  const { nuvem } = await lojaLogada();
  assert.deepEqual(nuvem.chamadas, ['gravarTudo']);
  assert.deepEqual(nuvem.docs.ana, { feitos: {}, ultimaAula: null });
});

test('ao sair, o cache da conta é apagado e o navegador fica vazio', async () => {
  const { arm, loja } = await lojaLogada({ docs: { ana: { feitos: { b: true }, ultimaAula: null } } });
  await loja.sair();
  assert.equal(loja.usuario(), null);
  assert.deepEqual(loja.feitos(), {});
  assert.equal(loja.ultimaAula(), null);
  assert.equal(arm.get(CHAVE_CONTA), null);
  assert.equal(arm.get(CHAVE_ANONIMO), null);
});

test('marcar com sessão grava na nuvem e no cache, não na chave anônima', async () => {
  const { arm, nuvem, loja } = await lojaLogada({ docs: { ana: { feitos: {}, ultimaAula: null } } });
  loja.alternar(['g', 'g--2']);
  await esperar();
  assert.deepEqual(nuvem.docs.ana.feitos, { g: true, 'g--2': true });
  assert.deepEqual(arm.json(CHAVE_CONTA).feitos, { g: true, 'g--2': true });
  assert.equal(arm.get(CHAVE_ANONIMO), null);
});

test('gravação recusada desfaz a marcação otimista e avisa', async () => {
  const { nuvem, loja } = await lojaLogada({ docs: { ana: { feitos: {}, ultimaAula: null } } });
  const avisos = [];
  loja.aoAviso((t) => avisos.push(t));
  nuvem.recusar = true;
  loja.alternar(['a']);
  assert.deepEqual(loja.feitos(), { a: true }, 'otimista: marca na hora');
  await esperar();
  assert.deepEqual(loja.feitos(), {});
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /entre de novo/);
});

test('mudança vinda de outro dispositivo atualiza a loja e avisa os ouvintes', async () => {
  const { nuvem, loja } = await lojaLogada({ docs: { ana: { feitos: {}, ultimaAula: null } } });
  let chamadas = 0;
  loja.aoMudar(() => { chamadas += 1; });
  await nuvem.marcar('ana', ['z'], true);
  assert.equal(loja.feitos().z, true);
  assert.ok(chamadas > 0);
});

test('sessão restaurada mostra o cache antes de a nuvem responder', async () => {
  const arm = armazenamentoFalso({ [CHAVE_CONTA]: { uid: 'ana', usuario: ANA, feitos: { a: true }, ultimaAula: null } });
  let liberar;
  const loja = criarLoja({ armazenamento: arm, criarNuvem: () => new Promise((r) => { liberar = r; }) });
  const iniciando = loja.iniciar();
  await esperar();
  assert.equal(loja.usuario().uid, 'ana');
  assert.deepEqual(loja.feitos(), { a: true });
  liberar(null);
  await iniciando;
});

test('cache de outra conta nunca é somado à conta que entrou', async () => {
  const arm = armazenamentoFalso({ [CHAVE_CONTA]: { uid: 'beto', usuario: BETO, feitos: { x: true }, ultimaAula: null } });
  const nuvem = nuvemFalsa({ ana: { feitos: { b: true }, ultimaAula: null } });
  const loja = criarLoja({ armazenamento: arm, criarNuvem: async () => nuvem });
  await loja.iniciar();
  nuvem.logar(ANA);
  await esperar();
  assert.deepEqual(loja.feitos(), { b: true });
  assert.deepEqual(nuvem.docs.ana.feitos, { b: true });
  assert.equal(arm.json(CHAVE_CONTA).uid, 'ana');
});

test('última aula: anônima fica no navegador; com sessão vai para a nuvem', async () => {
  const arm = armazenamentoFalso();
  const anon = criarLoja({ armazenamento: arm });
  await anon.iniciar();
  anon.registrarUltimaAula('docs/a.md', 'a');
  assert.deepEqual(arm.json(CHAVE_ULTIMA_ANONIMO), { path: 'docs/a.md', item: 'a' });

  const { nuvem, loja } = await lojaLogada({ docs: { ana: { feitos: {}, ultimaAula: null } } });
  loja.registrarUltimaAula('docs/b.md', null);
  await esperar();
  assert.deepEqual(nuvem.docs.ana.ultimaAula, { path: 'docs/b.md', item: null });
});

test('zerar com sessão apaga também na nuvem', async () => {
  const { nuvem, loja } = await lojaLogada({ docs: { ana: { feitos: { a: true }, ultimaAula: null } } });
  loja.zerar();
  await esperar();
  assert.deepEqual(loja.feitos(), {});
  assert.deepEqual(nuvem.docs.ana.feitos, {});
});

test('outra aba mexeu no progresso anônimo: recarregar relê o navegador', async () => {
  const arm = armazenamentoFalso();
  const loja = criarLoja({ armazenamento: arm });
  await loja.iniciar();
  arm.set(CHAVE_ANONIMO, JSON.stringify({ c: true }));
  loja.recarregar(CHAVE_ANONIMO);
  assert.deepEqual(loja.feitos(), { c: true });
});

async function lojaComLeituraSegura(docs, anonimo = {}) {
  const arm = armazenamentoFalso(anonimo);
  const nuvem = nuvemFalsa(docs);
  const loja = criarLoja({ armazenamento: arm, criarNuvem: async () => nuvem });
  await loja.iniciar();
  nuvem.segurarLeituras = true;
  return { arm, nuvem, loja };
}

test('sair enquanto a conta carrega: a sessão antiga não revive', async () => {
  const { arm, nuvem, loja } = await lojaComLeituraSegura({ ana: { feitos: { b: true }, ultimaAula: null } });
  nuvem.logar(ANA);
  await esperar();
  await loja.sair();
  nuvem.pendentes.forEach((f) => f());
  await esperar();
  assert.equal(loja.usuario(), null);
  assert.equal(arm.get(CHAVE_CONTA), null);
  assert.deepEqual(arm.json(CHAVE_ANONIMO) || {}, {});
  await nuvem.marcar('ana', ['z'], true);
  assert.deepEqual(loja.feitos(), {});
  assert.deepEqual(arm.json(CHAVE_ANONIMO) || {}, {});
});

test('trocar de conta enquanto a anterior carrega: vale a última', async () => {
  const { arm, nuvem, loja } = await lojaComLeituraSegura({
    ana: { feitos: { a: true }, ultimaAula: null },
    beto: { feitos: { b: true }, ultimaAula: null },
  });
  nuvem.logar(ANA);
  await esperar();
  nuvem.logar(BETO);
  await esperar();
  nuvem.pendentes.reverse().forEach((f) => f());   // a leitura de Beto chega antes da de Ana
  await esperar();
  assert.equal(loja.usuario().uid, 'beto');
  assert.deepEqual(loja.feitos(), { b: true });
  assert.equal(arm.json(CHAVE_CONTA).uid, 'beto');
  await nuvem.marcar('ana', ['z'], true);
  assert.deepEqual(loja.feitos(), { b: true });
});

test('aula marcada durante o login não se perde', async () => {
  const { nuvem, loja } = await lojaComLeituraSegura({ ana: { feitos: { b: true }, ultimaAula: null } });
  nuvem.logar(ANA);
  await esperar();
  loja.alternar(['nova']);
  nuvem.pendentes.forEach((f) => f());
  await esperar();
  assert.equal(nuvem.docs.ana.feitos.nova, true);
  assert.equal(loja.feitos().nova, true);
  assert.equal(loja.feitos().b, true);
});
