import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { signOut as authSignOut } from 'firebase/auth';
import { 
  Store, BookOpen, Clock, TrendingUp, Users, Calendar, 
  DollarSign, Zap, Globe, Menu, Bell, LogOut, BarChart3, MessageCircle, 
  FileSpreadsheet, ExternalLink, MapPin, AlertTriangle, CheckCircle, 
  ListTodo, UserX, CalendarClock, Briefcase, Wallet, Megaphone, 
  FileCheck, Mail, LayoutGrid, Share2, ArrowRight, User, XCircle, RefreshCw,
  ChevronRight, AlertCircle, Flame, Activity, Tv, PhoneCall, CalendarDays, TrendingDown
} from 'lucide-react';

// ============================================================================
// --- IMPORTAÇÃO DOS MÓDULOS ---
// ============================================================================
import FaltasSupervisor from './FaltasSupervisor';
import ManualSupervisor from './ManualSupervisor';
import AgendaSupervisor from './AgendaSupervisor';
import PatrocinioSupervisor from './PatrocinioSupervisor';
import RhSupervisor from './RhSupervisor';
import DesencaixeSupervisor from './DesencaixeSupervisor';
import JapaSupervisor from './JapaSupervisor';
import Comunicados from './Comunicados';
import SalaDeGuerra from './SalaDeGuerra';
import PainelVendas from './PainelVendas';
import BancoHorasSupervisor from './BancoHorasSupervisor';
import LinksUteis from './LinksUteis';
import Wallboard from './Wallboard';
import HubOquei from './HubOquei';
import RelatorioGeral from './RelatorioGeral';
import LaboratorioChurn from './LaboratorioChurn';

