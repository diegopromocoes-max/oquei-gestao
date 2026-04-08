const LEAFLET_CSS_ID = 'leaflet-css';
const LEAFLET_SCRIPT_ID = 'leaflet-js';
const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_SCRIPT_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

const BASE_MAP_PROVIDERS = [
  {
    key: 'carto-dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    options: {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    },
  },
  {
    key: 'carto-voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    options: {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20,
    },
  },
  {
    key: 'osm-standard',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    },
  },
];

let leafletPromise = null;

function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function uniqueParts(parts = []) {
  return Array.from(new Set(parts.filter(Boolean).map((item) => String(item).trim()).filter(Boolean)));
}

function buildAddressVariants(query, cityName = '', context = {}) {
  const street = String(context.street || context.logradouro || '').trim();
  const number = String(context.number || context.numero || '').trim();
  const neighborhood = String(context.neighborhood || context.bairro || '').trim();
  const city = String(cityName || context.cityName || context.cidade || '').trim();
  const mainQuery = String(query || '').trim();
  const streetLine = [street, number].filter(Boolean).join(', ');

  return uniqueParts([
    [mainQuery, neighborhood, city, 'Brasil'].filter(Boolean).join(', '),
    [streetLine || mainQuery, neighborhood, city, 'Brasil'].filter(Boolean).join(', '),
    [streetLine || mainQuery, city, 'Brasil'].filter(Boolean).join(', '),
    [mainQuery, city].filter(Boolean).join(', '),
    mainQuery,
  ]);
}

function scoreSearchResult(result, { cityName = '', neighborhood = '', street = '', number = '' } = {}) {
  const display = normalizeText(result.display_name || '');
  const resultCity = normalizeText(result.cidade || result.city || '');
  const resultNeighborhood = normalizeText(result.bairro || result.addressNeighborhood || '');
  const resultStreet = normalizeText(result.logradouro || result.addressStreet || '');
  const normalizedCity = normalizeText(cityName);
  const normalizedNeighborhood = normalizeText(neighborhood);
  const normalizedStreet = normalizeText(street);
  const normalizedNumber = normalizeText(number);

  let score = 0;

  if (normalizedCity && (resultCity === normalizedCity || display.includes(normalizedCity))) score += 45;
  if (normalizedNeighborhood && (resultNeighborhood === normalizedNeighborhood || display.includes(normalizedNeighborhood))) score += 35;
  if (normalizedStreet && (resultStreet === normalizedStreet || display.includes(normalizedStreet))) score += 30;
  if (normalizedNumber && display.includes(normalizedNumber)) score += 16;
  if (display.includes('brasil')) score += 4;
  if (String(result.addresstype || result.type || '').match(/house|building|residential|road/i)) score += 6;

  return score;
}

export function parseNominatimAddress(result = {}) {
  const address = result.address || {};
  return {
    logradouro: address.road || address.pedestrian || address.footway || address.path || address.cycleway || '',
    numero: address.house_number || '',
    bairro:
      address.suburb
      || address.neighbourhood
      || address.quarter
      || address.borough
      || address.city_district
      || address.residential
      || address.hamlet
      || '',
    cidade: address.city || address.town || address.village || address.municipality || address.county || '',
    formattedAddress: result.display_name || '',
  };
}

export function createLeafletPinIcon(color = '#2563eb') {
  const safeColor = String(color || '#2563eb');
  return window.L.divIcon({
    className: 'oquei-leaflet-pin',
    html: `
      <div style="position:relative;width:22px;height:22px;">
        <span style="position:absolute;inset:0;border-radius:999px;background:${safeColor};border:3px solid #ffffff;box-shadow:0 8px 18px rgba(15,23,42,0.28);display:block;"></span>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  });
}

async function fetchNominatim(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao consultar o mapa livre (${response.status}).`);
  }

  return response.json();
}

