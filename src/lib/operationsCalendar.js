function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function normalizeDateKey(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }

  if (typeof value?.toDate === 'function') {
    return value.toDate().toISOString().slice(0, 10);
  }

  if (typeof value?.seconds === 'number') {
    return new Date(value.seconds * 1000).toISOString().slice(0, 10);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

export function getDatesInRange(startDate, endDate) {
  const start = normalizeDateKey(startDate);
  const end = normalizeDateKey(endDate || startDate);
  if (!start || !end) return [];

  const cursor = new Date(`${start}T12:00:00`);
  const stop = new Date(`${end}T12:00:00`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(stop.getTime()) || cursor > stop) {
    return [];
  }

  const dates = [];
  while (cursor <= stop) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function buildMonthDates(monthKey) {
  if (!/^\d{4}-\d{2}$/.test(String(monthKey || ''))) {
    return [];
  }

  const [year, month] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) =>
    `${monthKey}-${String(index + 1).padStart(2, '0')}`
  );
}

function isHolidayForStore(holiday = {}, store = {}) {
  if (!holiday) return false;
  const holidayType = String(holiday.type || '').toLowerCase();
  if (holidayType === 'company' || holidayType === 'national') return true;
  return holiday.storeId === store.id;
}

function buildStoreIndex(stores = []) {
  return stores.reduce((accumulator, store) => {
    accumulator[store.id] = store;
    return accumulator;
  }, {});
}

function resolveEventStoreIds(event = {}, stores = []) {
  const directStoreId = String(event.storeId || event.cityId || '').trim();
  if (directStoreId === '__all__') {
    return stores.map((store) => store.id);
  }
  if (directStoreId) {
    return stores.some((store) => store.id === directStoreId) ? [directStoreId] : [];
  }

  const eventCity = normalizeText(event.city || event.cityName || event.storeName);
  if (!eventCity) return [];

  return stores
    .filter((store) => {
      const storeKeys = [store.id, store.name, store.city, store.cityName].map(normalizeText);
      return storeKeys.includes(eventCity);
    })
    .map((store) => store.id);
}

function buildAbsenceDaySummary(absences = [], date) {
  if (!absences.length) {
    return {
      items: [],
      coverageStatus: 'none',
      isClosedStore: false,
    };
  }

  const items = absences.map((absence) => {
    const coverage = absence.coverageMap?.[date] || '';
    return {
      id: absence.id,
      attendantId: absence.attendantId || '',
      attendantName: absence.attendantName || absence.employeeName || 'Colaborador',
      type: absence.type || 'ausencia',
      startTime: absence.startTime || '',
      endTime: absence.endTime || '',
      isFullDay: absence.isFullDay !== false,
      reason: absence.reason || '',
      coverage,
      isClosedStore: coverage === 'loja_fechada',
    };
  });

  const hasClosedStore = items.some((item) => item.isClosedStore);
  const hasPendingCoverage = items.some((item) => !item.coverage);

  return {
    items,
    coverageStatus: hasClosedStore ? 'closed' : hasPendingCoverage ? 'pending' : 'covered',
    isClosedStore: hasClosedStore,
  };
}

export function buildOperationalCalendar({
  monthKey,
  stores = [],
  holidays = [],
  shifts = [],
  absences = [],
  marketingActions = [],
  growthEvents = [],
}) {
  const monthDates = buildMonthDates(monthKey);
  const storeIndex = buildStoreIndex(stores);

  const holidayMap = {};
  holidays.forEach((holiday) => {
    const date = normalizeDateKey(holiday.date);
    if (!date || !date.startsWith(monthKey)) return;
    stores.forEach((store) => {
      if (!isHolidayForStore(holiday, store)) return;
      const key = `${store.id}_${date}`;
      if (!holidayMap[key]) holidayMap[key] = [];
      holidayMap[key].push({
        id: holiday.id,
        name: holiday.name || 'Feriado',
        type: holiday.type || 'municipal',
      });
    });
  });

  const shiftMap = {};
  shifts.forEach((shift) => {
    const date = normalizeDateKey(shift.date);
    const storeId = String(shift.storeId || '').trim();
    if (!date.startsWith(monthKey) || !storeId) return;
    const key = `${storeId}_${date}`;
    if (!shiftMap[key]) shiftMap[key] = [];
    shiftMap[key].push({
      id: shift.id,
      attendantId: shift.attendantId || '',
      attendantName: shift.attendantName || 'Colaborador',
      shiftLabel: shift.shiftLabel || 'Escala',
      startTime: shift.startTime || '',
      endTime: shift.endTime || '',
      source: shift.source || 'manual',
    });
  });

  const absenceMap = {};
  absences.forEach((absence) => {
    const approvalStatus = String(absence.approvalStatus || absence.status || '').toLowerCase();
    if (approvalStatus.includes('rejeit')) return;

    const storeId = String(absence.storeId || '').trim();
    if (!storeId || !storeIndex[storeId]) return;

    getDatesInRange(absence.startDate, absence.endDate).forEach((date) => {
      if (!date.startsWith(monthKey)) return;
      const key = `${storeId}_${date}`;
      if (!absenceMap[key]) absenceMap[key] = [];
      absenceMap[key].push(absence);
    });
  });

  const eventMap = {};
  [...marketingActions, ...growthEvents].forEach((event) => {
    const date = normalizeDateKey(event.date || event.dateEvent || event.startDate || event.createdAt);
    if (!date.startsWith(monthKey)) return;
    const storeIds = resolveEventStoreIds(event, stores);
    storeIds.forEach((storeId) => {
      const key = `${storeId}_${date}`;
      if (!eventMap[key]) eventMap[key] = [];
      eventMap[key].push({
        id: event.id,
        title: event.title || event.activity || event.name || 'Evento',
        type: event.type || 'evento',
        source: event.requesterName ? 'marketing_actions' : 'growth_events',
      });
    });
  });

  return stores.map((store) => {
    const days = monthDates.map((date) => {
      const dateObj = new Date(`${date}T12:00:00`);
      const weekday = dateObj.getDay();
      const key = `${store.id}_${date}`;
      const dayHolidays = holidayMap[key] || [];
      const absenceSummary = buildAbsenceDaySummary(absenceMap[key] || [], date);
      const isWeekend = weekday === 0 || weekday === 6;
      const isWorkingDay = !isWeekend && dayHolidays.length === 0;

      return {
        date,
        weekday,
        isWeekend,
        isWorkingDay,
        holidays: dayHolidays,
        shifts: shiftMap[key] || [],
        absences: absenceSummary.items,
        events: eventMap[key] || [],
        coverageStatus: absenceSummary.coverageStatus,
        isClosedStore: absenceSummary.isClosedStore,
      };
    });

    return {
      storeId: store.id,
      storeName: store.name || store.cityName || store.id,
      clusterId: store.clusterId || '',
      workingDaysCount: days.filter((day) => day.isWorkingDay).length,
      days,
    };
  });
}
