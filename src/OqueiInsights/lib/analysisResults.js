import {
  buildVersionCounts,
  filterInsightActionPlans,
  filterInsightResponses,
  getSelectedThemeLabel,
  getSurveyThemeLabels,
  getVersionOptions,
} from './strategicInsights';

export const QUESTION_LABELS = {
  PROVEDOR: 'Qual empresa fornece sua internet atualmente?',
  NPS: 'De 0 a 10, o quanto você recomendaria sua operadora atual para um vizinho?',
  VELOCIDADE: 'Você sente que a velocidade que você paga é a que realmente chega na sua casa?',
  PROBLEMAS: 'Quais os principais problemas que acontecem com a sua intenet atual?',
  MELHOR: 'Na sua opinião, qual é o melhor provedor que atende Mirassolândia hoje?',
  HOME_OFFICE: 'Alguém na residência utiliza a internet para trabalhar ou estudar (Home Office)?',
  USUARIOS: 'Quantas pessoas utilizam a internet simultaneamente na sua casa?',
  PRIORIDADE: 'O que mais pesa para você na hora de escolher ou manter sua internet?',
  CONHECE_OQUEI: 'Você já conhecia a Oquei Telecom antes desta entrevista?',
  MOTIVO_NAO: 'Qual o principal motivo para você ainda não ser cliente Oquei?',
  GATILHO: 'O que te faria trocar de operadora de internet hoje?',
};

export const OQUEI = 'Oquei Telecom';
const CONCORRENTES_ORDEM = ['N4 telecom', 'Claro', 'Vivo', 'LazerNet', 'Starlink'];

export const CROSS_OPERATORS = {
  select: [
    { value: 'eq', label: 'É igual a' },
    { value: 'neq', label: 'Não é igual a' },
    { value: 'in', label: 'Está em' },
    { value: 'not_in', label: 'Não está em' },
    { value: 'is_empty', label: 'Não respondeu' },
    { value: 'is_not_empty', label: 'Respondeu' },
  ],
  boolean: [
    { value: 'eq', label: 'É igual a' },
    { value: 'neq', label: 'Não é igual a' },
    { value: 'is_empty', label: 'Não respondeu' },
    { value: 'is_not_empty', label: 'Respondeu' },
  ],
  multiselect: [
    { value: 'contains', label: 'Contém alternativa' },
    { value: 'not_contains', label: 'Não contém alternativa' },
    { value: 'contains_any', label: 'Contém qualquer uma' },
    { value: 'contains_all', label: 'Contém todas' },
    { value: 'contains_none', label: 'Não contém nenhuma' },
    { value: 'is_empty', label: 'Não respondeu' },
    { value: 'is_not_empty', label: 'Respondeu' },
  ],
  nps: [
    { value: 'eq', label: 'Igual a' },
    { value: 'neq', label: 'Diferente de' },
    { value: 'gt', label: 'Maior que' },
    { value: 'gte', label: 'Maior ou igual' },
    { value: 'lt', label: 'Menor que' },
    { value: 'lte', label: 'Menor ou igual' },
    { value: 'between', label: 'Entre' },
    { value: 'not_between', label: 'Fora da faixa' },
    { value: 'is_empty', label: 'Não respondeu' },
    { value: 'is_not_empty', label: 'Respondeu' },
  ],
  text: [
    { value: 'contains_text', label: 'Contém texto' },
    { value: 'not_contains_text', label: 'Não contém texto' },
    { value: 'eq', label: 'Igual a' },
    { value: 'neq', label: 'Diferente de' },
    { value: 'is_empty', label: 'Não respondeu' },
    { value: 'is_not_empty', label: 'Respondeu' },
  ],
};

const RANGE_OPERATORS = new Set(['between', 'not_between']);
const MULTI_VALUE_OPERATORS = new Set(['in', 'not_in', 'contains_any', 'contains_all', 'contains_none']);
const PASSIVE_OPERATORS = new Set(['is_empty', 'is_not_empty']);
const NUMERIC_OPERATORS = new Set(['eq', 'neq', 'gt', 'gte', 'lt', 'lte']);

