// ============================================================
//  PublicSurveyAccess.jsx — Oquei Pesquisas
//
//  Rotas:
//    /pesquisa/:surveyId                       → link geral (pede nome/tel)
//    /pesquisa/:surveyId/entrevistador/:eid     → link pessoal (nome já fixo)
//
//  Funcionalidades:
//  · Rolagem corrigida (override do overflow:hidden do LayoutGlobal)
//  · GPS tratado silenciosamente (sem tentar novamente após bloqueio)
//  · Numeração sequencial de questionários por entrevistador
//  · Tela inicial: nome, telefone, progresso vs meta (link pessoal)
//  · Pós-envio: "Próxima Pesquisa" e "Voltar ao Início"
// ============================================================
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  doc, getDoc, addDoc, collection,
  serverTimestamp, query, where, getDocs,
} from 'firebase/firestore';
import {
  ClipboardList, CheckCircle, ChevronRight, RefreshCw,
  Loader2, AlertCircle, MapPin, User, Phone, Hash,
  ToggleLeft, Type, List, Home, Target,
} from 'lucide-react';
import { colors } from '../../components/ui';

// ── GPS — tenta uma vez, falha silenciosamente ────────────────
let gpsBlocked = false;
const getGPS = () =>
  new Promise(res => {
    if (gpsBlocked || !navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(
      p  => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => { gpsBlocked = true; res(null); },
      { timeout: 6000, maximumAge: 60000 }
    );
  });

// ── Scroll fix (igual ao PublicSurveyEdit) ────────────────────
// scroll nativo — sem hack necessário (globalCSS não é injetado em rotas públicas)

// ── Gera número sequencial: e-NNN (ex: e-001) ────────────────
async function gerarNumeroQuestionario(surveyId, entrevistadorId) {
  try {
    // Query composta — requer índice em firestore.indexes.json
    const q = query(
      collection(db, 'survey_responses'),
      where('surveyId', '==', surveyId),
      where('entrevistadorId', '==', entrevistadorId)
    );
    // Timeout de 5s para não travar o fluxo se o índice ainda estiver construindo
    const snap = await Promise.race([
      getDocs(q),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000)),
    ]);
    return `e-${String(snap.size + 1).padStart(3, '0')}`;
  } catch {
    // Fallback silencioso — número baseado em timestamp
    return `e-${Date.now().toString().slice(-4)}`;
  }
}

const npsColor = n =>
  n <= 3 ? colors.danger : n <= 6 ? colors.warning : n <= 8 ? colors.primary : colors.success;

