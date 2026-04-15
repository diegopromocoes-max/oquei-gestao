import { Activity, CircleDot, Sparkles } from 'lucide-react';

import { colors } from '../ui';

export default function LeadFlowProgress({
  sections = [],
  activeSection,
  onSelect,
  headline = 'Captura de oportunidade',
  subtitle = 'Uma experiencia mais guiada, direta e comercial para registrar leads.',
  cityLabel = 'Loja ainda nao definida',
  readyCount = 0,
  totalCount = 0,
}) {
  return (
    <div
      style={{
        display: 'grid',
        gap: '18px',
        padding: '22px',
        borderRadius: '28px',
        background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.96))',
        border: '1px solid rgba(148,163,184,0.16)',
        color: '#fff',
        boxShadow: '0 28px 56px rgba(15,23,42,0.16)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'grid', gap: '10px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.56)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 900 }}>
            <Sparkles size={14} />
            Assistente de captura
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 900, letterSpacing: '-0.04em' }}>
              {headline}
            </h1>
            <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, maxWidth: '760px' }}>
              {subtitle}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '10px', minWidth: '260px' }}>
          <div style={{ padding: '14px 16px', borderRadius: '18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.58)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 900 }}>
              Loja em foco
            </div>
            <div style={{ marginTop: '6px', fontSize: '18px', fontWeight: 900 }}>
              {cityLabel}
            </div>
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '18px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.18)' }}>
            <Activity size={16} color={colors.info} />
            <div style={{ fontSize: '12px', fontWeight: 800, color: 'rgba(255,255,255,0.78)' }}>
              Blocos concluidos: <strong style={{ color: '#fff' }}>{readyCount}</strong> / {totalCount}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        {sections.map((section, index) => {
          const active = section.id === activeSection;
          const complete = section.state === 'complete';
          const optional = section.state === 'optional';
          const accent = complete ? colors.success : active ? section.accent : optional ? colors.warning : 'rgba(148,163,184,0.9)';

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelect?.(section.id)}
              style={{
                textAlign: 'left',
                display: 'grid',
                gap: '10px',
                padding: '15px 16px',
                borderRadius: '20px',
                border: `1px solid ${active ? section.accent : 'rgba(255,255,255,0.08)'}`,
                background: active ? `${section.accent}18` : 'rgba(255,255,255,0.04)',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '14px',
                      background: `${accent}20`,
                      color: accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <section.Icon size={17} />
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 900, color: 'rgba(255,255,255,0.56)' }}>
                    Bloco {index + 1}
                  </div>
                </div>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: accent, fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <CircleDot size={12} />
                  {complete ? 'Concluido' : active ? 'Em foco' : optional ? 'Opcional' : 'Pendente'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#fff' }}>{section.title}</div>
                <div style={{ marginTop: '4px', fontSize: '12px', color: 'rgba(255,255,255,0.68)', lineHeight: 1.5 }}>
                  {section.helper}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
