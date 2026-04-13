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

export function hasValidLeadCoordinates(value) {
  return Number.isFinite(Number(value?.geoLat)) && Number.isFinite(Number(value?.geoLng));
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

  return primary || String(value.address || '').trim() || String(value.geoFormattedAddress || '').trim() || 'Nao informado';
}

export function parseLeadCoordinateInput(rawValue = '') {
  const normalized = String(rawValue || '')
    .trim()
    .replace(/\s*;\s*/g, ',')
    .replace(/\s+/g, ' ');

  if (!normalized) {
    return { ok: false, error: 'Cole as coordenadas em formato decimal, como -20.8113, -49.3758.' };
  }

  if (/[A-Za-z°'"]/.test(normalized)) {
    return { ok: false, error: 'Use apenas coordenadas decimais simples, sem graus ou letras.' };
  }

  const pieces = normalized.includes(',')
    ? normalized.split(',').map((item) => item.trim()).filter(Boolean)
    : normalized.split(' ').map((item) => item.trim()).filter(Boolean);

  if (pieces.length !== 2) {
    return { ok: false, error: 'Informe latitude e longitude em dois valores decimais.' };
  }

  if (!pieces.every((item) => /^-?\d+(\.\d+)?$/.test(item))) {
    return { ok: false, error: 'Formato invalido. Use ponto decimal, por exemplo: -20.8113, -49.3758.' };
  }

  const lat = Number(pieces[0]);
  const lng = Number(pieces[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, error: 'Nao foi possivel interpretar essas coordenadas.' };
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, error: 'Coordenadas fora do intervalo valido de latitude e longitude.' };
  }

  return { ok: true, lat, lng };
}
