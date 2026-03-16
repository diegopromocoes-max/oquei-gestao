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
