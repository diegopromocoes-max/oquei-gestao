function ensureString(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function normalizeInsightDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value?.toDate === 'function') {
    const converted = value.toDate();
    return Number.isNaN(converted?.getTime?.()) ? null : converted;
  }

  if (typeof value?.seconds === 'number') {
    const converted = new Date(value.seconds * 1000);
    return Number.isNaN(converted.getTime()) ? null : converted;
  }

  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}$/.test(value)) {
      const converted = new Date(`${value}-01T12:00:00`);
      return Number.isNaN(converted.getTime()) ? null : converted;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const converted = new Date(`${value}T12:00:00`);
      return Number.isNaN(converted.getTime()) ? null : converted;
    }

    const converted = new Date(value);
    return Number.isNaN(converted.getTime()) ? null : converted;
  }

  return null;
}

export const INSIGHT_PERIOD_OPTIONS = [
  { value: 'all', label: 'Todo historico' },
  { value: '7d', label: 'Ultimos 7 dias' },
  { value: '30d', label: 'Ultimos 30 dias' },
  { value: '90d', label: 'Ultimos 90 dias' },
  { value: '180d', label: 'Ultimos 180 dias' },
  { value: '365d', label: 'Ultimos 12 meses' },
];

export function getInsightEntityDate(entity) {
  return (
    normalizeInsightDate(entity?.timestamp)
    || normalizeInsightDate(entity?.submittedAt)
    || normalizeInsightDate(entity?.submittedAtClient)
    || normalizeInsightDate(entity?.updatedAt)
    || normalizeInsightDate(entity?.createdAt)
    || normalizeInsightDate(entity?.dueDate)
    || normalizeInsightDate(entity?.referenceMonth)
  );
}

export function getInsightPeriodLabel(period) {
  return INSIGHT_PERIOD_OPTIONS.find((option) => option.value === period)?.label || 'Periodo personalizado';
}

export function filterInsightEntitiesByPeriod(items, period, dateResolver = getInsightEntityDate) {
  if (!period || period === 'all') return items || [];

  const days = Number(String(period).replace('d', ''));
  if (Number.isNaN(days) || days <= 0) return items || [];

  const threshold = Date.now() - (days * 24 * 60 * 60 * 1000);
  return (items || []).filter((item) => {
    const date = dateResolver(item);
    return date ? date.getTime() >= threshold : false;
  });
}

export function resolveInsightCity(entity, cityMap = {}, cityNameMap = {}) {
  const cityId = ensureString(entity?.cityId);
  const cityName = ensureString(entity?.cityName || entity?.city);

  if (cityId && cityMap[cityId]) {
    return { key: cityId, label: cityMap[cityId].name || cityId };
  }

  if (cityName && cityNameMap[cityName]) {
    const city = cityNameMap[cityName];
    return { key: city.id || city.name || cityName, label: city.name || cityName };
  }

  if (cityName) return { key: cityName, label: cityName };
  if (cityId) return { key: cityId, label: cityId };
  return { key: 'sem-cidade', label: 'Sem cidade' };
}

export function getInsightThemeLabels(entity, themeMap = {}) {
  if (Array.isArray(entity?.themeNames) && entity.themeNames.length) return entity.themeNames.filter(Boolean);
  if (Array.isArray(entity?.themeIds) && entity.themeIds.length) {
    return entity.themeIds.map((themeId) => themeMap[themeId]?.name || themeId).filter(Boolean);
  }
  if (entity?.themeName) return [entity.themeName];
  if (entity?.themeId) return [themeMap[entity.themeId]?.name || entity.themeId];
  return [];
}

export function getInsightCampaignLabel(entity, surveyMap = {}) {
  if (entity?.surveyId && surveyMap[entity.surveyId]?.title) return surveyMap[entity.surveyId].title;
  return entity?.surveyTitle || entity?.surveyId || 'Campanha';
}

export function buildInsightsExecutiveMetrics(responses, plans, themeMap = {}) {
  const responseList = responses || [];
  const planList = plans || [];
  const gpsCount = responseList.filter((response) => response.location?.lat && response.location?.lng).length;
  const uniqueCampaigns = new Set(responseList.map((response) => response.surveyId).filter(Boolean)).size;
  const uniqueCities = new Set(
    responseList.map((response) => ensureString(response.cityName || response.city || response.cityId)).filter(Boolean),
  ).size;
  const uniqueThemes = new Set(
    responseList.flatMap((response) => getInsightThemeLabels(response, themeMap)).filter(Boolean),
  ).size;
  const completedPlans = planList.filter((plan) => plan.status === 'concluido').length;
  const activePlans = planList.filter((plan) => plan.status === 'em_andamento' || plan.status === 'planejamento').length;

  return {
    totalResponses: responseList.length,
    gpsCoverage: responseList.length ? Math.round((gpsCount / responseList.length) * 100) : 0,
    campaigns: uniqueCampaigns,
    cities: uniqueCities,
    themes: uniqueThemes,
    plans: planList.length,
    completedPlans,
    activePlans,
    completionRate: planList.length ? Math.round((completedPlans / planList.length) * 100) : 0,
  };
}

