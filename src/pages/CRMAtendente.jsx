import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';

import {
  PlusCircle, Users, BookOpen, Wallet, BookMarked, 
  Globe, Target, Megaphone, TrendingUp, 
  RefreshCw, FileCheck, Share2, CalendarDays, Link as LinkIcon, 
  Info, AlertTriangle, Store, FileSpreadsheet, BarChart3
} from 'lucide-react';

import LayoutGlobal from '../components/LayoutGlobal';
import { styles as global, colors, dashboardStyles as local } from '../styles/globalStyles';

// ─── SERVICES (COMPATIBILIZAÇÃO) ─────────────────────────────────────────────
import { listenAtendenteStats, listenMessages, listenNetworkAbsences } from '../services/atendenteDashboard';

// ─── COMPONENTES / PÁGINAS ───────────────────────────────────────────────────
import NovoLead from './NovoLead';
import MeusLeads from './MeusLeads';
import RelatorioLeads from '../components/RelatorioLeads';
import ColinhasAtendente from './ColinhasAtendente';
import DesencaixeAtendente from './DesencaixeAtendente';
import ManualAtendente from './ManualAtendente';
import RhAtendente from './RhAtendente';
import JapaSupervisor from './JapaSupervisor';
import LinksUteis from './LinksUteis';
import PainelVendas from './PainelVendas'; // 🚀 O Antigo Dashboard foi incorporado aqui!

const KpiCard = ({ title, value, icon: Icon, color }) => {
  const cardColors = {
    blue: { bg: 'var(--bg-primary-light)', txt: 'var(--text-brand)' },
    green: { bg: 'var(--bg-success-light)', txt: '#10b981' },
    purple: { bg: '#faf5ff', txt: '#7e22ce' },
    orange: { bg: 'var(--bg-danger-light)', txt: '#ea580c' }
  };
  const themeConfig = cardColors[color] || cardColors.blue;

  return (
    <div style={{...global.card, display: 'flex', alignItems: 'center', gap: '20px', padding: '24px'}}>
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
    onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-4px)'; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
  >
    <div style={{ background: `${color}15`, padding: '15px', borderRadius: '50%', color: color, marginBottom: '15px' }}>
      <Icon size={28} strokeWidth={2.5} />
    </div>
    <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 5px 0' }}>{title}</h4>
    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>{desc}</p>
  </button>
);

