import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

import JSZip from 'jszip';

const require = createRequire(import.meta.url);

const PROJECT_ID = 'oquei-ecossistema';
const WORKBOOK_PATH = process.argv[2] || 'C:/Users/Diego/Downloads/Leads 48 horas (Patrick).xlsx';
const IMPORT_BATCH = 'patrick-planilha-48h-2026-04-02';
const TIMEZONE_OFFSET = '-03:00';
const IMPORTED_BY_EMAIL = 'diegopromocoes@gmail.com';
const SUPERVISOR_NAME = 'Diego Prado';

const STATUS = {
  COLD: 'Frio/Dispon\u00edvel',
  WITH_VENDOR: 'Com Vendedor',
  NEGOTIATION: 'Em Negocia\u00e7\u00e3o',
  SOLD: 'Vendido',
  DISCARDED: 'Descartado',
};

const DISCARD_REASONS = {
  CPF: 'Reprovou CPF',
  COMPETITOR: 'Fechou com Concorr\u00eancia',
  NO_INTEREST: 'Sem Interesse',
  UNREACHABLE: 'Cliente Inlocaliz\u00e1vel',
  OUT_OF_COVERAGE: 'Endere\u00e7o Fora de Cobertura',
  ALREADY_CLIENT: 'J\u00e1 \u00e9 Cliente',
  NO_TECHNICAL: 'Sem Viabilidade T\u00e9cnica',
  OTHER: 'Outro',
};

function loadFirebaseAuth() {
  const appData = process.env.APPDATA;

  if (!appData) {
    throw new Error('APPDATA nao esta disponivel para localizar o firebase-tools.');
  }

  const authModulePath = path.join(appData, 'npm', 'node_modules', 'firebase-tools', 'lib', 'auth.js');
  return require(authModulePath);
}

function decodeXml(text = '') {
  return String(text)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeWhitespace(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeText(value = '') {
  return normalizeWhitespace(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function expandScientificNotation(value = '') {
  const rawValue = String(value || '').trim();
  return /^\d+(?:\.\d+)?e[+-]?\d+$/i.test(rawValue)
    ? String(Number(rawValue).toFixed(0))
    : rawValue;
}

function sanitizePhone(value = '') {
  return expandScientificNotation(value).replace(/\D/g, '');
}

function isLikelyPhone(value = '') {
  const rawValue = String(value || '').trim();
  const digits = sanitizePhone(rawValue);
  return !/[A-Za-z\u00c0-\u00ff]/.test(rawValue) && digits.length >= 10 && digits.length <= 13;
}

function parseSheetDate(dateString, timeString = '12:00') {
  if (!dateString) {
    return null;
  }

  const [day, month, year] = dateString.split('/');
  const [hours = '12', minutes = '00'] = timeString.split(':');
  const isoValue = `${year}-${month}-${day}T${hours}:${minutes}:00${TIMEZONE_OFFSET}`;
  const date = new Date(isoValue);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function hashId(prefix, value) {
  return `${prefix}_${crypto.createHash('sha1').update(value).digest('hex').slice(0, 20)}`;
}

function getFirestoreValue(value) {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }

  if (typeof value === 'string') {
    return { stringValue: value };
  }

  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }

  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((item) => getFirestoreValue(item)),
      },
    };
  }

  if (value && typeof value === 'object' && value.__type === 'timestamp') {
    return { timestampValue: value.value };
  }

  if (value && typeof value === 'object') {
    return {
      mapValue: {
        fields: serializeFields(value),
      },
    };
  }

  return { stringValue: String(value) };
}

function serializeFields(data) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, getFirestoreValue(value)]),
  );
}

function parseMetaCell(value = '') {
  const text = String(value || '');
  const name = normalizeWhitespace(text.split('|')[0] || '');
  const createdAt = /Data de Cria.*?:\s*(\d{2}\/\d{2}\/\d{4})/i.exec(text)?.[1] || null;
  const originRaw = /Origem do Lead:\s*([^|\n\r]+)/i.exec(text)?.[1]?.trim() || '';
  const sourceStatus = /Status:\s*([^|\n\r]+)/i.exec(text)?.[1]?.trim() || '';

  return {
    name,
    createdAt,
    originRaw,
    sourceStatus,
  };
}

