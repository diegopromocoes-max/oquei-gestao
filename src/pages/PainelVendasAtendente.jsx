import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  Gauge,
  PieChart as PieChartIcon,
  Target,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { collection, getDocs } from 'firebase/firestore';

import { db } from '../firebase';
import { Card, DataTable, Empty, InfoBox, KpiCard, Page, colors, moeda, styles as uiStyles } from '../components/ui';
import { listenAttendantLeadsByMonth } from '../services/atendenteAnalyticsService';
import { listenMetaIndividualAtendente } from '../services/metas';

const STATUS_PALETTE = {
  'Em negociacao': '#f97316',
  Contratado: colors.primary,
  Instalado: colors.success,
  Descartado: colors.danger,
  Outro: colors.neutral,
};

const MIX_COLORS = [colors.primary, colors.warning, colors.purple];

function buildSummaryEntries(summary = {}) {
  return Object.entries(summary).map(([name, value]) => ({
    name,
    value,
    fill: STATUS_PALETTE[name] || colors.neutral,
  }));
}

function buildDiscardChartData(summary = {}) {
  return Object.entries(summary)
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value);
}

function buildMixChartData(summary) {
  return [
    { name: 'Planos', value: summary.planos, color: MIX_COLORS[0] },
    { name: 'Migracoes', value: summary.migracoes, color: MIX_COLORS[1] },
    { name: 'SVA', value: summary.svas, color: MIX_COLORS[2] },
  ].filter((item) => item.value > 0);
}

function buildStatusPulseData(summary = {}) {
  return Object.entries(summary).map(([name, value]) => ({
    name,
    total: value,
  }));
}

