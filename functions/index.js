const admin = require('firebase-admin');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');

admin.initializeApp();

const db = admin.firestore();

const SALE_STATUSES = new Set(['Contratado', 'Instalado', 'Vendido']);
const DISCARD_STATUSES = new Set(['Descartado', 'Cancelado']);
const MIGRATION_PATTERN = /migra/i;
const PERFORMANCE_ROLE_KEYS = ['attendant', 'atendente'];
const PERFORMANCE_COMPETENCIES = [
  { id: 'communication', label: 'Comunicacao' },
  { id: 'professional_posture', label: 'Postura profissional' },
  { id: 'organization', label: 'Organizacao' },
  { id: 'discipline', label: 'Disciplina' },
  { id: 'proactivity', label: 'Proatividade' },
  { id: 'empathy', label: 'Empatia no atendimento' },
  { id: 'teamwork', label: 'Trabalho em equipe' },
  { id: 'result_focus', label: 'Foco em resultado' },
  { id: 'adaptability', label: 'Aprendizado e adaptabilidade' },
  { id: 'process_compliance', label: 'Cumprimento de processos' },
];
const DEFAULT_ATTENDANT_SCORE_CONFIG = {
  role: 'attendant',
  weights: {
    commercial: 50,
    behavior: 20,
    attendance: 15,
    engagement: 15,
  },
  thresholds: {
    green: 75,
    yellow: 55,
  },
  feedbackWindowDays: 10,
  alertThresholds: {
    conversionDrop: 10,
    attendanceRise: 2,
    stalledScoreDelta: 3,
    improvementStreakCount: 4,
  },
};
const NOMINATIM_BASE_URL = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org';
const CITY_CACHE = new Map();
const CLUSTER_CACHE = new Map();

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function average(values = []) {
  const safe = values.filter((value) => Number.isFinite(Number(value))).map(Number);
  if (!safe.length) return 0;
  return safe.reduce((sum, value) => sum + value, 0) / safe.length;
}

