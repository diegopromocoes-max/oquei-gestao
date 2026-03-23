import React, { useEffect, useRef, useState } from 'react';

export default function InsightsResponseMap({
  responses,
  onSelectResposta,
  matchIds,
  mapMode,
  aiScores,
}) {
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const [ready, setReady] = useState(Boolean(window.L));

  const comGps = (responses || []).filter((response) => response.location?.lat && response.location?.lng);

  useEffect(() => {
    if (window.L) {
      setReady(true);
      return;
    }

    if (document.getElementById('leaflet-css')) return;

    const css = document.createElement('link');
    css.id = 'leaflet-css';
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);

    const js = document.createElement('script');
    js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    js.onload = () => setReady(true);
    document.head.appendChild(js);
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !comGps.length) return;

    if (mapObj.current) {
      mapObj.current.remove();
      mapObj.current = null;
    }

    const lats = comGps.map((response) => response.location.lat);
    const lngs = comGps.map((response) => response.location.lng);
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    const L = window.L;

    const map = L.map(mapRef.current, {
      center: [centerLat, centerLng],
      zoom: comGps.length === 1 ? 14 : 12,
      zoomControl: false,
      attributionControl: false,
    });
    mapObj.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const grupos = [];
    comGps.forEach((response) => {
      const group = grupos.find((current) => {
        const distance = Math.hypot(current.lat - response.location.lat, current.lng - response.location.lng);
        return distance < 0.0007;
      });

      if (group) {
        group.items.push(response);
        group.lat = (group.lat + response.location.lat) / 2;
        group.lng = (group.lng + response.location.lng) / 2;
      } else {
        grupos.push({ lat: response.location.lat, lng: response.location.lng, items: [response] });
      }
    });

    grupos.forEach((group, index) => {
      const isCluster = group.items.length > 1;
      const first = group.items[0];
      const nome = (first.researcherName || '?').split(' ')[0];
      const cidade = String(first.city || '').substring(0, 8).toUpperCase();
      const count = group.items.length;

      let pinColor1 = '#3b82f6';
      let pinColor2 = '#8b5cf6';
      let pinOpacity = 1;

      if (mapMode === 'filtro' && matchIds !== null) {
        const match = group.items.some((response) => matchIds.has(response.id));
        if (match) {
          pinColor1 = '#10b981';
          pinColor2 = '#059669';
        } else {
          pinColor1 = '#334155';
          pinColor2 = '#1e293b';
          pinOpacity = 0.35;
        }
      } else if (mapMode === 'ia' && aiScores) {
        const scores = group.items.map((response) => aiScores[response.id]?.score).filter(Boolean);
        const avg = scores.length ? scores.reduce((acc, value) => acc + value, 0) / scores.length : 0;

        if (avg >= 9) {
          pinColor1 = '#ef4444';
          pinColor2 = '#dc2626';
        } else if (avg >= 7) {
          pinColor1 = '#f59e0b';
          pinColor2 = '#d97706';
        } else if (avg >= 4) {
          pinColor1 = '#3b82f6';
          pinColor2 = '#2563eb';
        } else if (avg >= 1) {
          pinColor1 = '#64748b';
          pinColor2 = '#475569';
          pinOpacity = 0.6;
        } else {
          pinOpacity = 0.3;
        }
      }

      const svgPin = isCluster
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="64" viewBox="0 0 52 64">
            <defs>
              <filter id="gs${index}"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#f59e0b" flood-opacity="0.6"/></filter>
            </defs>
            <ellipse cx="26" cy="58" rx="9" ry="3" fill="#f59e0b" opacity="0.25"/>
            <path d="M26 2C14 2 4 12 4 24c0 17 22 38 22 38s22-21 22-38C48 12 38 2 26 2Z" fill="#f59e0b" filter="url(#gs${index})"/>
            <circle cx="26" cy="23" r="13" fill="rgba(255,255,255,0.12)"/>
            <text x="26" y="20" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" font-size="14" fill="#fff">${count}</text>
            <text x="26" y="31" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="7.5" fill="rgba(255,255,255,0.75)">LOCAIS</text>
          </svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="62" viewBox="0 0 48 62">
            <defs>
              <filter id="gs${index}"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#3b82f6" flood-opacity="0.6"/></filter>
              <linearGradient id="gg${index}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${pinColor1}"/><stop offset="100%" stop-color="${pinColor2}"/>
              </linearGradient>
            </defs>
            <ellipse cx="24" cy="57" rx="8" ry="3" fill="#3b82f6" opacity="0.25"/>
            <path d="M24 2C12 2 2 12 2 24c0 17 22 36 22 36s22-19 22-36C46 12 36 2 24 2Z" fill="url(#gg${index})" filter="url(#gs${index})"/>
            <circle cx="24" cy="23" r="12" fill="rgba(255,255,255,0.12)"/>
            <text x="24" y="20" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" font-size="10.5" fill="#fff">${nome.substring(0, 4).toUpperCase()}</text>
            <text x="24" y="30" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="600" font-size="7" fill="rgba(255,255,255,0.7)">${cidade}</text>
          </svg>`;

      const icon = L.divIcon({
        html: `<div style="opacity:${pinOpacity};transition:opacity 0.3s">${svgPin}</div>`,
        className: '',
        iconSize: isCluster ? [52, 64] : [48, 62],
        iconAnchor: isCluster ? [26, 64] : [24, 62],
      });

      L.marker([group.lat, group.lng], { icon })
        .addTo(map)
        .on('click', () => onSelectResposta(group.items.length === 1 ? group.items[0] : null, group.items));
    });

    if (comGps.length > 1) {
      map.fitBounds(
        comGps.map((response) => [response.location.lat, response.location.lng]),
        { padding: [48, 48] },
      );
    }

    return () => {
      if (mapObj.current) {
        mapObj.current.remove();
        mapObj.current = null;
      }
    };
  }, [ready, comGps, matchIds, mapMode, aiScores, onSelectResposta]);

  if (!comGps.length) {
    return (
      <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '16px', padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }}>GPS</div>
        <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '4px' }}>Nenhuma resposta com GPS</div>
        <div style={{ fontSize: '12px' }}>As entrevistas com geolocalizacao ativa aparecerao aqui.</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '6px', pointerEvents: 'none' }}>
        {[
          { label: 'COM GPS', value: comGps.length, color: '#3b82f6' },
          { label: 'TOTAL', value: responses.length, color: '#8b5cf6' },
          { label: 'COBERTURA', value: `${Math.round((comGps.length / Math.max(responses.length, 1)) * 100)}%`, color: '#10b981' },
        ].map((item) => (
          <div key={item.label} style={{ background: 'rgba(10,14,26,0.82)', backdropFilter: 'blur(8px)', border: `1px solid ${item.color}30`, borderRadius: '8px', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
            <span style={{ fontSize: '10px', fontWeight: '900', color: '#64748b', letterSpacing: '0.1em' }}>{item.label}</span>
            <span style={{ fontSize: '14px', fontWeight: '900', color: '#f1f5f9', marginLeft: '2px' }}>{item.value}</span>
          </div>
        ))}
      </div>

      <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(10,14,26,0.82)', backdropFilter: 'blur(8px)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '20px', padding: '5px 16px', fontSize: '11px', fontWeight: '700', color: '#64748b', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: 'none' }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
        Clique nos pins para ver os detalhes
      </div>

      <div ref={mapRef} style={{ width: '100%', height: '440px', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(59,130,246,0.15)', background: '#1a1f2e' }} />

      {!ready && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1f2e', borderRadius: '16px', zIndex: 999 }}>
          <div style={{ textAlign: 'center', color: '#4a5568' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid rgba(59,130,246,0.2)', borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <div style={{ fontSize: '12px', fontWeight: '700' }}>Carregando mapa...</div>
          </div>
        </div>
      )}
    </div>
  );
}
