function firstText(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function ensureArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return [value].filter(Boolean);
}

function buildQuestionId(index) {
  return `legacy-question-${index + 1}`;
}

function normalizeTokens(value) {
  if (Array.isArray(value)) return value.flatMap((item) => normalizeTokens(item));

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (/[;|,\n]/.test(trimmed)) {
      return trimmed
        .split(/[;|,\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [trimmed];
  }

  if (typeof value === 'number') return [String(value)];
  if (typeof value === 'boolean') return value ? ['true'] : [];

  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    const truthyKeys = entries
      .filter(([, item]) => item === true)
      .map(([key]) => key.trim())
      .filter(Boolean);

    if (truthyKeys.length) return truthyKeys;
    return entries.flatMap(([, item]) => normalizeTokens(item));
  }

  return [];
}

function normalizeEntityIds(value) {
  return ensureArray(value)
    .flatMap((item) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const directId = firstText(item.id, item.value, item.code, item.key, item.slug);
        if (directId) return [directId];
      }
      return normalizeTokens(item);
    })
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function normalizeEntityNames(value) {
  return ensureArray(value)
    .flatMap((item) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const directName = firstText(item.name, item.nome, item.label, item.title);
        if (directName) return [directName];
      }
      return normalizeTokens(item);
    })
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function normalizeQuestionOptions(question) {
  const source =
    question?.options ??
    question?.opcoes ??
    question?.choices ??
    question?.alternatives ??
    question?.alternativas ??
    question?.answers ??
    question?.respostas;

  if (Array.isArray(source)) {
    return source
      .map((item) => {
        if (item && typeof item === 'object') {
          return firstText(item.label, item.value, item.text, item.name, item.nome);
        }
        return String(item || '').trim();
      })
      .filter(Boolean);
  }

  return normalizeTokens(source);
}

function getQuestionListSource(survey) {
  const sources = [
    ['questions', survey?.questions],
    ['perguntas', survey?.perguntas],
    ['questionnaire', survey?.questionnaire],
    ['questionario', survey?.questionario],
    ['questoes', survey?.questoes],
    ['items', survey?.items],
    ['formQuestions', survey?.formQuestions],
    ['config.questions', survey?.config?.questions],
    ['campaign.questions', survey?.campaign?.questions],
  ];

  const found = sources.find(([, value]) => Array.isArray(value) || (value && typeof value === 'object'));
  if (!found) return { source: [], sourceKey: null };

  const [sourceKey, value] = found;
  if (Array.isArray(value)) return { source: value, sourceKey };
  return { source: Object.values(value || {}), sourceKey };
}

function normalizeStatus(status) {
  const current = String(status || '').trim().toLowerCase();
  if (!current) return 'draft';
  if (['draft', 'rascunho', 'ready', 'paused', 'pause', 'pending', 'open', 'editing', 'edit', 'setup', 'new', 'pronto', 'pronta', 'elaboracao', 'em_elaboracao', 'configuracao'].includes(current)) return 'draft';
  if (['active', 'ativo', 'ativa', 'em_andamento', 'andamento', 'published', 'live', 'running', 'collecting', 'coleta', 'coletando'].includes(current)) return 'active';
  if (['finished', 'encerrado', 'encerrada', 'finalizado', 'finalizada', 'closed', 'completed', 'archived', 'done', 'complete'].includes(current)) return 'finished';
  return current;
}

function normalizeLegacyQuestions(survey) {
  const { source, sourceKey } = getQuestionListSource(survey);
  const questions = ensureArray(source).map((question, index) => {
    if (typeof question === 'string' || typeof question === 'number' || typeof question === 'boolean') {
      return {
        id: buildQuestionId(index),
        label: String(question).trim(),
        type: 'text',
      };
    }

    if (!question || typeof question !== 'object') {
      return {
        id: buildQuestionId(index),
        label: '',
        type: 'text',
      };
    }

    const options = normalizeQuestionOptions(question);

    return {
      ...question,
      id: firstText(question?.id, question?.questionId, question?.uid) || buildQuestionId(index),
      label: firstText(question?.label, question?.title, question?.pergunta, question?.question, question?.name, question?.nome),
      type: firstText(question?.type, question?.questionType, question?.kind, question?.answerType) || 'text',
      ...(options.length ? { options } : {}),
      themeId: firstText(question?.themeId, question?.theme?.id, question?.temaId),
      themeName: firstText(question?.themeName, question?.theme?.name, question?.tema, question?.themeLabel),
    };
  });

  return { questions, sourceKey };
}

