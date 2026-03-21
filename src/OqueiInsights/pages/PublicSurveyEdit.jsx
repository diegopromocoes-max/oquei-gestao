// ============================================================
//  PublicSurveyEdit.jsx — Oquei Pesquisas
//  Rota pública: /pesquisa/:surveyId/editar
//
//  Correções:
//  · Rolagem de mouse funciona em desktop (override do overflow
//    hidden que o LayoutGlobal injeta no html/body/#root)
//  · Múltipla Escolha começa sem opções pré-definidas — todas
//    as opções são editáveis e excluíveis individualmente
// ============================================================
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import {
  Lock, ClipboardList, Plus, Trash2, GripVertical,
  ToggleLeft, Type, List, Hash, AlertTriangle,
  CheckCircle, Loader2, X, Eye, EyeOff, Save,
} from 'lucide-react';
import { colors } from '../../components/ui';

const QUESTION_TYPES = [
  { value: 'boolean', label: 'Sim / Não',        icon: ToggleLeft, color: colors.success },
  { value: 'select',  label: 'Múltipla Escolha', icon: List,       color: colors.primary },
  { value: 'nps',     label: 'Escala NPS 0–10',  icon: Hash,       color: colors.purple  },
  { value: 'text',    label: 'Texto Livre',       icon: Type,       color: colors.warning },
];

const emptyQuestion = () => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2),
  type: 'boolean', label: '', options: ['Sim', 'Não'],
});

const S = {
  root: { minHeight: '100dvh', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column', fontFamily: "'Manrope', system-ui, sans-serif" },
  header: { background: `linear-gradient(135deg, ${colors.warning} 0%, ${colors.amber} 100%)`, padding: '22px 20px 18px', color: '#fff', flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 },
  body: { flex: 1, padding: '18px 16px 48px', display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '640px', width: '100%', margin: '0 auto', boxSizing: 'border-box' },
  inp: { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border)', outline: 'none', fontSize: '14px', color: 'var(--text-main)', background: 'var(--bg-app)', fontFamily: 'inherit', boxSizing: 'border-box' },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-sm)' },
  bigBtn: (color = colors.primary, disabled = false) => ({ width: '100%', padding: '16px', borderRadius: '14px', background: disabled ? 'var(--bg-panel)' : color, color: disabled ? 'var(--text-muted)' : '#fff', fontSize: '15px', fontWeight: '900', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: disabled ? 'none' : `0 4px 16px ${color}44`, border: disabled ? '1px solid var(--border)' : 'none', transition: 'all 0.15s' }),
};

// Hook: desfaz o overflow:hidden que o LayoutGlobal injeta em html/body/#root
function useScrollFix() {
  useEffect(() => {
    const targets = [document.documentElement, document.body];
    const root = document.getElementById('root');
    if (root) targets.push(root);
    const prev = targets.map(el => ({ el, overflow: el.style.overflow, overflowY: el.style.overflowY, height: el.style.height }));
    targets.forEach(el => { el.style.overflow = 'visible'; el.style.overflowY = 'auto'; el.style.height = 'auto'; });
    return () => prev.forEach(({ el, overflow, overflowY, height }) => { el.style.overflow = overflow; el.style.overflowY = overflowY; el.style.height = height; });
  }, []);
}

