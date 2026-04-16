import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Expand,
  Filter,
  Layers3,
  MapPin,
  Minimize2,
  MoonStar,
  Navigation,
  RefreshCw,
  TrendingUp,
  X,
} from 'lucide-react';

import LeadAddressMapModal from '../components/LeadAddressMapModal';
import { Btn, Card, InfoBox, Modal, Page, colors, styles as uiStyles } from '../components/ui';
import {
  getLeadCoordinates,
  LEAD_GEO_STATUS,
  buildLeadAddressLabel,
  hasValidLeadCoordinates,
  isLeadVisibleOnMap,
  normalizeLeadGeoStatus,
} from '../lib/leadGeo';
import {
  createLeafletMapLayer,
  createLeafletPinIcon,
  getMapLayerCatalog,
  loadLeafletAssets,
} from '../lib/openStreetMap';
import { listenAttendantLeadMap } from '../services/attendantLeadMapService';
import { updateLeadDetails } from '../services/leads';
import {
  createLeadDiscardReason,
  listLeadDiscardReasons,
  NEW_LEAD_DISCARD_REASON_VALUE,
} from '../services/leadDiscardReasonsService';

const STATUS_FILTER_CARDS = [
  {
    key: 'won',
    label: 'Contratado / Instalado',
    accent: colors.success,
    description: 'Leads que viraram resultado',
    matches: (status) => ['Contratado', 'Instalado'].includes(normalizeStatus(status)),
  },
  {
    key: 'negotiation',
    label: 'Em negociacao',
    accent: '#f97316',
    description: 'Oportunidades em aberto',
    matches: (status) => normalizeStatus(status) === 'Em negociacao',
  },
  {
    key: 'discarded',
    label: 'Descartado',
    accent: colors.danger,
    description: 'Perdas e saidas do funil',
    matches: (status) => normalizeStatus(status) === 'Descartado',
  },
  {
    key: 'other',
    label: 'Outros',
    accent: colors.neutral,
    description: 'Status fora do padrao principal',
    matches: (status) => !['Contratado', 'Instalado', 'Em negociacao', 'Descartado'].includes(normalizeStatus(status)),
  },
];

const DEFAULT_CENTER = [-20.8113, -49.3758];
const DEFAULT_LAYER_KEY = 'osm-standard';
const MAP_LAYER_OPTIONS = getMapLayerCatalog();

function normalizeStatus(value) {
  const safe = String(value || '').toLowerCase();
  if (safe.includes('instal')) return 'Instalado';
  if (safe.includes('contrat')) return 'Contratado';
  if (safe.includes('descart')) return 'Descartado';
  if (safe.includes('negocia')) return 'Em negociacao';
  return value || 'Outro';
}

