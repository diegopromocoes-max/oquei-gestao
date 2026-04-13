import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db } from '../firebase';
import { getDatesInRange } from '../lib/operationsCalendar';
import { normalizeRole, ROLE_KEYS } from '../lib/roleUtils';
import {
  deleteAbsenceCalendarEntries,
  syncAbsenceCalendarEntries,
} from './absenceCalendar';

function normalizeStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) return 'Pendente';
  if (normalized === 'approved' || normalized === 'aprovado') return 'Aprovado';
  if (normalized === 'rejected' || normalized === 'rejeitado') return 'Rejeitado';
  return 'Pendente';
}

function normalizeAbsenceRequest(item = {}) {
  const attendantId = item.attendantId || item.employeeId || item.targetId || '';
  const attendantName = item.attendantName || item.employeeName || item.targetName || 'Colaborador';
  const storeId = item.storeId || item.cityId || '';
  const storeName = item.storeName || item.cityName || item.storeId || item.cityId || 'Sem loja';
  const startDate = item.startDate || item.dateEvent || item.date || '';
  const endDate = item.endDate || startDate;

  return {
    ...item,
    attendantId,
    attendantName,
    employeeId: item.employeeId || attendantId,
    employeeName: item.employeeName || attendantName,
    targetId: item.targetId || attendantId,
    targetName: item.targetName || attendantName,
    storeId,
    cityId: item.cityId || storeId,
    storeName,
    cityName: item.cityName || storeName,
    supervisorUid: item.supervisorUid || item.supervisorId || '',
    clusterId: item.clusterId || '',
    startDate,
    endDate,
    justification: item.justification || item.description || item.obs || '',
    status: normalizeStatus(item.status),
  };
}

function normalizeAbsenceRecord(item = {}) {
  const attendantId = item.attendantId || item.employeeId || item.targetId || '';
  const attendantName = item.attendantName || item.employeeName || item.targetName || 'Colaborador';
  const storeId = item.storeId || item.cityId || '';
  const storeName = item.storeName || item.cityName || item.storeId || item.cityId || 'Sem loja';
  const startDate = item.startDate || item.dateEvent || item.date || '';
  const endDate = item.endDate || startDate;
  const coverageMap = item.coverageMap || {};

  return {
    ...item,
    attendantId,
    attendantName,
    employeeId: item.employeeId || attendantId,
    employeeName: item.employeeName || attendantName,
    targetId: item.targetId || attendantId,
    targetName: item.targetName || attendantName,
    storeId,
    cityId: item.cityId || storeId,
    storeName,
    cityName: item.cityName || storeName,
    supervisorUid: item.supervisorUid || item.supervisorId || '',
    clusterId: item.clusterId || '',
    startDate,
    endDate,
    status: normalizeStatus(item.status || item.approvalStatus),
    approvalStatus: item.approvalStatus || normalizeStatus(item.status || item.approvalStatus),
    coverageMap,
    coverageStatus: item.coverageStatus || resolveCoverageStatus(startDate, endDate, coverageMap),
    isFullDay: item.isFullDay !== false,
  };
}

function sortByCreatedAt(items = []) {
  return [...items].sort((left, right) => {
    const leftValue = left.updatedAt?.seconds || left.createdAt?.seconds || 0;
    const rightValue = right.updatedAt?.seconds || right.createdAt?.seconds || 0;
    return rightValue - leftValue;
  });
}

