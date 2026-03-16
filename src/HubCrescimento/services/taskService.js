import { db } from '../../firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { addTimelineEvent } from './timelineService';
import { syncGrowthPlanBudget } from './growthPlanService';

export const listenTasks = ({ uid, cityId, actionPlanId, callback }) => {
  const conditions = [];
  if (uid) conditions.push(where('responsibleUid', '==', uid));
  if (cityId && cityId !== '__all__') conditions.push(where('cityId', '==', cityId));
  if (actionPlanId) conditions.push(where('actionPlanId', '==', actionPlanId));

  const q = query(collection(db, 'action_tasks'), ...conditions);
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((t) => t.status !== 'deleted');
    list.sort((a, b) => String(a.deadline || '').localeCompare(String(b.deadline || '')));
    callback(list);
  });
};

export const createTask = async (actionPlanId, task, userData) => {
  const planRef = doc(db, 'action_plans', actionPlanId);
  const taskRef = doc(collection(db, 'action_tasks'));
  let planData = null;

  await runTransaction(db, async (tx) => {
    const planSnap = await tx.get(planRef);
    if (!planSnap.exists()) throw new Error('Plan not found');

    const plan = planSnap.data();
    planData = plan;
    if (plan.status === 'Finalizada') throw new Error('Plan finalized');
    const taskCount = Number(plan.taskCount || 0) + 1;
    const taskCompleted = Number(plan.taskCompleted || 0);
    const progress = taskCount > 0 ? Math.round((taskCompleted / taskCount) * 100) : 0;
    const extraCost = Number(task.budget || 0);
    const cost = Number(plan.cost || 0) + extraCost;
    const taskBudgetTotal = Number(plan.taskBudgetTotal || 0) + extraCost;

    tx.set(taskRef, {
      ...task,
      budget: extraCost,
      actionPlanId,
      growthPlanId: plan.growthPlanId || null,
      status: 'pending',
      createdAt: serverTimestamp(),
      createdBy: userData?.uid || 'system',
      updatedAt: serverTimestamp(),
      updatedBy: userData?.uid || 'system',
    });

    tx.update(planRef, {
      taskCount,
      progress,
      cost,
      taskBudgetTotal,
      updatedAt: serverTimestamp(),
      updatedBy: userData?.uid || 'system',
    });
  });

  await addTimelineEvent({
    actionPlanId,
    growthPlanId: planData?.growthPlanId || null,
    cityId: planData?.cityId || null,
    type: 'task_created',
    text: `Etapa criada: ${task.title || task.text || 'Sem titulo'}`,
    userId: userData?.uid || 'system',
    meta: {
      budget: Number(task.budget || 0),
      kpiId: task.kpiId || null,
      kpiName: task.kpiName || null,
    },
  });
  if (planData?.growthPlanId) {
    await syncGrowthPlanBudget(planData.growthPlanId, userData);
  }

  return taskRef.id;
};

export const completeTask = async (taskId, userData, completionReport = '', kpiResult = null) => {
  const taskRef = doc(db, 'action_tasks', taskId);
  const taskSnap = await getDoc(taskRef);
  if (!taskSnap.exists()) throw new Error('Task not found');

  const task = taskSnap.data();
  const planRef = doc(db, 'action_plans', task.actionPlanId);
  const report = String(completionReport || '').trim();
  const needsKpi = !!task.kpiEnabled;
  const parsedKpi = kpiResult === '' || kpiResult === null || kpiResult === undefined
    ? null
    : Number(kpiResult);
  if (needsKpi && (parsedKpi === null || Number.isNaN(parsedKpi))) {
    throw new Error('KPI result required');
  }
  let planData = null;

  await runTransaction(db, async (tx) => {
    const planSnap = await tx.get(planRef);
    if (!planSnap.exists()) throw new Error('Plan not found');

    const plan = planSnap.data();
    planData = plan;
    const taskCompleted = Number(plan.taskCompleted || 0) + 1;
    const taskCount = Number(plan.taskCount || 0);
    const progress = taskCount > 0 ? Math.round((taskCompleted / taskCount) * 100) : 0;
    const growthPlanId = task.growthPlanId || plan.growthPlanId || null;

    tx.update(taskRef, {
      status: 'done',
      completedAt: serverTimestamp(),
      completedBy: userData?.uid || 'system',
      completionReport: report || null,
      completionReportAt: report ? serverTimestamp() : null,
      completionReportBy: report ? userData?.uid || 'system' : null,
      kpiResult: parsedKpi,
      kpiResultAt: parsedKpi !== null ? serverTimestamp() : null,
      kpiResultBy: parsedKpi !== null ? userData?.uid || 'system' : null,
      growthPlanId: growthPlanId || null,
      updatedAt: serverTimestamp(),
      updatedBy: userData?.uid || 'system',
    });

    tx.update(planRef, {
      taskCompleted,
      progress,
      updatedAt: serverTimestamp(),
      updatedBy: userData?.uid || 'system',
    });
  });

  await addTimelineEvent({
    actionPlanId: task.actionPlanId,
    growthPlanId: task.growthPlanId || planData?.growthPlanId || null,
    cityId: task.cityId,
    type: 'task_done',
    text: `Etapa concluida: ${task.title || task.text || 'Sem titulo'}`,
    userId: userData?.uid || 'system',
    meta: {
      kpiId: task.kpiId || null,
      kpiName: task.kpiName || null,
      kpiResult: parsedKpi,
      report: report || null,
    },
  });
};

