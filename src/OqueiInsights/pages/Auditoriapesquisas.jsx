import React, { useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { AlertCircle, CheckCircle, Clock, Download, Eye, FileUp, Filter, MapPin, Search, ShieldCheck, ThumbsDown, ThumbsUp, Trash2, X } from 'lucide-react';
import { db } from '../../firebase';
import { Card, colors } from '../../components/ui';
import { styles as global } from '../../styles/globalStyles';
import {
  buildBackupImportSignature,
  buildImportedResponseDoc,
  parseSurveyBackupFileContent,
} from '../lib/surveyBackups';

const STATUS = {
  pendente: { label: 'Pendente', color: colors.warning, icon: Clock, bg: `${colors.warning}15` },
  aceita: { label: 'Aceita', color: colors.success, icon: CheckCircle, bg: `${colors.success}15` },
  recusada: { label: 'Recusada', color: colors.danger, icon: AlertCircle, bg: `${colors.danger}15` },
};

const TRUST = ['alta', 'media', 'baixa'];
const FLAGS = ['gps_ausente', 'telefone_ausente', 'cidade_ausente', 'padrao_suspeito', 'entrevista_incompleta'];

const prettyFlag = (flag) => flag.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());

function BadgeStatus({ status }) {
  const cfg = STATUS[status || 'pendente'];
  const Icon = cfg.icon;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: cfg.bg, color: cfg.color, borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: '800' }}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function DecisionModal({ data, userData, onClose }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [trust, setTrust] = useState(data.decision === 'aceita' ? 'media' : 'baixa');
  const [flags, setFlags] = useState(() => {
    const selected = [];
    if (!data.response.location?.lat) selected.push('gps_ausente');
    if (!data.response.telefone) selected.push('telefone_ausente');
    if (!data.response.city) selected.push('cidade_ausente');
    return selected;
  });
  const accent = data.decision === 'aceita' ? colors.success : colors.danger;

  const toggleFlag = (flag) => {
    setFlags((current) => current.includes(flag) ? current.filter((item) => item !== flag) : [...current, flag]);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.8)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: '560px', background: 'var(--bg-card)', borderRadius: '18px', border: '1px solid var(--border)' }}>
        <div style={{ padding: '18px 22px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '17px', fontWeight: '900', color: 'var(--text-main)' }}>{data.decision === 'aceita' ? 'Aceitar entrevista' : 'Recusar entrevista'}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{data.response.researcherName || 'Pesquisador'} · {data.response.surveyTitle || 'Pesquisa'}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <textarea style={{ width: '100%', minHeight: '92px', resize: 'vertical', padding: '11px 13px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontFamily: 'inherit', outline: 'none' }} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo da decisao *" />
          <textarea style={{ width: '100%', minHeight: '72px', resize: 'vertical', padding: '11px 13px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontFamily: 'inherit', outline: 'none' }} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Nota adicional" />

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {TRUST.map((item) => (
              <button key={item} onClick={() => setTrust(item)} style={{ padding: '7px 12px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: '11px', background: trust === item ? `${accent}15` : 'var(--bg-app)', color: trust === item ? accent : 'var(--text-muted)', outline: `1px solid ${trust === item ? accent : 'var(--border)'}` }}>
                {item.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {FLAGS.map((flag) => {
              const selected = flags.includes(flag);
              return (
                <button key={flag} onClick={() => toggleFlag(flag)} style={{ padding: '7px 12px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: '800', fontSize: '11px', background: selected ? `${colors.warning}16` : 'var(--bg-app)', color: selected ? colors.warning : 'var(--text-muted)', outline: `1px solid ${selected ? colors.warning : 'var(--border)'}` }}>
                  {selected ? '✓ ' : ''}{prettyFlag(flag)}
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Auditor: <strong style={{ color: 'var(--text-main)' }}>{userData?.name || userData?.nome || 'Nao identificado'}</strong></div>
        </div>

        <div style={{ padding: '14px 22px 18px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button onClick={onClose} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontWeight: '800', cursor: 'pointer' }}>Cancelar</button>
          <button
            onClick={() => {
              if (!reason.trim()) {
                window.showToast?.('Informe o motivo da decisao.', 'error');
                return;
              }
              data.onConfirm({ reason: reason.trim(), note: note.trim(), trust, flags });
            }}
            style={{ padding: '10px 14px', borderRadius: '10px', border: `1px solid ${accent}40`, background: `${accent}15`, color: accent, fontWeight: '900', cursor: 'pointer' }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailsModal({ response, survey, onClose, onAudit, onDelete }) {
  const questions = survey?.questions || [];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.8)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div style={{ width: '100%', maxWidth: '760px', maxHeight: '90vh', overflow: 'hidden', background: 'var(--bg-card)', borderRadius: '18px', border: '1px solid var(--border)' }}>
        <div style={{ padding: '18px 22px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '17px', fontWeight: '900', color: 'var(--text-main)' }}>{response.researcherName || 'Pesquisador'}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {response.numero && <span>#{response.numero}</span>}
              <span>{response.surveyTitle || 'Pesquisa'}</span>
              {response.city && <span>📍 {response.city}</span>}
              {response.timestamp?.toDate && <span>{response.timestamp.toDate().toLocaleString('pt-BR')}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BadgeStatus status={response.auditStatus} />
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
          </div>
        </div>

        <div style={{ maxHeight: 'calc(90vh - 158px)', overflowY: 'auto', padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
            <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--bg-app)', border: '1px solid var(--border)' }}><div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Origem</div><div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>{response.collectionSource || '—'}</div></div>
            <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--bg-app)', border: '1px solid var(--border)' }}><div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Confianca</div><div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>{response.auditTrustLevel || 'Nao auditado'}</div></div>
            <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--bg-app)', border: '1px solid var(--border)' }}><div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Telefone</div><div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>{response.telefone || 'Nao informado'}</div></div>
            <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--bg-app)', border: '1px solid var(--border)' }}><div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Versao</div><div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', marginTop: '4px' }}>{response.surveyVersion || '—'}</div></div>
          </div>

          {(response.auditReason || response.auditNote || response.auditFlags?.length) && (
            <div style={{ padding: '12px 14px', borderRadius: '12px', background: `${colors.info}08`, border: `1px solid ${colors.info}22` }}>
              {response.auditReason && <div style={{ fontSize: '13px', color: 'var(--text-main)', marginBottom: '6px' }}><strong>Motivo:</strong> {response.auditReason}</div>}
              {response.auditNote && <div style={{ fontSize: '13px', color: 'var(--text-main)', marginBottom: '6px' }}><strong>Nota:</strong> {response.auditNote}</div>}
              {response.auditFlags?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {response.auditFlags.map((flag) => (
                    <span key={flag} style={{ fontSize: '11px', fontWeight: '800', color: colors.warning, background: `${colors.warning}15`, padding: '4px 8px', borderRadius: '999px' }}>{prettyFlag(flag)}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {questions.map((question, index) => {
            const value = response.answers?.[question.id];
            const display = Array.isArray(value) ? value.join(', ') : value || '—';
            return (
              <div key={question.id || index} style={{ padding: '12px 14px', borderRadius: '12px', background: 'var(--bg-app)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '5px' }}>P{index + 1} · {question.label}</div>
                <div style={{ fontSize: '14px', color: 'var(--text-main)' }}>{display}</div>
              </div>
            );
          })}

          <div style={{ padding: '12px 14px', borderRadius: '12px', background: response.location?.lat ? `${colors.success}08` : `${colors.warning}08`, border: `1px solid ${response.location?.lat ? `${colors.success}22` : `${colors.warning}22`}` }}>
            {response.location?.lat ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-main)' }}>
                <MapPin size={13} color={colors.success} />
                GPS: {response.location.lat.toFixed(6)}, {response.location.lng.toFixed(6)}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: colors.warning, fontWeight: '700' }}>
                <MapPin size={13} />
                Sem localizacao GPS registrada
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '14px 22px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {response.auditStatus !== 'aceita' && <button onClick={() => onAudit(response, 'aceita')} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: `1px solid ${colors.success}40`, background: `${colors.success}15`, color: colors.success, fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><ThumbsUp size={15} />Aceitar</button>}
          {response.auditStatus !== 'recusada' && <button onClick={() => onAudit(response, 'recusada')} style={{ flex: 1, padding: '11px', borderRadius: '10px', border: `1px solid ${colors.warning}40`, background: `${colors.warning}15`, color: colors.warning, fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><ThumbsDown size={15} />Recusar</button>}
          <button onClick={() => onDelete(response.id)} style={{ padding: '11px 16px', borderRadius: '10px', border: `1px solid ${colors.danger}30`, background: `${colors.danger}10`, color: colors.danger, fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Trash2 size={14} />Excluir</button>
        </div>
      </div>
    </div>
  );
}

export default function AuditoriaPesquisas({ userData }) {
  const [surveys, setSurveys] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSurvey, setSelectedSurvey] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedResearcher, setSelectedResearcher] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [detailsModal, setDetailsModal] = useState(null);
  const [decisionState, setDecisionState] = useState(null);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef(null);

  useEffect(() => {
    const unsubSurvey = onSnapshot(collection(db, 'surveys'), (snapshot) => setSurveys(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))));
    const unsubResponses = onSnapshot(collection(db, 'survey_responses'), (snapshot) => {
      setResponses(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => { unsubSurvey(); unsubResponses(); };
  }, []);

  const surveyMap = useMemo(() => Object.fromEntries(surveys.map((survey) => [survey.id, survey])), [surveys]);
  const cityOptions = useMemo(() => [...new Set(responses.map((response) => response.city).filter(Boolean))].sort(), [responses]);
  const researcherOptions = useMemo(() => [...new Set(responses.map((response) => response.researcherName).filter(Boolean))].sort(), [responses]);
  const surveyOptions = useMemo(() => [...new Set(responses.map((response) => response.surveyId))].map((surveyId) => surveys.find((survey) => survey.id === surveyId)).filter(Boolean), [responses, surveys]);

  const filteredResponses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...responses]
      .filter((response) => selectedSurvey === 'all' || response.surveyId === selectedSurvey)
      .filter((response) => selectedCity === 'all' || response.city === selectedCity)
      .filter((response) => selectedResearcher === 'all' || response.researcherName === selectedResearcher)
      .filter((response) => selectedStatus === 'all' || (response.auditStatus || 'pendente') === selectedStatus)
      .filter((response) => {
        if (!query) return true;
        return [response.researcherName, response.surveyTitle, response.city, response.numero, response.telefone]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
  }, [responses, search, selectedSurvey, selectedCity, selectedResearcher, selectedStatus]);

  const counts = useMemo(() => ({
    total: responses.length,
    pendente: responses.filter((response) => (response.auditStatus || 'pendente') === 'pendente').length,
    aceita: responses.filter((response) => response.auditStatus === 'aceita').length,
    recusada: responses.filter((response) => response.auditStatus === 'recusada').length,
  }), [responses]);

  const existingBackupIds = useMemo(
    () => new Set(responses.map((response) => response.backupId).filter(Boolean)),
    [responses],
  );

  const existingImportSignatures = useMemo(
    () => new Set(responses.map((response) => buildBackupImportSignature(response)).filter(Boolean)),
    [responses],
  );

  const exportCSV = () => {
    const headers = ['Numero', 'Status', 'Confianca', 'Pesquisador', 'Pesquisa', 'Cidade', 'Telefone', 'Origem', 'Motivo'];
    const rows = filteredResponses.map((response) => [
      response.numero || '',
      response.auditStatus || 'pendente',
      response.auditTrustLevel || '',
      response.researcherName || '',
      response.surveyTitle || '',
      response.city || '',
      response.telefone || '',
      response.collectionSource || '',
      response.auditReason || '',
    ]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'auditoria-oquei-insights.csv';
    link.click();
  };

  const handleImportBackupClick = () => {
    importInputRef.current?.click();
  };

  const handleImportBackupFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImporting(true);
    try {
      const content = await file.text();
      const records = parseSurveyBackupFileContent(content);

      if (!records.length) {
        window.showToast?.('Nenhum questionario valido foi encontrado no arquivo.', 'warning');
        return;
      }

      const seenBackupIds = new Set(existingBackupIds);
      const seenSignatures = new Set(existingImportSignatures);
      let imported = 0;
      let skipped = 0;

      for (const record of records) {
        const payload = buildImportedResponseDoc(record, { fileName: file.name, userData });
        const backupId = payload.backupId || record.backupId || null;
        const signature = buildBackupImportSignature(payload);

        if ((backupId && seenBackupIds.has(backupId)) || (signature && seenSignatures.has(signature))) {
          skipped += 1;
          continue;
        }

        await addDoc(collection(db, 'survey_responses'), {
          ...payload,
          timestamp: serverTimestamp(),
          importedAt: serverTimestamp(),
        });

        if (backupId) seenBackupIds.add(backupId);
        if (signature) seenSignatures.add(signature);
        imported += 1;
      }

      if (!imported) {
        window.showToast?.(`Importacao concluida sem novos registros. ${skipped} backup(s) ja existiam.`, 'info');
        return;
      }

      window.showToast?.(`Importacao concluida: ${imported} registro(s) novo(s) e ${skipped} ignorado(s).`, 'success');
    } catch (error) {
      window.showToast?.(`Erro ao importar backup: ${error.message}`, 'error');
    } finally {
      setImporting(false);
    }
  };

  const openDecision = (response, decision) => {
    setDecisionState({
      response,
      decision,
      onConfirm: async ({ reason, note, trust, flags }) => {
        await updateDoc(doc(db, 'survey_responses', response.id), {
          auditStatus: decision,
          auditReason: reason,
          auditNote: note,
          auditTrustLevel: trust,
          auditFlags: flags,
          auditedAt: serverTimestamp(),
          auditedByUid: userData?.uid || null,
          auditedByName: userData?.name || userData?.nome || 'Auditoria',
        });
        setDecisionState(null);
        window.showToast?.('Auditoria registrada.', 'success');
      },
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir permanentemente esta entrevista?')) return;
    try {
      await deleteDoc(doc(db, 'survey_responses', id));
      if (detailsModal?.id === id) setDetailsModal(null);
      window.showToast?.('Entrevista excluida.', 'success');
    } catch (error) {
      window.showToast?.(error.message, 'error');
    }
  };

  const inputStyle = { padding: '7px 11px', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', fontSize: '12px', color: 'var(--text-main)', background: 'var(--bg-app)', fontFamily: 'inherit' };

  return (
    <div style={{ ...global.container }}>
      <div style={{ background: 'linear-gradient(135deg, var(--bg-card), var(--bg-panel))', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: `linear-gradient(135deg, ${colors.purple}, ${colors.primary})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 18px ${colors.purple}44` }}><ShieldCheck size={24} color="#fff" /></div>
          <div>
            <div style={{ fontSize: '21px', fontWeight: '900', color: 'var(--text-main)' }}>Auditoria de Entrevistas</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{loading ? 'Carregando...' : `${counts.total} total · ${counts.aceita} aceitas · ${counts.pendente} pendentes · ${counts.recusada} recusadas`}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input ref={importInputRef} type="file" accept=".json,application/json" onChange={handleImportBackupFile} style={{ display: 'none' }} />
          <button onClick={handleImportBackupClick} disabled={importing} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${colors.primary}35`, background: `${colors.primary}10`, color: colors.primary, fontWeight: '800', cursor: importing ? 'wait' : 'pointer', opacity: importing ? 0.7 : 1 }}><FileUp size={13} />{importing ? 'Importando...' : 'Importar Backup'}</button>
          <button onClick={exportCSV} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-main)', fontWeight: '800', cursor: 'pointer' }}><Download size={13} />Exportar CSV</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        {[
          { key: 'all', label: 'Total', value: counts.total, color: colors.primary },
          { key: 'pendente', label: 'Pendentes', value: counts.pendente, color: colors.warning },
          { key: 'aceita', label: 'Aceitas', value: counts.aceita, color: colors.success },
          { key: 'recusada', label: 'Recusadas', value: counts.recusada, color: colors.danger },
        ].map((item) => (
          <div key={item.key} onClick={() => setSelectedStatus(item.key === 'all' ? 'all' : selectedStatus === item.key ? 'all' : item.key)} style={{ background: 'var(--bg-card)', border: `1px solid ${selectedStatus === item.key ? item.color : 'var(--border)'}`, borderLeft: `4px solid ${item.color}`, borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', boxShadow: selectedStatus === item.key ? `0 0 0 2px ${item.color}24` : 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{item.label}</div>
            <div style={{ fontSize: '26px', fontWeight: '900', color: item.color, marginTop: '4px' }}>{loading ? '...' : item.value}</div>
          </div>
        ))}
      </div>

      <Card>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={14} color="var(--text-muted)" />
          <div style={{ position: 'relative', minWidth: '220px', flex: 1 }}>
            <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input style={{ ...inputStyle, width: '100%', paddingLeft: '32px' }} placeholder="Buscar por pesquisador, numero, cidade..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <select style={inputStyle} value={selectedSurvey} onChange={(event) => setSelectedSurvey(event.target.value)}>
            <option value="all">Todas as pesquisas</option>
            {surveyOptions.map((survey) => <option key={survey.id} value={survey.id}>{survey.title}</option>)}
          </select>
          <select style={inputStyle} value={selectedCity} onChange={(event) => setSelectedCity(event.target.value)}>
            <option value="all">Todas as cidades</option>
            {cityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
          </select>
          <select style={inputStyle} value={selectedResearcher} onChange={(event) => setSelectedResearcher(event.target.value)}>
            <option value="all">Todos os pesquisadores</option>
            {researcherOptions.map((researcher) => <option key={researcher} value={researcher}>{researcher}</option>)}
          </select>
        </div>
      </Card>

      <Card>
        {filteredResponses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Nenhuma entrevista encontrada.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Nº', 'Status', 'Pesquisador', 'Pesquisa', 'Cidade', 'Origem', 'Confianca', 'Data', 'Acoes'].map((header) => (
                    <th key={header} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)', whiteSpace: 'nowrap' }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredResponses.map((response) => (
                  <tr key={response.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: '800', color: colors.primary }}>{response.numero || '—'}</td>
                    <td style={{ padding: '10px 12px' }}><BadgeStatus status={response.auditStatus} /></td>
                    <td style={{ padding: '10px 12px' }}><div style={{ fontWeight: '800', color: 'var(--text-main)' }}>{response.researcherName || '—'}</div><div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{response.telefone || 'Sem telefone'}</div></td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-main)' }}>{response.surveyTitle || '—'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{response.city || '—'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{response.collectionSource || '—'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{response.auditTrustLevel || '—'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{response.timestamp?.toDate ? response.timestamp.toDate().toLocaleString('pt-BR') : '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button onClick={() => setDetailsModal(response)} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Eye size={14} /></button>
                        {response.auditStatus !== 'aceita' && <button onClick={() => openDecision(response, 'aceita')} style={{ width: '32px', height: '32px', borderRadius: '8px', border: `1px solid ${colors.success}30`, background: `${colors.success}12`, color: colors.success, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ThumbsUp size={13} /></button>}
                        {response.auditStatus !== 'recusada' && <button onClick={() => openDecision(response, 'recusada')} style={{ width: '32px', height: '32px', borderRadius: '8px', border: `1px solid ${colors.warning}30`, background: `${colors.warning}12`, color: colors.warning, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ThumbsDown size={13} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {detailsModal && <DetailsModal response={detailsModal} survey={surveyMap[detailsModal.surveyId]} onClose={() => setDetailsModal(null)} onAudit={openDecision} onDelete={handleDelete} />}
      {decisionState && <DecisionModal data={decisionState} userData={userData} onClose={() => setDecisionState(null)} />}
    </div>
  );
}
