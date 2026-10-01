# Leitor da trilha com barra lateral, progresso no Firebase e identidade sóbria do Gov Hub

**Data:** 2026-10-01
**Status:** aprovado para plano de implementação

## Objetivo

Transformar o site da trilha em uma experiência de curso no estilo Hotmart: a trilha fica sempre
visível em uma barra lateral, dividida por níveis, com uma caixa para marcar cada aula como feita. O
progresso passa a ser salvo no Firebase quando a pessoa entra com a conta Google. Todo o site adota a
identidade visual sóbria do Gov Hub (skill `govhub-visual-identity`, modo sóbrio de 2026-09-30).

**Fora do escopo:** o texto das aulas (`docs/**/*.md`) não muda; painel de administração; relatório
de progresso de turma; login por e-mail e senha.

## Decisões tomadas

| Pergunta | Decisão |
|---|---|
| Identificação | Login com Google (Firebase Auth) |
| Login obrigatório? | Não. Sem login, o progresso fica no navegador; com login, sincroniza |
| Projeto Firebase | Ainda não existe. O código fica pronto com configuração vazia + passo a passo |
| Estrutura de páginas | `doc.html` vira o leitor; `index.html` (entrada) e `roadmap.html` (mapa) continuam |
| Identidade visual | Tokens da skill `govhub-visual-identity`, substituindo os atuais de `assets/govhub.css` |
| Cor por tipo de página | Paleta estrita: tipos se distinguem por ícone de produto Gov Hub + nome |
| Stack | JavaScript puro, sem build; Firebase SDK modular via CDN `gstatic.com` |

## 1. Identidade visual

`assets/govhub.css` é reescrito a partir de `references/tokens.css` da skill e continua sendo a fonte
única de cor e tipografia (nenhuma página declara hex próprio).

- **Paleta:** roxo `#613EFF` (assinatura: barra superior, links, botões, caixa marcada, barra de
  progresso), navy `#0A005A` (títulos, cabeçalho de tabela, blocos de código), `#F2F1F6` (blocos,
  cards, zebra, aula ativa, etiquetas), `#BE006E` (acento único: botão "Concluir e avançar"). Estados:
  `#5235D9` hover, `#3F28A6` active e roxo de texto pequeno. Corpo `#2D3748`, metadados `#666666`.
- **Tipografia:** Reddit Sans (Google Fonts) em tudo; títulos em 800, `letter-spacing:-0.025em`,
  caixa alta e baixa. Substitui a Inter.
- **Logo:** `logomarca-horizontal-white.svg` sobre a barra roxa; `icone-none-default.svg` como favicon
  SVG. Os arquivos da skill são copiados para `assets/logo/` e substituem `assets/govhub-logo.svg`.
- **Tipos de página:** etiqueta em `#F2F1F6`, texto navy, ícone `-sober` copiado para
  `assets/icones/`:

  | Tipo | Ícone |
  |---|---|
  | Tutorial | `book-open` |
  | Guia | `wrench` |
  | Referência | `document-list` |
  | Explicação | `light-bulb` |
  | Desafio | `trophy` |
  | Pesquisa | `beaker` |

  As variáveis `--tut`, `--gui`, `--ref`, `--exp`, `--des`, `--res` deixam de existir; o
  `roadmap.html` (gerado) passa a usar as etiquetas com ícone.
- **Conteúdo das aulas (só renderização):** `h1` navy, `h2` roxo, `h3` navy; tabelas com `thead` navy
  e texto branco, zebra `#F2F1F6`; citações com borda roxa sobre `#F2F1F6` e texto navy; código em
  bloco com fundo navy; código inline em `#F2F1F6`; tema Mermaid com a paleta (nós `#F2F1F6` com borda
  roxa, linhas navy, secundário com borda `#BE006E`).
- **Ilustrações:** as 4 SVG de `assets/ilustracoes/` têm os hex antigos trocados pelos da paleta
  (`#7A34F3`→`#613EFF`, tons claros→`#F2F1F6`, bordas→`#E9DFFF`, laranja→`#BE006E` quando usado como
  destaque). Desenho e texto não mudam.
- **Acessibilidade:** só combinações aprovadas na skill (branco sobre roxo/navy/`#BE006E`; navy sobre
  branco/`#F2F1F6`; roxo pequeno sobre branco em `#3F28A6`). Foco visível em todos os controles; cor
  nunca é o único indicador (caixa marcada tem ✓; aula ativa tem borda e `aria-current="page"`).
- **Registro:** ADR `docs/adr/0003-identidade-visual-sobria.md` substitui o ADR 0002 (que recebe
  `Status: substituído pelo ADR 0003`).

## 2. Leitor (`doc.html`)