function PasswordScreen({ survey, onUnlock }) {
  useScrollFix();
  const [code, setCode] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault(); setLoading(true);
    setTimeout(() => {
      if (code === survey.accessCode) { onUnlock(); }
      else { setError('Senha incorreta. Tente novamente.'); setCode(''); }
      setLoading(false);
    }, 400);
  };

  return (
    <div style={S.root}>
      <div style={{ ...S.header, position: 'static' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ClipboardList size={22} color="#fff" /></div>
          <div><div style={{ fontSize: '18px', fontWeight: '900' }}>Elaboração de Perguntas</div><div style={{ fontSize: '12px', opacity: 0.85, marginTop: '2px' }}>Acesso restrito — informe a senha</div></div>
        </div>
      </div>
      <div style={S.body}>
        <div style={{ ...S.card, textAlign: 'center' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: `${colors.warning}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Lock size={28} color={colors.warning} /></div>
          <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '6px' }}>{survey.title}</div>
          {survey.description && <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>{survey.description}</div>}
          <div style={{ display: 'inline-block', background: `${colors.warning}15`, border: `1px solid ${colors.warning}40`, borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: '800', color: colors.warning, marginBottom: '20px' }}>✏️ Modo Elaboração de Perguntas</div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <input style={{ ...S.inp, paddingRight: '48px', textAlign: 'center', letterSpacing: show ? '0' : '0.3em', fontSize: '18px' }} type={show ? 'text' : 'password'} placeholder="Senha da campanha" value={code} onChange={e => { setCode(e.target.value); setError(''); }} autoFocus />
              <button type="button" onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            {error && <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `${colors.danger}12`, border: `1px solid ${colors.danger}30`, borderRadius: '10px', padding: '10px 13px', fontSize: '13px', fontWeight: '700', color: colors.danger }}><AlertTriangle size={15} /> {error}</div>}
            <button type="submit" disabled={!code.trim() || loading} style={S.bigBtn(colors.warning, !code.trim() || loading)}>{loading ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> : <><Lock size={18} /> Acessar Editor</>}</button>
          </form>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function QuestionEditor({ q, idx, total, onChange, onRemove, onMoveUp, onMoveDown }) {
  const cfg = QUESTION_TYPES.find(t => t.value === q.type) || QUESTION_TYPES[0];
  const [optInput, setOptInput] = useState('');

  const addOption  = () => { if (!optInput.trim()) return; onChange({ ...q, options: [...(q.options || []), optInput.trim()] }); setOptInput(''); };
  const editOption = (i, v) => { const opts = [...(q.options || [])]; opts[i] = v; onChange({ ...q, options: opts }); };
  const removeOpt  = (i) => onChange({ ...q, options: (q.options || []).filter((_, j) => j !== i) });

  // Múltipla escolha começa sem opções pré-definidas
  const handleTypeChange = (type) => {
    const options = type === 'boolean' ? ['Sim', 'Não'] : type === 'select' ? [] : null;
    onChange({ ...q, type, options });
  };

  return (
    <div style={{ background: 'var(--bg-card)', borderTop: `1px solid ${q.label?.trim() ? cfg.color + '40' : colors.warning + '50'}`, borderRight: `1px solid ${q.label?.trim() ? cfg.color + '40' : colors.warning + '50'}`, borderBottom: `1px solid ${q.label?.trim() ? cfg.color + '40' : colors.warning + '50'}`, borderLeft: `3px solid ${q.label?.trim() ? cfg.color : colors.warning}`, borderRadius: '12px', padding: '14px', display: 'flex', gap: '12px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
        <GripVertical size={15} color="var(--text-muted)" />
        <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', minWidth: '20px', textAlign: 'center' }}>{idx + 1}</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
        {/* Tipo */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {QUESTION_TYPES.map(t => { const Icon = t.icon; const sel = q.type === t.value; return (
            <button key={t.value} onClick={() => handleTypeChange(t.value)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: sel ? `${t.color}20` : 'var(--bg-app)', outline: `1px solid ${sel ? t.color : 'var(--border)'}`, fontSize: '11px', fontWeight: '800', color: sel ? t.color : 'var(--text-muted)', transition: 'all 0.12s' }}>
              <Icon size={11} /> {t.label}
            </button>
          ); })}
        </div>

        {/* Texto */}
        <div>
          <input style={{ ...S.inp, borderColor: q.label?.trim() ? 'var(--border)' : colors.warning + '80' }} placeholder={`Texto da pergunta ${idx + 1}... *`} value={q.label} onChange={e => onChange({ ...q, label: e.target.value })} />
          {!q.label?.trim() && <div style={{ fontSize: '11px', color: colors.warning, fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={11} /> Texto obrigatório</div>}
        </div>

        {/* Múltipla Escolha — todas as opções editáveis e excluíveis */}
        {q.type === 'select' && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Opções de resposta</div>
            {(q.options || []).length === 0 && (
              <div style={{ fontSize: '12px', color: colors.warning, fontWeight: '700', padding: '8px 4px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <AlertTriangle size={12} /> Adicione pelo menos uma opção.
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
              {(q.options || []).map((opt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                  <input style={{ ...S.inp, flex: 1, padding: '9px 12px', fontSize: '13px' }} value={opt} placeholder={`Opção ${i + 1}...`} onChange={e => editOption(i, e.target.value)} />
                  <button onClick={() => removeOpt(i)} title="Remover opção" style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.danger, display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '6px', flexShrink: 0 }}><X size={14} /></button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input style={{ ...S.inp, flex: 1, fontSize: '13px', borderStyle: 'dashed' }} placeholder="Nova opção... (Enter para adicionar)" value={optInput} onChange={e => setOptInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())} />
              <button onClick={addOption} style={{ padding: '9px 14px', borderRadius: '9px', background: `${colors.primary}15`, border: `1px solid ${colors.primary}40`, color: colors.primary, fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}><Plus size={14} /> Add</button>
            </div>
          </div>
        )}

        {/* Preview NPS */}
        {q.type === 'nps' && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Escala de 0 a 10</div>
            <div style={{ display: 'flex', gap: '3px' }}>
              {[0,1,2,3,4,5,6,7,8,9,10].map(n => <div key={n} style={{ flex: 1, height: '28px', borderRadius: '5px', background: n<=3?colors.danger+'30':n<=6?colors.warning+'30':n<=8?colors.primary+'30':colors.success+'30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)' }}>{n}</div>)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}><span>😞 Péssimo</span><span>😍 Excelente</span></div>
          </div>
        )}

        {/* Preview Sim/Não */}
        {q.type === 'boolean' && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {['Sim', 'Não'].map(opt => <div key={opt} style={{ flex: 1, padding: '8px', borderRadius: '8px', background: 'var(--bg-app)', border: '1px solid var(--border)', textAlign: 'center', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' }}>{opt === 'Sim' ? '✅' : '❌'} {opt}</div>)}
          </div>
        )}
      </div>

      {/* Ações */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flexShrink: 0 }}>
        <button onClick={onMoveUp} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer', color: 'var(--text-muted)', opacity: idx === 0 ? 0.2 : 1, fontSize: '14px', padding: '2px', lineHeight: 1 }}>▲</button>
        <button onClick={onMoveDown} disabled={idx === total - 1} style={{ background: 'none', border: 'none', cursor: idx === total - 1 ? 'not-allowed' : 'pointer', color: 'var(--text-muted)', opacity: idx === total - 1 ? 0.2 : 1, fontSize: '14px', padding: '2px', lineHeight: 1 }}>▼</button>
        <button onClick={onRemove} title="Excluir pergunta" style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.danger, display: 'flex', marginTop: '6px', padding: '2px' }}><Trash2 size={15} /></button>
      </div>
    </div>
  );
}

function EditorScreen({ survey, surveyId }) {
  useScrollFix();
  const [questions, setQuestions] = useState(survey.questions || []);
  const [saving,    setSaving]    = useState(false);
  const [done,      setDone]      = useState(false);
  const [error,     setError]     = useState('');

  const allValid = questions.length > 0 &&
    questions.every(q => q.label?.trim() && (q.type !== 'select' || (q.options?.length > 0 && q.options.every(o => o.trim()))));

  // Remove campos undefined que o Firestore rejeita
  const sanitizeQuestions = (qs) =>
    qs.map(({ id, type, label, options }) => ({
      id,
      type,
      label: label ?? '',
      ...(options !== undefined ? { options: options ?? null } : {}),
    }));

  const saveQuestions = async () => {
    setSaving(true); setError('');
    try {
      await updateDoc(doc(db, 'surveys', surveyId), { questions: sanitizeQuestions(questions), updatedAt: serverTimestamp() });
      window.showToast?.('Perguntas salvas!');
    } catch (e) { setError('Erro ao salvar: ' + e.message); }
    setSaving(false);
  };

  const handleConclude = async () => {
    if (!allValid) { setError('Preencha todas as perguntas e suas opções antes de concluir.'); return; }
    setSaving(true); setError('');
    try { await updateDoc(doc(db, 'surveys', surveyId), { questions: sanitizeQuestions(questions), status: 'ready', updatedAt: serverTimestamp() }); setDone(true); }
    catch (e) { setError('Erro ao concluir: ' + e.message); }
    setSaving(false);
  };

  const addQuestion    = () => setQuestions(qs => [...qs, emptyQuestion()]);
  const updateQuestion = (idx, nq) => setQuestions(qs => qs.map((q, i) => i === idx ? nq : q));
  const removeQuestion = (idx) => setQuestions(qs => qs.filter((_, i) => i !== idx));
  const moveQuestion   = (from, to) => { const qs = [...questions]; const [item] = qs.splice(from, 1); qs.splice(to, 0, item); setQuestions(qs); };

  if (done) return (
    <div style={S.root}>
      <div style={{ ...S.header, position: 'static' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle size={22} color="#fff" /></div>
          <div><div style={{ fontSize: '18px', fontWeight: '900' }}>Elaboração Concluída</div><div style={{ fontSize: '12px', opacity: 0.85, marginTop: '2px' }}>{survey.title}</div></div>
        </div>
      </div>
      <div style={S.body}>
        <div style={{ ...S.card, textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: `${colors.success}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}><CheckCircle size={40} color={colors.success} /></div>
          <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '10px' }}>Perguntas entregues!</div>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            As {questions.length} pergunta{questions.length !== 1 ? 's foram' : ' foi'} salva{questions.length !== 1 ? 's' : ''} com sucesso.<br />
            O questionário está marcado como <strong style={{ color: colors.success }}>Pronto</strong> — aguarde a ativação pelo responsável.
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.root}>
      <div style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ClipboardList size={22} color="#fff" /></div>
          <div><div style={{ fontSize: '18px', fontWeight: '900' }}>{survey.title}</div><div style={{ fontSize: '12px', opacity: 0.85, marginTop: '2px' }}>✏️ Elaboração — {questions.length} pergunta{questions.length !== 1 ? 's' : ''}</div></div>
        </div>
      </div>

      <div style={S.body}>
        <div style={{ background: `${colors.warning}10`, borderTop: `1px solid ${colors.warning}30`, borderRight: `1px solid ${colors.warning}30`, borderBottom: `1px solid ${colors.warning}30`, borderLeft: `3px solid ${colors.warning}`, borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.6 }}>
          <strong>Como funciona:</strong> adicione as perguntas abaixo. Ao clicar em <strong>Concluir Elaboração</strong>, as perguntas são salvas e o responsável poderá ativar a pesquisa.
        </div>

        {error && <div style={{ background: `${colors.danger}10`, border: `1px solid ${colors.danger}30`, borderRadius: '10px', padding: '11px 14px', fontSize: '13px', fontWeight: '700', color: colors.danger, display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={15} /> {error}</div>}

        {questions.length === 0 ? (
          <div style={{ ...S.card, textAlign: 'center', padding: '40px', border: `2px dashed ${colors.warning}40`, background: `${colors.warning}06` }}>
            <ClipboardList size={36} style={{ opacity: 0.3, marginBottom: '10px' }} color={colors.warning} />
            <div style={{ fontWeight: '800', fontSize: '14px', color: colors.warning, marginBottom: '4px' }}>Nenhuma pergunta ainda</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Clique em "Adicionar Pergunta" para começar.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {questions.map((q, i) => (
              <QuestionEditor key={q.id} q={q} idx={i} total={questions.length}
                onChange={nq => updateQuestion(i, nq)}
                onRemove={() => removeQuestion(i)}
                onMoveUp={() => moveQuestion(i, i - 1)}
                onMoveDown={() => moveQuestion(i, i + 1)}
              />
            ))}
          </div>
        )}

        <button onClick={addQuestion} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '12px', border: `2px dashed ${colors.primary}40`, background: `${colors.primary}06`, color: colors.primary, fontWeight: '800', fontSize: '14px', cursor: 'pointer', transition: 'all 0.15s' }}>
          <Plus size={18} /> Adicionar Pergunta
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={saveQuestions} disabled={saving || questions.length === 0} style={{ ...S.bigBtn(colors.primary, saving || questions.length === 0), fontSize: '14px', padding: '13px' }}>
            {saving ? <Loader2 size={17} style={{ animation: 'spin 0.8s linear infinite' }} /> : <><Save size={17} /> Salvar Rascunho</>}
          </button>
          <button onClick={handleConclude} disabled={saving || !allValid} style={S.bigBtn(colors.success, saving || !allValid)}>
            {saving ? <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> : <><CheckCircle size={20} /> Concluir Elaboração</>}
          </button>
          {!allValid && questions.length > 0 && <div style={{ textAlign: 'center', fontSize: '12px', color: colors.warning, fontWeight: '700' }}>⚠️ Preencha o texto de todas as perguntas e suas opções para concluir.</div>}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function PublicSurveyEdit({ surveyId }) {
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

  if (loading) return (<div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)' }}><Loader2 size={32} color={colors.warning} style={{ animation: 'spin 0.8s linear infinite' }} /><style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style></div>);
  if (error)   return (<div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)', padding: '20px' }}><div style={{ textAlign: 'center', maxWidth: '320px' }}><AlertTriangle size={44} color={colors.danger} style={{ marginBottom: '14px' }} /><div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '6px' }}>Indisponível</div><div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{error}</div></div></div>);

  if (survey.status === 'active' || survey.status === 'finished') return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)', padding: '20px' }}>
      <div style={{ textAlign: 'center', maxWidth: '340px' }}>
        <div style={{ fontSize: '40px', marginBottom: '14px' }}>🔒</div>
        <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '8px' }}>{survey.title}</div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{survey.status === 'active' ? 'Esta campanha já está ativa. O período de elaboração foi encerrado.' : 'Esta campanha foi encerrada e não está mais disponível para edição.'}</div>
      </div>
    </div>
  );

  if (survey.status === 'ready') return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)', padding: '20px' }}>
      <div style={{ textAlign: 'center', maxWidth: '340px' }}>
        <CheckCircle size={48} color={colors.success} style={{ marginBottom: '14px' }} />
        <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '8px' }}>{survey.title}</div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>As perguntas já foram entregues ({survey.questions?.length || 0} pergunta{survey.questions?.length !== 1 ? 's' : ''}). Aguarde o responsável ativar a pesquisa.</div>
      </div>
    </div>
  );

  if (!unlocked) return <PasswordScreen survey={survey} onUnlock={() => setUnlocked(true)} />;
  return <EditorScreen survey={survey} surveyId={surveyId} />;
}