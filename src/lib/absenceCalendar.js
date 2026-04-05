function normalizeTimestamp(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeDateKey(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = normalizeTimestamp(value);
  if (!date) return '';
  return date.toISOString().slice(0, 10);
}

export function buildAbsenceCalendarEntries(absenceId, absence = {}) {
  const startDate = normalizeDateKey(absence.startDate || absence.date || absence.createdAt);
  const endDate = normalizeDateKey(absence.endDate || absence.startDate || absence.date || absence.createdAt);
  if (!startDate || !endDate) return [];

  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

  const storeId = absence.storeId || absence.cityId || absence.storeName || 'Geral';
  const storeName = absence.storeName || absence.cityName || absence.storeId || absence.cityId || 'Geral';
  const attendantId = absence.attendantId || absence.employeeId || '';
  const attendantName = absence.attendantName || absence.employeeName || attendantId || 'Colaborador';
  const attendantFirstName = String(attendantName).trim().split(' ')[0] || 'Colaborador';
  const type = String(absence.type || absence.typeOccurrence || absence.reason || 'ausencia');
  const coverageMap = absence.coverageMap || {};
  const entries = [];

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const date = cursor.toISOString().slice(0, 10);
    const coverage = coverageMap[date] || absence.coverage || null;

    entries.push({
      id: `${absenceId}_${date}`,
      absenceId,
      monthKey: date.slice(0, 7),
      date,
      storeId,
      storeName,
      attendantId,
      attendantName,
      attendantFirstName,
      type,
      reason: absence.reason || '',
      coverage,
      status: absence.status || '',
      clusterId: absence.clusterId || '',
      isClosedStore: coverage === 'loja_fechada' || absence.isClosedStore === true,
      updatedAt: new Date().toISOString(),
    });
  }

  return entries;
}
