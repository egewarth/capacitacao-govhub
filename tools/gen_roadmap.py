#!/usr/bin/env python3
"""
Gera os artefatos da trilha a partir da fonte única ROADMAP.md.

Etapas:
  1. Lê e valida ROADMAP.md (tipos/papéis).
  2. Cria um esqueleto para todo .md referenciado que ainda não existe (nunca sobrescreve).
  3. Regenera: roadmap.html, roadmap-dashboards.xmind, docs/trilhas/index.md e
     docs/trilhas/trilha.json (índice que a página de conteúdo usa para marcar 'feito').
     Cada conceito abre pelo visualizador doc.html (Markdown -> HTML).

Caminhos repetidos são permitidos (vários nós da trilha podem apontar para o mesmo documento);
os ids dos nós são tornados únicos automaticamente para que o progresso continue por nó.

Uso:  python3 tools/gen_roadmap.py
"""
import re, os, json, zipfile, html as htmlmod
from urllib.parse import quote

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC          = os.path.join(REPO, "ROADMAP.md")
OUT_HTML     = os.path.join(REPO, "roadmap.html")
OUT_XMIND    = os.path.join(REPO, "roadmap-dashboards.xmind")
OUT_TRILHAS  = os.path.join(REPO, "docs", "trilhas", "index.md")
OUT_INDEX    = os.path.join(REPO, "index.html")
OUT_TRILHA_JSON = os.path.join(REPO, "docs", "trilhas", "trilha.json")
PROGRESS_KEY = "govhub-dashboards-roadmap-v1"   # mesma chave em roadmap.html e doc.html
IDX_END      = "<!-- LEVELS:END -->"

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
ROLE_DISPLAY = {"core": "Essencial", "support": "Apoio", "capstone": "Capstone",
                "optional": "Opcional", "advanced": "Avançado"}
SUPPORT_ROLES = ("support", "optional")

ITEM_RE  = re.compile(r'^- \[([^\]]+)\]\s+\*\*(.+?)\*\*\s+—\s+(.+?)\s+—\s+`([^`]+)`\s*$')
LEVEL_RE = re.compile(r'^##\s+Nível\s+(\d+)\s+·\s+(.+)$')

START_LINE = "<!-- ROADMAP:START · gerado por tools/gen_roadmap.py a partir de ROADMAP.md · NÃO EDITE À MÃO -->"
END_LINE   = "<!-- ROADMAP:END -->"


def parse(lines):
    levels, cur, dropped = [], None, []
    for idx, raw in enumerate(lines):
        s = raw.strip()
        m = LEVEL_RE.match(s)
        if m:
            cur = {"num": int(m.group(1)), "title": m.group(2).strip(), "desc": "", "items": []}
            levels.append(cur)
            continue
        if cur is None:
            continue
        if s.startswith("- ["):
            im = ITEM_RE.match(s)
            if not im:
                raise SystemExit("Item malformado (linha %d):\n  %s" % (idx + 1, s))
            typ, title, role, doc = (g.strip() for g in im.groups())
            if typ not in TYPE_INFO:
                raise SystemExit("Tipo inválido %r (linha %d): %s" % (typ, idx + 1, s))
            if role not in ROLE_DISPLAY:
                raise SystemExit("Papel inválido %r (linha %d): %s" % (role, idx + 1, s))
            cur["items"].append({"type": typ, "title": title, "role": role, "doc": doc})
        elif s.startswith("- ") or s == "-":
            dropped.append((idx + 1, raw))      # bullet que NÃO é um item válido
        elif s and not s.startswith("#") and not s.startswith(">") and not cur["items"]:
            # acumula o parágrafo de abertura do nível até o primeiro item
            cur["desc"] = (cur["desc"] + " " + s).strip()
    if not levels:
        raise SystemExit("Nenhum nível encontrado em ROADMAP.md")
    return levels, dropped


STUB_BODY = {
    "tutorial":   "## O que você vai construir\n_A definir._\n\n## Pré-requisitos\n- _A definir._\n\n## Passos\n1. _A definir._\n\n## O que você aprendeu\n- _A definir._\n",
    "guia":       "## Objetivo\n_A definir._\n\n## Antes de começar\n- _A definir._\n\n## Passos\n1. _A definir._\n\n## Pronto\n_Como verificar que funcionou._\n",
    "referencia": "## Resumo\n_A definir._\n\n## Detalhes\n_A definir._\n\n## Observações\n_A definir._\n",
    "explicacao": "## Contexto\n_Por que isso importa._\n\n## A ideia\n_A definir._\n\n## Trade-offs e alternativas\n_A definir._\n",
    "desafio":    "## O desafio\n_A definir._\n\n## Público real\n_Para quem este painel existe._\n\n## O que entregar\n- _A definir._\n\n## Critérios de aceitação\n- _A definir._\n",
    "pesquisa":   "## Pergunta de pesquisa\n_A definir._\n\n## Metodologia\n_A definir._\n\n## Resultados\n_A definir._\n\n## Conclusão\n_A definir._\n",
}


