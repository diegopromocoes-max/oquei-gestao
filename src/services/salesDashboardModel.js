import { buildOperationalCalendar } from '../lib/operationsCalendar';

const SALE_STATUSES = new Set(['Contratado', 'Instalado']);

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function normalizeLeadTypeInternal(value = '') {
  const s = String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (s.includes('migra')) return 'migrations';
  if (
    s.includes('sva')
    || s.includes('servicos adicionais')
    || s.includes('servico adicional')
  ) return 'sva';
  return 'plans';
}

function safeDiv(numerator, denominator, fallback = 0) {
  return denominator > 0 ? numerator / denominator : fallback;
}

// ---------------------------------------------------------------------------
// 1. Bucket por tipo de negócio
// ---------------------------------------------------------------------------

export function bucketLeadByBusinessType(lead) {
  return normalizeLeadTypeInternal(lead.categoryName || lead.leadType || lead.productName);
}

// ---------------------------------------------------------------------------
// 2. Mapa de dias úteis por loja
// ---------------------------------------------------------------------------

/**
 * Retorna Map<storeId, { total, elapsed, remaining }> usando buildOperationalCalendar
 * do módulo de Faltas Globais. Só precisa de holidays — shifts/absências não
 * afetam a semântica "dia útil" no contexto do painel de vendas.
 */
export function buildStoreWorkingDaysMap(stores, holidays, monthKey, analysisDate) {
  const todayStr = (analysisDate || new Date()).toISOString().slice(0, 10);
  const storeCalendars = buildOperationalCalendar({ monthKey, stores, holidays });

  const map = new Map();
  storeCalendars.forEach((sc) => {
    const workingDays = sc.days.filter((d) => d.isWorkingDay);
    const total = workingDays.length || 22;
    const elapsed = Math.max(1, workingDays.filter((d) => d.date <= todayStr).length);
    const remaining = Math.max(0, total - elapsed);
    map.set(sc.storeId, { total, elapsed, remaining });
  });

  return map;
}

// ---------------------------------------------------------------------------
// 3. Backlog do mês anterior
// ---------------------------------------------------------------------------

/**
 * Leads de Plano Novo contratados antes de firstDayOfPeriod e ainda não instalados
 * (ou instalados somente a partir de firstDayOfPeriod).
 */
export function buildPlanCarryoverFromPreviousMonth(prevMonthLeads, firstDayOfPeriod) {
  if (!Array.isArray(prevMonthLeads) || !firstDayOfPeriod) return 0;
  return prevMonthLeads.filter((lead) => {
    if (bucketLeadByBusinessType(lead) !== 'plans') return false;
    if (!SALE_STATUSES.has(lead.status)) return false;
    const contracted = String(lead.contractedDate || lead.date || '').slice(0, 10);
    const installed = String(lead.installedDate || '').slice(0, 10);
    return contracted < firstDayOfPeriod && (!installed || installed >= firstDayOfPeriod);
  }).length;
}

// ---------------------------------------------------------------------------
// 4. Status de projeção
// ---------------------------------------------------------------------------

export function buildProjectionStatus(projected, goal) {
  if (!goal || goal <= 0) return 'on_track';
  const ratio = projected / goal;
  if (ratio >= 1.1) return 'surpassing';
  if (ratio >= 0.9) return 'on_track';
  if (ratio >= 0.7) return 'attention';
  return 'critical';
}

// ---------------------------------------------------------------------------
// 5. Métricas de Planos por loja
// ---------------------------------------------------------------------------

