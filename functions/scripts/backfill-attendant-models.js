const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const NOMINATIM_BASE_URL = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org';
const CITY_CACHE = new Map();
const CLUSTER_CACHE = new Map();

const SYSTEM_LEAD_ORIGINS = [
  { id: 'whatsapp', name: 'WhatsApp', kind: 'standard', systemKey: 'whatsapp' },
  { id: 'telefone', name: 'Telefone', kind: 'standard', systemKey: 'telefone' },
  { id: 'balcao_loja', name: 'Balcao/Loja', kind: 'standard', systemKey: 'balcao_loja' },
  { id: 'indicacao', name: 'Indicacao', kind: 'standard', systemKey: 'indicacao' },
  { id: 'porta_a_porta', name: 'Porta a Porta', kind: 'standard', systemKey: 'porta_a_porta' },
  { id: 'redes_sociais', name: 'Redes Sociais', kind: 'standard', systemKey: 'redes_sociais' },
  { id: 'acao_crescimento', name: 'Acao de Crescimento (HUB)', kind: 'standard', systemKey: 'acao_crescimento' },
  { id: 'acao_parceria', name: 'Acao em Parceria', kind: 'partnership', systemKey: 'acao_parceria' },
  { id: 'acao_japa', name: 'Acao do Japa', kind: 'japa', systemKey: 'acao_japa' },
  { id: 'outros', name: 'Outros', kind: 'standard', systemKey: 'outros' },
];

const ORIGIN_INDEX = new Map(
  SYSTEM_LEAD_ORIGINS.map((origin) => [normalizeText(origin.name).toLowerCase(), origin]),
);

function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeDateKey(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString().slice(0, 10);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function normalizeTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function deriveMonthKey(value) {
  const dateKey = normalizeDateKey(value);
  return dateKey ? dateKey.slice(0, 7) : new Date().toISOString().slice(0, 7);
}

function normalizeLeadTypeValue(value = '') {
  const normalized = String(value || '').trim();
  return normalized || 'Lead';
}

function buildAbsenceEntries(absenceId, absence = {}) {
  const startDate = normalizeDateKey(absence.startDate || absence.date || absence.createdAt);
  const endDate = normalizeDateKey(absence.endDate || absence.startDate || absence.date || absence.createdAt);
  if (!startDate || !endDate) return [];

  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

  const storeId = absence.storeId || absence.cityId || absence.storeName || 'Geral';
  const storeName = absence.storeName || absence.cityName || absence.storeId || absence.cityId || 'Geral';
  const attendantName = absence.attendantName || absence.employeeName || 'Colaborador';
  const attendantFirstName = String(attendantName).split(' ')[0] || 'Colaborador';
  const type = String(absence.type || absence.typeOccurrence || absence.reason || 'ausencia');
  const coverageMap = absence.coverageMap || {};
  const entries = [];

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const date = cursor.toISOString().slice(0, 10);
    const coverage = coverageMap[date] || absence.coverage || null;
    entries.push({
      id: `${absenceId}_${date}`,
      absenceId,
      monthKey: date.slice(0, 7),
      date,
      storeId,
      storeName,
      attendantFirstName,
      type,
      coverage,
      isClosedStore: coverage === 'loja_fechada' || absence.isClosedStore === true,
      updatedAt: new Date().toISOString(),
    });
  }

  return entries;
}

function extractAddressComponents(result = {}) {
  const address = result.address || {};

  return {
    addressStreet: address.road || address.pedestrian || address.footway || address.path || address.cycleway || '',
    addressNumber: address.house_number || '',
    addressNeighborhood: address.suburb || address.neighbourhood || address.quarter || address.borough || address.city_district || address.residential || address.hamlet || '',
    geoFormattedAddress: result.display_name || '',
  };
}

function uniqueAddressParts(parts = []) {
  return Array.from(new Set(parts.filter(Boolean).map((item) => normalizeText(item)).filter(Boolean)));
}

function buildAddressSearchVariants(address) {
  const safeAddress = normalizeText(address);
  if (!safeAddress) return [];

  const parts = safeAddress.split('-').map((item) => normalizeText(item));
  const streetPart = parts[0] || safeAddress;
  const neighborhoodPart = parts[1] || '';
  const cityPart = parts[2] || '';

  return uniqueAddressParts([
    [streetPart, neighborhoodPart, cityPart, 'Brasil'].filter(Boolean).join(', '),
    [streetPart, cityPart, 'Brasil'].filter(Boolean).join(', '),
    [safeAddress, 'Brasil'].filter(Boolean).join(', '),
    safeAddress,
  ]);
}

