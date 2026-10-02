# Várias trilhas, feedback anônimo e diagramas — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O site passa a hospedar várias trilhas (home = catálogo, mapa e leitor por trilha, página de conclusão), ganha feedback anônimo por aula salvo no Firestore e troca os diagramas Mermaid por figuras da skill `govhub-diagramas`.

**Architecture:** Site estático, sem build. Cada trilha é um `trilhas/<slug>.md`; `tools/gen_roadmap.py` gera `docs/trilhas/<slug>.json` e o catálogo `docs/trilhas/index.json`. As páginas (`index.html`, `mapa.html`, `doc.html`, `concluida.html`) montam tudo no navegador a partir desses JSONs. O progresso continua na loja (`assets/progresso-loja.js`), agora por aula (id = caminho do doc) e com `ultimaAula = {trilha, path}`. O feedback vai para a coleção `feedback` do Firestore, sem uid.

**Tech Stack:** HTML/CSS/JS (módulos ES), Python 3 (gerador, `unittest`), Node 20+ (`node --test`), Firebase JS SDK 12.19.0 (gstatic), marked (jsDelivr), skill `govhub-diagramas` (Playwright + Chromium) para os PNGs.

**Spec:** `docs/superpowers/specs/2026-10-01-varias-trilhas-feedback-diagramas-design.md`

## Global Constraints

