// ============================================================
//  PublicSurveyAccess.jsx — Oquei Pesquisas
//
//  Página pública de acesso às campanhas via link + senha.
//  Rota: /pesquisa/:surveyId
//
//  Dois modos derivados do status da campanha:
//    draft   → tela de EDIÇÃO de perguntas (supervisor distribui
//               este link para quem vai montar a pesquisa)
//    active  → tela de RESPOSTA (pesquisador de campo)
//    finished→ mensagem de encerramento
//
//  Autenticação: apenas a senha da campanha (accessCode).
//  O respondente digita seu nome antes de responder.
// ============================================================
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  doc, getDoc, updateDoc, addDoc,
  collection, serverTimestamp,
} from 'firebase/firestore';
import {
  Lock, ClipboardList, CheckCircle, ChevronRight,
  Loader2, AlertCircle, MapPin, User, ToggleLeft,
  Hash, Type, List, Eye, EyeOff,
} from 'lucide-react';
import { colors } from '../../components/ui';

// ── helpers ─────────────────────────────────────────────────
const getGPS = () =>
  new Promise((res) => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(
      p => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => res(null),
      { timeout: 8000, maximumAge: 0 }
    );
  });

const QUESTION_TYPES = {
  boolean:  { label: 'Sim / Não',        icon: ToggleLeft, color: colors.success },
  select:   { label: 'Múltipla Escolha', icon: List,       color: colors.primary },
  nps:      { label: 'Escala NPS 0–10',  icon: Hash,       color: colors.purple  },
  text:     { label: 'Texto Livre',      icon: Type,       color: colors.warning },
};

const npsColor = n =>
  n <= 3 ? colors.danger : n <= 6 ? colors.warning : n <= 8 ? colors.primary : colors.success;

// ── Estilos mobile-first ─────────────────────────────────────
const S = {
  root: {
    minHeight: '100dvh', background: 'var(--bg-app)',
    display: 'flex', flexDirection: 'column',
    fontFamily: "'Manrope', system-ui, sans-serif",
  },
  header: {
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.purple} 100%)`,
    padding: '22px 20px 18px', color: '#fff', flexShrink: 0,
  },
  body: {
    flex: 1, padding: '18px 16px',
    display: 'flex', flexDirection: 'column', gap: '14px',
    maxWidth: '560px', width: '100%', margin: '0 auto',
    overflowY: 'auto',
  },
  card: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-sm)',
  },
  inp: {
    width: '100%', padding: '14px 16px', borderRadius: '12px',
    border: '1px solid var(--border)', outline: 'none',
    fontSize: '16px', color: 'var(--text-main)',
    background: 'var(--bg-app)', fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  bigBtn: (color = colors.primary, disabled = false) => ({
    width: '100%', padding: '18px', borderRadius: '14px', border: 'none',
    background: disabled ? 'var(--border)' : color,
    color: disabled ? 'var(--text-muted)' : '#fff',
    fontSize: '16px', fontWeight: '900',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    boxShadow: disabled ? 'none' : `0 4px 16px ${color}44`,
    transition: 'all 0.15s',
  }),
  optBtn: (sel, color = colors.primary) => ({
    width: '100%', padding: '16px 18px', borderRadius: '12px',
    textAlign: 'left', fontWeight: '800', fontSize: '15px', cursor: 'pointer',
    border: `2px solid ${sel ? color : 'var(--border)'}`,
    background: sel ? `${color}15` : 'var(--bg-app)',
    color: sel ? color : 'var(--text-main)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    transition: 'all 0.12s', marginBottom: '8px',
  }),
  npsBtn: (sel, n) => {
    const c = npsColor(n);
    return {
      flex: 1, padding: '14px 0', borderRadius: '10px',
      border: `2px solid ${sel ? c : 'var(--border)'}`,
      background: sel ? `${c}20` : 'var(--bg-app)',
      color: sel ? c : 'var(--text-muted)',
      fontWeight: '900', fontSize: '16px', cursor: 'pointer',
      transition: 'all 0.12s',
    };
  },
};

// ── Tela de senha ─────────────────────────────────────────────
function PasswordScreen({ survey, onUnlock }) {
  const [code, setCode]     = useState('');
  const [show, setShow]     = useState(false);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (code === survey.accessCode) {
        onUnlock();
      } else {
        setError('Senha incorreta. Tente novamente.');
        setCode('');
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div style={S.root}>
      <div style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardList size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '900' }}>Oquei Pesquisas</div>
            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>Acesso à campanha</div>
          </div>
        </div>
      </div>

      <div style={S.body}>
        <div style={{ ...S.card, textAlign: 'center' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: `${colors.primary}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Lock size={28} color={colors.primary} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '6px' }}>{survey.title}</div>
          {survey.description && (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>{survey.description}</div>
          )}
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            {survey.questions?.length || 0} pergunta{survey.questions?.length !== 1 ? 's' : ''}
            {survey.targetCities?.length > 0 && ` · ${survey.targetCities.join(', ')}`}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...S.inp, paddingRight: '48px', textAlign: 'center', letterSpacing: show ? '0' : '0.3em', fontSize: '18px' }}
                type={show ? 'text' : 'password'}
                placeholder="Senha da campanha"
                value={code}
                onChange={e => { setCode(e.target.value); setError(''); }}
                autoFocus
              />
              <button type="button" onClick={() => setShow(s => !s)}
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `${colors.danger}12`, border: `1px solid ${colors.danger}30`, borderRadius: '10px', padding: '10px 13px', fontSize: '13px', fontWeight: '700', color: colors.danger }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <button type="submit" disabled={!code.trim() || loading} style={S.bigBtn(colors.primary, !code.trim() || loading)}>
              {loading
                ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
                : <><Lock size={18} /> Acessar</>
              }
            </button>
          </form>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Tela de resposta (pesquisador de campo) ───────────────────
