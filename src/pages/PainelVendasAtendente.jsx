import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  DollarSign,
  PieChart as PieChartIcon,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Badge, Card, DataTable, Empty, KpiCard, Page, colors, moeda, styles as uiStyles } from '../components/ui';
import { listenAttendantLeadsByMonth } from '../services/atendenteAnalyticsService';

const CHART_COLORS = [colors.primary, colors.success, colors.warning, colors.purple, colors.info, colors.danger];

function buildStatusChartData(statusSummary = {}) {
  return Object.entries(statusSummary).map(([name, value]) => ({ name, value }));
}

function buildMixChartData(summary) {
  return [
    { name: 'Planos', value: summary.planos, color: colors.primary },
    { name: 'Migrações', value: summary.migracoes, color: colors.warning },
    { name: 'SVA', value: summary.svas, color: colors.purple },
  ].filter((item) => item.value > 0);
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
    recentLeads: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      (serviceError) => {
        console.error('Erro ao carregar analytics do atendente:', serviceError);
        setError('Nao foi possivel carregar os graficos deste periodo.');
        setLoading(false);
      },
    );
  }, [selectedMonth, userData?.uid]);

  const statusChartData = useMemo(() => buildStatusChartData(summary.statusSummary), [summary.statusSummary]);
  const mixChartData = useMemo(() => buildMixChartData(summary), [summary]);

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
        render: (value) => (value ? value.split('-').reverse().join('/') : '—'),
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
        render: (value) => <Badge status={value || 'Em negociação'} />,
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
      subtitle="Analytics do seu funil e da sua conversao no periodo selecionado."
      actions={
        <input
          type="month"
          value={selectedMonth}
          onChange={(event) => setSelectedMonth(event.target.value)}
          style={{ minWidth: '180px', ...uiStyles.input }}
        />
      }
    >
      {error && (
        <Card accent={colors.warning}>
          <p style={{ margin: 0, color: colors.warning, fontWeight: 800 }}>{error}</p>
        </Card>
      )}

      <div style={uiStyles.grid4}>
        <KpiCard label="Leads" valor={summary.totalLeads} icon={<Users size={16} />} accent={colors.primary} />
        <KpiCard label="Vendas" valor={summary.totalSales} icon={<Target size={16} />} accent={colors.success} />
        <KpiCard
          label="Conversao"
          valor={`${summary.conversionRate}%`}
          icon={<TrendingUp size={16} />}
          accent={colors.warning}
        />
        <KpiCard
          label="Ticket Medio"
          valor={moeda(summary.averageTicket)}
          icon={<DollarSign size={16} />}
          accent={colors.purple}
        />
      </div>

      <div style={uiStyles.grid2}>
        <Card title="Status do Funil" subtitle="Distribuicao dos seus leads neste mes">
          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando status...</div>
          ) : statusChartData.length === 0 ? (
            <Empty icon="..." title="Sem leads neste periodo" description="Registre novos leads para acompanhar o funil aqui." />
          ) : (
            <div style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {statusChartData.map((entry, index) => (
                      <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Mix Comercial" subtitle="Resumo apenas das vendas fechadas">
          {loading ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Calculando mix...</div>
          ) : mixChartData.length === 0 ? (
            <Empty icon="..." title="Sem vendas fechadas" description="Quando houver contratos ou instalacoes, o mix aparece aqui." />
          ) : (
            <div style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mixChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={92}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {mixChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div style={uiStyles.grid3}>
        <KpiCard label="Instalados" valor={summary.totalInstalled} icon={<CheckCircle2 size={16} />} accent={colors.success} />
        <KpiCard label="Descartados" valor={summary.totalDiscarded} icon={<BarChart3 size={16} />} accent={colors.danger} />
        <KpiCard label="Valor Fechado" valor={moeda(summary.totalValue)} icon={<PieChartIcon size={16} />} accent={colors.info} />
      </div>

      <Card title="Leads Recentes" subtitle={`Registros do periodo ${selectedMonth}`}>
        <DataTable
          columns={columns}
          data={summary.recentLeads}
          loading={loading}
          emptyMsg="Nenhum lead encontrado para este periodo."
        />
      </Card>

      {!loading && leads.length === 0 && !error && (
        <Card>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            Este modulo agora consulta apenas os seus leads do mes selecionado. Quando novos registros entrarem, os indicadores serao atualizados em tempo real.
          </p>
        </Card>
      )}
    </Page>
  );
}
