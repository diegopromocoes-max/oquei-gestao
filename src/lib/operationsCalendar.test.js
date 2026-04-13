import { buildOperationalCalendar } from './operationsCalendar';

describe('operationsCalendar', () => {
  it('calculates working days excluding store holidays', () => {
    const [storeCalendar] = buildOperationalCalendar({
      monthKey: '2026-04',
      stores: [{ id: 'store-1', name: 'Loja Centro', clusterId: 'cluster-a' }],
      holidays: [{ id: 'holiday-1', date: '2026-04-21', type: 'municipal', storeId: 'store-1', name: 'Aniversario' }],
    });

    const day = storeCalendar.days.find((item) => item.date === '2026-04-21');
    expect(day.holidays).toHaveLength(1);
    expect(day.isWorkingDay).toBe(false);
  });

  it('marks absence coverage and store closure in the consolidated day', () => {
    const [storeCalendar] = buildOperationalCalendar({
      monthKey: '2026-04',
      stores: [{ id: 'store-1', name: 'Loja Centro', clusterId: 'cluster-a' }],
      absences: [
        {
          id: 'absence-1',
          storeId: 'store-1',
          attendantId: 'att-1',
          attendantName: 'Patrick Silva',
          type: 'atestado',
          startDate: '2026-04-10',
          endDate: '2026-04-10',
          coverageMap: {
            '2026-04-10': 'loja_fechada',
          },
          approvalStatus: 'Aprovado',
        },
      ],
    });

    const day = storeCalendar.days.find((item) => item.date === '2026-04-10');
    expect(day.absences).toHaveLength(1);
    expect(day.coverageStatus).toBe('closed');
    expect(day.isClosedStore).toBe(true);
  });
});
