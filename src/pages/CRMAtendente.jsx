import React, { useEffect, useMemo, useState } from 'react';
import { auth } from '../firebase';
import {
  AlertTriangle,
  BarChart3,
  BookMarked,
  BookOpen,
  CalendarDays,
  FileCheck,
  FileSpreadsheet,
  Globe,
  Info,
  Link as LinkIcon,
  Megaphone,
  PlusCircle,
  RefreshCw,
  Share2,
  Store,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

import LayoutGlobal from '../components/LayoutGlobal';
import { colors, dashboardStyles as local, styles as global } from '../styles/globalStyles';
import {
  listenAtendenteStats,
  listenMessages,
  listenPublicAbsenceCalendar,
} from '../services/atendenteDashboardService';
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
import { usePanelAccess } from '../hooks/usePanelAccess';
import { PANEL_KEYS } from '../lib/moduleCatalog';
import { getCachedUserPreferences } from '../services/userSettings';

const KpiCard = ({ title, value, icon: Icon, color }) => {
  const cardColors = {
    blue: { bg: 'var(--bg-primary-light)', txt: 'var(--text-brand)' },
    green: { bg: 'var(--bg-success-light)', txt: '#10b981' },
    purple: { bg: '#faf5ff', txt: '#7e22ce' },
    orange: { bg: 'var(--bg-danger-light)', txt: '#ea580c' },
  };
  const themeConfig = cardColors[color] || cardColors.blue;

  return (
    <div style={{ ...global.card, display: 'flex', alignItems: 'center', gap: '20px', padding: '24px' }}>
      <div style={{ padding: '16px', borderRadius: '16px', background: themeConfig.bg, color: themeConfig.txt }}>
        <Icon size={24} strokeWidth={2.5} />
      </div>
      <div>
        <p style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{title}</p>
        <h3 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-main)', margin: '4px 0 0 0' }}>{value}</h3>
      </div>
    </div>
  );
};

const ActionCard = ({ title, desc, icon: Icon, color, onClick }) => (
  <button
    onClick={onClick}
    style={local.actionCard}
    onMouseEnter={(event) => {
      event.currentTarget.style.borderColor = color;
      event.currentTarget.style.transform = 'translateY(-4px)';
    }}
    onMouseLeave={(event) => {
      event.currentTarget.style.borderColor = 'var(--border)';
      event.currentTarget.style.transform = 'translateY(0)';
    }}
  >
    <div style={{ background: `${color}15`, padding: '15px', borderRadius: '50%', color, marginBottom: '15px' }}>
      <Icon size={28} strokeWidth={2.5} />
    </div>
    <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 5px 0' }}>{title}</h4>
    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>{desc}</p>
  </button>
);

const InlineAlert = ({ tone = 'warning', children }) => {
  const config = {
    warning: { bg: 'var(--bg-danger-light)', border: 'var(--border-danger)', text: '#b45309' },
    info: { bg: 'var(--bg-primary-light)', border: 'var(--text-brand)', text: 'var(--text-brand)' },
  }[tone];

  return (
    <div style={{ background: config.bg, border: `1px solid ${config.border}`, borderRadius: '14px', padding: '14px 16px', fontSize: '13px', color: config.text }}>
      {children}
    </div>
  );
};

