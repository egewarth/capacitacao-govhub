# Leitor da trilha com Firebase e identidade sóbria — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar `doc.html` em um leitor estilo Hotmart (barra lateral com níveis e aulas marcáveis), salvar o progresso no Firestore com login Google opcional e aplicar a identidade sóbria do Gov Hub em todo o site.

**Architecture:** Site estático, sem build. A lógica de progresso fica em módulos ES em `assets/`: um núcleo de funções puras (`progresso-nucleo.js`), uma loja que orquestra navegador × nuvem sem conhecer DOM nem Firebase (`progresso-loja.js`), um adaptador do Firebase carregado por CDN (`progresso-nuvem.js`) e a instância compartilhada pelas páginas (`progresso.js`). A trilha vem de `docs/trilhas/trilha.json`, gerado do `ROADMAP.md` por `tools/gen_roadmap.py`.

**Tech Stack:** HTML/CSS/JS puro (módulos ES), Python 3 (gerador), Node 20+ só para `node --test`, Firebase JS SDK 12.19.0 (gstatic CDN), marked + mermaid (jsDelivr, já usados).

**Spec:** `docs/superpowers/specs/2026-10-01-leitor-trilha-firebase-design.md`

## Global Constraints

- Sem etapa de build; o GitHub Pages publica o repositório como está.
- `ROADMAP.md` continua sendo a fonte única da trilha; `roadmap.html` (região ROADMAP), `index.html` (região LEVELS), `docs/trilhas/index.md`, `docs/trilhas/trilha.json` e o `.xmind` são gerados — rode `python3 tools/gen_roadmap.py` sempre que mexer no gerador e commite o resultado.
- O texto das aulas (`docs/**/*.md`) não muda.
- Cores só da paleta sóbria: roxo `#613EFF`, navy `#0A005A`, claro `#F2F1F6`, acento `#BE006E` (só em CTA/detalhe), estados `#5235D9`/`#3F28A6`, texto `#202020`/`#2D3748`/`#666666`, borda `#E9DFFF`, branco. Nenhuma página declara hex próprio: use as variáveis de `assets/govhub.css`. Exceções documentadas: tema do Mermaid (JS precisa de literais) e o painel "Tudo colorido" da ilustração `atencao-visual.svg` (é o conteúdo do exemplo).
- Fonte: Reddit Sans (Google Fonts), pesos 400–800. Títulos 800, `letter-spacing:-0.025em`.
- Contraste: branco sobre roxo/navy/`#BE006E`; navy sobre branco/`#F2F1F6`; roxo pequeno sobre branco usa `#3F28A6`; nunca roxo sobre navy.
- Chaves de `localStorage`: anônimo `govhub-dashboards-roadmap-v1` (formato `{id: true}`, inalterado), última aula anônima `govhub-dashboards-ultima-aula`, cache da conta `govhub-dashboards-progresso-conta`.
- Ids dos nós: caminho sem `docs/` e sem `.md`; repetições ganham `--2`, `--3`… (iguais ao `data-id` atual).
- Firestore: coleção `progresso`, documento `{uid}`, campos `feitos` (map), `ultimaAula` (`{path, item}` ou `null`), `atualizadoEm` (timestamp).
- Commits em português no estilo do repositório (`site: …`, `docs: …`, `tools: …`), terminando com `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Diretório de rascunho para capturas de tela: `/tmp/claude-1000/-home-joaoegewarth-capacitacao-govhub/a78f0449-cf56-4247-a4a2-79403ad33f87/scratchpad` (abaixo, `$RASCUNHO`).
- Navegador headless para verificação: `~/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell` (abaixo, `$CHROME`).

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `package.json` (novo) | `"type": "module"` para o Node tratar `assets/*.js` como ES modules nos testes |
| `assets/progresso-nucleo.js` (novo) | Funções puras: ordem, contagem, vizinhos, mescla, alternância |
| `assets/progresso-loja.js` (novo) | Estado do progresso; navegador × nuvem; login/logout; avisos |
| `assets/progresso-nuvem.js` (novo) | Adaptador Firebase Auth + Firestore (SDK por CDN) |
| `assets/firebase-config.js` (novo) | `firebaseConfig` (vazio no repositório) |
| `assets/progresso.js` (novo) | Instância única da loja para as páginas, ligada ao `localStorage` |
| `assets/trilha.js` (novo) | Carrega `docs/trilhas/trilha.json` uma vez |
| `assets/dom.js` (novo) | `el()` — monta elementos sem `innerHTML` |
| `assets/conta.js` (novo) | Botão "Entrar com Google"/menu da conta e aviso de sincronização |
| `assets/leitor.js`, `assets/leitor.css` (novos) | Leitor: barra lateral, aula, sequência, gaveta móvel |
| `assets/govhub.css` (reescrito) | Tokens sóbrios + componentes comuns |
| `assets/logo/*.svg`, `assets/favicon.svg`, `assets/icones/*-sober.svg` (novos) | Marca e ícones de tipo |
| `doc.html`, `roadmap.html`, `index.html` | Páginas |
| `tools/gen_roadmap.py` | `niveis` no `trilha.json`; markup novo dos nós |
| `firestore.rules`, `firebase.json` (novos) | Regras de segurança e config do Firebase CLI |
| `tests/*.test.js` (novos) | Testes `node --test` |
| `docs/adr/0003-*.md`, `docs/adr/0004-*.md` (novos), `README.md`, `.github/workflows/publicar.yml` | Registro, instruções e CI |

---

### Task 1: Núcleo do progresso (funções puras) + testes no CI

**Files:**
- Create: `package.json`
- Create: `assets/progresso-nucleo.js`
- Test: `tests/progresso-nucleo.test.js`
- Modify: `.github/workflows/publicar.yml` (job `verificar`)

**Interfaces:**
- Consumes: nada.
- Produces (ES module `assets/progresso-nucleo.js`), onde `niveis` é `Array<{numero:number, titulo:string, descricao?:string, itens:Array<Item>}>` e `Item` é `{id, titulo, doc, tipo, tipo_nome, papel, papel_nome, icone}`; `feitos` é `{[id]: true}`:
  - `itensEmOrdem(niveis) → Array<Item & {nivel:number, nivel_titulo:string}>`
  - `mesclar(a, b) → feitos` (união; aceita `null`/`undefined`)
  - `todosFeitos(feitos, ids) → boolean` (`false` para `ids` vazio)
  - `alternar(feitos, ids) → {feitos, marcou:boolean}` (não muta a entrada)
  - `idsDoDoc(niveis, doc) → string[]`
  - `contar(feitos, niveis) → {feitas, total, percentual, porNivel: {[numero]: {feitas, total}}}`
  - `localizar(niveis, doc, itemId?) → Item&{nivel,nivel_titulo} | null`
  - `vizinhos(niveis, itemId) → {anterior: Item|null, proxima: Item|null}`
  - `hrefDoItem(item) → 'doc.html?path=<doc>&item=<encodeURIComponent(id)>'`

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "capacitacao-govhub",
  "private": true,
  "type": "module",
  "description": "Site estático da trilha de dashboards. Este arquivo só existe para os testes (node --test).",
  "scripts": {
    "test": "node --test tests/*.test.js"
  }
}
```

- [ ] **Step 2: Escrever o teste que falha — `tests/progresso-nucleo.test.js`**

```js
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
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `node --test tests/*.test.js`
Expected: FAIL — `Cannot find module '.../assets/progresso-nucleo.js'`.

- [ ] **Step 4: Implementar `assets/progresso-nucleo.js`**

```js
// Regras do progresso da trilha: puras, sem DOM, sem armazenamento e sem Firebase.
// Usadas pela loja (progresso-loja.js), pelas páginas e pelos testes em Node.
// `niveis` vem de docs/trilhas/trilha.json; `feitos` é o mapa {id do nó: true}.

export function itensEmOrdem(niveis) {
  const lista = [];
  for (const nivel of niveis) {
    for (const item of nivel.itens) {
      lista.push({ ...item, nivel: nivel.numero, nivel_titulo: nivel.titulo });
    }
  }
  return lista;
}

export function mesclar(a, b) {
  const uniao = {};
  for (const fonte of [a || {}, b || {}]) {
    for (const id of Object.keys(fonte)) if (fonte[id]) uniao[id] = true;
  }
  return uniao;
}

export function todosFeitos(feitos, ids) {
  return ids.length > 0 && ids.every((id) => !!feitos[id]);
}

// Um documento pode estar em mais de um nó: marcar ou desmarcar vale para todos eles.
export function alternar(feitos, ids) {
  const marcou = !todosFeitos(feitos, ids);
  const novo = { ...feitos };
  for (const id of ids) {
    if (marcou) novo[id] = true;
    else delete novo[id];
  }
  return { feitos: novo, marcou };
}

export function idsDoDoc(niveis, doc) {
  return itensEmOrdem(niveis).filter((i) => i.doc === doc).map((i) => i.id);
}

export function contar(feitos, niveis) {
  let feitas = 0;
  let total = 0;
  const porNivel = {};
  for (const nivel of niveis) {
    const n = nivel.itens.filter((i) => feitos[i.id]).length;
    porNivel[nivel.numero] = { feitas: n, total: nivel.itens.length };
    feitas += n;
    total += nivel.itens.length;
  }
  return { feitas, total, porNivel, percentual: total ? Math.round((feitas / total) * 100) : 0 };
}

// O `item` da URL situa a posição quando o documento aparece em mais de um nó;
// sem ele (links antigos), vale a primeira aparição.
export function localizar(niveis, doc, itemId) {
  const lista = itensEmOrdem(niveis);
  if (itemId) {
    const exato = lista.find((i) => i.id === itemId && i.doc === doc);
    if (exato) return exato;
  }
  return lista.find((i) => i.doc === doc) || null;
}

export function vizinhos(niveis, itemId) {
  const lista = itensEmOrdem(niveis);
  const i = lista.findIndex((x) => x.id === itemId);
  if (i < 0) return { anterior: null, proxima: null };
  return { anterior: lista[i - 1] || null, proxima: lista[i + 1] || null };
}

export function hrefDoItem(item) {
  return 'doc.html?path=' + item.doc + '&item=' + encodeURIComponent(item.id);
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `node --test tests/*.test.js`
Expected: PASS — 9 testes, 0 falhas.

- [ ] **Step 6: Rodar os testes no CI**

Confira a versão atual da action: `gh api repos/actions/setup-node/releases/latest --jq .tag_name` (use a major retornada; abaixo, `v6`). Em `.github/workflows/publicar.yml`, no job `verificar`, logo depois do passo `actions/setup-python`, acrescente:

```yaml
      - uses: actions/setup-node@v6
        with:
          node-version: '22'

      - name: Testes do progresso e da trilha
        run: node --test tests/*.test.js
```

- [ ] **Step 7: Commit**

```bash
git add package.json assets/progresso-nucleo.js tests/progresso-nucleo.test.js .github/workflows/publicar.yml
git commit -m "site: núcleo do progresso da trilha, com testes no CI

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `trilha.json` com a lista ordenada de níveis

**Files:**
- Modify: `tools/gen_roadmap.py` (`TYPE_INFO`, novo `node_ids`, `scaffold_missing`, `gen_html` só no desempacotamento, `gen_trilha_json`)
- Regenerate: `docs/trilhas/trilha.json` (e os demais gerados, que não devem mudar de conteúdo)
- Test: `tests/trilha-json.test.js`

**Interfaces:**
- Consumes: nada de JS.
- Produces: `docs/trilhas/trilha.json` com chave `niveis: [{numero, titulo, descricao, itens: [{id, titulo, doc, tipo, tipo_nome, papel, papel_nome, icone}]}]`. `tipo` ∈ `tutorial|guia|referencia|explicacao|desafio|pesquisa`; `papel` ∈ `core|support|capstone|optional|advanced`; `icone` = `assets/icones/<nome>-sober.svg`. Em Python: `TYPE_INFO[tipo] = (rótulo, classe, pasta, slug, ícone)` e `node_ids(levels) → list[str]`.

- [ ] **Step 1: Escrever o teste que falha — `tests/trilha-json.test.js`**

```js
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/trilha-json.test.js`
Expected: FAIL — `trilha.niveis` é `undefined`.

- [ ] **Step 3: Ajustar `TYPE_INFO` e os desempacotamentos em `tools/gen_roadmap.py`**

Troque o bloco `TYPE_INFO` por:

```python
# tipo -> (rótulo, classe CSS, pasta padrão, slug/template do esqueleto, ícone do tipo)
# O ícone é um ícone de produto Gov Hub (variante -sober) copiado para assets/icones/:
# os tipos se distinguem por ícone e nome, não por cor (ADR 0003).
TYPE_INFO = {
    "tutorial":    ("Tutorial",   "t-tut", "tutoriais",  "tutorial",   "assets/icones/book-open-sober.svg"),
    "how-to":      ("Guia",       "t-gui", "guias",      "guia",       "assets/icones/wrench-sober.svg"),
    "reference":   ("Referência", "t-ref", "referencia", "referencia", "assets/icones/document-text-sober.svg"),
    "explanation": ("Explicação", "t-exp", "explicacao", "explicacao", "assets/icones/light-bulb-sober.svg"),
    "challenge":   ("Desafio",    "t-des", "desafios",   "desafio",    "assets/icones/trophy-sober.svg"),
    "research":    ("Pesquisa",   "t-res", "pesquisa",   "pesquisa",   "assets/icones/beaker-sober.svg"),
}
```

Em `scaffold_missing`, troque `label, _cls, _folder, tpl = TYPE_INFO[it["type"]]` por:

```python
            label, _cls, _folder, tpl, _icone = TYPE_INFO[it["type"]]
```

Em `gen_html` → `node`, troque `label, cls, _f, _t = TYPE_INFO[it["type"]]` por:

```python
        label, cls = TYPE_INFO[it["type"]][:2]
```

Logo depois de `def data_id(doc): ...`, acrescente:

```python
def node_ids(levels):
    """Id de cada nó, na ordem da trilha: o caminho sem docs/ e .md, com --N nas repetições.

    É a chave do progresso (localStorage e Firestore) — mudar esta regra apaga o
    progresso de quem já marcou aulas.
    """
    seen, ids = {}, []
    for lv in levels:
        for it in lv["items"]:
            base = data_id(it["doc"])
            seen[base] = seen.get(base, 0) + 1
            ids.append(base if seen[base] == 1 else "%s--%d" % (base, seen[base]))
    return ids
```

- [ ] **Step 4: Reescrever `gen_trilha_json`**

```python
def gen_trilha_json(levels):
    """Índice da trilha consumido pelo leitor (doc.html), pelo mapa e pela página inicial.

    `niveis` é a trilha na ordem do ROADMAP.md: monta a barra lateral do leitor e a
    sequência anterior/próxima. `documentos` responde "quais nós apontam para este .md"
    — um documento pode aparecer em mais de um nó, daí `ids` ser uma lista.
    """
    ids = iter(node_ids(levels))
    docs, ordem, niveis = {}, [], []
    for lv in levels:
        itens = []
        for it in lv["items"]:
            node_id = next(ids)
            label, _cls, _folder, slug, icone = TYPE_INFO[it["type"]]
            itens.append({
                "id": node_id, "titulo": it["title"], "doc": it["doc"],
                "tipo": slug, "tipo_nome": label,
                "papel": it["role"], "papel_nome": ROLE_DISPLAY[it["role"]],
                "icone": icone,
            })
            if it["doc"] not in docs:
                docs[it["doc"]] = {
                    "doc": it["doc"], "ids": [], "titulo": it["title"],
                    "tipo": label, "papel": ROLE_DISPLAY[it["role"]],
                    "nivel": lv["num"], "nivel_titulo": lv["title"],
                }
                ordem.append(it["doc"])
            docs[it["doc"]]["ids"].append(node_id)
        niveis.append({"numero": lv["num"], "titulo": lv["title"],
                       "descricao": lv["desc"], "itens": itens})

    dados = {
        "_aviso": "Gerado por tools/gen_roadmap.py a partir de ROADMAP.md - nao edite a mao.",
        "chave_progresso": PROGRESS_KEY,
        "niveis": niveis,
        "documentos": [docs[d] for d in ordem],
    }
    open(OUT_TRILHA_JSON, "w", encoding="utf-8").write(
        json.dumps(dados, ensure_ascii=False, indent=2) + "\n")
    return len(ordem)
```

- [ ] **Step 5: Regenerar e conferir que só o `trilha.json` mudou**

Run: `python3 tools/gen_roadmap.py && git status --porcelain -- roadmap.html index.html docs/`
Expected: só ` M docs/trilhas/trilha.json` (o `.xmind` muda sempre e é ignorado pelo CI).

- [ ] **Step 6: Rodar os testes**

Run: `node --test tests/*.test.js`
Expected: PASS em todos.

- [ ] **Step 7: Commit**

```bash
git add tools/gen_roadmap.py docs/trilhas/trilha.json tests/trilha-json.test.js roadmap-dashboards.xmind
git commit -m "tools: trilha.json passa a trazer os níveis em ordem para o leitor

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Identidade sóbria — tokens, marca, ícones e ilustrações

**Files:**
- Rewrite: `assets/govhub.css`
- Create: `assets/logo/logomarca-horizontal-white.svg`, `assets/logo/logomarca-horizontal-navy.svg`, `assets/favicon.svg`, `assets/icones/{book-open,wrench,document-text,light-bulb,trophy,beaker}-sober.svg`
- Delete: `assets/govhub-logo.svg`, `assets/favicon.png`
- Modify: `index.html`, `roadmap.html`, `doc.html` (só `<head>`, fonte e logo — o resto das páginas muda nas tasks 6–8)
- Modify: `assets/ilustracoes/*.svg` (só cores e fonte)
- Create: `docs/adr/0003-identidade-visual-sobria.md`; Modify: `docs/adr/0002-identidade-visual-govhub.md` (status), `README.md` §7.3

**Interfaces:**
- Produces (CSS, usados pelas tasks 6–8): variáveis `--primary-purple`, `--dark-navy`, `--bg-soft`, `--accent-rose`, `--purple-600`, `--purple-700`, `--text-strong`, `--text-body`, `--text-muted`, `--border-soft`, `--font-family-base`, `--shadow-md|lg|xl`, `--radius-sm|md|lg`, `--topo-altura` (56px); classes `.topo`, `.topo-wrap`, `.marca`, `.topo-links`, `.topo-progresso`, `.barra`, `.conta`, `.btn-google`, `.conta-menu`, `.conta-avatar`, `.conta-painel`, `.conta-nome`, `.btn`, `.btn-secundario`, `.btn-cta`, `.check` (botão `aria-pressed`), `.tag-tipo`, `.aviso`(+`.visivel`), `.pular`, `.sr-only`, `.forma`, `.forma-quarto`, `.forma-anel`. Bloco de **transição** com os nomes antigos, removido na Task 9.

- [ ] **Step 1: Copiar logos e baixar os ícones**

```bash
SKILL=~/.claude/skills/govhub-visual-identity/references/logo
mkdir -p assets/logo assets/icones
cp "$SKILL/logomarca-horizontal-white.svg" "$SKILL/logomarca-horizontal-navy.svg" assets/logo/
cp "$SKILL/icone-none-default.svg" assets/favicon.svg
for i in book-open wrench document-text light-bulb trophy beaker; do
  curl -fsSL -o "assets/icones/$i-sober.svg" "https://cdn.jsdelivr.net/gh/GovHub-br/skills-assets@main/gov-hub/icons/$i-sober.svg"
done
ls assets/logo assets/icones && head -c 120 assets/icones/trophy-sober.svg
```
Expected: 2 logos, 6 ícones, e o ícone começa com `<svg`.

- [ ] **Step 2: Reescrever `assets/govhub.css`**

```css
/* ==========================================================================
   Identidade visual Gov Hub — modo sóbrio (2026-09-30). Fonte única de cor,
   tipografia e componentes comuns de index.html, roadmap.html e doc.html.
   Tokens copiados da skill govhub-visual-identity (references/tokens.css).
   Decisão e contrastes: docs/adr/0003-identidade-visual-sobria.md.
   Nenhuma página declara hex próprio: use as variáveis abaixo.
   ========================================================================== */
