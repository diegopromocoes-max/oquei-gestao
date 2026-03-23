export function getSurveyThemeLabels(survey, themeMap = {}) {
  if (!survey) return [];
  if (Array.isArray(survey.themeNames) && survey.themeNames.length) return survey.themeNames;
  return (survey.themeIds || []).map((themeId) => themeMap[themeId]?.name).filter(Boolean);
}

export function getSelectedThemeLabel(themeId, themeMap = {}) {
  if (!themeId || themeId === 'all') return 'Todos os temas';
  return themeMap[themeId]?.name || 'Tema';
}

export function questionMatchesTheme(question, themeId, survey = null) {
  if (!themeId || themeId === 'all') return true;
  if (question?.themeId === themeId) return true;
  if (!question?.themeId && Array.isArray(survey?.themeIds) && survey.themeIds.length === 1) {
    return survey.themeIds[0] === themeId;
  }
  return false;
}

export function responseMatchesTheme(response, themeId) {
  if (!themeId || themeId === 'all') return true;
  if (response?.themeId === themeId) return true;
  return Array.isArray(response?.themeIds) && response.themeIds.includes(themeId);
}

export function responseMatchesVersion(response, version) {
  if (!version || version === 'all') return true;
  return String(response?.surveyVersion || 1) === String(version);
}

function matchesValueOrList(candidate, expected) {
  if (!candidate && candidate !== 0) return false;
  if (Array.isArray(expected)) return expected.map(String).includes(String(candidate));
  return String(candidate) === String(expected);
}

export function responseMatchesCity(response, city) {
  if (!city || city === 'all') return true;
  return (
    matchesValueOrList(response?.city, city)
    || matchesValueOrList(response?.cityId, city)
    || matchesValueOrList(response?.cityName, city)
  );
}

export function filterInsightResponses(
  responses,
  { validSurveyIds = null, surveyId = 'all', city = 'all', themeId = 'all', version = 'all', acceptedOnly = true } = {},
) {
  return (responses || []).filter((response) => {
    if (acceptedOnly && response.auditStatus && response.auditStatus !== 'aceita') return false;
    if (validSurveyIds && !validSurveyIds.has(response.surveyId)) return false;
    if (surveyId !== 'all' && response.surveyId !== surveyId) return false;
    if (!responseMatchesCity(response, city)) return false;
    if (!responseMatchesTheme(response, themeId)) return false;
    if (!responseMatchesVersion(response, version)) return false;
    return true;
  });
}

export function getVersionOptions(responses) {
  return [...new Set((responses || []).map((response) => String(response?.surveyVersion || 1)))]
    .sort((a, b) => Number(b) - Number(a));
}

export function buildVersionCounts(responses) {
  const counts = {};
  (responses || []).forEach((response) => {
    const version = String(response?.surveyVersion || 1);
    counts[version] = (counts[version] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([version, count]) => ({ version, count }))
    .sort((a, b) => Number(b.version) - Number(a.version));
}

export function filterInsightActionPlans(
  plans,
  { cityRef = 'all', surveyId = 'all', themeId = 'all' } = {},
) {
  return (plans || []).filter((plan) => {
    if (surveyId !== 'all' && plan.surveyId !== surveyId) return false;
    if (themeId !== 'all' && plan.themeId !== themeId) return false;
    if (cityRef !== 'all') {
      const cityMatch = (
        matchesValueOrList(plan.cityId, cityRef)
        || matchesValueOrList(plan.cityName, cityRef)
      );
      if (!cityMatch) return false;
    }
    return true;
  });
}

export function summarizeActionPlans(plans) {
  const list = plans || [];
  return {
    total: list.length,
    planejamento: list.filter((plan) => plan.status === 'planejamento').length,
    andamento: list.filter((plan) => plan.status === 'em_andamento').length,
    concluidos: list.filter((plan) => plan.status === 'concluido').length,
    cancelados: list.filter((plan) => plan.status === 'cancelado').length,
  };
}

export function getPlanStatusLabel(status) {
  const map = {
    planejamento: 'Planejamento',
    em_andamento: 'Em andamento',
    concluido: 'Concluido',
    cancelado: 'Cancelado',
  };
  return map[status] || status || 'Status';
}

export function getPlanStatusTone(status, colors) {
  const map = {
    planejamento: colors.warning,
    em_andamento: colors.info,
    concluido: colors.success,
    cancelado: colors.danger,
  };
  return map[status] || colors.neutral;
}

export function getPriorityTone(priority, colors) {
  const map = {
    alta: colors.danger,
    media: colors.warning,
    baixa: colors.success,
  };
  return map[priority] || colors.neutral;
}
