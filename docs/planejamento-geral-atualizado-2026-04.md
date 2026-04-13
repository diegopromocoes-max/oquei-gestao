# OQUEI GESTAO

## Documento Tecnico de Arquitetura, Status e Roadmap do Projeto

**Versao:** v3.0  
**Data-base:** 12 de abril de 2026  
**Baseline historica:** `oquei_gestao_projeto_tecnico_v2.pdf` (16 de marco de 2026)

---

## 1. Visao Geral do Projeto

O `Oquei Gestao` evoluiu de um painel administrativo central para uma plataforma operacional multi-painel, com escopos distintos para `coordenadora`, `supervisor`, `growth` e `atendente`. O documento `v2.0` cumpriu bem o papel de fotografia tecnica de marco/2026, mas deixou de representar com fidelidade o estado atual da base.

Desde a versao anterior, o sistema avancou especialmente em:

- CRM do atendente com cadastro, edicao e gestao de leads
- dashboards executivos por perfil
- consolidacao comercial por escopo
- metas por cidade, cluster e atendente
- mapa de leads e geolocalizacao operacional
- modulos de marketing, agenda, patrocinio e acoes do Japa
- servicos compartilhados para vendas e dashboard da coordenadora

Ao mesmo tempo, o projeto ainda carrega pontos de atencao relevantes:

- `Conteudos Digitais` segue como placeholder funcional
- ainda nao existe pipeline proprio de CI/CD no repositorio
- nao ha evidencia de Sentry ou Firebase Performance em operacao
- permanecem arquivos grandes em areas criticas, acima do limite tecnico desejado

---

## 2. Stack Tecnologica

### Frontend

- React 19
- Vite 7
- React Router 7
- Recharts 3
- Radix UI
- Lucide React
- Tailwind utilities e camada de estilos customizada

### Backend e dados

- Firebase Authentication
- Firestore
- Firebase Functions
- Firestore Rules e indices versionados no repositorio

### Qualidade e utilitarios

- Vitest
- Testing Library
- jsPDF
- jsPDF AutoTable

---

## 3. Design System e UI

O sistema hoje opera com um shell visual unificado em torno do `Hub Oquei`, com padronizacao progressiva de layout entre paineis. A base visual ja e mais madura do que a descrita no documento anterior, inclusive com:

- cabecalho e navegacao lateral compartilhados
- componentes comuns de cards, tabelas, modais e badges
- dashboards com linguagem executiva por perfil
- maior foco em experiencia de atendente, supervisor e coordenadora

Pontos ainda em aberto:

- manter consistencia visual em modulos mais antigos
- reduzir divergencias de layout em telas grandes
- continuar a extracao de componentes de alto reuso

---

## 4. Arquitetura de Pastas

O repositorio manteve a base em `src/`, mas ganhou novas areas funcionais importantes:

- `src/pages/` com paineis e modulos operacionais
- `src/components/` com layout, UI compartilhada e widgets
- `src/services/` com consolidacao crescente de regras de negocio
- `src/lib/` com utilitarios de acesso, calendario, geolocalizacao e regras de dominio
- `src/OqueiInsights/` com o modulo de pesquisas
- `functions/` com automacoes e enriquecimento backend
- `docs/` ainda enxuta, mas pronta para receber a nova documentacao mestre

Observacao importante: a arquitetura real de abril/2026 diverge em pontos relevantes da fotografia descrita no PDF anterior. Exemplos:

- o documento antigo mencionava `src/pages/PlanosCrescimento/`, mas a base atual trabalha com `HubCrescimento.jsx`
- parte da modelagem descrita no PDF mudou ao longo da implementacao
- varias regras migraram para servicos e agregadores compartilhados

---

## 5. Modulos de Navegacao

O sistema hoje possui um catalogo central de modulos por painel, com distribuicao por papel e configuracao mais sofisticada do que a prevista originalmente.

### Coordenadora

Painel executivo global com foco em comercial, RH, faltas, metas, growth, agenda, patrocinio, banco de horas, Hub Oquei, Oquei Pesquisas e modulos de operacao transversal.