export const pct = (n, t) => (t > 0 ? Math.round((n / t) * 100) : 0);
export const avg = (arr) => (arr.length ? (arr.reduce((acc, value) => acc + value, 0) / arr.length) : 0);

export function getQId(questions, label) {
  return questions.find((question) => question.label?.trim() === label?.trim())?.id;
}

export function getAns(response, qId) {
  return qId ? response.answers?.[qId] : undefined;
}

export function normalizeAnswer(value, type) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  if (type === 'multiselect') return [];
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export function createCrossCondition(questions = []) {
  const firstQuestion = questions[0];
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    questionId: firstQuestion?.id || '',
    operator: firstQuestion ? (CROSS_OPERATORS[firstQuestion.type]?.[0]?.value || 'eq') : 'eq',
    value: '',
    values: [],
    min: '',
    max: '',
    connector: 'and',
  };
}

function hasTextValue(value) {
  return String(value ?? '').trim().length > 0;
}

function hasNumericValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return !Number.isNaN(Number(value));
}

export function isCrossConditionReady(condition, question) {
  if (!condition?.questionId || !condition?.operator || !question) return false;

  const { operator } = condition;
  if (PASSIVE_OPERATORS.has(operator)) return true;
  if (RANGE_OPERATORS.has(operator)) return hasNumericValue(condition.min) && hasNumericValue(condition.max);
  if (MULTI_VALUE_OPERATORS.has(operator)) {
    return Array.isArray(condition.values) && condition.values.map((value) => String(value || '').trim()).filter(Boolean).length > 0;
  }
  if (question.type === 'nps' && NUMERIC_OPERATORS.has(operator)) {
    return hasNumericValue(condition.value);
  }
  return hasTextValue(condition.value);
}

export function getActiveCrossConditions(crossConditions = [], questionsMap = {}) {
  return crossConditions.filter((condition) => isCrossConditionReady(condition, questionsMap[condition.questionId]));
}

export function evaluateCrossCondition(answerRaw, condition, question) {
  const type = question?.type || 'text';
  const answer = normalizeAnswer(answerRaw, type);
  const operator = condition?.operator;
  const values = Array.isArray(condition?.values) ? condition.values.map((value) => String(value || '').trim()).filter(Boolean) : [];
  const value = String(condition?.value || '').trim();
  const min = Number(condition?.min);
  const max = Number(condition?.max);
  const isEmpty = Array.isArray(answer) ? answer.length === 0 : !answer;

  if (operator === 'is_empty') return isEmpty;
  if (operator === 'is_not_empty') return !isEmpty;

  if (type === 'nps') {
    const number = Number(answerRaw);
    if (Number.isNaN(number)) return false;
    if (operator === 'eq') return number === Number(value);
    if (operator === 'neq') return number !== Number(value);
    if (operator === 'gt') return number > Number(value);
    if (operator === 'gte') return number >= Number(value);
    if (operator === 'lt') return number < Number(value);
    if (operator === 'lte') return number <= Number(value);
    if (operator === 'between') return !Number.isNaN(min) && !Number.isNaN(max) && number >= min && number <= max;
    if (operator === 'not_between') return !Number.isNaN(min) && !Number.isNaN(max) && (number < min || number > max);
    return false;
  }

  if (type === 'multiselect') {
    const items = Array.isArray(answer) ? answer : [];
    if (operator === 'contains') return value ? items.includes(value) : false;
    if (operator === 'not_contains') return value ? !items.includes(value) : false;
    if (operator === 'contains_any') return values.length > 0 ? values.some((item) => items.includes(item)) : false;
    if (operator === 'contains_all') return values.length > 0 ? values.every((item) => items.includes(item)) : false;
    if (operator === 'contains_none') return values.length > 0 ? values.every((item) => !items.includes(item)) : false;
    return false;
  }

  const textAnswer = Array.isArray(answer) ? answer.join(' | ') : String(answer || '');
  const normalizedAnswer = textAnswer.toLowerCase();
  const normalizedValue = value.toLowerCase();

  if (operator === 'eq') return textAnswer === value;
  if (operator === 'neq') return textAnswer !== value;
  if (operator === 'in') return values.includes(textAnswer);
  if (operator === 'not_in') return values.length > 0 ? !values.includes(textAnswer) : false;
  if (operator === 'contains_text') return normalizedValue ? normalizedAnswer.includes(normalizedValue) : false;
  if (operator === 'not_contains_text') return normalizedValue ? !normalizedAnswer.includes(normalizedValue) : false;
  return false;
}

