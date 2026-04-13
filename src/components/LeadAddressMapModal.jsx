import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Crosshair, MapPin, Navigation, Search } from 'lucide-react';

import { Btn, Card, InfoBox, Modal, colors, styles as uiStyles } from './ui';
import { addProfessionalTileLayer, createLeafletPinIcon, loadLeafletAssets, reverseGeocode, searchAddress } from '../lib/openStreetMap';
import {
  LEAD_GEO_STATUS,
  buildLeadAddressLabel,
  hasValidLeadCoordinates,
  normalizeLeadGeoStatus,
  parseLeadCoordinateInput,
} from '../lib/leadGeo';

const DEFAULT_CENTER = { lat: -20.8113, lng: -49.3758 };

function pickInitialCenter(location) {
  if (hasValidLeadCoordinates(location)) {
    return { lat: Number(location.geoLat), lng: Number(location.geoLng) };
  }
  return DEFAULT_CENTER;
}

function buildSearchSeed(value = {}) {
  return [value.logradouro, value.numero, value.bairro, value.geoFormattedAddress]
    .filter(Boolean)
    .join(', ');
}

function getStatusMeta(status, hasCoordinates) {
  switch (status) {
    case LEAD_GEO_STATUS.SEARCH_CANDIDATE:
      return {
        label: 'Local encontrado, aguardando confirmacao',
        color: colors.warning,
        type: 'warning',
        description: 'Confira o ponto no mapa antes de usar. A busca por endereco pode retornar local incorreto.',
      };
    case LEAD_GEO_STATUS.SEARCH_CONFIRMED:
      return {
        label: 'Ponto confirmado pela busca',
        color: colors.success,
        type: 'success',
        description: 'O ponto sugerido foi revisado e confirmado pelo atendente.',
      };
    case LEAD_GEO_STATUS.MAP_CLICKED:
      return {
        label: 'Ponto confirmado manualmente no mapa',
        color: colors.success,
        type: 'success',
        description: 'A coordenada atual veio de clique ou arraste manual do pino.',
      };
    case LEAD_GEO_STATUS.COORDINATES_PASTED:
      return {
        label: 'Ponto confirmado por coordenadas coladas',
        color: colors.success,
        type: 'success',
        description: 'A coordenada atual foi informada manualmente em formato decimal.',
      };
    default:
      return {
        label: hasCoordinates ? 'Coordenada pendente de confirmacao' : 'Nenhum ponto confirmado ainda',
        color: colors.warning,
        type: 'info',
        description: hasCoordinates
          ? 'Existe uma coordenada carregada, mas ela ainda precisa ser confirmada.'
          : 'Busque um endereco, clique no mapa ou cole as coordenadas para definir o ponto do lead.',
      };
  }
}

