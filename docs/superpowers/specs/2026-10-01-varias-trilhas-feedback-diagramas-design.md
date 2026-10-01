# Várias trilhas, feedback anônimo por aula e diagramas Gov Hub

**Data:** 2026-10-01
**Status:** aprovado para plano de implementação
**Antecede:** `2026-10-01-leitor-trilha-firebase-design.md` (leitor, progresso no Firebase, identidade sóbria — já no ar)

## Objetivo

Três entregas independentes, nesta ordem:

- **C. Várias trilhas.** O site deixa de ser "a trilha de Dashboards" e passa a hospedar várias trilhas. A
  home vira um catálogo. Hoje só existe a trilha de Dashboards; o site fica pronto para a próxima.
- **E. Feedback por aula.** No fim de cada aula, quem entrou com Google avalia o conteúdo em duas
  perguntas objetivas e um comentário opcional. A resposta é **anônima de verdade** e fica no Firestore.
- **B. Diagramas.** Os 7 diagramas Mermaid das aulas e "A lógica da trilha" são refeitos com a skill
  `govhub-diagramas`, na identidade visual do Gov Hub.

**Fora do escopo:** o redesenho visual do mapa (o "metrô", bloco D — adiado; o mapa mantém o visual
atual), painel de leitura de feedback (a leitura é pelo console do Firestore), edição de avaliação já
enviada, texto das aulas (exceto a troca do bloco Mermaid pela imagem, em B).

## Decisões tomadas

| Pergunta | Decisão |
|---|---|
| Aulas entre trilhas | Compartilhadas; o progresso é **por aula** e vale em todas as trilhas |
| Segunda trilha | Ainda não existe; o site só se prepara |
| Home | Catálogo enxuto: um card por trilha, que leva ao mapa da trilha. O texto institucional sobre Dashboards sai do site |
| Mapa | Mantém o visual atual, montado no navegador a partir do JSON da trilha |
| Quem avalia | Só quem entrou com Google |
| Anonimato | De verdade: a resposta não guarda uid nem horário exato; não pode ser editada |
| Formato do feedback | "O conteúdo ficou claro?" (Confuso / Claro / Muito claro) + "Vai usar isso no seu trabalho?" (Sim / Talvez / Não) + comentário opcional |
| Leitura do feedback | Console do Firestore |
| Diagramas | Skill `govhub-diagramas`; fonte HTML versionada + PNG |

## C. Várias trilhas

### Fonte de cada trilha

`ROADMAP.md` passa a ser `trilhas/dashboards.md`. Cada arquivo em `trilhas/*.md` é uma trilha, no formato
de hoje (`## Nível N · Título`, parágrafo de abertura, itens `- [tipo] **Título** — papel — \`caminho\``),
com um cabeçalho no topo:

```markdown
---
slug: dashboards
titulo: Dashboards no Gov Hub
descricao: Do "por que um dashboard" ao painel publicado no Gov Hub, com Superset e Power BI.
diagrama: assets/diagramas/logica-da-trilha.png
diagrama_alt: Texto alternativo que descreve o diagrama.
---
```

`slug` (letras minúsculas, números e hífen), `titulo` e `descricao` são obrigatórios; `diagrama` e
`diagrama_alt` são opcionais e andam juntos. O cabeçalho é lido sem dependência externa (linhas
`chave: valor`). A ordem das trilhas no catálogo é a ordem alfabética do slug.

### Ids e progresso por aula

- O id de uma aula é o caminho do documento sem `docs/` e sem `.md` (`explicacao/hierarquia-visual`).
  Ele vale em todas as trilhas: marcar uma aula numa trilha marca em todas.
- **Um documento não pode aparecer duas vezes na mesma trilha** — o gerador recusa (hoje nenhum aparece).
  O sufixo `--N` deixa de existir. O progresso já salvo continua válido, porque nenhum id atual tem sufixo.
- "Última aula" passa a guardar também a trilha: `ultimaAula = { trilha, path }`. Valores antigos
  `{ path, item }` são lidos como `{ trilha: 'dashboards', path }`. Sem mudança de regra no Firestore
  (o campo já é permitido).

### Gerador (`tools/gen_roadmap.py`)

Lê todos os `trilhas/*.md` e produz, por trilha:

- `docs/trilhas/<slug>.json` — `{ slug, titulo, descricao, diagrama?, diagrama_alt?, niveis: [{ numero,
  titulo, descricao, itens: [{ id, titulo, doc, tipo, tipo_nome, papel, papel_nome, icone }] }] }`
- `docs/trilhas/<slug>.md` — a trilha em texto (substitui `docs/trilhas/index.md` atual)
- `docs/trilhas/<slug>.xmind` — mapa mental (substitui `roadmap-dashboards.xmind`)

E um catálogo `docs/trilhas/index.json` — `{ trilhas: [{ slug, titulo, descricao, niveis: N,
aulas: [ids...] }] }` (as ids permitem calcular o progresso de cada trilha sem baixar todos os JSONs) —
mais `docs/trilhas/index.md` com a lista das trilhas em texto.

