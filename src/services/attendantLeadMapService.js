import { collection, onSnapshot, query, where } from 'firebase/firestore';

import { db } from '../firebase';

export function listenAttendantLeadMap(uid, monthKey, callback, onError) {
  if (!uid || !monthKey) {
    callback([]);
    return () => {};
  }

  const constraints = [
    where('attendantId', '==', uid),
    where('monthKey', '==', monthKey),
  ];

  const q = query(collection(db, 'leads'), ...constraints);
  return onSnapshot(
    q,
    (snapshot) => {
      const leads = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));
      callback(leads);
    },
    (error) => {
      onError?.(error);
      callback([]);
    },
  );
}
