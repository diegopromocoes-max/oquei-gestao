import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';

import { db } from '../firebase';

const SALE_STATUSES = new Set(['Contratado', 'Instalado']);
const INSTALL_STATUSES = new Set(['Instalado']);
const DEFAULT_MONTH = new Date().toISOString().slice(0, 7);
const ATTENDANT_ROLE_KEYS = new Set(['attendant', 'atendente']);

function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeRoleKey(value = '') {
  return normalizeText(value).replace(/[\s_-]+/g, '');
}

function isAttendantUser(user = {}) {
  return ATTENDANT_ROLE_KEYS.has(normalizeRoleKey(user.role || ''));
}

function normalizeMonthKey(value) {
  return /^\d{4}-\d{2}$/.test(String(value || '')) ? String(value) : DEFAULT_MONTH;
}

function normalizeLeadType(value = '') {
  const safeValue = String(value || '').toLowerCase();
  if (safeValue.includes('migra')) return 'Migracao';
  if (safeValue.includes('sva')) return 'SVA';
  return 'Plano Novo';
}

function getCalendarForMonth(monthKey, holidays = []) {
  const [year, month] = normalizeMonthKey(monthKey).split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const now = new Date();
  let total = 0;
  let worked = 0;

  for (let day = 1; day <= lastDay; day += 1) {
    const current = new Date(year, month - 1, day);
    const weekDay = current.getDay();
    if (weekDay === 0 || weekDay === 6) continue;

    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isHoliday = holidays.some((holiday) => holiday.date === dateKey);
    if (isHoliday) continue;

    total += 1;
    if (
      year < now.getFullYear()
      || (year === now.getFullYear() && month - 1 < now.getMonth())
      || (year === now.getFullYear() && month - 1 === now.getMonth() && day <= now.getDate())
    ) {
      worked += 1;
    }
  }

  return {
    total: total || 22,
    worked: worked || 1,
    remaining: Math.max(0, total - worked),
  };
}

function buildCityMaps(cities = []) {
  const byId = new Map();
  const byName = new Map();

  cities.forEach((city) => {
    if (city?.id) byId.set(String(city.id), city);
    const safeName = normalizeText(city?.name || city?.nome || '');
    if (safeName) byName.set(safeName, city);
  });

  return { byId, byName };
}

function resolveLeadCity(lead = {}, cityMaps) {
  const directMatch = cityMaps.byId.get(String(lead.cityId || ''));
  if (directMatch) return directMatch;

  const normalizedById = normalizeText(lead.cityId);
  if (normalizedById && cityMaps.byName.has(normalizedById)) {
    return cityMaps.byName.get(normalizedById);
  }

  const normalizedByName = normalizeText(lead.cityName);
  if (normalizedByName && cityMaps.byName.has(normalizedByName)) {
    return cityMaps.byName.get(normalizedByName);
  }

  return null;
}

function resolveLeadClusterId(lead = {}, cityMaps) {
  const explicitCluster = String(lead.clusterId || lead.cluster || '').trim();
  if (explicitCluster) return explicitCluster;
  return String(resolveLeadCity(lead, cityMaps)?.clusterId || '').trim();
}

function buildMonthlyGoalsMap(goals = []) {
  return goals.reduce((accumulator, goal) => {
    if (goal?.cityId) {
      accumulator[goal.cityId] = goal;
    }
    return accumulator;
  }, {});
}

function buildMonthlyClusterGoalsMap(goals = []) {
  return goals.reduce((accumulator, goal) => {
    if (goal?.clusterId) {
      accumulator[goal.clusterId] = goal;
    }
    return accumulator;
  }, {});
}

function buildMonthlyAttendantGoalsByCity(goals = []) {
  return goals.reduce((accumulator, goal) => {
    const cityId = String(goal.cityId || '').trim();
    if (!cityId) return accumulator;
    if (!accumulator[cityId]) accumulator[cityId] = [];
    accumulator[cityId].push(goal);
    return accumulator;
  }, {});
}

function buildAttendantUsersByCity(users = []) {
  return users.reduce((accumulator, user) => {
    if (!isAttendantUser(user)) return accumulator;
    if (user.active === false) return accumulator;
    const cityId = String(user.cityId || user.storeId || '').trim();
    if (!cityId) return accumulator;
    if (!accumulator[cityId]) accumulator[cityId] = [];
    accumulator[cityId].push(user);
    return accumulator;
  }, {});
}

