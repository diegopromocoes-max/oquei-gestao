import React, { useEffect, useMemo, useState } from 'react';
import { auth } from '../firebase';
import {
  Activity,
  BarChart3,
  BookMarked,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleDashed,
  FileCheck,
  FileSpreadsheet,
  Globe,
  Info,
  Link as LinkIcon,
  MessageSquareQuote,
  MapPinned,
  Megaphone,
  PlusCircle,
  Router,
  Share2,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

import LayoutGlobal from '../components/LayoutGlobal';
import { Btn, Card, InfoBox, Page, styles as uiStyles } from '../components/ui';
import {
  listGrowthActionsForCity,
  listenAtendenteStats,
  listenMessages,
  listenPublicAbsenceCalendar,
} from '../services/atendenteDashboardService';
import { listMyRhRequests } from '../services/atendenteRhService';
import NovoLead from './NovoLead';
import MeusLeads from './MeusLeads';
import RelatorioLeads from '../components/RelatorioLeads';
import ColinhasAtendente from './ColinhasAtendente';
import DesencaixeAtendente from './DesencaixeAtendente';
import ManualAtendente from './ManualAtendente';
import RhAtendente from './RhAtendente';
import JapaSupervisor from './JapaSupervisor';
import LinksUteis from './LinksUteis';
import PainelVendasAtendente from './PainelVendasAtendente';
import Configuracoes from './Configuracoes';
import MeuMapaLeads from './MeuMapaLeads';
import Devolucoes from './Devolucoes';
import CatalogoRoteadores from './CatalogoRoteadores';
import { usePanelAccess } from '../hooks/usePanelAccess';
import { PANEL_KEYS } from '../lib/moduleCatalog';
import { getCachedUserPreferences } from '../services/userSettings';

function formatMessageDate(value) {
  if (!value) return 'Hoje';
  if (typeof value?.toDate === 'function') return value.toDate().toLocaleDateString('pt-BR');
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000).toLocaleDateString('pt-BR');
  return new Date(value).toLocaleDateString('pt-BR');
}

function getGreetingPeriod() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatStoreLabel(userData) {
  const source = userData?.cityName || userData?.storeName || userData?.cityId || '';
  if (!source) return 'Loja nao vinculada';

  return String(source)
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      const lower = part.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function clampMetric(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function MetricDialCard({ label, value, suffix = '', percent = 0, accent, helper, icon, tone = 'neutral' }) {
  const safePercent = clampMetric(percent);
  const gradient = `conic-gradient(${accent} ${safePercent * 0.75}%, rgba(148,163,184,0.15) ${safePercent * 0.75}% 75%, rgba(148,163,184,0.08) 75% 100%)`;
  const Icon = icon;
  const toneStyles = {
    success: { glow: `${accent}33`, soft: `${accent}14` },
    warning: { glow: `${accent}33`, soft: `${accent}14` },
    danger: { glow: `${accent}33`, soft: `${accent}14` },
    neutral: { glow: `${accent}26`, soft: `${accent}12` },
  };
  const toneStyle = toneStyles[tone] || toneStyles.neutral;

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '24px',
        border: '1px solid var(--border)',
        background: `linear-gradient(160deg, ${toneStyle.soft}, rgba(255,255,255,0.02) 45%, rgba(15,23,42,0.02))`,
        padding: '20px',
        boxShadow: `0 18px 40px ${toneStyle.glow}`,
        display: 'grid',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {label}
          </div>
          <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {helper}
          </div>
        </div>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '14px',
            background: `${accent}18`,
            color: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={18} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <div
          style={{
            width: '96px',
            height: '96px',
            borderRadius: '50%',
            background: gradient,
            display: 'grid',
            placeItems: 'center',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '66px',
              height: '66px',
              borderRadius: '50%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              display: 'grid',
              placeItems: 'center',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
            }}
          >
            <span style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-main)' }}>{Math.round(safePercent)}%</span>
          </div>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '30px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.04em', lineHeight: 1 }}>
            {value}
            {suffix}
          </div>
          <div style={{ marginTop: '6px', fontSize: '13px', fontWeight: 700, color: accent }}>
            Índice operacional do momento
          </div>
        </div>
      </div>
    </div>
  );
}

