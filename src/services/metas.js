import { db } from '../firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

const MONTHLY_ATTENDANT_GOALS = 'monthly_attendant_goals';
const MONTHLY_GOALS = 'monthly_goals';
const MONTHLY_CLUSTER_GOALS = 'monthly_cluster_goals';

function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizeRole(value = '') {
  return normalizeText(value).replace(/[\s_-]+/g, '');
}

function isAttendantUser(user = {}) {
  const role = normalizeRole(user.role || '');
  return role === 'attendant' || role === 'atendente';
}

function isGrowthRole(role = '') {
  const safe = normalizeRole(role);
  return safe === 'growthteam' || safe === 'equipegrowth';
}

function getEditorName(userData = {}) {
  return userData?.name || userData?.nome || 'Gestor';
}

function buildMonthDocId(month, entityId) {
  return `${month}_${entityId}`;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function ceilSvaTarget(value) {
  return Math.ceil(toNumber(value) * 0.4);
}

function getProductBucket(product = {}) {
  const source = normalizeText(product.name || product.nome || product.id || '');
  if (source.includes('migra')) return 'migrations';
  if (source.includes('sva') || source.includes('servico adicional') || source.includes('servico extra') || source.includes('tv')) return 'sva';
  return 'plans';
}

function getChannelGoalField(channel = {}) {
  const source = normalizeText(channel.name || channel.nome || channel.id || '');
  if (source.includes('pap') || source.includes('porta a porta')) return 'plans_pap';
  if (source.includes('central') || source.includes('telefone') || source.includes('call center')) return 'plans_central';
  if (source.includes('b2b') || source.includes('empres')) return 'plans_b2b';
  return 'plans_loja';
}

function sumCityPlans(summary = {}) {
  return (
    toNumber(summary.plans_loja)
    + toNumber(summary.plans_pap)
    + toNumber(summary.plans_central)
    + toNumber(summary.plans_b2b)
  );
}

function getAttendantBasePlans(summary = {}) {
  return toNumber(summary.plans_loja);
}

function buildCityGoalSummary(cityGoalData = {}, channels = [], products = []) {
  const productsById = Object.fromEntries(products.map((item) => [item.id, item]));
  const channelsById = Object.fromEntries(channels.map((item) => [item.id, item]));

  const summary = {
    plans_loja: 0,
    plans_pap: 0,
    plans_central: 0,
    plans_b2b: 0,
    migrations: 0,
    sva: 0,
  };

  Object.entries(cityGoalData || {}).forEach(([channelId, productMap]) => {
    const channel = channelsById[channelId] || { id: channelId, name: channelId };
    Object.entries(productMap || {}).forEach(([productId, value]) => {
      const amount = toNumber(value);
      if (!amount) return;

      const product = productsById[productId] || { id: productId, name: productId };
      const bucket = getProductBucket(product);

      if (bucket === 'migrations') {
        summary.migrations += amount;
        return;
      }

      if (bucket === 'sva') {
        summary.sva += amount;
        return;
      }

      const field = getChannelGoalField(channel);
      summary[field] += amount;
    });
  });

  return summary;
}

function buildClusterTotals(cityDocs = []) {
  return cityDocs.reduce((accumulator, item) => {
    const clusterId = String(item.clusterId || '').trim();
    if (!clusterId) return accumulator;

    if (!accumulator[clusterId]) {
      accumulator[clusterId] = {
        clusterId,
        clusterName: item.clusterName || clusterId,
        plans: 0,
        migrations: 0,
        sva: 0,
      };
    }

    accumulator[clusterId].plans += sumCityPlans(item);
    accumulator[clusterId].migrations += toNumber(item.migrations);
    accumulator[clusterId].sva += toNumber(item.sva);
    return accumulator;
  }, {});
}

function sortByName(items = []) {
  return [...items].sort((left, right) => String(left.name || left.nome || '').localeCompare(String(right.name || right.nome || '')));
}

function buildDistribution(totalPlans, attendants = []) {
  const safeTotal = Math.max(0, Math.round(toNumber(totalPlans)));
  const orderedAttendants = [...attendants].sort((left, right) => {
    const leftKey = `${String(left.name || '').toLowerCase()}_${left.id}`;
    const rightKey = `${String(right.name || '').toLowerCase()}_${right.id}`;
    return leftKey.localeCompare(rightKey);
  });

  if (!orderedAttendants.length) return [];

  const baseTarget = Math.floor(safeTotal / orderedAttendants.length);
  const remainder = safeTotal % orderedAttendants.length;

  return orderedAttendants.map((attendant, index) => {
    const plansTarget = baseTarget + (index < remainder ? 1 : 0);
    return {
      ...attendant,
      plansTarget,
      svaTarget: ceilSvaTarget(plansTarget),
    };
  });
}

function filterAttendantsForCity(users = [], city = {}) {
  const cityId = String(city.id || city.cityId || '').trim();
  const cityName = normalizeText(city.name || city.nome || city.cityName || '');

  return users
    .filter((user) => isAttendantUser(user))
    .filter((user) => {
      if (user.active === false) return false;
      const userCityId = String(user.cityId || user.storeId || '').trim();
      const userCityName = normalizeText(user.cityName || user.storeName || '');
      return userCityId === cityId || (!!cityName && userCityName === cityName);
    })
    .map((user) => ({
      id: user.id,
      name: user.name || user.nome || 'Atendente',
      cityId: cityId || user.cityId || '',
      cityName: city.name || city.nome || user.cityName || '',
      clusterId: city.clusterId || user.clusterId || '',
      clusterName: city.clusterName || city.clusterNameLabel || user.clusterName || '',
    }))
    .sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')));
}

function getRosterKey(attendants = []) {
  return attendants.map((item) => item.id).sort().join('|');
}

async function loadCatalogContext() {
  const [clusters, cities, channels, products, usersSnap] = await Promise.all([
    getClusters(),
    getCidades(),
    getCanaisVenda(),
    getProdutosComMeta(),
    getDocs(collection(db, 'users')),
  ]);

  const users = usersSnap.docs.map((document) => ({ id: document.id, ...document.data() }));
  const clustersById = Object.fromEntries(clusters.map((item) => [item.id, item]));
  const citiesById = Object.fromEntries(cities.map((item) => [item.id, item]));

  return {
    clusters,
    cities,
    channels,
    products,
    users,
    clustersById,
    citiesById,
  };
}

async function loadMonthGoalsData(month) {
  const docRef = doc(db, 'goals_cities', month);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data().data || {}) : {};
}