Deixam de existir: `docs/trilhas/trilha.json`, a região gerada `ROADMAP:START/END` do `roadmap.html`, a
região `LEVELS:START/END` do `index.html`, `roadmap-dashboards.xmind`. Validações novas: slug único,
cabeçalho obrigatório, documento repetido na mesma trilha. Continua criando esqueleto para `.md`
referenciado que não existe.

### Páginas

- **`index.html` — catálogo.** Barra superior de sempre; um título curto ("Trilhas de capacitação") e um
  card por trilha: título, descrição, "N aulas · M níveis", seu percentual (barra), botão **Abrir a
  trilha** → `mapa.html?trilha=<slug>` e, se a última aula registrada for dessa trilha, o link
  **Continuar: <título da aula>**. Saem: visão geral, Diátaxis, mapa de conteúdo, níveis, papéis,
  "como contribuir", status. Mantém o rodapé.
- **`mapa.html?trilha=<slug>` — mapa da trilha.** O visual atual do `roadmap.html` (espinha com níveis e
  cartões, legenda de tipos, barra de progresso, "limpar progresso"), montado no navegador a partir de
  `docs/trilhas/<slug>.json`. No topo: título, descrição e, se houver, o diagrama da trilha com o texto
  alternativo. Sem `trilha` na URL ou com slug inexistente: usa a primeira trilha do catálogo.
- **`roadmap.html`** vira um redirecionamento para `mapa.html?trilha=dashboards` (preserva links e
  favoritos antigos).
- **`doc.html?trilha=<slug>&path=<doc>`** — o leitor carrega a barra lateral e a sequência
  anterior/próxima da trilha da URL. Sem `trilha`: `dashboards`. O parâmetro `item` deixa de ser
  necessário (ids únicos por trilha); links antigos com `item` continuam funcionando (o parâmetro é
  ignorado). Links internos do Markdown preservam a `trilha` atual. O link "Mapa da trilha" da barra
  superior aponta para o mapa da trilha atual.

### Módulos JS

- `assets/trilha.js`: `carregarCatalogo()` e `carregarTrilha(slug)` (cache por slug; promessa rejeitada
  não fica em cache).
- `assets/progresso-nucleo.js`: funções passam a trabalhar com ids únicos por trilha (`idsDoDoc` some —
  o id é derivado do doc; `localizar(niveis, doc)`; `hrefDoItem(trilha, item)`).
- `assets/progresso-loja.js`: `registrarUltimaAula(trilha, path)`; `ultimaAula()` devolve
  `{ trilha, path }` normalizado (compatível com o formato antigo).

### Documentação

ADR 0005 — várias trilhas e progresso por aula. README, CONTRIBUTING e CONTEXT passam a falar de
`trilhas/<slug>.md` em vez de `ROADMAP.md`. O CI verifica `docs/trilhas/`.

## E. Feedback por aula

### Interface

Bloco no fim de cada aula **que pertence à trilha da URL**, antes da sequência anterior/próxima:

- **Sem login:** "Entre com Google para avaliar esta aula" + botão de entrar.
- **Com login, ainda não avaliou:** título "Conte como foi esta aula"; "O conteúdo ficou claro?"
  (Confuso / Claro / Muito claro) e "Vai usar isso no seu trabalho?" (Sim / Talvez / Não) como grupos de
  botões de opção acessíveis (`role="radiogroup"`/inputs radio estilizados); comentário opcional
  (`textarea`, até 1000 caracteres, com contador); botão **Enviar** habilitado quando as duas perguntas
  foram respondidas; nota "Sua resposta é anônima: não guardamos quem respondeu."
- **Enviando:** botão desabilitado ("Enviando…").
- **Depois de enviar (ou se já avaliou antes):** "Obrigado pela avaliação." — sem mostrar a resposta.
- **Erro:** mantém o que foi preenchido e mostra "Não foi possível enviar; tente de novo."

### Dados

- Coleção **`feedback`**, documento com id aleatório (`addDoc`):
  `{ trilha, aula, clareza: 'confuso'|'claro'|'muito-claro', uso: 'sim'|'talvez'|'nao', comentario?,
  periodo: 'AAAA-MM' }`. **Sem uid, sem nome, sem horário exato** — só o mês, para que o horário não
  permita cruzar a resposta com o momento em que o progresso da pessoa foi salvo.
- No **`progresso/{uid}`**, campo novo `avaliadas: { <id da aula>: true }` — registra só *que* avaliou.
  Gravado **depois** que o feedback foi aceito (merge-set), para o bloco virar "Obrigado" em qualquer
  dispositivo.
- Ordem: envia o feedback; se aceito, marca `avaliadas`; se a marcação falhar, o feedback já está salvo
  e o bloco mostra "Obrigado" mesmo assim (no máximo, a pessoa poderia avaliar de novo noutro dispositivo).

