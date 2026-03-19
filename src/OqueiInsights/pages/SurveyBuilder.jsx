// ============================================================
//  SurveyBuilder.jsx — Oquei Pesquisas  (v3)
//
//  Novidades v3:
//  · Campo "Senha de Acesso" (accessCode) na criação
//  · Links gerados no card:
//      - Link de Edição (draft):  /pesquisa/:id  (senha desbloqueia editor)
//      - Link de Resposta (active): /pesquisa/:id  (senha desbloqueia formulário)
//  · Botão "Copiar Link" no card de cada campanha
// ============================================================
import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import {
  collection, getDocs, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import {
  Plus, Trash2, GripVertical, ToggleLeft, Type, List, Hash,
  ClipboardList, Edit2, X, Save, ChevronDown, ChevronUp,
  AlertTriangle, Lock, Unlock, Info, Copy, Check,
  Link as LinkIcon, Eye, EyeOff,
} from 'lucide-react';
import { Card, Btn, Badge, Modal, colors } from '../../components/ui';
import { styles as global } from '../../styles/globalStyles';

// ── Constantes ────────────────────────────────────────────────
const QUESTION_TYPES = [
  { value: 'boolean', label: 'Sim / Não',        icon: ToggleLeft, color: colors.success },
  { value: 'select',  label: 'Múltipla Escolha', icon: List,       color: colors.primary },
  { value: 'nps',     label: 'Escala NPS 0–10',  icon: Hash,       color: colors.purple  },
  { value: 'text',    label: 'Texto Livre',       icon: Type,       color: colors.warning },
];

const STATUS_COR   = { active: 'success', finished: 'neutral', draft: 'warning' };
const STATUS_LABEL = { active: 'Ativa',   finished: 'Encerrada', draft: 'Rascunho' };
const STATUS_ICON  = { active: '🟢',      finished: '⛔',         draft: '✏️' };

const emptyQuestion = () => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2),
  type: 'boolean', label: '', options: ['Sim', 'Não'],
});

const canActivate = (survey) => {
  if (!survey.questions?.length)
    return { ok: false, reason: 'Adicione pelo menos 1 pergunta para ativar.' };
  const empty = survey.questions.filter(q => !q.label?.trim());
  if (empty.length)
    return { ok: false, reason: 'Todas as perguntas precisam ter texto.' };
  if (!survey.accessCode?.trim())
    return { ok: false, reason: 'Defina uma senha de acesso para ativar.' };
  return { ok: true, reason: '' };
};

// Gera URL pública da campanha
const surveyURL = (id) =>
  `${window.location.origin}/pesquisa/${id}`;

// ── CopyButton ─────────────────────────────────────────────
function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={handleCopy}
      style={{
        display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px',
        borderRadius: '8px', border: `1px solid ${copied ? colors.success + '60' : 'var(--border)'}`,
        background: copied ? `${colors.success}15` : 'var(--bg-app)',
        color: copied ? colors.success : 'var(--text-muted)',
        fontWeight: '800', fontSize: '11px', cursor: 'pointer', transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copiado!' : label}
    </button>
  );
}