// ── Estilos ───────────────────────────────────────────────────
const S = {
  root: {
    minHeight: '100vh',
    background: 'var(--bg-app)',
    display: 'flex', flexDirection: 'column',
    fontFamily: "'Manrope', system-ui, sans-serif",
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  header: {
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.purple} 100%)`,
    padding: '20px 20px 16px', color: '#fff', flexShrink: 0,
    position: 'sticky', top: 0, zIndex: 10,
  },
  body: {
    flex: 1, padding: '18px 16px 48px',
    display: 'flex', flexDirection: 'column', gap: '14px',
    maxWidth: '560px', width: '100%', margin: '0 auto',
    boxSizing: 'border-box',
    // Sem overflowY aqui — o scroll é feito pelo S.root
  },
  card: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-sm)',
  },
  inp: {
    width: '100%', padding: '14px 16px', borderRadius: '12px',
    border: '1px solid var(--border)', outline: 'none',
    fontSize: '16px', color: 'var(--text-main)',
    background: 'var(--bg-app)', fontFamily: 'inherit', boxSizing: 'border-box',
  },
  bigBtn: (color = colors.primary, disabled = false) => ({
    width: '100%', padding: '17px', borderRadius: '14px', border: 'none',
    background: disabled ? 'var(--bg-panel)' : color,
    color: disabled ? 'var(--text-muted)' : '#fff',
    fontSize: '16px', fontWeight: '900',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    boxShadow: disabled ? 'none' : `0 4px 16px ${color}44`,
    transition: 'all 0.15s',
  }),
  optBtn: (sel, c = colors.primary) => ({
    width: '100%', padding: '16px 18px', borderRadius: '12px', textAlign: 'left',
    fontWeight: '800', fontSize: '15px', cursor: 'pointer',
    border: `2px solid ${sel ? c : 'var(--border)'}`,
    background: sel ? `${c}15` : 'var(--bg-app)', color: sel ? c : 'var(--text-main)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    transition: 'all 0.12s', marginBottom: '8px',
  }),
  npsBtn: (sel, n) => {
    const c = npsColor(n);
    return {
      flex: 1, padding: '13px 0', borderRadius: '10px',
      border: `2px solid ${sel ? c : 'var(--border)'}`,
      background: sel ? `${c}20` : 'var(--bg-app)',
      color: sel ? c : 'var(--text-muted)',
      fontWeight: '900', fontSize: '16px', cursor: 'pointer', transition: 'all 0.12s',
    };
  },
};

// ── Tela de aplicação de questionário ────────────────────────
function ResponseScreen({ survey, surveyId, entrevistador }) {
  // entrevistador: { id, nome, telefone, meta } ou null (link geral)

  const isPersonal = !!entrevistador;

  const [step,      setStep]      = useState('inicio');   // inicio | questions | done
  const [nome,      setNome]      = useState(entrevistador?.nome || '');
  const [telefone,  setTelefone]  = useState(entrevistador?.telefone || '');
  const [city,      setCity]      = useState(survey.targetCities?.[0] || '');
  const [answers,   setAnswers]   = useState({});
  const [sending,   setSending]   = useState(false);
  const [error,     setError]     = useState('');
  const [gpsPos,    setGpsPos]    = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [totalFeitas, setTotalFeitas] = useState(0);
  const [numQuestionario, setNumQuestionario] = useState('');
  const meta = entrevistador?.meta || 0;

  // Carrega total de pesquisas feitas por este entrevistador
  useEffect(() => {
    if (!isPersonal) return;
    getDocs(query(
      collection(db, 'survey_responses'),
      where('surveyId', '==', surveyId),
      where('entrevistadorId', '==', entrevistador.id)
    )).then(snap => setTotalFeitas(snap.size)).catch(() => {});
  }, [step]); // recarrega ao voltar ao inicio

  const captureGPS = async () => {
    if (gpsBlocked) return;
    setGpsStatus('loading');
    const pos = await getGPS();
    setGpsPos(pos);
    setGpsStatus(pos ? 'ok' : 'blocked');
  };

  const handleIniciar = async () => {
    if (!nome.trim()) { setError('Informe seu nome.'); return; }
    if (isPersonal && !telefone.trim()) { setError('Informe seu telefone.'); return; }
    setError('');
    // Gera número do questionário
    const eid = entrevistador?.id || 'geral';
    const num = await gerarNumeroQuestionario(surveyId, eid);
    setNumQuestionario(num);
    setAnswers({});
    captureGPS();
    setStep('questions');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnswer = (qId, val) => setAnswers(a => ({ ...a, [qId]: val }));

  const allAnswered = () =>
    survey.questions?.every(q => answers[q.id] !== undefined && String(answers[q.id]).trim() !== '');

  const handleSubmit = async () => {
    if (!allAnswered()) { setError('Responda todas as perguntas antes de enviar.'); return; }
    setSending(true); setError('');
    try {
      let loc = gpsPos;
      if (!loc && !gpsBlocked) loc = await getGPS();
      await addDoc(collection(db, 'survey_responses'), {
        surveyId,
        surveyTitle:      survey.title,
        researcherName:   nome.trim(),
        researcherUid:    null,
        entrevistadorId:  entrevistador?.id || null,
        telefone:         telefone.trim() || null,
        city:             city || '',
        location:         loc || null,
        answers,
        numero:           numQuestionario,
        timestamp:        serverTimestamp(),
      });
      setTotalFeitas(t => t + 1);
      setStep('done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { setError('Erro ao enviar: ' + e.message); }
    setSending(false);
  };

  const handleProxima = () => {
    setAnswers({}); setError('');
    setStep('inicio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Render pergunta ─────────────────────────────────────────
  const renderQuestion = (q, idx) => {
    const cfg = { boolean: { color: colors.success }, select: { color: colors.primary }, nps: { color: colors.purple }, text: { color: colors.warning } }[q.type] || { color: colors.primary };
    const ans = answers[q.id];
    const respondida = ans !== undefined && String(ans).trim() !== '';
    return (
      <div key={q.id} style={{
        ...S.card,
        borderTop: `3px solid ${respondida ? cfg.color : 'var(--border)'}`,
      }}>
        {/* Numeração */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Pergunta {idx + 1} de {survey.questions.length}
          </div>
          {respondida && <CheckCircle size={14} color={cfg.color} />}
        </div>

        <div style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '18px', lineHeight: 1.35 }}>
          {q.label}
        </div>

        {q.type === 'boolean' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {['Sim', 'Não'].map(opt => (
              <button key={opt} onClick={() => handleAnswer(q.id, opt)} style={S.optBtn(ans === opt, cfg.color)}>
                {opt === 'Sim' ? '✅' : '❌'} {opt}
              </button>
            ))}
          </div>
        )}

        {q.type === 'select' && (q.options || []).map(opt => (
          <button key={opt} onClick={() => handleAnswer(q.id, opt)} style={S.optBtn(ans === opt, cfg.color)}>
            <span>{opt}</span>
            {ans === opt && <CheckCircle size={18} color={cfg.color} />}
          </button>
        ))}

        {q.type === 'nps' && (
          <div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {Array.from({ length: 11 }, (_, i) => i).map(n => (
                <button key={n} onClick={() => handleAnswer(q.id, String(n))}
                  style={{ ...S.npsBtn(ans === String(n), n), minWidth: '36px' }}>{n}</button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
              <span>😞 Péssimo</span><span>😍 Excelente</span>
            </div>
          </div>
        )}

        {q.type === 'text' && (
          <textarea style={{ ...S.inp, minHeight: '100px', resize: 'vertical', fontSize: '15px' }}
            placeholder="Escreva sua resposta aqui..." value={ans || ''}
            onChange={e => handleAnswer(q.id, e.target.value)} />
        )}
      </div>
    );
  };

  // ── Header dinâmico ─────────────────────────────────────────
  const HeaderBar = ({ sub }) => (
    <div style={step === 'inicio' ? { ...S.header, position: 'static' } : S.header}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ClipboardList size={22} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '17px', fontWeight: '900', lineHeight: 1.2 }}>{survey.title}</div>
          {sub && <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>{sub}</div>}
        </div>
        {/* Número do questionário durante aplicação */}
        {step === 'questions' && numQuestionario && (
          <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', fontWeight: '900', letterSpacing: '0.05em' }}>
            #{numQuestionario}
          </div>
        )}
      </div>
      {/* GPS badge */}
      {step === 'questions' && gpsStatus === 'ok' && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(16,185,129,0.25)', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: '700', color: '#a7f3d0', marginTop: '8px' }}>
          <MapPin size={11} /> GPS capturado
        </div>
      )}
    </div>
  );

  return (
    <div style={S.root}>

      {/* ── TELA INICIAL ── */}
      {step === 'inicio' && (
        <>
          <HeaderBar sub={isPersonal ? `Olá, ${nome.split(' ')[0]}!` : 'Identificação'} />
          <div style={S.body}>
            {error && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `${colors.danger}15`, border: `1px solid ${colors.danger}40`, borderRadius: '12px', padding: '12px 14px', fontSize: '13px', fontWeight: '700', color: colors.danger }}><AlertCircle size={15} /> {error}</div>}

            {/* Progresso vs meta (link pessoal) */}
            {isPersonal && meta > 0 && (
              <div style={{ ...S.card, background: `linear-gradient(135deg, ${colors.primary}15, ${colors.purple}10)`, borderTop: `3px solid ${colors.primary}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <Target size={18} color={colors.primary} />
                  <span style={{ fontWeight: '900', fontSize: '14px', color: 'var(--text-main)' }}>Seu Progresso</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '700' }}>Realizadas</span>
                  <span style={{ fontSize: '13px', fontWeight: '900', color: totalFeitas >= meta ? colors.success : colors.primary }}>
                    {totalFeitas} / {meta}
                  </span>
                </div>
                <div style={{ height: '10px', borderRadius: '50px', background: 'var(--border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (totalFeitas / meta) * 100)}%`, borderRadius: '50px', background: totalFeitas >= meta ? colors.success : colors.primary, transition: 'width 0.6s ease' }} />
                </div>
                {totalFeitas >= meta && (
                  <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '13px', fontWeight: '800', color: colors.success }}>
                    🎉 Meta atingida!
                  </div>
                )}
              </div>
            )}

            {/* Formulário de identificação */}
            <div style={S.card}>
              <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '4px' }}>
                {isPersonal ? 'Confirme seus dados' : 'Sua identificação'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                {isPersonal ? 'Seus dados estão vinculados ao seu link pessoal.' : 'Seus dados ficam registrados junto com as respostas.'}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Nome */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Nome *</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0 14px' }}>
                    <User size={16} color="var(--text-muted)" />
                    <input style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', padding: '14px 0', fontSize: '16px', color: 'var(--text-main)', fontFamily: 'inherit' }}
                      placeholder="Nome completo" value={nome}
                      onChange={e => { setNome(e.target.value); setError(''); }}
                      readOnly={isPersonal}
                      autoFocus={!isPersonal}
                    />
                  </div>
                </div>

                {/* Telefone */}
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                    Telefone {isPersonal ? '*' : '(opcional)'}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0 14px' }}>
                    <Phone size={16} color="var(--text-muted)" />
                    <input style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', padding: '14px 0', fontSize: '16px', color: 'var(--text-main)', fontFamily: 'inherit' }}
                      placeholder="(00) 00000-0000" value={telefone}
                      onChange={e => { setTelefone(e.target.value); setError(''); }}
                      readOnly={isPersonal}
                      type="tel"
                    />
                  </div>
                </div>

                {/* Cidade */}
                {survey.targetCities?.length > 0 && (
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Cidade</label>
                    <select style={{ ...S.inp, fontSize: '15px' }} value={city} onChange={e => setCity(e.target.value)}>
                      <option value="">Selecionar...</option>
                      {survey.targetCities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <button onClick={handleIniciar} disabled={!nome.trim()} style={S.bigBtn(colors.primary, !nome.trim())}>
              Iniciar Questionário <ChevronRight size={20} />
            </button>
          </div>
        </>
      )}

      {/* ── PERGUNTAS ── */}
      {step === 'questions' && (
        <>
          <HeaderBar sub={`${Object.keys(answers).length} de ${survey.questions?.length || 0} respondidas`} />
          <div style={S.body}>
            {error && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `${colors.danger}15`, border: `1px solid ${colors.danger}40`, borderRadius: '12px', padding: '12px 14px', fontSize: '13px', fontWeight: '700', color: colors.danger }}><AlertCircle size={15} /> {error}</div>}

            {survey.questions?.map((q, i) => renderQuestion(q, i))}

            <button onClick={handleSubmit} disabled={sending || !allAnswered()} style={S.bigBtn(colors.success, sending || !allAnswered())}>
              {sending ? <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Enviando...</> : <><CheckCircle size={20} /> Enviar Respostas</>}
            </button>
          </div>
        </>
      )}

      {/* ── CONCLUÍDO ── */}
      {step === 'done' && (
        <>
          <HeaderBar sub="Questionário concluído" />
          <div style={S.body}>
            <div style={{ ...S.card, textAlign: 'center', padding: '36px 24px' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: `${colors.success}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                <CheckCircle size={40} color={colors.success} />
              </div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '6px' }}>
                Enviado com sucesso!
              </div>
              {numQuestionario && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: `${colors.primary}12`, border: `1px solid ${colors.primary}30`, borderRadius: '8px', padding: '5px 14px', fontSize: '13px', fontWeight: '800', color: colors.primary, marginBottom: '10px' }}>
                  <Hash size={13} /> Questionário {numQuestionario}
                </div>
              )}
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Respostas registradas com sucesso{gpsPos ? ' com localização GPS' : ''}.
              </div>

              {/* Progresso atualizado */}
              {isPersonal && meta > 0 && (
                <div style={{ margin: '18px 0', padding: '14px', background: 'var(--bg-app)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', fontWeight: '700' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Progresso</span>
                    <span style={{ color: totalFeitas >= meta ? colors.success : colors.primary }}>{totalFeitas} / {meta}</span>
                  </div>
                  <div style={{ height: '8px', borderRadius: '50px', background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (totalFeitas / meta) * 100)}%`, borderRadius: '50px', background: totalFeitas >= meta ? colors.success : colors.primary, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Botões de ação pós-envio */}
            <button onClick={handleProxima} style={S.bigBtn(colors.primary)}>
              <RefreshCw size={18} /> Próxima Pesquisa
            </button>
            <button onClick={() => setStep('inicio')} style={{ ...S.bigBtn('transparent', false), color: 'var(--text-muted)', boxShadow: 'none', border: '1px solid var(--border)' }}>
              <Home size={18} /> Voltar ao Início
            </button>
          </div>
        </>
      )}

<style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}

