import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  Activity,
  BellRing,
  Expand,
  Minimize2,
  Radar,
  ShieldCheck,
  Target,
  Users,
} from 'lucide-react';
import { db } from '../../firebase';
import { Badge, Btn, Card, colors } from '../../components/ui';
import { styles as global } from '../../styles/globalStyles';
import LiveAuditModal from '../components/LiveAuditModal';
import LiveMonitorMap from '../components/LiveMonitorMap';
import LiveTvKpiSettingsModal from '../components/LiveTvKpiSettingsModal';
import LiveTvOverlay from '../components/LiveTvOverlay';
import {
  buildCityPulseRows,
  buildLeaderboardRows,
  buildLiveMonitorKpis,
  formatRelativeTime,
  isLiveSessionOnline,
  sortResponsesDesc,
} from '../lib/liveMonitor';
import { resolveInsightCity } from '../lib/insightsExecutive';
import {
  buildLiveTvKpis,
  buildLiveTvQuestionCatalog,
  normalizeLiveTvKpiKeys,
} from '../lib/liveTvKpis';

function matchesSessionResponse(session, response) {
  return (
    (session.researcherUid && response.researcherUid && session.researcherUid === response.researcherUid)
    || (session.interviewerId && response.entrevistadorId && session.interviewerId === response.entrevistadorId)
    || (session.researcherName && response.researcherName && session.researcherName === response.researcherName)
  );
}

function tryBrowserNotification(response) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
    return;
  }
  if (Notification.permission !== 'granted') return;

  const researcher = response.researcherName || 'Pesquisador';
  const city = response.cityName || response.city || response.cityId || 'Sem cidade';
  const survey = response.surveyTitle || 'Nova coleta';
  const notification = new Notification('Nova pesquisa coletada', {
    body: `${researcher} | ${city} | ${survey}`,
  });
  window.setTimeout(() => notification.close(), 6000);
}

function getSourceLabel(source) {
  const labels = {
    all: 'todas as origens',
    researcher_panel: 'painel do pesquisador',
    personal_link: 'link pessoal',
    public_link: 'link publico',
  };
  return labels[source] || 'origem nao informada';
}

function MetricTile({ icon: Icon, label, value, helper, tone }) {
  return (
    <div style={{ padding: '16px', borderRadius: '18px', background: 'rgba(15,23,42,0.72)', border: `1px solid ${tone}30`, boxShadow: `0 16px 32px ${tone}15` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8' }}>{label}</div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#f8fafc', lineHeight: 1.05, marginTop: '6px' }}>{value}</div>
        </div>
        <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: `${tone}22`, color: tone, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} />
        </div>
      </div>
      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>{helper}</div>
    </div>
  );
}

const TV_KPI_STORAGE_KEY = 'oquei_insights_live_tv_kpis';

