import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db } from '../firebase';
import { buildAbsenceCalendarEntries } from '../lib/absenceCalendar';

const ABSENCE_CALENDAR_COLLECTION = 'absence_calendar_public';
const MAX_BATCH_OPERATIONS = 400;

function chunkArray(values = [], size = MAX_BATCH_OPERATIONS) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function commitOperations(operations = []) {
  const chunks = chunkArray(operations);

  for (const chunk of chunks) {
    const batch = writeBatch(db);

    chunk.forEach((operation) => {
      if (operation.type === 'delete') {
        batch.delete(operation.ref);
        return;
      }

      batch.set(operation.ref, operation.data, { merge: true });
    });

    await batch.commit();
  }
}

async function listExistingEntries(absenceId) {
  if (!absenceId) return [];
  const snapshot = await getDocs(
    query(collection(db, ABSENCE_CALENDAR_COLLECTION), where('absenceId', '==', absenceId)),
  );
  return snapshot.docs;
}

export async function deleteAbsenceCalendarEntries(absenceId) {
  const existingEntries = await listExistingEntries(absenceId);
  if (!existingEntries.length) return 0;

  await commitOperations(
    existingEntries.map((entry) => ({
      type: 'delete',
      ref: entry.ref,
    })),
  );

  return existingEntries.length;
}

export async function syncAbsenceCalendarEntries(absenceId, absence = {}) {
  if (!absenceId) return { entriesCount: 0 };

  const [existingEntries, nextEntries] = await Promise.all([
    listExistingEntries(absenceId),
    Promise.resolve(buildAbsenceCalendarEntries(absenceId, absence)),
  ]);

  const operations = [
    ...existingEntries.map((entry) => ({
      type: 'delete',
      ref: entry.ref,
    })),
    ...nextEntries.map((entry) => ({
      type: 'set',
      ref: doc(db, ABSENCE_CALENDAR_COLLECTION, entry.id),
      data: entry,
    })),
  ];

  if (!operations.length) {
    return { entriesCount: 0 };
  }

  await commitOperations(operations);
  return { entriesCount: nextEntries.length };
}

export async function reindexAbsenceCalendar(absences = []) {
  let syncedAbsences = 0;
  let syncedEntries = 0;

  for (const absence of absences) {
    if (!absence?.id) continue;
    const result = await syncAbsenceCalendarEntries(absence.id, absence);
    syncedAbsences += 1;
    syncedEntries += result.entriesCount;
  }

  return {
    syncedAbsences,
    syncedEntries,
  };
}
