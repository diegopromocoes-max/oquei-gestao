import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { buildAnalysisSnapshot } from '../lib/analysisResults';

export function useAnalysisSnapshot({
  selSurvey,
  selCity,
  selTheme,
  selVersion,
  selMonth,
  crossConditions,
}) {
  const [surveys, setSurveys] = useState([]);
  const [responses, setResponses] = useState([]);
  const [cities, setCities] = useState([]);
  const [themes, setThemes] = useState([]);
  const [cityResults, setCityResults] = useState([]);
  const [monthlyBases, setMonthlyBases] = useState([]);
  const [actionPlans, setActionPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, 'surveys'), (snap) => setSurveys(
        snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((survey) => survey.status === 'active' || survey.status === 'finished'),
      )),
      onSnapshot(collection(db, 'survey_responses'), (snap) => {
        setResponses(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      }),
      onSnapshot(collection(db, 'cities'), (snap) => setCities(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))),
      onSnapshot(collection(db, 'survey_themes'), (snap) => setThemes(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))),
      onSnapshot(collection(db, 'city_results'), (snap) => setCityResults(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))),
      onSnapshot(query(collection(db, 'monthly_bases'), where('month', '==', selMonth)), (snap) => {
        setMonthlyBases(snap.docs.map((doc) => doc.data()));
      }),
      onSnapshot(collection(db, 'insights_action_plans'), (snap) => setActionPlans(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))),
    ];

    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, [selMonth]);

  return useMemo(() => ({
    loading,
    ...buildAnalysisSnapshot({
      surveys,
      responses,
      cities,
      themes,
      cityResults,
      monthlyBases,
      actionPlans,
      selSurvey,
      selCity,
      selTheme,
      selVersion,
      selMonth,
      crossConditions,
    }),
  }), [
    loading,
    surveys,
    responses,
    cities,
    themes,
    cityResults,
    monthlyBases,
    actionPlans,
    selSurvey,
    selCity,
    selTheme,
    selVersion,
    selMonth,
    crossConditions,
  ]);
}
