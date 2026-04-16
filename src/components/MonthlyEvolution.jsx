import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, Loader, CalendarRange } from 'lucide-react';

import { loadMonthlySalesScope } from '../services/monthlySalesService';
import {
  buildTrendPresetRange,
  buildMonthlyTrendSeries,
  buildDailyTrendSeries,
} from '../services/salesDashboardModel';

const PRESETS = [
  { key: '6months', label: 'Ultimos 6 meses' },
  { key: '3months', label: 'Ultimos 3 meses' },
  { key: 'week', label: 'Semana anterior' },
  { key: '7workdays', label: 'Ultimos 7 dias uteis' },
  { key: 'custom', label: 'Periodo livre' },
];

function formatMonth(yyyyMm) {
  const [year, month] = yyyyMm.split('-');
  return new Date(Number(year), Number(month) - 1, 1)
    .toLocaleString('pt-BR', { month: 'short', year: '2-digit' })
    .replace('.', '')
    .toUpperCase();
}

function formatDate(yyyyMmDd) {
  const [, month, day] = yyyyMmDd.split('-');
  return `${day}/${month}`;
}

function toDateInputValue(dateValue) {
  return new Date(dateValue || Date.now()).toISOString().slice(0, 10);
}

function buildMonthKeysBetween(startDate, endDate) {
  const startMonth = String(startDate || '').slice(0, 7);
  const endMonth = String(endDate || '').slice(0, 7);
  if (!startMonth || !endMonth) return [];

  const months = [];
  let cursor = startMonth;
  while (cursor <= endMonth) {
    months.push(cursor);
    const [year, month] = cursor.split('-').map(Number);
    const next = new Date(year, month, 1);
    cursor = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
  }
  return months;
}

function formatRangeLabel(startDate, endDate) {
  if (!startDate || !endDate) return 'Periodo personalizado';
  const start = new Date(`${startDate}T12:00:00`).toLocaleDateString('pt-BR');
  const end = new Date(`${endDate}T12:00:00`).toLocaleDateString('pt-BR');
  return `${start} ate ${end}`;
}

function CompactTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={styles.tooltipCard}>
      <div style={styles.tooltipDate}>{label}</div>
      <div style={styles.tooltipRows}>
        {payload.map((item) => (
          <div key={item.dataKey} style={styles.tooltipRow}>
            <span style={styles.tooltipSeries}>
              <span style={{ ...styles.tooltipDot, background: item.stroke || item.color }} />
              {item.name}
            </span>
            <strong style={styles.tooltipValue}>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function useTrendData({ preset, selectedMonth, scope, clusterId, customRange }) {
  const [monthlyData, setMonthlyData] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(false);

  const analysisDate = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (selectedMonth === currentMonth) return new Date();
    const [year, month] = selectedMonth.split('-').map(Number);
    return new Date(year, month, 0);
  }, [selectedMonth]);

  const range = useMemo(() => {
    if (preset === 'custom') {
      return {
        start: customRange.startDate,
        end: customRange.endDate,
        granularity: 'daily',
      };
    }
    return buildTrendPresetRange(preset, analysisDate);
  }, [preset, analysisDate, customRange.startDate, customRange.endDate]);

  useEffect(() => {
    if (!range.start || !range.end || range.start > range.end) {
      setMonthlyData([]);
      setDailyData([]);
      return;
    }

    setLoading(true);
    const months = range.granularity === 'monthly'
      ? buildMonthKeysBetween(`${range.start}-01`, `${range.end}-01`)
      : buildMonthKeysBetween(range.start, range.end);

    Promise.all(
      months.map((monthKey) => loadMonthlySalesScope({
        scope: scope || 'global',
        monthKey,
        clusterId: clusterId || '',
      })),
    )
      .then((payloads) => {
        if (range.granularity === 'monthly') {
          setMonthlyData(buildMonthlyTrendSeries(payloads));
          setDailyData([]);
          return;
        }

        const mergedLeads = payloads
          .flatMap((payload) => payload.officialLeads || payload.leads || [])
          .filter((lead, index, items) => items.findIndex((item) => item.id === lead.id) === index);

        setDailyData(buildDailyTrendSeries(mergedLeads, range));
        setMonthlyData([]);
      })
      .catch(() => {
        setMonthlyData([]);
        setDailyData([]);
      })
      .finally(() => setLoading(false));
  }, [range.granularity, range.start, range.end, scope, clusterId]);

  return { loading, monthlyData, dailyData, range };
}

export default function MonthlyEvolution({
  selectedMonth,
  scope,
  clusterId,
  activeView = 'plans',
}) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const analysisDate = useMemo(() => {
    if (selectedMonth === currentMonth) return new Date();
    const [year, month] = selectedMonth.split('-').map(Number);
    return new Date(year, month, 0);
  }, [currentMonth, selectedMonth]);

  const defaultCustomRange = useMemo(() => ({
    startDate: `${selectedMonth}-01`,
    endDate: toDateInputValue(analysisDate),
  }), [analysisDate, selectedMonth]);

  const [preset, setPreset] = useState('6months');
  const [customRangeDraft, setCustomRangeDraft] = useState(defaultCustomRange);
  const [customRange, setCustomRange] = useState(defaultCustomRange);

  useEffect(() => {
    setCustomRangeDraft(defaultCustomRange);
    setCustomRange(defaultCustomRange);
  }, [defaultCustomRange]);

  const { loading, monthlyData, dailyData, range } = useTrendData({
    preset,
    selectedMonth,
    scope,
    clusterId,
    customRange,
  });

  const isDaily = range.granularity === 'daily';
  const chartData = isDaily ? dailyData : monthlyData;

  const titleByPreset = {
    week: 'Semana anterior',
    '7workdays': 'Ultimos 7 dias uteis',
    custom: formatRangeLabel(customRange.startDate, customRange.endDate),
    '3months': 'Ultimos 3 meses',
    '6months': 'Ultimos 6 meses',
  };

  const subtitleByPreset = {
    week: 'Leitura diaria da semana operacional anterior',
    '7workdays': 'Ultimos sete dias operacionais em linha continua',
    custom: 'Periodo definido no calendario',
    '3months': 'Comparativo mensal consolidado',
    '6months': 'Comparativo mensal consolidado',
  };

  const applyCustomRange = () => {
    if (!customRangeDraft.startDate || !customRangeDraft.endDate) return;
    if (customRangeDraft.startDate > customRangeDraft.endDate) return;
    setCustomRange(customRangeDraft);
    setPreset('custom');
  };

  const series = activeView === 'plans'
    ? [
        { key: 'plans', label: 'Vendas do periodo', stroke: '#6EA8E5', shadow: 'rgba(110,168,229,0.18)' },
        { key: 'installations', label: 'Instalacoes', stroke: '#F0B15D', shadow: 'rgba(240,177,93,0.18)' },
      ]
    : activeView === 'sva'
      ? [{ key: 'sva', label: 'SVA', stroke: '#6EA8E5', shadow: 'rgba(110,168,229,0.18)' }]
      : [{ key: 'migrations', label: 'Migracoes', stroke: '#F0B15D', shadow: 'rgba(240,177,93,0.18)' }];

  const renderChart = () => {
    const xKey = isDaily ? 'date' : 'monthKey';
    const xFormatter = isDaily ? formatDate : formatMonth;

    return (
      <LineChart data={chartData} margin={{ top: 18, right: 14, left: -16, bottom: 4 }}>
        <defs>
          {series.map((item) => (
            <filter id={`shadow-${item.key}`} key={item.key} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor={item.shadow} />
            </filter>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
        <XAxis
          dataKey={xKey}
          tickFormatter={xFormatter}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#7b8698', fontWeight: 700 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#9aa4b2' }}
          allowDecimals={false}
        />
        <RechartsTooltip content={<CompactTooltip />} labelFormatter={xFormatter} cursor={{ stroke: '#d7deea', strokeDasharray: '4 4' }} />
        {series.map((item) => (
          <Line
            key={`${item.key}-shadow`}
            type="monotone"
            dataKey={item.key}
            name={item.label}
            stroke={item.stroke}
            strokeWidth={9}
            strokeOpacity={0.08}
            dot={false}
            activeDot={false}
            filter={`url(#shadow-${item.key})`}
          />
        ))}
        {series.map((item) => (
          <Line
            key={item.key}
            type="monotone"
            dataKey={item.key}
            name={item.label}
            stroke={item.stroke}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5, stroke: item.stroke, strokeWidth: 2, fill: '#ffffff' }}
          />
        ))}
      </LineChart>
    );
  };

  return (
    <div id="evolucao-mensal" style={{ marginBottom: '40px' }}>
      <h3 style={styles.mainSectionTitle}>
        <TrendingUp size={24} color="#059669" /> Evolucao Temporal
      </h3>
      <div style={styles.chartCard}>
        <div style={styles.chartHeader}>
          <div>
            <h3 style={styles.chartTitle}>{titleByPreset[preset] || 'Evolucao Temporal'}</h3>
            <p style={styles.chartSubtitle}>{subtitleByPreset[preset] || 'Comparativo temporal do painel'}</p>
          </div>
          <div style={styles.headerControls}>
            <div style={styles.presetGroup}>
              {PRESETS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setPreset(item.key)}
                  style={{
                    ...styles.presetButton,
                    background: preset === item.key ? '#0f172a' : '#f5f7fb',
                    color: preset === item.key ? '#ffffff' : '#667085',
                    boxShadow: preset === item.key ? '0 8px 20px rgba(15,23,42,0.14)' : 'none',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div style={styles.calendarInline}>
              <CalendarRange size={14} color="#64748b" />
              <input
                type="date"
                value={customRangeDraft.startDate}
                onChange={(event) => setCustomRangeDraft((current) => ({ ...current, startDate: event.target.value }))}
                style={styles.dateInput}
                aria-label="Data inicial"
              />
              <span style={styles.dateDivider}>ate</span>
              <input
                type="date"
                value={customRangeDraft.endDate}
                onChange={(event) => setCustomRangeDraft((current) => ({ ...current, endDate: event.target.value }))}
                style={styles.dateInput}
                aria-label="Data final"
              />
              <button
                onClick={applyCustomRange}
                disabled={!customRangeDraft.startDate || !customRangeDraft.endDate || customRangeDraft.startDate > customRangeDraft.endDate}
                style={{
                  ...styles.applyButton,
                  opacity: !customRangeDraft.startDate || !customRangeDraft.endDate || customRangeDraft.startDate > customRangeDraft.endDate ? 0.55 : 1,
                  cursor: !customRangeDraft.startDate || !customRangeDraft.endDate || customRangeDraft.startDate > customRangeDraft.endDate ? 'not-allowed' : 'pointer',
                }}
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <div style={{ height: '320px', width: '100%', minWidth: 0, position: 'relative' }}>
          {loading && (
            <div style={styles.loadingBox}>
              <Loader size={22} style={{ animation: 'spin 1s linear infinite' }} color="#3b82f6" />
              <span style={{ color: '#64748b', fontSize: '13px' }}>Carregando historico...</span>
            </div>
          )}
          {!loading && chartData.length === 0 && (
            <div style={styles.empty}>Nenhum dado encontrado para este periodo.</div>
          )}
          {!loading && chartData.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  mainSectionTitle: { fontSize: '20px', fontWeight: '900', color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  chartCard: { background: 'linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%)', padding: '28px', borderRadius: '28px', border: '1px solid #e7ebf2', boxShadow: '0 16px 36px rgba(15,23,42,0.04)' },
  chartHeader: { marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' },
  chartTitle: { fontSize: '19px', fontWeight: '900', color: '#111827', margin: 0 },
  chartSubtitle: { fontSize: '11px', color: '#7b8698', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '6px 0 0' },
  headerControls: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' },
  presetGroup: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' },
  presetButton: { border: 'none', borderRadius: '999px', padding: '8px 14px', fontSize: '12px', fontWeight: '800', transition: 'all 0.2s ease', whiteSpace: 'nowrap' },
  calendarInline: { display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '999px', padding: '6px 8px 6px 10px', flexWrap: 'wrap' },
  dateInput: { border: 'none', background: 'transparent', color: '#0f172a', fontSize: '12px', fontWeight: '700', outline: 'none' },
  dateDivider: { fontSize: '11px', color: '#64748b', fontWeight: '700' },
  applyButton: { border: 'none', borderRadius: '999px', padding: '8px 12px', fontSize: '11px', fontWeight: '900', color: '#ffffff', background: '#2563eb' },
  tooltipCard: { minWidth: '188px', background: '#0f172a', color: '#ffffff', borderRadius: '18px', padding: '16px 18px', boxShadow: '0 20px 40px rgba(15,23,42,0.25)' },
  tooltipDate: { fontSize: '13px', fontWeight: '900', marginBottom: '12px' },
  tooltipRows: { display: 'grid', gap: '8px' },
  tooltipRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' },
  tooltipSeries: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#d3d9e3', fontWeight: '700' },
  tooltipDot: { width: '4px', height: '18px', borderRadius: '999px' },
  tooltipValue: { fontSize: '13px', fontWeight: '900', color: '#ffffff' },
  loadingBox: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  empty: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#94a3b8', fontWeight: 'bold' },
};
