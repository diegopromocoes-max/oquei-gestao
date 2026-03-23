import { SURVEY_TRIGGER_OPTIONS } from './surveyQuestions';

export const NEW_TRIGGER_VALUE = '__new_trigger__';

function normalizeSpaces(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function slugifyTriggerLabel(label) {
  return normalizeSpaces(label)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

export function buildSurveyTriggerOptions(customTriggers = [], currentTrigger = '', currentLabel = '') {
  const map = new Map(SURVEY_TRIGGER_OPTIONS.map((item) => [item.value, item]));

  (customTriggers || []).forEach((item) => {
    if (item?.active === false || !item?.value || !item?.label) return;
    map.set(item.value, { value: item.value, label: item.label, isCustom: true });
  });

  if (currentTrigger && !map.has(currentTrigger)) {
    map.set(currentTrigger, {
      value: currentTrigger,
      label: currentLabel || currentTrigger,
      isCustom: true,
    });
  }

  return [...map.values(), { value: NEW_TRIGGER_VALUE, label: 'Cadastrar novo gatilho...' }];
}

export function resolveSurveyTriggerLabel(trigger, options = [], explicitLabel = '') {
  if (explicitLabel) return explicitLabel;
  return options.find((item) => item.value === trigger)?.label || trigger || 'Nao informado';
}
