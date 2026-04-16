import { collection, getDocs, query, where } from 'firebase/firestore';

import { db } from '../firebase';
import { getDatesInRange } from '../lib/operationsCalendar';
import { listAbsenceRequestsForScope, listAbsencesForScope } from './absenceRequests';
import { listRhRequestsForScope } from './atendenteRhService';
import { loadMonthlySalesScope } from './monthlySalesService';

const ATTENDANT_ROLE_KEYS = new Set(['attendant', 'atendente']);
const POQ_LIMIT = 4;
const POQ_ALERT_FROM = 3;

function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeRole(value = '') {
  return normalizeText(value).replace(/[\s_-]+/g, '');
}

function isAttendantUser(user = {}) {
  return ATTENDANT_ROLE_KEYS.has(normalizeRole(user.role || ''));
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeMonthKey(value) {
  return /^\d{4}-\d{2}$/.test(String(value || ''))
    ? String(value)
    : new Date().toISOString().slice(0, 7);
}

function shiftMonth(monthKey, offset) {
  const [year, month] = normalizeMonthKey(monthKey).split('-').map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthKey) {
  const [year, month] = normalizeMonthKey(monthKey).split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
    month: 'short',
  });
}

function sortByDateTime(items = [], getDateValue) {
  return [...items].sort((left, right) => getDateValue(left) - getDateValue(right));
}

function parseDateTime(dateValue, timeValue = '00:00') {
  if (!dateValue) return Number.POSITIVE_INFINITY;
  if (String(dateValue).includes('T')) {
    const parsed = new Date(dateValue).getTime();
    return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
  }
  const parsed = new Date(`${dateValue}T${timeValue || '00:00'}:00`).getTime();
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function hasPendingCoverage(absence = {}) {
  if (normalizeText(absence.type) === 'ferias') return false;
  const dates = getDatesInRange(absence.startDate, absence.endDate);
  if (!dates.length) return false;
  return dates.some((date) => !absence.coverageMap?.[date]);
}

function buildPerformanceScore(item = {}) {
  const meta = toNumber(item.metaPlanos);
  const sales = toNumber(item.installedPlanos ?? item.salesPlanos);
  if (meta <= 0) return sales > 0 ? 1 : 0;
  return sales / meta;
}

function buildStoreRankings(storeData = []) {
  const storesWithSignal = storeData
    .filter((item) => item.city)
    .map((item) => ({
      city: item.city,
      salesPlanos: toNumber(item.installedPlanos ?? item.salesPlanos),
      metaPlanos: toNumber(item.metaPlanos),
      projection: toNumber(item.projSales),
      score: buildPerformanceScore(item),
      gap: toNumber(item.installedPlanos ?? item.salesPlanos) - toNumber(item.metaPlanos),
    }));

  const ranked = [...storesWithSignal].sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return right.salesPlanos - left.salesPlanos;
  });

  return {
    topStores: ranked.slice(0, 3),
    bottomStores: [...ranked].reverse().slice(0, 3).reverse(),
  };
}

function buildClusterSummary(storeData = []) {
  const clusterMap = new Map();
  storeData.forEach((item) => {
    const clusterId = String(item.clusterId || 'Sem cluster');
    if (!clusterMap.has(clusterId)) {
      clusterMap.set(clusterId, {
        clusterId,
        salesPlanos: 0,
        metaPlanos: 0,
        projection: 0,
      });
    }
    const current = clusterMap.get(clusterId);
    current.salesPlanos += toNumber(item.installedPlanos ?? item.salesPlanos);
    current.metaPlanos += toNumber(item.metaPlanos);
    current.projection += toNumber(item.projSales);
  });

  return [...clusterMap.values()]
    .map((item) => ({
      ...item,
      score: item.metaPlanos > 0 ? item.salesPlanos / item.metaPlanos : item.salesPlanos,
    }))
    .sort((left, right) => right.score - left.score);
}

