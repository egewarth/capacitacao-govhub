---
slug: dashboards
titulo: Dashboards no Gov Hub
diagrama: assets/diagramas/logica-da-trilha.png
diagrama_alt: A lógica da trilha em cinco etapas, da esquerda para a direita: por quê (fundamentos), o quê (princípios transversais), como (execução na ferramenta), governança (padrões Gov Hub) e prática (estudo de caso). Acessibilidade e arquitetura da informação aparecem desde o Nível 0 como critérios de qualidade e voltam de forma aplicada nos níveis técnicos.
descricao: Do "por que um dashboard" ao painel publicado no Gov Hub, com Apache Superset e Power BI e com acessibilidade como requisito.
---
# Trilha de aprendizagem — Dashboards no GovHub

> **Fonte única da trilha.** Edite **apenas este arquivo** e rode `python3 tools/gen_roadmap.py`. Ele regenera `docs/trilhas/dashboards.json` (lido pelo mapa, pelo leitor e pelo catálogo), `docs/trilhas/dashboards.md` (versão em texto) e `docs/trilhas/dashboards.xmind` (mapa mental). Um mesmo documento não pode aparecer duas vezes nesta trilha.
>
> **Formato do item:** `` - [tipo] **Título** — papel — `caminho/para/doc.md` ``
> &nbsp;&nbsp;• **tipo**: `tutorial` · `how-to` · `reference` · `explanation` · `challenge` · `research`
> &nbsp;&nbsp;• **papel**: `core` · `support` · `capstone` · `optional` · `advanced`
>
> **Cadência:** faça os itens **core** de cada nível, de cima para baixo; **support/optional/advanced**
> ficam para quando forem necessários. Para reordenar, mova linhas; para incluir, copie uma linha.
>
> A trilha segue a progressão **"por quê" → "o quê" → "como"**: fundamentos conceituais, princípios
> transversais (design, acessibilidade, arquitetura da informação), execução técnica na ferramenta,
> padrões de governança e, por fim, prática guiada. Acessibilidade e arquitetura da informação não são
> um módulo isolado no fim — aparecem desde o Nível 0 como critérios de qualidade.


## Nível 0 · Fundamentos de visualização de dados
O vocabulário e o raciocínio crítico antes de tocar na ferramenta: o que um dashboard resolve, o que o
diferencia de um relatório ou de um painel operacional, e por que um dashboard bom parece simples.

- [explanation] **Por que fazer um dashboard?** — core — `docs/explicacao/por-que-fazer-um-dashboard.md`
- [explanation] **O que faz um dashboard ruim** — core — `docs/explicacao/o-que-faz-um-dashboard-ruim.md`
- [explanation] **Percepção visual e carga cognitiva** — core — `docs/explicacao/percepcao-visual-e-carga-cognitiva.md`
- [explanation] **Dashboard, relatório analítico e painel operacional** — core — `docs/explicacao/dashboard-relatorio-painel-operacional.md`
- [reference] **Perguntas que um dashboard deve responder** — support — `docs/referencia/perguntas-que-um-dashboard-deve-responder.md`
- [reference] **Glossário** — support — `docs/referencia/glossario.md`

## Nível 1 · Arquitetura da informação
Como organizar o conteúdo para que quem lê encontre a resposta sem esforço: posição dos elementos,
fluxo de leitura, navegação do geral para o detalhe e uso disciplinado de filtros.

- [explanation] **Arquitetura da informação — visão geral** — core — `docs/explicacao/arquitetura-da-informacao.md`
- [explanation] **Fluxo de leitura: padrões F e Z** — core — `docs/explicacao/fluxo-de-leitura-f-e-z.md`
- [explanation] **Indicação de contexto** — core — `docs/explicacao/indicacao-de-contexto.md`
- [explanation] **Estrutura de navegação: overview, zoom e detalhe** — core — `docs/explicacao/estrutura-de-navegacao.md`
- [explanation] **Organização de páginas e abas** — support — `docs/explicacao/organizacao-de-paginas-e-abas.md`
- [explanation] **Filtros e segmentação** — core — `docs/explicacao/filtros-e-segmentacao.md`

## Nível 2 · Hierarquia visual e storytelling
Definir o que se enxerga primeiro e transformar o dashboard em uma narrativa que gera decisão,
em vez de um mural de números sem prioridade.

- [explanation] **Hierarquia visual** — core — `docs/explicacao/hierarquia-visual.md`
- [explanation] **KPIs e Big Numbers** — core — `docs/explicacao/kpis-e-big-numbers.md`
- [explanation] **Storytelling e comunicação com dados** — core — `docs/explicacao/storytelling-com-dados.md`
- [explanation] **Viés e distorção na apresentação dos dados** — support — `docs/explicacao/vies-e-distorcao-nos-dados.md`

