import React from 'react';
import { Eye } from 'lucide-react';
import { Card, colors } from '../../components/ui';

function BarChart({ data, colorFn, total }) {
  if (!data.length) {
    return <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>Sem dados</div>;
  }

  const max = Math.max(...data.map((item) => item.count), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {data.map((item, index) => {
        const pct = Math.round((item.count / max) * 100);
        const distPct = total ? Math.round((item.count / total) * 100) : 0;
        const color = colorFn(item.key, index);
        return (
          <div key={item.key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>{item.key}</span>
              <span style={{ fontSize: '12px', fontWeight: '900', color }}>{item.count} ({distPct}%)</span>
            </div>
            <div style={{ height: '8px', background: 'var(--border)', borderRadius: '20px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '20px', transition: 'width 0.6s ease' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NpsGauge({ nps }) {
  const color = nps >= 70 ? colors.success : nps >= 50 ? colors.primary : nps >= 0 ? colors.warning : colors.danger;
  const label = nps >= 70 ? 'Excelente' : nps >= 50 ? 'Bom' : nps >= 0 ? 'Neutro' : 'Critico';
  const angle = ((nps + 100) / 200) * 180;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ position: 'relative', width: '120px', height: '60px', overflow: 'hidden' }}>
        <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: '12px solid var(--border)', borderBottom: '12px solid transparent', borderLeft: '12px solid transparent', position: 'absolute', top: 0, left: 0, boxSizing: 'border-box' }} />
        <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: `12px solid ${color}`, borderBottom: '12px solid transparent', borderLeft: '12px solid transparent', position: 'absolute', top: 0, left: 0, boxSizing: 'border-box', transform: `rotate(${angle - 180}deg)`, transition: 'transform 0.8s ease', opacity: 0.9 }} />
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
          <div style={{ fontSize: '22px', fontWeight: '900', color, lineHeight: 1 }}>{nps}</div>
        </div>
      </div>
      <div style={{ fontSize: '12px', fontWeight: '800', color, background: `${color}15`, padding: '3px 12px', borderRadius: '20px' }}>{label}</div>
    </div>
  );
}

export default function InsightsQuestionCharts({ loading, analytics, npsColor }) {
  if (loading) {
    return <Card><div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando dados...</div></Card>;
  }

  if (!analytics.questions.length) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <Eye size={32} style={{ opacity: 0.2, marginBottom: '12px' }} />
          <div style={{ fontWeight: '800', marginBottom: '6px' }}>Selecione uma pesquisa especifica</div>
          <div style={{ fontSize: '13px' }}>Escolha uma pesquisa no filtro acima para ver os graficos por pergunta.</div>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
      {analytics.questions.map(({ q, data, nps, avg, total }) => (
        <Card key={q.id} title={q.label} subtitle={`${total || 0} resposta${total !== 1 ? 's' : ''}`}>
          {q.type === 'nps' && nps !== null ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <NpsGauge nps={nps} />
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Media</div>
                  <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-main)' }}>{avg}</div>
                </div>
              </div>
              <BarChart data={data.filter((item) => item.count > 0)} colorFn={(key) => npsColor(Number(key))} total={total} />
            </div>
          ) : (
            <BarChart data={data} colorFn={(_, index) => [colors.primary, colors.success, colors.warning, colors.danger, colors.purple][index % 5]} total={total} />
          )}
        </Card>
      ))}
    </div>
  );
}