export async function searchAddress(query, cityName = '', context = {}) {
  const variants = buildAddressVariants(query, cityName, context);
  if (!variants.length) {
    return [];
  }

  let results = [];
  for (const variant of variants) {
    const url = `${NOMINATIM_BASE_URL}/search?format=jsonv2&addressdetails=1&limit=8&countrycodes=br&q=${encodeURIComponent(variant)}`;
    const payload = await fetchNominatim(url);
    if (Array.isArray(payload) && payload.length > 0) {
      results = payload;
      break;
    }
  }

  return (Array.isArray(results) ? results : [])
    .map((item) => ({
      ...item,
      lat: Number(item.lat),
      lng: Number(item.lon),
      ...parseNominatimAddress(item),
    }))
    .sort((left, right) => (
      scoreSearchResult(right, {
        cityName,
        neighborhood: context.neighborhood || context.bairro,
        street: context.street || context.logradouro || query,
        number: context.number || context.numero,
      })
      - scoreSearchResult(left, {
        cityName,
        neighborhood: context.neighborhood || context.bairro,
        street: context.street || context.logradouro || query,
        number: context.number || context.numero,
      })
    ));
}

export async function reverseGeocode(lat, lng, context = {}) {
  const url = `${NOMINATIM_BASE_URL}/reverse?format=jsonv2&addressdetails=1&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
  const result = await fetchNominatim(url);
  const parsed = parseNominatimAddress(result);
  const fallbackNeighborhood = String(context.neighborhood || context.bairro || '').trim();
  const fallbackStreet = String(context.street || context.logradouro || '').trim();
  const fallbackNumber = String(context.number || context.numero || '').trim();

  return {
    ...result,
    lat: Number(result.lat ?? lat),
    lng: Number(result.lon ?? lng),
    ...parsed,
    bairro: parsed.bairro || fallbackNeighborhood,
    logradouro: parsed.logradouro || fallbackStreet,
    numero: parsed.numero || fallbackNumber,
  };
}

export function addProfessionalTileLayer(L, mapInstance) {
  if (!L || !mapInstance) {
    return null;
  }

  let activeLayer = null;
  let providerIndex = 0;
  let switched = false;

  const applyProvider = (index) => {
    const provider = BASE_MAP_PROVIDERS[index] || BASE_MAP_PROVIDERS[0];
    const layer = L.tileLayer(provider.url, provider.options);

    layer.on('tileerror', () => {
      if (switched || providerIndex >= BASE_MAP_PROVIDERS.length - 1) {
        return;
      }
      switched = true;
      providerIndex += 1;
      if (activeLayer) {
        mapInstance.removeLayer(activeLayer);
      }
      activeLayer = applyProvider(providerIndex);
    });

    layer.addTo(mapInstance);
    return layer;
  };

  activeLayer = applyProvider(providerIndex);
  return activeLayer;
}

function getExistingLeafletScript() {
  return document.getElementById(LEAFLET_SCRIPT_ID) || document.getElementById('leaflet-script');
}

export function loadLeafletAssets() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Mapa indisponivel fora do navegador.'));
  }

  if (window.L?.map) {
    return Promise.resolve(window.L);
  }

  if (leafletPromise) {
    return leafletPromise;
  }

  leafletPromise = new Promise((resolve, reject) => {
    if (!document.getElementById(LEAFLET_CSS_ID)) {
      const css = document.createElement('link');
      css.id = LEAFLET_CSS_ID;
      css.rel = 'stylesheet';
      css.href = LEAFLET_CSS_URL;
      document.head.appendChild(css);
    }

    const existingScript = getExistingLeafletScript();
    if (existingScript) {
      if (window.L?.map) {
        resolve(window.L);
        return;
      }
      existingScript.addEventListener('load', () => resolve(window.L), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Nao foi possivel carregar o mapa livre.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = LEAFLET_SCRIPT_ID;
    script.async = true;
    script.src = LEAFLET_SCRIPT_URL;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error('Nao foi possivel carregar o mapa livre.'));
    document.body.appendChild(script);
  });

  return leafletPromise;
}