async function persistMonthlyGoalDocs(month, mergedGoals, context, userData) {
  const batch = writeBatch(db);
  const updatedAt = new Date().toISOString();
  const cityDocs = [];

  Object.entries(mergedGoals || {}).forEach(([cityId, cityGoalData]) => {
    const city = context.citiesById[cityId] || { id: cityId, name: cityId };
    const cluster = context.clustersById[city.clusterId] || {};
    const summary = buildCityGoalSummary(cityGoalData, context.channels, context.products);
    const payload = {
      month,
      cityId,
      cityName: city.name || city.nome || cityId,
      clusterId: city.clusterId || '',
      clusterName: city.clusterName || cluster.name || city.clusterId || '',
      ...summary,
      updatedAt,
      updatedBy: getEditorName(userData),
      updatedByUid: userData?.uid || null,
    };

    cityDocs.push(payload);
    batch.set(doc(db, MONTHLY_GOALS, buildMonthDocId(month, cityId)), payload, { merge: true });
  });

  const clusterTotals = buildClusterTotals(cityDocs);
  Object.values(clusterTotals).forEach((payload) => {
    batch.set(doc(db, MONTHLY_CLUSTER_GOALS, buildMonthDocId(month, payload.clusterId)), {
      month,
      ...payload,
      updatedAt,
      updatedBy: getEditorName(userData),
      updatedByUid: userData?.uid || null,
    }, { merge: true });
  });

  await batch.commit();
  return cityDocs;
}