export function normalizeSurveyRecord(survey = {}) {
  const { questions, sourceKey } = normalizeLegacyQuestions(survey);
  const themeIds = normalizeEntityIds(survey.themeIds || survey.themeId || survey.themes || survey.temas);
  const themeNames = normalizeEntityNames(survey.themeNames || survey.temas || survey.themeLabels || survey.themes);
  const targetCities = normalizeEntityIds(survey.targetCities || survey.cityIds || survey.cities || survey.cityId || survey.targetCity);
  const targetCityNames = normalizeEntityNames(survey.targetCityNames || survey.cityNames || survey.cityLabels);
  const trigger = firstText(
    survey?.trigger,
    survey?.gatilho,
    survey?.campaignTrigger,
    survey?.motivation,
    survey?.campaign?.trigger,
    survey?.config?.trigger,
  );
  const triggerLabel = firstText(
    survey?.triggerLabel,
    survey?.gatilhoLabel,
    survey?.campaignTriggerLabel,
    survey?.campaign?.triggerLabel,
    survey?.config?.triggerLabel,
    trigger,
  );

  const usedLegacyFields = [
    !survey?.title && firstText(survey?.name, survey?.nome, survey?.surveyTitle, survey?.campaignName),
    !survey?.description && firstText(survey?.descricao, survey?.summary),
    !survey?.objective && firstText(survey?.objetivo, survey?.campaignObjective, survey?.goal),
    !survey?.trigger && trigger,
    sourceKey && sourceKey !== 'questions',
    !('questionnaireVersion' in survey),
  ].some(Boolean);

  return {
    ...survey,
    status: normalizeStatus(survey?.status),
    title: firstText(survey?.title, survey?.name, survey?.nome, survey?.surveyTitle, survey?.campaignName),
    description: firstText(survey?.description, survey?.descricao, survey?.summary),
    objective: firstText(survey?.objective, survey?.objetivo, survey?.campaignObjective, survey?.goal),
    trigger,
    triggerLabel,
    targetCities,
    targetCityNames,
    themeIds,
    themeNames,
    questions,
    questionnaireVersion: survey?.questionnaireVersion || 1,
    isLegacy: Boolean(usedLegacyFields),
  };
}

export function safeNormalizeSurveyRecord(survey = {}) {
  try {
    return normalizeSurveyRecord(survey);
  } catch {
    const fallbackTitle = firstText(
      survey?.title,
      survey?.name,
      survey?.nome,
      survey?.surveyTitle,
      survey?.campaignName,
    );

    return {
      ...survey,
      status: normalizeStatus(survey?.status),
      title: fallbackTitle || `Campanha legada ${survey?.id || ''}`.trim(),
      description: firstText(survey?.description, survey?.descricao, survey?.summary),
      objective: firstText(survey?.objective, survey?.objetivo, survey?.campaignObjective, survey?.goal),
      trigger: firstText(survey?.trigger, survey?.gatilho, survey?.campaignTrigger, survey?.motivation),
      triggerLabel: firstText(survey?.triggerLabel, survey?.gatilhoLabel, survey?.campaignTriggerLabel),
      targetCities: normalizeEntityIds(survey?.targetCities || survey?.cityIds || survey?.cities || survey?.cityId),
      targetCityNames: normalizeEntityNames(survey?.targetCityNames || survey?.cityNames || survey?.cityLabels),
      themeIds: normalizeEntityIds(survey?.themeIds || survey?.themeId || survey?.themes || survey?.temas),
      themeNames: normalizeEntityNames(survey?.themeNames || survey?.temas || survey?.themeLabels || survey?.themes),
      questions: [],
      questionnaireVersion: survey?.questionnaireVersion || 1,
      isLegacy: true,
      normalizationError: true,
    };
  }
}