function mapOrigin(originRaw = '') {
  const normalized = normalizeText(originRaw);

  if (normalized.includes('datacake')) {
    return 'DataCake';
  }

  if (normalized.includes('triagem ia') || normalized.includes('sz triagem')) {
    return 'Triagem IA';
  }

  if (normalized.includes('melhorplano')) {
    return 'Melhorplano.net';
  }

  if (normalized.includes('indica')) {
    return 'Indica\u00e7\u00e3o';
  }

  return 'Venda Interna';
}

function classifyLead(fieldReport = '') {
  const normalized = normalizeText(fieldReport);

  if (!normalized) {
    return { status: STATUS.WITH_VENDOR, discardReason: null };
  }

  if (
    normalized.includes('ja e cliente')
    || normalized.includes('cliente ja contratou')
    || normalized.includes('cliente contratou oquei')
    || normalized.includes('instalado ja')
  ) {
    return { status: STATUS.DISCARDED, discardReason: DISCARD_REASONS.ALREADY_CLIENT };
  }

  if (
    normalized.includes('fechou com o vendedor patrick')
    || normalized.includes('fechei no nome')
    || normalized.includes('fechado no nome')
    || normalized.includes('contrato fechado')
    || /^fechei\b/.test(normalized)
    || normalized.includes('cliente aceitou')
  ) {
    return { status: STATUS.SOLD, discardReason: null };
  }

  if (normalized.includes('fechou com a base')) {
    return { status: STATUS.SOLD, discardReason: null };
  }

  if (
    normalized.includes('vou entrar em contato')
    || normalized.includes('irei entrar em contato')
    || normalized.includes('estou em contato')
    || normalized.includes('em negociacao')
    || normalized.includes('aguardando resposta')
    || normalized.includes('pediu para entrar em contato')
    || normalized.includes('vai ver com sua filha')
    || normalized.includes('score excelente')
    || normalized.includes('tentar outro cpf')
    || normalized.includes('irei tentar outro')
    || normalized.includes('vai procurar outro cpf')
    || normalized.includes('passar pelo financeiro')
    || normalized.includes('financeiro')
    || normalized.includes('aguardando')
  ) {
    return { status: STATUS.NEGOTIATION, discardReason: null };
  }

  if (
    normalized.includes('nao temos cobertura')
    || normalized.includes('fora de cobertura')
    || normalized.includes('sem cobertura')
  ) {
    return { status: STATUS.DISCARDED, discardReason: DISCARD_REASONS.OUT_OF_COVERAGE };
  }

  if (
    normalized.includes('restricao')
    || normalized.includes('reprov')
    || normalized.includes('cpf com debitos')
  ) {
    return { status: STATUS.DISCARDED, discardReason: DISCARD_REASONS.CPF };
  }

  if (
    normalized.includes('fechou com a ')
    || normalized.includes('fechou com o ')
    || normalized.includes('fechou com concorr')
    || normalized.includes(' desktop')
    || normalized.endsWith('desktop')
    || normalized.includes(' vero')
    || normalized.includes('flash net')
    || normalized.includes('n4')
  ) {
    return { status: STATUS.DISCARDED, discardReason: DISCARD_REASONS.COMPETITOR };
  }

  if (
    normalized.includes('nao se interessou')
    || normalized.includes('sem interesse')
    || normalized.includes('nao tem interesse')
  ) {
    return { status: STATUS.DISCARDED, discardReason: DISCARD_REASONS.NO_INTEREST };
  }

  if (
    normalized.includes('caixa postal')
    || normalized.includes('nao atendeu')
    || normalized.includes('sem sucesso')
  ) {
    return { status: STATUS.WITH_VENDOR, discardReason: null };
  }

  return { status: STATUS.WITH_VENDOR, discardReason: null };
}

