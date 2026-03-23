# Documento de Consultoria — Oquei Insights

## 1. Resumo Executivo

O Oquei Insights deve evoluir de um módulo de pesquisas com dashboard e auditoria operacional para uma plataforma estruturada de inteligência de mercado, capaz de orientar decisões de crescimento por cidade, gerar leituras comparáveis ao longo do tempo e transformar achados em planos de ação acionáveis.

O contexto de uso é claro: a Oquei precisa investigar mercados com baixa penetração, necessidade de crescimento de base, pressão competitiva ou demanda direta da diretoria. Nesses cenários, a pesquisa não pode ser tratada apenas como coleta de opinião. Ela deve funcionar como um instrumento de diagnóstico comercial, cultural e operacional.

Hoje, o projeto já possui uma base relevante para essa evolução. O módulo atual contempla criação de campanhas, links de resposta, links personalizados por entrevistador, dashboard com filtros e mapa com GPS, auditoria manual das respostas e análises que cruzam pesquisa com dados operacionais do negócio. Isso reduz o esforço de construção do produto, porque o ponto de partida não é conceitual, e sim de maturação.

O principal desafio não é criar mais telas, mas consolidar um modelo de produto. Esse modelo precisa unir cinco frentes:

1. Governança das perguntas e comparabilidade entre campanhas.
2. Coleta auditável e confiável.
3. Leitura analítica por cidade, tema, período e campanha.
4. Copiloto de IA com rastreabilidade e papel consultivo.
5. Conversão dos achados em plano de ação mensurável.

Este documento propõe essa evolução em um formato executivo-operacional, preservando o que já existe, reduzindo retrabalho e organizando o Oquei Insights como motor formal de inteligência de crescimento.

## 2. Papel Estratégico do Oquei Insights

O Oquei Insights deve ser posicionado como o sistema oficial de pesquisa estratégica da Oquei para:

- Diagnosticar cidades com baixa penetração em vendas.
- Apoiar estratégias de crescimento da base de clientes.
- Investigar objeções que inibem a contratação.
- Entender canais, gatilhos e narrativas de venda mais aderentes a cada mercado.
- Identificar oportunidades de comunicação, patrocínios, parcerias e presença local.
- Mapear traços culturais e comportamentais da cidade que possam influenciar awareness, confiança e conversão.
- Produzir leitura corporativa comparável para a diretoria e leitura tática para operação e analistas.

Na prática, o Oquei Insights deve responder a perguntas como:

- Por que a Oquei não cresce mais rápido nesta cidade?
- O problema é desconhecimento, concorrência, preço, cobertura, reputação ou falta de gatilho comercial?
- Quais públicos têm maior probabilidade de troca?
- Quais canais e mensagens devem ser usados localmente?
- Há oportunidade para ativação de marca, patrocínio ou parceria?
- Quais ações devem ser priorizadas e como acompanhar sua execução?

## 3. Diagnóstico do Estado Atual

### 3.1 Capacidades já presentes no módulo

Com base no código atual do repositório, o módulo `src/OqueiInsights` já entrega uma fundação importante:

- **Campanhas de pesquisa** com cadastro de título, descrição, cidades-alvo, perguntas e status.
- **Fluxo de criação de pesquisas** com rascunho, ativação, pausa e encerramento.
- **Links públicos e links por entrevistador** para aplicação de campo.
- **Gestão de entrevistadores** com meta por campanha.
- **Coleta com GPS e numeração sequencial** para reforço operacional da pesquisa.
- **Dashboard de respostas** com filtros, exportação, mapa, leitura de respostas recentes e camada de IA.
- **Auditoria operacional** com aceite, recusa e exclusão de respostas.
- **Análise cruzada** entre dados de pesquisa e dados operacionais como `city_results` e `monthly_bases`.
- **Leitura assistida por IA** para apoiar interpretação de mercado, vulnerabilidade competitiva e oportunidades.

Essa base confirma que o Oquei Insights já deixou de ser uma ideia e já opera como um produto em estágio inicial de maturação.

### 3.2 Lacunas identificadas

Apesar da boa base, existem lacunas que limitam o valor estratégico do módulo:

- **Não há um banco estruturado de perguntas e temas.**
  As campanhas são construídas de forma livre. Isso oferece flexibilidade, mas enfraquece comparabilidade global, reaproveitamento, governança e padronização analítica.

- **A auditoria ainda é operacional, não plenamente rastreável.**
  Hoje o status de auditoria resolve o básico, mas ainda falta institucionalizar trilha de decisão, motivo, evidência, responsável, data, flags de risco e sinais de confiabilidade.

