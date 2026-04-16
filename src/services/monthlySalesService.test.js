import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/operationsCalendar', () => ({
  buildOperationalCalendar: vi.fn(() => []),
}));

import {
  bucketLeadByBusinessType,
  buildPlanCarryoverFromPreviousMonth,
  buildPlanStoreMetrics,
  buildTrendPresetRange,
} from './salesDashboardModel';
import { buildScopedSalesView } from './monthlySalesService';

describe('sales dashboard model', () => {
  it('nao considera como plano a categoria Servicos Adicionais', () => {
    expect(bucketLeadByBusinessType({
      categoryName: 'Servicos Adicionais',
      productName: 'Paramount+',
      status: 'Contratado',
    })).toBe('sva');
  });

  it('calcula backlog herdado apenas para planos anteriores ainda nao baixados no novo periodo', () => {
    const carryover = buildPlanCarryoverFromPreviousMonth([
      {
        status: 'Contratado',
        contractedDate: '2026-03-29',
        categoryName: 'Internet Fibra',
      },
      {
        status: 'Instalado',
        contractedDate: '2026-03-25',
        installedDate: '2026-04-02',
        categoryName: 'Plano Novo',
      },
      {
        status: 'Instalado',
        contractedDate: '2026-03-20',
        installedDate: '2026-03-28',
        categoryName: 'Plano Novo',
      },
    ], '2026-04-01');

    expect(carryover).toBe(2);
  });

  it('projeta instalacoes oficiais como vendas projetadas + backlog do mes anterior', () => {
    const metrics = buildPlanStoreMetrics({
      storeLeads: [
        ...Array.from({ length: 5 }, (_, index) => ({
          id: `contract-${index}`,
          status: 'Contratado',
          contractedMonthKey: '2026-04',
          categoryName: 'Plano Novo',
        })),
        ...Array.from({ length: 2 }, (_, index) => ({
          id: `install-${index}`,
          status: 'Instalado',
          contractedMonthKey: '2026-04',
          installMonthKey: '2026-04',
          categoryName: 'Plano Novo',
        })),
      ],
      goalPlansOfficial: 20,
      monthKey: '2026-04',
      previousMonthCarryoverPlans: 2,
      workingDays: { total: 20, elapsed: 10, remaining: 10 },
    });

    expect(metrics.projectedMonthSalesPlans).toBe(14);
    expect(metrics.previousMonthCarryoverPlans).toBe(2);
    expect(metrics.installedPlansProjectionOfficial).toBe(16);
    expect(metrics.installGap).toBe(4);
    expect(metrics.requiredDailyInstalls).toBe(0.4);
    expect(metrics.projectionStatus).toBe('attention');
  });

  it('monta o preset de ultimos 7 dias uteis com sete datas operacionais', () => {
    const range = buildTrendPresetRange('7workdays', new Date('2026-04-15T12:00:00'));

    expect(range.granularity).toBe('daily');
    expect(range.dates).toHaveLength(7);
    expect(range.start).toBe(range.dates[0]);
    expect(range.end).toBe(range.dates[6]);
  });

  it('usa leads oficiais do ciclo para nao perder vendas abertas em mes anterior', () => {
    const scope = buildScopedSalesView({
      monthKey: '2026-04',
      cities: [{ id: 'centro', name: 'Centro', clusterId: 'regional-a' }],
      users: [],
      leads: [
        {
          id: 'opened-in-april',
          cityId: 'centro',
          cityName: 'Centro',
          status: 'Em negociacao',
          monthKey: '2026-04',
          categoryName: 'Plano Novo',
        },
      ],
      officialLeads: [
        {
          id: 'installed-in-april',
          cityId: 'centro',
          cityName: 'Centro',
          status: 'Instalado',
          monthKey: '2026-03',
          contractedMonthKey: '2026-04',
          installMonthKey: '2026-04',
          categoryName: 'Plano Novo',
        },
        {
          id: 'sva-in-april',
          cityId: 'centro',
          cityName: 'Centro',
          status: 'Contratado',
          monthKey: '2026-04',
          contractedMonthKey: '2026-04',
          categoryName: 'Servicos Adicionais',
        },
      ],
      prevMonthLeads: [],
      prevRelevantLeads: [],
      holidays: [],
      monthlyGoals: {
        centro: { plans_loja: 10, sva: 3, migrations: 0 },
      },
      monthlyClusterGoals: {},
      monthlyAttendantGoals: {},
      globalCalendar: { total: 22, worked: 10, remaining: 12 },
    });

    expect(scope.openedLeadsCount).toBe(1);
    expect(scope.totals.contractedP).toBe(1);
    expect(scope.totals.installedP).toBe(1);
    expect(scope.svaAnalysis.radarData).toHaveLength(1);
    expect(scope.storeData[0].salesPlanos).toBe(1);
    expect(scope.storeData[0].salesSVA).toBe(1);
  });
});