def scaffold_missing(levels):
    created = []
    for lv in levels:
        for it in lv["items"]:
            full = os.path.join(REPO, it["doc"])
            if os.path.exists(full):
                continue
            label, _cls, _folder, tpl, _icone = TYPE_INFO[it["type"]]
            os.makedirs(os.path.dirname(full), exist_ok=True)
            content = ("# %s\n\n> Rascunho — a escrever. Tipo: %s · "
                       "Template: ../../templates/%s.md\n\n%s"
                       "\n## Saiba mais\n- _A definir._\n\n## Conteúdo relacionado\n- _A definir._\n"
                       % (it["title"], label, tpl, STUB_BODY[tpl]))
            with open(full, "w", encoding="utf-8") as f:
                f.write(content)
            created.append(it["doc"])
    return created


def data_id(doc):
    d = doc
    if d.startswith("docs/"):
        d = d[len("docs/"):]
    if d.endswith(".md"):
        d = d[:-len(".md")]
    return d


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


def viewer(doc, node_id=None):
    """Link para o leitor. O id do nó situa a posição quando o documento se repete na trilha."""
    url = "doc.html?path=" + doc
    return url + "&item=" + quote(node_id, safe="") if node_id else url


# ----------------------------- roadmap.html -----------------------------
def gen_html(levels):
    esc = lambda t: htmlmod.escape(t, quote=False)
    escq = lambda t: htmlmod.escape(t, quote=True)   # para valores de atributo
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

    def level(lv):
        nodes = "\n".join(node(it) for it in lv["items"])
        # h2 de verdade: numa página de 44 itens, pular de nível em nível é o recurso
        # mais usado por quem navega com leitor de tela. O número fica no círculo
        # (decorativo) e entra no texto do heading de forma invisível.
        return ('  <div class="level">\n'
                '    <div class="milestone" id="nivel-%d"><span class="num" aria-hidden="true">%d</span>\n'
                '      <div><h2><span class="sr-only">Nível %d · </span>%s</h2>\n'
                '      <p>%s</p></div></div>\n'
                '    <div class="nodes">\n%s\n    </div>\n'
                '  </div>' % (lv["num"], lv["num"], lv["num"], esc(lv["title"]),
                              esc(lv["desc"]), nodes))

    def atalhos(levels):
        """Índice dos níveis — a trilha é uma rolagem longa e tende a crescer."""
        links = "\n".join(
            '      <a href="#nivel-%d"><b>%d</b> %s</a>' % (lv["num"], lv["num"], esc(lv["title"]))
            for lv in levels)
        return ('  <nav class="atalhos" aria-label="Níveis da trilha">\n'
                '    <span class="atalhos-rot">Ir para:</span>\n'
                '    <div class="atalhos-lista">\n%s\n    </div>\n  </nav>' % links)

    body = atalhos(levels) + "\n\n" + "\n\n".join(level(lv) for lv in levels)
    html = open(OUT_HTML, encoding="utf-8").read()
    if "<!-- ROADMAP:START" not in html or END_LINE not in html:
        raise SystemExit("Marcadores ROADMAP:START/END não encontrados em roadmap.html")
    pre = html.split("<!-- ROADMAP:START", 1)[0]
    post = html.split(END_LINE, 1)[1]
    open(OUT_HTML, "w", encoding="utf-8").write(pre + START_LINE + "\n\n" + body + "\n\n  " + END_LINE + post)
    return sum(len(lv["items"]) for lv in levels)