function PulseTile({ label, value, helper, accent, icon, onClick }) {
  const Icon = icon;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: '18px',
        borderRadius: '20px',
        border: '1px solid var(--border)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
        display: 'grid',
        gap: '10px',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '14px', background: `${accent}18`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} />
        </div>
        {onClick && <ChevronRight size={16} color="var(--text-muted)" />}
      </div>
      <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.04em' }}>{value}</div>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.55 }}>{helper}</div>
    </button>
  );
}

function EscalaAtendenteView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedStoreFilter, setSelectedStoreFilter] = useState('all');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    setLoading(true);
    setLoadError('');

    return listenPublicAbsenceCalendar(
      monthKey,
      (data) => {
        setEntries(data);
        setLoading(false);
      },
      (error) => {
        setLoadError(error?.code === 'permission-denied' ? 'Sem permissao para consultar a escala publica.' : 'Nao foi possivel carregar a escala da rede.');
        setEntries([]);
        setLoading(false);
      },
    );
  }, [monthKey]);

  const uniqueStores = useMemo(
    () => Array.from(new Set(entries.map((item) => item.storeId || item.storeName).filter(Boolean))).sort(),
    [entries],
  );

  const filteredEntries = useMemo(() => {
    if (selectedStoreFilter === 'all') return entries;
    return entries.filter((item) => (item.storeId || item.storeName) === selectedStoreFilter);
  }, [entries, selectedStoreFilter]);

  const groupedEntries = useMemo(
    () => filteredEntries.reduce((accumulator, item) => {
      const dateKey = item.date || 'Sem data';
      if (!accumulator[dateKey]) accumulator[dateKey] = [];
      accumulator[dateKey].push(item);
      return accumulator;
    }, {}),
    [filteredEntries],
  );

  return (
    <Page
      title="Escala da Rede"
      subtitle="Espelho público de ausências e coberturas por loja."
      actions={(
        <>
          <input
            type="month"
            value={monthKey}
            onChange={(event) => {
              const [selectedYear, selectedMonth] = event.target.value.split('-');
              setCurrentDate(new Date(Number(selectedYear), Number(selectedMonth) - 1, 1));
            }}
            style={{ minWidth: '180px', ...uiStyles.input }}
          />
          <select value={selectedStoreFilter} onChange={(event) => setSelectedStoreFilter(event.target.value)} style={{ minWidth: '180px', ...uiStyles.select }}>
            <option value="all">Todas as lojas</option>
            {uniqueStores.map((store) => <option key={store} value={store}>{store}</option>)}
          </select>
        </>
      )}
    >
      <InfoBox type="info">Modo leitura: a escala usa apenas o espelho público de ausências da rede.</InfoBox>
      {loadError && <InfoBox type="danger">{loadError}</InfoBox>}

      <Card title="Calendário de ausências" subtitle={`Entradas públicas para ${monthKey}`}>
        {loading ? (
          <div style={{ padding: '42px', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando calendário da rede...</div>
        ) : filteredEntries.length === 0 ? (
          <div style={{ padding: '42px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma ausência publicada para os filtros atuais.</div>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            {Object.entries(groupedEntries)
              .sort(([left], [right]) => left.localeCompare(right))
              .map(([date, items]) => (
                <div key={date} style={{ padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--bg-app)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>
                    {date.split('-').reverse().join('/')}
                  </div>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {items.map((item) => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', padding: '12px 14px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <div>
                          <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{item.storeName || item.storeId}</div>
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{item.attendantFirstName || 'Colaborador'} · {item.type || 'Ausência'}</div>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: item.isClosedStore ? '#dc2626' : item.coverage ? '#059669' : '#d97706' }}>
                          {item.isClosedStore ? 'Loja fechada' : item.coverage ? 'Coberto' : 'Sem cobertura'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </Card>
    </Page>
  );
}

export default function CRMAtendente({ userData }) {
  const [activeTab, setActiveTab] = useState(() => getCachedUserPreferences(userData?.uid).defaultModule || 'inicio');
  const [stats, setStats] = useState({ totalLeads: 0, totalSales: 0, planos: 0, svas: 0, migracoes: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [messages, setMessages] = useState([]);
  const [messagesError, setMessagesError] = useState('');
  const [rhPendingCount, setRhPendingCount] = useState(0);
  const [growthActions, setGrowthActions] = useState([]);

  useEffect(() => {
    if (!userData?.uid) return undefined;

    const currentMonthKey = new Date().toISOString().slice(0, 7);
    setLoadingStats(true);
    setStatsError('');
    setMessagesError('');

    const unsubscribeStats = listenAtendenteStats(
      userData.uid,
      currentMonthKey,
      (data) => {
        setStats(data || { totalLeads: 0, totalSales: 0, planos: 0, svas: 0, migracoes: 0 });
        setLoadingStats(false);
      },
      (error) => {
        setStatsError(error?.code === 'permission-denied' ? 'Sem permissao para consultar os indicadores do atendente.' : 'Nao foi possivel carregar seus indicadores.');
        setLoadingStats(false);
      },
    );

    const unsubscribeMessages = listenMessages(
      userData.cityId,
      userData.uid,
      (data) => setMessages(data),
      (error) => {
        setMessages([]);
        setMessagesError(error?.code === 'permission-denied' ? 'Sem permissao para abrir o mural de avisos.' : 'Nao foi possivel carregar o mural de avisos.');
      },
    );

    return () => {
      unsubscribeStats?.();
      unsubscribeMessages?.();
    };
  }, [userData?.cityId, userData?.uid]);

  useEffect(() => {
    let cancelled = false;
    if (!userData?.uid) return undefined;

    Promise.all([
      listMyRhRequests(userData.uid),
      listGrowthActionsForCity(userData.cityId),
    ])
      .then(([rhRequests, actions]) => {
        if (cancelled) return;
        setRhPendingCount((rhRequests || []).filter((item) => String(item.status || '').toLowerCase() === 'pendente').length);
        setGrowthActions(actions || []);
      })
      .catch(() => {
        if (cancelled) return;
        setRhPendingCount(0);
        setGrowthActions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [userData?.cityId, userData?.uid]);

  const MENU_ITEMS = [
    { id: 'inicio', label: 'Início', icon: Globe, section: 'Geral', color: '#10b981' },
    { id: 'graficos', label: 'Meus Gráficos', icon: BarChart3, section: 'Geral', color: '#ec4899' },
    { id: 'nova_venda', label: 'Registrar Lead', icon: PlusCircle, highlight: true, section: 'Comercial', color: '#2563eb' },
    { id: 'clientes', label: 'Meu Funil', icon: Users, section: 'Comercial', color: '#10b981' },
    { id: 'relatorio_leads', label: 'Relatório Mensal', icon: FileSpreadsheet, section: 'Comercial', color: '#8b5cf6' },
    { id: 'mapa_leads', label: 'Meu mapa de Leads', icon: MapPinned, section: 'Comercial', color: '#0ea5e9' },
    { id: 'rh', label: 'Solicitações RH', icon: FileCheck, section: 'Ferramentas', color: '#f59e0b' },
    { id: 'colinhas', label: 'Colinhas', icon: BookMarked, section: 'Ferramentas', color: '#8b5cf6' },
    { id: 'desencaixe', label: 'Caixa da Loja', icon: Wallet, section: 'Ferramentas', color: '#10b981' },
    { id: 'roteadores', label: 'Catálogo Roteadores', icon: Router, section: 'Ferramentas', color: '#06b6d4' },
    { id: 'devolucoes', label: 'Devoluções', icon: FileCheck, section: 'Ferramentas', color: '#059669' },
    { id: 'manual', label: 'Manual', icon: BookOpen, section: 'Ferramentas', color: '#06b6d4' },
    { id: 'japa', label: 'Ações do Japa', icon: Share2, section: 'Consulta & Escala', color: '#f59e0b' },
    { id: 'escala', label: 'Escala da Rede', icon: CalendarDays, section: 'Consulta & Escala', color: '#2563eb' },
    { id: 'links', label: 'Links Úteis', icon: LinkIcon, section: 'Consulta & Escala', color: '#64748b' },
  ];

  const { allowedModules, preferences, updatePreferences, refresh } = usePanelAccess({
    panel: PANEL_KEYS.ATTENDANT,
    userData,
    activeView: activeTab,
    setActiveView: setActiveTab,
  });
  const menuItems = allowedModules.length ? allowedModules : MENU_ITEMS;
  const dashboardStyles = {
    heroStatCard: {
      padding: '16px 18px',
      borderRadius: '22px',
      background: 'rgba(255,255,255,0.11)',
      border: '1px solid rgba(255,255,255,0.16)',
      display: 'grid',
      gap: '6px',
      boxShadow: '0 20px 32px rgba(2,6,23,0.16)',
      backdropFilter: 'blur(8px)',
    },
    heroStatLabel: {
      fontSize: '11px',
      fontWeight: 900,
      color: 'rgba(255,255,255,0.66)',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    },
    heroStatValue: {
      fontSize: '32px',
      fontWeight: 900,
      color: '#ffffff',
      letterSpacing: '-0.05em',
      lineHeight: 1.05,
    },
    heroStatHelper: {
      fontSize: '13px',
      color: 'rgba(255,255,255,0.76)',
      lineHeight: 1.55,
    },
    sideInsightCard: {
      padding: '18px',
      borderRadius: '24px',
      background: 'rgba(15,23,42,0.26)',
      border: '1px solid rgba(255,255,255,0.14)',
      display: 'grid',
      gap: '14px',
      boxShadow: '0 22px 40px rgba(2,6,23,0.22)',
      backdropFilter: 'blur(10px)',
    },
    sideInsightHeader: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '11px',
      fontWeight: 900,
      color: 'rgba(255,255,255,0.7)',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    },
    sideInsightFooter: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '13px',
      color: 'rgba(255,255,255,0.8)',
      lineHeight: 1.5,
    },
  };

  const DashboardInicio = () => {
    const firstName = userData?.name?.split(' ')[0] || 'Consultor';
    const currentMonthName = new Date().toLocaleString('pt-BR', { month: 'long' });
    const storeLabel = formatStoreLabel(userData);
    const greeting = getGreetingPeriod();
    const profilePhoto = userData?.photo || userData?.photoURL || userData?.avatarUrl || '';
    const greetingLine = {
      'Bom dia': `Manha em movimento, ${firstName}.`,
      'Boa tarde': `Tarde de conversao, ${firstName}.`,
      'Boa noite': `Noite de fechamento, ${firstName}.`,
    }[greeting] || `Painel do seu turno, ${firstName}.`;
    const conversionTone = stats.conversionRate >= 45 ? 'success' : stats.conversionRate >= 25 ? 'warning' : 'danger';
    const plansPulse = stats.totalSales ? (stats.planos / Math.max(stats.totalSales, 1)) * 100 : 0;
    const migrationsPulse = stats.totalSales ? (stats.migracoes / Math.max(stats.totalSales, 1)) * 100 : 0;
    const svasPulse = stats.totalSales ? (stats.svas / Math.max(stats.totalSales, 1)) * 100 : 0;
    const remindersCount = messages.length + rhPendingCount + growthActions.length;
    const topDiscardReason = stats.topDiscardReason || 'Sem descartes relevantes no periodo';
    const averageTicketValue = stats.averageTicket > 0
      ? stats.averageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : 'Sem ticket medio';

    return (
      <Page
        title={null}
        subtitle={null}
        actions={(
          <Btn onClick={() => setActiveTab('nova_venda')}>
            <PlusCircle size={16} /> Registrar lead
          </Btn>
        )}
      >
        <Card
          size="lg"
          style={{
            background: 'linear-gradient(135deg, rgba(10,37,64,0.96), rgba(17,94,89,0.92) 54%, rgba(21,128,61,0.9))',
            borderColor: 'rgba(148,163,184,0.18)',
            color: '#f8fafc',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'grid', gap: '28px', position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                inset: 'auto -120px -160px auto',
                width: '320px',
                height: '320px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,0.18), rgba(255,255,255,0) 68%)',
                pointerEvents: 'none',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap', alignItems: 'stretch', position: 'relative' }}>
              <div style={{ display: 'grid', gap: '18px', flex: '1 1 480px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 14px',
                      borderRadius: '999px',
                      background: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.18)',
                      fontSize: '12px',
                      fontWeight: 800,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    <Building2 size={14} />
                    {storeLabel}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 14px',
                      borderRadius: '999px',
                      background: 'rgba(15,23,42,0.24)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.84)',
                    }}
                  >
                    <Sparkles size={14} />
                    Resumo de {currentMonthName}
                  </span>
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.68)' }}>
                    Dashboard do atendente
                  </div>
                  <div style={{ fontSize: '38px', fontWeight: 900, letterSpacing: '-0.05em', lineHeight: 1.04 }}>
                    {greetingLine}
                  </div>
                  <div style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.82)', maxWidth: '760px' }}>
                    Um painel mais limpo para acompanhar seu ritmo comercial, a saúde do funil e os pontos que pedem atenção antes do próximo atendimento.
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
                  <div style={dashboardStyles.heroStatCard}>
                    <div style={dashboardStyles.heroStatLabel}>Captação no mês</div>
                    <div style={dashboardStyles.heroStatValue}>{stats.totalLeads}</div>
                    <div style={dashboardStyles.heroStatHelper}>leads registrados no seu funil</div>
                  </div>
                  <div style={dashboardStyles.heroStatCard}>
                    <div style={dashboardStyles.heroStatLabel}>Fechamentos</div>
                    <div style={dashboardStyles.heroStatValue}>{stats.totalSales}</div>
                    <div style={dashboardStyles.heroStatHelper}>{Math.round(stats.conversionRate || 0)}% de conversão atual</div>
                  </div>
                  <div style={dashboardStyles.heroStatCard}>
                    <div style={dashboardStyles.heroStatLabel}>Ticket médio</div>
                    <div style={{ ...dashboardStyles.heroStatValue, fontSize: '24px' }}>{averageTicketValue}</div>
                    <div style={dashboardStyles.heroStatHelper}>referência financeira do período</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '14px', minWidth: '280px', flex: '0 1 340px' }}>
                <div
                  style={{
                    padding: '18px',
                    borderRadius: '24px',
                    background: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.16)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    boxShadow: '0 22px 40px rgba(2,6,23,0.22)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt={userData?.name || 'Atendente'}
                      style={{ width: '60px', height: '60px', borderRadius: '20px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.08))',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        fontWeight: 900,
                        flexShrink: 0,
                      }}
                    >
                      {firstName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 900, color: 'rgba(255,255,255,0.64)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Consultora responsável
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '20px', fontWeight: 900, color: '#ffffff', lineHeight: 1.25 }}>
                      {userData?.name || 'Usuário'}
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '13px', color: 'rgba(255,255,255,0.76)', fontWeight: 600 }}>
                      Operação concentrada em {storeLabel}
                    </div>
                  </div>
                </div>

                <div style={dashboardStyles.sideInsightCard}>
                  <div style={dashboardStyles.sideInsightHeader}>
                    <Activity size={16} />
                    Leitura rápida do momento
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', lineHeight: 1.15 }}>
                    {stats.totalSales > 0 ? `${stats.totalSales} vendas em andamento no fechamento do mês` : 'Seu funil está pronto para ganhar tração'}
                  </div>
                  <div style={{ display: 'grid', gap: '10px' }}>
                    <div style={dashboardStyles.sideInsightFooter}>
                      <TrendingUp size={14} />
                      Conversão atual em {Math.round(stats.conversionRate || 0)}%
                    </div>
                    <div style={dashboardStyles.sideInsightFooter}>
                      <CircleDashed size={14} />
                      Principal motivo de perda: {topDiscardReason}
                    </div>
                    <div style={dashboardStyles.sideInsightFooter}>
                      <MessageSquareQuote size={14} />
                      {remindersCount} ponto(s) pedindo sua atenção hoje
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {statsError && <InfoBox type="danger">{statsError}</InfoBox>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <MetricDialCard
            label="Conversão comercial"
            value={stats.totalSales}
            percent={stats.conversionRate}
            accent="#10b981"
            helper={`${stats.totalLeads} leads puxando o funil do mês`}
            icon={Target}
            tone={conversionTone}
          />
          <MetricDialCard
            label="Ritmo de planos"
            value={stats.planos}
            percent={plansPulse}
            accent="#2563eb"
            helper="Percentual de planos dentro das vendas registradas"
            icon={TrendingUp}
            tone="neutral"
          />
          <MetricDialCard
            label="Migrações"
            value={stats.migracoes}
            percent={migrationsPulse}
            accent="#f59e0b"
            helper="Espaço do mix dedicado a migrações no período"
            icon={Activity}
            tone={migrationsPulse > 35 ? 'warning' : 'neutral'}
          />
          <MetricDialCard
            label="SVA e mix"
            value={stats.svas}
            percent={svasPulse}
            accent="#7c3aed"
            helper="Adesão de serviços agregados nas vendas do mês"
            icon={Sparkles}
            tone={svasPulse > 20 ? 'success' : 'neutral'}
          />
        </div>

        <Card title="Pulso da operação" subtitle="Indicadores extras para priorizar o dia antes das ações rápidas">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <PulseTile
              label="RH"
              value={rhPendingCount}
              helper={rhPendingCount > 0 ? 'solicitação(ões) aguardando acompanhamento' : 'sem pendências de RH no momento'}
              accent="#f59e0b"
              icon={FileCheck}
              onClick={() => setActiveTab('rh')}
            />
            <PulseTile
              label="Conversão"
              value={`${Math.round(stats.conversionRate || 0)}%`}
              helper={stats.totalSales > 0 ? `${stats.totalSales} venda(s) em ${stats.totalLeads} lead(s)` : 'acompanhe o gráfico para ganhar tração'}
              accent="#10b981"
              icon={BarChart3}
              onClick={() => setActiveTab('graficos')}
            />
            <PulseTile
              label="Lembretes"
              value={remindersCount}
              helper={messages.length > 0 ? `${messages.length} aviso(s) no mural e rotinas ativas` : 'sem novos avisos no painel agora'}
              accent="#06b6d4"
              icon={MessageSquareQuote}
            />
            <PulseTile
              label="Ações de crescimento"
              value={growthActions.length}
              helper={growthActions.length > 0 ? 'movimentos ativos da loja para acompanhar' : 'nenhuma ação aberta para sua unidade'}
              accent="#ec4899"
              icon={Megaphone}
            />
          </div>
        </Card>

        <Card title="Ações rápidas" subtitle="Atalhos mais usados no dia a dia do atendente">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            {[
              { id: 'nova_venda', title: 'Registrar lead', desc: 'Criar um novo lead com origem, produto e endereço.', icon: PlusCircle },
              { id: 'clientes', title: 'Meu funil', desc: 'Acompanhar negociações e atualizar o status dos leads.', icon: Users },
              { id: 'graficos', title: 'Meus gráficos', desc: 'Ver conversão, mix e motivos de descarte.', icon: BarChart3 },
              { id: 'mapa_leads', title: 'Meu mapa de Leads', desc: 'Localizar no mapa os leads do período.', icon: MapPinned },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                style={{
                  textAlign: 'left',
                  padding: '18px',
                  borderRadius: '18px',
                  border: '1px solid var(--border)',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(15,23,42,0.03))',
                  cursor: 'pointer',
                  display: 'grid',
                  gap: '10px',
                }}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'rgba(37,99,235,0.12)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <item.icon size={20} />
                </div>
                <div style={{ fontWeight: 900, color: 'var(--text-main)' }}>{item.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.desc}</div>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Mural de avisos" subtitle="Recados para a sua loja, para toda a rede ou enviados diretamente para você">
          {messagesError && <InfoBox type="warning">{messagesError}</InfoBox>}
          <div style={{ display: 'grid', gap: '12px' }}>
            {messages.length === 0 && !messagesError && (
              <div style={{ padding: '20px', borderRadius: '16px', background: 'var(--bg-app)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                Nenhum aviso no momento.
              </div>
            )}
            {messages.map((message) => (
              <div key={message.id} style={{ padding: '18px', background: 'var(--bg-app)', borderRadius: '16px', border: '1px solid var(--border)', borderLeft: '4px solid var(--text-brand)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, color: 'var(--text-main)' }}>{message.senderName}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatMessageDate(message.createdAt)}</span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: 1.6 }}>{message.text}</p>
              </div>
            ))}
          </div>
        </Card>

        {!loadingStats && stats.totalLeads === 0 && (
          <InfoBox type="info">
            Este painel mostra apenas os seus dados do mês atual. Assim que novos leads forem entrando, os cards e atalhos vão refletir o seu movimento real.
          </InfoBox>
        )}
      </Page>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'inicio': return <DashboardInicio />;
      case 'graficos': return <PainelVendasAtendente userData={userData} />;
      case 'nova_venda': return <NovoLead userData={userData} onNavigate={setActiveTab} />;
      case 'clientes': return <MeusLeads userData={userData} onNavigate={setActiveTab} />;
      case 'relatorio_leads': return <RelatorioLeads userData={userData} />;
      case 'mapa_leads': return <MeuMapaLeads userData={userData} />;
      case 'rh': return <RhAtendente userData={userData} />;
      case 'colinhas': return <ColinhasAtendente userData={userData} />;
      case 'desencaixe': return <DesencaixeAtendente userData={userData} />;
      case 'roteadores': return <CatalogoRoteadores userData={userData} />;
      case 'devolucoes': return <Devolucoes userData={userData} />;
      case 'manual': return <ManualAtendente userData={userData} />;
      case 'escala': return <EscalaAtendenteView />;
      case 'japa':
        return (
          <div className="readonly-mode">
            <InfoBox type="info">Modo leitura: o cronograma é gerido pelo Marketing.</InfoBox>
            <JapaSupervisor userData={userData} isReadOnly />
          </div>
        );
      case 'links':
        return (
          <div className="readonly-mode">
            <InfoBox type="info">Acesso rápido às plataformas da empresa.</InfoBox>
            <LinksUteis userData={userData} isReadOnly />
          </div>
        );
      case 'configuracoes':
        return (
          <Configuracoes
            userData={userData}
            panel={PANEL_KEYS.ATTENDANT}
            activeModules={menuItems}
            preferences={preferences}
            onPreferencesChange={updatePreferences}
            onSettingsSaved={refresh}
          />
        );
      default: return <DashboardInicio />;
    }
  };

  return (
    <LayoutGlobal
      userData={userData}
      menuItems={menuItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={() => auth?.signOut && auth.signOut()}
      appName="Hub Oquei"
      logoUrl="/favicon.png"
      preferences={preferences}
      onPreferenceChange={updatePreferences}
    >
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap');
          * { font-family: 'Manrope', sans-serif !important; }
          .readonly-mode form,
          .readonly-mode button:not(.tab-btn),
          .readonly-mode input:not([type="month"]),
          .readonly-mode select { pointer-events: none !important; }
        `}
      </style>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', width: '100%' }}>
        {renderContent()}
      </div>
    </LayoutGlobal>
  );
}