export function buildPlanStoreMetrics({
  storeLeads,
  workingDays,
  goalPlansOfficial,
  previousMonthCarryoverPlans = 0,
  monthKey,
}) {
  const { total, elapsed, remaining } = workingDays;

  const salesGrossPlans = storeLeads.filter((lead) => {
    if (bucketLeadByBusinessType(lead) !== 'plans') return false;
    const contractedKey = lead.contractedMonthKey || lead.monthKey || '';
    return SALE_STATUSES.has(lead.status) && contractedKey === monthKey;
  }).length;

  const installedPlansOfficial = storeLeads.filter((lead) => {
    if (bucketLeadByBusinessType(lead) !== 'plans') return false;
    if (lead.status !== 'Instalado') return false;
    const installKey = lead.installMonthKey || lead.monthKey || '';
    return installKey === monthKey;
  }).length;

  const pendingInstallationsCurrentMonth = Math.max(0, salesGrossPlans - installedPlansOfficial);
  const projectedMonthSalesPlans = elapsed > 0 ? Math.floor(safeDiv(salesGrossPlans, elapsed) * total) : 0;
  const carryover = previousMonthCarryoverPlans || 0;
  const installedPlansProjectionOfficial = projectedMonthSalesPlans + carryover;
  const installGap = Math.max(0, goalPlansOfficial - installedPlansProjectionOfficial);
  const requiredDailyInstalls = remaining > 0 ? parseFloat(safeDiv(installGap, remaining).toFixed(1)) : 0;
  const projectionStatus = buildProjectionStatus(installedPlansProjectionOfficial, goalPlansOfficial);

  return {
    goalPlansOfficial,
    salesGrossPlans,
    installedPlansOfficial,
    previousMonthCarryoverPlans: carryover,
    pendingInstallationsCurrentMonth,
    projectedMonthSalesPlans,
    installedPlansProjectionOfficial,
    installGap,
    requiredDailyInstalls,
    workingDaysTotal: total,
    workingDaysElapsed: elapsed,
    workingDaysRemaining: remaining,
    projectionStatus,
  };
}

// ---------------------------------------------------------------------------
// 6. Métricas de categorias secundárias (SVA / Migrações)
// ---------------------------------------------------------------------------

export function buildSecondaryCategoryMetrics({ storeLeads, monthKey, category, goal }) {
  const realized = storeLeads.filter((lead) => {
    if (bucketLeadByBusinessType(lead) !== category) return false;
    const contractedKey = lead.contractedMonthKey || lead.monthKey || '';
    return SALE_STATUSES.has(lead.status) && contractedKey === monthKey;
  }).length;

  const safeGoal = goal || 0;
  return {
    goal: safeGoal,
    realized,
    pct: safeGoal > 0 ? parseFloat(((realized / safeGoal) * 100).toFixed(1)) : 0,
  };
}

// ---------------------------------------------------------------------------
// 7. Métricas por atendente
// ---------------------------------------------------------------------------

export function buildAttendantCards({
  leads,
  prevMonthLeads,
  monthKey,
  firstDayOfPeriod,
  workingDaysMap,
  monthlyAttendantGoalsByCity,
  attendantUsersByCity,
  monthlyGoals,
}) {
  const planLeads = leads.filter((l) => bucketLeadByBusinessType(l) === 'plans');
  const attendantIds = [...new Set(planLeads.map((l) => l.attendantId).filter(Boolean))];

  return attendantIds
    .map((attendantId) => {
      const attendantLeads = leads.filter((l) => l.attendantId === attendantId);
      const firstLead = attendantLeads[0] || {};
      const cityId = String(firstLead.cityId || '').trim();
      const storeWorkingDays = workingDaysMap.get(cityId) || { total: 22, elapsed: 1, remaining: 21 };

      // Meta individual ou fallback por divisão estável
      const cityGoalDocs = monthlyAttendantGoalsByCity[cityId] || [];
      const individualGoalDoc = cityGoalDocs.find((g) => g.attendantId === attendantId);
      let goalPlansOfficial;

      if (individualGoalDoc) {
        goalPlansOfficial = parseInt(individualGoalDoc.plansTarget, 10) || 0;
      } else {
        const storeAttendants = (attendantUsersByCity[cityId] || [])
          .map((u) => u.id)
          .filter(Boolean)
          .sort();
        const storeGoal = parseInt((monthlyGoals[cityId] || {}).plans_loja, 10) || 0;
        const count = storeAttendants.length || 1;
        const base = Math.floor(storeGoal / count);
        const remainder = storeGoal % count;
        const idx = storeAttendants.indexOf(attendantId);
        goalPlansOfficial = base + (idx >= 0 && idx < remainder ? 1 : 0);
      }

      const carryover = prevMonthLeads
        ? buildPlanCarryoverFromPreviousMonth(
            prevMonthLeads.filter((l) => l.attendantId === attendantId),
            firstDayOfPeriod,
          )
        : 0;

      return {
        attendantId,
        attendantName: firstLead.attendantName || attendantId,
        cityId,
        cityName: firstLead.cityName || cityId,
        ...buildPlanStoreMetrics({
          storeLeads: attendantLeads,
          workingDays: storeWorkingDays,
          goalPlansOfficial,
          previousMonthCarryoverPlans: carryover,
          monthKey,
        }),
      };
    })
    .sort((a, b) => b.salesGrossPlans - a.salesGrossPlans);
}

