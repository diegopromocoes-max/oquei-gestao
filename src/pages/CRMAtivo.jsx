import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Crosshair,
  MessageCircle,
  Phone,
  PieChart as PieChartIcon,
  Plus,
  RefreshCw,
  Send,
  Target,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
} from 'recharts';

import {
  Badge,
  Btn,
  Card,
  Empty,
  InfoBox,
  Input,
  KpiCard,
  Modal,
  Page,
  Select,
  Spinner,
  Tabs,
  Textarea,
  colors,
  styles,
} from '../components/ui';
import {
  CRM_ATIVO_DESCARTE_MOTIVOS,
  CRM_ATIVO_ORIGENS,
  CRM_ATIVO_STATUS,
  CRM_ATIVO_STATUS_COLORS,
  CRM_ATIVO_VENDOR_STATUS_COLORS,
  buildWhatsAppUrl,
  filterCrmAtivoLeads,
  formatDate,
  formatDateTime,
  formatLeadAddress,
  formatPhone,
  summarizeCrmAtivo,
} from '../lib/crmAtivo';
import {
  assignCrmAtivoLead,
  createCrmAtivoLead,
  listenCrmAtivoLeads,
  listenCrmAtivoVendedores,
  saveCrmAtivoVendedor,
  updateCrmAtivoLeadFeedback,
} from '../services/crmAtivo';
import { getCanaisVenda, getClusters } from '../services/metas';

const TAB_DASHBOARD = 'Dashboard';
const TAB_GESTAO = 'Gestão de Leads';
const TAB_EQUIPE = 'Equipe';

const DEFAULT_FILTERS = {
  search: '',
  status: 'all',
  vendorId: 'all',
  origin: 'all',
};

const DEFAULT_LEAD_FORM = {
  customerName: '',
  phone: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: 'SP',
  zipCode: '',
  origin: CRM_ATIVO_ORIGENS[0],
  fieldReport: '',
};

const DEFAULT_VENDOR_FORM = {
  id: null,
  name: '',
  status: 'Ativo',
  channelId: '',
  clusterId: '',
};

const chartPalette = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#7c3aed',
  '#06b6d4',
  '#f97316',
];

function showToast(message, type = 'success') {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast(message, type);
    return;
  }

  console[type === 'error' ? 'error' : 'log'](message);
}

function ChartCard({ title, subtitle, icon: Icon, children }) {
  return (
    <Card
      title={(
        <span style={local.chartCardTitle}>
          <Icon size={16} />
          {title}
        </span>
      )}
      subtitle={subtitle}
    >
      <div style={local.chartArea}>{children}</div>
    </Card>
  );
}