function sumSyncedAttendantGoals(goalDocs = []) {
  return goalDocs.reduce((accumulator, item) => ({
    plans: accumulator.plans + toNumber(item.plansTarget),
    sva: accumulator.sva + toNumber(item.svaTarget),
  }), { plans: 0, sva: 0 });
}

function buildStoreGoalSnapshot(goal = {}) {
  return (
    (parseInt(goal.plans_loja, 10) || 0)
    + (parseInt(goal.plans_pap, 10) || 0)
    + (parseInt(goal.plans_central, 10) || 0)
    + (parseInt(goal.plans_b2b, 10) || 0)
  );
}

function buildStorefrontGoalSnapshot(goal = {}) {
  return parseInt(goal.plans_loja, 10) || 0;
}

function isCityAttendantGoalSynced({ cityId, monthlyGoal = {}, attendantGoalDocs = [], attendantUsersByCity = {} }) {
  const docs = attendantGoalDocs[cityId] || [];
  if (!docs.length) return false;

  const currentRoster = (attendantUsersByCity[cityId] || []).map((item) => item.id).sort();
  const docsRoster = docs.map((item) => item.attendantId).filter(Boolean).sort();
  if (JSON.stringify(currentRoster) !== JSON.stringify(docsRoster)) return false;

  const expectedStoreGoal = buildStorefrontGoalSnapshot(monthlyGoal);
  return docs.every((item) => item.distributionStatus !== 'stale' && toNumber(item.storeGoalPlans) === expectedStoreGoal);
}

function filterLeadsByScope(leads = [], { scope, attendantId, clusterId }, cityMaps) {
  if (scope === 'attendant') {
    return leads.filter((lead) => String(lead.attendantId || '') === String(attendantId || ''));
  }

  if (scope === 'cluster') {
    const safeClusterId = String(clusterId || '').trim();
    return leads.filter((lead) => resolveLeadClusterId(lead, cityMaps) === safeClusterId);
  }

  return leads;
}

function buildScopedCities(cities = [], { scope, clusterId }) {
  if (scope !== 'cluster') {
    return cities;
  }

  const safeClusterId = String(clusterId || '').trim();
  return cities.filter((city) => String(city.clusterId || '').trim() === safeClusterId);
}

function buildStoreData({
  stores = [],
  leads = [],
  monthlyGoals = {},
  monthlyAttendantGoals = {},
  attendantUsersByCity = {},
  calendar,
  clusterFilter = 'all',
  cityFilter = 'all',
}) {
  let targetStores = stores;

  if (clusterFilter !== 'all') {
    targetStores = targetStores.filter((store) => store.clusterId === clusterFilter);
  }

  if (cityFilter !== 'all') {
    targetStores = targetStores.filter((store) => String(store.name || store.nome || '') === String(cityFilter));
  }

  return targetStores.map((store) => {
    const storeLeads = leads.filter((lead) => {
      const cityId = String(lead.cityId || '');
      const cityName = String(lead.cityName || '');
      return cityId === String(store.id) || cityId === String(store.name || store.nome || '') || cityName === String(store.name || store.nome || '');
    });

    const goal = monthlyGoals[store.id] || {};
    const cityGoalDocs = monthlyAttendantGoals[store.id] || [];
    const hasSyncedAttendantGoals = isCityAttendantGoalSynced({
      cityId: store.id,
      monthlyGoal: goal,
      attendantGoalDocs: monthlyAttendantGoals,
      attendantUsersByCity,
    });
    const attendantGoalSummary = sumSyncedAttendantGoals(cityGoalDocs);
    const salesPlanos = storeLeads.filter((lead) => SALE_STATUSES.has(lead.status) && normalizeLeadType(lead.leadType || lead.categoryName || lead.productName) === 'Plano Novo').length;
    const installedPlanos = storeLeads.filter((lead) => INSTALL_STATUSES.has(lead.status) && normalizeLeadType(lead.leadType || lead.categoryName || lead.productName) === 'Plano Novo').length;
    const salesSVA = storeLeads.filter((lead) => SALE_STATUSES.has(lead.status) && normalizeLeadType(lead.leadType || lead.categoryName || lead.productName) === 'SVA').length;
    const salesMigracoes = storeLeads.filter((lead) => SALE_STATUSES.has(lead.status) && normalizeLeadType(lead.leadType || lead.categoryName || lead.productName) === 'Migracao').length;

    const fallbackPlanGoal = buildStorefrontGoalSnapshot(goal);
    const metaPlanos = hasSyncedAttendantGoals ? attendantGoalSummary.plans : fallbackPlanGoal;

    return {
      id: store.id,
      city: store.name || store.nome || store.id,
      clusterId: store.clusterId || '',
      metaPlanos,
      salesPlanos,
      installedPlanos,
      salesSVA,
      metaSVA: hasSyncedAttendantGoals ? attendantGoalSummary.sva : (parseInt(goal.sva, 10) || 0),
      salesMigracoes,
      metaMigracoes: parseInt(goal.migrations, 10) || 0,
      projSales: calendar.worked > 0 ? Math.floor((salesPlanos / calendar.worked) * calendar.total) : 0,
      attendantGoalSource: hasSyncedAttendantGoals ? 'individual' : 'store',
    };
  }).sort((left, right) => right.salesPlanos - left.salesPlanos);
}

