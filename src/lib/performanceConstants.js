export const PERFORMANCE_ROLE_KEYS = ['attendant', 'atendente'];

export const PERFORMANCE_TABS = [
  'Visao Geral',
  'Comercial',
  'Comportamental',
  'Frequencia e Participacao',
  'Feedbacks',
  'Plano de Acao',
  'Evolucao',
  'Configuracoes',
];

export const PERFORMANCE_COMPETENCIES = [
  { id: 'communication', label: 'Comunicacao' },
  { id: 'professional_posture', label: 'Postura profissional' },
  { id: 'organization', label: 'Organizacao' },
  { id: 'discipline', label: 'Disciplina' },
  { id: 'proactivity', label: 'Proatividade' },
  { id: 'empathy', label: 'Empatia no atendimento' },
  { id: 'teamwork', label: 'Trabalho em equipe' },
  { id: 'result_focus', label: 'Foco em resultado' },
  { id: 'learning', label: 'Aprendizado e adaptabilidade' },
  { id: 'process_compliance', label: 'Cumprimento de processos' },
];

export const PERFORMANCE_ALERT_LABELS = {
  below_target_3_weeks: '3 semanas abaixo da meta',
  conversion_drop: 'Queda brusca na conversao',
  attendance_rise: 'Aumento de faltas ou atrasos',
  feedback_overdue: 'Feedback vencido',
  overdue_plan: 'Plano de acao vencido',
  stalled_evolution: 'Sem evolucao relevante',
  improvement_streak: 'Melhora consistente',
};

export const PERFORMANCE_PLAN_HORIZONS = [
  { value: 'curto', label: 'Curto prazo' },
  { value: 'medio', label: 'Medio prazo' },
  { value: 'longo', label: 'Longo prazo' },
];

export const PERFORMANCE_PLAN_STATUSES = [
  'Pendente',
  'Em andamento',
  'Concluida',
  'Cancelada',
];

export const PERFORMANCE_PRIORITY_OPTIONS = [
  'Baixa',
  'Media',
  'Alta',
  'Critica',
];

export const PERFORMANCE_PARTICIPATION_TYPES = [
  'Treinamento',
  'Campanha',
  'Reuniao',
  'Acao interna',
  'Workshop',
];

export const DEFAULT_ATTENDANT_SCORE_CONFIG = {
  role: 'attendant',
  roleLabel: 'Time de vendas',
  weights: {
    commercial: 50,
    behavior: 20,
    attendance: 15,
    engagement: 15,
  },
  thresholds: {
    green: 80,
    yellow: 60,
  },
  feedbackWindowDays: 10,
  alertThresholds: {
    conversionDrop: 15,
    attendanceRise: 2,
    stalledScoreDelta: 3,
    improvementStreakCount: 4,
  },
};
