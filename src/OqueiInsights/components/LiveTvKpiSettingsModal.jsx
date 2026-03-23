import React from 'react';
import { Settings, Sparkles } from 'lucide-react';
import { Btn, Modal, colors } from '../../components/ui';

function getTypeLabel(type) {
  const labels = {
    boolean: 'Sim ou nao',
    select: 'Escolha unica',
    multiselect: 'Multipla escolha',
    nps: 'NPS',
    text: 'Texto livre',
  };
  return labels[type] || 'Pergunta';
}

export default function LiveTvKpiSettingsModal({
  open,
  onClose,
  questionOptions,
  selectedKeys,
  onChange,
  maxItems = 4,
}) {
  const toggleQuestion = (key) => {
    const current = selectedKeys || [];
    if (current.includes(key)) {
      onChange?.(current.filter((item) => item !== key));
      return;
    }

    if (current.length >= maxItems) {
      window.showToast?.(`Selecione ate ${maxItems} perguntas para o Modo TV.`, 'info');
      return;
    }

    onChange?.([...current, key]);
  };

  const applySuggested = () => {
    onChange?.((questionOptions || []).slice(0, maxItems).map((item) => item.key));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Configurar KPIs do Modo TV"
      footer={(
        <>
          <Btn variant="secondary" onClick={applySuggested}>Usar recomendadas</Btn>
          <Btn onClick={onClose}>Concluir</Btn>
        </>
      )}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ padding: '16px 18px', borderRadius: '18px', border: `1px solid ${colors.info}26`, background: 'linear-gradient(135deg, rgba(56,189,248,0.12), rgba(15,23,42,0.05))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '12px', background: `${colors.info}20`, color: colors.info, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={17} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-main)' }}>Escolha ate {maxItems} perguntas</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Essas perguntas vao alimentar os cards automaticos do rodape no Modo TV.</div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: colors.info, fontWeight: '800' }}>
            {selectedKeys?.length || 0} selecionada(s) no momento
          </div>
        </div>

        {!questionOptions?.length ? (
          <div style={{ padding: '28px', textAlign: 'center', borderRadius: '18px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-muted)' }}>
            Nenhuma pergunta elegivel foi encontrada no recorte atual.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '56vh', overflowY: 'auto', paddingRight: '4px' }}>
            {questionOptions.map((item) => {
              const selected = selectedKeys?.includes(item.key);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleQuestion(item.key)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: selected ? `1px solid ${colors.info}` : '1px solid var(--border)',
                    background: selected
                      ? 'linear-gradient(135deg, rgba(56,189,248,0.14), rgba(15,23,42,0.08))'
                      : 'var(--bg-app)',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    transition: 'transform 0.16s ease, border-color 0.16s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '900' }}>{item.label}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span>{item.surveyTitle || 'Pesquisa'}</span>
                        <span>{getTypeLabel(item.type)}</span>
                      </div>
                    </div>
                    <div style={{
                      minWidth: '86px',
                      padding: '6px 10px',
                      borderRadius: '999px',
                      background: selected ? `${colors.info}22` : 'rgba(148,163,184,0.12)',
                      color: selected ? colors.info : 'var(--text-muted)',
                      fontSize: '10px',
                      fontWeight: '900',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}>
                      {selected && <Sparkles size={12} />}
                      {selected ? 'ativo' : 'selecionar'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