function parseAddress(addressText = '') {
  const cleanText = normalizeWhitespace(String(addressText || '').replace(/,\s*Regi[a\u00e3]o:.*$/i, ''));
  const parts = cleanText.split(',').map((item) => item.trim());
  const street = parts[0] || '';
  const numberSegment = parts[1] || '';
  const neighborhoodSegment = parts[2] || '';
  const citySegment = parts[3] || '';

  const numberMatch = /^([^\s]+)(?:\s+(.*))?$/.exec(numberSegment);
  const neighborhoodMatch = /^(.*?)(?:\s*-\s*(\d{5}-?\d{3}))?$/.exec(neighborhoodSegment);
  const cityMatch = /^(.*?)(?:\s*-\s*([A-Z]{2}))?$/.exec(citySegment);

  return {
    street: street || cleanText,
    number: normalizeWhitespace(numberMatch?.[1] || ''),
    complement: normalizeWhitespace(numberMatch?.[2] || ''),
    neighborhood: normalizeWhitespace(neighborhoodMatch?.[1] || ''),
    zipCode: normalizeWhitespace(neighborhoodMatch?.[2] || ''),
    city: normalizeWhitespace(cityMatch?.[1] || ''),
    state: normalizeWhitespace(cityMatch?.[2] || 'SP').toUpperCase() || 'SP',
    addressText: cleanText,
  };
}

function parseMovementTimestamp(value = '') {
  const match = /Em\s+(\d{2}\/\d{2}\/\d{4})\s+[a\u00e0]s\s+(\d{2}:\d{2})/i.exec(String(value || ''));
  return match ? parseSheetDate(match[1], match[2]) : null;
}

async function getAccessToken() {
  const auth = loadFirebaseAuth();
  const account = auth.getProjectDefaultAccount?.() || auth.getGlobalDefaultAccount?.();

  if (!account?.tokens?.refresh_token) {
    throw new Error('Nenhuma sessao da Firebase CLI foi encontrada.');
  }

  const scopes = String(account.tokens.scope || '')
    .split(' ')
    .map((item) => item.trim())
    .filter(Boolean);

  const tokenInfo = await auth.getAccessToken(account.tokens.refresh_token, scopes);
  return tokenInfo.access_token || tokenInfo;
}

async function firestoreRequest(resourcePath, options = {}) {
  const accessToken = await getAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${resourcePath}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }

  return body;
}

async function listCollectionDocuments(collectionId) {
  const documents = [];
  let nextPageToken = '';

  do {
    const suffix = nextPageToken ? `?pageSize=1000&pageToken=${encodeURIComponent(nextPageToken)}` : '?pageSize=1000';
    const body = await firestoreRequest(`${collectionId}${suffix}`, { method: 'GET' });
    documents.push(...(body.documents || []));
    nextPageToken = body.nextPageToken || '';
  } while (nextPageToken);

  return documents;
}

function fromFirestoreValue(value) {
  if (!value) {
    return null;
  }

  if ('stringValue' in value) {
    return value.stringValue;
  }

  if ('integerValue' in value) {
    return Number(value.integerValue);
  }

  if ('doubleValue' in value) {
    return Number(value.doubleValue);
  }

  if ('booleanValue' in value) {
    return Boolean(value.booleanValue);
  }

  if ('timestampValue' in value) {
    return value.timestampValue;
  }

  if ('nullValue' in value) {
    return null;
  }

  if ('mapValue' in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([key, nestedValue]) => [key, fromFirestoreValue(nestedValue)]),
    );
  }

  if ('arrayValue' in value) {
    return (value.arrayValue.values || []).map((item) => fromFirestoreValue(item));
  }

  return null;
}

function documentToObject(document) {
  return {
    id: document.name.split('/').pop(),
    ...Object.fromEntries(
      Object.entries(document.fields || {}).map(([key, value]) => [key, fromFirestoreValue(value)]),
    ),
  };
}