async function listAttendantGoalsForMonth(month) {
  const snapshot = await getDocs(query(collection(db, MONTHLY_ATTENDANT_GOALS), where('month', '==', month)));
  return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
}

function computeCityDistributionState({ city, cityGoalData, currentDocs = [], attendants = [], channels = [], products = [] }) {
  const summary = buildCityGoalSummary(cityGoalData, channels, products);
  const storeGoalPlans = getAttendantBasePlans(summary);
  const rosterKey = getRosterKey(attendants);
  const docsRosterKey = getRosterKey(currentDocs.map((item) => ({ id: item.attendantId })));
  const hasPendingFlag = currentDocs.some((item) => item.distributionStatus === 'stale');
  const hasDocs = currentDocs.length > 0;
  const currentGoalReference = currentDocs[0]?.storeGoalPlans ?? null;
  const goalChanged = currentGoalReference !== null && toNumber(currentGoalReference) !== storeGoalPlans;
  const rosterChanged = hasDocs && rosterKey !== docsRosterKey;
  const noTeam = storeGoalPlans > 0 && attendants.length === 0;
  const needsInitialDistribution = storeGoalPlans > 0 && attendants.length > 0 && !hasDocs;

  let distributionStatus = 'synced';
  let distributionReason = '';

  if (noTeam) {
    distributionStatus = 'stale';
    distributionReason = 'Loja sem atendentes ativos para distribuir a meta.';
  } else if (needsInitialDistribution) {
    distributionStatus = 'stale';
    distributionReason = 'Distribuicao inicial pendente.';
  } else if (hasPendingFlag || goalChanged || rosterChanged) {
    distributionStatus = 'stale';
    distributionReason = goalChanged
      ? 'A meta da loja mudou e a distribuicao precisa ser recalculada.'
      : 'O time da loja mudou e a distribuicao precisa ser recalculada.';
  }

  return {
    summary,
    storeGoalPlans,
    rosterKey,
    distributionStatus,
    distributionReason,
  };
}

async function createAutomaticDistributionForCity({ month, city, cityGoalData, attendants, channels, products, userData }) {
  const summary = buildCityGoalSummary(cityGoalData, channels, products);
  const storeGoalPlans = getAttendantBasePlans(summary);
  const updatedAt = new Date().toISOString();
  const clusterName = city.clusterName || city.clusterNameLabel || city.clusterId || '';
  const distribution = buildDistribution(storeGoalPlans, attendants);
  const batch = writeBatch(db);
  const existingDocs = await listAttendantGoalsForMonth(month);

  existingDocs
    .filter((item) => String(item.cityId || '') === String(city.id))
    .forEach((item) => {
      batch.delete(doc(db, MONTHLY_ATTENDANT_GOALS, item.id));
    });

  distribution.forEach((item) => {
    const payload = {
      month,
      attendantId: item.id,
      attendantName: item.name,
      cityId: city.id,
      cityName: city.name || city.nome || city.id,
      clusterId: city.clusterId || '',
      clusterName,
      plansTarget: item.plansTarget,
      svaTarget: item.svaTarget,
      sourceType: 'automatic',
      distributionStatus: 'synced',
      rosterKey: getRosterKey(attendants),
      storeGoalPlans,
      updatedAt,
      updatedBy: getEditorName(userData),
      updatedByUid: userData?.uid || null,
    };
    batch.set(doc(db, MONTHLY_ATTENDANT_GOALS, buildMonthDocId(month, item.id)), payload, { merge: true });
  });

  await batch.commit();
  return distribution;
}

export const getCanaisVenda = async () => {
  const snap = await getDocs(collection(db, 'sales_channels'));
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return sortByName(data);
};

