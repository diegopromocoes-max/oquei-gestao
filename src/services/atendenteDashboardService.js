import { collection, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';

import { db } from '../firebase';
import { summarizeAttendantLeads } from './atendenteAnalyticsService';

function uniqueRecipients(cityId, uid) {
  return Array.from(new Set(['all', cityId, uid].filter(Boolean)));
}

export function listenAtendenteStats(uid, monthKey, callback, onError) {
  const q = query(
    collection(db, 'leads'),
    where('attendantId', '==', uid),
    where('monthKey', '==', monthKey),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const leads = snapshot.docs.map((document) => document.data());
      callback(summarizeAttendantLeads(leads), null);
    },
    (error) => {
      onError?.(error);
      callback(null, error);
    },
  );
}

export function listenMessages(cityId, uid, callback, onError) {
  const recipients = uniqueRecipients(cityId, uid);
  const q = query(
    collection(db, 'messages'),
    where('to', 'in', recipients),
    orderBy('createdAt', 'desc'),
    limit(5),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    },
    (error) => {
      onError?.(error);
      callback([]);
    },
  );
}

export function listenPublicAbsenceCalendar(monthKey, callback, onError) {
  const q = query(
    collection(db, 'absence_calendar_public'),
    where('monthKey', '==', monthKey),
    orderBy('date', 'asc'),
  );

  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    (error) => {
      onError?.(error);
      callback([]);
    },
  );
}

export async function listGrowthActionsForCity(cityId) {
  if (!cityId) {
    return [];
  }

  const q = query(
    collection(db, 'action_plans'),
    where('status', '==', 'Em Andamento'),
    where('cityId', 'in', [cityId, '__all__']),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')));
}