- **O plano de ação ainda não está consolidado como produto.**
  O conceito já aparece na navegação do módulo, mas não está organizado como uma capacidade madura e conectada aos achados da pesquisa.

- **A IA já existe, mas ainda carece de governança formal.**
  O uso atual ajuda a interpretar dados, porém o produto ainda precisa formalizar papel, escopo, registro do contexto, transparência e limites de automação.

- **A leitura global corporativa ainda depende demais do desenho manual de cada campanha.**
  Sem perguntas núcleo e sem temas formalizados, o benchmark entre cidades e períodos perde consistência.

### 3.3 Leitura de maturidade

O Oquei Insights já está em condição de sair de uma fase de “ferramenta de pesquisa” para uma fase de “plataforma de inteligência territorial”. Para isso, a prioridade não deve ser ampliar volume de funcionalidades soltas, e sim consolidar método, dados, confiança e governança.

## 4. Visão de Produto Recomendada

O Oquei Insights deve operar como um ciclo contínuo de inteligência:

`gatilho -> hipótese -> campanha -> coleta -> auditoria -> análise -> priorização -> ação -> acompanhamento -> reavaliação`

### Gatilhos de abertura de campanha

Uma nova campanha deve nascer sempre a partir de um gatilho explícito:

- Baixa penetração em vendas.
- Queda ou lentidão de crescimento da base.
- Sinal competitivo relevante.
- Aumento de churn ou desalinhamento entre oferta e percepção.
- Solicitação formal da diretoria.
- Investigação de oportunidade comercial, cultural ou institucional.

### Função da campanha

A campanha não deve ser apenas um questionário. Ela deve registrar:

- Qual problema estratégico quer responder.
- Qual hipótese de negócio está sendo investigada.
- Em quais cidades ou recortes será aplicada.
- Quais temas serão analisados.
- Qual bloco comparável corporativo será usado.
- Quais módulos locais serão adicionados.

## 5. Modelo Operacional Proposto

### 5.1 Etapa 1 — Abertura

Toda campanha deve nascer com:

- nome da campanha;
- objetivo estratégico;
- gatilho de abertura;
- cidade ou conjunto de cidades;
- período de coleta;
- responsável analítico;
- temas da campanha;
- hipótese central;
- perguntas núcleo;
- perguntas complementares.

### 5.2 Etapa 2 — Coleta

A coleta deve permitir:

- aplicação pública ou por entrevistador;
- controle de metas por entrevistador;
- registro do contexto da coleta;
- evidência mínima de confiabilidade;
- rastreio do volume, dispersão geográfica e produtividade.

### 5.3 Etapa 3 — Auditoria

A auditoria deve separar claramente:

- resposta válida;
- resposta suspeita;
- resposta recusada;
- resposta aceita com ressalva.

O sistema deve registrar o motivo da decisão e preservar o histórico de revisão.

### 5.4 Etapa 4 — Leitura analítica

A análise deve responder em diferentes níveis:

- leitura executiva por cidade;
- leitura comparativa entre cidades;
- leitura por tema;
- leitura por campanha;
- leitura temporal;
- leitura cruzada com indicadores operacionais.

### 5.5 Etapa 5 — Plano de ação

O plano de ação deve ser um módulo próprio, mas com vínculo mínimo obrigatório a:

- cidade;
- campanha;
- tema.

Esse vínculo é suficiente para manter rastreabilidade sem obrigar associação a uma resposta individual.

## 6. Arquitetura Funcional Futura

### 6.1 Banco de perguntas e temas

Recomenda-se adotar o modelo **núcleo comparável + módulos específicos**.

#### Núcleo comparável

Bloco padronizado usado em campanhas de natureza semelhante para preservar benchmark corporativo. Exemplos de temas do núcleo:

- awareness da marca Oquei;
- provedor atual;
- percepção de qualidade;
- objeções à contratação;
- gatilhos de troca;
- prioridades de escolha;
- sensibilidade a preço;
- canais de informação e influência;
- abertura a patrocínio ou parceria local.

#### Módulos específicos

Blocos adicionais conforme contexto:

- expansão comercial;
- análise cultural da cidade;
- parceria institucional;
- percepção de concorrência;
- ativação de marca;
- eventos e patrocínio;
- perfil de consumo residencial;
- perfil de microempresas locais.

### 6.2 Dashboard corporativo

O dashboard deve ter duas camadas complementares:

- **Camada global comparável**: compara cidades, períodos, temas, objeções, awareness, gatilhos e oportunidades.
- **Camada local profunda**: detalha cidade, campanha e leitura contextual do mercado.

