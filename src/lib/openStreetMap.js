const LEAFLET_CSS_ID = 'leaflet-css';
const LEAFLET_SCRIPT_ID = 'leaflet-js';
const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_SCRIPT_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

const OSM_STANDARD_SPEC = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  options: {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  },
};

const CARTO_VOYAGER_SPEC = {
  url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  options: {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20,
  },
};

const CARTO_DARK_SPEC = {
  url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  options: {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19,
  },
};

const ESRI_SATELLITE_SPEC = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  options: {
    attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
};

const CARTO_VOYAGER_LABELS_SPEC = {
  url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
  options: {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20,
    pane: 'overlayPane',
  },
};

const MAP_LAYER_CATALOG = [
  {
    key: 'osm-standard',
    label: 'Mapa padrao',
    layers: [OSM_STANDARD_SPEC],
  },
  {
    key: 'carto-voyager',
    label: 'Mapa urbano',
    layers: [CARTO_VOYAGER_SPEC],
  },
  {
    key: 'carto-dark',
    label: 'Modo black',
    layers: [CARTO_DARK_SPEC],
  },
  {
    key: 'esri-satellite',
    label: 'Satelite',
    layers: [ESRI_SATELLITE_SPEC],
  },
  {
    key: 'esri-satellite-labels',
    label: 'Satelite com rotulos',
    layers: [ESRI_SATELLITE_SPEC, CARTO_VOYAGER_LABELS_SPEC],
  },
];

const MAP_LAYER_LOOKUP = Object.fromEntries(MAP_LAYER_CATALOG.map((layer) => [layer.key, layer]));

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

  if (normalizedCity && resultCity === normalizedCity) score += 70;
  else if (normalizedCity && display.includes(normalizedCity)) score += 45;
  else if (normalizedCity) score -= 80;
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
      <div style="position:relative;width:26px;height:36px;display:flex;align-items:flex-start;justify-content:center;">
        <span style="position:absolute;top:1px;left:50%;width:20px;height:20px;border-radius:999px;background:#ffffff;transform:translateX(-50%);box-shadow:0 8px 18px rgba(15,23,42,0.18);"></span>
        <span style="position:absolute;top:0;left:50%;width:26px;height:26px;border-radius:999px 999px 999px 0;background:${safeColor};transform:translateX(-50%) rotate(-45deg);box-shadow:0 10px 20px rgba(15,23,42,0.22);"></span>
        <span style="position:absolute;top:7px;left:50%;width:10px;height:10px;border-radius:999px;background:${safeColor};border:3px solid #ffffff;transform:translateX(-50%);z-index:2;"></span>
      </div>
    `,
    iconSize: [26, 36],
    iconAnchor: [13, 34],
    popupAnchor: [0, -30],
  });
}

function resolveMapLayerDefinition(layerKey = 'osm-standard') {
  return MAP_LAYER_LOOKUP[layerKey] || MAP_LAYER_LOOKUP['osm-standard'];
}

export function getMapLayerCatalog() {
  return MAP_LAYER_CATALOG.map(({ key, label }) => ({ key, label }));
}

export function createLeafletMapLayer(L, layerKey = 'osm-standard', { onFallback } = {}) {
  if (!L) {
    return null;
  }

  const requestedDefinition = resolveMapLayerDefinition(layerKey);
  const fallbackDefinition = resolveMapLayerDefinition('osm-standard');
  const group = L.layerGroup();
  let activeLayers = [];
  let fallbackApplied = false;

  const mountDefinition = (definition, allowFallback = true) => {
    activeLayers.forEach((layer) => group.removeLayer(layer));
    activeLayers = definition.layers.map((spec) => {
      const tileLayer = L.tileLayer(spec.url, spec.options);
      if (allowFallback && definition.key !== fallbackDefinition.key) {
        tileLayer.on('tileerror', () => {
          if (fallbackApplied) return;
          fallbackApplied = true;
          mountDefinition(fallbackDefinition, false);
          onFallback?.(fallbackDefinition.key, definition.key);
        });
      }
      group.addLayer(tileLayer);
      return tileLayer;
    });
    group.__oqueiLayerKey = definition.key;
  };

  mountDefinition(requestedDefinition, true);
  return group;
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

  const normalizedCity = normalizeText(cityName);
  const mappedResults = (Array.isArray(results) ? results : [])
    .map((item) => ({
      ...item,
      lat: Number(item.lat),
      lng: Number(item.lon),
      ...parseNominatimAddress(item),
    }));

  const cityMatchedResults = normalizedCity
    ? mappedResults.filter((item) => {
      const resultCity = normalizeText(item.cidade || item.city || '');
      const display = normalizeText(item.display_name || '');
      return resultCity === normalizedCity || display.includes(normalizedCity);
    })
    : mappedResults;

  const candidates = cityMatchedResults.length ? cityMatchedResults : mappedResults;

  return candidates
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

  const activeLayer = createLeafletMapLayer(L, 'osm-standard');
  activeLayer?.addTo(mapInstance);
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
