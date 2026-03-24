import { useEffect, useMemo, useRef } from 'react';
import {
  getSurveyLiveSessionId,
  markSurveyLiveResponseCollected,
  setSurveyLiveSessionOffline,
  syncSurveyLiveSession,
} from '../lib/surveyLiveSessions';

export function useSurveyLiveTracking({
  enabled,
  survey,
  surveyId,
  interviewer = null,
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
  onLocationUpdate,
}) {
  // sessionId só muda se surveyId/interviewerId/uid mudar — estável durante a coleta
  const sessionId = useMemo(() => {
    if (!(survey?.id || surveyId)) return null;
    return getSurveyLiveSessionId({
      surveyId: survey?.id || surveyId,
      interviewerId: interviewer?.id || null,
      researcherUid,
      collectionSource,
    });
  }, [collectionSource, interviewer?.id, researcherUid, survey?.id, surveyId]);

  // Refs — evitam que mudanças de valor causem remount do effect principal
  const latestRef = useRef({});
  const locationKeyRef = useRef('');
  // onLocationUpdate via ref — arrow function nova a cada render não causa remount
  const onLocationUpdateRef = useRef(onLocationUpdate);
  useEffect(() => { onLocationUpdateRef.current = onLocationUpdate; }, [onLocationUpdate]);

  // Atualiza snapshot de dados para uso nos syncs
  useEffect(() => {
    latestRef.current = {
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
    };
  }, [
    city,
    cityId,
    cityName,
    collectionSource,
    currentStep,
    gpsAccuracy,
    interviewer,
    location,
    researcherName,
    researcherUid,
    sessionId,
    survey,
    surveyId,
    totalCollected,
  ]);

  useEffect(() => {
    // Monta sempre que sessionId existir — não desmonta ao mudar step
    if (!sessionId) return undefined;

    let closed = false;
    let syncTimer = null;
    let watchId = null;

    const syncPresence = async (override = {}) => {
      if (closed) return;
      const snapshot = latestRef.current;
      try {
        await syncSurveyLiveSession({
          sessionId: snapshot.sessionId,
          survey: snapshot.survey,
          surveyId: snapshot.surveyId,
          interviewer: snapshot.interviewer,
          researcherName: snapshot.researcherName,
          researcherUid: snapshot.researcherUid,
          city: snapshot.city,
          cityId: snapshot.cityId,
          cityName: snapshot.cityName,
          collectionSource: snapshot.collectionSource,
          currentStep: override.currentStep || snapshot.currentStep,
          location: override.location || snapshot.location,
          gpsAccuracy: override.gpsAccuracy ?? snapshot.gpsAccuracy,
          totalCollected: override.totalCollected ?? snapshot.totalCollected,
          extra: override.extra || {},
        });
      } catch {
        // Monitoramento ao vivo nao deve bloquear a coleta
      }
    };

    // Sync imediato ao montar
    syncPresence();

    // Heartbeat a cada 30s — mantém sessão online
    syncTimer = window.setInterval(() => {
      void syncPresence();
    }, 30000);

    // watchPosition — atualiza localização contínua
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition((position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const nextAccuracy = position.coords.accuracy || null;
        const nextKey = `${nextLocation.lat.toFixed(5)}:${nextLocation.lng.toFixed(5)}`;

        // Usa ref — não recria o effect quando onLocationUpdate mudar
        onLocationUpdateRef.current?.(nextLocation, nextAccuracy);

        if (locationKeyRef.current === nextKey) return;
        locationKeyRef.current = nextKey;
        void syncPresence({ location: nextLocation, gpsAccuracy: nextAccuracy });
      }, () => {}, {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      });
    }

    return () => {
      closed = true;
      if (syncTimer) window.clearInterval(syncTimer);
      if (watchId !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchId);
      // Só marca offline quando o componente desmonta de verdade (fechar o app/tab)
      // Não marca offline ao trocar de step (inicio→questions→done→questions)
      void setSurveyLiveSessionOffline(sessionId);
    };
  }, [sessionId]); // <-- apenas sessionId: estável durante toda a coleta

  // Sync imediato quando localização GPS mudar — garante que o pin aparece
  // na Central Ao Vivo assim que o pesquisador captura o GPS, sem esperar o heartbeat
  const prevLocationKeyRef = useRef('');
  useEffect(() => {
    if (!enabled || !sessionId || !location?.lat || !location?.lng) return;
    const key = `${Number(location.lat).toFixed(5)}:${Number(location.lng).toFixed(5)}`;
    if (prevLocationKeyRef.current === key) return;
    prevLocationKeyRef.current = key;
    locationKeyRef.current = key;
    void syncSurveyLiveSession({
      sessionId,
      survey: latestRef.current.survey,
      surveyId: latestRef.current.surveyId,
      interviewer: latestRef.current.interviewer,
      researcherName: latestRef.current.researcherName,
      researcherUid: latestRef.current.researcherUid,
      city: latestRef.current.city,
      cityId: latestRef.current.cityId,
      cityName: latestRef.current.cityName,
      collectionSource: latestRef.current.collectionSource,
      currentStep: latestRef.current.currentStep,
      location,
      gpsAccuracy,
      totalCollected: latestRef.current.totalCollected,
      extra: {},
    }).catch(() => {});
  }, [enabled, sessionId, location, gpsAccuracy]);

  const markResponseCollected = async ({
    responseId,
    responseNumber,
    currentStep: nextStep = 'done',
    totalCollected: nextTotalCollected,
  } = {}) => {
    if (!sessionId) return;

    const snapshot = latestRef.current;
    await markSurveyLiveResponseCollected({
      sessionId,
      survey: snapshot.survey,
      surveyId: snapshot.surveyId,
      interviewer: snapshot.interviewer,
      researcherName: snapshot.researcherName,
      researcherUid: snapshot.researcherUid,
      city: snapshot.city,
      cityId: snapshot.cityId,
      cityName: snapshot.cityName,
      collectionSource: snapshot.collectionSource,
      currentStep: nextStep,
      location: snapshot.location,
      gpsAccuracy: snapshot.gpsAccuracy,
      totalCollected: nextTotalCollected ?? snapshot.totalCollected,
      responseId,
      responseNumber,
    });
  };

  return {
    sessionId,
    markResponseCollected,
  };
}