Essa combinação evita dois extremos:

- um painel corporativo sem profundidade local;
- ou várias leituras isoladas que não permitem governança central.

### 6.3 Plano de ação

O módulo de plano de ação deve ser separado do dashboard analítico, mas nascer dos achados do Oquei Insights. Cada ação deve ter:

- título;
- cidade;
- campanha de origem;
- tema relacionado;
- hipótese ou problema associado;
- objetivo;
- responsável;
- prazo;
- prioridade;
- status;
- impacto esperado;
- evidência de aprendizado;
- resultado medido.

## 7. Entidades e Interfaces Recomendadas

### 7.1 Tema de pesquisa

Entidade reutilizável para organizar o que a empresa quer entender. Exemplos:

- marca e awareness;
- concorrência;
- objeções comerciais;
- canais de comunicação;
- patrocínios e parcerias;
- cultura local;
- perfil de consumo;
- retenção e churn percebido.

### 7.2 Pergunta de banco

Cada pergunta do banco deve ser versionada e classificada com:

- tema;
- tipo;
- texto;
- opções, quando aplicável;
- objetivo analítico;
- uso permitido;
- indicador de comparabilidade global;
- status ativa/inativa;
- versão.

### 7.3 Campanha

Além do que já existe hoje, recomenda-se formalizar:

- objetivo estratégico;
- trigger de abertura;
- temas vinculados;
- versão do questionário;
- composição entre núcleo e módulos;
- dono analítico;
- critério de sucesso da campanha.

### 7.4 Resposta auditável

Além de `auditStatus`, a resposta deve contemplar:

- status de confiança;
- motivo da decisão;
- auditor responsável;
- data e hora da auditoria;
- flags automáticas de risco;
- evidência disponível;
- histórico de revisão.

### 7.5 Insight analítico

O insight deve ser tratado como saída estruturada de análise, não só texto livre. Recomenda-se permitir:

- insight;
- hipótese associada;
- tema;
- cidade;
- campanha;
- evidência;
- prioridade;
- recomendação sugerida.

### 7.6 Ação

A ação deve consolidar:

- cidade;
- campanha;
- tema;
- descrição;
- dono;
- prazo;
- prioridade;
- status;
- KPI esperado;
- impacto real.

## 8. Confiabilidade, Auditoria e Rastreabilidade

Os resultados da pesquisa precisam ser confiáveis porque serão usados para orientar investimento, operação, comunicação e posicionamento local. Por isso, o módulo deve avançar para um padrão de **alta rastreabilidade**.

### Recomendações centrais

- manter trilha formal de auditoria;
- registrar quem auditou, quando e por quê;
- registrar flags de risco;
- distinguir resposta aceita, recusada, pendente e aceita com ressalva;
- permitir revisão posterior sem apagar o histórico;
- manter evidência mínima da coleta;
- preservar logs da IA e separá-los dos indicadores oficiais.

### Sinais práticos de confiança

- GPS quando aplicável;
- identificação do entrevistador;
- numeração sequencial da coleta;
- volume por entrevistador;
- padrão anômalo de tempo ou repetição;
- consistência entre cidade, pesquisador e campanha;
- justificativa obrigatória em rejeições e ressalvas.

## 9. Papel da IA no Oquei Insights

A IA deve operar como **copiloto analítico**, e não como motor decisório autônomo.

### O que a IA deve fazer

- sintetizar padrões;
- sugerir hipóteses;
- agrupar objeções;
- indicar oportunidades de comunicação;
- sugerir leituras culturais;
- apoiar priorização de ações;
- produzir rascunhos de análise executiva;
- ajudar analistas a reconfigurar cortes e interpretações.

### O que a IA não deve fazer

- alterar status oficial de auditoria;
- substituir decisão humana em indicadores estratégicos;
- reclassificar dados oficiais sem revisão;
- virar fonte única de verdade para priorização executiva.

### Requisito de governança

Toda análise relevante gerada por IA deve ser:

- explicável;
- revisável;
- rastreável;
- separada dos dados oficiais;
- contextualizada com o recorte usado.

## 10. Diretrizes para o Dashboard

O dashboard do Oquei Insights deve ser:

- claro;
- profissional;
- moderno;
- dinâmico;
- configurável para diferentes analistas;
- consistente para leitura da diretoria.

### Princípios de desenho

