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
  const sessionId = useMemo(() => {
    if (!enabled || !(survey?.id || surveyId)) return null;
    return getSurveyLiveSessionId({
      surveyId: survey?.id || surveyId,
      interviewerId: interviewer?.id || null,
      researcherUid,
      collectionSource,
    });
  }, [collectionSource, enabled, interviewer?.id, researcherUid, survey?.id, surveyId]);

  const latestRef = useRef({});
  const locationKeyRef = useRef('');

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
    if (!enabled || !sessionId) return undefined;

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

    syncPresence();
    syncTimer = window.setInterval(() => {
      void syncPresence();
    }, 25000);

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition((position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        const nextAccuracy = position.coords.accuracy || null;
        const nextKey = `${nextLocation.lat.toFixed(5)}:${nextLocation.lng.toFixed(5)}`;

        onLocationUpdate?.(nextLocation, nextAccuracy);

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
      void setSurveyLiveSessionOffline(sessionId);
    };
  }, [enabled, onLocationUpdate, sessionId]);

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
