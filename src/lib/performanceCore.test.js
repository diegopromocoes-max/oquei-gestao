import { describe, expect, it } from 'vitest';
import { DEFAULT_ATTENDANT_SCORE_CONFIG } from './performanceConstants';
import {
  buildAlertRecords,
  buildPerformanceSnapshot,
  computeBehaviorMetrics,
  computeCommercialMetrics,
  computeOverallScore,
} from './performanceCore';

describe('performanceCore commercial aggregation', () => {
  it('aggregates sales, conversions and manual metrics', () => {
    const result = computeCommercialMetrics({
      employee: { salesTarget: 4 },
      leads: [
        { status: 'Contratado', productPrice: 120, leadType: 'Plano Novo' },
        { status: 'Instalado', productPrice: 180, leadType: 'Migracao' },
        { status: 'Descartado', productPrice: 90, leadType: 'Plano Novo' },
      ],
      commercialInput: {
        prospectingCount: 10,
        followUpCount: 5,
        reactivationCount: 2,
      },
    });

    expect(result.salesCount).toBe(2);
    expect(result.discardCount).toBe(1);
    expect(result.migrationCount).toBe(1);
    expect(result.targetPercent).toBe(50);
    expect(result.conversionRate).toBeCloseTo(66.7, 1);
    expect(result.averageTicket).toBe(150);
  });
});

describe('performanceCore behavior aggregation', () => {
  it('builds radar averages from multiple reviews', () => {
    const metrics = computeBehaviorMetrics([
      {
        competencies: {
          communication: { rating: 4 },
          organization: { rating: 3 },
        },
      },
      {
        competencies: {
          communication: { rating: 5 },
          organization: { rating: 4 },
        },
      },
    ]);

    const communication = metrics.radarData.find((item) => item.subject === 'Comunicacao');
    expect(metrics.reviewCount).toBe(2);
    expect(communication.rating).toBe(4.5);
    expect(metrics.score).toBeGreaterThan(0);
  });
});

describe('performanceCore overall snapshot and alerts', () => {
  it('builds a monthly snapshot with deltas and status', () => {
    const snapshot = buildPerformanceSnapshot({
      employee: { id: 'emp-1', name: 'Maria', role: 'attendant', salesTarget: 3 },
      period: '2026-04',
      leads: [
        { status: 'Contratado', productPrice: 100, leadType: 'Plano Novo' },
        { status: 'Contratado', productPrice: 150, leadType: 'Plano Novo' },
      ],
      behaviorReviews: [
        {
          competencies: {
            communication: { rating: 4 },
            organization: { rating: 4 },
            discipline: { rating: 5 },
          },
        },
      ],
      history: [
        { period: '2026-03', scoreOverall: 58 },
        { period: '2026-01', scoreOverall: 50 },
      ],
      config: DEFAULT_ATTENDANT_SCORE_CONFIG,
    });

    expect(snapshot.employeeId).toBe('emp-1');
    expect(snapshot.period).toBe('2026-04');
    expect(snapshot.scoreOverall).toBeGreaterThan(0);
    expect(snapshot.status).toMatch(/green|yellow|red/);
    expect(snapshot.delta30).toBe(0);
  });

  it('emits alerts for overdue feedback, overdue plans and conversion drops', () => {
    const alerts = buildAlertRecords({
      employee: { id: 'emp-2', name: 'Joao' },
      period: '2026-04',
      snapshot: {
        employeeId: 'emp-2',
        period: '2026-04',
        commercial: { conversionRate: 30 },
        attendance: { absenceCount: 3 },
        scoreOverall: 61,
        generatedAt: '2026-04-02T12:00:00.000Z',
        status: 'yellow',
      },
      history: [
        {
          period: '2026-03',
          commercial: { conversionRate: 55 },
          attendance: { absenceCount: 0 },
          scoreOverall: 60,
        },
        {
          period: '2026-02',
          commercial: { conversionRate: 56 },
          attendance: { absenceCount: 0 },
          scoreOverall: 59,
        },
      ],
      feedbacks: [
        { referenceWeek: '2026-W14', resultValue: 7, targetValue: 10, recordedAt: '2026-03-01T12:00:00.000Z' },
        { referenceWeek: '2026-W13', resultValue: 8, targetValue: 10, recordedAt: '2026-02-20T12:00:00.000Z' },
        { referenceWeek: '2026-W12', resultValue: 6, targetValue: 10, recordedAt: '2026-02-13T12:00:00.000Z' },
      ],
      plans: [
        { status: 'Pendente', deadline: '2026-03-10T12:00:00.000Z' },
      ],
      config: DEFAULT_ATTENDANT_SCORE_CONFIG,
    });

    expect(alerts.map((alert) => alert.type)).toEqual(expect.arrayContaining([
      'below_target_3_weeks',
      'feedback_overdue',
      'overdue_plan',
      'stalled_evolution',
    ]));
  });

  it('computes a weighted overall score with config percentages', () => {
    const total = computeOverallScore({
      commercialScore: 80,
      behaviorScore: 70,
      attendanceScore: 90,
      engagementScore: 60,
      config: DEFAULT_ATTENDANT_SCORE_CONFIG,
    });

    expect(total).toBe(76.5);
  });
});