function buildTotals({ storeData = [], calendar, monthlyClusterGoals = {}, clusterFilter = 'all', uniqueClusters = [] }) {
  const totals = storeData.reduce((accumulator, store) => ({
    p: accumulator.p + store.salesPlanos,
    i: accumulator.i + store.installedPlanos,
    ss: accumulator.ss + store.salesSVA,
    m: accumulator.m + store.salesMigracoes,
    gp: accumulator.gp + store.metaPlanos,
    gm: accumulator.gm + store.metaMigracoes,
    gs: accumulator.gs + store.metaSVA,
  }), {
    p: 0,
    i: 0,
    ss: 0,
    m: 0,
    gp: 0,
    gm: 0,
    gs: 0,
  });

  let clusterGoalMigracoes = 0;
  let hasClusterGoals = false;

  const clusterIds = clusterFilter !== 'all' ? [clusterFilter] : uniqueClusters;
  clusterIds.forEach((clusterId) => {
    const goal = monthlyClusterGoals[clusterId];
    if (!goal) return;
    clusterGoalMigracoes += parseInt(goal.migrations, 10) || 0;
    hasClusterGoals = true;
  });

  const workRatio = calendar.total / (calendar.worked || 1);
  const goalP = totals.gp;
  const goalM = hasClusterGoals ? clusterGoalMigracoes : totals.gm;
  const goalS = totals.gs;

  return {
    ...totals,
    goalP,
    goalM,
    goalS,
    goalSales: goalP + goalM + goalS,
    projP: Math.floor(totals.p * workRatio),
    projM: Math.floor(totals.m * workRatio),
    projI: Math.floor(totals.i * workRatio),
    projS: Math.floor(totals.ss * workRatio),
  };
}

function buildSvaAnalysis(leads = []) {
  const svaCounts = {};
  const sellerCounts = {};
  const cityCounts = {};

  leads
    .filter((lead) => normalizeLeadType(lead.leadType || lead.categoryName || lead.productName) === 'SVA' && SALE_STATUSES.has(lead.status))
    .forEach((lead) => {
      const productName = lead.productName || 'Outros';
      const sellerName = lead.attendantName || 'N/D';
      const cityName = lead.cityName || lead.cityId || 'N/D';

      svaCounts[productName] = (svaCounts[productName] || 0) + 1;
      sellerCounts[sellerName] = (sellerCounts[sellerName] || 0) + 1;
      cityCounts[cityName] = (cityCounts[cityName] || 0) + 1;
    });

  return {
    radarData: Object.keys(svaCounts).map((name) => ({ subject: name, A: svaCounts[name], fullMark: 10 })),
    topSellers: Object.keys(sellerCounts).map((name) => ({ name, count: sellerCounts[name] })).sort((left, right) => right.count - left.count).slice(0, 5),
    topCities: Object.keys(cityCounts).map((name) => ({ name, count: cityCounts[name] })).sort((left, right) => right.count - left.count).slice(0, 5),
  };
}

