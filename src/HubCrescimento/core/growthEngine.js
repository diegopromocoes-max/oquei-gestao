const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const safeRatio = (a, b) => (b > 0 ? a / b : 0);

export function calculateGrowthScore({
  vendasMes = 0,
  metaVendas = 0,
  novosClientes = 0,
  baseAnterior = 0,
  cancelamentos = 0,
  base = 0,
  mediaProgressosPlanos = 0,
} = {}) {
  const salesRatio = clamp(safeRatio(vendasMes, metaVendas));
  const growthRatio = clamp(safeRatio(novosClientes, baseAnterior));
  const churnRatio = clamp(1 - safeRatio(cancelamentos, base));

  const execRatio = mediaProgressosPlanos > 1
    ? clamp(mediaProgressosPlanos / 100)
    : clamp(mediaProgressosPlanos);

  const sales = salesRatio * 40;
  const growth = growthRatio * 30;
  const retention = churnRatio * 20;
  const execution = execRatio * 10;

  const total = Math.round(sales + growth + retention + execution);

  return {
    total,
    breakdown: {
      sales: Math.round(sales),
      growth: Math.round(growth),
      retention: Math.round(retention),
      execution: Math.round(execution),
    },
  };
}
