import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  LineChart as LineChartIcon,
  MessageSquare,
  Save,
  Sparkles,
  Target,
  UserRound,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Badge,
  Btn,
  Card,
  InfoBox,
  Input,
  Modal,
  ProgressBar,
  Select,
  StatRow,
  Tabs,
  Textarea,
  colors,
} from './ui';
import ScoreConfigEditor from './ScoreConfigEditor';
import {
  DEFAULT_ATTENDANT_SCORE_CONFIG,
  PERFORMANCE_COMPETENCIES,
  PERFORMANCE_PARTICIPATION_TYPES,
  PERFORMANCE_PLAN_HORIZONS,
  PERFORMANCE_PLAN_STATUSES,
  PERFORMANCE_PRIORITY_OPTIONS,
  PERFORMANCE_TABS,
} from '../lib/performanceConstants';
import {
  deleteParticipationEvent,
  reprocessPerformanceForEmployee,
  saveBehaviorReview,
  saveCommercialInput,
  saveDevelopmentPlan,
  saveFeedback,
  saveParticipationEvent,
  savePerformanceConfig,
  updateDevelopmentPlan,
  updatePerformanceEmployee,
} from '../services/performance';

const initialBehaviorState = () => ({
  reviewDate: new Date().toISOString().slice(0, 10),
  competencies: PERFORMANCE_COMPETENCIES.reduce((accumulator, competency) => {
    accumulator[competency.id] = { rating: 3, comment: '', evidence: '' };
    return accumulator;
  }, {}),
});

const createInitialCommercialForm = (manualInput = {}) => ({
  targetSales: manualInput.targetSales || '',
  prospectingCount: manualInput.prospectingCount || '',
  followUpCount: manualInput.followUpCount || '',
  reactivationCount: manualInput.reactivationCount || '',
  upgradesCount: manualInput.upgradesCount || '',
  retentionCount: manualInput.retentionCount || '',
  notes: manualInput.notes || '',
});

const createInitialProfileForm = (employee = {}) => ({
  employeeCode: employee.employeeCode || '',
  documentId: employee.documentId || '',
  jobTitle: employee.jobTitle || '',
  teamName: employee.teamName || '',
  supervisorUid: employee.supervisorUid || '',
  hireDate: employee.hireDate || '',
  employmentStatus: employee.employmentStatus || '',
  scheduleLabel: employee.scheduleLabel || '',
  notes: employee.notes || '',
});

function isCoordinatorRole(role) {
  return ['coordinator', 'coordenador', 'master', 'diretor'].includes(String(role || '').toLowerCase());
}

function formatDateLabel(value) {
  if (!value) return 'Nao informado';
  return new Date(value).toLocaleDateString('pt-BR');
}

function RefreshLabel() {
  return (
    <>
      <LineChartIcon size={16} />
      Reprocessar mes
    </>
  );
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
        <Icon size={14} />
        {label}
      </div>
      <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-main)', marginTop: '8px' }}>
        {value}
      </div>
      {typeof value === 'number' && label !== 'Pendencias' && <ProgressBar pct={Number(value)} showLabel={false} />}
    </div>
  );
}

function TimelineField({ label, value }) {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', padding: '12px' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</div>
      <div style={{ color: 'var(--text-main)', fontSize: '13px' }}>{value || 'Nao informado'}</div>
    </div>
  );
}

