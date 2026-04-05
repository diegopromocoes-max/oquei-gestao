const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

function normalizeDateKey(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString().slice(0, 10);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function deriveMonthKey(value) {
  const dateKey = normalizeDateKey(value);
  return dateKey ? dateKey.slice(0, 7) : new Date().toISOString().slice(0, 7);
}

function normalizeLeadTypeValue(value = '') {
  const normalized = String(value || '').trim();
  return normalized || 'Lead';
}

function buildAbsenceEntries(absenceId, absence = {}) {
  const startDate = normalizeDateKey(absence.startDate || absence.date || absence.createdAt);
  const endDate = normalizeDateKey(absence.endDate || absence.startDate || absence.date || absence.createdAt);
  if (!startDate || !endDate) return [];

  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

  const storeId = absence.storeId || absence.cityId || absence.storeName || 'Geral';
  const storeName = absence.storeName || absence.cityName || absence.storeId || absence.cityId || 'Geral';
  const attendantName = absence.attendantName || absence.employeeName || 'Colaborador';
  const attendantFirstName = String(attendantName).split(' ')[0] || 'Colaborador';
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
      attendantFirstName,
      type,
      coverage,
      isClosedStore: coverage === 'loja_fechada' || absence.isClosedStore === true,
      updatedAt: new Date().toISOString(),
    });
  }

  return entries;
}

async function backfillLeads() {
  const snapshot = await db.collection('leads').get();
  let batch = db.batch();
  let operations = 0;

  for (const document of snapshot.docs) {
    const data = document.data();
    const monthKey = deriveMonthKey(data.date || data.createdAt || data.lastUpdate);
    const leadType = data.leadType || normalizeLeadTypeValue(data.categoryName || data.productName || data.status);

    if (data.monthKey === monthKey && data.leadType === leadType) {
      continue;
    }

    batch.set(document.ref, { monthKey, leadType, updatedAt: new Date().toISOString() }, { merge: true });
    operations += 1;

    if (operations % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  if (operations % 400 !== 0) {
    await batch.commit();
  }

  return operations;
}

async function rebuildAbsenceCalendar() {
  const existing = await db.collection('absence_calendar_public').get();
  if (!existing.empty) {
    let deleteBatch = db.batch();
    let deletions = 0;

    for (const document of existing.docs) {
      deleteBatch.delete(document.ref);
      deletions += 1;
      if (deletions % 400 === 0) {
        await deleteBatch.commit();
        deleteBatch = db.batch();
      }
    }

    if (deletions % 400 !== 0) {
      await deleteBatch.commit();
    }
  }

  const absences = await db.collection('absences').get();
  let writeBatch = db.batch();
  let writes = 0;

  for (const document of absences.docs) {
    const entries = buildAbsenceEntries(document.id, document.data());
    for (const entry of entries) {
      writeBatch.set(db.collection('absence_calendar_public').doc(entry.id), entry, { merge: true });
      writes += 1;
      if (writes % 400 === 0) {
        await writeBatch.commit();
        writeBatch = db.batch();
      }
    }
  }

  if (writes % 400 !== 0) {
    await writeBatch.commit();
  }

  return writes;
}

async function main() {
  const leadsUpdated = await backfillLeads();
  const calendarEntries = await rebuildAbsenceCalendar();

  console.log(`Leads atualizados: ${leadsUpdated}`);
  console.log(`Entradas em absence_calendar_public: ${calendarEntries}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
