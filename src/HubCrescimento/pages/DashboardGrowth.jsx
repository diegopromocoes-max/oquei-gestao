// ============================================================
//  DashboardGrowth.jsx — Hub Crescimento
//  Visao executiva consolidada de ROI, Scores e Insights.
//
//  RF09:   CAC, ROI, Leads Gerados
//  RF09-C: Conversao por Acao (leadsConvertidos / leadsGerados)
//  RF10:   Growth Score (growthEngine)
//  RF11:   Insights automaticos (insightGenerator)
//  DAS:    predictiveMath — pacing linear de fechamento de mes
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import { Card, InfoBox, Badge, moeda, numero } from '../../components/ui';
import { getPlans }            from '../services/planService';
import { getLeadsSummary, getConversionByAction } from '../services/leadService';
import { calculateGrowthScore } from '../core/growthEngine';
import { generateInsights }     from '../core/insightGenerator';
import { calculatePacing, calculatePacingByAction, PACING_STATUS_COLOR, PACING_STATUS_LABEL } from '../core/predictiveMath';
import GrowthScoreCard          from '../components/GrowthScoreCard';
import { db }                   from '../../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// ─── Componente de metrica simples ───────────────────────────────────────────
function Metric({ label, value, sub, accent }) {
  return (
    <div className="hub-metric" style={accent ? { borderLeft: `3px solid var(--color-${accent}, #2563eb)` } : {}}>
      <div className="hub-metric-label">{label}</div>
      <div className="hub-metric-value">{value}</div>
      {sub && <div className="hub-muted" style={{ fontSize: '11px', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

// ─── Barra de pacing visual ───────────────────────────────────────────────────
function PacingBar({ pacing, meta, label }) {
  if (!pacing) return null;
  const { percentRealizado, percentDecorrido, status, projecao, gapPercent } = pacing;
  const barColor = {
    acima:    '#10b981',
    no_ritmo: '#2563eb',
    atencao:  '#f59e0b',
    critico:  '#ef4444',
    inicio:   '#64748b',
  }[status] || '#64748b';

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>{label}</span>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Projecao: <strong style={{ color: barColor }}>{numero(projecao)}</strong> de {numero(meta)}
          {' '}({gapPercent > 0 ? '+' : ''}{gapPercent}%)
        </span>
      </div>

      {/* Trilha dupla: decorrido (fundo) + realizado (frente) */}
      <div style={{ position: 'relative', height: '10px', background: 'var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
        {/* Dias decorridos */}
        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${percentDecorrido}%`, background: 'rgba(100,116,139,0.2)', borderRadius: '8px' }} />
        {/* Realizado */}
        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${Math.min(percentRealizado, 100)}%`, background: barColor, borderRadius: '8px', transition: 'width 0.6s ease' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{percentDecorrido}% do mes decorrido</span>
        <Badge cor={PACING_STATUS_COLOR[status] || 'neutral'} style={{ fontSize: '11px' }}>
          {PACING_STATUS_LABEL[status]}
        </Badge>
      </div>
    </div>
  );
}

// ─── Tabela de conversao por acao (RF09-C) ────────────────────────────────────
function ConversionTable({ data }) {
  const rows = Object.values(data);
  if (rows.length === 0) {
    return <div className="hub-empty">Sem acoes com leads vinculados neste periodo.</div>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ background: 'var(--bg-panel)' }}>
            {['Acao', 'Leads Gerados', 'Convertidos', 'Taxa de Conversao'].map((h) => (
              <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '800', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.planId} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg-panel)' }}>
              <td style={{ padding: '10px 12px', fontWeight: '600', color: 'var(--text-main)', borderBottom: '1px solid var(--border)' }}>
                {row.planName}
              </td>
              <td style={{ padding: '10px 12px', color: 'var(--text-main)', borderBottom: '1px solid var(--border)' }}>
                {row.leadsGerados}
              </td>
              <td style={{ padding: '10px 12px', color: 'var(--text-main)', borderBottom: '1px solid var(--border)' }}>
                {row.leadsConvertidos}
              </td>
              <td style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1, height: '6px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(row.conversionRate, 100)}%`, background: row.conversionRate >= 50 ? '#10b981' : row.conversionRate >= 20 ? '#f59e0b' : '#ef4444', borderRadius: '4px', transition: 'width 0.5s ease' }} />
                  </div>
                  <span style={{ fontWeight: '800', color: 'var(--text-main)', minWidth: '42px', textAlign: 'right' }}>
                    {row.conversionRate}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function DashboardGrowth({ selectedCityId, selectedMonth, selectedGrowthPlan }) {
  const [loading, setLoading] = useState(true);
  const [plans,   setPlans]   = useState([]);
  const [metrics, setMetrics] = useState({
    totalPlans:    0,
    totalCost:     0,
    totalReturn:   0,
    leadsGenerated: 0,
    leadsConverted: 0,
    conversionRate: 0,
    realGrowth:    0,
    progressAvg:   0,
    baseStart:     0,
  });
  const [conversionByAction, setConversionByAction] = useState({});

  // ── Carga de dados ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // 1. Planos do Hub
        const loadedPlans = await getPlans({
          cityId:       selectedCityId,
          month:        selectedMonth,
          growthPlanId: selectedGrowthPlan?.id,
        });
        setPlans(loadedPlans);

        const totalPlans  = loadedPlans.length;
        const totalCost   = loadedPlans.reduce((a, p) => a + Number(p.cost        || 0), 0);
        const totalReturn = loadedPlans.reduce((a, p) => a + Number(p.returnValue || 0), 0);
        const realGrowth  = loadedPlans
          .filter((p) => p.status === 'Finalizada')
          .reduce((a, p) => a + Number(p.actualBaseImpact || 0), 0);
        const progressAvg = totalPlans
          ? Math.round(loadedPlans.reduce((a, p) => a + Number(p.progress || 0), 0) / totalPlans)
          : 0;

        // 2. Base de clientes do mes
        let baseStart = 0;
        if (selectedMonth) {
          const conditions = [where('month', '==', selectedMonth)];
          if (selectedCityId && selectedCityId !== '__all__') {
            conditions.push(where('cityId', '==', selectedCityId));
          }
          const snap = await getDocs(query(collection(db, 'monthly_bases'), ...conditions));
          baseStart  = snap.docs.reduce((a, d) => a + Number(d.data()?.baseStart || 0), 0);
        }

        // 3. Leads via leadService (RF09 + RF09-C)
        const actionIds  = loadedPlans.map((p) => p.id);
        const leadsSummary = await getLeadsSummary({
          cityId:    selectedCityId,
          month:     selectedMonth,
          actionIds,
        });

        // RF09-C: conversao por acao
        const byAction = getConversionByAction(loadedPlans, leadsSummary.leads);
        setConversionByAction(byAction);

        setMetrics({
          totalPlans,
          totalCost,
          totalReturn,
          leadsGenerated: leadsSummary.totalLeads,
          leadsConverted: leadsSummary.convertedLeads,
          conversionRate: leadsSummary.conversionRate,
          realGrowth,
          progressAvg,
          baseStart,
        });
      } catch (err) {
        console.error('DashboardGrowth load error:', err);
        window.showToast?.('Erro ao carregar o dashboard.', 'error');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [selectedCityId, selectedMonth, selectedGrowthPlan?.id]);

  // ── Derivados ──────────────────────────────────────────────────────────────
  const roi = metrics.totalCost > 0
    ? ((metrics.totalReturn - metrics.totalCost) / metrics.totalCost) * 100
    : 0;

  const cac = metrics.leadsGenerated > 0
    ? metrics.totalCost / metrics.leadsGenerated
    : 0;

  const score = useMemo(() => calculateGrowthScore({
    vendasMes:             0,
    metaVendas:            0,
    novosClientes:         metrics.realGrowth,
    baseAnterior:          metrics.baseStart,
    cancelamentos:         0,
    base:                  metrics.baseStart,
    mediaProgressosPlanos: metrics.progressAvg / 100,
  }), [metrics]);

  const insights = useMemo(() => {
    const diasSemLeads = metrics.leadsGenerated === 0 ? 7 : 0;
    return generateInsights({
      cancelamentos:      0,
      mediaUltimos3Meses: 0,
      custo:              metrics.totalCost,
      leadsGenerated:     metrics.leadsGenerated,
      diasSemLeads,
      roi,
    });
  }, [metrics, roi]);

  // Pacing global de leads do mes
  const leadsMeta  = plans.reduce((a, p) => a + Number(p.leadsTarget || 0), 0);
  const pacingGlobal = useMemo(() =>
    leadsMeta > 0
      ? calculatePacing({ realizado: metrics.leadsGenerated, meta: leadsMeta, month: selectedMonth })
      : null,
  [metrics.leadsGenerated, leadsMeta, selectedMonth]);

  // Pacing por acao (para a tabela expandida)
  const plansWithPacing = useMemo(() =>
    calculatePacingByAction(plans, selectedMonth),
  [plans, selectedMonth]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="hub-stack">
        <Card title="Dashboard Growth" subtitle="Carregando indicadores...">
          <div className="hub-empty">Carregando...</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="hub-stack">

      {/* ── KPIs principais ── */}
      <Card title="Indicadores Consolidados" subtitle={`${selectedMonth || 'Periodo'} — ${selectedGrowthPlan?.name || 'Todos os planos'}`}>
        <div className="hub-dashboard-grid">
          <Metric label="Planos"          value={numero(metrics.totalPlans)} />
          <Metric label="Custo total"      value={moeda(metrics.totalCost)} />
          <Metric label="Retorno estimado" value={moeda(metrics.totalReturn)} />
          <Metric
            label="ROI"
            value={`${roi.toFixed(1)}%`}
            accent={roi >= 0 ? 'success' : 'danger'}
          />
          <Metric
            label="CAC"
            value={moeda(cac)}
            sub={metrics.leadsGenerated > 0 ? `${metrics.leadsGenerated} leads gerados` : 'Sem leads'}
          />
          <Metric
            label="Taxa de Conversao Global"
            value={`${metrics.conversionRate}%`}
            sub={`${metrics.leadsConverted} de ${metrics.leadsGenerated} convertidos`}
            accent={metrics.conversionRate >= 50 ? 'success' : metrics.conversionRate >= 20 ? 'warning' : 'danger'}
          />
          <Metric label="Crescimento real" value={`+${numero(metrics.realGrowth)}`} />
          <Metric label="Execucao media"   value={`${metrics.progressAvg}%`} />
        </div>
      </Card>

      {/* ── Pacing de leads ── */}
      {pacingGlobal && (
        <Card title="Pacing de Leads" subtitle="Projecao linear de fechamento do mes">
          <PacingBar
            pacing={pacingGlobal}
            meta={leadsMeta}
            label="Leads gerados vs meta do mes"
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginTop: '16px' }}>
            <Metric label="Ritmo diario"       value={`${pacingGlobal.pacingDiario} leads/dia`} />
            <Metric label="Dias decorridos"    value={`${pacingGlobal.diasElapsed} dias uteis`} />
            <Metric label="Dias restantes"     value={`${pacingGlobal.diasRemaining} dias uteis`} />
            <Metric label="Projecao final"     value={numero(pacingGlobal.projecao)} />
          </div>
        </Card>
      )}

      {/* ── Growth Score ── */}
      <GrowthScoreCard score={score} />

      {/* ── RF09-C: Conversao por Acao ── */}
      <Card
        title="Conversao por Acao"
        subtitle="RF09-C: leads gerados e convertidos por cada plano de acao"
      >
        <ConversionTable data={conversionByAction} />
      </Card>

      {/* ── Insights automaticos ── */}
      <Card title="Insights Automaticos" subtitle="Alertas gerados com base nos indicadores">
        {insights.length === 0 ? (
          <InfoBox type="success">Todos os indicadores dentro do esperado.</InfoBox>
        ) : (
          insights.map((ins, i) => (
            <InfoBox key={i} type={ins.type}>
              <strong>{ins.title}:</strong> {ins.text}
            </InfoBox>
          ))
        )}
      </Card>

    </div>
  );
}