export function applyCrossConditions(responses = [], crossConditions = [], questionsMap = {}) {
  const activeConditions = getActiveCrossConditions(crossConditions, questionsMap);
  if (!activeConditions.length) return responses;

  return responses.filter((response) => {
    let result = true;
    activeConditions.forEach((condition, index) => {
      const question = questionsMap[condition.questionId];
      const answer = getAns(response, condition.questionId);
      const passed = evaluateCrossCondition(answer, condition, question);

      if (index === 0) {
        result = passed;
      } else if (condition.connector === 'or') {
        result = result || passed;
      } else {
        result = result && passed;
      }
    });
    return result;
  });
}

export function resolveRelevantQuestionIds(questions = []) {
  return {
    provedor: getQId(questions, QUESTION_LABELS.PROVEDOR),
    nps: getQId(questions, QUESTION_LABELS.NPS),
    velocidade: getQId(questions, QUESTION_LABELS.VELOCIDADE),
    problemas: getQId(questions, QUESTION_LABELS.PROBLEMAS),
    melhor: getQId(questions, QUESTION_LABELS.MELHOR),
    homeOffice: getQId(questions, QUESTION_LABELS.HOME_OFFICE),
    usuarios: getQId(questions, QUESTION_LABELS.USUARIOS),
    prioridade: getQId(questions, QUESTION_LABELS.PRIORIDADE),
    conheceOquei: getQId(questions, QUESTION_LABELS.CONHECE_OQUEI),
    motivoNao: getQId(questions, QUESTION_LABELS.MOTIVO_NAO),
    gatilho: getQId(questions, QUESTION_LABELS.GATILHO),
  };
}

export function calcVulnerabilidade(response, qIds) {
  let score = 0;
  let max = 0;

  const nps = Number(getAns(response, qIds.nps));
  if (!Number.isNaN(nps)) {
    max += 3;
    if (nps <= 3) score += 3;
    else if (nps <= 6) score += 2;
    else if (nps <= 7) score += 1;
  }

  max += 2;
  if (getAns(response, qIds.velocidade) === 'Não') score += 2;

  const problems = getAns(response, qIds.problemas);
  const relevantProblems = (Array.isArray(problems) ? problems : [problems])
    .filter(Boolean)
    .filter((problem) => problem !== 'Nenhum problema');
  max += 3;
  score += Math.min(relevantProblems.length, 3);

  const bestProvider = getAns(response, qIds.melhor);
  const provider = getAns(response, qIds.provedor);
  max += 1;
  if (bestProvider && provider && bestProvider !== provider) score += 1;

  const reason = getAns(response, qIds.motivoNao);
  max += 2;
  if (reason === 'Nunca recebi uma oferta') score += 2;
  else if (reason === 'Preço') score += 1;

  return max > 0 ? Math.round((score / max) * 10) : 0;
}

