import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import {
  doc, setDoc, addDoc, collection, getDocs, deleteDoc, updateDoc, serverTimestamp, query, orderBy, limit, where
} from 'firebase/firestore';
import { signOut as authSignOut } from 'firebase/auth';
import {
  Store, Clock, TrendingUp, Users, Calendar,
  DollarSign, Zap, Globe, Menu, LogOut,
  BarChart3, MapPin, User, CheckCircle,
  X, CalendarDays, FileCheck, UserPlus, Mail, LayoutGrid,
  Briefcase, ShoppingBag, AlertTriangle, RefreshCw, AlertCircle, Tv, XCircle, ArrowRight, Megaphone,
  Wallet
} from 'lucide-react';

import { GestaoSupervisores, GestaoAtendentes } from './GestaoColaboradores';
import FaltasSupervisor from './FaltasSupervisor';
import ManualSupervisor from './ManualSupervisor';
import AgendaSupervisor from './AgendaSupervisor';
import PatrocinioSupervisor from './PatrocinioSupervisor';
import RhSupervisor from './RhSupervisor';
import DesencaixeSupervisor from './DesencaixeSupervisor';
import Comunicados from './Comunicados';
import BancoHorasSupervisor from './BancoHorasSupervisor';
import LojasOquei from './LojasOquei';
import GestaoEstrutura from './GestaoEstrutura';
import GestaoProdutos from './GestaoProdutos';
import Wallboard from './Wallboard';
import HubOquei from './HubOquei';
import RelatorioGeral from './RelatorioGeral';
import LinksUteis from './LinksUteis';