// ── Componente raiz ───────────────────────────────────────────
export default function PublicSurveyAccess({ surveyId, entrevistadorId }) {
  const [survey,        setSurvey]        = useState(null);
  const [entrevistador, setEntrevistador] = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        // Carrega a campanha
        const snap = await getDoc(doc(db, 'surveys', surveyId));
        if (!snap.exists()) { setError('Campanha não encontrada.'); setLoading(false); return; }
        setSurvey({ id: snap.id, ...snap.data() });

        // Se há entrevistadorId, carrega os dados do entrevistador
        if (entrevistadorId) {
          const eSnap = await getDoc(doc(db, 'survey_entrevistadores', entrevistadorId));
          if (eSnap.exists()) setEntrevistador({ id: eSnap.id, ...eSnap.data() });
        }
      } catch { setError('Erro ao carregar a campanha.'); }
      setLoading(false);
    };
    load();
  }, [surveyId, entrevistadorId]);

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)' }}>
      <Loader2 size={32} color={colors.primary} style={{ animation: 'spin 0.8s linear infinite' }} />
<style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)', padding: '20px' }}>
      <div style={{ textAlign: 'center', maxWidth: '320px' }}>
        <AlertCircle size={44} color={colors.danger} style={{ marginBottom: '14px' }} />
        <div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '6px' }}>Campanha indisponível</div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{error}</div>
      </div>
    </div>
  );

  if (survey.status === 'draft' || survey.status === 'ready') return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)', padding: '20px' }}>
      <div style={{ textAlign: 'center', maxWidth: '340px' }}>
        <div style={{ fontSize: '40px', marginBottom: '14px' }}>⏳</div>
        <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '8px' }}>{survey.title}</div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>Esta pesquisa ainda não foi ativada.</div>
      </div>
    </div>
  );

  if (survey.status === 'finished') return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)', padding: '20px' }}>
      <div style={{ textAlign: 'center', maxWidth: '320px' }}>
        <div style={{ fontSize: '40px', marginBottom: '14px' }}>⛔</div>
        <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '6px' }}>{survey.title}</div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Esta campanha foi encerrada.</div>
      </div>
    </div>
  );

  return <ResponseScreen survey={survey} surveyId={surveyId} entrevistador={entrevistador} />;
}