export function buildOperationalData({ selCity, cities, monthlyBases, cityResults, selMonth }) {
  const city = selCity !== 'all' ? cities.find((item) => item.id === selCity) : null;
  const monthBase = selCity !== 'all' ? monthlyBases.find((item) => item.cityId === selCity) : null;
  const result = selCity !== 'all'
    ? cityResults.find((item) => item.cityId === selCity && item.month === selMonth)
      || cityResults.find((item) => item.id === `${selMonth}_${selCity}`)
    : null;

  const baseStart = Number(monthBase?.baseStart ?? city?.baseStart ?? 0);
  const baseEnd = Number(monthBase?.baseEnd ?? city?.baseEnd ?? 0);
  const potencial = Number(city?.potencial ?? 0);

  let vendas = 0;
  if (result?.vendas) {
    Object.values(result.vendas).forEach((channel) => {
      Object.values(channel).forEach((value) => {
        vendas += Number(value || 0);
      });
    });
  }

  const cancelamentos = Number(result?.cancelamentos || 0);
  const netAdds = vendas - cancelamentos;
  const penetracao = potencial > 0 ? pct(baseEnd || baseStart, potencial) : 0;
  const churnRate = baseStart > 0 ? ((cancelamentos / baseStart) * 100).toFixed(1) : '—';

  return {
    baseStart,
    baseEnd: baseEnd || baseStart,
    potencial,
    vendas,
    cancelamentos,
    netAdds,
    penetracao,
    churnRate,
  };
}

function getProviderSortWeight(name) {
  const index = CONCORRENTES_ORDEM.indexOf(name);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function buildMarketAnalysis(filteredResponses = [], qIds = {}) {
  if (!filteredResponses.length || !qIds.provedor) return null;

  const distribution = {};
  filteredResponses.forEach((response) => {
    const provider = getAns(response, qIds.provedor) || 'Outro';
    distribution[provider] = (distribution[provider] || 0) + 1;
  });

  const providers = Object.entries(distribution)
    .filter(([name]) => name !== OQUEI)
    .map(([name, count]) => {
      const customers = filteredResponses.filter((response) => getAns(response, qIds.provedor) === name);
      const scores = customers.map((response) => calcVulnerabilidade(response, qIds));
      const npsValues = customers
        .map((response) => Number(getAns(response, qIds.nps)))
        .filter((value) => !Number.isNaN(value));
      const promoters = npsValues.filter((value) => value >= 9).length;
      const detractors = npsValues.filter((value) => value <= 6).length;

      const problemCount = {};
      customers.forEach((response) => {
        const problems = getAns(response, qIds.problemas);
        (Array.isArray(problems) ? problems : [problems])
          .filter(Boolean)
          .filter((problem) => problem !== 'Nenhum problema')
          .forEach((problem) => {
            problemCount[problem] = (problemCount[problem] || 0) + 1;
          });
      });

      const triggerCount = {};
      customers.forEach((response) => {
        const trigger = getAns(response, qIds.gatilho);
        if (trigger) triggerCount[trigger] = (triggerCount[trigger] || 0) + 1;
      });

      const reasonCount = {};
      customers.forEach((response) => {
        const reason = getAns(response, qIds.motivoNao);
        if (reason) reasonCount[reason] = (reasonCount[reason] || 0) + 1;
      });

      const awarenessCount = customers.filter((response) => getAns(response, qIds.conheceOquei) === 'Sim').length;
      const noSpeedCount = customers.filter((response) => getAns(response, qIds.velocidade) === 'Não').length;

      return {
        nome: name,
        n: count,
        scoreVulnerabilidade: Math.round(avg(scores)),
        npsMedio: npsValues.length ? avg(npsValues).toFixed(1) : null,
        npsScore: npsValues.length ? Math.round(((promoters - detractors) / npsValues.length) * 100) : null,
        pctSemVelocidade: pct(noSpeedCount, count),
        problemasTop: Object.entries(problemCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label]) => label),
        gatilhosTop: Object.entries(triggerCount).sort((a, b) => b[1] - a[1]).slice(0, 3),
        motivosTop: Object.entries(reasonCount).sort((a, b) => b[1] - a[1]).slice(0, 3),
        pctConhece: pct(awarenessCount, count),
      };
    })
    .sort((left, right) => {
      if (right.scoreVulnerabilidade !== left.scoreVulnerabilidade) {
        return right.scoreVulnerabilidade - left.scoreVulnerabilidade;
      }
      if (right.n !== left.n) return right.n - left.n;
      return getProviderSortWeight(left.nome) - getProviderSortWeight(right.nome);
    });

  const total = filteredResponses.length;
  const marketShare = Object.entries(distribution)
    .map(([name, count]) => ({ nome: name, n: count, pct: pct(count, total) }))
    .sort((left, right) => {
      if (right.n !== left.n) return right.n - left.n;
      return getProviderSortWeight(left.nome) - getProviderSortWeight(right.nome);
    });

  const awareness = filteredResponses.filter((response) => getAns(response, qIds.conheceOquei) === 'Sim').length;
  const homeOffice = filteredResponses.filter((response) => getAns(response, qIds.homeOffice) === 'Sim').length;
  const competitiveResponses = filteredResponses.filter((response) => {
    const provider = getAns(response, qIds.provedor);
    return provider && provider !== OQUEI;
  });

  const priorityCount = {};
  competitiveResponses.forEach((response) => {
    const priority = getAns(response, qIds.prioridade);
    if (priority) priorityCount[priority] = (priorityCount[priority] || 0) + 1;
  });

  const leadsQuentes = competitiveResponses.filter((response) => calcVulnerabilidade(response, qIds) >= 7).length;

  return {
    dist: distribution,
    provedores: providers,
    marketShare,
    total,
    conheceOquei: awareness,
    prioridades: Object.entries(priorityCount).sort((a, b) => b[1] - a[1]),
    competitiveBaseCount: competitiveResponses.length,
    homeOffice,
    leadsQuentes,
  };
}

