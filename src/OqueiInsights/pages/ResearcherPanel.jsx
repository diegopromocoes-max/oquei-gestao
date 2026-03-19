// ============================================================
//  ResearcherPanel.jsx — Oquei Insights
//  Interface mobile-first para pesquisadores de campo
//  RF01: tipos de pergunta · RF02: GPS · RF03: seleção de campanha
// ============================================================
import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { MapPin, ClipboardList, CheckCircle, ChevronRight, Loader2, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { colors } from '../../components/ui';

// ── Helpers ──────────────────────────────────────────────────
const getGPS = () => new Promise((res, rej) => {
  if (!navigator.geolocation) rej(new Error('GPS não disponível'));
  navigator.geolocation.getCurrentPosition(
    p => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
    () => rej(new Error('Permissão de localização negada')),
    { timeout: 8000, maximumAge: 0 }
  );
});

const S = {
  root: { minHeight:'100dvh', background:'var(--bg-app)', display:'flex', flexDirection:'column', fontFamily:"'Manrope', sans-serif", padding:'0' },
  header: { background:`linear-gradient(135deg, ${colors.primary} 0%, ${colors.purple} 100%)`, padding:'24px 20px 20px', color:'#fff', flexShrink:0 },
  headerTitle: { fontSize:'20px', fontWeight:'900', margin:0, letterSpacing:'-0.02em' },
  headerSub: { fontSize:'13px', opacity:0.8, marginTop:'4px' },
  body: { flex:1, padding:'16px', display:'flex', flexDirection:'column', gap:'14px', overflowY:'auto' },
  card: { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'16px', padding:'18px', boxShadow:'var(--shadow-sm)' },
  bigBtn: (color='#2563eb', disabled=false) => ({
    width:'100%', padding:'18px', borderRadius:'14px', border:'none',
    background: disabled ? 'var(--border)' : color, color: disabled ? 'var(--text-muted)' : '#fff',
    fontSize:'16px', fontWeight:'900', cursor: disabled ? 'not-allowed' : 'pointer',
    display:'flex', alignItems:'center', justifyContent:'center', gap:'10px',
    boxShadow: disabled ? 'none' : `0 4px 16px ${color}44`, transition:'all 0.15s',
    marginTop:'6px',
  }),
  label: { fontSize:'11px', fontWeight:'900', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px', display:'block' },
  optionBtn: (sel) => ({
    width:'100%', padding:'16px 18px', borderRadius:'12px', textAlign:'left',
    border:`2px solid ${sel ? colors.primary : 'var(--border)'}`,
    background: sel ? `${colors.primary}15` : 'var(--bg-app)',
    color: sel ? colors.primary : 'var(--text-main)',
    fontWeight:'800', fontSize:'15px', cursor:'pointer',
    display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px',
    transition:'all 0.12s', marginBottom:'8px',
  }),
  npsBtn: (sel, n) => {
    const col = n<=3?colors.danger : n<=6?colors.warning : n<=8?colors.primary : colors.success;
    return {
      flex:1, padding:'14px 0', borderRadius:'10px', border:`2px solid ${sel?col:'var(--border)'}`,
      background: sel ? `${col}20` : 'var(--bg-app)', color: sel ? col : 'var(--text-muted)',
      fontWeight:'900', fontSize:'16px', cursor:'pointer', transition:'all 0.12s',
    };
  },
  successBox: { textAlign:'center', padding:'40px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:'16px' },
};

export default function ResearcherPanel({ userData }) {
  const [surveys,     setSurveys]     = useState([]);
  const [selected,    setSelected]    = useState(null); // survey selecionado
  const [step,        setStep]        = useState('select'); // select | questions | done
  const [answers,     setAnswers]     = useState({});
  const [sending,     setSending]     = useState(false);
  const [gpsStatus,   setGpsStatus]   = useState('idle'); // idle | loading | ok | error
  const [gpsPos,      setGpsPos]      = useState(null);
  const [loadingSurveys, setLoadingSurveys] = useState(true);
  const [error,       setError]       = useState('');
  const [online,      setOnline]      = useState(navigator.onLine);

  // Monitora conexão
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Carrega surveys ativos
  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(query(collection(db,'surveys'), where('status','==','active')));
        setSurveys(snap.docs.map(d => ({ id:d.id, ...d.data() })));
      } catch(e) { setError('Erro ao carregar pesquisas.'); }
      setLoadingSurveys(false);
    };
    load();
  }, []);

  // Captura GPS
  const captureGPS = async () => {
    setGpsStatus('loading');
    try {
      const pos = await getGPS();
      setGpsPos(pos);
      setGpsStatus('ok');
    } catch {
      setGpsStatus('error');
    }
  };

  const handleSelectSurvey = (survey) => {
    setSelected(survey);
    setAnswers({});
    setStep('questions');
    captureGPS();
  };

  const handleAnswer = (qId, value) => setAnswers(a => ({ ...a, [qId]:value }));

  const allAnswered = () => selected?.questions?.every(q => answers[q.id] !== undefined && String(answers[q.id]).trim() !== '');

  const handleSubmit = async () => {
    if (!allAnswered()) { setError('Responda todas as perguntas antes de enviar.'); return; }
    setSending(true);
    setError('');
    try {
      let loc = gpsPos;
      if (!loc) {
        try { loc = await getGPS(); } catch {}
      }
      await addDoc(collection(db,'survey_responses'), {
        surveyId:       selected.id,
        surveyTitle:    selected.title,
        researcherUid:  auth.currentUser?.uid,
        researcherName: userData?.name || 'Pesquisador',
        city:           userData?.cityId || '',
        location:       loc || null,
        answers,
        timestamp: serverTimestamp(),
      });
      setStep('done');
    } catch(e) { setError('Erro ao enviar: ' + e.message); }
    setSending(false);
  };

  const reset = () => { setSelected(null); setStep('select'); setAnswers({}); setGpsPos(null); setGpsStatus('idle'); setError(''); };

  // ── Render pergunta por tipo ─────────────────────────────
  const renderQuestion = (q, idx) => {
    const ans = answers[q.id];
    return (
      <div key={q.id} style={S.card}>
        <div style={{ fontSize:'12px', fontWeight:'900', color:'var(--text-muted)', textTransform:'uppercase', marginBottom:'6px' }}>Pergunta {idx+1} de {selected.questions.length}</div>
        <div style={{ fontSize:'17px', fontWeight:'800', color:'var(--text-main)', marginBottom:'16px', lineHeight:1.3 }}>{q.label}</div>

        {/* Sim/Não (tipo boolean) */}
        {q.type === 'boolean' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
            {['Sim','Não'].map(opt => (
              <button key={opt} onClick={() => handleAnswer(q.id, opt)} style={S.optionBtn(ans===opt)}>
                {opt === 'Sim' ? '✅' : '❌'} {opt}
              </button>
            ))}
          </div>
        )}

        {/* Múltipla Escolha (tipo select) */}
        {q.type === 'select' && (q.options||[]).map(opt => (
          <button key={opt} onClick={() => handleAnswer(q.id, opt)} style={S.optionBtn(ans===opt)}>
            <span>{opt}</span>
            {ans===opt && <CheckCircle size={18} color={colors.primary}/>}
          </button>
        ))}

        {/* NPS (escala 0-10) */}
        {q.type === 'nps' && (
          <div>
            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
              {Array.from({length:11},(_,i)=>i).map(n => (
                <button key={n} onClick={() => handleAnswer(q.id, String(n))} style={S.npsBtn(ans===String(n), n)}>{n}</button>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:'8px', fontSize:'11px', color:'var(--text-muted)', fontWeight:'700' }}>
              <span>😞 Péssimo</span><span>😍 Excelente</span>
            </div>
          </div>
        )}

        {/* Texto Livre */}
        {q.type === 'text' && (
          <textarea
            style={{ width:'100%', padding:'14px', borderRadius:'12px', border:'1px solid var(--border)', background:'var(--bg-app)', color:'var(--text-main)', fontSize:'15px', fontFamily:'inherit', minHeight:'100px', resize:'vertical', outline:'none', boxSizing:'border-box' }}
            placeholder="Escreva sua resposta aqui..."
            value={ans||''}
            onChange={e => handleAnswer(q.id, e.target.value)}
          />
        )}
      </div>
    );
  };

  return (
    <div style={S.root}>
      {/* Cabeçalho */}
      <div style={S.header}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'8px' }}>
          <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <ClipboardList size={22} color="#fff"/>
          </div>
          <div>
            <div style={S.headerTitle}>Oquei Insights</div>
            <div style={S.headerSub}>Pesquisador · {userData?.name?.split(' ')[0]||'Campo'}</div>
          </div>
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'5px', fontSize:'11px', fontWeight:'800', color: online?'#a7f3d0':'#fca5a5' }}>
            {online ? <Wifi size={14}/> : <WifiOff size={14}/>}
            {online?'Online':'Offline'}
          </div>
        </div>
        {gpsStatus==='ok' && gpsPos && (
          <div style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'11px', fontWeight:'700', color:'#a7f3d0', background:'rgba(16,185,129,0.2)', borderRadius:'8px', padding:'6px 10px', width:'fit-content' }}>
            <MapPin size={12}/> GPS: {gpsPos.lat.toFixed(4)}, {gpsPos.lng.toFixed(4)}
          </div>
        )}
      </div>

      <div style={S.body}>
        {error && (
          <div style={{ background:`${colors.danger}15`, border:`1px solid ${colors.danger}40`, borderRadius:'12px', padding:'12px 14px', display:'flex', alignItems:'center', gap:'10px', fontSize:'13px', fontWeight:'700', color:colors.danger }}>
            <AlertCircle size={16}/> {error}
          </div>
        )}

        {/* ── STEP: Selecionar campanha ── */}
        {step==='select' && (
          <>
            <div style={S.card}>
              <div style={{ fontSize:'15px', fontWeight:'900', color:'var(--text-main)', marginBottom:'4px' }}>Selecione a Campanha</div>
              <div style={{ fontSize:'12px', color:'var(--text-muted)' }}>Pesquisas ativas disponíveis</div>
            </div>
            {loadingSurveys ? (
              <div style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}><Loader2 size={28} style={{ animation:'spin 0.8s linear infinite' }}/></div>
            ) : surveys.length===0 ? (
              <div style={{ ...S.card, textAlign:'center', padding:'40px' }}>
                <ClipboardList size={40} style={{ opacity:0.25, marginBottom:'12px' }}/>
                <div style={{ fontWeight:'800', color:'var(--text-main)', marginBottom:'4px' }}>Nenhuma pesquisa ativa</div>
                <div style={{ fontSize:'13px', color:'var(--text-muted)' }}>Aguarde a criação de uma campanha.</div>
              </div>
            ) : (
              surveys.map(s => (
                <button key={s.id} onClick={() => handleSelectSurvey(s)}
                  style={{ ...S.card, width:'100%', textAlign:'left', cursor:'pointer', border:`2px solid ${colors.primary}`, display:'flex', alignItems:'center', gap:'14px' }}>
                  <div style={{ width:'48px', height:'48px', borderRadius:'14px', background:`${colors.primary}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <ClipboardList size={22} color={colors.primary}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'16px', fontWeight:'900', color:'var(--text-main)' }}>{s.title}</div>
                    <div style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'3px' }}>{s.questions?.length||0} perguntas · {s.description||'Pesquisa de campo'}</div>
                    {s.targetCities?.length>0 && <div style={{ fontSize:'11px', color:colors.primary, fontWeight:'800', marginTop:'4px' }}>📍 {s.targetCities.join(', ')}</div>}
                  </div>
                  <ChevronRight size={20} color={colors.primary}/>
                </button>
              ))
            )}
          </>
        )}

        {/* ── STEP: Perguntas ── */}
        {step==='questions' && selected && (
          <>
            <div style={{ ...S.card, background:`${colors.primary}15`, borderColor:`${colors.primary}40` }}>
              <div style={{ fontSize:'15px', fontWeight:'900', color:colors.primary }}>{selected.title}</div>
              <div style={{ fontSize:'12px', color:'var(--text-muted)', marginTop:'3px' }}>{selected.description}</div>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'8px', fontSize:'12px', fontWeight:'700' }}>
                {gpsStatus==='loading' && <><Loader2 size={13} style={{ animation:'spin 0.8s linear infinite' }} color={colors.warning}/> <span style={{ color:colors.warning }}>Capturando GPS...</span></>}
                {gpsStatus==='ok'      && <><MapPin size={13} color={colors.success}/> <span style={{ color:colors.success }}>Localização capturada</span></>}
                {gpsStatus==='error'   && <><AlertCircle size={13} color={colors.warning}/> <span style={{ color:colors.warning }}>GPS indisponível — continuará sem localização</span></>}
              </div>
            </div>

            {selected.questions?.map((q, i) => renderQuestion(q, i))}

            <button onClick={handleSubmit} disabled={sending || !allAnswered()} style={S.bigBtn(colors.success, sending || !allAnswered())}>
              {sending ? <><Loader2 size={18} style={{ animation:'spin 0.8s linear infinite' }}/> Enviando...</> : <><CheckCircle size={20}/> Enviar Respostas</>}
            </button>
            <button onClick={reset} style={{ ...S.bigBtn('transparent', false), color:'var(--text-muted)', boxShadow:'none', border:'1px solid var(--border)' }}>
              Cancelar
            </button>
          </>
        )}

        {/* ── STEP: Sucesso ── */}
        {step==='done' && (
          <div style={S.successBox}>
            <div style={{ width:'80px', height:'80px', borderRadius:'50%', background:`${colors.success}20`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <CheckCircle size={44} color={colors.success}/>
            </div>
            <div style={{ fontSize:'22px', fontWeight:'900', color:'var(--text-main)' }}>Enviado com sucesso!</div>
            <div style={{ fontSize:'14px', color:'var(--text-muted)', textAlign:'center', lineHeight:1.5 }}>
              Respostas registradas{gpsPos?' com localização GPS':''}.{'\n'}Obrigado pela sua contribuição!
            </div>
            <button onClick={reset} style={S.bigBtn(colors.primary)}>
              <ClipboardList size={20}/> Nova Pesquisa
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
