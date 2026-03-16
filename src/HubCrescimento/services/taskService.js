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

export const listenTasks = ({ uid, cityId, planId, callback }) => {
  const conditions = [];
  if (uid) conditions.push(where('responsibleUid', '==', uid));
  if (cityId && cityId !== '__all__') conditions.push(where('cityId', '==', cityId));
  if (planId) conditions.push(where('planId', '==', planId));

  const q = query(collection(db, 'action_tasks'), ...conditions);
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => String(a.deadline || '').localeCompare(String(b.deadline || '')));
    callback(list);
  });
};

export const createTask = async (planId, task, userData) => {
  const planRef = doc(db, 'action_plans', planId);
  const taskRef = doc(collection(db, 'action_tasks'));

  await runTransaction(db, async (tx) => {
    const planSnap = await tx.get(planRef);
    if (!planSnap.exists()) throw new Error('Plan not found');

    const plan = planSnap.data();
    const taskCount = Number(plan.taskCount || 0) + 1;
    const taskCompleted = Number(plan.taskCompleted || 0);
    const progress = taskCount > 0 ? Math.round((taskCompleted / taskCount) * 100) : 0;

    tx.set(taskRef, {
      ...task,
      planId,
      status: 'pending',
      createdAt: serverTimestamp(),
      createdBy: userData?.uid || 'system',
      updatedAt: serverTimestamp(),
      updatedBy: userData?.uid || 'system',
    });

    tx.update(planRef, {
      taskCount,
      progress,
      updatedAt: serverTimestamp(),
      updatedBy: userData?.uid || 'system',
    });
  });

  return taskRef.id;
};

export const completeTask = async (taskId, userData) => {
  const taskRef = doc(db, 'action_tasks', taskId);
  const taskSnap = await getDoc(taskRef);
  if (!taskSnap.exists()) throw new Error('Task not found');

  const task = taskSnap.data();
  const planRef = doc(db, 'action_plans', task.planId);

  await runTransaction(db, async (tx) => {
    const planSnap = await tx.get(planRef);
    if (!planSnap.exists()) throw new Error('Plan not found');

    const plan = planSnap.data();
    const taskCompleted = Number(plan.taskCompleted || 0) + 1;
    const taskCount = Number(plan.taskCount || 0);
    const progress = taskCount > 0 ? Math.round((taskCompleted / taskCount) * 100) : 0;

    tx.update(taskRef, {
      status: 'done',
      completedAt: serverTimestamp(),
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
    planId: task.planId,
    cityId: task.cityId,
    type: 'task_done',
    text: `Task concluida: ${task.title || task.text || 'Sem titulo'}`,
    userId: userData?.uid || 'system',
  });
};

export const reopenTask = async (taskId, userData) => {
  const taskRef = doc(db, 'action_tasks', taskId);
  const taskSnap = await getDoc(taskRef);
  if (!taskSnap.exists()) throw new Error('Task not found');

  const task = taskSnap.data();
  const planRef = doc(db, 'action_plans', task.planId);

  await runTransaction(db, async (tx) => {
    const planSnap = await tx.get(planRef);
    if (!planSnap.exists()) throw new Error('Plan not found');

    const plan = planSnap.data();
    const taskCompleted = Math.max(0, Number(plan.taskCompleted || 0) - 1);
    const taskCount = Number(plan.taskCount || 0);
    const progress = taskCount > 0 ? Math.round((taskCompleted / taskCount) * 100) : 0;

    tx.update(taskRef, {
      status: 'pending',
      completedAt: null,
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
};

export const updateTask = async (taskId, payload, userData) => {
  return updateDoc(doc(db, 'action_tasks', taskId), {
    ...payload,
    updatedAt: serverTimestamp(),
    updatedBy: userData?.uid || 'system',
  });
};

export const deleteTask = async (taskId) => {
  return updateDoc(doc(db, 'action_tasks', taskId), { status: 'deleted' });
};

export const getTasksByPlan = async (planId) => {
  if (!planId) return [];
  const q = query(collection(db, 'action_tasks'), where('planId', '==', planId));
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  list.sort((a, b) => String(a.deadline || '').localeCompare(String(b.deadline || '')));
  return list;
};