// ============================================================================
// 1. ESTILOS GLOBAIS DO COMPONENTE
// ============================================================================
const styles = {
  layout: { display: 'flex', height: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif", color: '#1e293b', overflow: 'hidden' },
  
  // SIDEBAR
  sidebar: { background: 'white', borderRight: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 50 },
  sidebarHeader: { height: '90px', display: 'flex', alignItems: 'center', gap: '14px', padding: '0 28px', borderBottom: '1px solid #f1f5f9' },
  logoBox: { background: '#2563eb', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(37,99,235,0.2)' },
  brandTitle: { fontSize: '15px', fontWeight: '900', textTransform: 'uppercase', margin: 0, letterSpacing: '-0.02em' },
  brandSub: { fontSize: '10px', fontWeight: '800', color: '#2563eb', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' },
  navScroll: { flex: 1, padding: '16px', overflowY: 'auto' },
  navSection: { fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', margin: '24px 0 8px 16px', letterSpacing: '0.1em' },
  sidebarFooter: { padding: '24px', borderTop: '1px solid #f1f5f9' },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: '#fff1f2', color: '#e11d48', cursor: 'pointer', fontWeight: '800', fontSize: '14px', transition: '0.2s' },
  
  // MAIN & HEADER
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { height: '90px', background: 'white', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', flexShrink: 0 },
  iconBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' },
  avatar: { width: '46px', height: '46px', borderRadius: '16px', background: '#0f172a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '18px', border: '3px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' },
  content: { flex: 1, overflowY: 'auto', padding: '40px' },

  // HERO SECTION
  heroTitle: { fontSize: '32px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.03em' },
  heroSub: { fontSize: '16px', color: '#64748b', margin: 0 },
  refreshBtn: { background: 'white', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '12px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' },
  
  // GRIDS & CARDS
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' },
  kpiCard: { background: 'white', padding: '30px', borderRadius: '24px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' },
  actionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px', marginBottom: '40px' },
  actionMenuBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '24px 15px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' },
  dashboardGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' },
  dashboardCard: { background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%', minHeight: '300px', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' },
  
  // CARD INTERNALS
  cardHeaderSmall: { padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardBodyScroll: { padding: '10px', maxHeight: '250px', overflowY: 'auto' },
  miniAlertItem: { display: 'flex', alignItems: 'flex-start', gap: '15px', padding: '16px 20px', borderBottom: '1px solid #f8fafc' },
  miniAlertItemRed: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#fef2f2', borderRadius: '12px', marginBottom: '8px', border: '1px solid #fee2e2' },
  miniAgendaItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderBottom: '1px solid #f1f5f9' },
  
  // BUTTONS & BADGES
  badgeCount: { background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold', marginLeft: 'auto' },
  checkBtn: { background: '#dbeafe', border: 'none', padding: '6px', borderRadius: '8px', color: '#2563eb', cursor: 'pointer' },
  resolveBtn: { border: 'none', background: '#fecaca', color: '#dc2626', fontSize: '11px', fontWeight: 'bold', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' },
  emptyState: { fontSize: '13px', color: '#94a3b8', textAlign: 'center', fontStyle: 'italic', padding: '30px 10px' },
  sectionHeader: { fontSize: '18px', fontWeight: '800', color: '#334155', marginBottom: '24px', marginTop: '40px' },

  // OTHER VIEWS
  viewTitle: { fontSize: '26px', fontWeight: '900', color: '#0f172a', marginBottom: '20px' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' },
  card: { background: 'white', padding: '28px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 4px 10px rgba(0,0,0,0.01)' },
  statusActive: { color: '#10b981', fontSize: '11px', fontWeight: '900', background: '#ecfdf5', padding: '4px 10px', borderRadius: '8px' },
  statusInactive: { color: '#ef4444', fontSize: '11px', fontWeight: '900', background: '#fef2f2', padding: '4px 10px', borderRadius: '8px' },
  linkCard: { background: 'white', padding: '28px', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', cursor: 'pointer', transition: 'transform 0.3s ease' },

  // TOAST GLOBAL
  toastWrapper: { position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' },
  toastSuccess: { background: '#10b981', color: 'white', padding: '15px 25px', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 10px 25px rgba(16,185,129,0.3)', animation: 'slideUp 0.3s ease-out' },
  toastError: { background: '#ef4444', color: 'white', padding: '15px 25px', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 10px 25px rgba(239,68,68,0.3)', animation: 'slideUp 0.3s ease-out' }
};

// ============================================================================
// 2. SUBCOMPONENTES VISUAIS
// ============================================================================
const SidebarItem = ({ icon: Icon, label, active, onClick, open, color }) => (
  <button 
    onClick={onClick} 
    style={{
      display: 'flex', alignItems: 'center', width: '100%', padding: '14px 16px', 
      background: active ? '#f1f5f9' : 'transparent', border: 'none', borderRadius: '14px', 
      cursor: 'pointer', transition: '0.2s', marginBottom: '6px', position: 'relative',
      color: active ? '#0f172a' : '#64748b'
    }}
  >
    <div style={{ position: 'relative' }}>
      <Icon size={20} color={color || (active ? '#2563eb' : 'currentColor')} strokeWidth={active ? 2.5 : 2} />
    </div>
    {open && <span style={{ marginLeft: '14px', fontSize: '14px', fontWeight: active ? '700' : '500' }}>{label}</span>}
  </button>
);

const SidebarDivider = ({ label, open }) => (
  <div style={{ 
    margin: '24px 0 8px 16px', fontSize: '11px', fontWeight: '800', 
    color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em',
    display: open ? 'block' : 'none' 
  }}>
    {label}
  </div>
);

const KpiCard = ({ title, value, icon: Icon, color }) => {
  const colors = { 
    blue: { bg: '#eff6ff', txt: '#2563eb' }, 
    green: { bg: '#ecfdf5', txt: '#059669' }, 
    purple: { bg: '#faf5ff', txt: '#7e22ce' }, 
    orange: { bg: '#fff7ed', txt: '#ea580c' }, 
    red: { bg: '#fef2f2', txt: '#ef4444' } 
  };
  const theme = colors[color] || colors.blue;
  return (
    <div style={styles.kpiCard}>
      <div style={{ padding: '14px', borderRadius: '14px', background: theme.bg, color: theme.txt }}>
        <Icon size={26} />
      </div>
      <div>
        <p style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', margin: 0 }}>{title}</p>
        <h3 style={{ fontSize: '26px', fontWeight: '900', color: '#1e293b', margin: '4px 0 0 0' }}>{value}</h3>
      </div>
    </div>
  );
};

const ActionMenuBtn = ({ label, icon: Icon, onClick, color }) => (
  <button 
    onClick={onClick} 
    style={styles.actionMenuBtn}
    onMouseEnter={e => { e.currentTarget.style.borderColor = color || '#2563eb'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)'; }}
  >
    <div style={{ background: `${color || '#2563eb'}15`, padding: '14px', borderRadius: '16px', color: color || '#2563eb', marginBottom: '8px' }}>
      <Icon size={28} strokeWidth={2.5} />
    </div>
    <span style={{ fontSize: '13px', fontWeight: '800', color: '#334155', textAlign: 'center' }}>{label}</span>
  </button>
);

// ============================================================================
// 3. COMPONENTE PRINCIPAL
// ============================================================================
export default function PainelSupervisor({ userData }) {
  const [activeView, setActiveView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [myStores, setMyStores] = useState([]);
  const [pendingAbsences, setPendingAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [reunioes, setReunioes] = useState([]);
  const [mensagens, setMensagens] = useState([]);
  
  // NOVOS ESTADOS PARA ALERTA DE SANGRAMENTO E TOASTS
  const [bleedingAlerts, setBleedingAlerts] = useState([]);
  const [toasts, setToasts] = useState([]);

  // ==========================================================================
  // --- MÓDULO DE AUTOMAÇÃO DE RH (Feature Flag) ---
  // ==========================================================================
  // Desativado por padrão para evitar o envio de e-mails de teste durante a fase beta.
  const ENABLE_RH_AUTOMATION = false; 

  const handleRHAutomation = async (type, payload) => {
    if (!ENABLE_RH_AUTOMATION) {
      console.log(`🔒 [MODO TESTE] E-mail para RH Bloqueado. Ação: ${type}`, payload);
      showToast(`Ação registada internamente. (Automação RH em modo OFF)`, "success");
      return;
    }

    try {
      // Envia notificação gerando um documento na collection 'mail'
      // Utiliza a extensão Trigger Email (Firebase) configurada para rh@oquei.net.br
      await addDoc(collection(db, "mail"), {
        to: "rh@oquei.net.br",
        message: {
          subject: `[Aviso Operacional] ${type} - ${payload.employeeName || 'Colaborador'}`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #334155; line-height: 1.6;">
              <h2 style="color: #2563eb;">Notificação de ${type}</h2>
              <p>O(A) Supervisor(a) <strong>${userData?.name || 'Gestão'}</strong> acabou de registar ou aprovar uma nova ocorrência.</p>
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <p style="margin: 5px 0;"><strong>Colaborador Alvo:</strong> ${payload.employeeName || 'N/A'}</p>
                <p style="margin: 5px 0;"><strong>Loja/Regional:</strong> ${payload.storeName || 'N/A'}</p>
                <p style="margin: 5px 0;"><strong>Data / Período:</strong> ${payload.date || 'N/A'}</p>
                <p style="margin: 5px 0;"><strong>Motivo / Justificativa:</strong> ${payload.reason || 'N/A'}</p>
              </div>
              <p style="font-size: 11px; color: #94a3b8; margin-top: 20px;">Mensagem gerada e enviada automaticamente pelo Ecossistema Oquei Telecom.</p>
            </div>
          `
        },
        createdAt: serverTimestamp()
      });
      showToast("E-mail automático enviado ao RH com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao notificar RH automaticamente:", err);
      showToast("Ação registada, mas ocorreu um erro na automação de e-mail.", "error");
    }
  };
  // ==========================================================================

  // Função Global de Toast
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // --- MENU DE NAVEGAÇÃO ---
  const MENU_ITEMS = [
    { id: 'dashboard', label: 'Visão Geral', icon: Globe, section: 'Principal' },
    { id: 'comunicados', label: 'Comunicados', icon: Megaphone, section: 'Principal', badge: mensagens.filter(m => !m.read).length },
    { id: 'wallboard', label: 'Modo TV', icon: Tv, section: 'Principal' },
    
    // SISTEMAS
    { id: 'hub_oquei', label: 'HubOquei Radar', icon: Zap, section: 'Inteligência', color: '#00f2fe' },
    { id: 'churn', label: 'Laboratório Churn', icon: Activity, section: 'Inteligência', color: '#8b5cf6' },
    { id: 'relatorio_geral', label: 'Relatório BI', icon: BarChart3, section: 'Inteligência', color: '#3b82f6' },
    { id: 'vendas', label: 'Painel Vendas', icon: TrendingUp, section: 'Sistemas' },
    { id: 'war_room', label: 'Sala de Guerra', icon: Flame, section: 'Sistemas' }, 
    { id: 'banco_horas', label: 'Banco de Horas', icon: Clock, section: 'Sistemas' },
    
    // GESTÃO
    { id: 'lojas', label: 'Minhas Lojas', icon: Store, section: 'Gestão' },
    { id: 'faltas', label: 'Faltas & Escala', icon: UserX, section: 'Gestão', alert: pendingAbsences.length > 0 },
    { id: 'rh_requests', label: 'Solicitações RH', icon: FileCheck, section: 'Gestão' },
    { id: 'orientacoes', label: 'Manual Supervisor', icon: BookOpen, section: 'Gestão' },
    
    // AGENDA E FERRAMENTAS
    { id: 'reunioes', label: 'Agenda', icon: CalendarClock, section: 'Agenda' },
    { id: 'patrocinio', label: 'Pedir Patrocínio', icon: DollarSign, section: 'Financeiro' },
    { id: 'desencaixe', label: 'Desencaixe', icon: Wallet, section: 'Financeiro' },
    { id: 'japa', label: 'Ações do Japa', icon: Share2, section: 'Ferramentas' },
    { id: 'links', label: 'Links Úteis', icon: LayoutGrid, section: 'Ferramentas' },
  ];

  const getDatesInRange = (start, end) => {
    if(!start || !end) return [];
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
      if (userData?.clusterId) {
        const qStore = query(collection(db, "cities"), where("clusterId", "==", userData.clusterId));
        const snapStore = await getDocs(qStore);
        const storesData = snapStore.docs.map(d => ({ id: d.id, ...d.data() }));
        setMyStores(storesData);
        
        const myStoreIds = storesData.map(s => s.id);
        const myStoreNames = storesData.map(s => s.name);
        const todayStr = new Date().toLocaleDateString('en-CA'); 
        
        const qAbsences = query(collection(db, "absences"));
        const snapAbsences = await getDocs(qAbsences);
        
        const criticalAbsences = snapAbsences.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(abs => {
             if (abs.type !== 'falta') return false;
             const isMyCluster = abs.clusterId === userData.clusterId;
             const isMyStore = myStoreIds.includes(abs.storeId);
             if (!isMyCluster && !isMyStore) return false;
             if (abs.endDate < todayStr) return false;
             if (abs.status === 'Pendente') return true; 
             if (!abs.coverageMap || Object.keys(abs.coverageMap).length === 0) return true; 
             
             const dates = getDatesInRange(abs.startDate, abs.endDate);
             return dates.some(date => !abs.coverageMap[date] || abs.coverageMap[date] === 'loja_fechada');
          });

        setPendingAbsences(criticalAbsences);

        // LÓGICA DE ALERTA DE SANGRAMENTO (Últimos 3 dias)
        if (myStoreNames.length > 0) {
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          const dateStr3Days = threeDaysAgo.toISOString().split('T')[0];

          const qLeads = query(
            collection(db, "leads"),
            where("date", ">=", dateStr3Days)
          );
          
          const snapLeads = await getDocs(qLeads);
          const recentLeads = snapLeads.docs.map(d => d.data()).filter(l => myStoreNames.includes(l.cityId));
          
          const bleeding = [];
          
          myStoreNames.forEach(cityName => {
            const cityLeads = recentLeads.filter(l => l.cityId === cityName);
            const sales = cityLeads.filter(l => ['Contratado', 'Instalado'].includes(l.status)).length;
            const cancels = cityLeads.filter(l => l.status === 'Descartado').length;
            
            if (cancels > sales && cancels > 0) {
              bleeding.push({
                city: cityName,
                sales,
                cancels,
                diff: cancels - sales
              });
            }
          });
          
          setBleedingAlerts(bleeding);
          
          if (bleeding.length > 0 && activeView === 'dashboard') {
            showToast(`Atenção: ${bleeding.length} loja(s) com sangramento de base nos últimos 3 dias!`, 'error');
          }
        }
      }

      if (auth.currentUser) {
        const qEvents = query(collection(db, "events"), where("userId", "==", auth.currentUser.uid));
        const snapEvents = await getDocs(qEvents);
        setReunioes(snapEvents.docs.map(d => ({ id: d.id, ...d.data() })));
      }

      const qMsgs = query(collection(db, "messages"), orderBy("createdAt", "desc"), limit(5));
      const snapMsgs = await getDocs(qMsgs);
      const msgsData = snapMsgs.docs.map(d => ({ id: d.id, ...d.data() })).filter(msg => msg.to === 'all' || msg.to === auth.currentUser?.uid);
      setMensagens(msgsData.map(msg => ({ ...msg, read: msg.readBy && msg.readBy.includes(auth.currentUser?.uid) })));

    } catch (err) { 
      console.error("Erro ao carregar dados:", err); 
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeView === 'dashboard') carregarDados();
  }, [activeView, userData]);

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
      <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
        <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={styles.heroTitle}>Olá, {userData?.name?.split(' ')[0]}</h2>
            <p style={styles.heroSub}>Gestão do Cluster: <strong style={{color: '#2563eb', textTransform: 'uppercase'}}>{userData?.clusterId || 'Geral'}</strong></p>
          </div>
          <button onClick={() => { carregarDados(); showToast('Painel atualizado!'); }} style={styles.refreshBtn} title="Atualizar Dados">
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div style={styles.kpiGrid}>
          <KpiCard title="Lojas" value={myStores.length} icon={Store} color="blue" />
          <KpiCard title="Reuniões" value={reunioes.length} icon={Calendar} color="purple" />
          <KpiCard title="Pendências" value={pendingAbsences.length} icon={AlertCircle} color={pendingAbsences.length > 0 ? "red" : "green"} />
          <KpiCard title="Alertas de Evasão" value={bleedingAlerts.length} icon={TrendingDown} color={bleedingAlerts.length > 0 ? "orange" : "blue"} />
        </div>
        
        <h3 style={styles.sectionHeader}>Acesso Rápido</h3>
        <div style={styles.actionGrid}>
           <ActionMenuBtn label="Lab. Churn" icon={Activity} color="#8b5cf6" onClick={() => setActiveView('churn')} />
           <ActionMenuBtn label="Painel de Vendas" icon={TrendingUp} color="#10b981" onClick={() => setActiveView('vendas')} />
           <ActionMenuBtn label="Sala de Guerra" icon={Flame} color="#ef4444" onClick={() => setActiveView('war_room')} />
           <ActionMenuBtn label="Faltas & Escala" icon={AlertTriangle} color="#ea580c" onClick={() => setActiveView('faltas')} />
           <ActionMenuBtn label="Banco de Horas" icon={Clock} color="#3b82f6" onClick={() => setActiveView('banco_horas')} />
           <ActionMenuBtn label="Desencaixe" icon={Wallet} color="#059669" onClick={() => setActiveView('desencaixe')} />
        </div>

        <h3 style={styles.sectionHeader}>Alertas & Operação</h3>
        <div style={styles.dashboardGrid}>
          
          {/* SANGRAMENTO / CHURN CRÍTICO */}
          {bleedingAlerts.length > 0 && (
            <div style={{...styles.dashboardCard, borderTop: '4px solid #f97316', gridColumn: '1 / -1', minHeight: 'auto'}}>
              <div style={styles.cardHeaderSmall}>
                <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                  <AlertTriangle size={16} color="#ea580c"/> 
                  <span style={{fontWeight:'bold', color:'#9a3412'}}>Sangramento de Base (Últimas 72h)</span>
                </div>
              </div>
              <div style={{padding: '15px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px'}}>
                {bleedingAlerts.map((alert, idx) => (
                  <div key={idx} style={{background: '#fff7ed', border: '1px solid #fed7aa', padding: '15px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                     <div>
                       <h4 style={{margin: '0 0 5px 0', color: '#9a3412', fontSize: '15px'}}>{alert.city}</h4>
                       <span style={{fontSize: '12px', color: '#c2410c'}}>Vendas: <strong>{alert.sales}</strong> | Descartes: <strong style={{color: '#ef4444'}}>{alert.cancels}</strong></span>
                     </div>
                     <button onClick={() => setActiveView('churn')} style={{background: '#ea580c', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer'}}>
                       Ver Clínica
                     </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={styles.dashboardCard}>
            <div style={styles.cardHeaderSmall}>
              <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                <Megaphone size={16} color="#2563eb"/> 
                <span style={{fontWeight:'bold', color:'#334155'}}>Comunicados</span>
              </div>
              {unreadMsgs.length > 0 && <span style={styles.badgeCount}>{unreadMsgs.length}</span>}
            </div>
            <div style={styles.cardBodyScroll}>
              {unreadMsgs.length === 0 ? <p style={styles.emptyState}>Nenhuma mensagem nova.</p> : (
                unreadMsgs.map(msg => (
                  <div key={msg.id} style={styles.miniAlertItem}>
                    <div style={{flex: 1}}>
                      <p style={{fontWeight:'bold', fontSize:'12px', color:'#1e40af', margin: '0 0 4px 0'}}>{msg.senderName}</p>
                      <p style={{fontSize:'12px', color:'#475569', lineHeight:'1.3', margin: 0}}>{msg.text}</p>
                    </div>
                    <button onClick={() => setActiveView('comunicados')} style={styles.checkBtn} title="Ver"><ArrowRight size={16}/></button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{...styles.dashboardCard, borderTop: pendingAbsences.length > 0 ? '4px solid #ef4444' : '4px solid #10b981'}}>
             <div style={styles.cardHeaderSmall}>
              <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                <AlertTriangle size={16} color={pendingAbsences.length > 0 ? "#dc2626" : "#059669"}/> 
                <span style={{fontWeight:'bold', color: pendingAbsences.length > 0 ? "#991b1b" : "#334155"}}>Escala & Faltas</span>
              </div>
            </div>
            <div style={styles.cardBodyScroll}>
              {pendingAbsences.length === 0 ? (
                <div style={{textAlign:'center', padding:'20px', color:'#059669'}}>
                  <CheckCircle size={24} style={{margin:'0 auto 5px auto', opacity:0.5}}/>
                  <p style={{fontSize:'12px'}}>Escala 100% coberta.</p>
                </div>
              ) : (
                pendingAbsences.map(falta => {
                    const storeName = myStores.find(s => s.id === falta.storeId)?.name || falta.storeId;
                    const dateDisplay = new Date(falta.startDate + 'T12:00:00').toLocaleDateString('pt-BR');

                    return (
                      <div key={falta.id} style={styles.miniAlertItemRed}>
                        <div>
                          <p style={{fontWeight:'bold', fontSize:'12px', color:'#7f1d1d', margin: '0 0 4px 0'}}>{storeName}</p>
                          <div style={{fontSize:'11px', color:'#b91c1c', display:'flex', gap:'5px', alignItems:'center'}}>
                            <User size={12}/> {falta.attendantId ? 'Colab. Ausente' : 'Atendente'}
                          </div>
                          <span style={{fontSize:'10px', color:'#991b1b', background:'#fee2e2', padding:'2px 6px', borderRadius:'4px', marginTop:'4px', display:'inline-block'}}>
                            {dateDisplay}
                          </span>
                        </div>
                        <button onClick={() => setActiveView('faltas')} style={styles.resolveBtn}>
                          <ArrowRight size={14}/>
                        </button>
                      </div>
                    )
                })
              )}
            </div>
          </div>

          <div style={styles.dashboardCard}>
             <div style={styles.cardHeaderSmall}>
              <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                <CalendarDays size={16} color="#d97706"/> 
                <span style={{fontWeight:'bold', color:'#334155'}}>Agenda (48h)</span>
              </div>
            </div>
            <div style={styles.cardBodyScroll}>
              {upcomingEvents.length === 0 ? <p style={styles.emptyState}>Sem compromissos próximos.</p> : (
                upcomingEvents.map(evt => (
                  <div key={evt.id} style={styles.miniAgendaItem}>
                    <div style={{fontWeight:'bold', color:'#d97706', fontSize:'11px', background:'#fffbeb', padding:'4px 8px', borderRadius:'6px', minWidth: '45px', textAlign:'center'}}>
                      {evt.time}
                    </div>
                    <div style={{flex: 1, minWidth: 0}}>
                      <div style={{fontSize:'12px', fontWeight:'bold', color:'#334155', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{evt.title}</div>
                      <div style={{fontSize:'10px', color:'#64748b', display:'flex', alignItems:'center', gap:'3px', marginTop: '2px'}}>
                         <MapPin size={10}/> <span style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{evt.location || 'Sem local'}</span>
                      </div>
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

  const LojasView = () => (
    <div style={{ animation: 'fadeIn 0.5s' }}>
      <div style={{marginBottom: '25px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h2 style={styles.viewTitle}>Minhas Lojas</h2>
        <span style={{background: '#eff6ff', color: '#2563eb', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '900', textTransform:'uppercase'}}>
          {myStores.length} Unidades
        </span>
      </div>
      <div style={styles.grid3}>
        {myStores.map(store => (
          <div key={store.id} style={styles.card}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
              <div style={{padding:'10px', background:'#eff6ff', borderRadius:'10px', color:'#2563eb'}}><Store size={24} /></div>
              {store.active ? <span style={styles.statusActive}>ATIVA</span> : <span style={styles.statusInactive}>INATIVA</span>}
            </div>
            <h3 style={{fontWeight:'bold', fontSize:'18px', color:'#1e293b', marginBottom:'5px'}}>{store.name}</h3>
            <p style={{fontSize:'12px', color:'#64748b', margin: 0}}>ID: {store.id}</p>
            <div style={{marginTop:'15px', paddingTop:'15px', borderTop:'1px solid #f1f5f9', display:'flex', gap:'10px', fontSize:'13px', color:'#475569'}}>
              <div style={{display:'flex', alignItems:'center', gap:'5px'}}><Clock size={14}/> {store.hours || '08:00 - 18:00'}</div>
            </div>
          </div>
        ))}
        {myStores.length === 0 && (
          <div style={{gridColumn: '1/-1', padding: '60px', textAlign: 'center', color: '#94a3b8', background: 'white', borderRadius: '20px', border: '1px dashed #cbd5e1'}}>
            Nenhuma loja vinculada a este cluster.
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardHome />;
      case 'hub_oquei': return <HubOquei userData={userData} />;
      case 'churn': return <LaboratorioChurn userData={userData} />;
      case 'relatorio_geral': return <RelatorioGeral userData={userData} />;
      case 'vendas': return <PainelVendas userData={userData} />;
      case 'war_room': return <SalaDeGuerra userData={userData} />;
      case 'banco_horas': return <BancoHorasSupervisor userData={userData} />;
      case 'lojas': return <LojasView />;
      case 'faltas': return <FaltasSupervisor userData={userData} onRHAutomation={handleRHAutomation} />;
      case 'rh_requests': return <RhSupervisor userData={userData} onRHAutomation={handleRHAutomation} />;
      case 'reunioes': return <AgendaSupervisor userData={userData} />;
      case 'patrocinio': return <PatrocinioSupervisor userData={userData} />;
      case 'desencaixe': return <DesencaixeSupervisor userData={userData} />;
      case 'comunicados': return <Comunicados userData={userData} />;
      case 'links': return <LinksUteis userData={userData} />;
      case 'orientacoes': return <ManualSupervisor />;
      default: return <DashboardHome />;
    }
  };

  const isWideView = ['war_room', 'vendas', 'hub_oquei', 'relatorio_geral', 'churn'].includes(activeView);

  if (activeView === 'wallboard') {
    return <Wallboard userData={userData} onExit={() => setActiveView('dashboard')} />;
  }

  return (
    <div style={styles.layout}>
      <aside style={{ ...styles.sidebar, width: isSidebarOpen ? '280px' : '90px' }}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logoBox}><Briefcase size={24} color="white" /></div>
          {isSidebarOpen && <div><h1 style={styles.brandTitle}>Oquei Telecom</h1><p style={styles.brandSub}>Supervisor</p></div>}
        </div>
        <nav style={styles.navScroll}>
          {MENU_ITEMS.map((item, index) => {
            const showHeader = isSidebarOpen && (index === 0 || MENU_ITEMS[index - 1].section !== item.section);

            return (
              <div key={item.id}>
                {isSidebarOpen && showHeader && <div style={styles.navSection}>{item.section}</div>}
                <button 
                  onClick={() => item.url ? window.open(item.url, '_blank') : setActiveView(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', width: '100%', padding: '14px 16px', 
                    border: 'none', borderRadius: '14px', cursor: 'pointer', transition: '0.2s', marginBottom: '6px',
                    backgroundColor: activeView === item.id && !item.url ? '#f1f5f9' : 'transparent', 
                    color: activeView === item.id && !item.url ? '#0f172a' : '#64748b'
                  }}
                >
                  <div style={{position:'relative'}}>
                    <item.icon size={20} color={activeView === item.id && !item.url ? (item.color || '#2563eb') : '#94a3b8'} strokeWidth={activeView === item.id ? 2.5 : 2} />
                    {item.alert && <span style={{position:'absolute', top:-2, right:-2, width:8, height:8, background:'#ef4444', borderRadius:'50%', border:'1px solid white'}}></span>}
                  </div>
                  {isSidebarOpen && <span style={{marginLeft:'14px', fontSize:'14px', fontWeight: activeView === item.id ? '700' : '500'}}>{item.label}</span>}
                  {item.badge > 0 && isSidebarOpen && <span style={styles.badgeCount}>{item.badge}</span>}
                </button>
              </div>
            );
          })}
        </nav>
        <div style={styles.sidebarFooter}>
          <button onClick={() => authSignOut(auth)} style={styles.logoutBtn}>
            <LogOut size={20} /> {isSidebarOpen && <span>Encerrar Sessão</span>}
          </button>
        </div>
      </aside>
      
      <main style={styles.main}>
        <header style={styles.header}>
          <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={styles.iconBtn}><Menu size={20} /></button>
            <h2 style={{fontSize:'20px', fontWeight:'800', color:'#1e293b', textTransform:'capitalize', margin: 0}}>
              {MENU_ITEMS.find(i => i.id === activeView)?.label || activeView.replace('_', ' ')}
            </h2>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
            <div style={{textAlign:'right'}}>
              <p style={{fontSize:'13px', fontWeight:'800', margin:0}}>{userData?.name || 'Supervisor'}</p>
              <p style={{fontSize:'11px', color:'#64748b', margin:0}}>Supervisor Regional</p>
            </div>
            <div style={styles.avatar}>{userData?.name ? userData.name[0] : 'S'}</div>
          </div>
        </header>
        <div style={styles.content}>
          <div style={{maxWidth: isWideView ? '100%' : '1200px', margin:'0 auto'}}>
            {renderContent()}
          </div>
        </div>
      </main>

      {/* TOAST SYSTEM GLOBAL PARA O PAINEL */}
      <div style={styles.toastWrapper}>
        {toasts.map(toast => (
          <div key={toast.id} style={toast.type === 'error' ? styles.toastError : styles.toastSuccess}>
             {toast.type === 'error' ? <AlertTriangle size={20}/> : <CheckCircle size={20}/>}
             <span>{toast.message}</span>
          </div>
        ))}
      </div>

    </div>
  );
}