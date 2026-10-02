# Trilha de adoção do Gov Hub — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** publicar a segunda trilha, "Adotar o Gov Hub no seu órgão", com 26 aulas copiadas e adaptadas
da documentação técnica oficial.

**Architecture:** conteúdo em `docs/plataforma/` espelhando `GovHub-br/gov-hub-io:docs/documentacao/`;
fonte da trilha em `trilhas/adocao.md`, processada pelo gerador existente. O leitor volta a desenhar
Mermaid, carregando a biblioteca sob demanda.

**Tech Stack:** site estático (ES modules, marked, Mermaid 11 do jsDelivr), gerador Python.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-01-trilha-adocao-design.md` (tabela de aulas, tipos e papéis).
- Fonte: `GovHub-br/gov-hub-io` commit `8def869b67c4d2109601a1893fc0a9c8c6713bf7`, licença MIT.
- Texto original preservado; mudam só: `!!!` → citação, linhas `style … fill:` removidas, travessão no
  texto corrido, linha de crédito no fim. Links não são reescritos.
- Crédito: `*Adaptado da [documentação técnica do Gov Hub](https://gov-hub.io/govhub/documentacao/<caminho sem .md>/).*`
  (para `index.md`: `https://gov-hub.io/govhub/documentacao/`).
- Cores do Mermaid: as literais da paleta (`#F2F1F6`, `#0A005A`, `#613EFF`, `#BE006E`, `#E9DFFF`, `#2D3748`).
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

---

### Task 1: Leitor desenha Mermaid sob demanda

**Files:** Modify `assets/leitor.js`, `assets/leitor.css`; docs `README.md`, `CONTRIBUTING.md`,
`docs/adr/0003-identidade-visual-sobria.md`.

- [ ] Restaurar `desenharDiagramas(raiz)` de `3cc4d6c^:assets/leitor.js`, trocando a dependência do
  `<script>` global por carga sob demanda:

```js
// Blocos ```mermaid viram diagramas. A biblioteca só é baixada quando a aula tem diagrama; sem ela
// (CDN bloqueado), o bloco continua visível como código.
let mermaidPronto = null;
function carregarMermaid() {
  if (!mermaidPronto) {
    mermaidPronto = new Promise((ok, falha) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
      s.onload = () => ok(window.mermaid);
      s.onerror = () => { mermaidPronto = null; falha(new Error('mermaid')); };
      document.head.append(s);
    });
  }
  return mermaidPronto;
}
```

  `desenharDiagramas` chama `carregarMermaid()` só se houver `pre > code.language-mermaid`, inicializa
  com o mesmo `initialize` de antes e desenha cada bloco com `mermaid.render`, como antes.
- [ ] Chamar `desenharDiagramas(conteudo)` depois de `corrigirLinks(conteudo, path)` em `abrir`.
- [ ] Restaurar as regras `.conteudo .mermaid…` de `3cc4d6c^:assets/leitor.css`.
- [ ] Docs: README §7.3.1, CONTRIBUTING e ADR 0003 dizem que PNG da skill é o padrão e que a trilha de
  adoção usa Mermaid temporariamente.
- [ ] `node --test tests/*.test.js` passa; commit.

### Task 2: Aulas em `docs/plataforma/`

**Files:** Create os 26 arquivos da tabela da spec e `docs/plataforma/LEIA-ME.md`.

- [ ] Copiar os 26 arquivos do tarball do commit de origem para `docs/plataforma/<mesmo caminho>`.
- [ ] Converter `!!! tipo "Título"` + corpo recuado em `> **Título.** corpo` (sem título: só `> corpo`).
- [ ] Remover as linhas `style … fill:` de `forks/index.md`.
- [ ] Reescrever à mão os ` — ` do texto corrido (células de tabela vazias `—` ficam).
- [ ] Acrescentar a linha de crédito em cada aula.
- [ ] `LEIA-ME.md`: origem, commit, aviso MIT, regras de adaptação.
- [ ] Verificar: `grep -rn '^!!!\|style .*fill:' docs/plataforma` vazio; commit.

### Task 3: Trilha `adocao` e publicação

**Files:** Create `trilhas/adocao.md`; generated `docs/trilhas/adocao.*`, `docs/trilhas/index.*`.

- [ ] Escrever `trilhas/adocao.md` (cabeçalho `slug: adocao`, `titulo: Adotar o Gov Hub no seu órgão`,
  `descricao`; sete níveis com frase de abertura; itens no formato de `trilhas/dashboards.md`).
- [ ] `python3 tools/gen_roadmap.py`; testes Python e Node passam.
- [ ] Conferir no Chrome headless: catálogo com dois cards, mapa `adocao`, aula com Mermaid, aula com
  citação convertida, página de conclusão.
- [ ] Commit, push em `main`, acompanhar o workflow de publicação.
