import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PerformanceProfile from './PerformanceProfile';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('recharts', () => {
  const passthrough = ({ children }) => <div>{children}</div>;
  return {
    ResponsiveContainer: passthrough,
    LineChart: passthrough,
    Line: passthrough,
    CartesianGrid: passthrough,
    XAxis: passthrough,
    YAxis: passthrough,
    Tooltip: passthrough,
    BarChart: passthrough,
    Bar: passthrough,
    RadarChart: passthrough,
    Radar: passthrough,
    PolarGrid: passthrough,
    PolarAngleAxis: passthrough,
  };
});

vi.mock('../services/performance', () => ({
  deleteParticipationEvent: vi.fn(),
  reprocessPerformanceForEmployee: vi.fn(),
  saveBehaviorReview: vi.fn(),
  saveCommercialInput: vi.fn(),
  saveDevelopmentPlan: vi.fn(),
  saveFeedback: vi.fn(),
  saveParticipationEvent: vi.fn(),
  savePerformanceConfig: vi.fn(async (_, config) => config),
  updateDevelopmentPlan: vi.fn(),
  updatePerformanceEmployee: vi.fn(),
}));

const baseData = {
  employee: {
    id: 'emp-1',
    name: 'Joao Silva',
    jobTitle: 'Vendedor',
    teamName: 'Loja A',
    employmentStatus: 'ativo',
  },
  period: '2026-04',
  config: null,
  snapshot: {
    period: '2026-04',
    generatedAt: '2026-04-02T10:00:00.000Z',
    status: 'green',
    scoreOverall: 82,
    metaPercent: 95,
    presencePercent: 98,
    delta30: 4,
    delta90: 10,
    pendingActions: 1,
    dimensionScores: {
      commercial: 88,
      behavior: 80,
      attendance: 96,
      engagement: 70,
    },
    commercial: {
      salesCount: 10,
      targetSales: 12,
      conversionRate: 35,
      averageTicket: 320,
      leadCount: 42,
      migrationCount: 3,
      targetPercent: 95,
    },
    behavior: {
      radarData: [{ subject: 'Comunicacao', rating: 4 }],
    },
    attendance: {
      absenceCount: 0,
      lateCount: 1,
      medicalCount: 0,
      warningCount: 0,
      suspensionCount: 0,
    },
    engagement: {
      participationCount: 2,
    },
  },
  history: [],
  alerts: [],
  timeline: [],
  datasets: {
    manualInput: {},
    behaviorReviews: [],
    feedbacks: [],
    plans: [],
    participationEvents: [],
  },
};

function renderComponent(ui) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('PerformanceProfile', () => {
  it('troca abas principais para supervisor e oculta configuracoes', () => {
    const { container, unmount } = renderComponent(
      <PerformanceProfile
        data={baseData}
        userData={{ role: 'supervisor', name: 'Carlos' }}
        config={null}
        onBack={vi.fn()}
        onRefresh={vi.fn()}
        onConfigChange={vi.fn()}
      />,
    );

    expect(container.textContent).toContain('Evolucao consolidada');
    expect(container.textContent).not.toContain('Configuracao do score');

    const feedbackTab = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Feedbacks');
    act(() => feedbackTab.click());
    expect(container.textContent).toContain('Timeline de feedbacks');

    const planTab = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Plano de Acao');
    act(() => planTab.click());
    expect(container.textContent).toContain('PDI e plano de desenvolvimento');

    unmount();
  });

  it('exibe aba de configuracoes para coordenador', () => {
    const { container, unmount } = renderComponent(
      <PerformanceProfile
        data={baseData}
        userData={{ role: 'coordinator', name: 'Carlos' }}
        config={null}
        onBack={vi.fn()}
        onRefresh={vi.fn()}
        onConfigChange={vi.fn()}
      />,
    );

    const configTab = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Configuracoes');
    act(() => configTab.click());
    expect(container.textContent).toContain('Configuracao do score');

    unmount();
  });
});