// ---------------------------------------------------------------------------
// 8. Presets de tendência temporal
// ---------------------------------------------------------------------------

export function buildTrendPresetRange(preset, analysisDate) {
  const ref = new Date(analysisDate || new Date());

  if (preset === 'week') {
    // Segunda a sábado da semana imediatamente anterior à data de análise
    const dayOfWeek = ref.getDay(); // 0=Dom … 6=Sáb
    // Dias até o último sábado: se hoje é Dom(0) → 1; Seg(1) → 2; ... Sáb(6) → 7
    const daysToLastSat = dayOfWeek === 0 ? 1 : dayOfWeek + 1;
    const lastSat = new Date(ref);
    lastSat.setDate(ref.getDate() - daysToLastSat);
    const lastMon = new Date(lastSat);
    lastMon.setDate(lastSat.getDate() - 5);
    return {
      start: lastMon.toISOString().slice(0, 10),
      end: lastSat.toISOString().slice(0, 10),
      granularity: 'daily',
    };
  }

  if (preset === '7workdays') {
    const dates = [];
    const cursor = new Date(ref);

    while (dates.length < 7) {
      const weekday = cursor.getDay();
      if (weekday !== 0) {
        dates.unshift(cursor.toISOString().slice(0, 10));
      }
      cursor.setDate(cursor.getDate() - 1);
    }

    return {
      start: dates[0],
      end: dates[dates.length - 1],
      granularity: 'daily',
      dates,
    };
  }

  const months = preset === '3months' ? 3 : 6;
  const endMonth = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
  const startDate = new Date(ref.getFullYear(), ref.getMonth() - months + 1, 1);
  const startMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;

  return { start: startMonth, end: endMonth, granularity: 'monthly' };
}

function buildDateKeysBetween(start, end) {
  const dates = [];
  const cursor = new Date(`${start}T12:00:00`);
  const stop = new Date(`${end}T12:00:00`);
  while (cursor <= stop) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function buildMonthlyTrendSeries(monthlyPayloads) {
  return (monthlyPayloads || []).map((payload) => ({
    monthKey: payload.monthKey,
    plans: payload.totals?.salesGrossPlans ?? payload.totals?.p ?? 0,
    installations: payload.totals?.installedPlansOfficial ?? payload.totals?.i ?? 0,
    sva: payload.totals?.ss ?? 0,
    migrations: payload.totals?.m ?? 0,
  }));
}

export function buildDailyTrendSeries(leads, { start, end, dates: explicitDates } = {}) {
  if (!start || !end) return [];
  const dates = explicitDates?.length ? explicitDates : buildDateKeysBetween(start, end);
  const byDate = Object.fromEntries(
    dates.map((d) => [d, { date: d, plans: 0, installations: 0, sva: 0, migrations: 0 }]),
  );

  leads.forEach((lead) => {
    if (!SALE_STATUSES.has(lead.status)) return;
    const contracted = String(lead.contractedDate || lead.date || '').slice(0, 10);
    const installed = String(lead.installedDate || '').slice(0, 10);
    const bucket = bucketLeadByBusinessType(lead);

    if (bucket === 'plans') {
      if (contracted && byDate[contracted]) byDate[contracted].plans += 1;
      if (installed && byDate[installed]) byDate[installed].installations += 1;
    } else if (bucket === 'sva' && contracted && byDate[contracted]) {
      byDate[contracted].sva += 1;
    } else if (bucket === 'migrations' && contracted && byDate[contracted]) {
      byDate[contracted].migrations += 1;
    }
  });

  return dates.map((d) => byDate[d]);
}

export function buildPreviousWeekDailySeries(leads, analysisDate) {
  return buildDailyTrendSeries(leads, buildTrendPresetRange('week', analysisDate));
}
