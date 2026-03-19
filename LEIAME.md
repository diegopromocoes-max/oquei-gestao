# Oquei Gestão

## Visão Geral e Propósito

O Oquei Gestão é uma aplicação web moderna e robusta, desenvolvida para otimizar processos de gestão, análise de dados e impulsionar o crescimento estratégico. Projetado para oferecer uma visão unificada e insights acionáveis, o sistema visa resolver desafios complexos em áreas como vendas, operações, e relacionamento com clientes, proporcionando ferramentas eficientes para tomada de decisão informada.

## Objetivos Principais

*   Centralizar e organizar dados de gestão e performance.
*   Fornecer dashboards interativos e relatórios detalhados para acompanhamento de métricas chave.
*   Facilitar a análise de tendências, identificação de oportunidades e mitigação de riscos (ex: churn).
*   Otimizar fluxos de trabalho para equipes de vendas, crescimento e liderança.
*   Servir como uma plataforma escalável e de fácil manutenção.

## Tecnologias e Escolhas de Arquitetura

Este projeto foi desenvolvido com foco em performance, escalabilidade e manutenibilidade, utilizando um stack moderno:

*   **Frontend Framework:** **React (v19.2.0)**
    *   Utilizado pela sua robustez, ecossistema vasto e modelo declarativo. A versão recente garante acesso às últimas features e otimizações.
*   **Build Tool & Dev Server:** **Vite (v7.3.1)**
    *   Escolha estratégica para proporcionar um ambiente de desenvolvimento extremamente rápido, com Hot Module Replacement (HMR) eficiente, e um build otimizado para produção.
*   **Styling:** **Tailwind CSS (v4.2.1)**
    *   Um framework CSS utility-first que permite estilização rápida e consistente diretamente no HTML/JSX. `autoprefixer` e `tailwindcss-animate` complementam a experiência.
*   **Component Library:** **Radix UI & Tremor**
    *   **Radix UI:** Fornece componentes acessíveis e altamente customizáveis, servindo como base para a UI.
    *   **Tremor:** Otimizado para dashboards e análise de dados, simplificando a criação de visualizações complexas.
*   **Routing:** **React Router DOM (v7.13.1)**
    *   Gerencia a navegação entre as diferentes seções da aplicação de forma declarativa.
*   **State Management:** **Context API & Zustand**
    *   Utilizamos a Context API do React para estados globais simples e [Zustand/Jotai/etc. - AJUSTAR SE NECESSÁRIO] para gerenciamento de estado mais complexo, garantindo performance e organização.
*   **Backend as a Service:** **Firebase**
    *   Plataforma completa que oferece **Firestore** (banco de dados NoSQL escalável), **Authentication**, e **Hosting**, permitindo um desenvolvimento mais ágil do backend.
*   **Testing:** **Vitest & @testing-library/react**
    *   Vitest para um runner de testes rápido e compatível com o ecossistema Vite. Testing Library para testes de componentes focados na experiência do usuário.

## Estrutura do Projeto

A aplicação é organizada em módulos, facilitando a manutenção e a escalabilidade:

*   `src/pages`: Contém as diferentes páginas e views da aplicação.
*   `src/components`: Componentes reutilizáveis da interface do usuário.
*   `src/services`: Lógica de negócio e interações com APIs/Firebase.
*   `src/hooks`: Hooks customizados para reutilização de lógica.
*   `src/OqueiInsights`: Módulo dedicado a análises e relatórios de insights.
*   `src/HubCrescimento`: Módulo focado em estratégias e acompanhamento de crescimento.
*   `src/styles`: Arquivos de estilização global e temas.

## Funcionalidades Chave

*   **Dashboard e Visualização de Dados:** Apresenta métricas importantes através de gráficos e componentes interativos (Tremor, Recharts).
*   **Gestão Operacional:** Ferramentas para gerenciar colaboradores, estruturas, metas, produtos, etc.
*   **Análise de Churn:** Funcionalidades específicas para entender e mitigar a perda de clientes.
*   **CRM e Vendas:** Módulos para gerenciamento de leads, acompanhamento de vendas e performance comercial.
*   **Relatórios e Insights:** Ferramentas para gerar e visualizar relatórios detalhados.

## Configuração do Ambiente de Desenvolvimento

### Pré-requisitos

*   Node.js (versão recomendada: LTS)
*   npm ou Yarn
*   Conta no Firebase e um projeto configurado

### Instalação

1.  Clone o repositório:
    ```bash
    git clone <URL_DO_SEU_REPOSITORIO>
    cd oquei-gestao
    ```

2.  Instale as dependências:
    ```bash
    npm install
    # ou
    yarn install
    ```

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis (consulte a documentação do Firebase para obter os valores corretos):

```env
# Arquivo .env.example (adicione suas variáveis aqui)

# Firebase Configuration
VITE_FIREBASE_API_KEY=SUA_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=SEU_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=SEU_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=SEU_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID=SEU_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID=SEU_APP_ID
VITE_FIREBASE_MEASUREMENT_ID=SEU_MEASUREMENT_ID
```

### Execução

*   **Servidor de Desenvolvimento:**
    ```bash
    npm run dev
    # ou
    yarn dev
    ```
    O aplicativo estará acessível em `http://localhost:5173` (ou a porta indicada pelo Vite).

*   **Build para Produção:**
    Gera os assets otimizados para deploy.
    ```bash
    npm run build
    # ou
    yarn build
    ```

## Testes

Para garantir a qualidade e a estabilidade do código, os testes podem ser executados da seguinte forma:

*   **Executar todos os testes:**
    ```bash
    npm run test
    # ou
    yarn test
    ```

*   **Executar testes em modo de watch:**
    ```bash
    npm run test:run
    # ou
    yarn test:run
    ```

## Contribuição

Agradecemos o interesse em contribuir para o Oquei Gestão! Por favor, siga estas diretrizes:

1.  Faça um fork do projeto.
2.  Crie uma nova branch para suas alterações (`git checkout -b feature/sua-feature`).
3.  Faça seus commits (`git commit -m \'Adiciona nova feature\'`).
4.  Envie para a branch `main` (`git push origin sua-feature`).
5.  Abra um Pull Request.

**Code Style:** O projeto utiliza ESLint e Prettier para garantir um código limpo e consistente. Por favor, execute o linter antes de submeter suas alterações.

## Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE.md](LICENSE.md) para detalhes (se houver um arquivo LICENSE.md).