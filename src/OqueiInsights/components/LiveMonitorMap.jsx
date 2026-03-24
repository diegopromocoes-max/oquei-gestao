import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formatRelativeTime, isLiveSessionOnline } from '../lib/liveMonitor';

// ── CSS animations ────────────────────────────────────────────
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
    .lm-label-popup .leaflet-popup-content-wrapper {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
    }
    .lm-label-popup .leaflet-popup-content {
      margin: 0 !important;
    }
    .lm-label-popup .leaflet-popup-tip-container {
      display: none !important;
    }
    .lm-label-popup .leaflet-popup-close-button {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
}

// ── Detecta grupos de sessões muito próximas no mapa ──────────
// Retorna um offset {x,y} em pixels para afastar o marcador
function getProximityOffset(sessions, idx, thresholdDeg = 0.0004) {
  const current = sessions[idx];
  const nearby = [];

  sessions.forEach((s, i) => {
    if (i === idx) return;
    const dLat = Math.abs(s.location.lat - current.location.lat);
    const dLng = Math.abs(s.location.lng - current.location.lng);
    if (dLat < thresholdDeg && dLng < thresholdDeg) nearby.push(i);
  });

  if (!nearby.length) return { x: 0, y: 0 };

  // Distribui em espiral: afasta cada um em direção diferente
  const total = nearby.length + 1;
  const angle = ((idx % total) / total) * 2 * Math.PI;
  const radius = 32; // pixels de afastamento
  return {
    x: Math.round(Math.cos(angle) * radius),
    y: Math.round(Math.sin(angle) * radius),
  };
}

// ── HTML do marcador de sessão ────────────────────────────────
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

// ── HTML do marcador de resposta ──────────────────────────────
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