async function upsertDocument(collectionId, documentId, payload) {
  return firestoreRequest(`${collectionId}/${documentId}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: serializeFields(payload) }),
  });
}

async function loadWorkbookLeads() {
  const data = fs.readFileSync(WORKBOOK_PATH);
  const zip = await JSZip.loadAsync(data);

  const sharedXml = await zip.file('xl/sharedStrings.xml').async('string');
  const sharedStrings = [...sharedXml.matchAll(/<si(?:[^>]*)>([\s\S]*?)<\/si>/g)].map((match) => {
    const parts = [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((item) => decodeXml(item[1]));
    return parts.join('');
  });

  const workbookXml = await zip.file('xl/workbook.xml').async('string');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const relationships = new Map(
    [...relsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((match) => [match[1], match[2]]),
  );

  const sheets = [...workbookXml.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*sheetId="([^"]+)"[^>]*r:id="([^"]+)"[^>]*\/>/g)]
    .map((match) => ({
      name: decodeXml(match[1]),
      target: `xl/${relationships.get(match[3]).replace(/^\//, '')}`,
    }));

  const getCellValue = (attributes, innerXml) => {
    const type = / t="([^"]+)"/.exec(attributes)?.[1] || '';
    const inlineValue = /<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/is>/.exec(innerXml)?.[1];

    if (inlineValue != null) {
      return decodeXml(inlineValue);
    }

    const value = /<v>([\s\S]*?)<\/v>/.exec(innerXml)?.[1] ?? '';
    return type === 's' ? sharedStrings[Number(value)] ?? '' : decodeXml(value);
  };

  const leads = [];

  for (const sheet of sheets) {
    const xml = await zip.file(sheet.target).async('string');
    const rows = [...xml.matchAll(/<row\b[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)];

    for (const row of rows) {
      const cells = Object.fromEntries(
        [...row[2].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)].map((cell) => {
          const column = /r="([A-Z]+)\d+"/.exec(cell[1])?.[1] || '';
          return [column, getCellValue(cell[1], cell[2])];
        }),
      );

      const meta = parseMetaCell(cells.A || '');

      if (!meta.createdAt || !meta.name) {
        continue;
      }

      const phoneInColumnB = isLikelyPhone(cells.B || '');
      const phoneRaw = phoneInColumnB ? cells.B : cells.C;
      const addressRaw = phoneInColumnB ? cells.C : cells.B;
      const fieldReport = normalizeWhitespace(cells.F || cells.D || '');
      const movementText = normalizeWhitespace(cells.F ? cells.D || '' : '');
      const movementAt = parseMovementTimestamp(movementText) || parseSheetDate(meta.createdAt);
      const insertedAt = parseSheetDate(meta.createdAt);
      const phone = sanitizePhone(phoneRaw);
      const address = parseAddress(addressRaw);
      const classification = classifyLead(fieldReport);
      const dedupeKey = `${phone || 'sem-telefone'}|${normalizeText(meta.name)}|${insertedAt || meta.createdAt}`;

      leads.push({
        dedupeKey,
        sheetName: sheet.name,
        customerName: meta.name,
        phone,
        phoneRaw: normalizeWhitespace(phoneRaw),
        fieldReport,
        origin: mapOrigin(meta.originRaw),
        sourceOriginRaw: normalizeWhitespace(meta.originRaw),
        sourceLeadStatus: normalizeWhitespace(meta.sourceStatus),
        sourceMovementText: movementText,
        sourceAssignedVendorName: normalizeWhitespace(cells.E || 'Patrick'),
        insertedAt,
        lastMovementAt: movementAt,
        ...address,
        status: classification.status,
        discardReason: classification.discardReason,
      });
    }
  }

  const uniqueLeads = new Map();

  for (const lead of leads) {
    if (!uniqueLeads.has(lead.dedupeKey)) {
      uniqueLeads.set(lead.dedupeKey, lead);
    }
  }

  return Array.from(uniqueLeads.values());
}

