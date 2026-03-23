import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formatRelativeTime, isLiveSessionOnline } from '../lib/liveMonitor';

function injectMonitorMapStyles() {
  if (typeof document === 'undefined' || document.getElementById('live-monitor-map-styles')) return;
  const style = document.createElement('style');
  style.id = 'live-monitor-map-styles';
  style.textContent = `
    @keyframes live-monitor-pulse {
      0% { transform: scale(0.75); opacity: 0.85; }
      70% { transform: scale(1.35); opacity: 0; }
      100% { transform: scale(1.55); opacity: 0; }
    }
    @keyframes live-monitor-flash {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.88); }
    }
  `;
  document.head.appendChild(style);
}

function buildSessionMarkerHtml(session, now) {
  const initials = String(session.researcherName || 'Pesquisador')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'PQ';
  const quotaPct = Number(session.quotaPct || 0);
  const glow = quotaPct >= 100 ? '#10b981' : quotaPct >= 70 ? '#f59e0b' : '#3b82f6';

  return `
    <div style="position:relative;width:72px;height:72px;display:flex;align-items:center;justify-content:center;">
      <span style="position:absolute;inset:12px;border-radius:999px;background:${glow}33;animation:live-monitor-pulse 1.8s ease-out infinite;"></span>
      <span style="position:absolute;inset:18px;border-radius:999px;background:linear-gradient(135deg, ${glow}, #0f172a);border:2px solid rgba(255,255,255,0.18);box-shadow:0 10px 24px ${glow}55;"></span>
      <span style="position:relative;z-index:2;color:#fff;font-weight:900;font-size:14px;letter-spacing:0.06em;">${initials}</span>
      <span style="position:absolute;bottom:4px;right:2px;z-index:3;min-width:30px;padding:2px 8px;border-radius:999px;background:#0f172a;border:1px solid ${glow};color:#fff;font-size:10px;font-weight:900;text-align:center;">
        ${session.collected || 0}${session.meta ? `/${session.meta}` : ''}
      </span>
      <span style="position:absolute;top:2px;left:2px;z-index:3;padding:2px 7px;border-radius:999px;background:rgba(15,23,42,0.92);border:1px solid rgba(255,255,255,0.1);color:#cbd5e1;font-size:9px;font-weight:800;">
        ${formatRelativeTime(session, now)}
      </span>
    </div>
  `;
}

function buildResponseMarkerHtml(response, now) {
  const isFresh = (now - (response.timestamp?.toDate?.()?.getTime?.() || new Date(response.submittedAtClient || 0).getTime() || now)) <= (10 * 60 * 1000);
  const tone = (response.auditStatus || 'pendente') === 'aceita'
    ? '#10b981'
    : (response.auditStatus || 'pendente') === 'recusada'
      ? '#ef4444'
      : '#38bdf8';

  return `
    <div style="position:relative;width:26px;height:26px;display:flex;align-items:center;justify-content:center;">
      <span style="position:absolute;inset:0;border-radius:999px;background:${tone}22;${isFresh ? 'animation:live-monitor-flash 1.2s ease-in-out infinite;' : ''}"></span>
      <span style="position:relative;z-index:2;width:12px;height:12px;transform:rotate(45deg);border-radius:3px;background:${tone};box-shadow:0 0 16px ${tone}aa;"></span>
    </div>
  `;
}