- leitura rápida de KPIs estratégicos;
- filtros por cidade, período, campanha e tema;
- visão global e visão local bem separadas;
- comparação entre cidades e campanhas;
- destaque para objeções, oportunidades e risco competitivo;
- visual limpo, sem excesso de ruído;
- uso de IA como camada opcional de apoio;
- linguagem executiva nas sínteses;
- profundidade exploratória para analistas.

### Leituras prioritárias

- penetração e potencial;
- evolução da base;
- awareness;
- market share percebido na amostra;
- objeções à contratação;
- gatilhos de troca;
- canais de comunicação mais influentes;
- oportunidades de ativação local;
- oportunidades de parceria e patrocínio;
- insights culturais relevantes ao crescimento.

## 11. Roadmap Recomendado

### 0 a 30 dias

- formalizar o posicionamento do Oquei Insights como produto de inteligência de mercado;
- definir temas estratégicos oficiais;
- criar estrutura do banco de perguntas;
- separar perguntas núcleo de perguntas específicas;
- ampliar o modelo conceitual de campanha;
- fortalecer trilha de auditoria;
- definir papel formal da IA;
- consolidar o conceito funcional do plano de ação.

### 31 a 90 dias

- implantar banco de perguntas por tema;
- adaptar campanhas para usar núcleo + módulos;
- fortalecer evidências de confiabilidade da coleta;
- expandir auditoria com motivos, responsável e flags;
- estruturar dashboard corporativo comparável;
- conectar achados a plano de ação por cidade, campanha e tema;
- padronizar relatórios executivos por campanha e cidade.

### Visão anual

- consolidar benchmark corporativo entre cidades;
- amadurecer trilha histórica de campanhas e temas;
- usar IA para sugerir narrativas, clusters e oportunidades com maior precisão;
- medir impacto das ações originadas do Insights;
- transformar o módulo em sistema oficial de inteligência comercial territorial da Oquei.

## 12. Indicadores de Sucesso

O sucesso do Oquei Insights não deve ser medido só por número de respostas. Recomenda-se acompanhar:

- percentual de campanhas com objetivo e hipótese formalizados;
- percentual de respostas auditadas;
- tempo médio entre coleta e validação;
- percentual de campanhas comparáveis globalmente;
- taxa de geração de insights acionáveis;
- percentual de insights convertidos em ações;
- percentual de ações concluídas;
- impacto das ações em vendas, base, awareness ou conversão local;
- tempo de geração de leitura executiva por cidade;
- confiança da diretoria no material gerado pelo módulo.

## 13. Riscos e Cuidados

- excesso de flexibilidade sem governança reduz comparabilidade;
- padronização excessiva reduz sensibilidade local;
- IA sem log e sem explicação reduz confiança;
- auditoria fraca compromete a validade do material;
- plano de ação sem vínculo com cidade, campanha e tema vira backlog genérico;
- dashboards bonitos sem método não geram decisão melhor.

O equilíbrio recomendado é:

- comparabilidade global via núcleo fixo;
- adaptação local via módulos;
- IA como apoio;
- validação humana como decisão final;
- plano de ação com vínculo mínimo estruturado.

## 14. Diretriz de Implementação do Projeto

Para preservar legibilidade e manutenção do código, a evolução do Oquei Insights deve seguir uma regra arquitetural explícita:

- novos arquivos e arquivos alterados devem buscar **média de 700 linhas ou menos**;
- arquivos acima desse tamanho só devem existir quando a divisão for tecnicamente inviável ou prejudicar a coesão;
- sempre que uma página crescer demais, a prioridade deve ser extrair partes para componentes, hooks, serviços, utilitários e blocos analíticos reutilizáveis;
- o crescimento do módulo não deve ocorrer por acúmulo de páginas monolíticas.

Essa diretriz é especialmente importante porque o módulo já possui páginas ricas em comportamento e análise. Sem modularização, a próxima fase do produto tende a degradar rapidamente a manutenibilidade.

## 15. Conclusão

O Oquei Insights tem potencial para se tornar um dos ativos estratégicos mais valiosos da operação da Oquei, desde que seja tratado como plataforma de inteligência de mercado e não apenas como ferramenta de pesquisa.

O projeto atual já oferece base suficiente para essa evolução. O momento agora é de consolidação metodológica: organizar temas, padronizar perguntas, elevar a confiança da coleta, estruturar a governança analítica, formalizar a função da IA e transformar achados em plano de ação com acompanhamento real.

Se essa evolução for conduzida com disciplina, o Oquei Insights poderá servir não apenas para entender mercados, mas para orientar crescimento, alocação de esforço comercial, presença local e tomada de decisão da diretoria com muito mais precisão.
