export const ROLE_KEYS = {
  COORDINATOR: 'coordinator',
  SUPERVISOR: 'supervisor',
  ATTENDANT: 'attendant',
  GROWTH: 'growth_team',
  RESEARCHER: 'researcher',
  GUEST: 'guest',
};

export const ROLE_LABELS = {
  [ROLE_KEYS.COORDINATOR]: 'Coordenador',
  [ROLE_KEYS.SUPERVISOR]: 'Supervisor',
  [ROLE_KEYS.ATTENDANT]: 'Atendente',
  [ROLE_KEYS.GROWTH]: 'Growth',
  [ROLE_KEYS.RESEARCHER]: 'Pesquisador',
  [ROLE_KEYS.GUEST]: 'Visitante',
};

export function normalizeRole(value) {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/[\s_-]/g, '')
    .trim();

  if (['coordinator', 'coordenador', 'master', 'diretor'].includes(normalized)) {
    return ROLE_KEYS.COORDINATOR;
  }

  if (normalized === 'supervisor') {
    return ROLE_KEYS.SUPERVISOR;
  }

  if (['attendant', 'atendente'].includes(normalized)) {
    return ROLE_KEYS.ATTENDANT;
  }

  if (['growthteam', 'growth_team', 'equipegrowth'].includes(normalized)) {
    return ROLE_KEYS.GROWTH;
  }

  if (['researcher', 'pesquisador', 'fieldresearcher'].includes(normalized)) {
    return ROLE_KEYS.RESEARCHER;
  }

  return ROLE_KEYS.GUEST;
}
