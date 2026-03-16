import { db } from '../../firebase';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
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
    list.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    callback(list);
  });
};

export const createMeeting = async ({ cityId, title }, userData) => {
  return addDoc(collection(db, 'growth_meetings'), {
    cityId: cityId || null,
    title: title || 'Reuniao de Growth',
    items: [],
    createdAt: serverTimestamp(),
    createdBy: userData?.uid || 'system',
  });
};

export const addMeetingItem = async (meetingId, text, userData) => {
  const ref = doc(db, 'growth_meetings', meetingId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Meeting not found');
    const data = snap.data();
    const items = Array.isArray(data.items) ? data.items : [];

    items.push({
      id: String(Date.now()),
      text,
      createdAt: new Date().toISOString(),
      createdBy: userData?.uid || 'system',
      convertedPlanId: null,
    });

    tx.update(ref, { items });
  });
};

export const updateMeetingItems = async (meetingId, items) => {
  return updateDoc(doc(db, 'growth_meetings', meetingId), { items });
};
