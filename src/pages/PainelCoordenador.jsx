import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, getDocs, where, orderBy, limit } from 'firebase/firestore';
import { signOut as authSignOut } from 'firebase/auth';
import { 
  Store, Clock, TrendingUp, Users, Zap, Globe, BarChart3, 
  MapPin, UserPlus, ShoppingBag, LayoutGrid, Wallet, 
  RefreshCw, AlertCircle, Tv, Megaphone, FileCheck, Settings,
  Gift, HeartHandshake, MonitorPlay // Novos ícones para Marketing
} from 'lucide-react';

// IMPORTAÇÃO DO DESIGN SYSTEM
import LayoutGlobal from '../components/LayoutGlobal';
import { colors, theme } from '../styles/theme';

// IMPORTAÇÃO DOS MÓDULOS
import { GestaoSupervisores, GestaoAtendentes } from './GestaoColaboradores';
import FaltasSupervisor from './FaltasSupervisor';
import RhSupervisor from './RhSupervisor'; 
import DesencaixeSupervisor from './DesencaixeSupervisor';
import Comunicados from './Comunicados';
import LojasOquei from './LojasOquei';
import GestaoEstrutura from './GestaoEstrutura';
import GestaoProdutos from './GestaoProdutos';
import Wallboard from './Wallboard';
import HubOquei from './HubOquei';
import RelatorioGeral from './RelatorioGeral';
import LinksUteis from './LinksUteis';
import Configuracoes from './Configuracoes';

export default function PainelCoordenador({ userData }) {
  const [activeView, setActiveView] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ clusters: 0, cidades: 0, supervisores: 0 });

  const MENU_ITEMS = [
    // --- PRINCIPAL ---
    { id: 'dashboard', label: 'Dashboard Master', icon: Globe, section: 'Principal' },
    { id: 'comunicados', label: 'Comunicados', icon: Megaphone, section: 'Principal' },
    { id: 'wallboard', label: 'Modo TV (Wallboard)', icon: Tv, section: 'Principal', color: colors.cyan },
    
    // --- INTELIGÊNCIA ---
    { id: 'hub_oquei', label: 'HubOquei Radar', icon: Zap, section: 'Inteligência', color: colors.cyan },
    { id: 'relatorio_geral', label: 'Relatório BI', icon: BarChart3, section: 'Inteligência', color: colors.primary },
    
    // --- GESTÃO ---
    { id: 'admin_supervisores', label: 'Supervisores', icon: UserPlus, section: 'Gestão', color: colors.purple },
    { id: 'estrutura', label: 'Estrutura Lojas', icon: MapPin, section: 'Gestão', color: colors.primary },
    { id: 'produtos', label: 'Produtos/SVA', icon: ShoppingBag, section: 'Gestão', color: colors.warning },
    
    // --- OPERAÇÃO ---
    { id: 'lojas_view', label: 'Portfolio', icon: Store, section: 'Operação' },
    { id: 'faltas', label: 'Faltas Globais', icon: AlertCircle, section: 'Operação' },
    { id: 'rh_requests', label: 'Pedidos RH', icon: FileCheck, section: 'Operação' },

    // --- MARKETING (NOVO) ---
    { id: 'acoes_japa', label: 'Ações do Japa', icon: Gift, section: 'Marketing', color: '#ff4757' },
    { id: 'patrocinio', label: 'Patrocínio', icon: HeartHandshake, section: 'Marketing', color: '#ffa502' },
    { id: 'solicitar_campanha', label: 'Solicitar Campanha', icon: Megaphone, section: 'Marketing', color: colors.warning },
    { id: 'conteudos_digitais', label: 'Conteúdos Digitais', icon: MonitorPlay, section: 'Marketing', color: colors.cyan },

    // --- SISTEMAS (NOVO - CAIXA LOCAL MOVIDO PARA AQUI) ---
    { id: 'desencaixe', label: 'Caixa Local', icon: Wallet, section: 'Sistemas', color: colors.success },
    
    // --- FERRAMENTAS ---
    { id: 'configuracoes', label: 'Configurações S&OP', icon: Settings, section: 'Ferramentas' },
    { id: 'links', label: 'Links Úteis', icon: LayoutGrid, section: 'Ferramentas' }
  ];

  const carregarDados = async () => {
    setLoading(true);
    try {
      const cSnap = await getDocs(collection(db, "clusters"));
      const citySnap = await getDocs(collection(db, "cities"));
      const userSnap = await getDocs(query(collection(db, "users"), where("role", "==", "supervisor")));
      setStats({ clusters: cSnap.size, cidades: citySnap.size, supervisores: userSnap.size });
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { if (activeView === 'dashboard') carregarDados(); }, [activeView]);

  const DashboardHome = () => (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={styles.dashboardHeader}>
          <div>
            <h2 style={styles.greetingTitle}>Coordenação Master</h2>
            <p style={styles.greetingSub}>Monitoramento global da rede Oquei Telecom</p>
          </div>
          <button onClick={carregarDados} style={styles.refreshBtn}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
      </div>

      <div style={styles.kpiGrid}>
        <MetricCard title="Regionais" value={stats.clusters} sub="Clusters Ativos" color={colors.primary} icon={MapPin} />
        <MetricCard title="Lojas" value={stats.cidades} sub="Unidades Operacionais" color={colors.success} icon={Store} />
        <MetricCard title="Supervisores" value={stats.supervisores} sub="Gestores Ativos" color={colors.purple} icon={UserPlus} />
        <MetricCard title="Crescimento" value="+12%" sub="Média da Rede" color={colors.cyan} icon={TrendingUp} />
      </div>

      <h3 style={styles.sectionHeader}>Acesso Rápido Inteligente</h3>
      <div style={styles.actionGrid}>
          <ActionBtn label="HubOquei Radar" icon={Zap} color={colors.cyan} onClick={() => setActiveView('hub_oquei')} />
          <ActionBtn label="Relatório BI" icon={BarChart3} color={colors.primary} onClick={() => setActiveView('relatorio_geral')} />
          <ActionBtn label="Gerir Estrutura" icon={MapPin} color={colors.primary} onClick={() => setActiveView('estrutura')} />
          <ActionBtn label="Escala Global" icon={AlertCircle} color={colors.danger} onClick={() => setActiveView('faltas')} />
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardHome />;
      case 'hub_oquei': return <HubOquei userData={userData} />;
      case 'relatorio_geral': return <RelatorioGeral userData={userData} />;
      case 'admin_supervisores': return <GestaoSupervisores refresh={carregarDados} />;
      case 'estrutura': return <GestaoEstrutura refresh={carregarDados} cities={[]} clusters={[]} onDelete={()=>{}} setNotification={()=>{}} />;
      case 'produtos': return <GestaoProdutos />;
      case 'lojas_view': return <LojasOquei isEditingAllowed={true} />;
      case 'faltas': return <FaltasSupervisor userData={userData} />;
      case 'rh_requests': return <RhSupervisor userData={userData} />;
      case 'desencaixe': return <DesencaixeSupervisor userData={userData} />;
      case 'comunicados': return <Comunicados userData={userData} />;
      case 'links': return <LinksUteis userData={userData} />;
      case 'configuracoes': return <Configuracoes userData={userData} />;
      
      // Placeholders para os novos itens de Marketing (usando IDs do Supervisor para manter padrão)
      case 'acoes_japa': return <div style={{padding: '40px', textAlign: 'center'}}><h3>Ações do Japa (Master)</h3><p>Relatório de ações em campo.</p></div>;
      case 'patrocinio': return <div style={{padding: '40px', textAlign: 'center'}}><h3>Gestão de Patrocínios</h3><p>Controle centralizado de verbas de marketing.</p></div>;
      case 'solicitar_campanha': return <div style={{padding: '40px', textAlign: 'center'}}><h3>Módulo de Solicitação de Campanhas</h3><p>Em breve...</p></div>;
      case 'conteudos_digitais': return <div style={{padding: '40px', textAlign: 'center'}}><h3>Repositório de Conteúdos Digitais</h3><p>Em breve...</p></div>;
      
      default: return <DashboardHome />;
    }
  };

  if (activeView === 'wallboard') return <Wallboard userData={userData} onExit={() => setActiveView('dashboard')} />;

  return (
    <LayoutGlobal 
      userData={userData}
      menuItems={MENU_ITEMS}
      activeTab={activeView}
      onTabChange={setActiveView}
      onLogout={() => authSignOut(auth)}
    >
      {renderContent()}
    </LayoutGlobal>
  );
}

