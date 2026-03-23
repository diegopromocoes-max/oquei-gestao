import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  BarChart3,
  ChevronRight,
  Download,
  FileText,
  Filter,
  MapPin,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { db } from '../../firebase';
import { Btn, Card, colors } from '../../components/ui';
import { styles as global } from '../../styles/globalStyles';
import ActionPlansSummary from '../components/ActionPlansSummary';
import InsightsAiLogModal from '../components/InsightsAiLogModal';
import InsightsExecutiveAiCard from '../components/InsightsExecutiveAiCard';
import InsightsContextCard from '../components/InsightsContextCard';
import InsightsExecutiveOverview from '../components/InsightsExecutiveOverview';
import InsightsQuestionCharts from '../components/InsightsQuestionCharts';
import InsightsResponseMap from '../components/InsightsResponseMap';
import InsightsResponseModal from '../components/InsightsResponseModal';
import {
  filterInsightEntitiesByPeriod,
  getInsightEntityDate,
  getInsightPeriodLabel,
  INSIGHT_PERIOD_OPTIONS,
  buildInsightsCampaignRows,
  buildInsightsCityRows,
  buildInsightsExecutiveMetrics,
  buildInsightsThemeRows,
  resolveInsightCity,
} from '../lib/insightsExecutive';
import {
  buildInsightsExecutiveReport,
  downloadInsightsExecutiveReport,
} from '../lib/insightsExecutiveExport';
import {
  buildVersionCounts,
  filterInsightActionPlans,
  filterInsightResponses,
  getSelectedThemeLabel,
  getSurveyThemeLabels,
  getVersionOptions,
  questionMatchesTheme,
} from '../lib/strategicInsights';

function getQuestionOptions(question) {
  if (!question) return [];
  if (question.type === 'boolean') return ['Sim', 'Nao'];
  if (question.type === 'nps') return ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  if (question.type === 'select' || question.type === 'multiselect') return question.options || [];
  return [];
}