- Sem etapa de build; o GitHub Pages publica o repositório como está. Publicação: `git push origin main` e, como o repositório é um fork cujas Actions de push podem não disparar, `gh workflow run publicar.yml -R egewarth/capacitacao-govhub --ref main` + `gh run watch <id> -R egewarth/capacitacao-govhub --exit-status`.
- Fonte das trilhas: `trilhas/<slug>.md`. Gerados (não editar à mão): `docs/trilhas/*.json`, `docs/trilhas/*.md`, `docs/trilhas/*.xmind`. Rode `python3 tools/gen_roadmap.py` e commite o resultado sempre que mexer no gerador ou numa trilha.
- O texto das aulas (`docs/**/*.md`, exceto `docs/superpowers/` e `docs/adr/`) não muda — exceto, no bloco B, a troca do bloco ```` ```mermaid ```` pela imagem.
- Id de aula = caminho do doc sem `docs/` e sem `.md` (ex.: `explicacao/hierarquia-visual`). Vale em todas as trilhas. Um doc não pode se repetir dentro da mesma trilha.
- URLs: catálogo `index.html`; mapa `mapa.html?trilha=<slug>`; leitor `doc.html?trilha=<slug>&path=<doc>`; conclusão `concluida.html?trilha=<slug>`. `roadmap.html` redireciona para `mapa.html?trilha=dashboards`.
- `ultimaAula = { trilha, path }`. Formato antigo `{ path, item }` é lido como `{ trilha: 'dashboards', path }`.
- Chaves de `localStorage` inalteradas: `govhub-dashboards-roadmap-v1` (anônimo), `govhub-dashboards-ultima-aula`, `govhub-dashboards-progresso-conta`.
- Firestore: `progresso/{uid}` com chaves só `feitos`, `ultimaAula`, `avaliadas`, `atualizadoEm`; coleção `feedback` só aceita criar, campos `trilha`, `aula`, `clareza` ('confuso'|'claro'|'muito-claro'), `uso` ('sim'|'talvez'|'nao'), `comentario?` (≤ 1000), `periodo` ('AAAA-MM'). **Nunca** gravar uid, nome, e-mail ou horário no feedback. As regras novas precisam ser publicadas pelo usuário no console **antes** do deploy do bloco E.
- Identidade: só tokens de `assets/govhub.css` (roxo `#613EFF`, navy `#0A005A`, claro `#F2F1F6`, acento `#BE006E` só em CTA/detalhe, `#5235D9`/`#3F28A6`, textos `#202020`/`#2D3748`/`#666666`, borda `#E9DFFF`, branco). Reddit Sans. Nenhuma página declara hex próprio além de branco.
- Acessibilidade: foco visível, `[hidden]` sempre esconde (regra `[hidden]{display:none}` onde uma classe der `display`), textos de dados via `el()`/`textContent` (nunca `innerHTML` com dados), alternativas textuais nas imagens.
- `assets/firebase-config.js` tem a configuração real (projeto `capacitacao-gov-hub`): não editar. `firestore.rules` espelha as regras publicadas no console.
- Commits em português no estilo do repositório (`site: …`, `tools: …`, `docs: …`), corpo terminando exatamente com `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Verificação visual: `CHROME=~/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`, servidor `python3 -m http.server 8765` (matar ao fim), capturas em `RASCUNHO=/tmp/claude-1000/-home-joaoegewarth-capacitacao-govhub/a78f0449-cf56-4247-a4a2-79403ad33f87/scratchpad`, conferidas com a ferramenta Read.

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `trilhas/dashboards.md` (ex-`ROADMAP.md`) | Fonte da trilha de Dashboards, com cabeçalho |
| `tools/gen_roadmap.py` | Lê `trilhas/*.md`; gera JSON/MD/xmind por trilha e o catálogo |
| `tests/test_gen_roadmap.py` (novo) | `unittest` das validações do gerador |
| `tests/trilhas-json.test.js` (novo; substitui `trilha-json.test.js` e `roadmap-html.test.js`) | Contrato dos JSONs gerados |
| `assets/progresso-nucleo.js` | Funções puras (ids únicos, `hrefDoItem(trilha,item)`, `pendentes`) |
| `assets/progresso-loja.js` | `ultimaAula` com trilha; `avaliadas`, `foiAvaliada`, `avaliar` |
| `assets/progresso-nuvem.js` | `gravarTudo` com merge, `normalizar` com `avaliadas`, `enviarFeedback`, `marcarAvaliada` |
| `assets/trilha.js` | `carregarCatalogo()`, `carregarTrilha(slug)`, `escolherTrilha(catalogo, slug)` |
| `assets/leitor.js`, `doc.html` | Leitor por trilha; "Concluir a trilha"; bloco de feedback; sem Mermaid |
| `assets/mapa.js`, `assets/mapa.css`, `mapa.html` (novos) | Mapa da trilha montado do JSON (visual atual do `roadmap.html`) |
| `roadmap.html` | Redirecionamento |
| `assets/concluida.js`, `concluida.html` (novos) | Página de conclusão |
| `index.html`, `assets/catalogo.js` (novo) | Catálogo de trilhas |
| `assets/feedback.js`, `assets/feedback.css` (novos) | Bloco de avaliação no leitor |
| `assets/diagramas/*.html`, `*.png` (novos) | Diagramas Gov Hub (fonte + imagem) |
| `firestore.rules` | Regras novas (feedback + `avaliadas`) |
| `docs/adr/0005-*.md`, `docs/adr/0006-*.md`, `README.md`, `CONTRIBUTING.md`, `CONTEXT.md`, `.github/workflows/publicar.yml` | Registro, instruções e CI |

---

## Bloco C — Várias trilhas

### Task 1: Gerador multi-trilha

**Files:**
- Move: `ROADMAP.md` → `trilhas/dashboards.md` (com `git mv`) e acrescentar o cabeçalho
- Modify: `tools/gen_roadmap.py`
- Delete: `roadmap-dashboards.xmind`, `tests/trilha-json.test.js`
- Create: `tests/test_gen_roadmap.py`, `tests/trilhas-json.test.js`
- Generate: `docs/trilhas/index.json`, `docs/trilhas/index.md`, `docs/trilhas/dashboards.json`, `docs/trilhas/dashboards.md`, `docs/trilhas/dashboards.xmind`, e — **temporariamente, até a Task 5** — `docs/trilhas/trilha.json` (cópia de `dashboards.json`, para as páginas atuais continuarem funcionando)
- Modify: `.github/workflows/publicar.yml`

**Interfaces:**
- Produces (Python, em `tools/gen_roadmap.py`): `ler_cabecalho(texto, origem) -> (meta: dict, corpo: list[str])`; `parse(linhas) -> (levels, dropped)` (inalterada); `validar_repetidos(levels, origem)`; `trilha_json(meta, levels) -> dict`; `gerar(trilhas_dir, out_dir) -> list[dict]` (metas na ordem do slug); `main()`.
- Produces (arquivos): `docs/trilhas/<slug>.json` = `{_aviso, slug, titulo, descricao, [diagrama, diagrama_alt], niveis:[{numero, titulo, descricao, itens:[{id, titulo, doc, tipo, tipo_nome, papel, papel_nome, icone}]}]}`; `docs/trilhas/index.json` = `{_aviso, trilhas:[{slug, titulo, descricao, niveis:<int>, aulas:[ids]}]}`.

- [ ] **Step 1: Mover a fonte e acrescentar o cabeçalho**

```bash
mkdir -p trilhas && git mv ROADMAP.md trilhas/dashboards.md
```

No topo de `trilhas/dashboards.md`, antes da linha `# Trilha de aprendizagem — Dashboards no GovHub`, acrescente:

```markdown
---
slug: dashboards
titulo: Dashboards no Gov Hub
descricao: Do "por que um dashboard" ao painel publicado no Gov Hub, com Apache Superset e Power BI e com acessibilidade como requisito.
---
```

(`diagrama`/`diagrama_alt` entram no bloco B.) No blockquote de instruções logo abaixo do título, troque as menções a `ROADMAP.md`, `roadmap.html`, `roadmap-dashboards.xmind` e `docs/trilhas/index.md` por: "Edite **apenas este arquivo** e rode `python3 tools/gen_roadmap.py`. Ele regenera `docs/trilhas/dashboards.json` (lido pelo mapa, pelo leitor e pelo catálogo), `docs/trilhas/dashboards.md` (versão em texto) e `docs/trilhas/dashboards.xmind` (mapa mental). Um mesmo documento não pode aparecer duas vezes nesta trilha." Mantenha o restante do texto.

- [ ] **Step 2: Escrever os testes que falham — `tests/test_gen_roadmap.py`**

```python
import importlib.util, json, os, tempfile, unittest

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("gen", os.path.join(REPO, "tools", "gen_roadmap.py"))
gen = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gen)

CABECALHO = "---\nslug: teste\ntitulo: Trilha teste\ndescricao: Uma trilha.\n---\n"
CORPO = ("# Trilha\n\n## Nível 0 · Base\nAbertura do nível.\n\n"
         "- [explanation] **Por que** — core — `docs/explicacao/por-que-fazer-um-dashboard.md`\n"
         "- [reference] **Glossário** — support — `docs/referencia/glossario.md`\n")


class Cabecalho(unittest.TestCase):
    def test_le_campos(self):
        meta, corpo = gen.ler_cabecalho(CABECALHO + CORPO, "t.md")
        self.assertEqual(meta["slug"], "teste")
        self.assertEqual(meta["titulo"], "Trilha teste")
        self.assertEqual(corpo[0], "# Trilha")

    def test_exige_cabecalho(self):
        with self.assertRaises(SystemExit):
            gen.ler_cabecalho(CORPO, "t.md")

    def test_exige_campos_obrigatorios(self):
        with self.assertRaises(SystemExit):
            gen.ler_cabecalho("---\nslug: x\ntitulo: X\n---\n" + CORPO, "t.md")

    def test_slug_valido(self):
        with self.assertRaises(SystemExit):
            gen.ler_cabecalho(CABECALHO.replace("teste", "Teste Ruim"), "t.md")

    def test_diagrama_exige_alt(self):
        with self.assertRaises(SystemExit):
            gen.ler_cabecalho(CABECALHO.replace("---\n#", "#").replace(
                "descricao: Uma trilha.\n", "descricao: Uma trilha.\ndiagrama: assets/x.png\n"), "t.md")


class Validacoes(unittest.TestCase):
    def test_documento_repetido_na_mesma_trilha(self):
        levels, _ = gen.parse((CORPO + "- [reference] **De novo** — core — `docs/referencia/glossario.md`\n").split("\n"))
        with self.assertRaises(SystemExit):
            gen.validar_repetidos(levels, "t.md")


class Geracao(unittest.TestCase):
    def gerar(self, arquivos):
        trilhas = tempfile.mkdtemp()
        saida = tempfile.mkdtemp()
        for nome, texto in arquivos.items():
            open(os.path.join(trilhas, nome), "w", encoding="utf-8").write(texto)
        return gen.gerar(trilhas, saida), saida

    def test_json_da_trilha_e_catalogo(self):
        metas, saida = self.gerar({"teste.md": CABECALHO + CORPO})
        self.assertEqual([m["slug"] for m in metas], ["teste"])
        trilha = json.load(open(os.path.join(saida, "teste.json"), encoding="utf-8"))
        itens = trilha["niveis"][0]["itens"]
        self.assertEqual([i["id"] for i in itens], ["explicacao/por-que-fazer-um-dashboard", "referencia/glossario"])
        self.assertEqual(itens[1]["papel"], "support")
        catalogo = json.load(open(os.path.join(saida, "index.json"), encoding="utf-8"))
        self.assertEqual(catalogo["trilhas"][0]["aulas"], [i["id"] for i in itens])
        self.assertEqual(catalogo["trilhas"][0]["niveis"], 1)
        for nome in ("teste.md", "teste.xmind", "index.md"):
            self.assertTrue(os.path.exists(os.path.join(saida, nome)), nome)

    def test_slug_repetido_entre_arquivos(self):
        with self.assertRaises(SystemExit):
            self.gerar({"a.md": CABECALHO + CORPO, "b.md": CABECALHO + CORPO})

    def test_xmind_deterministico(self):
        _, s1 = self.gerar({"teste.md": CABECALHO + CORPO})
        _, s2 = self.gerar({"teste.md": CABECALHO + CORPO})
        self.assertEqual(open(os.path.join(s1, "teste.xmind"), "rb").read(),
                         open(os.path.join(s2, "teste.xmind"), "rb").read())


if __name__ == "__main__":
    unittest.main()
```

Nota: o teste `test_diagrama_exige_alt` monta um cabeçalho com `diagrama` sem `diagrama_alt`; se a construção da string ficar confusa, escreva o cabeçalho literal (`"---\nslug: teste\ntitulo: T\ndescricao: D\ndiagrama: assets/x.png\n---\n"`) — o que importa é o caso.

- [ ] **Step 3: Rodar e ver falhar**

Run: `python3 -m unittest discover -s tests -p 'test_*.py' -v`
Expected: FAIL/ERROR — `ler_cabecalho`, `validar_repetidos`, `gerar` não existem.

- [ ] **Step 4: Reescrever `tools/gen_roadmap.py`**

Mantenha `TYPE_INFO`, `ROLE_DISPLAY`, `SUPPORT_ROLES`, `ITEM_RE`, `LEVEL_RE`, `parse`, `STUB_BODY`, `scaffold_missing`, `data_id`, `gen_xmind` (adaptado) e `warnings` (adaptado). **Remova** `gen_html`, `gen_index`, `gen_trilha_json` antigo, `node_ids`, `viewer`, `START_LINE`/`END_LINE`/`IDX_END`, `OUT_HTML`, `OUT_INDEX`, `OUT_XMIND`, `OUT_TRILHAS`, `OUT_TRILHA_JSON`, `PROGRESS_KEY` e o `SRC` único. Docstring do módulo: descreve as entradas (`trilhas/*.md`) e saídas (`docs/trilhas/<slug>.json|.md|.xmind`, `index.json`, `index.md`) e a regra de ids.

Constantes e funções novas:

```python
TRILHAS_DIR = os.path.join(REPO, "trilhas")
OUT_DIR = os.path.join(REPO, "docs", "trilhas")
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
AVISO = "Gerado por tools/gen_roadmap.py a partir de trilhas/ - nao edite a mao."
CAMPOS_OBRIGATORIOS = ("slug", "titulo", "descricao")
XMIND_DATA = (1980, 1, 1, 0, 0, 0)   # data fixa: o .xmind só muda quando o conteúdo muda


def ler_cabecalho(texto, origem):
    """Lê o bloco `---` do topo (linhas `chave: valor`). Devolve (meta, linhas do corpo)."""
    linhas = texto.split("\n")
    if not linhas or linhas[0].strip() != "---":
        raise SystemExit("%s: falta o cabeçalho (--- slug, titulo, descricao ---) no topo" % origem)
    meta, fim = {}, None
    for i in range(1, len(linhas)):
        l = linhas[i].strip()
        if l == "---":
            fim = i
            break
        if not l:
            continue
        if ":" not in l:
            raise SystemExit("%s: linha de cabeçalho inválida: %r" % (origem, linhas[i]))
        chave, valor = l.split(":", 1)
        meta[chave.strip()] = valor.strip()
    if fim is None:
        raise SystemExit("%s: cabeçalho sem o --- de fechamento" % origem)
    for campo in CAMPOS_OBRIGATORIOS:
        if not meta.get(campo):
            raise SystemExit("%s: cabeçalho sem %r" % (origem, campo))
    if not SLUG_RE.match(meta["slug"]):
        raise SystemExit("%s: slug inválido %r (use letras minúsculas, números e hífen)" % (origem, meta["slug"]))
    if bool(meta.get("diagrama")) != bool(meta.get("diagrama_alt")):
        raise SystemExit("%s: diagrama e diagrama_alt andam juntos" % origem)
    return meta, linhas[fim + 1:]


def validar_repetidos(levels, origem):
    """O id da aula é o caminho do doc: o mesmo doc duas vezes na trilha teria um só progresso."""
    vistos = {}
    for lv in levels:
        for it in lv["items"]:
            if it["doc"] in vistos:
                raise SystemExit("%s: %s aparece duas vezes na trilha (níveis %d e %d)"
                                 % (origem, it["doc"], vistos[it["doc"]], lv["num"]))
            vistos[it["doc"]] = lv["num"]


def trilha_json(meta, levels):
    niveis = []
    for lv in levels:
        itens = []
        for it in lv["items"]:
            label, _cls, _pasta, slug_tipo, icone = TYPE_INFO[it["type"]]
            itens.append({
                "id": data_id(it["doc"]), "titulo": it["title"], "doc": it["doc"],
                "tipo": slug_tipo, "tipo_nome": label,
                "papel": it["role"], "papel_nome": ROLE_DISPLAY[it["role"]],
                "icone": icone,
            })
        niveis.append({"numero": lv["num"], "titulo": lv["title"], "descricao": lv["desc"], "itens": itens})
    dados = {"_aviso": AVISO, "slug": meta["slug"], "titulo": meta["titulo"], "descricao": meta["descricao"]}
    if meta.get("diagrama"):
        dados["diagrama"] = meta["diagrama"]
        dados["diagrama_alt"] = meta["diagrama_alt"]
    dados["niveis"] = niveis
    return dados


def escrever_json(caminho, dados):
    open(caminho, "w", encoding="utf-8").write(json.dumps(dados, ensure_ascii=False, indent=2) + "\n")
```

`gen_xmind(meta, levels, caminho)`: o mesmo conteúdo de hoje (raiz com `meta["titulo"]`), mas escrevendo cada entrada com `zipfile.ZipInfo(nome, date_time=XMIND_DATA)` e `compress_type=zipfile.ZIP_DEFLATED`, para o arquivo ser determinístico.

`gen_texto(meta, levels, caminho)`: a versão em texto da trilha, como o `gen_trilhas` atual, com links relativos a `docs/trilhas/` (`"../" + doc sem "docs/"`), título `# <titulo>`, a descrição, e as linhas de cabeçalho: `> Versão visual, com progresso: **[mapa da trilha](../../mapa.html?trilha=<slug>)**` e `> Gerado a partir de **[trilhas/<slug>.md](../../trilhas/<slug>.md)** por \`tools/gen_roadmap.py\` — não edite à mão.`

`gen_catalogo_texto(metas_e_levels, caminho)`: `# Trilhas` + uma linha por trilha `- [<titulo>](<slug>.md) — <descricao>`.

```python
def gerar(trilhas_dir, out_dir):
    """Gera tudo de todas as trilhas. Devolve as metas na ordem do catálogo (slug)."""
    os.makedirs(out_dir, exist_ok=True)
    trilhas = []
    for nome in sorted(os.listdir(trilhas_dir)):
        if not nome.endswith(".md"):
            continue
        origem = os.path.join("trilhas", nome)
        meta, corpo = ler_cabecalho(open(os.path.join(trilhas_dir, nome), encoding="utf-8").read(), origem)
        levels, dropped = parse(corpo)
        validar_repetidos(levels, origem)
        trilhas.append((meta, levels, dropped, origem))
    slugs = [m["slug"] for m, _l, _d, _o in trilhas]
    repetidos = sorted(set(s for s in slugs if slugs.count(s) > 1))
    if repetidos:
        raise SystemExit("slug repetido entre trilhas: %s" % ", ".join(repetidos))
    if not trilhas:
        raise SystemExit("nenhuma trilha em %s" % trilhas_dir)
    trilhas.sort(key=lambda t: t[0]["slug"])

    catalogo = []
    for meta, levels, _dropped, _origem in trilhas:
        dados = trilha_json(meta, levels)
        escrever_json(os.path.join(out_dir, meta["slug"] + ".json"), dados)
        gen_texto(meta, levels, os.path.join(out_dir, meta["slug"] + ".md"))
        gen_xmind(meta, levels, os.path.join(out_dir, meta["slug"] + ".xmind"))
        catalogo.append({
            "slug": meta["slug"], "titulo": meta["titulo"], "descricao": meta["descricao"],
            "niveis": len(levels), "aulas": [i["id"] for n in dados["niveis"] for i in n["itens"]],
        })
    escrever_json(os.path.join(out_dir, "index.json"), {"_aviso": AVISO, "trilhas": catalogo})
    gen_catalogo_texto([(m, l) for m, l, _d, _o in trilhas], os.path.join(out_dir, "index.md"))
    return [t[0] for t in trilhas]
```

`main()`: chama `gerar(TRILHAS_DIR, OUT_DIR)`; depois `scaffold_missing` para cada trilha (re-ler níveis — guarde-os numa lista de retorno auxiliar ou faça `gerar` devolver também os levels; mantenha simples); **compatibilidade temporária**: copia `docs/trilhas/dashboards.json` para `docs/trilhas/trilha.json` com um comentário `# TEMPORÁRIO até a Task 5`; imprime um resumo por trilha (níveis, aulas, linhas ignoradas, esqueletos criados, avisos). O esqueleto (`scaffold_missing`) roda **antes** da geração dos JSONs, como hoje.

Ajuste `warnings(levels)`: remove o aviso de "caminho referenciado Nx" (agora é erro) e mantém o de número de nível duplicado.

- [ ] **Step 5: Rodar os testes Python**

Run: `python3 -m unittest discover -s tests -p 'test_*.py' -v`
Expected: PASS em todos.

- [ ] **Step 6: Gerar e remover os artefatos antigos**

```bash
python3 tools/gen_roadmap.py
git rm -q roadmap-dashboards.xmind tests/trilha-json.test.js
ls docs/trilhas/
```
Expected: `dashboards.json dashboards.md dashboards.xmind index.json index.md trilha.json`. `docs/trilhas/index.md` agora é o catálogo em texto.

- [ ] **Step 7: Contrato dos JSONs — `tests/trilhas-json.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const ler = (rel) => readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
const catalogo = JSON.parse(ler('docs/trilhas/index.json'));
const TIPOS = ['tutorial', 'guia', 'referencia', 'explicacao', 'desafio', 'pesquisa'];
const PAPEIS = ['core', 'support', 'capstone', 'optional', 'advanced'];

test('o catálogo lista as trilhas em ordem de slug', () => {
  const slugs = catalogo.trilhas.map((t) => t.slug);
  assert.ok(slugs.length > 0);
  assert.deepEqual(slugs, [...slugs].sort());
  assert.ok(slugs.includes('dashboards'));
});

for (const resumo of catalogo.trilhas) {
  const trilha = JSON.parse(ler(`docs/trilhas/${resumo.slug}.json`));

  test(`${resumo.slug}: cabeçalho e níveis completos`, () => {
    assert.equal(trilha.slug, resumo.slug);
    assert.ok(trilha.titulo && trilha.descricao);
    assert.equal(!!trilha.diagrama, !!trilha.diagrama_alt);
    if (trilha.diagrama) assert.ok(existsSync(new URL('../' + trilha.diagrama, import.meta.url)), trilha.diagrama);
    trilha.niveis.forEach((nivel, i) => {
      assert.equal(nivel.numero, i);
      for (const item of nivel.itens) {
        assert.equal(item.id, item.doc.replace(/^docs\//, '').replace(/\.md$/, ''));
        assert.ok(TIPOS.includes(item.tipo) && PAPEIS.includes(item.papel));
        assert.ok(item.tipo_nome && item.papel_nome && item.titulo);
        assert.match(item.icone, /^assets\/icones\/[a-z-]+-sober\.svg$/);
        assert.ok(existsSync(new URL('../' + item.doc, import.meta.url)), item.doc);
      }
    });
  });

  test(`${resumo.slug}: ids únicos e iguais aos do catálogo`, () => {
    const ids = trilha.niveis.flatMap((n) => n.itens.map((i) => i.id));
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(resumo.aulas, ids);
    assert.equal(resumo.niveis, trilha.niveis.length);
  });
}
```

Run: `node --test tests/*.test.js`
Expected: PASS em todos (os testes de `roadmap-html.test.js` continuam passando: `roadmap.html` e `trilha.json` ainda existem e os ids não mudaram).

- [ ] **Step 8: CI**

Em `.github/workflows/publicar.yml`: renomeie o passo "Regenerar a partir do ROADMAP.md" para "Regenerar as trilhas"; troque o comentário do topo ("corresponde ao ROADMAP.md") por "corresponde a trilhas/ — a fonte das trilhas"; acrescente, antes do passo de regeneração, o passo:

```yaml
      - name: Testes do gerador
        run: python3 -m unittest discover -s tests -p 'test_*.py'
```

e na checagem de arquivos gerados troque `-- roadmap.html index.html docs/` por `-- docs/` (o `.xmind` agora é determinístico e fica dentro de `docs/trilhas/`; ajuste o comentário que falava do `.xmind`). Mensagem de erro: "Rodar 'python3 tools/gen_roadmap.py' mudou arquivos versionados — uma trilha foi editada sem regenerar, ou falta commitar o esqueleto de uma página nova."

- [ ] **Step 9: Conferir e commitar**

```bash
python3 tools/gen_roadmap.py && git status --porcelain --untracked-files=all -- docs/   # só o que você vai commitar
node --test tests/*.test.js && python3 -m unittest discover -s tests -p 'test_*.py'
git add trilhas/ tools/gen_roadmap.py docs/trilhas/ tests/ .github/workflows/publicar.yml
git commit -m "tools: gerador passa a ler várias trilhas em trilhas/

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Núcleo, carregamento de trilhas e última aula com trilha

**Files:**
- Modify: `assets/progresso-nucleo.js`, `tests/progresso-nucleo.test.js`
- Modify: `assets/trilha.js`
- Modify: `assets/progresso-loja.js`, `tests/progresso-loja.test.js`

**Interfaces:**
- Consumes: JSONs da Task 1.
- Produces:
  - `progresso-nucleo.js`: `itensEmOrdem`, `mesclar`, `todosFeitos`, `alternar`, `contar` (inalterados); `idDoDoc(doc) → string`; `localizar(niveis, doc) → item|null`; `vizinhos(niveis, id) → {anterior, proxima}`; `hrefDoItem(trilha, item) → 'doc.html?trilha=<slug>&path=<doc>'`; `pendentes(feitos, niveis) → item[]`. **Removido:** `idsDoDoc` (o id é único por trilha: os chamadores passam `[item.id]`).
  - `trilha.js`: `carregarCatalogo() → Promise<{trilhas}>`; `carregarTrilha(slug) → Promise<trilha>`; `escolherTrilha(catalogo, slug) → slug` (o pedido se existir, senão o primeiro do catálogo, senão `null`). Promessas rejeitadas não ficam em cache.
  - `progresso-loja.js`: `registrarUltimaAula(trilha, path)`; `ultimaAula() → {trilha, path}|null` normalizada; `export function normalizarUltima(valor) → {trilha, path}|null`.

- [ ] **Step 1: Testes do núcleo (substituir os que usam `idsDoDoc`/`item`)**

Reescreva `tests/progresso-nucleo.test.js` com o fixture abaixo (sem doc repetido; ids = caminho) e estes casos, mantendo os de `itensEmOrdem`, `mesclar`, `todosFeitos`, `alternar` e `contar`:

```js
const NIVEIS = [
  { numero: 0, titulo: 'Fundamentos', itens: [
    { id: 'explicacao/a', titulo: 'A', doc: 'docs/explicacao/a.md', tipo: 'explicacao', papel: 'core' },
    { id: 'referencia/g', titulo: 'Glossário', doc: 'docs/referencia/g.md', tipo: 'referencia', papel: 'support' },
  ] },
  { numero: 1, titulo: 'Arquitetura', itens: [
    { id: 'explicacao/b', titulo: 'B', doc: 'docs/explicacao/b.md', tipo: 'explicacao', papel: 'core' },
  ] },
];

test('idDoDoc tira docs/ e .md', () => {
  assert.equal(idDoDoc('docs/explicacao/a.md'), 'explicacao/a');
  assert.equal(idDoDoc('README.md'), 'README');
});

test('localizar acha a aula pelo doc, ou null fora da trilha', () => {
  assert.equal(localizar(NIVEIS, 'docs/explicacao/b.md').id, 'explicacao/b');
  assert.equal(localizar(NIVEIS, 'docs/index.md'), null);
});

test('vizinhos segue a ordem e para nas pontas', () => {
  assert.equal(vizinhos(NIVEIS, 'explicacao/a').anterior, null);
  assert.equal(vizinhos(NIVEIS, 'referencia/g').proxima.id, 'explicacao/b');
  assert.equal(vizinhos(NIVEIS, 'explicacao/b').proxima, null);
});

test('hrefDoItem leva a trilha e o doc', () => {
  assert.equal(hrefDoItem('dashboards', NIVEIS[1].itens[0]), 'doc.html?trilha=dashboards&path=docs/explicacao/b.md');
});

test('pendentes lista as aulas não feitas, na ordem', () => {
  assert.deepEqual(pendentes({ 'explicacao/a': true }, NIVEIS).map((i) => i.id), ['referencia/g', 'explicacao/b']);
  assert.deepEqual(pendentes({ 'explicacao/a': true, 'referencia/g': true, 'explicacao/b': true }, NIVEIS), []);
});
```

Run: `node --test tests/progresso-nucleo.test.js` → FAIL (funções novas não existem).

- [ ] **Step 2: Implementar no núcleo**

Em `assets/progresso-nucleo.js`: atualize o cabeçalho (`niveis` vem de `docs/trilhas/<slug>.json`; id = caminho do doc, único na trilha e comum a todas as trilhas); remova `idsDoDoc` e o comentário sobre nós repetidos em `alternar` (troque por "Marcar ou desmarcar vale para todos os ids passados."); substitua `localizar`, `hrefDoItem` e acrescente:

```js
export function idDoDoc(doc) {
  return doc.replace(/^docs\//, '').replace(/\.md$/, '');
}

export function localizar(niveis, doc) {
  return itensEmOrdem(niveis).find((i) => i.doc === doc) || null;
}

export function hrefDoItem(trilha, item) {
  return 'doc.html?trilha=' + encodeURIComponent(trilha) + '&path=' + item.doc;
}

export function pendentes(feitos, niveis) {
  return itensEmOrdem(niveis).filter((i) => !feitos[i.id]);
}
```

Run: `node --test tests/progresso-nucleo.test.js` → PASS.

- [ ] **Step 3: `assets/trilha.js`**

```js
// Catálogo e trilhas (docs/trilhas/*.json, gerados de trilhas/*.md por tools/gen_roadmap.py).
// Cada arquivo é baixado uma vez por página; uma falha não fica em cache (dá para tentar de novo).
const cache = new Map();

function buscar(url) {
  if (!cache.has(url)) {
    const promessa = fetch(url).then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
    promessa.catch(() => cache.delete(url));
    cache.set(url, promessa);
  }
  return cache.get(url);
}

export const carregarCatalogo = () => buscar('docs/trilhas/index.json');
export const carregarTrilha = (slug) => buscar('docs/trilhas/' + encodeURIComponent(slug) + '.json');

// O slug pedido, se existir no catálogo; senão a primeira trilha; senão null.
export function escolherTrilha(catalogo, slug) {
  const slugs = (catalogo && catalogo.trilhas || []).map((t) => t.slug);
  if (slug && slugs.includes(slug)) return slug;
  return slugs[0] || null;
}
```

- [ ] **Step 4: Última aula com trilha na loja — testes primeiro**

Em `tests/progresso-loja.test.js`, ajuste os testes existentes que chamam `registrarUltimaAula(path, item)` para a nova assinatura `registrarUltimaAula('dashboards', path)` e os que comparam `ultimaAula()` com `{ path, item }` para `{ trilha: 'dashboards', path }` (a intenção de cada teste continua a mesma). Acrescente:

```js
import { normalizarUltima } from '../assets/progresso-loja.js';

test('normalizarUltima lê o formato antigo como trilha dashboards', () => {
  assert.deepEqual(normalizarUltima({ path: 'docs/a.md', item: 'a' }), { trilha: 'dashboards', path: 'docs/a.md' });
  assert.deepEqual(normalizarUltima({ trilha: 'outra', path: 'docs/b.md' }), { trilha: 'outra', path: 'docs/b.md' });
  assert.equal(normalizarUltima(null), null);
  assert.equal(normalizarUltima({}), null);
});

test('registrarUltimaAula guarda a trilha', async () => {
  const arm = armazenamentoFalso();
  const loja = criarLoja({ armazenamento: arm });
  await loja.iniciar();
  loja.registrarUltimaAula('dashboards', 'docs/a.md');
  assert.deepEqual(loja.ultimaAula(), { trilha: 'dashboards', path: 'docs/a.md' });
  assert.deepEqual(arm.json(CHAVE_ULTIMA_ANONIMO), { trilha: 'dashboards', path: 'docs/a.md' });
});

test('ultimaAula antiga salva no navegador é lida com a trilha dashboards', async () => {
  const arm = armazenamentoFalso({ [CHAVE_ULTIMA_ANONIMO]: { path: 'docs/a.md', item: 'a' } });
  const loja = criarLoja({ armazenamento: arm });
  await loja.iniciar();
  assert.deepEqual(loja.ultimaAula(), { trilha: 'dashboards', path: 'docs/a.md' });
});
```

Run: `node --test tests/progresso-loja.test.js` → FAIL.

- [ ] **Step 5: Implementar na loja**

Em `assets/progresso-loja.js`:

```js
// Antes de haver várias trilhas, a última aula era { path, item } e só existia a de Dashboards.
export function normalizarUltima(valor) {
  if (!valor || !valor.path) return null;
  return { trilha: valor.trilha || 'dashboards', path: valor.path };
}
```

- `registrarUltimaAula(trilha, path)`: `ultimaAula = { trilha, path };` (o resto da função igual).
- No objeto retornado: `ultimaAula: () => normalizarUltima(ultimaAula)`.

Nada mais muda na lógica de sessão. Run: `node --test tests/*.test.js` → PASS (exceto o que depende de páginas — nenhum nesta task).

- [ ] **Step 6: Commit**

```bash
git add assets/progresso-nucleo.js assets/trilha.js assets/progresso-loja.js tests/progresso-nucleo.test.js tests/progresso-loja.test.js
git commit -m "site: núcleo e loja por trilha, com ids por aula e última aula com trilha

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

Observação: depois desta task as páginas atuais ainda chamam `idsDoDoc`, `carregarTrilha()` sem slug e `hrefDoItem(item)`. Elas são reescritas nas Tasks 3–5; **não publique** entre as Tasks 2 e 5.

---

### Task 3: Leitor por trilha e "Concluir a trilha"

**Files:**
- Modify: `assets/leitor.js`, `doc.html`

**Interfaces:**
- Consumes: `carregarCatalogo`, `carregarTrilha(slug)`, `escolherTrilha` (Task 2); `contar`, `hrefDoItem(trilha, item)`, `localizar(niveis, doc)`, `todosFeitos`, `vizinhos` (Task 2); `progresso.registrarUltimaAula(trilha, path)`.
- Produces: URL `doc.html?trilha=<slug>&path=<doc>`; ao concluir a última aula, `concluida.html?trilha=<slug>`. Elemento `<section id="feedback" hidden>` reservado em `doc.html` entre o `<article>` e a `<nav class="rodape-aula">` (usado no bloco E).

Mudanças em `assets/leitor.js` (mantenha todo o resto: segurança de caminho, gaveta, foco, interceptação):

1. Estado: `let trilha = null;` (objeto da trilha) e `let slug = null;`.
2. `lerUrl()` passa a devolver `{ trilha: p.get('trilha'), path }` (sem `item`; links antigos com `item` simplesmente o ignoram).
3. Início:
   ```js
   let catalogo = null;
   try { catalogo = await carregarCatalogo(); } catch { catalogo = null; }
   slug = escolherTrilha(catalogo, lerUrl().trilha) || 'dashboards';
   try { trilha = await carregarTrilha(slug); niveis = trilha.niveis || []; } catch { trilha = null; niveis = []; }
   ```
   Se a URL não tinha `trilha` (ou tinha um slug inexistente), corrija-a com `history.replaceState` acrescentando `trilha=<slug>` (preservando `path` e o `#`).
4. `corrigirLinks`: links para `.md` viram `'doc.html?trilha=' + encodeURIComponent(slug) + '&path=' + r + frag`.
5. `interceptarLinks`: se `url.searchParams.get('trilha')` existir e for diferente de `slug`, **não intercepte** (deixe o navegador carregar a página inteira da outra trilha).
6. `aoVoltar`: compara só `path` (`destino.path === atual.path` → não reabre).
7. `abrir({ path })`: `atual = { path, item: localizar(niveis, path) }`; `progresso.registrarUltimaAula(slug, path)` quando `atual.item`; título da página: `(h1 || path) + ' · ' + (trilha ? trilha.titulo : 'Trilhas') + ' · Gov Hub'`.
8. Barra lateral: o botão de cada aula chama `progresso.alternar([item.id])`; o link usa `hrefDoItem(slug, item)`. O `.sumario-titulo` mostra `trilha.titulo` (fallback "Conteúdo da trilha").
9. Topo: o link "Mapa da trilha" (dê a ele `id="link-mapa"` em `doc.html`) recebe `href = 'mapa.html?trilha=' + encodeURIComponent(slug)`.
10. Rodapé da aula (`pintarRodape`/`aoClicarCta`):
    - Com próxima aula: como hoje, usando `[atual.item.id]` e `hrefDoItem(slug, proxima)` ("Concluir e avançar" / "Próxima aula →").
    - **Última aula da trilha:** o botão é **sempre** "Concluir a trilha" (classe `feita` só para o estilo se já estiver feita). Ao clicar: se não estiver feita, `progresso.alternar([atual.item.id])`; depois `location.href = 'concluida.html?trilha=' + encodeURIComponent(slug)`.
11. Remova toda referência a `idsDoDoc`.

Em `doc.html`: acrescente `id="link-mapa"` ao link "Mapa da trilha" e, entre o `</article>` e a `<nav class="rodape-aula"…>`, `<section class="feedback" id="feedback" aria-labelledby="feedback-titulo" hidden></section>`.

- [ ] **Step 1: Implementar as mudanças acima**
- [ ] **Step 2: Verificar no navegador headless**

```bash
python3 -m http.server 8765 >/dev/null 2>&1 & SRV=$!; sleep 1
U=http://localhost:8765
$CHROME --dump-dom --virtual-time-budget=6000 "$U/doc.html?path=docs/explicacao/indicacao-de-contexto.md" > "$RASCUNHO/c3-sem-trilha.html" 2>/dev/null
grep -o 'trilha=dashboards&amp;path=docs/explicacao/[a-z-]*\.md' "$RASCUNHO/c3-sem-trilha.html" | head -3   # links da lateral com trilha
grep -c '<li class="aula' "$RASCUNHO/c3-sem-trilha.html"                                                   # todas as aulas da trilha
$CHROME --dump-dom --virtual-time-budget=6000 "$U/doc.html?trilha=dashboards&path=docs/referencia/papeis-e-permissoes.md" | grep -o 'Concluir a trilha'
$CHROME --dump-dom --virtual-time-budget=6000 "$U/doc.html?trilha=dashboards&path=docs/explicacao/por-que-fazer-um-dashboard.md" | grep -o 'Concluir e avançar'
kill $SRV
```
Expected: links com `trilha=dashboards`; contagem = número de aulas da trilha; a última aula (`papeis-e-permissoes`, último item do último nível — confira em `docs/trilhas/dashboards.json`) mostra "Concluir a trilha"; a primeira mostra "Concluir e avançar".

- [ ] **Step 3: Commit**

```bash
git add assets/leitor.js doc.html
git commit -m "site: leitor por trilha, com Concluir a trilha na última aula

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Mapa da trilha (`mapa.html`), redirecionamento e página de conclusão

**Files:**
- Create: `mapa.html`, `assets/mapa.css`, `assets/mapa.js`
- Rewrite: `roadmap.html` (redirecionamento)
- Delete: `tests/roadmap-html.test.js`
- Create: `concluida.html`, `assets/concluida.js`

**Interfaces:**
- Consumes: `carregarCatalogo`, `carregarTrilha`, `escolherTrilha`; `contar`, `hrefDoItem`, `pendentes`, `itensEmOrdem`; `progresso`; `montarConta`, `montarAviso`; `el`.
- Produces: `mapa.html?trilha=<slug>`, `concluida.html?trilha=<slug>`.

**`assets/mapa.css`:** mova para cá, sem alterar, todo o conteúdo do `<style>` atual do `roadmap.html` e acrescente:

```css
.hero .diagrama{margin:22px auto 0;max-width:900px;background:#fff;border-radius:var(--radius-md);padding:12px}
.hero .diagrama img{display:block;width:100%;height:auto}
.hero .diagrama figcaption{color:var(--text-body);font-size:.8rem;margin-top:6px;text-align:left}
.msg-mapa{max-width:720px;margin:40px auto;text-align:center;color:var(--text-body)}
[hidden]{display:none !important}
```

**`mapa.html`:** mesmo `<head>` do `roadmap.html` (título "Mapa da trilha · Gov Hub"), trocando o `<style>` por `<link rel="stylesheet" href="assets/mapa.css">`. Corpo: o mesmo `pular` + `header.topo` (link "Mapa da trilha" com `aria-current="page"`; "Início" → `index.html`; "Documentação" → `doc.html?path=docs/index.md`; `#conta`) + `<section class="hero">` com o quarto de círculo, `<h1 id="trilha-titulo">Carregando…</h1>`, `<p id="trilha-descricao"></p>` e `<figure class="diagrama" id="trilha-diagrama" hidden><img id="trilha-diagrama-img" alt=""><figcaption id="trilha-diagrama-legenda"></figcaption></figure>` + a barra `.progresso-mapa` (ids `ptxt`, `pfill`, `reset`) + `<div class="wrap" id="trilha">` com a legenda de tipos/papéis atual (estática) e `<div class="roadmap" id="roadmap"></div>` + a `.tip` atual + o `footer` atual + `<script type="module" src="assets/mapa.js"></script>`. A legenda do diagrama (`figcaption`) é o `diagrama_alt` visível, para quem enxerga também ter o texto.

**`assets/mapa.js`:**

```js
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
const slug = escolherTrilha(catalogo, pedido);
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
  $('trilha-titulo').textContent = trilha.titulo;
  $('trilha-descricao').textContent = trilha.descricao;
  if (trilha.diagrama) {
    $('trilha-diagrama-img').src = trilha.diagrama;
    $('trilha-diagrama-img').alt = trilha.diagrama_alt;
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
```

Nota: como a `figcaption` repete o `diagrama_alt`, o `alt` da imagem pode ficar vazio para não ler duas vezes no leitor de tela — **use** `alt=""` na imagem quando a legenda estiver visível (ajuste o código acima: `$('trilha-diagrama-img').alt = ''`).

**`roadmap.html`** (substitui o arquivo inteiro):

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="0; url=mapa.html?trilha=dashboards">
<title>Mapa da trilha · Gov Hub</title>
<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
<script>location.replace('mapa.html?trilha=dashboards' + location.hash);</script>
</head>
<body>
<p>O mapa mudou de endereço: <a href="mapa.html?trilha=dashboards">abrir o mapa da trilha de Dashboards</a>.</p>
</body>
</html>
```

**`concluida.html`:** `<head>` padrão (título "Trilha concluída · Gov Hub", `govhub.css`) com um `<style>` local usando só tokens:

```css
*{box-sizing:border-box} body{margin:0;line-height:1.6;background:var(--bg-soft)}
.conclusao{position:relative;overflow:hidden;background:var(--dark-navy);color:#fff;text-align:center;padding:64px 20px 56px}
.conclusao .wrap{position:relative;z-index:1;max-width:720px;margin:0 auto}
.selo{width:72px;height:72px;border-radius:50%;background:#fff;color:var(--primary-purple);font-size:2.2rem;font-weight:800;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
.eyebrow{font-size:.78rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin:0}
.conclusao h1{font-size:2.4rem;font-weight:800;letter-spacing:-.025em;line-height:1.08;margin:8px 0 10px}
.conclusao p{margin:0 0 22px}
.conclusao a:not(.btn){color:#fff}
.conclusao a:focus-visible{outline-color:#fff}
.pendentes{max-width:720px;margin:-24px auto 40px;position:relative;z-index:2;background:#fff;border-radius:var(--radius-lg);box-shadow:var(--shadow-xl);padding:22px 24px}
.pendentes h2{font-size:1.1rem;font-weight:800;color:var(--dark-navy);margin:0 0 10px}
.pendentes ul{margin:0 0 16px;padding-left:1.2em}
.acoes{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
[hidden]{display:none !important}
```

Corpo: `header.topo` padrão (sem `aria-current`), depois:

```html
<main>
  <section class="conclusao">
    <span class="forma forma-quarto" aria-hidden="true"></span>
    <span class="forma forma-anel" aria-hidden="true"></span>
    <div class="wrap">
      <div class="selo" id="selo" aria-hidden="true" hidden>✓</div>
      <p class="eyebrow" id="eyebrow">Carregando…</p>
      <h1 id="titulo"></h1>
      <p id="resumo"></p>
      <div class="acoes" id="acoes-completa" hidden style="justify-content:center">
        <a class="btn btn-cta" href="index.html">Ver outras trilhas</a>
        <a id="voltar-mapa" href="#">Voltar ao mapa desta trilha</a>
      </div>
    </div>
  </section>
  <section class="pendentes" id="pendentes" aria-labelledby="pendentes-titulo" hidden>
    <h2 id="pendentes-titulo"></h2>
    <ul id="pendentes-lista"></ul>
    <div class="acoes">
      <a class="btn" id="ver-pendentes" href="#">Ver as aulas pendentes no mapa</a>
      <a href="index.html">Ver outras trilhas</a>
    </div>
  </section>
</main>
<script type="module" src="assets/concluida.js"></script>
```

**`assets/concluida.js`:**

```js
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
```

- [ ] **Step 1: Criar `assets/mapa.css`, `mapa.html`, `assets/mapa.js` e reescrever `roadmap.html`; `git rm tests/roadmap-html.test.js`**
- [ ] **Step 2: Criar `concluida.html` e `assets/concluida.js`**
- [ ] **Step 3: Verificar**

```bash
node --test tests/*.test.js
python3 -m http.server 8765 >/dev/null 2>&1 & SRV=$!; sleep 1
U=http://localhost:8765
$CHROME --dump-dom --virtual-time-budget=6000 "$U/mapa.html?trilha=dashboards" | grep -c 'class="node'
$CHROME --dump-dom --virtual-time-budget=6000 "$U/mapa.html" | grep -o 'id="trilha-titulo">[^<]*'
$CHROME --dump-dom --virtual-time-budget=6000 "$U/roadmap.html" | grep -o 'id="trilha-titulo">[^<]*'
$CHROME --dump-dom --virtual-time-budget=6000 "$U/concluida.html?trilha=dashboards" | grep -oE 'id="(eyebrow|pendentes-titulo)">[^<]*'
$CHROME --screenshot="$RASCUNHO/c4-mapa.png" --window-size=1280,1800 --virtual-time-budget=6000 "$U/mapa.html?trilha=dashboards" 2>/dev/null
$CHROME --screenshot="$RASCUNHO/c4-conclusao.png" --window-size=1280,900 --virtual-time-budget=6000 "$U/concluida.html?trilha=dashboards" 2>/dev/null
$CHROME --screenshot="$RASCUNHO/c4-conclusao-cel.png" --window-size=390,900 --virtual-time-budget=6000 "$U/concluida.html?trilha=dashboards" 2>/dev/null
kill $SRV
```
Expected: um `.node` por aula; `mapa.html` e `roadmap.html` mostram o título da trilha de Dashboards; `concluida.html` (sem progresso no navegador headless) mostra "Você chegou ao fim da trilha" e "Ainda faltam N aulas". Inspecione os PNGs: mapa com o visual de antes; conclusão com fundo navy, formas roxas, lista de pendentes num cartão branco; nada estourando em 390px.

- [ ] **Step 4: Commit**

```bash
git add mapa.html assets/mapa.css assets/mapa.js roadmap.html concluida.html assets/concluida.js tests/
git commit -m "site: mapa por trilha montado do JSON e página de conclusão

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Catálogo na home, limpeza e documentação

**Files:**
- Rewrite: `index.html` (catálogo); Create: `assets/catalogo.js`
- Modify: `tools/gen_roadmap.py` (remover a cópia temporária `trilha.json`); Delete: `docs/trilhas/trilha.json`
- Create: `docs/adr/0005-varias-trilhas.md`
- Modify: `README.md`, `CONTRIBUTING.md`, `CONTEXT.md`

**Interfaces:**
- Consumes: `carregarCatalogo`; `progresso.feitos()`, `progresso.ultimaAula()`, `aoMudar`, `nuvemDisponivel`, `usuario`; `montarConta`, `montarAviso`; `el`.

**`index.html`:** mantenha `<head>` (fontes, `govhub.css`) e o `header.topo` (links: "Início" com `aria-current="page"`, "Documentação" → `doc.html?path=docs/index.md`; **remova** o link "Mapa da trilha" — o mapa agora é por trilha). Substitua todo o `<style>` e todo o conteúdo entre o topo e o `footer` por:

```html
<div class="hero">
  <span class="forma forma-quarto" aria-hidden="true"></span>
  <span class="forma forma-anel" aria-hidden="true"></span>
  <div class="wrap">
    <h1>Trilhas de capacitação</h1>
    <p class="sub">Escolha uma trilha, siga as aulas na ordem e marque o que concluir. Entre com a sua conta Google para levar o progresso para qualquer computador.</p>
  </div>
</div>
<main class="wrap" id="principal">
  <h2 class="sr-only">Trilhas disponíveis</h2>
  <div class="catalogo" id="catalogo"><p class="msg">Carregando as trilhas…</p></div>
</main>
```

e o `footer` com "Trilhas de capacitação · Gov Hub". `<style>`:

```css
*{box-sizing:border-box} body{margin:0;line-height:1.6}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
.hero{position:relative;overflow:hidden;background:var(--dark-navy);color:#fff;padding:56px 0 64px}
.hero .wrap{position:relative;z-index:1}
.hero h1{margin:0 0 12px;font-size:2.5rem;font-weight:800;letter-spacing:-.025em;line-height:1.06}
.hero .sub{max-width:640px;margin:0;font-size:1.08rem}
#principal{padding:0 20px 56px}
.catalogo{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;margin-top:-28px;position:relative;z-index:2}
.trilha-card{background:#fff;border:1px solid var(--border-soft);border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);padding:22px;display:flex;flex-direction:column;gap:10px}
.trilha-card h3{margin:0;font-size:1.3rem;font-weight:800;letter-spacing:-.02em;color:var(--dark-navy)}
.trilha-card p{margin:0;color:var(--text-body)}
.trilha-card .numeros{font-size:.85rem;color:var(--text-muted)}
.trilha-card .progresso{display:flex;align-items:center;gap:10px;font-size:.85rem;font-weight:700;color:var(--dark-navy)}
.trilha-card .progresso .barra{flex:1}
.trilha-card .acoes{display:flex;flex-direction:column;gap:8px;margin-top:auto}
.trilha-card .continuar{font-size:.88rem;color:var(--purple-700)}
.msg{color:var(--text-muted)}
footer{padding:30px 0;color:var(--text-muted);font-size:.85rem;text-align:center}
```

Script: `<script type="module" src="assets/catalogo.js"></script>`.

**`assets/catalogo.js`:**

```js
// Catálogo de trilhas (index.html): um card por trilha, com o progresso de quem lê.
import { progresso } from './progresso.js';
import { montarConta, montarAviso } from './conta.js';
import { carregarCatalogo } from './trilha.js';
import { el } from './dom.js';

const $ = (id) => document.getElementById(id);
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
```

Nota de segurança: `ultima.path` vem do próprio armazenamento da pessoa e é prefixado por `doc.html?…&path=`; o leitor valida o caminho (`caminhoSeguro`) antes de buscar.

**Limpeza:** em `tools/gen_roadmap.py`, remova a cópia temporária para `trilha.json`; `git rm docs/trilhas/trilha.json`; rode o gerador; `grep -rn "trilha.json\|ROADMAP.md\|roadmap-dashboards.xmind\|idsDoDoc" --include=*.js --include=*.html --include=*.py --include=*.yml --include=*.md . | grep -v docs/superpowers | grep -v docs/adr/000[1-4]` deve voltar vazio (ADRs antigos e documentos de superpowers são registro histórico).

**ADR 0005** (`docs/adr/0005-varias-trilhas.md`), no estilo dos anteriores: Contexto (o site era uma trilha só; a equipe quer outras trilhas que reaproveitem aulas); Decisão (uma trilha por `trilhas/<slug>.md` com cabeçalho; JSON por trilha + catálogo; páginas montadas no navegador; progresso **por aula**, id = caminho do doc, comum a todas as trilhas; doc não se repete dentro de uma trilha; `ultimaAula = {trilha, path}`; home = catálogo enxuto; `roadmap.html` redireciona); Consequências (o texto institucional sobre Dashboards saiu da home; criar trilha = criar arquivo; o mapa deixa de ter HTML gerado; marcar uma aula conta em todas as trilhas que a usam; mudar a regra de ids apaga progresso); Alternativas (progresso por trilha; trilhas independentes; home atual + seletor).

**README / CONTRIBUTING / CONTEXT:** troque `ROADMAP.md` por `trilhas/<slug>.md` (fonte de cada trilha), `roadmap.html` por `mapa.html?trilha=<slug>`, `docs/trilhas/index.md`/`trilha.json` pelos novos gerados, e descreva "Criar uma trilha nova": copiar `trilhas/dashboards.md`, trocar o cabeçalho, listar os itens (aulas podem ser reaproveitadas), rodar o gerador. No CONTEXT, o verbete **Nível** passa a citar `trilhas/<slug>.md` e acrescente o verbete **Trilha** ("Uma sequência de níveis definida em `trilhas/<slug>.md`. Aulas podem estar em várias trilhas; o progresso é da aula. _Evite_: curso, módulo."). Atualize a árvore de pastas do README (`trilhas/`, `mapa.html`, `concluida.html`, `docs/trilhas/`).

- [ ] **Step 1: Catálogo (`index.html`, `assets/catalogo.js`)**
- [ ] **Step 2: Limpeza do `trilha.json` temporário e grep de referências antigas**
- [ ] **Step 3: ADR 0005 e documentação**
- [ ] **Step 4: Verificar**

```bash
python3 tools/gen_roadmap.py && git status --porcelain -- docs/
node --test tests/*.test.js && python3 -m unittest discover -s tests -p 'test_*.py'
python3 -m http.server 8765 >/dev/null 2>&1 & SRV=$!; sleep 1
$CHROME --dump-dom --virtual-time-budget=6000 http://localhost:8765/index.html | grep -oE 'class="trilha-card"|Começar a trilha' | sort | uniq -c
$CHROME --screenshot="$RASCUNHO/c5-catalogo.png" --window-size=1280,900 --virtual-time-budget=6000 http://localhost:8765/index.html 2>/dev/null
$CHROME --screenshot="$RASCUNHO/c5-catalogo-cel.png" --window-size=390,900 --virtual-time-budget=6000 http://localhost:8765/index.html 2>/dev/null
kill $SRV
```
Expected: 1 card, "Começar a trilha"; PNGs com hero navy e o card sobreposto, sem estouro em 390px.

- [ ] **Step 5: Commit e publicação do bloco C**

```bash
git add -A index.html assets/catalogo.js tools/gen_roadmap.py docs/ README.md CONTRIBUTING.md CONTEXT.md
git commit -m "site: home vira catálogo de trilhas; documentação de várias trilhas

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin main
gh workflow run publicar.yml -R egewarth/capacitacao-govhub --ref main
```
Depois, `gh run watch <id> -R egewarth/capacitacao-govhub --exit-status` (pegue o id com `gh api repos/egewarth/capacitacao-govhub/actions/runs --jq '.workflow_runs[0].id'`) e confira `https://egewarth.github.io/capacitacao-govhub/` e `/mapa.html?trilha=dashboards` respondendo 200.

---

## Bloco E — Feedback anônimo

### Task 6: Loja e nuvem — `avaliadas`, `avaliar`, regras

**Files:**
- Modify: `assets/progresso-nuvem.js`, `assets/progresso-loja.js`, `tests/progresso-loja.test.js`, `firestore.rules`

**Interfaces:**
- Consumes: loja e nuvem atuais.
- Produces:
  - Nuvem: `normalizar` inclui `avaliadas` (`{}` se ausente); `gravarTudo` passa a usar `setDoc(..., { merge: true })` (para não apagar `avaliadas`; com `feitos: {}` o merge substitui o mapa inteiro, que é o que `zerar` precisa); `enviarFeedback(dados) → Promise` (`addDoc(collection(banco, 'feedback'), dados)`); `marcarAvaliada(uid, id) → Promise` (`setDoc(doc, { avaliadas: { [id]: true }, atualizadoEm: serverTimestamp() }, { merge: true })`).
  - Loja: estado `avaliadas` (vem do cache da conta e dos snapshots; anônimo = `{}`; logout limpa); `foiAvaliada(id) → boolean`; `avaliar(id, trilha, { clareza, uso, comentario }) → Promise<void>`; `export const CLAREZA = ['confuso','claro','muito-claro']`, `export const USO = ['sim','talvez','nao']`, `export const LIMITE_COMENTARIO = 1000`; `criarLoja({ armazenamento, criarNuvem, agora = () => new Date() })`.

Regras de `avaliar`:
1. Rejeita (`Error('sem-sessao')`) se não houver `usuario` ou `nuvem`.
2. Rejeita (`Error('resposta-invalida')`) se `clareza`/`uso` fora das listas ou comentário (aparado) com mais de `LIMITE_COMENTARIO` caracteres.
3. Monta `dados = { trilha, aula: id, clareza, uso, periodo }` com `periodo = AAAA-MM` de `agora()` (mês local, com zero à esquerda) e `comentario` só se, aparado, não for vazio. **Nunca** inclui uid, nome, e-mail ou horário.
4. `await nuvem.enviarFeedback(dados)`. Se falhar, rejeita (o bloco mostra o erro; nada é marcado).
5. Se a sessão ainda for a mesma: `avaliadas = { ...avaliadas, [id]: true }`, `salvarLocal()`, `emitir()`, e `nuvem.marcarAvaliada(uid, id).catch(() => {})` (o feedback já está salvo; no pior caso a pessoa poderia avaliar de novo noutro dispositivo).

`salvarLocal()` inclui `avaliadas` no cache da conta; `iniciar()` lê `cache.avaliadas || {}`; o callback de `ouvir` lê `dados.avaliadas || {}`; `desconectar()` zera `avaliadas`; `conectar()` usa `remoto.avaliadas || {}`.

- [ ] **Step 1: Testes (primeiro)** — na nuvem falsa de `tests/progresso-loja.test.js`, acrescente `feedbacks: []`, `recusarFeedback: false`, `async enviarFeedback(d) { if (nuvem.recusarFeedback) throw new Error('x'); nuvem.feedbacks.push(structuredClone(d)); }`, `async marcarAvaliada(uid, id) { (docs[uid] ||= { feitos: {}, ultimaAula: null }).avaliadas = { ...(docs[uid].avaliadas || {}), [id]: true }; notificar(uid); }`, e faça `copia(uid)`/`ler` devolverem `avaliadas` quando houver. Casos:

```js
test('avaliar exige sessão', async () => {
  const loja = criarLoja({ armazenamento: armazenamentoFalso() });
  await loja.iniciar();
  await assert.rejects(loja.avaliar('a', 'dashboards', { clareza: 'claro', uso: 'sim' }), /sem-sessao/);
});

test('avaliar grava sem identificar a pessoa e marca a aula como avaliada', async () => {
  const arm = armazenamentoFalso();
  const nuvem = nuvemFalsa({ ana: { feitos: {}, ultimaAula: null } });
  const loja = criarLoja({ armazenamento: arm, criarNuvem: async () => nuvem, agora: () => new Date(2026, 9, 15, 13, 45) });
  await loja.iniciar(); nuvem.logar(ANA); await esperar();
  await loja.avaliar('explicacao/a', 'dashboards', { clareza: 'muito-claro', uso: 'talvez', comentario: '  ótima  ' });
  assert.deepEqual(nuvem.feedbacks, [{ trilha: 'dashboards', aula: 'explicacao/a', clareza: 'muito-claro', uso: 'talvez', comentario: 'ótima', periodo: '2026-10' }]);
  assert.equal(loja.foiAvaliada('explicacao/a'), true);
  await esperar();
  assert.deepEqual(nuvem.docs.ana.avaliadas, { 'explicacao/a': true });
});

test('comentário vazio não é enviado; respostas inválidas são recusadas', async () => {
  const nuvem = nuvemFalsa({ ana: { feitos: {}, ultimaAula: null } });
  const loja = criarLoja({ armazenamento: armazenamentoFalso(), criarNuvem: async () => nuvem, agora: () => new Date(2026, 0, 2) });
  await loja.iniciar(); nuvem.logar(ANA); await esperar();
  await loja.avaliar('a', 'dashboards', { clareza: 'claro', uso: 'nao', comentario: '   ' });
  assert.equal('comentario' in nuvem.feedbacks[0], false);
  assert.equal(nuvem.feedbacks[0].periodo, '2026-01');
  await assert.rejects(loja.avaliar('b', 'dashboards', { clareza: 'otimo', uso: 'sim' }), /resposta-invalida/);
  await assert.rejects(loja.avaliar('b', 'dashboards', { clareza: 'claro', uso: 'sim', comentario: 'x'.repeat(1001) }), /resposta-invalida/);
});

test('falha ao enviar não marca a aula', async () => {
  const nuvem = nuvemFalsa({ ana: { feitos: {}, ultimaAula: null } });
  const loja = criarLoja({ armazenamento: armazenamentoFalso(), criarNuvem: async () => nuvem });
  await loja.iniciar(); nuvem.logar(ANA); await esperar();
  nuvem.recusarFeedback = true;
  await assert.rejects(loja.avaliar('a', 'dashboards', { clareza: 'claro', uso: 'sim' }));
  assert.equal(loja.foiAvaliada('a'), false);
});

test('avaliadas vêm da conta e somem no logout', async () => {
  const { loja } = await lojaLogada({ docs: { ana: { feitos: {}, ultimaAula: null, avaliadas: { x: true } } } });
  assert.equal(loja.foiAvaliada('x'), true);
  await loja.sair();
  assert.equal(loja.foiAvaliada('x'), false);
});
```

Run: `node --test tests/progresso-loja.test.js` → FAIL.

- [ ] **Step 2: Implementar na loja e na nuvem** (conforme as Interfaces). Run: `node --test tests/*.test.js` → PASS.
- [ ] **Step 3: `firestore.rules`** — substitua pelo texto exato da seção "Regras do Firestore" da spec (`docs/superpowers/specs/2026-10-01-varias-trilhas-feedback-diagramas-design.md`).
- [ ] **Step 4: Commit**

```bash
git add assets/progresso-nuvem.js assets/progresso-loja.js tests/progresso-loja.test.js firestore.rules
git commit -m "site: loja e nuvem enviam feedback anônimo e lembram as aulas avaliadas

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Bloco de avaliação no leitor

**Files:**
- Create: `assets/feedback.js`, `assets/feedback.css`
- Modify: `doc.html` (link do CSS), `assets/leitor.js` (chamar o bloco)
- Create: `docs/adr/0006-feedback-anonimo.md`; Modify: `README.md` §7.6

**Interfaces:**
- Consumes: `progresso.usuario()`, `nuvemDisponivel()`, `entrar()`, `foiAvaliada(id)`, `avaliar(id, trilha, resposta)`, `aoMudar`; `CLAREZA`, `USO`, `LIMITE_COMENTARIO`; `el`.
- Produces: `montarFeedback(secao, progresso) → { mostrar(aula|null, trilha) }`.

**`assets/feedback.js`:**

```js
// Bloco "Conte como foi esta aula" no fim de cada aula (doc.html). Exige login; a resposta é anônima
// (ver ADR 0006). Estados: convite para entrar, formulário, enviando, obrigado, erro.
import { el } from './dom.js';
import { CLAREZA, USO, LIMITE_COMENTARIO } from './progresso-loja.js';

const ROTULOS_CLAREZA = { confuso: 'Confuso', claro: 'Claro', 'muito-claro': 'Muito claro' };
const ROTULOS_USO = { sim: 'Sim', talvez: 'Talvez', nao: 'Não' };

function grupo(nome, legenda, valores, rotulos, aoMudar) {
  return el('fieldset', { class: 'fb-grupo' },
    el('legend', {}, legenda),
    el('div', { class: 'fb-opcoes' }, ...valores.map((v) => el('label', { class: 'fb-opcao' },
      el('input', { type: 'radio', name: nome, value: v, onchange: aoMudar }),
      el('span', {}, rotulos[v])))));
}

export function montarFeedback(secao, progresso) {
  let aula = null;
  let trilha = null;
  let enviando = false;
  let enviada = false;   // nesta visita, para não piscar o formulário antes do snapshot

  function titulo(texto) { return el('h2', { class: 'fb-titulo', id: 'feedback-titulo' }, texto); }

  function formulario() {
    const contador = el('span', { class: 'fb-contador', 'aria-live': 'polite' }, `0/${LIMITE_COMENTARIO}`);
    const erro = el('p', { class: 'fb-erro', role: 'alert', hidden: true }, 'Não foi possível enviar; tente de novo.');
    const enviar = el('button', { class: 'btn', type: 'submit', disabled: true }, 'Enviar');
    const comentario = el('textarea', { id: 'fb-comentario', rows: 3, maxlength: LIMITE_COMENTARIO,
      oninput: () => { contador.textContent = `${comentario.value.length}/${LIMITE_COMENTARIO}`; } });
    const form = el('form', { class: 'fb-form', novalidate: true },
      grupo('fb-clareza', 'O conteúdo ficou claro?', CLAREZA, ROTULOS_CLAREZA, () => atualizar()),
      grupo('fb-uso', 'Vai usar isso no seu trabalho?', USO, ROTULOS_USO, () => atualizar()),
      el('label', { class: 'fb-rotulo', for: 'fb-comentario' }, 'Comentário (opcional)'),
      comentario, contador,
      el('p', { class: 'fb-nota' }, 'Sua resposta é anônima: não guardamos quem respondeu.'),
      erro, enviar);
    const valor = (nome) => { const m = form.querySelector(`input[name="${nome}"]:checked`); return m ? m.value : null; };
    function atualizar() { enviar.disabled = enviando || !valor('fb-clareza') || !valor('fb-uso'); }
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (enviar.disabled) return;
      enviando = true; erro.hidden = true; enviar.textContent = 'Enviando…'; atualizar();
      const minhaAula = aula;
      try {
        await progresso.avaliar(minhaAula, trilha, { clareza: valor('fb-clareza'), uso: valor('fb-uso'), comentario: comentario.value });
        if (minhaAula === aula) { enviada = true; pintar(); secao.querySelector('.fb-titulo').focus(); }
      } catch {
        erro.hidden = false;
      } finally {
        enviando = false; enviar.textContent = 'Enviar'; atualizar();
      }
    });
    return form;
  }

  function pintar() {
    if (!aula) { secao.hidden = true; secao.replaceChildren(); return; }
    secao.hidden = false;
    if (enviada || progresso.foiAvaliada(aula)) {
      const t = titulo('Obrigado pela avaliação.');
      t.setAttribute('tabindex', '-1');
      secao.replaceChildren(t);
      return;
    }
    if (!progresso.usuario()) {
      secao.replaceChildren(titulo('Conte como foi esta aula'),
        progresso.nuvemDisponivel()
          ? el('p', {}, el('button', { class: 'btn btn-secundario', type: 'button', onclick: () => progresso.entrar() }, 'Entrar com Google'), ' para avaliar esta aula.')
          : el('p', {}, 'A avaliação fica disponível quando o login estiver funcionando.'));
      return;
    }
    if (!secao.querySelector('form')) secao.replaceChildren(titulo('Conte como foi esta aula'), formulario());
  }

  // Redesenha só quando muda o que importa (login, avaliada) — marcar aulas não apaga o que a pessoa digitou.
  let estado = null;
  progresso.aoMudar(() => {
    const novo = [aula, !!progresso.usuario(), progresso.nuvemDisponivel(), aula && progresso.foiAvaliada(aula)].join('|');
    if (novo === estado) return;
    estado = novo;
    secao.replaceChildren();
    pintar();
  });

  return {
    mostrar(novaAula, novaTrilha) {
      aula = novaAula; trilha = novaTrilha; enviada = false;
      estado = null; secao.replaceChildren(); pintar();
    },
  };
}
```

**`assets/feedback.css`:**

```css
/* Bloco de avaliação da aula (doc.html). Só tokens de assets/govhub.css. */
.feedback{margin-top:20px;background:#fff;border:1px solid var(--border-soft);border-radius:var(--radius-lg);padding:22px 24px}
.feedback[hidden]{display:none}
.fb-titulo{margin:0 0 12px;font-size:1.15rem;font-weight:800;color:var(--dark-navy)}
.fb-titulo:focus{outline:none}
.fb-form{display:grid;gap:10px}
.fb-grupo{border:0;margin:0;padding:0}
.fb-grupo legend{font-weight:700;color:var(--dark-navy);margin-bottom:6px;padding:0}
.fb-opcoes{display:flex;flex-wrap:wrap;gap:8px}
.fb-opcao{position:relative}
.fb-opcao input{position:absolute;opacity:0;width:1px;height:1px}
.fb-opcao span{display:inline-block;border:2px solid var(--border-soft);border-radius:999px;padding:6px 14px;font-weight:600;cursor:pointer;color:var(--dark-navy)}
.fb-opcao input:checked + span{background:var(--primary-purple);border-color:var(--primary-purple);color:#fff}
.fb-opcao input:focus-visible + span{outline:3px solid var(--purple-700);outline-offset:2px}
.fb-rotulo{font-weight:700;color:var(--dark-navy)}
.fb-form textarea{font:inherit;border:1px solid var(--border-soft);border-radius:var(--radius-md);padding:10px;resize:vertical;color:var(--text-body)}
.fb-form textarea:focus-visible{outline:3px solid var(--purple-700);outline-offset:1px}
.fb-contador{justify-self:end;font-size:.78rem;color:var(--text-muted)}
.fb-nota{margin:0;font-size:.82rem;color:var(--text-muted)}
.fb-erro{margin:0;color:var(--accent-rose);font-weight:700}
.fb-erro[hidden]{display:none}
.fb-form .btn{justify-self:start}
.fb-form .btn:disabled{opacity:.55;cursor:not-allowed}
```

Nota de contraste: `#BE006E` sobre branco ≈ 5:1 (texto de detalhe permitido na skill). O botão desabilitado com opacidade é estado inativo (fora do critério de contraste da WCAG).

**Integração:** em `doc.html`, `<link rel="stylesheet" href="assets/feedback.css">` após `leitor.css`. Em `assets/leitor.js`: `import { montarFeedback } from './feedback.js';`, `const feedback = montarFeedback($('feedback'), progresso);` no início, e em `abrir()` — depois de renderizar o conteúdo com sucesso — `feedback.mostrar(atual.item ? atual.item.id : null, slug)`; em erro de abertura, `feedback.mostrar(null, slug)`.

**ADR 0006** (`docs/adr/0006-feedback-anonimo.md`): Contexto (a equipe quer saber o que melhorar em cada aula; a pessoa precisa se sentir livre para criticar); Decisão (só com login; coleção `feedback` sem uid, nome, e-mail ou horário — só `periodo` mensal; id aleatório; regras que só permitem criar, com campos validados; `avaliadas` no progresso guarda só *que* avaliou; sem edição; leitura pelo console); Consequências — **inclua explicitamente**: "O Firestore guarda, em todo documento, metadados de criação e atualização com data e hora exatas, legíveis por quem administra o projeto pela API. Como a pessoa normalmente marca a aula como feita logo depois de avaliar, um administrador determinado poderia aproximar horários. O desenho reduz, mas não elimina, essa possibilidade; eliminá-la exigiria um servidor que recebesse e regravasse as respostas em lote." Também: login obrigatório reduz spam; não é possível corrigir uma avaliação enviada; a mesma pessoa pode avaliar de novo em outro dispositivo se a marcação de `avaliadas` falhar. Alternativas (uid na resposta para permitir edição; feedback sem login com Auth anônima; painel de leitura).

**README §7.6:** troque o bloco de regras pelo novo (ou aponte para `firestore.rules`), diga que as regras precisam ser publicadas antes do deploy do feedback, e acrescente "Ler o feedback": console do Firebase → Firestore → coleção `feedback` (filtros por `trilha`/`aula`; exportação via `gcloud firestore export` se precisar de planilha).

- [ ] **Step 1: Criar `assets/feedback.js` e `assets/feedback.css`; integrar no leitor e no `doc.html`**
- [ ] **Step 2: ADR 0006 e README**
- [ ] **Step 3: Verificar**

```bash
node --test tests/*.test.js
python3 -m http.server 8765 >/dev/null 2>&1 & SRV=$!; sleep 1
$CHROME --dump-dom --virtual-time-budget=8000 "http://localhost:8765/doc.html?trilha=dashboards&path=docs/explicacao/hierarquia-visual.md" | grep -oE 'Conte como foi esta aula|Entrar com Google</button> para avaliar'
$CHROME --screenshot="$RASCUNHO/e7-convite.png" --window-size=1280,3000 --virtual-time-budget=8000 "http://localhost:8765/doc.html?trilha=dashboards&path=docs/explicacao/hierarquia-visual.md" 2>/dev/null
kill $SRV
```
Expected: o convite aparece (sem login no headless). Para conferir o formulário sem login real, crie **temporariamente** fora do repositório não é possível (módulos ES no mesmo origin); em vez disso, confie nos testes da loja e deixe o roteiro manual (abaixo) para o usuário. Inspecione o PNG: bloco entre o fim da aula e a sequência, sem estouro.

Roteiro manual (para o usuário, depois de publicar as regras): entrar; responder as duas perguntas → Enviar habilita; enviar com comentário → "Obrigado pela avaliação."; recarregar → continua "Obrigado"; outra aula → formulário; no console, `feedback` tem o documento sem uid e com `periodo`; `progresso/<uid>` tem `avaliadas`.

- [ ] **Step 4: Commit (não publicar ainda)**

```bash
git add assets/feedback.js assets/feedback.css assets/leitor.js doc.html docs/adr/0006-feedback-anonimo.md README.md
git commit -m "site: avaliação anônima no fim de cada aula

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 5: Publicação do bloco E** — **pare e peça ao usuário** para publicar o conteúdo de `firestore.rules` no console (Firestore → Regras → Publicar). Só depois da confirmação: `git push origin main` e o disparo do workflow como no bloco C.

---

## Bloco B — Diagramas Gov Hub

Use a skill `govhub-diagramas` (`/home/joaoegewarth/.claude/plugins/cache/govhub/govhub-core/d56397136fcf/govhub-diagramas/`, abaixo `$SKILL`). Leia o `SKILL.md` e a gramática da família escolhida antes de cada diagrama. Saída em `assets/diagramas/` (em vez do padrão `./diagramas/`):

```bash
node $SKILL/scripts/inline_assets.mjs $SKILL/templates/<familia>.html assets/diagramas/<nome>.html
node $SKILL/scripts/render.mjs assets/diagramas/<nome>.html     # gera assets/diagramas/<nome>.png
```
Se o render falhar por dependência, rode `bash $SKILL/scripts/setup.sh` uma vez. Confira cada PNG com a ferramenta Read e corrija até passar no checklist da skill. **Nada inventado, nada omitido**: cada nó, seta e rótulo vem do Mermaid de origem (ou do texto de "A lógica da trilha"). Os PNGs saem com 3000 px de largura; se passarem de ~400 KB, reduza com `python3 -c` + Pillow **só se** Pillow já estiver instalado; senão, aceite o tamanho e registre no relatório.

### Task 8: "A lógica da trilha" no topo do mapa

**Files:**
- Create: `assets/diagramas/logica-da-trilha.html`, `assets/diagramas/logica-da-trilha.png`
- Modify: `trilhas/dashboards.md` (cabeçalho `diagrama`, `diagrama_alt`); regenerar `docs/trilhas/`

Fonte do diagrama (texto que estava na home): a trilha segue **por quê → o quê → como → governança → prática**, correspondendo a **fundamentos → princípios transversais → execução na ferramenta → padrões Gov Hub → estudo de caso**; e a nota "Acessibilidade e arquitetura da informação não são um módulo isolado no fim: aparecem desde o Nível 0 como critérios de qualidade e voltam de forma aplicada nos níveis técnicos." Família sugerida: **pipeline** (estágios em sequência) com a nota como `.note`. Cabeçalho:

```
diagrama: assets/diagramas/logica-da-trilha.png
diagrama_alt: A lógica da trilha em cinco etapas, da esquerda para a direita: por quê (fundamentos), o quê (princípios transversais), como (execução na ferramenta), governança (padrões Gov Hub) e prática (estudo de caso). Acessibilidade e arquitetura da informação aparecem desde o início como critérios de qualidade.
```

(Ajuste o `diagrama_alt` para descrever exatamente o que o diagrama final mostra.)

- [ ] **Step 1: Construir, renderizar e conferir o diagrama**
- [ ] **Step 2: Cabeçalho da trilha, `python3 tools/gen_roadmap.py`, `node --test tests/*.test.js`** (o teste confere que o arquivo do diagrama existe)
- [ ] **Step 3: Conferir o topo do mapa** (`$CHROME --screenshot ... mapa.html?trilha=dashboards`) e commitar:

```bash
git add assets/diagramas/logica-da-trilha.* trilhas/dashboards.md docs/trilhas/
git commit -m "docs: diagrama da lógica da trilha no padrão Gov Hub, no topo do mapa

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

### Task 9: Diagramas das aulas (7 Mermaid)

**Files:**
- Create: `assets/diagramas/<nome>.html` + `.png` para cada um: `por-que-fazer-um-dashboard`, `dashboard-relatorio-painel-operacional`, `organizacao-de-paginas-e-abas`, `estrutura-de-navegacao`, `qual-e-o-grafico-certo`, `mapas-superset-vs-power-bi`, `do-problema-ao-dashboard-publicado`
- Modify: os 7 `.md` correspondentes (`docs/explicacao/…`, `docs/pesquisa/mapas-superset-vs-power-bi.md`, `docs/tutoriais/do-problema-ao-dashboard-publicado.md`) — **só** o bloco ```` ```mermaid … ``` ````

Para cada aula:
1. Leia o bloco Mermaid e o parágrafo em volta; liste nós, setas, rótulos, decisões.
2. Escolha a família (fluxo de processo para fluxos com decisão; pipeline para sequências; arquitetura em blocos para comparações/agrupamentos) e construa o HTML.
3. Renderize e confira o PNG (checklist da skill).
4. Troque o bloco Mermaid por `![<texto alternativo>](../../assets/diagramas/<nome>.png)` — o texto alternativo descreve o diagrama inteiro (todos os nós e relações relevantes), em uma ou duas frases completas. Se o bloco Mermaid tinha uma legenda em itálico logo abaixo, mantenha-a.
5. `git diff` do `.md` deve mostrar **só** a troca do bloco.

Faça um commit por diagrama (`docs: <aula> com diagrama no padrão Gov Hub`), para facilitar a revisão.

- [ ] **Steps 1–7: um por diagrama** (construir, conferir, trocar, commitar)

### Task 10: Leitor sem Mermaid e publicação do bloco B

**Files:**
- Modify: `assets/leitor.js` (remover `desenharDiagramas`, a variável `diagramas` e a chamada), `doc.html` (remover o `<script>` do Mermaid), `assets/leitor.css` (remover as regras `.conteudo .mermaid…`)
- Modify: `docs/adr/0003-identidade-visual-sobria.md` só se ele citar o tema do Mermaid em `leitor.js` como exceção de cor: acrescente uma linha "Atualização (2026-10): o leitor não usa mais Mermaid; os diagramas são PNGs da skill `govhub-diagramas` (ADR 0003 continua valendo para o resto)."
- Modify: `README.md` — seção curta "Diagramas": onde ficam (`assets/diagramas/`), como regenerar (os dois comandos da skill) e que o Mermaid não é usado nas aulas.

- [ ] **Step 1: Confirmar que não há Mermaid em aula publicada**

Run: `grep -rln '```mermaid' docs | grep -v '^docs/superpowers/'`
Expected: nenhuma linha.

- [ ] **Step 2: Remover o Mermaid do leitor e do `doc.html`; documentar**
- [ ] **Step 3: Verificar** — `node --test tests/*.test.js`; capturas de 2 aulas com diagrama (`docs/explicacao/por-que-fazer-um-dashboard.md`, `docs/tutoriais/do-problema-ao-dashboard-publicado.md`) mostrando os PNGs; `grep -c mermaid doc.html assets/leitor.js` = 0.
- [ ] **Step 4: Commit e publicação**

```bash
git add assets/leitor.js assets/leitor.css doc.html README.md docs/adr/
git commit -m "site: leitor sem Mermaid; diagramas das aulas em PNG Gov Hub

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git push origin main
gh workflow run publicar.yml -R egewarth/capacitacao-govhub --ref main
```