export const getProdutosComMeta = async () => {
  const snap = await getDocs(collection(db, 'product_categories'));
  let data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  data = data.filter((item) => item.temMeta !== false && item.temMeta !== 'false');
  return sortByName(data);
};

export const getMetasCanais = async (month) => {
  const docRef = doc(db, 'goals_channels', month);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data().data || {}) : {};
};

export const getClusters = async () => {
  const snap = await getDocs(collection(db, 'clusters'));
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return sortByName(data);
};

export const getCidades = async () => {
  const snap = await getDocs(collection(db, 'cities'));
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return sortByName(data);
};

export const getMetasCidades = async (month) => {
  return loadMonthGoalsData(month);
};

export const getMetasChurn = async (month) => {
  const docRef = doc(db, 'goals_churn', month);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return { churnGoals: data.data || {}, globalChurn: data.globalChurn || 0 };
  }
  return { churnGoals: {}, globalChurn: 0 };
};

export const salvarMetasChurn = async (month, churnGoals, globalChurn, userData) => {
  await setDoc(doc(db, 'goals_churn', month), {
    data: churnGoals,
    globalChurn: Number(globalChurn),
    month,
    updatedAt: new Date().toISOString(),
    updatedBy: getEditorName(userData),
  });
};

export const salvarMetasCidades = async (month, goalsPatch, userData) => {
  const [currentGoals, context] = await Promise.all([
    loadMonthGoalsData(month),
    loadCatalogContext(),
  ]);

  const mergedGoals = {
    ...currentGoals,
    ...(goalsPatch || {}),
  };

  await setDoc(doc(db, 'goals_cities', month), {
    data: mergedGoals,
    month,
    updatedAt: new Date().toISOString(),
    updatedBy: getEditorName(userData),
  });

  await persistMonthlyGoalDocs(month, mergedGoals, context, userData);

  const cityIdsToRefresh = Object.keys(goalsPatch || {});
  if (!cityIdsToRefresh.length) return mergedGoals;

  const currentAttendantGoals = await listAttendantGoalsForMonth(month);
  const batch = writeBatch(db);
  const updatedAt = new Date().toISOString();

  cityIdsToRefresh.forEach((cityId) => {
    const city = context.citiesById[cityId];
    if (!city) return;

    const attendants = filterAttendantsForCity(context.users, city);
    const currentDocs = currentAttendantGoals.filter((item) => String(item.cityId || '') === String(cityId));
    const distributionState = computeCityDistributionState({
      city,
      cityGoalData: mergedGoals[cityId] || {},
      currentDocs,
      attendants,
      channels: context.channels,
      products: context.products,
    });

    if (!currentDocs.length && attendants.length > 0 && distributionState.storeGoalPlans > 0) {
      const distribution = buildDistribution(distributionState.storeGoalPlans, attendants);
      distribution.forEach((attendant) => {
        batch.set(doc(db, MONTHLY_ATTENDANT_GOALS, buildMonthDocId(month, attendant.id)), {
          month,
          attendantId: attendant.id,
          attendantName: attendant.name,
          cityId: city.id,
          cityName: city.name || city.nome || city.id,
          clusterId: city.clusterId || '',
          clusterName: city.clusterName || context.clustersById[city.clusterId]?.name || city.clusterId || '',
          plansTarget: attendant.plansTarget,
          svaTarget: attendant.svaTarget,
          sourceType: 'automatic',
          distributionStatus: 'synced',
          rosterKey: distributionState.rosterKey,
          storeGoalPlans: distributionState.storeGoalPlans,
          updatedAt,
          updatedBy: getEditorName(userData),
          updatedByUid: userData?.uid || null,
        }, { merge: true });
      });
      return;
    }

    currentDocs.forEach((goalDoc) => {
      batch.set(doc(db, MONTHLY_ATTENDANT_GOALS, goalDoc.id), {
        distributionStatus: distributionState.distributionStatus,
        rosterKey: distributionState.rosterKey,
        storeGoalPlans: distributionState.storeGoalPlans,
        updatedAt,
        updatedBy: getEditorName(userData),
        updatedByUid: userData?.uid || null,
      }, { merge: true });
    });
  });

  await batch.commit();
  return mergedGoals;
};

