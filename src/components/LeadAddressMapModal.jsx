import { useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, MapPin, Navigation, Search } from 'lucide-react';

import { Btn, Card, InfoBox, Modal, colors, styles as uiStyles } from './ui';
import { addProfessionalTileLayer, createLeafletPinIcon, loadLeafletAssets, reverseGeocode, searchAddress } from '../lib/openStreetMap';

const DEFAULT_CENTER = { lat: -20.8113, lng: -49.3758 };

function pickInitialCenter(location) {
  if (location?.geoLat && location?.geoLng) {
    return { lat: Number(location.geoLat), lng: Number(location.geoLng) };
  }
  return DEFAULT_CENTER;
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
  const [resolvedAddress, setResolvedAddress] = useState(initialValue?.geoFormattedAddress || '');
  const [selectedLocation, setSelectedLocation] = useState(() => ({
    ...pickInitialCenter(initialValue),
    ...initialValue,
  }));

  const previewAddress = useMemo(() => {
    const parts = [
      selectedLocation.logradouro,
      selectedLocation.numero,
      selectedLocation.bairro,
      cityName,
    ].filter(Boolean);
    return resolvedAddress || parts.join(', ');
  }, [cityName, resolvedAddress, selectedLocation.bairro, selectedLocation.logradouro, selectedLocation.numero]);

  const syncLocationFromReverse = async (lat, lng) => {
    const result = await reverseGeocode(lat, lng, {
      cityName,
      bairro: selectedLocation.bairro,
      logradouro: selectedLocation.logradouro,
      numero: selectedLocation.numero,
    });
    setResolvedAddress(result.formattedAddress || result.display_name || '');
    setSelectedLocation((current) => ({
      ...current,
      geoLat: lat,
      geoLng: lng,
      geoFormattedAddress: result.formattedAddress || result.display_name || '',
      geoStatus: 'resolved',
      logradouro: result.logradouro || current.logradouro || '',
      numero: result.numero || current.numero || '',
      bairro: result.bairro || current.bairro || '',
    }));
  };

  const placeMarker = async (lat, lng) => {
    const L = window.L;
    if (!L || !mapInstanceRef.current) {
      throw new Error('Mapa ainda nao carregado.');
    }

    const markerPosition = [lat, lng];
    if (!markerRef.current) {
      markerRef.current = L.marker(markerPosition, {
        draggable: true,
        icon: createLeafletPinIcon(colors.primary),
      }).addTo(mapInstanceRef.current);
      markerRef.current.on('dragend', async (event) => {
        const markerLatLng = event.target.getLatLng();
        try {
          await syncLocationFromReverse(markerLatLng.lat, markerLatLng.lng);
        } catch (serviceError) {
          setError(serviceError.message || 'Nao foi possivel atualizar o endereco do pino.');
        }
      });
    } else {
      markerRef.current.setLatLng(markerPosition);
    }

    mapInstanceRef.current.setView(markerPosition, Math.max(mapInstanceRef.current.getZoom(), 17));
    await syncLocationFromReverse(lat, lng);
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
        throw new Error('Endereco nao encontrado. Tente refinar a busca.');
      }

      await placeMarker(firstResult.lat, firstResult.lng);
    } catch (serviceError) {
      setError(serviceError.message || 'Nao foi possivel localizar este endereco.');
    } finally {
      setLoading(false);
    }
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
          zoom: initialValue?.geoLat ? 17 : 13,
          zoomControl: true,
        });

        addProfessionalTileLayer(L, mapInstanceRef.current);
        window.requestAnimationFrame(() => mapInstanceRef.current?.invalidateSize());
        window.setTimeout(() => mapInstanceRef.current?.invalidateSize(), 180);

        mapInstanceRef.current.on('click', async (event) => {
          try {
            await placeMarker(event.latlng.lat, event.latlng.lng);
          } catch (serviceError) {
            setError(serviceError.message || 'Nao foi possivel posicionar o pino.');
          }
        });

        if (initialValue?.geoLat && initialValue?.geoLng) {
          placeMarker(Number(initialValue.geoLat), Number(initialValue.geoLng)).catch((serviceError) => {
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
    setSearchValue(initialValue?.geoFormattedAddress || '');
    setResolvedAddress(initialValue?.geoFormattedAddress || '');
    setSelectedLocation({
      ...pickInitialCenter(initialValue),
      ...initialValue,
    });
  }, [initialValue, open]);

  const footer = (
    <>
      <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
      <Btn
        onClick={() => onConfirm?.(selectedLocation)}
        disabled={!selectedLocation?.geoLat || !selectedLocation?.geoLng}
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
              <Crosshair size={16} /> OpenStreetMap com ajuste livre do pino
            </div>
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)', gap: '18px' }}>
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
                background: '#020617',
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
          </div>

          <div style={{ display: 'grid', gap: '14px' }}>
            <Card title="Previa do endereco" size="sm">
              <div style={{ display: 'grid', gap: '14px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Endereco resolvido</div>
                  <div style={{ marginTop: '6px', fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.6 }}>
                    {previewAddress || 'Busque um endereco ou clique no mapa para preencher automaticamente.'}
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

            <Card title="Coordenadas" size="sm">
              <div style={{ display: 'grid', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Latitude</span>
                  <strong style={{ color: 'var(--text-main)', fontSize: '12px' }}>
                    {selectedLocation.geoLat ? Number(selectedLocation.geoLat).toFixed(6) : '-'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Longitude</span>
                  <strong style={{ color: 'var(--text-main)', fontSize: '12px' }}>
                    {selectedLocation.geoLng ? Number(selectedLocation.geoLng).toFixed(6) : '-'}
                  </strong>
                </div>
              </div>
            </Card>

            <InfoBox type="info">
              <div style={{ display: 'grid', gap: '6px' }}>
                <span>Digite um endereco para a previa aparecer.</span>
                <span>Depois disso, ajuste o pino no mapa para garantir que o ponto final ficou correto.</span>
              </div>
            </InfoBox>

            {error && <InfoBox type="danger">{error}</InfoBox>}
          </div>
        </div>
      </div>
    </Modal>
  );
}
