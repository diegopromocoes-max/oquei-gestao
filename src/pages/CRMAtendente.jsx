import React, { useEffect, useMemo, useState } from 'react';
import { auth } from '../firebase';
import {
  BarChart3,
  BookMarked,
  BookOpen,
  Building2,
  CalendarDays,
  FileCheck,
  FileSpreadsheet,
  Globe,
  Info,
  Link as LinkIcon,
  MapPinned,
  Megaphone,
  PlusCircle,
  Share2,
  Users,
  Wallet,
} from 'lucide-react';

import LayoutGlobal from '../components/LayoutGlobal';
import { Btn, Card, InfoBox, KpiCard, Page, styles as uiStyles } from '../components/ui';
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
import MeuMapaLeads from './MeuMapaLeads';
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
    { id: 'inicio', label: 'Início', icon: Globe, section: 'Geral', color: '#10b981' },
    { id: 'graficos', label: 'Meus Gráficos', icon: BarChart3, section: 'Geral', color: '#ec4899' },
    { id: 'nova_venda', label: 'Registrar Lead', icon: PlusCircle, highlight: true, section: 'Comercial', color: '#2563eb' },
    { id: 'clientes', label: 'Meu Funil', icon: Users, section: 'Comercial', color: '#10b981' },
    { id: 'relatorio_leads', label: 'Relatório Mensal', icon: FileSpreadsheet, section: 'Comercial', color: '#8b5cf6' },
    { id: 'mapa_leads', label: 'Meu mapa de Leads', icon: MapPinned, section: 'Comercial', color: '#0ea5e9' },
    { id: 'rh', label: 'Solicitações RH', icon: FileCheck, section: 'Ferramentas', color: '#f59e0b' },
    { id: 'colinhas', label: 'Colinhas', icon: BookMarked, section: 'Ferramentas', color: '#8b5cf6' },
    { id: 'desencaixe', label: 'Caixa da Loja', icon: Wallet, section: 'Ferramentas', color: '#10b981' },
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

  const DashboardInicio = () => {
    const firstName = userData?.name?.split(' ')[0] || 'Consultor';
    const currentMonthName = new Date().toLocaleString('pt-BR', { month: 'long' });
    const storeLabel = formatStoreLabel(userData);
    const greeting = getGreetingPeriod();
    const profilePhoto = userData?.photo || userData?.photoURL || userData?.avatarUrl || '';

    return (
      <Page
        title="Visão Geral do CRM Atendente"
        subtitle={`Bem-vindo, ${firstName}. Aqui está o resumo do seu CRM em ${currentMonthName}.`}
        actions={(
          <Btn onClick={() => setActiveTab('nova_venda')}>
            <PlusCircle size={16} /> Registrar lead
          </Btn>
        )}
      >
        <Card
          size="lg"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(37,99,235,0.06))',
            borderColor: 'rgba(16,185,129,0.18)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', alignItems: 'stretch' }}>
            <div style={{ display: 'grid', gap: '16px', flex: '1 1 420px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '16px',
                    background: 'rgba(37,99,235,0.12)',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 24px rgba(37,99,235,0.12)',
                  }}
                >
                  <Building2 size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Loja de atendimento
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '28px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
                    {storeLabel}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '8px' }}>
                <div style={{ fontSize: '30px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
                  {greeting}, {firstName}.
                </div>
                <div style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: 600, maxWidth: '720px', lineHeight: 1.6 }}>
                  Seu painel acompanha captacao, conversao e rotina comercial da unidade <strong style={{ color: 'var(--text-main)' }}>{storeLabel}</strong>, com foco total no seu funil do mes.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ padding: '10px 14px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Planos <strong style={{ color: 'var(--text-main)' }}>{stats.planos}</strong>
                </div>
                <div style={{ padding: '10px 14px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Migracoes <strong style={{ color: 'var(--text-main)' }}>{stats.migracoes}</strong>
                </div>
                <div style={{ padding: '10px 14px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>
                  SVAs <strong style={{ color: 'var(--text-main)' }}>{stats.svas}</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '12px', minWidth: '280px', flex: '0 1 320px' }}>
              <div
                style={{
                  padding: '18px',
                  borderRadius: '20px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: '0 10px 24px rgba(15,23,42,0.06)',
                }}
              >
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt={userData?.name || 'Atendente'}
                    style={{ width: '58px', height: '58px', borderRadius: '18px', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }}
                  />
                ) : (
                  <div
                    style={{
                      width: '58px',
                      height: '58px',
                      borderRadius: '18px',
                      background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(16,185,129,0.18))',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      fontWeight: 900,
                      flexShrink: 0,
                    }}
                  >
                    {firstName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Atendente responsavel
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '18px', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1.25 }}>
                    {userData?.name || 'Usuario'}
                  </div>
                  <div style={{ marginTop: '4px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    CRM da unidade {storeLabel}
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px 18px', borderRadius: '18px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pipeline em foco</div>
                <div style={{ marginTop: '6px', fontSize: '22px', fontWeight: 900, color: 'var(--text-main)' }}>
                  {stats.totalLeads} leads no mes
                </div>
                <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {stats.totalSales} vendas registradas no mesmo periodo
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'none' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Sua loja
              </div>
              <div style={{ marginTop: '8px', fontSize: '30px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
                {userData?.cityName || userData?.cityId || 'Loja não vinculada'}
              </div>
              <div style={{ marginTop: '10px', fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Planos: <strong>{stats.planos}</strong> · Migrações: <strong>{stats.migracoes}</strong> · SVAs: <strong>{stats.svas}</strong>
              </div>
            </div>
            <div style={{ display: 'grid', gap: '10px', minWidth: '220px' }}>
              <div style={{ padding: '14px 16px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pipeline em foco</div>
                <div style={{ marginTop: '6px', fontSize: '20px', fontWeight: 900, color: 'var(--text-main)' }}>
                  {stats.totalLeads} leads no mês
                </div>
              </div>
              <div style={{ padding: '14px 16px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fechamentos</div>
                <div style={{ marginTop: '6px', fontSize: '20px', fontWeight: 900, color: 'var(--text-main)' }}>
                  {stats.totalSales} vendas registradas
                </div>
              </div>
            </div>
          </div>
        </Card>

        {statsError && <InfoBox type="danger">{statsError}</InfoBox>}

        <div style={uiStyles.grid4}>
          <KpiCard label="Leads captados" valor={stats.totalLeads} icon={<Users size={16} />} accent="#2563eb" />
          <KpiCard label="Vendas fechadas" valor={stats.totalSales} icon={<PlusCircle size={16} />} accent="#10b981" />
          <KpiCard label="Planos novos" valor={stats.planos} icon={<BarChart3 size={16} />} accent="#7c3aed" />
          <KpiCard label="Migrações" valor={stats.migracoes} icon={<FileSpreadsheet size={16} />} accent="#f59e0b" />
        </div>

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
                  borderRadius: '16px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-app)',
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
