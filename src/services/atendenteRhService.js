import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';

import { db } from '../firebase';

export async function listMyRhRequests(uid) {
  if (!uid) {
    return [];
  }

  const snapshot = await getDocs(query(collection(db, 'rh_requests'), where('attendantId', '==', uid)));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((left, right) => (right.createdAt?.seconds || 0) - (left.createdAt?.seconds || 0));
}

export async function createRhRequest(payload) {
  return addDoc(collection(db, 'rh_requests'), {
    ...payload,
    createdAt: serverTimestamp(),
  });
}
