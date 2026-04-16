export const LEAD_GEO_STATUS = {
  PENDING: 'pending',
  SEARCH_CANDIDATE: 'search_candidate',
  SEARCH_CONFIRMED: 'search_confirmed',
  MAP_CLICKED: 'map_clicked',
  COORDINATES_PASTED: 'coordinates_pasted',
};

const VALID_GEO_STATUS = new Set(Object.values(LEAD_GEO_STATUS));

export function normalizeLeadGeoStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return VALID_GEO_STATUS.has(normalized) ? normalized : LEAD_GEO_STATUS.PENDING;
}

function parseCoordinateValue(rawValue) {
  if (rawValue === null || rawValue === undefined) return null;
  const normalized = String(rawValue).trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function hasValidLeadCoordinates(value) {
  const lat = parseCoordinateValue(value?.geoLat);
  const lng = parseCoordinateValue(value?.geoLng);
  return (
    lat !== null && lng !== null
    && lat >= -90 && lat <= 90
    && lng >= -180 && lng <= 180
  );
}

export function getLeadCoordinates(value = {}) {
  if (!hasValidLeadCoordinates(value)) return null;
  return {
    lat: Number(String(value.geoLat).trim()),
    lng: Number(String(value.geoLng).trim()),
  };
}

export function hasLeadAddressText(value = {}) {
  return Boolean(
    String(value.addressStreet || value.logradouro || '').trim()
    || String(value.addressNumber || value.numero || '').trim()
    || String(value.addressNeighborhood || value.bairro || '').trim()
    || String(value.address || '').trim(),
  );
}

export function isLeadVisibleOnMap(value = {}) {
  return hasValidLeadCoordinates(value) && hasLeadAddressText(value);
}

export function buildLeadAddressLabel(value = {}) {
  const primary = [
    [value.addressStreet || value.logradouro, value.addressNumber || value.numero]
      .filter(Boolean)
      .join(', '),
    value.addressNeighborhood || value.bairro,
  ].filter(Boolean).join(' - ');

  return (
    primary
    || String(value.address || '').trim()
    || String(value.geoFormattedAddress || '').trim()
    || 'Nao informado'
  );
}

export function parseLeadCoordinateInput(rawValue = '') {
  const normalized = String(rawValue || '')
    .trim()
    .replace(/\s*;\s*/g, ',')
    .replace(/\s+/g, ' ');

  if (!normalized) {
    return { ok: false, error: 'Cole as coordenadas em formato decimal, como -20.8113, -49.3758.' };
  }

  if (/[A-Za-z°'"]/u.test(normalized)) {
    return { ok: false, error: 'Use apenas coordenadas decimais simples, sem graus ou letras.' };
  }

  const pieces = normalized.includes(',')
    ? normalized.split(',').map((item) => item.trim()).filter(Boolean)
    : normalized.split(' ').map((item) => item.trim()).filter(Boolean);

  if (pieces.length !== 2) {
    return { ok: false, error: 'Informe latitude e longitude separados por virgula.' };
  }

  const lat = parseCoordinateValue(pieces[0]);
  const lng = parseCoordinateValue(pieces[1]);

  if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, error: 'Valores invalidos. Use numeros decimais como -20.8113, -49.3758.' };
  }

  if (lat < -90 || lat > 90) {
    return { ok: false, error: 'Latitude invalida. Deve estar entre -90 e 90.' };
  }

  if (lng < -180 || lng > 180) {
    return { ok: false, error: 'Longitude invalida. Deve estar entre -180 e 180.' };
  }

  return { ok: true, lat, lng };
}
