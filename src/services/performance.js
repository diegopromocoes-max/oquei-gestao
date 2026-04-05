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

const SYSTEM_TIMELINE_PREFIX = 'system_';
const DERIVED_TIMELINE_TYPES = new Set([
  'snapshot',
  'alert',
  'behavior_review',
  'feedback',
  'development_plan',
  'participation',
]);
const MANUAL_INPUT_META_FIELDS = new Set(['id', 'employeeId', 'period', 'updatedAt', 'updatedBy']);

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

function filterDocsByPeriod(documents = [], period, dateFields = []) {
  return documents.filter((item) => {
    if (!period) return true;
    if (item.period === period) return true;
    return dateFields.some((field) => dateFallsInPeriod(item[field], period));
  });
}

function sortByTimestampDesc(left = {}, right = {}, fields = []) {
  const leftTime = fields
    .map((field) => normalizeTimestamp(left[field])?.getTime() || 0)
    .find((value) => value > 0) || 0;
  const rightTime = fields
    .map((field) => normalizeTimestamp(right[field])?.getTime() || 0)
    .find((value) => value > 0) || 0;
  return rightTime - leftTime;
}

function shiftPeriod(period, offsetMonths) {
  const normalized = normalizePeriod(period);
  const [year, month] = normalized.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offsetMonths, 1));
  return date.toISOString().slice(0, 7);
}

function getTrailingPeriods(period, previousMonths = 3) {
  const normalized = normalizePeriod(period);
  const periods = [];
  for (let offset = previousMonths; offset >= 0; offset -= 1) {
    periods.push(shiftPeriod(normalized, -offset));
  }
  return periods;
}

function hasManualInput(manualInput = {}) {
  return Object.entries(manualInput).some(([key, value]) => {
    if (MANUAL_INPUT_META_FIELDS.has(key)) return false;
    if (value === '' || value === null || value === undefined) return false;
    return true;
  });
}

function hasDatasetsForPeriod(datasets = {}) {
  return Boolean(
    hasManualInput(datasets.manualInput)
    || datasets.behaviorReviews?.length
    || datasets.feedbacks?.length
    || datasets.plans?.length
    || datasets.participationEvents?.length
    || datasets.leads?.length
    || datasets.absences?.length
    || datasets.rhRequests?.length
  );
}

function normalizeTimelineEntries(entries = []) {
  return entries
    .map((entry) => ({
      ...entry,
      date: entry.date || entry.createdAt || entry.updatedAt || null,
    }))
    .filter((entry) => entry.date);
}

function buildManualTimelineEntries(entries = [], period) {
  return normalizeTimelineEntries(
    entries.filter((entry) => {
      if (entry.period !== period) return false;
      if (String(entry.id || '').startsWith(SYSTEM_TIMELINE_PREFIX)) return false;

      const type = String(entry.type || '');
      if (type === 'commercial_input') return true;
      if (type === 'development_plan') {
        return String(entry.title || '').toLowerCase().includes('atualizado');
      }

      return !DERIVED_TIMELINE_TYPES.has(type);
    }),
  );
}

