import { db } from '../../firebase';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { addTimelineEvent } from './timelineService';
import { syncGrowthPlanBudget } from './growthPlanService';

const PLAN_TYPE = 'crescimento';

export const listenPlans = ({ cityId, month, growthPlanId, callback }) => {
  const conditions = [where('planType', '==', PLAN_TYPE)];
  if (month) conditions.push(where('month', '==', month));
  if (cityId && cityId !== '__all__') conditions.push(where('cityId', '==', cityId));
  if (growthPlanId) conditions.push(where('growthPlanId', '==', growthPlanId));

  const q = query(collection(db, 'action_plans'), ...conditions);
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => !p.deleted);
    list.sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
    callback(list);
  });
};

export const getPlans = async ({ cityId, month, growthPlanId } = {}) => {
  const conditions = [where('planType', '==', PLAN_TYPE)];
  if (month) conditions.push(where('month', '==', month));
  if (cityId && cityId !== '__all__') conditions.push(where('cityId', '==', cityId));
  if (growthPlanId) conditions.push(where('growthPlanId', '==', growthPlanId));

  const q = query(collection(db, 'action_plans'), ...conditions);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => !p.deleted);
};

export const createPlan = async (payload, userData) => {
  const data = {
    ...payload,
    planType: PLAN_TYPE,
    growthPlanId: payload.growthPlanId || null,
    growthPlanName: payload.growthPlanName || null,
    status: payload.status || 'Backlog',
    taskCount: payload.taskCount || 0,
    taskCompleted: payload.taskCompleted || 0,
    progress: payload.progress || 0,
    createdAt: serverTimestamp(),
    createdBy: userData?.uid || 'system',
    updatedAt: serverTimestamp(),
    updatedBy: userData?.uid || 'system',
  };
  const ref = await addDoc(collection(db, 'action_plans'), data);
  await addTimelineEvent({
    actionPlanId: ref.id,
    growthPlanId: data.growthPlanId || null,
    cityId: data.cityId || null,
    type: 'action_created',
    text: `Acao criada: ${data.name || 'Sem nome'}`,
    userId: userData?.uid || 'system',
    meta: { budget: Number(data.cost || 0) },
  });
  if (data.growthPlanId) {
    await syncGrowthPlanBudget(data.growthPlanId, userData);
  }
  return ref;
};

export const updatePlan = async (id, payload, userData) => {
  const data = {
    ...payload,
    updatedAt: serverTimestamp(),
    updatedBy: userData?.uid || 'system',
  };
  return updateDoc(doc(db, 'action_plans', id), data);
};

export const updatePlanStatus = async (id, status, userData, options = {}) => {
  const report = String(options.completionReport || '').trim();
  const payload = { status };

  if (status === 'Finalizada') {
    payload.completedAt = serverTimestamp();
    payload.completedBy = userData?.uid || 'system';
    payload.completionReport = report || null;
    payload.completionReportAt = report ? serverTimestamp() : null;
    payload.completionReportBy = report ? userData?.uid || 'system' : null;
  } else {
    payload.completedAt = null;
    payload.completedBy = null;
    payload.completionReport = null;
    payload.completionReportAt = null;
    payload.completionReportBy = null;
  }

  const planSnap = await getDoc(doc(db, 'action_plans', id));
  const plan = planSnap.exists() ? planSnap.data() : {};
  await updatePlan(id, payload, userData);
  await addTimelineEvent({
    actionPlanId: id,
    growthPlanId: plan.growthPlanId || null,
    cityId: plan.cityId || null,
    type: 'action_status',
    text: `Acao ${plan.name || ''} -> ${status}`,
    userId: userData?.uid || 'system',
    meta: { status, report: report || null },
  });
};

export const deleteActionPlan = async (id, userData) => {
  const planSnap = await getDoc(doc(db, 'action_plans', id));
  const plan = planSnap.exists() ? planSnap.data() : {};
  await updateDoc(doc(db, 'action_plans', id), {
    deleted: true,
    status: 'Cancelada',
    deletedAt: serverTimestamp(),
    deletedBy: userData?.uid || 'system',
    updatedAt: serverTimestamp(),
    updatedBy: userData?.uid || 'system',
  });

  const q = query(collection(db, 'action_tasks'), where('actionPlanId', '==', id));
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.update(d.ref, {
      status: 'deleted',
      deletedAt: serverTimestamp(),
      deletedBy: userData?.uid || 'system',
    });
  });
  await batch.commit();

  if (plan.growthPlanId) {
    await syncGrowthPlanBudget(plan.growthPlanId, userData);
  }
};
