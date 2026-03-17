import { db } from '../../firebase';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

export const listenMeetings = ({ cityId, callback }) => {
  const conditions = [];
  if (cityId && cityId !== '__all__') conditions.push(where('cityId', '==', cityId));
  const q = query(collection(db, 'growth_meetings'), ...conditions);

  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => String(b.scheduledAt || b.createdAt || '').localeCompare(String(a.scheduledAt || a.createdAt || '')));
    callback(list);
  });
};

const buildScheduledAt = (date, time) => {
  if (!date) return null;
  const t = time || '00:00';
  const iso = new Date(`${date}T${t}:00`).toISOString();
  return iso;
};

export const createMeeting = async ({ cityId, title, date, time, participants, planIds, planNames }, userData) => {
  return addDoc(collection(db, 'growth_meetings'), {
    cityId: cityId || null,
    title: title || 'Reuniao de Growth',
    scheduledDate: date || null,
    scheduledTime: time || null,
    scheduledAt: buildScheduledAt(date, time),
    participants: Array.isArray(participants) ? participants : [],
    planIds: Array.isArray(planIds) ? planIds : [],
    planNames: Array.isArray(planNames) ? planNames : [],
    createdAt: serverTimestamp(),
    createdBy: userData?.uid || 'system',
  });
};

export const updateMeeting = async (meetingId, payload, userData) => {
  return updateDoc(doc(db, 'growth_meetings', meetingId), {
    ...payload,
    updatedAt: serverTimestamp(),
    updatedBy: userData?.uid || 'system',
  });
};

/**
 * RF02 — Converte um item de ata em Plano de Acao (action_plans) no status Backlog.
 * Registra o ID do plano gerado de volta na ata para rastreabilidade.
 */
export const convertAgendaItemToPlan = async (
  { meetingId, agendaItemIndex, agendaItem, cityId, growthPlanId, growthPlanName, month },
  userData,
  createPlanFn,
) => {
  if (!agendaItem?.text?.trim()) throw new Error('Item de ata sem texto.');

  // Cria o plano de acao no status Backlog
  const planRef = await createPlanFn(
    {
      name: agendaItem.text.trim(),
      description: `Originado da ata: "${agendaItem.text.trim()}"`,
      status: 'Backlog',
      cityId: cityId || null,
      growthPlanId: growthPlanId || null,
      growthPlanName: growthPlanName || null,
      month: month || null,
      cost: 0,
      originMeetingId: meetingId || null,
    },
    userData,
  );

  // Rastreia o link de volta na ata da reuniao
  if (meetingId) {
    const meetingRef = doc(db, 'growth_meetings', meetingId);
    const meetingSnap = await import('firebase/firestore').then(({ getDoc }) => getDoc(meetingRef));
    if (meetingSnap.exists()) {
      const items = Array.isArray(meetingSnap.data().agendaItems)
        ? [...meetingSnap.data().agendaItems]
        : [];
      if (items[agendaItemIndex] !== undefined) {
        items[agendaItemIndex] = { ...items[agendaItemIndex], convertedPlanId: planRef.id };
        await updateDoc(meetingRef, {
          agendaItems: items,
          updatedAt: serverTimestamp(),
          updatedBy: userData?.uid || 'system',
        });
      }
    }
  }

  return planRef;
};