function normalizeSponsorshipStatus(value = '') {
  const normalized = normalizeText(value);
  if (normalized === 'aprovado') return 'Aprovado';
  if (normalized === 'recusado') return 'Recusado';
  return 'Pendente';
}

function createEmptyPayload(monthKey) {
  return {
    monthKey: normalizeMonthKey(monthKey),
    sales: {
      scope: null,
      totals: {
        p: 0,
        goalP: 0,
        m: 0,
        ss: 0,
        goalS: 0,
        projP: 0,
        projInstalledP: 0,
        contractedP: 0,
        installedP: 0,
        pendingInstallations: 0,
      },
      evolution: [],
      topStores: [],
      bottomStores: [],
      clusterSummary: [],
    },
    peopleOps: {
      rhPendentes: [],
      absencePendentes: [],
      coveragePendentes: [],
      bankHoursSummary: {
        totalAttendants: 0,
        criticalBalance: 0,
        riskPoq: 0,
        lostPoq: 0,
      },
    },
    absences: {
      faltas: [],
      floaters: [],
    },
    agenda: {
      upcomingEvents: [],
    },
    partnerships: {
      pendingCount: 0,
      approvedUpcomingCount: 0,
      pipeline: { pending: 0, approved: 0, rejected: 0 },
      highlighted: [],
    },
    japa: {
      upcomingActions: [],
    },
  };
}

