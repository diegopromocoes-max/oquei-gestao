import { describe, expect, it, vi } from 'vitest';

vi.mock('../firebase', () => ({
  db: {},
  auth: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'server-timestamp'),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(),
  updateDoc: vi.fn(),
  doc: vi.fn(),
  deleteDoc: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
}));

vi.mock('../lib/leadGeo', () => ({
  getLeadCoordinates: vi.fn(() => null),
  LEAD_GEO_STATUS: { PENDING: 'pending' },
  normalizeLeadGeoStatus: vi.fn(() => 'pending'),
}));

import { buildLeadStatusUpdatePayload } from './leads';

describe('buildLeadStatusUpdatePayload', () => {
  it('preserva a contratacao historica ao instalar um lead ja contratado', () => {
    const payload = buildLeadStatusUpdatePayload({
      currentLead: {
        contractedDate: '2026-03-29',
        contractedMonthKey: '2026-03',
      },
      newStatus: 'Instalado',
      today: '2026-04-15',
    });

    expect(payload.installedDate).toBe('2026-04-15');
    expect(payload.installMonthKey).toBe('2026-04');
    expect(payload).not.toHaveProperty('contractedDate');
    expect(payload).not.toHaveProperty('contractedMonthKey');
  });

  it('preenche contratacao fallback quando o lead pula direto para instalado', () => {
    const payload = buildLeadStatusUpdatePayload({
      currentLead: {},
      newStatus: 'Instalado',
      today: '2026-04-15',
    });

    expect(payload.contractedDate).toBe('2026-04-15');
    expect(payload.contractedMonthKey).toBe('2026-04');
    expect(payload.installedDate).toBe('2026-04-15');
    expect(payload.installMonthKey).toBe('2026-04');
  });
});
