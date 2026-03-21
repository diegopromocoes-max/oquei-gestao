// ============================================================
//  SurveyBuilder.jsx — Oquei Pesquisas  (v3)
//
//  Novidades v3:

//  · Links gerados no card:
//      - Link de Edição (draft):  /pesquisa/:id  (senha desbloqueia editor)
//      - Link de Resposta (active): /pesquisa/:id  (senha desbloqueia formulário)
//  · Botão "Copiar Link" no card de cada campanha
// ============================================================
import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import {
  collection, getDocs, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp, query, where, writeBatch,
} from 'firebase/firestore';
import {
  Plus, Trash2, GripVertical, ToggleLeft, Type, List, Hash,
  ClipboardList, Edit2, X, Save, ChevronDown, ChevronUp,
  AlertTriangle, Lock, Unlock, Info, Copy, Check,
  Link as LinkIcon, Eye, EyeOff, Users, Phone, Target, ExternalLink,
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
const STATUS_LABEL = { active: 'Ativa', finished: 'Encerrada', draft: 'Rascunho' };
const STATUS_ICON  = { active: '🟢', finished: '⛔', draft: '✏️' };

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
  return { ok: true, reason: '' };
};

// URL do link de aplicação da pesquisa (só quando ativa)
const surveyURL = (id) =>
  `${window.location.origin}/pesquisa/${id}`;

