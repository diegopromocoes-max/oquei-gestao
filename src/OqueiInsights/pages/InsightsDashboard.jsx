// ============================================================
//  InsightsDashboard.jsx — Oquei Insights
//  Analista / Diretoria: heatmap, gráficos NPS, motivos (RF04/RF05)
// ============================================================
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { BarChart3, MapPin, TrendingUp, Users, RefreshCw, Download, Filter, Eye } from 'lucide-react';
import { Card, Btn, Badge, colors } from '../../components/ui';
import { styles as global } from '../../styles/globalStyles';

// ── Mini-gráfico de barras (CSS puro) ────────────────────────
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

// ── Heatmap de pontos ─────────────────────────────────────────
function DotHeatmap({ responses }) {
  const withGps = responses.filter(r => r.location?.lat && r.location?.lng);
  if (!withGps.length) return (
    <div style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>
      <MapPin size={32} style={{ opacity:0.2, marginBottom:'8px' }}/>
      <div style={{ fontWeight:'700', fontSize:'13px' }}>Nenhuma resposta com GPS</div>
    </div>
  );

  // Agrupa por cidade
  const byCidade = {};
  responses.forEach(r => { if (!byCidade[r.city]) byCidade[r.city] = 0; byCidade[r.city]++; });

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
      <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
        {Object.entries(byCidade).sort((a,b)=>b[1]-a[1]).map(([city, count]) => {
          const size = Math.max(32, Math.min(72, 32 + count * 4));
          const opacity = Math.min(1, 0.5 + count * 0.05);
          return (
            <div key={city} title={`${city}: ${count} respostas`} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', cursor:'default' }}>
              <div style={{ width:`${size}px`, height:`${size}px`, borderRadius:'50%', background:`${colors.danger}`, opacity, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:`${Math.max(10, size/4)}px`, fontWeight:'900', boxShadow:`0 2px 8px ${colors.danger}44`, transition:'all 0.3s' }}>
                {count}
              </div>
              <span style={{ fontSize:'10px', fontWeight:'800', color:'var(--text-muted)', textAlign:'center', maxWidth:'60px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{city||'—'}</span>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize:'11px', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:'6px' }}>
        <MapPin size={11}/> {withGps.length} de {responses.length} respostas com localização GPS
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function InsightsDashboard({ userData }) {
  const [surveys,    setSurveys]    = useState([]);
  const [responses,  setResponses]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selSurvey,  setSelSurvey]  = useState('all');
  const [selCity,    setSelCity]    = useState('all');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Carrega surveys e escuta respostas em tempo real
  useEffect(() => {
    const loadSurveys = async () => {
      const snap = await getDocs(collection(db,'surveys'));
      setSurveys(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    };
    loadSurveys();

    const q = collection(db,'survey_responses');
    const unsub = onSnapshot(q, snap => {
      setResponses(snap.docs.map(d => ({ id:d.id, ...d.data() })));
      setLastUpdate(new Date());
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  // Filtra respostas
  const filtered = useMemo(() => {
    let list = responses;
    if (selSurvey !== 'all') list = list.filter(r => r.surveyId===selSurvey);
    if (selCity   !== 'all') list = list.filter(r => r.city===selCity);
    return list;
  }, [responses, selSurvey, selCity]);

  // Cidades únicas nas respostas
  const cities = useMemo(() => [...new Set(responses.map(r => r.city).filter(Boolean))].sort(), [responses]);

  // Calcula análises por survey selecionado
  const analytics = useMemo(() => {
    const selSurveyData = selSurvey !== 'all' ? surveys.find(s => s.id===selSurvey) : null;
    const questions = selSurveyData?.questions || [];

    const qAnalytics = questions.map(q => {
      const allAnswers = filtered.map(r => r.answers?.[q.id]).filter(Boolean);
      if (!allAnswers.length) return { q, data:[], nps:null };

      if (q.type==='nps') {
        const nums = allAnswers.map(Number).filter(n => !isNaN(n));
        const promoters  = nums.filter(n=>n>=9).length;
        const detractors = nums.filter(n=>n<=6).length;
        const total      = nums.length;
        const nps        = total > 0 ? Math.round(((promoters-detractors)/total)*100) : 0;
        const avg        = total > 0 ? (nums.reduce((a,b)=>a+b,0)/total).toFixed(1) : 0;
        const dist       = Array.from({length:11},(_,i)=>({ key:String(i), count:nums.filter(n=>n===i).length }));
        return { q, data:dist, nps, avg, promoters, detractors, total };
      }

      const counts = {};
      allAnswers.forEach(a => { counts[a] = (counts[a]||0)+1; });
      const data = Object.entries(counts).map(([key,count]) => ({ key, count })).sort((a,b)=>b.count-a.count);
      return { q, data, nps:null, total:allAnswers.length };
    });

    return { questions: qAnalytics };
  }, [filtered, surveys, selSurvey]);

  const npsColor = n => n>=9?colors.success:n>=7?colors.primary:n>=5?colors.warning:colors.danger;

  const exportCSV = () => {
    const rows = [['ID','Survey','Pesquisador','Cidade','Lat','Lng','Data',...(surveys.find(s=>s.id===selSurvey)?.questions||[]).map(q=>q.label)]];
    filtered.forEach(r => {
      const qs = (surveys.find(s=>s.id===r.surveyId)?.questions||[]).map(q => r.answers?.[q.id]||'');
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
            <div style={{ fontSize:'21px', fontWeight:'900', color:'var(--text-main)' }}>Oquei Pesquisas</div>
            <div style={{ fontSize:'13px', color:'var(--text-muted)', marginTop:'2px' }}>
              Atualizado às {lastUpdate.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap' }}>
          <Btn variant="secondary" size="sm" onClick={() => setLastUpdate(new Date())} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
            <RefreshCw size={13}/> Atualizar
          </Btn>
          <Btn variant="secondary" size="sm" onClick={exportCSV} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
            <Download size={13}/> Exportar CSV
          </Btn>
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
          { label:'Total de Respostas',  value: filtered.length,                                          color:colors.primary, icon:ClipboardList2 },
          { label:'Pesquisadores',       value: new Set(filtered.map(r=>r.researcherUid)).size,            color:colors.purple,  icon:Users          },
          { label:'Cidades Cobertas',    value: new Set(filtered.map(r=>r.city).filter(Boolean)).size,     color:colors.success, icon:MapPin         },
          { label:'Com GPS',             value: filtered.filter(r=>r.location?.lat).length,                color:colors.info,    icon:MapPin         },
        ].map(k => (
          <div key={k.label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderLeft:`4px solid ${k.color}`, borderRadius:'14px', padding:'18px', boxShadow:'var(--shadow-sm)' }}>
            <div style={{ fontSize:'11px', fontWeight:'900', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{k.label}</div>
            <div style={{ fontSize:'28px', fontWeight:'900', color:'var(--text-main)', lineHeight:1.1, marginTop:'4px' }}>{loading?'...':k.value}</div>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <Card title="Cobertura de Campo" subtitle="Distribuição de respostas por cidade">
        <DotHeatmap responses={filtered}/>
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
      <Card title="Respostas Recentes" subtitle={`${filtered.slice(0,10).length} mais recentes`}>
        {!filtered.length ? (
          <div style={{ textAlign:'center', padding:'30px', color:'var(--text-muted)', fontSize:'13px' }}>Nenhuma resposta ainda.</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginTop:'4px' }}>
            {[...filtered].sort((a,b) => (b.timestamp?.seconds||0)-(a.timestamp?.seconds||0)).slice(0,10).map(r => (
              <div key={r.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 14px', background:'var(--bg-app)', border:'1px solid var(--border)', borderRadius:'10px' }}>
                <div style={{ width:'34px', height:'34px', borderRadius:'9px', background:`${colors.primary}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'12px', fontWeight:'900', color:colors.primary }}>
                  {(r.researcherName||'?')[0].toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:'800', fontSize:'12px', color:'var(--text-main)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.researcherName||'Pesquisador'}</div>
                  <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'1px' }}>{r.surveyTitle||r.surveyId} · {r.city||'—'}</div>
                </div>
                {r.location?.lat && <div style={{ fontSize:'11px', color:colors.info, fontWeight:'800', display:'flex', alignItems:'center', gap:'3px', flexShrink:0 }}><MapPin size={11}/> GPS</div>}
                <div style={{ fontSize:'11px', color:'var(--text-muted)', flexShrink:0 }}>
                  {r.timestamp?.toDate ? r.timestamp.toDate().toLocaleDateString('pt-BR') : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// Ícone auxiliar inline
const ClipboardList2 = (p) => <BarChart3 {...p}/>;