export default function LeadAddressMapModal({
  open,
  onClose,
  cityName,
  initialValue,
  onConfirm,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);
  const [error, setError] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [coordinateInput, setCoordinateInput] = useState('');
  const [previewAddress, setPreviewAddress] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(() => ({
    ...pickInitialCenter(initialValue),
    ...initialValue,
    geoStatus: normalizeLeadGeoStatus(initialValue?.geoStatus),
  }));

  const hasCoordinates = hasValidLeadCoordinates(selectedLocation);
  const statusMeta = useMemo(
    () => getStatusMeta(normalizeLeadGeoStatus(selectedLocation?.geoStatus), hasCoordinates),
    [hasCoordinates, selectedLocation?.geoStatus],
  );
  const canUseCurrentPoint =
    hasCoordinates &&
    [
      LEAD_GEO_STATUS.SEARCH_CONFIRMED,
      LEAD_GEO_STATUS.MAP_CLICKED,
      LEAD_GEO_STATUS.COORDINATES_PASTED,
    ].includes(normalizeLeadGeoStatus(selectedLocation?.geoStatus));

  const updateMarkerAppearance = (status) => {
    if (!markerRef.current) return;
    const isPending = [LEAD_GEO_STATUS.PENDING, LEAD_GEO_STATUS.SEARCH_CANDIDATE].includes(normalizeLeadGeoStatus(status));
    markerRef.current.setIcon(createLeafletPinIcon(isPending ? colors.warning : colors.success));
  };

  const syncPreviewFromReverse = async (lat, lng, fallbackPatch = {}) => {
    try {
      const result = await reverseGeocode(lat, lng, {
        cityName,
        bairro: fallbackPatch.bairro || selectedLocation.bairro,
        logradouro: fallbackPatch.logradouro || selectedLocation.logradouro,
        numero: fallbackPatch.numero || selectedLocation.numero,
      });
      setPreviewAddress(result.formattedAddress || result.display_name || '');
      setSelectedLocation((current) => ({
        ...current,
        logradouro: result.logradouro || fallbackPatch.logradouro || current.logradouro || '',
        numero: result.numero || fallbackPatch.numero || current.numero || '',
        bairro: result.bairro || fallbackPatch.bairro || current.bairro || '',
      }));
    } catch {
      setPreviewAddress('');
    }
  };

  const placeMarker = async ({ lat, lng, status, patch = {}, previewText = '', enrichWithReverse = false }) => {
    const L = window.L;
    if (!L || !mapInstanceRef.current) {
      throw new Error('Mapa ainda nao carregado.');
    }

    const markerPosition = [lat, lng];
    if (!markerRef.current) {
      markerRef.current = L.marker(markerPosition, {
        draggable: true,
        icon: createLeafletPinIcon(colors.success),
      }).addTo(mapInstanceRef.current);
      markerRef.current.on('dragend', async (event) => {
        const markerLatLng = event.target.getLatLng();
        try {
          setError('');
          await placeMarker({
            lat: markerLatLng.lat,
            lng: markerLatLng.lng,
            status: LEAD_GEO_STATUS.MAP_CLICKED,
            patch: {},
            previewText: '',
            enrichWithReverse: true,
          });
        } catch (serviceError) {
          setError(serviceError.message || 'Nao foi possivel atualizar a posicao do pino.');
        }
      });
    } else {
      markerRef.current.setLatLng(markerPosition);
    }

    updateMarkerAppearance(status);
    mapInstanceRef.current.setView(markerPosition, Math.max(mapInstanceRef.current.getZoom(), 17));

    setSelectedLocation((current) => ({
      ...current,
      ...patch,
      geoLat: lat,
      geoLng: lng,
      geoStatus: status,
      geoFormattedAddress: patch.geoFormattedAddress ?? current.geoFormattedAddress ?? '',
    }));
    setPreviewAddress(previewText);

    if (enrichWithReverse) {
      await syncPreviewFromReverse(lat, lng, patch);
    }
  };

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      setError('Digite um endereco para localizar no mapa.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const results = await searchAddress(searchValue, cityName, {
        bairro: selectedLocation.bairro || initialValue?.bairro,
        logradouro: selectedLocation.logradouro || initialValue?.logradouro,
        numero: selectedLocation.numero || initialValue?.numero,
      });
      const firstResult = results[0];
      if (!firstResult) {
        throw new Error('Endereco nao encontrado. Clique manualmente no mapa ou cole as coordenadas.');
      }

      await placeMarker({
        lat: Number(firstResult.lat),
        lng: Number(firstResult.lng),
        status: LEAD_GEO_STATUS.SEARCH_CANDIDATE,
        patch: {
          logradouro: firstResult.logradouro || selectedLocation.logradouro || '',
          numero: firstResult.numero || selectedLocation.numero || '',
          bairro: firstResult.bairro || selectedLocation.bairro || '',
          geoFormattedAddress: '',
        },
        previewText: firstResult.formattedAddress || firstResult.display_name || '',
        enrichWithReverse: false,
      });
    } catch (serviceError) {
      setError(serviceError.message || 'Nao foi possivel localizar este endereco.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasteCoordinates = async () => {
    const parsed = parseLeadCoordinateInput(coordinateInput);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    setError('');
    try {
      await placeMarker({
        lat: parsed.lat,
        lng: parsed.lng,
        status: LEAD_GEO_STATUS.COORDINATES_PASTED,
        patch: {
          geoFormattedAddress: '',
        },
        previewText: '',
        enrichWithReverse: true,
      });
    } catch (serviceError) {
      setError(serviceError.message || 'Nao foi possivel posicionar essas coordenadas.');
    }
  };

  const handleConfirmSearchPoint = () => {
    if (!hasCoordinates) return;
    setSelectedLocation((current) => ({
      ...current,
      geoStatus: LEAD_GEO_STATUS.SEARCH_CONFIRMED,
    }));
    updateMarkerAppearance(LEAD_GEO_STATUS.SEARCH_CONFIRMED);
  };

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;
    setLoading(true);
    setError('');

    loadLeafletAssets()
      .then((L) => {
        if (cancelled || !mapRef.current) return;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        const initialCenter = pickInitialCenter(initialValue);
        mapInstanceRef.current = L.map(mapRef.current, {
          center: [initialCenter.lat, initialCenter.lng],
          zoom: hasValidLeadCoordinates(initialValue) ? 17 : 13,
          zoomControl: true,
        });

        addProfessionalTileLayer(L, mapInstanceRef.current);
        window.requestAnimationFrame(() => mapInstanceRef.current?.invalidateSize());
        window.setTimeout(() => mapInstanceRef.current?.invalidateSize(), 180);

        mapInstanceRef.current.on('click', async (event) => {
          try {
            setError('');
            await placeMarker({
              lat: event.latlng.lat,
              lng: event.latlng.lng,
              status: LEAD_GEO_STATUS.MAP_CLICKED,
              patch: { geoFormattedAddress: '' },
              previewText: '',
              enrichWithReverse: true,
            });
          } catch (serviceError) {
            setError(serviceError.message || 'Nao foi possivel posicionar o pino.');
          }
        });

        if (hasValidLeadCoordinates(initialValue)) {
          placeMarker({
            lat: Number(initialValue.geoLat),
            lng: Number(initialValue.geoLng),
            status: normalizeLeadGeoStatus(initialValue?.geoStatus),
            patch: {
              logradouro: initialValue.logradouro || '',
              numero: initialValue.numero || '',
              bairro: initialValue.bairro || '',
              geoFormattedAddress: initialValue.geoFormattedAddress || '',
            },
            previewText: initialValue.geoFormattedAddress || buildLeadAddressLabel(initialValue),
            enrichWithReverse: false,
          }).catch((serviceError) => {
            setError(serviceError.message || 'Nao foi possivel restaurar o local inicial.');
          });
        }

        setMapsReady(true);
      })
      .catch((serviceError) => {
        if (!cancelled) {
          setError(serviceError.message || 'Nao foi possivel carregar o mapa livre.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markerRef.current = null;
      setMapsReady(false);
    };
  }, [initialValue, open, cityName]);

  useEffect(() => {
    if (!open) return;
    setSearchValue(buildSearchSeed(initialValue));
    setCoordinateInput('');
    setPreviewAddress(initialValue?.geoFormattedAddress || '');
    setSelectedLocation({
      ...pickInitialCenter(initialValue),
      ...initialValue,
      geoStatus: normalizeLeadGeoStatus(initialValue?.geoStatus),
    });
  }, [initialValue, open]);

  const footer = (
    <>
      <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
      <Btn
        onClick={() => onConfirm?.(selectedLocation)}
        disabled={!canUseCurrentPoint}
      >
        Usar este local
      </Btn>
    </>
  );

  return (
    <Modal open={open} onClose={onClose} title="Selecionar no mapa" size="lg" footer={footer}>
      <div style={{ display: 'grid', gap: '18px' }}>
        <Card
          size="sm"
          style={{
            background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(16,185,129,0.06))',
            borderColor: 'rgba(37,99,235,0.18)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Localizacao do lead
              </div>
              <div style={{ marginTop: '6px', fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
                {cityName || 'Cidade nao selecionada'}
              </div>
            </div>
            <div style={{ color: colors.primary, fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Crosshair size={16} /> Leaflet tradicional com confirmacao manual do ponto
            </div>
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(300px, 0.8fr)', gap: '18px' }}>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Digite o endereco para localizar..."
                  style={{ ...uiStyles.input, paddingLeft: '38px', minHeight: '46px' }}
                />
              </div>
              <Btn onClick={handleSearch} loading={loading}>
                Buscar
              </Btn>
            </div>

            <div
              ref={mapRef}
              style={{
                minHeight: '420px',
                borderRadius: '20px',
                border: '1px solid var(--border)',
                background: '#e5e7eb',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {!mapsReady && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px', color: 'var(--text-muted)' }}>
                  <Navigation size={22} color={colors.primary} />
                  <span style={{ fontSize: '13px', fontWeight: 700 }}>{loading ? 'Carregando mapa...' : 'Mapa indisponivel no momento'}</span>
                </div>
              )}
            </div>

            <InfoBox type="info">
              <div style={{ display: 'grid', gap: '6px' }}>
                <span>Se a busca errar, clique no mapa, arraste o pino ou cole as coordenadas.</span>
                <span>O ponto so deve ser usado depois de confirmado pelo atendente.</span>
              </div>
            </InfoBox>
          </div>

          <div style={{ display: 'grid', gap: '14px' }}>
            <InfoBox type={statusMeta.type}>
              <div style={{ display: 'grid', gap: '6px' }}>
                <strong>{statusMeta.label}</strong>
                <span>{statusMeta.description}</span>
              </div>
            </InfoBox>

            {hasCoordinates && [LEAD_GEO_STATUS.PENDING, LEAD_GEO_STATUS.SEARCH_CANDIDATE].includes(normalizeLeadGeoStatus(selectedLocation?.geoStatus)) ? (
              <Btn
                variant="success"
                onClick={handleConfirmSearchPoint}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <CheckCircle2 size={16} /> Confirmar este ponto
              </Btn>
            ) : null}

            <Card title="Coordenadas" size="sm">
              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Latitude</span>
                  <strong style={{ color: 'var(--text-main)', fontSize: '12px' }}>
                    {hasCoordinates ? Number(selectedLocation.geoLat).toFixed(6) : '-'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Longitude</span>
                  <strong style={{ color: 'var(--text-main)', fontSize: '12px' }}>
                    {hasCoordinates ? Number(selectedLocation.geoLng).toFixed(6) : '-'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Origem do ponto</span>
                  <strong style={{ color: statusMeta.color, fontSize: '12px' }}>{statusMeta.label}</strong>
                </div>
              </div>
            </Card>

            <Card title="Colar coordenadas" size="sm">
              <div style={{ display: 'grid', gap: '12px' }}>
                <input
                  value={coordinateInput}
                  onChange={(event) => setCoordinateInput(event.target.value)}
                  placeholder="-20.8113, -49.3758"
                  style={uiStyles.input}
                />
                <Btn variant="secondary" onClick={handlePasteCoordinates}>
                  <MapPin size={15} /> Usar coordenadas coladas
                </Btn>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Formatos aceitos: `lat, lng`, `lat lng` ou `lat;lng`, sempre com ponto decimal.
                </div>
              </div>
            </Card>

            <Card title="Endereco comercial" size="sm">
              <div style={{ display: 'grid', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Resumo</div>
                  <div style={{ marginTop: '6px', fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.6 }}>
                    {previewAddress || buildLeadAddressLabel(selectedLocation) || 'Clique no mapa para preencher as coordenadas do lead.'}
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Rua</span>
                    <strong style={{ color: 'var(--text-main)', fontSize: '12px' }}>{selectedLocation.logradouro || '-'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Numero</span>
                    <strong style={{ color: 'var(--text-main)', fontSize: '12px' }}>{selectedLocation.numero || '-'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Bairro</span>
                    <strong style={{ color: 'var(--text-main)', fontSize: '12px' }}>{selectedLocation.bairro || '-'}</strong>
                  </div>
                </div>
              </div>
            </Card>

            {error && <InfoBox type="danger">{error}</InfoBox>}
          </div>
        </div>
      </div>
    </Modal>
  );
}
