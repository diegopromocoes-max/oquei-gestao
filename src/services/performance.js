import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_ATTENDANT_SCORE_CONFIG, PERFORMANCE_ROLE_KEYS } from '../lib/performanceConstants';
import {
  buildAlertRecords,
  buildDerivedTimeline,
  buildPerformanceSnapshot,
  dateFallsInPeriod,
  normalizePeriod,
  normalizeScoreConfig,
  normalizeTimestamp,
  toIsoDate,
} from '../lib/performanceCore';

function getUserScope(userData = {}) {
  const role = String(userData.role || '').toLowerCase();
  const isCoordinator = ['coordinator', 'coordenador', 'master', 'diretor'].includes(role);
  const clusterId = String(userData.clusterId || userData.cluster || '').trim();
  return { isCoordinator, clusterId, userId: userData.uid || userData.id || null };
}

function isPerformanceRole(user = {}) {
  return PERFORMANCE_ROLE_KEYS.includes(String(user.role || '').toLowerCase());
}

function filterUsersByScope(users = [], userData = {}) {
  const { isCoordinator, clusterId, userId } = getUserScope(userData);
  return users.filter((user) => {
    if (!isPerformanceRole(user)) return false;
    if (isCoordinator) return true;
    if (user.supervisorUid && userId && user.supervisorUid === userId) return true;
    return clusterId ? String(user.clusterId || '').trim() === clusterId : true;
  });
}

function filterDocsByEmployeeAndPeriod(documents = [], employeeId, period, dateFields = []) {
  return documents.filter((item) => {
    const idMatch = (
      item.employeeId === employeeId
      || item.attendantId === employeeId
      || item.targetId === employeeId
      || item.userId === employeeId
    );
    if (!idMatch) return false;
    if (!period) return true;
    if (item.period === period) return true;
    return dateFields.some((field) => dateFallsInPeriod(item[field], period));
  });
}

async function fetchCollection(name) {
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((document) => ({ id: document.id, ...document.data() }));
}

function chunkArray(values = [], size = 10) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function fetchCollectionWhere(name, conditions = []) {
  const ref = collection(db, name);
  const collectionQuery = conditions.length
    ? query(ref, ...conditions.map(([field, operator, value]) => where(field, operator, value)))
    : ref;
  const snap = await getDocs(collectionQuery);
  return snap.docs.map((document) => ({ id: document.id, ...document.data() }));
}

async function fetchCollectionByEmployeeIds(name, employeeIds = [], extraConditions = []) {
  if (!employeeIds.length) return [];
  const chunks = chunkArray(employeeIds, 10);
  const results = await Promise.all(chunks.map((idsChunk) => (
    fetchCollectionWhere(name, [['employeeId', 'in', idsChunk], ...extraConditions])
  )));
  return results.flat();
}

async function fetchCollectionByAnyField(name, fieldNames = [], employeeId) {
  if (!employeeId || !fieldNames.length) return [];
  const results = await Promise.all(fieldNames.map((fieldName) => (
    fetchCollectionWhere(name, [[fieldName, '==', employeeId]])
  )));
  const merged = new Map();
  results.flat().forEach((item) => merged.set(item.id, item));
  return [...merged.values()];
}

async function fetchRoleUsers() {
  const users = await fetchCollection('users');
  return users.filter(isPerformanceRole);
}

export async function ensurePerformanceConfig(role = 'attendant', userData = {}) {
  const ref = doc(db, 'performance_score_configs', role);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      ...DEFAULT_ATTENDANT_SCORE_CONFIG,
      createdAt: new Date().toISOString(),
      createdBy: userData.uid || userData.id || 'system',
      updatedAt: new Date().toISOString(),
      updatedBy: userData.uid || userData.id || 'system',
    });
  }
}

export async function getPerformanceConfig(role = 'attendant', userData = {}) {
  const snap = await getDoc(doc(db, 'performance_score_configs', role));
  return normalizeScoreConfig(snap.exists() ? snap.data() : DEFAULT_ATTENDANT_SCORE_CONFIG);
}

