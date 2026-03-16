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
import { addTimelineEvent } from './timelineService';

export const listenGrowthPlans = ({ cityId, month, callback }) => {
  const conditions = [];
  if (cityId && cityId !== '__all__') conditions.push(where('cityId', '==', cityId));
  if (month) conditions.push(where('month', '==', month));
  const q = query(collection(db, 'growth_plans'), ...conditions);
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => !p.deleted);
    list.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    callback(list);
  });
};

export const createGrowthPlan = async (payload, userData) => {
  const data = {
    ...payload,
    status: payload.status || 'Ativo',
    budgetTotal: payload.budgetTotal || 0,
    createdAt: serverTimestamp(),
    createdBy: userData?.uid || 'system',
    updatedAt: serverTimestamp(),
    updatedBy: userData?.uid || 'system',
  };
  const ref = await addDoc(collection(db, 'growth_plans'), data);
  await addTimelineEvent({
    growthPlanId: ref.id,
    cityId: data.cityId || null,
    type: 'plan_created',
    text: `Plano criado: ${data.name || 'Sem nome'}`,
    userId: userData?.uid || 'system',
  });
  return ref;
};

export const syncGrowthPlanBudget = async (growthPlanId, userData) => {
  if (!growthPlanId) return 0;
  const q = query(collection(db, 'action_plans'), where('growthPlanId', '==', growthPlanId));
  const snap = await getDocs(q);
  const total = snap.docs
    .map((d) => d.data())
    .filter((p) => !p.deleted)
    .reduce((sum, p) => sum + Number(p.cost || 0), 0);

  await updateDoc(doc(db, 'growth_plans', growthPlanId), {
    budgetTotal: total,
    budgetUpdatedAt: serverTimestamp(),
    budgetUpdatedBy: userData?.uid || 'system',
  });

  return total;
};

export const updateGrowthPlan = async (id, payload, userData) => {
  const data = {
    ...payload,
    updatedAt: serverTimestamp(),
    updatedBy: userData?.uid || 'system',
  };
  return updateDoc(doc(db, 'growth_plans', id), data);
};

export const finalizeGrowthPlan = async (id, completionReport, userData) => {
  const report = String(completionReport || '').trim();
  return updateGrowthPlan(id, {
    status: 'Finalizado',
    completedAt: serverTimestamp(),
    completedBy: userData?.uid || 'system',
    completionReport: report || null,
    completionReportAt: report ? serverTimestamp() : null,
    completionReportBy: report ? userData?.uid || 'system' : null,
  }, userData);
};

export const deleteGrowthPlan = async (id, userData) => {
  return updateDoc(doc(db, 'growth_plans', id), {
    deleted: true,
    status: 'Inativo',
    deletedAt: serverTimestamp(),
    deletedBy: userData?.uid || 'system',
    updatedAt: serverTimestamp(),
    updatedBy: userData?.uid || 'system',
  });
};
