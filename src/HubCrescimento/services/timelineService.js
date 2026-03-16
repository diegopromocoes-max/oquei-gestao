import { db } from '../../firebase';
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';

export const addTimelineEvent = async ({
  actionPlanId,
  growthPlanId,
  planId,
  cityId,
  type,
  text,
  userId,
  meta,
}) => {
  const actionId = actionPlanId || planId;
  if (!actionId && !growthPlanId) return null;
  return addDoc(collection(db, 'growth_timeline'), {
    actionPlanId: actionId || null,
    growthPlanId: growthPlanId || null,
    cityId: cityId || null,
    type: type || 'event',
    text: text || '',
    meta: meta || null,
    createdAt: serverTimestamp(),
    createdBy: userId || 'system',
  });
};

export const listenTimelineEvents = ({ actionPlanId, growthPlanId, callback }) => {
  const conditions = [];
  if (actionPlanId) conditions.push(where('actionPlanId', '==', actionPlanId));
  if (growthPlanId) conditions.push(where('growthPlanId', '==', growthPlanId));

  const q = query(collection(db, 'growth_timeline'), ...conditions);
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => {
      const da = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
      const db = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
      return da - db;
    });
    callback(list);
  });
};