export async function savePerformanceConfig(role = 'attendant', config = {}, userData = {}) {
  const normalized = normalizeScoreConfig(config);
  await setDoc(doc(db, 'performance_score_configs', role), {
    ...normalized,
    updatedAt: new Date().toISOString(),
    updatedBy: userData.uid || userData.id || 'system',
  }, { merge: true });
  return normalized;
}

export async function loadPerformanceListData({ period, userData }) {
  const normalizedPeriod = normalizePeriod(period);
  const [users, leads, absences, rhRequests, config] = await Promise.all([
    fetchRoleUsers(),
    fetchCollection('leads'),
    fetchCollection('absences'),
    fetchCollection('rh_requests'),
    getPerformanceConfig('attendant', userData),
  ]);

  const scopedUsers = filterUsersByScope(users, userData);
  const scopedEmployeeIds = scopedUsers.map((employee) => employee.id);
  const [snapshots, feedbacks, manualInputs] = await Promise.all([
    fetchCollectionByEmployeeIds('performance_score_snapshots', scopedEmployeeIds, [['period', '==', normalizedPeriod]]),
    fetchCollectionByEmployeeIds('performance_feedbacks', scopedEmployeeIds),
    fetchCollectionByEmployeeIds('performance_commercial_inputs', scopedEmployeeIds, [['period', '==', normalizedPeriod]]),
  ]);

  const rows = scopedUsers.map((employee) => {
    const employeeLeads = filterDocsByEmployeeAndPeriod(leads, employee.id, normalizedPeriod, ['date', 'createdAt', 'lastUpdate']);
    const employeeAbsences = filterDocsByEmployeeAndPeriod(absences, employee.id, normalizedPeriod, ['startDate', 'endDate', 'createdAt']);
    const employeeRh = filterDocsByEmployeeAndPeriod(rhRequests, employee.id, normalizedPeriod, ['dateEvent', 'createdAt']);
    const employeeFeedbacks = filterDocsByEmployeeAndPeriod(feedbacks, employee.id, normalizedPeriod, ['recordedAt', 'feedbackDate', 'createdAt']);
    const employeeManualInput = manualInputs.find((item) => item.employeeId === employee.id && item.period === normalizedPeriod) || {};
    const storedSnapshot = snapshots.find((item) => item.employeeId === employee.id && item.period === normalizedPeriod);
    const derivedSnapshot = storedSnapshot || buildPerformanceSnapshot({
      employee,
      period: normalizedPeriod,
      leads: employeeLeads,
      commercialInput: employeeManualInput,
      absences: employeeAbsences,
      rhRequests: employeeRh,
      feedbacks: employeeFeedbacks,
      history: snapshots.filter((item) => item.employeeId === employee.id),
      config,
    });
    const latestFeedback = employeeFeedbacks
      .slice()
      .sort((left, right) => {
        const leftTime = normalizeTimestamp(left.recordedAt || left.feedbackDate || left.createdAt)?.getTime() || 0;
        const rightTime = normalizeTimestamp(right.recordedAt || right.feedbackDate || right.createdAt)?.getTime() || 0;
        return rightTime - leftTime;
      })[0];

    return {
      id: employee.id,
      employee,
      snapshot: derivedSnapshot,
      score: derivedSnapshot.scoreOverall,
      status: derivedSnapshot.status,
      targetPercent: derivedSnapshot.metaPercent,
      presencePercent: derivedSnapshot.presencePercent,
      pendingActions: derivedSnapshot.pendingActions,
      latestFeedbackLabel: latestFeedback
        ? toIsoDate(latestFeedback.recordedAt || latestFeedback.feedbackDate || latestFeedback.createdAt)
        : 'Sem feedback',
    };
  });

  return {
    period: normalizedPeriod,
    config,
    rows,
  };
}