export function buildInsightsCityRows(responses, plans, cityMap = {}, cityNameMap = {}) {
  const aggregate = {};

  (responses || []).forEach((response) => {
    const city = resolveInsightCity(response, cityMap, cityNameMap);
    const current = aggregate[city.key] || {
      key: city.key,
      label: city.label,
      responses: 0,
      gpsCount: 0,
      campaigns: new Set(),
      themes: new Set(),
      planIds: new Set(),
      completedPlans: 0,
    };

    current.responses += 1;
    if (response.location?.lat && response.location?.lng) current.gpsCount += 1;
    if (response.surveyId) current.campaigns.add(response.surveyId);
    getInsightThemeLabels(response).forEach((label) => current.themes.add(label));
    aggregate[city.key] = current;
  });

  (plans || []).forEach((plan) => {
    const city = resolveInsightCity(plan, cityMap, cityNameMap);
    const current = aggregate[city.key] || {
      key: city.key,
      label: city.label,
      responses: 0,
      gpsCount: 0,
      campaigns: new Set(),
      themes: new Set(),
      planIds: new Set(),
      completedPlans: 0,
    };

    current.planIds.add(plan.id);
    if (plan.surveyId) current.campaigns.add(plan.surveyId);
    getInsightThemeLabels(plan).forEach((label) => current.themes.add(label));
    if (plan.status === 'concluido') current.completedPlans += 1;
    aggregate[city.key] = current;
  });

  return Object.values(aggregate)
    .map((row) => ({
      key: row.key,
      label: row.label,
      responses: row.responses,
      gpsCoverage: row.responses ? Math.round((row.gpsCount / row.responses) * 100) : 0,
      campaigns: row.campaigns.size,
      themes: row.themes.size,
      plans: row.planIds.size,
      completedPlans: row.completedPlans,
    }))
    .sort((a, b) => (
      b.responses - a.responses
      || b.plans - a.plans
      || a.label.localeCompare(b.label, 'pt-BR')
    ));
}

export function buildInsightsCampaignRows(responses, plans, surveyMap = {}, themeMap = {}) {
  const aggregate = {};

  (responses || []).forEach((response) => {
    const key = response.surveyId || 'sem-campanha';
    const current = aggregate[key] || {
      key,
      label: getInsightCampaignLabel(response, surveyMap),
      responses: 0,
      cities: new Set(),
      themes: new Set(),
      versions: new Set(),
      planIds: new Set(),
      completedPlans: 0,
    };

    current.responses += 1;
    current.versions.add(String(response.surveyVersion || 1));
    const cityKey = ensureString(response.cityName || response.city || response.cityId);
    if (cityKey) current.cities.add(cityKey);
    getInsightThemeLabels(response, themeMap).forEach((label) => current.themes.add(label));
    aggregate[key] = current;
  });

  (plans || []).forEach((plan) => {
    const key = plan.surveyId || 'sem-campanha';
    const current = aggregate[key] || {
      key,
      label: getInsightCampaignLabel(plan, surveyMap),
      responses: 0,
      cities: new Set(),
      themes: new Set(),
      versions: new Set(),
      planIds: new Set(),
      completedPlans: 0,
    };

    current.planIds.add(plan.id);
    const cityKey = ensureString(plan.cityName || plan.cityId);
    if (cityKey) current.cities.add(cityKey);
    getInsightThemeLabels(plan, themeMap).forEach((label) => current.themes.add(label));
    if (plan.status === 'concluido') current.completedPlans += 1;
    aggregate[key] = current;
  });

  return Object.values(aggregate)
    .map((row) => ({
      key: row.key,
      label: row.label,
      responses: row.responses,
      cities: row.cities.size,
      themes: row.themes.size,
      versions: row.versions.size,
      plans: row.planIds.size,
      completedPlans: row.completedPlans,
    }))
    .sort((a, b) => (
      b.responses - a.responses
      || b.plans - a.plans
      || a.label.localeCompare(b.label, 'pt-BR')
    ));
}

export function buildInsightsThemeRows(responses, plans, themeMap = {}) {
  const aggregate = {};

  const touch = (label) => {
    if (!aggregate[label]) {
      aggregate[label] = {
        key: label,
        label,
        responses: 0,
        campaigns: new Set(),
        cities: new Set(),
        planIds: new Set(),
        completedPlans: 0,
      };
    }
    return aggregate[label];
  };

  (responses || []).forEach((response) => {
    const themeLabels = getInsightThemeLabels(response, themeMap);
    if (!themeLabels.length) themeLabels.push('Sem tema');

    themeLabels.forEach((label) => {
      const current = touch(label);
      current.responses += 1;
      if (response.surveyId) current.campaigns.add(response.surveyId);
      const cityKey = ensureString(response.cityName || response.city || response.cityId);
      if (cityKey) current.cities.add(cityKey);
    });
  });

  (plans || []).forEach((plan) => {
    const themeLabels = getInsightThemeLabels(plan, themeMap);
    if (!themeLabels.length) themeLabels.push('Sem tema');

    themeLabels.forEach((label) => {
      const current = touch(label);
      current.planIds.add(plan.id);
      if (plan.surveyId) current.campaigns.add(plan.surveyId);
      const cityKey = ensureString(plan.cityName || plan.cityId);
      if (cityKey) current.cities.add(cityKey);
      if (plan.status === 'concluido') current.completedPlans += 1;
    });
  });

  return Object.values(aggregate)
    .map((row) => ({
      key: row.key,
      label: row.label,
      responses: row.responses,
      campaigns: row.campaigns.size,
      cities: row.cities.size,
      plans: row.planIds.size,
      completedPlans: row.completedPlans,
    }))
    .sort((a, b) => (
      b.responses - a.responses
      || b.plans - a.plans
      || a.label.localeCompare(b.label, 'pt-BR')
    ));
}