function buildLeadPayload(lead, vendor, existingLeadIds) {
  const documentId = hashId('patrick', lead.dedupeKey);
  const isExistingLead = existingLeadIds.has(documentId);
  const statusTimestamp = lead.lastMovementAt || lead.insertedAt || new Date().toISOString();

  return {
    documentId,
    isExistingLead,
    payload: {
      customerName: lead.customerName,
      phone: lead.phone,
      phoneRaw: lead.phoneRaw || null,
      street: lead.street || '',
      number: lead.number || '',
      complement: lead.complement || '',
      neighborhood: lead.neighborhood || '',
      city: lead.city || '',
      state: lead.state || 'SP',
      zipCode: lead.zipCode || '',
      addressText: lead.addressText || '',
      origin: lead.origin,
      status: lead.status,
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorChannelId: vendor.channelId || null,
      vendorChannelName: vendor.channelName || null,
      vendorClusterId: vendor.clusterId || null,
      vendorClusterName: vendor.clusterName || null,
      fieldReport: lead.fieldReport,
      discardReason: lead.discardReason || null,
      insertedAt: { __type: 'timestamp', value: lead.insertedAt || new Date().toISOString() },
      lastMovementAt: { __type: 'timestamp', value: statusTimestamp },
      assignedAt: { __type: 'timestamp', value: lead.insertedAt || new Date().toISOString() },
      soldAt: lead.status === STATUS.SOLD ? { __type: 'timestamp', value: statusTimestamp } : null,
      discardedAt: lead.status === STATUS.DISCARDED ? { __type: 'timestamp', value: statusTimestamp } : null,
      negotiationAt: lead.status === STATUS.NEGOTIATION ? { __type: 'timestamp', value: statusTimestamp } : null,
      supervisorId: null,
      supervisorName: SUPERVISOR_NAME,
      lastUpdatedById: null,
      lastUpdatedByName: SUPERVISOR_NAME,
      importedAt: { __type: 'timestamp', value: new Date().toISOString() },
      importedByEmail: IMPORTED_BY_EMAIL,
      importBatch: IMPORT_BATCH,
      sourceSheetName: lead.sheetName,
      sourceLeadStatus: lead.sourceLeadStatus,
      sourceOriginRaw: lead.sourceOriginRaw,
      sourceMovementText: lead.sourceMovementText,
      sourceAssignedVendorName: lead.sourceAssignedVendorName,
      dedupeKey: lead.dedupeKey,
    },
  };
}

async function ensurePatrickVendor() {
  const vendorDocs = await listCollectionDocuments('crm_ativo_vendedores');
  const vendors = vendorDocs.map((document) => documentToObject(document));
  const existingVendor = vendors.find((vendor) => normalizeText(vendor.name) === 'patrick');

  if (existingVendor) {
    return existingVendor;
  }

  const vendorId = 'patrick';
  const payload = {
    name: 'Patrick',
    status: 'Ativo',
    channelId: 'porta_a_porta',
    channelName: 'Porta a Porta',
    clusterId: 'pap_regional_diego',
    clusterName: 'Pap Regional (Diego)',
    createdAt: { __type: 'timestamp', value: new Date().toISOString() },
    updatedAt: { __type: 'timestamp', value: new Date().toISOString() },
  };

  await upsertDocument('crm_ativo_vendedores', vendorId, payload);
  return { id: vendorId, ...payload };
}

async function main() {
  if (!fs.existsSync(WORKBOOK_PATH)) {
    throw new Error(`Planilha nao encontrada: ${WORKBOOK_PATH}`);
  }

  const vendor = await ensurePatrickVendor();
  const workbookLeads = await loadWorkbookLeads();
  const existingLeadDocs = await listCollectionDocuments('crm_ativo_leads');
  const existingLeadIds = new Set(existingLeadDocs.map((document) => document.name.split('/').pop()));

  const summary = {
    totalWorkbookLeads: workbookLeads.length,
    created: 0,
    updated: 0,
    byStatus: {},
  };

  for (const lead of workbookLeads) {
    const { documentId, isExistingLead, payload } = buildLeadPayload(lead, vendor, existingLeadIds);
    await upsertDocument('crm_ativo_leads', documentId, payload);
    existingLeadIds.add(documentId);

    if (isExistingLead) {
      summary.updated += 1;
    } else {
      summary.created += 1;
    }

    summary.byStatus[lead.status] = (summary.byStatus[lead.status] || 0) + 1;
  }

  console.log(JSON.stringify({
    workbook: WORKBOOK_PATH,
    vendor: {
      id: vendor.id,
      name: vendor.name,
      channelName: vendor.channelName,
      clusterName: vendor.clusterName,
    },
    summary,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
