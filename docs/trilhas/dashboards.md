# Dashboards no Gov Hub

Do "por que um dashboard" ao painel publicado no Gov Hub, com Apache Superset e Power BI e com acessibilidade como requisito.

> Versão visual, com progresso: **[mapa da trilha](../../mapa.html?trilha=dashboards)**
> Gerado a partir de **[trilhas/dashboards.md](../../trilhas/dashboards.md)** por `tools/gen_roadmap.py` — não edite à mão.

---

### Nível 0 · Fundamentos de visualização de dados
*O vocabulário e o raciocínio crítico antes de tocar na ferramenta: o que um dashboard resolve, o que o diferencia de um relatório ou de um painel operacional, e por que um dashboard bom parece simples.*
- [Por que fazer um dashboard?](../explicacao/por-que-fazer-um-dashboard.md) — *Explicação* · **Essencial**
- [O que faz um dashboard ruim](../explicacao/o-que-faz-um-dashboard-ruim.md) — *Explicação* · **Essencial**
- [Percepção visual e carga cognitiva](../explicacao/percepcao-visual-e-carga-cognitiva.md) — *Explicação* · **Essencial**
- [Dashboard, relatório analítico e painel operacional](../explicacao/dashboard-relatorio-painel-operacional.md) — *Explicação* · **Essencial**
- [Perguntas que um dashboard deve responder](../referencia/perguntas-que-um-dashboard-deve-responder.md) — *Referência* · Apoio
- [Glossário](../referencia/glossario.md) — *Referência* · Apoio

### Nível 1 · Arquitetura da informação
*Como organizar o conteúdo para que quem lê encontre a resposta sem esforço: posição dos elementos, fluxo de leitura, navegação do geral para o detalhe e uso disciplinado de filtros.*
- [Arquitetura da informação — visão geral](../explicacao/arquitetura-da-informacao.md) — *Explicação* · **Essencial**
- [Fluxo de leitura: padrões F e Z](../explicacao/fluxo-de-leitura-f-e-z.md) — *Explicação* · **Essencial**
- [Indicação de contexto](../explicacao/indicacao-de-contexto.md) — *Explicação* · **Essencial**
- [Estrutura de navegação: overview, zoom e detalhe](../explicacao/estrutura-de-navegacao.md) — *Explicação* · **Essencial**
- [Organização de páginas e abas](../explicacao/organizacao-de-paginas-e-abas.md) — *Explicação* · Apoio
- [Filtros e segmentação](../explicacao/filtros-e-segmentacao.md) — *Explicação* · **Essencial**

### Nível 2 · Hierarquia visual e storytelling
*Definir o que se enxerga primeiro e transformar o dashboard em uma narrativa que gera decisão, em vez de um mural de números sem prioridade.*
- [Hierarquia visual](../explicacao/hierarquia-visual.md) — *Explicação* · **Essencial**
- [KPIs e Big Numbers](../explicacao/kpis-e-big-numbers.md) — *Explicação* · **Essencial**
- [Storytelling e comunicação com dados](../explicacao/storytelling-com-dados.md) — *Explicação* · **Essencial**
- [Viés e distorção na apresentação dos dados](../explicacao/vies-e-distorcao-nos-dados.md) — *Explicação* · Apoio

### Nível 3 · Design visual e acessibilidade
*Base de design aplicada a dados, sem exigir formação em design — e acessibilidade como requisito legal da plataforma de governo (eMAG e WCAG), não como polimento opcional no fim do projeto.*
- [Consistência visual: tipografia, grid e alinhamento](../explicacao/consistencia-visual.md) — *Explicação* · **Essencial**
- [Paletas e significado das cores](../referencia/paletas-e-significado-das-cores.md) — *Referência* · **Essencial**
- [Acessibilidade em dashboards (eMAG e WCAG)](../explicacao/acessibilidade-em-dashboards.md) — *Explicação* · **Essencial**
- [Checklist de acessibilidade](../referencia/checklist-de-acessibilidade.md) — *Referência* · **Essencial**
- [Interatividade: filtros, drill-down e drill-through](../explicacao/interatividade.md) — *Explicação* · Apoio
- [Experiência do usuário e performance](../explicacao/experiencia-do-usuario-e-performance.md) — *Explicação* · Apoio