export default function PerformanceProfile({ data, userData, config, onBack, onRefresh, onConfigChange }) {
  const [activeTab, setActiveTab] = useState('Visao Geral');
  const [saving, setSaving] = useState(false);
  const [showBehaviorModal, setShowBehaviorModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showParticipationModal, setShowParticipationModal] = useState(false);
  const [behaviorForm, setBehaviorForm] = useState(initialBehaviorState);
  const [feedbackForm, setFeedbackForm] = useState({
    referenceWeek: '',
    resultValue: '',
    targetValue: '',
    positives: '',
    attentionPoints: '',
    observedBehaviors: '',
    guidance: '',
    agreements: '',
    nextReviewDate: '',
  });
  const [planForm, setPlanForm] = useState({
    horizon: 'curto',
    objective: '',
    actionDescription: '',
    priority: 'Media',
    deadline: '',
    ownerName: userData.name || '',
    expectedIndicator: '',
    status: 'Pendente',
    result: '',
    notes: '',
  });
  const [participationForm, setParticipationForm] = useState({
    type: 'Treinamento',
    title: '',
    eventDate: '',
    durationLabel: '',
    impact: 'Positivo',
    notes: '',
  });
  const [profileForm, setProfileForm] = useState(() => createInitialProfileForm(data.employee));
  const [commercialForm, setCommercialForm] = useState(() => createInitialCommercialForm(data.datasets.manualInput));
  const isCoordinator = isCoordinatorRole(userData.role);
  const currentConfig = config || data.config || DEFAULT_ATTENDANT_SCORE_CONFIG;
  const availableTabs = isCoordinator ? PERFORMANCE_TABS : PERFORMANCE_TABS.filter((tab) => tab !== 'Configuracoes');

  useEffect(() => {
    setProfileForm(createInitialProfileForm(data.employee));
    setActiveTab('Visao Geral');
  }, [data.employee]);

  useEffect(() => {
    setCommercialForm(createInitialCommercialForm(data.datasets.manualInput));
  }, [data.datasets.manualInput, data.period]);

  const chartData = useMemo(() => {
    const items = [...data.history.filter((item) => item.period !== data.snapshot.period), data.snapshot];
    return items
      .sort((left, right) => String(left.period).localeCompare(String(right.period)))
      .map((item) => ({
        period: item.period,
        score: item.scoreOverall,
        meta: item.metaPercent || item.commercial?.targetPercent || 0,
        conversion: item.commercial?.conversionRate || 0,
      }));
  }, [data.history, data.snapshot]);

  const handleAction = async (callback) => {
    setSaving(true);
    try {
      await callback();
      await onRefresh();
    } catch (error) {
      window.showToast?.(error.message || 'Erro ao salvar.', 'error');
    }
    setSaving(false);
  };

  const handleEmployeeSave = () => handleAction(async () => {
    await updatePerformanceEmployee(data.employee.id, profileForm, userData);
    window.showToast?.('Dados do colaborador atualizados.', 'success');
  });

  const handleReprocess = () => handleAction(async () => {
    await reprocessPerformanceForEmployee(data.employee.id, data.period, userData);
    window.showToast?.('Snapshot e alertas reprocessados.', 'success');
  });

  const handleBehaviorSave = () => handleAction(async () => {
    await saveBehaviorReview({
      employeeId: data.employee.id,
      period: data.period,
      payload: behaviorForm,
      userData,
    });
    setShowBehaviorModal(false);
    setBehaviorForm(initialBehaviorState());
    window.showToast?.('Avaliacao comportamental registrada.', 'success');
  });

  const handleFeedbackSave = () => handleAction(async () => {
    await saveFeedback({
      employeeId: data.employee.id,
      period: data.period,
      payload: feedbackForm,
      userData,
    });
    setShowFeedbackModal(false);
    setFeedbackForm({
      referenceWeek: '',
      resultValue: '',
      targetValue: '',
      positives: '',
      attentionPoints: '',
      observedBehaviors: '',
      guidance: '',
      agreements: '',
      nextReviewDate: '',
    });
    window.showToast?.('Feedback salvo.', 'success');
  });

  const handleCommercialSave = () => handleAction(async () => {
    await saveCommercialInput({
      employeeId: data.employee.id,
      period: data.period,
      payload: commercialForm,
      userData,
    });
    window.showToast?.('Indicadores comerciais salvos.', 'success');
  });

  const handlePlanSave = () => handleAction(async () => {
    await saveDevelopmentPlan({
      employeeId: data.employee.id,
      period: data.period,
      payload: planForm,
      userData,
    });
    setShowPlanModal(false);
    setPlanForm({
      horizon: 'curto',
      objective: '',
      actionDescription: '',
      priority: 'Media',
      deadline: '',
      ownerName: userData.name || '',
      expectedIndicator: '',
      status: 'Pendente',
      result: '',
      notes: '',
    });
    window.showToast?.('Plano de acao salvo.', 'success');
  });

  const handlePlanStatusChange = (planId, nextStatus) => handleAction(async () => {
    await updateDevelopmentPlan(planId, { status: nextStatus }, data.employee.id, data.period, userData);
    window.showToast?.('Status do plano atualizado.', 'success');
  });

  const handleParticipationSave = () => handleAction(async () => {
    await saveParticipationEvent({
      employeeId: data.employee.id,
      period: data.period,
      payload: participationForm,
      userData,
    });
    setShowParticipationModal(false);
    setParticipationForm({
      type: 'Treinamento',
      title: '',
      eventDate: '',
      durationLabel: '',
      impact: 'Positivo',
      notes: '',
    });
    window.showToast?.('Participacao registrada.', 'success');
  });

  const handleDeleteParticipation = (eventId) => handleAction(async () => {
    await deleteParticipationEvent(eventId, data.employee.id, data.period, userData);
    window.showToast?.('Participacao removida.', 'success');
  });

  const handleConfigSave = (nextConfig) => handleAction(async () => {
    const saved = await savePerformanceConfig('attendant', nextConfig, userData);
    onConfigChange?.(saved);
    window.showToast?.('Configuracao do score atualizada.', 'success');
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card
        accent={data.snapshot.status === 'green' ? colors.success : data.snapshot.status === 'yellow' ? colors.warning : colors.danger}
        title={data.employee.name || 'Colaborador'}
        subtitle={`${data.employee.jobTitle || 'Cargo nao informado'} | ${data.employee.teamName || 'Equipe nao informada'}`}
        actions={[
          <Btn key="back" variant="secondary" onClick={onBack}><ArrowLeft size={16} /> Voltar</Btn>,
          <Btn key="refresh" onClick={handleReprocess} loading={saving}><RefreshLabel /></Btn>,
        ]}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '16px' }}>
          <SummaryCard icon={Target} label="Score geral" value={data.snapshot.scoreOverall} />
          <SummaryCard icon={CheckCircle2} label="Meta do mes" value={`${data.snapshot.metaPercent.toFixed(1)}%`} />
          <SummaryCard icon={UserRound} label="Presenca" value={`${data.snapshot.presencePercent.toFixed(1)}%`} />
          <SummaryCard icon={CalendarClock} label="Delta 30d" value={data.snapshot.delta30} />
          <SummaryCard icon={Sparkles} label="Pendencias" value={data.snapshot.pendingActions} />
        </div>
      </Card>

      <Tabs tabs={availableTabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'Visao Geral' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
          <Card title="Evolucao consolidada">
            <div style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke={colors.primary} strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Dados do colaborador" actions={[<Btn key="save-profile" onClick={handleEmployeeSave} loading={saving}><Save size={16} /> Salvar</Btn>]}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
              <Input label="Matricula" value={profileForm.employeeCode} onChange={(event) => setProfileForm((current) => ({ ...current, employeeCode: event.target.value }))} />
              <Input label="Documento" value={profileForm.documentId} onChange={(event) => setProfileForm((current) => ({ ...current, documentId: event.target.value }))} />
              <Input label="Cargo" value={profileForm.jobTitle} onChange={(event) => setProfileForm((current) => ({ ...current, jobTitle: event.target.value }))} />
              <Input label="Equipe" value={profileForm.teamName} onChange={(event) => setProfileForm((current) => ({ ...current, teamName: event.target.value }))} />
              <Input label="Supervisor UID" value={profileForm.supervisorUid} onChange={(event) => setProfileForm((current) => ({ ...current, supervisorUid: event.target.value }))} />
              <Input label="Admissao" type="date" value={profileForm.hireDate} onChange={(event) => setProfileForm((current) => ({ ...current, hireDate: event.target.value }))} />
              <Input label="Status" value={profileForm.employmentStatus} onChange={(event) => setProfileForm((current) => ({ ...current, employmentStatus: event.target.value }))} />
              <Input label="Escala" value={profileForm.scheduleLabel} onChange={(event) => setProfileForm((current) => ({ ...current, scheduleLabel: event.target.value }))} />
              <div style={{ gridColumn: '1 / -1' }}>
                <Textarea label="Observacoes gerais" value={profileForm.notes} onChange={(event) => setProfileForm((current) => ({ ...current, notes: event.target.value }))} />
              </div>
            </div>
          </Card>

          <Card title="Dimensoes do score">
            <StatRow label="Comercial" value={data.snapshot.dimensionScores.commercial} accent={colors.primary} />
            <StatRow label="Comportamental" value={data.snapshot.dimensionScores.behavior} accent={colors.purple} />
            <StatRow label="Assiduidade" value={data.snapshot.dimensionScores.attendance} accent={colors.warning} />
            <StatRow label="Engajamento" value={data.snapshot.dimensionScores.engagement} accent={colors.success} />
          </Card>

          <Card title="Alertas ativos">
            {data.alerts.length === 0 ? (
              <InfoBox type="success">Nenhum alerta ativo para este colaborador no periodo.</InfoBox>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.alerts.map((alert) => (
                  <div key={alert.type} style={{ background: 'var(--bg-app)', borderRadius: '14px', border: '1px solid var(--border)', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '6px' }}>
                      <strong style={{ color: 'var(--text-main)' }}>{alert.title}</strong>
                      <Badge cor={alert.severity === 'success' ? 'success' : alert.severity === 'danger' ? 'danger' : 'warning'}>
                        {alert.severity}
                      </Badge>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{alert.description}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'Comercial' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
          <Card title="Evolucao comercial">
            <div style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="meta" fill={colors.primary} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="conversion" fill={colors.success} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Resumo comercial">
            <StatRow label="Vendas totais" value={data.snapshot.commercial.salesCount} />
            <StatRow label="Meta do periodo" value={data.snapshot.commercial.targetSales || 'Nao informada'} />
            <StatRow label="Conversao" value={`${data.snapshot.commercial.conversionRate}%`} />
            <StatRow label="Ticket medio" value={`R$ ${Number(data.snapshot.commercial.averageTicket || 0).toFixed(2)}`} />
            <StatRow label="Atendimentos" value={data.snapshot.commercial.leadCount} />
            <StatRow label="Migracoes" value={data.snapshot.commercial.migrationCount} />
          </Card>

          <Card
            title="Indicadores complementares"
            subtitle="Campos manuais para prospeccao, retornos, reativacoes e observacoes do mes."
            actions={[<Btn key="save-commercial" onClick={handleCommercialSave} loading={saving}><Save size={16} /> Salvar indicadores</Btn>]}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px' }}>
              <Input label="Meta individual" type="number" value={commercialForm.targetSales} onChange={(event) => setCommercialForm((current) => ({ ...current, targetSales: event.target.value }))} />
              <Input label="Prospeccoes" type="number" value={commercialForm.prospectingCount} onChange={(event) => setCommercialForm((current) => ({ ...current, prospectingCount: event.target.value }))} />
              <Input label="Retornos" type="number" value={commercialForm.followUpCount} onChange={(event) => setCommercialForm((current) => ({ ...current, followUpCount: event.target.value }))} />
              <Input label="Reativacoes" type="number" value={commercialForm.reactivationCount} onChange={(event) => setCommercialForm((current) => ({ ...current, reactivationCount: event.target.value }))} />
              <Input label="Upgrades" type="number" value={commercialForm.upgradesCount} onChange={(event) => setCommercialForm((current) => ({ ...current, upgradesCount: event.target.value }))} />
              <Input label="Retencao" type="number" value={commercialForm.retentionCount} onChange={(event) => setCommercialForm((current) => ({ ...current, retentionCount: event.target.value }))} />
              <div style={{ gridColumn: '1 / -1' }}>
                <Textarea label="Observacoes" value={commercialForm.notes} onChange={(event) => setCommercialForm((current) => ({ ...current, notes: event.target.value }))} />
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'Comportamental' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <Card title="Radar de competencias" actions={[<Btn key="new-review" onClick={() => setShowBehaviorModal(true)}><ClipboardList size={16} /> Nova avaliacao</Btn>]}>
            <div style={{ height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={data.snapshot.behavior.radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <Radar dataKey="rating" stroke={colors.purple} fill={colors.purple} fillOpacity={0.35} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Historico comportamental">
            {data.datasets.behaviorReviews.length === 0 ? (
              <InfoBox type="info">Ainda nao existe avaliacao comportamental registrada neste periodo.</InfoBox>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.datasets.behaviorReviews.map((review) => (
                  <div key={review.id} style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '14px', background: 'var(--bg-app)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong>{formatDateLabel(review.reviewDate)}</strong>
                      <Badge cor="purple">{review.reviewerName || 'Gestor'}</Badge>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px' }}>
                      {PERFORMANCE_COMPETENCIES.map((competency) => (
                        <div key={competency.id} style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '10px', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700' }}>{competency.label}</div>
                          <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', margin: '6px 0' }}>
                            {review.competencies?.[competency.id]?.rating || 0}/5
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {review.competencies?.[competency.id]?.comment || 'Sem comentario'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'Frequencia e Participacao' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <Card title="Resumo operacional">
            <StatRow label="Faltas" value={data.snapshot.attendance.absenceCount} accent={colors.danger} />
            <StatRow label="Atrasos" value={data.snapshot.attendance.lateCount} accent={colors.warning} />
            <StatRow label="Atestados" value={data.snapshot.attendance.medicalCount} accent={colors.warning} />
            <StatRow label="Advertencias" value={data.snapshot.attendance.warningCount} accent={colors.danger} />
            <StatRow label="Suspensoes" value={data.snapshot.attendance.suspensionCount} accent={colors.danger} />
            <StatRow label="Participacoes" value={data.snapshot.engagement.participationCount} accent={colors.success} />
          </Card>
          <Card title="Participacao e rotinas" actions={[<Btn key="new-participation" onClick={() => setShowParticipationModal(true)}><MessageSquare size={16} /> Nova participacao</Btn>]}>
            {data.datasets.participationEvents.length === 0 ? (
              <InfoBox type="info">Nenhuma participacao registrada neste periodo.</InfoBox>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.datasets.participationEvents.map((event) => (
                  <div key={event.id} style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '14px', background: 'var(--bg-app)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <strong>{event.title}</strong>
                      <Badge cor="success">{event.type}</Badge>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>
                      {formatDateLabel(event.eventDate)} | {event.durationLabel || 'Duracao nao informada'}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '10px' }}>
                      {event.notes || 'Sem observacoes'}
                    </div>
                    <Btn variant="danger" size="sm" onClick={() => handleDeleteParticipation(event.id)}>Remover</Btn>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'Feedbacks' && (
        <Card title="Timeline de feedbacks" actions={[<Btn key="new-feedback" onClick={() => setShowFeedbackModal(true)}><MessageSquare size={16} /> Novo feedback</Btn>]}>
          {data.datasets.feedbacks.length === 0 ? (
            <InfoBox type="info">Nenhum feedback registrado para este periodo.</InfoBox>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {data.datasets.feedbacks.map((feedback) => (
                <div key={feedback.id} style={{ borderLeft: `4px solid ${colors.primary}`, padding: '14px 16px', borderRadius: '0 14px 14px 0', background: 'var(--bg-app)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong>{feedback.referenceWeek || 'Semana sem referencia'}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{formatDateLabel(feedback.recordedAt)}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                    <TimelineField label="Pontos positivos" value={feedback.positives} />
                    <TimelineField label="Pontos de atencao" value={feedback.attentionPoints} />
                    <TimelineField label="Comportamentos observados" value={feedback.observedBehaviors} />
                    <TimelineField label="Orientacoes" value={feedback.guidance} />
                    <TimelineField label="Combinados" value={feedback.agreements} />
                    <TimelineField label="Proxima revisao" value={formatDateLabel(feedback.nextReviewDate)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'Plano de Acao' && (
        <Card title="PDI e plano de desenvolvimento" actions={[<Btn key="new-plan" onClick={() => setShowPlanModal(true)}><Target size={16} /> Nova acao</Btn>]}>
          {data.datasets.plans.length === 0 ? (
            <InfoBox type="info">Nenhum plano de desenvolvimento registrado.</InfoBox>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {data.datasets.plans.map((plan) => (
                <div key={plan.id} style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', background: 'var(--bg-app)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
                    <div>
                      <strong>{plan.objective}</strong>
                      <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>{plan.actionDescription}</div>
                    </div>
                    <Badge cor={plan.status === 'Concluida' ? 'success' : plan.status === 'Em andamento' ? 'primary' : plan.status === 'Cancelada' ? 'danger' : 'warning'}>
                      {plan.status}
                    </Badge>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px', marginBottom: '10px' }}>
                    <StatRow label="Horizonte" value={plan.horizon} />
                    <StatRow label="Prioridade" value={plan.priority} />
                    <StatRow label="Prazo" value={formatDateLabel(plan.deadline)} />
                    <StatRow label="Responsavel" value={plan.ownerName || 'Nao definido'} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{plan.expectedIndicator || 'Sem indicador esperado informado'}</div>
                    <Select
                      value={plan.status}
                      onChange={(event) => handlePlanStatusChange(plan.id, event.target.value)}
                      options={PERFORMANCE_PLAN_STATUSES.map((value) => ({ value, label: value }))}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'Evolucao' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <Card title="Score geral ao longo do tempo">
            <div style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke={colors.primary} strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Marcos da trajetoria">
            {data.timeline.length === 0 ? (
              <InfoBox type="info">A timeline ainda esta vazia para este colaborador.</InfoBox>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.timeline.map((event, index) => (
                  <div key={`${event.type}_${event.date || event.createdAt}_${index}`} style={{ borderLeft: `3px solid ${colors.primary}`, paddingLeft: '14px' }}>
                    <div style={{ color: 'var(--text-main)', fontWeight: '800' }}>{event.title}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>{formatDateLabel(event.date || event.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'Configuracoes' && isCoordinator && (
        <ScoreConfigEditor config={currentConfig} onSave={handleConfigSave} saving={saving} />
      )}

      <Modal
        open={showBehaviorModal}
        onClose={() => setShowBehaviorModal(false)}
        title="Nova avaliacao comportamental"
        size="lg"
        footer={[
          <Btn key="cancel-review" variant="secondary" onClick={() => setShowBehaviorModal(false)}>Cancelar</Btn>,
          <Btn key="save-review" onClick={handleBehaviorSave} loading={saving}>Salvar avaliacao</Btn>,
        ]}
      >
        <Input
          label="Data da avaliacao"
          type="date"
          value={behaviorForm.reviewDate}
          onChange={(event) => setBehaviorForm((current) => ({ ...current, reviewDate: event.target.value }))}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px', marginTop: '16px' }}>
          {PERFORMANCE_COMPETENCIES.map((competency) => (
            <div key={competency.id} style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px' }}>
              <Input label={competency.label} type="number" min="1" max="5" value={behaviorForm.competencies[competency.id].rating} onChange={(event) => setBehaviorForm((current) => ({ ...current, competencies: { ...current.competencies, [competency.id]: { ...current.competencies[competency.id], rating: event.target.value } } }))} />
              <Textarea label="Comentario" value={behaviorForm.competencies[competency.id].comment} onChange={(event) => setBehaviorForm((current) => ({ ...current, competencies: { ...current.competencies, [competency.id]: { ...current.competencies[competency.id], comment: event.target.value } } }))} />
              <Textarea label="Evidencia" value={behaviorForm.competencies[competency.id].evidence} onChange={(event) => setBehaviorForm((current) => ({ ...current, competencies: { ...current.competencies, [competency.id]: { ...current.competencies[competency.id], evidence: event.target.value } } }))} />
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        title="Novo feedback semanal"
        footer={[
          <Btn key="cancel-feedback" variant="secondary" onClick={() => setShowFeedbackModal(false)}>Cancelar</Btn>,
          <Btn key="save-feedback" onClick={handleFeedbackSave} loading={saving}>Salvar feedback</Btn>,
        ]}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
          <Input label="Semana de referencia" value={feedbackForm.referenceWeek} onChange={(event) => setFeedbackForm((current) => ({ ...current, referenceWeek: event.target.value }))} />
          <Input label="Data da proxima revisao" type="date" value={feedbackForm.nextReviewDate} onChange={(event) => setFeedbackForm((current) => ({ ...current, nextReviewDate: event.target.value }))} />
          <Input label="Resultado da semana" type="number" value={feedbackForm.resultValue} onChange={(event) => setFeedbackForm((current) => ({ ...current, resultValue: event.target.value }))} />
          <Input label="Meta da semana" type="number" value={feedbackForm.targetValue} onChange={(event) => setFeedbackForm((current) => ({ ...current, targetValue: event.target.value }))} />
          <Textarea label="Pontos positivos" value={feedbackForm.positives} onChange={(event) => setFeedbackForm((current) => ({ ...current, positives: event.target.value }))} />
          <Textarea label="Pontos de atencao" value={feedbackForm.attentionPoints} onChange={(event) => setFeedbackForm((current) => ({ ...current, attentionPoints: event.target.value }))} />
          <Textarea label="Comportamentos observados" value={feedbackForm.observedBehaviors} onChange={(event) => setFeedbackForm((current) => ({ ...current, observedBehaviors: event.target.value }))} />
          <Textarea label="Orientacoes" value={feedbackForm.guidance} onChange={(event) => setFeedbackForm((current) => ({ ...current, guidance: event.target.value }))} />
          <div style={{ gridColumn: '1 / -1' }}>
            <Textarea label="Combinados" value={feedbackForm.agreements} onChange={(event) => setFeedbackForm((current) => ({ ...current, agreements: event.target.value }))} />
          </div>
        </div>
      </Modal>

      <Modal
        open={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        title="Nova acao de desenvolvimento"
        footer={[
          <Btn key="cancel-plan" variant="secondary" onClick={() => setShowPlanModal(false)}>Cancelar</Btn>,
          <Btn key="save-plan" onClick={handlePlanSave} loading={saving}>Salvar plano</Btn>,
        ]}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
          <Select label="Horizonte" value={planForm.horizon} onChange={(event) => setPlanForm((current) => ({ ...current, horizon: event.target.value }))} options={PERFORMANCE_PLAN_HORIZONS} />
          <Select label="Prioridade" value={planForm.priority} onChange={(event) => setPlanForm((current) => ({ ...current, priority: event.target.value }))} options={PERFORMANCE_PRIORITY_OPTIONS.map((value) => ({ value, label: value }))} />
          <Input label="Objetivo" value={planForm.objective} onChange={(event) => setPlanForm((current) => ({ ...current, objective: event.target.value }))} />
          <Input label="Prazo" type="date" value={planForm.deadline} onChange={(event) => setPlanForm((current) => ({ ...current, deadline: event.target.value }))} />
          <Input label="Responsavel" value={planForm.ownerName} onChange={(event) => setPlanForm((current) => ({ ...current, ownerName: event.target.value }))} />
          <Select label="Status" value={planForm.status} onChange={(event) => setPlanForm((current) => ({ ...current, status: event.target.value }))} options={PERFORMANCE_PLAN_STATUSES.map((value) => ({ value, label: value }))} />
          <div style={{ gridColumn: '1 / -1' }}>
            <Textarea label="Descricao da acao" value={planForm.actionDescription} onChange={(event) => setPlanForm((current) => ({ ...current, actionDescription: event.target.value }))} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <Textarea label="Indicador esperado" value={planForm.expectedIndicator} onChange={(event) => setPlanForm((current) => ({ ...current, expectedIndicator: event.target.value }))} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <Textarea label="Observacoes" value={planForm.notes} onChange={(event) => setPlanForm((current) => ({ ...current, notes: event.target.value }))} />
          </div>
        </div>
      </Modal>

      <Modal
        open={showParticipationModal}
        onClose={() => setShowParticipationModal(false)}
        title="Nova participacao ou ocorrencia"
        footer={[
          <Btn key="cancel-participation" variant="secondary" onClick={() => setShowParticipationModal(false)}>Cancelar</Btn>,
          <Btn key="save-participation" onClick={handleParticipationSave} loading={saving}>Salvar registro</Btn>,
        ]}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
          <Select label="Tipo" value={participationForm.type} onChange={(event) => setParticipationForm((current) => ({ ...current, type: event.target.value }))} options={PERFORMANCE_PARTICIPATION_TYPES.map((value) => ({ value, label: value }))} />
          <Input label="Data" type="date" value={participationForm.eventDate} onChange={(event) => setParticipationForm((current) => ({ ...current, eventDate: event.target.value }))} />
          <Input label="Titulo" value={participationForm.title} onChange={(event) => setParticipationForm((current) => ({ ...current, title: event.target.value }))} />
          <Input label="Duracao" value={participationForm.durationLabel} onChange={(event) => setParticipationForm((current) => ({ ...current, durationLabel: event.target.value }))} />
          <Input label="Impacto" value={participationForm.impact} onChange={(event) => setParticipationForm((current) => ({ ...current, impact: event.target.value }))} />
          <div style={{ gridColumn: '1 / -1' }}>
            <Textarea label="Observacoes" value={participationForm.notes} onChange={(event) => setParticipationForm((current) => ({ ...current, notes: event.target.value }))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
