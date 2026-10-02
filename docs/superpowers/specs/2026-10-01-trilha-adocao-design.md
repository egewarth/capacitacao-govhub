# Trilha "Adotar o Gov Hub no seu órgão" — desenho

Data: 2026-10-01 · Estado: aprovado em conversa, aguardando revisão da spec

## Objetivo

Criar a segunda trilha do site, mais técnica, para a **equipe de TI de outro órgão que vai adotar o
Gov Hub**. Ela vai do "o que é a plataforma" até o fork temático, usando como base a documentação
técnica oficial (<https://gov-hub.io/govhub/documentacao/>). A trilha também serve de exemplo de que
o site comporta mais de uma trilha (ADR 0005).

Fora do escopo: levar este conteúdo de volta para a gov-hub.io. É uma direção futura possível, mas
não orienta nenhuma decisão aqui; o padrão é o deste site.

## Fonte do conteúdo

- Repositório `GovHub-br/gov-hub-io`, pasta `docs/documentacao/`, licença MIT, commit
  `8def869b67c4d2109601a1893fc0a9c8c6713bf7`.
- As aulas são **cópias adaptadas** guardadas neste repositório (não lidas em tempo real), para ganhar
  leitor, progresso e feedback como a trilha de dashboards. O risco aceito é a cópia ficar para trás
  da documentação oficial; o `LEIA-ME` registra o commit de origem para comparar depois.

## Onde ficam os arquivos

- Aulas em `docs/plataforma/`, **espelhando os caminhos originais** (ex.:
  `docs/documentacao/adocao/deploy-inicial.md` → `docs/plataforma/adocao/deploy-inicial.md`;
  `index.md` → `docs/plataforma/index.md`).
- `docs/plataforma/LEIA-ME.md`: origem, commit, licença MIT com o aviso de copyright, e as regras de
  adaptação desta spec. Não entra na trilha.
- Fonte da trilha em `trilhas/adocao.md`; o gerador produz `docs/trilhas/adocao.json|.md|.xmind` e
  atualiza o catálogo. A única mudança de código é o leitor voltar a desenhar Mermaid.

## A trilha

Cabeçalho: `slug: adocao`, `titulo: Adotar o Gov Hub no seu órgão`, `descricao` de uma frase,
sem `diagrama` por enquanto.

| Nível | Aula (fonte em `docs/documentacao/`) | Tipo | Papel |
|---|---|---|---|
| 0 · Entender a plataforma | O que é o Gov Hub (`index.md`) | explanation | core |
| | Visão geral da arquitetura (`arquitetura/visao-geral.md`) | explanation | core |
| | Fluxo de dados (`arquitetura/fluxo-de-dados.md`) | explanation | core |
| | Arquitetura medallion (`arquitetura/medallion.md`) | explanation | core |
| | Componentes (`arquitetura/componentes.md`) | reference | support |
| 1 · Planejar a adoção | Requisitos para adoção (`adocao/requisitos.md`) | how-to | core |
| | Fontes de dados (`arquitetura/fontes-de-dados.md`) | reference | core |
| | Dicionário de dados (`dados/dicionario.md`) | reference | support |
| 2 · Preparar a infraestrutura | Kubernetes (`infraestrutura/kubernetes.md`) | reference | support |
| | Argo CD GitOps (`infraestrutura/argocd.md`) | reference | support |
| | PostgreSQL (`infraestrutura/postgres.md`) | reference | support |
| | MinIO (`infraestrutura/minio.md`) | reference | support |
| | Gerenciamento de secrets (`infraestrutura/secrets.md`) | how-to | core |
| 3 · Primeiro deploy | Deploy inicial (`adocao/deploy-inicial.md`) | tutorial | core |
| 4 · Conectar a primeira fonte | Conectar fontes de dados (`adocao/conectar-fontes.md`) | how-to | core |
| | Apache Airflow (`pipeline/airflow.md`) | reference | support |
| | dbt (`pipeline/dbt.md`) | reference | support |
| | Qualidade de dados (`pipeline/qualidade.md`) | explanation | support |
| 5 · Governança e acesso | Controle de acesso (`governanca/acesso.md`) | explanation | core |
| | Segurança (`governanca/seguranca.md`) | reference | core |
| | OpenMetadata (`governanca/openmetadata.md`) | reference | support |
| | Trino + Ranger (`governanca/trino-ranger.md`) | reference | support |
| 6 · Fork temático | Forks temáticos (`forks/index.md`) | explanation | core |
| | Guia de criação de fork (`forks/guia-criar-fork.md`) | how-to | core |
| | Fork Cidades (`forks/cidades.md`) | reference | support |
| | Fork MinC (`forks/minc.md`) | reference | support |

26 aulas, 13 core. Cada nível ganha uma frase de abertura escrita para este público, no estilo de
`trilhas/dashboards.md`. A última aula core (guia de criação de fork) leva ao "Concluir a trilha".

## Regras de adaptação

O texto original fica como está; muda só o que o site não mostra ou que a identidade pede.

1. **Mermaid fica, por enquanto.** Os blocos ` ```mermaid ` (21 nas aulas acima) seguem como estão; só
   saem as linhas `style … fill:` com cores fora da paleta. A troca por PNG da skill `govhub-diagramas`
   fica para uma etapa posterior. Para isso o leitor volta a desenhar Mermaid (código removido em
   `3cc4d6c`), com o tema da paleta Gov Hub e carregando a biblioteca só quando a aula tem diagrama.
2. **Caixas `!!! tipo "Título"` → citação** com o título em negrito na primeira linha
   (`> **Comece pequeno.** …`).
3. **Sem travessão no texto corrido** (regra da identidade); troca por dois-pontos, vírgula ou ponto.
   Código, tabelas de comando e nomes próprios não mudam.
4. **Links não são reescritos.** Links relativos para aulas que estão na trilha já funcionam pelo
   espelhamento; os que apontam para páginas não copiadas ficam como estão (aceito: podem não abrir).
5. **Crédito em cada aula:** última linha `*Adaptado da [documentação técnica do Gov Hub](<URL oficial
   da página>).*`, além do `LEIA-ME`.

## Diagrama de abertura

Fica para a etapa dos diagramas; até lá o cabeçalho da trilha não tem `diagrama` (o campo é opcional).

## Verificação

- `python3 tools/gen_roadmap.py` sem erro; o gerador já valida caminhos e repetição.
- `node --test tests/*.test.js` e `python3 -m unittest discover -s tests -p 'test_*.py'` passando; o
  CI confere que `docs/` gerado está em dia.
- Nenhum `!!!` nem `style … fill:` restante em `docs/plataforma/`.
- No navegador (Chrome headless): catálogo com dois cards, mapa da trilha `adocao`, uma aula com
  diagrama e uma com caixa convertida, e a página de conclusão.
- Os diagramas Mermaid aparecem desenhados, com a paleta, e as aulas sem diagrama não baixam a
  biblioteca.
