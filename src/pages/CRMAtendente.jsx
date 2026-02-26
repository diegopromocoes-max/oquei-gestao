import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import {
  LayoutDashboard, PlusCircle, Users, BookOpen,
  Wallet, FileText, BookMarked, TrendingUp, BarChart2, Tv,
  Globe, Menu, LogOut, ChevronDown, ChevronRight, Target, Package, Zap
} from 'lucide-react';

// ============================================================================
// --- IMPORTAÇÃO DAS PÁGINAS DO ATENDENTE ---
// ============================================================================
import PainelVendas from './PainelVendas';
import NovoLead from './NovoLead';
import MeusLeads from './MeusLeads';
import RelatorioGeral from './RelatorioGeral';
import ColinhasAtendente from './ColinhasAtendente';
import DesencaixeAtendente from './DesencaixeAtendente';
import ManualAtendente from './ManualAtendente';

// ============================================================================
// 1. ESTILOS GLOBAIS DO COMPONENTE
// ============================================================================
const styles = {
  layout: { display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#f8fafc', overflow: 'hidden', fontFamily: "'Inter', sans-serif" },
  sidebar: { backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', zIndex: 10, transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' },
  logoArea: { height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f1f5f9', overflow: 'hidden' },
  logoCircle: { width: '36px', height: '36px', background: '#10b981', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 10px rgba(16,185,129,0.3)' },
  nav: { flex: 1, padding: '20px 15px', overflowY: 'auto' },
  navBtn: { display: 'flex', alignItems: 'center', width: '100%', padding: '14px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', marginBottom: '8px', border: 'none' },
  footer: { padding: '20px', borderTop: '1px solid #f1f5f9' },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', justifyContent: 'center', transition: '0.2s' },

  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { height: '80px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', flexShrink: 0 },
  iconBtn: { background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: '40px', height: '40px', background: '#10b981', borderRadius: '12px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '16px', boxShadow: '0 4px 10px rgba(16,185,129,0.2)' },

  heroSection: { background: '#1e293b', padding: '40px', borderRadius: '24px', color: 'white', marginBottom: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' },
  goalsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' },

  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' },
  statCard: { background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.01)', display: 'flex', alignItems: 'center', gap: '20px', border: '1px solid #e2e8f0' },

  contentSplit: { display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'stretch' },

  bigActionBtn: { background: 'white', border: '2px dashed #10b981', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', cursor: 'pointer', transition: 'all 0.2s', width: '100%', boxSizing: 'border-box' },
  bigActionIcon: { background: '#ecfdf5', padding: '15px', borderRadius: '50%', color: '#10b981', marginBottom: '15px' },

  card: { background: 'white', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.01)' },
  cardTitle: { fontSize: '16px', fontWeight: '800', color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' },

  actionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' },
  actionCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '30px 20px', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.01)', textAlign: 'center' },
  
  menuWrapper: { display: 'flex', flexDirection: 'column', marginBottom: '5px' },
  sectionLabel: { fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '15px', marginBottom: '8px', paddingLeft: '12px' },
  menuItem: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' },
  submenuContainer: { display: 'flex', flexDirection: 'column', paddingLeft: '40px', marginTop: '5px', marginBottom: '10px', gap: '5px', animation: 'fadeIn 0.3s ease-out' },
  submenuItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', backgroundColor: 'transparent', border: 'none', color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' },
};

// ============================================================================
// 2. SUBCOMPONENTES VISUAIS
// ============================================================================
const GoalBar = ({ title, current, goal, progress, color }) => (
  <div style={{background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '16px'}}>
    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
      <span style={{fontSize: '13px', fontWeight: 'bold', color: 'white'}}>{title}</span>
      <span style={{fontSize: '13px', fontWeight: '900', color: 'white'}}>{current} / {goal}</span>
    </div>
    <div style={{width: '100%', height: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', overflow: 'hidden'}}>
      <div style={{height: '100%', background: color, width: `${progress}%`, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'}}></div>
    </div>
  </div>
);

const KpiCard = ({ title, value, subtitle, icon: Icon, color }) => {
  const colors = {
    blue: { bg: '#eff6ff', txt: '#2563eb', border: '#bfdbfe' },
    green: { bg: '#ecfdf5', txt: '#10b981', border: '#a7f3d0' },
    orange: { bg: '#fffbeb', txt: '#d97706', border: '#fde68a' },
    purple: { bg: '#faf5ff', txt: '#9333ea', border: '#e9d5ff' }
  };
  return (
    <div style={{...styles.statCard, borderColor: colors[color].border}}>
      <div style={{background: colors[color].bg, color: colors[color].txt, padding: '16px', borderRadius: '16px'}}>
        <Icon size={28} strokeWidth={2.5} />
      </div>
      <div>
        <div style={{fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform:'uppercase', letterSpacing:'0.05em'}}>{title}</div>
        <div style={{fontSize: '28px', fontWeight: '900', color: '#1e293b', lineHeight: 1.2}}>{value}</div>
        <div style={{fontSize: '11px', fontWeight: '600', color: colors[color].txt, marginTop:'2px'}}>{subtitle}</div>
      </div>
    </div>
  );
};

const ActionCard = ({ title, desc, icon: Icon, color, onClick }) => (
  <button
    onClick={onClick}
    style={styles.actionCard}
    onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-4px)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.transform = 'translateY(0)'; }}
  >
    <div style={{ background: `${color}15`, padding: '15px', borderRadius: '50%', color: color, marginBottom: '15px' }}>
      <Icon size={28} strokeWidth={2.5} />
    </div>
    <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', margin: '0 0 5px 0' }}>{title}</h4>
    <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: '1.4' }}>{desc}</p>
  </button>
);

// ============================================================================
// 3. COMPONENTE PRINCIPAL
// ============================================================================
export default function CRMAtendente({ userData }) {
  const [activeTab, setActiveTab] = useState('inicio');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openMenus, setOpenMenus] = useState({});

  // Estados de Dados
  const [stats, setStats] = useState({ totalLeads: 0, totalSales: 0, planos: 0, svas: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [messages, setMessages] = useState([]);
  
  // Metas (Simuladas)
  const [goals] = useState({ planos: 30, migracoes: 15, svas: 20 });

  useEffect(() => {
    const fetchStats = async () => {
      if (!auth.currentUser) return;
      try {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

        const q = query(
          collection(db, "leads"), 
          where("attendantId", "==", auth.currentUser.uid),
          where("date", ">=", firstDay),
          where("date", "<=", lastDay)
        );
        
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => d.data());

        const sales = docs.filter(l => ['Contratado', 'Instalado'].includes(l.status));
        
        setStats({
          totalLeads: docs.length,
          totalSales: sales.length,
          planos: sales.filter(l => l.leadType === 'Plano Novo').length,
          svas: sales.filter(l => l.leadType === 'SVA').length
        });

        // Carregar Avisos Recentes
        const qMsgs = query(collection(db, "messages"), orderBy("createdAt", "desc"));
        const msgSnap = await getDocs(qMsgs);
        const msgData = msgSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter(m => m.to === 'all' || m.to === userData?.cityId || m.to === auth.currentUser.uid)
          .slice(0, 5);
        setMessages(msgData);

      } catch (err) {
        console.error("Erro ao carregar resumo: ", err);
      }
      setLoadingStats(false);
    };
    fetchStats();
  }, [activeTab, userData?.cityId]);

  const MENU_ITEMS = [
    { id: 'inicio', label: 'Início', icon: Globe, section: 'Geral' },
    {
      id: 'vendas', label: 'Painel de Vendas', icon: TrendingUp, section: 'Resultados',
      submenus: [
        { id: 'resumo-global', label: 'Resumo Global', icon: LayoutDashboard },
        { id: 'evolucao-mensal', label: 'Evolução Mensal', icon: TrendingUp },
        { id: 'performance-vendas', label: 'Performance', icon: BarChart2 },
        { id: 'analise-sva', label: 'Análise de SVA', icon: Tv },
        { id: 'relatorio-consolidado', label: 'Relatório', icon: FileText },
      ]
    },
    { id: 'nova_venda', label: 'Registrar Lead', icon: PlusCircle, highlight: true, section: 'Comercial' },
    { id: 'clientes', label: 'Funil de Vendas', icon: Users, section: 'Comercial' },
    { id: 'relatorio', label: 'Relatório Geral', icon: FileText, section: 'Comercial' },
    { id: 'colinhas', label: 'Colinhas e Scripts', icon: BookMarked, section: 'Ferramentas' },
    { id: 'desencaixe', label: 'Caixa da Loja', icon: Wallet, section: 'Ferramentas' },
    { id: 'manual', label: 'Manual do Consultor', icon: BookOpen, section: 'Ferramentas' }
  ];

  const toggleMenu = (menuId) => setOpenMenus(prev => ({ ...prev, [menuId]: !prev[menuId] }));

  const handleSubmenuClick = (parentId, sectionId) => {
    if (activeTab !== parentId) setActiveTab(parentId);
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        const y = element.getBoundingClientRect().top + window.scrollY - 30;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 150);
  };

  const DashboardInicio = () => {
    const firstName = userData?.name?.split(' ')[0] || 'Consultor';
    const currentMonthName = new Date().toLocaleString('pt-BR', { month: 'long' });
    
    const progPlanos = Math.min((stats.planos / goals.planos) * 100, 100);
    const progMigracao = Math.min((0 / goals.migracoes) * 100, 100); // Exemplo, pode ligar ao stats real
    const progSVA = Math.min((stats.svas / goals.svas) * 100, 100);

    return (
      <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
        
        {/* HERO SECTION */}
        <div style={styles.heroSection}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
            <div>
              <h2 style={{fontSize: '24px', fontWeight: '900', margin: '0 0 5px 0'}}>Painel de Metas • {currentMonthName.toUpperCase()}</h2>
              <p style={{color: '#94a3b8', margin: 0}}>Acompanhe o seu desempenho em tempo real</p>
            </div>
            <div style={{background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', padding: '10px 20px', borderRadius: '12px', textAlign: 'center'}}>
               <span style={{display: 'block', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold', color: '#cbd5e1'}}>Sua Loja</span>
               <span style={{fontSize: '16px', fontWeight: '900', color: 'white'}}>{userData?.cityId || 'Geral'}</span>
            </div>
          </div>

          <div style={styles.goalsGrid}>
             <GoalBar title="Planos de Internet" current={stats.planos} goal={goals.planos} progress={progPlanos} color="#3b82f6" />
             <GoalBar title="Migrações" current={0} goal={goals.migracoes} progress={progMigracao} color="#f59e0b" />
             <GoalBar title="SVAs Vendidos" current={stats.svas} goal={goals.svas} progress={progSVA} color="#10b981" />
          </div>
        </div>
        
        <h3 style={{fontSize: '18px', fontWeight: '900', color: '#1e293b', marginBottom: '20px'}}>Seus Números (Mês Atual)</h3>
        
        {loadingStats ? (
           <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Calculando resultados...</div>
        ) : (
           <div style={styles.kpiGrid}>
             <KpiCard title="Leads Captados" value={stats.totalLeads} subtitle="Neste mês" icon={Users} color="blue" />
             <KpiCard title="Vendas Fechadas" value={stats.totalSales} subtitle="Contratado/Instalado" icon={Target} color="green" />
             <KpiCard title="Planos Novos" value={stats.planos} subtitle="Venda Direta" icon={TrendingUp} color="purple" />
             <KpiCard title="SVAs Vendidos" value={stats.svas} subtitle="Serviços Extra" icon={Package} color="orange" />
           </div>
        )}

        <div style={styles.contentSplit}>
          <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '20px'}}>
             <h3 style={{fontSize: '18px', fontWeight: '900', color: '#1e293b', margin: 0}}>Atalhos Rápidos</h3>
             <button onClick={() => setActiveTab('nova_venda')} style={styles.bigActionBtn}>
              <div style={styles.bigActionIcon}><PlusCircle size={32} /></div>
              <span style={{fontSize: '18px', fontWeight: '900', color: '#1e293b'}}>Novo Lead</span>
              <span style={{fontSize: '13px', color: '#64748b'}}>Registar cliente em negociação</span>
            </button>
            <div style={styles.actionGrid}>
              <ActionCard title="Meu Funil" desc="Acompanhe negociações" icon={Users} onClick={() => setActiveTab('clientes')} color="#10b981" />
              <ActionCard title="Colinhas" desc="Dicas e scripts" icon={BookMarked} onClick={() => setActiveTab('colinhas')} color="#ea580c" />
            </div>
          </div>

          <div style={{flex: 1.5}}>
             <div style={{...styles.card, height: '100%'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '20px'}}>
                <h3 style={{...styles.cardTitle, margin:0}}><Megaphone size={18} color="#059669" /> Mural de Avisos</h3>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                 {messages.slice(0,4).map(msg => (
                    <div key={msg.id} style={{padding: '15px', background: '#f8fafc', borderRadius: '12px', borderLeft: '3px solid #2563eb'}}>
                       <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                          <span style={{fontWeight:'bold', fontSize:'13px', color:'#1e3a8a'}}>{msg.senderName}</span>
                          <span style={{fontSize:'11px', color:'#94a3b8'}}>{new Date(msg.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                       </div>
                       <p style={{fontSize:'14px', color:'#475569', margin:0, lineHeight:'1.5'}}>{msg.text}</p>
                    </div>
                 ))}
                 {messages.length === 0 && <p style={{fontSize:'13px', color:'#94a3b8', fontStyle:'italic'}}>Nenhum aviso no momento.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'inicio': return <DashboardInicio />;
      case 'vendas': return <PainelVendas userData={userData} />;
      case 'nova_venda': return <NovoLead userData={userData} onNavigate={setActiveTab} />;
      case 'clientes': return <MeusLeads userData={userData} onNavigate={setActiveTab} />;
      case 'relatorio': return <RelatorioGeral userData={userData} />;
      case 'colinhas': return <ColinhasAtendente userData={userData} />;
      case 'desencaixe': return <DesencaixeAtendente userData={userData} />;
      case 'manual': return <ManualAtendente userData={userData} />;
      default: return <DashboardInicio />;
    }
  };

  return (
    <div style={styles.layout}>
      {/* SIDEBAR */}
      <aside style={{ ...styles.sidebar, width: isSidebarOpen ? '260px' : '80px' }}>
        <div style={styles.logoArea}>
          {isSidebarOpen ? (
            <img
              src="https://lh6.googleusercontent.com/proxy/OQmnkD6TxExvN5uvw-zWOpJHZ6qW-J6aJaUPlJX4Y06C_IRXAN3CooFhuzMisQmGCpNS9aQkpjPNcH2YOZs-CeiOuVKjlDO6oqSsDIFrSS2hGse8ug"
              alt="Oquei Telecom"
              style={{ height: '35px', objectFit: 'contain' }}
            />
          ) : (
            <div style={{background:'#2563eb', padding:'10px', borderRadius:'10px'}}>
              <Zap size={24} color="white" />
            </div>
          )}
        </div>

        <nav style={styles.nav}>
          {MENU_ITEMS.map((item, index) => {
            const isActive = activeTab === item.id;
            const hasSubmenus = item.submenus && item.submenus.length > 0;
            const isOpen = openMenus[item.id] || false;
            const showHeader = isSidebarOpen && (index === 0 || MENU_ITEMS[index - 1].section !== item.section);

            return (
              <div key={item.id} style={styles.menuWrapper}>
                {showHeader && <div style={styles.sectionLabel}>{item.section}</div>}
                
                <button 
                  style={{
                    ...styles.menuItem,
                    backgroundColor: isActive ? (item.highlight ? '#10b981' : '#eff6ff') : 'transparent',
                    color: isActive ? (item.highlight ? 'white' : '#2563eb') : '#64748b',
                    fontWeight: isActive ? '800' : '600',
                    boxShadow: isActive && item.highlight ? '0 4px 10px rgba(16,185,129,0.3)' : 'none'
                  }}
                  onClick={() => {
                    if (hasSubmenus) {
                       toggleMenu(item.id);
                       if (!isActive) setActiveTab(item.id);
                    } else {
                       setActiveTab(item.id);
                    }
                  }}
                >
                  <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    {isSidebarOpen && <span>{item.label}</span>}
                  </div>
                  {isSidebarOpen && hasSubmenus && (
                    isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                  )}
                </button>

                {isSidebarOpen && hasSubmenus && (isOpen || isActive) && (
                  <div style={styles.submenuContainer}>
                    {item.submenus.map((sub) => (
                      <button 
                        key={sub.id} 
                        style={styles.submenuItem}
                        onClick={() => handleSubmenuClick(item.id, sub.id)}
                      >
                        <sub.icon size={14} style={{color: '#94a3b8'}} />
                        <span>{sub.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div style={styles.footer}>
          <button onClick={() => auth?.signOut && auth.signOut()} style={styles.logoutBtn}>
            <LogOut size={20} />
            {isSidebarOpen && <span>Sair do Sistema</span>}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={styles.main}>
        <header style={styles.header}>
          <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
             <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={styles.iconBtn}><Menu size={20} /></button>
             <h2 style={{fontSize:'18px', fontWeight:'800', color:'#1e293b', margin:0}}>
               {MENU_ITEMS.find(i=>i.id===activeTab)?.label || 'Acesso Rápido'}
             </h2>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
            <div style={{textAlign: 'right', display: 'none', sm: 'block'}}>
              <div style={{fontSize: '13px', fontWeight: 'bold', color: '#1e293b'}}>{userData?.name || 'Atendente'}</div>
              <div style={{fontSize: '10px', color: '#10b981', fontWeight:'bold', textTransform:'uppercase'}}>Comercial • {userData?.cityId || 'Geral'}</div>
            </div>
            <div style={styles.avatar}>{userData?.name?.[0] || 'A'}</div>
          </div>
        </header>

        <div style={{flex: 1, padding: '30px', overflowY: 'auto'}}>
          <div style={{maxWidth:'1200px', margin:'0 auto'}}>
             {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}