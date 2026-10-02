# Trilhas de Capacitação — GovHub

> Um material prático para quem constrói dashboards no **GovHub**, com **Apache Superset** e
> **Power BI**. Da pergunta de negócio ao painel publicado — com acessibilidade tratada como
> requisito, não como acabamento.

Este documento é o **ponto de entrada**: explica o que estamos construindo, como o conteúdo está
organizado (framework **Diátaxis**) e como editar e evoluir o material.

- Estrutura do conteúdo: [Diátaxis](https://diataxis.fr/)
- Acessibilidade: [eMAG](https://www.gov.br/governodigital/pt-br/acessibilidade-e-usuario/acessibilidade-digital) e [WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/)
- Trilhas de aprendizagem: [index.html](index.html) (catálogo) · fonte de cada trilha em `trilhas/<slug>.md`

> Vai editar o material? Pule para a seção 7 — [Como editar e contribuir](#7-como-editar-e-contribuir).

---

## 1. Visão geral

Muita gente passa boa parte do dia procurando informação dentro de planilhas: filtra colunas, ordena
dados, monta tabelas temporárias e repete o processo toda vez que precisa responder uma pergunta
simples. O problema não está nos dados — está na forma como eles são apresentados.

Esta trilha ensina a transformar dados em decisão: primeiro o vocabulário e o raciocínio crítico,
depois a execução técnica na ferramenta.

### A lógica da trilha

A trilha segue a progressão **"por quê" → "o quê" → "como"**:

1. **Fundamentos conceituais** — por que um dashboard é bom ou ruim
2. **Princípios transversais** — design, acessibilidade, arquitetura da informação (valem para
   qualquer ferramenta)
3. **Execução técnica** — como aplicar isso no Superset e no Power BI
4. **Padrões e governança GovHub** — como isso se conecta ao ecossistema da plataforma
5. **Prática guiada** — estudo de caso, checklist, publicação

**Acessibilidade e arquitetura da informação não são um módulo isolado no fim.** Elas aparecem desde o
Nível 0 como critérios de qualidade e voltam de forma aplicada nos níveis técnicos.

### Público

Quem constrói ou encomenda painéis no GovHub: analistas, gestão e equipes técnicas. Não se assume
formação em design nem em estatística.

### Pré-requisitos

- Noções básicas de dados (o que é uma tabela, uma métrica, um filtro).
- Acesso ao ambiente do GovHub para a parte prática.

---

## 2. Princípios de organização (Diátaxis)

Cada página tem **um único propósito**. A regra de ouro do Diátaxis: não misturar aprender, fazer,
consultar e entender na mesma página.

| Quadrante | Pasta | Propósito |
|---|---|---|
| **Tutorial** | `docs/tutoriais/` | aprender fazendo, guiado do início ao fim |
| **Guia (how-to)** | `docs/guias/` | resolver uma tarefa concreta |
| **Referência** | `docs/referencia/` | consultar fatos durante o trabalho |
| **Explicação** | `docs/explicacao/` | entender o porquê, o contexto e os trade-offs |

Além dos quatro quadrantes, duas seções complementares:

| Seção | Pasta | Propósito |
|---|---|---|
| **Desafio** | `docs/desafios/` | entrega integradora com critérios de aceitação |
| **Pesquisa** | `docs/pesquisa/` | análise comparativa (pergunta → metodologia → resultados) |

O mapeamento do levantamento de conteúdos original para esses tipos está registrado em
[ADR 0001](docs/adr/0001-mapeamento-diataxis-do-levantamento.md).

---

## 3. Estrutura de pastas

```
Dashboards-Roadmap/
├── README.md                    visão geral + estrutura + como editar
├── trilhas/                     fonte de cada trilha (<slug>.md)
├── CONTEXT.md                   linguagem ubíqua da autoria
├── CONTRIBUTING.md              como contribuir
├── index.html                   catálogo de trilhas
├── mapa.html                    mapa de uma trilha (?trilha=<slug>)
├── doc.html                     leitor de Markdown, por trilha
├── concluida.html               página de conclusão da trilha
├── roadmap.html                 redireciona para mapa.html?trilha=dashboards
├── assets/
│   ├── govhub.css               identidade visual (tokens do modo sóbrio) e componentes comuns
│   ├── leitor.css · leitor.js   leitor da trilha (doc.html)
│   ├── caminho.js               quais ?path= o leitor aceita (só .md do próprio site)
│   ├── progresso-*.js           progresso: núcleo, loja e Firebase (ADR 0004)
│   ├── firebase-config.js       configuração do Firebase (vazia = só navegador)
│   ├── logo/ · icones/ · ilustracoes/   logotipo, ícones dos tipos de página e SVGs didáticos
├── tests/                       node --test tests/*.test.js
├── firestore.rules              regras de segurança do progresso
├── firebase.json                configuração do Firebase CLI (regras)
├── tools/gen_roadmap.py         trilhas/*.md -> json + md + xmind
├── docs/
│   ├── tutoriais/  guias/  referencia/  explicacao/  desafios/  pesquisa/
│   ├── adr/                     decisões de arquitetura do material
│   ├── trilhas/                 gen · <slug>.json|.md|.xmind por trilha, mais index.json e index.md (catálogo)
│   └── index.md                 índice da documentação
├── exemplos/                    dados, temas e wireframes de apoio
└── templates/                   um template por tipo de página
```

`gen` marca arquivos **regenerados** por `tools/gen_roadmap.py` — não edite à mão.

As cores e a tipografia das três páginas vêm de `assets/govhub.css`, que segue a identidade visual
do GovHub ([ADR 0002](docs/adr/0002-identidade-visual-govhub.md)).

---

## 4. A trilha

A trilha de Dashboards tem sete níveis, do vocabulário à publicação:

| Nível | Tema |
|---|---|
| 0 | Fundamentos de visualização de dados |
| 1 | Arquitetura da informação |
| 2 | Hierarquia visual e storytelling |
| 3 | Design visual e acessibilidade |
| 4 | Escolha do gráfico |
| 5 | Prática guiada |
| 6 | Governança e publicação no GovHub |

Em cada nível, faça primeiro os itens **essenciais**; os de **apoio/opcionais** vêm quando forem
necessários.

- Mapa com progresso: [mapa.html?trilha=dashboards](mapa.html?trilha=dashboards)
- O progresso também pode ser marcado **de dentro de cada página**: quem está lendo clica em
  *Marcar como feito* e a trilha registra. É o mesmo progresso, nos dois lugares.
- Sem login, o progresso vive no navegador de quem estuda: não sincroniza entre navegadores nem
  entre dispositivos, e some se os dados do site forem limpos. O login com Google é **opcional**:
  quem entra leva o progresso (de todas as trilhas) para qualquer computador, salvo no Firebase
  (seção 7.6).
- Versão em texto: [docs/trilhas/dashboards.md](docs/trilhas/dashboards.md)
- Fonte: [trilhas/dashboards.md](trilhas/dashboards.md)

### Formato dos itens

```
- [tipo] **Título** — papel — `caminho/para/doc.md`
```

- **tipo**: `tutorial` · `how-to` · `reference` · `explanation` · `challenge` · `research`
- **papel**: `core` · `support` · `capstone` · `optional` · `advanced`

---

## 5. Status do conteúdo

Nem toda página está escrita. As que ainda não estão carregam o marcador
`Rascunho — a escrever` logo abaixo do título e preservam a estrutura de tópicos do levantamento
original, para que ninguém precise redescobrir o escopo.

**Escrito:** fundamentos conceituais, arquitetura da informação, hierarquia visual e KPIs, escolha do
gráfico e o catálogo completo de visuais (Superset e Power BI).

**A escrever:** design visual, acessibilidade e paletas; storytelling; a prática guiada; os guias
técnicos; e os padrões de governança GovHub — estes últimos dependem de levantamento com a equipe da
plataforma.

---

## 6. Pré-visualizar localmente

É um site estático; qualquer host serve como está.

```bash
python3 -m http.server 8000        # na raiz do repositório
# abrir http://localhost:8000/  (catálogo)  e  /mapa.html?trilha=dashboards
```

Testes do progresso e do índice da trilha (Node 20+):

```bash
node --test tests/*.test.js
```

---

## 7. Como editar e contribuir

### 7.1 Editar uma página de conteúdo

1. Escolha o quadrante: aprender (`tutoriais`), fazer (`guias`), consultar (`referencia`), entender
   (`explicacao`).
2. Abra o arquivo na pasta correspondente em `docs/`.
3. Siga o template em `templates/` — há um por tipo de página.
4. Mantenha o cabeçalho `> Tipo: **X**` logo abaixo do título.

Material de apoio (dados, temas, wireframes) vai em `exemplos/`.

### 7.2 Editar a trilha

Edite **apenas** `trilhas/<slug>.md` e rode:

```bash
python3 tools/gen_roadmap.py
```

Isso regenera, para cada trilha, `docs/trilhas/<slug>.json`, `.md` e `.xmind`, e o catálogo
(`docs/trilhas/index.json` e `index.md`). O gerador
**valida** tipos e papéis e falha com mensagem clara em caso de erro de digitação. Ele também **cria um
esqueleto** para todo `.md` referenciado que ainda não exista, e **nunca renomeia** caminhos. Um mesmo
documento pode estar em várias trilhas, mas não se repete dentro da mesma.

**Criar uma trilha nova:** copie `trilhas/dashboards.md` para `trilhas/<slug>.md`, troque o cabeçalho,
liste os itens (aulas já existentes podem ser reaproveitadas; o progresso é da aula) e rode o gerador.
O campo `categoria` do cabeçalho é `negocial` (para quem usa os dados) ou `tecnica` (para quem opera
a plataforma): o catálogo da home mostra essa etiqueta no card e lista as negociais primeiro. Veja o [ADR 0005](docs/adr/0005-varias-trilhas.md).

### 7.3 Mudar cores, tipografia ou logotipo

Tudo o que é marca vive em `assets/govhub.css`: os tokens do modo sóbrio do Gov Hub
(`--primary-purple`, `--dark-navy`, `--bg-soft`, `--accent-rose`…), a barra superior, os botões, a
caixa de "feito" e as etiquetas de tipo de página. Mudou um token ali, mudou nas três páginas. Logotipo
e símbolo ficam em `assets/logo/` e `assets/favicon.svg`; os ícones dos tipos de página, em
`assets/icones/`.

Os tipos de página não têm cor própria: se distinguem por ícone e nome. Ao escolher uma cor, use só a
paleta e verifique o contraste — texto precisa de **4,5:1** e indicadores não textuais de **3:1**
(WCAG 2.1 AA). O raciocínio completo está no [ADR 0003](docs/adr/0003-identidade-visual-sobria.md).

### 7.3.1 Diagramas

Os diagramas das aulas ficam em `assets/diagramas/`: `<nome>.html` é a fonte versionada e
`<nome>.png` (3000 px de largura) é o que as aulas mostram. Esse é o padrão. Por enquanto, as aulas
da trilha de adoção (`docs/plataforma/`) ainda usam blocos Mermaid, que o leitor desenha com a paleta
e só baixa quando a aula tem diagrama; eles serão trocados por PNG.

Para regenerar, use a skill `govhub-diagramas` do plugin govhub-core. Com `SKILL` apontando para a
pasta da skill na sua instalação do plugin:

```bash
node $SKILL/scripts/inline_assets.mjs $SKILL/templates/<familia>.html assets/diagramas/<nome>.html
node $SKILL/scripts/render.mjs assets/diagramas/<nome>.html     # gera assets/diagramas/<nome>.png
```

Regra de cor: paleta sóbria. O pêssego `#FFE7E1` do template da skill deve ser trocado por
`#F2F1F6` em cada diagrama.

### 7.4 Arquivos gerados — não edite à mão

- `docs/trilhas/*.json`, `docs/trilhas/*.md` e `docs/trilhas/*.xmind`.

As páginas HTML não têm regiões geradas: o mapa e o catálogo são montados no navegador a partir do JSON.

### 7.5 Publicar

Todo push na `main` publica o site no GitHub Pages:

```bash
git add -A && git commit -m "docs: ..." && git push
```

O workflow `.github/workflows/publicar.yml` roda `tools/gen_roadmap.py` antes de publicar e **falha
se algum arquivo gerado estiver desatualizado** — ou seja, se alguém editou uma trilha em `trilhas/` sem
regenerar, ou esqueceu de commitar o esqueleto de uma página nova. Não há build: o site vai ao ar como
está no repositório, porque `doc.html` lê os `.md` em tempo de execução.

### 7.6 Salvar o progresso no Firebase

Sem configuração, o site funciona e o progresso fica só no navegador. Para que quem entra com a conta
Google leve o progresso para qualquer computador:

1. Em <https://console.firebase.google.com>, crie um projeto (o Google Analytics não é necessário).
2. **Configurações do projeto → Seus apps → Web (`</>`)**: registre um app e copie o objeto
   `firebaseConfig` para `assets/firebase-config.js` (pelo menos `apiKey`, `authDomain`, `projectId`
   e `appId`). Esse arquivo já está preenchido para o projeto `capacitacao-gov-hub`; estes passos
   servem para recriar o projeto ou trocá-lo por outro.
3. **Authentication → Método de login**: ative **Google**.
4. **Authentication → Configurações → Domínios autorizados**: adicione o domínio do GitHub Pages
   (ex.: `<usuario>.github.io`). `localhost` já vem autorizado.
5. **Firestore Database**: crie o banco em **modo de produção**.
6. Publique as regras de [`firestore.rules`](firestore.rules): cole o conteúdo em
   **Firestore → Regras → Publicar**, ou rode `firebase deploy --only firestore:rules` (Firebase CLI).
   As regras de `firestore.rules` são as que estão publicadas no console; mantenha os dois sempre
   iguais. Elas incluem as da coleção `feedback` (só criar, campos validados) e precisam estar
   publicadas **antes** do deploy do bloco de avaliação; sem elas o envio falha.
7. Commite `assets/firebase-config.js`. Ao abrir o site, o botão **Entrar com Google** aparece na barra
   superior.

Os valores de `firebaseConfig` são públicos por natureza; o que protege os dados são as regras do
passo 6. A decisão está no [ADR 0004](docs/adr/0004-progresso-no-firebase.md).
A avaliação das aulas está no [ADR 0006](docs/adr/0006-feedback-anonimo.md): a resposta não leva
uid, nome, e-mail nem horário, mas não é anônima diante de quem administra o projeto Firebase.

**Ler o feedback.** Console do Firebase → Firestore → coleção `feedback` (filtros por `trilha` e
`aula`). Para ter uma tabela, exporte a coleção para o BigQuery (ou leia com um script pequeno usando
o Admin SDK). `gcloud firestore export` gera um export do Firestore no Cloud Storage, não uma planilha.

---

## 8. Origem do conteúdo

O conteúdo desta trilha vem do levantamento de conteúdos elaborado pela equipe (versões V1, V2 e V3 do
documento de trabalho), incluindo a seção de metodologia que mapeia a ementa para os quatro tipos do
Diátaxis. A estrutura do repositório — trilha com fonte única, gerador, visualizador de Markdown e
organização Diátaxis — foi reaproveitada de um handbook anterior construído com as mesmas premissas.
