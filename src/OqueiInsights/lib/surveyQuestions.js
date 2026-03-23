import { Hash, List, ToggleLeft, Type } from 'lucide-react';
import { colors } from '../../components/ui';

export const QUESTION_TYPES = [
  { value: 'boolean', label: 'Sim / Nao', icon: ToggleLeft, color: colors.success },
  { value: 'select', label: 'Escolha Unica', icon: List, color: colors.primary },
  { value: 'multiselect', label: 'Multipla Escolha', icon: List, color: colors.purple },
  { value: 'nps', label: 'Escala NPS 0-10', icon: Hash, color: colors.warning },
  { value: 'text', label: 'Texto Livre', icon: Type, color: colors.neutral },
];

export const STATUS_COR = {
  active: 'success',
  finished: 'neutral',
  draft: 'warning',
};

export const STATUS_LABEL = {
  active: 'Ativa',
  finished: 'Encerrada',
  draft: 'Rascunho',
};

export const STATUS_ICON = {
  active: '🟢',
  finished: '⛔',
  draft: '✏️',
};

export const SURVEY_TRIGGER_OPTIONS = [
  { value: 'low_penetration', label: 'Baixa penetracao em vendas' },
  { value: 'base_growth', label: 'Crescimento de base' },
  { value: 'board_request', label: 'Solicitacao da diretoria' },
  { value: 'market_opportunity', label: 'Oportunidade comercial' },
  { value: 'retention_risk', label: 'Risco de perda ou churn' },
  { value: 'other', label: 'Outro gatilho estrategico' },
];

export const DEFAULT_SURVEY_FORM = {
  title: '',
  description: '',
  objective: '',
  trigger: '',
  triggerLabel: '',
  targetCities: [],
  themeIds: [],
};

export const getSurveyTriggerLabel = (trigger) =>
  SURVEY_TRIGGER_OPTIONS.find((item) => item.value === trigger)?.label || 'Nao informado';

export const emptyQuestion = () => ({
  id: `${Date.now()}${Math.random().toString(36).slice(2)}`,
  type: 'boolean',
  label: '',
  options: ['Sim', 'Nao'],
});

export const normalizeOptions = (options) => {
  if (!Array.isArray(options)) return [];
  return options
    .map((option) => String(option || '').trim())
    .filter(Boolean);
};

export const sanitizeQuestions = (questions) =>
  (questions || []).map(({ id, type, label, options, ...rest }) => {
    const normalizedType = type || 'text';
    const normalizedOptions =
      normalizedType === 'select' || normalizedType === 'multiselect'
        ? normalizeOptions(options)
        : normalizedType === 'boolean'
          ? ['Sim', 'Nao']
          : undefined;

    return {
      id,
      type: normalizedType,
      label: String(label || ''),
      ...(normalizedOptions !== undefined ? { options: normalizedOptions } : {}),
      ...rest,
    };
  });

export const canActivate = (survey) => {
  if (!String(survey?.objective || '').trim()) {
    return { ok: false, reason: 'Defina o objetivo estrategico da campanha.' };
  }

  if (!String(survey?.trigger || '').trim()) {
    return { ok: false, reason: 'Selecione o gatilho que motivou a pesquisa.' };
  }

  if (!survey?.questions?.length) {
    return { ok: false, reason: 'Adicione pelo menos 1 pergunta para ativar.' };
  }

  const emptyLabels = survey.questions.filter((question) => !String(question.label || '').trim());
  if (emptyLabels.length) {
    return { ok: false, reason: 'Todas as perguntas precisam ter texto.' };
  }

  const invalidOptions = survey.questions.find((question) => {
    if (question.type !== 'select' && question.type !== 'multiselect') return false;
    return normalizeOptions(question.options).length === 0;
  });

  if (invalidOptions) {
    return { ok: false, reason: 'Perguntas de escolha precisam ter pelo menos uma opcao.' };
  }

  return { ok: true, reason: '' };
};

export const surveyURL = (id) => `${window.location.origin}/pesquisa/${id}`;

export const entrevistadorURL = (surveyId, entrevistadorId) =>
  `${window.location.origin}/pesquisa/${surveyId}/entrevistador/${entrevistadorId}`;

export const createQuestionFromBank = (question) => ({
  id: `${Date.now()}${Math.random().toString(36).slice(2)}`,
  type: question.type || 'text',
  label: question.label || '',
  ...(question.type === 'select' || question.type === 'multiselect' || question.type === 'boolean'
    ? { options: question.type === 'boolean' ? ['Sim', 'Nao'] : normalizeOptions(question.options) }
    : {}),
  bankQuestionId: question.id,
  themeId: question.themeId || '',
  themeName: question.themeName || '',
  isCore: Boolean(question.isCore),
  source: 'question_bank',
});