export default function LiveMonitorMap({
  sessions,
  responses,
  onSelectSession,
  onSelectResponse,
  height = '68vh',
  showHud = true,
}) {
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const markersLayerRef = useRef(null);
  const [ready, setReady] = useState(Boolean(window.L));

  const now = Date.now();
  const activeSessions = useMemo(
    () => (sessions || []).filter((session) => isLiveSessionOnline(session, now) && session.location?.lat && session.location?.lng),
    [now, sessions],
  );
  const responsePoints = useMemo(
    () => (responses || []).filter((response) => response.location?.lat && response.location?.lng).slice(0, 60),
    [responses],
  );

  useEffect(() => {
    injectMonitorMapStyles();

    if (window.L) {
      setReady(true);
      return;
    }

    if (!document.getElementById('leaflet-css')) {
      const css = document.createElement('link');
      css.id = 'leaflet-css';
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(css);
    }

    if (!document.getElementById('leaflet-js')) {
      const js = document.createElement('script');
      js.id = 'leaflet-js';
      js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      js.onload = () => setReady(true);
      document.head.appendChild(js);
    }
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    if (mapObj.current) return;

    const L = window.L;
    const map = L.map(mapRef.current, {
      center: [-20.8, -49.4],
      zoom: 11,
      zoomControl: false,
      attributionControl: false,
    });
    mapObj.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      if (mapObj.current) {
        mapObj.current.remove();
        mapObj.current = null;
      }
    };
  }, [ready]);

  useEffect(() => {
    if (!ready || !mapObj.current || !markersLayerRef.current) return;

    const L = window.L;
    const layer = markersLayerRef.current;
    layer.clearLayers();

    const bounds = [];

    activeSessions.forEach((session) => {
      const html = buildSessionMarkerHtml(session, now);
      const icon = L.divIcon({
        html,
        className: '',
        iconSize: [72, 72],
        iconAnchor: [36, 36],
      });

      const marker = L.marker([session.location.lat, session.location.lng], { icon }).addTo(layer);
      marker.on('click', () => onSelectSession?.(session));
      bounds.push([session.location.lat, session.location.lng]);
    });

    responsePoints.forEach((response) => {
      const html = buildResponseMarkerHtml(response, now);
      const icon = L.divIcon({
        html,
        className: '',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([response.location.lat, response.location.lng], { icon }).addTo(layer);
      marker.on('click', () => onSelectResponse?.(response));
      bounds.push([response.location.lat, response.location.lng]);
    });

    if (bounds.length === 1) {
      mapObj.current.setView(bounds[0], 15);
    } else if (bounds.length > 1) {
      mapObj.current.fitBounds(bounds, { padding: [48, 48] });
    }
  }, [activeSessions, now, onSelectResponse, onSelectSession, ready, responsePoints]);

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      {showHud && (
        <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 1000, display: 'flex', gap: '8px', flexWrap: 'wrap', pointerEvents: 'none' }}>
          {[
            { label: 'Ao vivo', value: activeSessions.length, color: '#10b981' },
            { label: 'Ultimas coletas', value: responsePoints.length, color: '#38bdf8' },
          ].map((item) => (
            <div key={item.label} style={{ padding: '7px 12px', borderRadius: '999px', background: 'rgba(15,23,42,0.84)', border: `1px solid ${item.color}55`, color: '#e2e8f0', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: item.color, boxShadow: `0 0 12px ${item.color}` }} />
              {item.label}: {item.value}
            </div>
          ))}
        </div>
      )}

      {showHud && (
        <div style={{ position: 'absolute', bottom: '16px', left: '16px', zIndex: 1000, background: 'rgba(15,23,42,0.82)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '18px', padding: '10px 14px', display: 'flex', gap: '14px', flexWrap: 'wrap', color: '#cbd5e1', fontSize: '11px', fontWeight: '700', pointerEvents: 'none' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', borderRadius: '999px', background: '#10b981' }} /> pesquisador ativo</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '10px', height: '10px', transform: 'rotate(45deg)', borderRadius: '2px', background: '#38bdf8' }} /> nova coleta</span>
        </div>
      )}

      <div ref={mapRef} style={{ width: '100%', minHeight: height, borderRadius: '26px', overflow: 'hidden', border: '1px solid rgba(56,189,248,0.16)', background: '#020617' }} />

      {!activeSessions.length && !responsePoints.length && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '36px', color: 'var(--text-muted)', background: 'linear-gradient(135deg, rgba(2,6,23,0.36), rgba(15,23,42,0.18))', pointerEvents: 'none' }}>
          <div>
            <div style={{ fontSize: '42px', marginBottom: '12px' }}>GPS</div>
            <div style={{ fontSize: '18px', fontWeight: '900', color: '#f8fafc', marginBottom: '6px' }}>Mapa pronto para acompanhar o campo</div>
            <div style={{ fontSize: '13px', lineHeight: 1.5 }}>Assim que um pesquisador entrar em coleta ou uma nova entrevista for enviada, os pontos aparecerao automaticamente sem precisar abrir o Modo TV.</div>
          </div>
        </div>
      )}

      {!ready && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,6,23,0.92)' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '999px', border: '3px solid rgba(56,189,248,0.2)', borderTopColor: '#38bdf8', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}
    </div>
  );
}