async function fetchEmployeeScopedDocs(employeeId) {
  const [
    employeeSnap,
    leads,
    absences,
    rhRequests,
    manualInputs,
    behaviorReviews,
    feedbacks,
    developmentPlans,
    participationEvents,
    snapshots,
    alerts,
    timeline,
  ] = await Promise.all([
    getDoc(doc(db, 'users', employeeId)),
    fetchCollectionWhere('leads', [['attendantId', '==', employeeId]]),
    fetchCollectionWhere('absences', [['attendantId', '==', employeeId]]),
    fetchCollectionByAnyField('rh_requests', ['attendantId', 'targetId'], employeeId),
    fetchCollectionWhere('performance_commercial_inputs', [['employeeId', '==', employeeId]]),
    fetchCollectionWhere('performance_behavior_reviews', [['employeeId', '==', employeeId]]),
    fetchCollectionWhere('performance_feedbacks', [['employeeId', '==', employeeId]]),
    fetchCollectionWhere('performance_development_plans', [['employeeId', '==', employeeId]]),
    fetchCollectionWhere('performance_participation_events', [['employeeId', '==', employeeId]]),
    fetchCollectionWhere('performance_score_snapshots', [['employeeId', '==', employeeId]]),
    fetchCollectionWhere('performance_alerts', [['employeeId', '==', employeeId]]),
    fetchCollectionWhere('performance_timeline', [['employeeId', '==', employeeId]]),
  ]);

  const employee = employeeSnap.exists() ? { id: employeeSnap.id, ...employeeSnap.data() } : null;

  return {
    employee,
    leads: leads.filter((item) => item.attendantId === employeeId),
    absences: absences.filter((item) => item.attendantId === employeeId),
    rhRequests: rhRequests.filter((item) => item.attendantId === employeeId || item.targetId === employeeId),
    manualInputs: manualInputs.filter((item) => item.employeeId === employeeId),
    behaviorReviews: behaviorReviews.filter((item) => item.employeeId === employeeId),
    feedbacks: feedbacks.filter((item) => item.employeeId === employeeId),
    developmentPlans: developmentPlans.filter((item) => item.employeeId === employeeId),
    participationEvents: participationEvents.filter((item) => item.employeeId === employeeId),
    snapshots: snapshots.filter((item) => item.employeeId === employeeId),
    alerts: alerts.filter((item) => item.employeeId === employeeId),
    timeline: timeline.filter((item) => item.employeeId === employeeId),
  };
}

export async function loadEmployeePerformanceData({ employeeId, period, userData }) {
  const normalizedPeriod = normalizePeriod(period);
  const config = await getPerformanceConfig('attendant', userData);
  const scoped = await fetchEmployeeScopedDocs(employeeId);
  const employee = scoped.employee;

  if (!employee) {
    throw new Error('Colaborador nao encontrado.');
  }

  const manualInput = scoped.manualInputs.find((item) => item.period === normalizedPeriod) || {};
  const behaviorReviews = scoped.behaviorReviews.filter((item) => item.period === normalizedPeriod || dateFallsInPeriod(item.reviewDate || item.createdAt, normalizedPeriod));
  const feedbacks = scoped.feedbacks.filter((item) => item.period === normalizedPeriod || dateFallsInPeriod(item.recordedAt || item.feedbackDate || item.createdAt, normalizedPeriod));
  const plans = scoped.developmentPlans.filter((item) => !item.period || item.period === normalizedPeriod || dateFallsInPeriod(item.deadline || item.createdAt, normalizedPeriod));
  const participationEvents = scoped.participationEvents.filter((item) => item.period === normalizedPeriod || dateFallsInPeriod(item.eventDate || item.createdAt, normalizedPeriod));
  const leads = scoped.leads.filter((item) => dateFallsInPeriod(item.date || item.createdAt || item.lastUpdate, normalizedPeriod));
  const absences = scoped.absences.filter((item) => (
    dateFallsInPeriod(item.startDate || item.createdAt, normalizedPeriod)
    || dateFallsInPeriod(item.endDate || item.createdAt, normalizedPeriod)
  ));
  const rhRequests = scoped.rhRequests.filter((item) => dateFallsInPeriod(item.dateEvent || item.createdAt, normalizedPeriod));
  const history = scoped.snapshots
    .slice()
    .sort((left, right) => String(left.period).localeCompare(String(right.period)));
  const storedSnapshot = history.find((item) => item.period === normalizedPeriod);
  const snapshot = storedSnapshot || buildPerformanceSnapshot({
    employee,
    period: normalizedPeriod,
    leads,
    commercialInput: manualInput,
    behaviorReviews,
    absences,
    rhRequests,
    feedbacks,
    plans,
    participationEvents,
    history,
    config,
  });
  const alerts = scoped.alerts.filter((item) => item.period === normalizedPeriod && item.status !== 'resolved');
  const derivedAlerts = alerts.length
    ? alerts
    : buildAlertRecords({
      employee,
      period: normalizedPeriod,
      snapshot,
      history,
      feedbacks,
      plans,
      config,
    });
  const derivedTimeline = buildDerivedTimeline({
    snapshot,
    plans,
    feedbacks,
    reviews: behaviorReviews,
    participationEvents,
    alerts: derivedAlerts,
  });
  const persistedTimeline = scoped.timeline
    .slice()
    .sort((left, right) => {
      const leftTime = normalizeTimestamp(left.createdAt || left.date)?.getTime() || 0;
      const rightTime = normalizeTimestamp(right.createdAt || right.date)?.getTime() || 0;
      return rightTime - leftTime;
    });

  return {
    employee,
    period: normalizedPeriod,
    config,
    snapshot,
    history,
    alerts: derivedAlerts,
    timeline: persistedTimeline.length ? persistedTimeline : derivedTimeline,
    datasets: {
      leads,
      absences,
      rhRequests,
      manualInput,
      behaviorReviews,
      feedbacks,
      plans,
      participationEvents,
    },
  };
}