function emptyScopePayload(monthKey = DEFAULT_MONTH) {
  return {
    monthKey: normalizeMonthKey(monthKey),
    cities: [],
    users: [],
    leads: [],
    holidays: [],
    monthlyGoals: {},
    monthlyClusterGoals: {},
    monthlyAttendantGoals: {},
    globalCalendar: getCalendarForMonth(monthKey, []),
    uniqueClusters: [],
    storeData: [],
    totals: {
      p: 0,
      i: 0,
      ss: 0,
      m: 0,
      gp: 0,
      gm: 0,
      gs: 0,
      goalP: 0,
      goalM: 0,
      goalS: 0,
      goalSales: 0,
      projP: 0,
      projM: 0,
      projI: 0,
      projS: 0,
    },
    salesCount: 0,
    installedCount: 0,
    svaAnalysis: {
      radarData: [],
      topSellers: [],
      topCities: [],
    },
  };
}

export function buildScopedSalesView(rawPayload = emptyScopePayload(), { clusterFilter = 'all', cityFilter = 'all' } = {}) {
  const payload = rawPayload || emptyScopePayload();
  const globalCalendar = payload.globalCalendar || getCalendarForMonth(payload.monthKey, payload.holidays);
  const uniqueClusters = Array.from(new Set((payload.cities || []).map((city) => city.clusterId).filter(Boolean)));
  const attendantUsersByCity = buildAttendantUsersByCity(payload.users || []);
  const storeData = buildStoreData({
    stores: payload.cities || [],
    leads: payload.leads || [],
    monthlyGoals: payload.monthlyGoals || {},
    monthlyAttendantGoals: payload.monthlyAttendantGoals || {},
    attendantUsersByCity,
    calendar: globalCalendar,
    clusterFilter,
    cityFilter,
  });
  const totals = buildTotals({
    storeData,
    calendar: globalCalendar,
    monthlyClusterGoals: payload.monthlyClusterGoals || {},
    clusterFilter,
    uniqueClusters,
  });
  const visibleLeads = (payload.leads || []).filter((lead) => {
    if (clusterFilter !== 'all' && String(lead.clusterId || lead.cluster || '') !== String(clusterFilter)) {
      return false;
    }
    if (cityFilter !== 'all') {
      const cityId = String(lead.cityId || '');
      const cityName = String(lead.cityName || '');
      return cityId === String(cityFilter) || cityName === String(cityFilter);
    }
    return true;
  });

  return {
    ...payload,
    globalCalendar,
    uniqueClusters,
    storeData,
    totals,
    salesCount: visibleLeads.filter((lead) => SALE_STATUSES.has(lead.status)).length,
    installedCount: visibleLeads.filter((lead) => INSTALL_STATUSES.has(lead.status)).length,
    svaAnalysis: buildSvaAnalysis(visibleLeads),
  };
}

function summarizeScopePayload({
  monthKey,
  scope,
  clusterId,
  attendantId,
  cities,
  users,
  leads,
  holidays,
  monthlyGoals,
  monthlyClusterGoals,
  monthlyAttendantGoals,
}) {
  const cityMaps = buildCityMaps(cities);
  const scopedCities = buildScopedCities(cities, { scope, clusterId });
  const scopedLeads = filterLeadsByScope(leads, { scope, clusterId, attendantId }, cityMaps).map((lead) => {
    const resolvedCity = resolveLeadCity(lead, cityMaps);
    const resolvedClusterId = resolveLeadClusterId(lead, cityMaps);
    return {
      ...lead,
      cityName: lead.cityName || resolvedCity?.name || resolvedCity?.nome || lead.cityId || '',
      clusterId: lead.clusterId || resolvedClusterId || '',
    };
  });

  return buildScopedSalesView({
    monthKey,
    cities: scopedCities,
    users,
    leads: scopedLeads,
    holidays,
    monthlyGoals: buildMonthlyGoalsMap(monthlyGoals),
    monthlyClusterGoals: buildMonthlyClusterGoalsMap(monthlyClusterGoals),
    monthlyAttendantGoals: buildMonthlyAttendantGoalsByCity(monthlyAttendantGoals),
    globalCalendar: getCalendarForMonth(monthKey, holidays),
  });
}

function buildCitiesQuery(scope, clusterId) {
  if (scope === 'cluster' && clusterId) {
    return query(collection(db, 'cities'), where('clusterId', '==', clusterId));
  }
  return collection(db, 'cities');
}

function buildLeadsQuery(scope, monthKey, attendantId) {
  const constraints = [where('monthKey', '==', monthKey)];
  if (scope === 'attendant' && attendantId) {
    constraints.push(where('attendantId', '==', attendantId));
  }
  return query(collection(db, 'leads'), ...constraints);
}

