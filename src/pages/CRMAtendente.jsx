import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  PlusCircle, Users, BookOpen, Wallet, BookMarked, 
  Globe, Menu, LogOut, Target, Package, Zap,
  Megaphone, ChevronRight, TrendingUp, RefreshCw
} from 'lucide-react';

// --- IMPORTAÇÃO DAS PÁGINAS DO ATENDENTE ---
import NovoLead from './NovoLead';
import MeusLeads from './MeusLeads';
import ColinhasAtendente from './ColinhasAtendente';
import DesencaixeAtendente from './DesencaixeAtendente';
import ManualAtendente from './ManualAtendente';

export default function CRMAtendente({ userData }) {
  const [activeTab, setActiveTab] = useState('inicio');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [stats, setStats] = useState({ totalLeads: 0, totalSales: 0, planos: 0, svas: 0, migracoes: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Prefixo do mês atual (Ex: "2026-02")
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);

    // 1. ESCUTA DE LEADS (Apenas filtro simples por Atendente para evitar erro de Index no Firestore)
    const qLeads = query(
      collection(db, "leads"), 
      where("attendantId", "==", auth.currentUser.uid)
    );
    
    const unsubscribeLeads = onSnapshot(qLeads, (snap) => {
      const allDocs = snap.docs.map(d => d.data());
      
      // Filtra na memória (JavaScript) apenas os leads que pertencem ao mês atual
      const monthDocs = allDocs.filter(l => l.date && l.date.startsWith(currentMonthPrefix));
      
      // Contabiliza apenas os fechados deste mês e deste atendente
      const sales = monthDocs.filter(l => ['Contratado', 'Instalado'].includes(l.status));
      
      setStats({
        totalLeads: monthDocs.length,
        totalSales: sales.length,
        planos: sales.filter(l => l.leadType === 'Plano Novo').length,
        migracoes: sales.filter(l => l.leadType === 'Migração').length,
        svas: sales.filter(l => l.leadType === 'SVA').length
      });
      setLoadingStats(false);
    }, (error) => {
      console.error("Erro no tempo real de estatísticas: ", error);
      setLoadingStats(false);
    });

    // 2. ESCUTA DE AVISOS (Busca simples, ordenação na memória)
    const qMsgs = query(collection(db, "messages"));
    const unsubscribeMsgs = onSnapshot(qMsgs, (msgSnap) => {
      const msgData = msgSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(m => m.to === 'all' || m.to === userData?.cityId || m.to === auth.currentUser.uid)
        .sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)) // Ordena do mais recente
        .slice(0, 5); // Pega apenas os 5 últimos
        
      setMessages(msgData);
    });

    // Limpeza dos listeners ao desmontar
    return () => {
      unsubscribeLeads();
      unsubscribeMsgs();
    };
  }, [userData?.cityId]); 

  // Menu Simplificado e Focado no Atendente
  const MENU_ITEMS = [
    { id: 'inicio', label: 'Início', icon: Globe, section: 'Geral' },
    { id: 'nova_venda', label: 'Registrar Lead', icon: PlusCircle, highlight: true, section: 'Comercial' },
    { id: 'clientes', label: 'Meu Funil (Kanban)', icon: Users, section: 'Comercial' },
    { id: 'colinhas', label: 'Colinhas e Scripts', icon: BookMarked, section: 'Ferramentas' },
    { id: 'desencaixe', label: 'Caixa da Loja', icon: Wallet, section: 'Ferramentas' },
    { id: 'manual', label: 'Manual do Consultor', icon: BookOpen, section: 'Ferramentas' }
  ];

  const DashboardInicio = () => {
    const firstName = userData?.name?.split(' ')[0] || 'Consultor';
    const currentMonthName = new Date().toLocaleString('pt-BR', { month: 'long' });

    return (
      <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
        <div style={styles.heroSection}>
          <div>
            <h2 style={styles.heroTitle}>Olá, {firstName}! 👋</h2>
            <p style={styles.heroSub}>Resumo das tuas vendas de <strong>{currentMonthName}</strong>.</p>
            
            {/* Badges com Resumo no Topo */}
            <div style={{display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap'}}>
               <div style={{background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.1)'}}>
                  🎯 {stats.planos} Planos
               </div>
               <div style={{background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.1)'}}>
                  🔄 {stats.migracoes} Migrações
               </div>
               <div style={{background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.1)'}}>
                  📦 {stats.svas} SVAs
               </div>
            </div>
          </div>
          <div style={styles.heroBadge}>
             <span style={styles.heroBadgeLabel}>Sua Loja</span>
             <span style={styles.heroBadgeValue}>{userData?.cityId || 'Geral'}</span>
          </div>
        </div>
        
        <h3 style={styles.sectionTitle}>Seus Números (Mês Atual)</h3>
        
        {loadingStats ? (
           <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>A calcular os teus resultados...</div>
        ) : (
           <div style={styles.kpiGrid}>
             <KpiCard title="Leads Captados" value={stats.totalLeads} icon={Users} color="blue" />
             <KpiCard title="Vendas Fechadas" value={stats.totalSales} icon={Target} color="green" />
             <KpiCard title="Planos Novos" value={stats.planos} icon={TrendingUp} color="purple" />
             <KpiCard title="Migrações" value={stats.migracoes} icon={RefreshCw} color="orange" />
             <KpiCard title="SVAs Vendidos" value={stats.svas} icon={Package} color="blue" />
           </div>
        )}

        <h3 style={styles.sectionTitle}>O que deseja fazer agora?</h3>
        <div style={styles.actionGrid}>
          <ActionCard title="Registrar Lead" desc="Cadastre um novo cliente" icon={PlusCircle} onClick={() => setActiveTab('nova_venda')} color="#2563eb" />
          <ActionCard title="Meu Funil" desc="Acompanhe negociações no Kanban" icon={Users} onClick={() => setActiveTab('clientes')} color="#10b981" />
          <ActionCard title="Colinhas" desc="Dicas e scripts de venda" icon={BookMarked} onClick={() => setActiveTab('colinhas')} color="#ea580c" />
          <ActionCard title="Acessar Manual" desc="Dúvidas e rotinas" icon={BookOpen} onClick={() => setActiveTab('manual')} color="#7c3aed" />
        </div>

        {/* MURAL DE AVISOS */}
        <div style={{...styles.card, marginTop: '40px'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '20px'}}>
            <h3 style={{...styles.sectionTitle, margin:0, display:'flex', alignItems:'center', gap:'8px'}}>
              <Megaphone size={18} color="#059669" /> Mural de Avisos
            </h3>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
             {messages.slice(0,4).map(msg => (
                <div key={msg.id} style={{padding: '15px', background: '#f8fafc', borderRadius: '12px', borderLeft: '3px solid #2563eb'}}>
                   <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                      <span style={{fontWeight:'bold', fontSize:'13px', color:'#1e3a8a'}}>{msg.senderName}</span>
                      <span style={{fontSize:'11px', color:'#94a3b8'}}>
                        {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleDateString() : 'Hoje'}
                      </span>
                   </div>
                   <p style={{fontSize:'14px', color:'#475569', margin:0, lineHeight:'1.5'}}>{msg.text}</p>
                </div>
             ))}
             {messages.length === 0 && <p style={{fontSize:'13px', color:'#94a3b8', fontStyle:'italic'}}>Nenhum aviso no momento.</p>}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'inicio': return <DashboardInicio />;
      case 'nova_venda': return <NovoLead userData={userData} onNavigate={setActiveTab} />;
      case 'clientes': return <MeusLeads userData={userData} onNavigate={setActiveTab} />;
      case 'colinhas': return <ColinhasAtendente userData={userData} />;
      case 'desencaixe': return <DesencaixeAtendente userData={userData} />;
      case 'manual': return <ManualAtendente userData={userData} />;
      default: return <DashboardInicio />;
    }
  };

  return (
    <div style={styles.layout}>
      <aside style={{ ...styles.sidebar, width: isSidebarOpen ? '260px' : '80px' }}>
        <div style={styles.logoArea}>
          {isSidebarOpen ? (
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <div style={{background:'#10b981', padding:'8px', borderRadius:'10px'}}>
                <Zap size={20} color="white" fill="white" />
              </div>
              <span style={{ fontSize: '15px', fontWeight: '900', color: '#1e293b' }}>OQUEI VENDAS</span>
            </div>
          ) : (
            <div style={{background:'#10b981', padding:'10px', borderRadius:'10px'}}>
              <Zap size={24} color="white" fill="white" />
            </div>
          )}
        </div>

        <nav style={styles.navMenu}>
          {MENU_ITEMS.map((item, index) => {
            const isActive = activeTab === item.id;
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
                  onClick={() => setActiveTab(item.id)}
                >
                  <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    {isSidebarOpen && <span>{item.label}</span>}
                  </div>
                </button>
              </div>
            );
          })}
        </nav>

        <div style={styles.sidebarFooter}>
          <button onClick={() => auth?.signOut && auth.signOut()} style={styles.logoutBtn}>
            <LogOut size={20} />
            {isSidebarOpen && <span>Sair do Sistema</span>}
          </button>
        </div>
      </aside>

      <main style={styles.mainContent}>
        <header style={styles.header}>
          <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
             <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={styles.iconBtn}>
               <Menu size={20} />
             </button>
             <div style={{display: 'flex', flexDirection: 'column'}}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                  {MENU_ITEMS.find(i=>i.id===activeTab)?.label || 'Acesso Rápido'}
                </h2>
             </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ textAlign: 'right', display: 'none', sm: 'block' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>{userData?.name || 'Atendente'}</div>
              <div style={{ fontSize: '10px', color: '#10b981', fontWeight:'bold', textTransform:'uppercase', letterSpacing:'0.05em' }}>Vendas • {userData?.cityId || 'Geral'}</div>
            </div>
            <div style={styles.avatar}>{userData?.name?.[0] || 'A'}</div>
          </div>
        </header>

        <div style={styles.contentScroll}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}

// --- SUBCOMPONENTES AUXILIARES ---

const KpiCard = ({ title, value, icon: Icon, color }) => {
  const colors = {
    blue: { bg: '#eff6ff', txt: '#2563eb', border: '#bfdbfe' },
    green: { bg: '#ecfdf5', txt: '#059669', border: '#a7f3d0' },
    purple: { bg: '#faf5ff', txt: '#7e22ce', border: '#e9d5ff' },
    orange: { bg: '#fff7ed', txt: '#ea580c', border: '#fed7aa' }
  };
  return (
    <div style={{...styles.kpiCard, borderColor: colors[color].border}}>
      <div style={{ padding: '16px', borderRadius: '16px', background: colors[color].bg, color: colors[color].txt }}>
        <Icon size={24} strokeWidth={2.5} />
      </div>
      <div>
        <p style={styles.kpiLabel}>{title}</p>
        <h3 style={styles.kpiValue}>{value}</h3>
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

// --- ESTILOS INLINE ---
const styles = {
  layout: { display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#f8fafc', overflow: 'hidden', fontFamily: "'Inter', sans-serif" },
  sidebar: { backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', zIndex: 10, transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' },
  logoArea: { height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f1f5f9', overflow: 'hidden' },
  navMenu: { flex: 1, padding: '20px 16px', overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  menuWrapper: { display: 'flex', flexDirection: 'column', marginBottom: '5px' },
  sectionLabel: { fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '15px', marginBottom: '8px', paddingLeft: '12px' },
  menuItem: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' },
  sidebarFooter: { padding: '20px', borderTop: '1px solid #f1f5f9', backgroundColor: '#ffffff' },
  logoutBtn: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '12px', borderRadius: '12px', backgroundColor: '#fef2f2', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', transition: 'background 0.2s' },
  mainContent: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { height: '80px', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', flexShrink: 0 },
  iconBtn: { backgroundColor: '#f8fafc', border: 'none', cursor: 'pointer', color: '#64748b', padding: '10px', borderRadius: '10px', display:'flex', alignItems:'center', justifyContent:'center' },
  avatar: { width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#10b981', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '18px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
  contentScroll: { flex: 1, overflowY: 'auto', padding: '40px' },
  
  heroSection: { background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '40px', borderRadius: '24px', color: 'white', marginBottom: '35px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' },
  heroTitle: { fontSize: '32px', fontWeight: '900', margin: '0 0 10px 0', letterSpacing: '-0.02em' },
  heroSub: { fontSize: '15px', color: '#cbd5e1', margin: 0, lineHeight: '1.5' },
  heroBadge: { background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', padding: '15px 25px', borderRadius: '16px', textAlign: 'center' },
  heroBadgeLabel: { display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold', color: '#cbd5e1' },
  heroBadgeValue: { fontSize: '20px', fontWeight: '900', color: 'white' },
  
  sectionTitle: { fontSize: '18px', fontWeight: '900', color: '#1e293b', marginBottom: '20px' },
  
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' },
  kpiCard: { backgroundColor: '#ffffff', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.01)', transition: 'transform 0.2s' },
  kpiLabel: { fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' },
  kpiValue: { fontSize: '28px', fontWeight: '900', color: '#1e293b', margin: '4px 0 0 0' },
  
  actionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' },
  actionCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '30px 20px', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.01)', textAlign: 'center' },
  
  card: { background: 'white', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }
};