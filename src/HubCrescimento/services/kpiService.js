import { db } from '../../firebase';
import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
} from 'firebase/firestore';

const sortByName = (list) =>
  list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

export const listenKpis = (callback) => {
  const q = query(collection(db, 'growth_kpis'));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(sortByName(list));
  });
};

export const getKpis = async () => {
  const snap = await getDocs(collection(db, 'growth_kpis'));
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return sortByName(list);
};

export const createKpi = async ({ name, category }, userData) => {
  if (!name) throw new Error('KPI name required');
  const ref = await addDoc(collection(db, 'growth_kpis'), {
    name,
    category: category || null,
    createdAt: serverTimestamp(),
    createdBy: userData?.uid || 'system',
  });
  return ref.id;
};
