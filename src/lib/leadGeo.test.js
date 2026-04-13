import { describe, expect, it } from 'vitest';

import {
  LEAD_GEO_STATUS,
  buildLeadAddressLabel,
  normalizeLeadGeoStatus,
  parseLeadCoordinateInput,
} from './leadGeo';

describe('normalizeLeadGeoStatus', () => {
  it('keeps known statuses', () => {
    expect(normalizeLeadGeoStatus(LEAD_GEO_STATUS.MAP_CLICKED)).toBe(LEAD_GEO_STATUS.MAP_CLICKED);
  });

  it('falls back to pending for unknown values', () => {
    expect(normalizeLeadGeoStatus('resolved')).toBe(LEAD_GEO_STATUS.PENDING);
    expect(normalizeLeadGeoStatus(null)).toBe(LEAD_GEO_STATUS.PENDING);
  });
});

describe('parseLeadCoordinateInput', () => {
  it('accepts comma separated decimal coordinates', () => {
    expect(parseLeadCoordinateInput('-20.8113, -49.3758')).toEqual({ ok: true, lat: -20.8113, lng: -49.3758 });
  });

  it('accepts space separated decimal coordinates', () => {
    expect(parseLeadCoordinateInput('-20.8113 -49.3758')).toEqual({ ok: true, lat: -20.8113, lng: -49.3758 });
  });

  it('rejects unsupported formats', () => {
    expect(parseLeadCoordinateInput("-20,8113 -49,3758").ok).toBe(false);
    expect(parseLeadCoordinateInput("20°48'40.7\"S").ok).toBe(false);
  });
});

describe('buildLeadAddressLabel', () => {
  it('prioritizes textual address fields over geoFormattedAddress', () => {
    expect(buildLeadAddressLabel({
      addressStreet: 'Rua A',
      addressNumber: '123',
      addressNeighborhood: 'Centro',
      geoFormattedAddress: 'Texto legado',
    })).toBe('Rua A, 123 - Centro');
  });
});
