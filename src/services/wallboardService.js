import { collection, getDocs, query, where } from 'firebase/firestore';

import { db } from '../firebase';
import { getDatesInRange } from '../lib/operationsCalendar';
import { listAbsencesForScope } from './absenceRequests';
import { loadMonthlySalesScope } from './monthlySalesService';

const DEFAULT_MONTH = new Date().toISOString().slice(0, 7);
const SALE_STATUSES = new Set(['Contratado', 'Instalado']);
const ATTENDANT_ROLE_KEYS = new Set(['attendant', 'atendente']);
const CHURN_GRADIENTS = [
  { gradId: 'neon-orange', solidColor: '#f83600', fillId: 'neon-orange-alpha' },
  { gradId: 'neon-purple', solidColor: '#c471ed', fillId: 'neon-purple-alpha' },
  { gradId: 'neon-cyan', solidColor: '#00f2fe', fillId: 'neon-cyan-alpha' },
  { gradId: 'neon-green', solidColor: '#0ba360', fillId: 'neon-green-alpha' },
];

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

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeMonthKey(value) {
  return /^\d{4}-\d{2}$/.test(String(value || '')) ? String(value) : DEFAULT_MONTH;
}

function shiftMonth(monthKey, offset) {
  const [year, month] = normalizeMonthKey(monthKey).split('-').map(Number);
  const shifted = new Date(year, month - 1 + offset, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`;
}

function buildRecentMonths(monthKey, total = 6) {
  return Array.from({ length: total }, (_, index) => shiftMonth(monthKey, index - (total - 1)));
}

function formatMonthLabel(monthKey) {
  const [year, month] = normalizeMonthKey(monthKey).split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'short' });
}

function isAttendantUser(user = {}) {
  return ATTENDANT_ROLE_KEYS.has(normalizeRole(user.role || ''));
}

function isSupervisorScope(userData = {}) {
  return normalizeRole(userData.role || '') === 'supervisor' && String(userData.clusterId || '').trim();
}

function resolveScope(userData = {}) {
  if (isSupervisorScope(userData)) {
    return {
      scope: 'cluster',
      clusterId: String(userData.clusterId || '').trim(),
    };
  }

  return {
    scope: 'global',
    clusterId: '',
  };
}

function getCityName(city = {}) {
  return city.name || city.nome || city.cityName || city.id || 'Unidade';
}

function getClusterLabel(city = {}) {
  return city.clusterName || city.clusterNameLabel || city.clusterId || 'Sem regional';
}

function getResultCityId(result = {}) {
  if (result.cityId) return String(result.cityId);
  return String(result.id || '').replace(/^\d{4}-\d{2}_/, '');
}

function sumResultSales(result = {}) {
  return Object.values(result.vendas || {}).reduce((total, channelSales) => (
    total + Object.values(channelSales || {}).reduce((channelTotal, value) => channelTotal + toNumber(value), 0)
  ), 0);
}

function prettifyReasonLabel(value = '') {
  const safeValue = String(value || '').replace(/[_-]+/g, ' ').trim();
  if (!safeValue) return 'Outros';
  return safeValue.charAt(0).toUpperCase() + safeValue.slice(1);
}

function toTimestamp(value) {
  if (!value) return 0;
  if (typeof value?.toDate === 'function') {
    return value.toDate().getTime();
  }
  if (typeof value?.seconds === 'number') {
    return value.seconds * 1000;
  }
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function getLeadSortValue(lead = {}) {
  return Math.max(
    toTimestamp(lead.createdAt),
    toTimestamp(lead.updatedAt),
    toTimestamp(lead.date),
  );
}

function isSaleLead(lead = {}) {
  return SALE_STATUSES.has(String(lead.status || '').trim());
}

function formatHourBalance(value) {
  const numeric = toNumber(value);
  const signal = numeric > 0 ? '+' : '';
  return `${signal}${numeric.toFixed(1)}h`;
}

function formatNetAdds(value) {
  const numeric = toNumber(value);
  const signal = numeric > 0 ? '+' : '';
  return `${signal}${numeric}`;
}

function getScopedAttendants(users = [], cities = [], clusterId = '') {
  const scopedCityIds = new Set(cities.map((city) => String(city.id)));
  const scopedCityNames = new Set(cities.map((city) => normalizeText(getCityName(city))));

  return users
    .filter((user) => isAttendantUser(user) && user.active !== false)
    .filter((user) => {
      const userCityId = String(user.cityId || user.storeId || '').trim();
      const userCityName = normalizeText(user.cityName || user.storeName || '');
      const userClusterId = String(user.clusterId || '').trim();
      if (scopedCityIds.size && userCityId && scopedCityIds.has(userCityId)) return true;
      if (scopedCityNames.size && userCityName && scopedCityNames.has(userCityName)) return true;
      if (clusterId && userClusterId === clusterId) return true;
      return !clusterId && !scopedCityIds.size;
    });
}

function buildRhData({ users = [], cities = [], absences = [], clusterId = '' }) {
  const attendants = getScopedAttendants(users, cities, clusterId);
  const today = new Date().toISOString().slice(0, 10);

  const currentAbsences = absences.filter((item) => {
    const type = normalizeText(item.type);
    if (type === 'ferias') return false;
    return getDatesInRange(item.startDate, item.endDate).includes(today);
  });

  const topPositivo = attendants
    .filter((user) => toNumber(user.hourBalance) > 0)
    .sort((left, right) => toNumber(right.hourBalance) - toNumber(left.hourBalance))
    .slice(0, 3)
    .map((user) => ({
      name: user.name || 'Colaborador',
      hours: formatHourBalance(user.hourBalance),
    }));

  const topNegativo = attendants
    .filter((user) => toNumber(user.hourBalance) < 0)
    .sort((left, right) => toNumber(left.hourBalance) - toNumber(right.hourBalance))
    .slice(0, 3)
    .map((user) => ({
      name: user.name || 'Colaborador',
      hours: formatHourBalance(user.hourBalance),
    }));

  const lojasAbertas = cities.filter((city) => city.active !== false).length;
  const lojasFechadas = Math.max(0, cities.length - lojasAbertas);

  return {
    lojasAbertas,
    lojasFechadas,
    atendentesTrabalhando: attendants.length,
    atendentesAtestado: currentAbsences.length,
    topPositivo,
    topNegativo,
  };
}

function buildTopSellers(leads = [], cities = []) {
  const cityNameById = new Map(cities.map((city) => [String(city.id), getCityName(city)]));
  const sellerMap = new Map();

  leads
    .filter((lead) => isSaleLead(lead))
    .forEach((lead) => {
      const sellerName = lead.attendantName || 'Equipe';
      const storeName = lead.cityName || cityNameById.get(String(lead.cityId || '')) || lead.cityId || 'Sem unidade';
      const current = sellerMap.get(sellerName) || {
        id: sellerName,
        name: sellerName,
        store: storeName,
        sales: 0,
      };
      current.sales += 1;
      current.store = current.store || storeName;
      sellerMap.set(sellerName, current);
    });

  return [...sellerMap.values()]
    .sort((left, right) => {
      if (right.sales !== left.sales) return right.sales - left.sales;
      return left.name.localeCompare(right.name);
    })
    .slice(0, 5);
}

function buildSalesData(salesScope = {}) {
  const storeData = salesScope.storeData || [];
  const totals = salesScope.totals || {};
  const clusterSalesGoal = toNumber(totals.goalP) > 0 ? toNumber(totals.goalP) : Math.max(toNumber(totals.p), 1);
  const clusterInstallsGoal = toNumber(totals.p) > 0 ? toNumber(totals.p) : Math.max(toNumber(totals.i), 1);

  return {
    cluster: {
      sales: toNumber(totals.p),
      salesGoal: clusterSalesGoal,
      installs: toNumber(totals.i),
      installsGoal: clusterInstallsGoal,
      backlog: Math.max(0, toNumber(totals.p) - toNumber(totals.i)),
    },
    cities: storeData.map((item) => ({
      name: item.city || 'Unidade',
      sales: toNumber(item.salesPlanos),
      salesGoal: toNumber(item.metaPlanos) > 0 ? toNumber(item.metaPlanos) : Math.max(toNumber(item.salesPlanos), 1),
      installs: toNumber(item.installedPlanos),
      installsGoal: toNumber(item.salesPlanos) > 0 ? toNumber(item.salesPlanos) : Math.max(toNumber(item.installedPlanos), 1),
      backlog: Math.max(0, toNumber(item.salesPlanos) - toNumber(item.installedPlanos)),
    })),
    topSellers: buildTopSellers(salesScope.leads || [], salesScope.cities || []),
  };
}

function buildCurrentCityMetrics({ cities = [], results = [], currentMonth = DEFAULT_MONTH }) {
  const resultMap = new Map(
    results.map((result) => [`${result.month}_${getResultCityId(result)}`, result])
  );

  return cities.map((city) => {
    const result = resultMap.get(`${currentMonth}_${city.id}`) || null;
    const currentResult = result || results.find((item) => item.month === currentMonth && getResultCityId(item) === String(city.id));
    const grossSales = sumResultSales(currentResult || {});
    const cancelations = toNumber(currentResult?.cancelamentos);
    const baseStart = toNumber(city.baseStart);
    const netAdds = grossSales - cancelations;
    const currentBase = Math.max(0, baseStart + netAdds);
    const hps = toNumber(city.hps);
    const cluster = getClusterLabel(city);
    const gradient = netAdds > 0
      ? { gradId: 'url(#neon-green)', solidColor: '#0ba360' }
      : netAdds < 0
        ? { gradId: 'url(#neon-orange)', solidColor: '#f83600' }
        : { gradId: 'url(#neon-cyan)', solidColor: '#00f2fe' };

    return {
      id: city.id,
      city: getCityName(city),
      cluster,
      baseStart,
      currentBase,
      grossSales,
      cancelations,
      netAdds,
      hps,
      penetration: hps > 0 ? Number(((currentBase / hps) * 100).toFixed(1)) : 0,
      gradId: gradient.gradId,
      solidColor: gradient.solidColor,
    };
  });
}

function buildMonthCityNetAddMap(results = []) {
  return results.reduce((accumulator, result) => {
    const month = normalizeMonthKey(result.month);
    const cityId = getResultCityId(result);
    accumulator[`${month}_${cityId}`] = sumResultSales(result) - toNumber(result.cancelamentos);
    return accumulator;
  }, {});
}

function buildPenetrationEvolution({ cities = [], results = [], months = [] }) {
  const netAddsByMonthCity = buildMonthCityNetAddMap(results);
  const seriesPalette = CHURN_GRADIENTS;
  const topCities = [...cities]
    .sort((left, right) => right.currentBase - left.currentBase)
    .slice(0, Math.min(4, cities.length));

  const penetrationSeries = topCities.map((city, index) => ({
    key: city.city,
    color: seriesPalette[index % seriesPalette.length].solidColor,
    fillId: seriesPalette[index % seriesPalette.length].fillId,
  }));

  const data = months.map((monthKey, monthIndex) => {
    const point = { month: formatMonthLabel(monthKey) };
    topCities.forEach((city) => {
      const monthlyNetAdds = months.map((month) => toNumber(netAddsByMonthCity[`${month}_${city.id}`]));
      const endBases = new Array(months.length).fill(Math.max(0, city.baseStart));
      const lastIndex = months.length - 1;

      endBases[lastIndex] = Math.max(0, city.baseStart + monthlyNetAdds[lastIndex]);

      let boundary = city.baseStart;
      for (let index = lastIndex - 1; index >= 0; index -= 1) {
        endBases[index] = Math.max(0, boundary);
        boundary -= monthlyNetAdds[index];
      }

      point[city.city] = city.hps > 0 ? Number(((endBases[monthIndex] / city.hps) * 100).toFixed(1)) : 0;
    });
    return point;
  });

  return {
    data,
    series: penetrationSeries,
  };
}

function buildChurnReasons(results = [], reasons = []) {
  const reasonLabelMap = new Map(
    reasons.map((item) => [String(item.id), item.name || prettifyReasonLabel(item.id)])
  );
  const aggregated = {};

  results.forEach((result) => {
    const reasonMap = result.cancelamentosMotivos || result.motivosCancelamento || {};
    Object.entries(reasonMap).forEach(([reasonId, amount]) => {
      const label = reasonLabelMap.get(reasonId) || prettifyReasonLabel(reasonId);
      aggregated[label] = (aggregated[label] || 0) + toNumber(amount);
    });
  });

  return Object.entries(aggregated)
    .map(([name, value], index) => ({
      name,
      value,
      gradId: CHURN_GRADIENTS[index % CHURN_GRADIENTS.length].gradId,
      solidColor: CHURN_GRADIENTS[index % CHURN_GRADIENTS.length].solidColor,
    }))
    .filter((item) => item.value > 0)
    .sort((left, right) => right.value - left.value);
}

function buildChurnData({ cityMetrics = [], results = [], reasons = [], months = [] }) {
  const currentMonth = months[months.length - 1] || DEFAULT_MONTH;
  const currentResults = results.filter((item) => normalizeMonthKey(item.month) === currentMonth);
  const totalNetAdds = cityMetrics.reduce((total, city) => total + toNumber(city.netAdds), 0);
  const penetrationEvolution = buildPenetrationEvolution({
    cities: cityMetrics,
    results,
    months,
  });

  return {
    clusterGrowth: formatNetAdds(totalNetAdds),
    cities: [...cityMetrics]
      .sort((left, right) => right.netAdds - left.netAdds)
      .map((city) => ({
        name: city.city,
        growth: formatNetAdds(city.netAdds),
      })),
    churnReasons: buildChurnReasons(currentResults, reasons),
    penetrationEvolution: penetrationEvolution.data,
    penetrationSeries: penetrationEvolution.series,
  };
}

function buildMegaData(cityMetrics = []) {
  return cityMetrics.map((city) => ({
    city: city.city,
    cluster: city.cluster,
    baseStart: city.baseStart,
    currentBase: city.currentBase,
    netAdds: city.netAdds,
    gradId: city.gradId,
    solidColor: city.solidColor,
  }));
}

function buildTickerMessages(salesScope = {}, netAddsLabel = '+0') {
  const salesMessages = [...(salesScope.leads || [])]
    .filter((lead) => isSaleLead(lead))
    .sort((left, right) => getLeadSortValue(right) - getLeadSortValue(left))
    .slice(0, 8)
    .map((lead) => {
      const sellerName = lead.attendantName || 'Equipe';
      const productName = lead.productName || lead.categoryName || 'venda';
      const cityName = lead.cityName || lead.cityId || 'unidade';
      return `${sellerName} fechou ${productName} em ${cityName}.`;
    });

  const fallback = `Operação real: ${toNumber(salesScope?.totals?.p)} planos fechados, ${toNumber(salesScope?.totals?.i)} instalações e ${netAddsLabel} net adds no mês.`;
  return salesMessages.length ? [...salesMessages, fallback] : [fallback];
}

export async function loadWallboardData({ userData, monthKey } = {}) {
  const normalizedMonth = normalizeMonthKey(monthKey);
  const scopeInfo = resolveScope(userData);
  const historyMonths = buildRecentMonths(normalizedMonth, 6);

  const [salesScope, absences, cityResultsSnap, churnReasonsSnap] = await Promise.all([
    loadMonthlySalesScope({
      scope: scopeInfo.scope,
      clusterId: scopeInfo.clusterId,
      monthKey: normalizedMonth,
    }),
    listAbsencesForScope(userData, { includePast: false }),
    getDocs(query(collection(db, 'city_results'), where('month', 'in', historyMonths))),
    getDocs(collection(db, 'churn_reasons')),
  ]);

  const scopedCities = salesScope.cities || [];
  const scopedCityIds = new Set(scopedCities.map((city) => String(city.id)));
  const scopedResults = cityResultsSnap.docs
    .map((document) => ({ id: document.id, ...document.data() }))
    .filter((item) => scopedCityIds.has(getResultCityId(item)));

  const cityMetrics = buildCurrentCityMetrics({
    cities: scopedCities.map((city) => ({ ...city, month: normalizedMonth })),
    results: scopedResults.map((result) => ({ ...result, month: normalizeMonthKey(result.month) })),
    currentMonth: normalizedMonth,
  });
  const churnData = buildChurnData({
    cityMetrics,
    results: scopedResults,
    reasons: churnReasonsSnap.docs.map((document) => ({ id: document.id, ...document.data() })),
    months: historyMonths,
  });

  return {
    monthKey: normalizedMonth,
    scope: scopeInfo.scope,
    scopeLabel: scopeInfo.clusterId || 'Global',
    rhData: buildRhData({
      users: salesScope.users || [],
      cities: scopedCities,
      absences,
      clusterId: scopeInfo.clusterId,
    }),
    salesData: buildSalesData(salesScope),
    churnData,
    megaData: buildMegaData(cityMetrics),
    tickerMessages: buildTickerMessages(salesScope, churnData.clusterGrowth),
  };
}