function trimLabel(value, max = 22) {
  const safe = String(value || '');
  return safe.length > max ? `${safe.slice(0, max - 1)}…` : safe;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isBusinessHoliday(holiday = {}, cityId = '') {
  if (!holiday?.date) return false;
  if (holiday.type === 'company' || holiday.type === 'national') return true;
  return String(holiday.storeId || holiday.cityId || '') === String(cityId || '');
}

function buildWorkingDays(monthKey, holidays = [], cityId = '') {
  const [year, month] = String(monthKey || '').split('-').map(Number);
  if (!year || !month) return [];

  const lastDay = new Date(year, month, 0).getDate();
  const days = [];

  for (let day = 1; day <= lastDay; day += 1) {
    const current = new Date(year, month - 1, day);
    const weekDay = current.getDay();
    if (weekDay === 0 || weekDay === 6) continue;

    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const hasHoliday = holidays.some((holiday) => holiday.date === dateKey && isBusinessHoliday(holiday, cityId));
    if (hasHoliday) continue;

    days.push({
      date: dateKey,
      label: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`,
    });
  }

  return days;
}

function buildGoalProjectionData({ monthKey, goal, leads = [], holidays = [], cityId = '' }) {
  const workingDays = buildWorkingDays(monthKey, holidays, cityId);
  const plansTarget = toNumber(goal?.plansTarget);
  const salesByDate = leads.reduce((accumulator, lead) => {
    const isPlanSale = (lead?.status === 'Contratado' || lead?.status === 'Instalado') && lead?.leadType === 'Plano Novo';
    if (!isPlanSale) return accumulator;
    const dateKey = String(lead?.date || '').slice(0, 10);
    if (!dateKey) return accumulator;
    accumulator[dateKey] = (accumulator[dateKey] || 0) + 1;
    return accumulator;
  }, {});

  let cumulativeReal = 0;
  return workingDays.map((item, index) => {
    cumulativeReal += toNumber(salesByDate[item.date]);
    return {
      date: item.date,
      label: item.label,
      ideal: workingDays.length ? Number((((index + 1) / workingDays.length) * plansTarget).toFixed(1)) : 0,
      real: cumulativeReal,
    };
  });
}

function GoalGaugeCard({ current = 0, target = 0, title, subtitle, accent = colors.primary }) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const radius = 74;
  const circumference = Math.PI * radius;
  const dashOffset = circumference - ((percentage / 100) * circumference);

  return (
    <Card
      title={title}
      subtitle={subtitle}
      style={{
        background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.94))',
        color: '#fff',
        borderColor: 'rgba(148,163,184,0.18)',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'grid', gap: '18px', justifyItems: 'center' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '280px', height: '168px' }}>
          <svg viewBox="0 0 220 130" style={{ width: '100%', height: '100%' }}>
            <path d="M 30 110 A 80 80 0 0 1 190 110" fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="16" strokeLinecap="round" />
            <path
              d="M 30 110 A 80 80 0 0 1 190 110"
              fill="none"
              stroke={accent}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', paddingTop: '32px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '34px', fontWeight: 900, letterSpacing: '-0.04em' }}>{current}</div>
              <div style={{ marginTop: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800 }}>
                Meta {target}
              </div>
            </div>
          </div>
        </div>

        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={local.darkMetricBox}>
            <div style={local.darkMetricLabel}>Alcance</div>
            <div style={{ ...local.darkMetricValue, color: accent }}>{percentage.toFixed(1)}%</div>
          </div>
          <div style={local.darkMetricBox}>
            <div style={local.darkMetricLabel}>Gap</div>
            <div style={local.darkMetricValue}>{Math.max(target - current, 0)}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function TechTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'rgba(15,23,42,0.94)',
        color: '#fff',
        padding: '12px 14px',
        borderRadius: '14px',
        boxShadow: '0 18px 38px rgba(15,23,42,0.22)',
        border: '1px solid rgba(255,255,255,0.08)',
        minWidth: '160px',
      }}
    >
      <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.72 }}>
        {label || payload[0]?.name}
      </div>
      <div style={{ marginTop: '6px', fontSize: '18px', fontWeight: 900 }}>
        {payload[0]?.value ?? 0}
      </div>
    </div>
  );
}

function PulseMetric({ icon, label, value, accent, helper }) {
  return (
    <div
      style={{
        padding: '16px 18px',
        borderRadius: '18px',
        border: '1px solid var(--border)',
        background: 'linear-gradient(135deg, rgba(15,23,42,0.02), rgba(37,99,235,0.03))',
        display: 'grid',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: accent }}>
        {icon}
        <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      </div>
      <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-main)' }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{helper}</div>
    </div>
  );
}

function ChartCanvas({ height = 320, children }) {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height });

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const updateSize = () => {
      const nextWidth = Math.max(0, Math.floor(element.clientWidth || 0));
      const nextHeight = Math.max(height, Math.floor(element.clientHeight || height));
      setSize((current) => (
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight }
      ));
    };

    updateSize();

    let observer = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        window.requestAnimationFrame(updateSize);
      });
      observer.observe(element);
    } else {
      window.addEventListener('resize', updateSize);
    }

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [height]);

  return (
    <div ref={ref} style={{ width: '100%', minWidth: 0, height, minHeight: height }}>
      {size.width > 40 ? children(size) : null}
    </div>
  );
}

export default function PainelVendasAtendente({ userData }) {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [leads, setLeads] = useState([]);
  const [summary, setSummary] = useState({
    totalLeads: 0,
    totalSales: 0,
    totalDiscarded: 0,
    totalInstalled: 0,
    conversionRate: 0,
    averageTicket: 0,
    totalValue: 0,
    planos: 0,
    migracoes: 0,
    svas: 0,
    statusSummary: {},
    discardReasonSummary: {},
    topDiscardReason: '',
    recentLeads: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [goal, setGoal] = useState(null);
  const [goalLoading, setGoalLoading] = useState(true);
  const [goalError, setGoalError] = useState('');
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    if (!userData?.uid) {
      setLeads([]);
      setSummary((current) => ({ ...current, recentLeads: [] }));
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError('');

    return listenAttendantLeadsByMonth(
      userData.uid,
      selectedMonth,
      (nextLeads, nextSummary) => {
        setLeads(nextLeads);
        setSummary(nextSummary);
        setLoading(false);
      },
      () => {
        setError('Nao foi possivel carregar os graficos deste periodo.');
        setLoading(false);
      },
    );
  }, [selectedMonth, userData?.uid]);

  useEffect(() => {
    let active = true;

    if (!userData?.uid) {
      setGoal(null);
      setGoalLoading(false);
      setGoalError('');
      setHolidays([]);
      return undefined;
    }

    setGoalLoading(true);
    setGoalError('');

    const unsubscribeGoal = listenMetaIndividualAtendente(
      userData.uid,
      selectedMonth,
      (nextGoal) => {
        if (!active) return;
        setGoal(nextGoal);
        setGoalLoading(false);
      },
      (firebaseError) => {
        if (!active) return;
        setGoal(null);
        setGoalLoading(false);
        setGoalError(firebaseError?.code === 'permission-denied' ? 'Sem permissao para consultar sua meta individual.' : 'Nao foi possivel carregar a meta individual.');
      },
    );

    getDocs(collection(db, 'holidays'))
      .then((snapshot) => {
        if (!active) return;
        setHolidays(snapshot.docs.map((document) => ({ id: document.id, ...document.data() })));
      })
      .catch((firebaseError) => {
        if (!active) return;
        console.warn('Nao foi possivel carregar os feriados da loja:', firebaseError);
        setHolidays([]);
      });

    return () => {
      active = false;
      unsubscribeGoal?.();
    };
  }, [selectedMonth, userData?.uid]);

  const statusChartData = useMemo(() => buildSummaryEntries(summary.statusSummary), [summary.statusSummary]);
  const discardReasonData = useMemo(() => buildDiscardChartData(summary.discardReasonSummary), [summary.discardReasonSummary]);
  const mixChartData = useMemo(() => buildMixChartData(summary), [summary]);
  const pulseData = useMemo(() => buildStatusPulseData(summary.statusSummary), [summary.statusSummary]);
  const discardHighlights = useMemo(() => discardReasonData.slice(0, 4), [discardReasonData]);
  const projectionData = useMemo(
    () => buildGoalProjectionData({
      monthKey: selectedMonth,
      goal,
      leads,
      holidays,
      cityId: goal?.cityId || userData?.cityId || '',
    }),
    [selectedMonth, goal, leads, holidays, userData?.cityId],
  );
  const plansTarget = toNumber(goal?.plansTarget);
  const svaTarget = toNumber(goal?.svaTarget);
  const plansReachedPercent = plansTarget > 0 ? Number(((summary.planos / plansTarget) * 100).toFixed(1)) : 0;

  const columns = useMemo(
    () => [
      {
        key: 'customerName',
        label: 'Cliente',
        render: (value, row) => (
          <div>
            <strong>{value || 'Cliente sem nome'}</strong>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{row.customerPhone || 'Sem telefone'}</div>
          </div>
        ),
      },
      {
        key: 'date',
        label: 'Data',
        render: (value) => (value ? value.split('-').reverse().join('/') : '-'),
      },
      {
        key: 'productName',
        label: 'Produto',
        render: (value, row) => (
          <div>
            <div>{value || 'Produto nao informado'}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{row.categoryName || row.leadType || 'Sem categoria'}</div>
          </div>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        render: (value) => (
          <span style={{ color: STATUS_PALETTE[value] || colors.neutral, fontWeight: 900 }}>
            {value || 'Em negociacao'}
          </span>
        ),
      },
      {
        key: 'productPrice',
        label: 'Valor',
        render: (value) => moeda(value || 0),
      },
    ],
    [],
  );

  return (
    <Page
      title="Meus Graficos"
      subtitle="Uma leitura mais executiva do seu funil, do valor gerado e dos gargalos que travam suas conversoes."
      actions={(
        <input
          type="month"
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
          style={{ minWidth: '180px', ...uiStyles.input }}
        />
      )}
    >
      {error && (
        <InfoBox type="danger">{error}</InfoBox>
      )}
      {goalError && (
        <InfoBox type="warning">{goalError}</InfoBox>
      )}
      {goal?.distributionStatus === 'stale' && (
        <InfoBox type="warning">
          Sua meta individual esta marcada como pendente de redistribuicao. Os indicadores abaixo mostram a ultima meta registrada para voce.
        </InfoBox>
      )}

      <Card
        size="lg"
        style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.96))',
          color: '#fff',
          borderColor: 'rgba(148,163,184,0.18)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap' }}>
          <div style={{ display: 'grid', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.74)', fontWeight: 800 }}>
              <Activity size={16} />
              Intelligence Layer do Atendente
            </div>
            <div style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.04em' }}>
              {summary.totalLeads} leads monitorados no periodo
            </div>
            <div style={{ maxWidth: '700px', fontSize: '14px', lineHeight: 1.6, color: 'rgba(255,255,255,0.76)' }}>
              O painel cruza volume, conversao, valor e perdas para te mostrar onde voce esta performando bem e onde o funil esta vazando.
            </div>
          </div>

          <div style={{ display: 'grid', gap: '12px', minWidth: '260px' }}>
            <div style={{ padding: '14px 16px', borderRadius: '18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.62)' }}>
                Conversao
              </div>
              <div style={{ marginTop: '6px', fontSize: '28px', fontWeight: 900 }}>{summary.conversionRate}%</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.76)', fontSize: '13px', fontWeight: 700 }}>
              <ArrowUpRight size={15} />
              Ticket medio de {moeda(summary.averageTicket)}
            </div>
          </div>
        </div>
      </Card>

      <div style={uiStyles.grid2}>
        <GoalGaugeCard
          current={summary.planos}
          target={plansTarget}
          title="Meta de planos"
          subtitle={goalLoading ? 'Carregando sua meta individual...' : 'Velocimetro da sua meta mensal de planos'}
          accent={colors.primary}
        />

        <Card
          title="Meta, SVA e pacing diario"
          subtitle="Comparativo entre o ritmo ideal do mes e o acumulado real em dias uteis da loja"
          style={{
            background: 'linear-gradient(135deg, rgba(37,99,235,0.05), rgba(124,58,237,0.05))',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <PulseMetric
              icon={<Gauge size={16} />}
              label="% da meta"
              value={`${plansReachedPercent}%`}
              accent={colors.primary}
              helper={plansTarget > 0 ? `${summary.planos} de ${plansTarget} planos fechados` : 'Cadastre ou distribua a meta individual para acompanhar o alcance'}
            />
            <PulseMetric
              icon={<TrendingUp size={16} />}
              label="Meta SVA"
              value={`${summary.svas}/${svaTarget || 0}`}
              accent={colors.purple}
              helper={svaTarget > 0 ? `Meta sugerida de SVA baseada em 40% da meta de planos` : 'Sem meta SVA disponivel para este periodo'}
            />
          </div>

          {goalLoading ? (
            <div style={{ padding: '42px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando curva de meta...</div>
          ) : projectionData.length === 0 ? (
            <Empty icon="..." title="Sem base para projeção" description="Assim que houver meta individual e dias uteis no mes, a linha ideal aparece aqui." />
          ) : (
            <ChartCanvas height={290}>
              {({ width, height }) => (
                <LineChart width={width} height={height} data={projectionData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(148,163,184,0.22)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip content={<TechTooltip />} />
                  <Line type="monotone" dataKey="ideal" name="Ideal" stroke={colors.primary} strokeWidth={3} dot={false} strokeDasharray="6 6" />
                  <Line type="monotone" dataKey="real" name="Real" stroke={colors.success} strokeWidth={3} dot={{ r: 3, strokeWidth: 0 }} />
                </LineChart>
              )}
            </ChartCanvas>
          )}
        </Card>
      </div>

      <div style={uiStyles.grid4}>
        <KpiCard label="Leads" valor={summary.totalLeads} icon={<Users size={16} />} accent={colors.primary} />
        <KpiCard label="Vendas" valor={summary.totalSales} icon={<Target size={16} />} accent={colors.success} />
        <KpiCard label="Descartados" valor={summary.totalDiscarded} icon={<XCircle size={16} />} accent={colors.danger} />
        <KpiCard label="Valor fechado" valor={moeda(summary.totalValue)} icon={<DollarSign size={16} />} accent={colors.purple} />
      </div>

      <div style={uiStyles.grid2}>
        <Card
          title="Status do funil"
          subtitle="Leitura atual da distribuicao do seu pipeline neste mes"
          style={{
            background: 'linear-gradient(135deg, rgba(37,99,235,0.05), rgba(15,23,42,0.03))',
            minWidth: 0,
          }}
        >
          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando funil...</div>
          ) : statusChartData.length === 0 ? (
            <Empty icon="..." title="Sem leads neste periodo" description="Quando novos leads entrarem, o funil aparece aqui." />
          ) : (
            <ChartCanvas height={310}>
              {({ width, height }) => (
                <AreaChart width={width} height={height} data={statusChartData} margin={{ top: 12, right: 10, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="oqueiStatusFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.primary} stopOpacity={0.34} />
                      <stop offset="95%" stopColor={colors.primary} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(148,163,184,0.24)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip content={<TechTooltip />} />
                  <Area type="monotone" dataKey="value" stroke={colors.primary} strokeWidth={3} fill="url(#oqueiStatusFill)" />
                </AreaChart>
              )}
            </ChartCanvas>
          )}
        </Card>

        <Card
          title="Mix comercial"
          subtitle="Composicao das vendas convertidas"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.05), rgba(15,23,42,0.03))',
            minWidth: 0,
          }}
        >
          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Calculando mix...</div>
          ) : mixChartData.length === 0 ? (
            <Empty icon="..." title="Sem vendas fechadas" description="Quando houver contratos e instalacoes, o mix aparece aqui." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 220px', gap: '12px', alignItems: 'center', minWidth: 0 }}>
              <div style={{ height: '300px', position: 'relative', width: '100%', minWidth: 0 }}>
                <ChartCanvas height={300}>
                  {({ width, height }) => {
                    const radiusBase = Math.max(70, Math.min(width, height) / 2 - 22);
                    return (
                      <PieChart width={width} height={height}>
                    <Pie
                      data={mixChartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={Math.max(52, radiusBase - 32)}
                      outerRadius={radiusBase}
                      paddingAngle={3}
                      stroke="transparent"
                    >
                      {mixChartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip content={<TechTooltip />} />
                      </PieChart>
                    );
                  }}
                </ChartCanvas>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fechados</div>
                    <div style={{ marginTop: '6px', fontSize: '28px', fontWeight: 900, color: 'var(--text-main)' }}>{summary.totalSales}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '10px' }}>
                {mixChartData.map((item) => (
                  <div key={item.name} style={{ padding: '12px 14px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-app)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, color: 'var(--text-main)' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '999px', background: item.color }} />
                      {item.name}
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '24px', fontWeight: 900, color: 'var(--text-main)' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <div style={uiStyles.grid2}>
        <Card
          title="Descartes por motivo"
          subtitle="Principais barreiras que estao travando a conversao e onde vale agir primeiro"
          style={{
            minWidth: 0,
            background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.96))',
            color: '#fff',
            borderColor: 'rgba(148,163,184,0.18)',
          }}
        >
          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando descartes...</div>
          ) : discardReasonData.length === 0 ? (
            <Empty icon="..." title="Sem descartes com motivo neste periodo" description="Quando houver perdas com motivo informado, a analise aparece aqui." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(220px, 0.65fr)', gap: '16px', minWidth: 0 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ padding: '14px 16px', borderRadius: '18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.62)' }}>Descartes no mes</div>
                    <div style={{ marginTop: '6px', fontSize: '24px', fontWeight: 900 }}>{summary.totalDiscarded}</div>
                  </div>
                  <div style={{ padding: '14px 16px', borderRadius: '18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.62)' }}>Principal motivo</div>
                    <div style={{ marginTop: '6px', fontSize: '16px', fontWeight: 900, lineHeight: 1.4 }}>{summary.topDiscardReason || '-'}</div>
                  </div>
                </div>

                <ChartCanvas height={320}>
                  {({ width, height }) => (
                    <BarChart width={width} height={height} data={discardReasonData} layout="vertical" margin={{ left: 8, right: 10, top: 6, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="rgba(148,163,184,0.18)" />
                  <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.62)', fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" width={156} axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.78)', fontSize: 12 }} tickFormatter={(value) => trimLabel(value, 20)} />
                  <Tooltip content={<TechTooltip />} />
                  <Bar dataKey="value" radius={[0, 10, 10, 0]}>
                    {discardReasonData.map((entry, index) => (
                      <Cell key={entry.name} fill={[colors.danger, '#fb7185', colors.warning, colors.primary, colors.purple][index % 5]} />
                    ))}
                  </Bar>
                    </BarChart>
                  )}
                </ChartCanvas>
              </div>

              <div style={{ display: 'grid', gap: '10px' }}>
                {discardHighlights.map((item, index) => (
                  <div key={item.name} style={{ padding: '14px 16px', borderRadius: '18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', display: 'grid', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontWeight: 800 }}>
                        #{index + 1} motivo
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 900, color: [colors.danger, '#fb7185', colors.warning, colors.primary][index % 4] }}>
                        {item.value} lead{item.value > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 900, lineHeight: 1.45 }}>
                      {item.name}
                    </div>
                    <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${summary.totalDiscarded > 0 ? Math.max(8, (item.value / summary.totalDiscarded) * 100) : 0}%`,
                          height: '100%',
                          borderRadius: '999px',
                          background: [colors.danger, '#fb7185', colors.warning, colors.primary][index % 4],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card title="Pulso do periodo" subtitle="Atalhos executivos para leitura rapida do seu mes" style={{ minWidth: 0 }}>
          <div style={{ display: 'grid', gap: '12px' }}>
            <PulseMetric
              icon={<TrendingUp size={16} />}
              label="Conversao"
              value={`${summary.conversionRate}%`}
              accent={colors.success}
              helper="Quanto do seu pipeline virou resultado concreto neste periodo."
            />
            <PulseMetric
              icon={<PieChartIcon size={16} />}
              label="Motivo lider"
              value={summary.topDiscardReason || '-'}
              accent={colors.warning}
              helper="O principal bloqueio de venda registrado nos seus descartes."
            />
            <PulseMetric
              icon={<CheckCircle2 size={16} />}
              label="Instalados"
              value={summary.totalInstalled}
              accent={colors.primary}
              helper="Leads que ja chegaram na camada mais forte do fechamento."
            />
          </div>

          {pulseData.length > 0 && (
            <div style={{ marginTop: '18px', display: 'grid', gap: '10px' }}>
              {pulseData.map((item) => (
                <div key={item.name} style={{ display: 'grid', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '13px' }}>
                    <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{item.name}</span>
                    <span style={{ fontWeight: 900, color: STATUS_PALETTE[item.name] || colors.neutral }}>{item.total}</span>
                  </div>
                  <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(148,163,184,0.14)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${summary.totalLeads > 0 ? Math.max(6, (item.total / summary.totalLeads) * 100) : 0}%`,
                        height: '100%',
                        borderRadius: '999px',
                        background: STATUS_PALETTE[item.name] || colors.neutral,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="Leads recentes" subtitle={`Registros do periodo ${selectedMonth}`}>
        <DataTable columns={columns} data={summary.recentLeads} loading={loading} emptyMsg="Nenhum lead encontrado para este periodo." />
      </Card>

      {!loading && leads.length === 0 && !error && (
        <Card>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Este modulo considera apenas os seus leads do mes selecionado. Conforme novos registros entram, os indicadores se atualizam em tempo real.
          </p>
        </Card>
      )}
    </Page>
  );
}

const local = {
  darkMetricBox: {
    flex: '1 1 120px',
    padding: '12px 14px',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  darkMetricLabel: {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'rgba(255,255,255,0.62)',
    fontWeight: 800,
  },
  darkMetricValue: {
    marginTop: '6px',
    fontSize: '24px',
    fontWeight: 900,
    color: '#fff',
  },
};
