import { collection, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';

import { db } from '../firebase';
import { summarizeAttendantLeads } from './atendenteAnalyticsService';

// Normaliza cityId para lowercase para evitar mismatch entre o cadastro do atendente
// e o campo "to" da mensagem enviada pelo supervisor (ex: "centro" vs "Centro").
function normalizeCityId(value) {
  return String(value || '').trim().toLowerCase();
}

function uniqueRecipients(cityId, uid) {
  const normalized = normalizeCityId(cityId);
  // Inclui tanto o valor original quanto o normalizado para cobrir
  // mensagens gravadas antes desta correção.
  return Array.from(new Set(['all', cityId, normalized, uid].filter(Boolean)));
}

export function listenAtendenteStats(uid, monthKey, callback, onError) {
  const q = query(
    collection(db, 'leads'),
    where('attendantId', '==', uid),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const leads = snapshot.docs.map((document) => document.data());
      callback(summarizeAttendantLeads(leads, monthKey), null);
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