// SUB-COMPONENTES TREMOR
const MetricCard = ({ title, value, sub, color, icon: Icon }) => (
  <div style={{...theme.card, borderTop: `2px solid ${color}`, borderRadius: '6px'}}>
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:'12px'}}>
       <span style={{fontSize:'12px', fontWeight:'700', color: colors.textMuted, textTransform:'uppercase', letterSpacing: '0.02em'}}>{title}</span>
       <Icon size={18} color={color}/>
    </div>
    <div style={{fontSize:'26px', fontWeight:'800', color: colors.textMain}}>{value}</div>
    <div style={{fontSize:'12px', color: colors.textDescription, marginTop:'4px'}}>{sub}</div>
  </div>
);

const ActionBtn = ({ label, icon: Icon, onClick, color }) => (
  <button onClick={onClick} style={styles.actionBtn}>
    <div style={{ color: color }}><Icon size={20} /></div>
    <span style={{ fontSize: '13px', fontWeight: '600', color: colors.textMain }}>{label}</span>
  </button>
);

const styles = {
  dashboardHeader: { display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:'40px', paddingBottom:'24px', borderBottom:`1px solid ${colors.border}` },
  greetingTitle: { fontSize:'24px', fontWeight:'800', color: colors.textMain, margin:0, letterSpacing:'-0.02em' },
  greetingSub: { fontSize:'14px', color: colors.textDescription, margin:'4px 0 0 0' },
  refreshBtn: { background: 'transparent', border: `1px solid ${colors.border}`, padding: '8px', borderRadius: '6px', color: colors.textMuted, cursor: 'pointer' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' },
  sectionHeader: { fontSize: '14px', fontWeight: '700', color: colors.textDescription, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', marginTop: '40px' },
  actionGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' },
  actionBtn: { background: colors.bgPanel, border: `1px solid ${colors.border}`, padding: '16px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'background 0.15s' },
};