:root{
  /* Paleta sóbria */
  --primary-purple:#613EFF;  /* assinatura: barra superior, links, botões, caixa marcada */
  --dark-navy:#0A005A;       /* títulos, cabeçalho de tabela, código, fundos escuros */
  --bg-soft:#F2F1F6;         /* claro da marca: blocos, cards, zebra, aula ativa */
  --accent-rose:#BE006E;     /* acento pontual: um CTA ou detalhe por seção */
  --text-white:#FFFFFF;

  /* Estados do primário */
  --purple-600:#5235D9;      /* hover/foco */
  --purple-700:#3F28A6;      /* active; roxo de texto pequeno sobre branco */

  /* Texto */
  --text-strong:#202020;
  --text-body:#2D3748;
  --text-muted:#666666;      /* nunca sobre fundo escuro */

  /* Fundos e bordas */
  --bg-white:#FFFFFF;
  --border-soft:#E9DFFF;

  /* Tipografia: Reddit Sans em tudo, carregada por <link> em cada página */
  --font-family-base:'Reddit Sans','Open Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  --heading-weight:800;
  --heading-tracking:-0.025em;
  --heading-leading:1.06;

  /* Sombras, raios, medidas */
  --shadow-md:0 2px 10px rgba(10,0,90,.10);
  --shadow-lg:0 4px 20px rgba(10,0,90,.12);
  --shadow-xl:0 8px 30px rgba(10,0,90,.16);
  --radius-sm:6px; --radius-md:10px; --radius-lg:16px;
  --topo-altura:56px;
}

/* --- TRANSIÇÃO ---------------------------------------------------------------
   Nomes da identidade anterior (ADR 0002) apontando para a paleta sóbria, para
   as páginas continuarem de pé enquanto são migradas. Removido na última etapa. */