export const salvarMetasCanais = async (month, goals, userData) => {
  await setDoc(doc(db, 'goals_channels', month), {
    data: goals,
    month,
    updatedAt: new Date().toISOString(),
    updatedBy: getEditorName(userData),
  });
};

export const loadMetasIndividuais = async (month, userData = {}) => {
  const [context, goalsByCity, attendantGoalDocs] = await Promise.all([
    loadCatalogContext(),
    loadMonthGoalsData(month),
    listAttendantGoalsForMonth(month),
  ]);
  const role = normalizeRole(userData?.role || '');
  const scopedClusterId = role === 'supervisor' ? String(userData?.clusterId || userData?.cluster || '').trim() : '';

  const docsByCity = attendantGoalDocs.reduce((accumulator, item) => {
    const cityId = String(item.cityId || '');
    if (!accumulator[cityId]) accumulator[cityId] = [];
    accumulator[cityId].push(item);
    return accumulator;
  }, {});

  const citiesWithGoals = context.cities.filter((city) => {
    const cityGoalData = goalsByCity[city.id] || {};
    return sumCityPlans(buildCityGoalSummary(cityGoalData, context.channels, context.products)) > 0 || (docsByCity[city.id] || []).length > 0;
  });

  const clusters = context.clusters
    .filter((cluster) => !scopedClusterId || String(cluster.id) === scopedClusterId)
    .map((cluster) => {
    const clusterCities = citiesWithGoals
      .filter((city) => String(city.clusterId || '') === String(cluster.id))
      .map((city) => {
        const attendants = filterAttendantsForCity(context.users, city);
        const currentDocs = docsByCity[city.id] || [];
        const distributionState = computeCityDistributionState({
          city,
          cityGoalData: goalsByCity[city.id] || {},
          currentDocs,
          attendants,
          channels: context.channels,
          products: context.products,
        });

        const docsByAttendant = Object.fromEntries(currentDocs.map((item) => [item.attendantId, item]));
        const rows = attendants.map((attendant) => {
          const existing = docsByAttendant[attendant.id];
          return {
            id: existing?.id || buildMonthDocId(month, attendant.id),
            attendantId: attendant.id,
            attendantName: attendant.name,
            cityId: city.id,
            cityName: city.name || city.nome || city.id,
            clusterId: cluster.id,
            clusterName: cluster.name,
            plansTarget: toNumber(existing?.plansTarget),
            svaTarget: toNumber(existing?.svaTarget),
            sourceType: existing?.sourceType || 'automatic',
            distributionStatus: distributionState.distributionStatus,
            exists: Boolean(existing),
            storeGoalPlans: distributionState.storeGoalPlans,
          };
        });

        return {
          cityId: city.id,
          cityName: city.name || city.nome || city.id,
          clusterId: cluster.id,
          clusterName: cluster.name,
          plansTarget: distributionState.storeGoalPlans,
          svaTarget: ceilSvaTarget(distributionState.storeGoalPlans),
          attendants,
          rows,
          distributionStatus: distributionState.distributionStatus,
          distributionReason: distributionState.distributionReason,
        };
      })
      .filter((city) => city.rows.length > 0 || city.plansTarget > 0);

    return {
      id: cluster.id,
      name: cluster.name,
      cities: clusterCities,
    };
    })
    .filter((cluster) => cluster.cities.length > 0);

  return {
    clusters,
    totalAttendants: clusters.reduce((sum, cluster) => sum + cluster.cities.reduce((citySum, city) => citySum + city.rows.length, 0), 0),
    staleCities: clusters.reduce((sum, cluster) => sum + cluster.cities.filter((city) => city.distributionStatus === 'stale').length, 0),
  };
};

