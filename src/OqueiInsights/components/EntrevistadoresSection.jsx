import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { ChevronDown, ChevronUp, Plus, Search, Target, Trash2, Users } from 'lucide-react';
import { db } from '../../firebase';
import { colors } from '../../components/ui';
import CopyButton from './CopyButton';
import { entrevistadorURL } from '../lib/surveyQuestions';

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const normalizePhone = (value) => String(value || '').replace(/\D/g, '');

const getInterviewerKey = (item) => {
  const phone = normalizePhone(item?.telefone);
  if (phone) return `phone:${phone}`;

  const name = normalizeText(item?.nome);
  if (name) return `name:${name}`;

  return '';
};

const getCreatedAtValue = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
};

const getRecordScore = (item) => {
  let score = 0;
  if (String(item?.nome || '').trim()) score += 3;
  if (normalizePhone(item?.telefone)) score += 2;
  if (Number(item?.meta) > 0) score += 1;
  return score;
};

const mergeLibraryRecord = (current, candidate) => {
  const currentScore = getRecordScore(current);
  const candidateScore = getRecordScore(candidate);
  const preferred =
    candidateScore > currentScore || (candidateScore === currentScore && candidate.createdAtValue > current.createdAtValue)
      ? candidate
      : current;

  return {
    ...preferred,
    useCount: (current.useCount || 1) + 1,
    createdAtValue: Math.max(current.createdAtValue || 0, candidate.createdAtValue || 0),
  };
};

const buildLibrary = (items, surveyId) => {
  const libraryMap = new Map();

  items.forEach((item) => {
    if (item?.surveyId === surveyId) return;
    if (!String(item?.nome || '').trim()) return;

    const normalized = {
      id: item.id,
      surveyId: item.surveyId || '',
      nome: String(item.nome || '').trim(),
      telefone: String(item.telefone || '').trim(),
      meta: Number.parseInt(item.meta, 10) || 0,
      createdAtValue: getCreatedAtValue(item.createdAt),
      useCount: 1,
    };

    const key = getInterviewerKey(normalized);
    if (!key) return;

    const existing = libraryMap.get(key);
    libraryMap.set(key, existing ? mergeLibraryRecord(existing, normalized) : normalized);
  });

  return Array.from(libraryMap.values()).sort((a, b) =>
    (b.createdAtValue || 0) - (a.createdAtValue || 0) || a.nome.localeCompare(b.nome, 'pt-BR'),
  );
};

const isSameInterviewer = (left, right) => {
  const leftPhone = normalizePhone(left?.telefone);
  const rightPhone = normalizePhone(right?.telefone);

  if (leftPhone && rightPhone) return leftPhone === rightPhone;
  return normalizeText(left?.nome) === normalizeText(right?.nome);
};

const buildSearchText = (item) =>
  [normalizeText(item?.nome), normalizePhone(item?.telefone), String(item?.meta ?? '').trim()].filter(Boolean).join(' ');