### Supervisor

Painel regional com foco em performance da cluster, vendas, faltas, RH, metas, growth, banco de horas, CRM Ativo, marketing local, patrocinio, agenda e ferramentas operacionais.

### Growth

Painel proprio para acoes de crescimento, campanhas, patrocinio, agenda, Hub de Crescimento, Oquei Pesquisas, Gestao de Metas e demais ferramentas relacionadas.

### Atendente

Ecossistema comercial proprio com:

- inicio executivo
- meus graficos
- registrar lead
- meu funil
- relatorio mensal
- mapa de leads
- RH
- catalogo de roteadores
- devolucoes
- links
- configuracoes

### Status geral

- modulos antes considerados pendentes no PDF anterior hoje estao implementados
- o unico modulo explicitamente presente na navegacao e ainda nao entregue como produto real e `Conteudos Digitais`

---

## 6. Frentes Estrategicas Consolidadas Desde a v2.0

### CRM Atendente

Frente entregue e em operacao, com cadastro, edicao, filtros, mapa, resumo do lead, campos opcionais, indicadores pessoais e visualizacao mensal.

### Painel de Vendas e consolidacao comercial

Entregue e reestruturado sobre uma base compartilhada, com regras por escopo:

- atendente ve apenas seus dados
- supervisor ve apenas sua cluster
- coordenadora ve consolidado global

### Gestao de Metas

Entregue acima do que o plano anterior previa. A base atual contempla:

- metas por cidade
- metas por cluster
- metas individuais por atendente
- reflexo das metas no CRM, no Painel Vendas e nos dashboards executivos

### Dashboard da Coordenadora

Entregue em uma camada executiva mais rica, com velocimetros, faltas e escala, inteligencia comercial, operacao de pessoas, agenda, patrocinio e agenda do Japa.

### Marketing, Patrocinio e Japa

Funcionais, com oportunidades de acabamento e modularizacao, mas ja acima do que o planejamento anterior tratava como expectativa futura.

---

## 7. Modelo de Dados - Firestore

As colecoes e modelos atuais mostram uma base mais rica do que o PDF v2.0 descrevia. Entre as estruturas relevantes em operacao, destacam-se:

- `users`
- `cities`
- `clusters`
- `leads`
- `events`
- `absence_requests`
- `absences`
- `rh_requests`
- `sponsorships`
- `marketing_actions`
- `goals_cities`
- `monthly_goals`
- `monthly_cluster_goals`
- `monthly_attendant_goals`

### Observacoes

- a modelagem de metas foi expandida para suportar agregacao mensal e distribuicao por atendente
- a modelagem comercial passou a carregar melhor escopo regional
- ha drift entre o que o PDF anterior descrevia e o que a base hoje realmente usa

---

## 8. Camada de Servicos

A camada `/services` amadureceu bastante e hoje concentra regras de negocio que antes estavam espalhadas nas paginas.

Servicos com destaque no estado atual:

- `monthlySalesService.js`
- `coordinatorDashboardService.js`
- `metas.js`
- servicos de leads e catalogos
- servicos de ausencias e RH

Essa consolidacao ja traz ganhos claros:

- menos divergencia entre dashboards e telas analiticas
- reaproveitamento de regras de negocio
- mais clareza no escopo por perfil

---

## 9. Status do Roadmap Atual

O novo planejamento deixa de usar o snapshot antigo por sprint como fonte principal e passa a trabalhar por ondas.

### Onda 1 - Fechamento funcional do produto

Status: **majoritariamente concluida**

- CRM Atendente entregue
- mapa de leads entregue
- metas individuais entregues
- Radar Live entregue
- Painel Vendas por escopo entregue
- dashboards executivos revisados

### Onda 2 - Estabilizacao e acabamento operacional

Status: **em andamento**

- ajustes de consistencia entre planejamento e base real
- refinamento de permissoes e consultas
- fechamento de lacunas funcionais mais sensiveis