function ResponseScreen({ survey, surveyId }) {
  const [name,     setName]     = useState('');
  const [city,     setCity]     = useState(survey.targetCities?.[0] || '');
  const [step,     setStep]     = useState('identify'); // identify | questions | done
  const [answers,  setAnswers]  = useState({});
  const [sending,  setSending]  = useState(false);
  const [gpsStatus,setGpsStatus]= useState('idle');
  const [gpsPos,   setGpsPos]   = useState(null);
  const [error,    setError]    = useState('');

  const captureGPS = async () => {
    setGpsStatus('loading');
    const pos = await getGPS();
    setGpsPos(pos);
    setGpsStatus(pos ? 'ok' : 'error');
  };

  const handleStartQuestions = () => {
    if (!name.trim()) { setError('Informe seu nome para continuar.'); return; }
    setError('');
    setStep('questions');
    captureGPS();
  };

  const handleAnswer = (qId, val) => setAnswers(a => ({ ...a, [qId]: val }));

  const allAnswered = () =>
    survey.questions?.every(q => answers[q.id] !== undefined && String(answers[q.id]).trim() !== '');

  const handleSubmit = async () => {
    if (!allAnswered()) { setError('Responda todas as perguntas antes de enviar.'); return; }
    setSending(true);
    setError('');
    try {
      let loc = gpsPos;
      if (!loc) loc = await getGPS();
      await addDoc(collection(db, 'survey_responses'), {
        surveyId,
        surveyTitle:    survey.title,
        researcherName: name.trim(),
        researcherUid:  null, // acesso público, sem login
        city:           city || '',
        location:       loc || null,
        answers,
        timestamp: serverTimestamp(),
      });
      setStep('done');
    } catch (e) { setError('Erro ao enviar: ' + e.message); }
    setSending(false);
  };

  const renderQuestion = (q, idx) => {
    const cfg = QUESTION_TYPES[q.type] || QUESTION_TYPES.boolean;
    const ans = answers[q.id];
    return (
      <div key={q.id} style={S.card}>
        <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
          Pergunta {idx + 1} de {survey.questions.length}
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
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {Array.from({ length: 11 }, (_, i) => i).map(n => (
                <button key={n} onClick={() => handleAnswer(q.id, String(n))} style={{ ...S.npsBtn(ans === String(n), n), minWidth: '38px' }}>{n}</button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
              <span>😞 Péssimo</span><span>😍 Excelente</span>
            </div>
          </div>
        )}

        {q.type === 'text' && (
          <textarea
            style={{ ...S.inp, minHeight: '100px', resize: 'vertical', fontSize: '15px' }}
            placeholder="Escreva sua resposta aqui..."
            value={ans || ''}
            onChange={e => handleAnswer(q.id, e.target.value)}
          />
        )}
      </div>
    );
  };

  return (
    <div style={S.root}>
      <div style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardList size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '900' }}>{survey.title}</div>
            <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>
              {step === 'identify' ? 'Identificação' : step === 'questions' ? `${Object.keys(answers).length}/${survey.questions?.length || 0} respondidas` : 'Concluído'}
            </div>
          </div>
        </div>
        {step === 'questions' && gpsStatus === 'ok' && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(16,185,129,0.25)', borderRadius: '8px', padding: '5px 10px', fontSize: '11px', fontWeight: '700', color: '#a7f3d0', marginTop: '10px' }}>
            <MapPin size={11} /> GPS capturado
          </div>
        )}
      </div>

      <div style={S.body}>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `${colors.danger}15`, border: `1px solid ${colors.danger}40`, borderRadius: '12px', padding: '12px 14px', fontSize: '13px', fontWeight: '700', color: colors.danger }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* Identificação */}
        {step === 'identify' && (
          <>
            <div style={S.card}>
              <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '4px' }}>Sua identificação</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>Seus dados ficam registrados junto com as respostas.</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                    Seu nome *
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0 14px' }}>
                    <User size={16} color="var(--text-muted)" />
                    <input
                      style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', padding: '14px 0', fontSize: '16px', color: 'var(--text-main)', fontFamily: 'inherit' }}
                      placeholder="Digite seu nome completo"
                      value={name}
                      onChange={e => { setName(e.target.value); setError(''); }}
                      autoFocus
                    />
                  </div>
                </div>

                {(survey.targetCities?.length > 0) && (
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                      Cidade
                    </label>
                    <select
                      style={{ ...S.inp, fontSize: '15px' }}
                      value={city}
                      onChange={e => setCity(e.target.value)}
                    >
                      <option value="">Selecionar...</option>
                      {survey.targetCities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <button onClick={handleStartQuestions} disabled={!name.trim()} style={S.bigBtn(colors.primary, !name.trim())}>
              Iniciar Pesquisa <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Perguntas */}
        {step === 'questions' && (
          <>
            {survey.questions?.map((q, i) => renderQuestion(q, i))}
            <button onClick={handleSubmit} disabled={sending || !allAnswered()} style={S.bigBtn(colors.success, sending || !allAnswered())}>
              {sending
                ? <><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Enviando...</>
                : <><CheckCircle size={20} /> Enviar Respostas</>
              }
            </button>
          </>
        )}

        {/* Sucesso */}
        {step === 'done' && (
          <div style={{ ...S.card, textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: `${colors.success}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <CheckCircle size={40} color={colors.success} />
            </div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '8px' }}>Obrigado, {name.split(' ')[0]}!</div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Suas respostas foram registradas com sucesso{gpsPos ? ' com localização GPS' : ''}.
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Componente raiz — carrega a campanha e decide o modo ──────
export default function PublicSurveyAccess({ surveyId }) {
  const [survey,   setSurvey]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'surveys', surveyId));
        if (!snap.exists()) { setError('Campanha não encontrada.'); setLoading(false); return; }
        setSurvey({ id: snap.id, ...snap.data() });
      } catch { setError('Erro ao carregar a campanha.'); }
      setLoading(false);
    };
    load();
  }, [surveyId]);

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)' }}>
      <Loader2 size={32} color={colors.primary} style={{ animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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

  if (survey.status === 'finished') return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)', padding: '20px' }}>
      <div style={{ textAlign: 'center', maxWidth: '320px' }}>
        <div style={{ fontSize: '40px', marginBottom: '14px' }}>⛔</div>
        <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '6px' }}>{survey.title}</div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Esta campanha foi encerrada e não aceita mais respostas.</div>
      </div>
    </div>
  );

  // Tela de senha
  if (!unlocked) return <PasswordScreen survey={survey} onUnlock={() => setUnlocked(true)} />;

  // Campanha ativa → tela de resposta
  return <ResponseScreen survey={survey} surveyId={surveyId} />;
}