async function writeTimelineEntry(payload, userData = {}) {
  await addDoc(collection(db, 'performance_timeline'), {
    ...payload,
    createdAt: new Date().toISOString(),
    createdBy: userData.uid || userData.id || 'system',
  });
}

export async function syncPerformanceDerivedState({ employeeId, period, userData }) {
  const data = await loadEmployeePerformanceData({ employeeId, period, userData });
  const { employee, snapshot, history, datasets, config } = data;
  const snapshotRef = doc(db, 'performance_score_snapshots', `${employeeId}_${snapshot.period}`);
  await setDoc(snapshotRef, {
    ...snapshot,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  const alertPayloads = buildAlertRecords({
    employee,
    period: snapshot.period,
    snapshot,
    history,
    feedbacks: datasets.feedbacks,
    plans: datasets.plans,
    config,
  });

  const existingAlerts = await fetchCollection('performance_alerts');
  const employeeAlerts = existingAlerts.filter((item) => item.employeeId === employeeId && item.period === snapshot.period);
  const batch = writeBatch(db);

  employeeAlerts.forEach((alert) => {
    const shouldStayActive = alertPayloads.some((item) => item.type === alert.type);
    batch.set(doc(db, 'performance_alerts', alert.id), {
      ...alert,
      status: shouldStayActive ? 'active' : 'resolved',
      resolvedAt: shouldStayActive ? null : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  });

  alertPayloads.forEach((alert) => {
    const alertId = `${employeeId}_${snapshot.period}_${alert.type}`;
    batch.set(doc(db, 'performance_alerts', alertId), {
      ...alert,
      id: alertId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      employeeName: employee.name || employee.nome || 'Colaborador',
      clusterId: employee.clusterId || '',
    }, { merge: true });
  });

  await batch.commit();
  return snapshot;
}

export async function updatePerformanceEmployee(employeeId, payload = {}, userData = {}) {
  await updateDoc(doc(db, 'users', employeeId), {
    ...payload,
    updatedAt: new Date().toISOString(),
    updatedBy: userData.uid || userData.id || 'system',
  });
}

export async function saveCommercialInput({ employeeId, period, payload = {}, userData = {} }) {
  const normalizedPeriod = normalizePeriod(period);
  await setDoc(doc(db, 'performance_commercial_inputs', `${employeeId}_${normalizedPeriod}`), {
    employeeId,
    period: normalizedPeriod,
    ...payload,
    updatedAt: new Date().toISOString(),
    updatedBy: userData.uid || userData.id || 'system',
  }, { merge: true });
  await writeTimelineEntry({
    employeeId,
    period: normalizedPeriod,
    type: 'commercial_input',
    title: 'Indicadores comerciais atualizados',
  }, userData);
  return syncPerformanceDerivedState({ employeeId, period: normalizedPeriod, userData });
}

export async function saveBehaviorReview({ employeeId, period, payload = {}, userData = {} }) {
  await addDoc(collection(db, 'performance_behavior_reviews'), {
    employeeId,
    period: normalizePeriod(period),
    ...payload,
    reviewDate: payload.reviewDate || new Date().toISOString(),
    reviewerId: userData.uid || userData.id || 'system',
    reviewerName: userData.name || 'Gestor',
    createdAt: new Date().toISOString(),
  });
  await writeTimelineEntry({
    employeeId,
    period: normalizePeriod(period),
    type: 'behavior_review',
    title: 'Avaliacao comportamental registrada',
  }, userData);
  return syncPerformanceDerivedState({ employeeId, period, userData });
}

export async function saveFeedback({ employeeId, period, payload = {}, userData = {} }) {
  await addDoc(collection(db, 'performance_feedbacks'), {
    employeeId,
    period: normalizePeriod(period),
    ...payload,
    recordedAt: payload.recordedAt || new Date().toISOString(),
    reviewerId: userData.uid || userData.id || 'system',
    reviewerName: userData.name || 'Gestor',
    createdAt: new Date().toISOString(),
  });
  await writeTimelineEntry({
    employeeId,
    period: normalizePeriod(period),
    type: 'feedback',
    title: `Feedback registrado: ${payload.referenceWeek || 'sem referencia'}`,
  }, userData);
  return syncPerformanceDerivedState({ employeeId, period, userData });
}

export async function saveDevelopmentPlan({ employeeId, period, payload = {}, userData = {} }) {
  await addDoc(collection(db, 'performance_development_plans'), {
    employeeId,
    period: normalizePeriod(period),
    ...payload,
    createdAt: new Date().toISOString(),
    createdBy: userData.uid || userData.id || 'system',
  });
  await writeTimelineEntry({
    employeeId,
    period: normalizePeriod(period),
    type: 'development_plan',
    title: `PDI registrado: ${payload.objective || 'acao'}`,
  }, userData);
  return syncPerformanceDerivedState({ employeeId, period, userData });
}

export async function updateDevelopmentPlan(planId, payload = {}, employeeId, period, userData = {}) {
  await updateDoc(doc(db, 'performance_development_plans', planId), {
    ...payload,
    updatedAt: new Date().toISOString(),
    updatedBy: userData.uid || userData.id || 'system',
  });
  await writeTimelineEntry({
    employeeId,
    period: normalizePeriod(period),
    type: 'development_plan',
    title: `PDI atualizado: ${payload.objective || payload.status || 'registro'}`,
  }, userData);
  return syncPerformanceDerivedState({ employeeId, period, userData });
}

export async function saveParticipationEvent({ employeeId, period, payload = {}, userData = {} }) {
  await addDoc(collection(db, 'performance_participation_events'), {
    employeeId,
    period: normalizePeriod(period),
    ...payload,
    createdAt: new Date().toISOString(),
    createdBy: userData.uid || userData.id || 'system',
  });
  await writeTimelineEntry({
    employeeId,
    period: normalizePeriod(period),
    type: 'participation',
    title: `${payload.type || 'Participacao'}: ${payload.title || 'registro'}`,
  }, userData);
  return syncPerformanceDerivedState({ employeeId, period, userData });
}

export async function reprocessPerformanceForEmployee(employeeId, period, userData = {}) {
  return syncPerformanceDerivedState({ employeeId, period, userData });
}

export async function deleteParticipationEvent(eventId, employeeId, period, userData = {}) {
  await deleteDoc(doc(db, 'performance_participation_events', eventId));
  return syncPerformanceDerivedState({ employeeId, period, userData });
}
