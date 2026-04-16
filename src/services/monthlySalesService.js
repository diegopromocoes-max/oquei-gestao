import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';

import { db } from '../firebase';
import {
  buildStoreWorkingDaysMap,
  bucketLeadByBusinessType,
  buildPlanCarryoverFromPreviousMonth,
  buildPlanStoreMetrics,
  buildSecondaryCategoryMetrics,
  buildAttendantCards,
} from './salesDashboardModel';

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

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

function dedupeDocsById(items = []) {
  const seen = new Map();
  items.forEach((item) => {
    if (!item?.id) return;
    if (!seen.has(item.id)) {
      seen.set(item.id, item);
    }
  });
  return [...seen.values()];
}

function matchesMonthField(lead = {}, fieldName, monthKey) {
  return String(lead?.[fieldName] || '').trim() === normalizeMonthKey(monthKey);
}

function matchesOpenedMonth(lead = {}, monthKey) {
  return String(lead?.monthKey || '').trim() === normalizeMonthKey(monthKey);
}

function matchesLifecycleMonth(lead = {}, monthKey) {
  return (
    matchesMonthField(lead, 'contractedMonthKey', monthKey)
    || matchesMonthField(lead, 'installMonthKey', monthKey)
    || matchesOpenedMonth(lead, monthKey)
  );
}

// Mantido por compatibilidade com consumidores legados (wallboardService, etc.)
function normalizeLeadType(value = '') {
  const safeValue = String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (safeValue.includes('migra')) return 'Migracao';
  if (
    safeValue.includes('sva')
    || safeValue.includes('servicos adicionais')
    || safeValue.includes('servico adicional')
  ) return 'SVA';
  return 'Plano Novo';
}

function getPreviousMonthKey(monthKey) {
  const [year, month] = normalizeMonthKey(monthKey).split('-').map(Number);
  const prev = new Date(year, month - 2, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
}

function getFirstDayOfPeriod(monthKey) {
  return `${normalizeMonthKey(monthKey)}-01`;
}

// Calendário global simplificado — mantido para backward compat com consumidores externos
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
  prevMonthLeads = [],
  monthlyGoals = {},
  monthlyAttendantGoals = {},
  attendantUsersByCity = {},
  calendar,
  workingDaysMap,
  monthKey,
  firstDayOfPeriod,
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
      const cityId = String(lead.cityId || '').trim();
      const cityName = normalizeText(lead.cityName || '');
      return cityId === String(store.id) || cityName === normalizeText(store.name || store.nome || '');
    });

    const storePrevLeads = prevMonthLeads.filter((lead) => {
      const cityId = String(lead.cityId || '').trim();
      const cityName = normalizeText(lead.cityName || '');
      return cityId === String(store.id) || cityName === normalizeText(store.name || store.nome || '');
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

    const fallbackPlanGoal = buildStorefrontGoalSnapshot(goal);
    const goalPlansOfficial = hasSyncedAttendantGoals ? attendantGoalSummary.plans : fallbackPlanGoal;

    // Dias úteis por loja — usa mapa per-store; fallback para calendário global
    const storeWorkingDays = workingDaysMap?.get(store.id) || {
      total: calendar?.total || 22,
      elapsed: calendar?.worked || 1,
      remaining: calendar?.remaining || 21,
    };

    const carryover = buildPlanCarryoverFromPreviousMonth(storePrevLeads, firstDayOfPeriod);

    const planMetrics = buildPlanStoreMetrics({
      storeLeads,
      workingDays: storeWorkingDays,
      goalPlansOfficial,
      previousMonthCarryoverPlans: carryover,
      monthKey,
    });

    const svaMetrics = buildSecondaryCategoryMetrics({
      storeLeads,
      monthKey,
      category: 'sva',
      goal: hasSyncedAttendantGoals ? attendantGoalSummary.sva : (parseInt(goal.sva, 10) || 0),
    });

    const migrationMetrics = buildSecondaryCategoryMetrics({
      storeLeads,
      monthKey,
      category: 'migrations',
      goal: parseInt(goal.migrations, 10) || 0,
    });

    return {
      id: store.id,
      city: store.name || store.nome || store.id,
      clusterId: store.clusterId || '',

      // --- novos campos do modelo ---
      ...planMetrics,
      sva: svaMetrics,
      migrations: migrationMetrics,
      attendantGoalSource: hasSyncedAttendantGoals ? 'individual' : 'store',

      // --- campos legados mantidos para backward compat ---
      metaPlanos: goalPlansOfficial,
      salesPlanos: planMetrics.salesGrossPlans,
      installedPlanos: planMetrics.installedPlansOfficial,
      salesSVA: svaMetrics.realized,
      metaSVA: svaMetrics.goal,
      salesMigracoes: migrationMetrics.realized,
      metaMigracoes: migrationMetrics.goal,
      projSales: planMetrics.projectedMonthSalesPlans,
    };
  }).sort((left, right) => right.salesGrossPlans - left.salesGrossPlans);
}