// ── QuestionEditor ─────────────────────────────────────────
function QuestionEditor({ q, idx, total, onChange, onRemove, onMoveUp, onMoveDown }) {
  const cfg = QUESTION_TYPES.find(t => t.value === q.type) || QUESTION_TYPES[0];
  const [optInput, setOptInput] = useState('');

  const addOption = () => {
    if (!optInput.trim()) return;
    onChange({ ...q, options: [...(q.options || []), optInput.trim()] });
    setOptInput('');
  };
  const removeOpt = (i) => onChange({ ...q, options: (q.options || []).filter((_, j) => j !== i) });

  const inp = {
    padding: '9px 12px', borderRadius: '9px', border: '1px solid var(--border)',
    outline: 'none', fontSize: '13px', color: 'var(--text-main)',
    background: 'var(--bg-app)', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit',
  };

  return (
    <div style={{
      background: 'var(--bg-app)',
      border: `1px solid ${q.label?.trim() ? cfg.color + '40' : colors.warning + '50'}`,
      borderLeft: `3px solid ${q.label?.trim() ? cfg.color : colors.warning}`,
      borderRadius: '12px', padding: '14px', display: 'flex', gap: '12px',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
        <GripVertical size={15} color="var(--text-muted)" />
        <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', minWidth: '20px', textAlign: 'center' }}>{idx + 1}</div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Tipo */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {QUESTION_TYPES.map(t => {
            const I2  = t.icon;
            const sel = q.type === t.value;
            return (
              <button key={t.value}
                onClick={() => onChange({ ...q, type: t.value, options: t.value === 'select' ? ['Opção 1', 'Opção 2'] : t.value === 'boolean' ? ['Sim', 'Não'] : undefined })}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: sel ? `${t.color}20` : 'var(--bg-panel)', outline: `1px solid ${sel ? t.color : 'var(--border)'}`, fontSize: '11px', fontWeight: '800', color: sel ? t.color : 'var(--text-muted)', transition: 'all 0.12s' }}>
                <I2 size={11} /> {t.label}
              </button>
            );
          })}
        </div>
        {/* Texto */}
        <div>
          <input
            style={{ ...inp, borderColor: q.label?.trim() ? 'var(--border)' : colors.warning + '80' }}
            placeholder={`Texto da pergunta ${idx + 1}... *`}
            value={q.label}
            onChange={e => onChange({ ...q, label: e.target.value })}
          />
          {!q.label?.trim() && (
            <div style={{ fontSize: '11px', color: colors.warning, fontWeight: '700', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertTriangle size={11} /> Campo obrigatório para ativar
            </div>
          )}
        </div>
        {/* Opções select */}
        {q.type === 'select' && (
          <div>
            <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>Opções</div>
            {(q.options || []).map((opt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                <div style={{ flex: 1, ...inp, padding: '7px 11px', fontSize: '12px' }}>{opt}</div>
                <button onClick={() => removeOpt(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.danger, display: 'flex' }}><X size={13} /></button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <input style={{ ...inp, flex: 1, fontSize: '12px' }} placeholder="Nova opção... (Enter para adicionar)" value={optInput} onChange={e => setOptInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())} />
              <button onClick={addOption} style={{ padding: '7px 13px', borderRadius: '9px', background: `${colors.primary}15`, border: `1px solid ${colors.primary}40`, color: colors.primary, fontWeight: '800', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Plus size={14} /></button>
            </div>
          </div>
        )}
        {/* Preview NPS */}
        {q.type === 'nps' && (
          <div style={{ display: 'flex', gap: '3px', opacity: 0.5 }}>
            {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
              <div key={n} style={{ flex: 1, height: '22px', borderRadius: '4px', background: n<=3?colors.danger+'40':n<=6?colors.warning+'40':n<=8?colors.primary+'40':colors.success+'40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: '900', color: 'var(--text-muted)' }}>{n}</div>
            ))}
          </div>
        )}
      </div>
      {/* Ações */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flexShrink: 0 }}>
        <button onClick={onMoveUp}   disabled={idx === 0}       style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer', color: 'var(--text-muted)', opacity: idx === 0 ? 0.25 : 1, fontSize: '13px', padding: '2px' }}>▲</button>
        <button onClick={onMoveDown} disabled={idx === total - 1} style={{ background: 'none', border: 'none', cursor: idx === total - 1 ? 'not-allowed' : 'pointer', color: 'var(--text-muted)', opacity: idx === total - 1 ? 0.25 : 1, fontSize: '13px', padding: '2px' }}>▼</button>
        <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.danger, display: 'flex', marginTop: '4px' }}><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

// ── SurveyCard ─────────────────────────────────────────────
function SurveyCard({ survey, onEdit, onDelete, onToggleStatus, onAddQuestion, onUpdateQuestion, onRemoveQuestion, onMoveQuestion }) {
  const [expanded, setExpanded] = useState(false);
  const activation = canActivate(survey);
  const isDraft    = survey.status === 'draft';
  const isActive   = survey.status === 'active';
  const isFinished = survey.status === 'finished';

  const url = surveyURL(survey.id);

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${isActive ? colors.success + '50' : isDraft ? colors.warning + '30' : 'var(--border)'}`,
      borderTop: `3px solid ${isActive ? colors.success : isDraft ? colors.warning : colors.neutral}`,
      borderRadius: '16px', boxShadow: 'var(--shadow-sm)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Cabeçalho */}
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '900', fontSize: '15px', color: 'var(--text-main)' }}>
              {STATUS_ICON[survey.status]} {survey.title}
            </div>
            {survey.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>{survey.description}</div>}
          </div>
          <Badge cor={STATUS_COR[survey.status] || 'neutral'}>{STATUS_LABEL[survey.status] || survey.status}</Badge>
        </div>

        {/* Métricas */}
        <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', flexWrap: 'wrap' }}>
          <span style={{ color: !survey.questions?.length ? colors.warning : 'var(--text-muted)' }}>
            📋 {survey.questions?.length || 0} pergunta{survey.questions?.length !== 1 ? 's' : ''}
          </span>
          {survey.targetCities?.length > 0 && <span>📍 {survey.targetCities.length} cidade{survey.targetCities.length !== 1 ? 's' : ''}</span>}
          <span style={{ color: survey.accessCode ? colors.success : colors.warning }}>
            {survey.accessCode ? '🔐 Senha definida' : '⚠ Sem senha'}
          </span>
        </div>

        {/* Links da campanha */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <LinkIcon size={11} /> Links da Campanha
          </div>

          {/* Link de resposta (sempre visível) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'var(--bg-panel)', borderRadius: '6px', padding: '5px 8px', fontFamily: 'monospace' }}>
              {url}
            </div>
            <CopyButton text={url} label={isActive ? 'Copiar Link Pesquisa' : 'Copiar Link'} />
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {isActive
              ? '✅ Pesquisadores acessam este link + senha para responder'
              : isDraft
                ? '✏️ Compartilhe este link + senha para edição colaborativa das perguntas'
                : '⛔ Campanha encerrada — link desativado'
            }
          </div>
        </div>

        {/* Alerta de bloqueio de ativação */}
        {isDraft && !activation.ok && (survey.questions?.length > 0 || survey.accessCode) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `${colors.warning}12`, border: `1px solid ${colors.warning}30`, borderRadius: '9px', padding: '8px 12px', fontSize: '12px', fontWeight: '700', color: colors.warning }}>
            <AlertTriangle size={13} /> {activation.reason}
          </div>
        )}

        {/* Ações */}
        <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
          {!isFinished && (
            <button onClick={() => setExpanded(e => !e)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 13px', borderRadius: '9px', border: '1px solid var(--border)', background: expanded ? 'var(--bg-panel)' : 'transparent', color: 'var(--text-muted)', fontWeight: '800', fontSize: '12px', cursor: 'pointer', flex: 1, justifyContent: 'center' }}>
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {expanded ? 'Fechar Editor' : 'Editar Perguntas'}
            </button>
          )}
          <button onClick={() => onEdit(survey)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 13px', borderRadius: '9px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}>
            <Edit2 size={12} /> Info
          </button>
          {!isFinished && (
            <button
              onClick={() => onToggleStatus(survey)}
              disabled={isDraft && !activation.ok}
              title={isDraft && !activation.ok ? activation.reason : ''}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 13px',
                borderRadius: '9px', border: 'none', fontWeight: '900', fontSize: '12px',
                cursor: isDraft && !activation.ok ? 'not-allowed' : 'pointer',
                flex: 1, justifyContent: 'center',
                background: isDraft ? (activation.ok ? `${colors.success}20` : 'var(--bg-app)') : `${colors.danger}15`,
                color: isDraft ? (activation.ok ? colors.success : 'var(--text-muted)') : colors.danger,
                outline: `1px solid ${isDraft ? (activation.ok ? colors.success + '60' : 'var(--border)') : colors.danger + '40'}`,
                opacity: isDraft && !activation.ok ? 0.5 : 1, transition: 'all 0.12s',
              }}>
              {isDraft
                ? (activation.ok ? <><Unlock size={12} /> Ativar Campanha</> : <><Lock size={12} /> Ativar</>)
                : <><span>⛔</span> Encerrar</>
              }
            </button>
          )}
          <button onClick={() => onDelete(survey.id)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 10px', borderRadius: '9px', border: `1px solid ${colors.danger}30`, background: `${colors.danger}10`, color: colors.danger, fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Editor de perguntas expandível */}
      {expanded && !isFinished && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-app)', borderRadius: '0 0 13px 13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Perguntas ({survey.questions?.length || 0})
            </div>
            <button onClick={() => onAddQuestion(survey)}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '8px', background: `${colors.primary}15`, border: `1px solid ${colors.primary}40`, color: colors.primary, fontWeight: '800', fontSize: '11px', cursor: 'pointer' }}>
              <Plus size={12} /> Adicionar Pergunta
            </button>
          </div>
          {(!survey.questions || !survey.questions.length) ? (
            <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)', border: `2px dashed ${colors.warning}40`, borderRadius: '12px', background: `${colors.warning}06` }}>
              <ClipboardList size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '4px', color: colors.warning }}>Nenhuma pergunta ainda</div>
              <div style={{ fontSize: '12px' }}>Adicione perguntas para poder ativar esta campanha.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {survey.questions.map((q, i) => (
                <QuestionEditor key={q.id} q={q} idx={i} total={survey.questions.length}
                  onChange={nq => onUpdateQuestion(survey, i, nq)}
                  onRemove={() => onRemoveQuestion(survey, i)}
                  onMoveUp={() => onMoveQuestion(survey, i, i - 1)}
                  onMoveDown={() => onMoveQuestion(survey, i, i + 1)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function SurveyBuilder({ userData }) {
  const [surveys,   setSurveys]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [cities,    setCities]    = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId,    setEditId]    = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [showPass,  setShowPass]  = useState(false);

  const [form, setForm] = useState({ title: '', description: '', targetCities: [], accessCode: '' });

  useEffect(() => {
    const load = async () => {
      try {
        const [sSnap, cSnap] = await Promise.all([
          getDocs(collection(db, 'surveys')),
          getDocs(collection(db, 'cities')),
        ]);
        setSurveys(
          sSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        );
        setCities(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const persistSurvey = async (id, data) => {
    await updateDoc(doc(db, 'surveys', id), { ...data, updatedAt: serverTimestamp() });
    setSurveys(s => s.map(x => x.id === id ? { ...x, ...data } : x));
  };

  const openNew = () => {
    setEditId(null);
    setForm({ title: '', description: '', targetCities: [], accessCode: '' });
    setShowPass(false);
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditId(s.id);
    setForm({ title: s.title, description: s.description || '', targetCities: s.targetCities || [], accessCode: s.accessCode || '' });
    setShowPass(false);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { window.showToast?.('Informe o título da campanha.', 'error'); return; }
    setSaving(true);
    try {
      if (editId) {
        await persistSurvey(editId, { title: form.title, description: form.description, targetCities: form.targetCities, accessCode: form.accessCode });
        window.showToast?.('Campanha atualizada!', 'success');
      } else {
        const payload = {
          title: form.title, description: form.description,
          targetCities: form.targetCities, accessCode: form.accessCode,
          status: 'draft', questions: [],
          createdAt: serverTimestamp(), createdBy: auth.currentUser?.uid,
        };
        const ref = await addDoc(collection(db, 'surveys'), payload);
        setSurveys(s => [{ id: ref.id, ...payload }, ...s]);
        window.showToast?.('Campanha criada como Rascunho!', 'success');
      }
      setModalOpen(false);
    } catch (e) { window.showToast?.(e.message, 'error'); }
    setSaving(false);
  };

  const handleToggleStatus = async (survey) => {
    if (survey.status === 'draft') {
      const check = canActivate(survey);
      if (!check.ok) { window.showToast?.(check.reason, 'error'); return; }
      await persistSurvey(survey.id, { status: 'active' });
      window.showToast?.('Campanha ativada! Pesquisadores já podem responder via link.', 'success');
    } else if (survey.status === 'active') {
      if (!window.confirm('Encerrar esta campanha? Pesquisadores não poderão mais enviar respostas.')) return;
      await persistSurvey(survey.id, { status: 'finished' });
      window.showToast?.('Campanha encerrada.', 'success');
    }
  };

  const handleAddQuestion    = async (s) => persistSurvey(s.id, { questions: [...(s.questions || []), emptyQuestion()] });
  const handleUpdateQuestion = async (s, idx, nq) => persistSurvey(s.id, { questions: s.questions.map((q, i) => i === idx ? nq : q) });
  const handleRemoveQuestion = async (s, idx) => {
    const questions = s.questions.filter((_, i) => i !== idx);
    if (s.status === 'active' && !canActivate({ ...s, questions }).ok) {
      await persistSurvey(s.id, { questions, status: 'draft' });
      window.showToast?.('Campanha voltou para Rascunho pois ficou sem perguntas válidas.', 'warning');
    } else {
      await persistSurvey(s.id, { questions });
    }
  };
  const handleMoveQuestion   = async (s, from, to) => {
    const qs = [...s.questions]; const [item] = qs.splice(from, 1); qs.splice(to, 0, item);
    await persistSurvey(s.id, { questions: qs });
  };
  const handleDelete         = async (id) => {
    if (!window.confirm('Excluir esta campanha permanentemente?')) return;
    try { await deleteDoc(doc(db, 'surveys', id)); setSurveys(s => s.filter(x => x.id !== id)); window.showToast?.('Excluída.', 'success'); } catch {}
  };

  const toggleCity = (id) => setForm(f => ({ ...f, targetCities: f.targetCities.includes(id) ? f.targetCities.filter(c => c !== id) : [...f.targetCities, id] }));

  const counts = surveys.reduce((acc, s) => { acc[s.status] = (acc[s.status] || 0) + 1; return acc; }, {});
  const inp = { padding: '10px 12px', borderRadius: '9px', border: '1px solid var(--border)', outline: 'none', fontSize: '13px', color: 'var(--text-main)', background: 'var(--bg-app)', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
  const lbl = { fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block' };

  return (
    <div style={{ ...global.container }}>

      {/* Cabeçalho */}
      <div style={{ background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-panel) 100%)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: `linear-gradient(135deg, ${colors.primary}, ${colors.purple})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 18px ${colors.primary}44` }}>
            <ClipboardList size={24} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '21px', fontWeight: '900', color: 'var(--text-main)' }}>Criador de Pesquisas</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Crie campanhas, defina perguntas e compartilhe os links
            </div>
          </div>
        </div>
        <Btn onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={15} /> Nova Campanha
        </Btn>
      </div>

      {/* Contadores por status */}
      {surveys.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[{ key: 'active', label: 'Ativas', color: colors.success }, { key: 'draft', label: 'Rascunhos', color: colors.warning }, { key: 'finished', label: 'Encerradas', color: colors.neutral }].map(({ key, label, color }) => counts[key] ? (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'var(--bg-card)', border: `1px solid ${color}30`, borderRadius: '10px', padding: '7px 14px', fontSize: '12px', fontWeight: '800' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
              <span style={{ color }}>{counts[key]}</span>
              <span style={{ color: 'var(--text-muted)' }}>{label}</span>
            </div>
          ) : null)}
        </div>
      )}

      {/* Info do fluxo */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: `${colors.info}10`, border: `1px solid ${colors.info}30`, borderRadius: '12px', padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
        <Info size={14} color={colors.info} style={{ flexShrink: 0, marginTop: '1px' }} />
        <span>
          <strong style={{ color: 'var(--text-main)' }}>Fluxo:</strong>
          {' '}Crie a campanha com senha → Adicione perguntas → Ative → Compartilhe o link com os pesquisadores.
          O link de <strong>Rascunho</strong> permite edição colaborativa de perguntas.
          O link <strong>Ativo</strong> permite que pesquisadores respondam (sem login, apenas nome + senha).
        </span>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Carregando campanhas...</div>
      ) : surveys.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <ClipboardList size={44} style={{ opacity: 0.2, marginBottom: '14px' }} />
            <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '6px', color: 'var(--text-main)' }}>Nenhuma campanha criada</div>
            <div style={{ fontSize: '13px', marginBottom: '18px' }}>Crie a primeira pesquisa. Você define a senha na criação.</div>
            <Btn onClick={openNew}><Plus size={14} /> Criar Primeira Campanha</Btn>
          </div>
        </Card>
      ) : (
        ['active', 'draft', 'finished'].map(status => {
          const group = surveys.filter(s => s.status === status);
          if (!group.length) return null;
          return (
            <div key={status}>
              <div style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: status === 'active' ? colors.success : status === 'draft' ? colors.warning : colors.neutral }} />
                {STATUS_LABEL[status]} ({group.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {group.map(s => (
                  <SurveyCard key={s.id} survey={s}
                    onEdit={openEdit} onDelete={handleDelete}
                    onToggleStatus={handleToggleStatus}
                    onAddQuestion={handleAddQuestion}
                    onUpdateQuestion={handleUpdateQuestion}
                    onRemoveQuestion={handleRemoveQuestion}
                    onMoveQuestion={handleMoveQuestion}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Modal criação/edição */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editId ? 'Editar Informações da Campanha' : 'Nova Campanha de Pesquisa'}
        size="md"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
            {!editId && <div style={{ flex: 1, fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>💡 Criada como Rascunho. Adicione perguntas e ative depois.</div>}
            <Btn variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Btn>
            <Btn loading={saving} onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Save size={14} /> {editId ? 'Salvar' : 'Criar Rascunho'}
            </Btn>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={lbl}>Título da Pesquisa *</label>
            <input style={inp} placeholder="Ex: Pesquisa de Satisfação — Agosto 2025" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus />
          </div>
          <div>
            <label style={lbl}>Descrição (opcional)</label>
            <input style={inp} placeholder="Objetivo ou instruções da pesquisa..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          {/* Senha de acesso */}
          <div>
            <label style={lbl}>Senha de Acesso *</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inp, paddingRight: '44px' }}
                type={showPass ? 'text' : 'password'}
                placeholder="Defina uma senha para o link da campanha"
                value={form.accessCode}
                onChange={e => setForm({ ...form, accessCode: e.target.value })}
              />
              <button type="button" onClick={() => setShowPass(s => !s)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px', fontWeight: '600' }}>
              Quem acessar o link da campanha precisará digitar esta senha. Obrigatório para ativar.
            </div>
          </div>

          {/* Cidades alvo */}
          {cities.length > 0 && (
            <div>
              <label style={lbl}>Cidades Alvo (opcional)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {cities.map(c => {
                  const sel = form.targetCities.includes(c.id);
                  return (
                    <button key={c.id} onClick={() => toggleCity(c.id)}
                      style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: '11px', background: sel ? `${colors.primary}20` : 'var(--bg-app)', color: sel ? colors.primary : 'var(--text-muted)', outline: `1px solid ${sel ? colors.primary : 'var(--border)'}`, transition: 'all 0.12s' }}>
                      {sel ? '✓ ' : ''}{c.name || c.nome || c.id}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}