// ============================================================================
// 1. ESTILOS GLOBAIS DO COMPONENTE
// ============================================================================
const styles = {
  layout: { display: 'flex', height: '100vh', backgroundColor: '#fcfdfe', overflow: 'hidden' },
  sidebar: { backgroundColor: '#ffffff', borderRight: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 100 },
  logoArea: { height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f1f5f9', padding: '0 20px' },
  nav: { flex: 1, padding: '15px', overflowY: 'auto' },
  navSection: { fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', margin: '20px 0 8px 12px' },
  footer: { padding: '24px', borderTop: '1px solid #f1f5f9' },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: '14px', width: '100%', padding: '14px', borderRadius: '14px', border: 'none', backgroundColor: '#fff1f2', color: '#e11d48', cursor: 'pointer', fontWeight: '800' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { height: '80px', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px' },
  menuIconBtn: { backgroundColor: '#f8fafc', border: 'none', cursor: 'pointer', color: '#64748b', padding: '10px', borderRadius: '10px' },
  avatar: { width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' },
  contentScroll: { padding: '30px', overflowY: 'auto', flex: 1 },
  heroSection: { background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '40px', borderRadius: '24px', color: 'white', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  heroRefreshBtn: { background: 'rgba(255,255,255,0.1)', border: 'none', padding: '12px', borderRadius: '12px', color: 'white', cursor: 'pointer' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '40px' },
  kpiCard: { backgroundColor: '#ffffff', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
  kpiLabel: { fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', margin: 0 },
  kpiValue: { fontSize: '32px', fontWeight: '900', color: '#0f172a', margin: '4px 0 0 0' },
  actionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px', marginBottom: '40px' },
  actionMenuBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px 15px', cursor: 'pointer', transition: 'all 0.2s' },
  dashboardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '30px' },
  dashboardCard: { background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden', height: '100%', minHeight: '300px', display: 'flex', flexDirection: 'column' },
  cardHeaderSmall: { padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fcfcfc' },
  cardBodyScroll: { padding: '0', overflowY: 'auto', maxHeight: '350px', flex: 1 },
  miniAlertItem: { display: 'flex', alignItems: 'flex-start', gap: '15px', padding: '16px 24px', borderBottom: '1px solid #f8fafc' },
  miniAlertItemRed: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '16px 24px', background: '#fef2f2', borderBottom: '1px solid #fee2e2' },
  miniAgendaItem: { display: 'flex', alignItems: 'center', gap: '15px', padding: '16px 24px', borderBottom: '1px solid #f8fafc' },
  badgeCount: { background: '#ef4444', color: 'white', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '900', marginLeft: 'auto' },
  checkBtn: { border: 'none', background: 'transparent', cursor: 'pointer', color: '#10b981' },
  resolveBtn: { border: 'none', background: '#fff1f2', color: '#e11d48', fontSize: '11px', fontWeight: 'bold', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' },
  emptyState: { fontSize: '13px', color: '#94a3b8', textAlign: 'center', fontStyle: 'italic', marginTop: '50px' },
  sectionHeader: { fontSize: '18px', fontWeight: '900', color: '#1e293b', marginBottom: '20px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(5px)' },
  modalBox: { backgroundColor: 'white', padding: '32px', borderRadius: '28px', maxWidth: '500px', width: '90%', position: 'relative' },
  modalClose: { position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#cbd5e1' },
  btnSecondary: { backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '12px', padding: '12px 20px', fontSize: '14px', fontWeight: 'bold' },
  primaryBtn: { padding: '12px 20px', borderRadius: '12px', border: 'none', color: '#ffffff', backgroundColor: '#2563eb', fontWeight: 'bold' }
};

// ============================================================================
// 2. SUBCOMPONENTES VISUAIS (Devem estar fora do componente principal)
// ============================================================================
const SidebarItem = ({ icon: Icon, label, active, onClick, open, color }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      padding: '12px 14px',
      background: active ? '#f1f5f9' : 'transparent',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: '0.2s',
      marginBottom: '4px',
      color: active ? '#0f172a' : '#64748b',
      justifyContent: open ? 'flex-start' : 'center',
      position: 'relative'
    }}
  >
    <Icon size={20} color={color || (active ? '#2563eb' : 'currentColor')} strokeWidth={active ? 2.5 : 2} />
    {open && (
      <span style={{ marginLeft: '14px', fontSize: '14px', fontWeight: active ? '700' : '500' }}>
        {label}
      </span>
    )}
    {active && open && (
      <div style={{ position: 'absolute', right: '12px', width: '6px', height: '6px', borderRadius: '50%', background: '#2563eb' }} />
    )}
  </button>
);

const KpiCard = ({ title, value, icon: Icon, color }) => {
  const colors = {
    blue: { bg: '#eff6ff', txt: '#2563eb' },
    green: { bg: '#ecfdf5', txt: '#059669' },
    purple: { bg: '#faf5ff', txt: '#7e22ce' },
    orange: { bg: '#fff7ed', txt: '#ea580c' }
  };
  const theme = colors[color] || colors.blue;

  return (
    <div style={styles.kpiCard}>
      <div style={{ padding: '16px', borderRadius: '20px', background: theme.bg, color: theme.txt }}>
        <Icon size={28} strokeWidth={2.5} />
      </div>
      <div>
        <p style={styles.kpiLabel}>{title}</p>
        <h3 style={styles.kpiValue}>{value}</h3>
      </div>
    </div>
  );
};

const ActionMenuBtn = ({ label, icon: Icon, onClick, color }) => (
  <button
    onClick={onClick}
    style={styles.actionMenuBtn}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = color || '#2563eb';
      e.currentTarget.style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = '#e2e8f0';
      e.currentTarget.style.transform = 'translateY(0)';
    }}
  >
    <div style={{ background: `${color || '#2563eb'}15`, padding: '14px', borderRadius: '16px', color: color || '#2563eb', marginBottom: '8px' }}>
      <Icon size={28} strokeWidth={2.5} />
    </div>
    <span style={{ fontSize: '13px', fontWeight: '800', color: '#334155', textAlign: 'center' }}>
      {label}
    </span>
  </button>
);

// ============================================================================
// 3. COMPONENTE PRINCIPAL
// ============================================================================
export default function PainelCoordenador({ userData }) {
  const [activeView, setActiveView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  const [stats, setStats] = useState({ clusters: 0, cidades: 0, supervisores: 0, atendentes: 0 });
  const [listaClusters, setListaClusters] = useState([]);
  const [listaCidades, setListaCidades] = useState([]);
  const [listaSupervisores, setListaSupervisores] = useState([]);
  const [listaAtendentes, setListaAtendentes] = useState([]);
  const [listaProdutos, setListaProdutos] = useState([]);
  const [pendingAbsences, setPendingAbsences] = useState([]);
  const [reunioes, setReunioes] = useState([]);
  const [mensagens, setMensagens] = useState([]);

  const MENU_ITEMS = [
    { id: 'dashboard', label: 'Visão Geral', icon: Globe, section: 'Principal', color: '#2563eb' },
    { id: 'comunicados', label: 'Comunicados', icon: Megaphone, section: 'Principal', color: '#ea580c' },
    { id: 'wallboard', label: 'Wallboard TV', icon: Tv, section: 'Principal', color: '#00f2fe' },
    { id: 'hub_oquei', label: 'HubOquei Radar', icon: Zap, section: 'Inteligência', color: '#00f2fe' },
    { id: 'relatorio_geral', label: 'Relatório BI', icon: BarChart3, section: 'Inteligência', color: '#3b82f6' },
    { id: 'admin_supervisores', label: 'Supervisores', icon: UserPlus, section: 'Gestão', color: '#9333ea' },
    { id: 'admin_atendentes', label: 'Atendentes', icon: User, section: 'Gestão', color: '#2563eb' },
    { id: 'estrutura', label: 'Estrutura Lojas', icon: MapPin, section: 'Gestão', color: '#4f46e5' },
    { id: 'produtos', label: 'Produtos/SVA', icon: ShoppingBag, section: 'Gestão', color: '#f59e0b' },
    { id: 'lojas_view', label: 'Portfolio', icon: Store, section: 'Operação' },
    { id: 'faltas', label: 'Faltas Globais', icon: AlertCircle, section: 'Operação' },
    { id: 'rh_requests', label: 'Pedidos RH', icon: Clock, section: 'Operação' },
    { id: 'desencaixe', label: 'Financeiro', icon: Wallet, section: 'Operação' },
    { id: 'links', label: 'Links Úteis', icon: LayoutGrid, section: 'Ferramentas' }
  ];

  const getDatesInRange = (start, end) => {
    if (!start || !end) return [];
    const dateArray = [];
    let currentDate = new Date(start + 'T12:00:00');
    const stopDate = new Date(end + 'T12:00:00');
    while (currentDate <= stopDate) {
      dateArray.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dateArray;
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      const cSnap = await getDocs(collection(db, "clusters"));
      const citySnap = await getDocs(collection(db, "cities"));
      const userSnap = await getDocs(collection(db, "users"));
      const prodSnap = await getDocs(collection(db, "products"));

      const clustersData = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const citiesData = citySnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const usersData = userSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      setListaClusters(clustersData);
      setListaCidades(citiesData);
      setListaSupervisores(usersData.filter(u => u.role === 'supervisor'));
      setListaAtendentes(usersData.filter(u => u.role === 'attendant'));
      setListaProdutos(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      setStats({
        clusters: cSnap.size,
        cidades: citySnap.size,
        supervisores: usersData.filter(u => u.role === 'supervisor').length,
        atendentes: usersData.filter(u => u.role === 'attendant').length
      });

      const today = new Date().toLocaleDateString('en-CA');
      const qAbsences = query(collection(db, "absences"));
      const snapAbsences = await getDocs(qAbsences);

      const criticalAbsences = snapAbsences.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(abs => {
          if (abs.type !== 'falta') return false;
          if (abs.endDate < today) return false;
          if (abs.status === 'Pendente') return true;
          if (!abs.coverageMap || Object.keys(abs.coverageMap).length === 0) return true;
          const dates = getDatesInRange(abs.startDate, abs.endDate);
          return dates.some(date => !abs.coverageMap[date] || abs.coverageMap[date] === 'loja_fechada');
        });

      setPendingAbsences(criticalAbsences);

      if (auth.currentUser) {
        const qEvents = query(collection(db, "events"), where("userId", "==", auth.currentUser.uid));
        const snapEvents = await getDocs(qEvents);
        setReunioes(snapEvents.docs.map(d => ({ id: d.id, ...d.data() })));
      }

      const qMsgs = query(collection(db, "messages"), orderBy("createdAt", "desc"), limit(10));
      const snapMsgs = await getDocs(qMsgs);
      const msgsData = snapMsgs.docs.map(d => ({ id: d.id, ...d.data() })).filter(msg => msg.to === 'coordinator' || (auth.currentUser && msg.to === auth.currentUser.uid));
      setMensagens(msgsData.map(msg => ({ ...msg, read: msg.readBy && auth.currentUser && msg.readBy.includes(auth.currentUser.uid) })));

    } catch (err) { 
      console.error(err); 
    }
    setLoading(false);
  };

  useEffect(() => { 
    carregarDados(); 
  }, [activeView]);

  const atualizarUsuario = async (id, data) => {
    try {
      await updateDoc(doc(db, "users", id), data);
      setNotification({ type: 'success', message: 'Dados atualizados com sucesso!' });
      carregarDados();
    } catch (e) { 
      setNotification({ type: 'error', message: e.message }); 
    }
  };

  const deletarItem = (col, id) => {
    setConfirmation({
      title: "Excluir Registro",
      message: "Tem certeza que deseja excluir este registro permanentemente?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, col, id));
          carregarDados();
          setNotification({ type: 'success', message: 'Registro excluído com sucesso!' });
        } catch (e) { 
          setNotification({ type: 'error', message: e.message }); 
        }
        setConfirmation(null);
      }
    });
  };

  const markAsRead = (id) => {
    setMensagens(mensagens.map(m => m.id === id ? { ...m, read: true } : m));
  };

  const DashboardHome = () => {
    const unreadMsgs = mensagens.filter(m => !m.read);
    const now = new Date();
    const limit48h = new Date();
    limit48h.setHours(now.getHours() + 48);
    
    const upcomingEvents = reunioes
      .filter(evt => {
        const evtDate = new Date(`${evt.date}T${evt.time || '00:00'}`);
        return evtDate >= now && evtDate <= limit48h;
      })
      .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));

    return (
      <div style={{ animation: 'fadeIn 0.5s ease' }}>
        <div style={styles.heroSection}>
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: '900', margin: '0 0 10px 0' }}>Centro de Comando</h2>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '15px' }}>
              Gestão global executiva • {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button onClick={carregarDados} style={styles.heroRefreshBtn}>
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div style={styles.kpiGrid}>
          <KpiCard title="Regionais" value={stats.clusters} icon={MapPin} color="blue" />
          <KpiCard title="Lojas" value={stats.cidades} icon={Store} color="green" />
          <KpiCard title="Supervisores" value={stats.supervisores} icon={UserPlus} color="purple" />
          <KpiCard title="Atendentes" value={stats.atendentes} icon={Users} color="orange" />
        </div>

        <h3 style={styles.sectionHeader}>Acesso Rápido</h3>
        <div style={styles.actionGrid}>
          <ActionMenuBtn label="Gerir Supervisores" icon={UserPlus} color="#9333ea" onClick={() => setActiveView('admin_supervisores')} />
          <ActionMenuBtn label="HubOquei (Radar)" icon={Zap} color="#00f2fe" onClick={() => setActiveView('hub_oquei')} />
          <ActionMenuBtn label="BI Master" icon={BarChart3} color="#3b82f6" onClick={() => setActiveView('relatorio_geral')} />
          <ActionMenuBtn label="Portfolio Lojas" icon={Store} color="#059669" onClick={() => setActiveView('lojas_view')} />
          <ActionMenuBtn label="Escala & Faltas" icon={AlertTriangle} color="#ef4444" onClick={() => setActiveView('faltas')} />
          <ActionMenuBtn label="Enviar Comunicado" icon={Megaphone} color="#ea580c" onClick={() => setActiveView('comunicados')} />
        </div>

        <h3 style={styles.sectionHeader}>Alertas & Operação</h3>
        <div style={styles.dashboardGrid}>
          <div style={styles.dashboardCard}>
            <div style={styles.cardHeaderSmall}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Megaphone size={16} color="#2563eb" />
                <span style={{ fontWeight: 'bold', color: '#334155' }}>Inbox da Coordenação</span>
              </div>
              {unreadMsgs.length > 0 && <span style={styles.badgeCount}>{unreadMsgs.length}</span>}
            </div>
            <div style={styles.cardBodyScroll}>
              {unreadMsgs.length === 0 ? (
                <p style={styles.emptyState}>Nenhuma mensagem nova.</p>
              ) : (
                unreadMsgs.map(msg => (
                  <div key={msg.id} style={styles.miniAlertItem}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 'bold', fontSize: '12px', color: '#1e40af' }}>{msg.senderName}</p>
                      <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.3' }}>{msg.text}</p>
                    </div>
                    <button onClick={() => markAsRead(msg.id)} style={styles.checkBtn}>
                      <CheckCircle size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ ...styles.dashboardCard, borderTop: pendingAbsences.length > 0 ? '4px solid #ef4444' : '4px solid #10b981' }}>
            <div style={styles.cardHeaderSmall}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <AlertTriangle size={16} color={pendingAbsences.length > 0 ? "#dc2626" : "#059669"} />
                <span style={{ fontWeight: 'bold', color: '#334155' }}>Alertas de Escala</span>
              </div>
            </div>
            <div style={styles.cardBodyScroll}>
              {pendingAbsences.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#059669' }}>
                  <CheckCircle size={32} style={{ margin: '0 auto 8px auto', opacity: 0.8 }} />
                  <p style={{ fontSize: '14px', fontWeight: '600' }}>Operação 100%</p>
                </div>
              ) : (
                pendingAbsences.map(falta => (
                  <div key={falta.id} style={styles.miniAlertItemRed}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 'bold', fontSize: '12px', color: '#7f1d1d', margin: 0 }}>{falta.storeId}</p>
                      <p style={{ fontSize: '11px', color: '#b91c1c', margin: 0 }}>{falta.type.toUpperCase()}</p>
                    </div>
                    <button onClick={() => setActiveView('faltas')} style={styles.resolveBtn}>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={styles.dashboardCard}>
            <div style={styles.cardHeaderSmall}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <CalendarDays size={16} color="#d97706" />
                <span style={{ fontWeight: 'bold', color: '#334155' }}>Sua Agenda (48h)</span>
              </div>
            </div>
            <div style={styles.cardBodyScroll}>
              {upcomingEvents.length === 0 ? (
                <p style={styles.emptyState}>Sem eventos próximos.</p>
              ) : (
                upcomingEvents.map(evt => (
                  <div key={evt.id} style={styles.miniAgendaItem}>
                    <div style={{ fontWeight: 'bold', color: '#d97706', fontSize: '11px', background: '#fffbeb', padding: '4px 8px', borderRadius: '6px' }}>
                      {evt.time}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>{evt.title}</div>
                      <div style={{ fontSize: '10px', color: '#64748b' }}>{evt.location}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardHome />;
      case 'comunicados': return <Comunicados userData={userData} />;
      case 'admin_supervisores': return <GestaoSupervisores lista={listaSupervisores} clusters={listaClusters} refresh={carregarDados} onDelete={deletarItem} onUpdate={atualizarUsuario} setNotification={setNotification} />;
      case 'admin_atendentes': return <GestaoAtendentes lista={listaAtendentes} cidades={listaCidades} refresh={carregarDados} onDelete={deletarItem} onUpdate={atualizarUsuario} setNotification={setNotification} />;
      case 'estrutura': return <GestaoEstrutura clusters={listaClusters} cities={listaCidades} refresh={carregarDados} onDelete={deletarItem} setNotification={setNotification} />;
      case 'produtos': return <GestaoProdutos produtos={listaProdutos} refresh={carregarDados} onDelete={deletarItem} />;
      case 'lojas_view': return <LojasOquei isEditingAllowed={true} />;
      case 'faltas': return <FaltasSupervisor userData={userData} />;
      case 'banco_horas': return <BancoHorasSupervisor userData={userData} />;
      case 'rh_requests': return <RhSupervisor userData={userData} />;
      case 'reunioes': return <AgendaSupervisor userData={userData} />;
      case 'japa': return <JapaSupervisor userData={userData} />;
      case 'patrocinio': return <PatrocinioSupervisor userData={userData} />;
      case 'desencaixe': return <DesencaixeSupervisor userData={userData} />;
      case 'orientacoes': return <ManualSupervisor userData={userData} />;
      case 'links': return <LinksUteis userData={userData} />;
      case 'hub_oquei': return <HubOquei userData={userData} />;
      case 'relatorio_geral': return <RelatorioGeral userData={userData} />;
      default: return <DashboardHome />;
    }
  };

  if (activeView === 'wallboard') {
    return <Wallboard userData={userData} onExit={() => setActiveView('dashboard')} />;
  }

  return (
    <div style={styles.layout}>
      <aside style={{ ...styles.sidebar, width: isSidebarOpen ? '290px' : '95px' }}>
        <div style={styles.logoArea}>
          {isSidebarOpen ? (
            <img src="https://lh6.googleusercontent.com/proxy/OQmnkD6TxExvN5uvw-zWOpJHZ6qW-J6aJaUPlJX4Y06C_IRXAN3CooFhuzMisQmGCpNS9aQkpjPNcH2YOZs-CeiOuVKjlDO6oqSsDIFrSS2hGse8ug" alt="Logo" style={{ height: '40px', objectFit: 'contain' }} />
          ) : (
            <div style={{ background: '#2563eb', padding: '10px', borderRadius: '10px' }}><Zap size={24} color="white" /></div>
          )}
        </div>
        <nav style={styles.nav}>
          {MENU_ITEMS.map((item, index) => {
            const showHeader = isSidebarOpen && (index === 0 || MENU_ITEMS[index - 1].section !== item.section);
            return (
              <div key={item.id}>
                {showHeader && <div style={styles.navSection}>{item.section}</div>}
                <SidebarItem icon={item.icon} label={item.label} color={item.color} active={activeView === item.id} onClick={() => setActiveView(item.id)} open={isSidebarOpen} />
              </div>
            );
          })}
        </nav>
        <div style={styles.footer}>
          <button onClick={() => authSignOut(auth)} style={styles.logoutBtn}>
            <LogOut size={20} />
            {isSidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>
      
      <main style={styles.main}>
        <header style={styles.header}>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={styles.menuIconBtn}><Menu size={24} /></button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ textAlign: 'right', display: 'none', sm: 'block' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{userData?.name}</div>
              <div style={{ fontSize: '10px', color: '#2563eb', fontWeight: '800' }}>COORDENAÇÃO MASTER</div>
            </div>
            <div style={styles.avatar}>GC</div>
          </div>
        </header>
        <div style={styles.contentScroll}>
          {renderContent()}
        </div>
      </main>

      {notification && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalBox, borderLeft: notification.type === 'success' ? '6px solid #10b981' : '6px solid #ef4444' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              {notification.type === 'success' ? <CheckCircle size={32} color="#10b981" /> : <AlertCircle size={32} color="#ef4444" />}
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>{notification.type === 'success' ? 'Sucesso!' : 'Atenção'}</h3>
                <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>{notification.message}</p>
              </div>
            </div>
            <button onClick={() => setNotification(null)} style={styles.modalClose}><X size={20} /></button>
          </div>
        </div>
      )}

      {confirmation && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>{confirmation.title}</h3>
              <p style={{ margin: '10px 0 0 0', color: '#64748b', lineHeight: '1.5' }}>{confirmation.message}</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmation(null)} style={styles.btnSecondary}>Cancelar</button>
              <button onClick={confirmation.onConfirm} style={styles.primaryBtn}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}