```
┌─ barra roxa: logo · Trilha de Dashboards ············ 37% ▓▓░ · [Entrar com Google] ─┐
├─ BARRA LATERAL (320px) ────────┬─ CONTEÚDO ──────────────────────────────────────────┤
│ ▓▓▓▓░░░░ 12 de 44 concluídas   │ Nível 1 · Arquitetura da informação · [💡 Explicação] │
│ ▾ Nível 0 · Fundamentos   4/6  │ # Fluxo de leitura: padrões F e Z                    │
│   ☑ Por que fazer um dashboard │ …markdown renderizado…                               │
│   ☐ Glossário          Apoio   │ ┌──────────────────────────────────────────────────┐ │
│ ▸ Nível 1 · Arquitetura   0/6  │ │ ← Anterior   [Concluir e avançar]    Próxima →  │ │
└────────────────────────────────┴──────────────────────────────────────────────────────┘
```

- **Barra superior:** logo, nome da trilha, percentual geral, botão "Entrar com Google" ou, com sessão,
  avatar/nome com menu "Sair". Links para Início e Mapa da trilha.
- **Barra lateral:** progresso geral no topo; um bloco recolhível por nível (`<details>`/`<summary>`
  ou botão com `aria-expanded`) com título e contador `feitas/total`; cada aula mostra a caixa de
  marcar (botão `aria-pressed`, alvo de toque ≥ 24px), o título como link, o ícone do tipo e, quando o
  papel não é Essencial, a etiqueta do papel (Apoio, Projeto final, Opcional, Avançado). O nível da
  aula aberta começa expandido; a aula aberta tem `aria-current="page"`.
- **Navegação:** clicar numa aula carrega o Markdown sem recarregar a página (`history.pushState`,
  com `popstate` tratado). A URL continua `doc.html?path=<doc>`; quando o mesmo documento aparece em
  mais de um nó, o link leva `&item=<id do nó>` para situar a posição. Links internos dentro do
  Markdown também navegam pelo leitor. Links antigos `doc.html?path=...` continuam funcionando.
- **Rodapé da aula:** "Anterior" e "Próxima" seguem a ordem dos nós no `ROADMAP.md`. "Concluir e
  avançar" marca a aula e abre a próxima; se a aula já está feita, o botão vira "Próxima aula". Em
  páginas fora da trilha (índices, README) não há caixa nem botões de sequência; a barra lateral
  aparece igual, sem aula ativa.
- **Celular (< 900px):** a barra lateral vira gaveta aberta pelo botão "☰ Conteúdo" na barra
  superior; fecha com Esc, com o botão de fechar e ao escolher uma aula. Foco vai para a gaveta ao
  abrir e volta ao botão ao fechar.
- **Mantém do leitor atual:** `marked` + `mermaid` por CDN, âncoras nos títulos, correção de links
  relativos, fallback quando o CDN falha.

## 3. Dados da trilha

`tools/gen_roadmap.py` passa a gravar em `docs/trilhas/trilha.json`, além de `documentos` (mantido),
uma lista ordenada `niveis`:

```json
"niveis": [
  { "numero": 0, "titulo": "Fundamentos de visualização de dados", "descricao": "…",
    "itens": [
      { "id": "explicacao/por-que-fazer-um-dashboard", "titulo": "Por que fazer um dashboard?",
        "doc": "docs/explicacao/por-que-fazer-um-dashboard.md",
        "tipo": "explicacao", "tipo_nome": "Explicação",
        "papel": "core", "papel_nome": "Essencial" }
    ] }
]
```

Os `id` são os mesmos `data-id` do `roadmap.html` (com sufixo `--N` em repetições), logo o progresso
existente continua válido. Marcar um documento marca todos os nós que apontam para ele (comportamento
atual do `doc.html`, agora também na barra lateral e no mapa).

## 4. Progresso

Dois módulos ES em `assets/`:

- **`progresso-nucleo.js`** — funções puras, sem DOM nem Firebase, testáveis em Node:
  `mesclar(local, remoto)` (união dos ids marcados), `alternar(feitos, ids)` (marca todos se algum
  falta, desmarca todos se todos estão marcados), `contar(feitos, niveis)` (geral e por nível),
  `vizinhos(niveis, idAtual)` (anterior/próxima), `localizar(niveis, path, item)` (nó atual).
- **`progresso.js`** — a loja de progresso usada pelas três páginas:
  `iniciar()`, `feitos()`, `alternar(ids)`, `aoMudar(callback)`, `usuario()`, `entrar()`, `sair()`,
  `registrarUltimaAula(path, item)`, `ultimaAula()`.

**Sem sessão:** lê e grava `localStorage["govhub-dashboards-roadmap-v1"]` (mesma chave e formato
`{id: true}` de hoje) e escuta o evento `storage` para refletir outras abas. Última aula em
`localStorage["govhub-dashboards-ultima-aula"]`.

**Com sessão Google:** o Firestore é a fonte da verdade; o navegador guarda só um cache da sessão,
em uma chave separada (`localStorage["govhub-dashboards-progresso-conta"]`, com o `uid` dentro).
1. Ao entrar, lê `progresso/{uid}`, aplica `mesclar(anonimo, remoto)` com o progresso anônimo
   (`govhub-dashboards-roadmap-v1`) e grava o resultado no Firestore. Em seguida **apaga o progresso
   anônimo**: ele foi absorvido pela conta e não volta a ser somado em entradas futuras.
