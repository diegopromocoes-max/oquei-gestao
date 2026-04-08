import { useEffect, useMemo, useRef, useState } from 'react';
import { Filter, MapPin, Navigation, RefreshCw, TrendingUp } from 'lucide-react';

import { Btn, Card, Empty, InfoBox, Page, colors, styles as uiStyles } from '../components/ui';
import { addProfessionalTileLayer, createLeafletPinIcon, loadLeafletAssets } from '../lib/openStreetMap';
import { listenAttendantLeadMap } from '../services/attendantLeadMapService';

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
    description: 'Perdas e saídas do funil',
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

function normalizeStatus(value) {
  const safe = String(value || '').toLowerCase();
  if (safe.includes('instal')) return 'Instalado';
  if (safe.includes('contrat')) return 'Contratado';
  if (safe.includes('descart')) return 'Descartado';
  if (safe.includes('negocia')) return 'Em negociacao';
  return value || 'Outro';
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
        <div><strong>Endereco:</strong> ${lead.geoFormattedAddress || lead.address || 'Nao informado'}</div>
      </div>
    </div>
  `;
}

export default function MeuMapaLeads({ userData }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [selectedBuckets, setSelectedBuckets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState('');
  const [leads, setLeads] = useState([]);

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

  const countsByBucket = useMemo(() => {
    const counts = Object.fromEntries(STATUS_FILTER_CARDS.map((item) => [item.key, 0]));
    leads.forEach((lead) => {
      const bucket = STATUS_FILTER_CARDS.find((item) => item.matches(lead.status))?.key || 'other';
      counts[bucket] = (counts[bucket] || 0) + 1;
    });
    return counts;
  }, [leads]);

  const filteredLeads = useMemo(
    () => leads.filter((lead) => matchesSelectedBuckets(lead.status, selectedBuckets)),
    [leads, selectedBuckets],
  );
  const geocodedLeads = useMemo(
    () => filteredLeads.filter((lead) => Number.isFinite(Number(lead.geoLat)) && Number.isFinite(Number(lead.geoLng))),
    [filteredLeads],
  );
  const leadsWithoutLocation = Math.max(0, filteredLeads.length - geocodedLeads.length);

  useEffect(() => {
    let cancelled = false;

    loadLeafletAssets()
      .then((L) => {
        if (cancelled || !mapRef.current) return;

        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        mapInstanceRef.current = L.map(mapRef.current, {
          center: [-20.8113, -49.3758],
          zoom: 11,
          zoomControl: true,
          attributionControl: false,
        });

        addProfessionalTileLayer(L, mapInstanceRef.current);
        window.requestAnimationFrame(() => mapInstanceRef.current?.invalidateSize());
        window.setTimeout(() => mapInstanceRef.current?.invalidateSize(), 180);
        setMapReady(true);
      })
      .catch((serviceError) => {
        if (!cancelled) {
          setError(serviceError.message || 'Nao foi possivel carregar o mapa livre.');
        }
      });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersRef.current = [];
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    mapInstanceRef.current.invalidateSize();

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const L = window.L;
    const bounds = L.latLngBounds([]);

    geocodedLeads.forEach((lead) => {
      const position = [Number(lead.geoLat), Number(lead.geoLng)];
      const marker = L.marker(position, {
        icon: createLeafletPinIcon(markerColorForStatus(lead.status)),
      }).addTo(mapInstanceRef.current);

      marker.bindPopup(buildPopupHtml(lead), {
        maxWidth: 320,
        className: 'oquei-map-popup',
      });

      markersRef.current.push(marker);
      bounds.extend(position);
    });

    if (geocodedLeads.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [54, 54] });
    }
  }, [geocodedLeads]);

  const handleCenterMap = () => {
    if (!mapInstanceRef.current || !window.L || geocodedLeads.length === 0) return;
    const bounds = window.L.latLngBounds([]);
    geocodedLeads.forEach((lead) => bounds.extend([Number(lead.geoLat), Number(lead.geoLng)]));
    mapInstanceRef.current.fitBounds(bounds, { padding: [54, 54] });
  };

  const toggleBucket = (bucketKey) => {
    setSelectedBuckets((current) => (
      current.includes(bucketKey)
        ? current.filter((item) => item !== bucketKey)
        : [...current, bucketKey]
    ));
  };

  return (
    <Page
      title="Meu mapa de Leads"
      subtitle="Uma leitura geografica mais clara do seu funil, com filtros visuais e foco no que realmente esta acontecendo em campo."
    >
      <InfoBox type="info">
        Basemap profissional com dados livres: usamos CARTO + OpenStreetMap, sem depender de chave paga do Google.
      </InfoBox>

      {error && <InfoBox type="danger">{error}</InfoBox>}

      <div style={uiStyles.grid3}>
        <Card size="sm" style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.92), rgba(30,41,59,0.92))', color: '#fff' }}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.64)', textTransform: 'uppercase', fontWeight: 800 }}>Leads no periodo</div>
          <div style={{ marginTop: '8px', fontSize: '30px', fontWeight: 900 }}>{filteredLeads.length}</div>
          <div style={{ marginTop: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.72)' }}>Base que esta sendo projetada no mapa agora.</div>
        </Card>
        <Card size="sm">
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Com localizacao valida</div>
          <div style={{ marginTop: '8px', fontSize: '30px', fontWeight: 900, color: colors.primary }}>{geocodedLeads.length}</div>
          <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Prontos para leitura geografica e analise de rota.</div>
        </Card>
        <Card size="sm">
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800 }}>Sem localizacao</div>
          <div style={{ marginTop: '8px', fontSize: '30px', fontWeight: 900, color: colors.warning }}>{leadsWithoutLocation}</div>
          <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>Leads que ainda precisam de endereco confirmado.</div>
        </Card>
      </div>

      <Card
        title="Distribuicao geografica"
        subtitle="Clique em um ou mais cards de status para filtrar automaticamente o mapa."
        actions={(
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              style={{ minWidth: '180px', ...uiStyles.input }}
            />
            <Btn variant="secondary" onClick={handleCenterMap}>
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

          {!loading && geocodedLeads.length === 0 ? (
            <Empty
              icon={<MapPin size={20} />}
              title="Nenhum lead com coordenadas neste recorte"
              description="Ajuste os filtros visuais ou confirme os enderecos dos leads para eles aparecerem aqui."
            />
          ) : (
            <div
              ref={mapRef}
              style={{
                minHeight: '560px',
                borderRadius: '24px',
                border: '1px solid rgba(15,23,42,0.08)',
                background: '#020617',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)',
              }}
            >
              {(!mapReady || loading) && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.68)', backdropFilter: 'blur(8px)', zIndex: 500 }}>
                  <RefreshCw size={18} style={{ animation: 'ui-spin 0.7s linear infinite' }} />
                  <span style={{ fontWeight: 700 }}>{mapReady ? 'Atualizando mapa...' : 'Carregando mapa...'}</span>
                </div>
              )}

              <div style={{ position: 'absolute', top: '18px', right: '18px', zIndex: 400, display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ padding: '10px 14px', borderRadius: '16px', background: 'rgba(15,23,42,0.78)', color: '#fff', backdropFilter: 'blur(8px)', boxShadow: '0 14px 30px rgba(15,23,42,0.18)' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.72 }}>Visiveis no mapa</div>
                  <div style={{ marginTop: '4px', fontSize: '18px', fontWeight: 900 }}>{geocodedLeads.length}</div>
                </div>
                <div style={{ padding: '10px 14px', borderRadius: '16px', background: 'rgba(255,255,255,0.88)', color: 'var(--text-main)', backdropFilter: 'blur(8px)', boxShadow: '0 14px 30px rgba(15,23,42,0.08)' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Sem localizacao</div>
                  <div style={{ marginTop: '4px', fontSize: '18px', fontWeight: 900 }}>{leadsWithoutLocation}</div>
                </div>
              </div>
            </div>
          )}
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
    </Page>
  );
}