export function buildStrategicAiPrompt({
  market,
  opData,
  relatedPlans,
  survey,
  selectedThemeLabel,
  selectedVersion,
  selMonth,
  filteredCount,
  totalCount,
}) {
  const providersSummary = market.provedores.map((provider) => (
    `${provider.nome}: ${provider.n} clientes | Vulnerabilidade ${provider.scoreVulnerabilidade}/10 | `
    + `NPS ${provider.npsScore ?? 'N/A'} | Sem velocidade ${provider.pctSemVelocidade}% | `
    + `Problemas: ${provider.problemasTop.join(', ')} | `
    + `Gatilhos: ${provider.gatilhosTop.map(([label]) => label).join(', ')}`
  )).join('\n');

  const plansSummary = relatedPlans.length
    ? relatedPlans
      .slice(0, 5)
      .map((plan) => `- ${plan.title} | ${plan.status} | ${plan.themeName || 'Sem tema'} | ${plan.expectedImpact || 'Sem impacto descrito'}`)
      .join('\n')
    : '- Nenhum plano de acao cadastrado para este recorte';

  const context = [
    `Objetivo: ${survey?.objective || 'Nao informado'}`,
    `Gatilho: ${survey?.triggerLabel || survey?.trigger || 'Nao informado'}`,
    `Tema em foco: ${selectedThemeLabel}`,
    `Versao filtrada: ${selectedVersion === 'all' ? 'Todas' : `Versao ${selectedVersion}`}`,
    `Recorte analisado: ${filteredCount} de ${totalCount} entrevistas`,
  ].join('\n');

  return `Você é consultor especialista em expansão de provedores de internet no interior do Brasil.

CONTEXTO DA CAMPANHA:
${context}

DADOS OPERACIONAIS — ${selMonth}:
- Base ativa: ${opData.baseEnd} clientes
- Penetração: ${opData.penetracao}% dos HPs
- Vendas no mês: ${opData.vendas}
- Cancelamentos: ${opData.cancelamentos}
- Net Adds: ${opData.netAdds > 0 ? '+' : ''}${opData.netAdds}
- Churn: ${opData.churnRate}%

PESQUISA DE CAMPO (${market.total} entrevistados):
- Oquei tem ${market.dist[OQUEI] || 0} clientes na amostra (${pct(market.dist[OQUEI] || 0, market.total)}%)
- Leads quentes identificados: ${market.leadsQuentes} (score ≥ 7/10)
- Awareness da Oquei: ${pct(market.conheceOquei, market.total)}%
- Home Office na cidade: ${pct(market.homeOffice, market.total)}%
- Prioridade #1 do mercado: ${market.prioridades[0]?.[0] || 'N/A'}

VULNERABILIDADE POR CONCORRENTE:
${providersSummary}

PLANOS DE ACAO JA CADASTRADOS:
${plansSummary}

Com base nesses dados, forneça:

**1. DIAGNÓSTICO DE CRESCIMENTO**
Por que a Oquei não está crescendo mais rápido? Seja cirúrgico com os dados.

**2. RANKING DE ATAQUE — qual concorrente atacar primeiro e por quê**
Priorize por vulnerabilidade + volume de clientes na amostra.

**3. SCRIPT DE ABORDAGEM por concorrente vulnerável**
Para cada provedor no top 2, dê 2-3 argumentos específicos baseados nos dados.

**4. AÇÕES PARA OS PRÓXIMOS 7 DIAS**
Máximo 5 ações concretas e executáveis.

**5. AJUSTES NO PLANO DE ACAO**
Considere os planos já cadastrados e diga o que reforçar, corrigir, acelerar ou adicionar.

Seja direto e use os números. Escreva em português.`;
}