2. Passa a escutar o documento com `onSnapshot`; cada atualização remota substitui o cache da sessão
   e dispara `aoMudar`. Assim outro dispositivo ou aba reflete a mudança em tempo real.
3. Marcar/desmarcar grava por campo (`feitos.<id>` = `true` ou `deleteField()`) com
   `updateDoc`/`FieldPath`, para que duas mudanças simultâneas em aulas diferentes não se sobrescrevam.
   O cache é atualizado na hora (resposta otimista).
4. Ao sair, o cache da sessão é apagado e o navegador volta ao estado anônimo, vazio. O progresso de
   uma conta nunca fica no navegador depois do logout nem é somado à conta de outra pessoa.
5. Ao abrir o site já com sessão ativa (Firebase Auth mantém a sessão), o cache é exibido de imediato
   e substituído pelo primeiro `onSnapshot`. Cache com `uid` diferente do da sessão é descartado.

Documento `progresso/{uid}`:
`{ feitos: { "<id>": true, … }, ultimaAula: { path, item }, atualizadoEm: serverTimestamp() }`.

**Configuração:** `assets/firebase-config.js` exporta `firebaseConfig`, vazio no repositório. Se
estiver vazio, se o SDK não carregar (CDN bloqueado, offline) ou se a inicialização falhar, o botão de
login não aparece e o site funciona só com `localStorage`, sem mensagem de erro para quem lê (aviso só
no console). Sem conexão com a sessão ativa, o SDK do Firestore
enfileira as gravações e as envia quando a conexão volta, enquanto a página estiver aberta; nesse
intervalo aparece um aviso discreto ("Sem conexão: suas marcações serão sincronizadas quando a conexão
voltar"). Gravação recusada pelo servidor (regras, sessão expirada) desfaz a marcação otimista e mostra
"Não foi possível salvar; entre de novo".

**SDK:** Firebase modular por `https://www.gstatic.com/firebasejs/<versão>/…` com versão fixada (a
mais recente estável no momento da implementação); só `firebase-app`, `firebase-auth` e
`firebase-firestore`.

**Segurança:** `firestore.rules` versionado na raiz:
`match /progresso/{uid} { allow read, write: if request.auth != null && request.auth.uid == uid; }`,
com validação de que só existem as chaves `feitos`, `ultimaAula` e `atualizadoEm`. Todo o resto é
negado. A `firebaseConfig` é pública por natureza; a proteção está nas regras e nos domínios
autorizados.

**Registro:** ADR `docs/adr/0004-progresso-no-firebase.md` (por que Firebase, por que login opcional,
o que fica no navegador, dependência externa de CDN).

## 5. Outras páginas

- **`index.html`:** aplica a identidade nova; ganha bloco "Seu progresso" com percentual e botão
  "Começar a trilha" (primeira aula) ou "Continuar de onde parei" (última aula registrada) e o botão
  de login na barra superior.
- **`roadmap.html`** (gerado por `tools/gen_roadmap.py`): identidade nova, etiquetas de tipo com
  ícone, e o script inline de progresso é trocado por `assets/progresso.js`; links das aulas levam ao
  leitor com `&item=`. O botão "zerar progresso" continua, e com sessão zera também na nuvem.

## 6. Documentação de configuração

Nova seção no `README.md` — "Salvar o progresso no Firebase" — com o passo a passo: criar projeto no
console do Firebase; registrar app Web e copiar a configuração para `assets/firebase-config.js`;
ativar o provedor Google em Authentication; adicionar `<usuario>.github.io` (e `localhost`) em
domínios autorizados; criar o banco Firestore em modo produção; publicar `firestore.rules`
(console ou `firebase deploy --only firestore:rules`); testar entrando no site.

## 7. Verificação

- **Testes unitários:** `tests/progresso-nucleo.test.mjs` com `node --test` cobrindo `mesclar`,
  `alternar` (inclusive documento repetido em dois nós), `contar`, `vizinhos` (primeira/última aula,
  documento repetido) e `localizar` (com e sem `item`, doc fora da trilha).
- **CI:** o job `verificar` ganha `actions/setup-node` e o passo `node --test tests/`; a checagem de
  arquivos gerados em dia continua (agora incluindo o novo formato de `trilha.json`).
- **Manual (servidor local `python3 -m http.server`):** desktop e 375px de largura; navegar pela
  barra lateral, voltar/avançar do navegador, marcar pela lateral, pelo rodapé e pelo mapa e ver os
  três sincronizados; progresso antigo do `localStorage` preservado; sem `firebaseConfig` o botão de
  login some e nada quebra; navegação só por teclado (Tab, Enter, Esc na gaveta).
- **Com projeto Firebase de teste (quando existir):** login, mescla na primeira entrada, sincronização
  entre duas abas/dispositivos, logout limpa o cache e deixa o navegador vazio, progresso anônimo absorvido só na primeira entrada, regras negam acesso ao documento de outro uid.
