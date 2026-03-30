import React from 'react';
import { Card, colors } from '../../components/ui';
import { pct } from '../lib/analysisResults';
import { HBar } from './AnalysisVisuals';

const PRIORITY_MESSAGES = {
  'Velocidade da Conexão': 'Destaque suas velocidades disponíveis logo na abordagem.',
  'Estabilidade (não cair)': 'Fale sobre SLA e uptime. Leve depoimentos de clientes satisfeitos.',
  'Atendimento humano/rápido': 'Mencione que a Oquei tem atendimento local e técnico próprio.',
  'Preço da mensalidade': 'Prepare uma oferta de entrada competitiva ou desconto nos primeiros meses.',
  'Wi-fi potente': 'Ofereça solução de Wi-fi mesh ou roteador de qualidade no plano.',
  'Ter loja física na cidade': 'Reforce a presença física da Oquei na cidade.',
};

export default function MarketPrioritiesCard({ market }) {
  if (!market) return null;

  return (
    <Card title="O que o mercado prioriza" subtitle="Clientes da concorrência — o que pesa na escolha">
      {!market.prioridades.length ? (
        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Sem prioridades suficientes no recorte atual.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '20px' }}>
          <div>
            {market.prioridades.map(([label, count]) => (
              <HBar
                key={label}
                label={label}
                value={count}
                max={market.prioridades[0]?.[1] || 0}
                color={colors.primary}
                right={`${pct(count, market.competitiveBaseCount)}%`}
              />
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>💡 O que isso significa</div>
            {market.prioridades.slice(0, 3).map(([label]) => (
              PRIORITY_MESSAGES[label] ? (
                <div key={label} style={{ display: 'flex', gap: '8px', fontSize: '12px', padding: '8px 10px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '8px' }}>
                  <span style={{ color: colors.primary, flexShrink: 0 }}>→</span>
                  <div><span style={{ fontWeight: '800' }}>{label}:</span> {PRIORITY_MESSAGES[label]}</div>
                </div>
              ) : null
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
