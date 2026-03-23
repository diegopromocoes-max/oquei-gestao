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
  ToggleLeft, Type, List, Home, Target, Navigation, WifiOff, AlertTriangle,
} from 'lucide-react';
import { colors } from '../../components/ui';
import SurveyBackupCard from '../components/SurveyBackupCard';
import { useSurveyLiveTracking } from '../hooks/useSurveyLiveTracking';
import { buildSurveyResponsePayload } from '../lib/responsePayloads';
import {
  createSurveyBackupPayload,
  exportSurveyBackups,
  getSurveyBackupSummary,
  saveSurveyBackup,
  updateSurveyBackupSync,
} from '../lib/surveyBackups';

// ── GPS ──────────────────────────────────────────────────────
let gpsBlocked = false;

const requestGPS = () =>
  new Promise(res => {
    if (!navigator.geolocation) return res({ ok: false, reason: 'sem_suporte' });
    navigator.geolocation.getCurrentPosition(
      p  => res({ ok: true, pos: { lat: p.coords.latitude, lng: p.coords.longitude }, accuracy: p.coords.accuracy }),
      err => {
        if (err.code === 1) { gpsBlocked = true; return res({ ok: false, reason: 'negado' }); }
        if (err.code === 2) return res({ ok: false, reason: 'indisponivel' });
        return res({ ok: false, reason: 'timeout' });
      },
      { timeout: 12000, maximumAge: 0, enableHighAccuracy: true }
    );
  });