function normalizeTimestamp(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizePeriod(period = '') {
  if (/^\d{4}-\d{2}$/.test(period)) return period;
  return new Date().toISOString().slice(0, 7);
}

function normalizeDateKey(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = normalizeTimestamp(value);
  if (!date) return '';
  return date.toISOString().slice(0, 10);
}

function deriveMonthKey(value) {
  const dateKey = normalizeDateKey(value);
  if (dateKey) return dateKey.slice(0, 7);
  return normalizePeriod(value);
}

function normalizeLeadTypeValue(value = '') {
  const normalized = String(value || '').trim();
  return normalized || 'Lead';
}

function getPeriodBounds(period) {
  const normalized = normalizePeriod(period);
  const start = new Date(`${normalized}-01T00:00:00`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}

function dateFallsInPeriod(value, period) {
  const date = normalizeTimestamp(value);
  if (!date) return false;
  const { start, end } = getPeriodBounds(period);
  return date >= start && date < end;
}

function normalizeScoreConfig(config = {}) {
  return {
    ...DEFAULT_ATTENDANT_SCORE_CONFIG,
    ...config,
    weights: {
      ...DEFAULT_ATTENDANT_SCORE_CONFIG.weights,
      ...(config.weights || {}),
    },
    thresholds: {
      ...DEFAULT_ATTENDANT_SCORE_CONFIG.thresholds,
      ...(config.thresholds || {}),
    },
    alertThresholds: {
      ...DEFAULT_ATTENDANT_SCORE_CONFIG.alertThresholds,
      ...(config.alertThresholds || {}),
    },
  };
}

function getTargetSales(employee = {}, commercialInput = {}) {
  return toNumber(
    commercialInput.targetSales
    ?? employee.salesTarget
    ?? employee.performanceTargetSales
    ?? employee.targetSales
    ?? 0,
  );
}

function computeCommercialMetrics({ employee = {}, leads = [], commercialInput = {} }) {
  const sales = leads.filter((lead) => SALE_STATUSES.has(lead.status));
  const installed = leads.filter((lead) => lead.status === 'Instalado');
  const discards = leads.filter((lead) => DISCARD_STATUSES.has(lead.status));
  const migrations = leads.filter((lead) => MIGRATION_PATTERN.test(String(lead.leadType || lead.categoryName || '')));
  const prices = sales.map((lead) => toNumber(lead.productPrice)).filter(Boolean);
  const targetSales = getTargetSales(employee, commercialInput);
  const targetPercent = targetSales > 0 ? (sales.length / targetSales) * 100 : 0;
  const closedDeals = sales.length + discards.length;
  const conversionRate = closedDeals > 0 ? (sales.length / closedDeals) * 100 : 0;
  const prospectingCount = toNumber(commercialInput.prospectingCount);
  const followUpCount = toNumber(commercialInput.followUpCount);
  const reactivationCount = toNumber(commercialInput.reactivationCount);
  const upgradesCount = toNumber(commercialInput.upgradesCount);
  const retentionCount = toNumber(commercialInput.retentionCount);
  const totalActivity = prospectingCount + followUpCount + reactivationCount + upgradesCount + retentionCount;
  const normalizedTarget = targetSales > 0
    ? clamp((Math.min(targetPercent, 120) / 120) * 100)
    : sales.length > 0
      ? 70
      : 0;
  const normalizedActivity = totalActivity > 0 ? clamp((Math.min(totalActivity, 40) / 40) * 100) : 0;
  const score = Math.round((normalizedTarget * 0.55) + (conversionRate * 0.3) + (normalizedActivity * 0.15));

  return {
    leadCount: leads.length,
    salesCount: sales.length,
    installedCount: installed.length,
    discardCount: discards.length,
    migrationCount: migrations.length,
    averageTicket: Number(average(prices).toFixed(2)),
    targetSales,
    targetPercent: Number(targetPercent.toFixed(1)),
    conversionRate: Number(conversionRate.toFixed(1)),
    prospectingCount,
    followUpCount,
    reactivationCount,
    upgradesCount,
    retentionCount,
    notes: commercialInput.notes || '',
    score: clamp(score),
  };
}

function normalizeCompetencyMap(review = {}) {
  const input = review.competencies || {};
  return PERFORMANCE_COMPETENCIES.reduce((accumulator, competency) => {
    const source = input[competency.id] || {};
    accumulator[competency.id] = {
      rating: clamp(source.rating || source.note || 0, 0, 5),
      comment: source.comment || '',
      evidence: source.evidence || '',
      label: competency.label,
    };
    return accumulator;
  }, {});
}

function computeBehaviorMetrics(reviews = []) {
  if (!reviews.length) {
    return {
      score: 0,
      reviewCount: 0,
      averageRating: 0,
      radarData: PERFORMANCE_COMPETENCIES.map((competency) => ({ subject: competency.label, rating: 0 })),
    };
  }

  const normalizedReviews = reviews.map((review) => ({
    ...review,
    competencies: normalizeCompetencyMap(review),
    reviewDate: normalizeTimestamp(review.reviewDate || review.createdAt || review.date),
  }));

  const radarData = PERFORMANCE_COMPETENCIES.map((competency) => {
    const ratings = normalizedReviews.map((review) => review.competencies[competency.id]?.rating || 0);
    return {
      subject: competency.label,
      rating: Number(average(ratings).toFixed(2)),
    };
  });

  return {
    score: clamp((average(radarData.map((item) => item.rating)) / 5) * 100),
    reviewCount: reviews.length,
    averageRating: Number(average(radarData.map((item) => item.rating)).toFixed(2)),
    radarData,
  };
}

function classifyAbsence(absence = {}) {
  const type = String(absence.type || absence.typeOccurrence || absence.reason || '').toLowerCase();
  if (type.includes('atras')) return 'late';
  if (type.includes('atest')) return 'medical';
  if (type.includes('ferias')) return 'vacation';
  return 'absence';
}

function classifyRhOccurrence(request = {}) {
  const type = String(request.type || request.tipo || '').toLowerCase();
  if (type.includes('susp')) return 'suspension';
  if (type.includes('advert')) return 'warning';
  if (type.includes('atest')) return 'medical';
  return 'other';
}

function computeAttendanceMetrics(absences = [], rhRequests = []) {
  const counters = {
    absenceCount: 0,
    lateCount: 0,
    medicalCount: 0,
    vacationCount: 0,
    warningCount: 0,
    suspensionCount: 0,
  };

  absences.forEach((absence) => {
    const kind = classifyAbsence(absence);
    if (kind === 'late') counters.lateCount += 1;
    if (kind === 'medical') counters.medicalCount += 1;
    if (kind === 'vacation') counters.vacationCount += 1;
    if (kind === 'absence') counters.absenceCount += 1;
  });

  rhRequests.forEach((request) => {
    const kind = classifyRhOccurrence(request);
    if (kind === 'medical') counters.medicalCount += 1;
    if (kind === 'warning') counters.warningCount += 1;
    if (kind === 'suspension') counters.suspensionCount += 1;
  });

  const presencePercent = clamp(100 - (counters.absenceCount * 12) - (counters.lateCount * 4) - (counters.medicalCount * 4));
  const score = clamp(
    100
    - (counters.absenceCount * 18)
    - (counters.lateCount * 6)
    - (counters.medicalCount * 7)
    - (counters.warningCount * 10)
    - (counters.suspensionCount * 20),
  );

  return {
    ...counters,
    presencePercent: Number(presencePercent.toFixed(1)),
    score: Number(score.toFixed(1)),
  };
}

function computeFeedbackMetrics(feedbacks = [], config = normalizeScoreConfig()) {
  const sorted = [...feedbacks].sort((left, right) => {
    const leftTime = normalizeTimestamp(left.recordedAt || left.createdAt || left.feedbackDate)?.getTime() || 0;
    const rightTime = normalizeTimestamp(right.recordedAt || right.createdAt || right.feedbackDate)?.getTime() || 0;
    return rightTime - leftTime;
  });
  const latestFeedback = sorted[0] || null;
  const latestDate = normalizeTimestamp(latestFeedback?.recordedAt || latestFeedback?.createdAt || latestFeedback?.feedbackDate);
  const overdueDays = latestDate
    ? Math.floor((Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  return {
    latestFeedback,
    latestDate,
    overdueDays,
    isRecent: overdueDays !== null && overdueDays <= config.feedbackWindowDays,
    count: feedbacks.length,
  };
}

function computePlanMetrics(plans = []) {
  const now = new Date();
  const openPlans = plans.filter((plan) => !['Concluida', 'Cancelada'].includes(plan.status));
  const completedPlans = plans.filter((plan) => plan.status === 'Concluida');
  const overduePlans = openPlans.filter((plan) => {
    const due = normalizeTimestamp(plan.deadline || plan.dueDate || plan.targetDate);
    return due ? due < now : false;
  });
  const completionRate = plans.length ? (completedPlans.length / plans.length) * 100 : 0;
  return {
    totalPlans: plans.length,
    openPlans: openPlans.length,
    completedPlans: completedPlans.length,
    overduePlans: overduePlans.length,
    completionRate: Number(completionRate.toFixed(1)),
  };
}

function computeEngagementMetrics({ feedbacks = [], plans = [], participationEvents = [], config = normalizeScoreConfig() }) {
  const feedback = computeFeedbackMetrics(feedbacks, config);
  const planMetrics = computePlanMetrics(plans);
  const trainingCount = participationEvents.length;
  const feedbackComponent = feedback.isRecent ? 35 : feedback.count > 0 ? 18 : 0;
  const planComponent = clamp(planMetrics.completionRate * 0.4, 0, 40);
  const participationComponent = clamp(trainingCount * 8, 0, 25);
  const score = clamp(feedbackComponent + planComponent + participationComponent);
  return {
    score: Number(score.toFixed(1)),
    feedback,
    ...planMetrics,
    participationCount: trainingCount,
    pendingActions: planMetrics.openPlans + (feedback.isRecent ? 0 : 1),
  };
}

function computeOverallScore({ commercialScore = 0, behaviorScore = 0, attendanceScore = 0, engagementScore = 0, config = normalizeScoreConfig() }) {
  const normalizedConfig = normalizeScoreConfig(config);
  const total = (
    (commercialScore * normalizedConfig.weights.commercial)
    + (behaviorScore * normalizedConfig.weights.behavior)
    + (attendanceScore * normalizedConfig.weights.attendance)
    + (engagementScore * normalizedConfig.weights.engagement)
  ) / 100;
  return Number(clamp(total).toFixed(1));
}

function deriveStatus(score, config = normalizeScoreConfig()) {
  if (score >= config.thresholds.green) return 'green';
  if (score >= config.thresholds.yellow) return 'yellow';
  return 'red';
}

function findHistoricalScore(history = [], period, offset = 1) {
  const current = normalizePeriod(period);
  const sorted = [...history]
    .filter((item) => item.period)
    .sort((left, right) => String(left.period).localeCompare(String(right.period)));
  const index = sorted.findIndex((item) => item.period === current);
  if (index <= 0) return null;
  return sorted[Math.max(0, index - offset)] || null;
}

function buildPerformanceSnapshot({
  employee = {},
  period,
  leads = [],
  commercialInput = {},
  behaviorReviews = [],
  absences = [],
  rhRequests = [],
  feedbacks = [],
  plans = [],
  participationEvents = [],
  history = [],
  config = normalizeScoreConfig(),
}) {
  const commercial = computeCommercialMetrics({ employee, leads, commercialInput });
  const behavior = computeBehaviorMetrics(behaviorReviews);
  const attendance = computeAttendanceMetrics(absences, rhRequests);
  const engagement = computeEngagementMetrics({ feedbacks, plans, participationEvents, config });
  const scoreOverall = computeOverallScore({
    commercialScore: commercial.score,
    behaviorScore: behavior.score,
    attendanceScore: attendance.score,
    engagementScore: engagement.score,
    config,
  });
  const previous30 = findHistoricalScore(history, period, 1);
  const previous90 = findHistoricalScore(history, period, 3);
  const feedbackMetrics = computeFeedbackMetrics(feedbacks, config);

  return {
    employeeId: employee.id || employee.uid || null,
    employeeName: employee.name || employee.nome || 'Colaborador',
    teamName: employee.teamName || '',
    clusterId: employee.clusterId || '',
    period: normalizePeriod(period),
    role: employee.role || 'attendant',
    generatedAt: new Date().toISOString(),
    scoreOverall,
    status: deriveStatus(scoreOverall, config),
    dimensionScores: {
      commercial: commercial.score,
      behavior: behavior.score,
      attendance: attendance.score,
      engagement: engagement.score,
    },
    commercial,
    behavior,
    attendance,
    engagement,
    metaPercent: commercial.targetPercent,
    presencePercent: attendance.presencePercent,
    pendingActions: engagement.pendingActions,
    lastFeedbackDate: feedbackMetrics.latestDate ? feedbackMetrics.latestDate.toISOString() : null,
    delta30: previous30 ? Number((scoreOverall - toNumber(previous30.scoreOverall)).toFixed(1)) : 0,
    delta90: previous90 ? Number((scoreOverall - toNumber(previous90.scoreOverall)).toFixed(1)) : 0,
  };
}

function calculateRecentFeedbackPercents(feedbacks = []) {
  return [...feedbacks]
    .sort((left, right) => {
      const leftTime = normalizeTimestamp(left.recordedAt || left.feedbackDate || left.createdAt)?.getTime() || 0;
      const rightTime = normalizeTimestamp(right.recordedAt || right.feedbackDate || right.createdAt)?.getTime() || 0;
      return rightTime - leftTime;
    })
    .slice(0, 3)
    .map((feedback) => {
      const resultValue = toNumber(feedback.resultValue);
      const targetValue = toNumber(feedback.targetValue);
      if (targetValue <= 0) return null;
      return (resultValue / targetValue) * 100;
    })
    .filter((value) => value !== null);
}

function buildAlertRecords({ employee = {}, period, snapshot, history = [], feedbacks = [], plans = [], config = normalizeScoreConfig() }) {
  const currentSnapshot = snapshot || buildPerformanceSnapshot({ employee, period, config });
  const normalizedConfig = normalizeScoreConfig(config);
  const previousSnapshot = findHistoricalScore(history, period, 1);
  const feedbackMetrics = computeFeedbackMetrics(feedbacks, normalizedConfig);
  const planMetrics = computePlanMetrics(plans);
  const recentFeedbackPercents = calculateRecentFeedbackPercents(feedbacks);
  const recentHistory = [...history, currentSnapshot]
    .filter((item) => item?.period)
    .sort((left, right) => String(left.period).localeCompare(String(right.period)));
  const alerts = [];

  if (recentFeedbackPercents.length >= 3 && recentFeedbackPercents.every((value) => value < 100)) {
    alerts.push({
      type: 'below_target_3_weeks',
      severity: 'warning',
      title: '3 semanas seguidas abaixo da meta',
      description: 'Os tres ultimos feedbacks ficaram abaixo da meta semanal cadastrada.',
    });
  }

  if (previousSnapshot) {
    if ((toNumber(previousSnapshot.commercial?.conversionRate) - toNumber(currentSnapshot.commercial?.conversionRate)) >= normalizedConfig.alertThresholds.conversionDrop) {
      alerts.push({
        type: 'conversion_drop',
        severity: 'danger',
        title: 'Queda brusca na conversao',
        description: 'A conversao caiu acima do limite configurado em relacao ao periodo anterior.',
      });
    }

    if ((toNumber(currentSnapshot.attendance?.absenceCount) - toNumber(previousSnapshot.attendance?.absenceCount)) >= normalizedConfig.alertThresholds.attendanceRise) {
      alerts.push({
        type: 'attendance_rise',
        severity: 'warning',
        title: 'Aumento de faltas ou ausencias',
        description: 'Houve aumento relevante em faltas ou atrasos no periodo atual.',
      });
    }
  }

  if (!feedbackMetrics.isRecent) {
    alerts.push({
      type: 'feedback_overdue',
      severity: 'warning',
      title: 'Feedback em atraso',
      description: feedbackMetrics.latestDate
        ? 'O colaborador esta acima da janela maxima sem novo feedback registrado.'
        : 'Ainda nao existe feedback registrado dentro da janela configurada.',
    });
  }

  if (planMetrics.overduePlans > 0) {
    alerts.push({
      type: 'overdue_plan',
      severity: 'danger',
      title: 'Plano de acao vencido',
      description: `Existem ${planMetrics.overduePlans} acoes de desenvolvimento com prazo vencido.`,
    });
  }

  if (recentHistory.length >= 3) {
    const lastThree = recentHistory.slice(-3).map((item) => toNumber(item.scoreOverall));
    if ((Math.max(...lastThree) - Math.min(...lastThree)) <= normalizedConfig.alertThresholds.stalledScoreDelta) {
      alerts.push({
        type: 'stalled_evolution',
        severity: 'warning',
        title: 'Sem evolucao apos acompanhamentos',
        description: 'O score geral se manteve praticamente estagnado nos ultimos periodos.',
      });
    }
  }

  if (recentHistory.length >= normalizedConfig.alertThresholds.improvementStreakCount) {
    const streak = recentHistory.slice(-normalizedConfig.alertThresholds.improvementStreakCount).map((item) => toNumber(item.scoreOverall));
    const isImproving = streak.every((value, index) => index === 0 || value > streak[index - 1]);
    if (isImproving) {
      alerts.push({
        type: 'improvement_streak',
        severity: 'success',
        title: 'Melhora consistente por 4 semanas',
        description: 'O score mostrou melhora consistente ao longo dos ultimos periodos.',
      });
    }
  }

  return alerts.map((alert) => ({
    ...alert,
    employeeId: employee.id || employee.uid || currentSnapshot.employeeId || null,
    period: normalizePeriod(period || currentSnapshot.period),
    status: 'active',
    updatedAt: new Date().toISOString(),
  }));
}

function buildDerivedTimeline({ snapshot, plans = [], feedbacks = [], reviews = [], participationEvents = [], alerts = [] }) {
  const entries = [];

  if (snapshot) {
    entries.push({
      type: 'snapshot',
      title: `Snapshot mensal: score ${snapshot.scoreOverall}`,
      date: snapshot.generatedAt || new Date().toISOString(),
    });
  }

  feedbacks.forEach((feedback) => entries.push({
    type: 'feedback',
    title: `Feedback semanal: ${feedback.referenceWeek || feedback.period || 'sem referencia'}`,
    date: feedback.recordedAt || feedback.feedbackDate || feedback.createdAt,
  }));

  reviews.forEach((review) => entries.push({
    type: 'behavior_review',
    title: 'Avaliacao comportamental registrada',
    date: review.reviewDate || review.createdAt,
  }));

  plans.forEach((plan) => entries.push({
    type: 'development_plan',
    title: `PDI: ${plan.objective || plan.title || 'acao'}`,
    date: plan.createdAt || plan.updatedAt || plan.deadline,
  }));

  participationEvents.forEach((event) => entries.push({
    type: 'participation',
    title: `${event.type || 'Participacao'}: ${event.title || event.name || 'registro'}`,
    date: event.eventDate || event.createdAt,
  }));

  alerts.forEach((alert) => entries.push({
    type: 'alert',
    title: `Alerta: ${alert.title}`,
    date: alert.updatedAt || alert.createdAt,
  }));

  return entries
    .filter((entry) => entry.date)
    .sort((left, right) => (normalizeTimestamp(right.date)?.getTime() || 0) - (normalizeTimestamp(left.date)?.getTime() || 0));
}

function mapDocs(snapshot) {
  return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
}

function buildAbsenceCalendarEntries(absenceId, absence = {}) {
  const startDate = normalizeDateKey(absence.startDate || absence.date || absence.createdAt);
  const endDate = normalizeDateKey(absence.endDate || absence.startDate || absence.date || absence.createdAt);
  if (!startDate || !endDate) return [];

  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

  const storeId = absence.storeId || absence.cityId || absence.storeName || 'Geral';
  const storeName = absence.storeName || absence.cityName || absence.storeId || absence.cityId || 'Geral';
  const attendantName = absence.attendantName || absence.employeeName || 'Colaborador';
  const attendantFirstName = String(attendantName).split(' ')[0] || 'Colaborador';
  const type = String(absence.type || absence.typeOccurrence || absence.reason || 'ausencia');
  const coverageMap = absence.coverageMap || {};
  const entries = [];

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const date = cursor.toISOString().slice(0, 10);
    const coverage = coverageMap[date] || absence.coverage || null;
    entries.push({
      id: `${absenceId}_${date}`,
      absenceId,
      monthKey: date.slice(0, 7),
      date,
      storeId,
      storeName,
      attendantFirstName,
      type,
      coverage,
      isClosedStore: coverage === 'loja_fechada' || absence.isClosedStore === true,
      updatedAt: new Date().toISOString(),
    });
  }

  return entries;
}

async function fetchByField(collectionName, field, value) {
  const snapshot = await db.collection(collectionName).where(field, '==', value).get();
  return mapDocs(snapshot);
}

async function fetchByAnyField(collectionName, fields, value) {
  const snapshots = await Promise.all(fields.map((field) => db.collection(collectionName).where(field, '==', value).get()));
  const merged = new Map();
  snapshots.flatMap(mapDocs).forEach((item) => merged.set(item.id, item));
  return Array.from(merged.values());
}

function sanitizeKey(value) {
  return String(value || 'item').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function uniqueAddressParts(parts = []) {
  return Array.from(new Set(parts.filter(Boolean).map((item) => normalizeText(item)).filter(Boolean)));
}

function buildAddressSearchVariants(address) {
  const safeAddress = normalizeText(address);
  if (!safeAddress) {
    return [];
  }

  const parts = safeAddress.split('-').map((item) => normalizeText(item));
  const streetPart = parts[0] || safeAddress;
  const neighborhoodPart = parts[1] || '';
  const cityPart = parts[2] || '';

  return uniqueAddressParts([
    [streetPart, neighborhoodPart, cityPart, 'Brasil'].filter(Boolean).join(', '),
    [streetPart, cityPart, 'Brasil'].filter(Boolean).join(', '),
    [safeAddress, 'Brasil'].filter(Boolean).join(', '),
    safeAddress,
  ]);
}

function scoreGeocodeCandidate(candidate = {}, address = '') {
  const parsed = extractAddressComponents(candidate);
  const display = normalizeText(candidate.display_name || '');
  const safeAddress = normalizeText(address).toLowerCase();
  const street = normalizeText(parsed.addressStreet).toLowerCase();
  const neighborhood = normalizeText(parsed.addressNeighborhood).toLowerCase();

  let score = 0;
  if (street && safeAddress.includes(street)) score += 30;
  if (neighborhood && safeAddress.includes(neighborhood)) score += 34;
  if (display.includes(safeAddress)) score += 20;
  if (display.includes('brasil')) score += 4;
  if (String(candidate.addresstype || candidate.type || '').match(/house|building|residential|road/i)) score += 6;
  return score;
}

function extractAddressComponents(result = {}) {
  const address = result.address || {};

  return {
    addressStreet: address.road || address.pedestrian || address.footway || address.path || address.cycleway || '',
    addressNumber: address.house_number || '',
    addressNeighborhood: address.suburb || address.neighbourhood || address.quarter || address.borough || address.city_district || address.residential || address.hamlet || '',
    geoFormattedAddress: result.display_name || '',
  };
}

function buildLeadAddressString(data = {}) {
  const structuredAddress = [
    [data.addressStreet || '', data.addressNumber || ''].filter(Boolean).join(', '),
    data.addressNeighborhood || '',
    data.cityName || '',
  ].filter(Boolean).join(' - ');

  return structuredAddress || data.address || '';
}

async function geocodeAddress(address) {
  if (!address) {
    return null;
  }

  const variants = buildAddressSearchVariants(address);
  for (const variant of variants) {
    const response = await fetch(`${NOMINATIM_BASE_URL}/search?format=jsonv2&limit=5&addressdetails=1&countrycodes=br&q=${encodeURIComponent(variant)}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'User-Agent': 'oquei-gestao/1.0',
      },
    });
    if (!response.ok) {
      throw new Error(`Nominatim geocoding request failed with status ${response.status}`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload) || !payload.length) {
      continue;
    }

    return payload.sort((left, right) => scoreGeocodeCandidate(right, address) - scoreGeocodeCandidate(left, address))[0];
  }
  return null;
}

async function resolveCityRef(cityValue) {
  const safeValue = normalizeText(cityValue);
  if (!safeValue) {
    return { cityId: '__all__', cityName: 'Todas as cidades', clusterId: '', clusterName: '' };
  }

  if (CITY_CACHE.has(safeValue.toLowerCase())) {
    return CITY_CACHE.get(safeValue.toLowerCase());
  }

  const byId = await db.collection('cities').doc(cityValue).get();
  if (byId.exists) {
    const clusterRef = await resolveClusterRef(byId.data()?.clusterId);
    const result = {
      cityId: byId.id,
      cityName: byId.data()?.name || safeValue,
      clusterId: byId.data()?.clusterId || '',
      clusterName: clusterRef.clusterName || '',
    };
    CITY_CACHE.set(safeValue.toLowerCase(), result);
    return result;
  }

  const byName = await db.collection('cities').where('name', '==', safeValue).limit(1).get();
  if (!byName.empty) {
    const document = byName.docs[0];
    const clusterRef = await resolveClusterRef(document.data()?.clusterId);
    const result = {
      cityId: document.id,
      cityName: document.data()?.name || safeValue,
      clusterId: document.data()?.clusterId || '',
      clusterName: clusterRef.clusterName || '',
    };
    CITY_CACHE.set(safeValue.toLowerCase(), result);
    return result;
  }

  const fallback = { cityId: safeValue, cityName: safeValue, clusterId: '', clusterName: '' };
  CITY_CACHE.set(safeValue.toLowerCase(), fallback);
  return fallback;
}

async function resolveClusterRef(clusterValue) {
  const safeValue = normalizeText(clusterValue);
  if (!safeValue) {
    return { clusterId: '', clusterName: '' };
  }

  if (CLUSTER_CACHE.has(safeValue.toLowerCase())) {
    return CLUSTER_CACHE.get(safeValue.toLowerCase());
  }

  const byId = await db.collection('clusters').doc(clusterValue).get();
  if (byId.exists) {
    const result = { clusterId: byId.id, clusterName: byId.data()?.name || clusterValue };
    CLUSTER_CACHE.set(safeValue.toLowerCase(), result);
    return result;
  }

  const byName = await db.collection('clusters').where('name', '==', clusterValue).limit(1).get();
  if (!byName.empty) {
    const document = byName.docs[0];
    const result = { clusterId: document.id, clusterName: document.data()?.name || clusterValue };
    CLUSTER_CACHE.set(safeValue.toLowerCase(), result);
    return result;
  }

  const fallback = { clusterId: clusterValue, clusterName: clusterValue };
  CLUSTER_CACHE.set(safeValue.toLowerCase(), fallback);
  return fallback;
}

async function upsertLeadPartnershipSource(documentId, payload) {
  await db.collection('lead_partnership_sources').doc(documentId).set({
    ...payload,
    normalizedName: normalizeText(payload.name).toLowerCase(),
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

async function deleteLeadPartnershipSource(documentId) {
  await db.collection('lead_partnership_sources').doc(documentId).delete().catch(() => null);
}

async function getPerformanceConfig() {
  const configSnap = await db.collection('performance_score_configs').doc('attendant').get();
  return normalizeScoreConfig(configSnap.exists ? configSnap.data() : DEFAULT_ATTENDANT_SCORE_CONFIG);
}

async function recomputeEmployeePeriod(employeeId, period) {
  const normalizedPeriod = normalizePeriod(period);
  const employeeSnap = await db.collection('users').doc(employeeId).get();
  if (!employeeSnap.exists) return null;

  const employee = { id: employeeSnap.id, ...employeeSnap.data() };
  if (!PERFORMANCE_ROLE_KEYS.includes(String(employee.role || '').toLowerCase())) return null;

  const config = await getPerformanceConfig();
  const [
    leads,
    absences,
    rhRequests,
    behaviorReviews,
    feedbacks,
    plans,
    participationEvents,
    history,
    manualInputSnap,
  ] = await Promise.all([
    fetchByField('leads', 'attendantId', employeeId),
    fetchByField('absences', 'attendantId', employeeId),
    fetchByAnyField('rh_requests', ['attendantId', 'targetId'], employeeId),
    fetchByField('performance_behavior_reviews', 'employeeId', employeeId),
    fetchByField('performance_feedbacks', 'employeeId', employeeId),
    fetchByField('performance_development_plans', 'employeeId', employeeId),
    fetchByField('performance_participation_events', 'employeeId', employeeId),
    fetchByField('performance_score_snapshots', 'employeeId', employeeId),
    db.collection('performance_commercial_inputs').doc(`${employeeId}_${normalizedPeriod}`).get(),
  ]);

  const manualInput = manualInputSnap.exists ? manualInputSnap.data() : {};
  const periodLeads = leads.filter((item) => dateFallsInPeriod(item.date || item.createdAt || item.lastUpdate, normalizedPeriod));
  const periodAbsences = absences.filter((item) => dateFallsInPeriod(item.startDate || item.createdAt, normalizedPeriod) || dateFallsInPeriod(item.endDate || item.createdAt, normalizedPeriod));
  const periodRh = rhRequests.filter((item) => dateFallsInPeriod(item.dateEvent || item.createdAt, normalizedPeriod));
  const periodBehavior = behaviorReviews.filter((item) => item.period === normalizedPeriod || dateFallsInPeriod(item.reviewDate || item.createdAt, normalizedPeriod));
  const periodFeedbacks = feedbacks.filter((item) => item.period === normalizedPeriod || dateFallsInPeriod(item.recordedAt || item.feedbackDate || item.createdAt, normalizedPeriod));
  const periodPlans = plans.filter((item) => !item.period || item.period === normalizedPeriod || dateFallsInPeriod(item.deadline || item.createdAt, normalizedPeriod));
  const periodParticipation = participationEvents.filter((item) => item.period === normalizedPeriod || dateFallsInPeriod(item.eventDate || item.createdAt, normalizedPeriod));
  const sortedHistory = history.slice().sort((left, right) => String(left.period).localeCompare(String(right.period)));

  const snapshot = buildPerformanceSnapshot({
    employee,
    period: normalizedPeriod,
    leads: periodLeads,
    commercialInput: manualInput,
    behaviorReviews: periodBehavior,
    absences: periodAbsences,
    rhRequests: periodRh,
    feedbacks: periodFeedbacks,
    plans: periodPlans,
    participationEvents: periodParticipation,
    history: sortedHistory,
    config,
  });

  await db.collection('performance_score_snapshots').doc(`${employeeId}_${normalizedPeriod}`).set({
    ...snapshot,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  const alerts = buildAlertRecords({
    employee,
    period: normalizedPeriod,
    snapshot,
    history: sortedHistory.filter((item) => item.period !== normalizedPeriod),
    feedbacks: periodFeedbacks,
    plans: periodPlans,
    config,
  });

  const previousAlerts = await fetchByField('performance_alerts', 'employeeId', employeeId);
  const currentAlerts = previousAlerts.filter((item) => item.period === normalizedPeriod);
  const batch = db.batch();

  currentAlerts.forEach((alert) => {
    const stillActive = alerts.some((item) => item.type === alert.type);
    batch.set(db.collection('performance_alerts').doc(alert.id), {
      ...alert,
      status: stillActive ? 'active' : 'resolved',
      resolvedAt: stillActive ? null : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  });

  alerts.forEach((alert) => {
    const alertId = `${employeeId}_${normalizedPeriod}_${alert.type}`;
    batch.set(db.collection('performance_alerts').doc(alertId), {
      ...alert,
      id: alertId,
      employeeName: employee.name || employee.nome || 'Colaborador',
      clusterId: employee.clusterId || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  });

  const timeline = buildDerivedTimeline({
    snapshot,
    plans: periodPlans,
    feedbacks: periodFeedbacks,
    reviews: periodBehavior,
    participationEvents: periodParticipation,
    alerts,
  });

  timeline.forEach((entry, index) => {
    const timelineId = `system_${employeeId}_${normalizedPeriod}_${sanitizeKey(entry.type)}_${sanitizeKey(entry.date)}_${index}`;
    batch.set(db.collection('performance_timeline').doc(timelineId), {
      id: timelineId,
      employeeId,
      period: normalizedPeriod,
      source: 'system',
      type: entry.type,
      title: entry.title,
      date: entry.date,
      createdAt: entry.date,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  });

  await batch.commit();
  return snapshot;
}

async function recomputeFromEvent(event) {
  const after = event.data?.after?.exists ? event.data.after.data() : null;
  const before = event.data?.before?.exists ? event.data.before.data() : null;
  const payload = after || before;
  if (!payload) return null;
  const employeeId = payload.employeeId || payload.attendantId || payload.targetId;
  const period = payload.period || normalizePeriod(payload.reviewDate || payload.recordedAt || payload.eventDate || payload.deadline || payload.createdAt || payload.updatedAt);
  if (!employeeId) return null;
  return recomputeEmployeePeriod(employeeId, period);
}

async function syncLeadDerivedFields(event) {
  const after = event.data?.after;
  if (!after?.exists) return null;

  const data = after.data() || {};
  const monthKey = data.monthKey || deriveMonthKey(data.date || data.createdAt || data.lastUpdate);
  const leadType = data.leadType || normalizeLeadTypeValue(data.categoryName || data.productName || data.status);
  const cityRef = await resolveCityRef(data.cityId || data.cityName || data.city);
  const clusterId = data.clusterId || cityRef.clusterId || '';
  let clusterName = data.clusterName || '';

  if (!clusterName && clusterId) {
    const clusterRef = await resolveClusterRef(clusterId);
    clusterName = clusterRef.clusterName || '';
  }

  const needsUpdate = (
    data.monthKey !== monthKey
    || data.leadType !== leadType
    || (clusterId && data.clusterId !== clusterId)
    || (clusterName && data.clusterName !== clusterName)
  );

  if (!needsUpdate) {
    return null;
  }

  await after.ref.set({
    monthKey,
    leadType,
    clusterId: clusterId || null,
    clusterName: clusterName || null,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  return { monthKey, leadType, clusterId, clusterName };
}

async function syncLeadGeolocation(event) {
  const after = event.data?.after;
  if (!after?.exists) return null;

  const data = after.data() || {};
  const beforeData = event.data?.before?.exists ? event.data.before.data() || {} : null;
  const address = buildLeadAddressString(data);
  const previousAddress = beforeData ? buildLeadAddressString(beforeData) : '';
  const addressChanged = !beforeData || address !== previousAddress;
  const hasGeoCoordinates = Number.isFinite(Number(data.geoLat)) && Number.isFinite(Number(data.geoLng));
  const geoAlreadyResolved = hasGeoCoordinates && data.geoStatus === 'resolved';

  if (!address) {
    return null;
  }

  if (!beforeData && geoAlreadyResolved) {
    return null;
  }

  if (!addressChanged && geoAlreadyResolved) {
    return null;
  }

  if (!addressChanged && data.geoStatus === 'failed') {
    return null;
  }

  const geocoded = await geocodeAddress(address);
  if (!geocoded?.lat || !geocoded?.lon) {
    await after.ref.set({
      geoStatus: 'failed',
      geoUpdatedAt: new Date().toISOString(),
    }, { merge: true });
    return null;
  }

  const geoPayload = extractAddressComponents(geocoded);
  await after.ref.set({
    ...geoPayload,
    address: buildLeadAddressString({ ...data, ...geoPayload }),
    geoLat: Number(geocoded.lat),
    geoLng: Number(geocoded.lon),
    geoStatus: 'resolved',
    geoUpdatedAt: new Date().toISOString(),
  }, { merge: true });

  return {
    geoLat: Number(geocoded.lat),
    geoLng: Number(geocoded.lon),
  };
}

async function syncActionPlanPartnershipSource(event) {
  const documentId = `action_plan_${event.params?.docId}`;
  const after = event.data?.after;

  if (!after?.exists) {
    await deleteLeadPartnershipSource(documentId);
    return null;
  }

  const data = after.data() || {};
  if (data.deleted || data.status !== 'Em Andamento') {
    await deleteLeadPartnershipSource(documentId);
    return null;
  }

  await upsertLeadPartnershipSource(documentId, {
    name: data.name || 'Acao sem nome',
    cityId: data.cityId || '__all__',
    cityName: data.cityName || (data.cityId === '__all__' ? 'Todas as cidades' : data.cityId || 'Cidade nao informada'),
    sourceType: 'action_plan',
    sourceId: event.params?.docId,
    status: data.status || 'Em Andamento',
    active: true,
    originLabel: 'Acao em Parceria',
    startDate: normalizeDateKey(data.startDate || data.createdAt || data.updatedAt),
    endDate: normalizeDateKey(data.endDate || data.deadline || data.updatedAt),
    createdAt: normalizeTimestamp(data.createdAt)?.toISOString() || new Date().toISOString(),
  });
  return true;
}

async function syncSponsorshipPartnershipSource(event) {
  const documentId = `sponsorship_${event.params?.docId}`;
  const after = event.data?.after;

  if (!after?.exists) {
    await deleteLeadPartnershipSource(documentId);
    return null;
  }

  const data = after.data() || {};
  if (data.status !== 'Aprovado') {
    await deleteLeadPartnershipSource(documentId);
    return null;
  }

  const cityRef = await resolveCityRef(data.cityId || data.city || data.cityName);
  await upsertLeadPartnershipSource(documentId, {
    name: data.eventName || data.title || 'Evento parceiro',
    cityId: cityRef.cityId || '__all__',
    cityName: cityRef.cityName || 'Cidade nao informada',
    sourceType: 'sponsorship',
    sourceId: event.params?.docId,
    status: data.status,
    active: true,
    originLabel: 'Acao em Parceria',
    startDate: normalizeDateKey(data.dateTime || data.date || data.createdAt),
    endDate: normalizeDateKey(data.endDate || data.dateTime || data.date || data.createdAt),
    createdAt: normalizeTimestamp(data.createdAt)?.toISOString() || new Date().toISOString(),
  });
  return true;
}

async function syncAbsenceCalendarPublic(event) {
  const docId = event.params?.docId;
  if (!docId) return null;

  const previousEntries = await db.collection('absence_calendar_public').where('absenceId', '==', docId).get();
  const deleteBatch = db.batch();
  previousEntries.docs.forEach((document) => deleteBatch.delete(document.ref));
  if (!previousEntries.empty) {
    await deleteBatch.commit();
  }

  const after = event.data?.after;
  if (!after?.exists) return null;

  const entries = buildAbsenceCalendarEntries(docId, after.data());
  if (!entries.length) return [];

  const writeBatch = db.batch();
  entries.forEach((entry) => {
    writeBatch.set(db.collection('absence_calendar_public').doc(entry.id), entry, { merge: true });
  });
  await writeBatch.commit();
  return entries;
}

exports.onLeadWrite = onDocumentWritten('leads/{docId}', async (event) => {
  await Promise.all([
    syncLeadDerivedFields(event),
    syncLeadGeolocation(event),
  ]);
});
exports.onActionPlanWrite = onDocumentWritten('action_plans/{docId}', async (event) => syncActionPlanPartnershipSource(event));
exports.onSponsorshipWrite = onDocumentWritten('sponsorships/{docId}', async (event) => syncSponsorshipPartnershipSource(event));
exports.onPerformanceCommercialInputWrite = onDocumentWritten('performance_commercial_inputs/{docId}', async (event) => recomputeFromEvent(event));
exports.onPerformanceBehaviorReviewWrite = onDocumentWritten('performance_behavior_reviews/{docId}', async (event) => recomputeFromEvent(event));
exports.onPerformanceFeedbackWrite = onDocumentWritten('performance_feedbacks/{docId}', async (event) => recomputeFromEvent(event));
exports.onPerformancePlanWrite = onDocumentWritten('performance_development_plans/{docId}', async (event) => recomputeFromEvent(event));
exports.onPerformanceParticipationWrite = onDocumentWritten('performance_participation_events/{docId}', async (event) => recomputeFromEvent(event));
exports.onAbsenceWrite = onDocumentWritten('absences/{docId}', async (event) => {
  await Promise.all([
    recomputeFromEvent(event),
    syncAbsenceCalendarPublic(event),
  ]);
});
exports.onRhRequestWrite = onDocumentWritten('rh_requests/{docId}', async (event) => recomputeFromEvent(event));

exports.reconcilePerformanceAlertsDaily = onSchedule('every day 06:00', async () => {
  const usersSnap = await db.collection('users').get();
  const period = normalizePeriod();
  const employees = usersSnap.docs
    .map((document) => ({ id: document.id, ...document.data() }))
    .filter((user) => PERFORMANCE_ROLE_KEYS.includes(String(user.role || '').toLowerCase()));

  for (const employee of employees) {
    await recomputeEmployeePeriod(employee.id, period);
  }
});
