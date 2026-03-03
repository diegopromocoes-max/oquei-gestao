import React, { useState } from 'react';
import { auth } from '../firebase';
import { signOut as authSignOut } from 'firebase/auth';
import { 
  Store, BookOpen, Clock, TrendingUp, Zap, Globe, Megaphone, 
  FileCheck, CalendarClock, Briefcase, Wallet, Share2, 
  LayoutGrid, UserX, Activity, Tv, Flame, BarChart3
} from 'lucide-react';

// IMPORTAÇÃO DO DESIGN SYSTEM
import LayoutGlobal from '../components/LayoutGlobal';
import { colors, styles } from '../styles/globalStyles';

// IMPORTAÇÃO DOS MÓDULOS
import DashboardSupervisor from './DashboardSupervisor'; 
import LojasOquei from './LojasOquei'; 
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

// 👇 1. IMPORTAÇÃO DO MÓDULO DE CONFIGURAÇÕES AQUI 👇
import Configuracoes from './Configuracoes'; 

export default function PainelSupervisor({ userData }) {
  const [activeView, setActiveView] = useState('dashboard');

  const MENU_ITEMS = [
    { id: 'dashboard', label: 'Visão Geral', icon: Globe, section: 'Principal', color: colors?.warning || '#f59e0b' },
    { id: 'comunicados', label: 'Comunicados', icon: Megaphone, section: 'Principal', color: colors?.primary || '#3b82f6' },
    { id: 'wallboard', label: 'Modo TV', icon: Tv, section: 'Principal', color: colors?.cyan || '#06b6d4' },
    
    // SISTEMAS
    { id: 'hub_oquei', label: 'HubOquei Radar', icon: Zap, section: 'Inteligência', color: colors?.cyan || '#06b6d4' },
    { id: 'churn', label: 'Laboratório Churn', icon: Activity, section: 'Inteligência', color: colors?.purple || '#8b5cf6' },
    { id: 'relatorio_geral', label: 'Relatório BI', icon: BarChart3, section: 'Inteligência', color: colors?.primary || '#3b82f6' },
    { id: 'vendas', label: 'Painel Vendas', icon: TrendingUp, section: 'Sistemas', color: colors?.success || '#10b981' },
    { id: 'war_room', label: 'Sala de Guerra', icon: Flame, section: 'Sistemas', color: colors?.danger || '#ef4444' }, 
    { id: 'banco_horas', label: 'Banco de Horas', icon: Clock, section: 'Sistemas', color: colors?.warning || '#f59e0b' },
    
    // GESTÃO
    { id: 'lojas', label: 'Minhas Lojas', icon: Store, section: 'Gestão' },
    { id: 'faltas', label: 'Faltas & Escala', icon: UserX, section: 'Gestão' },
    { id: 'rh_requests', label: 'Solicitações RH', icon: FileCheck, section: 'Gestão' },
    { id: 'orientacoes', label: 'Manual Supervisor', icon: BookOpen, section: 'Gestão' },
    
    // AGENDA E FERRAMENTAS
    { id: 'reunioes', label: 'Agenda', icon: CalendarClock, section: 'Agenda' },
    { id: 'patrocinio', label: 'Patrocínio', icon: Wallet, section: 'Financeiro' },
    { id: 'desencaixe', label: 'Caixa Local', icon: Wallet, section: 'Financeiro' },
    { id: 'japa', label: 'Ações do Japa', icon: Share2, section: 'Ferramentas' },
    { id: 'links', label: 'Links Úteis', icon: LayoutGrid, section: 'Ferramentas' },
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardSupervisor userData={userData} setActiveView={setActiveView} />;
      case 'lojas': return <LojasOquei isEditingAllowed={false} />;
      case 'hub_oquei': return <HubOquei userData={userData} />;
      case 'churn': return <LaboratorioChurn userData={userData} />;
      case 'relatorio_geral': return <RelatorioGeral userData={userData} />;
      case 'vendas': return <PainelVendas userData={userData} />;
      case 'war_room': return <SalaDeGuerra userData={userData} />;
      case 'banco_horas': return <BancoHorasSupervisor userData={userData} />;
      case 'faltas': return <FaltasSupervisor userData={userData} />;
      case 'rh_requests': return <RhSupervisor userData={userData} />;
      case 'reunioes': return <AgendaSupervisor userData={userData} />;
      case 'patrocinio': return <PatrocinioSupervisor userData={userData} />;
      case 'desencaixe': return <DesencaixeSupervisor userData={userData} />;
      case 'comunicados': return <Comunicados userData={userData} />;
      case 'links': return <LinksUteis userData={userData} />;
      case 'orientacoes': return <ManualSupervisor userData={userData} />;
      case 'japa': return <JapaSupervisor userData={userData} />;
      
      // 👇 2. ROTA DAS CONFIGURAÇÕES ADICIONADA AQUI 👇
      case 'configuracoes': return <Configuracoes userData={userData} />;
      
      default: return <DashboardSupervisor userData={userData} setActiveView={setActiveView} />;
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