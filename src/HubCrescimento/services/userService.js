import { db } from '../../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export const getUsers = async ({ cityId, clusterId, fallbackAll = false } = {}) => {
  const queries = [];
  if (cityId && cityId !== '__all__') {
    queries.push(query(collection(db, 'users'), where('cityId', '==', cityId)));
  }
  if (clusterId) {
    queries.push(query(collection(db, 'users'), where('clusterId', '==', clusterId)));
  }
  if (queries.length === 0) {
    queries.push(collection(db, 'users'));
  }

  const snaps = await Promise.all(queries.map((q) => getDocs(q)));
  const map = new Map();
  snaps.forEach((snap) => {
    snap.docs.forEach((d) => {
      map.set(d.id, { id: d.id, ...d.data() });
    });
  });

  let list = Array.from(map.values())
    .filter((u) => u.active !== false)
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));

  if (fallbackAll && list.length === 0) {
    const allSnap = await getDocs(collection(db, 'users'));
    list = allSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((u) => u.active !== false)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }

  return list;
};