## Nível 3 · Design visual e acessibilidade
Base de design aplicada a dados, sem exigir formação em design — e acessibilidade como requisito legal
da plataforma de governo (eMAG e WCAG), não como polimento opcional no fim do projeto.

- [explanation] **Consistência visual: tipografia, grid e alinhamento** — core — `docs/explicacao/consistencia-visual.md`
- [reference] **Paletas e significado das cores** — core — `docs/referencia/paletas-e-significado-das-cores.md`
- [explanation] **Acessibilidade em dashboards (eMAG e WCAG)** — core — `docs/explicacao/acessibilidade-em-dashboards.md`
- [reference] **Checklist de acessibilidade** — core — `docs/referencia/checklist-de-acessibilidade.md`
- [explanation] **Interatividade: filtros, drill-down e drill-through** — support — `docs/explicacao/interatividade.md`
- [explanation] **Experiência do usuário e performance** — support — `docs/explicacao/experiencia-do-usuario-e-performance.md`

## Nível 4 · Escolha do gráfico
O catálogo de consulta: qual visual responde qual pergunta, no Superset e no Power BI. Comece pelo
raciocínio (as duas primeiras páginas) e volte às referências sempre que estiver construindo.

- [explanation] **Qual é o gráfico certo para o meu dado?** — core — `docs/explicacao/qual-e-o-grafico-certo.md`
- [explanation] **Erros mais comuns na escolha do gráfico** — core — `docs/explicacao/erros-comuns-na-escolha-do-grafico.md`
- [reference] **Guia rápido: pergunta → gráfico** — core — `docs/referencia/guia-rapido-pergunta-para-grafico.md`
- [reference] **Tabelas: Table e Pivot Table / Matrix** — core — `docs/referencia/graficos-tabelas.md`
- [reference] **Séries temporais: Line e Area Chart** — core — `docs/referencia/graficos-series-temporais.md`
- [reference] **Comparação entre categorias: Bar e Horizontal Bar** — core — `docs/referencia/graficos-comparacao-entre-categorias.md`
- [reference] **Distribuição: Histogram e Box Plot** — core — `docs/referencia/graficos-distribuicao.md`
- [reference] **Partes de um todo: Pie, Donut e Treemap** — core — `docs/referencia/graficos-partes-de-um-todo.md`
- [reference] **Correlação: Scatter Plot** — core — `docs/referencia/graficos-correlacao.md`
- [reference] **Geoespacial: Maps e Bubble Maps** — core — `docs/referencia/graficos-geoespaciais.md`
- [reference] **Visuais avançados do Power BI: Funnel, Decomposition Tree e Waterfall** — support — `docs/referencia/graficos-avancados-power-bi.md`
- [reference] **Azure Maps (Power BI)** — support — `docs/referencia/azure-maps.md`
- [research] **Mapas: Superset vs. Power BI** — support — `docs/pesquisa/mapas-superset-vs-power-bi.md`

## Nível 5 · Prática guiada
Mão na massa: do entendimento do problema até o dashboard publicado, passando por KPIs, wireframe,
construção na ferramenta e revisão de qualidade.

- [tutorial] **Do problema ao dashboard publicado** — capstone — `docs/tutoriais/do-problema-ao-dashboard-publicado.md`
- [how-to] **Adicionar um filtro no Superset** — support — `docs/guias/adicionar-filtro-no-superset.md`
- [how-to] **Criar um tema de cores no Power BI (JSON)** — support — `docs/guias/criar-tema-de-cores-no-power-bi.md`
- [how-to] **Configurar a ordem de leitura (tab order) no Power BI** — support — `docs/guias/configurar-tab-order-no-power-bi.md`
- [challenge] **Transformar um dashboard ruim em um dashboard bom** — capstone — `docs/desafios/dashboard-ruim-para-dashboard-bom.md`

## Nível 6 · Governança e publicação no GovHub
Como tudo isso se conecta às regras da plataforma: nomenclatura, papéis, homologação e o checklist que
precede qualquer publicação para o público final.

- [reference] **Padrões e governança GovHub** — core — `docs/referencia/padroes-e-governanca-govhub.md`
- [reference] **Checklist final de qualidade antes de publicar** — core — `docs/referencia/checklist-final-de-qualidade.md`
- [how-to] **Publicar e homologar um dashboard no GovHub** — core — `docs/guias/publicar-e-homologar-no-govhub.md`
- [reference] **Papéis e permissões** — support — `docs/referencia/papeis-e-permissoes.md`