// URL do link personalizado de entrevistador
const entrevistadorURL = (surveyId, entrevistadorId) =>
  `${window.location.origin}/pesquisa/${surveyId}/entrevistador/${entrevistadorId}`;

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
                onClick={() => onChange({ ...q, type: t.value, options: t.value === 'select' ? [] : t.value === 'boolean' ? ['Sim', 'Não'] : null })}
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
            {(q.options || []).length === 0 && (
              <div style={{ fontSize: '12px', color: colors.warning, fontWeight: '700', padding: '6px 0', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <AlertTriangle size={12} /> Adicione pelo menos uma opção.
              </div>
            )}
            {(q.options || []).map((opt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                <input
                  style={{ flex: 1, ...inp, padding: '7px 11px', fontSize: '12px' }}
                  value={opt}
                  placeholder={`Opção ${i + 1}...`}
                  onChange={e => {
                    const opts = [...(q.options || [])];
                    opts[i] = e.target.value;
                    onChange({ ...q, options: opts });
                  }}
                />
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


// ── EntrevistadoresSection ──────────────────────────────────
// Seção dentro do card de campanha ATIVA para gerenciar
// entrevistadores e seus links personalizados.
function EntrevistadoresSection({ survey }) {
  const [lista,    setLista]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [form,     setForm]     = useState({ nome: '', telefone: '', meta: '' });
  const [saving,   setSaving]   = useState(false);

  const inp = { padding: '9px 12px', borderRadius: '9px', border: '1px solid var(--border)', outline: 'none', fontSize: '13px', color: 'var(--text-main)', background: 'var(--bg-app)', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };

  useEffect(() => {
    if (!expanded) return;
    loadEntrevistadores();
  }, [expanded]);

  const loadEntrevistadores = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'survey_entrevistadores'), where('surveyId', '==', survey.id)));
      setLista(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {}
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.nome.trim()) { window.showToast?.('Informe o nome.', 'error'); return; }
    setSaving(true);
    try {
      const ref = await addDoc(collection(db, 'survey_entrevistadores'), {
        surveyId:  survey.id,
        nome:      form.nome.trim(),
        telefone:  form.telefone.trim() || null,
        meta:      parseInt(form.meta) || 0,
        createdAt: serverTimestamp(),
      });
      setLista(l => [...l, { id: ref.id, surveyId: survey.id, nome: form.nome.trim(), telefone: form.telefone.trim() || null, meta: parseInt(form.meta) || 0 }]);
      setForm({ nome: '', telefone: '', meta: '' });
      window.showToast?.('Entrevistador adicionado!');
    } catch (e) { window.showToast?.(e.message, 'error'); }
    setSaving(false);
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Remover este entrevistador?')) return;
    try {
      await deleteDoc(doc(db, 'survey_entrevistadores', id));
      setLista(l => l.filter(x => x.id !== id));
      window.showToast?.('Removido.', 'success');
    } catch {}
  };

  return (
    <div style={{ borderTop: '1px solid var(--border)' }}>
      <button onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', background: `${colors.success}08`, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: '900', color: colors.success }}>
          <Users size={14} /> Entrevistadores & Links Pessoais
          {lista.length > 0 && !loading && <span style={{ background: `${colors.success}20`, borderRadius: '20px', padding: '1px 8px' }}>{lista.length}</span>}
        </div>
        {expanded ? <ChevronUp size={14} color={colors.success} /> : <ChevronDown size={14} color={colors.success} />}
      </button>

      {expanded && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px', background: `${colors.success}04` }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Cada entrevistador recebe um link único que identifica automaticamente quem está aplicando as pesquisas.
          </div>

          {/* Formulário de adição */}
          <div style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '14px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Novo Entrevistador</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
              <input style={inp} placeholder="Nome completo *" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} />
              <input style={inp} placeholder="Telefone" value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} type="tel" />
              <input style={inp} placeholder="Meta (nº)" value={form.meta} onChange={e => setForm({...form, meta: e.target.value})} type="number" min="0" />
            </div>
            <button onClick={handleAdd} disabled={saving || !form.nome.trim()}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 16px', borderRadius: '8px', background: saving || !form.nome.trim() ? 'var(--bg-app)' : `${colors.success}20`, border: `1px solid ${colors.success}40`, color: colors.success, fontWeight: '800', fontSize: '12px', cursor: saving || !form.nome.trim() ? 'not-allowed' : 'pointer', opacity: saving || !form.nome.trim() ? 0.5 : 1 }}>
              <Plus size={13} /> Adicionar
            </button>
          </div>

          {/* Lista */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>Carregando...</div>
          ) : lista.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>Nenhum entrevistador cadastrado.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {lista.map(e => {
                const url = entrevistadorURL(survey.id, e.id);
                return (
                  <div key={e.id} style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '12px 14px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div>
                        <div style={{ fontWeight: '800', fontSize: '13px', color: 'var(--text-main)' }}>{e.nome}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '10px' }}>
                          {e.telefone && <span>📱 {e.telefone}</span>}
                          {e.meta > 0 && <span><Target size={10} style={{ display: 'inline', marginRight: '3px' }} />Meta: {e.meta}</span>}
                        </div>
                      </div>
                      <button onClick={() => handleRemove(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.danger, display: 'flex', padding: '4px' }}><Trash2 size={13} /></button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-app)', borderRadius: '7px', padding: '6px 10px' }}>
                      <div style={{ flex: 1, fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</div>
                      <CopyButton text={url} label="Copiar" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── SurveyCard ─────────────────────────────────────────────
function SurveyCard({ survey, onEdit, onDelete, onToggleStatus, onAddQuestion, onUpdateQuestion, onRemoveQuestion, onMoveQuestion, onEntrevistadores }) {
  const [expanded, setExpanded] = useState(false);
  const activation = canActivate(survey);
  const isDraft    = survey.status === 'draft';
  const isActive   = survey.status === 'active';
  const isFinished = survey.status === 'finished';

  const urlApp    = surveyURL(survey.id);
  const canApply  = isActive;

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

        </div>

        {/* Link de aplicação da pesquisa */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', background: canApply ? `${colors.success}08` : 'var(--bg-panel)', border: `1px solid ${canApply ? colors.success + '30' : 'var(--border)'}`, borderRadius: '10px', padding: '10px 14px', opacity: canApply ? 1 : 0.7 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: '900', color: canApply ? colors.success : 'var(--text-muted)' }}>
              <LinkIcon size={11} /> Link de Aplicação da Pesquisa
            </div>
            {canApply
              ? <CopyButton text={urlApp} label="Copiar Link" />
              : <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', background: 'var(--bg-panel)', padding: '3px 8px', borderRadius: '6px' }}>
                  {isFinished ? 'Encerrado' : 'Disponível ao ativar'}
                </span>
            }
          </div>
          {canApply && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: 'var(--bg-panel)', borderRadius: '5px', padding: '4px 8px' }}>
              {urlApp}
            </div>
          )}
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {canApply ? '✅ Entrevistadores acessam este link para responder' : isFinished ? '⛔ Campanha encerrada' : '⏳ Disponível após ativar a campanha'}
          </div>
        </div>

        {/* Alerta de bloqueio de ativação */}
        {isDraft && !activation.ok && survey.questions?.length > 0 && (
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
              {expanded ? 'Fechar' : 'Editar Perguntas'}
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
                background: isActive ? `${colors.danger}15` : activation.ok ? `${colors.success}20` : 'var(--bg-app)',
                color:      isActive ? colors.danger : activation.ok ? colors.success : 'var(--text-muted)',
                outline: `1px solid ${isActive ? colors.danger + '40' : activation.ok ? colors.success + '60' : 'var(--border)'}`,
                opacity: isDraft && !activation.ok ? 0.5 : 1, transition: 'all 0.12s',
              }}>
              {isActive
                ? <><span>⛔</span> Encerrar</>
                : activation.ok
                  ? <><Unlock size={12} /> Ativar Campanha</>
                  : <><Lock size={12} /> Ativar</>
              }
            </button>
          )}
          <button onClick={() => onDelete(survey.id)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '7px 10px', borderRadius: '9px', border: `1px solid ${colors.danger}30`, background: `${colors.danger}10`, color: colors.danger, fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Seção de Entrevistadores — só quando ativa */}
      {isActive && <EntrevistadoresSection survey={survey} onEntrevistadores={onEntrevistadores} />}

      {/* Editor de perguntas expandível */}
      {expanded && !isFinished && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-app)', borderRadius: '0 0 13px 13px' }}>
          {/* Cabeçalho só com contador */}
          <div style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Perguntas ({survey.questions?.length || 0})
          </div>

          {(!survey.questions || !survey.questions.length) ? (
            <div style={{ textAlign: 'center', padding: '28px', color: 'var(--text-muted)', border: `2px dashed ${colors.warning}40`, borderRadius: '12px', background: `${colors.warning}06` }}>
              <ClipboardList size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <div style={{ fontWeight: '800', fontSize: '13px', marginBottom: '4px', color: colors.warning }}>Nenhuma pergunta ainda</div>
              <div style={{ fontSize: '12px' }}>Clique em "Adicionar Pergunta" abaixo para começar.</div>
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

          {/* Botão sempre abaixo da última pergunta */}
          <button onClick={() => onAddQuestion(survey)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '11px', borderRadius: '10px', border: `2px dashed ${colors.primary}40`, background: `${colors.primary}08`, color: colors.primary, fontWeight: '800', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s' }}>
            <Plus size={14} /> Adicionar Pergunta
          </button>
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

  const [form, setForm] = useState({ title: '', description: '', targetCities: [] });

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

  const sanitizeQuestions = (qs) =>
    (qs || []).map(({ id, type, label, options }) => ({
      id, type, label: label ?? '',
      ...(options !== undefined ? { options: options ?? null } : {}),
    }));

  const persistSurvey = async (id, data) => {
    const clean = data.questions !== undefined
      ? { ...data, questions: sanitizeQuestions(data.questions) }
      : data;
    await updateDoc(doc(db, 'surveys', id), { ...clean, updatedAt: serverTimestamp() });
    setSurveys(s => s.map(x => x.id === id ? { ...x, ...data } : x));
  };

  const openNew = () => {
    setEditId(null);
    setForm({ title: '', description: '', targetCities: [] });
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditId(s.id);
    setForm({ title: s.title, description: s.description || '', targetCities: s.targetCities || [] });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { window.showToast?.('Informe o título da campanha.', 'error'); return; }
    setSaving(true);
    try {
      if (editId) {
        await persistSurvey(editId, { title: form.title, description: form.description, targetCities: form.targetCities });
        window.showToast?.('Campanha atualizada!', 'success');
      } else {
        const payload = {
          title: form.title, description: form.description,
          targetCities: form.targetCities,
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
  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta campanha permanentemente? As respostas vinculadas também serão removidas.')) return;
    try {
      const batch = writeBatch(db);

      // Exclui respostas vinculadas
      const qResp = query(collection(db, 'survey_responses'), where('surveyId', '==', id));
      const snapResp = await getDocs(qResp);
      snapResp.docs.forEach(d => batch.delete(d.ref));

      // Exclui a campanha
      batch.delete(doc(db, 'surveys', id));

      await batch.commit();
      setSurveys(s => s.filter(x => x.id !== id));
      window.showToast?.('Campanha e respostas excluídas.', 'success');
    } catch (e) { window.showToast?.(e.message, 'error'); }
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
          {' '}Crie a campanha → Adicione perguntas pelo painel interno → Ative → Compartilhe o link com os entrevistadores.
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
            <div style={{ fontSize: '13px', marginBottom: '18px' }}>Crie a primeira campanha, adicione as perguntas e ative.</div>
            <Btn onClick={openNew}><Plus size={14} /> Criar Primeira Campanha</Btn>
          </div>
        </Card>
      ) : (
        <>
          {['active', 'draft', 'finished'].map(status => {
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
                      onEntrevistadores={() => {}}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Campanhas com status desconhecido — órfãs de versões anteriores */}
          {(() => {
            const conhecidos = new Set(['active', 'draft', 'finished']);
            const orfas = surveys.filter(s => !conhecidos.has(s.status));
            if (!orfas.length) return null;
            return (
              <div>
                <div style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.neutral }} />
                  Outros ({orfas.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {orfas.map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 18px', boxShadow: 'var(--shadow-sm)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title || '(sem título)'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', gap: '10px' }}>
                          <span>Status: <code style={{ background: 'var(--bg-app)', padding: '1px 6px', borderRadius: '4px', fontSize: '11px' }}>{s.status || 'indefinido'}</code></span>
                          <span>{s.questions?.length || 0} pergunta{s.questions?.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(s.id)}
                        title="Excluir campanha"
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', border: `1px solid ${colors.danger}30`, background: `${colors.danger}10`, color: colors.danger, fontWeight: '800', fontSize: '12px', cursor: 'pointer', flexShrink: 0 }}>
                        <Trash2 size={13} /> Excluir
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </>
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