function getRoleScope(userData = {}) {
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
        getDocs(query(collection(db, 'absence_requests'), where('storeId', 'in', chunk))),
        getDocs(query(collection(db, 'absence_requests'), where('cityId', 'in', chunk))),
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
      getDocs(query(collection(db, 'absence_requests'), where(fieldName, 'in', chunk)))
    )
  );

  return snapshots.flatMap((snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
}

function resolveCoverageStatus(startDate, endDate, coverageMap = {}) {
  const dates = getDatesInRange(startDate, endDate);
  if (!dates.length) return 'coverage_pending';
  const allCovered = dates.every((date) => Boolean(coverageMap?.[date]));
  return allCovered ? 'coverage_resolved' : 'coverage_pending';
}

function buildOfficialAbsencePayload(request = {}, approver = {}, overrides = {}) {
  const coverageMap = overrides.coverageMap || request.coverageMap || {};
  const startDate = request.startDate || overrides.startDate || '';
  const endDate = request.endDate || overrides.endDate || startDate;

  return {
    type: request.type || overrides.type || 'falta',
    requestId: request.id || overrides.requestId || '',
    status: overrides.status || 'Aprovado',
    approvalStatus: 'Aprovado',
    coverageStatus: resolveCoverageStatus(startDate, endDate, coverageMap),
    coverageMap,
    isFullDay: request.allDay !== false,
    startTime: request.startTime || '',
    endTime: request.endTime || '',
    reason: request.type === 'atestado' ? 'Atestado' : (request.reason || request.type || 'Ausencia'),
    obs: request.justification || request.description || request.obs || '',
    storeId: request.storeId || '',
    cityId: request.cityId || request.storeId || '',
    storeName: request.storeName || request.cityName || request.storeId || '',
    cityName: request.storeName || request.cityName || request.storeId || '',
    clusterId: request.clusterId || approver.clusterId || '',
    attendantId: request.attendantId || '',
    attendantName: request.attendantName || 'Colaborador',
    employeeId: request.employeeId || request.attendantId || '',
    employeeName: request.attendantName || 'Colaborador',
    supervisorUid: request.supervisorUid || approver.uid || '',
    supervisorId: request.supervisorId || request.supervisorUid || approver.uid || '',
    supervisorName: approver.name || request.supervisorName || '',
    createdBy: request.createdBy || request.attendantName || 'Sistema',
    approvedBy: approver.uid || '',
    approvedByName: approver.name || 'Gestor',
    approvedAt: serverTimestamp(),
    startDate,
    endDate,
    fileName: request.fileName || '',
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

export async function createAbsenceRequest(payload = {}) {
  return addDoc(collection(db, 'absence_requests'), {
    ...payload,
    status: payload.status || 'Pendente',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function listMyAbsenceRequests(uid) {
  if (!uid) return [];
  const snapshots = await Promise.all([
    getDocs(query(collection(db, 'absence_requests'), where('attendantId', '==', uid))),
    getDocs(query(collection(db, 'absence_requests'), where('employeeId', '==', uid))),
    getDocs(query(collection(db, 'absence_requests'), where('targetId', '==', uid))),
  ]);
  return sortByCreatedAt(
    uniqById(
      snapshots
        .flatMap((snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
        .map(normalizeAbsenceRequest)
    )
  );
}

export async function listAbsenceRequestsForScope(userData, options = {}) {
  const { isCoordinator, clusterId, uid } = getRoleScope(userData);
  const includeHistory = options.includeHistory === true;
  if (isCoordinator || !clusterId) {
    const snapshot = await getDocs(query(collection(db, 'absence_requests')));
    const requests = snapshot.docs.map((item) => normalizeAbsenceRequest({ id: item.id, ...item.data() }));
    return sortByCreatedAt(
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
    employeeScoped,
    targetScoped,
  ] = await Promise.all([
    getDocs(query(collection(db, 'absence_requests'), where('clusterId', '==', clusterId))),
    uid
      ? getDocs(query(collection(db, 'absence_requests'), where('supervisorUid', '==', uid)))
      : Promise.resolve({ docs: [] }),
    uid
      ? getDocs(query(collection(db, 'absence_requests'), where('supervisorId', '==', uid)))
      : Promise.resolve({ docs: [] }),
    listRequestsByStoreIds(storeIds),
    listRequestsByEmployeeIds('attendantId', employeeIds),
    listRequestsByEmployeeIds('employeeId', employeeIds),
    listRequestsByEmployeeIds('targetId', employeeIds),
  ]);

  const requests = uniqById([
    ...clusterSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    ...supervisorSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    ...legacySupervisorSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    ...storeScoped,
    ...attendantScoped,
    ...employeeScoped,
    ...targetScoped,
  ])
    .map(normalizeAbsenceRequest)
    .filter((item) => (
      item.clusterId === clusterId
      || storeIds.includes(item.storeId)
      || storeIds.includes(item.cityId)
      || item.supervisorUid === uid
      || employeeIds.includes(item.attendantId)
      || employeeIds.includes(item.employeeId)
      || employeeIds.includes(item.targetId)
    ));

  return sortByCreatedAt(
    includeHistory ? requests : requests.filter((item) => item.status === 'Pendente')
  );
}

export async function listAbsencesForScope(userData, options = {}) {
  const { isCoordinator, clusterId, uid } = getRoleScope(userData);
  const includePast = options.includePast === true;
  const today = new Date().toISOString().slice(0, 10);
  if (isCoordinator || !clusterId) {
    const snapshot = await getDocs(query(collection(db, 'absences')));
    const items = snapshot.docs
      .map((item) => normalizeAbsenceRecord({ id: item.id, ...item.data() }))
      .filter((item) => includePast || String(item.endDate || item.startDate || '') >= today);
    return sortByCreatedAt(items);
  }

  const [storeIds, employeeIds] = await Promise.all([
    listStoresByCluster(clusterId),
    listEmployeesByCluster(clusterId),
  ]);
  const [
    clusterSnapshot,
    supervisorSnapshot,
    legacySupervisorSnapshot,
    storeSnapshots,
    attendantSnapshots,
    employeeSnapshots,
    targetSnapshots,
  ] = await Promise.all([
    getDocs(query(collection(db, 'absences'), where('clusterId', '==', clusterId))),
    uid
      ? getDocs(query(collection(db, 'absences'), where('supervisorUid', '==', uid)))
      : Promise.resolve({ docs: [] }),
    uid
      ? getDocs(query(collection(db, 'absences'), where('supervisorId', '==', uid)))
      : Promise.resolve({ docs: [] }),
    Promise.all(
      [...Array(Math.ceil(storeIds.length / 10)).keys()].map((chunkIndex) => {
        const chunk = storeIds.slice(chunkIndex * 10, chunkIndex * 10 + 10);
        if (!chunk.length) return Promise.resolve([{ docs: [] }, { docs: [] }]);
        return Promise.all([
          getDocs(query(collection(db, 'absences'), where('storeId', 'in', chunk))),
          getDocs(query(collection(db, 'absences'), where('cityId', 'in', chunk))),
        ]);
      }),
    ),
    Promise.all(
      [...Array(Math.ceil(employeeIds.length / 10)).keys()].map((chunkIndex) => {
        const chunk = employeeIds.slice(chunkIndex * 10, chunkIndex * 10 + 10);
        if (!chunk.length) return Promise.resolve({ docs: [] });
        return getDocs(query(collection(db, 'absences'), where('attendantId', 'in', chunk)));
      }),
    ),
    Promise.all(
      [...Array(Math.ceil(employeeIds.length / 10)).keys()].map((chunkIndex) => {
        const chunk = employeeIds.slice(chunkIndex * 10, chunkIndex * 10 + 10);
        if (!chunk.length) return Promise.resolve({ docs: [] });
        return getDocs(query(collection(db, 'absences'), where('employeeId', 'in', chunk)));
      }),
    ),
    Promise.all(
      [...Array(Math.ceil(employeeIds.length / 10)).keys()].map((chunkIndex) => {
        const chunk = employeeIds.slice(chunkIndex * 10, chunkIndex * 10 + 10);
        if (!chunk.length) return Promise.resolve({ docs: [] });
        return getDocs(query(collection(db, 'absences'), where('targetId', 'in', chunk)));
      }),
    ),
  ]);

  const items = uniqById([
    ...clusterSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    ...supervisorSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    ...legacySupervisorSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })),
    ...storeSnapshots.flat().flatMap((snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    ...attendantSnapshots.flatMap((snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    ...employeeSnapshots.flatMap((snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
    ...targetSnapshots.flatMap((snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))),
  ])
    .map(normalizeAbsenceRecord)
    .filter((item) => (
      item.clusterId === clusterId
      || storeIds.includes(item.storeId)
      || storeIds.includes(item.cityId)
      || item.supervisorUid === uid
      || employeeIds.includes(item.attendantId)
      || employeeIds.includes(item.employeeId)
      || employeeIds.includes(item.targetId)
    ))
    .filter((item) => includePast || String(item.endDate || item.startDate || '') >= today);

  return sortByCreatedAt(items);
}

export async function approveAbsenceRequest(request, approver, overrides = {}) {
  if (!request?.id) {
    throw new Error('Solicitacao de ausencia invalida.');
  }

  const absenceRef = request.absenceId
    ? doc(db, 'absences', request.absenceId)
    : doc(collection(db, 'absences'));
  const batch = writeBatch(db);
  const absencePayload = buildOfficialAbsencePayload(request, approver, overrides);

  batch.set(absenceRef, absencePayload, { merge: true });
  batch.update(doc(db, 'absence_requests', request.id), {
    status: 'Aprovado',
    decisionReason: overrides.decisionReason || '',
    absenceId: absenceRef.id,
    updatedAt: serverTimestamp(),
    approvedAt: serverTimestamp(),
    approvedBy: approver?.uid || '',
    approvedByName: approver?.name || 'Gestor',
  });
  await batch.commit();

  await syncAbsenceCalendarEntries(absenceRef.id, {
    ...absencePayload,
    approvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return {
    absenceId: absenceRef.id,
    absencePayload,
  };
}

export async function rejectAbsenceRequest(requestId, approver, decisionReason) {
  if (!requestId) {
    throw new Error('Solicitacao de ausencia invalida.');
  }

  await updateDoc(doc(db, 'absence_requests', requestId), {
    status: 'Rejeitado',
    decisionReason: decisionReason || '',
    updatedAt: serverTimestamp(),
    approvedBy: approver?.uid || '',
    approvedByName: approver?.name || 'Gestor',
  });
}

export async function saveOfficialAbsence(payload = {}, actor = {}) {
  const absenceRef = payload.id
    ? doc(db, 'absences', payload.id)
    : doc(collection(db, 'absences'));
  const absencePayload = buildOfficialAbsencePayload(
    {
      ...payload,
      id: payload.requestId || '',
      allDay: payload.isFullDay !== false,
      justification: payload.obs || '',
    },
    actor,
    {
      ...payload,
      approvalStatus: 'Aprovado',
      status: payload.type === 'ferias' ? 'Programada' : 'Aprovado',
      requestId: payload.requestId || '',
    }
  );

  await setDoc(absenceRef, absencePayload, { merge: true });

  await syncAbsenceCalendarEntries(absenceRef.id, {
    ...absencePayload,
    updatedAt: new Date().toISOString(),
  });

  return {
    id: absenceRef.id,
    ...absencePayload,
  };
}

export async function upsertShiftAssignment(payload = {}) {
  const assignmentRef = payload.id
    ? doc(db, 'shift_assignments', payload.id)
    : doc(collection(db, 'shift_assignments'));
  const batch = writeBatch(db);
  batch.set(assignmentRef, {
    ...payload,
    updatedAt: serverTimestamp(),
    createdAt: payload.createdAt || serverTimestamp(),
  }, { merge: true });
  await batch.commit();
  return assignmentRef.id;
}

export async function updateAbsenceCoverage(absence, date, coverageValue) {
  if (!absence?.id || !date) {
    throw new Error('Ausencia invalida para cobertura.');
  }

  const nextCoverageMap = {
    ...(absence.coverageMap || {}),
    [date]: coverageValue,
  };

  await updateDoc(doc(db, 'absences', absence.id), {
    coverageMap: nextCoverageMap,
    coverageStatus: resolveCoverageStatus(absence.startDate, absence.endDate, nextCoverageMap),
    updatedAt: serverTimestamp(),
  });

  await syncAbsenceCalendarEntries(absence.id, {
    ...absence,
    coverageMap: nextCoverageMap,
    coverageStatus: resolveCoverageStatus(absence.startDate, absence.endDate, nextCoverageMap),
    updatedAt: new Date().toISOString(),
  });

  return nextCoverageMap;
}

export async function deleteOfficialAbsence(absenceId) {
  if (!absenceId) return;
  await deleteAbsenceCalendarEntries(absenceId);
  await deleteDoc(doc(db, 'absences', absenceId));
}
