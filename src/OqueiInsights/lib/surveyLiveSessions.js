import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

function sanitizeId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'anon';
}

function getStorage() {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage || window.localStorage || null;
}

function generateSessionToken() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `live-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getSurveyLiveSessionId({
  surveyId,
  interviewerId,
  researcherUid,
  collectionSource,
}) {
  const baseSurvey = sanitizeId(surveyId || 'survey');

  if (researcherUid) {
    return `live-${baseSurvey}-${sanitizeId(researcherUid)}`;
  }

  const scope = sanitizeId(interviewerId || collectionSource || 'public');
  const storage = getStorage();
  if (!storage) return `live-${baseSurvey}-${scope}-${sanitizeId(generateSessionToken())}`;

  const key = `survey_live_session_${baseSurvey}_${scope}`;
  let token = storage.getItem(key);
  if (!token) {
    token = generateSessionToken();
    storage.setItem(key, token);
  }

  return `live-${baseSurvey}-${scope}-${sanitizeId(token)}`;
}

function normalizeLocation(location) {
  if (!location?.lat || !location?.lng) return null;
  return {
    lat: Number(location.lat),
    lng: Number(location.lng),
  };
}

function normalizeCity({ city, cityId, cityName }) {
  const label = cityName || city || cityId || '';
  return {
    city: label,
    cityId: cityId || city || '',
    cityName: label,
  };
}

export async function syncSurveyLiveSession({
  sessionId,
  survey,
  surveyId,
  interviewer,
  researcherName,
  researcherUid,
  city,
  cityId,
  cityName,
  collectionSource,
  currentStep,
  location,
  gpsAccuracy,
  totalCollected = 0,
  extra = {},
}) {
  if (!sessionId || !(survey?.id || surveyId)) return;

  const normalizedCity = normalizeCity({ city, cityId, cityName });
  const normalizedLocation = normalizeLocation(location);

  await setDoc(doc(db, 'survey_live_sessions', sessionId), {
    surveyId: survey?.id || surveyId,
    surveyTitle: survey?.title || '',
    surveyObjective: survey?.objective || '',
    surveyTrigger: survey?.trigger || '',
    surveyTriggerLabel: survey?.triggerLabel || '',
    themeIds: survey?.themeIds || [],
    themeNames: survey?.themeNames || [],
    questionnaireVersion: survey?.questionnaireVersion || 1,
    interviewerId: interviewer?.id || null,
    interviewerName: interviewer?.nome || interviewer?.name || '',
    interviewerPhone: interviewer?.telefone || null,
    interviewerMeta: Number(interviewer?.meta || 0),
    collectionSource: collectionSource || 'researcher_panel',
    researcherName: researcherName || interviewer?.nome || 'Pesquisador',
    researcherUid: researcherUid || null,
    ...normalizedCity,
    location: normalizedLocation,
    gpsAccuracy: gpsAccuracy || null,
    currentStep: currentStep || 'questions',
    totalCollected: Number(totalCollected || 0),
    online: true,
    lastSeenAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...extra,
  }, { merge: true });
}

export async function markSurveyLiveResponseCollected({
  sessionId,
  survey,
  surveyId,
  interviewer,
  researcherName,
  researcherUid,
  city,
  cityId,
  cityName,
  collectionSource,
  currentStep = 'done',
  location,
  gpsAccuracy,
  totalCollected = 0,
  responseId,
  responseNumber,
}) {
  await syncSurveyLiveSession({
    sessionId,
    survey,
    surveyId,
    interviewer,
    researcherName,
    researcherUid,
    city,
    cityId,
    cityName,
    collectionSource,
    currentStep,
    location,
    gpsAccuracy,
    totalCollected,
    extra: {
      lastResponseId: responseId || null,
      lastResponseNumero: responseNumber || null,
      lastResponseAuditStatus: 'pendente',
      lastResponseAt: serverTimestamp(),
      responsePulseAt: serverTimestamp(),
    },
  });
}

export async function setSurveyLiveSessionOffline(sessionId) {
  if (!sessionId) return;

  await setDoc(doc(db, 'survey_live_sessions', sessionId), {
    online: false,
    currentStep: 'offline',
    updatedAt: serverTimestamp(),
    lastSeenAt: serverTimestamp(),
  }, { merge: true });
}
