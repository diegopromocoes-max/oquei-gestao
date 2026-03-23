import React from 'react';
import { ClipboardList, Info, Plus } from 'lucide-react';
import { Btn, colors } from '../../components/ui';

export default function SurveyBuilderHero({ counts, statusOrder, statusLabelMap, surveyCount, onCreate }) {
  return (
    <>
      <div
        style={{
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-panel) 100%)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          padding: '24px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '14px',
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.purple})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 6px 18px ${colors.primary}44`,
            }}
          >
            <ClipboardList size={24} color="#fff" />
          </div>

          <div>
            <div style={{ fontSize: '21px', fontWeight: '900', color: 'var(--text-main)' }}>
              Criador de Pesquisas
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Campanhas com objetivo, gatilho, temas reutilizaveis e perguntas auditaveis
            </div>
          </div>
        </div>

        <Btn onClick={onCreate} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={15} />
          Nova Campanha
        </Btn>
      </div>

      {surveyCount > 0 && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {statusOrder.map((status) =>
            counts[status] ? (
              <div
                key={status}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  background: 'var(--bg-card)',
                  border: `1px solid ${
                    status === 'active'
                      ? `${colors.success}30`
                      : status === 'draft'
                        ? `${colors.warning}30`
                        : `${colors.neutral}30`
                  }`,
                  borderRadius: '10px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: '800',
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background:
                      status === 'active'
                        ? colors.success
                        : status === 'draft'
                          ? colors.warning
                          : colors.neutral,
                  }}
                />
                <span style={{ color: 'var(--text-main)' }}>{counts[status]}</span>
                <span style={{ color: 'var(--text-muted)' }}>{statusLabelMap[status]}</span>
              </div>
            ) : null,
          )}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          background: `${colors.info}10`,
          border: `1px solid ${colors.info}30`,
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '12px',
          color: 'var(--text-muted)',
          fontWeight: '600',
        }}
      >
        <Info size={14} color={colors.info} style={{ flexShrink: 0, marginTop: '1px' }} />
        <span>
          <strong style={{ color: 'var(--text-main)' }}>Fluxo recomendado:</strong>{' '}
          defina o gatilho e o objetivo da campanha, selecione os temas, monte o questionario com apoio
          do banco de perguntas, ative a coleta e acompanhe a auditoria.
        </span>
      </div>
    </>
  );
}
