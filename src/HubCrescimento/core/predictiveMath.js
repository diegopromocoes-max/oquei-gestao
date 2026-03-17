// ============================================================
//  core/predictiveMath.js — Hub Crescimento
//  DAS v1.0: Engine de pacing linear para projecao de fechamento
//  de mes com base no ritmo atual de execucao.
// ============================================================

/**
 * Calcula quantos dias uteis ja se passaram e quantos restam no mes.
 * Considera apenas dias de segunda a sexta.
 */
function calcBusinessDays(year, month) {
  const today     = new Date();
  const lastDay   = new Date(year, month, 0).getDate(); // ultimo dia do mes
  let elapsed = 0;
  let remaining = 0;

  for (let d = 1; d <= lastDay; d++) {
    const dow = new Date(year, month - 1, d).getDay(); // 0=Dom, 6=Sab
    if (dow === 0 || dow === 6) continue;
    if (d <= today.getDate()) elapsed++;
    else remaining++;
  }

  return { elapsed, remaining, total: elapsed + remaining };
}

/**
 * Projeta o valor final do mes com base no ritmo atual (pacing linear).
 *
 * Formula:
 *   pacingDiario = realizado / diasDecorridos
 *   projecao     = realizado + (pacingDiario * diasRestantes)
 *   gap          = projecao - meta
 *   gapPercent   = (gap / meta) * 100
 *
 * @param {object} params
 * @param {number} params.realizado      - Valor acumulado ate hoje
 * @param {number} params.meta           - Meta total do mes
 * @param {string} params.month          - Formato "YYYY-MM"
 * @returns {object} Resultado do pacing
 */
export function calculatePacing({
  realizado = 0,
  meta = 0,
  month = '',
} = {}) {
  // Parse do mes
  const [year, mon] = month
    ? month.split('-').map(Number)
    : [new Date().getFullYear(), new Date().getMonth() + 1];

  const { elapsed, remaining, total } = calcBusinessDays(year, mon);

  // Sem dias decorridos: ritmo desconhecido
  if (elapsed === 0) {
    return {
      projecao:        0,
      pacingDiario:    0,
      gap:             -meta,
      gapPercent:      meta > 0 ? -100 : 0,
      percentDecorrido: 0,
      percentRealizado: 0,
      diasElapsed:     0,
      diasRemaining:   remaining,
      diasTotal:       total,
      status:          'inicio',
    };
  }

  const pacingDiario = realizado / elapsed;
  const projecao     = Math.round(realizado + pacingDiario * remaining);
  const gap          = projecao - meta;
  const gapPercent   = meta > 0 ? (gap / meta) * 100 : 0;
  const percentDecorrido = Math.round((elapsed / total) * 100);
  const percentRealizado = meta > 0 ? Math.round((realizado / meta) * 100) : 0;

  // Status semaforo
  let status;
  if (gapPercent >= 5)        status = 'acima';      // projecao supera a meta
  else if (gapPercent >= -5)  status = 'no_ritmo';   // dentro da margem de 5%
  else if (gapPercent >= -20) status = 'atencao';    // risco moderado
  else                        status = 'critico';    // risco alto

  return {
    projecao,
    pacingDiario: Math.round(pacingDiario * 10) / 10,
    gap,
    gapPercent:   Math.round(gapPercent * 10) / 10,
    percentDecorrido,
    percentRealizado,
    diasElapsed:  elapsed,
    diasRemaining: remaining,
    diasTotal:    total,
    status,
  };
}

/**
 * Calcula o pacing para multiplas acoes (conversao por acao - RF09-C).
 *
 * @param {Array} plans     - Lista de action_plans com leadsGenerated e leadsTarget
 * @param {string} month    - Formato "YYYY-MM"
 * @returns {Array}         - Planos enriquecidos com dados de pacing e conversao
 */
export function calculatePacingByAction(plans = [], month = '') {
  return plans.map((plan) => {
    const leadsGerados    = Number(plan.leadsGenerated  || 0);
    const leadsMeta       = Number(plan.leadsTarget     || 0);
    const leadsConvertidos = Number(plan.leadsConverted || 0);

    // RF09-C: Conversao por Acao = (leads convertidos / total leads da acao) * 100
    const conversionRate = leadsGerados > 0
      ? Math.round((leadsConvertidos / leadsGerados) * 100 * 10) / 10
      : 0;

    const pacing = leadsMeta > 0
      ? calculatePacing({ realizado: leadsGerados, meta: leadsMeta, month })
      : null;

    return {
      ...plan,
      leadsGerados,
      leadsMeta,
      leadsConvertidos,
      conversionRate,
      pacing,
    };
  });
}

/** Mapa de status para cor semântica do design system */
export const PACING_STATUS_COLOR = {
  acima:     'success',
  no_ritmo:  'primary',
  atencao:   'warning',
  critico:   'danger',
  inicio:    'neutral',
};

/** Label legível para o status */
export const PACING_STATUS_LABEL = {
  acima:     'Acima do ritmo',
  no_ritmo:  'No ritmo',
  atencao:   'Atencao',
  critico:   'Critico',
  inicio:    'Inicio do mes',
};