export const reopenTask = async (taskId, userData) => {
  const taskRef = doc(db, 'action_tasks', taskId);
  const taskSnap = await getDoc(taskRef);
  if (!taskSnap.exists()) throw new Error('Task not found');

  const task = taskSnap.data();
  const planRef = doc(db, 'action_plans', task.actionPlanId);
  let planData = null;

  await runTransaction(db, async (tx) => {
    const planSnap = await tx.get(planRef);
    if (!planSnap.exists()) throw new Error('Plan not found');

    const plan = planSnap.data();
    planData = plan;
    const taskCompleted = Math.max(0, Number(plan.taskCompleted || 0) - 1);
    const taskCount = Number(plan.taskCount || 0);
    const progress = taskCount > 0 ? Math.round((taskCompleted / taskCount) * 100) : 0;
    const growthPlanId = task.growthPlanId || plan.growthPlanId || null;

    tx.update(taskRef, {
      status: 'pending',
      completedAt: null,
      completedBy: null,
      completionReport: null,
      completionReportAt: null,
      completionReportBy: null,
      kpiResult: null,
      kpiResultAt: null,
      kpiResultBy: null,
      growthPlanId: growthPlanId || null,
      updatedAt: serverTimestamp(),
      updatedBy: userData?.uid || 'system',
    });

    tx.update(planRef, {
      taskCompleted,
      progress,
      updatedAt: serverTimestamp(),
      updatedBy: userData?.uid || 'system',
    });
  });

  await addTimelineEvent({
    actionPlanId: task.actionPlanId,
    growthPlanId: task.growthPlanId || planData?.growthPlanId || null,
    cityId: task.cityId,
    type: 'task_reopened',
    text: `Etapa reaberta: ${task.title || task.text || 'Sem titulo'}`,
    userId: userData?.uid || 'system',
  });
};

export const updateTask = async (taskId, payload, userData) => {
  return updateDoc(doc(db, 'action_tasks', taskId), {
    ...payload,
    updatedAt: serverTimestamp(),
    updatedBy: userData?.uid || 'system',
  });
};

export const deleteTask = async (taskId, userData) => {
  const taskRef = doc(db, 'action_tasks', taskId);
  const taskSnap = await getDoc(taskRef);
  if (!taskSnap.exists()) throw new Error('Task not found');

  const task = taskSnap.data();
  const planRef = doc(db, 'action_plans', task.actionPlanId);
  let planData = null;

  await runTransaction(db, async (tx) => {
    const planSnap = await tx.get(planRef);
    if (!planSnap.exists()) throw new Error('Plan not found');

    const plan = planSnap.data();
    planData = plan;
    const taskCount = Math.max(0, Number(plan.taskCount || 0) - 1);
    const taskCompleted = Math.max(0, Number(plan.taskCompleted || 0) - (task.status === 'done' ? 1 : 0));
    const progress = taskCount > 0 ? Math.round((taskCompleted / taskCount) * 100) : 0;
    const extraCost = Number(task.budget || 0);
    const cost = Math.max(0, Number(plan.cost || 0) - extraCost);
    const taskBudgetTotal = Math.max(0, Number(plan.taskBudgetTotal || 0) - extraCost);

    tx.update(taskRef, {
      status: 'deleted',
      deletedAt: serverTimestamp(),
      deletedBy: userData?.uid || 'system',
    });

    tx.update(planRef, {
      taskCount,
      taskCompleted,
      progress,
      cost,
      taskBudgetTotal,
      updatedAt: serverTimestamp(),
      updatedBy: userData?.uid || 'system',
    });
  });

  await addTimelineEvent({
    actionPlanId: task.actionPlanId,
    growthPlanId: task.growthPlanId || planData?.growthPlanId || null,
    cityId: task.cityId,
    type: 'task_deleted',
    text: `Etapa excluida: ${task.title || task.text || 'Sem titulo'}`,
    userId: userData?.uid || 'system',
  });

  if (planData?.growthPlanId) {
    await syncGrowthPlanBudget(planData.growthPlanId, userData);
  }
};

export const getTasksByAction = async (actionPlanId) => {
  if (!actionPlanId) return [];
  const q = query(collection(db, 'action_tasks'), where('actionPlanId', '==', actionPlanId));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((t) => t.status !== 'deleted');
  list.sort((a, b) => String(a.deadline || '').localeCompare(String(b.deadline || '')));
  return list;
};