### Nível 4 · Escolha do gráfico
*O catálogo de consulta: qual visual responde qual pergunta, no Superset e no Power BI. Comece pelo raciocínio (as duas primeiras páginas) e volte às referências sempre que estiver construindo.*
- [Qual é o gráfico certo para o meu dado?](../explicacao/qual-e-o-grafico-certo.md) — *Explicação* · **Essencial**
- [Erros mais comuns na escolha do gráfico](../explicacao/erros-comuns-na-escolha-do-grafico.md) — *Explicação* · **Essencial**
- [Guia rápido: pergunta → gráfico](../referencia/guia-rapido-pergunta-para-grafico.md) — *Referência* · **Essencial**
- [Tabelas: Table e Pivot Table / Matrix](../referencia/graficos-tabelas.md) — *Referência* · **Essencial**
- [Séries temporais: Line e Area Chart](../referencia/graficos-series-temporais.md) — *Referência* · **Essencial**
- [Comparação entre categorias: Bar e Horizontal Bar](../referencia/graficos-comparacao-entre-categorias.md) — *Referência* · **Essencial**
- [Distribuição: Histogram e Box Plot](../referencia/graficos-distribuicao.md) — *Referência* · **Essencial**
- [Partes de um todo: Pie, Donut e Treemap](../referencia/graficos-partes-de-um-todo.md) — *Referência* · **Essencial**
- [Correlação: Scatter Plot](../referencia/graficos-correlacao.md) — *Referência* · **Essencial**
- [Geoespacial: Maps e Bubble Maps](../referencia/graficos-geoespaciais.md) — *Referência* · **Essencial**
- [Visuais avançados do Power BI: Funnel, Decomposition Tree e Waterfall](../referencia/graficos-avancados-power-bi.md) — *Referência* · Apoio
- [Azure Maps (Power BI)](../referencia/azure-maps.md) — *Referência* · Apoio
- [Mapas: Superset vs. Power BI](../pesquisa/mapas-superset-vs-power-bi.md) — *Pesquisa* · Apoio

### Nível 5 · Prática guiada
*Mão na massa: do entendimento do problema até o dashboard publicado, passando por KPIs, wireframe, construção na ferramenta e revisão de qualidade.*
- [Do problema ao dashboard publicado](../tutoriais/do-problema-ao-dashboard-publicado.md) — *Tutorial* · **Capstone**
- [Adicionar um filtro no Superset](../guias/adicionar-filtro-no-superset.md) — *Guia* · Apoio
- [Criar um tema de cores no Power BI (JSON)](../guias/criar-tema-de-cores-no-power-bi.md) — *Guia* · Apoio
- [Configurar a ordem de leitura (tab order) no Power BI](../guias/configurar-tab-order-no-power-bi.md) — *Guia* · Apoio
- [Transformar um dashboard ruim em um dashboard bom](../desafios/dashboard-ruim-para-dashboard-bom.md) — *Desafio* · **Capstone**

### Nível 6 · Governança e publicação no GovHub
*Como tudo isso se conecta às regras da plataforma: nomenclatura, papéis, homologação e o checklist que precede qualquer publicação para o público final.*
- [Padrões e governança GovHub](../referencia/padroes-e-governanca-govhub.md) — *Referência* · **Essencial**
- [Checklist final de qualidade antes de publicar](../referencia/checklist-final-de-qualidade.md) — *Referência* · **Essencial**
- [Publicar e homologar um dashboard no GovHub](../guias/publicar-e-homologar-no-govhub.md) — *Guia* · **Essencial**
- [Papéis e permissões](../referencia/papeis-e-permissoes.md) — *Referência* · Apoio

