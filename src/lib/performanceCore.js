import {
  DEFAULT_ATTENDANT_SCORE_CONFIG,
  PERFORMANCE_ALERT_LABELS,
  PERFORMANCE_COMPETENCIES,
} from './performanceConstants';

const SALE_STATUSES = new Set(['Contratado', 'Instalado', 'Vendido']);
const DISCARD_STATUSES = new Set(['Descartado', 'Cancelado']);
const MIGRATION_PATTERN = /migra/i;

export function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

export function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function average(values = []) {
  const safe = values.filter((value) => Number.isFinite(Number(value))).map(Number);
  if (!safe.length) return 0;
  return safe.reduce((sum, value) => sum + value, 0) / safe.length;
}

export function normalizeTimestamp(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toIsoDate(value) {
  const date = normalizeTimestamp(value);
  return date ? date.toISOString().slice(0, 10) : '';
}

export function normalizePeriod(period = '') {
  if (/^\d{4}-\d{2}$/.test(period)) return period;
  return new Date().toISOString().slice(0, 7);
}

export function getPeriodBounds(period) {
  const normalized = normalizePeriod(period);
  const start = new Date(`${normalized}-01T00:00:00`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}

export function dateFallsInPeriod(value, period) {
  const date = normalizeTimestamp(value);
  if (!date) return false;
  const { start, end } = getPeriodBounds(period);
  return date >= start && date < end;
}

export function normalizeScoreConfig(config = {}) {
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

export function computeCommercialMetrics({
  employee = {},
  leads = [],
  commercialInput = {},
} = {}) {
  const sales = leads.filter((lead) => SALE_STATUSES.has(lead.status));
  const installed = leads.filter((lead) => lead.status === 'Instalado');
  const discards = leads.filter((lead) => DISCARD_STATUSES.has(lead.status));
  const migrations = leads.filter((lead) => MIGRATION_PATTERN.test(String(lead.leadType || lead.categoryName || '')));
  const prices = sales.map((lead) => toNumber(lead.productPrice)).filter(Boolean);
  const avgTicket = average(prices);
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
    averageTicket: Number(avgTicket.toFixed(2)),
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

export function computeBehaviorMetrics(reviews = []) {
  if (!reviews.length) {
    return {
      score: 0,
      reviewCount: 0,
      averageRating: 0,
      radarData: PERFORMANCE_COMPETENCIES.map((competency) => ({
        subject: competency.label,
        rating: 0,
      })),
      latestReview: null,
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

  const allRatings = radarData.map((item) => item.rating);
  const averageRating = average(allRatings);
  const latestReview = normalizedReviews.sort((left, right) => {
    const leftTime = normalizeTimestamp(left.reviewDate)?.getTime() || 0;
    const rightTime = normalizeTimestamp(right.reviewDate)?.getTime() || 0;
    return rightTime - leftTime;
  })[0];

  return {
    score: clamp((averageRating / 5) * 100),
    reviewCount: reviews.length,
    averageRating: Number(averageRating.toFixed(2)),
    radarData,
    latestReview,
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

export function computeAttendanceMetrics(absences = [], rhRequests = []) {
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

  const presencePercent = clamp(
    100
      - (counters.absenceCount * 12)
      - (counters.lateCount * 4)
      - (counters.medicalCount * 4),
  );
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

export function computeFeedbackMetrics(feedbacks = [], config = normalizeScoreConfig()) {
  const sorted = [...feedbacks].sort((left, right) => {
    const leftTime = normalizeTimestamp(left.recordedAt || left.createdAt || left.feedbackDate)?.getTime() || 0;
    const rightTime = normalizeTimestamp(right.recordedAt || right.createdAt || right.feedbackDate)?.getTime() || 0;
    return rightTime - leftTime;
  });
  const latestFeedback = sorted[0] || null;
  const latestDate = normalizeTimestamp(latestFeedback?.recordedAt || latestFeedback?.createdAt || latestFeedback?.feedbackDate);
  const now = new Date();
  const overdueDays = latestDate
    ? Math.floor((now.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isRecent = overdueDays !== null && overdueDays <= config.feedbackWindowDays;
  return {
    latestFeedback,
    latestDate,
    overdueDays,
    isRecent,
    count: feedbacks.length,
  };
}

export function computePlanMetrics(plans = []) {
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

export function computeEngagementMetrics({
  feedbacks = [],
  plans = [],
  participationEvents = [],
  config = normalizeScoreConfig(),
} = {}) {
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

export function computeOverallScore({
  commercialScore = 0,
  behaviorScore = 0,
  attendanceScore = 0,
  engagementScore = 0,
  config = normalizeScoreConfig(),
} = {}) {
  const normalizedConfig = normalizeScoreConfig(config);
  const total = (
    (commercialScore * normalizedConfig.weights.commercial)
    + (behaviorScore * normalizedConfig.weights.behavior)
    + (attendanceScore * normalizedConfig.weights.attendance)
    + (engagementScore * normalizedConfig.weights.engagement)
  ) / 100;
  return Number(clamp(total).toFixed(1));
}

export function deriveStatus(score, config = normalizeScoreConfig()) {
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

export function buildPerformanceSnapshot({
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
} = {}) {
  const commercial = computeCommercialMetrics({ employee, leads, commercialInput });
  const behavior = computeBehaviorMetrics(behaviorReviews);
  const attendance = computeAttendanceMetrics(absences, rhRequests);
  const engagement = computeEngagementMetrics({
    feedbacks,
    plans,
    participationEvents,
    config,
  });
  const scoreOverall = computeOverallScore({
    commercialScore: commercial.score,
    behaviorScore: behavior.score,
    attendanceScore: attendance.score,
    engagementScore: engagement.score,
    config,
  });
  const previous30 = findHistoricalScore(history, period, 1);
  const previous90 = findHistoricalScore(history, period, 3);
  const delta30 = previous30 ? Number((scoreOverall - toNumber(previous30.scoreOverall)).toFixed(1)) : 0;
  const delta90 = previous90 ? Number((scoreOverall - toNumber(previous90.scoreOverall)).toFixed(1)) : 0;
  const feedbackMetrics = computeFeedbackMetrics(feedbacks, config);
  const status = deriveStatus(scoreOverall, config);

  return {
    employeeId: employee.id || employee.uid || null,
    employeeName: employee.name || employee.nome || 'Colaborador',
    teamName: employee.teamName || '',
    clusterId: employee.clusterId || '',
    period: normalizePeriod(period),
    role: employee.role || 'attendant',
    generatedAt: new Date().toISOString(),
    scoreOverall,
    status,
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
    delta30,
    delta90,
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

export function buildAlertRecords({
  employee = {},
  period,
  snapshot,
  history = [],
  feedbacks = [],
  plans = [],
  config = normalizeScoreConfig(),
} = {}) {
  const normalizedConfig = normalizeScoreConfig(config);
  const currentSnapshot = snapshot || buildPerformanceSnapshot({ employee, period, config: normalizedConfig });
  const alerts = [];
  const previousSnapshot = findHistoricalScore(history, period, 1);
  const feedbackMetrics = computeFeedbackMetrics(feedbacks, normalizedConfig);
  const planMetrics = computePlanMetrics(plans);
  const recentFeedbackPercents = calculateRecentFeedbackPercents(feedbacks);
  const recentHistory = [...history, currentSnapshot]
    .filter((item) => item?.period)
    .sort((left, right) => String(left.period).localeCompare(String(right.period)));

  if (recentFeedbackPercents.length >= 3 && recentFeedbackPercents.every((value) => value < 100)) {
    alerts.push({
      type: 'below_target_3_weeks',
      severity: 'warning',
      title: PERFORMANCE_ALERT_LABELS.below_target_3_weeks,
      description: 'Os tres ultimos feedbacks ficaram abaixo da meta semanal cadastrada.',
    });
  }

  if (previousSnapshot) {
    const previousConversion = toNumber(previousSnapshot.commercial?.conversionRate);
    const currentConversion = toNumber(currentSnapshot.commercial?.conversionRate);
    if ((previousConversion - currentConversion) >= normalizedConfig.alertThresholds.conversionDrop) {
      alerts.push({
        type: 'conversion_drop',
        severity: 'danger',
        title: PERFORMANCE_ALERT_LABELS.conversion_drop,
        description: 'A conversao caiu acima do limite configurado em relacao ao periodo anterior.',
      });
    }

    const previousAbsenceCount = toNumber(previousSnapshot.attendance?.absenceCount);
    const currentAbsenceCount = toNumber(currentSnapshot.attendance?.absenceCount);
    if ((currentAbsenceCount - previousAbsenceCount) >= normalizedConfig.alertThresholds.attendanceRise) {
      alerts.push({
        type: 'attendance_rise',
        severity: 'warning',
        title: PERFORMANCE_ALERT_LABELS.attendance_rise,
        description: 'Houve aumento relevante em faltas ou atrasos no periodo atual.',
      });
    }
  }

  if (!feedbackMetrics.isRecent) {
    alerts.push({
      type: 'feedback_overdue',
      severity: 'warning',
      title: PERFORMANCE_ALERT_LABELS.feedback_overdue,
      description: feedbackMetrics.latestDate
        ? 'O colaborador esta acima da janela maxima sem novo feedback registrado.'
        : 'Ainda nao existe feedback registrado dentro da janela configurada.',
    });
  }

  if (planMetrics.overduePlans > 0) {
    alerts.push({
      type: 'overdue_plan',
      severity: 'danger',
      title: PERFORMANCE_ALERT_LABELS.overdue_plan,
      description: `Existem ${planMetrics.overduePlans} acoes de desenvolvimento com prazo vencido.`,
    });
  }

  if (recentHistory.length >= 3) {
    const lastThree = recentHistory.slice(-3).map((item) => toNumber(item.scoreOverall));
    const maxScore = Math.max(...lastThree);
    const minScore = Math.min(...lastThree);
    if ((maxScore - minScore) <= normalizedConfig.alertThresholds.stalledScoreDelta) {
      alerts.push({
        type: 'stalled_evolution',
        severity: 'warning',
        title: PERFORMANCE_ALERT_LABELS.stalled_evolution,
        description: 'O score geral se manteve praticamente estagnado nos ultimos periodos.',
      });
    }
  }

  if (recentHistory.length >= normalizedConfig.alertThresholds.improvementStreakCount) {
    const streak = recentHistory
      .slice(-normalizedConfig.alertThresholds.improvementStreakCount)
      .map((item) => toNumber(item.scoreOverall));
    const isImproving = streak.every((value, index) => index === 0 || value > streak[index - 1]);
    if (isImproving) {
      alerts.push({
        type: 'improvement_streak',
        severity: 'success',
        title: PERFORMANCE_ALERT_LABELS.improvement_streak,
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

export function buildDerivedTimeline({
  snapshot,
  plans = [],
  feedbacks = [],
  reviews = [],
  participationEvents = [],
  alerts = [],
} = {}) {
  const entries = [];

  if (snapshot) {
    entries.push({
      type: 'snapshot',
      title: `Snapshot mensal: score ${snapshot.scoreOverall}`,
      date: snapshot.generatedAt || new Date().toISOString(),
      meta: { period: snapshot.period, status: snapshot.status },
    });
  }

  feedbacks.forEach((feedback) => {
    entries.push({
      type: 'feedback',
      title: `Feedback semanal: ${feedback.referenceWeek || feedback.period || 'sem referencia'}`,
      date: feedback.recordedAt || feedback.feedbackDate || feedback.createdAt,
      meta: { nextReviewDate: feedback.nextReviewDate || null },
    });
  });

  reviews.forEach((review) => {
    entries.push({
      type: 'behavior_review',
      title: 'Avaliacao comportamental registrada',
      date: review.reviewDate || review.createdAt,
      meta: { reviewerName: review.reviewerName || null },
    });
  });

  plans.forEach((plan) => {
    entries.push({
      type: 'development_plan',
      title: `PDI: ${plan.objective || plan.title || 'acao'}`,
      date: plan.createdAt || plan.updatedAt || plan.deadline,
      meta: { status: plan.status || 'Pendente' },
    });
  });

  participationEvents.forEach((event) => {
    entries.push({
      type: 'participation',
      title: `${event.type || 'Participacao'}: ${event.title || event.name || 'registro'}`,
      date: event.eventDate || event.createdAt,
      meta: { impact: event.impact || null },
    });
  });

  alerts.forEach((alert) => {
    entries.push({
      type: 'alert',
      title: `Alerta: ${alert.title}`,
      date: alert.updatedAt || alert.createdAt,
      meta: { severity: alert.severity, status: alert.status },
    });
  });

  return entries
    .filter((entry) => entry.date)
    .sort((left, right) => {
      const leftTime = normalizeTimestamp(left.date)?.getTime() || 0;
      const rightTime = normalizeTimestamp(right.date)?.getTime() || 0;
      return rightTime - leftTime;
    });
}