export async function loadCoordinatorDashboardData({ userData, monthKey } = {}) {
  const normalizedMonth = normalizeMonthKey(monthKey);
  const payload = createEmptyPayload(normalizedMonth);
  const today = new Date().toISOString().slice(0, 10);
  const nowTs = Date.now();
  const currentUid = String(userData?.uid || '').trim();
  const evolutionMonths = Array.from({ length: 6 }, (_, index) => shiftMonth(normalizedMonth, index - 5));

  const [
    salesScope,
    salesHistory,
    rhPendentes,
    absencePendentes,
    absences,
    usersSnapshot,
    eventsSnapshot,
    sponsorshipSnapshot,
    japaSnapshot,
  ] = await Promise.all([
    loadMonthlySalesScope({ scope: 'global', monthKey: normalizedMonth }),
    Promise.all(
      evolutionMonths.map(async (historyMonth) => {
        const scope = await loadMonthlySalesScope({ scope: 'global', monthKey: historyMonth });
        return {
          monthKey: historyMonth,
          label: formatMonthLabel(historyMonth),
          sales: toNumber(scope?.totals?.installedP),
          closed: toNumber(scope?.totals?.contractedP),
          goal: toNumber(scope?.totals?.goalP),
          projection: toNumber(scope?.totals?.projInstalledP),
          sva: toNumber(scope?.totals?.ss),
          svaGoal: toNumber(scope?.totals?.goalS),
        };
      })
    ),
    listRhRequestsForScope(userData, { includeHistory: false }),
    listAbsenceRequestsForScope(userData, { includeHistory: false }),
    listAbsencesForScope(userData, { includePast: false }),
    getDocs(collection(db, 'users')),
    currentUid
      ? getDocs(query(collection(db, 'events'), where('userId', '==', currentUid)))
      : Promise.resolve({ docs: [] }),
    getDocs(collection(db, 'sponsorships')),
    getDocs(collection(db, 'marketing_actions')),
  ]);

  const users = usersSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  const attendants = users.filter((item) => isAttendantUser(item) && item.active !== false);
  const floaters = attendants.map((item) => ({ id: item.id, ...item }));
  const bankHoursSummary = attendants.reduce((accumulator, item) => {
    const balance = Math.abs(toNumber(item.hourBalance));
    const manualAdjustments = toNumber(item.manualAdjustments);
    return {
      totalAttendants: accumulator.totalAttendants + 1,
      criticalBalance: accumulator.criticalBalance + (balance > 20 ? 1 : 0),
      riskPoq: accumulator.riskPoq + (manualAdjustments >= POQ_ALERT_FROM && manualAdjustments < POQ_LIMIT ? 1 : 0),
      lostPoq: accumulator.lostPoq + (manualAdjustments >= POQ_LIMIT ? 1 : 0),
    };
  }, {
    totalAttendants: 0,
    criticalBalance: 0,
    riskPoq: 0,
    lostPoq: 0,
  });

  const faltas = absences
    .filter((item) => normalizeText(item.type) !== 'ferias')
    .sort((left, right) => String(left.startDate || '').localeCompare(String(right.startDate || '')));

  const coveragePendentes = faltas.filter((item) => hasPendingCoverage(item));

  const upcomingEvents = sortByDateTime(
    eventsSnapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .filter((item) => String(item.date || '') >= today),
    (item) => parseDateTime(item.date, item.time)
  ).slice(0, 5);

  const sponsorshipItems = sponsorshipSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  const sponsorshipPipeline = sponsorshipItems.reduce((accumulator, item) => {
    const normalizedStatus = normalizeSponsorshipStatus(item.status);
    if (normalizedStatus === 'Aprovado') accumulator.approved += 1;
    else if (normalizedStatus === 'Recusado') accumulator.rejected += 1;
    else accumulator.pending += 1;
    return accumulator;
  }, { pending: 0, approved: 0, rejected: 0 });

  const pendingSponsorships = sponsorshipItems
    .filter((item) => normalizeSponsorshipStatus(item.status) === 'Pendente')
    .sort((left, right) => {
      const rightSeconds = right.createdAt?.seconds || 0;
      const leftSeconds = left.createdAt?.seconds || 0;
      return rightSeconds - leftSeconds;
    });

  const approvedUpcoming = sortByDateTime(
    sponsorshipItems.filter((item) => (
      normalizeSponsorshipStatus(item.status) === 'Aprovado'
      && parseDateTime(item.dateTime) >= nowTs
    )),
    (item) => parseDateTime(item.dateTime)
  );

  const highlightedPartnerships = [
    ...pendingSponsorships.slice(0, 2).map((item) => ({ ...item, displayStatus: 'Pendente' })),
    ...approvedUpcoming.slice(0, 2).map((item) => ({ ...item, displayStatus: 'Aprovado' })),
  ].slice(0, 4);

  const upcomingActions = sortByDateTime(
    japaSnapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .filter((item) => String(item.date || '') >= today),
    (item) => parseDateTime(item.date, item.time)
  ).slice(0, 5);

  const { topStores, bottomStores } = buildStoreRankings(salesScope?.storeData || []);
  const clusterSummary = buildClusterSummary(salesScope?.storeData || []);

  return {
    monthKey: normalizedMonth,
    sales: {
      scope: salesScope,
      totals: {
        p: toNumber(salesScope?.totals?.p),
        goalP: toNumber(salesScope?.totals?.goalP),
        m: toNumber(salesScope?.totals?.m),
        ss: toNumber(salesScope?.totals?.ss),
        goalS: toNumber(salesScope?.totals?.goalS),
        projP: toNumber(salesScope?.totals?.projP),
        projInstalledP: toNumber(salesScope?.totals?.projInstalledP),
        contractedP: toNumber(salesScope?.totals?.contractedP),
        installedP: toNumber(salesScope?.totals?.installedP),
        pendingInstallations: toNumber(salesScope?.totals?.pendingInstallations),
      },
      evolution: salesHistory,
      topStores,
      bottomStores,
      clusterSummary,
    },
    peopleOps: {
      rhPendentes,
      absencePendentes,
      coveragePendentes,
      bankHoursSummary,
    },
    absences: {
      faltas,
      floaters,
    },
    agenda: {
      upcomingEvents,
    },
    partnerships: {
      pendingCount: pendingSponsorships.length,
      approvedUpcomingCount: approvedUpcoming.length,
      pipeline: sponsorshipPipeline,
      highlighted: highlightedPartnerships,
    },
    japa: {
      upcomingActions,
    },
  };
}

export { createEmptyPayload as createEmptyCoordinatorDashboardPayload };
