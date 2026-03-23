import React, { useMemo, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { MapPin, ShieldCheck, ThumbsDown, ThumbsUp } from 'lucide-react';
import { db } from '../../firebase';
import { Btn, Modal, colors } from '../../components/ui';

function buildSuggestedFlags(response) {
  const flags = [];
  if (!response?.location?.lat) flags.push('gps_ausente');
  if (!response?.telefone) flags.push('telefone_ausente');
  if (!(response?.city || response?.cityName || response?.cityId)) flags.push('cidade_ausente');
  return flags;
}

export default function LiveAuditModal({ open, response, userData, onClose, onAudited }) {
  const [saving, setSaving] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [trust, setTrust] = useState('alta');
  const suggestedFlags = useMemo(() => buildSuggestedFlags(response), [response]);

  if (!response) return null;

  const submitDecision = async (decision) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'survey_responses', response.id), {
        auditStatus: decision,
        auditReason: reason.trim(),
        auditNote: note.trim(),
        auditTrustLevel: trust,
        auditFlags: suggestedFlags,
        auditedAt: serverTimestamp(),
        auditedByUid: userData?.uid || null,
        auditedByName: userData?.name || userData?.nome || 'Monitor ao vivo',
      });
      window.showToast?.('Auditoria registrada.', 'success');
      onAudited?.(decision);
      onClose?.();
    } catch (error) {
      window.showToast?.(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Auditoria rapida da coleta"
      footer={(
        <>
          <Btn variant="secondary" onClick={onClose} disabled={saving}>Fechar</Btn>
          <Btn variant="danger" onClick={() => submitDecision('recusada')} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ThumbsDown size={15} /> Recusar
          </Btn>
          <Btn variant="success" onClick={() => submitDecision('aceita')} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ThumbsUp size={15} /> Aceitar
          </Btn>
        </>
      )}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-app)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShieldCheck size={16} color={colors.primary} />
              <div style={{ fontSize: '13px', fontWeight: '900', color: 'var(--text-main)' }}>{response.surveyTitle || 'Pesquisa'}</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span>{response.researcherName || 'Pesquisador'}</span>
              <span>{response.cityName || response.city || response.cityId || 'Sem cidade'}</span>
              {response.numero && <span>#{response.numero}</span>}
              <span>{response.auditStatus || 'pendente'}</span>
            </div>
            {response.location?.lat && (
              <div style={{ marginTop: '10px', fontSize: '11px', color: colors.info, fontWeight: '800', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MapPin size={12} /> {response.location.lat.toFixed(5)}, {response.location.lng.toFixed(5)}
              </div>
            )}
          </div>

          <div style={{ padding: '14px 16px', borderRadius: '14px', border: '1px solid var(--border)', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '46vh', overflowY: 'auto' }}>
            {(Object.entries(response.answers || {})).length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sem respostas registradas.</div>
            ) : (
              Object.entries(response.answers || {}).map(([key, value]) => (
                <div key={key} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '5px' }}>{key}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.5 }}>{Array.isArray(value) ? value.join(', ') : String(value || '-')}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ padding: '14px 16px', borderRadius: '14px', border: `1px solid ${colors.warning}30`, background: `${colors.warning}10` }}>
            <div style={{ fontSize: '11px', fontWeight: '900', color: colors.warning, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Checks sugeridos</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--text-main)' }}>
              {suggestedFlags.length ? suggestedFlags.map((flag) => <div key={flag}>- {flag}</div>) : <div>Nenhuma flag automatica relevante.</div>}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Motivo da decisao</label>
            <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ex.: GPS consistente e respostas completas" style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontFamily: 'inherit' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Confianca</label>
            <select value={trust} onChange={(event) => setTrust(event.target.value)} style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontFamily: 'inherit' }}>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Observacao</label>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Notas para auditoria, coordenacao ou diretoria" style={{ minHeight: '180px', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontFamily: 'inherit', resize: 'vertical' }} />
          </div>
        </div>
      </div>
    </Modal>
  );
}