function buildGoalsQuery(scope, monthKey, clusterId, collectionName) {
  const constraints = [where('month', '==', monthKey)];
  if (scope === 'cluster' && clusterId && collectionName === 'monthly_cluster_goals') {
    constraints.push(where('clusterId', '==', clusterId));
  }
  return query(collection(db, collectionName), ...constraints);
}

function buildUsersQuery(scope, clusterId) {
  return collection(db, 'users');
}

function buildAttendantGoalsQuery(monthKey) {
  return query(collection(db, 'monthly_attendant_goals'), where('month', '==', monthKey));
}

export function listenMonthlySalesScope({ scope = 'global', monthKey = DEFAULT_MONTH, clusterId = '', attendantId = '', callback, onError }) {
  const normalizedMonth = normalizeMonthKey(monthKey);
  const state = {
    cities: null,
    users: null,
    leads: null,
    holidays: null,
    monthlyGoals: null,
    monthlyClusterGoals: null,
    monthlyAttendantGoals: null,
  };

  const emit = () => {
    if (Object.values(state).some((value) => value === null)) return;
    callback?.(summarizeScopePayload({
      monthKey: normalizedMonth,
      scope,
      clusterId,
      attendantId,
      cities: state.cities,
      users: state.users,
      leads: state.leads,
      holidays: state.holidays,
      monthlyGoals: state.monthlyGoals,
      monthlyClusterGoals: state.monthlyClusterGoals,
      monthlyAttendantGoals: state.monthlyAttendantGoals,
    }));
  };

  const safeListen = (ref, key) => onSnapshot(
    ref,
    (snapshot) => {
      state[key] = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
      emit();
    },
    (error) => {
      state[key] = [];
      onError?.(error);
      emit();
    },
  );

  const unsubscribers = [
    safeListen(buildCitiesQuery(scope, clusterId), 'cities'),
    safeListen(buildUsersQuery(scope, clusterId), 'users'),
    safeListen(buildLeadsQuery(scope, normalizedMonth, attendantId), 'leads'),
    safeListen(collection(db, 'holidays'), 'holidays'),
    safeListen(buildGoalsQuery(scope, normalizedMonth, clusterId, 'monthly_goals'), 'monthlyGoals'),
    safeListen(buildGoalsQuery(scope, normalizedMonth, clusterId, 'monthly_cluster_goals'), 'monthlyClusterGoals'),
    safeListen(buildAttendantGoalsQuery(normalizedMonth), 'monthlyAttendantGoals'),
  ];

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe?.());
}

export async function loadMonthlySalesScope({ scope = 'global', monthKey = DEFAULT_MONTH, clusterId = '', attendantId = '' }) {
  const normalizedMonth = normalizeMonthKey(monthKey);
  const [citiesSnap, usersSnap, leadsSnap, holidaysSnap, goalsSnap, clusterGoalsSnap, attendantGoalsSnap] = await Promise.all([
    getDocs(buildCitiesQuery(scope, clusterId)),
    getDocs(buildUsersQuery(scope, clusterId)),
    getDocs(buildLeadsQuery(scope, normalizedMonth, attendantId)),
    getDocs(collection(db, 'holidays')),
    getDocs(buildGoalsQuery(scope, normalizedMonth, clusterId, 'monthly_goals')),
    getDocs(buildGoalsQuery(scope, normalizedMonth, clusterId, 'monthly_cluster_goals')),
    getDocs(buildAttendantGoalsQuery(normalizedMonth)),
  ]);

  return summarizeScopePayload({
    monthKey: normalizedMonth,
    scope,
    clusterId,
    attendantId,
    cities: citiesSnap.docs.map((document) => ({ id: document.id, ...document.data() })),
    users: usersSnap.docs.map((document) => ({ id: document.id, ...document.data() })),
    leads: leadsSnap.docs.map((document) => ({ id: document.id, ...document.data() })),
    holidays: holidaysSnap.docs.map((document) => ({ id: document.id, ...document.data() })),
    monthlyGoals: goalsSnap.docs.map((document) => ({ id: document.id, ...document.data() })),
    monthlyClusterGoals: clusterGoalsSnap.docs.map((document) => ({ id: document.id, ...document.data() })),
    monthlyAttendantGoals: attendantGoalsSnap.docs.map((document) => ({ id: document.id, ...document.data() })),
  });
}
