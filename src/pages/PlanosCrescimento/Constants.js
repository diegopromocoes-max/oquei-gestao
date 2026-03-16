export const ALL_CITIES = '__all__';
export const CATEGORY_OPTIONS = ['Marketing', 'Comercial', 'Operacional', 'Relacionamento', 'Outras'];
export const STATUS_OPTIONS = ['Planejamento', 'Em Andamento', 'Finalizada', 'Cancelada'];
export const OUTCOME_OPTIONS = [{ value: 'positivo', label: 'Positivo' }, { value: 'negativo', label: 'Negativo' }, { value: 'neutro', label: 'Neutro' }];
export const REPLICABLE_OPTIONS = [{ value: 'sim', label: 'Sim' }, { value: 'nao', label: 'Não' }];

export const TAB_LABELS = ['Dashboard & Impacto', 'Criar Nova Ação', 'Acompanhamento Ativo', 'Debriefing (Finalizadas)'];
export const FOCUS_OPTIONS = ['Vendas Novas', 'Migrações/Up-Sell', 'Retenção/Anti-Churn', 'Posicionamento de Marca', 'Recuperação de Inadimplentes', 'Outro'];
export const BASE_OBJECTIVES = [
  'Posicionamento de Marca', 'Geração de Demanda', 'Aumentar Conversão', 
  'Troca de Equipamentos', 'Redução de Churn', 'Campanha de Indicação'
];

export const STATUS_BADGE = { 'Planejamento': 'neutral', 'Em Andamento': 'primary', 'Finalizada': 'success', 'Cancelada': 'danger' };
export const OUTCOME_BADGE = { 'positivo': 'success', 'negativo': 'danger', 'neutro': 'warning' };

export function getInitialForm() {
  return {
    name: '', category: 'Marketing', objectives: [], description: '',
    responsibles: [{ name: '', sector: '' }], startDate: '', endDate: '', cost: '', 
    actionFocus: FOCUS_OPTIONS[0], status: 'Planejamento', dynamicMetrics: [], 
    outcome: 'neutro', replicable: 'nao', resultsSummary: '', actualBaseImpact: '', 
    objectiveAchieved: '' // <-- NOVO CAMPO
  };
}

// NOVO: Função que calcula Orçamento Inicial + Acréscimos nas Etapas
export const calcTotalBudget = (plan) => {
  const initial = Number(plan.cost || 0);
  const steps = [...(plan.planningSteps || []), ...(plan.executionSteps || [])];
  const extra = steps.reduce((acc, s) => acc + Number(s.additionalBudget || 0), 0);
  return initial + extra;
};