export default function EntrevistadoresSection({ survey }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [list, setList] = useState([]);
  const [library, setLibrary] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ nome: '', telefone: '', meta: '' });

  const filteredLibrary = useMemo(() => {
    const term = normalizeText(search);
    const phoneTerm = normalizePhone(search);
    const available = library.filter((item) => !list.some((current) => isSameInterviewer(current, item)));

    if (!term && !phoneTerm) return available.slice(0, 5);
    return available
      .filter((item) => {
        const textMatch = term ? buildSearchText(item).includes(term) : false;
        const phoneMatch = phoneTerm ? normalizePhone(item.telefone).includes(phoneTerm) : false;
        return textMatch || phoneMatch;
      })
      .slice(0, 6);
  }, [library, list, search]);

  useEffect(() => {
    if (!expanded) return;
    const load = async () => {
      setLoading(true);
      setLibraryLoading(true);
      try {
        const [currentSnapshot, allSnapshot] = await Promise.all([
          getDocs(
            query(collection(db, 'survey_entrevistadores'), where('surveyId', '==', survey.id)),
          ),
          getDocs(collection(db, 'survey_entrevistadores')),
        ]);

        setList(currentSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        setLibrary(buildLibrary(allSnapshot.docs.map((item) => ({ id: item.id, ...item.data() })), survey.id));
      } finally {
        setLoading(false);
        setLibraryLoading(false);
      }
    };
    load();
  }, [expanded, survey.id]);

  const applyLibraryItem = (item) => {
    setForm({
      nome: item.nome || '',
      telefone: item.telefone || '',
      meta: item.meta ? String(item.meta) : '',
    });
    setSearch('');
  };

  const addInterviewer = async () => {
    if (!form.nome.trim()) {
      window.showToast?.('Informe o nome do entrevistador.', 'error');
      return;
    }

    const duplicate = list.some((item) => isSameInterviewer(item, form));
    if (duplicate) {
      window.showToast?.('Este entrevistador ja esta vinculado a esta pesquisa.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        surveyId: survey.id,
        nome: form.nome.trim(),
        telefone: form.telefone.trim() || null,
        meta: Number.parseInt(form.meta, 10) || 0,
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(collection(db, 'survey_entrevistadores'), payload);
      setList((current) => [...current, { id: ref.id, ...payload }]);
      setForm({ nome: '', telefone: '', meta: '' });
      window.showToast?.('Entrevistador adicionado.', 'success');
    } catch (error) {
      window.showToast?.(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeInterviewer = async (id) => {
    if (!window.confirm('Remover este entrevistador?')) return;
    try {
      await deleteDoc(doc(db, 'survey_entrevistadores', id));
      setList((current) => current.filter((item) => item.id !== id));
      window.showToast?.('Entrevistador removido.', 'success');
    } catch (error) {
      window.showToast?.(error.message, 'error');
    }
  };

  const inputStyle = {
    padding: '9px 12px',
    borderRadius: '9px',
    border: '1px solid var(--border)',
    outline: 'none',
    fontSize: '13px',
    color: 'var(--text-main)',
    background: 'var(--bg-app)',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ borderTop: '1px solid var(--border)' }}>
      <button
        onClick={() => setExpanded((current) => !current)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '13px 20px',
          background: `${colors.success}08`,
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: colors.success }}>
          <Users size={14} />
          <span style={{ fontSize: '12px', fontWeight: '900' }}>Entrevistadores e links pessoais</span>
          {list.length > 0 && <span style={{ padding: '1px 8px', borderRadius: '20px', background: `${colors.success}20` }}>{list.length}</span>}
        </div>
        {expanded ? <ChevronUp size={14} color={colors.success} /> : <ChevronDown size={14} color={colors.success} />}
      </button>

      {expanded && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Cada entrevistador recebe um link unico para rastrear quem aplicou a pesquisa.
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              background: 'var(--bg-panel)',
              borderRadius: '12px',
              padding: '14px',
              border: '1px solid var(--border)',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-main)' }}>
                Buscar pesquisadores ja usados em outras pesquisas
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.45 }}>
                Selecione um pesquisador ja cadastrado para preencher nome, telefone e meta automaticamente.
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 12px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
              }}
            >
              <Search size={14} color="var(--text-muted)" />
              <input
                style={{ ...inputStyle, border: 'none', padding: '11px 0', background: 'transparent' }}
                placeholder="Buscar por nome ou telefone"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            {libraryLoading ? (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Carregando pesquisadores ja cadastrados...</div>
            ) : filteredLibrary.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredLibrary.map((item) => (
                  <button
                    key={`${item.surveyId}-${item.id}`}
                    onClick={() => applyLibraryItem(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      width: '100%',
                      padding: '11px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-card)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>{item.nome}</div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '10px',
                          flexWrap: 'wrap',
                          marginTop: '3px',
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {item.telefone && <span>{item.telefone}</span>}
                        {!!item.meta && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Target size={10} />
                            Meta {item.meta}
                          </span>
                        )}
                        {item.useCount > 1 && <span>Usado em {item.useCount} pesquisas</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: colors.success }}>Usar</span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {search.trim()
                  ? 'Nenhum pesquisador encontrado com esse termo.'
                  : 'Nenhum pesquisador reaproveitavel encontrado em outras pesquisas.'}
              </div>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr auto',
              gap: '8px',
              alignItems: 'end',
              background: 'var(--bg-panel)',
              borderRadius: '12px',
              padding: '14px',
              border: '1px solid var(--border)',
            }}
          >
            <input
              style={inputStyle}
              placeholder="Nome completo *"
              value={form.nome}
              onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
            />
            <input
              style={inputStyle}
              placeholder="Telefone"
              value={form.telefone}
              onChange={(event) => setForm((current) => ({ ...current, telefone: event.target.value }))}
            />
            <input
              style={inputStyle}
              type="number"
              min="0"
              placeholder="Meta"
              value={form.meta}
              onChange={(event) => setForm((current) => ({ ...current, meta: event.target.value }))}
            />
            <button
              onClick={addInterviewer}
              disabled={saving || !form.nome.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                justifyContent: 'center',
                padding: '10px 14px',
                borderRadius: '9px',
                border: `1px solid ${colors.success}45`,
                background: `${colors.success}14`,
                color: colors.success,
                fontWeight: '800',
                cursor: saving || !form.nome.trim() ? 'not-allowed' : 'pointer',
                opacity: saving || !form.nome.trim() ? 0.5 : 1,
              }}
            >
              <Plus size={13} />
              Adicionar
            </button>
          </div>

          {loading ? (
            <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando entrevistadores...</div>
          ) : list.length === 0 ? (
            <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum entrevistador vinculado.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {list.map((item) => {
                const url = entrevistadorURL(survey.id, item.id);
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      background: 'var(--bg-card)',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>{item.nome}</div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                          {item.telefone && <span>{item.telefone}</span>}
                          {!!item.meta && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Target size={10} />
                              Meta {item.meta}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeInterviewer(item.id)}
                        style={{ background: 'none', border: 'none', color: colors.danger, cursor: 'pointer' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'var(--bg-app)',
                        borderRadius: '8px',
                        padding: '7px 10px',
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          fontSize: '10px',
                          color: 'var(--text-muted)',
                          fontFamily: 'monospace',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {url}
                      </div>
                      <CopyButton text={url} />
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
