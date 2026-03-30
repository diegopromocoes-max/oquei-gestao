import React, { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Card } from '../../components/ui';
import { styles as global } from '../../styles/globalStyles';
import ActionPlansSummary from '../components/ActionPlansSummary';
import AnalysisHeader from '../components/AnalysisHeader';
import CompetitorVulnerabilitySection from '../components/CompetitorVulnerabilitySection';
import CrossFilterCard from '../components/CrossFilterCard';
import InsightsContextCard from '../components/InsightsContextCard';
import MarketOverviewSection from '../components/MarketOverviewSection';
import MarketPrioritiesCard from '../components/MarketPrioritiesCard';
import OperationalKpisSection from '../components/OperationalKpisSection';
import StrategicAiCard from '../components/StrategicAiCard';
import ThemeQuestionInsights from '../components/ThemeQuestionInsights';
import { useAnalysisSnapshot } from '../hooks/useAnalysisSnapshot';
import { createCrossCondition } from '../lib/analysisResults';

export default function AnaliseResultados() {
  const [selSurvey, setSelSurvey] = useState('all');
  const [selCity, setSelCity] = useState('all');
  const [selTheme, setSelTheme] = useState('all');
  const [selVersion, setSelVersion] = useState('all');
  const [selMonth, setSelMonth] = useState(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
  const [crossConditions, setCrossConditions] = useState([]);
  const [expandedProvider, setExpandedProvider] = useState(null);

  const {
    loading,
    survey,
    questions,
    qIds,
    responses,
    filteredResponses,
    market,
    opData,
    relatedPlans,
    versionOptions,
    versionCounts,
    filters,
  } = useAnalysisSnapshot({
    selSurvey,
    selCity,
    selTheme,
    selVersion,
    selMonth,
    crossConditions,
  });

  const {
    surveys,
    cities,
    themeOptions,
    selectedCityLabel,
    selectedThemeLabel,
    surveyThemeLabels,
    activeCrossConditions,
  } = filters;

  useEffect(() => {
    if (selVersion !== 'all' && !versionOptions.includes(String(selVersion))) {
      setSelVersion('all');
    }
  }, [selVersion, versionOptions]);

  useEffect(() => {
    if (selTheme === 'all' || !survey) return;
    if (!survey.themeIds?.includes(selTheme)) {
      setSelTheme('all');
    }
  }, [selTheme, survey]);

  useEffect(() => {
    setCrossConditions([]);
    setExpandedProvider(null);
  }, [selSurvey]);

  const addCrossCondition = () => {
    setCrossConditions((prev) => [...prev, createCrossCondition(questions)]);
  };

  const updateCrossCondition = (conditionId, patch) => {
    setCrossConditions((prev) => prev.map((condition) => (
      condition.id === conditionId ? { ...condition, ...patch } : condition
    )));
  };

  const removeCrossCondition = (conditionId) => {
    setCrossConditions((prev) => prev.filter((condition) => condition.id !== conditionId));
  };

  const clearCrossConditions = () => setCrossConditions([]);
  const hasSurveySelection = selSurvey !== 'all';
  const hasResponsesInSelection = filteredResponses.length > 0;
  const hasMarketMetrics = Boolean(market);
  const missingMarketQuestion = hasSurveySelection && hasResponsesInSelection && !qIds?.provedor;

  return (
    <div style={{ ...global.container }}>
      <AnalysisHeader
        surveys={surveys}
        cities={cities}
        themeOptions={themeOptions}
        versionOptions={versionOptions}
        selSurvey={selSurvey}
        selCity={selCity}
        selTheme={selTheme}
        selVersion={selVersion}
        selMonth={selMonth}
        filteredCount={filteredResponses.length}
        loading={loading}
        onSurveyChange={setSelSurvey}
        onCityChange={setSelCity}
        onThemeChange={setSelTheme}
        onVersionChange={setSelVersion}
        onMonthChange={setSelMonth}
      />

      <OperationalKpisSection opData={opData} month={selMonth} />

      {!hasSurveySelection ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <BarChart3 size={36} style={{ opacity: 0.2, marginBottom: '12px' }} />
            <div style={{ fontWeight: '800', marginBottom: '4px' }}>Selecione uma pesquisa com dados</div>
            <div style={{ fontSize: '13px' }}>Escolha a pesquisa no filtro acima. As entrevistas precisam estar aceitas na Auditoria.</div>
          </div>
        </Card>
      ) : !hasResponsesInSelection ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <BarChart3 size={36} style={{ opacity: 0.2, marginBottom: '12px' }} />
            <div style={{ fontWeight: '800', marginBottom: '4px' }}>Nenhuma entrevista encontrada no recorte</div>
            <div style={{ fontSize: '13px' }}>Revise cidade, tema, versão, mês ou o cruzamento aplicado para esta pesquisa.</div>
          </div>
        </Card>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            <InsightsContextCard
              survey={survey}
              responseCount={filteredResponses.length}
              themeLabels={surveyThemeLabels}
              versionCounts={versionCounts}
              selectedThemeLabel={selectedThemeLabel}
              selectedVersion={selVersion}
              cityLabel={selectedCityLabel}
              planCount={relatedPlans.length}
            />
            <ActionPlansSummary
              plans={relatedPlans}
              subtitle="Leitura rapida das acoes ja conectadas a esta campanha, cidade e tema"
            />
          </div>

          <CrossFilterCard
            questions={questions}
            crossConditions={crossConditions}
            responsesCount={responses.length}
            filteredCount={filteredResponses.length}
            activeCount={activeCrossConditions.length}
            onAddCondition={addCrossCondition}
            onUpdateCondition={updateCrossCondition}
            onRemoveCondition={removeCrossCondition}
            onClearConditions={clearCrossConditions}
          />

          {missingMarketQuestion && (
            <Card>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Esta pesquisa tem respostas no recorte atual, mas não possui a pergunta base de provedor usada pelos blocos de mercado.
                As leituras por pergunta e o cruzamento continuam disponíveis; os cards de market share, vulnerabilidade, prioridades e IA só aparecem quando essa pergunta existe no questionário.
              </div>
            </Card>
          )}

          {hasMarketMetrics && <MarketOverviewSection market={market} />}

          <ThemeQuestionInsights
            survey={survey}
            responses={filteredResponses}
            themeId={selTheme}
            themeLabel={selectedThemeLabel}
          />

          {hasMarketMetrics && (
            <CompetitorVulnerabilitySection
              market={market}
              expandedProvider={expandedProvider}
              onToggleProvider={setExpandedProvider}
            />
          )}

          {hasMarketMetrics && <MarketPrioritiesCard market={market} />}

          {hasMarketMetrics && (
            <StrategicAiCard
              market={market}
              opData={opData}
              relatedPlans={relatedPlans}
              survey={survey}
              selectedThemeLabel={selectedThemeLabel}
              selectedVersion={selVersion}
              selectedMonth={selMonth}
              filteredCount={filteredResponses.length}
              totalCount={responses.length}
            />
          )}
        </>
      )}
    </div>
  );
}