### Onda 3 - Reducao de divida tecnica

Status: **pendente / prioritaria**

- arquivos muito grandes ainda presentes
- necessidade de extrair logica e componentes
- necessidade de reduzir acoplamento em telas centrais

### Onda 4 - Qualidade, observabilidade e entrega continua

Status: **pendente**

- pipeline proprio de CI/CD
- ampliacao de testes
- observabilidade real
- governanca de seguranca e operacao

---

## 10. Arquivos Acima do Limite Tecnico

O problema de arquivos extensos continua relevante e deve permanecer no topo da agenda de engenharia. As areas mais criticas incluem CRM, mapa, dashboards, devolucoes, metas e modulos operacionais de alta manutencao.

Arquivos com maior peso atual:

- `src/pages/CRMAtivo.jsx`
- `src/pages/Devolucoes.jsx`
- `src/pages/MeuMapaLeads.jsx`
- `src/pages/DesencaixeSupervisor.jsx`
- `src/pages/NovoLead.jsx`
- `src/pages/PainelVendasAtendente.jsx`
- `src/components/LayoutGlobal.jsx`
- `src/services/metas.js`
- `src/pages/MeusLeads.jsx`
- `src/pages/BancoHorasSupervisor.jsx`

---

## 11. Bugs e Dividas Tecnicas

### Principais pontos atuais

- divergencias historicas entre documentacao antiga e implementacao real
- modulos grandes com alto custo de manutencao
- necessidade de fortalecer observabilidade em producao
- dependencia de publicacao consistente de regras, indices e functions para refletir todas as entregas
- `Conteudos Digitais` segue sem implementacao final

### Risco atual

O risco principal deixou de ser ausencia de modulo e passou a ser consistencia operacional, manutencao e capacidade de evolucao com seguranca.

---

## 12. Perfis e Rotas

### Coordenadora

Escopo global, com visao executiva, comercial, RH, faltas, metas, marketing e operacao transversal.

### Supervisor

Escopo regional por `cluster`, com visao consolidada apenas das cidades sob sua responsabilidade.

### Growth

Escopo proprio de campanhas, patrocinio, agenda, growth e inteligencia relacionada.

### Atendente

Escopo pessoal, centrado em CRM, vendas proprias, metas individuais, graficos, mapa e ferramentas da rotina.

---

## 13. Diretrizes de Codigo e Manutencao

As diretrizes centrais continuam validas, mas agora com foco ainda maior em manutencao:

- extrair regra de negocio para `services`
- reduzir arquivos acima de 300 linhas
- evitar duplicacao entre dashboards e modulos profundos
- manter escopo de acesso estritamente coerente com o papel do usuario
- documentar melhor estruturas de dados que evoluiram desde marco/2026

---

## 14. Changelog Resumido

### 16/03/2026 - Baseline v2.0

- documento tecnico inicial consolidado
- fotografia de arquitetura, stack, modulos e status por sprint

### Marco a abril/2026 - Evolucao acelerada

- CRM Atendente expandido
- dashboards do supervisor e da coordenadora reformulados
- consolidacao comercial por escopo implementada
- metas individuais por atendente implementadas
- mapa de leads e geolocalizacao amadurecidos
- modulos de marketing e agenda aprofundados
- home executiva da coordenadora ampliada

### 12/04/2026 - Nova referencia oficial

- PDF v2.0 passa a ser baseline historica
- este documento passa a ser a nova referencia de status e roadmap

---

## Conclusao Executiva

O projeto `Oquei Gestao` ja nao pode ser classificado como uma base parcial em construcao inicial. O produto entrou em uma fase de maturidade funcional relevante, com cobertura ampla de processos comerciais, operacionais e de gestao.

O backlog real agora se concentra em:

- estabilizacao
- consistencia de dados
- reducao de divida tecnica
- observabilidade e qualidade
- conclusao do modulo `Conteudos Digitais`

Esse reposicionamento e importante para que o planejamento geral volte a servir como ferramenta de decisao, e nao apenas como registro historico.