function formatMessageDate(value) {
  if (!value) return 'Hoje';
  if (typeof value?.toDate === 'function') return value.toDate().toLocaleDateString('pt-BR');
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000).toLocaleDateString('pt-BR');
  return new Date(value).toLocaleDateString('pt-BR');
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

  const closedStores = filteredEntries.filter((item) => item.isClosedStore);
  const absencesByDay = filteredEntries.reduce((accumulator, item) => {
    const day = Number(String(item.date || '').slice(-2));
    if (!day) return accumulator;
    if (!accumulator[day]) accumulator[day] = [];
    accumulator[day].push(item);
    return accumulator;
  }, {});

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysArray = Array.from({ length: daysInMonth }, (_, index) => index + 1);

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out', width: '100%' }}>
      <div style={local.readonlyBanner}>
        <Info size={18} /> Modo leitura: a escala usa apenas o espelho publico de ausencias da rede.
      </div>

      {loadError && <InlineAlert>{loadError}</InlineAlert>}

      {!loadError && closedStores.length > 0 && (
        <div style={{ background: 'var(--bg-danger-light)', border: '1px solid var(--border-danger)', padding: '20px', borderRadius: '16px', marginBottom: '30px' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', margin: '0 0 10px 0', fontSize: '15px', fontWeight: 'bold' }}>
            <AlertTriangle size={20} /> Lojas sem cobertura prevista
          </h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {closedStores.map((item) => (
              <div key={item.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-danger)', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Store size={14} /> {item.storeName || item.storeId} <span style={{ color: 'var(--border)' }}>|</span> {String(item.date || '').split('-').reverse().join('/')}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <h3 style={global.sectionTitle}><CalendarDays size={20} color="var(--text-brand)" /> Calendario de ausencias</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="month"
            value={monthKey}
            onChange={(event) => {
              const [selectedYear, selectedMonth] = event.target.value.split('-');
              setCurrentDate(new Date(Number(selectedYear), Number(selectedMonth) - 1, 1));
            }}
            style={global.input}
          />
          <select value={selectedStoreFilter} onChange={(event) => setSelectedStoreFilter(event.target.value)} style={global.select}>
            <option value="all">Todas as lojas</option>
            {uniqueStores.map((store) => <option key={store} value={store}>{store}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ ...global.card, padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando calendario da rede...</div>
      ) : (
        <div style={local.calendarGrid}>
          <div style={local.calendarHeaderRow}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((day, index) => (
              <div key={day} style={{ ...local.calendarHeaderCell, color: index === 0 || index === 6 ? '#ef4444' : 'var(--text-muted)' }}>{day}</div>
            ))}
          </div>

          <div style={local.calendarDaysRow}>
            {Array.from({ length: firstDayOfWeek }).map((_, index) => <div key={`empty-${index}`} style={local.calendarCellEmpty} />)}
            {daysArray.map((day) => {
              const dayAbsences = absencesByDay[day] || [];
              const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

              return (
                <div key={day} style={{ ...local.calendarCell, background: isToday ? 'var(--bg-primary-light)' : 'var(--bg-card)' }}>
                  <span style={{ ...local.calendarDayNum, color: isToday ? 'var(--text-brand)' : 'var(--text-main)' }}>{day}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {dayAbsences.map((item) => {
                      const isVacation = String(item.type || '').toLowerCase().includes('ferias');
                      const isClosed = item.isClosedStore || item.coverage === 'loja_fechada';
                      const coverageLabel = isClosed ? 'Loja fechada' : item.coverage ? 'Coberto' : 'Pendente';

                      return (
                        <div key={item.id} style={{ ...local.absenceTag, background: isVacation ? 'var(--bg-primary-light)' : 'var(--bg-danger-light)', borderColor: isVacation ? 'var(--text-brand)' : 'var(--border-danger)', color: isVacation ? 'var(--text-brand)' : '#ef4444' }}>
                          <strong style={{ fontSize: '11px', color: 'var(--text-main)' }}>{item.storeName || item.storeId}</strong>
                          <span style={{ marginTop: '2px' }}>{item.attendantFirstName || 'Colaborador'} ({isVacation ? 'Ferias' : 'Ausencia'})</span>
                          <span style={isClosed ? local.tagAlert : item.coverage ? local.tagSuccess : local.tagWarning}>{coverageLabel}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CRMAtendente({ userData }) {
  const [activeTab, setActiveTab] = useState(() => getCachedUserPreferences(userData?.uid).defaultModule || 'inicio');
  const [stats, setStats] = useState({ totalLeads: 0, totalSales: 0, planos: 0, svas: 0, migracoes: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [messages, setMessages] = useState([]);
  const [messagesError, setMessagesError] = useState('');

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

  const MENU_ITEMS = [
    { id: 'inicio', label: 'Inicio', icon: Globe, section: 'Geral', color: '#10b981' },
    { id: 'graficos', label: 'Meus Graficos', icon: BarChart3, section: 'Geral', color: '#ec4899' },
    { id: 'nova_venda', label: 'Registrar Lead', icon: PlusCircle, highlight: true, section: 'Comercial', color: '#2563eb' },
    { id: 'clientes', label: 'Meu Funil', icon: Users, section: 'Comercial', color: '#10b981' },
    { id: 'relatorio_leads', label: 'Relatorio Mensal', icon: FileSpreadsheet, section: 'Comercial', color: '#8b5cf6' },
    { id: 'rh', label: 'Solicitacoes RH', icon: FileCheck, section: 'Ferramentas', color: '#f59e0b' },
    { id: 'colinhas', label: 'Colinhas', icon: BookMarked, section: 'Ferramentas', color: '#8b5cf6' },
    { id: 'desencaixe', label: 'Caixa da Loja', icon: Wallet, section: 'Ferramentas', color: '#10b981' },
    { id: 'manual', label: 'Manual', icon: BookOpen, section: 'Ferramentas', color: '#06b6d4' },
    { id: 'japa', label: 'Acoes do Japa', icon: Share2, section: 'Consulta & Escala' },
    { id: 'escala', label: 'Escala da Rede', icon: CalendarDays, section: 'Consulta & Escala' },
    { id: 'links', label: 'Links Uteis', icon: LinkIcon, section: 'Consulta & Escala' },
  ];

  const { allowedModules, preferences, updatePreferences, refresh } = usePanelAccess({
    panel: PANEL_KEYS.ATTENDANT,
    userData,
    activeView: activeTab,
    setActiveView: setActiveTab,
  });
  const menuItems = allowedModules.length ? allowedModules : MENU_ITEMS;

  const DashboardInicio = () => {
    const firstName = userData?.name?.split(' ')[0] || 'Consultor';
    const currentMonthName = new Date().toLocaleString('pt-BR', { month: 'long' });

    return (
      <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
        <div style={local.heroSection}>
          <div>
            <h2 style={local.heroTitle}>Ola, {firstName}!</h2>
            <p style={local.heroSub}>Resumo das suas vendas de <strong style={{ color: 'var(--text-main)' }}>{currentMonthName}</strong>.</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' }}>
              <div style={local.heroBadgeSmall}>Planos: {stats.planos}</div>
              <div style={local.heroBadgeSmall}>Migracoes: {stats.migracoes}</div>
              <div style={local.heroBadgeSmall}>SVAs: {stats.svas}</div>
            </div>
          </div>
          <div style={local.heroBadge}>
            <span style={local.heroBadgeLabel}>Sua Loja</span>
            <span style={local.heroBadgeValue}>{userData?.cityId || 'Geral'}</span>
          </div>
        </div>

        <h3 style={global.sectionTitle}>Seus numeros (mes atual)</h3>
        {statsError && <InlineAlert>{statsError}</InlineAlert>}
        {loadingStats ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Calculando seus resultados...</div>
        ) : (
          <div style={global.grid4}>
            <KpiCard title="Leads Captados" value={stats.totalLeads} icon={Users} color="blue" />
            <KpiCard title="Vendas Fechadas" value={stats.totalSales} icon={Target} color="green" />
            <KpiCard title="Planos Novos" value={stats.planos} icon={TrendingUp} color="purple" />
            <KpiCard title="Migracoes" value={stats.migracoes} icon={RefreshCw} color="orange" />
          </div>
        )}

        <h3 style={global.sectionTitle}>O que deseja fazer agora?</h3>
        <div style={local.actionGrid}>
          <ActionCard title="Registrar Lead" desc="Cadastre um novo cliente" icon={PlusCircle} onClick={() => setActiveTab('nova_venda')} color="#2563eb" />
          <ActionCard title="Meu Funil" desc="Acompanhe negociacoes" icon={Users} onClick={() => setActiveTab('clientes')} color="#10b981" />
          <ActionCard title="Meus Graficos" desc="Analise sua conversao" icon={BarChart3} onClick={() => setActiveTab('graficos')} color="#ec4899" />
          <ActionCard title="Colinhas" desc="Dicas e scripts" icon={BookMarked} onClick={() => setActiveTab('colinhas')} color="#f59e0b" />
        </div>

        <div style={{ ...global.card, marginTop: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ ...global.sectionTitle, margin: 0, color: '#10b981' }}><Megaphone size={18} /> Mural de Avisos</h3>
          </div>

          {messagesError && <InlineAlert>{messagesError}</InlineAlert>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map((message) => (
              <div key={message.id} style={{ padding: '15px', background: 'var(--bg-panel)', borderRadius: '12px', borderLeft: '3px solid var(--text-brand)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--text-brand)' }}>{message.senderName}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatMessageDate(message.createdAt)}</span>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-main)', margin: 0, lineHeight: '1.5' }}>{message.text}</p>
              </div>
            ))}
            {!messages.length && !messagesError && <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum aviso no momento.</p>}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'inicio': return <DashboardInicio />;
      case 'graficos': return <PainelVendasAtendente userData={userData} />;
      case 'nova_venda': return <NovoLead userData={userData} onNavigate={setActiveTab} />;
      case 'clientes': return <MeusLeads userData={userData} onNavigate={setActiveTab} />;
      case 'relatorio_leads': return <RelatorioLeads userData={userData} />;
      case 'rh': return <RhAtendente userData={userData} />;
      case 'colinhas': return <ColinhasAtendente userData={userData} />;
      case 'desencaixe': return <DesencaixeAtendente userData={userData} />;
      case 'manual': return <ManualAtendente userData={userData} />;
      case 'escala': return <EscalaAtendenteView />;
      case 'japa':
        return (
          <div className="readonly-mode">
            <div style={local.readonlyBanner}><Info size={18} /> Modo leitura: cronograma gerido pelo Marketing.</div>
            <JapaSupervisor userData={userData} isReadOnly />
          </div>
        );
      case 'links':
        return (
          <div className="readonly-mode">
            <div style={local.readonlyBanner}><Info size={18} /> Acesso rapido as plataformas da empresa.</div>
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
