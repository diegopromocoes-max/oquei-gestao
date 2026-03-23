function compactText(value, max = 26) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function getQuestionTone(type) {
  const map = {
    boolean: '#10b981',
    select: '#38bdf8',
    multiselect: '#8b5cf6',
    nps: '#f59e0b',
    text: '#f97316',
  };
  return map[type] || '#38bdf8';
}

function getQuestionTypeLabel(type) {
  const map = {
    boolean: 'Sim ou nao',
    select: 'Escolha unica',
    multiselect: 'Multipla escolha',
    nps: 'NPS',
    text: 'Texto livre',
  };
  return map[type] || type || 'Pergunta';
}

function questionHasAnswer(value, type) {
  if (value === undefined || value === null) return false;
  if (type === 'multiselect') return Array.isArray(value) && value.length > 0;
  if (type === 'text') return String(value).trim().length > 0;
  return String(value).trim().length > 0;
}

export function buildLiveTvQuestionCatalog({ surveys = [], responses = [], selectedSurveyId = 'all' }) {
  const responseSurveyIds = new Set((responses || []).map((response) => response.surveyId).filter(Boolean));
  const selectedSurveyIds = selectedSurveyId === 'all'
    ? new Set(responseSurveyIds.size ? [...responseSurveyIds] : surveys.map((survey) => survey.id))
    : new Set([selectedSurveyId]);

  return (surveys || [])
    .filter((survey) => selectedSurveyIds.has(survey.id))
    .flatMap((survey) => (survey.questions || [])
      .filter((question) => question?.id && question?.label)
      .map((question) => ({
        key: `${survey.id}::${question.id}`,
        surveyId: survey.id,
        surveyTitle: survey.title || 'Pesquisa',
        questionId: question.id,
        label: question.label,
        type: question.type || 'select',
      })));
}

export function normalizeLiveTvKpiKeys({ selectedKeys = [], catalog = [], maxItems = 4 }) {
  const validKeys = new Set((catalog || []).map((item) => item.key));
  const normalized = (selectedKeys || []).filter((key) => validKeys.has(key)).slice(0, maxItems);
  if (normalized.length) return normalized;
  return (catalog || []).slice(0, maxItems).map((item) => item.key);
}

export function buildLiveTvKpis({ responses = [], catalog = [], selectedKeys = [] }) {
  const catalogMap = Object.fromEntries((catalog || []).map((item) => [item.key, item]));

  return (selectedKeys || []).map((key) => {
    const question = catalogMap[key];
    if (!question) return null;

    const answerList = (responses || [])
      .filter((response) => response.surveyId === question.surveyId)
      .map((response) => response.answers?.[question.questionId])
      .filter((value) => questionHasAnswer(value, question.type));

    const base = {
      key,
      surveyId: question.surveyId,
      questionId: question.questionId,
      label: compactText(question.label, 52),
      surveyTitle: question.surveyTitle,
      type: question.type,
      typeLabel: getQuestionTypeLabel(question.type),
      tone: getQuestionTone(question.type),
      totalAnswers: answerList.length,
      value: 'Sem dados',
      helper: 'Aguardando respostas',
    };

    if (!answerList.length) return base;

    if (question.type === 'nps') {
      const numbers = answerList.map(Number).filter((value) => !Number.isNaN(value));
      const total = numbers.length;
      const promoters = numbers.filter((value) => value >= 9).length;
      const detractors = numbers.filter((value) => value <= 6).length;
      const nps = total ? Math.round(((promoters - detractors) / total) * 100) : 0;
      const average = total ? (numbers.reduce((sum, value) => sum + value, 0) / total).toFixed(1) : '0.0';
      return {
        ...base,
        value: `NPS ${nps >= 0 ? '+' : ''}${nps}`,
        helper: `${total} resposta(s) | media ${average}`,
      };
    }

    if (question.type === 'text') {
      const lastText = compactText(answerList[answerList.length - 1], 70);
      return {
        ...base,
        value: `${answerList.length}`,
        helper: lastText || 'Texto livre sem resumo disponivel',
      };
    }

    const counts = {};
    if (question.type === 'multiselect') {
      answerList.forEach((value) => {
        (Array.isArray(value) ? value : [value]).forEach((item) => {
          const label = String(item || '').trim();
          if (!label) return;
          counts[label] = (counts[label] || 0) + 1;
        });
      });
    } else {
      answerList.forEach((value) => {
        const label = String(value || '').trim();
        if (!label) return;
        counts[label] = (counts[label] || 0) + 1;
      });
    }

    const topEntry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (!topEntry) return base;

    const [topValue, topCount] = topEntry;
    const share = Math.round((topCount / Math.max(answerList.length, 1)) * 100);
    return {
      ...base,
      value: compactText(topValue, 20),
      helper: `${share}% | ${topCount}/${answerList.length} resposta(s)`,
    };
  }).filter(Boolean);
}