### Regras do Firestore (publicar no console e espelhar em `firestore.rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /progresso/{uid} {
      allow read, delete: if request.auth != null && request.auth.uid == uid;
      allow create, update: if request.auth != null
        && request.auth.uid == uid
        && request.resource.data.keys().hasOnly(['feitos', 'ultimaAula', 'avaliadas', 'atualizadoEm']);
    }
    match /feedback/{id} {
      allow create: if request.auth != null
        && request.resource.data.keys().hasOnly(['trilha', 'aula', 'clareza', 'uso', 'comentario', 'periodo'])
        && request.resource.data.keys().hasAll(['trilha', 'aula', 'clareza', 'uso', 'periodo'])
        && request.resource.data.trilha is string && request.resource.data.trilha.size() <= 60
        && request.resource.data.aula is string && request.resource.data.aula.size() <= 200
        && request.resource.data.clareza in ['confuso', 'claro', 'muito-claro']
        && request.resource.data.uso in ['sim', 'talvez', 'nao']
        && (!('comentario' in request.resource.data)
            || (request.resource.data.comentario is string && request.resource.data.comentario.size() <= 1000))
        && request.resource.data.periodo is string
        && request.resource.data.periodo.matches('^[0-9]{4}-[0-9]{2}$');
    }
  }
}
```

Nenhuma leitura, edição ou remoção de `feedback` pelo site. **As regras precisam ser publicadas antes do
deploy de E** (sem elas, gravar `avaliadas` é recusado).

### Módulos JS

- `assets/progresso-nuvem.js`: `enviarFeedback(dados)` (`addDoc`) e `marcarAvaliada(uid, id)` (merge-set).
- `assets/progresso-loja.js`: `foiAvaliada(id)`, `avaliar(id, trilha, { clareza, uso, comentario })` →
  Promise; exige sessão; `periodo` calculado no envio. O comentário é aparado e omitido se vazio.
- `assets/feedback.js` (novo): monta o bloco no leitor e reage a `aoMudar` (login/logout).

### Documentação

ADR 0006 — feedback anônimo (o que se guarda, o que não, por que só o mês, por que não dá para editar).
README §7.6 atualizado com as regras novas e como exportar o feedback pelo console.

## B. Diagramas

- **Quais:** os blocos ```` ```mermaid ```` de `docs/explicacao/por-que-fazer-um-dashboard.md`,
  `dashboard-relatorio-painel-operacional.md`, `organizacao-de-paginas-e-abas.md`,
  `estrutura-de-navegacao.md`, `qual-e-o-grafico-certo.md`, `docs/pesquisa/mapas-superset-vs-power-bi.md`,
  `docs/tutoriais/do-problema-ao-dashboard-publicado.md`, e "A lógica da trilha" (hoje um bloco de texto
  na home).
- **Como:** skill `govhub-diagramas` — cada diagrama vira `assets/diagramas/<nome>.html` (fonte
  versionada) + `assets/diagramas/<nome>.png` (gerado). O tipo de diagrama (fluxo, blocos, comparação)
  segue o conteúdo de cada Mermaid; nenhum passo, rótulo ou relação é inventado ou omitido.
- **Nas aulas:** o bloco Mermaid é substituído por `![texto alternativo](../../assets/diagramas/<nome>.png)`
  com um texto alternativo que descreve o diagrama inteiro (quem lê com leitor de tela recebe a mesma
  informação). O resto da aula não muda.
- **"A lógica da trilha"** entra no cabeçalho da trilha de Dashboards (`diagrama`/`diagrama_alt`) e
  aparece no topo do mapa.
- **Leitor:** sem Mermaid nas aulas publicadas, o `doc.html` deixa de carregar o Mermaid e o
  `leitor.js` perde `desenharDiagramas`. (Os documentos internos em `docs/superpowers/` não são aulas
  e podem continuar com Mermaid como texto.)
- Regenerar: o README documenta o comando da skill para refazer o PNG a partir do HTML.

## Verificação

- `node --test tests/*.test.js`: núcleo e loja atualizados (ids únicos, última aula com trilha e
  compatibilidade, avaliar/foiAvaliada com nuvem falsa), catálogo e JSON de trilha (formato, ids únicos,
  documentos existentes), validações do gerador (slug repetido, cabeçalho faltando, documento repetido).
- CI: os gerados em `docs/trilhas/` estão em dia; testes passam.
- Navegador headless: catálogo com um card; `mapa.html?trilha=dashboards` com o diagrama no topo;
  `roadmap.html` redireciona; leitor com `trilha` e sem `trilha`; bloco de feedback nos três estados
  (sem login dá para verificar; com login, manual); aulas com os PNGs novos e sem Mermaid.
- Manual com Firebase real (depois de publicar as regras): enviar feedback, ver o documento em
  `feedback` sem uid e com `periodo`, ver `avaliadas` no progresso, recarregar e ver "Obrigado".
