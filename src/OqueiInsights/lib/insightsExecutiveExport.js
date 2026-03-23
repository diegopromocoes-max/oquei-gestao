function slugify(value) {
  return String(value || 'oquei-insights')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function formatDateTime(value = new Date()) {
  return value.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDueDate(value) {
  if (!value) return '';
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('pt-BR');
}

function renderRanking(title, rows, formatter, emptyLabel) {
  const list = rows?.slice(0, 5) || [];
  if (!list.length) {
    return `## ${title}\n- ${emptyLabel}\n`;
  }

  return [
    `## ${title}`,
    ...list.map((row, index) => `${index + 1}. ${formatter(row)}`),
    '',
  ].join('\n');
}

function renderPlanSummary(plans) {
  const list = plans?.slice(0, 8) || [];
  if (!list.length) {
    return '## Planos de acao vinculados\n- Nenhum plano vinculado ao recorte atual.\n';
  }

  return [
    '## Planos de acao vinculados',
    ...list.map((plan) => {
      const dueDate = formatDueDate(plan.dueDate);
      const detailParts = [
        plan.cityName,
        plan.themeName,
        plan.status,
        plan.priority ? `prioridade ${plan.priority}` : '',
        dueDate ? `prazo ${dueDate}` : '',
      ].filter(Boolean);
      return `- ${plan.title}${detailParts.length ? ` | ${detailParts.join(' | ')}` : ''}`;
    }),
    '',
  ].join('\n');
}

function renderAiSection(aiReport) {
  if (!aiReport) {
    return '## Leitura assistida por IA\n- Nenhuma leitura estrategica foi gerada no momento da exportacao.\n';
  }

  const lines = [
    '## Leitura assistida por IA',
    `- Gerada em: ${formatDateTime(new Date(aiReport.generatedAt || Date.now()))}`,
    `- Confianca sugerida: ${aiReport.nivelConfianca || 'nao informada'}`,
  ];

  if (aiReport.resumoExecutivo) lines.push(`- Resumo: ${aiReport.resumoExecutivo}`);

  [
    ['Evidencias', aiReport.evidencias],
    ['Objecoes chave', aiReport.objecoesChave],
    ['Oportunidades de venda', aiReport.oportunidadesDeVenda],
    ['Canais prioritarios', aiReport.canaisPrioritarios],
    ['Parcerias e patrocinio', aiReport.parceriasPatrocinios],
    ['Ajustes nos planos', aiReport.ajustesNosPlanos],
    ['Proximos passos', aiReport.proximosPassos],
  ].forEach(([label, items]) => {
    if (!items?.length) return;
    lines.push(`- ${label}:`);
    items.forEach((item) => lines.push(`  - ${item}`));
  });

  lines.push('');
  return lines.join('\n');
}

export function buildInsightsExecutiveReport({
  generatedAt = new Date(),
  filters,
  survey,
  metrics,
  cityRows,
  campaignRows,
  themeRows,
  plans,
  aiReport,
}) {
  return [
    '# Relatorio Executivo - Oquei Insights',
    '',
    `Gerado em ${formatDateTime(generatedAt)}`,
    '',
    '## Recorte analisado',
    `- Pesquisa: ${filters?.surveyLabel || 'Todas as pesquisas'}`,
    `- Cidade: ${filters?.cityLabel || 'Todas as cidades'}`,
    `- Tema: ${filters?.themeLabel || 'Todos os temas'}`,
    `- Versao: ${filters?.versionLabel || 'Todas as versoes'}`,
    `- Periodo: ${filters?.periodLabel || 'Todo historico'}`,
    survey?.objective ? `- Objetivo estrategico: ${survey.objective}` : null,
    (survey?.triggerLabel || survey?.trigger) ? `- Gatilho: ${survey.triggerLabel || survey.trigger}` : null,
    '',
    '## KPIs do recorte',
    `- Respostas auditadas: ${metrics?.totalResponses || 0}`,
    `- Cobertura de GPS: ${metrics?.gpsCoverage || 0}%`,
    `- Campanhas com campo: ${metrics?.campaigns || 0}`,
    `- Cidades com campo: ${metrics?.cities || 0}`,
    `- Temas acionados: ${metrics?.themes || 0}`,
    `- Planos vinculados: ${metrics?.plans || 0}`,
    `- Planos ativos: ${metrics?.activePlans || 0}`,
    `- Planos concluidos: ${metrics?.completedPlans || 0}`,
    `- Taxa de execucao: ${metrics?.completionRate || 0}%`,
    '',
    renderRanking(
      'Cidades em foco',
      cityRows,
      (row) => `${row.label} | ${row.responses} respostas | ${row.campaigns} campanhas | ${row.themes} temas | ${row.plans} planos | GPS ${row.gpsCoverage}%`,
      'Nenhuma cidade encontrada.',
    ),
    renderRanking(
      'Campanhas comparadas',
      campaignRows,
      (row) => `${row.label} | ${row.responses} respostas | ${row.cities} cidades | ${row.themes} temas | ${row.versions} versoes | ${row.plans} planos`,
      'Nenhuma campanha encontrada.',
    ),
    renderRanking(
      'Temas em evidencia',
      themeRows,
      (row) => `${row.label} | ${row.responses} respostas | ${row.campaigns} campanhas | ${row.cities} cidades | ${row.plans} planos | ${row.completedPlans} concluidos`,
      'Nenhum tema encontrado.',
    ),
    renderPlanSummary(plans),
    renderAiSection(aiReport),
    '## Observacao',
    '- A leitura de IA e consultiva. O analista deve revisar o contexto antes de transformar a sugestao em decisao oficial.',
    '',
  ].filter(Boolean).join('\n');
}

export function downloadInsightsExecutiveReport(content, filters = {}) {
  const parts = [
    'oquei-insights',
    filters?.surveyLabel && filters.surveyLabel !== 'Todas as pesquisas' ? filters.surveyLabel : null,
    filters?.cityLabel && filters.cityLabel !== 'Todas as cidades' ? filters.cityLabel : null,
    filters?.periodLabel || 'todo-historico',
  ].filter(Boolean);

  const filename = `${slugify(parts.join('-')) || 'oquei-insights'}.md`;
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
