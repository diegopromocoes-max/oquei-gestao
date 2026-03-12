import React, { useMemo } from 'react';
import { DollarSign, TrendingUp, Target, BarChart2, AlertCircle, Star, Ban } from 'lucide-react';
import { Card, colors } from '../components/ui';

export default function DashboardPatrocinios({ sponsorships }) {
  const kpis = useMemo(() => {
    const finished = sponsorships.filter(s => s.status === 'Finalizado' && s.evaluation);
    const rejected = sponsorships.filter(s => s.status === 'Recusado');
    
    let totalInvested = 0; let totalSales = 0; let totalLeads = 0; let sumRating = 0;

    finished.forEach(s => {
      // 🚀 Usa o valor APROVADO se existir, senão usa o solicitado
      const eventCost = Number(s.approvedValue || s.investmentValue || 0) + Number(s.evaluation?.internetCourtesyValue || 0);
      totalInvested += eventCost;
      totalSales += Number(s.evaluation?.salesClosed || 0);
      totalLeads += Number(s.evaluation?.leadsGenerated || 0);
      sumRating += Number(s.evaluation?.rating || 0);
    });

    const cac = totalSales > 0 ? totalInvested / totalSales : 0;
    const avgRating = finished.length > 0 ? (sumRating / finished.length).toFixed(1) : 0;

    const rankedEvents = finished.map(s => {
      const cost = Number(s.approvedValue || s.investmentValue || 0) + Number(s.evaluation?.internetCourtesyValue || 0);
      const sales = Number(s.evaluation?.salesClosed || 0);
      return { ...s, cost, sales, cpv: sales > 0 ? cost / sales : cost }; 
    }).sort((a, b) => a.cpv - b.cpv); 

    // Agrupa os motivos de recusa
    const rejectReasonsCount = {};
    rejected.forEach(r => {
      const reason = r.rejectionReason || 'Outros';
      rejectReasonsCount[reason] = (rejectReasonsCount[reason] || 0) + 1;
    });

    return { totalInvested, totalSales, totalLeads, cac, avgRating, rankedEvents, totalEvents: finished.length, rejectedCount: rejected.length, rejectReasonsCount };
  }, [sponsorships]);

  if (kpis.totalEvents === 0 && kpis.rejectedCount === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
        <BarChart2 size={48} style={{ opacity: 0.2, marginBottom: '15px' }} />
        <h3 style={{ fontSize: '16px', fontWeight: '900' }}>Dashboard Vazio</h3>
        <p style={{ fontSize: '13px' }}>Nenhum dado de patrocínio executado ou recusado para gerar inteligência.</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      {/* 🚀 KPIs PRINCIPAIS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <Card style={{ padding: '24px', borderLeft: `4px solid ${colors.primary}` }}>
          <div style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Total Investido (Executado)</div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}><DollarSign size={24} color={colors.primary} />R$ {kpis.totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </Card>

        <Card style={{ padding: '24px', borderLeft: `4px solid ${colors.success}` }}>
          <div style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Vendas Geradas (ROI)</div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}><TrendingUp size={24} color={colors.success} />{kpis.totalSales}</div>
        </Card>

        <Card style={{ padding: '24px', borderLeft: `4px solid ${colors.warning}` }}>
          <div style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Custo Médio de Aquisição (CAC)</div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}><Target size={24} color={colors.warning} />R$ {kpis.cac.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        
        {/* TOP EVENTOS */}
        <Card style={{ padding: '25px' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}><TrendingUp size={20} color={colors.success} /> Ranking: Maior Retorno (Top 3)</h3>
          {kpis.rankedEvents.length === 0 ? <p style={{fontSize:'12px', color:'var(--text-muted)'}}>Sem eventos avaliados.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {kpis.rankedEvents.slice(0, 3).map((ev, i) => (
                <div key={ev.id} style={{ background: 'var(--bg-app)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}><div style={{ fontSize: '13px', fontWeight: '900', color: 'var(--text-main)' }}>{i + 1}º {ev.eventName}</div><div style={{ fontSize: '12px', fontWeight: '900', color: colors.success }}>{ev.sales} vendas</div></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800' }}><span>Investido: R$ {ev.cost.toLocaleString('pt-BR')}</span><span>CAC: R$ {ev.cpv.toLocaleString('pt-BR')}</span></div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 🚀 MOTIVOS DE RECUSA (O novo dado estratégico) */}
        <Card style={{ padding: '25px', borderTop: `4px solid ${colors.danger}` }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Ban size={20} color={colors.danger} /> Diagnóstico de Recusas ({kpis.rejectedCount})
          </h3>
          {kpis.rejectedCount === 0 ? <p style={{fontSize:'12px', color:'var(--text-muted)'}}>Nenhum patrocínio foi recusado.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(kpis.rejectReasonsCount).sort((a,b) => b[1] - a[1]).map(([reason, count]) => {
                const percent = ((count / kpis.rejectedCount) * 100).toFixed(0);
                return (
                  <div key={reason} style={{ background: 'var(--bg-app)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', fontWeight: '800', color: 'var(--text-main)' }}>
                      <span>{reason}</span> <span>{count} ({percent}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--bg-card)', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ width: `${percent}%`, height: '100%', background: colors.danger, borderRadius: '10px' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}