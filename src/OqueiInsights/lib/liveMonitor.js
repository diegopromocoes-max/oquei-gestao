import { getInsightEntityDate, resolveInsightCity } from './insightsExecutive';

export const LIVE_SESSION_TTL_MS = 2 * 60 * 1000;

export function isLiveSessionOnline(session, now = Date.now()) {
  const seenAt = getInsightEntityDate(session)?.getTime?.() || 0;
  return Boolean(session?.online) && (now - seenAt) <= LIVE_SESSION_TTL_MS;
}

export function sortResponsesDesc(responses = []) {
  return [...responses].sort((a, b) => {
    const first = getInsightEntityDate(a)?.getTime?.() || 0;
    const second = getInsightEntityDate(b)?.getTime?.() || 0;
    return second - first;
  });
}

export function buildLiveMonitorKpis({ sessions = [], responses = [], now = Date.now() }) {
  const onlineSessions = sessions.filter((session) => isLiveSessionOnline(session, now));
  const pendingAudit = responses.filter((response) => (response.auditStatus || 'pendente') === 'pendente').length;
  const withGps = responses.filter((response) => response.location?.lat && response.location?.lng).length;
  const recentResponses = responses.filter((response) => {
    const submittedAt = getInsightEntityDate(response)?.getTime?.() || 0;
    return now - submittedAt <= 15 * 60 * 1000;
  }).length;

  return {
    onlineSessions: onlineSessions.length,
    totalSessions: sessions.length,
    pendingAudit,
    totalResponses: responses.length,
    gpsCoverage: responses.length ? Math.round((withGps / responses.length) * 100) : 0,
    recentResponses,
  };
}

export function buildLeaderboardRows({ sessions = [], responses = [], interviewers = [], cityMap = {}, cityNameMap = {}, now = Date.now() }) {
  const interviewerMap = Object.fromEntries((interviewers || []).map((item) => [item.id, item]));
  const aggregate = {};

  const touch = (key, base) => {
    if (!aggregate[key]) {
      aggregate[key] = {
        key,
        label: base.label,
        cityLabel: base.cityLabel,
        interviewerId: base.interviewerId,
      meta: base.meta || 0,
      collected: 0,
      responseCount: 0,
      sessionCount: 0,
      online: false,
      lastSeenAt: 0,
      surveyTitle: base.surveyTitle || '',
        source: base.source || '',
      };
    }
    return aggregate[key];
  };

  (sessions || []).forEach((session) => {
    const city = resolveInsightCity(session, cityMap, cityNameMap);
    const interviewer = interviewerMap[session.interviewerId] || session;
    const key = session.researcherUid || session.interviewerId || `${session.researcherName}-${session.surveyId}`;
    const current = touch(key, {
      label: session.researcherName || interviewer.nome || 'Pesquisador',
      cityLabel: city.label,
      interviewerId: session.interviewerId || null,
      meta: Number(interviewer.meta || session.interviewerMeta || 0),
      surveyTitle: session.surveyTitle || '',
      source: session.collectionSource || '',
    });

    current.online = current.online || isLiveSessionOnline(session, now);
    current.lastSeenAt = Math.max(current.lastSeenAt, getInsightEntityDate(session)?.getTime?.() || 0);
    current.sessionCount = Math.max(current.sessionCount, Number(session.totalCollected || 0));
    if (!current.cityLabel || current.cityLabel === 'Sem cidade') current.cityLabel = city.label;
    if (!current.surveyTitle) current.surveyTitle = session.surveyTitle || '';
    if (!current.source) current.source = session.collectionSource || '';
  });

  (responses || []).forEach((response) => {
    const city = resolveInsightCity(response, cityMap, cityNameMap);
    const interviewer = interviewerMap[response.entrevistadorId] || {};
    const key = response.researcherUid || response.entrevistadorId || `${response.researcherName}-${response.surveyId}`;
    const current = touch(key, {
      label: response.researcherName || interviewer.nome || 'Pesquisador',
      cityLabel: city.label,
      interviewerId: response.entrevistadorId || null,
      meta: Number(interviewer.meta || 0),
      surveyTitle: response.surveyTitle || '',
      source: response.collectionSource || '',
    });

    current.responseCount += 1;
    if (!current.cityLabel || current.cityLabel === 'Sem cidade') current.cityLabel = city.label;
    if (!current.surveyTitle) current.surveyTitle = response.surveyTitle || '';
    if (!current.source) current.source = response.collectionSource || '';
  });

  return Object.values(aggregate)
    .map((row) => ({
      ...row,
      collected: row.responseCount > 0 ? row.responseCount : row.sessionCount,
      quotaPct: row.meta > 0
        ? Math.min(100, Math.round(((row.responseCount > 0 ? row.responseCount : row.sessionCount) / row.meta) * 100))
        : 0,
    }))
    .sort((a, b) => (
      Number(b.online) - Number(a.online)
      || b.collected - a.collected
      || a.label.localeCompare(b.label, 'pt-BR')
    ));
}

export function buildCityPulseRows(responses = [], cityMap = {}, cityNameMap = {}) {
  const aggregate = {};

  (responses || []).forEach((response) => {
    const city = resolveInsightCity(response, cityMap, cityNameMap);
    if (!aggregate[city.key]) {
      aggregate[city.key] = {
        key: city.key,
        label: city.label,
        responses: 0,
        gps: 0,
      };
    }

    aggregate[city.key].responses += 1;
    if (response.location?.lat && response.location?.lng) aggregate[city.key].gps += 1;
  });

  return Object.values(aggregate)
    .map((row) => ({
      ...row,
      gpsCoverage: row.responses ? Math.round((row.gps / row.responses) * 100) : 0,
    }))
    .sort((a, b) => b.responses - a.responses || a.label.localeCompare(b.label, 'pt-BR'));
}

export function formatRelativeTime(value, now = Date.now()) {
  const time = getInsightEntityDate(value)?.getTime?.() || 0;
  if (!time) return 'agora';

  const diffMinutes = Math.max(0, Math.round((now - time) / 60000));
  if (diffMinutes < 1) return 'agora';
  if (diffMinutes < 60) return `${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} h`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} d`;
}
