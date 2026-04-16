import { describe, expect, it, vi } from 'vitest';

vi.mock('../firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
}));

import { buildAttendantLifecycleAudit, summarizeAttendantLeads } from './atendenteAnalyticsService';

describe('atendenteAnalyticsService', () => {
  it('resume vendas oficiais por contratacao no mes e instalacoes por installMonthKey', () => {
    const summary = summarizeAttendantLeads([
      {
        id: 'lead-prev-month-installed-now',
        status: 'Instalado',
        monthKey: '2026-03',
        contractedMonthKey: '2026-04',
        installMonthKey: '2026-04',
        categoryName: 'Internet Fibra',
        productPrice: 120,
      },
      {
        id: 'lead-sva',
        status: 'Contratado',
        monthKey: '2026-04',
        contractedMonthKey: '2026-04',
        categoryName: 'Servicos Adicionais',
        productPrice: 30,
      },
      {
        id: 'lead-opened-only',
        status: 'Em negociacao',
        monthKey: '2026-04',
        categoryName: 'Plano Novo',
      },
    ], '2026-04');

    expect(summary.totalLeads).toBe(2);
    expect(summary.openedInMonth).toBe(2);
    expect(summary.contractedInMonth).toBe(2);
    expect(summary.installedInMonth).toBe(1);
    expect(summary.totalSales).toBe(2);
    expect(summary.totalInstalled).toBe(1);
    expect(summary.planos).toBe(1);
    expect(summary.svas).toBe(1);
    expect(summary.migracoes).toBe(0);
  });

  it('gera auditoria que mostra diferenca entre abertura e ciclo oficial', () => {
    const audit = buildAttendantLifecycleAudit([
      {
        id: 'lead-1',
        customerName: 'Cliente A',
        status: 'Instalado',
        monthKey: '2026-03',
        contractedMonthKey: '2026-04',
        installMonthKey: '2026-04',
        categoryName: 'Plano Novo',
      },
      {
        id: 'lead-2',
        customerName: 'Cliente B',
        status: 'Contratado',
        monthKey: '2026-04',
        contractedMonthKey: '2026-04',
        categoryName: 'Servicos Adicionais',
      },
    ], '2026-04');

    expect(audit.openedInMonth).toBe(1);
    expect(audit.contractedInMonth).toBe(2);
    expect(audit.installedInMonth).toBe(1);
    expect(audit.plansInMonth).toBe(1);
    expect(audit.svaInMonth).toBe(1);
    expect(audit.rows.find((row) => row.id === 'lead-1')?.openedInMonth).toBe(false);
    expect(audit.rows.find((row) => row.id === 'lead-1')?.includedInOfficialSales).toBe(true);
  });
});