export default function CRMAtivo({ userData }) {
  const [activeTab, setActiveTab] = useState(TAB_DASHBOARD);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [leadForm, setLeadForm] = useState(DEFAULT_LEAD_FORM);
  const [vendorForm, setVendorForm] = useState(DEFAULT_VENDOR_FORM);
  const [assignVendorId, setAssignVendorId] = useState('');
  const [feedbackForm, setFeedbackForm] = useState({
    status: 'Vendido',
    fieldReport: '',
    discardReason: '',
  });
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedLead, setSelectedLead] = useState(null);
  const [leads, setLeads] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [channels, setChannels] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [loadingStructure, setLoadingStructure] = useState(true);
  const [savingLead, setSavingLead] = useState(false);
  const [savingVendor, setSavingVendor] = useState(false);
  const [savingAssign, setSavingAssign] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);

  useEffect(() => {
    const unsubscribeLeads = listenCrmAtivoLeads(
      (items) => {
        setLeads(items);
        setLoadingLeads(false);
      },
      (error) => {
        console.error('CRM ATIVO leads error:', error);
        setLoadingLeads(false);
        showToast('Não foi possível carregar os leads do CRM ATIVO.', 'error');
      },
    );

    const unsubscribeVendors = listenCrmAtivoVendedores(
      (items) => {
        setVendors(items);
        setLoadingVendors(false);
      },
      (error) => {
        console.error('CRM ATIVO vendedores error:', error);
        setLoadingVendors(false);
        showToast('Não foi possível carregar os vendedores do CRM ATIVO.', 'error');
      },
    );

    return () => {
      unsubscribeLeads?.();
      unsubscribeVendors?.();
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadStructure = async () => {
      setLoadingStructure(true);

      try {
        const [channelsData, clustersData] = await Promise.all([
          getCanaisVenda(),
          getClusters(),
        ]);

        if (!active) {
          return;
        }

        setChannels(channelsData);
        setClusters(clustersData);
      } catch (error) {
        console.error('CRM ATIVO structure error:', error);
        showToast('Não foi possível carregar a estrutura de canais e regionais.', 'error');
      } finally {
        if (active) {
          setLoadingStructure(false);
        }
      }
    };

    loadStructure();

    return () => {
      active = false;
    };
  }, []);

  const activeVendors = useMemo(
    () => vendors.filter((vendor) => vendor.status !== 'Inativo'),
    [vendors],
  );

  const filteredLeads = useMemo(
    () => filterCrmAtivoLeads(leads, filters),
    [leads, filters],
  );

  const summary = useMemo(
    () => summarizeCrmAtivo(leads, vendors),
    [leads, vendors],
  );

  const topPerformer = summary.vendorRanking[0];

  const externalChannels = useMemo(() => {
    const filtered = channels.filter((channel) => {
      const name = String(channel.name || '').toLowerCase();
      return name.includes('extern') || name.includes('pap');
    });

    return filtered.length ? filtered : channels;
  }, [channels]);

  const selectedChannel = useMemo(
    () => externalChannels.find((channel) => channel.id === vendorForm.channelId) || null,
    [externalChannels, vendorForm.channelId],
  );

  const availableClusters = useMemo(
    () => clusters.filter((cluster) => cluster.channelId === vendorForm.channelId),
    [clusters, vendorForm.channelId],
  );

  const vendorOptions = useMemo(
    () => activeVendors.map((vendor) => ({ value: vendor.id, label: vendor.name })),
    [activeVendors],
  );

  const resetLeadForm = () => setLeadForm(DEFAULT_LEAD_FORM);
  const resetVendorForm = () => setVendorForm(DEFAULT_VENDOR_FORM);

  const handleLeadSubmit = async (event) => {
    event?.preventDefault();

    if (!leadForm.customerName.trim()) {
      showToast('Informe o nome do lead.', 'error');
      return;
    }

    if (!leadForm.phone.trim()) {
      showToast('Informe o telefone do lead.', 'error');
      return;
    }

    setSavingLead(true);

    try {
      await createCrmAtivoLead(leadForm, userData);
      showToast('Lead incluído no CRM ATIVO.');
      setLeadModalOpen(false);
      resetLeadForm();
      setActiveTab(TAB_GESTAO);
    } catch (error) {
      console.error(error);
      showToast('Erro ao salvar o lead no CRM ATIVO.', 'error');
    } finally {
      setSavingLead(false);
    }
  };

  const handleVendorSubmit = async (event) => {
    event?.preventDefault();

    if (!vendorForm.name.trim()) {
      showToast('Informe o nome do vendedor externo.', 'error');
      return;
    }

    if (!vendorForm.channelId) {
      showToast('Selecione o canal de venda do vendedor.', 'error');
      return;
    }

    if (availableClusters.length > 0 && !vendorForm.clusterId) {
      showToast('Selecione a regional vinculada ao vendedor.', 'error');
      return;
    }

    setSavingVendor(true);

    try {
      const selectedCluster = clusters.find((cluster) => cluster.id === vendorForm.clusterId) || null;

      await saveCrmAtivoVendedor({
        ...vendorForm,
        channelName: selectedChannel?.name || null,
        clusterName: selectedCluster?.name || null,
      });
      showToast(vendorForm.id ? 'Vendedor atualizado.' : 'Vendedor cadastrado.');
      setVendorModalOpen(false);
      resetVendorForm();
    } catch (error) {
      console.error(error);
      showToast('Erro ao salvar o vendedor.', 'error');
    } finally {
      setSavingVendor(false);
    }
  };

  const handleAssignSubmit = async (event) => {
    event?.preventDefault();

    if (!selectedLead) {
      return;
    }

    const vendor = activeVendors.find((item) => item.id === assignVendorId);

    if (!vendor) {
      showToast('Selecione um vendedor para direcionar o lead.', 'error');
      return;
    }

    setSavingAssign(true);

    try {
      await assignCrmAtivoLead(selectedLead.id, vendor, userData);
      showToast(`Lead direcionado para ${vendor.name}.`);
      setAssignModalOpen(false);
      setSelectedLead(null);
      setAssignVendorId('');
    } catch (error) {
      console.error(error);
      showToast('Erro ao direcionar o lead.', 'error');
    } finally {
      setSavingAssign(false);
    }
  };

  const handleFeedbackSubmit = async (event) => {
    event?.preventDefault();

    if (!selectedLead) {
      return;
    }

    if (!feedbackForm.fieldReport.trim()) {
      showToast('Registre o relato de campo antes de salvar.', 'error');
      return;
    }

    if (feedbackForm.status === 'Descartado' && !feedbackForm.discardReason) {
      showToast('Selecione o motivo do descarte.', 'error');
      return;
    }

    setSavingFeedback(true);

    try {
      await updateCrmAtivoLeadFeedback(selectedLead.id, feedbackForm, userData);
      showToast('Feedback do lead atualizado.');
      setFeedbackModalOpen(false);
      setSelectedLead(null);
      setFeedbackForm({
        status: 'Vendido',
        fieldReport: '',
        discardReason: '',
      });
    } catch (error) {
      console.error(error);
      showToast('Erro ao registrar o feedback do lead.', 'error');
    } finally {
      setSavingFeedback(false);
    }
  };

  const openAssignModal = (lead) => {
    if (!activeVendors.length) {
      showToast('Cadastre pelo menos um vendedor ativo antes de direcionar leads.', 'error');
      setActiveTab(TAB_EQUIPE);
      return;
    }

    setSelectedLead(lead);
    setAssignVendorId(lead.vendorId || '');
    setAssignModalOpen(true);
  };

  const openFeedbackModal = (lead) => {
    setSelectedLead(lead);
    setFeedbackForm({
      status: lead.status === 'Frio/Disponível' ? 'Com Vendedor' : (lead.status || 'Com Vendedor'),
      fieldReport: lead.fieldReport || '',
      discardReason: lead.discardReason || '',
    });
    setFeedbackModalOpen(true);
  };

  const openVendorEditor = (vendor) => {
    setVendorForm({
      id: vendor.id,
      name: vendor.name || '',
      status: vendor.status || 'Ativo',
      channelId: vendor.channelId || '',
      clusterId: vendor.clusterId || '',
    });
    setVendorModalOpen(true);
  };

  const openWhatsApp = (lead) => {
    const url = buildWhatsAppUrl(lead.phone, `Olá ${lead.customerName}, tudo bem?`);

    if (!url) {
      showToast('Telefone inválido para abrir o WhatsApp.', 'error');
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const renderDashboard = () => (
    <>
      <div style={styles.grid4}>
        <KpiCard
          label="Total no Banco"
          valor={summary.totalLeads}
          sublabel="Estoque de oportunidades"
          icon={<Crosshair size={16} />}
          accent={colors.primary}
        />
        <KpiCard
          label="Aguardando Direcionamento"
          valor={summary.availableLeads}
          sublabel="Leads frios disponíveis"
          icon={<Users size={16} />}
          accent={colors.info}
        />
        <KpiCard
          label="Vendas no Mês"
          valor={summary.soldThisMonth}
          sublabel="Recuperações concluídas"
          icon={<Target size={16} />}
          accent={colors.success}
        />
        <KpiCard
          label="Conversão Geral"
          valor={`${summary.conversionRate}%`}
          sublabel="Vendido ÷ total do banco"
          icon={<TrendingUp size={16} />}
          accent={colors.warning}
        />
      </div>

      <div style={styles.grid2}>
        <ChartCard
          title="Eficiência Comercial"
          subtitle="Leads recebidos versus vendidos por vendedor"
          icon={BarChart3}
        >
          {summary.vendorRanking.length === 0 ? (
            <Empty
              icon="📉"
              title="Sem histórico de vendedores"
              description="Cadastre a equipe externa e direcione os primeiros leads para ver o ranking."
            />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={summary.vendorRanking}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="vendorName" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <Tooltip
                  contentStyle={local.tooltip}
                  formatter={(value, name) => [value, name === 'received' ? 'Recebidos' : 'Vendidos']}
                />
                <Legend />
                <Bar dataKey="received" name="Recebidos" fill={colors.primary} radius={[8, 8, 0, 0]} />
                <Bar dataKey="sold" name="Vendidos" fill={colors.success} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Análise de Perdas"
          subtitle="Motivos de descarte mais recorrentes"
          icon={PieChartIcon}
        >
          {summary.discardReasons.length === 0 ? (
            <Empty
              icon="🧭"
              title="Sem descartes registrados"
              description="Quando os descartes começarem a entrar, o gráfico ajuda a enxergar os gargalos reais da rua."
            />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={summary.discardReasons}
                  cx="50%"
                  cy="50%"
                  outerRadius={108}
                  innerRadius={54}
                  dataKey="value"
                  nameKey="name"
                  paddingAngle={3}
                >
                  {summary.discardReasons.map((entry, index) => (
                    <Cell key={`${entry.name}-${entry.value}`} fill={chartPalette[index % chartPalette.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={local.tooltip} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div style={styles.grid2}>
        <Card title="Radar Operacional" subtitle="Leitura rápida do banco de recuperação">
          <div style={local.summaryList}>
            <div style={local.summaryRow}>
              <span>Leads em negociação</span>
              <strong>{summary.inNegotiation}</strong>
            </div>
            <div style={local.summaryRow}>
              <span>Descartes acumulados</span>
              <strong>{summary.discardedLeads}</strong>
            </div>
            <div style={local.summaryRow}>
              <span>Vendas acumuladas</span>
              <strong>{summary.soldLeads}</strong>
            </div>
          </div>
        </Card>

        <Card title="Destaque da Rua" subtitle="Quem está convertendo mais hoje">
          {topPerformer ? (
            <div style={local.topPerformer}>
              <div style={local.topPerformerBadge}>
                <Target size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={local.topPerformerName}>{topPerformer.vendorName}</p>
                <p style={local.topPerformerMeta}>
                  {topPerformer.sold} venda(s) em {topPerformer.received} lead(s) recebido(s)
                </p>
              </div>
              <Badge cor="success">{topPerformer.conversionRate}%</Badge>
            </div>
          ) : (
            <Empty
              icon="🚀"
              title="Nenhum vendedor ranqueado ainda"
              description="Assim que houver atribuições e resultados, este destaque aparece automaticamente."
            />
          )}
        </Card>
      </div>
    </>
  );

  const renderLeadManagement = () => (
    <>
      <Card title="Filtro Operacional" subtitle="Encontre, distribua e atualize leads com rapidez.">
        <div style={styles.formRow}>
          <Input
            label="Busca Rápida"
            placeholder="Nome, telefone ou endereço"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          />
          <Select
            label="Status"
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            options={[
              { value: 'all', label: 'Todos os status' },
              ...CRM_ATIVO_STATUS.map((status) => ({ value: status, label: status })),
            ]}
          />
          <Select
            label="Vendedor"
            value={filters.vendorId}
            onChange={(event) => setFilters((current) => ({ ...current, vendorId: event.target.value }))}
            options={[
              { value: 'all', label: 'Todos os vendedores' },
              ...vendors.map((vendor) => ({ value: vendor.id, label: vendor.name })),
            ]}
          />
          <Select
            label="Origem"
            value={filters.origin}
            onChange={(event) => setFilters((current) => ({ ...current, origin: event.target.value }))}
            options={[
              { value: 'all', label: 'Todas as origens' },
              ...CRM_ATIVO_ORIGENS.map((origin) => ({ value: origin, label: origin })),
            ]}
          />
        </div>

        <div style={local.filterFooter}>
          <span style={local.filteredCount}>
            {filteredLeads.length} lead(s) na visualização atual
          </span>
          <Btn variant="secondary" onClick={() => setFilters(DEFAULT_FILTERS)}>
            <RefreshCw size={15} />
            Limpar Filtros
          </Btn>
        </div>
      </Card>

      <Card title="Base de Leads Frios" subtitle="Operação do supervisor para entregar, acompanhar e registrar retorno da rua.">
        {loadingLeads ? (
          <Spinner centered />
        ) : filteredLeads.length === 0 ? (
          <Empty
            icon="📭"
            title="Nenhum lead encontrado"
            description="Ajuste os filtros ou cadastre um novo lead frio para começar a operação."
          />
        ) : (
          <div style={local.tableWrap}>
            <table style={local.table}>
              <thead>
                <tr>
                  <th style={local.th}>Lead</th>
                  <th style={local.th}>Origem</th>
                  <th style={local.th}>Status</th>
                  <th style={local.th}>Vendedor</th>
                  <th style={local.th}>Última Movimentação</th>
                  <th style={local.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td style={local.td}>
                      <div style={local.leadCell}>
                        <strong style={{ color: 'var(--text-main)' }}>{lead.customerName}</strong>
                        <span style={local.mutedLine}>
                          <Phone size={12} />
                          {formatPhone(lead.phone)}
                        </span>
                        <span style={local.mutedLine}>{formatLeadAddress(lead)}</span>
                        {lead.fieldReport && (
                          <span style={local.reportLine}>Relato: {lead.fieldReport}</span>
                        )}
                        {lead.discardReason && (
                          <span style={{ ...local.reportLine, color: colors.danger }}>
                            Motivo: {lead.discardReason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={local.td}>{lead.origin || '—'}</td>
                    <td style={local.td}>
                      <Badge cor={CRM_ATIVO_STATUS_COLORS[lead.status] || 'neutral'}>
                        {lead.status || 'Sem status'}
                      </Badge>
                    </td>
                    <td style={local.td}>
                      {lead.vendorName ? (
                        <div style={local.vendorCell}>
                          <span>{lead.vendorName}</span>
                          <span style={local.secondaryText}>
                            Entregue em {formatDate(lead.assignedAt)}
                          </span>
                        </div>
                      ) : (
                        <span style={local.secondaryText}>Aguardando</span>
                      )}
                    </td>
                    <td style={local.td}>
                      <div style={local.vendorCell}>
                        <span>{formatDateTime(lead.lastMovementAt || lead.insertedAt)}</span>
                        <span style={local.secondaryText}>
                          Por {lead.lastUpdatedByName || lead.supervisorName || 'Supervisor'}
                        </span>
                      </div>
                    </td>
                    <td style={local.td}>
                      <div style={local.actionStack}>
                        <Btn variant="secondary" size="sm" onClick={() => openAssignModal(lead)}>
                          <Send size={14} />
                          Direcionar
                        </Btn>
                        <Btn variant="secondary" size="sm" onClick={() => openFeedbackModal(lead)}>
                          <RefreshCw size={14} />
                          Atualizar
                        </Btn>
                        <Btn variant="success" size="sm" onClick={() => openWhatsApp(lead)}>
                          <MessageCircle size={14} />
                          WhatsApp
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );

  const renderTeam = () => (
    <>
      <div style={styles.grid3}>
        <KpiCard
          label="Vendedores Ativos"
          valor={activeVendors.length}
          sublabel="Equipe disponível para rua"
          icon={<Users size={16} />}
          accent={colors.success}
        />
        <KpiCard
          label="Com Venda"
          valor={summary.vendorRanking.filter((vendor) => vendor.sold > 0).length}
          sublabel="Vendedores com conversão"
          icon={<Target size={16} />}
          accent={colors.primary}
        />
        <KpiCard
          label="Cadastros Totais"
          valor={vendors.length}
          sublabel="Ativos e inativos"
          icon={<UserPlus size={16} />}
          accent={colors.warning}
        />
      </div>

      <Card title="Equipe Externa" subtitle="Cadastre e mantenha a lista de vendedores usados na distribuição do CRM ATIVO.">
        {loadingVendors || loadingStructure ? (
          <Spinner centered />
        ) : vendors.length === 0 ? (
          <Empty
            icon="👥"
            title="Nenhum vendedor cadastrado"
            description="Cadastre a equipe externa para começar a distribuir os leads frios."
            action={(
              <Btn onClick={() => {
                resetVendorForm();
                setVendorModalOpen(true);
              }}>
                <UserPlus size={15} />
                Cadastrar Primeiro Vendedor
              </Btn>
            )}
          />
        ) : (
          <div style={local.teamGrid}>
            {summary.vendorRanking.map((vendor) => (
              <div key={vendor.vendorId} style={local.teamCard}>
                <div style={local.teamCardHeader}>
                  <div>
                    <p style={local.teamName}>{vendor.vendorName}</p>
                    <div style={local.teamBadges}>
                      <Badge cor={CRM_ATIVO_VENDOR_STATUS_COLORS[vendor.vendorStatus] || 'neutral'}>
                        {vendor.vendorStatus}
                      </Badge>
                      {vendor.channelName && (
                        <span style={local.secondaryText}>Canal: {vendor.channelName}</span>
                      )}
                      {vendor.clusterName && (
                        <span style={local.secondaryText}>Regional: {vendor.clusterName}</span>
                      )}
                      <span style={local.secondaryText}>
                        Cadastro em {formatDate(vendors.find((item) => item.id === vendor.vendorId)?.createdAt)}
                      </span>
                    </div>
                  </div>
                  <Btn
                    variant="secondary"
                    size="sm"
                    onClick={() => openVendorEditor(vendors.find((item) => item.id === vendor.vendorId) || vendor)}
                  >
                    Editar
                  </Btn>
                </div>

                <div style={local.metricsGrid}>
                  <div style={local.metricTile}>
                    <span>Recebidos</span>
                    <strong>{vendor.received}</strong>
                  </div>
                  <div style={local.metricTile}>
                    <span>Vendidos</span>
                    <strong>{vendor.sold}</strong>
                  </div>
                  <div style={local.metricTile}>
                    <span>Negociação</span>
                    <strong>{vendor.negotiation}</strong>
                  </div>
                  <div style={local.metricTile}>
                    <span>Conversão</span>
                    <strong>{vendor.conversionRate}%</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );

  return (
    <Page
      title="CRM ATIVO"
      subtitle="Central de inteligência e recuperação de leads frios para Vendas Externas."
      actions={(
        <>
          <Btn
            variant="secondary"
            onClick={() => {
              resetVendorForm();
              setVendorModalOpen(true);
            }}
          >
            <UserPlus size={15} />
            Novo Vendedor
          </Btn>
          <Btn
            onClick={() => {
              resetLeadForm();
              setLeadModalOpen(true);
            }}
          >
            <Plus size={15} />
            Novo Lead
          </Btn>
        </>
      )}
    >
      <InfoBox type="info">
        O CRM ATIVO concentra leads que esfriaram no fluxo convencional, substitui as planilhas de 48 horas
        e cria uma régua clara de distribuição, feedback e mensuração da eficiência da rua.
      </InfoBox>

      <Tabs
        tabs={[TAB_DASHBOARD, TAB_GESTAO, TAB_EQUIPE]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {(loadingLeads || loadingVendors || loadingStructure) && !leads.length && !vendors.length ? (
        <Spinner centered />
      ) : (
        <>
          {activeTab === TAB_DASHBOARD && renderDashboard()}
          {activeTab === TAB_GESTAO && renderLeadManagement()}
          {activeTab === TAB_EQUIPE && renderTeam()}
        </>
      )}

      <Modal
        open={leadModalOpen}
        onClose={() => setLeadModalOpen(false)}
        title="Novo Lead Frio"
        size="lg"
        footer={(
          <>
            <Btn variant="secondary" onClick={() => setLeadModalOpen(false)}>
              Cancelar
            </Btn>
            <Btn onClick={handleLeadSubmit} loading={savingLead}>
              Salvar Lead
            </Btn>
          </>
        )}
      >
        <form id="crm-ativo-lead-form" onSubmit={handleLeadSubmit} style={styles.form}>
          <div style={styles.formRow}>
            <Input
              label="Nome do Lead"
              value={leadForm.customerName}
              onChange={(event) => setLeadForm((current) => ({ ...current, customerName: event.target.value }))}
              required
            />
            <Input
              label="Telefone"
              value={leadForm.phone}
              onChange={(event) => setLeadForm((current) => ({ ...current, phone: event.target.value }))}
              required
            />
            <Select
              label="Origem"
              value={leadForm.origin}
              onChange={(event) => setLeadForm((current) => ({ ...current, origin: event.target.value }))}
              options={CRM_ATIVO_ORIGENS.map((origin) => ({ value: origin, label: origin }))}
            />
          </div>

          <div style={styles.formRow}>
            <Input
              label="Logradouro"
              value={leadForm.street}
              onChange={(event) => setLeadForm((current) => ({ ...current, street: event.target.value }))}
            />
            <Input
              label="Número"
              value={leadForm.number}
              onChange={(event) => setLeadForm((current) => ({ ...current, number: event.target.value }))}
            />
            <Input
              label="Complemento"
              value={leadForm.complement}
              onChange={(event) => setLeadForm((current) => ({ ...current, complement: event.target.value }))}
            />
          </div>

          <div style={styles.formRow}>
            <Input
              label="Bairro"
              value={leadForm.neighborhood}
              onChange={(event) => setLeadForm((current) => ({ ...current, neighborhood: event.target.value }))}
            />
            <Input
              label="Cidade"
              value={leadForm.city}
              onChange={(event) => setLeadForm((current) => ({ ...current, city: event.target.value }))}
            />
            <Input
              label="Estado"
              value={leadForm.state}
              maxLength={2}
              onChange={(event) => setLeadForm((current) => ({ ...current, state: event.target.value.toUpperCase() }))}
            />
            <Input
              label="CEP"
              value={leadForm.zipCode}
              onChange={(event) => setLeadForm((current) => ({ ...current, zipCode: event.target.value }))}
            />
          </div>

          <Textarea
            label="Relato / Observação"
            placeholder="Ex: Cliente pediu retorno na sexta, já informou melhor horário ou algum contexto importante."
            value={leadForm.fieldReport}
            onChange={(event) => setLeadForm((current) => ({ ...current, fieldReport: event.target.value }))}
          />
        </form>
      </Modal>

      <Modal
        open={vendorModalOpen}
        onClose={() => setVendorModalOpen(false)}
        title={vendorForm.id ? 'Editar Vendedor Externo' : 'Novo Vendedor Externo'}
        footer={(
          <>
            <Btn variant="secondary" onClick={() => setVendorModalOpen(false)}>
              Cancelar
            </Btn>
            <Btn onClick={handleVendorSubmit} loading={savingVendor}>
              Salvar Vendedor
            </Btn>
          </>
        )}
      >
        <form id="crm-ativo-vendor-form" onSubmit={handleVendorSubmit} style={styles.form}>
          <Input
            label="Nome"
            value={vendorForm.name}
            onChange={(event) => setVendorForm((current) => ({ ...current, name: event.target.value }))}
            required
          />
          <Select
            label="Canal de Venda"
            value={vendorForm.channelId}
            onChange={(event) => setVendorForm((current) => ({
              ...current,
              channelId: event.target.value,
              clusterId: '',
            }))}
            options={externalChannels.map((channel) => ({ value: channel.id, label: channel.name }))}
            placeholder={loadingStructure ? 'Carregando canais...' : 'Selecione o canal'}
            required
          />
          <Select
            label="Regional"
            value={vendorForm.clusterId}
            onChange={(event) => setVendorForm((current) => ({ ...current, clusterId: event.target.value }))}
            options={availableClusters.map((cluster) => ({ value: cluster.id, label: cluster.name }))}
            placeholder={
              !vendorForm.channelId
                ? 'Selecione um canal primeiro'
                : availableClusters.length
                  ? 'Selecione a regional'
                  : 'Sem regional vinculada'
            }
            disabled={!vendorForm.channelId || availableClusters.length === 0}
          />
          <Select
            label="Status"
            value={vendorForm.status}
            onChange={(event) => setVendorForm((current) => ({ ...current, status: event.target.value }))}
            options={[
              { value: 'Ativo', label: 'Ativo' },
              { value: 'Inativo', label: 'Inativo' },
            ]}
          />
        </form>
      </Modal>

      <Modal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Direcionar Lead"
        footer={(
          <>
            <Btn variant="secondary" onClick={() => setAssignModalOpen(false)}>
              Cancelar
            </Btn>
            <Btn onClick={handleAssignSubmit} loading={savingAssign}>
              Confirmar Direcionamento
            </Btn>
          </>
        )}
      >
        <form id="crm-ativo-assign-form" onSubmit={handleAssignSubmit} style={styles.form}>
          <InfoBox type="warning">
            {selectedLead?.customerName
              ? `Você está entregando o lead ${selectedLead.customerName} para abordagem em campo.`
              : 'Selecione um vendedor para continuar.'}
          </InfoBox>
          <Select
            label="Vendedor Responsável"
            value={assignVendorId}
            onChange={(event) => setAssignVendorId(event.target.value)}
            options={vendorOptions}
            placeholder="Selecione um vendedor ativo"
            required
          />
        </form>
      </Modal>

      <Modal
        open={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        title="Atualizar Status do Lead"
        size="lg"
        footer={(
          <>
            <Btn variant="secondary" onClick={() => setFeedbackModalOpen(false)}>
              Cancelar
            </Btn>
            <Btn onClick={handleFeedbackSubmit} loading={savingFeedback}>
              Salvar Feedback
            </Btn>
          </>
        )}
      >
        <form id="crm-ativo-feedback-form" onSubmit={handleFeedbackSubmit} style={styles.form}>
          <div style={styles.formRow}>
            <Select
              label="Novo Status"
              value={feedbackForm.status}
              onChange={(event) => setFeedbackForm((current) => ({ ...current, status: event.target.value }))}
              options={CRM_ATIVO_STATUS.filter((status) => status !== 'Frio/Disponível').map((status) => ({
                value: status,
                label: status,
              }))}
            />
            <Input
              label="Lead"
              value={selectedLead?.customerName || ''}
              disabled
            />
          </div>

          <Textarea
            label="Relato de Campo"
            placeholder="Ex: Cliente aceitou plano de 600mb e pediu retorno amanhã para assinatura."
            value={feedbackForm.fieldReport}
            onChange={(event) => setFeedbackForm((current) => ({ ...current, fieldReport: event.target.value }))}
            required
          />

          {feedbackForm.status === 'Descartado' && (
            <Select
              label="Motivo de Descarte"
              value={feedbackForm.discardReason}
              onChange={(event) => setFeedbackForm((current) => ({ ...current, discardReason: event.target.value }))}
              options={CRM_ATIVO_DESCARTE_MOTIVOS.map((reason) => ({ value: reason, label: reason }))}
              placeholder="Selecione o motivo"
              required
            />
          )}
        </form>
      </Modal>
    </Page>
  );
}

const local = {
  tooltip: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    color: 'var(--text-main)',
  },
  chartCardTitle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  chartArea: {
    minHeight: '320px',
  },
  summaryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--border)',
    color: 'var(--text-main)',
    fontSize: '14px',
  },
  topPerformer: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    minHeight: '92px',
  },
  topPerformerBadge: {
    width: '46px',
    height: '46px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(16,185,129,0.14)',
    color: colors.success,
  },
  topPerformerName: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 800,
    color: 'var(--text-main)',
  },
  topPerformerMeta: {
    margin: '4px 0 0',
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  filterFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginTop: '18px',
    flexWrap: 'wrap',
  },
  filteredCount: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '14px 12px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--text-muted)',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '16px 12px',
    borderBottom: '1px solid var(--border)',
    verticalAlign: 'top',
    fontSize: '13px',
    color: 'var(--text-main)',
  },
  leadCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: '260px',
  },
  mutedLine: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: 'var(--text-muted)',
    fontSize: '12px',
  },
  reportLine: {
    color: 'var(--text-main)',
    fontSize: '12px',
    lineHeight: 1.45,
  },
  vendorCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  secondaryText: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  actionStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minWidth: '150px',
  },
  teamGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '18px',
  },
  teamCard: {
    background: 'var(--bg-app)',
    border: '1px solid var(--border)',
    borderRadius: '18px',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  teamCardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
  },
  teamName: {
    margin: 0,
    color: 'var(--text-main)',
    fontSize: '17px',
    fontWeight: 800,
  },
  teamBadges: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '8px',
    alignItems: 'center',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '12px',
  },
  metricTile: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
};
