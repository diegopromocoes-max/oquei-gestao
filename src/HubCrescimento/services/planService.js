import { db } from '../../firebase';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

const PLAN_TYPE = 'crescimento';

export const listenPlans = ({ cityId, month, callback }) => {
  const conditions = [where('planType', '==', PLAN_TYPE)];
  if (month) conditions.push(where('month', '==', month));
  if (cityId && cityId !== '__all__') conditions.push(where('cityId', '==', cityId));

  const q = query(collection(db, 'action_plans'), ...conditions);
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
    callback(list);
  });
};

export const getPlans = async ({ cityId, month } = {}) => {
  const conditions = [where('planType', '==', PLAN_TYPE)];
  if (month) conditions.push(where('month', '==', month));
  if (cityId && cityId !== '__all__') conditions.push(where('cityId', '==', cityId));

  const q = query(collection(db, 'action_plans'), ...conditions);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const createPlan = async (payload, userData) => {
  const data = {
    ...payload,
    planType: PLAN_TYPE,
    status: payload.status || 'Backlog',
    taskCount: payload.taskCount || 0,
    taskCompleted: payload.taskCompleted || 0,
    progress: payload.progress || 0,
    createdAt: serverTimestamp(),
    createdBy: userData?.uid || 'system',
    updatedAt: serverTimestamp(),
    updatedBy: userData?.uid || 'system',
  };
  return addDoc(collection(db, 'action_plans'), data);
};

export const updatePlan = async (id, payload, userData) => {
  const data = {
    ...payload,
    updatedAt: serverTimestamp(),
    updatedBy: userData?.uid || 'system',
  };
  return updateDoc(doc(db, 'action_plans', id), data);
};

export const updatePlanStatus = async (id, status, userData) => {
  return updatePlan(id, { status }, userData);
};
