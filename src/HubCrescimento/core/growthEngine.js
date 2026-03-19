// ============================================================
// src/HubCrescimento/core/growthEngine.js
// ============================================================
const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const safeRatio = (a, b) => (b > 0 ? a / b : 0);

export function calculateGrowthScore({
  totalPlans = 0,
  leadsGenerated = 0,
  conversionRate = 0,
  roi = 0,
  progressAvg = 0,
} = {}) {
  // 1. VENDAS (40 pts): Alcance ideal de Conversão (Ex: 10% garante 100% dos pontos)
  const salesRatio = clamp(conversionRate / 10);
  const sales = salesRatio * 40;

  // 2. CRESCIMENTO (30 pts): Saúde do ROI (Ex: ROI >= 50% garante 100% dos pontos)
  // Se o custo for zero mas gerou leads, assumimos crescimento perfeito
  const growthRatio = (roi > 0) ? clamp(roi / 50) : (leadsGenerated > 0 ? 1 : 0);
  const growth = growthRatio * 30;

  // 3. RETENÇÃO / FUNIL (20 pts): Engajamento das Ações (Média de 10 leads por plano ativo)
  const leadsPerPlan = totalPlans > 0 ? leadsGenerated / totalPlans : 0;
  const retentionRatio = clamp(leadsPerPlan / 10);
  const retention = retentionRatio * 20;

  // 4. EXECUÇÃO (10 pts): Progresso das tarefas nos planos
  const execRatio = clamp(progressAvg / 100);
  const execution = execRatio * 10;

  return {
    total: Math.round(sales + growth + retention + execution),
    breakdown: {
      sales: Math.round(sales),
      growth: Math.round(growth),
      retention: Math.round(retention),
      execution: Math.round(execution),
    },
  };
}

// ... (Mantenha a função generateInsights que já existe no final do ficheiro)