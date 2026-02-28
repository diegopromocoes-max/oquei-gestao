import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  PlusCircle, Users, BookOpen, Wallet, BookMarked, 
  Globe, Menu, LogOut, Target, Package, Zap,
  Megaphone, ChevronRight, TrendingUp, RefreshCw, FileCheck,
  Share2, CalendarDays, Link as LinkIcon, Info, AlertTriangle, Store, CheckCircle2
} from 'lucide-react';

// --- IMPORTAÇÃO DAS PÁGINAS DO ATENDENTE ---
import NovoLead from './NovoLead';
import MeusLeads from './MeusLeads';
import ColinhasAtendente from './ColinhasAtendente';
import DesencaixeAtendente from './DesencaixeAtendente';
import ManualAtendente from './ManualAtendente';
import RhAtendente from './RhAtendente';

// --- IMPORTAÇÃO DOS PAINÉIS DE VISUALIZAÇÃO (GESTÃO) ---
import JapaSupervisor from './JapaSupervisor';
import LinksUteis from './LinksUteis';

export default function CRMAtendente({ userData }) {
  const [activeTab, setActiveTab] = useState('inicio');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [stats, setStats] = useState({ totalLeads: 0, totalSales: 0, planos: 0, svas: 0, migracoes: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [messages, setMessages] = useState([]);
  
  // Estados para Escala da Rede
  const [closedStores, setClosedStores] = useState([]); 
  const [networkAbsences, setNetworkAbsences] = useState([]); 

  useEffect(() => {
    if (!auth.currentUser) return;

    // Prefixo do mês atual (Ex: "2026-02")
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);

    // 1. ESCUTA DE LEADS
    const qLeads = query(
      collection(db, "leads"), 
      where("attendantId", "==", auth.currentUser.uid)
    );
    
    const unsubscribeLeads = onSnapshot(qLeads, (snap) => {
      const allDocs = snap.docs.map(d => d.data());
      
      const monthDocs = allDocs.filter(l => l.date && l.date.startsWith(currentMonthPrefix));
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

    // 2. ESCUTA DE AVISOS
    const qMsgs = query(collection(db, "messages"));
    const unsubscribeMsgs = onSnapshot(qMsgs, (msgSnap) => {
      const msgData = msgSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(m => m.to === 'all' || m.to === userData?.cityId || m.to === auth.currentUser.uid)
        .sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        .slice(0, 5);
        
      setMessages(msgData);
    });

    // 3. ESCUTA DE AUSÊNCIAS (Para ver desfalques e calendário da rede)
    const qAbsences = query(collection(db, "absences"));
    const unsubscribeAbsences = onSnapshot(qAbsences, (snap) => {
      const today = new Date().toISOString().split('T')[0];
      const closed = [];
      const allAbs = [];
      
      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        allAbs.push({ id: docSnap.id, ...data });

        // Verifica no mapa de cobertura se algum dia está marcado como 'loja_fechada'
        if (data.coverageMap) {
          Object.entries(data.coverageMap).forEach(([date, floater]) => {
            if (date >= today && floater === 'loja_fechada') {
              closed.push({ store: data.storeId || data.storeName || 'Desconhecida', date });
            }
          });
        }
      });
      
      closed.sort((a,b) => a.date.localeCompare(b.date));
      setClosedStores(closed);
      setNetworkAbsences(allAbs);
    });

    return () => {
      unsubscribeLeads();
      unsubscribeMsgs();
      unsubscribeAbsences();
    };
  }, [userData?.cityId]); 

  // --- MENU DE NAVEGAÇÃO ---
  const MENU_ITEMS = [
    { id: 'inicio', label: 'Início', icon: Globe, section: 'Geral' },
    { id: 'nova_venda', label: 'Registrar Lead', icon: PlusCircle, highlight: true, section: 'Comercial' },
    { id: 'clientes', label: 'Meu Funil (Kanban)', icon: Users, section: 'Comercial' },
    
    { id: 'rh', label: 'Solicitações RH', icon: FileCheck, section: 'Ferramentas' },
    { id: 'colinhas', label: 'Colinhas e Scripts', icon: BookMarked, section: 'Ferramentas' },
    { id: 'desencaixe', label: 'Caixa da Loja', icon: Wallet, section: 'Ferramentas' },
    { id: 'manual', label: 'Manual do Consultor', icon: BookOpen, section: 'Ferramentas' },
    
    { id: 'japa', label: 'Ações do Japa', icon: Share2, section: 'Consulta & Escala' },
    { id: 'escala', label: 'Escala da Rede', icon: CalendarDays, section: 'Consulta & Escala' },
    { id: 'links', label: 'Links Úteis', icon: LinkIcon, section: 'Consulta & Escala' }
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
            
            <div style={{display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap'}}>
               <div style={styles.heroBadgeSmall}>🎯 {stats.planos} Planos</div>
               <div style={styles.heroBadgeSmall}>🔄 {stats.migracoes} Migrações</div>
               <div style={styles.heroBadgeSmall}>📦 {stats.svas} SVAs</div>
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

  // --- COMPONENTE: CALENDÁRIO VISUAL DA REDE PARA ATENDENTES ---
  const EscalaAtendenteView = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedStoreFilter, setSelectedStoreFilter] = useState('all');

    const uniqueStores = [...new Set(networkAbsences.map(a => a.storeId || a.storeName).filter(Boolean))];

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Mapeia ausências por dia
    const absencesByDay = {};
    
    networkAbsences.forEach(abs => {
      const storeName = abs.storeId || abs.storeName;
      if (selectedStoreFilter !== 'all' && storeName !== selectedStoreFilter) return;

      if (!abs.startDate || !abs.endDate) return;

      const start = new Date(abs.startDate + 'T12:00:00');
      const end = new Date(abs.endDate + 'T12:00:00');
      
      if (start > end) return;

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === year && d.getMonth() === month) {
          const day = d.getDate();
          if (!absencesByDay[day]) absencesByDay[day] = [];
          
          const yStr = d.getFullYear();
          const mStr = String(d.getMonth() + 1).padStart(2, '0');
          const dStr = String(d.getDate()).padStart(2, '0');
          const dateStr = `${yStr}-${mStr}-${dStr}`;
          
          const coverage = abs.coverageMap?.[dateStr];
          
          absencesByDay[day].push({
            id: abs.id,
            store: storeName,
            attendant: abs.attendantName || 'Colaborador',
            type: abs.type,
            coverage: coverage
          });
        }
      }
    });

    const handleMonthChange = (e) => {
      const [y, m] = e.target.value.split('-');
      setCurrentDate(new Date(y, m - 1, 1));
    };

    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    return (
      <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
        <div style={styles.readonlyBanner}>
           <Info size={18}/> MODO LEITURA: Consulte o calendário de folgas, férias e atestados de toda a rede Oquei.
        </div>

        {/* ALERTA DE LOJAS FECHADAS */}
        {closedStores.length > 0 && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '20px', borderRadius: '16px', marginBottom: '30px', boxShadow: '0 4px 6px -1px rgba(239,68,68,0.1)' }}>
             <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#b91c1c', margin: '0 0 10px 0', fontSize: '15px', fontWeight: 'bold' }}>
               <AlertTriangle size={20} /> Alerta de Desfalque na Rede (Lojas Fechadas)
             </h4>
             <p style={{fontSize: '13px', color: '#991b1b', marginBottom: '15px', marginTop: '0'}}>As seguintes lojas estão sem cobertura escalada para os dias abaixo:</p>
             <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
               {closedStores.map((item, i) => (
                 <div key={i} style={{ background: 'white', border: '1px solid #fca5a5', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', color: '#991b1b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <Store size={14} color="#ef4444" /> {item.store} <span style={{color: '#f87171'}}>|</span> {item.date.split('-').reverse().join('/')}
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* CABEÇALHO DO CALENDÁRIO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <h3 style={styles.sectionTitle}><CalendarDays size={20} color="#2563eb"/> Calendário de Ausências</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
             <input type="month" value={monthKey} onChange={handleMonthChange} style={styles.filterInput} />
             <select value={selectedStoreFilter} onChange={e => setSelectedStoreFilter(e.target.value)} style={styles.filterInput}>
                <option value="all">Todas as Lojas</option>
                {uniqueStores.map(s => <option key={s} value={s}>{s}</option>)}
             </select>
          </div>
        </div>

        {/* GRID DO CALENDÁRIO */}
        <div style={styles.calendarGrid}>
          {/* Cabeçalho dos Dias da Semana */}
          <div style={styles.calendarHeaderRow}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} style={{...styles.calendarHeaderCell, color: day === 'Dom' || day === 'Sáb' ? '#ef4444' : '#64748b'}}>
                {day}
              </div>
            ))}
          </div>

          {/* Dias do Mês */}
          <div style={styles.calendarDaysRow}>
            {/* Espaços vazios no início */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} style={styles.calendarCellEmpty} />
            ))}
            
            {/* Células de cada dia */}
            {daysArray.map(day => {
              const dayAbsences = absencesByDay[day] || [];
              const isToday = new Date().getDate() === day && new Date().getMonth() === new Date().getMonth() && new Date().getFullYear() === new Date().getFullYear();

              return (
                <div key={day} style={{...styles.calendarCell, background: isToday ? '#f0fdf4' : 'white'}}>
                  <span style={{...styles.calendarDayNum, color: isToday ? '#10b981' : '#334155'}}>
                    {day}
                  </span>
                  
                  <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                    {dayAbsences.map((a, i) => {
                      const isFechada = a.coverage === 'loja_fechada';
                      const isPendente = !a.coverage;
                      const isFerias = a.type === 'ferias';
                      
                      let bg = isFerias ? '#eff6ff' : '#fef2f2';
                      let borderColor = isFerias ? '#bfdbfe' : '#fecaca';
                      let textColor = isFerias ? '#1e40af' : '#991b1b';

                      return (
                        <div key={i} style={{...styles.absenceTag, background: bg, borderColor: borderColor, color: textColor}}>
                          <strong style={{fontSize: '11px', color: '#1e293b'}}>{a.store}</strong>
                          <span style={{marginTop: '2px'}}>{a.attendant.split(' ')[0]} ({isFerias ? 'Férias' : 'Falta'})</span>
                          
                          {isFechada ? (
                            <span style={styles.tagAlert}>🚫 FECHADA</span>
                          ) : isPendente ? (
                            <span style={styles.tagWarning}>⚠️ Pendente</span>
                          ) : (
                            <span style={styles.tagSuccess}>✅ Coberto</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    );
  };

  // --- RENDERIZADOR PRINCIPAL ---
  const renderContent = () => {
    switch (activeTab) {
      case 'inicio': return <DashboardInicio />;
      case 'nova_venda': return <NovoLead userData={userData} onNavigate={setActiveTab} />;
      case 'clientes': return <MeusLeads userData={userData} onNavigate={setActiveTab} />;
      case 'rh': return <RhAtendente userData={userData} />;
      case 'colinhas': return <ColinhasAtendente userData={userData} />;
      case 'desencaixe': return <DesencaixeAtendente userData={userData} />;
      case 'manual': return <ManualAtendente userData={userData} />;
      
      case 'escala': return <EscalaAtendenteView />;
      
      // PAINEIS IMPORTADOS (MODO LEITURA)
      case 'japa': 
        return (
          <div className="readonly-mode">
            <div style={styles.readonlyBanner}><Info size={18}/> MODO LEITURA: Cronograma gerido pelo Marketing.</div>
            <JapaSupervisor userData={userData} isReadOnly={true} />
          </div>
        );
      case 'links': 
        return (
          <div className="readonly-mode">
            <div style={styles.readonlyBanner}><Info size={18}/> Acesso rápido às plataformas da empresa.</div>
            <LinksUteis userData={userData} isReadOnly={true} />
          </div>
        );

      default: return <DashboardInicio />;
    }
  };

  return (
    <div style={styles.layout}>
      
      {/* INJEÇÃO DE CSS PARA O MODO LEITURA (Desativa cliques indesejados) */}
      <style>
        {`
          .readonly-mode form, 
          .readonly-mode button:not(.tab-btn), 
          .readonly-mode input:not([type="month"]), 
          .readonly-mode select {
            pointer-events: none !important;
          }
          .readonly-mode .allow-click {
            pointer-events: auto !important;
          }
        `}
      </style>

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
  heroBadgeSmall: { background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.1)' },
  
  sectionTitle: { fontSize: '18px', fontWeight: '900', color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' },
  
  filterInput: { padding: '10px 15px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '13px', color: '#1e293b', background: 'white', fontWeight: 'bold', cursor: 'pointer' },
  
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' },
  kpiCard: { backgroundColor: '#ffffff', padding: '24px', borderRadius: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.01)', transition: 'transform 0.2s' },
  kpiLabel: { fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' },
  kpiValue: { fontSize: '28px', fontWeight: '900', color: '#1e293b', margin: '4px 0 0 0' },
  
  actionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' },
  actionCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'white', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '30px 20px', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.01)', textAlign: 'center' },
  
  card: { background: 'white', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' },
  readonlyBanner: { background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px 20px', borderRadius: '12px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', color: '#1e3a8a', fontWeight: 'bold', fontSize: '13px' },

  // CALENDÁRIO
  calendarGrid: { background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' },
  calendarHeaderRow: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  calendarHeaderCell: { textAlign: 'center', padding: '12px', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' },
  calendarDaysRow: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' },
  calendarCellEmpty: { background: '#fcfcfc', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9' },
  calendarCell: { minHeight: '120px', padding: '10px', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', transition: 'background 0.2s' },
  calendarDayNum: { fontWeight: '900', fontSize: '14px', marginBottom: '8px', display: 'block' },
  
  absenceTag: { padding: '6px 8px', borderRadius: '8px', border: '1px solid', display: 'flex', flexDirection: 'column', gap: '2px', lineHeight: '1.2', fontSize: '11px', marginBottom: '6px' },
  tagAlert: { background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '9px', width: 'fit-content', marginTop: '4px' },
  tagWarning: { background: '#f59e0b', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '9px', width: 'fit-content', marginTop: '4px' },
  tagSuccess: { background: '#10b981', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '9px', width: 'fit-content', marginTop: '4px' },
};