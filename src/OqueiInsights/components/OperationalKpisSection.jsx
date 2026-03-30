import React from 'react';
import { colors } from '../../components/ui';

export default function OperationalKpisSection({ opData, month }) {
  const hasOpData = opData.baseEnd > 0 || opData.potencial > 0;
  if (!hasOpData) return null;

  const items = [
    { label: 'Base Ativa', value: opData.baseEnd.toLocaleString('pt-BR'), color: colors.primary, sub: `de ${opData.potencial.toLocaleString('pt-BR')} HPs` },
    { label: 'Penetração', value: `${opData.penetracao}%`, color: colors.info, sub: 'dos HPs ativos' },
    { label: 'Vendas no Mês', value: `+${opData.vendas}`, color: colors.success, sub: 'novos clientes' },
    { label: 'Cancelamentos', value: `-${opData.cancelamentos}`, color: colors.danger, sub: `churn ${opData.churnRate}%` },
    { label: 'Net Adds', value: `${opData.netAdds >= 0 ? '+' : ''}${opData.netAdds}`, color: opData.netAdds >= 0 ? colors.success : colors.danger, sub: 'saldo do mês' },
  ];

  return (
    <div>
      <div style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>⚙️ Operação — {month}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '12px' }}>
        {items.map((item) => (
          <div key={item.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: `4px solid ${item.color}`, borderRadius: '12px', padding: '14px 16px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: item.color, lineHeight: 1.1, marginTop: '4px' }}>{item.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
