export default function LeadChoiceGrid({
  options = [],
  value,
  onChange,
  columns = 'repeat(auto-fit, minmax(180px, 1fr))',
  size = 'md',
}) {
  if (!options.length) return null;

  const padding = size === 'sm' ? '14px 15px' : '16px';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: columns, gap: '12px' }}>
      {options.map((option) => {
        const selected = value === option.value;
        const accent = option.accent || '#2563eb';

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => !option.disabled && onChange?.(option.value)}
            disabled={option.disabled}
            style={{
              textAlign: 'left',
              padding,
              borderRadius: '18px',
              border: `1px solid ${selected ? accent : 'var(--border)'}`,
              background: selected ? `${accent}16` : 'var(--bg-card)',
              boxShadow: selected ? `0 14px 34px ${accent}1f` : 'var(--shadow-sm)',
              cursor: option.disabled ? 'not-allowed' : 'pointer',
              display: 'grid',
              gap: '8px',
              opacity: option.disabled ? 0.5 : 1,
              transition: 'all 0.18s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                {option.Icon ? (
                  <div
                    style={{
                      width: size === 'sm' ? '38px' : '42px',
                      height: size === 'sm' ? '38px' : '42px',
                      borderRadius: '14px',
                      background: selected ? `${accent}22` : 'rgba(15,23,42,0.05)',
                      color: selected ? accent : 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <option.Icon size={size === 'sm' ? 16 : 18} />
                  </div>
                ) : null}

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: size === 'sm' ? '13px' : '14px', fontWeight: 900, color: 'var(--text-main)' }}>
                    {option.label}
                  </div>
                  {option.helper ? (
                    <div style={{ marginTop: '3px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                      {option.helper}
                    </div>
                  ) : null}
                </div>
              </div>

              {option.badge ? (
                <span
                  style={{
                    padding: '5px 9px',
                    borderRadius: '999px',
                    background: selected ? `${accent}1f` : 'rgba(15,23,42,0.06)',
                    color: selected ? accent : 'var(--text-muted)',
                    fontSize: '10px',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {option.badge}
                </span>
              ) : null}
            </div>

            {option.description ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {option.description}
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