function scoreGeocodeCandidate(candidate = {}, address = '') {
  const parsed = extractAddressComponents(candidate);
  const display = normalizeText(candidate.display_name || '').toLowerCase();
  const safeAddress = normalizeText(address).toLowerCase();
  const street = normalizeText(parsed.addressStreet).toLowerCase();
  const neighborhood = normalizeText(parsed.addressNeighborhood).toLowerCase();

  let score = 0;
  if (street && safeAddress.includes(street)) score += 30;
  if (neighborhood && safeAddress.includes(neighborhood)) score += 34;
  if (display.includes(safeAddress)) score += 20;
  if (display.includes('brasil')) score += 4;
  if (String(candidate.addresstype || candidate.type || '').match(/house|building|residential|road/i)) score += 6;
  return score;
}

function buildLeadAddressString(data = {}) {
  const structuredAddress = [
    [data.addressStreet || '', data.addressNumber || ''].filter(Boolean).join(', '),
    data.addressNeighborhood || '',
    data.cityName || '',
  ].filter(Boolean).join(' - ');

  return structuredAddress || data.address || '';
}

async function geocodeAddress(address) {
  if (!address) {
    return null;
  }

  const variants = buildAddressSearchVariants(address);
  for (const variant of variants) {
    const response = await fetch(`${NOMINATIM_BASE_URL}/search?format=jsonv2&limit=5&addressdetails=1&countrycodes=br&q=${encodeURIComponent(variant)}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'User-Agent': 'oquei-gestao-backfill/1.0',
      },
    });
    if (!response.ok) {
      throw new Error(`Nominatim geocoding request failed with status ${response.status}`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload) || !payload.length) {
      continue;
    }

    return payload.sort((left, right) => scoreGeocodeCandidate(right, address) - scoreGeocodeCandidate(left, address))[0];
  }
  return null;
}

async function ensureLeadOriginSeeds() {
  const batch = db.batch();
  SYSTEM_LEAD_ORIGINS.forEach((origin) => {
    batch.set(db.collection('lead_origins').doc(origin.id), {
      name: origin.name,
      normalizedName: normalizeText(origin.name).toLowerCase(),
      kind: origin.kind,
      active: true,
      systemKey: origin.systemKey,
      createdAt: new Date().toISOString(),
      createdBy: 'system_backfill',
    }, { merge: true });
  });
  await batch.commit();
  return SYSTEM_LEAD_ORIGINS.length;
}

async function backfillLeads() {
  const snapshot = await db.collection('leads').get();
  let batch = db.batch();
  let operations = 0;
  let geocoded = 0;

  for (const document of snapshot.docs) {
    const data = document.data();
    const monthKey = deriveMonthKey(data.date || data.createdAt || data.lastUpdate);
    const leadType = data.leadType || normalizeLeadTypeValue(data.categoryName || data.productName || data.status);
    const originKey = normalizeText(data.origin || '').toLowerCase();
    const originSeed = ORIGIN_INDEX.get(originKey) || null;
    const updatePayload = {};
    const cityRef = await resolveCityRef(data.cityId || data.cityName || data.city);
    const clusterId = data.clusterId || cityRef.clusterId || '';
    const clusterName = data.clusterName || cityRef.clusterName || '';

    if (data.monthKey !== monthKey) updatePayload.monthKey = monthKey;
    if (data.leadType !== leadType) updatePayload.leadType = leadType;
    if (clusterId && data.clusterId !== clusterId) updatePayload.clusterId = clusterId;
    if (clusterName && data.clusterName !== clusterName) updatePayload.clusterName = clusterName;

    if (originSeed) {
      if (!data.originCatalogId) updatePayload.originCatalogId = originSeed.id;
      if (!data.originKind) updatePayload.originKind = originSeed.kind;
    }

    if (!data.originSourceType && data.originActionId) {
      updatePayload.originSourceType = 'action_plan';
      updatePayload.originSourceId = data.originActionId;
      updatePayload.originSourceName = data.originActionName || data.originSourceName || null;
    }

    const hasGeo = Number.isFinite(Number(data.geoLat)) && Number.isFinite(Number(data.geoLng));
    const address = buildLeadAddressString(data);
    if (!hasGeo && address) {
      try {
        const geocodedResult = await geocodeAddress(address);
        if (geocodedResult?.lat && geocodedResult?.lon) {
          const geoPayload = extractAddressComponents(geocodedResult);
          updatePayload.geoLat = Number(geocodedResult.lat);
          updatePayload.geoLng = Number(geocodedResult.lon);
          updatePayload.geoStatus = 'resolved';
          updatePayload.geoUpdatedAt = new Date().toISOString();
          updatePayload.geoFormattedAddress = geoPayload.geoFormattedAddress;
          updatePayload.addressStreet = geoPayload.addressStreet || data.addressStreet || '';
          updatePayload.addressNumber = geoPayload.addressNumber || data.addressNumber || '';
          updatePayload.addressNeighborhood = geoPayload.addressNeighborhood || data.addressNeighborhood || '';
          updatePayload.address = buildLeadAddressString({ ...data, ...updatePayload });
          geocoded += 1;
        }
      } catch (error) {
        updatePayload.geoStatus = 'failed';
        updatePayload.geoUpdatedAt = new Date().toISOString();
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      continue;
    }

    updatePayload.updatedAt = new Date().toISOString();
    batch.set(document.ref, updatePayload, { merge: true });
    operations += 1;

    if (operations % 200 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  if (operations % 200 !== 0) {
    await batch.commit();
  }

  return { operations, geocoded };
}

async function rebuildAbsenceCalendar() {
  const existing = await db.collection('absence_calendar_public').get();
  if (!existing.empty) {
    let deleteBatch = db.batch();
    let deletions = 0;

    for (const document of existing.docs) {
      deleteBatch.delete(document.ref);
      deletions += 1;
      if (deletions % 400 === 0) {
        await deleteBatch.commit();
        deleteBatch = db.batch();
      }
    }

    if (deletions % 400 !== 0) {
      await deleteBatch.commit();
    }
  }

  const absences = await db.collection('absences').get();
  let writeBatch = db.batch();
  let writes = 0;

  for (const document of absences.docs) {
    const entries = buildAbsenceEntries(document.id, document.data());
    for (const entry of entries) {
      writeBatch.set(db.collection('absence_calendar_public').doc(entry.id), entry, { merge: true });
      writes += 1;
      if (writes % 400 === 0) {
        await writeBatch.commit();
        writeBatch = db.batch();
      }
    }
  }

  if (writes % 400 !== 0) {
    await writeBatch.commit();
  }

  return writes;
}

async function resolveCityRef(cityValue) {
  const safeValue = normalizeText(cityValue);
  if (!safeValue) {
    return { cityId: '__all__', cityName: 'Todas as cidades', clusterId: '', clusterName: '' };
  }

  if (CITY_CACHE.has(safeValue.toLowerCase())) {
    return CITY_CACHE.get(safeValue.toLowerCase());
  }

  const byId = await db.collection('cities').doc(cityValue).get();
  if (byId.exists) {
    const clusterRef = await resolveClusterRef(byId.data()?.clusterId);
    const result = {
      cityId: byId.id,
      cityName: byId.data()?.name || safeValue,
      clusterId: byId.data()?.clusterId || '',
      clusterName: clusterRef.clusterName || '',
    };
    CITY_CACHE.set(safeValue.toLowerCase(), result);
    return result;
  }

  const byName = await db.collection('cities').where('name', '==', safeValue).limit(1).get();
  if (!byName.empty) {
    const document = byName.docs[0];
    const clusterRef = await resolveClusterRef(document.data()?.clusterId);
    const result = {
      cityId: document.id,
      cityName: document.data()?.name || safeValue,
      clusterId: document.data()?.clusterId || '',
      clusterName: clusterRef.clusterName || '',
    };
    CITY_CACHE.set(safeValue.toLowerCase(), result);
    return result;
  }

  const fallback = { cityId: safeValue, cityName: safeValue, clusterId: '', clusterName: '' };
  CITY_CACHE.set(safeValue.toLowerCase(), fallback);
  return fallback;
}

async function resolveClusterRef(clusterValue) {
  const safeValue = normalizeText(clusterValue);
  if (!safeValue) {
    return { clusterId: '', clusterName: '' };
  }

  if (CLUSTER_CACHE.has(safeValue.toLowerCase())) {
    return CLUSTER_CACHE.get(safeValue.toLowerCase());
  }

  const byId = await db.collection('clusters').doc(clusterValue).get();
  if (byId.exists) {
    const result = { clusterId: byId.id, clusterName: byId.data()?.name || clusterValue };
    CLUSTER_CACHE.set(safeValue.toLowerCase(), result);
    return result;
  }

  const byName = await db.collection('clusters').where('name', '==', clusterValue).limit(1).get();
  if (!byName.empty) {
    const document = byName.docs[0];
    const result = { clusterId: document.id, clusterName: document.data()?.name || clusterValue };
    CLUSTER_CACHE.set(safeValue.toLowerCase(), result);
    return result;
  }

  const fallback = { clusterId: clusterValue, clusterName: clusterValue };
  CLUSTER_CACHE.set(safeValue.toLowerCase(), fallback);
  return fallback;
}

async function rebuildLeadPartnershipSources() {
  const existing = await db.collection('lead_partnership_sources').get();
  let deleteBatch = db.batch();
  let deletions = 0;

  for (const document of existing.docs) {
    deleteBatch.delete(document.ref);
    deletions += 1;
    if (deletions % 400 === 0) {
      await deleteBatch.commit();
      deleteBatch = db.batch();
    }
  }

  if (deletions % 400 !== 0) {
    await deleteBatch.commit();
  }

  let writeBatch = db.batch();
  let writes = 0;

  const actionPlans = await db.collection('action_plans').get();
  for (const document of actionPlans.docs) {
    const data = document.data();
    if (data.deleted || data.status !== 'Em Andamento') continue;

    writeBatch.set(db.collection('lead_partnership_sources').doc(`action_plan_${document.id}`), {
      name: data.name || 'Acao sem nome',
      normalizedName: normalizeText(data.name || 'Acao sem nome').toLowerCase(),
      cityId: data.cityId || '__all__',
      cityName: data.cityName || (data.cityId === '__all__' ? 'Todas as cidades' : data.cityId || 'Cidade nao informada'),
      sourceType: 'action_plan',
      sourceId: document.id,
      status: data.status || 'Em Andamento',
      active: true,
      originLabel: 'Acao em Parceria',
      startDate: normalizeDateKey(data.startDate || data.createdAt || data.updatedAt),
      endDate: normalizeDateKey(data.endDate || data.deadline || data.updatedAt),
      createdAt: normalizeTimestamp(data.createdAt)?.toISOString() || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    writes += 1;

    if (writes % 400 === 0) {
      await writeBatch.commit();
      writeBatch = db.batch();
    }
  }

  const sponsorships = await db.collection('sponsorships').get();
  for (const document of sponsorships.docs) {
    const data = document.data();
    if (data.status !== 'Aprovado') continue;

    const cityRef = await resolveCityRef(data.cityId || data.city || data.cityName);
    writeBatch.set(db.collection('lead_partnership_sources').doc(`sponsorship_${document.id}`), {
      name: data.eventName || data.title || 'Evento parceiro',
      normalizedName: normalizeText(data.eventName || data.title || 'Evento parceiro').toLowerCase(),
      cityId: cityRef.cityId || '__all__',
      cityName: cityRef.cityName || 'Cidade nao informada',
      sourceType: 'sponsorship',
      sourceId: document.id,
      status: data.status,
      active: true,
      originLabel: 'Acao em Parceria',
      startDate: normalizeDateKey(data.dateTime || data.date || data.createdAt),
      endDate: normalizeDateKey(data.endDate || data.dateTime || data.date || data.createdAt),
      createdAt: normalizeTimestamp(data.createdAt)?.toISOString() || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    writes += 1;

    if (writes % 400 === 0) {
      await writeBatch.commit();
      writeBatch = db.batch();
    }
  }

  if (writes % 400 !== 0) {
    await writeBatch.commit();
  }

  return writes;
}

async function main() {
  const seededOrigins = await ensureLeadOriginSeeds();
  const leadResult = await backfillLeads();
  const calendarEntries = await rebuildAbsenceCalendar();
  const partnershipEntries = await rebuildLeadPartnershipSources();

  console.log(`Origens garantidas: ${seededOrigins}`);
  console.log(`Leads atualizados: ${leadResult.operations}`);
  console.log(`Leads geocodificados: ${leadResult.geocoded}`);
  console.log(`Entradas em absence_calendar_public: ${calendarEntries}`);
  console.log(`Entradas em lead_partnership_sources: ${partnershipEntries}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