function mergeTimelineEntries(manualEntries = [], systemEntries = []) {
  const seen = new Set();
  return normalizeTimelineEntries([...manualEntries, ...systemEntries])
    .filter((entry) => {
      const key = `${entry.type}|${entry.title}|${entry.date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => sortByTimestampDesc(left, right, ['date', 'createdAt', 'updatedAt']));
}

function buildEmployeeScopedDocs(employeeId, datasets = {}) {
  return {
    leads: (datasets.leads || []).filter((item) => item.attendantId === employeeId),
    absences: (datasets.absences || []).filter((item) => item.attendantId === employeeId),
    rhRequests: (datasets.rhRequests || []).filter((item) => item.attendantId === employeeId || item.targetId === employeeId),
    manualInputs: (datasets.manualInputs || []).filter((item) => item.employeeId === employeeId),
    behaviorReviews: (datasets.behaviorReviews || []).filter((item) => item.employeeId === employeeId),
    feedbacks: (datasets.feedbacks || []).filter((item) => item.employeeId === employeeId),
    developmentPlans: (datasets.developmentPlans || []).filter((item) => item.employeeId === employeeId),
    participationEvents: (datasets.participationEvents || []).filter((item) => item.employeeId === employeeId),
    timeline: (datasets.timeline || []).filter((item) => item.employeeId === employeeId),
  };
}

function buildPeriodDatasets(scopedDocs = {}, period) {
  return {
    manualInput: scopedDocs.manualInputs.find((item) => item.period === period) || {},
    behaviorReviews: filterDocsByPeriod(scopedDocs.behaviorReviews, period, ['reviewDate', 'createdAt']),
    feedbacks: filterDocsByPeriod(scopedDocs.feedbacks, period, ['recordedAt', 'feedbackDate', 'createdAt']),
    plans: scopedDocs.developmentPlans.filter((item) => (
      !item.period || item.period === period || dateFallsInPeriod(item.deadline || item.createdAt, period)
    )),
    participationEvents: filterDocsByPeriod(scopedDocs.participationEvents, period, ['eventDate', 'createdAt']),
    leads: filterDocsByPeriod(scopedDocs.leads, period, ['date', 'createdAt', 'lastUpdate']),
    absences: scopedDocs.absences.filter((item) => (
      dateFallsInPeriod(item.startDate || item.createdAt, period)
      || dateFallsInPeriod(item.endDate || item.createdAt, period)
    )),
    rhRequests: filterDocsByPeriod(scopedDocs.rhRequests, period, ['dateEvent', 'createdAt']),
  };
}

function deriveEmployeePerformancePeriods({
  employee,
  scopedDocs,
  periods,
  config,
  currentPeriod,
}) {
  const history = [];
  const byPeriod = new Map();

  periods.forEach((period) => {
    const datasets = buildPeriodDatasets(scopedDocs, period);
    if (period !== currentPeriod && !hasDatasetsForPeriod(datasets)) {
      return;
    }

    const historyBeforePeriod = history.slice();
    const snapshot = buildPerformanceSnapshot({
      employee,
      period,
      leads: datasets.leads,
      commercialInput: datasets.manualInput,
      behaviorReviews: datasets.behaviorReviews,
      absences: datasets.absences,
      rhRequests: datasets.rhRequests,
      feedbacks: datasets.feedbacks,
      plans: datasets.plans,
      participationEvents: datasets.participationEvents,
      history: historyBeforePeriod,
      config,
    });
    const alerts = buildAlertRecords({
      employee,
      period,
      snapshot,
      history: historyBeforePeriod,
      feedbacks: datasets.feedbacks,
      plans: datasets.plans,
      config,
    });
    const systemTimeline = buildDerivedTimeline({
      snapshot,
      plans: datasets.plans,
      feedbacks: datasets.feedbacks,
      reviews: datasets.behaviorReviews,
      participationEvents: datasets.participationEvents,
      alerts,
    });

    history.push(snapshot);
    byPeriod.set(period, {
      datasets,
      snapshot,
      alerts,
      systemTimeline,
    });
  });

  if (!byPeriod.has(currentPeriod)) {
    const datasets = buildPeriodDatasets(scopedDocs, currentPeriod);
    const snapshot = buildPerformanceSnapshot({
      employee,
      period: currentPeriod,
      leads: datasets.leads,
      commercialInput: datasets.manualInput,
      behaviorReviews: datasets.behaviorReviews,
      absences: datasets.absences,
      rhRequests: datasets.rhRequests,
      feedbacks: datasets.feedbacks,
      plans: datasets.plans,
      participationEvents: datasets.participationEvents,
      history,
      config,
    });
    const alerts = buildAlertRecords({
      employee,
      period: currentPeriod,
      snapshot,
      history,
      feedbacks: datasets.feedbacks,
      plans: datasets.plans,
      config,
    });

    history.push(snapshot);
    byPeriod.set(currentPeriod, {
      datasets,
      snapshot,
      alerts,
      systemTimeline: buildDerivedTimeline({
        snapshot,
        plans: datasets.plans,
        feedbacks: datasets.feedbacks,
        reviews: datasets.behaviorReviews,
        participationEvents: datasets.participationEvents,
        alerts,
      }),
    });
  }

  return { history, byPeriod };
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
    timeline: timeline.filter((item) => item.employeeId === employeeId),
  };
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
  const periods = getTrailingPeriods(normalizedPeriod);
  const [users, leads, absences, rhRequests, config] = await Promise.all([
    fetchRoleUsers(),
    fetchCollection('leads'),
    fetchCollection('absences'),
    fetchCollection('rh_requests'),
    getPerformanceConfig('attendant', userData),
  ]);

  const scopedUsers = filterUsersByScope(users, userData);
  const scopedEmployeeIds = scopedUsers.map((employee) => employee.id);
  const [manualInputs, behaviorReviews, feedbacks, developmentPlans, participationEvents] = await Promise.all([
    fetchCollectionByEmployeeIds('performance_commercial_inputs', scopedEmployeeIds),
    fetchCollectionByEmployeeIds('performance_behavior_reviews', scopedEmployeeIds),
    fetchCollectionByEmployeeIds('performance_feedbacks', scopedEmployeeIds),
    fetchCollectionByEmployeeIds('performance_development_plans', scopedEmployeeIds),
    fetchCollectionByEmployeeIds('performance_participation_events', scopedEmployeeIds),
  ]);

  const rows = scopedUsers.map((employee) => {
    const scopedDocs = buildEmployeeScopedDocs(employee.id, {
      leads,
      absences,
      rhRequests,
      manualInputs,
      behaviorReviews,
      feedbacks,
      developmentPlans,
      participationEvents,
    });
    const derived = deriveEmployeePerformancePeriods({
      employee,
      scopedDocs,
      periods,
      config,
      currentPeriod: normalizedPeriod,
    });
    const currentState = derived.byPeriod.get(normalizedPeriod);
    const latestFeedback = scopedDocs.feedbacks
      .slice()
      .sort((left, right) => sortByTimestampDesc(left, right, ['recordedAt', 'feedbackDate', 'createdAt']))[0];

    return {
      id: employee.id,
      employee,
      snapshot: currentState.snapshot,
      score: currentState.snapshot.scoreOverall,
      status: currentState.snapshot.status,
      targetPercent: currentState.snapshot.metaPercent,
      presencePercent: currentState.snapshot.presencePercent,
      pendingActions: currentState.snapshot.pendingActions,
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

export async function loadEmployeePerformanceData({ employeeId, period, userData }) {
  const normalizedPeriod = normalizePeriod(period);
  const periods = getTrailingPeriods(normalizedPeriod);
  const [config, scoped] = await Promise.all([
    getPerformanceConfig('attendant', userData),
    fetchEmployeeScopedDocs(employeeId),
  ]);
  const employee = scoped.employee;

  if (!employee) {
    throw new Error('Colaborador nao encontrado.');
  }

  const derived = deriveEmployeePerformancePeriods({
    employee,
    scopedDocs: scoped,
    periods,
    config,
    currentPeriod: normalizedPeriod,
  });
  const currentState = derived.byPeriod.get(normalizedPeriod);
  const manualTimeline = buildManualTimelineEntries(scoped.timeline, normalizedPeriod);
  const timeline = mergeTimelineEntries(manualTimeline, currentState.systemTimeline);

  return {
    employee,
    period: normalizedPeriod,
    config,
    snapshot: currentState.snapshot,
    history: derived.history,
    alerts: currentState.alerts,
    timeline,
    datasets: {
      ...currentState.datasets,
      manualInput: currentState.datasets.manualInput,
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
  const { employee, snapshot, history, alerts } = data;
  const snapshotRef = doc(db, 'performance_score_snapshots', `${employeeId}_${snapshot.period}`);

  await setDoc(snapshotRef, {
    ...snapshot,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  const existingAlerts = await fetchCollectionWhere('performance_alerts', [
    ['employeeId', '==', employeeId],
    ['period', '==', snapshot.period],
  ]);
  const historyWithoutCurrent = history.filter((item) => item.period !== snapshot.period);
  const alertPayloads = alerts.length
    ? alerts
    : buildAlertRecords({
      employee,
      period: snapshot.period,
      snapshot,
      history: historyWithoutCurrent,
      feedbacks: data.datasets.feedbacks,
      plans: data.datasets.plans,
      config: data.config,
    });
  const operationsNeeded = existingAlerts.length > 0 || alertPayloads.length > 0;

  if (!operationsNeeded) {
    return snapshot;
  }

  const batch = writeBatch(db);

  existingAlerts.forEach((alert) => {
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