export const salvarMetaIndividualAtendente = async (month, goalData = {}, userData) => {
  const plansTarget = Math.max(0, Math.round(toNumber(goalData.plansTarget)));
  const payload = {
    month,
    attendantId: goalData.attendantId,
    attendantName: goalData.attendantName || 'Atendente',
    cityId: goalData.cityId,
    cityName: goalData.cityName || '',
    clusterId: goalData.clusterId || '',
    clusterName: goalData.clusterName || '',
    plansTarget,
    svaTarget: ceilSvaTarget(plansTarget),
    sourceType: 'manual',
    distributionStatus: 'synced',
    storeGoalPlans: Math.max(0, Math.round(toNumber(goalData.storeGoalPlans))),
    rosterKey: goalData.rosterKey || '',
    updatedAt: new Date().toISOString(),
    updatedBy: getEditorName(userData),
    updatedByUid: userData?.uid || null,
  };

  await setDoc(doc(db, MONTHLY_ATTENDANT_GOALS, buildMonthDocId(month, goalData.attendantId)), payload, { merge: true });
  return payload;
};

export const recalcularDistribuicaoCidade = async (month, cityId, userData) => {
  const [context, goalsByCity] = await Promise.all([
    loadCatalogContext(),
    loadMonthGoalsData(month),
  ]);

  const city = context.citiesById[cityId];
  if (!city) {
    throw new Error('Cidade nao encontrada para redistribuicao.');
  }

  const attendants = filterAttendantsForCity(context.users, city);
  if (!attendants.length) {
    throw new Error('Nao ha atendentes ativos nesta loja para redistribuir a meta.');
  }

  await createAutomaticDistributionForCity({
    month,
    city,
    cityGoalData: goalsByCity[cityId] || {},
    attendants,
    channels: context.channels,
    products: context.products,
    userData,
  });
};

export const listenMetaIndividualAtendente = (attendantId, month, callback, onError) => {
  if (!attendantId || !month) {
    callback?.(null);
    return () => {};
  }

  return onSnapshot(
    doc(db, MONTHLY_ATTENDANT_GOALS, buildMonthDocId(month, attendantId)),
    (snapshot) => {
      callback?.(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
    },
    (error) => {
      onError?.(error);
      callback?.(null);
    },
  );
};

export const assinarBasesMensais = (month, callback) => {
  const q = query(collection(db, 'monthly_bases'), where('month', '==', month));
  return onSnapshot(q, (snapshot) => {
    const data = {};
    snapshot.forEach((item) => {
      data[item.data().cityId] = item.data();
    });
    callback(data);
  });
};

export const assinarSimulacoes = (month, callback) => {
  const docRef = doc(db, 'sop_simulations', month);
  return onSnapshot(docRef, (docSnap) => {
    callback(docSnap.exists() ? docSnap.data() : { locked: false, cities: {} });
  });
};

export const salvarSimulacaoCidade = async (month, cityId, simulationData, userData) => {
  const docRef = doc(db, 'sop_simulations', month);
  const docSnap = await getDoc(docRef);
  const currentData = docSnap.exists() ? docSnap.data() : { locked: false, cities: {} };

  currentData.cities[cityId] = simulationData;
  currentData.updatedAt = new Date().toISOString();
  currentData.updatedBy = getEditorName(userData);

  await setDoc(docRef, currentData);
};

export const alternarTravaSimulacao = async (month, isLocked, userData) => {
  const docRef = doc(db, 'sop_simulations', month);
  await setDoc(docRef, {
    locked: isLocked,
    updatedAt: new Date().toISOString(),
    updatedBy: getEditorName(userData),
  }, { merge: true });
};

export function canEditIndividualGoals(userData = {}) {
  const role = normalizeRole(userData?.role || '');
  return role === 'coordinator' || role === 'coordenador' || role === 'master' || role === 'diretor' || role === 'supervisor' || isGrowthRole(role);
}