:root{
  --gh-purple:var(--primary-purple); --gh-purple-l:var(--primary-purple); --gh-purple-d:var(--purple-700);
  --gh-purple-dd:var(--dark-navy); --gh-orange:var(--accent-rose); --gh-orange-l:#fff; --gh-orange-d:var(--accent-rose);
  --gh-tint:var(--bg-soft); --gh-tint-line:var(--border-soft); --gh-on-dark:#fff;
  --ink:var(--text-strong); --muted:var(--text-muted); --line:var(--border-soft); --panel:#fff; --bg:var(--bg-soft);
  --accent:var(--dark-navy); --focus:var(--purple-700);
  --tut:var(--dark-navy); --gui:var(--dark-navy); --ref:var(--dark-navy); --exp:var(--dark-navy); --des:var(--accent-rose); --res:var(--dark-navy);
  --tut-bg:var(--bg-soft); --gui-bg:var(--bg-soft); --ref-bg:var(--bg-soft); --exp-bg:var(--bg-soft); --des-bg:var(--bg-soft); --res-bg:var(--bg-soft);
  --green:var(--primary-purple); --green-d:var(--purple-700); --red-d:var(--accent-rose);
}
.brand{display:flex;align-items:center;gap:10px;margin-right:auto;text-decoration:none}
.brand img{height:22px;width:auto;display:block}
.brand span{color:#fff;font-size:.93rem;font-weight:700;border-left:1px solid rgba(255,255,255,.5);padding-left:10px}
/* --- fim da transição ------------------------------------------------------ */

body{font-family:var(--font-family-base);color:var(--text-body);background:var(--bg-soft)}

/* Barra superior comum às três páginas */
.topo{position:sticky;top:0;z-index:50;background:var(--primary-purple);color:#fff}
.topo-wrap{display:flex;align-items:center;gap:18px;height:var(--topo-altura);padding:0 20px;max-width:1440px;margin:0 auto}
.marca{display:flex;align-items:center;gap:12px;color:#fff;text-decoration:none;flex:0 0 auto}
.marca img{height:24px;width:auto;display:block}  /* ~103px: acima do mínimo de 2,5 cm do MIV */
.marca span{font-size:.95rem;font-weight:700;white-space:nowrap;border-left:1px solid rgba(255,255,255,.5);padding-left:12px}
.marca:hover{text-decoration:none}
.topo-links{display:flex;gap:18px;margin-left:auto}
.topo-links a{color:#fff;font-size:.88rem;font-weight:500;text-decoration:none;padding:4px 0;border-bottom:2px solid transparent}
.topo-links a:hover{border-bottom-color:rgba(255,255,255,.6)}
.topo-links a[aria-current="page"]{border-bottom-color:#fff;font-weight:700}
.topo-progresso{display:flex;align-items:center;gap:8px;font-size:.82rem;font-weight:700;color:#fff}
.topo-progresso .barra{width:90px;background:rgba(255,255,255,.3)}
.topo-progresso .barra>span{background:#fff}
@media(max-width:899px){.topo-links{display:none}.topo-progresso{margin-left:auto}}
@media(max-width:560px){.marca span{display:none}.topo-progresso .barra{display:none}}

/* Barra de progresso */
.barra{display:block;height:8px;border-radius:999px;background:var(--border-soft);overflow:hidden}
.barra>span{display:block;height:100%;width:0;background:var(--primary-purple);transition:width .25s}

/* Conta Google */
.conta{flex:0 0 auto;display:flex;align-items:center}
.btn-google{display:inline-flex;align-items:center;gap:8px;background:#fff;color:var(--dark-navy);border:0;border-radius:999px;
    padding:7px 14px;font:inherit;font-size:.84rem;font-weight:700;cursor:pointer;white-space:nowrap}
.btn-google:hover{background:var(--bg-soft)}
.conta-menu{position:relative}
.conta-menu summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px;color:#fff;font-size:.86rem;font-weight:600;
    border:1px solid rgba(255,255,255,.55);border-radius:999px;padding:3px 12px 3px 3px}
.conta-menu summary::-webkit-details-marker{display:none}
.conta-avatar{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    background:var(--dark-navy);color:#fff;font-weight:800;font-size:.8rem;object-fit:cover}
.conta-painel{position:absolute;right:0;top:calc(100% + 8px);z-index:70;width:260px;background:#fff;color:var(--text-body);
    border-radius:var(--radius-md);box-shadow:var(--shadow-xl);padding:14px 16px;font-size:.84rem}
.conta-painel p{margin:0 0 12px}
.conta-painel b{color:var(--dark-navy)}
@media(max-width:560px){.conta-nome{display:none}.conta-menu summary{padding-right:3px}}

/* Botões */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font:inherit;font-size:.92rem;font-weight:700;
    border-radius:999px;padding:11px 22px;border:2px solid var(--primary-purple);background:var(--primary-purple);color:#fff;
    cursor:pointer;text-decoration:none}
.btn:hover{background:var(--purple-600);border-color:var(--purple-600);text-decoration:none}
.btn:active{background:var(--purple-700);border-color:var(--purple-700)}
.btn-secundario{background:#fff;color:var(--purple-700)}
.btn-secundario:hover{background:var(--bg-soft);color:var(--purple-700)}
.btn-cta{background:var(--accent-rose);border-color:var(--accent-rose)}
.btn-cta:hover{background:var(--dark-navy);border-color:var(--dark-navy)}

/* Marcar aula como feita: círculo com ✓; ::before amplia o alvo de toque para 44x44
   (WCAG 2.2 SC 2.5.8 pede 24x24 no mínimo) sem mudar o desenho */
.check{flex:0 0 auto;position:relative;z-index:2;width:22px;height:22px;padding:0;border-radius:50%;
    border:2px solid var(--text-muted);background:#fff;cursor:pointer;touch-action:manipulation}
.check::before{content:"";position:absolute;top:-11px;left:-11px;width:44px;height:44px;border-radius:50%}
.check:hover{border-color:var(--primary-purple)}
.check[aria-pressed="true"]{background:var(--primary-purple);border-color:var(--primary-purple)}
.check[aria-pressed="true"]::after{content:"";position:absolute;top:3px;left:6px;width:5px;height:9px;
    border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}

/* Tipo de página: ícone de produto + nome — os tipos não se distinguem por cor */
.tag-tipo{display:inline-flex;align-items:center;gap:5px;background:var(--bg-soft);color:var(--dark-navy);border-radius:999px;
    padding:2px 10px 2px 4px;font-size:.72rem;font-weight:700;line-height:1.4;white-space:nowrap}
.tag-tipo img{width:18px;height:18px;display:block}

/* Formas de apoio da marca (decorativas, sólidas, só em fundo de cor) */
.forma{position:absolute;pointer-events:none}
.forma-quarto{top:0;right:0;width:200px;height:200px;background:var(--primary-purple);border-bottom-left-radius:100%}
.forma-anel{left:-70px;bottom:-90px;width:220px;height:220px;border-radius:50%;border:34px solid var(--primary-purple)}
@media(max-width:860px){.forma-quarto{width:120px;height:120px}.forma-anel{display:none}}

/* Aviso discreto (sincronização) — região viva sempre presente, só a opacidade muda */
.aviso{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:80;max-width:calc(100vw - 32px);
    background:var(--dark-navy);color:#fff;padding:10px 18px;border-radius:999px;font-size:.86rem;box-shadow:var(--shadow-xl);
    opacity:0;pointer-events:none;transition:opacity .2s}
.aviso.visivel{opacity:1}

/* Pular para o conteúdo */
.pular{position:absolute;left:12px;top:-60px;z-index:100;background:#fff;color:var(--dark-navy);padding:8px 14px;
    border-radius:var(--radius-sm);font-weight:700}
.pular:focus{top:8px}

/* Conteúdo só para leitor de tela */
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

/* Foco visível (eMAG 2.1 / WCAG 2.4.7) — roxo escuro no claro, branco no roxo */
a:focus-visible,button:focus-visible,summary:focus-visible{outline:3px solid var(--purple-700);outline-offset:2px;border-radius:3px}
.topo a:focus-visible,.topo button:focus-visible,.topo summary:focus-visible,body > nav a:focus-visible,.brand:focus-visible{outline-color:#fff}

@media (prefers-reduced-motion: reduce){*{transition:none !important;scroll-behavior:auto !important}}
```

- [ ] **Step 3: Trocar fonte, logo e favicon nas três páginas**

```bash
for f in index.html roadmap.html doc.html; do
  sed -i \
    -e 's#family=Inter:wght@400;500;600;700#family=Reddit+Sans:wght@400;500;600;700;800#' \
    -e "s#font-family:'Inter',#font-family:'Reddit Sans',#" \
    -e 's#<link rel="icon" type="image/png" href="assets/favicon.png">#<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">#' \
    -e 's#<img src="assets/govhub-logo.svg" alt="GovHub">#<img src="assets/logo/logomarca-horizontal-white.svg" alt="Gov Hub" width="103" height="24">#' \
    "$f"
done
grep -n "Inter\|govhub-logo\|favicon.png" index.html roadmap.html doc.html
```
Expected: nenhuma linha (o `grep` não encontra nada).

Depois: `git rm assets/govhub-logo.svg assets/favicon.png` e `grep -rn "govhub-logo.svg\|favicon.png" --include=*.md --include=*.html --include=*.py --include=*.yml .` — a única ocorrência aceitável é no ADR 0002 (registro histórico). Ocorrência no `README.md` é corrigida no Step 6.

- [ ] **Step 4: Recolorir as ilustrações**

Mapa (só cores da identidade anterior e cinzas de interface; desenho e texto intactos). No `atencao-visual.svg`, as cores do painel "Tudo colorido" (`#C7200C`, `#168821`, `#F19F42`, `#1351B4`, `#0F7B8F`, `#A21CAF`) **ficam**: são o conteúdo do exemplo (um painel com cores demais), não a identidade do site.

```bash
for f in assets/ilustracoes/*.svg; do
  sed -i \
    -e 's/#7A34F3/#613EFF/gI' -e 's/#8B5CF6/#613EFF/gI' -e 's/#5B21B6/#3F28A6/gI' \
    -e 's/#B39DED/#E9DFFF/gI' -e 's/#D9C9FB/#E9DFFF/gI' -e 's/#F3EEFE/#F2F1F6/gI' \
    -e 's/#f2f1f7/#F2F1F6/gI' -e 's/#eeecf4/#F2F1F6/gI' -e 's/#ececf2/#F2F1F6/gI' \
    -e 's/#fdfbff/#FFFFFF/gI' -e 's/#fbfbfc/#FFFFFF/gI' \
    -e 's/#e4e1ee/#E9DFFF/gI' -e 's/#d9d5e8/#E9DFFF/gI' -e 's/#cfc8e6/#E9DFFF/gI' -e 's/#e6e2f0/#E9DFFF/gI' \
    -e 's/#5f6472/#666666/gI' -e 's/#6b7080/#666666/gI' -e 's/#8a8f9c/#666666/gI' -e 's/#3f4457/#2D3748/gI' \
    -e "s/'Inter'/'Reddit Sans'/g" -e 's/Inter,/Reddit Sans,/g' \
    "$f"
done
sed -i 's/#C2410C/#BE006E/gI' assets/ilustracoes/atencao-visual.svg
grep -ohi '#[0-9a-f]\{6\}\|#fff\b' assets/ilustracoes/*.svg | tr a-f A-F | sort | uniq -c
```
Expected: só cores da paleta (`#613EFF #3F28A6 #F2F1F6 #E9DFFF #FFFFFF #FFF #666666 #2D3748 #202020 #BE006E`) mais as seis do painel "Tudo colorido".

- [ ] **Step 5: ADR 0003 e status do ADR 0002**

Crie `docs/adr/0003-identidade-visual-sobria.md`:

```markdown
# ADR 0003 — Identidade visual sóbria do Gov Hub

**Status:** aceito · substitui o [ADR 0002](0002-identidade-visual-govhub.md)
**Data:** 2026-10-01

## Contexto

O ADR 0002 adotou a identidade publicada em gov-hub.io: roxo `#7A34F3`, laranja `#F19F42` e Inter. Em
2026-09-30 a equipe de design e comunicação do Gov Hub fechou o **modo sóbrio** do manual de identidade
(skill `govhub-visual-identity`), que passa a valer para toda peça — página, relatório, slide, post — e
descontinua a paleta colorida. A trilha precisa acompanhar a marca da plataforma de que faz parte.

## Decisão

`assets/govhub.css` passa a carregar os tokens do modo sóbrio e continua sendo a fonte única de cor e
tipografia do site.

| Token | Valor | Uso |
|---|---|---|
| `--primary-purple` | `#613EFF` | assinatura: barra superior, links, botões, caixa marcada, progresso |
| `--dark-navy` | `#0A005A` | títulos, cabeçalho de tabela, blocos de código, fundos escuros |
| `--bg-soft` | `#F2F1F6` | blocos, cards, zebra, aula ativa, etiquetas |
| `--accent-rose` | `#BE006E` | acento pontual: o botão "Concluir e avançar", um CTA por seção |
| `--purple-600` / `--purple-700` | `#5235D9` / `#3F28A6` | hover / active e roxo de texto pequeno |
| `--border-soft` | `#E9DFFF` | bordas e divisórias |

Tipografia **Reddit Sans** em tudo (títulos em 800). Logotipo e símbolo são os arquivos do MIV
(`assets/logo/`, `assets/favicon.svg`).

**Tipos de página sem cor própria.** As seis cores por tipo (verde, azul, magenta, laranja, vermelho,
azul-petróleo) saem: ficam fora da paleta. Cada tipo passa a ser uma etiqueta `#F2F1F6` com texto navy,
o nome escrito e um ícone de produto Gov Hub (variante `-sober`, em `assets/icones/`):

| Tipo | Ícone |
|---|---|
| Tutorial | `book-open` |
| Guia | `wrench` |
| Referência | `document-text` |
| Explicação | `light-bulb` |
| Desafio | `trophy` |
| Pesquisa | `beaker` |

## Consequências

- **A distinção entre tipos deixa de depender de cor** (WCAG 1.4.1): ícone e nome carregam a
  informação. Quem lia o tipo pela cor da borda no mapa passa a ler a etiqueta.
- **Contrastes:** branco sobre roxo (5,0:1), navy e `#BE006E`; navy sobre branco e `#F2F1F6`; roxo em
  texto pequeno usa `#3F28A6`. Nunca roxo sobre navy nem `#BE006E` sobre roxo.
- **Exceções de cor literal, documentadas:** o tema do Mermaid em `assets/leitor.js` (o Mermaid não lê
  variáveis CSS) e o painel "Tudo colorido" de `assets/ilustracoes/atencao-visual.svg`, cujas cores são
  o conteúdo do exemplo — um painel com cores demais —, não a identidade do site.
- **Dependências externas:** Reddit Sans vem do Google Fonts (sem internet, cai na pilha do sistema).
  Logos e ícones são cópias; se o MIV mudar, os arquivos em `assets/logo/` e `assets/icones/` precisam
  ser trocados à mão (os ícones vêm de `GovHub-br/skills-assets`).
```

Em `docs/adr/0002-identidade-visual-govhub.md`, troque a linha `**Status:** aceito` por:

```markdown
**Status:** substituído pelo [ADR 0003](0003-identidade-visual-sobria.md)
```

- [ ] **Step 6: README §7.3**

Substitua o corpo da seção `### 7.3 Mudar cores, tipografia ou logotipo` (até antes de `### 7.4`) por:

```markdown
Tudo o que é marca vive em `assets/govhub.css`: os tokens do modo sóbrio do Gov Hub
(`--primary-purple`, `--dark-navy`, `--bg-soft`, `--accent-rose`…), a barra superior, os botões, a
caixa de "feito" e as etiquetas de tipo de página. Mudou um token ali, mudou nas três páginas. Logotipo
e símbolo ficam em `assets/logo/` e `assets/favicon.svg`; os ícones dos tipos de página, em
`assets/icones/`.

Os tipos de página não têm cor própria: se distinguem por ícone e nome. Ao escolher uma cor, use só a
paleta e verifique o contraste — texto precisa de **4,5:1** e indicadores não textuais de **3:1**
(WCAG 2.1 AA). O raciocínio completo está no [ADR 0003](docs/adr/0003-identidade-visual-sobria.md).
```

- [ ] **Step 7: Conferir as páginas no navegador**

```bash
python3 -m http.server 8765 >/dev/null 2>&1 & SRV=$!; sleep 1
for p in "index.html" "roadmap.html" "doc.html?path=docs/explicacao/fluxo-de-leitura-f-e-z.md"; do
  n=$(echo "$p" | tr -c 'a-z0-9' '_')
  $CHROME --screenshot="$RASCUNHO/t3_$n.png" --window-size=1280,900 --virtual-time-budget=4000 "http://localhost:8765/$p" 2>/dev/null
done; kill $SRV
```
Abra os PNGs (ferramenta Read). Expected: barras roxas `#613EFF`, logo nova legível, Reddit Sans, nenhuma cor laranja/verde da identidade antiga. Layout pode estar imperfeito — as páginas são redesenhadas nas tasks 6–8.

- [ ] **Step 8: Commit**

```bash
git add -A assets/ index.html roadmap.html doc.html docs/adr/ README.md
git commit -m "site: adota a identidade sóbria do Gov Hub (tokens, Reddit Sans, logo e ícones)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Loja de progresso (navegador × conta)

**Files:**
- Create: `assets/progresso-loja.js`
- Test: `tests/progresso-loja.test.js`

**Interfaces:**
- Consumes: `mesclar`, `alternar` de `assets/progresso-nucleo.js` (Task 1).
- Produces: `export const CHAVE_ANONIMO, CHAVE_ULTIMA_ANONIMO, CHAVE_CONTA`; `export function criarLoja({ armazenamento, criarNuvem })` onde
  - `armazenamento = { get(chave) → string|null, set(chave, string), remove(chave) }`
  - `criarNuvem = async () → Nuvem | null`, e `Nuvem = { aoMudarUsuario(cb(usuario|null)), entrar() → Promise, sair() → Promise, ler(uid) → Promise<{feitos, ultimaAula}|null>, gravarTudo(uid, {feitos, ultimaAula}) → Promise, marcar(uid, ids:string[], valor:boolean) → Promise, gravarUltimaAula(uid, {path, item}) → Promise, ouvir(uid, cb({feitos, ultimaAula}), cbErro) → () => void }`
  - `usuario = { uid, nome, email, foto }`
  - retorna `{ iniciar() → Promise, alternar(ids) → boolean, zerar(), registrarUltimaAula(path, item), entrar() → Promise, sair() → Promise, recarregar(chave|null), feitos() → feitos, usuario() → usuario|null, ultimaAula() → {path,item}|null, nuvemDisponivel() → boolean, aoMudar(cb) → desinscrever, aoAviso(cb(texto)) → desinscrever }`

- [ ] **Step 1: Escrever os testes que falham — `tests/progresso-loja.test.js`**

```js
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
    async ler(uid) { return docs[uid] ? structuredClone(docs[uid]) : null; },
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
  loja.iniciar();
  await esperar();
  assert.equal(loja.usuario().uid, 'ana');
  assert.deepEqual(loja.feitos(), { a: true });
  liberar(null);
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/progresso-loja.test.js`
Expected: FAIL — `Cannot find module '.../assets/progresso-loja.js'`.

- [ ] **Step 3: Implementar `assets/progresso-loja.js`**

```js
// Loja do progresso da trilha: o que está feito, quem está logado e qual foi a última aula.
// Sem sessão, tudo fica no navegador. Com sessão Google, o Firestore é a fonte da verdade e o
// navegador guarda só um cache da conta, apagado no logout (ADR 0004).
// Não conhece o DOM nem o Firebase: recebe o armazenamento e a nuvem prontos — por isso é
// testada em Node (tests/progresso-loja.test.js).
import { mesclar, alternar as alternarIds } from './progresso-nucleo.js';

export const CHAVE_ANONIMO = 'govhub-dashboards-roadmap-v1';
export const CHAVE_ULTIMA_ANONIMO = 'govhub-dashboards-ultima-aula';
export const CHAVE_CONTA = 'govhub-dashboards-progresso-conta';

// Fechar a janela do Google não é erro de quem lê: não merece aviso.
const ERROS_SILENCIOSOS = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];

function lerJSON(armazenamento, chave, padrao) {
  try {
    const bruto = armazenamento.get(chave);
    return bruto ? JSON.parse(bruto) : padrao;
  } catch {
    return padrao;
  }
}

export function criarLoja({ armazenamento, criarNuvem = async () => null }) {
  let nuvem = null;
  let usuario = null;
  let feitos = {};
  let ultimaAula = null;
  let pararDeOuvir = null;
  const ouvintes = new Set();
  const ouvintesAviso = new Set();

  const emitir = () => ouvintes.forEach((cb) => cb());
  const avisar = (texto) => ouvintesAviso.forEach((cb) => cb(texto));

  function carregarAnonimo() {
    feitos = lerJSON(armazenamento, CHAVE_ANONIMO, {});
    ultimaAula = lerJSON(armazenamento, CHAVE_ULTIMA_ANONIMO, null);
  }

  function salvarLocal() {
    if (usuario) {
      armazenamento.set(CHAVE_CONTA, JSON.stringify({ uid: usuario.uid, usuario, feitos, ultimaAula }));
      return;
    }
    armazenamento.set(CHAVE_ANONIMO, JSON.stringify(feitos));
    if (ultimaAula) armazenamento.set(CHAVE_ULTIMA_ANONIMO, JSON.stringify(ultimaAula));
  }

  function pararSincronizacao() {
    if (pararDeOuvir) {
      pararDeOuvir();
      pararDeOuvir = null;
    }
  }

  function desconectar() {
    pararSincronizacao();
    armazenamento.remove(CHAVE_CONTA);
    usuario = null;
    carregarAnonimo();
    emitir();
  }

  async function conectar(u) {
    const anonimo = lerJSON(armazenamento, CHAVE_ANONIMO, {});
    const ultimaAnonima = lerJSON(armazenamento, CHAVE_ULTIMA_ANONIMO, null);
    const remoto = await nuvem.ler(u.uid);
    const novosFeitos = mesclar(anonimo, remoto && remoto.feitos);
    const novaUltima = (remoto && remoto.ultimaAula) || ultimaAnonima;
    const trazAlgo = Object.keys(anonimo).length > 0 || (!!ultimaAnonima && !(remoto && remoto.ultimaAula));
    if (!remoto || trazAlgo) {
      await nuvem.gravarTudo(u.uid, { feitos: novosFeitos, ultimaAula: novaUltima });
    }
    // O anônimo foi absorvido pela conta: não volta a ser somado numa próxima entrada.
    armazenamento.remove(CHAVE_ANONIMO);
    armazenamento.remove(CHAVE_ULTIMA_ANONIMO);
    usuario = u;
    feitos = novosFeitos;
    ultimaAula = novaUltima;
    salvarLocal();
    emitir();
    pararDeOuvir = nuvem.ouvir(u.uid, (dados) => {
      feitos = dados.feitos || {};
      ultimaAula = dados.ultimaAula || null;
      salvarLocal();
      emitir();
    }, () => avisar('Não foi possível sincronizar o progresso; entre de novo.'));
  }

  function aoMudarUsuario(u) {
    pararSincronizacao();
    if (!u) {
      desconectar();
      return;
    }
    if (usuario && usuario.uid !== u.uid) {
      // cache de outra conta: nunca é somado a esta
      armazenamento.remove(CHAVE_CONTA);
      usuario = null;
      carregarAnonimo();
    }
    conectar(u).catch(() => avisar('Não foi possível carregar o progresso da sua conta.'));
  }

  async function iniciar() {
    // Sessão restaurada: mostra o cache da conta na hora; a nuvem confirma em seguida.
    const cache = lerJSON(armazenamento, CHAVE_CONTA, null);
    if (cache && cache.uid && cache.usuario) {
      usuario = cache.usuario;
      feitos = cache.feitos || {};
      ultimaAula = cache.ultimaAula || null;
    } else {
      carregarAnonimo();
    }
    emitir();
    try {
      nuvem = await criarNuvem();
    } catch {
      nuvem = null;
    }
    if (!nuvem) {
      if (usuario) desconectar();
      return;
    }
    emitir();   // o botão "Entrar com Google" pode aparecer
    nuvem.aoMudarUsuario(aoMudarUsuario);
  }

  function alternar(ids) {
    const antes = feitos;
    const { feitos: depois, marcou } = alternarIds(feitos, ids);
    feitos = depois;
    salvarLocal();
    emitir();
    if (usuario && nuvem) {
      const uid = usuario.uid;
      nuvem.marcar(uid, ids, marcou).catch(() => {
        if (!usuario || usuario.uid !== uid) return;
        const restaurado = { ...feitos };
        for (const id of ids) {
          if (antes[id]) restaurado[id] = true;
          else delete restaurado[id];
        }
        feitos = restaurado;
        salvarLocal();
        emitir();
        avisar('Não foi possível salvar; entre de novo.');
      });
    }
    return marcou;
  }

  function zerar() {
    feitos = {};
    salvarLocal();
    emitir();
    if (usuario && nuvem) {
      nuvem.gravarTudo(usuario.uid, { feitos: {}, ultimaAula })
        .catch(() => avisar('Não foi possível salvar; entre de novo.'));
    }
  }

  function registrarUltimaAula(path, item) {
    ultimaAula = { path, item: item || null };
    salvarLocal();
    if (usuario && nuvem) nuvem.gravarUltimaAula(usuario.uid, ultimaAula).catch(() => {});
  }

  function entrar() {
    if (!nuvem) return Promise.resolve();
    return nuvem.entrar().catch((e) => {
      if (!ERROS_SILENCIOSOS.includes(e && e.code)) avisar('Não foi possível entrar com o Google.');
    });
  }

  function sair() {
    return nuvem ? nuvem.sair() : Promise.resolve();
  }

  // Outra aba mexeu no progresso anônimo. Com sessão, quem sincroniza as abas é o Firestore.
  function recarregar(chave) {
    if (usuario) return;
    if (chave !== null && chave !== CHAVE_ANONIMO && chave !== CHAVE_ULTIMA_ANONIMO) return;
    carregarAnonimo();
    emitir();
  }

  return {
    iniciar, alternar, zerar, registrarUltimaAula, entrar, sair, recarregar,
    feitos: () => feitos,
    usuario: () => usuario,
    ultimaAula: () => ultimaAula,
    nuvemDisponivel: () => !!nuvem,
    aoMudar(cb) { ouvintes.add(cb); return () => ouvintes.delete(cb); },
    aoAviso(cb) { ouvintesAviso.add(cb); return () => ouvintesAviso.delete(cb); },
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test tests/*.test.js`
Expected: PASS em todos (núcleo, trilha.json e loja).

- [ ] **Step 5: Commit**

```bash
git add assets/progresso-loja.js tests/progresso-loja.test.js
git commit -m "site: loja do progresso com conta Google opcional e cache apagado no logout

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Firebase, instância compartilhada e componentes de conta

**Files:**
- Create: `assets/progresso-nuvem.js`, `assets/firebase-config.js`, `assets/progresso.js`, `assets/trilha.js`, `assets/dom.js`, `assets/conta.js`
- Create: `firestore.rules`, `firebase.json`
- Create: `docs/adr/0004-progresso-no-firebase.md`
- Modify: `README.md` (nova §7.6)

**Interfaces:**
- Consumes: `criarLoja` e a interface `Nuvem` (Task 4).
- Produces:
  - `assets/progresso-nuvem.js`: `criarNuvem(config) → Promise<Nuvem|null>`
  - `assets/firebase-config.js`: `export const firebaseConfig`
  - `assets/progresso.js`: `export const progresso` (a loja já iniciada, ligada ao `localStorage` e ao evento `storage`)
  - `assets/trilha.js`: `carregarTrilha() → Promise<{niveis, documentos, ...}>`
  - `assets/dom.js`: `el(tag, attrs, ...filhos) → HTMLElement` (`attrs.class`, `on<evento>`, `true` vira atributo vazio, `null/false/undefined` são ignorados)
  - `assets/conta.js`: `montarConta(raiz:HTMLElement, progresso)`, `montarAviso(progresso)`

- [ ] **Step 1: `assets/firebase-config.js`**

```js
// Configuração do app Web do Firebase. Vazia = o site funciona só com o progresso no navegador.
// Copie os valores do console (Configurações do projeto → Seus apps → SDK) — passo a passo no
// README, seção "Salvar o progresso no Firebase". Estes valores são públicos por natureza: quem
// protege os dados são as regras em firestore.rules e os domínios autorizados no Authentication.
export const firebaseConfig = {
  // apiKey: '',
  // authDomain: '',
  // projectId: '',
  // appId: '',
};
```

- [ ] **Step 2: `assets/progresso-nuvem.js`**

```js
// Adaptador do Firebase (login Google + Firestore) para a loja de progresso.
// O SDK só é baixado quando há configuração. Sem configuração, ou se o CDN falhar,
// criarNuvem devolve null e o site segue com o progresso só no navegador.
const VERSAO = '12.19.0';
const CDN = `https://www.gstatic.com/firebasejs/${VERSAO}/`;

const normalizar = (dados) => ({
  feitos: (dados && dados.feitos) || {},
  ultimaAula: (dados && dados.ultimaAula) || null,
});

export async function criarNuvem(config) {
  if (!config || !config.apiKey || !config.projectId) return null;
  try {
    const [app, auth, fs] = await Promise.all([
      import(CDN + 'firebase-app.js'),
      import(CDN + 'firebase-auth.js'),
      import(CDN + 'firebase-firestore.js'),
    ]);
    const firebase = app.initializeApp(config);
    const autenticacao = auth.getAuth(firebase);
    const banco = fs.getFirestore(firebase);
    const documento = (uid) => fs.doc(banco, 'progresso', uid);

    return {
      aoMudarUsuario(cb) {
        auth.onAuthStateChanged(autenticacao, (u) => cb(u ? {
          uid: u.uid,
          nome: u.displayName || u.email || 'Conta Google',
          email: u.email || null,
          foto: u.photoURL || null,
        } : null));
      },
      entrar: () => auth.signInWithPopup(autenticacao, new auth.GoogleAuthProvider()),
      sair: () => auth.signOut(autenticacao),
      async ler(uid) {
        const snap = await fs.getDoc(documento(uid));
        return snap.exists() ? normalizar(snap.data()) : null;
      },
      gravarTudo: (uid, { feitos, ultimaAula }) => fs.setDoc(documento(uid), {
        feitos, ultimaAula: ultimaAula || null, atualizadoEm: fs.serverTimestamp(),
      }),
      // Um campo por aula (feitos.<id>), numa única escrita: duas aulas marcadas ao mesmo
      // tempo em dispositivos diferentes não se sobrescrevem.
      marcar(uid, ids, valor) {
        const campos = [];
        for (const id of ids) campos.push(new fs.FieldPath('feitos', id), valor ? true : fs.deleteField());
        return fs.updateDoc(documento(uid), ...campos, 'atualizadoEm', fs.serverTimestamp());
      },
      gravarUltimaAula: (uid, ultimaAula) => fs.updateDoc(documento(uid),
        'ultimaAula', ultimaAula, 'atualizadoEm', fs.serverTimestamp()),
      ouvir: (uid, cb, erro) => fs.onSnapshot(documento(uid),
        (snap) => cb(normalizar(snap.exists() ? snap.data() : null)), erro),
    };
  } catch (e) {
    console.warn('Firebase indisponível; o progresso fica só neste navegador.', e);
    return null;
  }
}
```

- [ ] **Step 3: `assets/progresso.js`, `assets/trilha.js`, `assets/dom.js`**

`assets/progresso.js`:

```js
// A loja de progresso que as páginas usam: uma por página, ligada ao localStorage e ao Firebase.
import { criarLoja } from './progresso-loja.js';
import { criarNuvem } from './progresso-nuvem.js';
import { firebaseConfig } from './firebase-config.js';

// localStorage pode lançar exceção (navegação privada, cota cheia): o site segue sem salvar.
const armazenamento = {
  get(chave) { try { return localStorage.getItem(chave); } catch { return null; } },
  set(chave, valor) { try { localStorage.setItem(chave, valor); } catch { /* sem armazenamento */ } },
  remove(chave) { try { localStorage.removeItem(chave); } catch { /* sem armazenamento */ } },
};

export const progresso = criarLoja({ armazenamento, criarNuvem: () => criarNuvem(firebaseConfig) });

// outra aba mudou o progresso anônimo
window.addEventListener('storage', (ev) => progresso.recarregar(ev.key));
// voltar de outra página pode restaurar esta do cache do navegador, sem rodar os scripts
window.addEventListener('pageshow', (ev) => { if (ev.persisted) progresso.recarregar(null); });

progresso.iniciar();
```

`assets/trilha.js`:

```js
// docs/trilhas/trilha.json — gerado do ROADMAP.md por tools/gen_roadmap.py — carregado uma vez.
let promessa = null;

export function carregarTrilha() {
  if (!promessa) {
    promessa = fetch('docs/trilhas/trilha.json').then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }
  return promessa;
}
```

`assets/dom.js`:

```js
// Monta elementos sem innerHTML: títulos e nomes vêm de dados (ROADMAP.md, conta Google) e são
// texto, não HTML.
export function el(tag, attrs = {}, ...filhos) {
  const no = document.createElement(tag);
  for (const [nome, valor] of Object.entries(attrs)) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (nome === 'class') no.className = valor;
    else if (nome.startsWith('on')) no.addEventListener(nome.slice(2), valor);
    else no.setAttribute(nome, valor === true ? '' : String(valor));
  }
  no.append(...filhos.filter((f) => f !== null && f !== undefined && f !== false));
  return no;
}
```

- [ ] **Step 4: `assets/conta.js`**

```js
// Conta Google na barra superior e aviso de sincronização — usados pelas três páginas.
import { el } from './dom.js';

export function montarConta(raiz, progresso) {
  let desenhado = null;

  function pintar() {
    const u = progresso.usuario();
    const estado = (u ? u.uid : '-') + '|' + progresso.nuvemDisponivel();
    if (estado === desenhado) return;   // marcar aulas não redesenha o menu (que fecharia)
    desenhado = estado;

    if (!u) {
      raiz.replaceChildren(progresso.nuvemDisponivel()
        ? el('button', { class: 'btn-google', type: 'button', onclick: () => progresso.entrar() }, 'Entrar com Google')
        : '');
      return;
    }
    const primeiroNome = u.nome.split(' ')[0];
    const avatar = u.foto
      ? el('img', { class: 'conta-avatar', src: u.foto, alt: '', width: 28, height: 28, referrerpolicy: 'no-referrer' })
      : el('span', { class: 'conta-avatar', 'aria-hidden': 'true' }, primeiroNome.charAt(0).toUpperCase());
    const menu = el('details', { class: 'conta-menu' },
      el('summary', { 'aria-label': 'Conta de ' + u.nome }, avatar, el('span', { class: 'conta-nome' }, primeiroNome)),
      el('div', { class: 'conta-painel' },
        el('p', {}, 'Seu progresso está salvo na conta ', el('b', {}, u.email || u.nome), '.'),
        el('button', { class: 'btn btn-secundario', type: 'button', onclick: () => progresso.sair() }, 'Sair')));
    raiz.replaceChildren(menu);
  }

  // fecha o menu ao clicar fora ou com Esc
  document.addEventListener('click', (ev) => {
    const menu = raiz.querySelector('details[open]');
    if (menu && !menu.contains(ev.target)) menu.open = false;
  });
  document.addEventListener('keydown', (ev) => {
    const menu = raiz.querySelector('details[open]');
    if (ev.key === 'Escape' && menu) {
      menu.open = false;
      menu.querySelector('summary').focus();
    }
  });

  progresso.aoMudar(pintar);
  pintar();
}

export function montarAviso(progresso) {
  const caixa = el('div', { class: 'aviso', role: 'status', 'aria-live': 'polite' });
  document.body.append(caixa);
  let temporizador = null;

  function mostrar(texto, { fixo = false } = {}) {
    caixa.textContent = texto;
    caixa.classList.add('visivel');
    clearTimeout(temporizador);
    if (!fixo) temporizador = setTimeout(esconder, 6000);
  }
  function esconder() {
    caixa.classList.remove('visivel');
    caixa.textContent = '';
  }

  progresso.aoAviso((texto) => mostrar(texto));
  // O Firestore guarda as marcações feitas sem conexão e as envia quando ela volta.
  window.addEventListener('offline', () => {
    if (progresso.usuario()) mostrar('Sem conexão: suas marcações serão sincronizadas quando a conexão voltar.', { fixo: true });
  });
  window.addEventListener('online', esconder);
}
```

- [ ] **Step 5: Regras do Firestore e `firebase.json`**

`firestore.rules`:

```
rules_version = '2';

// Cada pessoa lê e grava só o próprio progresso: progresso/{uid}. Todo o resto é negado.
service cloud.firestore {
  match /databases/{database}/documents {
    match /progresso/{uid} {
      allow read, delete: if request.auth != null && request.auth.uid == uid;
      allow create, update: if request.auth != null && request.auth.uid == uid
        && request.resource.data.keys().hasOnly(['feitos', 'ultimaAula', 'atualizadoEm'])
        && request.resource.data.feitos is map;
    }
  }
}
```

`firebase.json`:

```json
{
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

- [ ] **Step 6: Verificar sintaxe e o caminho sem configuração**

```bash
for f in assets/progresso-nuvem.js assets/conta.js assets/dom.js assets/trilha.js assets/progresso.js assets/firebase-config.js; do node --check "$f" || echo "ERRO $f"; done
node -e "import('./assets/progresso-nuvem.js').then(m => m.criarNuvem({})).then(n => console.log('sem config ->', n))"
```
Expected: nenhum `ERRO`; imprime `sem config -> null`.

- [ ] **Step 7: ADR 0004**

Crie `docs/adr/0004-progresso-no-firebase.md`:

```markdown
# ADR 0004 — Progresso da trilha no Firebase, com login Google opcional

**Status:** aceito
**Data:** 2026-10-01

## Contexto

O progresso ("feito") vivia só no `localStorage`: trocar de computador, de navegador ou limpar os
dados do site zerava a trilha. Quem faz a capacitação são servidoras e servidores, cada um na própria
máquina com login próprio, que querem retomar de onde pararam em outro lugar. O site é estático
(GitHub Pages, sem backend próprio).

## Decisão

- **Firebase Authentication com Google** para identificar a pessoa e **Cloud Firestore** para guardar o
  progresso, no documento `progresso/{uid}` (`feitos`, `ultimaAula`, `atualizadoEm`).
- **Login opcional.** Sem login, o progresso continua no navegador, com a mesma chave de antes.
- **Ao entrar,** o progresso anônimo daquele navegador é somado à conta uma única vez e apagado do
  navegador.
- **Com sessão,** o Firestore é a fonte da verdade. O navegador guarda só um cache da conta, apagado ao
  sair. O progresso de uma conta nunca fica no navegador depois do logout nem é somado a outra conta.
- **Escrita por campo** (`feitos.<id>`), para que marcações simultâneas em dispositivos diferentes não
  se sobrescrevam. A sincronização é em tempo real (`onSnapshot`).
- **SDK por CDN** (`gstatic.com`, versão fixada em `assets/progresso-nuvem.js`), carregado só quando
  `assets/firebase-config.js` está preenchido.
- **Regras em `firestore.rules`:** cada `uid` só lê e grava o próprio documento, com campos validados.

## Consequências

- **O site não depende do Firebase para funcionar.** Sem configuração, com o CDN bloqueado ou com o
  serviço fora do ar, o botão de login some e o progresso fica no navegador.
- **A configuração do Firebase é pública.** Isso é esperado; a proteção está nas regras e nos domínios
  autorizados do Authentication. Publicar regras mais frouxas expõe o progresso de todo mundo.
- **Nova dependência externa** (Google), com custo zero no volume da capacitação (plano Spark).
- **Os ids das aulas viram chave de banco.** Mudar a regra de ids em `tools/gen_roadmap.py` apaga o
  progresso salvo — local e na nuvem.

## Alternativas consideradas

**Login obrigatório:** daria controle de quem acessa, mas fecharia um material público e faria o site
depender do Firebase para abrir.

**E-mail e senha:** atende quem não tem conta Google, mas traz cadastro, recuperação de senha e mais
superfície de suporte.

**Backend próprio:** fugiria do modelo estático no GitHub Pages, sem ganho para o caso de uso.
```

- [ ] **Step 8: README §7.6 — passo a passo do Firebase**

Acrescente, depois da seção `### 7.5 Publicar` (antes do `---` que precede `## 8. Origem do conteúdo`):

````markdown
### 7.6 Salvar o progresso no Firebase

Sem configuração, o site funciona e o progresso fica só no navegador. Para que quem entra com a conta
Google leve o progresso para qualquer computador:

1. Em <https://console.firebase.google.com>, crie um projeto (o Google Analytics não é necessário).
2. **Configurações do projeto → Seus apps → Web (`</>`)**: registre um app e copie o objeto
   `firebaseConfig` para `assets/firebase-config.js` (pelo menos `apiKey`, `authDomain`, `projectId`
   e `appId`).
3. **Authentication → Método de login**: ative **Google**.
4. **Authentication → Configurações → Domínios autorizados**: adicione o domínio do GitHub Pages
   (ex.: `<usuario>.github.io`). `localhost` já vem autorizado.
5. **Firestore Database**: crie o banco em **modo de produção**.
6. Publique as regras de [`firestore.rules`](firestore.rules): cole o conteúdo em
   **Firestore → Regras → Publicar**, ou rode `firebase deploy --only firestore:rules` (Firebase CLI).
7. Commite `assets/firebase-config.js`. Ao abrir o site, o botão **Entrar com Google** aparece na barra
   superior.

Os valores de `firebaseConfig` são públicos por natureza; o que protege os dados são as regras do
passo 6. A decisão está no [ADR 0004](docs/adr/0004-progresso-no-firebase.md).
````

- [ ] **Step 9: Commit**

```bash
git add assets/progresso-nuvem.js assets/firebase-config.js assets/progresso.js assets/trilha.js assets/dom.js assets/conta.js firestore.rules firebase.json docs/adr/0004-progresso-no-firebase.md README.md
git commit -m "site: progresso sincronizado no Firestore com login Google opcional

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Leitor da trilha (`doc.html`)

**Files:**
- Rewrite: `doc.html`
- Create: `assets/leitor.css`, `assets/leitor.js`

**Interfaces:**
- Consumes: `progresso` (`assets/progresso.js`), `carregarTrilha` (`assets/trilha.js`), `montarConta`/`montarAviso` (`assets/conta.js`), `el` (`assets/dom.js`), `contar`, `hrefDoItem`, `idsDoDoc`, `localizar`, `todosFeitos`, `vizinhos` (`assets/progresso-nucleo.js`); classes de `assets/govhub.css` (Task 3).
- Produces: URL `doc.html?path=<doc>[&item=<id>][#ancora]` (contrato usado pelo mapa e pela página inicial).

- [ ] **Step 1: Reescrever `doc.html`**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Trilha de Dashboards · Gov Hub</title>
<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Reddit+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/govhub.css">
<link rel="stylesheet" href="assets/leitor.css">
</head>
<body>
<a class="pular" href="#conteudo">Pular para o conteúdo</a>

<header class="topo"><div class="topo-wrap">
  <button class="topo-sumario" id="abrir-sumario" type="button" aria-controls="sumario" aria-expanded="false">☰ Conteúdo</button>
  <a class="marca" href="index.html"><img src="assets/logo/logomarca-horizontal-white.svg" alt="Gov Hub" width="103" height="24"><span>Trilha de Dashboards</span></a>
  <nav class="topo-links" aria-label="Principal">
    <a href="index.html">Início</a>
    <a href="roadmap.html">Mapa da trilha</a>
    <a href="doc.html?path=docs/index.md">Documentação</a>
  </nav>
  <span class="topo-progresso" aria-hidden="true"><span id="topo-percentual">0%</span><span class="barra"><span id="topo-barra"></span></span></span>
  <div class="conta" id="conta"></div>
</div></header>

<div class="leitor-corpo">
  <aside class="sumario" id="sumario" aria-label="Conteúdo da trilha">
    <div class="sumario-cabeca">
      <p class="sumario-titulo">Conteúdo da trilha</p>
      <button class="sumario-fechar" id="fechar-sumario" type="button" aria-label="Fechar o conteúdo da trilha">✕</button>
    </div>
    <div class="sumario-progresso">
      <span id="progresso-geral-texto">Carregando…</span>
      <span class="barra" aria-hidden="true"><span id="progresso-geral-barra"></span></span>
    </div>
    <ol class="niveis" id="sumario-niveis"></ol>
  </aside>
  <div class="fundo-gaveta" id="fundo-gaveta" hidden></div>

  <main class="palco">
    <p class="aula-contexto" id="aula-contexto" hidden></p>
    <article class="conteudo" id="conteudo" tabindex="-1"><p class="msg">Carregando…</p></article>
    <nav class="rodape-aula" id="rodape-aula" aria-label="Sequência da trilha" hidden>
      <a class="rodape-link anterior" id="aula-anterior" href="#"><span class="rotulo">← Anterior</span><span class="rotulo-titulo"></span></a>
      <button class="btn btn-cta" id="aula-cta" type="button">Concluir e avançar</button>
      <a class="rodape-link proxima" id="aula-proxima" href="#"><span class="rotulo">Próxima →</span><span class="rotulo-titulo"></span></a>
    </nav>
    <p class="fonte" id="fonte"></p>
  </main>
</div>

<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script type="module" src="assets/leitor.js"></script>
</body>
</html>
```

- [ ] **Step 2: Criar `assets/leitor.css`**

```css
/* Leitor da trilha (doc.html): barra lateral com os níveis + aula em Markdown.
   Cores e tipografia vêm de assets/govhub.css — aqui não se declara hex. */
*{box-sizing:border-box}
body{margin:0;line-height:1.6}

.topo-sumario{display:none;align-items:center;gap:6px;font:inherit;font-size:.86rem;font-weight:700;color:#fff;
    background:transparent;border:1px solid rgba(255,255,255,.6);border-radius:999px;padding:6px 12px;cursor:pointer}
@media(max-width:899px){.topo-sumario{display:inline-flex}}

.leitor-corpo{display:grid;grid-template-columns:320px minmax(0,1fr);min-height:calc(100vh - var(--topo-altura))}
body.sem-trilha .leitor-corpo{grid-template-columns:minmax(0,1fr)}
body.sem-trilha .sumario,body.sem-trilha .topo-sumario,body.sem-trilha .topo-progresso{display:none}

/* Barra lateral */
.sumario{position:sticky;top:var(--topo-altura);height:calc(100vh - var(--topo-altura));overflow-y:auto;
    background:#fff;border-right:1px solid var(--border-soft);padding:18px 12px 40px}
.sumario-cabeca{display:flex;align-items:center;justify-content:space-between;margin:0 8px 10px}
.sumario-titulo{margin:0;font-size:.76rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--dark-navy)}
.sumario-fechar{display:none;align-items:center;justify-content:center;width:36px;height:36px;font:inherit;font-size:1rem;
    color:var(--dark-navy);background:var(--bg-soft);border:0;border-radius:50%;cursor:pointer}
.sumario-progresso{display:grid;gap:6px;margin:0 8px 16px;font-size:.82rem;color:var(--text-body)}
.niveis,.aulas{list-style:none;margin:0;padding:0}
.nivel{border-top:1px solid var(--border-soft)}
.nivel summary{display:flex;align-items:center;gap:10px;padding:12px 8px;cursor:pointer;list-style:none;
    font-size:.9rem;font-weight:700;line-height:1.3;color:var(--dark-navy)}
.nivel summary::-webkit-details-marker{display:none}
.nivel summary::after{content:"";flex:0 0 auto;width:7px;height:7px;margin:0 4px;border:solid var(--dark-navy);
    border-width:0 2px 2px 0;transform:rotate(45deg);transition:transform .15s}
.nivel details[open] > summary::after{transform:rotate(-135deg)}
.nivel-num{flex:0 0 auto;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    background:var(--primary-purple);color:#fff;font-size:.8rem;font-weight:800}
.nivel-titulo{flex:1}
.nivel-contador{font-size:.75rem;font-weight:600;color:var(--text-muted);white-space:nowrap}
.aulas{padding:0 0 10px}
.aula{display:flex;gap:10px;align-items:flex-start;padding:8px 8px 8px 12px;border-left:3px solid transparent;
    border-radius:0 var(--radius-sm) var(--radius-sm) 0}
.aula .check{margin-top:2px}
.aula-link{display:grid;gap:3px;min-width:0;color:var(--text-strong);text-decoration:none}
.aula-titulo{font-size:.88rem;font-weight:500;line-height:1.35}
.aula-link:hover .aula-titulo{color:var(--purple-700);text-decoration:underline}
.aula-meta{display:flex;align-items:center;gap:5px;font-size:.72rem;color:var(--text-muted)}
.aula-meta img{width:16px;height:16px}
.aula.ativa{background:var(--bg-soft);border-left-color:var(--primary-purple)}
.aula.ativa .aula-titulo{font-weight:700;color:var(--dark-navy)}
.aula.feita .aula-titulo{color:var(--text-muted)}

/* Aula */
.palco{width:100%;max-width:920px;margin:0 auto;padding:28px 40px 64px}
.aula-contexto{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 14px;font-size:.84rem;color:var(--text-muted)}
.aula-contexto b{color:var(--dark-navy)}
.aula-contexto .papel{font-weight:700;color:var(--purple-700)}
.conteudo{background:#fff;border:1px solid var(--border-soft);border-radius:var(--radius-lg);padding:36px 44px;
    box-shadow:var(--shadow-md);line-height:1.65;color:var(--text-body)}
.conteudo:focus{outline:none}
.conteudo h1{font-size:2rem;font-weight:800;letter-spacing:-.025em;line-height:1.12;color:var(--dark-navy);
    margin:0 0 .6em;padding-bottom:.35em;border-bottom:2px solid var(--border-soft)}
.conteudo h1:focus{outline:none}
.conteudo h2{font-size:1.4rem;font-weight:800;letter-spacing:-.02em;line-height:1.2;color:var(--primary-purple);margin:1.6em 0 .5em}
.conteudo h3{font-size:1.12rem;font-weight:700;color:var(--dark-navy);margin:1.3em 0 .4em}
.conteudo h4{font-size:1rem;font-weight:700;color:var(--dark-navy);margin:1em 0 .3em}
.conteudo a{color:var(--purple-700);text-decoration:underline;text-underline-offset:2px}
.conteudo a:hover{color:var(--primary-purple)}
.conteudo code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--bg-soft);color:var(--dark-navy);
    padding:.12em .4em;border-radius:var(--radius-sm);font-size:.86em}
.conteudo pre{background:var(--dark-navy);color:#fff;border-radius:var(--radius-md);padding:16px 18px;overflow:auto}
.conteudo pre code{background:none;color:inherit;padding:0;font-size:.85em}
.conteudo blockquote{margin:1.2em 0;padding:.5em 1.1em;border-left:4px solid var(--primary-purple);background:var(--bg-soft);
    border-radius:0 var(--radius-md) var(--radius-md) 0;color:var(--dark-navy)}
.conteudo blockquote p{margin:.4em 0}
.conteudo table{display:block;overflow-x:auto;border-collapse:collapse;width:100%;margin:1.2em 0;font-size:.92rem}
.conteudo th,.conteudo td{padding:8px 12px;text-align:left;border-bottom:1px solid var(--border-soft)}
.conteudo thead th{background:var(--dark-navy);color:#fff;font-weight:700}
.conteudo tbody tr:nth-child(even){background:var(--bg-soft)}
.conteudo hr{border:0;border-top:1px solid var(--border-soft);margin:1.8em 0}
.conteudo img{max-width:100%;height:auto}
.conteudo ul,.conteudo ol{padding-left:1.5em}
.conteudo figure{margin:1.4em 0;text-align:center}
.conteudo figcaption{font-size:.85rem;color:var(--text-muted);margin-top:.5em}
.conteudo .mermaid{margin:1.6em 0;text-align:center;overflow-x:auto}
.conteudo .mermaid svg{max-width:100%;height:auto}
/* O Mermaid dimensiona cada caixa medindo o rótulo a 15px, mas o rótulo é HTML dentro do
   SVG e herdaria o tamanho da página — o texto estouraria a caixa. */
.conteudo .mermaid foreignObject div,.conteudo .mermaid foreignObject span,
.conteudo .mermaid foreignObject p{font-size:15px;line-height:1.35;margin:0}
.msg{color:var(--text-muted)}

/* Sequência da trilha */
.rodape-aula{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;margin-top:20px}
.rodape-link{display:grid;gap:2px;min-width:0;padding:10px 14px;background:#fff;border:1px solid var(--border-soft);
    border-radius:var(--radius-md);color:var(--dark-navy);text-decoration:none}
.rodape-link:hover{border-color:var(--primary-purple)}
.rodape-link[hidden]{display:grid;visibility:hidden}   /* mantém a coluna no grid */
.rodape-link .rotulo{font-size:.75rem;font-weight:700;color:var(--purple-700)}
.rodape-link .rotulo-titulo{font-size:.86rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rodape-link.proxima{text-align:right}
.btn-cta.feita{background:#fff;color:var(--purple-700);border-color:var(--primary-purple)}
.btn-cta.feita:hover{background:var(--bg-soft)}
.fonte{margin:18px 0 0;font-size:.8rem;color:var(--text-muted)}
.fonte code{background:var(--bg-soft);color:var(--dark-navy);padding:1px 6px;border-radius:var(--radius-sm)}
.fonte a{color:var(--purple-700)}

/* Celular: a barra lateral vira gaveta */
@media(max-width:899px){
  .leitor-corpo{grid-template-columns:minmax(0,1fr)}
  .sumario{position:fixed;top:0;left:0;bottom:0;height:auto;width:min(340px,88vw);z-index:60;box-shadow:var(--shadow-xl);
      transform:translateX(-100%);visibility:hidden;transition:transform .2s ease,visibility .2s}
  .sumario.aberto{transform:none;visibility:visible}
  .sumario-fechar{display:inline-flex}
  .fundo-gaveta{position:fixed;inset:0;z-index:55;background:rgba(10,0,90,.45)}
  .palco{padding:18px 16px 48px}
  .conteudo{padding:22px 18px}
  .conteudo h1{font-size:1.6rem}
  .rodape-aula{grid-template-columns:1fr 1fr}
  .rodape-aula .btn-cta{grid-column:1/-1;order:-1}
}
@media(min-width:900px){.fundo-gaveta{display:none}}
```

- [ ] **Step 3: Criar `assets/leitor.js`**

```js
// Leitor da trilha (doc.html): barra lateral com os níveis, aula em Markdown e a sequência
// anterior/próxima, sem recarregar a página. Links antigos doc.html?path=... continuam valendo.
import { progresso } from './progresso.js';
import { carregarTrilha } from './trilha.js';
import { montarConta, montarAviso } from './conta.js';
import { el } from './dom.js';
import { contar, hrefDoItem, idsDoDoc, localizar, todosFeitos, vizinhos } from './progresso-nucleo.js';

const $ = (id) => document.getElementById(id);
let niveis = [];
let atual = { path: null, item: null };   // item: nó da trilha, ou null para página fora dela
let diagramas = 0;

// ---- URL e Markdown -----------------------------------------------------------
function lerUrl() {
  const p = new URLSearchParams(location.search);
  return { path: (p.get('path') || 'README.md').replace(/^\.?\/+/, ''), item: p.get('item') };
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
  ctx.replaceChildren(
    el('span', {}, `Nível ${item.nivel} · `, el('b', {}, item.nivel_titulo)),
    el('span', { class: 'tag-tipo' }, el('img', { src: item.icone, alt: '', width: 18, height: 18 }), item.tipo_nome),
    item.papel !== 'core' ? el('span', { class: 'papel' }, item.papel_nome) : null);
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
    mostrarMensagem('Não foi possível abrir ', el('code', {}, path), ` (${e.message}). `,
      el('a', { href: 'index.html' }, 'Voltar para o início'));
  } finally {
    conteudo.removeAttribute('aria-busy');
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
```

- [ ] **Step 4: Verificar no navegador (desktop, celular, página fora da trilha, link antigo)**

```bash
python3 -m http.server 8765 >/dev/null 2>&1 & SRV=$!; sleep 1
U=http://localhost:8765
$CHROME --dump-dom --virtual-time-budget=5000 "$U/doc.html?path=docs/explicacao/fluxo-de-leitura-f-e-z.md" > "$RASCUNHO/leitor.html" 2>/dev/null
grep -oE '<li class="aula( [a-z ]+)?"' "$RASCUNHO/leitor.html" | wc -l   # uma por item da trilha
grep -o 'aria-current="page"[^>]*>' "$RASCUNHO/leitor.html" | head -2
grep -o 'Concluir e avançar' "$RASCUNHO/leitor.html" | head -1
$CHROME --screenshot="$RASCUNHO/t6_desktop.png" --window-size=1366,900 --virtual-time-budget=5000 "$U/doc.html?path=docs/explicacao/fluxo-de-leitura-f-e-z.md" 2>/dev/null
$CHROME --screenshot="$RASCUNHO/t6_celular.png" --window-size=390,844 --virtual-time-budget=5000 "$U/doc.html?path=docs/explicacao/fluxo-de-leitura-f-e-z.md" 2>/dev/null
$CHROME --screenshot="$RASCUNHO/t6_fora.png" --window-size=1366,900 --virtual-time-budget=5000 "$U/doc.html?path=docs/index.md" 2>/dev/null
$CHROME --screenshot="$RASCUNHO/t6_repetido.png" --window-size=1366,900 --virtual-time-budget=5000 "$U/doc.html?path=docs/referencia/glossario.md" 2>/dev/null
$CHROME --screenshot="$RASCUNHO/t6_mermaid.png" --window-size=1366,2400 --virtual-time-budget=8000 "$U/doc.html?path=docs/tutoriais/do-problema-ao-dashboard-publicado.md" 2>/dev/null
kill $SRV
```
Expected:
- O DOM tem uma `li.aula` por item do `ROADMAP.md` (conte com `python3 -c "import json;print(sum(len(n['itens']) for n in json.load(open('docs/trilhas/trilha.json'))['niveis']))"`); exatamente uma tem `aria-current="page"`; o rodapé mostra "Concluir e avançar".
- Inspecione os PNGs: desktop com lateral à esquerda, nível 1 aberto e aula ativa destacada; celular sem lateral visível e com o botão "☰ Conteúdo"; `docs/index.md` sem contexto nem rodapé de sequência; glossário situado no primeiro nível em que aparece; diagramas Mermaid nas cores da paleta, sem rótulos cortados; tabelas com cabeçalho navy.
- Se algo não bater, corrija antes do commit (use superpowers:systematic-debugging).

- [ ] **Step 5: Teste manual de interação (servidor local, navegador comum)**

`python3 -m http.server 8000` e abra `http://localhost:8000/doc.html?path=docs/explicacao/por-que-fazer-um-dashboard.md`:
1. Clicar numa aula da lateral troca o conteúdo sem recarregar e muda a URL; voltar/avançar do navegador funcionam.
2. Marcar pela lateral, pelo botão "Concluir e avançar" e desmarcar pela lateral; os contadores do nível e o percentual do topo acompanham.
3. Marcar o glossário marca também o segundo nó dele.
4. Em 390px: "☰ Conteúdo" abre a gaveta com foco na aula ativa; Esc fecha e devolve o foco ao botão; escolher uma aula fecha a gaveta.
5. Só com teclado (Tab/Enter/Espaço) dá para abrir nível, marcar aula e seguir a sequência; foco sempre visível.
6. Sem `firebaseConfig`, a barra superior não mostra botão de login e o console só tem, no máximo, avisos.

- [ ] **Step 6: Commit**

```bash
git add doc.html assets/leitor.css assets/leitor.js
git commit -m "site: leitor da trilha com barra lateral por níveis, estilo curso

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Mapa da trilha (`roadmap.html` + gerador)

**Files:**
- Modify: `tools/gen_roadmap.py` (`viewer`, `gen_html`)
- Modify: `roadmap.html` (tudo fora da região ROADMAP: `<style>`, cabeçalho, legenda, rodapé, script); regenerar a região
- Test: `tests/roadmap-html.test.js`

**Interfaces:**
- Consumes: `progresso`, `montarConta`, `montarAviso`, `carregarTrilha`, `contar`, `idsDoDoc` (tasks 1, 5); classes de `govhub.css` (Task 3).
- Produces: nós com `href="doc.html?path=<doc>&amp;item=<id codificado>"` e etiqueta `.tag-tipo` com ícone.

- [ ] **Step 1: Escrever o teste que falha — `tests/roadmap-html.test.js`**

```js
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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test tests/roadmap-html.test.js`
Expected: FAIL nos três testes.

- [ ] **Step 3: Gerador — `viewer` com `item` e nós com etiqueta**

No topo de `tools/gen_roadmap.py`, troque `import re, os, json, zipfile, html as htmlmod` por:

```python
import re, os, json, zipfile, html as htmlmod
from urllib.parse import quote
```

Troque `viewer` por:

```python
def viewer(doc, node_id=None):
    """Link para o leitor. O id do nó situa a posição quando o documento se repete na trilha."""
    url = "doc.html?path=" + doc
    return url + "&item=" + quote(node_id, safe="") if node_id else url
```

Em `gen_html`, remova `seen = {}` e a função interna `uid`, e troque `node` por:

```python
    ids = iter(node_ids(levels))

    def node(it):
        node_id = next(ids)
        label, cls, _f, _t, icone = TYPE_INFO[it["type"]]
        role = it["role"]
        classes = ["node", cls]
        if role in SUPPORT_ROLES:
            classes.append("support")
        if role == "capstone":
            classes.append("capstone")
        if role == "advanced":
            classes.append("advanced")
        # O título vem antes dos metadados: é o que se procura ao varrer a lista.
        # O botão carrega nome acessível próprio — "botão" sozinho não diz o que faz.
        # O tipo é ícone + nome (ADR 0003): a distinção não depende de cor.
        return ('      <div class="%s" data-id="%s">'
                '<button class="check" type="button" aria-pressed="false" aria-label="%s"></button>'
                '<div class="node-body">'
                '<a class="node-title" href="%s">%s</a>'
                '<span class="meta"><span class="tag-tipo"><img src="%s" alt="" width="18" height="18">%s</span>'
                '<span class="role">%s</span></span>'
                '</div></div>'
                % (" ".join(classes), esc(node_id),
                   escq("Marcar como concluído: " + it["title"]),
                   escq(viewer(it["doc"], node_id)), esc(it["title"]), icone, esc(label),
                   ROLE_DISPLAY[role]))
```

- [ ] **Step 4: `roadmap.html` — estilo, cabeçalho, legenda, rodapé e script**

Substitua todo o bloco `<style>…</style>` do `<head>` por:

```html
<style>
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{margin:0;line-height:1.55}
  a{color:inherit;text-decoration:none}
  .wrap{max-width:1080px;margin:0 auto;padding:0 20px}

  .hero{position:relative;overflow:hidden;background:var(--dark-navy);color:#fff;padding:46px 0 40px;text-align:center}
  .hero .wrap{position:relative;z-index:1}
  .hero h1{margin:0 0 10px;font-size:2.1rem;font-weight:800;letter-spacing:-.025em;line-height:1.08}
  .hero p{margin:0 auto;max-width:720px}

  .progresso-mapa{position:sticky;top:var(--topo-altura);z-index:25;background:#fff;border-bottom:1px solid var(--border-soft);padding:10px 0}
  .progresso-mapa .wrap{display:flex;align-items:center;gap:14px}
  .progresso-mapa b{font-size:.85rem;color:var(--dark-navy);white-space:nowrap}
  .progresso-mapa .barra{flex:1}
  #reset{font:inherit;font-size:.75rem;border:1px solid var(--border-soft);background:var(--bg-soft);border-radius:var(--radius-sm);
      padding:4px 10px;cursor:pointer;color:var(--text-body)}

  .legenda{display:flex;flex-wrap:wrap;gap:10px 16px;justify-content:center;align-items:center;padding:18px 0 4px;font-size:.8rem;color:var(--text-body)}
  .legenda > span:not(.tag-tipo){display:inline-flex;align-items:center;gap:6px}
  .amostra{display:inline-block;width:18px;height:12px;border:2px solid var(--border-soft);border-left:4px solid var(--dark-navy);border-radius:3px;background:#fff}
  .amostra.apoio{border-style:dashed;border-left-style:solid;border-left-color:var(--text-muted)}
  .amostra.capstone{border-color:var(--accent-rose);background:var(--bg-soft)}
  .amostra.avancado{border-left:5px double var(--dark-navy)}

  .roadmap{position:relative;padding:24px 0 60px}
  .roadmap::before{content:"";position:absolute;top:0;bottom:0;left:50%;width:3px;background:var(--border-soft);transform:translateX(-50%);z-index:0}
  .start,.finish{position:relative;z-index:2;text-align:center;margin:0 auto 8px;max-width:380px;color:#fff;font-weight:700;
      padding:10px 18px;border-radius:999px;background:var(--primary-purple)}
  .finish{background:var(--dark-navy);margin-top:10px}

  .level{position:relative;z-index:2;margin:30px 0}
  .milestone{position:relative;z-index:2;max-width:580px;margin:0 auto 16px;background:#fff;border:2px solid var(--dark-navy);
      border-radius:var(--radius-md);padding:12px 18px;display:flex;gap:14px;align-items:center;box-shadow:var(--shadow-md);
      scroll-margin-top:calc(var(--topo-altura) + 56px)}
  .milestone .num{flex:0 0 auto;width:38px;height:38px;border-radius:50%;background:var(--primary-purple);color:#fff;
      display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem}
  .milestone h2{font-size:1.05rem;margin:0;line-height:1.3;color:var(--dark-navy);font-weight:800;letter-spacing:-.01em}
  .milestone p{margin:2px 0 0;font-size:.84rem;color:var(--text-body)}

  /* Índice dos níveis */
  .atalhos{max-width:880px;margin:4px auto 22px;padding:0 20px;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;position:relative;z-index:2}
  .atalhos-rot{font-size:.78rem;color:var(--text-muted);font-weight:700}
  .atalhos-lista{display:flex;gap:8px;flex-wrap:wrap;flex:1}
  .atalhos a{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1px solid var(--border-soft);border-radius:999px;
      padding:5px 12px;font-size:.78rem;color:var(--text-strong);line-height:1.2}
  .atalhos a:hover{border-color:var(--primary-purple);background:var(--bg-soft)}
  .atalhos a b{color:var(--purple-700);font-weight:800}
  @media(max-width:600px){.atalhos a{font-size:.74rem;padding:4px 10px}}

  .nodes{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;max-width:880px;margin:0 auto;position:relative;z-index:2}
  @media(max-width:720px){.nodes{grid-template-columns:1fr}}
  .node{position:relative;background:#fff;border:2px solid var(--border-soft);border-left:5px solid var(--dark-navy);
      border-radius:var(--radius-md);padding:10px 12px;display:flex;gap:10px;align-items:flex-start;transition:box-shadow .12s,transform .12s}
  .node:hover{box-shadow:var(--shadow-lg);transform:translateY(-1px)}
  /* o card inteiro abre a aula: o link do título se estica por cima do cartão,
     sem virar um segundo link para quem usa leitor de tela */
  .node .node-title::after{content:"";position:absolute;inset:0;border-radius:8px}
  .node:focus-within{outline:3px solid var(--purple-700);outline-offset:3px}
  .node .node-title:focus-visible{outline:none}
  .node .check{margin-top:2px}
  .node.support{border-style:dashed;border-left-style:solid;border-left-color:var(--text-muted)}
  .node.capstone{border-color:var(--accent-rose);background:var(--bg-soft)}
  .node.capstone .tag-tipo{background:#fff}
  .node.advanced{border-left-style:double;border-left-width:7px}
  .node-body{min-width:0}
  .node .node-title{font-size:.94rem;font-weight:600;color:var(--dark-navy);display:inline-block;margin:0 0 5px;
      text-decoration:underline;text-decoration-color:var(--border-soft);text-underline-offset:3px;text-decoration-thickness:1px}
  .node .node-title:hover{color:var(--primary-purple);text-decoration-color:currentColor}
  .node .meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:.72rem;color:var(--text-muted)}
  .node.advanced .role{color:var(--dark-navy);font-weight:700}
  /* feito: fundo claro e título riscado — sem opacidade, que derrubaria o contraste */
  .node.done{background:var(--bg-soft)}
  .node.done .tag-tipo{background:#fff}
  .node.done .node-title{text-decoration:line-through;text-decoration-color:var(--text-muted)}

  .tip{max-width:760px;margin:6px auto 0;background:#fff;border:1px solid var(--border-soft);border-left:4px solid var(--primary-purple);
      border-radius:var(--radius-md);padding:12px 16px;font-size:.88rem;color:var(--dark-navy)}
  footer{padding:26px 0;color:var(--text-muted);font-size:.84rem;text-align:center;border-top:1px solid var(--border-soft);margin-top:40px}
  footer a{color:var(--purple-700);text-decoration:underline}
</style>
```

Substitua o trecho que vai de `<nav><div class="wrap">` até o fim de `<div class="legend">…</div>` (inclusive a `progress-bar`) por:

```html
<a class="pular" href="#trilha">Pular para a trilha</a>

<header class="topo"><div class="topo-wrap">
  <a class="marca" href="index.html"><img src="assets/logo/logomarca-horizontal-white.svg" alt="Gov Hub" width="103" height="24"><span>Trilha de Dashboards</span></a>
  <nav class="topo-links" aria-label="Principal">
    <a href="index.html">Início</a>
    <a href="roadmap.html" aria-current="page">Mapa da trilha</a>
    <a href="doc.html?path=docs/index.md">Documentação</a>
  </nav>
  <div class="conta" id="conta"></div>
</div></header>

<section class="hero">
  <span class="forma forma-quarto" aria-hidden="true"></span>
  <div class="wrap">
    <h1>Trilha de capacitação em Dashboards</h1>
    <p>Do "por que um dashboard" ao dashboard publicado no Gov Hub. Siga a espinha de cima para baixo;
    cada nível tem itens <b>essenciais</b> (faça todos) e itens de <b>apoio</b> (opcionais / aprofundamento).
    Marque o que concluir aqui ou dentro de cada aula. Entre com a sua conta Google para levar o progresso
    para qualquer computador.</p>
  </div>
</section>

<div class="progresso-mapa"><div class="wrap">
  <b id="ptxt">Carregando…</b>
  <span class="barra" aria-hidden="true"><span id="pfill"></span></span>
  <button id="reset" type="button">limpar progresso</button>
</div></div>

<div class="wrap" id="trilha">
  <div class="legenda">
    <span class="tag-tipo"><img src="assets/icones/light-bulb-sober.svg" alt="" width="18" height="18">Explicação</span>
    <span class="tag-tipo"><img src="assets/icones/document-text-sober.svg" alt="" width="18" height="18">Referência</span>
    <span class="tag-tipo"><img src="assets/icones/wrench-sober.svg" alt="" width="18" height="18">Guia</span>
    <span class="tag-tipo"><img src="assets/icones/book-open-sober.svg" alt="" width="18" height="18">Tutorial</span>
    <span class="tag-tipo"><img src="assets/icones/trophy-sober.svg" alt="" width="18" height="18">Desafio</span>
    <span class="tag-tipo"><img src="assets/icones/beaker-sober.svg" alt="" width="18" height="18">Pesquisa</span>
    <span><i class="amostra"></i>Essencial</span>
    <span><i class="amostra apoio"></i>Apoio / opcional</span>
    <span><i class="amostra capstone"></i>Capstone</span>
    <span><i class="amostra avancado"></i>Avançado</span>
  </div>
```

(O `<div class="wrap">` que abria a legenda no arquivo atual é o mesmo que envolve `.roadmap` e `.tip`; mantenha o fechamento `</div>` existente depois da `.tip`.)

Troque o `<footer>…</footer>` por:

```html
<footer><div class="wrap">
  Trilha de capacitação em Dashboards · Gov Hub ·
  estrutura baseada em <a href="https://diataxis.fr/">Diátaxis</a>,
  inspiração visual <a href="https://roadmap.sh/">roadmap.sh</a>.
</div></footer>
```

Troque o `<script>…</script>` final por:

```html
<script type="module">
  import { progresso } from './assets/progresso.js';
  import { montarConta, montarAviso } from './assets/conta.js';
  import { carregarTrilha } from './assets/trilha.js';
  import { contar, idsDoDoc } from './assets/progresso-nucleo.js';

  montarConta(document.getElementById('conta'), progresso);
  montarAviso(progresso);
  const { niveis } = await carregarTrilha();
  const nos = [...document.querySelectorAll('.node')];
  const docDoNo = new Map(niveis.flatMap((n) => n.itens.map((i) => [i.id, i.doc])));

  function pintar() {
    const feitos = progresso.feitos();
    for (const no of nos) {
      const feito = !!feitos[no.dataset.id];
      no.classList.toggle('done', feito);
      no.querySelector('.check').setAttribute('aria-pressed', String(feito));
    }
    const c = contar(feitos, niveis);
    document.getElementById('ptxt').textContent = `${c.feitas} de ${c.total} concluídas`;
    document.getElementById('pfill').style.width = c.percentual + '%';
  }

  // Um documento pode estar em mais de um nó: marcar um marca todos (mesma regra do leitor).
  for (const no of nos) {
    no.querySelector('.check').addEventListener('click', (ev) => {
      ev.preventDefault();
      progresso.alternar(idsDoDoc(niveis, docDoNo.get(no.dataset.id)));
    });
  }
  document.getElementById('reset').addEventListener('click', () => {
    if (confirm('Apagar todo o progresso da trilha? Com a conta conectada, apaga também na nuvem.')) progresso.zerar();
  });
  progresso.aoMudar(pintar);
  pintar();
</script>
```

- [ ] **Step 5: Regenerar e rodar os testes**

Run: `python3 tools/gen_roadmap.py && node --test tests/*.test.js`
Expected: PASS em todos; `git diff --stat` mostra `roadmap.html` e `tools/gen_roadmap.py` (o `trilha.json` não muda).

- [ ] **Step 6: Verificar no navegador**

```bash
python3 -m http.server 8765 >/dev/null 2>&1 & SRV=$!; sleep 1
$CHROME --screenshot="$RASCUNHO/t7_mapa.png" --window-size=1280,2200 --virtual-time-budget=5000 http://localhost:8765/roadmap.html 2>/dev/null
$CHROME --screenshot="$RASCUNHO/t7_mapa_celular.png" --window-size=390,1600 --virtual-time-budget=5000 http://localhost:8765/roadmap.html 2>/dev/null
kill $SRV
```
Expected (inspecione os PNGs): barra superior roxa, hero navy com o quarto de círculo roxo, etiquetas de tipo com ícone, contador "0 de N concluídas", capstones com borda `#BE006E`. No navegador comum: marcar no mapa aparece marcado no leitor e vice-versa.

- [ ] **Step 7: Commit**

```bash
git add tools/gen_roadmap.py roadmap.html tests/roadmap-html.test.js roadmap-dashboards.xmind
git commit -m "site: mapa da trilha na identidade sóbria, com o progresso compartilhado

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Página inicial (`index.html`)

**Files:**
- Modify: `index.html` (`<style>`, barra superior, hero, quadrantes, mapa de conteúdo, botões da seção trilha, script)

**Interfaces:**
- Consumes: `progresso`, `montarConta`, `montarAviso`, `carregarTrilha`, `contar`, `itensEmOrdem`, `hrefDoItem`.
- Produces: nada consumido por outras tasks.

- [ ] **Step 1: Substituir o `<style>` do `<head>`**

```html
<style>
  *{box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{margin:0;line-height:1.6}
  a{color:var(--purple-700);text-decoration:none}
  a:hover{text-decoration:underline}
  code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--bg-soft);color:var(--dark-navy);padding:.1em .4em;border-radius:4px;font-size:.88em}
  .wrap{max-width:1080px;margin:0 auto;padding:0 20px}

  .hero{position:relative;overflow:hidden;background:var(--dark-navy);color:#fff;padding:60px 0 54px}
  .hero .wrap{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1.6fr) minmax(260px,1fr);gap:36px;align-items:center}
  @media(max-width:860px){.hero .wrap{grid-template-columns:1fr}}
  .hero h1{margin:0 0 14px;font-size:2.5rem;font-weight:800;letter-spacing:-.025em;line-height:1.06}
  .hero p.sub{font-size:1.08rem;margin:0 0 22px}
  .hero a:focus-visible{outline-color:#fff}
  .badges{display:flex;flex-wrap:wrap;gap:8px}
  .badges a{color:#fff;border:1px solid rgba(255,255,255,.55);padding:5px 12px;border-radius:999px;font-size:.8rem}
  .badges a:hover{background:rgba(255,255,255,.12);text-decoration:none}

  .meu-progresso{background:#fff;color:var(--text-body);border-radius:var(--radius-lg);padding:22px;box-shadow:var(--shadow-xl)}
  .meu-progresso a:focus-visible{outline-color:var(--purple-700)}
  .meu-progresso .rotulo{margin:0;font-size:.76rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--dark-navy)}
  .meu-progresso .numero{display:block;margin:6px 0 2px;font-size:2.6rem;font-weight:800;letter-spacing:-.05em;line-height:1.1;color:var(--primary-purple)}
  .meu-progresso p{margin:0}
  .meu-progresso .barra{margin:12px 0 16px}
  .meu-progresso .btn{width:100%}
  .meu-progresso .dica{margin-top:12px;font-size:.8rem;color:var(--text-muted)}

  section{padding:48px 0;border-bottom:1px solid var(--border-soft);scroll-margin-top:var(--topo-altura)}
  section:nth-of-type(even){background:#fff}
  section h2{font-size:1.7rem;font-weight:800;letter-spacing:-.025em;line-height:1.1;margin:0 0 8px;color:var(--dark-navy)}
  section .lead{color:var(--text-body);margin:0 0 24px;max-width:820px}
  h3{font-size:1.08rem;font-weight:700;color:var(--dark-navy);margin:26px 0 10px}
  .grid{display:grid;gap:16px}
  .cols-3{grid-template-columns:repeat(3,1fr)}
  .cols-2{grid-template-columns:repeat(2,1fr)}
  @media(max-width:780px){.cols-3,.cols-2{grid-template-columns:1fr}}
  .card{background:#fff;border:1px solid var(--border-soft);border-radius:var(--radius-md);padding:18px;box-shadow:var(--shadow-md)}
  section:nth-of-type(even) .card{background:var(--bg-soft);box-shadow:none}
  .card h4{margin:0 0 8px;font-size:1rem;font-weight:700;color:var(--dark-navy)}
  .card p{margin:0;font-size:.9rem}

  .compass{max-width:760px;margin:8px auto 0}
  .compass .axis-x{text-align:center;color:var(--text-muted);font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;font-weight:700;padding:8px}
  .quad-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  @media(max-width:600px){.quad-grid{grid-template-columns:1fr}}
  .quad{display:block;border-radius:var(--radius-md);padding:18px;border:1px solid var(--border-soft);background:#fff;color:var(--text-body);
      transition:box-shadow .15s,transform .15s,border-color .15s}
  .quad:hover{text-decoration:none;transform:translateY(-2px);box-shadow:var(--shadow-lg);border-color:var(--primary-purple)}
  .quad h4{margin:10px 0 4px;font-size:1.05rem;font-weight:700;color:var(--dark-navy)}
  .quad p{margin:0;font-size:.88rem}

  .map{border-left:4px solid var(--primary-purple);padding:4px 0 4px 18px;margin:0 0 24px}
  .map h3{margin:0 0 10px;display:flex;align-items:center;gap:8px}
  .map h3 img{width:28px;height:28px}
  .map ul{margin:0;padding-left:18px;columns:2;column-gap:32px}
  @media(max-width:680px){.map ul{columns:1}}
  .map li{margin:3px 0;font-size:.92rem;break-inside:avoid}

  pre.tree{background:var(--dark-navy);color:#fff;border-radius:var(--radius-md);padding:20px;overflow:auto;
      font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.82rem;line-height:1.5}
  pre.tree .c{color:var(--border-soft)}
  pre.tree a{color:#fff;text-decoration:underline}
  .phases{display:grid;gap:14px}
  .phase{background:#fff;border:1px solid var(--border-soft);border-left:5px solid var(--primary-purple);border-radius:var(--radius-md);padding:16px 18px}
  .phase h4{margin:0 0 6px;color:var(--dark-navy)}
  .phase ul{margin:6px 0 0;padding-left:20px;font-size:.9rem}
  .botoes{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 22px}
  .note{background:var(--bg-soft);border:1px solid var(--border-soft);border-left:4px solid var(--primary-purple);border-radius:var(--radius-md);
      padding:12px 16px;font-size:.92rem;color:var(--dark-navy)}
  table.diataxis{border-collapse:collapse;width:100%;font-size:.9rem;background:#fff}
  table.diataxis th,table.diataxis td{padding:8px 12px;text-align:left;border-bottom:1px solid var(--border-soft)}
  table.diataxis th{background:var(--dark-navy);color:#fff}
  table.diataxis tr:nth-child(odd) td{background:var(--bg-soft)}
  footer{padding:30px 0;color:var(--text-muted);font-size:.85rem;text-align:center}
</style>
```

- [ ] **Step 2: Barra superior e hero**

Substitua do `<nav><div class="wrap">` até o `</div></header>` do hero por (o hero vira `div`: a página só deve ter um marco "banner", a barra superior):

```html
<a class="pular" href="#visao-geral">Pular para o conteúdo</a>

<header class="topo"><div class="topo-wrap">
  <a class="marca" href="index.html"><img src="assets/logo/logomarca-horizontal-white.svg" alt="Gov Hub" width="103" height="24"><span>Trilha de Dashboards</span></a>
  <nav class="topo-links" aria-label="Principal">
    <a href="index.html" aria-current="page">Início</a>
    <a href="roadmap.html">Mapa da trilha</a>
    <a href="doc.html?path=docs/index.md">Documentação</a>
  </nav>
  <div class="conta" id="conta"></div>
</div></header>

<div class="hero">
  <span class="forma forma-quarto" aria-hidden="true"></span>
  <span class="forma forma-anel" aria-hidden="true"></span>
  <div class="wrap">
    <div>
      <h1>Trilha de Capacitação em Dashboards</h1>
      <p class="sub">Um material prático para servidoras e servidores que precisam construir dashboards
      bons — não apenas dashboards bonitos. Da pergunta de negócio ao painel publicado no
      <strong>GovHub</strong>, com <strong>Apache Superset</strong> e <strong>Power BI</strong>, e com
      acessibilidade tratada como requisito, não como acabamento.</p>
      <div class="badges">
        <a href="https://diataxis.fr/" target="_blank">Estrutura: Diátaxis</a>
        <a href="https://www.gov.br/governodigital/pt-br/acessibilidade-e-usuario/acessibilidade-digital/eMAGv31.pdf" target="_blank">Acessibilidade: eMAG</a>
        <a href="https://www.w3.org/WAI/standards-guidelines/wcag/" target="_blank">WCAG</a>
        <a href="roadmap.html">Mapa da trilha</a>
        <a href="doc.html?path=README.md">README</a>
      </div>
    </div>
    <div class="meu-progresso" role="region" aria-labelledby="meu-rotulo">
      <p class="rotulo" id="meu-rotulo">Seu progresso</p>
      <span class="numero" id="meu-percentual">0%</span>
      <p id="meu-texto">Comece pela primeira aula do Nível 0.</p>
      <span class="barra" aria-hidden="true"><span id="meu-barra"></span></span>
      <a class="btn btn-cta" id="meu-botao" href="doc.html?path=docs/explicacao/por-que-fazer-um-dashboard.md&amp;item=explicacao%2Fpor-que-fazer-um-dashboard">Começar a trilha</a>
      <p class="dica" id="meu-dica" hidden>Entre com a sua conta Google para levar o progresso para qualquer computador.</p>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Quadrantes e mapa de conteúdo com ícones**

```bash
python3 - <<'EOF'
import re
p = 'index.html'
s = open(p, encoding='utf-8').read()
ic = lambda nome, tam: '<img src="assets/icones/%s-sober.svg" alt="" width="%d" height="%d">' % (nome, tam, tam)
quads = {'q-tut': 'book-open', 'q-gui': 'wrench', 'q-exp': 'light-bulb', 'q-ref': 'document-text'}
for cls, nome in quads.items():
    s, n = re.subn(r'<a class="quad %s" (href="[^"]+")><span class="tag">' % cls,
                   r'<a class="quad" \1><span class="tag-tipo">' + ic(nome, 18), s)
    assert n == 1, cls
mapas = {'exp': 'light-bulb', 'ref': 'document-text', 'gui': 'wrench', 'tut': 'book-open', 'des': 'trophy', 'pes': 'beaker'}
for cls, nome in mapas.items():
    s, n = re.subn(r'<div class="map %s"><h3>' % cls, '<div class="map"><h3>' + ic(nome, 28), s)
    assert n == 1, cls
old = '''  <p style="margin:0 0 22px">
    <a class="btn" href="roadmap.html">Abrir a trilha visual</a>
    <a class="btn alt" href="doc.html?path=docs/trilhas/index.md" style="margin-left:8px">Ver em texto</a>
  </p>'''
new = '''  <p class="botoes">
    <a class="btn" href="roadmap.html">Abrir o mapa da trilha</a>
    <a class="btn btn-secundario" href="doc.html?path=docs/trilhas/index.md">Ver em texto</a>
  </p>'''
assert old in s
s = s.replace(old, new)
open(p, 'w', encoding='utf-8').write(s)
EOF
grep -c 'tag-tipo\|class="map"><h3><img' index.html
```
Expected: `10` (4 quadrantes + 6 mapas).

- [ ] **Step 4: Script do progresso**

Logo antes de `</body>`, acrescente:

```html
<script type="module">
  import { progresso } from './assets/progresso.js';
  import { montarConta, montarAviso } from './assets/conta.js';
  import { carregarTrilha } from './assets/trilha.js';
  import { contar, itensEmOrdem, hrefDoItem } from './assets/progresso-nucleo.js';

  montarConta(document.getElementById('conta'), progresso);
  montarAviso(progresso);
  const { niveis } = await carregarTrilha();
  const primeira = itensEmOrdem(niveis)[0];

  function pintar() {
    const c = contar(progresso.feitos(), niveis);
    const ultima = progresso.ultimaAula();
    document.getElementById('meu-percentual').textContent = c.percentual + '%';
    document.getElementById('meu-barra').style.width = c.percentual + '%';
    document.getElementById('meu-texto').textContent = c.feitas
      ? `${c.feitas} de ${c.total} aulas concluídas.`
      : `${c.total} aulas em ${niveis.length} níveis. Comece pelo Nível 0.`;
    const botao = document.getElementById('meu-botao');
    if (ultima && ultima.path) {
      botao.textContent = 'Continuar de onde parei';
      botao.href = 'doc.html?path=' + ultima.path + (ultima.item ? '&item=' + encodeURIComponent(ultima.item) : '');
    } else {
      botao.textContent = 'Começar a trilha';
      botao.href = hrefDoItem(primeira);
    }
    document.getElementById('meu-dica').hidden = !progresso.nuvemDisponivel() || !!progresso.usuario();
  }
  progresso.aoMudar(pintar);
  pintar();
</script>
```

- [ ] **Step 5: Regenerar (região LEVELS) e verificar**

```bash
python3 tools/gen_roadmap.py && node --test tests/*.test.js
python3 -m http.server 8765 >/dev/null 2>&1 & SRV=$!; sleep 1
$CHROME --screenshot="$RASCUNHO/t8_inicio.png" --window-size=1280,2400 --virtual-time-budget=5000 http://localhost:8765/index.html 2>/dev/null
$CHROME --screenshot="$RASCUNHO/t8_inicio_celular.png" --window-size=390,1800 --virtual-time-budget=5000 http://localhost:8765/index.html 2>/dev/null
kill $SRV
git status --porcelain -- roadmap.html index.html docs/
```
Expected: testes PASS; nos PNGs, hero navy com o card "Seu progresso" e o botão `#BE006E` "Começar a trilha", quadrantes e mapas com ícones; o `git status` lista só `index.html` (alterado por você), sem outras mudanças em gerados. No navegador comum: depois de abrir uma aula no leitor, o botão vira "Continuar de onde parei" e leva a ela.

- [ ] **Step 6: Commit**

```bash
git add index.html roadmap-dashboards.xmind
git commit -m "site: página inicial na identidade sóbria, com progresso e continuar de onde parou

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Limpeza da transição e verificação final

**Files:**
- Modify: `assets/govhub.css` (remover o bloco TRANSIÇÃO)
- Modify: `README.md` (§3 estrutura de pastas e §6 pré-visualizar)

- [ ] **Step 1: Confirmar que nada usa os nomes antigos e remover o bloco**

```bash
grep -rnP -- "--(gh-[a-z-]+|ink|muted|line|panel|bg|accent|focus|tut|gui|ref|exp|des|res|green|green-d|red-d)(-bg)?(?![-a-z])|class=\"brand\"|'Inter'" index.html roadmap.html doc.html assets/*.css assets/*.js tools/gen_roadmap.py
```
Expected: só ocorrências dentro do bloco `/* --- TRANSIÇÃO` de `assets/govhub.css`. Se aparecer em outro arquivo, troque pela variável nova equivalente (tabela no próprio bloco) antes de seguir.

Remova de `assets/govhub.css` tudo entre `/* --- TRANSIÇÃO` e `/* --- fim da transição --- */` (inclusive), e na regra de foco troque
`.topo a:focus-visible,.topo button:focus-visible,.topo summary:focus-visible,body > nav a:focus-visible,.brand:focus-visible{outline-color:#fff}` por
`.topo a:focus-visible,.topo button:focus-visible,.topo summary:focus-visible{outline-color:#fff}`.

- [ ] **Step 2: README — estrutura de pastas e pré-visualização**

Na §3 (bloco da árvore de pastas), garanta que `assets/` aparece com:

```
├── assets/
│   ├── govhub.css               identidade visual (tokens do modo sóbrio) e componentes comuns
│   ├── leitor.css · leitor.js   leitor da trilha (doc.html)
│   ├── progresso-*.js           progresso: núcleo, loja e Firebase (ADR 0004)
│   ├── firebase-config.js       configuração do Firebase (vazia = só navegador)
│   ├── logo/ · icones/ · ilustracoes/
├── tests/                       node --test tests/*.test.js
├── firestore.rules              regras de segurança do progresso
```

Na §6 (Pré-visualizar localmente), depois do bloco de comandos, acrescente:

````markdown
Testes do progresso e do índice da trilha (Node 20+):

```bash
node --test tests/*.test.js
```
````

- [ ] **Step 3: Verificação completa**

```bash
python3 tools/gen_roadmap.py
git status --porcelain --untracked-files=all -- roadmap.html index.html docs/   # vazio: gerados em dia
node --test tests/*.test.js                                                     # tudo PASS
python3 -m http.server 8765 >/dev/null 2>&1 & SRV=$!; sleep 1
U=http://localhost:8765
for p in "index.html" "roadmap.html" "doc.html?path=docs/explicacao/hierarquia-visual.md" "doc.html?path=docs/referencia/checklist-de-acessibilidade.md"; do
  n=$(echo "$p" | tr -c 'a-z0-9' '_')
  $CHROME --screenshot="$RASCUNHO/final_$n.png" --window-size=1366,1000 --virtual-time-budget=6000 "$U/$p" 2>/dev/null
  $CHROME --screenshot="$RASCUNHO/final_cel_$n.png" --window-size=390,900 --virtual-time-budget=6000 "$U/$p" 2>/dev/null
done
kill $SRV
grep -rhoiE '#[0-9a-f]{6}\b' assets/*.css index.html roadmap.html doc.html | tr a-f A-F | sort -u
```
Expected: gerados em dia; testes passando; os hex encontrados são só os da paleta (`#613EFF #0A005A #F2F1F6 #BE006E #5235D9 #3F28A6 #202020 #2D3748 #666666 #FFFFFF #E9DFFF`). Inspecione os 8 PNGs: identidade consistente nas três páginas, ilustração `hierarquia-visual.svg` com as cores novas, tabela do checklist com cabeçalho navy e zebra.

Em seguida, siga o roteiro manual da Task 6, Step 5, e marque/desmarque também pelo mapa e pela página inicial, conferindo que os três ficam sincronizados.

- [ ] **Step 4: Commit**

```bash
git add assets/govhub.css README.md
git commit -m "site: remove os nomes da identidade anterior e documenta a estrutura nova

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Teste com Firebase de verdade (quando o projeto existir)**

Depois que alguém seguir o README §7.6 e preencher `assets/firebase-config.js`, em `http://localhost:8000`:
1. "Entrar com Google" abre o popup; ao voltar, aparecem avatar e primeiro nome.
2. Aulas marcadas antes do login continuam marcadas; no console do Firestore, `progresso/<uid>` tem os mesmos ids; `localStorage` não tem mais `govhub-dashboards-roadmap-v1`.
3. Marcar uma aula numa aba aparece na outra aba (e em outro navegador logado na mesma conta) sem recarregar.
4. "Sair" deixa o site sem nenhuma aula marcada e sem `govhub-dashboards-progresso-conta` no `localStorage`.
5. No simulador de regras do console, ler `progresso/<outro-uid>` autenticado como você é **negado**.
