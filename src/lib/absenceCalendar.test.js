import { describe, expect, it } from 'vitest';

import { buildAbsenceCalendarEntries } from './absenceCalendar';

describe('absenceCalendar', () => {
  it('builds one public entry per day in the absence range', () => {
    const entries = buildAbsenceCalendarEntries('absence-1', {
      storeId: 'loja-1',
      storeName: 'Loja Centro',
      attendantId: 'att-1',
      attendantName: 'Maria Silva',
      type: 'falta',
      reason: 'Atestado',
      startDate: '2026-04-10',
      endDate: '2026-04-12',
      coverageMap: {
        '2026-04-11': 'volante-22',
        '2026-04-12': 'loja_fechada',
      },
      clusterId: 'cluster-1',
      status: 'Pendente',
    });

    expect(entries).toHaveLength(3);
    expect(entries[0]).toMatchObject({
      id: 'absence-1_2026-04-10',
      absenceId: 'absence-1',
      monthKey: '2026-04',
      storeName: 'Loja Centro',
      attendantFirstName: 'Maria',
      type: 'falta',
      reason: 'Atestado',
      coverage: null,
      isClosedStore: false,
    });
    expect(entries[1].coverage).toBe('volante-22');
    expect(entries[2].coverage).toBe('loja_fechada');
    expect(entries[2].isClosedStore).toBe(true);
  });

  it('returns an empty list when the range is invalid', () => {
    const entries = buildAbsenceCalendarEntries('absence-2', {
      startDate: '2026-04-20',
      endDate: '2026-04-10',
    });

    expect(entries).toEqual([]);
  });
});