export function buildAnalysisSnapshot({
  surveys = [],
  responses = [],
  cities = [],
  themes = [],
  cityResults = [],
  monthlyBases = [],
  actionPlans = [],
  selSurvey = 'all',
  selCity = 'all',
  selTheme = 'all',
  selVersion = 'all',
  selMonth,
  crossConditions = [],
}) {
  const survey = surveys.find((item) => item.id === selSurvey);
  const selectedCityRecord = cities.find((item) => item.id === selCity);
  const selectedCityLabel = selCity === 'all' ? 'Todas as cidades' : (selectedCityRecord?.name || selCity);
  const cityFilterValue = selCity === 'all' ? 'all' : [selCity, selectedCityRecord?.name].filter(Boolean);
  const themeMap = Object.fromEntries(themes.map((theme) => [theme.id, theme]));
  const surveyThemeLabels = getSurveyThemeLabels(survey, themeMap);
  const selectedThemeLabel = getSelectedThemeLabel(selTheme, themeMap);
  const themeOptions = survey?.themeIds?.length
    ? survey.themeIds.map((themeId) => themeMap[themeId]).filter(Boolean)
    : themes.filter((theme) => theme.status !== 'inactive');

  const baseResponses = filterInsightResponses(responses, {
    surveyId: selSurvey,
    city: cityFilterValue,
    themeId: selTheme,
    version: 'all',
    acceptedOnly: true,
  });

  const versionOptions = getVersionOptions(baseResponses);
  const versionCounts = buildVersionCounts(baseResponses);
  const processedResponses = filterInsightResponses(baseResponses, {
    city: 'all',
    version: selVersion,
    acceptedOnly: false,
  });

  const relatedPlans = filterInsightActionPlans(actionPlans, {
    cityRef: selCity,
    surveyId: selSurvey,
    themeId: selTheme,
  });

  const questions = survey?.questions || [];
  const questionsMap = Object.fromEntries(questions.map((question) => [question.id, question]));
  const activeCrossConditions = getActiveCrossConditions(crossConditions, questionsMap);
  const filteredResponses = applyCrossConditions(processedResponses, crossConditions, questionsMap);
  const qIds = resolveRelevantQuestionIds(questions);
  const opData = buildOperationalData({ selCity, cities, monthlyBases, cityResults, selMonth });
  const market = buildMarketAnalysis(filteredResponses, qIds);

  return {
    survey,
    questions,
    qIds,
    responses: processedResponses,
    filteredResponses,
    market,
    opData,
    relatedPlans,
    versionOptions,
    versionCounts,
    filters: {
      surveys,
      cities,
      themeOptions,
      selectedCityLabel,
      selectedThemeLabel,
      surveyThemeLabels,
      selectedCityRecord,
      activeCrossConditions,
      hasActiveCrossConditions: activeCrossConditions.length > 0,
    },
  };
}