// ── HTML da label glassmorphism com linha diagonal ────────────
// Layout: [marcador]--linha-diagonal-->[card]
// O card fica à direita e acima do marcador.
// iconAnchor aponta para o centro do marcador de sessão (36,36).
function buildLabelHtml(session) {
  const name = session.researcherName || 'Pesquisador';
  const phone = session.interviewerPhone || session.researcherPhone || '';
  const collected = Number(session.collected || session.totalCollected || 0);
  const meta = Number(session.interviewerMeta || session.meta || 0);
  const quotaPct = Number(session.quotaPct || 0);
  const glow = quotaPct >= 100 ? '#10b981' : quotaPct >= 70 ? '#f59e0b' : '#3b82f6';
  const cardW = 168;
  const cardH = phone ? 72 : 54;
  // Linha diagonal: de (0, totalH) para (lineX, 0)
  const lineX = 52;
  const totalW = lineX + cardW + 6;
  const totalH = 48 + cardH; // 48px de altura da linha

  return `
    <div style="position:relative;pointer-events:none;width:${totalW}px;height:${totalH}px;">
      <!-- SVG da linha diagonal -->
      <svg style="position:absolute;top:0;left:0;overflow:visible;pointer-events:none;"
        width="${totalW}" height="${totalH}">
        <defs>
          <linearGradient id="lmg${Math.round(Math.random()*9999)}" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${glow}" stop-opacity="0.95"/>
            <stop offset="100%" stop-color="${glow}" stop-opacity="0.3"/>
          </linearGradient>
          <filter id="lmf" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <!-- Ponto de origem: onde o marcador fica (centro esquerdo do label) -->
        <circle cx="0" cy="${totalH}" r="3.5" fill="${glow}" filter="url(#lmf)"/>
        <!-- Linha diagonal para o card -->
        <line x1="0" y1="${totalH}" x2="${lineX}" y2="0"
          stroke="${glow}" stroke-width="1.5" stroke-linecap="round"
          stroke-dasharray="none" filter="url(#lmf)" opacity="0.85"/>
        <!-- Ponto de chegada no card -->
        <circle cx="${lineX}" cy="0" r="2.5" fill="${glow}" opacity="0.6"/>
      </svg>
      <!-- Card glassmorphism -->
      <div style="
        position:absolute;top:0;left:${lineX + 4}px;
        width:${cardW}px;
        background:linear-gradient(145deg,rgba(10,18,36,0.88),rgba(20,32,56,0.72));
        border:1px solid rgba(255,255,255,0.13);
        border-top:1.5px solid ${glow}66;
        border-left:1px solid ${glow}33;
        -webkit-backdrop-filter:blur(18px);
        backdrop-filter:blur(18px);
        border-radius:13px;
        padding:10px 13px;
        box-shadow:0 12px 40px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.07);
        pointer-events:none;
        min-width:140px;
      ">
        <div style="font-size:13px;font-weight:900;color:#f1f5f9;letter-spacing:0.01em;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:${cardW-26}px;
          text-shadow:0 1px 3px rgba(0,0,0,0.4);">
          ${name}
        </div>
        ${phone ? `
        <div style="font-size:11px;color:#94a3b8;margin-top:3px;font-weight:600;
          display:flex;align-items:center;gap:4px;">
          <span style="opacity:0.6">📱</span>${phone}
        </div>` : ''}
        <div style="margin-top:7px;display:flex;align-items:center;gap:7px;">
          <div style="flex:1;height:3px;border-radius:9px;background:rgba(255,255,255,0.08);overflow:hidden;">
            <div style="height:100%;width:${Math.min(100, meta > 0 ? Math.round((collected/meta)*100) : 0)}%;
              background:linear-gradient(90deg,${glow}cc,${glow});
              border-radius:9px;transition:width 0.5s ease;"></div>
          </div>
          <span style="font-size:11px;font-weight:900;color:${glow};white-space:nowrap;
            text-shadow:0 0 8px ${glow}66;">
            ${collected}${meta ? `/${meta}` : ''}
          </span>
        </div>
      </div>
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
  const labelsLayerRef  = useRef(null); // camada separada para labels
  const [ready, setReady] = useState(Boolean(window.L));
  const [openLabelId, setOpenLabelId] = useState(null); // ID da sessão com label aberta

  const now = Date.now();
  const activeSessions = useMemo(
    () => (sessions || []).filter((s) => isLiveSessionOnline(s, now) && s.location?.lat && s.location?.lng),
    [now, sessions],
  );
  const responsePoints = useMemo(
    () => (responses || []).filter((r) => r.location?.lat && r.location?.lng).slice(0, 60),
    [responses],
  );

  // ── Carrega Leaflet ───────────────────────────────────────────
  useEffect(() => {
    injectMonitorMapStyles();

    if (window.L) { setReady(true); return; }

    if (!document.getElementById('leaflet-css')) {
      const css = document.createElement('link');
      css.id = 'leaflet-css'; css.rel = 'stylesheet';
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

  // ── Inicializa mapa ───────────────────────────────────────────
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

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    labelsLayerRef.current  = L.layerGroup().addTo(map);

    // Clicar no mapa (fora de marcador) fecha a label aberta
    map.on('click', () => setOpenLabelId(null));

    return () => {
      if (mapObj.current) { mapObj.current.remove(); mapObj.current = null; }
    };
  }, [ready]);

  // ── Renderiza marcadores ──────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapObj.current || !markersLayerRef.current) return;

    const L = window.L;
    markersLayerRef.current.clearLayers();
    labelsLayerRef.current?.clearLayers();

    const bounds = [];

    // Sessões ativas — com offset de proximidade
    activeSessions.forEach((session, idx) => {
      const offset = getProximityOffset(activeSessions, idx);
      const html = buildSessionMarkerHtml(session, now);

      const icon = L.divIcon({
        html,
        className: '',
        iconSize: [72, 72],
        // Aplica offset no anchor para afastar visualmente sessões próximas
        iconAnchor: [36 - offset.x, 36 - offset.y],
      });

      const marker = L.marker([session.location.lat, session.location.lng], {
        icon,
        zIndexOffset: 1000 + idx,
      }).addTo(markersLayerRef.current);

      marker.on('click', (e) => {
        e.originalEvent?.stopPropagation?.();
        // Toggle: clica de novo fecha
        setOpenLabelId((prev) => (prev === session.id ? null : session.id));
        onSelectSession?.(session);
      });

      bounds.push([session.location.lat, session.location.lng]);
    });

    // Respostas
    responsePoints.forEach((response) => {
      const html = buildResponseMarkerHtml(response, now);
      const icon = L.divIcon({ html, className: '', iconSize: [26, 26], iconAnchor: [13, 13] });
      const marker = L.marker([response.location.lat, response.location.lng], { icon })
        .addTo(markersLayerRef.current);
      marker.on('click', (e) => {
        e.originalEvent?.stopPropagation?.();
        onSelectResponse?.(response);
      });
      bounds.push([response.location.lat, response.location.lng]);
    });

    if (bounds.length === 1) {
      mapObj.current.setView(bounds[0], 15);
    } else if (bounds.length > 1) {
      mapObj.current.fitBounds(bounds, { padding: [48, 48] });
    }
  }, [activeSessions, now, onSelectResponse, onSelectSession, ready, responsePoints]);

  // ── Renderiza label da sessão selecionada ─────────────────────
  useEffect(() => {
    if (!ready || !mapObj.current || !labelsLayerRef.current) return;

    const L = window.L;
    labelsLayerRef.current.clearLayers();

    if (!openLabelId) return;

    const session = activeSessions.find((s) => s.id === openLabelId);
    if (!session) return;

    const html = buildLabelHtml(session);
    // iconAnchor = [0, totalH] faz o ponto (0, totalH) do SVG coincidir
    // exatamente com o lat/lng do marcador, que é onde a linha começa
    const lineX = 52;
    const cardH = (session.interviewerPhone || session.researcherPhone) ? 72 : 54;
    const totalH = 48 + cardH;
    const totalW = lineX + 168 + 6;

    const icon = L.divIcon({
      html,
      className: '',
      iconSize: [totalW, totalH],
      iconAnchor: [0, totalH], // âncora no canto inf-esq = origem da linha diagonal
    });

    L.marker([session.location.lat, session.location.lng], {
      icon,
      interactive: false,
      zIndexOffset: 2000,
    }).addTo(labelsLayerRef.current);

  }, [activeSessions, openLabelId, ready]);

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
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b' }}>clique no pesquisador para ver detalhes</span>
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