export default function CRMAtendente({ userData }) {
  const [activeTab, setActiveTab] = useState('inicio');
  
  // ─── ESTADOS LIMPOS ──────────────────────────────────────────────────────────
  const [stats, setStats] = useState({ totalLeads: 0, totalSales: 0, planos: 0, svas: 0, migracoes: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [messages, setMessages] = useState([]);
  
  const [closedStores, setClosedStores] = useState([]); 
  const [networkAbsences, setNetworkAbsences] = useState([]); 

  // ─── ESCUTA DE DADOS EM TEMPO REAL (VIA SERVICE) ───────────────────────────
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);

    const unsubStats = listenAtendenteStats(uid, currentMonthPrefix, (data, err) => {
      if (data) setStats(data);
      setLoadingStats(false);
    });

    const unsubMsgs = listenMessages(userData?.cityId, uid, (data) => {
      setMessages(data);
    });

    const unsubAbsences = listenNetworkAbsences((data) => {
      setClosedStores(data.closedStores);
      setNetworkAbsences(data.allAbsences);
    });

    return () => { 
      if (unsubStats) unsubStats(); 
      if (unsubMsgs) unsubMsgs(); 
      if (unsubAbsences) unsubAbsences(); 
    };
  }, [userData?.cityId]); 

  // ─── MENU LATERAL ────────────────────────────────────────────────────────────
  const MENU_ITEMS = [
    { id: 'inicio', label: 'Início', icon: Globe, section: 'Geral', color: '#10b981' },
    { id: 'graficos', label: 'Meus Gráficos', icon: BarChart3, section: 'Geral', color: '#ec4899' }, // 🚀 NOVA ABA
    { id: 'nova_venda', label: 'Registrar Lead', icon: PlusCircle, highlight: true, section: 'Comercial', color: '#2563eb' },
    { id: 'clientes', label: 'Meu Funil', icon: Users, section: 'Comercial', color: '#10b981' },
    { id: 'relatorio_leads', label: 'Relatório Mensal', icon: FileSpreadsheet, section: 'Comercial', color: '#8b5cf6' },
    { id: 'rh', label: 'Solicitações RH', icon: FileCheck, section: 'Ferramentas', color: '#f59e0b' },
    { id: 'colinhas', label: 'Colinhas', icon: BookMarked, section: 'Ferramentas', color: '#8b5cf6' },
    { id: 'desencaixe', label: 'Caixa da Loja', icon: Wallet, section: 'Ferramentas', color: '#10b981' },
    { id: 'manual', label: 'Manual', icon: BookOpen, section: 'Ferramentas', color: '#06b6d4' },
    { id: 'japa', label: 'Ações do Japa', icon: Share2, section: 'Consulta & Escala' },
    { id: 'escala', label: 'Escala da Rede', icon: CalendarDays, section: 'Consulta & Escala' },
    { id: 'links', label: 'Links Úteis', icon: LinkIcon, section: 'Consulta & Escala' }
  ];

  const DashboardInicio = () => {
    const firstName = userData?.name?.split(' ')[0] || 'Consultor';
    const currentMonthName = new Date().toLocaleString('pt-BR', { month: 'long' });

    return (
      <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
        <div style={local.heroSection}>
          <div>
            <h2 style={local.heroTitle}>Olá, {firstName}! 👋</h2>
            <p style={local.heroSub}>Resumo das tuas vendas de <strong style={{color: 'var(--text-main)'}}>{currentMonthName}</strong>.</p>
            <div style={{display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap'}}>
               <div style={local.heroBadgeSmall}>🎯 {stats.planos} Planos</div>
               <div style={local.heroBadgeSmall}>🔄 {stats.migracoes} Migrações</div>
               <div style={local.heroBadgeSmall}>📦 {stats.svas} SVAs</div>
            </div>
          </div>
          <div style={local.heroBadge}>
             <span style={local.heroBadgeLabel}>Sua Loja</span>
             <span style={local.heroBadgeValue}>{userData?.cityId || 'Geral'}</span>
          </div>
        </div>
        
        <h3 style={global.sectionTitle}>Seus Números (Mês Atual)</h3>
        {loadingStats ? (
           <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>A calcular os teus resultados...</div>
        ) : (
           <div style={global.grid4}>
             <KpiCard title="Leads Captados" value={stats.totalLeads} icon={Users} color="blue" />
             <KpiCard title="Vendas Fechadas" value={stats.totalSales} icon={Target} color="green" />
             <KpiCard title="Planos Novos" value={stats.planos} icon={TrendingUp} color="purple" />
             <KpiCard title="Migrações" value={stats.migracoes} icon={RefreshCw} color="orange" />
           </div>
        )}

        <h3 style={global.sectionTitle}>O que deseja fazer agora?</h3>
        <div style={local.actionGrid}>
          <ActionCard title="Registrar Lead" desc="Cadastre um novo cliente" icon={PlusCircle} onClick={() => setActiveTab('nova_venda')} color="#2563eb" />
          <ActionCard title="Meu Funil" desc="Acompanhe negociações" icon={Users} onClick={() => setActiveTab('clientes')} color="#10b981" />
          <ActionCard title="Meus Gráficos" desc="Análise de conversão" icon={BarChart3} onClick={() => setActiveTab('graficos')} color="#ec4899" />
          <ActionCard title="Colinhas" desc="Dicas e scripts" icon={BookMarked} onClick={() => setActiveTab('colinhas')} color="#f59e0b" />
        </div>

        <div style={{...global.card, marginTop: '40px'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '20px'}}>
            <h3 style={{...global.sectionTitle, margin:0, color: '#10b981'}}><Megaphone size={18} /> Mural de Avisos</h3>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
             {messages.slice(0,4).map(msg => (
                <div key={msg.id} style={{padding: '15px', background: 'var(--bg-panel)', borderRadius: '12px', borderLeft: `3px solid var(--text-brand)`, border: '1px solid var(--border)'}}>
                   <div style={{display:'flex', justifyContent:'space-between', marginBottom:'4px'}}>
                      <span style={{fontWeight:'bold', fontSize:'13px', color: 'var(--text-brand)'}}>{msg.senderName}</span>
                      <span style={{fontSize:'11px', color: 'var(--text-muted)'}}>{msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleDateString() : 'Hoje'}</span>
                   </div>
                   <p style={{fontSize:'14px', color: 'var(--text-main)', margin:0, lineHeight:'1.5'}}>{msg.text}</p>
                </div>
             ))}
             {messages.length === 0 && <p style={{fontSize:'13px', color: 'var(--text-muted)', fontStyle:'italic'}}>Nenhum aviso no momento.</p>}
          </div>
        </div>
      </div>
    );
  };

  const EscalaAtendenteView = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedStoreFilter, setSelectedStoreFilter] = useState('all');

    const uniqueStores = [...new Set(networkAbsences.map(a => a.storeId || a.storeName).filter(Boolean))];

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

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
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          
          absencesByDay[day].push({
            id: abs.id, store: storeName, attendant: abs.attendantName || 'Colaborador',
            type: abs.type, coverage: abs.coverageMap?.[dateStr]
          });
        }
      }
    });

    const handleMonthChange = (e) => {
      const [y, m] = e.target.value.split('-');
      setCurrentDate(new Date(y, m - 1, 1));
    };

    return (
      <div style={{ animation: 'fadeIn 0.4s ease-out', width: '100%' }}>
        <div style={local.readonlyBanner}>
           <Info size={18}/> MODO LEITURA: Consulte o calendário de folgas, férias e atestados de toda a rede Oquei.
        </div>

        {closedStores.length > 0 && (
          <div style={{ background: 'var(--bg-danger-light)', border: `1px solid var(--border-danger)`, padding: '20px', borderRadius: '16px', marginBottom: '30px' }}>
             <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', margin: '0 0 10px 0', fontSize: '15px', fontWeight: 'bold' }}>
               <AlertTriangle size={20} /> Alerta de Desfalque na Rede (Lojas Fechadas)
             </h4>
             <p style={{fontSize: '13px', color: 'var(--text-main)', marginBottom: '15px', marginTop: '0'}}>As seguintes lojas estão sem cobertura escalada para os dias abaixo:</p>
             <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
               {closedStores.map((item, i) => (
                 <div key={i} style={{ background: 'var(--bg-card)', border: `1px solid var(--border-danger)`, padding: '8px 12px', borderRadius: '8px', fontSize: '13px', color: '#ef4444', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <Store size={14} /> {item.store} <span style={{color: 'var(--border)'}}>|</span> {item.date.split('-').reverse().join('/')}
                 </div>
               ))}
             </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <h3 style={global.sectionTitle}><CalendarDays size={20} color="var(--text-brand)"/> Calendário de Ausências</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
             <input type="month" value={`${year}-${String(month + 1).padStart(2, '0')}`} onChange={handleMonthChange} style={global.input} />
             <select value={selectedStoreFilter} onChange={e => setSelectedStoreFilter(e.target.value)} style={global.select}>
                <option value="all">Todas as Lojas</option>
                {uniqueStores.map(s => <option key={s} value={s}>{s}</option>)}
             </select>
          </div>
        </div>

        <div style={local.calendarGrid}>
          <div style={local.calendarHeaderRow}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, idx) => (
              <div key={day} style={{...local.calendarHeaderCell, color: idx === 0 || idx === 6 ? '#ef4444' : 'var(--text-muted)'}}>{day}</div>
            ))}
          </div>

          <div style={local.calendarDaysRow}>
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} style={local.calendarCellEmpty} />)}
            {daysArray.map(day => {
              const dayAbsences = absencesByDay[day] || [];
              const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;

              return (
                <div key={day} style={{...local.calendarCell, background: isToday ? 'var(--bg-primary-light)' : 'var(--bg-card)'}}>
                  <span style={{...local.calendarDayNum, color: isToday ? 'var(--text-brand)' : 'var(--text-main)'}}>{day}</span>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '6px'}}>
                    {dayAbsences.map((a, i) => {
                      const isFechada = a.coverage === 'loja_fechada';
                      const isPendente = !a.coverage;
                      const isFerias = a.type === 'ferias';
                      return (
                        <div key={i} style={{...local.absenceTag, background: isFerias ? 'var(--bg-primary-light)' : 'var(--bg-danger-light)', borderColor: isFerias ? 'var(--text-brand)' : 'var(--border-danger)', color: isFerias ? 'var(--text-brand)' : '#ef4444'}}>
                          <strong style={{fontSize: '11px', color: 'var(--text-main)'}}>{a.store}</strong>
                          <span style={{marginTop: '2px'}}>{a.attendant.split(' ')[0]} ({isFerias ? 'Férias' : 'Falta'})</span>
                          {isFechada ? <span style={local.tagAlert}>🚫 FECHADA</span> : isPendente ? <span style={local.tagWarning}>⚠️ Pendente</span> : <span style={local.tagSuccess}>✅ Coberto</span>}
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

  // ─── RENDERIZADOR CENTRAL DAS ABAS ───────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {
      case 'inicio': return <DashboardInicio />;
      case 'graficos': return <PainelVendas userData={userData} />; // 🚀 NOVO ROTEAMENTO
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
            <div style={local.readonlyBanner}><Info size={18}/> MODO LEITURA: Cronograma gerido pelo Marketing.</div>
            <JapaSupervisor userData={userData} isReadOnly={true} />
          </div>
        );
      case 'links': 
        return (
          <div className="readonly-mode">
            <div style={local.readonlyBanner}><Info size={18}/> Acesso rápido às plataformas da empresa.</div>
            <LinksUteis userData={userData} isReadOnly={true} />
          </div>
        );
      default: return <DashboardInicio />;
    }
  };

  return (
    <LayoutGlobal 
      userData={userData}
      menuItems={MENU_ITEMS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={() => auth?.signOut && auth.signOut()}
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
