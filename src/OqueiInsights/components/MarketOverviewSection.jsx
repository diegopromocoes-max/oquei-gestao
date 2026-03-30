import React from 'react';
import { Card, colors } from '../../components/ui';
import { OQUEI, pct } from '../lib/analysisResults';
import { HBar, provColor } from './AnalysisVisuals';

export default function MarketOverviewSection({ market }) {
  if (!market) return null;

  const kpis = [
    { icon: '💡', label: 'Conhecem a Oquei', value: `${pct(market.conheceOquei, market.total)}%`, sub: `${market.conheceOquei} de ${market.total}`, color: pct(market.conheceOquei, market.total) < 50 ? colors.warning : colors.success },
    { icon: '🏠', label: 'Home Office na cidade', value: `${pct(market.homeOffice, market.total)}%`, sub: 'internet crítica para o trabalho', color: colors.primary },
    { icon: '🔥', label: 'Leads quentes (score ≥7)', value: market.leadsQuentes, sub: 'clientes da concorrência prontos para trocar', color: colors.danger },
    { icon: '🎯', label: 'Prioridade #1 do mercado', value: market.prioridades[0]?.[0] || '—', sub: `${market.prioridades[0]?.[1] || 0} menções`, color: colors.purple },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <Card title="Market Share na Amostra" subtitle={`${market.total} entrevistados`}>
        {market.marketShare.map(({ nome, n, pct: share }) => (
          <HBar
            key={nome}
            label={nome}
            value={n}
            max={market.marketShare[0]?.n || 0}
            color={nome === OQUEI ? colors.primary : provColor(nome)}
            right={`${share}%`}
            sublabel={`${n} respostas`}
            highlight={nome === OQUEI}
          />
        ))}
      </Card>

      <Card title="Inteligência de Mercado" subtitle="Perfil da demanda">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {kpis.map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '10px' }}>
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>{item.label}</div>
                <div style={{ fontSize: '15px', fontWeight: '900', color: item.color }}>{item.value}</div>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right', maxWidth: '100px' }}>{item.sub}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
