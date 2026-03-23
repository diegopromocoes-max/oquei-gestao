const STORAGE_KEY = 'oquei_insights_survey_backups_v1';

function hasLocalStorage() {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function safeRead() {
  if (!hasLocalStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWrite(records) {
  if (!hasLocalStorage()) return false;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 1000)));
    return true;
  } catch {
    return false;
  }
}

function createBackupId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `backup-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeString(value) {
  return String(value || '').trim();
}

function matchScope(record, scope = {}) {
  if (scope.surveyId && record.surveyId !== scope.surveyId) return false;
  if ('interviewerId' in scope && (record.interviewerId || null) !== (scope.interviewerId || null)) {
    return false;
  }
  if (scope.collectionSource && record.collectionSource !== scope.collectionSource) return false;
  return true;
}

function sortByClientDate(records) {
  return [...records].sort((a, b) => {
    const aTime = Date.parse(a?.updatedAtClient || a?.createdAtClient || 0) || 0;
    const bTime = Date.parse(b?.updatedAtClient || b?.createdAtClient || 0) || 0;
    return bTime - aTime;
  });
}

function sanitizeFilePart(value, fallback = 'backup') {
  const normalized = normalizeString(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return normalized || fallback;
}

export function createSurveyBackupPayload({
  survey,
  responsePayload,
  interviewerId = null,
  syncStatus = 'pending',
  syncError = '',
}) {
  const backupId = responsePayload.backupId || createBackupId();
  const createdAtClient =
    responsePayload.backupCreatedAtClient ||
    responsePayload.submittedAtClient ||
    new Date().toISOString();

  return {
    backupId,
    surveyId: survey?.id || responsePayload.surveyId || '',
    surveyTitle: survey?.title || responsePayload.surveyTitle || '',
    surveyVersion: survey?.questionnaireVersion || responsePayload.surveyVersion || 1,
    interviewerId: interviewerId || responsePayload.entrevistadorId || null,
    collectionSource: responsePayload.collectionSource || '',
    number: responsePayload.numero || null,
    researcherName: responsePayload.researcherName || '',
    phone: responsePayload.telefone || '',
    city: responsePayload.cityName || responsePayload.city || '',
    cityId: responsePayload.cityId || '',
    location: responsePayload.location || null,
    answers: responsePayload.answers || {},
    responsePayload: {
      ...responsePayload,
      backupId,
      backupCreatedAtClient: createdAtClient,
    },
    syncStatus,
    syncError: normalizeString(syncError),
    responseId: null,
    createdAtClient,
    updatedAtClient: new Date().toISOString(),
    syncedAtClient: syncStatus === 'synced' ? new Date().toISOString() : null,
  };
}

export function saveSurveyBackup(record) {
  const current = safeRead();
  const backupId = record.backupId || record.responsePayload?.backupId || createBackupId();
  const nextRecord = {
    ...record,
    backupId,
    responsePayload: {
      ...(record.responsePayload || {}),
      backupId,
    },
    updatedAtClient: new Date().toISOString(),
  };

  const next = sortByClientDate([
    nextRecord,
    ...current.filter((item) => item.backupId !== backupId),
  ]);

  safeWrite(next);
  return nextRecord;
}

export function updateSurveyBackupSync(backupId, syncData = {}) {
  if (!backupId) return null;

  const current = safeRead();
  const existing = current.find((item) => item.backupId === backupId);
  if (!existing) return null;

  const nextRecord = {
    ...existing,
    ...syncData,
    syncStatus: syncData.syncStatus || existing.syncStatus || 'pending',
    syncError: normalizeString(syncData.syncError ?? existing.syncError),
    responseId: syncData.responseId || existing.responseId || null,
    syncedAtClient:
      syncData.syncStatus === 'synced'
        ? new Date().toISOString()
        : syncData.syncedAtClient ?? existing.syncedAtClient ?? null,
    updatedAtClient: new Date().toISOString(),
  };

  const next = sortByClientDate([
    nextRecord,
    ...current.filter((item) => item.backupId !== backupId),
  ]);

  safeWrite(next);
  return nextRecord;
}

export function getSurveyBackups(scope = {}) {
  return sortByClientDate(safeRead().filter((record) => matchScope(record, scope)));
}

export function getSurveyBackupSummary(scope = {}) {
  const records = getSurveyBackups(scope);
  return {
    storageAvailable: hasLocalStorage(),
    total: records.length,
    pending: records.filter((item) => item.syncStatus === 'pending' || item.syncStatus === 'error').length,
    synced: records.filter((item) => item.syncStatus === 'synced').length,
    lastSavedAt: records[0]?.updatedAtClient || records[0]?.createdAtClient || null,
    records,
  };
}

export function exportSurveyBackups(scope = {}, options = {}) {
  const records = options.records || getSurveyBackups(scope);
  if (!records.length) return 0;

  const fileName = options.fileName || [
    sanitizeFilePart(options.baseName || scope.surveyTitle || 'pesquisas'),
    sanitizeFilePart(scope.interviewerId || scope.collectionSource || 'backup'),
    new Date().toISOString().slice(0, 10),
  ].join('-') + '.json';

  const payload = {
    version: 1,
    source: 'oquei_insights_local_backup',
    exportedAt: new Date().toISOString(),
    filters: scope,
    total: records.length,
    records,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
  return records.length;
}

function normalizeImportedRecord(record, index) {
  const payload = record?.responsePayload || record?.payload || record?.response || record;
  if (!payload || typeof payload !== 'object') return null;
  if (!payload.surveyId || !payload.answers || typeof payload.answers !== 'object') return null;

  const backupId = record?.backupId || payload.backupId || `import-${payload.surveyId}-${index + 1}`;

  return {
    backupId,
    syncStatus: record?.syncStatus || 'pending',
    syncError: normalizeString(record?.syncError),
    createdAtClient:
      record?.createdAtClient ||
      payload.backupCreatedAtClient ||
      payload.submittedAtClient ||
      new Date().toISOString(),
    responsePayload: {
      ...payload,
      backupId,
      backupCreatedAtClient:
        payload.backupCreatedAtClient || record?.createdAtClient || payload.submittedAtClient || new Date().toISOString(),
    },
  };
}

export function parseSurveyBackupFileContent(content) {
  const parsed = JSON.parse(content);
  const sourceRecords = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.records)
      ? parsed.records
      : [];

  return sourceRecords
    .map((record, index) => normalizeImportedRecord(record, index))
    .filter(Boolean);
}

export function buildBackupImportSignature(payload = {}) {
  return [
    payload.backupId || '',
    payload.surveyId || '',
    payload.numero || '',
    payload.researcherName || '',
    payload.submittedAtClient || '',
  ].join('|');
}

export function buildImportedResponseDoc(record, context = {}) {
  const payload = record.responsePayload || {};
  return {
    ...payload,
    backupId: record.backupId || payload.backupId || createBackupId(),
    backupImported: true,
    backupImportFileName: context.fileName || null,
    backupImportSource: 'manual_upload',
    backupImportStatus: record.syncStatus || 'pending',
    backupImportError: normalizeString(record.syncError),
    importedAtClient: new Date().toISOString(),
    importedByUid: context.userData?.uid || null,
    importedByName: context.userData?.name || context.userData?.nome || 'Importacao manual',
  };
}