export default function MonitorAoVivo({ userData }) {
  const [surveys, setSurveys] = useState([]);
  const [responses, setResponses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [interviewers, setInterviewers] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [activeOnly, setActiveOnly] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTvMode, setIsTvMode] = useState(false);
  const [tvConfigOpen, setTvConfigOpen] = useState(false);
  const [tvKpiKeys, setTvKpiKeys] = useState([]);

  const rootRef = useRef(null);
  const knownResponseIdsRef = useRef(new Set());
  const cityMap = useMemo(() => Object.fromEntries(cities.map((city) => [city.id, city])), [cities]);
  const cityNameMap = useMemo(() => Object.fromEntries(cities.map((city) => [city.name, city])), [cities]);

  useEffect(() => {
    const unsubSurveys = onSnapshot(collection(db, 'surveys'), (snapshot) => {
      setSurveys(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
    });

    const unsubResponses = onSnapshot(
      query(collection(db, 'survey_responses'), orderBy('timestamp', 'desc'), limit(250)),
      (snapshot) => {
        setResponses(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
        setLoading(false);
      },
      () => setLoading(false),
    );

    const unsubSessions = onSnapshot(
      query(collection(db, 'survey_live_sessions'), orderBy('lastSeenAt', 'desc'), limit(120)),
      (snapshot) => {
        setSessions(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
      },
    );

    const unsubInterviewers = onSnapshot(collection(db, 'survey_entrevistadores'), (snapshot) => {
      setInterviewers(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
    });

    const unsubCities = onSnapshot(collection(db, 'cities'), (snapshot) => {
      setCities(snapshot.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() })));
    });

    return () => {
      unsubSurveys();
      unsubResponses();
      unsubSessions();
      unsubInterviewers();
      unsubCities();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(TV_KPI_STORAGE_KEY) || '[]');
      if (Array.isArray(saved)) {
        setTvKpiKeys(saved.filter((item) => typeof item === 'string'));
      }
    } catch {
      window.localStorage.removeItem(TV_KPI_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      const fullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(fullscreen);
      if (!fullscreen) {
        setIsTvMode(false);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!responses.length) return;

    const currentIds = new Set(responses.map((response) => response.id));
    if (!knownResponseIdsRef.current.size) {
      knownResponseIdsRef.current = currentIds;
      return;
    }

    const newResponses = responses.filter((response) => !knownResponseIdsRef.current.has(response.id)).slice(0, 6);
    if (!newResponses.length) {
      knownResponseIdsRef.current = currentIds;
      return;
    }

    const nextNotifications = newResponses.map((response) => ({
      id: response.id,
      title: response.surveyTitle || 'Nova coleta',
      subtitle: `${response.researcherName || 'Pesquisador'} | ${response.cityName || response.city || response.cityId || 'Sem cidade'}`,
      createdAt: Date.now(),
      response,
    }));

    setNotifications((current) => [...nextNotifications, ...current].slice(0, 10));
    newResponses.forEach((response) => {
      window.showToast?.(`Nova pesquisa coletada por ${response.researcherName || 'pesquisador'}.`, 'success');
      tryBrowserNotification(response);
    });
    knownResponseIdsRef.current = currentIds;
  }, [responses]);

  const surveyOptions = useMemo(() => (
    surveys
      .filter((survey) => survey.status === 'active' || survey.status === 'finished')
      .sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'pt-BR'))
  ), [surveys]);

  const cityOptions = useMemo(() => {
    const map = new Map();
    [...responses, ...sessions].forEach((item) => {
      const city = resolveInsightCity(item, cityMap, cityNameMap);
      if (city.label && city.label !== 'Sem cidade') map.set(city.label, city.label);
    });
    return [...map.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [cityMap, cityNameMap, responses, sessions]);

  const filteredResponses = useMemo(() => (
    sortResponsesDesc(responses).filter((response) => {
      if (selectedSurvey !== 'all' && response.surveyId !== selectedSurvey) return false;
      if (selectedSource !== 'all' && response.collectionSource !== selectedSource) return false;
      if (selectedCity !== 'all') {
        const city = resolveInsightCity(response, cityMap, cityNameMap);
        if (city.label !== selectedCity) return false;
      }
      return true;
    })
  ), [cityMap, cityNameMap, responses, selectedCity, selectedSource, selectedSurvey]);

  const filteredSessions = useMemo(() => (
    sessions.filter((session) => {
      if (selectedSurvey !== 'all' && session.surveyId !== selectedSurvey) return false;
      if (selectedSource !== 'all' && session.collectionSource !== selectedSource) return false;
      if (selectedCity !== 'all') {
        const city = resolveInsightCity(session, cityMap, cityNameMap);
        if (city.label !== selectedCity) return false;
      }
      if (activeOnly && !isLiveSessionOnline(session)) return false;
      return true;
    })
  ), [activeOnly, cityMap, cityNameMap, selectedCity, selectedSource, selectedSurvey, sessions]);

  const kpis = useMemo(() => buildLiveMonitorKpis({ sessions: filteredSessions, responses: filteredResponses }), [filteredResponses, filteredSessions]);
  const leaderboard = useMemo(() => buildLeaderboardRows({
    sessions: filteredSessions,
    responses: filteredResponses,
    interviewers,
    cityMap,
    cityNameMap,
  }), [cityMap, cityNameMap, filteredResponses, filteredSessions, interviewers]);
  const cityPulse = useMemo(() => buildCityPulseRows(filteredResponses, cityMap, cityNameMap), [cityMap, cityNameMap, filteredResponses]);
  const pendingAudit = useMemo(
    () => filteredResponses.filter((response) => (response.auditStatus || 'pendente') === 'pendente').slice(0, 8),
    [filteredResponses],
  );
  const liveSessions = useMemo(() => filteredSessions.filter((session) => isLiveSessionOnline(session)).slice(0, 10), [filteredSessions]);
  const visibleResponseIds = useMemo(() => new Set(filteredResponses.map((response) => response.id)), [filteredResponses]);
  const visibleNotifications = useMemo(
    () => notifications.filter((item) => visibleResponseIds.has(item.id)),
    [notifications, visibleResponseIds],
  );
  const tvQuestionCatalog = useMemo(() => buildLiveTvQuestionCatalog({
    surveys,
    responses: filteredResponses,
    selectedSurveyId: selectedSurvey,
  }), [filteredResponses, selectedSurvey, surveys]);
  const tvQuestionKpis = useMemo(() => buildLiveTvKpis({
    responses: filteredResponses,
    catalog: tvQuestionCatalog,
    selectedKeys: tvKpiKeys,
  }), [filteredResponses, tvKpiKeys, tvQuestionCatalog]);
  const selectedSurveyLabel = useMemo(() => {
    if (selectedSurvey === 'all') return 'todas as campanhas';
    return surveys.find((survey) => survey.id === selectedSurvey)?.title || 'campanha selecionada';
  }, [selectedSurvey, surveys]);
  const selectedCityLabel = selectedCity === 'all' ? 'todas as cidades' : selectedCity;
  const selectedSourceLabel = getSourceLabel(selectedSource);

  useEffect(() => {
    const normalized = normalizeLiveTvKpiKeys({
      selectedKeys: tvKpiKeys,
      catalog: tvQuestionCatalog,
      maxItems: 4,
    });
    const sameKeys = normalized.length === tvKpiKeys.length && normalized.every((item, index) => item === tvKpiKeys[index]);
    if (!sameKeys) {
      setTvKpiKeys(normalized);
      return;
    }

    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(TV_KPI_STORAGE_KEY, JSON.stringify(normalized));
    } catch {}
  }, [tvKpiKeys, tvQuestionCatalog]);

  const enterTvMode = async () => {
    setIsTvMode(true);
    if (!rootRef.current) return;
    if (document.fullscreenElement) return;
    try {
      await rootRef.current.requestFullscreen();
    } catch {
      window.showToast?.('Modo TV ativado sem tela cheia automatica.', 'info');
    }
  };

  const exitTvMode = async () => {
    setIsTvMode(false);
    setTvConfigOpen(false);
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {}
    }
  };

  const openFromSession = (session) => {
    const linkedResponse = filteredResponses.find((response) => matchesSessionResponse(session, response));
    if (linkedResponse) {
      setSelectedResponse(linkedResponse);
      return;
    }
    window.showToast?.(`Sessao de ${session.researcherName || 'pesquisador'} sem coleta finalizada ainda.`, 'info');
  };

  const mapContent = (
    <div style={{
      position: 'relative',
      isolation: 'isolate',
      overflow: 'hidden',
      borderRadius: '26px',
      background: '#020617',
      boxShadow: isTvMode ? '0 28px 70px rgba(2,6,23,0.38)' : undefined,
    }}>
      <LiveMonitorMap
        sessions={filteredSessions}
        responses={filteredResponses}
        onSelectSession={openFromSession}
        onSelectResponse={setSelectedResponse}
        showHud={!isTvMode}
        height={isTvMode ? 'calc(100vh - 24px)' : isFullscreen ? '78vh' : '70vh'}
      />
      {isTvMode && (
        <LiveTvOverlay
          overview={{
            selectedSurveyLabel,
            selectedCityLabel,
            selectedSourceLabel,
            activeOnly,
            onlineSessions: kpis.onlineSessions,
            recentResponses: kpis.recentResponses,
            pendingAuditCount: pendingAudit.length,
          }}
          notifications={visibleNotifications}
          pendingAudit={pendingAudit}
          questionKpis={tvQuestionKpis}
          onOpenAudit={setSelectedResponse}
          onOpenConfig={() => setTvConfigOpen(true)}
          onExitTvMode={exitTvMode}
        />
      )}
    </div>
  );

  return (
    <div ref={rootRef} style={{
      ...global.container,
      gap: isTvMode ? '12px' : '18px',
      minHeight: isFullscreen || isTvMode ? '100vh' : undefined,
      background: isTvMode
        ? 'radial-gradient(circle at top right, rgba(56,189,248,0.22), transparent 34%), radial-gradient(circle at left, rgba(124,58,237,0.22), transparent 30%), #020617'
        : 'radial-gradient(circle at top right, rgba(56,189,248,0.18), transparent 34%), radial-gradient(circle at left, rgba(124,58,237,0.16), transparent 28%)',
    }}>
      {isTvMode ? (
        mapContent
      ) : (
        <>
      <div style={{ padding: '24px 28px', borderRadius: '26px', background: 'linear-gradient(135deg, rgba(15,23,42,0.96), rgba(30,41,59,0.88))', border: '1px solid rgba(56,189,248,0.18)', boxShadow: '0 24px 48px rgba(2,6,23,0.32)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ maxWidth: '780px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '7px 12px', borderRadius: '999px', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.24)', color: '#67e8f9', fontSize: '11px', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              <Radar size={14} /> Oquei Pesquisas | monitoramento em tempo real
            </div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#f8fafc', marginTop: '14px', letterSpacing: '-0.03em' }}>Central Ao Vivo de Campo</div>
            <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '8px', lineHeight: 1.6 }}>
              Acompanhe pesquisadores ativos, novas coletas, fila de auditoria e cota por entrevistador em uma visao operacional unica para coordenacao e diretoria.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Btn variant="secondary" onClick={() => setActiveOnly((current) => !current)}>
              {activeOnly ? 'Ver todos' : 'So ativos'}
            </Btn>
            <Btn variant="secondary" onClick={isTvMode ? exitTvMode : enterTvMode} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isTvMode ? <><Minimize2 size={14} /> Sair do Modo TV</> : <><Expand size={14} /> Modo TV</>}
            </Btn>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '18px' }}>
          <MetricTile icon={Users} label="Pesquisadores ao vivo" value={loading ? '...' : kpis.onlineSessions} helper={`${kpis.totalSessions} sessao(oes) no recorte`} tone={colors.success} />
          <MetricTile icon={BellRing} label="Coletas recentes" value={loading ? '...' : kpis.recentResponses} helper="ultimos 15 minutos" tone={colors.info} />
          <MetricTile icon={ShieldCheck} label="Auditorias pendentes" value={loading ? '...' : kpis.pendingAudit} helper="fila pronta para acao" tone={colors.warning} />
          <MetricTile icon={Activity} label="Cobertura GPS" value={loading ? '...' : `${kpis.gpsCoverage}%`} helper={`${kpis.totalResponses} coleta(s) no recorte`} tone={colors.purple} />
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '18px' }}>
          <select value={selectedSurvey} onChange={(event) => setSelectedSurvey(event.target.value)} style={{ minWidth: '220px', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.66)', color: '#f8fafc', fontFamily: 'inherit' }}>
            <option value="all">Todas as campanhas</option>
            {surveyOptions.map((survey) => <option key={survey.id} value={survey.id}>{survey.title}</option>)}
          </select>
          <select value={selectedCity} onChange={(event) => setSelectedCity(event.target.value)} style={{ minWidth: '180px', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.66)', color: '#f8fafc', fontFamily: 'inherit' }}>
            <option value="all">Todas as cidades</option>
            {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
          <select value={selectedSource} onChange={(event) => setSelectedSource(event.target.value)} style={{ minWidth: '200px', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15,23,42,0.66)', color: '#f8fafc', fontFamily: 'inherit' }}>
            <option value="all">Todas as origens</option>
            <option value="researcher_panel">Painel do pesquisador</option>
            <option value="personal_link">Link pessoal</option>
            <option value="public_link">Link publico</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(340px, 0.95fr)', gap: '18px', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {mapContent}

          <Card accent={colors.warning} title="Fila de Auditoria no Campo" subtitle="Entrevistas mais recentes aguardando validacao">
            {!pendingAudit.length ? (
              <div style={{ padding: '26px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma coleta pendente no recorte atual.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pendingAudit.map((response) => (
                  <div key={response.id} style={{ padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-app)', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '900', color: 'var(--text-main)' }}>{response.researcherName || 'Pesquisador'} | {response.surveyTitle || 'Pesquisa'}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        <span>{response.cityName || response.city || response.cityId || 'Sem cidade'}</span>
                        <span>{response.collectionSource || 'origem nao informada'}</span>
                        {response.numero && <span>#{response.numero}</span>}
                        <span>{formatRelativeTime(response)}</span>
                      </div>
                    </div>
                    <Btn size="sm" onClick={() => setSelectedResponse(response)}>Auditar agora</Btn>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <Card accent={colors.info} title="Alertas em tempo real" subtitle="Notificacoes das ultimas coletas recebidas">
            {!visibleNotifications.length ? (
              <div style={{ padding: '22px', textAlign: 'center', color: 'var(--text-muted)' }}>As novas coletas vao aparecer aqui automaticamente.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {visibleNotifications.map((item) => (
                  <button key={item.id} onClick={() => setSelectedResponse(item.response)} style={{ width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(56,189,248,0.18)', background: 'linear-gradient(135deg, rgba(56,189,248,0.10), rgba(15,23,42,0.35))', color: 'var(--text-main)', cursor: 'pointer' }}>
                    <div style={{ fontSize: '13px', fontWeight: '900' }}>{item.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{item.subtitle}</div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card accent={colors.success} title="Leaderboard de Campo" subtitle="Quem esta mais ativo e como a cota esta evoluindo">
            {!leaderboard.length ? (
              <div style={{ padding: '22px', textAlign: 'center', color: 'var(--text-muted)' }}>Sem movimentacao suficiente para ranking.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {leaderboard.slice(0, 8).map((row, index) => (
                  <div key={row.key} style={{ padding: '14px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-app)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', fontWeight: '900', color: colors.primary }}>#{index + 1}</span>
                          <span style={{ fontSize: '13px', fontWeight: '900', color: 'var(--text-main)' }}>{row.label}</span>
                          <Badge cor={row.online ? 'success' : 'neutral'}>{row.online ? 'ao vivo' : 'stand-by'}</Badge>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {row.cityLabel && <span>{row.cityLabel}</span>}
                          {row.surveyTitle && <span>{row.surveyTitle}</span>}
                          {row.source && <span>{row.source}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '22px', fontWeight: '900', color: colors.success }}>{row.collected}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{row.meta ? `${row.meta} de meta` : 'sem meta'}</div>
                      </div>
                    </div>
                    {row.meta > 0 && (
                      <div style={{ marginTop: '10px', height: '8px', borderRadius: '999px', background: 'rgba(148,163,184,0.16)', overflow: 'hidden' }}>
                        <div style={{ width: `${row.quotaPct}%`, height: '100%', borderRadius: '999px', background: row.quotaPct >= 100 ? colors.success : row.quotaPct >= 70 ? colors.warning : colors.primary }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card accent={colors.purple} title="Pulso por Cidade" subtitle="Onde a coleta esta mais viva neste momento">
            {!cityPulse.length ? (
              <div style={{ padding: '22px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma cidade com coletas no recorte.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {cityPulse.slice(0, 6).map((row) => (
                  <div key={row.key} style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-app)', display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '900', color: 'var(--text-main)' }}>{row.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{row.responses} coleta(s) | GPS {row.gpsCoverage}%</div>
                    </div>
                    <Target size={16} color={colors.purple} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card accent={colors.warning} title="Pesquisadores ativos" subtitle="Sessao viva, ultima pulsacao e cidade atual">
            {!liveSessions.length ? (
              <div style={{ padding: '22px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma sessao ativa no momento.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {liveSessions.map((session) => (
                  <button key={session.id} onClick={() => openFromSession(session)} style={{ width: '100%', textAlign: 'left', padding: '13px 14px', borderRadius: '14px', border: '1px solid rgba(16,185,129,0.18)', background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(15,23,42,0.2))', color: 'var(--text-main)', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '900' }}>{session.researcherName || 'Pesquisador'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {session.cityName || session.city || session.cityId || 'Sem cidade'} | {session.surveyTitle || 'Pesquisa'}
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: '800', color: colors.success }}>
                        {formatRelativeTime(session)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
        </>
      )}

      <LiveAuditModal
        open={Boolean(selectedResponse)}
        response={selectedResponse}
        userData={userData}
        onClose={() => setSelectedResponse(null)}
        onAudited={() => setNotifications((current) => current.filter((item) => item.id !== selectedResponse?.id))}
      />
      <LiveTvKpiSettingsModal
        open={tvConfigOpen}
        onClose={() => setTvConfigOpen(false)}
        questionOptions={tvQuestionCatalog}
        selectedKeys={tvKpiKeys}
        onChange={setTvKpiKeys}
      />
    </div>
  );
}