function getMonthDateBounds(monthKey) {
  const safeMonth = /^\d{4}-\d{2}$/.test(String(monthKey || ''))
    ? String(monthKey)
    : new Date().toISOString().slice(0, 7);
  const [year, month] = safeMonth.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${safeMonth}-01`,
    end: `${safeMonth}-${String(lastDay).padStart(2, '0')}`,
  };
}

function normalizeLeadDateValue(lead) {
  return String(lead?.date || '').slice(0, 10);
}

function leadMatchesDateRange(lead, range) {
  const leadDate = normalizeLeadDateValue(lead);
  if (!leadDate) return true;
  if (range?.start && leadDate < range.start) return false;
  if (range?.end && leadDate > range.end) return false;
  return true;
}

function formatDateLabel(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))
    ? String(value).split('-').reverse().join('/')
    : '--/--/----';
}

function markerColorForStatus(status) {
  switch (normalizeStatus(status)) {
    case 'Contratado':
    case 'Instalado':
      return colors.success;
    case 'Em negociacao':
      return '#f97316';
    case 'Descartado':
      return colors.danger;
    default:
      return colors.neutral;
  }
}

function matchesSelectedBuckets(status, selectedBuckets) {
  if (!selectedBuckets.length) return true;
  return STATUS_FILTER_CARDS.some((card) => selectedBuckets.includes(card.key) && card.matches(status));
}

function buildPopupHtml(lead) {
  return `
    <div style="display:grid;gap:10px;min-width:260px;padding:6px 4px;">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
        <strong style="font-size:15px;color:#0f172a;line-height:1.3;">${lead.customerName || 'Lead sem nome'}</strong>
        <span style="padding:4px 8px;border-radius:999px;background:rgba(15,23,42,0.08);font-size:11px;font-weight:800;color:#334155;white-space:nowrap;">${lead.status || 'Em negociacao'}</span>
      </div>
      <div style="display:grid;gap:6px;font-size:12px;color:#475569;line-height:1.5;">
        <div><strong>Produto:</strong> ${lead.productName || 'Nao informado'}</div>
        <div><strong>Origem:</strong> ${lead.origin || 'Nao informada'}</div>
        <div><strong>Telefone:</strong> ${lead.customerPhone || 'Nao informado'}</div>
        <div><strong>Loja:</strong> ${lead.cityName || lead.cityId || 'Nao informada'}</div>
        <div><strong>Endereco:</strong> ${buildLeadAddressLabel(lead)}</div>
      </div>
      <button type="button" data-edit-lead-id="${lead.id}" style="margin-top:4px;padding:10px 12px;border-radius:10px;border:1px solid rgba(37,99,235,0.2);background:rgba(37,99,235,0.08);color:#2563eb;font-size:12px;font-weight:800;cursor:pointer;">
        Editar lead
      </button>
    </div>
  `;
}

function normalizeLeadForEdit(lead) {
  const coordinates = getLeadCoordinates(lead);
  return {
    ...lead,
    id: lead?.id || '',
    nome: lead.customerName || '',
    tel: lead.customerPhone || '',
    email: lead.customerEmail || '',
    cpf: lead.customerCpf || '',
    logradouro: lead.addressStreet || '',
    numero: lead.addressNumber || '',
    bairro: lead.addressNeighborhood || '',
    geoLat: coordinates?.lat ?? null,
    geoLng: coordinates?.lng ?? null,
    geoStatus: normalizeLeadGeoStatus(lead.geoStatus),
    geoFormattedAddress: lead.geoFormattedAddress || '',
    status: lead.status || 'Em negociacao',
    discardMotive: lead.discardMotive || '',
    fidelityMonth: lead.fidelityMonth || '',
  };
}

function formatPhone(value) {
  let next = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (next.length <= 10) {
    next = next.replace(/^(\d{2})(\d)/, '($1) $2');
    next = next.replace(/(\d{4})(\d)/, '$1-$2');
    return next.slice(0, 14);
  }
  next = next.replace(/^(\d{2})(\d)/, '($1) $2');
  next = next.replace(/(\d{5})(\d)/, '$1-$2');
  return next.slice(0, 15);
}

function serializeBounds(bounds) {
  if (!bounds) return null;
  return {
    south: bounds.getSouth(),
    west: bounds.getWest(),
    north: bounds.getNorth(),
    east: bounds.getEast(),
  };
}

function boundsToArray(selectionBounds) {
  if (!selectionBounds) return null;
  return [
    [selectionBounds.south, selectionBounds.west],
    [selectionBounds.north, selectionBounds.east],
  ];
}

function buildBoundsFromSelection(L, selectionBounds) {
  if (!L || !selectionBounds) return null;
  return L.latLngBounds(
    [selectionBounds.south, selectionBounds.west],
    [selectionBounds.north, selectionBounds.east],
  );
}

function isMeaningfulBounds(bounds) {
  if (!bounds?.isValid?.()) return false;
  return (
    Math.abs(bounds.getNorth() - bounds.getSouth()) > 0.00001
    || Math.abs(bounds.getEast() - bounds.getWest()) > 0.00001
  );
}

function leadInsideBounds(lead, selectionBounds) {
  if (!selectionBounds) return true;
  const coordinates = getLeadCoordinates(lead);
  if (!coordinates) return false;
  return (
    coordinates.lat >= selectionBounds.south
    && coordinates.lat <= selectionBounds.north
    && coordinates.lng >= selectionBounds.west
    && coordinates.lng <= selectionBounds.east
  );
}

function formatCoordinateValue(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(5) : '--';
}

export default function MeuMapaLeads({ userData }) {
  const rootRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const baseLayerRef = useRef(null);
  const selectionLayerRef = useRef(null);
  const selectionDraftRef = useRef(null);
  const selectionStartRef = useRef(null);
  const selectionDraftBoundsRef = useRef(null);
  const isSelectingRef = useRef(false);

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [dateRange, setDateRange] = useState(() => getMonthDateBounds(new Date().toISOString().slice(0, 7)));
  const [selectedBuckets, setSelectedBuckets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState('');
  const [leads, setLeads] = useState([]);
  const [notification, setNotification] = useState(null);
  const [updateModal, setUpdateModal] = useState(null);
  const [editMapOpen, setEditMapOpen] = useState(false);
  const [discardReasons, setDiscardReasons] = useState([]);
  const [showNewDiscardReasonCreator, setShowNewDiscardReasonCreator] = useState(false);
  const [newDiscardReasonName, setNewDiscardReasonName] = useState('');
  const [creatingDiscardReason, setCreatingDiscardReason] = useState(false);
  const [discardReasonError, setDiscardReasonError] = useState('');
  const [addressBaseline, setAddressBaseline] = useState(null);
  const [pendingAddressInvalidation, setPendingAddressInvalidation] = useState(null);
  const [activeLayerKey, setActiveLayerKey] = useState(DEFAULT_LAYER_KEY);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cursorLatLng, setCursorLatLng] = useState(null);
  const [selectionBounds, setSelectionBounds] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    window.setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    if (!userData?.uid) return undefined;

    setLoading(true);
    setError('');
    return listenAttendantLeadMap(
      userData.uid,
      selectedMonth,
      (data) => {
        setLeads(data);
        setLoading(false);
      },
      (serviceError) => {
        setLeads([]);
        setLoading(false);
        setError(serviceError?.code === 'permission-denied' ? 'Sem permissao para consultar o mapa dos seus leads.' : 'Nao foi possivel carregar o mapa dos seus leads.');
      },
    );
  }, [selectedMonth, userData?.uid]);

  useEffect(() => {
    setDateRange(getMonthDateBounds(selectedMonth));
    setSelectionBounds(null);
  }, [selectedMonth]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const fullscreen = document.fullscreenElement === rootRef.current;
      setIsFullscreen(fullscreen);
      window.requestAnimationFrame(() => mapInstanceRef.current?.invalidateSize());
      window.setTimeout(() => mapInstanceRef.current?.invalidateSize(), 180);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    let active = true;
    listLeadDiscardReasons()
      .then((items) => {
        if (!active) return;
        setDiscardReasons(items);
      })
      .catch((serviceError) => {
        console.error('Erro ao carregar motivos de descarte no mapa:', serviceError);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!updateModal) {
      setAddressBaseline(null);
      setPendingAddressInvalidation(null);
      return;
    }

    setAddressBaseline({
      logradouro: updateModal.logradouro || '',
      numero: updateModal.numero || '',
      bairro: updateModal.bairro || '',
    });
  }, [updateModal?.id]);

  const monthDateBounds = useMemo(
    () => getMonthDateBounds(selectedMonth),
    [selectedMonth],
  );

  const periodLeads = useMemo(
    () => leads.filter((lead) => leadMatchesDateRange(lead, dateRange)),
    [dateRange, leads],
  );

  const countsByBucket = useMemo(() => {
    const counts = Object.fromEntries(STATUS_FILTER_CARDS.map((item) => [item.key, 0]));
    periodLeads.forEach((lead) => {
      const bucket = STATUS_FILTER_CARDS.find((item) => item.matches(lead.status))?.key || 'other';
      counts[bucket] = (counts[bucket] || 0) + 1;
    });
    return counts;
  }, [periodLeads]);

  const filteredLeads = useMemo(
    () => periodLeads.filter((lead) => matchesSelectedBuckets(lead.status, selectedBuckets)),
    [periodLeads, selectedBuckets],
  );

  const allEligibleLeads = useMemo(
    () => filteredLeads.filter((lead) => isLeadVisibleOnMap(lead)),
    [filteredLeads],
  );

  const visibleLeads = useMemo(
    () => allEligibleLeads.filter((lead) => leadInsideBounds(lead, selectionBounds)),
    [allEligibleLeads, selectionBounds],
  );

  const leadsWithoutLocation = Math.max(0, filteredLeads.length - allEligibleLeads.length);
  const currentLayerLabel = useMemo(
    () => MAP_LAYER_OPTIONS.find((layer) => layer.key === activeLayerKey)?.label || 'Mapa padrao',
    [activeLayerKey],
  );
  const selectionActive = Boolean(selectionBounds);

  const handleDateRangeChange = (field, value) => {
    setDateRange((current) => {
      const next = {
        ...current,
        [field]: value,
      };

      if (field === 'start' && next.end && value && value > next.end) {
        next.end = value;
      }

      if (field === 'end' && next.start && value && value < next.start) {
        next.start = value;
      }

      return next;
    });
  };

  const handleResetDateRange = () => {
    setDateRange(getMonthDateBounds(selectedMonth));
  };

  const handleLayerFallback = (fallbackKey, failedKey) => {
    setActiveLayerKey(fallbackKey);
    showToast(`A camada ${MAP_LAYER_OPTIONS.find((layer) => layer.key === failedKey)?.label || 'selecionada'} falhou. Voltamos para o mapa padrao.`, 'error');
  };

  useEffect(() => {
    let cancelled = false;
    let detachListeners = () => {};

    loadLeafletAssets()
      .then((L) => {
        if (cancelled || !mapRef.current) return;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const map = L.map(mapRef.current, {
          center: DEFAULT_CENTER,
          zoom: 11,
          zoomControl: true,
          attributionControl: false,
          boxZoom: false,
        });

        mapInstanceRef.current = map;

        // Leaflet's Control.Scale calls containerPointToLatLng during its first
        // _update, which requires the container to have a non-zero size.
        // Adding it inside whenReady (fired after the first setView completes and
        // the container is fully sized) prevents the "Invalid LatLng (NaN, NaN)" crash
        // that happens when the tab renders with a zero-height container.
        map.whenReady(() => {
          if (cancelled) return;
          L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);
          // Force a size recalculation in case the flex container settled after init
          map.invalidateSize({ animate: false });
        });

        const finalizeSelection = (shouldCommit) => {
          const draftBounds = selectionDraftBoundsRef.current;

          if (selectionDraftRef.current) {
            selectionDraftRef.current.remove();
            selectionDraftRef.current = null;
          }

          if (shouldCommit && isMeaningfulBounds(draftBounds)) {
            setSelectionBounds(serializeBounds(draftBounds));
          }

          selectionDraftBoundsRef.current = null;
          selectionStartRef.current = null;
          isSelectingRef.current = false;
          setIsSelecting(false);
          map.dragging.enable();
          map.getContainer().style.cursor = '';
        };

        const handleMouseDown = (event) => {
          if (!event.originalEvent?.shiftKey || event.originalEvent?.button !== 0) return;

          selectionStartRef.current = event.latlng;
          selectionDraftBoundsRef.current = L.latLngBounds(event.latlng, event.latlng);
          isSelectingRef.current = true;
          setIsSelecting(true);
          map.dragging.disable();
          map.getContainer().style.cursor = 'crosshair';

          if (selectionDraftRef.current) {
            selectionDraftRef.current.remove();
          }

          selectionDraftRef.current = L.rectangle(selectionDraftBoundsRef.current, {
            color: colors.primary,
            weight: 2,
            dashArray: '6 6',
            fillColor: colors.primary,
            fillOpacity: 0.14,
          }).addTo(map);
        };

        const handleMouseMove = (event) => {
          setCursorLatLng({ lat: event.latlng.lat, lng: event.latlng.lng });

          if (!isSelectingRef.current || !selectionStartRef.current || !selectionDraftRef.current) return;

          selectionDraftBoundsRef.current = L.latLngBounds(selectionStartRef.current, event.latlng);
          selectionDraftRef.current.setBounds(selectionDraftBoundsRef.current);
        };

        const handleMouseUp = () => {
          if (!isSelectingRef.current) return;
          finalizeSelection(true);
        };

        const handleDocumentMouseUp = () => {
          if (!isSelectingRef.current) return;
          finalizeSelection(true);
        };

        const handleMouseOut = () => {
          setCursorLatLng(null);
        };

        map.on('mousedown', handleMouseDown);
        map.on('mousemove', handleMouseMove);
        map.on('mouseup', handleMouseUp);
        map.on('mouseout', handleMouseOut);
        document.addEventListener('mouseup', handleDocumentMouseUp);
        detachListeners = () => {
          document.removeEventListener('mouseup', handleDocumentMouseUp);
          map.off('mousedown', handleMouseDown);
          map.off('mousemove', handleMouseMove);
          map.off('mouseup', handleMouseUp);
          map.off('mouseout', handleMouseOut);
        };

        window.requestAnimationFrame(() => map.invalidateSize());
        window.setTimeout(() => map.invalidateSize(), 180);
        setMapReady(true);
      })
      .catch((serviceError) => {
        if (!cancelled) {
          setError(serviceError.message || 'Nao foi possivel carregar o mapa livre.');
        }
      });

    return () => {
      cancelled = true;
      detachListeners();
      if (selectionLayerRef.current) {
        selectionLayerRef.current.remove();
        selectionLayerRef.current = null;
      }
      if (selectionDraftRef.current) {
        selectionDraftRef.current.remove();
        selectionDraftRef.current = null;
      }
      if (baseLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(baseLayerRef.current);
        baseLayerRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersRef.current = [];
      selectionDraftBoundsRef.current = null;
      selectionStartRef.current = null;
      isSelectingRef.current = false;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !window.L) return;

    if (baseLayerRef.current) {
      mapInstanceRef.current.removeLayer(baseLayerRef.current);
      baseLayerRef.current = null;
    }

    baseLayerRef.current = createLeafletMapLayer(window.L, activeLayerKey, {
      onFallback: handleLayerFallback,
    });
    baseLayerRef.current?.addTo(mapInstanceRef.current);
    mapInstanceRef.current.invalidateSize();
  }, [activeLayerKey, mapReady]);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    if (selectionLayerRef.current) {
      selectionLayerRef.current.remove();
      selectionLayerRef.current = null;
    }

    const activeBounds = buildBoundsFromSelection(window.L, selectionBounds);
    if (activeBounds) {
      selectionLayerRef.current = window.L.rectangle(activeBounds, {
        color: colors.primary,
        weight: 2,
        fillColor: colors.primary,
        fillOpacity: 0.12,
      }).addTo(mapInstanceRef.current);
    }
  }, [selectionBounds]);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    mapInstanceRef.current.invalidateSize();

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const L = window.L;
    const bounds = L.latLngBounds([]);
    let plottedMarkers = 0;

    visibleLeads.forEach((lead) => {
      const coordinates = getLeadCoordinates(lead);
      if (!coordinates) return;

      const position = [coordinates.lat, coordinates.lng];
      const marker = L.marker(position, {
        icon: createLeafletPinIcon(markerColorForStatus(lead.status)),
      }).addTo(mapInstanceRef.current);

      marker.bindPopup(buildPopupHtml(lead), {
        maxWidth: 320,
        className: 'oquei-map-popup',
      });
      marker.on('popupopen', () => {
        const popupElement = marker.getPopup()?.getElement();
        const editButton = popupElement?.querySelector(`[data-edit-lead-id="${lead.id}"]`);
        if (!editButton) return;
        editButton.addEventListener('click', () => {
          setUpdateModal(normalizeLeadForEdit(lead));
          mapInstanceRef.current?.closePopup();
        }, { once: true });
      });

      markersRef.current.push(marker);
      bounds.extend(position);
      plottedMarkers += 1;
    });

    if (plottedMarkers > 0 && bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [54, 54] });
    }
  }, [visibleLeads]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    window.requestAnimationFrame(() => mapInstanceRef.current?.invalidateSize());
    window.setTimeout(() => mapInstanceRef.current?.invalidateSize(), 180);
  }, [selectionBounds, isFullscreen, activeLayerKey, visibleLeads.length]);

  const handleCenterMap = () => {
    if (!mapInstanceRef.current || !window.L || visibleLeads.length === 0) return;
    const bounds = window.L.latLngBounds([]);
    visibleLeads.forEach((lead) => {
      const coordinates = getLeadCoordinates(lead);
      if (!coordinates) return;
      bounds.extend([coordinates.lat, coordinates.lng]);
    });
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [54, 54] });
    }
  };

  const handleToggleFullscreen = async () => {
    if (!rootRef.current) return;

    if (document.fullscreenElement === rootRef.current) {
      try {
        await document.exitFullscreen();
      } catch {}
      return;
    }

    try {
      await rootRef.current.requestFullscreen();
    } catch {
      showToast('Nao foi possivel abrir o mapa em tela cheia.', 'error');
    }
  };

  const handleClearSelection = () => {
    setSelectionBounds(null);
  };

  const handleToggleDarkMode = () => {
    setActiveLayerKey((current) => (current === 'carto-dark' ? DEFAULT_LAYER_KEY : 'carto-dark'));
  };

  const toggleBucket = (bucketKey) => {
    setSelectedBuckets((current) => (
      current.includes(bucketKey)
        ? current.filter((item) => item !== bucketKey)
        : [...current, bucketKey]
    ));
  };

  const handleEditAddressChange = (field, value) => {
    setUpdateModal((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleEditAddressBlur = (field) => {
    if (!updateModal || !addressBaseline || !hasValidLeadCoordinates(updateModal) || pendingAddressInvalidation) return;

    const previousValue = String(addressBaseline[field] || '');
    const nextValue = String(updateModal[field] || '');
    if (previousValue === nextValue) return;

    setPendingAddressInvalidation({ field, previousValue, nextValue });
  };

  const confirmAddressInvalidation = () => {
    if (!pendingAddressInvalidation) return;

    setUpdateModal((current) => ({
      ...current,
      geoLat: null,
      geoLng: null,
      geoFormattedAddress: '',
      geoStatus: LEAD_GEO_STATUS.PENDING,
    }));
    setAddressBaseline((current) => ({
      ...(current || {}),
      logradouro: String(updateModal?.logradouro || ''),
      numero: String(updateModal?.numero || ''),
      bairro: String(updateModal?.bairro || ''),
    }));
    setPendingAddressInvalidation(null);
    showToast('Coordenadas antigas removidas. Confirme um novo ponto no mapa antes de salvar.', 'success');
  };

  const cancelAddressInvalidation = () => {
    if (!pendingAddressInvalidation) return;

    setUpdateModal((current) => ({
      ...current,
      [pendingAddressInvalidation.field]: pendingAddressInvalidation.previousValue,
    }));
    setPendingAddressInvalidation(null);
  };

  const handleSave = async (event) => {
    event?.preventDefault();
    if (!updateModal?.id) {
      showToast('Nao foi possivel identificar o lead para salvar.', 'error');
      return;
    }
    if (updateModal.status === 'Descartado' && !updateModal.discardMotive) {
      showToast('Defina o motivo da perda.', 'error');
      return;
    }

    try {
      await updateLeadDetails(updateModal.id, updateModal);
      setUpdateModal(null);
      showToast('Lead atualizado com sucesso.');
    } catch (serviceError) {
      console.error('Erro ao salvar lead pelo mapa:', serviceError);
      showToast('Erro ao atualizar lead.', 'error');
    }
  };

  const handleCreateDiscardReason = async () => {
    if (!newDiscardReasonName.trim()) {
      setDiscardReasonError('Digite o nome do novo motivo antes de salvar.');
      return;
    }

    try {
      setCreatingDiscardReason(true);
      const createdReason = await createLeadDiscardReason(newDiscardReasonName, userData);
      setDiscardReasons((current) =>
        [...current.filter((item) => item.id !== createdReason.id), createdReason]
          .sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''))),
      );
      setUpdateModal((current) => ({ ...current, discardMotive: createdReason.name }));
      setNewDiscardReasonName('');
      setShowNewDiscardReasonCreator(false);
      setDiscardReasonError('');
      showToast('Novo motivo de descarte salvo.');
    } catch (serviceError) {
      console.error('Erro ao criar motivo de descarte pelo mapa:', serviceError);
      setDiscardReasonError(serviceError.message || 'Nao foi possivel criar o novo motivo.');
    } finally {
      setCreatingDiscardReason(false);
    }
  };

  return (
    <Page
      title="Meu mapa de Leads"
      subtitle="Uma leitura geografica mais clara do seu funil, com filtros visuais, selecao por area e camadas operacionais."
    >
      <InfoBox type="info">
        Use `Shift + arrastar` para selecionar uma area no mapa. Agora voce tambem pode trocar camadas, entrar em tela cheia e alternar para o modo black.
      </InfoBox>

      {error && <InfoBox type="danger">{error}</InfoBox>}

      <div style={uiStyles.grid3}>
        <Card size="sm" style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.92), rgba(30,41,59,0.92))', color: '#fff' }}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.64)', textTransform: 'uppercase', fontWeight: 800 }}>Leads no periodo</div>
          <div style={{ marginTop: '8px', fontSize: '30px', fontWeight: 900 }}>{filteredLeads.length}</div>
          <div style={{ marginTop: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.72)' }}>Base atual considerando o mes, o intervalo de datas e os filtros de status.</div>
        </Card>
        <Card size="sm">
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Elegiveis para o mapa</div>
          <div style={{ marginTop: '8px', fontSize: '30px', fontWeight: 900, color: colors.primary }}>{allEligibleLeads.length}</div>
          <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Leads com endereco e coordenadas validas para leitura geografica.</div>
        </Card>
        <Card size="sm">
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Sem localizacao</div>
          <div style={{ marginTop: '8px', fontSize: '30px', fontWeight: 900, color: colors.warning }}>{leadsWithoutLocation}</div>
          <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Leads que ainda precisam de endereco confirmado ou coordenadas validas.</div>
        </Card>
      </div>

      <Card
        title="Distribuicao geografica"
        subtitle="Clique nos cards de status, ajuste o periodo dos leads e use o mapa para refinar por area."
        actions={(
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              style={{ minWidth: '180px', ...uiStyles.input }}
            />
            <Btn variant="secondary" onClick={handleCenterMap} disabled={visibleLeads.length === 0}>
              <Navigation size={16} /> Centralizar
            </Btn>
          </div>
        )}
      >
        <div style={{ display: 'grid', gap: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
            {STATUS_FILTER_CARDS.map((card) => {
              const isActive = selectedBuckets.includes(card.key);
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => toggleBucket(card.key)}
                  style={{
                    textAlign: 'left',
                    borderRadius: '18px',
                    padding: '16px',
                    border: `1px solid ${isActive ? card.accent : 'var(--border)'}`,
                    background: isActive ? `${card.accent}16` : 'var(--bg-app)',
                    boxShadow: isActive ? `0 10px 28px ${card.accent}22` : 'none',
                    cursor: 'pointer',
                    display: 'grid',
                    gap: '8px',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 900, color: 'var(--text-main)' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '999px', background: card.accent }} />
                      {card.label}
                    </span>
                    <span style={{ fontSize: '22px', fontWeight: 900, color: isActive ? card.accent : 'var(--text-main)' }}>
                      {countsByBucket[card.key] || 0}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {card.description}
                  </div>
                </button>
              );
            })}
          </div>

          <div
            style={{
              display: 'grid',
              gap: '12px',
              padding: '16px',
              borderRadius: '18px',
              border: '1px solid rgba(37,99,235,0.12)',
              background: 'linear-gradient(135deg, rgba(37,99,235,0.07), rgba(15,23,42,0.03))',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: colors.primary, fontWeight: 900 }}>
                  Filtro temporal
                </div>
                <div style={{ marginTop: '4px', fontSize: '13px', color: 'var(--text-main)', fontWeight: 800 }}>
                  Periodo ativo: {formatDateLabel(dateRange.start)} ate {formatDateLabel(dateRange.end)}
                </div>
                <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  O intervalo abaixo filtra os leads do mes selecionado antes de desenhar os pontos no mapa.
                </div>
              </div>

              <Btn variant="secondary" onClick={handleResetDateRange}>
                <RefreshCw size={15} /> Mes inteiro
              </Btn>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '12px' }}>
              <div style={{ display: 'grid', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Data inicial
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  min={monthDateBounds.start}
                  max={monthDateBounds.end}
                  onChange={(event) => handleDateRangeChange('start', event.target.value)}
                  style={uiStyles.input}
                />
              </div>

              <div style={{ display: 'grid', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Data final
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  min={monthDateBounds.start}
                  max={monthDateBounds.end}
                  onChange={(event) => handleDateRangeChange('end', event.target.value)}
                  style={uiStyles.input}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
              alignItems: 'center',
              padding: '14px 16px',
              borderRadius: '18px',
              border: '1px solid var(--border)',
              background: 'linear-gradient(135deg, rgba(37,99,235,0.05), rgba(15,23,42,0.03))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)', fontWeight: 800 }}>
              <Filter size={16} color={colors.primary} />
              {selectedBuckets.length === 0 ? 'Todos os status visiveis' : `${selectedBuckets.length} filtro(s) ativo(s)`}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: colors.success }} />
                Fechados
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#f97316' }} />
                Negociacao
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 700 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: colors.danger }} />
                Descartes
              </span>
            </div>
          </div>

          <div
            ref={rootRef}
            style={{
              position: 'relative',
              minHeight: isFullscreen ? 'calc(100vh - 40px)' : '560px',
              borderRadius: '24px',
              border: '1px solid rgba(15,23,42,0.08)',
              background: '#e5e7eb',
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)',
            }}
          >
            <div style={{ position: 'absolute', top: '18px', left: '18px', zIndex: 450, display: 'grid', gap: '10px', width: 'min(100% - 36px, 340px)' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Btn variant="secondary" onClick={handleToggleDarkMode}>
                  <MoonStar size={16} /> {activeLayerKey === 'carto-dark' ? 'Voltar ao claro' : 'Modo black'}
                </Btn>
                <Btn variant="secondary" onClick={handleToggleFullscreen}>
                  {isFullscreen ? <Minimize2 size={16} /> : <Expand size={16} />}
                  {isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                </Btn>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: '190px', flex: '1 1 190px' }}>
                  <div style={{ position: 'relative' }}>
                    <Layers3 size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }} />
                    <select
                      value={activeLayerKey}
                      onChange={(event) => setActiveLayerKey(event.target.value)}
                      style={{ ...uiStyles.select, paddingLeft: '38px', background: 'rgba(255,255,255,0.96)' }}
                    >
                      {MAP_LAYER_OPTIONS.map((layer) => (
                        <option key={layer.key} value={layer.key}>{layer.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Btn variant="secondary" onClick={handleClearSelection} disabled={!selectionActive}>
                  <X size={16} /> Limpar selecao
                </Btn>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: '16px', background: 'rgba(255,255,255,0.94)', border: '1px solid rgba(148,163,184,0.2)', boxShadow: '0 14px 30px rgba(15,23,42,0.10)' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 800 }}>
                  Ferramentas do mapa
                </div>
                <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.5 }}>
                  Segure <strong>Shift</strong> e arraste para selecionar uma area. O filtro da area se soma ao filtro de status.
                </div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '999px', background: 'rgba(37,99,235,0.08)', color: colors.primary, fontSize: '11px', fontWeight: 800 }}>
                    Camada ativa: {currentLayerLabel}
                  </span>
                  {selectionActive ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '999px', background: 'rgba(16,185,129,0.08)', color: colors.success, fontSize: '11px', fontWeight: 800 }}>
                      Area selecionada ativa
                    </span>
                  ) : null}
                  {isSelecting ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '999px', background: 'rgba(249,115,22,0.10)', color: '#f97316', fontSize: '11px', fontWeight: 800 }}>
                      Arrastando selecao...
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div style={{ position: 'absolute', top: '18px', right: '18px', zIndex: 400, display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ padding: '10px 14px', borderRadius: '16px', background: 'rgba(255,255,255,0.94)', color: 'var(--text-main)', backdropFilter: 'blur(8px)', boxShadow: '0 14px 30px rgba(15,23,42,0.12)', border: '1px solid rgba(148,163,184,0.2)' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Elegiveis no mapa</div>
                <div style={{ marginTop: '4px', fontSize: '18px', fontWeight: 900 }}>{allEligibleLeads.length}</div>
              </div>
              <div style={{ padding: '10px 14px', borderRadius: '16px', background: 'rgba(255,255,255,0.94)', color: 'var(--text-main)', backdropFilter: 'blur(8px)', boxShadow: '0 14px 30px rgba(15,23,42,0.08)', border: '1px solid rgba(148,163,184,0.2)' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                  {selectionActive ? 'Na selecao' : 'Sem localizacao'}
                </div>
                <div style={{ marginTop: '4px', fontSize: '18px', fontWeight: 900 }}>
                  {selectionActive ? visibleLeads.length : leadsWithoutLocation}
                </div>
              </div>
            </div>

            <div
              ref={mapRef}
              style={{
                width: '100%',
                minHeight: isFullscreen ? 'calc(100vh - 40px)' : '560px',
                background: '#e5e7eb',
              }}
            />

            {(!mapReady || loading) && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.68)', backdropFilter: 'blur(8px)', zIndex: 500 }}>
                <RefreshCw size={18} style={{ animation: 'ui-spin 0.7s linear infinite' }} />
                <span style={{ fontWeight: 700 }}>{mapReady ? 'Atualizando mapa...' : 'Carregando mapa...'}</span>
              </div>
            )}

            {!loading && mapReady && visibleLeads.length === 0 && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', padding: '24px' }}>
                <div style={{ maxWidth: '420px', padding: '22px 24px', borderRadius: '22px', background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(148,163,184,0.2)', boxShadow: '0 20px 45px rgba(15,23,42,0.12)', textAlign: 'center' }}>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-main)' }}>
                    {selectionActive ? 'Nenhum lead dentro da area selecionada' : 'Nenhum lead visivel no mapa agora'}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-muted)' }}>
                    {selectionActive
                      ? 'Limpe a selecao ou ajuste os filtros de status para voltar a ver os marcadores.'
                      : 'Ajuste os filtros de status ou confirme mais enderecos para que novos leads aparecam aqui.'}
                  </div>
                </div>
              </div>
            )}

            <div style={{ position: 'absolute', left: '18px', bottom: '18px', zIndex: 420, display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ padding: '10px 14px', borderRadius: '16px', background: 'rgba(255,255,255,0.94)', color: 'var(--text-main)', border: '1px solid rgba(148,163,184,0.2)', boxShadow: '0 14px 30px rgba(15,23,42,0.08)' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Cursor</div>
                <div style={{ marginTop: '4px', fontSize: '12px', fontWeight: 800 }}>
                  {formatCoordinateValue(cursorLatLng?.lat)}, {formatCoordinateValue(cursorLatLng?.lng)}
                </div>
              </div>
              {selectionActive ? (
                <div style={{ padding: '10px 14px', borderRadius: '16px', background: 'rgba(255,255,255,0.94)', color: 'var(--text-main)', border: '1px solid rgba(148,163,184,0.2)', boxShadow: '0 14px 30px rgba(15,23,42,0.08)' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Area ativa</div>
                  <div style={{ marginTop: '4px', fontSize: '12px', fontWeight: 800 }}>
                    {boundsToArray(selectionBounds)?.map((point) => point.map((value) => Number(value).toFixed(4)).join(', ')).join(' | ')}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      <style>{`
        .oquei-map-popup .leaflet-popup-content-wrapper {
          border-radius: 18px;
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.18);
        }
        .oquei-map-popup .leaflet-popup-content {
          margin: 10px 12px;
        }
        .oquei-map-popup .leaflet-popup-tip {
          box-shadow: none;
        }
      `}</style>

      {!loading && leads.length === 0 && !error && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)', fontWeight: 800 }}>
            <TrendingUp size={16} color={colors.primary} />
            Este modulo mostra apenas os seus leads do mes selecionado.
          </div>
          <p style={{ margin: '10px 0 0', color: 'var(--text-muted)' }}>
            Conforme novos registros entram e os enderecos sao confirmados, o mapa fica mais inteligente e util para sua leitura operacional.
          </p>
        </Card>
      )}

      <Modal
        open={!!updateModal}
        onClose={() => {
          setUpdateModal(null);
          setShowNewDiscardReasonCreator(false);
          setNewDiscardReasonName('');
          setDiscardReasonError('');
          setPendingAddressInvalidation(null);
        }}
        title="Editar lead pelo mapa"
        size="lg"
        footer={(
          <>
            <Btn
              variant="secondary"
              onClick={() => {
                setUpdateModal(null);
                setShowNewDiscardReasonCreator(false);
                setNewDiscardReasonName('');
                setDiscardReasonError('');
                setPendingAddressInvalidation(null);
              }}
            >
              Cancelar
            </Btn>
            <Btn onClick={handleSave}>
              <CheckCircle2 size={15} /> Salvar lead
            </Btn>
          </>
        )}
      >
        {updateModal ? (
          <form onSubmit={handleSave} style={{ display: 'grid', gap: '18px' }}>
            <Card title="Dados pessoais" size="sm">
              <div style={{ ...uiStyles.formRow, marginBottom: '14px' }}>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nome</label>
                  <input value={updateModal.nome} onChange={(event) => setUpdateModal((current) => ({ ...current, nome: event.target.value }))} style={uiStyles.input} />
                </div>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>CPF</label>
                  <input value={updateModal.cpf} onChange={(event) => setUpdateModal((current) => ({ ...current, cpf: event.target.value }))} style={uiStyles.input} />
                </div>
              </div>

              <div style={uiStyles.formRow}>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Telefone</label>
                  <input value={updateModal.tel} onChange={(event) => setUpdateModal((current) => ({ ...current, tel: formatPhone(event.target.value) }))} style={uiStyles.input} />
                </div>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email</label>
                  <input value={updateModal.email} onChange={(event) => setUpdateModal((current) => ({ ...current, email: event.target.value }))} style={uiStyles.input} />
                </div>
              </div>
            </Card>

            <Card
              title="Endereco"
              size="sm"
              actions={<Btn variant="secondary" onClick={() => setEditMapOpen(true)}><MapPin size={15} /> Selecionar no mapa</Btn>}
            >
              <div style={{ ...uiStyles.formRow, marginBottom: '14px' }}>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Logradouro</label>
                  <input
                    value={updateModal.logradouro}
                    onChange={(event) => handleEditAddressChange('logradouro', event.target.value)}
                    onBlur={() => handleEditAddressBlur('logradouro')}
                    style={uiStyles.input}
                  />
                </div>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Numero</label>
                  <input
                    value={updateModal.numero}
                    onChange={(event) => handleEditAddressChange('numero', event.target.value)}
                    onBlur={() => handleEditAddressBlur('numero')}
                    style={uiStyles.input}
                  />
                </div>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bairro</label>
                  <input
                    value={updateModal.bairro}
                    onChange={(event) => handleEditAddressChange('bairro', event.target.value)}
                    onBlur={() => handleEditAddressBlur('bairro')}
                    style={uiStyles.input}
                  />
                </div>
              </div>

              <InfoBox type={updateModal.geoLat && updateModal.geoLng ? 'success' : 'info'}>
                {updateModal.geoLat && updateModal.geoLng
                  ? 'Esse lead ja tem coordenadas confirmadas. Se o endereco mudar, confirme um novo ponto.'
                  : 'Use o mapa para confirmar o ponto do lead. O endereco textual nao define a localizacao sozinho.'}
              </InfoBox>
            </Card>

            <Card title="Status e fechamento" size="sm">
              <div style={{ ...uiStyles.formRow, marginBottom: '14px' }}>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</label>
                  <select
                    value={updateModal.status}
                    onChange={(event) => {
                      const nextStatus = event.target.value;
                      setUpdateModal((current) => ({
                        ...current,
                        status: nextStatus,
                        ...(nextStatus === 'Descartado' ? {} : { discardMotive: '', fidelityMonth: '' }),
                      }));
                      if (nextStatus !== 'Descartado') {
                        setShowNewDiscardReasonCreator(false);
                        setDiscardReasonError('');
                      }
                    }}
                    style={uiStyles.select}
                  >
                    {['Em negociacao', 'Contratado', 'Instalado', 'Descartado'].map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Origem atual</label>
                  <input value={updateModal.origin || updateModal.originName || 'Nao informada'} readOnly style={{ ...uiStyles.input, background: 'var(--bg-app)' }} />
                </div>
              </div>

              {updateModal.status === 'Descartado' ? (
                <div style={{ display: 'grid', gap: '14px', padding: '14px', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                  <div style={{ display: 'grid', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: colors.danger, textTransform: 'uppercase' }}>Motivo da perda</label>
                    <select
                      value={updateModal.discardMotive}
                      onChange={(event) => {
                        if (event.target.value === NEW_LEAD_DISCARD_REASON_VALUE) {
                          setShowNewDiscardReasonCreator(true);
                          return;
                        }
                        setShowNewDiscardReasonCreator(false);
                        setDiscardReasonError('');
                        setUpdateModal((current) => ({
                          ...current,
                          discardMotive: event.target.value,
                          ...(event.target.value === 'Fidelidade em outro Provedor' ? {} : { fidelityMonth: '' }),
                        }));
                      }}
                      style={uiStyles.select}
                    >
                      <option value="">Selecione um motivo</option>
                      {discardReasons.map((reason) => <option key={reason.id} value={reason.name}>{reason.name}</option>)}
                      <option value={NEW_LEAD_DISCARD_REASON_VALUE}>Inserir motivo</option>
                    </select>
                  </div>

                  {showNewDiscardReasonCreator ? (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <input
                        value={newDiscardReasonName}
                        onChange={(event) => setNewDiscardReasonName(event.target.value)}
                        placeholder="Digite o novo motivo"
                        style={{ ...uiStyles.input, flex: 1, minWidth: '220px' }}
                      />
                      <Btn onClick={handleCreateDiscardReason} loading={creatingDiscardReason}>Salvar motivo</Btn>
                    </div>
                  ) : null}

                  {discardReasonError ? <InfoBox type="warning">{discardReasonError}</InfoBox> : null}

                  {updateModal.discardMotive === 'Fidelidade em outro Provedor' ? (
                    <div style={{ display: 'grid', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: colors.danger, textTransform: 'uppercase' }}>Mes do fim da fidelidade</label>
                      <input type="month" value={updateModal.fidelityMonth} onChange={(event) => setUpdateModal((current) => ({ ...current, fidelityMonth: event.target.value }))} style={uiStyles.input} />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Card>
          </form>
        ) : null}
      </Modal>

      <LeadAddressMapModal
        open={editMapOpen}
        onClose={() => setEditMapOpen(false)}
        cityName={updateModal?.cityName || userData?.cityName || ''}
        initialValue={updateModal}
        onConfirm={(location) => {
          setUpdateModal((current) => ({
            ...current,
            logradouro: location.logradouro || current.logradouro || '',
            numero: location.numero || current.numero || '',
            bairro: location.bairro || current.bairro || '',
            geoLat: location.geoLat ?? null,
            geoLng: location.geoLng ?? null,
            geoFormattedAddress: location.geoFormattedAddress || '',
            geoStatus: normalizeLeadGeoStatus(location.geoStatus),
          }));
          setAddressBaseline({
            logradouro: location.logradouro || updateModal?.logradouro || '',
            numero: location.numero || updateModal?.numero || '',
            bairro: location.bairro || updateModal?.bairro || '',
          });
          setEditMapOpen(false);
        }}
      />

      <Modal
        open={Boolean(pendingAddressInvalidation)}
        onClose={cancelAddressInvalidation}
        title="Endereco alterado"
        footer={(
          <>
            <Btn variant="secondary" onClick={cancelAddressInvalidation}>
              Manter coordenadas atuais
            </Btn>
            <Btn variant="danger" onClick={confirmAddressInvalidation}>
              Limpar coordenadas
            </Btn>
          </>
        )}
      >
        {pendingAddressInvalidation ? (
          <div style={{ display: 'grid', gap: '14px' }}>
            <InfoBox type="warning">
              O endereco foi alterado depois que este lead ja tinha coordenadas confirmadas. Se continuar, as coordenadas atuais serao removidas e sera preciso confirmar um novo ponto no mapa.
            </InfoBox>
            <div style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-main)' }}>
              <div><strong>Campo alterado:</strong> {pendingAddressInvalidation.field}</div>
              <div><strong>Valor anterior:</strong> {pendingAddressInvalidation.previousValue || '-'}</div>
              <div><strong>Novo valor:</strong> {pendingAddressInvalidation.nextValue || '-'}</div>
            </div>
          </div>
        ) : null}
      </Modal>

      {notification ? (
        <div style={{ position: 'fixed', bottom: '30px', right: '30px', padding: '16px 24px', borderRadius: '14px', color: 'white', background: notification.type === 'error' ? colors.danger : colors.success, zIndex: 9999, fontWeight: 900, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          {notification.message}
        </div>
      ) : null}
    </Page>
  );
}