const getGPS = () =>
  new Promise(res => {
    if (gpsBlocked || !navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(
      p  => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => res(null),
      { timeout: 8000, maximumAge: 30000 }
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


// ── OutroField — "Outro" para Escolha Única (estado controlado pelo pai) ──
function OutroField({ color, open, currentValue, isSelected, onOpen, onClose, onSelect }) {
  const [texto, setTexto] = React.useState(currentValue || '');
  const inputRef = React.useRef(null);

  // Sincroniza texto quando valor externo muda (ex: reset entre entrevistas)
  React.useEffect(() => { setTexto(currentValue || ''); }, [currentValue]);

  // Foca input ao abrir
  React.useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const handleConfirm = () => {
    const val = texto.trim();
    if (!val) return;
    onSelect(val);
    setTexto('');
  };

  // Quando fechado: mostra o valor selecionado como botão marcado, ou o botão "Outro"
  if (!open) {
    if (isSelected && currentValue) {
      return (
        <button onClick={onOpen}
          style={{ ...S.optBtn(true, color), marginBottom: '8px' }}>
          <span>✏️ {currentValue}</span>
          <CheckCircle size={18} color={color} />
        </button>
      );
    }
    return (
      <button onClick={onOpen}
        style={{
          width: '100%', padding: '14px 18px', borderRadius: '12px', textAlign: 'left',
          fontWeight: '800', fontSize: '15px', cursor: 'pointer', marginBottom: '8px',
          border: `2px solid var(--border)`, background: 'var(--bg-app)', color: 'var(--text-muted)',
          display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.12s',
        }}>
        <span style={{ fontSize: '16px' }}>✏️</span> Outro (escrever)
      </button>
    );
  }

  return (
    <div style={{ border: `2px solid ${color}`, borderRadius: '12px', padding: '12px 14px', marginBottom: '8px', background: `${color}08` }}>
      <div style={{ fontSize: '12px', fontWeight: '800', color, marginBottom: '8px' }}>✏️ Escreva sua resposta:</div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input ref={inputRef}
          style={{ flex: 1, padding: '10px 14px', borderRadius: '9px', border: `1px solid ${color}50`, outline: 'none', fontSize: '15px', color: 'var(--text-main)', background: 'var(--bg-app)', fontFamily: 'inherit' }}
          placeholder="Digite aqui..."
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleConfirm()}
        />
        <button onClick={handleConfirm} disabled={!texto.trim()}
          style={{ padding: '10px 16px', borderRadius: '9px', border: 'none', background: texto.trim() ? color : 'var(--border)', color: '#fff', fontWeight: '900', fontSize: '14px', cursor: texto.trim() ? 'pointer' : 'not-allowed', flexShrink: 0 }}>
          OK
        </button>
        <button onClick={() => { onClose(); setTexto(''); }}
          style={{ padding: '10px', borderRadius: '9px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          ✕
        </button>
      </div>
    </div>
  );
}

// ── OutroFieldMulti — "Outro" para Múltipla Escolha ──────────
function OutroFieldMulti({ color, outrosSelecionados, onToggle }) {
  const [open,  setOpen]  = React.useState(false);
  const [texto, setTexto] = React.useState('');
  const inputRef = React.useRef(null);

  const handleConfirm = () => {
    const val = texto.trim();
    if (!val) return;
    if (!outrosSelecionados.includes(val)) {
      onToggle(val);
    }
    setTexto('');
    setOpen(false);
  };

  return (
    <div>
      {/* Exibe itens "Outro" já selecionados como chips marcados */}
      {outrosSelecionados.map(val => (
        <button key={val} onClick={() => onToggle(val)}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: '12px', textAlign: 'left',
            fontWeight: '800', fontSize: '15px', cursor: 'pointer',
            border: `2px solid ${color}`, background: `${color}15`, color,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            transition: 'all 0.12s', marginBottom: '8px',
          }}>
          <span>✏️ {val}</span>
          <div style={{ width: '20px', height: '20px', borderRadius: '5px', border: `2px solid ${color}`, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={13} color="#fff" />
          </div>
        </button>
      ))}

      {/* Botão para abrir campo de novo Outro */}
      {!open ? (
        <button onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
          style={{
            width: '100%', padding: '14px 18px', borderRadius: '12px', textAlign: 'left',
            fontWeight: '800', fontSize: '15px', cursor: 'pointer',
            border: `2px solid var(--border)`, background: 'var(--bg-app)', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.12s',
          }}>
          <span style={{ fontSize: '16px' }}>✏️</span> Outro (escrever)
        </button>
      ) : (
        <div style={{ border: `2px solid ${color}`, borderRadius: '12px', padding: '12px 14px', background: `${color}08` }}>
          <div style={{ fontSize: '12px', fontWeight: '800', color, marginBottom: '8px' }}>✏️ Outro — escreva sua resposta:</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input ref={inputRef}
              style={{ flex: 1, padding: '10px 14px', borderRadius: '9px', border: `1px solid ${color}50`, outline: 'none', fontSize: '15px', color: 'var(--text-main)', background: 'var(--bg-app)', fontFamily: 'inherit' }}
              placeholder="Digite aqui..."
              value={texto}
              onChange={e => setTexto(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            />
            <button onClick={handleConfirm} disabled={!texto.trim()}
              style={{ padding: '10px 16px', borderRadius: '9px', border: 'none', background: texto.trim() ? color : 'var(--border)', color: '#fff', fontWeight: '900', fontSize: '14px', cursor: texto.trim() ? 'pointer' : 'not-allowed', flexShrink: 0 }}>
              OK
            </button>
            <button onClick={() => { setOpen(false); setTexto(''); }}
              style={{ padding: '10px', borderRadius: '9px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tela de aplicação de questionário ────────────────────────
function ResponseScreen({ survey, surveyId, entrevistador }) {
  // entrevistador: { id, nome, telefone, meta } ou null (link geral)

  const isPersonal = !!entrevistador;

  const [step,      setStep]      = useState('inicio');   // inicio | questions | done
  const [nome,      setNome]      = useState(entrevistador?.nome || '');
  const [telefone,  setTelefone]  = useState(entrevistador?.telefone || '');
  const [city,      setCity]      = useState(survey.targetCities?.[0] || '');
  const [answers,   setAnswers]   = useState({});
  const [outroOpen,  setOutroOpen]  = useState({}); // qId -> bool
  const [sending,   setSending]   = useState(false);
  const [error,     setError]     = useState('');
  const [gpsPos,    setGpsPos]    = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle|loading|ok|negado|indisponivel|timeout|sem_suporte
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [totalFeitas, setTotalFeitas] = useState(0);
  const [numQuestionario, setNumQuestionario] = useState('');
  const meta = entrevistador?.meta || 0;
  const backupScope = React.useMemo(() => ({
    surveyId,
    surveyTitle: survey?.title || '',
    interviewerId: entrevistador?.id || null,
    collectionSource: entrevistador?.id ? 'personal_link' : 'public_link',
  }), [entrevistador?.id, survey?.title, surveyId]);
  const [backupSummary, setBackupSummary] = useState(() => getSurveyBackupSummary(backupScope));

  const refreshBackupSummary = React.useCallback(() => {
    setBackupSummary(getSurveyBackupSummary(backupScope));
  }, [backupScope]);

  // Carrega total apenas na montagem — depois usa incremento local
  useEffect(() => {
    if (!isPersonal) return;
    getDocs(query(
      collection(db, 'survey_responses'),
      where('surveyId', '==', surveyId),
      where('entrevistadorId', '==', entrevistador.id)
    )).then(snap => setTotalFeitas(snap.size)).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refreshBackupSummary();
  }, [refreshBackupSummary]);

  useEffect(() => {
    const handleStorage = () => refreshBackupSummary();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshBackupSummary]);

  const liveTracking = useSurveyLiveTracking({
    enabled: step !== 'inicio',
    survey,
    surveyId,
    interviewer: entrevistador || null,
    researcherName: nome.trim() || entrevistador?.nome || 'Pesquisador',
    researcherUid: null,
    city,
    cityId: city,
    cityName: city,
    collectionSource: entrevistador?.id ? 'personal_link' : 'public_link',
    currentStep: step,
    location: gpsPos,
    gpsAccuracy,
    totalCollected: totalFeitas,
    onLocationUpdate: (nextLocation, nextAccuracy) => {
      setGpsPos(nextLocation);
      setGpsAccuracy(nextAccuracy);
      setGpsStatus('ok');
    },
  });

  const captureGPS = async () => {
    setGpsStatus('loading');
    const result = await requestGPS();
    if (result.ok) {
      setGpsPos(result.pos);
      setGpsAccuracy(result.accuracy);
      setGpsStatus('ok');
    } else {
      setGpsPos(null);
      setGpsStatus(result.reason); // negado | indisponivel | timeout | sem_suporte
    }
  };

  const handleIniciar = async () => {
    if (!nome.trim()) { setError('Informe seu nome.'); return; }
    if (isPersonal && !telefone.trim()) { setError('Informe seu telefone.'); return; }
    if (gpsStatus !== 'ok') {
      const confirm = window.confirm('⚠️ GPS não está ativo!\n\nA localização é muito importante para auditoria das entrevistas.\n\nDeseja continuar sem GPS?');
      if (!confirm) return;
    }
    setError('');
    // Gera número do questionário
    const eid = entrevistador?.id || 'geral';
    const num = await gerarNumeroQuestionario(surveyId, eid);
    setNumQuestionario(num);
    setAnswers({}); setOutroOpen({});
    captureGPS();
    setStep('questions');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExportBackups = () => {
    const exported = exportSurveyBackups(backupScope, {
      baseName: survey?.title || 'pesquisa',
    });

    if (!exported) {
      window.showToast?.('Nenhum backup local disponivel para exportacao.', 'info');
      return;
    }

    window.showToast?.(`${exported} backup(s) exportado(s).`, 'success');
  };

  const handleAnswer = (qId, val, isMulti = false) => {
    if (!isMulti) {
      setAnswers(a => ({ ...a, [qId]: val }));
    } else {
      // Toggle: adiciona se não existe, remove se já existe
      setAnswers(a => {
        const prev = Array.isArray(a[qId]) ? a[qId] : [];
        const next = prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val];
        return { ...a, [qId]: next };
      });
    }
  };

  const allAnswered = () =>
    survey.questions?.every(q => {
      // Pergunta sem id (dados antigos) — ignora
      if (!q.id) return true;
      const ans = answers[q.id];
      if (ans === undefined || ans === null) return false;
      if (q.type === 'multiselect') return Array.isArray(ans) && ans.length > 0;
      if (q.type === 'text') return String(ans).length > 0; // qualquer caractere conta
      if (q.type === 'nps') return ans !== undefined && ans !== null && ans !== '';
      return String(ans).trim() !== '';
    });

  const handleSubmit = async () => {
    if (!allAnswered()) { setError('Responda todas as perguntas antes de enviar.'); return; }
    setSending(true); setError('');
    let backupRecord = null;
    try {
      let loc = gpsPos;
      if (!loc && !gpsBlocked) loc = await getGPS();
      const backupCreatedAtClient = new Date().toISOString();
      const responsePayload = buildSurveyResponsePayload({
        survey: { id: surveyId, ...survey },
        answers,
        location: loc || null,
        researcherName: nome.trim(),
        researcherUid: null,
        city: city || '',
        phone: telefone.trim() || null,
        interviewerId: entrevistador?.id || null,
        collectionSource: entrevistador?.id ? 'personal_link' : 'public_link',
        number: numQuestionario,
        backupCreatedAtClient,
      });
      backupRecord = createSurveyBackupPayload({
        survey: { id: surveyId, ...survey },
        responsePayload,
        interviewerId: entrevistador?.id || null,
      });

      saveSurveyBackup(backupRecord);
      refreshBackupSummary();

      const responseRef = await addDoc(collection(db, 'survey_responses'), {
        ...backupRecord.responsePayload,
        timestamp: serverTimestamp(),
      });

      updateSurveyBackupSync(backupRecord.backupId, {
        syncStatus: 'synced',
        responseId: responseRef.id,
        syncError: '',
      });
      refreshBackupSummary();
      const nextTotal = totalFeitas + 1;
      setTotalFeitas(nextTotal);
      void liveTracking.markResponseCollected({
        responseId: responseRef.id,
        responseNumber: numQuestionario,
        totalCollected: nextTotal,
      }).catch(() => {});
      setStep('done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      if (backupRecord?.backupId) {
        updateSurveyBackupSync(backupRecord.backupId, {
          syncStatus: 'error',
          syncError: e.message,
        });
      }
      refreshBackupSummary();
      setError(`Erro ao enviar: ${e.message}. O backup local ficou salvo neste aparelho e pode ser exportado.`);
    }
    setSending(false);
  };

  const handleProxima = async () => {
    setAnswers({}); setOutroOpen({}); setError('');
    // Gera número do próximo questionário antes de ir para perguntas
    const eid = entrevistador?.id || 'geral';
    const num = await gerarNumeroQuestionario(surveyId, eid);
    setNumQuestionario(num);
    setGpsPos(null);
    setGpsStatus('idle');
    captureGPS();
    setStep('questions');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Render pergunta ─────────────────────────────────────────
  const renderQuestion = (q, idx) => {
    const cfg = { boolean: { color: colors.success }, select: { color: colors.primary }, multiselect: { color: colors.purple }, nps: { color: colors.warning }, text: { color: colors.warning } }[q.type] || { color: colors.primary };
    const ans = answers[q.id];
    const isText = q.type === 'text';
    const respondida = ans !== undefined && ans !== null && (
      Array.isArray(ans) ? ans.length > 0
      : isText ? String(ans).length > 0
      : String(ans).trim() !== ''
    );
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

        {q.type === 'select' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {(q.options || []).map(opt => (
              <button key={opt} onClick={() => {
                handleAnswer(q.id, opt);
                setOutroOpen(o => ({ ...o, [q.id]: false }));
              }} style={S.optBtn(ans === opt, cfg.color)}>
                <span>{opt}</span>
                {ans === opt && <CheckCircle size={18} color={cfg.color} />}
              </button>
            ))}
            <OutroField
              key={`outro-${q.id}`}
              color={cfg.color}
              isSelected={!!(ans && !(q.options || []).includes(ans))}
              currentValue={ans && !(q.options || []).includes(ans) ? ans : ''}
              open={!!outroOpen[q.id] || !!(ans && !(q.options || []).includes(ans))}
              onOpen={() => setOutroOpen(o => ({ ...o, [q.id]: true }))}
              onClose={() => { setOutroOpen(o => ({ ...o, [q.id]: false })); if (!(q.options||[]).includes(ans)) handleAnswer(q.id, ''); }}
              onSelect={(val) => { handleAnswer(q.id, val); setOutroOpen(o => ({ ...o, [q.id]: false })); }}
            />
          </div>
        )}

        {q.type === 'multiselect' && (() => {
          const ansArr = Array.isArray(ans) ? ans : [];
          const outrosSelecionados = ansArr.filter(v => !(q.options || []).includes(v));
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>
                Selecione todas as opções que se aplicam
              </div>
              {(q.options || []).map(opt => {
                const selected = ansArr.includes(opt);
                return (
                  <button key={opt} onClick={() => handleAnswer(q.id, opt, true)}
                    style={{
                      width: '100%', padding: '14px 16px', borderRadius: '12px', textAlign: 'left',
                      fontWeight: '800', fontSize: '15px', cursor: 'pointer',
                      border: `2px solid ${selected ? cfg.color : 'var(--border)'}`,
                      background: selected ? `${cfg.color}15` : 'var(--bg-app)',
                      color: selected ? cfg.color : 'var(--text-main)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'all 0.12s',
                    }}>
                    <span>{opt}</span>
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '5px', flexShrink: 0,
                      border: `2px solid ${selected ? cfg.color : 'var(--border)'}`,
                      background: selected ? cfg.color : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s',
                    }}>
                      {selected && <CheckCircle size={13} color="#fff" />}
                    </div>
                  </button>
                );
              })}
              <OutroFieldMulti
                color={cfg.color}
                outrosSelecionados={outrosSelecionados}
                onToggle={(val) => handleAnswer(q.id, val, true)}
              />
              {ansArr.length > 0 && (
                <div style={{ fontSize: '11px', color: cfg.color, fontWeight: '700', marginTop: '2px' }}>
                  ✓ {ansArr.length} opção{ansArr.length !== 1 ? 'ões' : ''} selecionada{ansArr.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          );
        })()}

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

            {/* ── Painel GPS ── */}
            <SurveyBackupCard
              summary={backupSummary}
              onExport={handleExportBackups}
              title="Backups deste link"
              subtitle="Os questionarios aplicados por este link ficam salvos localmente para exportacao e contingencia."
            />

            {(() => {
              const gpsOk = gpsStatus === 'ok';
              const gpsLoading = gpsStatus === 'loading';
              const gpsMsgs = {
                idle:         { icon: '📍', label: 'GPS não ativado', sub: 'Clique em "Ativar GPS" para capturar sua localização.', color: colors.warning, bg: `${colors.warning}12`, border: `${colors.warning}30` },
                loading:      { icon: '⏳', label: 'Obtendo localização...', sub: 'Aguarde enquanto o GPS é capturado.', color: colors.primary, bg: `${colors.primary}10`, border: `${colors.primary}30` },
                ok:           { icon: '✅', label: 'GPS ativo', sub: gpsAccuracy ? `Precisão: ±${Math.round(gpsAccuracy)}m` : 'Localização capturada.', color: colors.success, bg: `${colors.success}10`, border: `${colors.success}30` },
                negado:       { icon: '🚫', label: 'Permissão negada', sub: 'Ative o GPS nas configurações do navegador e recarregue a página.', color: colors.danger, bg: `${colors.danger}10`, border: `${colors.danger}30` },
                indisponivel: { icon: '📡', label: 'GPS indisponível', sub: 'Sinal não encontrado. Tente em local aberto.', color: colors.warning, bg: `${colors.warning}10`, border: `${colors.warning}30` },
                timeout:      { icon: '⏱', label: 'Tempo esgotado', sub: 'O GPS demorou para responder. Tente novamente.', color: colors.warning, bg: `${colors.warning}10`, border: `${colors.warning}30` },
                sem_suporte:  { icon: '❌', label: 'GPS não suportado', sub: 'Este dispositivo não suporta geolocalização.', color: colors.danger, bg: `${colors.danger}10`, border: `${colors.danger}30` },
              };
              const m = gpsMsgs[gpsStatus] || gpsMsgs.idle;
              return (
                <div style={{ background: m.bg, border: `1px solid ${m.border}`, borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px' }}>{m.icon}</span>
                      <div>
                        <div style={{ fontWeight: '900', fontSize: '14px', color: m.color }}>{m.label}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>{m.sub}</div>
                      </div>
                    </div>
                    {!gpsOk && !gpsLoading && gpsStatus !== 'negado' && gpsStatus !== 'sem_suporte' && (
                      <button onClick={captureGPS}
                        style={{ padding: '9px 16px', borderRadius: '10px', border: 'none', background: m.color, color: '#fff', fontWeight: '900', fontSize: '13px', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Navigation size={14} /> {gpsStatus === 'idle' ? 'Ativar GPS' : 'Tentar novamente'}
                      </button>
                    )}
                    {gpsOk && (
                      <button onClick={captureGPS}
                        style={{ padding: '7px 12px', borderRadius: '8px', border: `1px solid ${colors.success}40`, background: 'transparent', color: colors.success, fontWeight: '800', fontSize: '11px', cursor: 'pointer', flexShrink: 0 }}>
                        Atualizar
                      </button>
                    )}
                    {gpsStatus === 'loading' && (
                      <Loader2 size={20} color={colors.primary} style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                    )}
                  </div>
                  {/* Aviso de importância */}
                  {gpsStatus === 'idle' && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', background: `${colors.warning}18`, borderRadius: '8px', padding: '8px 11px', fontSize: '12px', color: colors.warning, fontWeight: '700', lineHeight: 1.4 }}>
                      <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
                      A localização GPS é obrigatória para registrar onde a entrevista foi realizada. Ative antes de iniciar.
                    </div>
                  )}
                  {gpsStatus === 'negado' && (
                    <div style={{ background: `${colors.danger}15`, borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: colors.danger, fontWeight: '700', lineHeight: 1.5 }}>
                      Para reativar: abra as configurações do navegador → Privacidade → Permissões de localização → Permita para este site.
                    </div>
                  )}
                </div>
              );
            })()}

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
          <HeaderBar sub={`${survey.questions?.filter(q => { const a = answers[q.id]; return a !== undefined && a !== null && (Array.isArray(a) ? a.length > 0 : String(a).length > 0); }).length || 0} de ${survey.questions?.length || 0} respondidas`} />
          <div style={S.body}>
            {error && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `${colors.danger}15`, border: `1px solid ${colors.danger}40`, borderRadius: '12px', padding: '12px 14px', fontSize: '13px', fontWeight: '700', color: colors.danger }}><AlertCircle size={15} /> {error}</div>}

            <SurveyBackupCard
              summary={backupSummary}
              onExport={handleExportBackups}
              title="Backup operacional"
              subtitle="Se houver falha de integracao, exporte os questionarios salvos neste aparelho e reimporte no painel."
            />

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

              <div style={{ marginTop: '18px', textAlign: 'left' }}>
                <SurveyBackupCard
                  summary={backupSummary}
                  onExport={handleExportBackups}
                  title="Backup atualizado"
                  subtitle="Mantenha a exportacao como contingencia caso seja necessario reimportar essas entrevistas."
                />
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
        // 1. Carrega a campanha
        const snap = await getDoc(doc(db, 'surveys', surveyId));
        if (!snap.exists()) { setError('Campanha não encontrada.'); setLoading(false); return; }
        setSurvey({ id: snap.id, ...snap.data() });
      } catch {
        setError('Erro ao carregar a campanha. Verifique sua conexão.');
        setLoading(false);
        return;
      }

      // 2. Se há entrevistadorId, carrega separadamente
      if (entrevistadorId) {
        try {
          const eSnap = await getDoc(doc(db, 'survey_entrevistadores', entrevistadorId));
          if (eSnap.exists()) {
            setEntrevistador({ id: eSnap.id, ...eSnap.data() });
          } else {
            // Documento não encontrado — link inválido ou entrevistador removido
            setError('Link de entrevistador inválido ou expirado.');
            setLoading(false);
            return;
          }
        } catch {
          setError('Não foi possível carregar os dados do entrevistador. Verifique sua conexão.');
          setLoading(false);
          return;
        }
      }

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
