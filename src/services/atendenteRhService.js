import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '../firebase';
import { normalizeRole, ROLE_KEYS } from '../lib/roleUtils';

function normalizeStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) return 'Pendente';
  if (normalized === 'approved' || normalized === 'aprovado') return 'Aprovado';
  if (normalized === 'rejected' || normalized === 'rejeitado') return 'Rejeitado';
  return 'Pendente';
}

function normalizeRhRequest(item = {}) {
  const attendantId = item.attendantId || item.employeeId || item.targetId || '';
  const attendantName = item.attendantName || item.employeeName || item.targetName || 'Colaborador';
  const targetId = item.targetId || item.attendantId || item.employeeId || '';
  const targetName = item.targetName || item.attendantName || item.employeeName || attendantName;
  const storeId = item.storeId || item.cityId || '';
  const storeName = item.storeName || item.cityName || item.storeId || item.cityId || 'Sem loja';
  const startDate = item.startDate || item.dateEvent || item.date || '';
  const endDate = item.endDate || startDate;

  return {
    ...item,
    attendantId,
    attendantName,
    targetId,
    targetName,
    storeId,
    cityId: item.cityId || storeId,
    storeName,
    cityName: item.cityName || storeName,
    supervisorUid: item.supervisorUid || item.supervisorId || '',
    clusterId: item.clusterId || '',
    startDate,
    endDate,
    description: item.description || item.justification || item.obs || '',
    status: normalizeStatus(item.status),
  };
}

function sortByRecent(items = []) {
  return [...items].sort((left, right) => {
    const leftValue = left.updatedAt?.seconds || left.createdAt?.seconds || 0;
    const rightValue = right.updatedAt?.seconds || right.createdAt?.seconds || 0;
    return rightValue - leftValue;
  });
}

function getScope(userData = {}) {
  const role = normalizeRole(userData.role);
  return {
    role,
    isCoordinator: role === ROLE_KEYS.COORDINATOR,
    clusterId: String(userData.clusterId || userData.cluster || '').trim(),
    uid: String(userData.uid || '').trim(),
  };
}

function uniqById(items = []) {
  const map = new Map();
  items.forEach((item) => {
    if (item?.id) map.set(item.id, item);
  });
  return [...map.values()];
}

async function listStoresByCluster(clusterId) {
  if (!clusterId) return [];
  const snapshot = await getDocs(query(collection(db, 'cities'), where('clusterId', '==', clusterId)));
  return snapshot.docs.map((item) => item.id);
}

async function listEmployeesByCluster(clusterId) {
  if (!clusterId) return [];
  const snapshot = await getDocs(query(collection(db, 'users'), where('clusterId', '==', clusterId)));
  return snapshot.docs.map((item) => item.id);
}

async function listRequestsByStoreIds(storeIds = []) {
  const uniqueStoreIds = [...new Set(storeIds.filter(Boolean))];
  if (!uniqueStoreIds.length) return [];

  const chunks = [];
  for (let index = 0; index < uniqueStoreIds.length; index += 10) {
    chunks.push(uniqueStoreIds.slice(index, index + 10));
  }

  const snapshots = await Promise.all(
    chunks.map((chunk) =>
      Promise.all([
        getDocs(query(collection(db, 'rh_requests'), where('storeId', 'in', chunk))),
        getDocs(query(collection(db, 'rh_requests'), where('cityId', 'in', chunk))),
      ])
    )
  );

  return snapshots
    .flat()
    .flatMap((snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
}

async function listRequestsByEmployeeIds(fieldName, employeeIds = []) {
  const uniqueEmployeeIds = [...new Set(employeeIds.filter(Boolean))];
  if (!uniqueEmployeeIds.length) return [];

  const chunks = [];
  for (let index = 0; index < uniqueEmployeeIds.length; index += 10) {
    chunks.push(uniqueEmployeeIds.slice(index, index + 10));
  }

  const snapshots = await Promise.all(
    chunks.map((chunk) =>
      getDocs(query(collection(db, 'rh_requests'), where(fieldName, 'in', chunk)))
    )
  );

  return snapshots.flatMap((snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
}

export async function listMyRhRequests(uid) {
  if (!uid) {
    return [];
  }

  const snapshots = await Promise.all([
    getDocs(query(collection(db, 'rh_requests'), where('attendantId', '==', uid))),
    getDocs(query(collection(db, 'rh_requests'), where('targetId', '==', uid))),
    getDocs(query(collection(db, 'rh_requests'), where('employeeId', '==', uid))),
  ]);

  return sortByRecent(
    uniqById(
      snapshots
        .flatMap((snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
        .map(normalizeRhRequest)
    )
  );
}

export async function createGeneralRhRequest(payload) {
  return addDoc(collection(db, 'rh_requests'), {
    ...payload,
    status: payload.status || 'Pendente',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function createRhRequest(payload) {
  return createGeneralRhRequest(payload);
}

export async function listRhRequestsForScope(userData, options = {}) {
  const { isCoordinator, clusterId, uid } = getScope(userData);
  const includeHistory = options.includeHistory === true;
  if (isCoordinator || !clusterId) {
    const snapshot = await getDocs(query(collection(db, 'rh_requests')));
    const requests = snapshot.docs.map((item) => normalizeRhRequest({ id: item.id, ...item.data() }));
    return sortByRecent(
      includeHistory ? requests : requests.filter((item) => item.status === 'Pendente')
    );
  }

  const [storeIds, employeeIds] = await Promise.all([
    listStoresByCluster(clusterId),
    listEmployeesByCluster(clusterId),
  ]);
  const [
    clusterSnapshot,
    supervisorSnapshot,
    legacySupervisorSnapshot,
    storeScoped,
    attendantScoped,
    targetScoped,
    employeeScoped,
  ] = await Promise.all([
    getDocs(query(collection(db, 'rh_requests'), where('clusterId', '==', clusterId))),
    uid
      ? getDocs(query(collection(db, 'rh_requests'), where('supervisorUid', '==', uid)))
      : Promise.resolve({ docs: [] }),
    uid
      ? getDocs(query(collection(db, 'rh_requests'), where('supervisorId', '==', uid)))
      : Promise.resolve({ docs: [] }),
    listRequestsByStoreIds(storeIds),
    listRequestsByEmployeeIds('attendantId', employeeIds),
    listRequestsByEmployeeIds('targetId', employeeIds),
    listRequestsByEmployeeIds('employeeId', employeeIds),
  ]);

  const requests = uniqById([
    ...clusterSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    ...supervisorSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    ...legacySupervisorSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    ...storeScoped,
    ...attendantScoped,
    ...targetScoped,
    ...employeeScoped,
  ])
    .map(normalizeRhRequest)
    .filter((item) => (
      item.clusterId === clusterId
      || storeIds.includes(item.storeId)
      || storeIds.includes(item.cityId)
      || item.supervisorUid === uid
      || employeeIds.includes(item.attendantId)
      || employeeIds.includes(item.targetId)
      || employeeIds.includes(item.employeeId)
    ));

  return sortByRecent(
    includeHistory ? requests : requests.filter((item) => item.status === 'Pendente')
  );
}

export async function decideRhRequest(requestId, actor, status, decisionReason = '') {
  if (!requestId) {
    throw new Error('Solicitacao de RH invalida.');
  }

  await updateDoc(doc(db, 'rh_requests', requestId), {
    status,
    decisionReason,
    updatedAt: serverTimestamp(),
    updatedBy: actor?.uid || '',
    updatedByName: actor?.name || 'Gestor',
  });
}
