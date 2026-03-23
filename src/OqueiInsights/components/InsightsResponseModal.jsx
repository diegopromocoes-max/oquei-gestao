import React, { useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { colors } from '../../components/ui';

export default function InsightsResponseModal({ resposta, grupo, surveys, onClose }) {
  const [selIdx, setSelIdx] = useState(0);
  const current = grupo ? grupo[selIdx] : resposta;
  if (!current) return null;

  const survey = (surveys || []).find((item) => item.id === current.surveyId);
  const questions = survey?.questions || [];

  const renderVal = (question, value) => {
    if (!value && value !== 0) return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Nao respondida</span>;
    if (question.type === 'nps') {
      const number = Number(value);
      const color = number <= 3 ? colors.danger : number <= 6 ? colors.warning : number <= 8 ? colors.primary : colors.success;
      return <span style={{ fontWeight: '900', fontSize: '20px', color }}>{value}</span>;
    }
    if (question.type === 'boolean') {
      return <span style={{ fontWeight: '800', color: value === 'Sim' ? colors.success : colors.danger }}>{value}</span>;
    }
    if (Array.isArray(value)) {
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {value.map((item, index) => (
            <span key={`${question.id}-${index}`} style={{ background: `${colors.primary}15`, border: `1px solid ${colors.primary}30`, borderRadius: '6px', padding: '2px 8px', fontSize: '12px', fontWeight: '700', color: colors.primary }}>
              {item}
            </span>
          ))}
        </div>
      );
    }
    return <span style={{ fontWeight: '700' }}>{value}</span>;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', borderRadius: '18px', width: '100%', maxWidth: '560px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: '900', fontSize: '16px', color: 'var(--text-main)' }}>{current.researcherName || 'Pesquisador'}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <span>Pesquisa: {current.surveyTitle || 'Sem titulo'}</span>
              {current.city && <span>Cidade: {current.city}</span>}
              {current.numero && <span>#{current.numero}</span>}
              {current.timestamp?.toDate && <span>{current.timestamp.toDate().toLocaleString('pt-BR')}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {grupo && grupo.length > 1 && (
          <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '6px', flexWrap: 'wrap', flexShrink: 0 }}>
            {grupo.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setSelIdx(index)}
                style={{ padding: '4px 12px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '800', background: index === selIdx ? colors.primary : 'var(--bg-app)', color: index === selIdx ? '#fff' : 'var(--text-muted)' }}
              >
                {(item.researcherName || '?').split(' ')[0]}
              </button>
            ))}
          </div>
        )}

        <div style={{ overflowY: 'auto', padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!questions.length ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>Perguntas nao disponiveis.</div>
          ) : questions.map((question, index) => (
            <div key={question.id} style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '5px' }}>Pergunta {index + 1}</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', marginBottom: '8px', lineHeight: 1.4 }}>{question.label}</div>
              <div style={{ fontSize: '14px' }}>{renderVal(question, current.answers?.[question.id])}</div>
            </div>
          ))}

          {current.location?.lat && (
            <div style={{ background: `${colors.info}10`, border: `1px solid ${colors.info}30`, borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={13} color={colors.info} />
              GPS: {current.location.lat.toFixed(5)}, {current.location.lng.toFixed(5)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
