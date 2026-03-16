import { db } from '../../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export const addTimelineEvent = async ({ planId, cityId, type, text, userId }) => {
  if (!planId) return null;
  return addDoc(collection(db, 'growth_timeline'), {
    planId,
    cityId: cityId || null,
    type: type || 'event',
    text: text || '',
    createdAt: serverTimestamp(),
    createdBy: userId || 'system',
  });
};