export default function InsightsDashboard({ aiState, setAiState }) {
  const [surveys, setSurveys] = useState([]);
  const [responses, setResponses] = useState([]);
  const [themes, setThemes] = useState([]);
  const [actionPlans, setActionPlans] = useState([]);
  const [cityRecords, setCityRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selSurvey, setSelSurvey] = useState('all');
  const [selCity, setSelCity] = useState('all');
  const [selTheme, setSelTheme] = useState('all');
  const [selVersion, setSelVersion] = useState('all');
  const [selPeriod, setSelPeriod] = useState('all');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [modalData, setModalData] = useState(null);
  const [filtrosCruz, setFiltrosCruz] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [showFiltroPanel, setShowFiltroPanel] = useState(false);
  const [showAiLog, setShowAiLog] = useState(false);
  const [executiveAiReport, setExecutiveAiReport] = useState(null);

  const mapMode = aiState.mapMode;
  const setMapMode = (value) => setAiState((state) => ({ ...state, mapMode: typeof value === 'function' ? value(state.mapMode) : value }));
  const aiScores = aiState.aiScores;
  const setAiScores = (value) => setAiState((state) => ({ ...state, aiScores: typeof value === 'function' ? value(state.aiScores) : value }));
  const aiLog = aiState.aiLog;
  const setAiLog = (value) => setAiState((state) => ({ ...state, aiLog: typeof value === 'function' ? value(state.aiLog) : value }));
  const aiSurveySnap = aiState.aiSurveySnap;
  const setAiSurveySnap = (value) => setAiState((state) => ({ ...state, aiSurveySnap: typeof value === 'function' ? value(state.aiSurveySnap) : value }));

  useEffect(() => {
    const unsubSurveys = onSnapshot(collection(db, 'surveys'), (snapshot) => {
      const list = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((survey) => survey.status === 'active' || survey.status === 'finished');
      setSurveys(list);
      setSelSurvey((current) => (current !== 'all' && !list.find((survey) => survey.id === current) ? 'all' : current));
    });

    const unsubThemes = onSnapshot(collection(db, 'survey_themes'), (snapshot) => {
      setThemes(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const unsubResponses = onSnapshot(collection(db, 'survey_responses'), (snapshot) => {
      setResponses(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLastUpdate(new Date());
      setLoading(false);
    }, () => setLoading(false));

    const unsubPlans = onSnapshot(collection(db, 'insights_action_plans'), (snapshot) => {
      setActionPlans(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const unsubCities = onSnapshot(collection(db, 'cities'), (snapshot) => {
      setCityRecords(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubSurveys();
      unsubThemes();
      unsubResponses();
      unsubPlans();
      unsubCities();
    };
  }, []);

  const surveyIds = useMemo(() => new Set(surveys.map((survey) => survey.id)), [surveys]);
  const surveyMap = useMemo(() => Object.fromEntries(surveys.map((survey) => [survey.id, survey])), [surveys]);
  const themeMap = useMemo(() => Object.fromEntries(themes.map((theme) => [theme.id, theme])), [themes]);
  const cityMap = useMemo(() => Object.fromEntries(cityRecords.map((city) => [city.id, city])), [cityRecords]);
  const cityNameMap = useMemo(() => Object.fromEntries(cityRecords.map((city) => [city.name, city])), [cityRecords]);

  const cityOptions = useMemo(() => {
    const optionMap = new Map();
    cityRecords.forEach((city) => {
      if (city.name) optionMap.set(city.name, { key: city.id, label: city.name });
    });
    responses.forEach((response) => {
      const city = resolveInsightCity(response, cityMap, cityNameMap);
      if (city.label && city.label !== 'Sem cidade' && !optionMap.has(city.label)) {
        optionMap.set(city.label, city);
      }
    });
    return [...optionMap.values()].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [cityMap, cityNameMap, cityRecords, responses]);

  const selectedSurveyData = useMemo(() => (selSurvey === 'all' ? null : surveyMap[selSurvey] || null), [selSurvey, surveyMap]);
  const selectedCityData = useMemo(
    () => cityRecords.find((city) => city.name === selCity || city.id === selCity) || null,
    [cityRecords, selCity],
  );
  const selectedCityLabel = selCity === 'all' ? 'Todas as cidades' : (selectedCityData?.name || selCity);
  const cityFilterValue = useMemo(
    () => (selCity === 'all' ? 'all' : [selectedCityLabel, selectedCityData?.id, selectedCityData?.name].filter(Boolean)),
    [selCity, selectedCityData, selectedCityLabel],
  );
  const surveyThemeLabels = useMemo(() => getSurveyThemeLabels(selectedSurveyData, themeMap), [selectedSurveyData, themeMap]);
  const selectedThemeLabel = useMemo(() => getSelectedThemeLabel(selTheme, themeMap), [selTheme, themeMap]);
  const selectedThemeKey = selTheme === 'all' ? 'all' : selectedThemeLabel;
  const selectedSurveyLabel = selectedSurveyData?.title || 'Todas as pesquisas';
  const selectedVersionLabel = selVersion === 'all' ? 'Todas as versoes' : `Versao ${selVersion}`;
  const selectedPeriodLabel = useMemo(() => getInsightPeriodLabel(selPeriod), [selPeriod]);
  const executiveResetKey = [selSurvey, selCity, selTheme, selVersion, selPeriod, lastUpdate.getTime(), responses.length, actionPlans.length].join('|');

  const themeOptions = useMemo(() => {
    if (selectedSurveyData?.themeIds?.length) {
      return selectedSurveyData.themeIds.map((themeId) => themeMap[themeId]).filter(Boolean);
    }
    return themes.filter((theme) => theme.status !== 'inactive');
  }, [selectedSurveyData, themeMap, themes]);

  const preFiltered = useMemo(() => (
    filterInsightEntitiesByPeriod(filterInsightResponses(responses, {
      validSurveyIds: surveyIds,
      surveyId: selSurvey,
      city: cityFilterValue,
      themeId: selTheme,
      version: 'all',
      acceptedOnly: true,
    }), selPeriod)
  ), [responses, surveyIds, selSurvey, cityFilterValue, selTheme, selPeriod]);

  const versionOptions = useMemo(() => getVersionOptions(preFiltered), [preFiltered]);

  useEffect(() => {
    if (selVersion !== 'all' && !versionOptions.includes(String(selVersion))) {
      setSelVersion('all');
    }
  }, [selVersion, versionOptions]);

  useEffect(() => {
    if (selTheme === 'all' || !selectedSurveyData) return;
    if (!selectedSurveyData.themeIds?.includes(selTheme)) {
      setSelTheme('all');
    }
  }, [selTheme, selectedSurveyData]);

  const filtered = useMemo(() => (
    filterInsightResponses(preFiltered, {
      version: selVersion,
      acceptedOnly: false,
    })
  ), [preFiltered, selVersion]);

  const relatedPlans = useMemo(() => (
    filterInsightEntitiesByPeriod(filterInsightActionPlans(actionPlans, {
      cityRef: cityFilterValue,
      surveyId: selSurvey,
      themeId: selTheme,
    }), selPeriod)
  ), [actionPlans, cityFilterValue, selSurvey, selTheme, selPeriod]);

  const versionCounts = useMemo(() => buildVersionCounts(preFiltered), [preFiltered]);

  const cityComparisonResponses = useMemo(() => (
    filterInsightEntitiesByPeriod(filterInsightResponses(responses, {
      validSurveyIds: surveyIds,
      surveyId: selSurvey,
      city: 'all',
      themeId: selTheme,
      version: selVersion,
      acceptedOnly: true,
    }), selPeriod)
  ), [responses, surveyIds, selSurvey, selTheme, selVersion, selPeriod]);

  const cityComparisonPlans = useMemo(() => (
    filterInsightEntitiesByPeriod(filterInsightActionPlans(actionPlans, {
      cityRef: 'all',
      surveyId: selSurvey,
      themeId: selTheme,
    }), selPeriod)
  ), [actionPlans, selSurvey, selTheme, selPeriod]);

  const campaignComparisonResponses = useMemo(() => (
    filterInsightEntitiesByPeriod(filterInsightResponses(responses, {
      validSurveyIds: surveyIds,
      surveyId: 'all',
      city: cityFilterValue,
      themeId: selTheme,
      version: selVersion,
      acceptedOnly: true,
    }), selPeriod)
  ), [responses, surveyIds, cityFilterValue, selTheme, selVersion, selPeriod]);

  const campaignComparisonPlans = useMemo(() => (
    filterInsightEntitiesByPeriod(filterInsightActionPlans(actionPlans, {
      cityRef: cityFilterValue,
      surveyId: 'all',
      themeId: selTheme,
    }), selPeriod)
  ), [actionPlans, cityFilterValue, selTheme, selPeriod]);

  const themeComparisonResponses = useMemo(() => (
    filterInsightEntitiesByPeriod(filterInsightResponses(responses, {
      validSurveyIds: surveyIds,
      surveyId: selSurvey,
      city: cityFilterValue,
      themeId: 'all',
      version: selVersion,
      acceptedOnly: true,
    }), selPeriod)
  ), [responses, surveyIds, selSurvey, cityFilterValue, selVersion, selPeriod]);

  const themeComparisonPlans = useMemo(() => (
    filterInsightEntitiesByPeriod(filterInsightActionPlans(actionPlans, {
      cityRef: cityFilterValue,
      surveyId: selSurvey,
      themeId: 'all',
    }), selPeriod)
  ), [actionPlans, cityFilterValue, selSurvey, selPeriod]);

  const executiveMetrics = useMemo(() => buildInsightsExecutiveMetrics(filtered, relatedPlans, themeMap), [filtered, relatedPlans, themeMap]);
  const cityRows = useMemo(() => buildInsightsCityRows(cityComparisonResponses, cityComparisonPlans, cityMap, cityNameMap), [cityComparisonResponses, cityComparisonPlans, cityMap, cityNameMap]);
  const campaignRows = useMemo(() => buildInsightsCampaignRows(campaignComparisonResponses, campaignComparisonPlans, surveyMap, themeMap), [campaignComparisonResponses, campaignComparisonPlans, surveyMap, themeMap]);
  const themeRows = useMemo(() => buildInsightsThemeRows(themeComparisonResponses, themeComparisonPlans, themeMap), [themeComparisonResponses, themeComparisonPlans, themeMap]);

  const analytics = useMemo(() => {
    const questions = (selectedSurveyData?.questions || []).filter((question) => questionMatchesTheme(question, selTheme, selectedSurveyData));
    return {
      questions: questions.map((question) => {
        const allAnswers = filtered.map((response) => response.answers?.[question.id]).filter((answer) => answer !== undefined && answer !== null && answer !== '');
        if (!allAnswers.length) return { q: question, data: [], nps: null, total: 0 };
        if (question.type === 'nps') {
          const numbers = allAnswers.map(Number).filter((value) => !Number.isNaN(value));
          const promoters = numbers.filter((value) => value >= 9).length;
          const detractors = numbers.filter((value) => value <= 6).length;
          const total = numbers.length;
          const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;
          const avg = total > 0 ? (numbers.reduce((acc, value) => acc + value, 0) / total).toFixed(1) : '0.0';
          const data = Array.from({ length: 11 }, (_, index) => ({ key: String(index), count: numbers.filter((value) => value === index).length }));
          return { q: question, data, nps, avg, total };
        }
        const counts = {};
        if (question.type === 'multiselect') {
          allAnswers.forEach((answer) => {
            (Array.isArray(answer) ? answer : [answer]).forEach((item) => {
              if (item) counts[item] = (counts[item] || 0) + 1;
            });
          });
        } else {
          allAnswers.forEach((answer) => {
            counts[String(answer)] = (counts[String(answer)] || 0) + 1;
          });
        }
        const data = Object.entries(counts).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
        return { q: question, data, nps: null, total: allAnswers.length };
      }),
    };
  }, [filtered, selectedSurveyData, selTheme]);

  const npsColor = (value) => {
    if (value >= 9) return colors.success;
    if (value >= 7) return colors.primary;
    if (value >= 5) return colors.warning;
    return colors.danger;
  };

  const matchIds = useMemo(() => {
    if (mapMode !== 'filtro' || !filtrosCruz.length) return null;
    return new Set(
      filtered.filter((response) => (
        filtrosCruz.every((filtro) => {
          const answer = response.answers?.[filtro.qId];
          const question = selectedSurveyData?.questions?.find((item) => item.id === filtro.qId);
          if (Array.isArray(answer)) return answer.includes(filtro.valor);
          if (question?.type === 'nps') return Number(answer) >= Number(filtro.valor);
          return String(answer || '') === filtro.valor;
        })
      )).map((response) => response.id),
    );
  }, [filtered, filtrosCruz, mapMode, selectedSurveyData]);

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAiLog((current) => [...current, { time, msg, type }]);
  };

  const runAiAnalysis = async () => {
    if (!selSurvey || selSurvey === 'all') {
      setAiError('Selecione uma pesquisa especifica para analise de IA.');
      return;
    }

    const geminiKey = import.meta.env?.VITE_GEMINI_API_KEY || '';
    if (!geminiKey) {
      setAiError('Chave Gemini nao encontrada. Adicione VITE_GEMINI_API_KEY no .env');
      return;
    }

    const survey = surveyMap[selSurvey];
    if (!survey) return;

    const geoResponses = filtered.filter((response) => response.location?.lat);
    if (!geoResponses.length) {
      setAiError('Nenhuma resposta com GPS para analisar.');
      return;
    }

    const strategyContext = [
      `Objetivo estrategico: ${survey.objective || 'Nao informado'}`,
      `Gatilho: ${survey.triggerLabel || survey.trigger || 'Nao informado'}`,
      `Cidade: ${selectedCityLabel}`,
      `Tema em foco: ${selectedThemeLabel}`,
      `Versao filtrada: ${selVersion === 'all' ? 'Todas' : `Versao ${selVersion}`}`,
    ].join(' | ');

    setAiLog([]);
    setAiScores({});
    setAiSurveySnap(survey);
    setAiLoading(true);
    setAiError('');
    setMapMode('ia');

    addLog(`Analise iniciada - pesquisa: "${survey.title}"`, 'info');
    addLog(`${geoResponses.length} respondente(s) com GPS encontrados`, 'info');
    addLog('Modelo: Gemini 2.5 Flash', 'info');

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
    const batches = [];
    for (let index = 0; index < geoResponses.length; index += 10) batches.push(geoResponses.slice(index, index + 10));
    addLog(`${batches.length} lote(s) de ate 10 respondentes`, 'info');

    const nextScores = {};
    let batchIndex = 0;

    for (const batch of batches) {
      batchIndex += 1;
      addLog(`Processando lote ${batchIndex}/${batches.length} (${batch.length} respondentes)...`, 'info');

      const payload = batch.map((response) => ({
        id: response.id,
        nome: response.researcherName || 'N/A',
        cidade: response.city || '',
        respostas: (survey.questions || []).map((question) => ({
          pergunta: question.label,
          resposta: (() => {
            const value = response.answers?.[question.id];
            return Array.isArray(value) ? value.join(', ') : (value || '');
          })(),
        })),
      }));

      const prompt = `Voce e especialista em propensao de compra para Oquei Telecom.
Analise cada respondente e retorne JSON: {"scores":[{"id":"...","score":1-10,"motivo":"ate 12 palavras"}]}
Score: 1-3=frio, 4-6=morno, 7-8=quente, 9-10=muito quente.
Retorne APENAS o JSON.
Dados: ${JSON.stringify({ contextoCampanha: strategyContext, respondentes: payload })}`;

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 2048, responseMimeType: 'application/json' },
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          const message = error?.error?.message || response.status;
          addLog(`Erro HTTP no lote ${batchIndex}: ${message}`, 'error');
          setAiError(`Gemini: ${message}`);
          break;
        }

        const data = await response.json();
        let text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim().replace(/```json|```/g, '').trim();
        let parsed = null;

        try {
          parsed = JSON.parse(text);
        } catch {
          const match = text.match(/\{[\s\S]*"scores"[\s\S]*\}/);
          if (match) {
            try { parsed = JSON.parse(match[0]); } catch { parsed = null; }
          }
        }

        if (parsed?.scores) {
          let quentes = 0;
          let mornos = 0;
          let frios = 0;
          parsed.scores.forEach((score) => {
            if (score.id && score.score) {
              nextScores[score.id] = { score: Number(score.score), motivo: score.motivo || '' };
              if (score.score >= 7) quentes += 1;
              else if (score.score >= 4) mornos += 1;
              else frios += 1;
            }
          });
          addLog(`Lote ${batchIndex} processado - ${quentes} quente(s), ${mornos} morno(s), ${frios} frio(s)`, 'success');
        } else {
          addLog(`Lote ${batchIndex}: nenhum score extraido`, 'warn');
        }
      } catch (error) {
        addLog(`Lote ${batchIndex} falhou: ${error.message}`, 'error');
      }
    }

    const total = Object.keys(nextScores).length;
    if (!total) {
      setAiError('Gemini nao retornou resultados. Tente novamente.');
      addLog('Analise encerrada sem resultados', 'error');
    } else {
      const muitoQuentes = Object.values(nextScores).filter((item) => item.score >= 9).length;
      const quentes = Object.values(nextScores).filter((item) => item.score >= 7 && item.score < 9).length;
      const mornos = Object.values(nextScores).filter((item) => item.score >= 4 && item.score < 7).length;
      const frios = Object.values(nextScores).filter((item) => item.score < 4).length;
      addLog('------------------------------------', 'divider');
      addLog(`Resumo final - ${total} respondentes analisados`, 'info');
      addLog(`Muito quentes (9-10): ${muitoQuentes}`, 'success');
      addLog(`Quentes (7-8): ${quentes}`, 'success');
      addLog(`Mornos (4-6): ${mornos}`, 'info');
      addLog(`Frios (1-3): ${frios}`, 'info');
    }

    setAiScores(nextScores);
    setAiLoading(false);
  };

  const exportCSV = () => {
    const selectedQuestions = selectedSurveyData?.questions || [];
    const rows = [['ID', 'Pesquisa', 'Pesquisador', 'Cidade', 'Lat', 'Lng', 'Data', ...selectedQuestions.map((question) => question.label)]];
    filtered.forEach((response) => {
      const responseDate = getInsightEntityDate(response);
      const answers = selectedQuestions.map((question) => {
        const value = response.answers?.[question.id];
        return Array.isArray(value) ? value.join(' | ') : (value || '');
      });
      rows.push([
        response.id,
        response.surveyTitle || response.surveyId || '',
        response.researcherName || '',
        response.cityName || response.city || response.cityId || '',
        response.location?.lat || '',
        response.location?.lng || '',
        responseDate?.toLocaleDateString('pt-BR') || '',
        ...answers,
      ]);
    });
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'oquei-insights.csv';
    link.click();
  };

  const exportExecutiveBriefing = () => {
    const content = buildInsightsExecutiveReport({
      generatedAt: new Date(),
      filters: {
        surveyLabel: selectedSurveyLabel,
        cityLabel: selectedCityLabel,
        themeLabel: selectedThemeLabel,
        versionLabel: selectedVersionLabel,
        periodLabel: selectedPeriodLabel,
      },
      survey: selectedSurveyData,
      metrics: executiveMetrics,
      cityRows,
      campaignRows,
      themeRows,
      plans: relatedPlans,
      aiReport: executiveAiReport,
    });

    downloadInsightsExecutiveReport(content, {
      surveyLabel: selectedSurveyLabel,
      cityLabel: selectedCityLabel,
      periodLabel: selectedPeriodLabel,
    });
  };

  const inputStyle = {
    padding: '8px 12px',
    borderRadius: '9px',
    border: '1px solid var(--border)',
    outline: 'none',
    fontSize: '13px',
    color: 'var(--text-main)',
    background: 'var(--bg-app)',
    fontFamily: 'inherit',
    cursor: 'pointer',
  };

  return (
    <div style={{ ...global.container }}>
      <div style={{ background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-panel) 100%)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: `linear-gradient(135deg, ${colors.danger}, ${colors.amber})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 18px ${colors.danger}44` }}>
            <BarChart3 size={24} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '21px', fontWeight: '900', color: 'var(--text-main)' }}>Dashboard Executivo</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Recorte atual: {selectedPeriodLabel}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>Atualizado as {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · somente entrevistas aceitas</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Btn variant="secondary" size="sm" onClick={() => setLastUpdate(new Date())} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><RefreshCw size={13} /> Atualizar</Btn>
          <Btn variant="secondary" size="sm" onClick={exportExecutiveBriefing} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><FileText size={13} /> Exportar briefing</Btn>
          <Btn variant="secondary" size="sm" onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Download size={13} /> Exportar CSV</Btn>
        </div>
      </div>

      <Card>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={16} color="var(--text-muted)" />
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>Pesquisa:</span>
            <select style={inputStyle} value={selSurvey} onChange={(event) => setSelSurvey(event.target.value)}>
              <option value="all">Todas</option>
              {surveys.map((survey) => <option key={survey.id} value={survey.id}>{survey.title}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>Cidade:</span>
            <select style={inputStyle} value={selCity} onChange={(event) => setSelCity(event.target.value)}>
              <option value="all">Todas</option>
              {cityOptions.map((city) => <option key={city.label} value={city.label}>{city.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>Tema:</span>
            <select style={inputStyle} value={selTheme} onChange={(event) => setSelTheme(event.target.value)}>
              <option value="all">Todos</option>
              {themeOptions.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>Versao:</span>
            <select style={inputStyle} value={selVersion} onChange={(event) => setSelVersion(event.target.value)}>
              <option value="all">Todas</option>
              {versionOptions.map((version) => <option key={version} value={version}>{`Versao ${version}`}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>Periodo:</span>
            <select style={inputStyle} value={selPeriod} onChange={(event) => setSelPeriod(event.target.value)}>
              {INSIGHT_PERIOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>
            {filtered.length} resposta{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      </Card>

      <InsightsExecutiveOverview
        metrics={executiveMetrics}
        cityRows={cityRows}
        campaignRows={campaignRows}
        themeRows={themeRows}
        periodLabel={selectedPeriodLabel}
        selectedCityLabel={selectedCityLabel}
        selectedCampaignLabel={selectedSurveyLabel}
        selectedThemeLabel={selectedThemeLabel}
        selectedCityKey={selCity === 'all' ? 'all' : (selectedCityData?.id || selectedCityLabel)}
        selectedCampaignKey={selSurvey}
        selectedThemeKey={selectedThemeKey}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        <InsightsContextCard
          survey={selectedSurveyData}
          responseCount={filtered.length}
          themeLabels={surveyThemeLabels}
          versionCounts={versionCounts}
          selectedThemeLabel={selectedThemeLabel}
          selectedVersion={selVersion}
          cityLabel={selectedCityLabel}
          planCount={relatedPlans.length}
        />
        <ActionPlansSummary plans={relatedPlans} subtitle="Acompanhamento das acoes que conversam com este recorte" />
        <InsightsExecutiveAiCard
          resetKey={executiveResetKey}
          survey={selectedSurveyData}
          responses={filtered}
          analytics={analytics}
          plans={relatedPlans}
          metrics={executiveMetrics}
          cityRows={cityRows}
          campaignRows={campaignRows}
          themeRows={themeRows}
          selectedCityLabel={selectedCityLabel}
          selectedThemeLabel={selectedThemeLabel}
          selectedVersionLabel={selectedVersionLabel}
          selectedPeriodLabel={selectedPeriodLabel}
          onReportChange={setExecutiveAiReport}
        />
      </div>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontWeight: '900', fontSize: '15px', color: 'var(--text-main)' }}>Mapa de Respostas</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {mapMode === 'filtro' && matchIds
                ? `${matchIds.size} de ${filtered.length} respondem aos filtros`
                : mapMode === 'ia' && Object.keys(aiScores || {}).length
                  ? `${Object.keys(aiScores || {}).length} respondentes analisados pela IA`
                  : 'Clique nos marcadores para ver detalhes'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => { setShowFiltroPanel((current) => !current); setMapMode((current) => (current === 'filtro' ? 'normal' : 'filtro')); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: `1px solid ${mapMode === 'filtro' ? colors.primary : 'var(--border)'}`, background: mapMode === 'filtro' ? `${colors.primary}15` : 'var(--bg-app)', color: mapMode === 'filtro' ? colors.primary : 'var(--text-muted)', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}>
              <SlidersHorizontal size={13} /> Filtro cruzado
              {filtrosCruz.length > 0 && <span style={{ background: colors.primary, color: '#fff', borderRadius: '10px', padding: '1px 6px', fontSize: '10px' }}>{filtrosCruz.length}</span>}
            </button>
            <button onClick={runAiAnalysis} disabled={aiLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: `1px solid ${mapMode === 'ia' ? '#f59e0b' : 'var(--border)'}`, background: mapMode === 'ia' ? '#f59e0b15' : 'var(--bg-app)', color: mapMode === 'ia' ? '#f59e0b' : 'var(--text-muted)', fontWeight: '800', fontSize: '12px', cursor: aiLoading ? 'not-allowed' : 'pointer', opacity: aiLoading ? 0.7 : 1 }}>
              {aiLoading ? <><Zap size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Analisando...</> : <><Zap size={13} /> IA · Leads quentes</>}
            </button>
            {aiLog.length > 0 && <button onClick={() => setShowAiLog(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(139,92,246,0.4)', background: 'rgba(139,92,246,0.08)', color: '#8b5cf6', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}><FileText size={13} /> Ver log da IA</button>}
            {mapMode !== 'normal' && <button onClick={() => { setMapMode('normal'); setShowFiltroPanel(false); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-muted)', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}><X size={12} /> Limpar</button>}
          </div>
        </div>

        {showFiltroPanel && selSurvey !== 'all' && (
          <div style={{ background: 'var(--bg-app)', border: `1px solid ${colors.primary}30`, borderRadius: '12px', padding: '14px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '12px', fontWeight: '900', color: colors.primary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filtro de cruzamento - pins coloridos = clientes que atendem todas as condicoes</div>
            {filtrosCruz.map((filtro, index) => {
              const question = selectedSurveyData?.questions?.find((item) => item.id === filtro.qId);
              const options = getQuestionOptions(question);
              const isText = question?.type === 'text';
              const isNps = question?.type === 'nps';
              return (
                <div key={`${filtro.qId || 'filtro'}-${index}`} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', minWidth: '16px', textAlign: 'center' }}>{index + 1}</span>
                  <select value={filtro.qId} onChange={(event) => setFiltrosCruz((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, qId: event.target.value, valor: '' } : item)))} style={{ flex: 2, padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '12px', outline: 'none' }}>
                    <option value="">Pergunta...</option>
                    {(selectedSurveyData?.questions || []).map((questionItem) => <option key={questionItem.id} value={questionItem.id}>{questionItem.label.substring(0, 50)}</option>)}
                  </select>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{isNps ? '>=' : 'e'}</span>
                  {isText ? (
                    <input value={filtro.valor} onChange={(event) => setFiltrosCruz((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, valor: event.target.value } : item)))} placeholder="Digite o valor..." style={{ flex: 2, padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '12px', outline: 'none', fontFamily: 'inherit' }} />
                  ) : (
                    <select value={filtro.valor} onChange={(event) => setFiltrosCruz((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, valor: event.target.value } : item)))} style={{ flex: 2, padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontSize: '12px', outline: 'none' }}>
                      <option value="">Resposta...</option>
                      {options.map((option) => <option key={option} value={option}>{isNps ? `${option} ou mais` : option}</option>)}
                    </select>
                  )}
                  <button onClick={() => setFiltrosCruz((current) => current.filter((_, itemIndex) => itemIndex !== index))} style={{ padding: '7px', borderRadius: '7px', border: `1px solid ${colors.danger}30`, background: `${colors.danger}10`, color: colors.danger, cursor: 'pointer', display: 'flex' }}><Trash2 size={12} /></button>
                </div>
              );
            })}
            <button onClick={() => setFiltrosCruz((current) => [...current, { qId: '', valor: '' }])} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: `1px dashed ${colors.primary}40`, background: `${colors.primary}08`, color: colors.primary, fontWeight: '800', fontSize: '12px', cursor: 'pointer', alignSelf: 'flex-start' }}><Plus size={12} /> Adicionar condicao</button>
            {matchIds !== null && <div style={{ fontSize: '12px', fontWeight: '700', color: matchIds.size > 0 ? colors.success : colors.warning }}>{matchIds.size > 0 ? `${matchIds.size} respondente(s) atendem todos os criterios` : 'Nenhum respondente atende todos os criterios'}</div>}
          </div>
        )}

        {showFiltroPanel && selSurvey === 'all' && <div style={{ background: `${colors.warning}10`, border: `1px solid ${colors.warning}30`, borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '12px', color: colors.warning, fontWeight: '700' }}>Selecione uma pesquisa especifica para usar o cruzamento de respostas.</div>}
        {mapMode === 'ia' && Object.keys(aiScores || {}).length > 0 && (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {[{ label: 'Muito Quente (9-10)', color: '#ef4444' }, { label: 'Quente (7-8)', color: '#f59e0b' }, { label: 'Morno (4-6)', color: '#3b82f6' }, { label: 'Frio (1-3)', color: '#64748b' }].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, boxShadow: `0 0 6px ${item.color}80` }} />
                {item.label}
              </div>
            ))}
          </div>
        )}
        {aiError && <div style={{ background: `${colors.danger}10`, border: `1px solid ${colors.danger}30`, borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '12px', color: colors.danger, fontWeight: '700' }}>{aiError}</div>}
        <InsightsResponseMap responses={filtered} matchIds={matchIds} mapMode={mapMode} aiScores={aiScores} onSelectResposta={(resposta, grupo) => setModalData({ resposta, grupo })} />
      </Card>

      <InsightsQuestionCharts loading={loading} analytics={analytics} npsColor={npsColor} />

      <Card title="Respostas Recentes" subtitle={`${Math.min(filtered.length, 10)} mais recentes`}>
        {!filtered.length ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>Nenhuma resposta ainda.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            {[...filtered].sort((a, b) => {
              const firstDate = getInsightEntityDate(a)?.getTime?.() || 0;
              const secondDate = getInsightEntityDate(b)?.getTime?.() || 0;
              return secondDate - firstDate;
            }).slice(0, 10).map((response) => (
              <div key={response.id} onClick={() => setModalData({ resposta: response, grupo: null })} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: `${colors.primary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '12px', fontWeight: '900', color: colors.primary }}>{(response.researcherName || '?')[0].toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '800', fontSize: '12px', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{response.researcherName || 'Pesquisador'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{response.surveyTitle || response.surveyId} · {response.city || '-'} · v{response.surveyVersion || 1}{response.numero ? ` · #${response.numero}` : ''}</div>
                </div>
                {response.location?.lat && <div style={{ fontSize: '11px', color: colors.info, fontWeight: '800', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}><MapPin size={11} /> GPS</div>}
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{getInsightEntityDate(response)?.toLocaleDateString('pt-BR') || '-'}</div>
                <ChevronRight size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {modalData && <InsightsResponseModal resposta={modalData.resposta} grupo={modalData.grupo} surveys={surveys} onClose={() => setModalData(null)} />}
      {showAiLog && <InsightsAiLogModal log={aiLog} aiScores={aiScores} responses={filtered} survey={aiSurveySnap} onClose={() => setShowAiLog(false)} />}
    </div>
  );
}
