import { describe, expect, it } from 'vitest';
import {
  applyCrossConditions,
  buildMarketAnalysis,
  evaluateCrossCondition,
  getActiveCrossConditions,
} from './analysisResults';

describe('analysisResults cross filtering', () => {
  const questionsMap = {
    nps: { id: 'nps', type: 'nps' },
    tags: { id: 'tags', type: 'multiselect' },
    provider: { id: 'provider', type: 'select' },
    text: { id: 'text', type: 'text' },
  };

  it('does not activate incomplete numeric conditions', () => {
    const active = getActiveCrossConditions([
      { id: '1', questionId: 'nps', operator: 'eq', value: '', values: [], min: '', max: '', connector: 'and' },
    ], questionsMap);

    expect(active).toHaveLength(0);
  });

  it('supports numeric ranges and inverse ranges', () => {
    expect(evaluateCrossCondition(7, { operator: 'between', min: '5', max: '8' }, questionsMap.nps)).toBe(true);
    expect(evaluateCrossCondition(3, { operator: 'between', min: '5', max: '8' }, questionsMap.nps)).toBe(false);
    expect(evaluateCrossCondition(3, { operator: 'not_between', min: '5', max: '8' }, questionsMap.nps)).toBe(true);
  });

  it('supports multiselect operators', () => {
    expect(evaluateCrossCondition(['A', 'B'], { operator: 'contains_any', values: ['B', 'C'] }, questionsMap.tags)).toBe(true);
    expect(evaluateCrossCondition(['A', 'B'], { operator: 'contains_all', values: ['A', 'B'] }, questionsMap.tags)).toBe(true);
    expect(evaluateCrossCondition(['A', 'B'], { operator: 'contains_none', values: ['C', 'D'] }, questionsMap.tags)).toBe(true);
  });

  it('supports text contains and not contains', () => {
    expect(evaluateCrossCondition('Oquei fibra estável', { operator: 'contains_text', value: 'fibra' }, questionsMap.text)).toBe(true);
    expect(evaluateCrossCondition('Oquei fibra estável', { operator: 'not_contains_text', value: 'rádio' }, questionsMap.text)).toBe(true);
  });

  it('applies connectors from left to right', () => {
    const responses = [
      { id: '1', answers: { provider: 'Claro', text: 'sim', nps: 10 } },
      { id: '2', answers: { provider: 'Vivo', text: 'sim', nps: 10 } },
      { id: '3', answers: { provider: 'Vivo', text: 'nao', nps: 10 } },
    ];

    const filtered = applyCrossConditions(responses, [
      { id: 'c1', questionId: 'provider', operator: 'eq', value: 'Claro', values: [], min: '', max: '', connector: 'and' },
      { id: 'c2', questionId: 'provider', operator: 'eq', value: 'Vivo', values: [], min: '', max: '', connector: 'or' },
      { id: 'c3', questionId: 'text', operator: 'eq', value: 'sim', values: [], min: '', max: '', connector: 'and' },
    ], questionsMap);

    expect(filtered.map((response) => response.id)).toEqual(['1', '2']);
  });
});

describe('analysisResults market calculation', () => {
  it('uses the filtered competitive base for derived metrics', () => {
    const qIds = {
      provedor: 'provider',
      nps: 'nps',
      velocidade: 'speed',
      problemas: 'problems',
      melhor: 'best',
      homeOffice: 'home',
      prioridade: 'priority',
      conheceOquei: 'aware',
      motivoNao: 'reason',
      gatilho: 'trigger',
    };

    const filteredResponses = [
      {
        id: '1',
        answers: {
          provider: 'Claro',
          nps: 3,
          speed: 'Não',
          problems: ['Instabilidade'],
          best: 'Oquei Telecom',
          home: 'Sim',
          priority: 'Velocidade da Conexão',
          aware: 'Sim',
          reason: 'Preço',
          trigger: 'Mais velocidade',
        },
      },
      {
        id: '2',
        answers: {
          provider: 'Oquei Telecom',
          nps: 10,
          speed: 'Sim',
          problems: ['Nenhum problema'],
          best: 'Oquei Telecom',
          home: 'Não',
          priority: 'Atendimento humano/rápido',
          aware: 'Sim',
          reason: '',
          trigger: '',
        },
      },
    ];

    const market = buildMarketAnalysis(filteredResponses, qIds);

    expect(market.total).toBe(2);
    expect(market.competitiveBaseCount).toBe(1);
    expect(market.prioridades).toEqual([['Velocidade da Conexão', 1]]);
    expect(market.leadsQuentes).toBe(1);
    expect(market.conheceOquei).toBe(2);
    expect(market.homeOffice).toBe(1);
  });
});