function buildTotals({ storeData = [], calendar, monthlyClusterGoals = {}, clusterFilter = 'all', uniqueClusters = [] }) {
  const totals = storeData.reduce((accumulator, store) => ({
    p: accumulator.p + store.salesGrossPlans,
    i: accumulator.i + store.installedPlansOfficial,
    ss: accumulator.ss + store.salesSVA,
    m: accumulator.m + store.salesMigracoes,
    gp: accumulator.gp + store.goalPlansOfficial,
    gm: accumulator.gm + store.metaMigracoes,
    gs: accumulator.gs + store.metaSVA,
    salesGrossPlans: accumulator.salesGrossPlans + store.salesGrossPlans,
    installedPlansOfficial: accumulator.installedPlansOfficial + store.installedPlansOfficial,
    pendingInstallationsCurrentMonth: accumulator.pendingInstallationsCurrentMonth + store.pendingInstallationsCurrentMonth,
    previousMonthCarryoverPlans: accumulator.previousMonthCarryoverPlans + store.previousMonthCarryoverPlans,
    projectedMonthSalesPlans: accumulator.projectedMonthSalesPlans + store.projectedMonthSalesPlans,
    installedPlansProjectionOfficial: accumulator.installedPlansProjectionOfficial + store.installedPlansProjectionOfficial,
  }), {
    p: 0,
    i: 0,
    ss: 0,
    m: 0,
    gp: 0,
    gm: 0,
    gs: 0,
    salesGrossPlans: 0,
    installedPlansOfficial: 0,
    pendingInstallationsCurrentMonth: 0,
    previousMonthCarryoverPlans: 0,
    projectedMonthSalesPlans: 0,
    installedPlansProjectionOfficial: 0,
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

  const workRatio = (calendar?.total || 22) / (calendar?.worked || 1);
  const goalP = totals.gp;
  const goalM = hasClusterGoals ? clusterGoalMigracoes : totals.gm;
  const goalS = totals.gs;

  return {
    ...totals,
    goalP,
    goalM,
    goalS,
    goalSales: goalP + goalM + goalS,
    contractedP: totals.salesGrossPlans,
    installedP: totals.installedPlansOfficial,
    pendingInstallations: totals.pendingInstallationsCurrentMonth,
    projInstalledP: totals.installedPlansProjectionOfficial,
    // projeções legadas (backward compat)
    projP: Math.floor(totals.p * workRatio),
    projM: Math.floor(totals.m * workRatio),
    projI: totals.installedPlansProjectionOfficial,
    projS: Math.floor(totals.ss * workRatio),
  };
}

function buildSvaAnalysis(leads = []) {
  const svaCounts = {};
  const sellerCounts = {};
  const cityCounts = {};

  leads
    .filter((lead) => normalizeLeadType(lead.categoryName || lead.leadType || lead.productName) === 'SVA' && SALE_STATUSES.has(lead.status))
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
    officialLeads: [],
    prevRelevantLeads: [],
    prevMonthLeads: [],
    holidays: [],
    monthlyGoals: {},
    monthlyClusterGoals: {},
    monthlyAttendantGoals: {},
    globalCalendar: getCalendarForMonth(monthKey, []),
    uniqueClusters: [],
    storeData: [],
    attendantCards: [],
    totals: {
      p: 0, i: 0, ss: 0, m: 0,
      gp: 0, gm: 0, gs: 0,
      goalP: 0, goalM: 0, goalS: 0, goalSales: 0,
      projP: 0, projM: 0, projI: 0, projS: 0,
      contractedP: 0, installedP: 0, pendingInstallations: 0, projInstalledP: 0,
      salesGrossPlans: 0, installedPlansOfficial: 0,
      pendingInstallationsCurrentMonth: 0,
      previousMonthCarryoverPlans: 0, projectedMonthSalesPlans: 0,
      installedPlansProjectionOfficial: 0,
    },
    salesCount: 0,
    installedCount: 0,
    svaAnalysis: { radarData: [], topSellers: [], topCities: [] },
    topAttendants: [],
    openedLeadsCount: 0,
  };
}

export function buildScopedSalesView(rawPayload = emptyScopePayload(), { clusterFilter = 'all', cityFilter = 'all' } = {}) {
  const payload = rawPayload || emptyScopePayload();
  const globalCalendar = payload.globalCalendar || getCalendarForMonth(payload.monthKey, payload.holidays);
  const uniqueClusters = Array.from(new Set((payload.cities || []).map((city) => city.clusterId).filter(Boolean)));
  const attendantUsersByCity = buildAttendantUsersByCity(payload.users || []);
  const firstDayOfPeriod = getFirstDayOfPeriod(payload.monthKey);
  const openedLeads = payload.leads || [];
  const officialLeads = payload.officialLeads || payload.leads || [];
  const previousRelevantLeads = payload.prevRelevantLeads || payload.prevMonthLeads || [];

  // Mapa de dias úteis por loja usando calendário operacional
  let workingDaysMap;
  try {
    workingDaysMap = buildStoreWorkingDaysMap(
      payload.cities || [],
      payload.holidays || [],
      payload.monthKey,
    );
  } catch {
    workingDaysMap = new Map();
  }

  const storeData = buildStoreData({
    stores: payload.cities || [],
    leads: officialLeads,
    prevMonthLeads: previousRelevantLeads,
    monthlyGoals: payload.monthlyGoals || {},
    monthlyAttendantGoals: payload.monthlyAttendantGoals || {},
    attendantUsersByCity,
    calendar: globalCalendar,
    workingDaysMap,
    monthKey: payload.monthKey,
    firstDayOfPeriod,
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

  const matchesScopedFilters = (lead) => {
    if (clusterFilter !== 'all' && String(lead.clusterId || lead.cluster || '') !== String(clusterFilter)) {
      return false;
    }
    if (cityFilter !== 'all') {
      const cityId = String(lead.cityId || '');
      const cityName = String(lead.cityName || '');
      return cityId === String(cityFilter) || cityName === String(cityFilter);
    }
    return true;
  };

  const visibleLeads = officialLeads.filter(matchesScopedFilters);
  const visibleOpenedLeads = openedLeads.filter(matchesScopedFilters);

  const attendantCards = buildAttendantCards({
    leads: visibleLeads,
    prevMonthLeads: previousRelevantLeads,
    monthKey: payload.monthKey,
    firstDayOfPeriod,
    workingDaysMap,
    monthlyAttendantGoalsByCity: payload.monthlyAttendantGoals || {},
    attendantUsersByCity,
    monthlyGoals: payload.monthlyGoals || {},
  });

  return {
    ...payload,
    globalCalendar,
    uniqueClusters,
    storeData,
    totals,
    attendantCards,
    topAttendants: attendantCards
      .map((item) => ({
        attendantId: item.attendantId,
        attendantName: item.attendantName,
        installs: item.installedPlansOfficial || 0,
        sales: item.salesGrossPlans || 0,
        goal: item.goalPlansOfficial || 0,
        projection: item.installedPlansProjectionOfficial || 0,
        cityId: item.cityId || '',
        cityName: item.cityName || '',
      }))
      .sort((left, right) => {
        if (right.installs !== left.installs) return right.installs - left.installs;
        return right.sales - left.sales;
      }),
    salesCount: visibleLeads.filter((lead) => SALE_STATUSES.has(lead.status)).length,
    installedCount: visibleLeads.filter((lead) => INSTALL_STATUSES.has(lead.status)).length,
    svaAnalysis: buildSvaAnalysis(visibleLeads),
    openedLeadsCount: visibleOpenedLeads.length,
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
  officialLeads,
  prevMonthLeads,
  prevRelevantLeads,
  holidays,
  monthlyGoals,
  monthlyClusterGoals,
  monthlyAttendantGoals,
}) {
  const cityMaps = buildCityMaps(cities);
  const scopedCities = buildScopedCities(cities, { scope, clusterId });
  const mapScopedLead = (lead) => {
    const resolvedCity = resolveLeadCity(lead, cityMaps);
    const resolvedClusterId = resolveLeadClusterId(lead, cityMaps);
    const canonicalCityId = String(resolvedCity?.id || lead.cityId || '').trim();
    return {
      ...lead,
      cityId: canonicalCityId || String(lead.cityId || '').trim(),
      cityName: lead.cityName || resolvedCity?.name || resolvedCity?.nome || canonicalCityId || lead.cityId || '',
      clusterId: lead.clusterId || resolvedClusterId || '',
    };
  };

  const scopedLeads = filterLeadsByScope(leads, { scope, clusterId, attendantId }, cityMaps).map(mapScopedLead);
  const scopedOfficialLeads = filterLeadsByScope(officialLeads || leads, { scope, clusterId, attendantId }, cityMaps).map(mapScopedLead);

  const scopedPrevLeads = filterLeadsByScope(prevMonthLeads || [], { scope, clusterId, attendantId }, cityMaps).map(mapScopedLead);
  const scopedPrevRelevantLeads = filterLeadsByScope(prevRelevantLeads || prevMonthLeads || [], { scope, clusterId, attendantId }, cityMaps).map(mapScopedLead);

  return buildScopedSalesView({
    monthKey,
    cities: scopedCities,
    users,
    leads: scopedLeads,
    officialLeads: dedupeDocsById(scopedOfficialLeads),
    prevMonthLeads: scopedPrevLeads,
    prevRelevantLeads: dedupeDocsById(scopedPrevRelevantLeads),
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

function buildLeadFieldQuery(fieldName, monthKey) {
  return query(collection(db, 'leads'), where(fieldName, '==', monthKey));
}

function buildAttendantUniverseQuery(attendantId) {
  return query(collection(db, 'leads'), where('attendantId', '==', attendantId));
}

function buildGoalsQuery(scope, monthKey, clusterId, collectionName) {
  const constraints = [where('month', '==', monthKey)];
  if (scope === 'cluster' && clusterId && collectionName === 'monthly_cluster_goals') {
    constraints.push(where('clusterId', '==', clusterId));
  }
  return query(collection(db, collectionName), ...constraints);
}

function buildUsersQuery() {
  return collection(db, 'users');
}

function buildAttendantGoalsQuery(monthKey) {
  return query(collection(db, 'monthly_attendant_goals'), where('month', '==', monthKey));
}

export function listenMonthlySalesScope({ scope = 'global', monthKey = DEFAULT_MONTH, clusterId = '', attendantId = '', callback, onError }) {
  const normalizedMonth = normalizeMonthKey(monthKey);
  const prevMonth = getPreviousMonthKey(normalizedMonth);

  const state = {
    cities: null,
    users: null,
    leads: null,
    officialLeads: null,
    prevMonthLeads: null,
    prevRelevantLeads: null,
    holidays: null,
    monthlyGoals: null,
    monthlyClusterGoals: null,
    monthlyAttendantGoals: null,
    contractedMonthLeads: scope === 'attendant' ? [] : null,
    installedMonthLeads: scope === 'attendant' ? [] : null,
    prevContractedMonthLeads: scope === 'attendant' ? [] : null,
  };

  const emitSnapshot = () => {
    if ([state.cities, state.users, state.leads, state.officialLeads, state.prevMonthLeads, state.prevRelevantLeads, state.holidays, state.monthlyGoals, state.monthlyClusterGoals, state.monthlyAttendantGoals].some((value) => value === null)) {
      return;
    }
    callback?.(summarizeScopePayload({
      monthKey: normalizedMonth,
      scope,
      clusterId,
      attendantId,
      cities: state.cities,
      users: state.users,
      leads: state.leads,
      officialLeads: state.officialLeads,
      prevMonthLeads: state.prevMonthLeads,
      prevRelevantLeads: state.prevRelevantLeads,
      holidays: state.holidays,
      monthlyGoals: state.monthlyGoals,
      monthlyClusterGoals: state.monthlyClusterGoals,
      monthlyAttendantGoals: state.monthlyAttendantGoals,
    }));
  };

  const reconcileLeadSets = () => {
    if (scope !== 'attendant') {
      if ([state.leads, state.prevMonthLeads, state.contractedMonthLeads, state.installedMonthLeads, state.prevContractedMonthLeads].some((value) => value === null)) {
        return;
      }

      state.officialLeads = dedupeDocsById([
        ...(state.leads || []),
        ...(state.contractedMonthLeads || []),
        ...(state.installedMonthLeads || []),
      ]);
      state.prevRelevantLeads = dedupeDocsById([
        ...(state.prevMonthLeads || []),
        ...(state.prevContractedMonthLeads || []),
      ]);
    }

    emitSnapshot();
  };

  const safeListen = (ref, key) => onSnapshot(
    ref,
    (snapshot) => {
      state[key] = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
      reconcileLeadSets();
    },
    (error) => {
      state[key] = [];
      onError?.(error);
      reconcileLeadSets();
    },
  );

  const unsubscribers = [
    safeListen(buildCitiesQuery(scope, clusterId), 'cities'),
    safeListen(buildUsersQuery(), 'users'),
    safeListen(collection(db, 'holidays'), 'holidays'),
    safeListen(buildGoalsQuery(scope, normalizedMonth, clusterId, 'monthly_goals'), 'monthlyGoals'),
    safeListen(buildGoalsQuery(scope, normalizedMonth, clusterId, 'monthly_cluster_goals'), 'monthlyClusterGoals'),
    safeListen(buildAttendantGoalsQuery(normalizedMonth), 'monthlyAttendantGoals'),
  ];

  if (scope === 'attendant' && attendantId) {
    unsubscribers.push(onSnapshot(
      buildAttendantUniverseQuery(attendantId),
      (snapshot) => {
        const attendantLeads = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
        state.leads = attendantLeads.filter((lead) => matchesOpenedMonth(lead, normalizedMonth));
        state.prevMonthLeads = attendantLeads.filter((lead) => matchesOpenedMonth(lead, prevMonth));
        state.prevRelevantLeads = attendantLeads.filter((lead) => matchesLifecycleMonth(lead, prevMonth));
        state.officialLeads = attendantLeads.filter((lead) => matchesLifecycleMonth(lead, normalizedMonth));
        reconcileLeadSets();
      },
      (error) => {
        state.leads = [];
        state.prevMonthLeads = [];
        state.prevRelevantLeads = [];
        state.officialLeads = [];
        onError?.(error);
        reconcileLeadSets();
      },
    ));
  } else {
    unsubscribers.push(
      safeListen(buildLeadsQuery(scope, normalizedMonth, attendantId), 'leads'),
      safeListen(buildLeadsQuery(scope, prevMonth, attendantId), 'prevMonthLeads'),
      safeListen(buildLeadFieldQuery('contractedMonthKey', normalizedMonth), 'contractedMonthLeads'),
      safeListen(buildLeadFieldQuery('installMonthKey', normalizedMonth), 'installedMonthLeads'),
      safeListen(buildLeadFieldQuery('contractedMonthKey', prevMonth), 'prevContractedMonthLeads'),
    );
  }

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe?.());
}

export async function loadMonthlySalesScope({ scope = 'global', monthKey = DEFAULT_MONTH, clusterId = '', attendantId = '' }) {
  const normalizedMonth = normalizeMonthKey(monthKey);
  const prevMonth = getPreviousMonthKey(normalizedMonth);

  const baseReads = await Promise.all([
    getDocs(buildCitiesQuery(scope, clusterId)),
    getDocs(buildUsersQuery()),
    getDocs(collection(db, 'holidays')),
    getDocs(buildGoalsQuery(scope, normalizedMonth, clusterId, 'monthly_goals')),
    getDocs(buildGoalsQuery(scope, normalizedMonth, clusterId, 'monthly_cluster_goals')),
    getDocs(buildAttendantGoalsQuery(normalizedMonth)),
  ]);

  const [
    citiesSnap,
    usersSnap,
    holidaysSnap,
    goalsSnap,
    clusterGoalsSnap,
    attendantGoalsSnap,
  ] = baseReads;

  let leads = [];
  let officialLeads = [];
  let prevMonthLeads = [];
  let prevRelevantLeads = [];

  if (scope === 'attendant' && attendantId) {
    const universeSnap = await getDocs(buildAttendantUniverseQuery(attendantId));
    const attendantLeads = universeSnap.docs.map((document) => ({ id: document.id, ...document.data() }));
    leads = attendantLeads.filter((lead) => matchesOpenedMonth(lead, normalizedMonth));
    officialLeads = attendantLeads.filter((lead) => matchesLifecycleMonth(lead, normalizedMonth));
    prevMonthLeads = attendantLeads.filter((lead) => matchesOpenedMonth(lead, prevMonth));
    prevRelevantLeads = attendantLeads.filter((lead) => matchesLifecycleMonth(lead, prevMonth));
  } else {
    const [
      leadsSnap,
      prevLeadsSnap,
      contractedSnap,
      installedSnap,
      prevContractedSnap,
    ] = await Promise.all([
      getDocs(buildLeadsQuery(scope, normalizedMonth, attendantId)),
      getDocs(buildLeadsQuery(scope, prevMonth, attendantId)),
      getDocs(buildLeadFieldQuery('contractedMonthKey', normalizedMonth)),
      getDocs(buildLeadFieldQuery('installMonthKey', normalizedMonth)),
      getDocs(buildLeadFieldQuery('contractedMonthKey', prevMonth)),
    ]);
    leads = leadsSnap.docs.map((document) => ({ id: document.id, ...document.data() }));
    prevMonthLeads = prevLeadsSnap.docs.map((document) => ({ id: document.id, ...document.data() }));
    officialLeads = dedupeDocsById([
      ...leads,
      ...contractedSnap.docs.map((document) => ({ id: document.id, ...document.data() })),
      ...installedSnap.docs.map((document) => ({ id: document.id, ...document.data() })),
    ]);
    prevRelevantLeads = dedupeDocsById([
      ...prevMonthLeads,
      ...prevContractedSnap.docs.map((document) => ({ id: document.id, ...document.data() })),
    ]);
  }

  return summarizeScopePayload({
    monthKey: normalizedMonth,
    scope,
    clusterId,
    attendantId,
    cities: citiesSnap.docs.map((document) => ({ id: document.id, ...document.data() })),
    users: usersSnap.docs.map((document) => ({ id: document.id, ...document.data() })),
    leads,
    officialLeads,
    prevMonthLeads,
    prevRelevantLeads,
    holidays: holidaysSnap.docs.map((document) => ({ id: document.id, ...document.data() })),
    monthlyGoals: goalsSnap.docs.map((document) => ({ id: document.id, ...document.data() })),
    monthlyClusterGoals: clusterGoalsSnap.docs.map((document) => ({ id: document.id, ...document.data() })),
    monthlyAttendantGoals: attendantGoalsSnap.docs.map((document) => ({ id: document.id, ...document.data() })),
  });
}
