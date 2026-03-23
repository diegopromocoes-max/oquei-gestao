import React from 'react';
import { CalendarRange, Flag, Layers3, Target } from 'lucide-react';
import { Card, colors } from '../../components/ui';

export default function InsightsContextCard({
  survey,
  responseCount,
  themeLabels,
  versionCounts,
  selectedThemeLabel,
  selectedVersion,
  cityLabel,
  planCount,
}) {
  const items = [
    { label: 'Tema em foco', value: selectedThemeLabel || 'Todos os temas', icon: Layers3, color: colors.purple },
    { label: 'Versao filtrada', value: selectedVersion === 'all' ? 'Todas' : `Versao ${selectedVersion}`, icon: CalendarRange, color: colors.primary },
    { label: 'Cidade filtrada', value: cityLabel || 'Todas as cidades', icon: Flag, color: colors.info },
    { label: 'Planos vinculados', value: String(planCount || 0), icon: Target, color: colors.success },
  ];

  return (
    <Card
      accent={colors.primary}
      title={survey ? 'Contexto da Campanha' : 'Contexto Consolidado'}
      subtitle={survey ? `${survey.title} · ${responseCount} resposta(s)` : `${responseCount} resposta(s) no recorte atual`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {survey?.objective && (
          <div style={{ padding: '12px 14px', borderRadius: '12px', background: `${colors.info}08`, border: `1px solid ${colors.info}20` }}>
            <div style={{ fontSize: '10px', fontWeight: '900', color: colors.info, textTransform: 'uppercase', marginBottom: '4px' }}>
              Objetivo estrategico
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.55 }}>{survey.objective}</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} style={{ padding: '10px 12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-app)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{item.label}</div>
                  <Icon size={13} color={item.color} />
                </div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: item.color, marginTop: '6px', lineHeight: 1.35 }}>{item.value}</div>
              </div>
            );
          })}
        </div>

        {survey && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: colors.warning, background: `${colors.warning}12`, padding: '4px 8px', borderRadius: '999px' }}>
              Gatilho: {survey.triggerLabel || survey.trigger || 'Nao informado'}
            </span>
            {(themeLabels || []).map((label) => (
              <span key={label} style={{ fontSize: '11px', fontWeight: '800', color: colors.purple, background: `${colors.purple}12`, padding: '4px 8px', borderRadius: '999px' }}>
                {label}
              </span>
            ))}
            {(versionCounts || []).map((item) => (
              <span key={item.version} style={{ fontSize: '11px', fontWeight: '800', color: colors.primary, background: `${colors.primary}12`, padding: '4px 8px', borderRadius: '999px' }}>
                V{item.version}: {item.count}
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
