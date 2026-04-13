import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const docsDir = path.join(rootDir, 'docs');
const outputPath = path.join(docsDir, 'planejamento-geral-atualizado-2026-04.pdf');

const COLORS = {
  ink: [15, 23, 42],
  muted: [71, 85, 105],
  line: [203, 213, 225],
  soft: [241, 245, 249],
  blue: [37, 99, 235],
  blueSoft: [219, 234, 254],
  green: [22, 163, 74],
  amber: [217, 119, 6],
  rose: [225, 29, 72],
};

function walkFiles(dir, predicate = () => true) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath, predicate));
    } else if (predicate(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

function countLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content) return 0;
  return content.split(/\r?\n/).length;
}

function formatRepoPath(filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
}

function computeOversizedFiles(limit = 300, topN = 20) {
  return walkFiles(
    srcDir,
    (filePath) =>
      /\.(js|jsx|ts|tsx)$/.test(filePath)
      && !/\.test\.(js|jsx|ts|tsx)$/.test(filePath)
  )
    .map((filePath) => ({
      path: formatRepoPath(filePath),
      lines: countLines(filePath),
    }))
    .filter((item) => item.lines > limit)
    .sort((left, right) => right.lines - left.lines)
    .slice(0, topN);
}

function computeModuleCounts() {
  const catalogPath = path.join(srcDir, 'lib', 'moduleCatalog.js');
  const source = fs.readFileSync(catalogPath, 'utf8');
  const matches = [...source.matchAll(/buildModule\(PANEL_KEYS\.(\w+),/g)];
  const counts = {
    COORDINATOR: 0,
    SUPERVISOR: 0,
    GROWTH: 0,
    ATTENDANT: 0,
  };

  matches.forEach((match) => {
    const key = match[1];
    counts[key] = (counts[key] || 0) + 1;
  });

  return [
    ['Coordenadora', counts.COORDINATOR],
    ['Supervisor', counts.SUPERVISOR],
    ['Growth', counts.GROWTH],
    ['Atendente', counts.ATTENDANT],
  ];
}

function countServiceFiles() {
  const servicesDir = path.join(srcDir, 'services');
  return fs.readdirSync(servicesDir).filter((file) => /\.(js|jsx|ts|tsx)$/.test(file)).length;
}

function countTests() {
  return walkFiles(
    srcDir,
    (filePath) => /\.test\.(js|jsx|ts|tsx)$/.test(filePath)
  ).length;
}

function hasGithubWorkflow() {
  const githubDir = path.join(rootDir, '.github');
  if (!fs.existsSync(githubDir)) return false;
  return walkFiles(githubDir, () => true).length > 0;
}

function addPageFrame(pdf) {
  pdf.setDrawColor(...COLORS.line);
  pdf.setLineWidth(0.3);
  pdf.line(14, 20, 196, 20);
  pdf.line(14, 287, 196, 287);
}

function drawCover(pdf) {
  pdf.setFillColor(...COLORS.ink);
  pdf.rect(0, 0, 210, 34, 'F');
  pdf.setFillColor(...COLORS.blue);
  pdf.rect(0, 34, 210, 8, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(28);
  pdf.text('OQUEI GESTAO', 18, 21);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text('Documento Tecnico de Arquitetura, Status e Roadmap do Projeto', 18, 31);

  pdf.setTextColor(...COLORS.ink);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(23);
  pdf.text('Planejamento Geral Atualizado', 18, 72);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(13);
  pdf.text('Versao 3.0', 18, 84);
  pdf.text('Data-base: 12 de abril de 2026', 18, 92);
  pdf.text('Baseline historica: v2.0 - 16 de marco de 2026', 18, 100);

  pdf.setFillColor(...COLORS.soft);
  pdf.roundedRect(18, 118, 174, 55, 4, 4, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text('Resumo executivo', 24, 131);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  const summary = pdf.splitTextToSize(
    'O Oquei Gestao deixou de ser uma base em implantacao inicial e entrou em uma fase de maturidade funcional. O foco do planejamento agora muda de "construir modulos basicos" para "estabilizar, consolidar, reduzir divida tecnica e melhorar observabilidade", preservando a estrutura do documento anterior como referencia de governanca.',
    160
  );
  pdf.text(summary, 24, 141);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Este PDF substitui a v2.0 como referencia oficial de status do projeto.', 18, 204);

  pdf.setTextColor(...COLORS.muted);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.text('Arquivo gerado automaticamente a partir do repositorio local.', 18, 279);
}

function createDocument() {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  let cursorY = 24;

  const oversizedFiles = computeOversizedFiles();
  const moduleCounts = computeModuleCounts();
  const serviceCount = countServiceFiles();
  const testCount = countTests();
  const hasWorkflow = hasGithubWorkflow();

  function newPage() {
    pdf.addPage();
    addPageFrame(pdf);
    cursorY = 28;
  }

  function ensureSpace(space = 20) {
    if (cursorY + space > 274) {
      newPage();
    }
  }

  function sectionTitle(index, title) {
    ensureSpace(18);
    pdf.setFillColor(...COLORS.blueSoft);
    pdf.roundedRect(14, cursorY - 6, 182, 10, 3, 3, 'F');
    pdf.setTextColor(...COLORS.blue);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text(`${index}. ${title}`, 18, cursorY);
    pdf.setTextColor(...COLORS.ink);
    cursorY += 10;
  }

  function paragraph(text, { size = 10.5, color = COLORS.ink, gap = 5.5 } = {}) {
    ensureSpace(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text, 176);
    pdf.text(lines, 18, cursorY);
    cursorY += lines.length * gap;
    pdf.setTextColor(...COLORS.ink);
  }

  function bullets(items) {
    items.forEach((item) => {
      ensureSpace(8);
      pdf.setFillColor(...COLORS.blue);
      pdf.circle(20, cursorY - 1.2, 0.9, 'F');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10.3);
      const lines = pdf.splitTextToSize(item, 170);
      pdf.text(lines, 24, cursorY);
      cursorY += Math.max(5.2, lines.length * 5.1);
    });
  }

  function smallHeading(text) {
    ensureSpace(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(...COLORS.ink);
    pdf.text(text, 18, cursorY);
    cursorY += 6;
  }

  function table(head, body, options = {}) {
    ensureSpace(20);
    autoTable(pdf, {
      startY: cursorY,
      head: [head],
      body,
      theme: 'grid',
      margin: { left: 18, right: 18 },
      headStyles: {
        fillColor: COLORS.blue,
        textColor: [255, 255, 255],
        fontSize: 9.5,
      },
      styles: {
        fontSize: 9.2,
        cellPadding: 2.8,
        textColor: COLORS.ink,
        lineColor: COLORS.line,
        lineWidth: 0.15,
      },
      alternateRowStyles: {
        fillColor: COLORS.soft,
      },
      ...options,
    });
    cursorY = pdf.lastAutoTable.finalY + 7;
  }

  drawCover(pdf);
  newPage();

  sectionTitle(1, 'Visao Geral do Projeto');
  paragraph('O PDF v2.0, datado de 16 de marco de 2026, passou a funcionar como baseline historica. O estado atual da base demonstra um produto muito mais maduro, com paineis distintos por perfil, camada de servicos consolidada e escopo comercial-operacional muito acima do planejado originalmente.');
  bullets([
    'A aplicacao hoje opera com paineis para coordenadora, supervisor, growth e atendente, cada um com navegacao, escopo e dashboards proprios.',
    'Modulos antes considerados pendentes no planejamento anterior ja estao implementados, incluindo Faltas, RH, Hub Oquei, Japa, Banco de Horas e dashboards executivos.',
    'O CRM do atendente se tornou uma frente completa, com cadastro, edicao, mapa de leads, metas individuais, graficos e integracao com a consolidacao comercial.',
    'O unico modulo explicitamente presente no catalogo e ainda nao entregue como produto funcional final e Conteudos Digitais.',
  ]);
  table(
    ['Frente', 'Status atual', 'Evidencia no repositorio'],
    [
      ['Base da aplicacao', 'Concluido / maduro', 'multiplos paines, layout global, services, functions'],
      ['CRM Atendente', 'Concluido', 'CRMAtendente, NovoLead, MeusLeads, MeuMapaLeads'],
      ['Dashboards executivos', 'Concluido', 'DashboardSupervisor e DashboardCoordenador'],
      ['Gestao de Metas', 'Concluido e ampliado', 'metas por cidade, cluster e atendente'],
      ['Marketing / Growth', 'Parcialmente consolidado', 'Japa, patrocinio, agenda, growth'],
      ['Conteudos Digitais', 'Pendente', 'placeholder ativo no menu'],
    ]
  );

  sectionTitle(2, 'Stack Tecnologica');
  table(
    ['Camada', 'Tecnologias principais', 'Leitura atual'],
    [
      ['Frontend', 'React 19, Vite 7, Router 7, Recharts, Radix UI', 'Atual e operacional'],
      ['Dados e auth', 'Firebase Auth, Firestore', 'Base principal do produto'],
      ['Backend', 'Firebase Functions', 'Suporta enriquecimento e automacoes'],
      ['Qualidade', `Vitest (${testCount} testes locais)`, 'Base inicial existente, ainda expandivel'],
      ['PDF e artefatos', 'jsPDF, jsPDF AutoTable', 'Suporte real no repositorio'],
      ['CI/CD', hasWorkflow ? 'Workflow encontrado' : 'Sem workflow proprio em .github', hasWorkflow ? 'Parcial' : 'Pendente'],
    ]
  );
  paragraph('A stack segue coerente com a versao anterior, mas a maturidade operacional da base aumentou mais no codigo do que na camada de observabilidade e entrega continua.');

  sectionTitle(3, 'Design System e UI');
  paragraph('A plataforma passou por padronizacao visual importante, especialmente com o shell compartilhado do Hub Oquei e o alinhamento entre paineis. A coordenadora deixou de ser um caso isolado e passou a servir como linguagem visual de referencia para os demais perfis.');
  bullets([
    'LayoutGlobal concentra identidade, navegacao lateral, header e widgets transversais.',
    'Dashboards foram redesenhados para leitura executiva por perfil, com cards, velocimetros e secoes operacionais.',
    'Ainda existe oportunidade clara de reduzir variacao de layout em modulos mais antigos e telas muito extensas.',
  ]);

  sectionTitle(4, 'Arquitetura de Pastas');
  table(
    ['Area', 'Papel atual', 'Observacao'],
    [
      ['src/pages', 'Paineis e modulos operacionais', 'Maior concentracao de telas e divida tecnica'],
      ['src/components', 'Layout, UI compartilhada e widgets', 'Mais forte do que na v2.0'],
      ['src/services', `Regra de negocio compartilhada (${serviceCount} arquivos)`, 'Camada muito mais relevante hoje'],
      ['src/lib', 'Utilitarios de dominio e suporte', 'calendario, acesso, geo, operacao'],
      ['src/OqueiInsights', 'Modulo de pesquisas e auditoria', 'subdominio especializado'],
      ['functions', 'Automacoes e logica backend', 'parte essencial da operacao'],
      ['docs', 'Documentacao tecnica', 'agora passa a receber este planejamento mestre'],
    ]
  );
  paragraph('Ha drift arquitetural em relacao ao PDF v2.0. A documentacao anterior mencionava estruturas e convencoes que hoje ja nao representam com precisao a base real, especialmente em growth, banco de horas, patrocinio e servicos comerciais.');

  sectionTitle(5, 'Modulos de Navegacao');
  paragraph('O catalogo central de modulos por painel virou a fonte real de autorizacao e composicao de menu. A distribuicao atual confirma que a aplicacao deixou de ser um painel unico e passou a operar como uma plataforma multi-perfil.');
  table(
    ['Painel', 'Quantidade de modulos mapeados', 'Leitura executiva'],
    moduleCounts.map(([panel, count]) => [panel, String(count), panel === 'Atendente' ? 'ecossistema comercial proprio' : panel === 'Growth' ? 'foco em growth, agenda e campanhas' : panel === 'Supervisor' ? 'operacao regional por cluster' : 'escopo global executivo'])
  );
  bullets([
    'Supervisor e coordenadora compartilham modulos de gestao, mas o supervisor respeita escopo regional por cluster.',
    'Atendente ganhou catalogo proprio com CRM, graficos, mapa, RH, roteadores e devolucoes.',
    'Conteudos Digitais segue como placeholder e precisa permanecer marcado como pendencia real no roadmap.',
  ]);

  sectionTitle(6, 'Frentes Estrategicas Consolidadas Desde a v2.0');
  table(
    ['Frente', 'Status', 'Resumo'],
    [
      ['CRM Atendente', 'Concluido', 'cadastro, edicao, funil, mapa, resumo e graficos'],
      ['Painel Vendas por escopo', 'Concluido', 'atendente pessoal, supervisor cluster, coordenadora global'],
      ['Metas individuais', 'Concluido', 'monthly_attendant_goals e reflexo em dashboards'],
      ['Mapa de leads', 'Concluido', 'geolocalizacao operacional em telas do atendente'],
      ['Dashboard da coordenadora', 'Concluido', 'topo executivo, faltas, pessoas, agenda e marketing'],
      ['Marketing / patrocinio / Japa', 'Parcialmente consolidado', 'funcionais, com oportunidade de acabamento'],
    ]
  );
  paragraph('A principal mudanca estrategica em relacao ao plano anterior foi a passagem de um foco em "entregar modulos" para um foco em "conectar regras de negocio entre modulos", especialmente em vendas, metas e dashboards.');

  sectionTitle(7, 'Modelo de Dados - Firestore');
  paragraph('A modelagem atual esta mais rica do que o PDF anterior descrevia. Hoje a base opera com documentos e colecoes voltados a usuarios, geografia, leads, agenda, ausencia, RH, marketing e metas consolidadas por diferentes escopos.');
  table(
    ['Dominio', 'Colecoes / modelos ativos', 'Leitura'],
    [
      ['Identidade e estrutura', 'users, cities, clusters', 'base de permissao e escopo'],
      ['Comercial', 'leads', 'origem da operacao do CRM'],
      ['Agenda e operacao', 'events, absences, absence_requests', 'coordena agenda e faltas'],
      ['RH', 'rh_requests', 'solicitacoes operacionais'],
      ['Marketing', 'sponsorships, marketing_actions', 'parcerias, patrocinio e Japa'],
      ['Metas', 'goals_cities, monthly_goals, monthly_cluster_goals, monthly_attendant_goals', 'modelo mais avancado que na v2.0'],
    ]
  );

  sectionTitle(8, 'Camada de Servicos');
  paragraph('A camada de services deixou de ser acessoria e passou a ser o eixo de consolidacao da regra de negocio. Esse e um dos maiores avancos estruturais desde marco de 2026.');
  table(
    ['Servico / area', 'Responsabilidade', 'Impacto'],
    [
      ['monthlySalesService.js', 'consolidacao comercial por escopo', 'alinha Painel Vendas e dashboards'],
      ['coordinatorDashboardService.js', 'resumo executivo da coordenadora', 'evita consultas soltas na pagina'],
      ['metas.js', 'metas por cidade, cluster e atendente', 'suporta distribuicao e leitura comercial'],
      ['services de leads', 'cadastro, edicao e catalogos', 'sustentam o CRM do atendente'],
      ['services de ausencias / RH', 'faltas, solicitacoes e cobertura', 'base da operacao de pessoas'],
    ]
  );

  sectionTitle(9, 'Status do Roadmap Atual');
  paragraph('O roadmap recomendado para abril de 2026 nao deve mais ser lido como sequencia de sprints tecnicos isolados. O projeto entrou em uma fase em que o agrupamento por ondas de maturidade faz mais sentido para governanca e priorizacao.');
  table(
    ['Onda', 'Status', 'Objetivo principal'],
    [
      ['Onda 1 - Fechamento funcional', 'Majoritariamente concluida', 'consolidar entregas ja materializadas desde marco'],
      ['Onda 2 - Estabilizacao operacional', 'Em andamento', 'consistencia entre escopos, dados e operacao'],
      ['Onda 3 - Reducao de divida tecnica', 'Pendente / prioritaria', 'quebrar arquivos grandes e reduzir acoplamento'],
      ['Onda 4 - Qualidade e observabilidade', 'Pendente', 'CI/CD, testes, monitoramento e seguranca operacional'],
    ]
  );
  bullets([
    'Conteudos Digitais deve ser mantido explicitamente no backlog real.',
    'Integracoes externas amplas e observabilidade ainda precisam sair do nivel conceitual para o operacional.',
    'A prioridade de engenharia passa a ser sustentacao de longo prazo, nao apenas expansao funcional.',
  ]);

  sectionTitle(10, 'Arquivos Acima do Limite Tecnico');
  paragraph('O maior vetor de risco estrutural atual e a concentracao de logica em arquivos extensos. Isso afeta diretamente legibilidade, velocidade de onboarding, seguranca de manutencao e previsibilidade de evolucao.');
  table(
    ['Arquivo', 'Linhas'],
    oversizedFiles.map((item) => [item.path, String(item.lines)]),
    {
      styles: {
        fontSize: 8.5,
        cellPadding: 2.4,
        textColor: COLORS.ink,
        lineColor: COLORS.line,
        lineWidth: 0.15,
      },
      columnStyles: {
        0: { cellWidth: 148 },
        1: { cellWidth: 12, halign: 'right' },
      },
    }
  );

  sectionTitle(11, 'Bugs e Dividas Tecnicas');
  table(
    ['Item', 'Leitura atual', 'Prioridade'],
    [
      ['Conteudos Digitais', 'placeholder no menu, sem produto final', 'Alta'],
      ['Arquivos extensos', 'afetando modulos centrais e alto churn', 'Alta'],
      ['Observabilidade', 'sem evidencia de Sentry / Performance ativos', 'Alta'],
      ['CI/CD proprio', 'repositorio sem workflow dedicado', 'Media / Alta'],
      ['Drift de documentacao', 'PDF v2.0 defasado diante da base atual', 'Alta'],
    ]
  );
  paragraph('O risco dominante do projeto ja nao e falta de modulo. E consistencia operacional, manutencao segura e capacidade de evoluir sem aumentar o custo de cada nova entrega.');

  sectionTitle(12, 'Perfis e Rotas');
  table(
    ['Perfil', 'Escopo', 'Regra-chave'],
    [
      ['Coordenadora', 'global', 'consolida vendas, pessoas, agenda e marketing'],
      ['Supervisor', 'cluster', 've apenas cidades e operacao da propria regional'],
      ['Growth', 'growth / marketing', 'atua em campanhas, patrocinio e agenda'],
      ['Atendente', 'pessoal', 've apenas CRM, vendas proprias e metas individuais'],
    ]
  );

  sectionTitle(13, 'Diretrizes de Codigo e Manutencao');
  bullets([
    'Extrair regra de negocio das paginas para src/services e utilitarios de dominio.',
    'Priorizar refatoracao de arquivos acima de 300 linhas, especialmente em modulos com alto churn.',
    'Preservar a coerencia de escopo por papel em toda leitura comercial e operacional.',
    'Reduzir duplicacao entre dashboards executivos e telas analiticas profundas.',
    'Atualizar a documentacao tecnica sempre que houver alteracao de arquitetura, modelagem ou escopo funcional.',
  ]);

  sectionTitle(14, 'Changelog Resumido');
  table(
    ['Marco', 'Registro'],
    [
      ['16/03/2026', 'emissao do documento tecnico v2.0 como baseline historica'],
      ['Marco a abril/2026', 'evolucao acelerada de CRM, metas, dashboards, mapa, marketing e consolidacao comercial'],
      ['12/04/2026', 'publicacao da nova referencia oficial de planejamento geral v3.0'],
    ]
  );
  paragraph('Conclusao executiva: o Oquei Gestao entrou em um novo estagio. O backlog real agora se concentra em estabilizacao, qualidade, observabilidade, reducao de divida tecnica e conclusao de pendencias verdadeiras, em vez de seguir registrando como "pendente" uma serie de entregas que ja existem no codigo.');

  return pdf;
}

function writePdf() {
  fs.mkdirSync(docsDir, { recursive: true });
  const pdf = createDocument();
  const pdfBytes = pdf.output('arraybuffer');
  fs.writeFileSync(outputPath, Buffer.from(pdfBytes));
  console.log(`PDF gerado em: ${outputPath}`);
}

writePdf();