# ----------------------------- roadmap-dashboards.xmind -----------------------------
def gen_xmind(levels):
    _c = [0]
    def nid():
        _c[0] += 1
        return "n%03d" % _c[0]

    def topic(title, role=None, note=None, children=None):
        t = {"id": nid(), "class": "topic", "title": title}
        if role:
            t["labels"] = [role]
        if note:
            t["notes"] = {"plain": {"content": note}}
        if children:
            t["children"] = {"attached": children}
        return t

    level_topics = []
    for lv in levels:
        kids = [topic(it["title"], role=ROLE_DISPLAY[it["role"]], note=it["doc"]) for it in lv["items"]]
        level_topics.append(topic("Nível %d · %s" % (lv["num"], lv["title"]), note=lv["desc"], children=kids))

    root = topic("GovHub\nTrilha de capacitação em Dashboards",
                 note="Faça os itens essenciais de cada nível primeiro, de cima para baixo; "
                      "os itens de apoio e opcionais vêm depois.",
                 children=level_topics)
    sheet_id = nid()
    content  = [{"id": sheet_id, "class": "sheet", "title": "Trilha de aprendizagem", "rootTopic": root}]
    metadata = {"creator": {"name": "XMind", "version": "12.0.0"}, "activeSheetId": sheet_id}
    manifest = {"file-entries": {"content.json": {}, "metadata.json": {}}}

    dump = lambda o: json.dumps(o, ensure_ascii=False).encode("utf-8")
    if os.path.exists(OUT_XMIND):
        os.remove(OUT_XMIND)
    with zipfile.ZipFile(OUT_XMIND, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("content.json", dump(content))
        z.writestr("metadata.json", dump(metadata))
        z.writestr("manifest.json", dump(manifest))


# ----------------------------- docs/trilhas/index.md -----------------------------
def gen_trilhas(levels):
    def line(it):
        label = TYPE_INFO[it["type"]][0]
        rel   = "../" + (it["doc"][len("docs/"):] if it["doc"].startswith("docs/") else it["doc"])
        role  = ("**%s**" % ROLE_DISPLAY[it["role"]]) if it["role"] in ("core", "capstone") else ROLE_DISPLAY[it["role"]]
        return "- [%s](%s) — *%s* · %s" % (it["title"], rel, label, role)

    out = ["# Trilha de aprendizagem\n",
           "A cadência recomendada: por onde começar e para onde ir. Faça os itens **essenciais** de",
           "cada nível primeiro, de cima para baixo; os de **apoio/opcionais** ficam para depois.\n",
           "> Versão visual (estilo roadmap.sh, com progresso): **[roadmap.html](../../roadmap.html)**",
           "> Gerado a partir de **[ROADMAP.md](../../ROADMAP.md)** por `tools/gen_roadmap.py` — não edite à mão.\n",
           "---\n", "## Comece por aqui\n"]
    for lv in levels:
        out.append("### Nível %d · %s" % (lv["num"], lv["title"]))
        out.append("*%s*" % lv["desc"])
        for it in lv["items"]:
            out.append(line(it))
        out.append("")
    out.append("## Pronto para publicar dashboards no GovHub")
    open(OUT_TRILHAS, "w", encoding="utf-8").write("\n".join(out) + "\n")


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


def gen_index(levels):
    """Preenche a região LEVELS do index.html com um card por nível (se houver marcadores)."""
    esc = lambda t: htmlmod.escape(t, quote=False)
    cards = "\n".join(
        '    <div class="card"><h4>Nível %d · %s</h4><p>%s</p></div>'
        % (lv["num"], esc(lv["title"]), esc(lv["desc"])) for lv in levels)
    html = open(OUT_INDEX, encoding="utf-8").read()
    if "<!-- LEVELS:START" not in html or IDX_END not in html:
        return False
    pre = html.split("<!-- LEVELS:START", 1)[0]
    post = html.split(IDX_END, 1)[1]
    start = "<!-- LEVELS:START · gerado a partir de ROADMAP.md por tools/gen_roadmap.py · não edite à mão -->"
    open(OUT_INDEX, "w", encoding="utf-8").write(pre + start + "\n" + cards + "\n  " + IDX_END + post)
    return True


def warnings(levels):
    msgs = []
    paths = [it["doc"] for lv in levels for it in lv["items"]]
    for p in sorted(set(x for x in paths if paths.count(x) > 1)):
        msgs.append("caminho referenciado %dx (permitido): %s" % (paths.count(p), p))
    nums = [lv["num"] for lv in levels]
    for n in sorted(set(x for x in nums if nums.count(x) > 1)):
        msgs.append("número de nível duplicado: %d" % n)
    return msgs


def main():
    lines = open(SRC, encoding="utf-8").read().split("\n")
    levels, dropped = parse(lines)
    created = scaffold_missing(levels)
    total = gen_html(levels)
    gen_xmind(levels)
    gen_trilhas(levels)
    docs_json = gen_trilha_json(levels)
    idx = gen_index(levels)

    print("Gerado a partir de ROADMAP.md  (níveis: %d | itens: %d)" % (len(levels), total))
    print("região de níveis do index.html: %s" % ("atualizada" if idx else "sem marcadores, ignorada"))
    print("índice da trilha (botão Feito): %d documento(s)" % docs_json)
    if dropped:
        print("\nAVISO: %d linha(s) de bullet IGNORADA(S) — não são itens válidos" % len(dropped))
        print("  formato esperado:  - [tipo] **Título** — papel — `caminho`")
        for n, raw in dropped:
            print("   L%-3d %r" % (n, raw))
    if created:
        print("\nEsqueletos criados (%d):" % len(created))
        for c in created:
            print("   + %s" % c)
    warns = warnings(levels)
    if warns:
        print("\nObservações:")
        for w in warns:
            print("   - %s" % w)
    print("\n-> roadmap.html · roadmap-dashboards.xmind · docs/trilhas/index.md · docs/trilhas/trilha.json")


if __name__ == "__main__":
    main()
