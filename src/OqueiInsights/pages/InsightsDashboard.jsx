// ============================================================
//  InsightsDashboard.jsx — Oquei Insights
// ============================================================
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { BarChart3, MapPin, TrendingUp, Users, RefreshCw, Download, Filter, Eye, X, ChevronRight, Zap, Plus, Trash2, Thermometer, SlidersHorizontal, FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, Btn, Badge, colors } from '../../components/ui';
import { styles as global } from '../../styles/globalStyles';

// ── Mini-gráfico de barras ────────────────────────────────────
function BarChart({ data, colorFn, label, total }) {
  if (!data.length) return <div style={{ textAlign:'center', padding:'20px', color:'var(--text-muted)', fontSize:'13px' }}>Sem dados</div>;
  const max = Math.max(...data.map(d=>d.count), 1);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
      {data.map(item => {
        const pct  = Math.round((item.count/max)*100);
        const dpct = total ? Math.round((item.count/total)*100) : 0;
        const col  = colorFn ? colorFn(item.key) : colors.primary;
        return (
          <div key={item.key}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
              <span style={{ fontSize:'12px', fontWeight:'700', color:'var(--text-main)' }}>{item.key}</span>
              <span style={{ fontSize:'12px', fontWeight:'900', color:col }}>{item.count} ({dpct}%)</span>
            </div>
            <div style={{ height:'8px', background:'var(--border)', borderRadius:'20px', overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:col, borderRadius:'20px', transition:'width 0.6s ease' }}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Gauge NPS ─────────────────────────────────────────────────
function NpsGauge({ nps }) {
  const color = nps >= 70 ? colors.success : nps >= 50 ? colors.primary : nps >= 0 ? colors.warning : colors.danger;
  const label = nps >= 70 ? 'Excelente' : nps >= 50 ? 'Bom' : nps >= 0 ? 'Neutro' : 'Crítico';
  const angle = ((nps + 100) / 200) * 180;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'8px' }}>
      <div style={{ position:'relative', width:'120px', height:'60px', overflow:'hidden' }}>
        <div style={{ width:'120px', height:'120px', borderRadius:'50%', border:`12px solid var(--border)`, borderBottom:'12px solid transparent', borderLeft:'12px solid transparent', position:'absolute', top:0, left:0, boxSizing:'border-box' }}/>
        <div style={{ width:'120px', height:'120px', borderRadius:'50%', border:`12px solid ${color}`, borderBottom:'12px solid transparent', borderLeft:'12px solid transparent', position:'absolute', top:0, left:0, boxSizing:'border-box', transform:`rotate(${angle-180}deg)`, transition:'transform 0.8s ease', opacity:0.9 }}/>
        <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', textAlign:'center' }}>
          <div style={{ fontSize:'22px', fontWeight:'900', color, lineHeight:1 }}>{nps}</div>
        </div>
      </div>
      <div style={{ fontSize:'12px', fontWeight:'800', color, background:`${color}15`, padding:'3px 12px', borderRadius:'20px' }}>{label}</div>
    </div>
  );
}

// ── Mapa SVG interativo ───────────────────────────────────────
function MapaRespostas({ responses, surveys, onSelectResposta, matchIds, mapMode, aiScores }) {
  const mapRef      = useRef(null);
  const mapObj      = useRef(null);  // instância Leaflet
  const markersRef  = useRef([]);
  const [ready, setReady] = useState(!!window.L);

  const comGps = responses.filter(r => r.location?.lat && r.location?.lng);

  // Carrega Leaflet (OSM) — 100% gratuito, sem chave de API
  useEffect(() => {
    if (window.L) { setReady(true); return; }
    if (document.getElementById('leaflet-css')) return;

    const css = document.createElement('link');
    css.id   = 'leaflet-css';
    css.rel  = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);

    const js = document.createElement('script');
    js.src  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    js.onload = () => setReady(true);
    document.head.appendChild(js);
  }, []);

  // Monta mapa quando Leaflet estiver pronto
  useEffect(() => {
    if (!ready || !mapRef.current || comGps.length === 0) return;
    if (mapObj.current) {
      mapObj.current.remove();
      mapObj.current = null;
    }

    // Centro calculado
    const lats = comGps.map(r => r.location.lat);
    const lngs = comGps.map(r => r.location.lng);
    const clat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const clng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

    const L = window.L;

    // Inicializa mapa com tema escuro (CartoDB Dark Matter — gratuito)
    const map = L.map(mapRef.current, {
      center: [clat, clng],
      zoom: comGps.length === 1 ? 14 : 12,
      zoomControl: false,
      attributionControl: false,
    });
    mapObj.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Agrupa pontos próximos (~80m)
    const grupos = [];
    comGps.forEach(r => {
      const g = grupos.find(g => {
        const d = Math.hypot(g.lat - r.location.lat, g.lng - r.location.lng);
        return d < 0.0007;
      });
      if (g) { g.items.push(r); g.lat = (g.lat + r.location.lat) / 2; g.lng = (g.lng + r.location.lng) / 2; }
      else grupos.push({ lat: r.location.lat, lng: r.location.lng, items: [r] });
    });

    // Marcadores SVG customizados
    grupos.forEach((g, idx) => {
      const isCluster = g.items.length > 1;
      const r0 = g.items[0];
      const nome   = (r0.researcherName || '?').split(' ')[0];
      const cidade = (r0.city || '').substring(0, 8).toUpperCase();
      const count  = g.items.length;

      // Determina cor do pin conforme modo ativo
      let pinColor1 = '#3b82f6', pinColor2 = '#8b5cf6', pinOpacity = 1;
      if (mapMode === 'filtro' && matchIds !== null) {
        const match = g.items.some(r => matchIds.has(r.id));
        if (match) { pinColor1 = '#10b981'; pinColor2 = '#059669'; }
        else        { pinColor1 = '#334155'; pinColor2 = '#1e293b'; pinOpacity = 0.35; }
      } else if (mapMode === 'ia' && aiScores) {
        // Score médio do grupo
        const scores = g.items.map(r => aiScores[r.id]?.score).filter(Boolean);
        const avg = scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : 0;
        if      (avg >= 9) { pinColor1 = '#ef4444'; pinColor2 = '#dc2626'; }
        else if (avg >= 7) { pinColor1 = '#f59e0b'; pinColor2 = '#d97706'; }
        else if (avg >= 4) { pinColor1 = '#3b82f6'; pinColor2 = '#2563eb'; }
        else if (avg >= 1) { pinColor1 = '#64748b'; pinColor2 = '#475569'; pinOpacity = 0.6; }
        else               { pinOpacity = 0.3; }
      }

      // Label extra no pin para modo IA
      const aiLabel = mapMode === 'ia' && !isCluster && aiScores?.[r0.id]
        ? String(aiScores[r0.id].score) : '';

      const svgPin = isCluster
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="64" viewBox="0 0 52 64">
            <defs>
              <filter id="gs${idx}"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#f59e0b" flood-opacity="0.6"/></filter>
            </defs>
            <ellipse cx="26" cy="58" rx="9" ry="3" fill="#f59e0b" opacity="0.25"/>
            <path d="M26 2C14 2 4 12 4 24c0 17 22 38 22 38s22-21 22-38C48 12 38 2 26 2Z" fill="#f59e0b" filter="url(#gs${idx})"/>
            <circle cx="26" cy="23" r="13" fill="rgba(255,255,255,0.12)"/>
            <text x="26" y="20" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" font-size="14" fill="#fff">${count}</text>
            <text x="26" y="31" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="7.5" fill="rgba(255,255,255,0.75)">LOCAIS</text>
          </svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="62" viewBox="0 0 48 62">
            <defs>
              <filter id="gs${idx}"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#3b82f6" flood-opacity="0.6"/></filter>
              <linearGradient id="gg${idx}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${pinColor1}"/><stop offset="100%" stop-color="${pinColor2}"/>
              </linearGradient>
            </defs>
            <ellipse cx="24" cy="57" rx="8" ry="3" fill="#3b82f6" opacity="0.25"/>
            <path d="M24 2C12 2 2 12 2 24c0 17 22 36 22 36s22-19 22-36C46 12 36 2 24 2Z" fill="url(#gg${idx})" filter="url(#gs${idx})"/>
            <circle cx="24" cy="23" r="12" fill="rgba(255,255,255,0.12)"/>
            <text x="24" y="20" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" font-size="10.5" fill="#fff">${nome.substring(0,4).toUpperCase()}</text>
            <text x="24" y="30" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="600" font-size="7" fill="rgba(255,255,255,0.7)">${cidade}</text>
          </svg>`;

      // AI tooltip title com motivo
      const aiTitle = mapMode === 'ia' && aiScores?.[r0.id]
        ? `Score: ${aiScores[r0.id].score}/10 — ${aiScores[r0.id].motivo}` : '';

      const icon = L.divIcon({
        html: `<div style="opacity:${pinOpacity};transition:opacity 0.3s">${svgPin}</div>`,
        className: '',
        iconSize:   isCluster ? [52, 64] : [48, 62],
        iconAnchor: isCluster ? [26, 64] : [24, 62],
      });

      const marker = L.marker([g.lat, g.lng], { icon })
        .addTo(map)
        .on('click', () => onSelectResposta(g.items.length === 1 ? g.items[0] : null, g.items));

      markersRef.current.push(marker);
    });

    // Fit bounds com todos os pontos
    if (comGps.length > 1) {
      map.fitBounds(
        comGps.map(r => [r.location.lat, r.location.lng]),
        { padding: [48, 48] }
      );
    }

    return () => {
      if (mapObj.current) { mapObj.current.remove(); mapObj.current = null; }
    };
  }, [ready, comGps.length]);

  if (comGps.length === 0) return (
    <div style={{ background:'var(--bg-app)', border:'1px solid var(--border)', borderRadius:'16px', padding:'48px', textAlign:'center', color:'var(--text-muted)' }}>
      <div style={{ fontSize:'32px', marginBottom:'12px', opacity:0.3 }}>📍</div>
      <div style={{ fontWeight:'700', fontSize:'14px', marginBottom:'4px' }}>Nenhuma resposta com GPS</div>
      <div style={{ fontSize:'12px' }}>As entrevistas com GPS ativo aparecerão aqui.</div>
    </div>
  );

  return (
    <div style={{ position:'relative' }}>
      {/* HUD de estatísticas */}
      <div style={{ position:'absolute', top:'12px', left:'12px', zIndex:1000, display:'flex', flexDirection:'column', gap:'6px', pointerEvents:'none' }}>
        {[
          { label:'COM GPS',    value: comGps.length,          color:'#3b82f6' },
          { label:'TOTAL',      value: responses.length,       color:'#8b5cf6' },
          { label:'COBERTURA',  value: `${Math.round((comGps.length / Math.max(responses.length,1))*100)}%`, color:'#10b981' },
        ].map(s => (
          <div key={s.label} style={{ background:'rgba(10,14,26,0.82)', backdropFilter:'blur(8px)', border:`1px solid ${s.color}30`, borderRadius:'8px', padding:'5px 12px', display:'flex', alignItems:'center', gap:'8px' }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:s.color, boxShadow:`0 0 6px ${s.color}` }}/>
            <span style={{ fontSize:'10px', fontWeight:'900', color:'#64748b', letterSpacing:'0.1em' }}>{s.label}</span>
            <span style={{ fontSize:'14px', fontWeight:'900', color:'#f1f5f9', marginLeft:'2px' }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Instrução */}
      <div style={{ position:'absolute', bottom:'12px', left:'50%', transform:'translateX(-50%)', zIndex:1000, background:'rgba(10,14,26,0.82)', backdropFilter:'blur(8px)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:'20px', padding:'5px 16px', fontSize:'11px', fontWeight:'700', color:'#64748b', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:'6px', pointerEvents:'none' }}>
        <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#3b82f6', display:'inline-block' }}/>
        Clique nos pins para ver os detalhes
      </div>

      <div ref={mapRef} style={{ width:'100%', height:'440px', borderRadius:'16px', overflow:'hidden', border:'1px solid rgba(59,130,246,0.15)', background:'#1a1f2e' }}/>

      {!ready && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'#1a1f2e', borderRadius:'16px', zIndex:999 }}>
          <div style={{ textAlign:'center', color:'#4a5568' }}>
            <div style={{ width:'32px', height:'32px', borderRadius:'50%', border:'3px solid rgba(59,130,246,0.2)', borderTopColor:'#3b82f6', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }}/>
            <div style={{ fontSize:'12px', fontWeight:'700' }}>Carregando mapa...</div>
          </div>
        </div>
      )}
    </div>
  );
}


// ── Modal de detalhes de resposta ─────────────────────────────
function ModalResposta({ resposta, grupo, surveys, onClose }) {
  const [selIdx, setSelIdx] = useState(0);
  const r = grupo ? grupo[selIdx] : resposta;
  if (!r) return null;

  const survey = surveys.find(s => s.id === r.surveyId);
  const questions = survey?.questions || [];

  const renderVal = (q, val) => {
    if (!val && val !== 0) return <span style={{ color:'var(--text-muted)', fontStyle:'italic' }}>Não respondida</span>;
    if (q.type === 'nps') {
      const n = Number(val);
      const c = n<=3?colors.danger:n<=6?colors.warning:n<=8?colors.primary:colors.success;
      return <span style={{ fontWeight:'900', fontSize:'20px', color:c }}>{val}</span>;
    }
    if (q.type === 'boolean') return <span style={{ fontWeight:'800', color: val === 'Sim' ? colors.success : colors.danger }}>{val}</span>;
    if (Array.isArray(val)) return (
      <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
        {val.map((v, i) => <span key={i} style={{ background:`${colors.primary}15`, border:`1px solid ${colors.primary}30`, borderRadius:'6px', padding:'2px 8px', fontSize:'12px', fontWeight:'700', color:colors.primary }}>{v}</span>)}
      </div>
    );
    return <span style={{ fontWeight:'700' }}>{val}</span>;
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'var(--bg-card)', borderRadius:'18px', width:'100%', maxWidth:'560px', maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.5)' }}>
        {/* Header */}
        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexShrink:0 }}>
          <div>
            <div style={{ fontWeight:'900', fontSize:'16px', color:'var(--text-main)' }}>{r.researcherName || 'Pesquisador'}</div>
            <div style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'3px', display:'flex', gap:'10px', flexWrap:'wrap' }}>
              <span>📋 {r.surveyTitle || 'Pesquisa'}</span>
              {r.city && <span>📍 {r.city}</span>}
              {r.numero && <span>#{r.numero}</span>}
              {r.timestamp?.toDate && <span>🗓 {r.timestamp.toDate().toLocaleString('pt-BR')}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:'4px' }}><X size={20}/></button>
        </div>

        {/* Seletor se grupo */}
        {grupo && grupo.length > 1 && (
          <div style={{ padding:'10px 24px', borderBottom:'1px solid var(--border)', display:'flex', gap:'6px', flexWrap:'wrap', flexShrink:0 }}>
            {grupo.map((item, i) => (
              <button key={item.id} onClick={() => setSelIdx(i)}
                style={{ padding:'4px 12px', borderRadius:'7px', border:'none', cursor:'pointer', fontSize:'11px', fontWeight:'800', background: i === selIdx ? colors.primary : 'var(--bg-app)', color: i === selIdx ? '#fff' : 'var(--text-muted)' }}>
                {(item.researcherName||'?').split(' ')[0]}
              </button>
            ))}
          </div>
        )}

        {/* Respostas */}
        <div style={{ overflowY:'auto', padding:'16px 24px 24px', display:'flex', flexDirection:'column', gap:'12px' }}>
          {questions.length === 0 ? (
            <div style={{ textAlign:'center', padding:'20px', color:'var(--text-muted)', fontSize:'13px' }}>Perguntas não disponíveis.</div>
          ) : questions.map((q, i) => (
            <div key={q.id} style={{ background:'var(--bg-app)', border:'1px solid var(--border)', borderRadius:'10px', padding:'12px 14px' }}>
              <div style={{ fontSize:'11px', fontWeight:'900', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:'5px' }}>Pergunta {i+1}</div>
              <div style={{ fontSize:'13px', fontWeight:'700', color:'var(--text-main)', marginBottom:'8px', lineHeight:1.4 }}>{q.label}</div>
              <div style={{ fontSize:'14px' }}>{renderVal(q, r.answers?.[q.id])}</div>
            </div>
          ))}
          {r.location?.lat && (
            <div style={{ background:`${colors.info}10`, border:`1px solid ${colors.info}30`, borderRadius:'10px', padding:'10px 14px', fontSize:'12px', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:'6px' }}>
              <MapPin size={13} color={colors.info}/> GPS: {r.location.lat.toFixed(5)}, {r.location.lng.toFixed(5)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ── Modal Log da IA ───────────────────────────────────────────
function ModalAiLog({ log, aiScores, responses, survey, onClose }) {
  const [tab, setTab] = React.useState('log'); // log | leads

  const quentes = Object.entries(aiScores)
    .map(([id, s]) => ({ id, ...s, r: responses.find(r => r.id === id) }))
    .filter(s => s.score >= 7)
    .sort((a, b) => b.score - a.score);

  const scoreColor = s => s >= 9 ? '#ef4444' : s >= 7 ? '#f59e0b' : s >= 4 ? '#3b82f6' : '#64748b';
  const scoreLabel = s => s >= 9 ? '🔴 Muito Quente' : s >= 7 ? '🟡 Quente' : s >= 4 ? '🔵 Morno' : '⚫ Frio';

  const logColor = type => ({
    success: '#10b981', error: '#ef4444', warn: '#f59e0b',
    info: 'var(--text-muted)', divider: 'var(--border)',
  })[type] || 'var(--text-muted)';

  const exportLeads = () => {
    const rows = [['Score','Temperatura','Nome','Cidade','Nº','Motivo da IA']];
    quentes.forEach(s => rows.push([
      s.score, scoreLabel(s.score).replace(/[🔴🟡🔵⚫] /,''),
      s.r?.researcherName||'', s.r?.city||'', s.r?.numero||'', s.motivo
    ]));
    const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿'+csv], {type:'text/csv;charset=utf-8;'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='leads-quentes.csv'; a.click();
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{ background:'var(--bg-card)', borderRadius:'20px', width:'100%', maxWidth:'700px', maxHeight:'88vh', display:'flex', flexDirection:'column', boxShadow:'0 32px 80px rgba(0,0,0,0.6)', border:'1px solid rgba(139,92,246,0.2)' }}>

        {/* Header */}
        <div style={{ padding:'20px 24px 0', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
              <div style={{ width:'40px', height:'40px', borderRadius:'11px', background:'linear-gradient(135deg,#f59e0b,#ef4444)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px #f59e0b44' }}>
                <Zap size={20} color="#fff"/>
              </div>
              <div>
                <div style={{ fontWeight:'900', fontSize:'17px', color:'var(--text-main)' }}>Relatório — IA Leads Quentes</div>
                <div style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'2px' }}>
                  {survey?.title} · {Object.keys(aiScores).length} respondentes · {quentes.length} leads quentes
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:'4px' }}>
              <X size={20}/>
            </button>
          </div>

          {/* KPIs rápidos */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px', marginBottom:'16px' }}>
            {[
              { label:'Muito Quentes', value: Object.values(aiScores).filter(s=>s.score>=9).length, c:'#ef4444' },
              { label:'Quentes',       value: Object.values(aiScores).filter(s=>s.score>=7&&s.score<9).length, c:'#f59e0b' },
              { label:'Mornos',        value: Object.values(aiScores).filter(s=>s.score>=4&&s.score<7).length, c:'#3b82f6' },
              { label:'Frios',         value: Object.values(aiScores).filter(s=>s.score<4).length, c:'#64748b' },
            ].map(k => (
              <div key={k.label} style={{ background:'var(--bg-app)', border:`1px solid ${k.c}30`, borderRadius:'10px', padding:'10px 12px', textAlign:'center' }}>
                <div style={{ fontSize:'22px', fontWeight:'900', color:k.c }}>{k.value}</div>
                <div style={{ fontSize:'10px', fontWeight:'800', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginTop:'2px' }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:'4px', background:'var(--bg-panel)', borderRadius:'10px', padding:'3px', marginBottom:'0' }}>
            {[{id:'log',label:'📋 Log de Execução'},{id:'leads',label:`🔥 Leads Quentes (${quentes.length})`}].map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{ flex:1, padding:'7px', borderRadius:'7px', border:'none', cursor:'pointer', fontWeight:'800', fontSize:'12px', background: tab===t.id ? 'var(--bg-card)' : 'transparent', color: tab===t.id ? 'var(--text-main)' : 'var(--text-muted)', boxShadow: tab===t.id ? 'var(--shadow-sm)' : 'none', transition:'all 0.15s' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo */}
        <div style={{ overflowY:'auto', flex:1, padding:'16px 24px 24px' }}>

          {/* Tab: Log */}
          {tab === 'log' && (
            <div style={{ fontFamily:'monospace', fontSize:'12px', display:'flex', flexDirection:'column', gap:'3px' }}>
              {log.map((entry, i) => (
                <div key={i} style={{ display:'flex', gap:'10px', alignItems:'flex-start', padding:'4px 0', borderBottom: entry.type==='divider' ? '1px solid var(--border)' : 'none' }}>
                  {entry.type !== 'divider' && (
                    <span style={{ color:'var(--text-muted)', opacity:0.6, flexShrink:0, fontSize:'10px', marginTop:'1px' }}>{entry.time}</span>
                  )}
                  <span style={{ color: logColor(entry.type), lineHeight:1.5 }}>{entry.msg}</span>
                </div>
              ))}
              {log.length === 0 && <div style={{ color:'var(--text-muted)', textAlign:'center', padding:'20px' }}>Nenhum log disponível.</div>}
            </div>
          )}

          {/* Tab: Leads Quentes */}
          {tab === 'leads' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'4px' }}>
                <button onClick={exportLeads}
                  style={{ display:'flex', alignItems:'center', gap:'5px', padding:'6px 12px', borderRadius:'8px', border:'1px solid var(--border)', background:'var(--bg-app)', color:'var(--text-muted)', fontSize:'11px', fontWeight:'800', cursor:'pointer' }}>
                  <Download size={11}/> Exportar CSV
                </button>
              </div>
              {quentes.length === 0 && (
                <div style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)', fontSize:'13px' }}>Nenhum lead quente encontrado (score ≥ 7).</div>
              )}
              {quentes.map((s, i) => {
                const r = s.r;
                const questions = survey?.questions || [];
                return (
                  <div key={s.id} style={{ background:'var(--bg-app)', border:`1px solid ${scoreColor(s.score)}30`, borderLeft:`4px solid ${scoreColor(s.score)}`, borderRadius:'12px', padding:'14px 16px' }}>
                    {/* Cabeçalho do lead */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        <div style={{ width:'36px', height:'36px', borderRadius:'9px', background:`${scoreColor(s.score)}20`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'900', fontSize:'16px', color:scoreColor(s.score) }}>
                          {s.score}
                        </div>
                        <div>
                          <div style={{ fontWeight:'900', fontSize:'14px', color:'var(--text-main)' }}>{r?.researcherName || 'Pesquisador'}</div>
                          <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'2px', display:'flex', gap:'8px' }}>
                            {r?.city && <span>📍 {r.city}</span>}
                            {r?.numero && <span>#{r.numero}</span>}
                            {r?.timestamp?.toDate && <span>🗓 {r.timestamp.toDate().toLocaleDateString('pt-BR')}</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'4px' }}>
                        <span style={{ background:`${scoreColor(s.score)}20`, color:scoreColor(s.score), borderRadius:'6px', padding:'3px 10px', fontSize:'11px', fontWeight:'900' }}>
                          {scoreLabel(s.score)}
                        </span>
                        <span style={{ fontSize:'11px', color:'var(--text-muted)', fontStyle:'italic' }}>"{s.motivo}"</span>
                      </div>
                    </div>
                    {/* Respostas relevantes */}
                    <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                      {questions.map(q => {
                        const val = r?.answers?.[q.id];
                        if (!val && val !== 0) return null;
                        const display = Array.isArray(val) ? val.join(', ') : String(val);
                        return (
                          <div key={q.id} style={{ display:'flex', gap:'8px', fontSize:'12px' }}>
                            <span style={{ color:'var(--text-muted)', flexShrink:0, minWidth:'120px', maxWidth:'180px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{q.label}:</span>
                            <span style={{ fontWeight:'700', color:'var(--text-main)' }}>{display}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function InsightsDashboard({ userData, aiState, setAiState }) {
  const [surveys,    setSurveys]    = useState([]);
  const [responses,  setResponses]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selSurvey,  setSelSurvey]  = useState('all');
  const [selCity,    setSelCity]    = useState('all');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [modalData,     setModalData]     = useState(null);
  // Estado da IA — elevado para OqueiInsights para sobreviver à troca de aba
  const mapMode      = aiState.mapMode;
  const setMapMode   = v => setAiState(s => ({ ...s, mapMode: typeof v === 'function' ? v(s.mapMode) : v }));
  const aiScores     = aiState.aiScores;
  const setAiScores  = v => setAiState(s => ({ ...s, aiScores: typeof v === 'function' ? v(s.aiScores) : v }));
  const aiLog        = aiState.aiLog;
  const setAiLog     = v => setAiState(s => ({ ...s, aiLog: typeof v === 'function' ? v(s.aiLog) : v }));
  const aiSurveySnap = aiState.aiSurveySnap;
  const setAiSurveySnap = v => setAiState(s => ({ ...s, aiSurveySnap: typeof v === 'function' ? v(s.aiSurveySnap) : v }));

  // Estado local — pode resetar normalmente
  const [filtrosCruz,   setFiltrosCruz]   = useState([]);
  const [aiLoading,     setAiLoading]     = useState(false);
  const [aiError,       setAiError]       = useState('');
  const [showFiltroPanel, setShowFiltroPanel] = useState(false);
  const [showAiLog,      setShowAiLog]      = useState(false);

  useEffect(() => {
    const unsubSurveys = onSnapshot(collection(db, 'surveys'), snap => {
      const list = snap.docs.map(d => ({ id:d.id, ...d.data() })).filter(s => s.status === 'active' || s.status === 'finished');
      setSurveys(list);
      setSelSurvey(prev => (prev !== 'all' && !list.find(s => s.id === prev)) ? 'all' : prev);
    }, () => {});

    const unsubResponses = onSnapshot(collection(db, 'survey_responses'), snap => {
      setResponses(snap.docs.map(d => ({ id:d.id, ...d.data() })));
      setLastUpdate(new Date());
      setLoading(false);
    }, () => setLoading(false));

    return () => { unsubSurveys(); unsubResponses(); };
  }, []);

  const surveyIds = useMemo(() => new Set(surveys.map(s => s.id)), [surveys]);

  const filtered = useMemo(() => {
    let list = responses.filter(r =>
      surveyIds.has(r.surveyId) &&
      (r.auditStatus === 'aceita' || r.auditStatus === undefined || r.auditStatus === null)
    );
    if (selSurvey !== 'all') list = list.filter(r => r.surveyId === selSurvey);
    if (selCity   !== 'all') list = list.filter(r => r.city === selCity);
    return list;
  }, [responses, surveyIds, selSurvey, selCity]);

  // IDs de respostas que batem com TODOS os filtros de cruzamento — depende de filtered
  const matchIds = useMemo(() => {
    if (mapMode !== 'filtro' || !filtrosCruz.length) return null;
    return new Set(
      filtered.filter(r =>
        filtrosCruz.every(f => {
          const ans = r.answers?.[f.qId];
          const q = surveys.flatMap(s => s.questions || []).find(q => q.id === f.qId);
          if (Array.isArray(ans)) return ans.includes(f.valor);
          if (q?.type === 'nps') return Number(ans) >= Number(f.valor);
          return String(ans || '') === f.valor;
        })
      ).map(r => r.id)
    );
  }, [filtered, filtrosCruz, mapMode]);

  const cities = useMemo(() => [...new Set(responses.map(r => r.city).filter(Boolean))].sort(), [responses]);

  const analytics = useMemo(() => {
    const selSurveyData = selSurvey !== 'all' ? surveys.find(s => s.id === selSurvey) : null;
    const questions = selSurveyData?.questions || [];
    const qAnalytics = questions.map(q => {
      const allAnswers = filtered.map(r => r.answers?.[q.id]).filter(a => a !== undefined && a !== null && a !== '');
      if (!allAnswers.length) return { q, data:[], nps:null };
      if (q.type === 'nps') {
        const nums = allAnswers.map(Number).filter(n => !isNaN(n));
        const promoters  = nums.filter(n=>n>=9).length;
        const detractors = nums.filter(n=>n<=6).length;
        const total      = nums.length;
        const nps  = total > 0 ? Math.round(((promoters-detractors)/total)*100) : 0;
        const avg  = total > 0 ? (nums.reduce((a,b)=>a+b,0)/total).toFixed(1) : 0;
        const dist = Array.from({length:11},(_,i)=>({ key:String(i), count:nums.filter(n=>n===i).length }));
        return { q, data:dist, nps, avg, promoters, detractors, total };
      }
      const counts = {};
      if (q.type === 'multiselect') {
        allAnswers.forEach(a => { (Array.isArray(a) ? a : [a]).forEach(item => { if (item) counts[item] = (counts[item]||0)+1; }); });
      } else {
        allAnswers.forEach(a => { counts[String(a)] = (counts[String(a)]||0)+1; });
      }
      const data = Object.entries(counts).map(([key,count]) => ({ key, count })).sort((a,b)=>b.count-a.count);
      return { q, data, nps:null, total:allAnswers.length };
    });
    return { questions: qAnalytics };
  }, [filtered, surveys, selSurvey]);

  const npsColor = n => n>=9?colors.success:n>=7?colors.primary:n>=5?colors.warning:colors.danger;

  // ── Análise de IA via Gemini ─────────────────────────────────
  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    setAiLog(l => [...l, { time, msg, type }]);
  };

  const runAiAnalysis = async () => {
    if (!selSurvey || selSurvey === 'all') {
      setAiError('Selecione uma pesquisa específica para análise de IA.'); return;
    }
    const geminiKey = import.meta.env?.VITE_GEMINI_API_KEY || '';
    if (!geminiKey) { setAiError('Chave Gemini não encontrada. Adicione VITE_GEMINI_API_KEY no .env'); return; }

    const survey = surveys.find(s => s.id === selSurvey);
    if (!survey) return;
    const respostas = filtered.filter(r => r.location?.lat);
    if (!respostas.length) { setAiError('Nenhuma resposta com GPS para analisar.'); return; }

    // Reset log e inicia
    setAiLog([]);
    setAiScores({});
    setAiSurveySnap(survey);
    setAiLoading(true);
    setAiError('');
    setMapMode('ia');

    addLog(`🚀 Análise iniciada — pesquisa: "${survey.title}"`, 'info');
    addLog(`📊 ${respostas.length} respondente(s) com GPS encontrados`, 'info');
    addLog(`🔑 Modelo: Gemini 2.5 Flash`, 'info');

    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
    const lotes = [];
    for (let i = 0; i < respostas.length; i += 10) lotes.push(respostas.slice(i, i + 10));
    addLog(`📦 ${lotes.length} lote(s) de até 10 respondentes cada`, 'info');

    const novosScores = {};
    let loteIdx = 0;

    for (const lote of lotes) {
      loteIdx++;
      addLog(`⏳ Processando lote ${loteIdx}/${lotes.length} (${lote.length} respondentes)...`, 'info');

      const payload = lote.map(r => ({
        id: r.id,
        nome: r.researcherName || 'N/A',
        cidade: r.city || '',
        respostas: (survey.questions || []).map(q => ({
          pergunta: q.label,
          resposta: (() => { const v = r.answers?.[q.id]; return Array.isArray(v) ? v.join(', ') : (v || ''); })()
        }))
      }));

      const prompt = `Você é especialista em propensão de compra para Oquei Telecom (empresa de internet).
Analise cada respondente e retorne JSON: {"scores":[{"id":"...","score":1-10,"motivo":"até 12 palavras"}]}
Score: 1-3=frio, 4-6=morno, 7-8=quente, 9-10=muito quente. Foque em: insatisfação com provedor atual, fora da fidelidade, sem proposta recebida, interesse em trocar.
Retorne APENAS o JSON.
Dados: ${JSON.stringify(payload)}`;

      try {
        const res = await fetch(GEMINI_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 2048, responseMimeType: 'application/json' },
          }),
        });

        if (!res.ok) {
          const e = await res.json().catch(()=>({}));
          const msg = e?.error?.message || res.status;
          addLog(`❌ Erro HTTP no lote ${loteIdx}: ${msg}`, 'error');
          setAiError(`Gemini: ${msg}`);
          break;
        }

        const data = await res.json();
        let text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
        text = text.replace(/```json|```/g, '').trim();

        let parsed = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          const match = text.match(/\{[\s\S]*"scores"[\s\S]*\}/);
          if (match) {
            try { parsed = JSON.parse(match[0]); } catch {
              const scoreMatches = text.matchAll(/\{"id"\s*:\s*"([^"]+)"\s*,\s*"score"\s*:\s*(\d+)\s*,\s*"motivo"\s*:\s*"([^"]+)"\}/g);
              const scores = [];
              for (const m of scoreMatches) scores.push({ id: m[1], score: Number(m[2]), motivo: m[3] });
              if (scores.length) parsed = { scores };
            }
          }
          if (!parsed) addLog(`⚠ Lote ${loteIdx}: JSON malformado, tentativa de recuperação`, 'warn');
        }

        if (parsed?.scores) {
          let quentes = 0, mornos = 0, frios = 0;
          parsed.scores.forEach(s => {
            if (s.id && s.score) {
              novosScores[s.id] = { score: Number(s.score), motivo: s.motivo || '' };
              if (s.score >= 7) quentes++;
              else if (s.score >= 4) mornos++;
              else frios++;
            }
          });
          addLog(`✅ Lote ${loteIdx} processado — 🔥 ${quentes} quente(s), 🔵 ${mornos} morno(s), ⚫ ${frios} frio(s)`, 'success');
        } else {
          addLog(`⚠ Lote ${loteIdx}: nenhum score extraído`, 'warn');
        }

      } catch(e) {
        addLog(`❌ Lote ${loteIdx} falhou: ${e.message}`, 'error');
        console.error('Lote falhou:', e);
      }
    }

    // Resumo final
    const total = Object.keys(novosScores).length;
    const muitoQuentes = Object.values(novosScores).filter(s => s.score >= 9).length;
    const quentes      = Object.values(novosScores).filter(s => s.score >= 7 && s.score < 9).length;
    const mornos       = Object.values(novosScores).filter(s => s.score >= 4 && s.score < 7).length;
    const frios        = Object.values(novosScores).filter(s => s.score < 4).length;

    if (!total) {
      setAiError('Gemini não retornou resultados. Tente novamente.');
      addLog('❌ Análise encerrada sem resultados', 'error');
    } else {
      addLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'divider');
      addLog(`📋 RESUMO FINAL — ${total} respondentes analisados`, 'info');
      addLog(`🔴 Muito quentes (9-10): ${muitoQuentes}`, 'success');
      addLog(`🟡 Quentes (7-8): ${quentes}`, 'success');
      addLog(`🔵 Mornos (4-6): ${mornos}`, 'info');
      addLog(`⚫ Frios (1-3): ${frios}`, 'info');
      addLog(`🎯 Taxa de leads quentes: ${Math.round(((muitoQuentes+quentes)/total)*100)}%`, 'success');
    }

    setAiScores(novosScores);
    setAiLoading(false);
  };

  const exportCSV = () => {
    const rows = [['ID','Survey','Pesquisador','Cidade','Lat','Lng','Data',...(surveys.find(s=>s.id===selSurvey)?.questions||[]).map(q=>q.label)]];
    filtered.forEach(r => {
      const qs = (surveys.find(s=>s.id===r.surveyId)?.questions||[]).map(q => {
        const v = r.answers?.[q.id];
        return Array.isArray(v) ? v.join(' | ') : (v || '');
      });
      rows.push([r.id, r.surveyTitle||'', r.researcherName||'', r.city||'', r.location?.lat||'', r.location?.lng||'', r.timestamp?.toDate?.()?.toLocaleDateString('pt-BR')||'', ...qs]);
    });
    const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff'+csv], { type:'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='oquei-insights.csv'; a.click();
  };

  const inp = { padding:'8px 12px', borderRadius:'9px', border:'1px solid var(--border)', outline:'none', fontSize:'13px', color:'var(--text-main)', background:'var(--bg-app)', fontFamily:'inherit', cursor:'pointer' };

  return (
    <div style={{ ...global.container }}>
      {/* Cabeçalho */}
      <div style={{ background:'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-panel) 100%)', border:'1px solid var(--border)', borderRadius:'20px', padding:'24px 32px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'16px', boxShadow:'var(--shadow-sm)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <div style={{ width:'50px', height:'50px', borderRadius:'14px', background:`linear-gradient(135deg, ${colors.danger}, ${colors.amber})`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 6px 18px ${colors.danger}44` }}>
            <BarChart3 size={24} color="#fff"/>
          </div>
          <div>
            <div style={{ fontSize:'21px', fontWeight:'900', color:'var(--text-main)' }}>Dashboard</div>
            <div style={{ fontSize:'13px', color:'var(--text-muted)', marginTop:'2px' }}>Atualizado às {lastUpdate.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} · apenas entrevistas aceitas</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap' }}>
          <Btn variant="secondary" size="sm" onClick={() => setLastUpdate(new Date())} style={{ display:'flex', alignItems:'center', gap:'5px' }}><RefreshCw size={13}/> Atualizar</Btn>
          <Btn variant="secondary" size="sm" onClick={exportCSV} style={{ display:'flex', alignItems:'center', gap:'5px' }}><Download size={13}/> Exportar CSV</Btn>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <div style={{ display:'flex', gap:'12px', alignItems:'center', flexWrap:'wrap' }}>
          <Filter size={16} color="var(--text-muted)"/>
          <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
            <span style={{ fontSize:'12px', fontWeight:'800', color:'var(--text-muted)' }}>Pesquisa:</span>
            <select style={inp} value={selSurvey} onChange={e => setSelSurvey(e.target.value)}>
              <option value="all">Todas</option>
              {surveys.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
          </div>
          <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
            <span style={{ fontSize:'12px', fontWeight:'800', color:'var(--text-muted)' }}>Cidade:</span>
            <select style={inp} value={selCity} onChange={e => setSelCity(e.target.value)}>
              <option value="all">Todas</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ marginLeft:'auto', fontSize:'12px', fontWeight:'800', color:'var(--text-muted)' }}>
            {filtered.length} resposta{filtered.length!==1?'s':''} encontrada{filtered.length!==1?'s':''}
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'16px' }}>
        {[
          { label:'Total de Respostas', value: filtered.length,                                       color:colors.primary },
          { label:'Pesquisadores',      value: new Set(filtered.map(r=>r.researcherName)).size,        color:colors.purple  },
          { label:'Cidades Cobertas',   value: new Set(filtered.map(r=>r.city).filter(Boolean)).size,  color:colors.success },
          { label:'Com GPS',            value: filtered.filter(r=>r.location?.lat).length,             color:colors.info    },
        ].map(k => (
          <div key={k.label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderLeft:`4px solid ${k.color}`, borderRadius:'14px', padding:'18px', boxShadow:'var(--shadow-sm)' }}>
            <div style={{ fontSize:'11px', fontWeight:'900', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{k.label}</div>
            <div style={{ fontSize:'28px', fontWeight:'900', color:'var(--text-main)', lineHeight:1.1, marginTop:'4px' }}>{loading?'...':k.value}</div>
          </div>
        ))}
      </div>

      {/* Mapa interativo */}
      <Card>
        {/* Header do mapa com controles */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', flexWrap:'wrap', gap:'10px' }}>
          <div>
            <div style={{ fontWeight:'900', fontSize:'15px', color:'var(--text-main)' }}>Mapa de Respostas</div>
            <div style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'2px' }}>
              {mapMode === 'filtro' && matchIds
                ? `🎯 ${matchIds.size} de ${filtered.length} respondem aos filtros`
                : mapMode === 'ia' && Object.keys(aiScores).length
                  ? `🔥 ${Object.keys(aiScores).length} respondentes analisados pela IA`
                  : 'Clique nos marcadores para ver detalhes'
              }
            </div>
          </div>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            {/* Botão Filtro Cruzado */}
            <button onClick={() => { setShowFiltroPanel(v => !v); setMapMode(m => m === 'filtro' ? 'normal' : 'filtro'); }}
              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', borderRadius:'10px', border:`1px solid ${mapMode==='filtro' ? colors.primary : 'var(--border)'}`, background: mapMode==='filtro' ? `${colors.primary}15` : 'var(--bg-app)', color: mapMode==='filtro' ? colors.primary : 'var(--text-muted)', fontWeight:'800', fontSize:'12px', cursor:'pointer', transition:'all 0.15s' }}>
              <SlidersHorizontal size={13}/> Filtro Cruzado
              {filtrosCruz.length > 0 && <span style={{ background:colors.primary, color:'#fff', borderRadius:'10px', padding:'1px 6px', fontSize:'10px' }}>{filtrosCruz.length}</span>}
            </button>
            {/* Botão IA */}
            <button onClick={runAiAnalysis} disabled={aiLoading}
              style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', borderRadius:'10px', border:`1px solid ${mapMode==='ia' ? '#f59e0b' : 'var(--border)'}`, background: mapMode==='ia' ? '#f59e0b15' : 'var(--bg-app)', color: mapMode==='ia' ? '#f59e0b' : 'var(--text-muted)', fontWeight:'800', fontSize:'12px', cursor: aiLoading ? 'not-allowed' : 'pointer', transition:'all 0.15s' }}>
              {aiLoading ? <><Zap size={13} style={{ animation:'spin 0.8s linear infinite' }}/> Analisando...</>
                         : <><Zap size={13}/> IA · Leads Quentes</>}
            </button>
            {/* Botão Ver Log — aparece após análise */}
            {aiLog.length > 0 && (
              <button onClick={() => setShowAiLog(true)}
                style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', borderRadius:'10px', border:'1px solid rgba(139,92,246,0.4)', background:'rgba(139,92,246,0.08)', color:'#8b5cf6', fontWeight:'800', fontSize:'12px', cursor:'pointer', transition:'all 0.15s' }}>
                <FileText size={13}/> Ver Log da IA
              </button>
            )}
            {mapMode !== 'normal' && (
              <button onClick={() => { setMapMode('normal'); setShowFiltroPanel(false); }}
                style={{ display:'flex', alignItems:'center', gap:'5px', padding:'8px 12px', borderRadius:'10px', border:'1px solid var(--border)', background:'var(--bg-app)', color:'var(--text-muted)', fontWeight:'800', fontSize:'12px', cursor:'pointer' }}>
                <X size={12}/> Limpar
              </button>
            )}
          </div>
        </div>

        {/* Painel de filtros cruzados */}
        {showFiltroPanel && selSurvey !== 'all' && (() => {
          const survey = surveys.find(s => s.id === selSurvey);
          const questions = survey?.questions || [];
          // Gera opções de resposta conforme tipo da pergunta
          const getOpcoes = (q) => {
            if (!q) return [];
            if (q.type === 'boolean') return ['Sim', 'Não'];
            if (q.type === 'nps') return ['0','1','2','3','4','5','6','7','8','9','10'];
            if (q.type === 'select' || q.type === 'multiselect') return q.options || [];
            return []; // text: campo livre abaixo
          };
          return (
            <div style={{ background:'var(--bg-app)', border:`1px solid ${colors.primary}30`, borderRadius:'12px', padding:'14px', marginBottom:'16px', display:'flex', flexDirection:'column', gap:'10px' }}>
              <div style={{ fontSize:'12px', fontWeight:'900', color:colors.primary, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                🎯 Filtro de Cruzamento — pins coloridos = clientes que atendem TODAS as condições
              </div>
              {filtrosCruz.map((f, i) => {
                const q = questions.find(q => q.id === f.qId);
                const opcoes = getOpcoes(q);
                const isText = q?.type === 'text';
                const isNps  = q?.type === 'nps';
                return (
                  <div key={i} style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
                    <span style={{ fontSize:'11px', fontWeight:'800', color:'var(--text-muted)', minWidth:'16px', textAlign:'center' }}>{i+1}</span>
                    <select value={f.qId} onChange={e => setFiltrosCruz(fc => fc.map((x,j) => j===i ? {...x, qId: e.target.value, valor:''} : x))}
                      style={{ flex:2, padding:'7px 10px', borderRadius:'8px', border:'1px solid var(--border)', background:'var(--bg-panel)', color:'var(--text-main)', fontSize:'12px', outline:'none' }}>
                      <option value="">Pergunta...</option>
                      {questions.map(q => <option key={q.id} value={q.id}>{q.label.substring(0,50)}</option>)}
                    </select>
                    <span style={{ color:'var(--text-muted)', fontSize:'12px' }}>{isNps ? '≥' : 'é'}</span>
                    {isText ? (
                      <input value={f.valor}
                        onChange={e => setFiltrosCruz(fc => fc.map((x,j) => j===i ? {...x, valor: e.target.value} : x))}
                        placeholder="Digite o valor..."
                        style={{ flex:2, padding:'7px 10px', borderRadius:'8px', border:'1px solid var(--border)', background:'var(--bg-panel)', color:'var(--text-main)', fontSize:'12px', outline:'none', fontFamily:'inherit' }}
                      />
                    ) : (
                      <select value={f.valor} onChange={e => setFiltrosCruz(fc => fc.map((x,j) => j===i ? {...x, valor: e.target.value} : x))}
                        style={{ flex:2, padding:'7px 10px', borderRadius:'8px', border:'1px solid var(--border)', background:'var(--bg-panel)', color:'var(--text-main)', fontSize:'12px', outline:'none' }}>
                        <option value="">Resposta...</option>
                        {opcoes.map(o => <option key={o} value={o}>{isNps ? `${o} ou mais` : o}</option>)}
                      </select>
                    )}
                    <button onClick={() => setFiltrosCruz(fc => fc.filter((_,j) => j!==i))}
                      style={{ padding:'7px', borderRadius:'7px', border:`1px solid ${colors.danger}30`, background:`${colors.danger}10`, color:colors.danger, cursor:'pointer', display:'flex' }}>
                      <Trash2 size={12}/>
                    </button>
                  </div>
                );
              })}
              <button onClick={() => setFiltrosCruz(fc => [...fc, { qId:'', valor:'' }])}
                style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 14px', borderRadius:'8px', border:`1px dashed ${colors.primary}40`, background:`${colors.primary}08`, color:colors.primary, fontWeight:'800', fontSize:'12px', cursor:'pointer', alignSelf:'flex-start' }}>
                <Plus size={12}/> Adicionar condição
              </button>
              {matchIds !== null && (
                <div style={{ fontSize:'12px', fontWeight:'700', color: matchIds.size > 0 ? colors.success : colors.warning }}>
                  {matchIds.size > 0 ? `✅ ${matchIds.size} respondente${matchIds.size!==1?'s':''} atendem todos os critérios` : '⚠ Nenhum respondente atende todos os critérios'}
                </div>
              )}
            </div>
          );
        })()}

        {showFiltroPanel && selSurvey === 'all' && (
          <div style={{ background:`${colors.warning}10`, border:`1px solid ${colors.warning}30`, borderRadius:'10px', padding:'12px', marginBottom:'16px', fontSize:'12px', color:colors.warning, fontWeight:'700' }}>
            ⚠ Selecione uma pesquisa específica no filtro acima para usar o cruzamento de respostas.
          </div>
        )}

        {/* Legenda IA */}
        {mapMode === 'ia' && Object.keys(aiScores).length > 0 && (
          <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', marginBottom:'12px' }}>
            {[{label:'Muito Quente (9-10)', c:'#ef4444'},{label:'Quente (7-8)', c:'#f59e0b'},{label:'Morno (4-6)', c:'#3b82f6'},{label:'Frio (1-3)', c:'#64748b'}].map(s => (
              <div key={s.label} style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', fontWeight:'700', color:'var(--text-muted)' }}>
                <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:s.c, boxShadow:`0 0 6px ${s.c}80` }}/>
                {s.label}
              </div>
            ))}
          </div>
        )}

        {aiError && (
          <div style={{ background:`${colors.danger}10`, border:`1px solid ${colors.danger}30`, borderRadius:'8px', padding:'10px 14px', marginBottom:'12px', fontSize:'12px', color:colors.danger, fontWeight:'700' }}>
            {aiError}
          </div>
        )}

        <MapaRespostas
          responses={filtered}
          surveys={surveys}
          onSelectResposta={(r, grupo) => setModalData({ resposta: r, grupo })}
          matchIds={matchIds}
          mapMode={mapMode}
          aiScores={aiScores}
        />
      </Card>

      {/* Analytics por pergunta */}
      {loading ? (
        <Card><div style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>Carregando dados...</div></Card>
      ) : !analytics.questions.length ? (
        <Card>
          <div style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>
            <Eye size={32} style={{ opacity:0.2, marginBottom:'12px' }}/>
            <div style={{ fontWeight:'800', marginBottom:'6px' }}>Selecione uma pesquisa específica</div>
            <div style={{ fontSize:'13px' }}>Escolha uma pesquisa no filtro acima para ver os gráficos por pergunta.</div>
          </div>
        </Card>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(340px, 1fr))', gap:'16px' }}>
          {analytics.questions.map(({ q, data, nps, avg, total }) => (
            <Card key={q.id} title={q.label} subtitle={`${total||0} resposta${total!==1?'s':''}`}>
              {q.type==='nps' && nps!==null ? (
                <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <NpsGauge nps={nps}/>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:'11px', color:'var(--text-muted)', fontWeight:'800', textTransform:'uppercase' }}>Média</div>
                      <div style={{ fontSize:'26px', fontWeight:'900', color:'var(--text-main)' }}>{avg}</div>
                    </div>
                  </div>
                  <BarChart data={data.filter(d=>d.count>0)} colorFn={k=>npsColor(Number(k))} total={total}/>
                </div>
              ) : (
                <BarChart data={data} colorFn={(_,i) => [colors.primary,colors.success,colors.warning,colors.danger,colors.purple][i%5]} total={total}/>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Feed de respostas recentes */}
      <Card title="Respostas Recentes" subtitle={`${Math.min(filtered.length,10)} mais recentes`}>
        {!filtered.length ? (
          <div style={{ textAlign:'center', padding:'30px', color:'var(--text-muted)', fontSize:'13px' }}>Nenhuma resposta ainda.</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginTop:'4px' }}>
            {[...filtered].sort((a,b)=>(b.timestamp?.seconds||0)-(a.timestamp?.seconds||0)).slice(0,10).map(r => (
              <div key={r.id}
                onClick={() => setModalData({ resposta: r, grupo: null })}
                style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 14px', background:'var(--bg-app)', border:'1px solid var(--border)', borderRadius:'10px', cursor:'pointer', transition:'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background='var(--bg-app)'}>
                <div style={{ width:'34px', height:'34px', borderRadius:'9px', background:`${colors.primary}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'12px', fontWeight:'900', color:colors.primary }}>
                  {(r.researcherName||'?')[0].toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:'800', fontSize:'12px', color:'var(--text-main)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.researcherName||'Pesquisador'}</div>
                  <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'1px' }}>{r.surveyTitle||r.surveyId} · {r.city||'—'}{r.numero?` · #${r.numero}`:''}</div>
                </div>
                {r.location?.lat && <div style={{ fontSize:'11px', color:colors.info, fontWeight:'800', display:'flex', alignItems:'center', gap:'3px', flexShrink:0 }}><MapPin size={11}/> GPS</div>}
                <div style={{ fontSize:'11px', color:'var(--text-muted)', flexShrink:0 }}>{r.timestamp?.toDate ? r.timestamp.toDate().toLocaleDateString('pt-BR') : '—'}</div>
                <ChevronRight size={14} color="var(--text-muted)" style={{ flexShrink:0 }}/>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal de detalhes */}
      {modalData && (
        <ModalResposta
          resposta={modalData.resposta}
          grupo={modalData.grupo}
          surveys={surveys}
          onClose={() => setModalData(null)}
        />
      )}

      {/* Modal Log da IA */}
      {showAiLog && (
        <ModalAiLog
          log={aiLog}
          aiScores={aiScores}
          responses={filtered}
          survey={aiSurveySnap}
          onClose={() => setShowAiLog(false)}
        />
      )}
    </div>
  );
}