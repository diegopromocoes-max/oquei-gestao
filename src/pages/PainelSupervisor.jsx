import React, { useState } from 'react';
import { auth } from '../firebase';
import { signOut as authSignOut } from 'firebase/auth';
import { 
  Store, BookOpen, Clock, TrendingUp, Zap, Globe, Megaphone, 
  FileCheck, CalendarClock, Wallet, LayoutGrid, UserX, Activity, 
  Tv, Flame, Settings, Gift, HeartHandshake, MonitorPlay, 
  MapPin, UserPlus, ShoppingBag, Router, Target, UploadCloud, Users
} from 'lucide-react';

// IMPORTAÇÃO DO DESIGN SYSTEM
import LayoutGlobal from '../components/LayoutGlobal';
import { colors } from '../styles/globalStyles';

// IMPORTAÇÃO DO DASHBOARD DO SUPERVISOR
import DashboardSupervisor from './DashboardSupervisor'; 

// IMPORTAÇÃO DOS MÓDULOS DE GESTÃO E ADMINISTRAÇÃO (Agora disponíveis para Supervisor)
import { GestaoSupervisores, GestaoAtendentes } from './GestaoColaboradores';
import GestaoEstrutura from './GestaoEstrutura';
import GestaoProdutos from './GestaoProdutos';
import GestaoMetas from './GestaoMetas';
import ApuracaoResultados from './ApuracaoResultados';

// IMPORTAÇÃO DOS MÓDULOS GERAIS
import LojasOquei from './LojasOquei'; 
import FaltasSupervisor from './FaltasSupervisor';
import RhSupervisor from './RhSupervisor';
import DesencaixeSupervisor from './DesencaixeSupervisor';
import Comunicados from './Comunicados';
import Wallboard from './Wallboard';
import HubOquei from './HubOquei';
import LaboratorioChurn from './LaboratorioChurn';
import PainelVendas from './PainelVendas';
import SalaDeGuerra from './SalaDeGuerra';
import BancoHorasSupervisor from './BancoHorasSupervisor';
import AgendaSupervisor from './AgendaSupervisor';
import PatrocinioSupervisor from './PatrocinioSupervisor';
import SolicitarCampanha from './SolicitarCampanha';
import JapaSupervisor from './JapaSupervisor';
import LinksUteis from './LinksUteis';
import Configuracoes from './Configuracoes';
import CatalogoRoteadores from './CatalogoRoteadores';

export default function PainelSupervisor({ userData }) {
  const [activeView, setActiveView] = useState('dashboard');

  const MENU_ITEMS = [
    // --- PRINCIPAL ---
    { id: 'dashboard', label: 'Visão Geral', icon: Globe, section: 'Principal', color: colors?.warning || '#f59e0b' },
    { id: 'comunicados', label: 'Comunicados', icon: Megaphone, section: 'Principal', color: colors?.primary || '#3b82f6' },
    { id: 'wallboard', label: 'Modo TV', icon: Tv, section: 'Principal', color: colors?.cyan || '#06b6d4' },

    // --- INTELIGÊNCIA ---
    { id: 'hub_oquei', label: 'HubOquei Radar', icon: Zap, section: 'Inteligência', color: colors?.cyan || '#06b6d4' },
    { id: 'churn', label: 'Laboratório Churn', icon: Activity, section: 'Inteligência', color: colors?.purple || '#8b5cf6' },

    // --- GESTÃO (Módulos de Coordenação espelhados para Operação) ---
    { id: 'admin_supervisores', label: 'Supervisores', icon: UserPlus, section: 'Gestão', color: colors?.purple || '#8b5cf6' },
    { id: 'atendentes', label: 'Time de Vendas', icon: Users, section: 'Gestão' },
    { id: 'estrutura', label: 'Estrutura Lojas', icon: MapPin, section: 'Gestão', color: colors?.primary || '#3b82f6' },
    { id: 'produtos', label: 'Produtos/SVA', icon: ShoppingBag, section: 'Gestão', color: colors?.warning || '#f59e0b' },
    { id: 'lojas_view', label: 'Portfolio Lojas', icon: Store, section: 'Gestão' },
    { id: 'faltas', label: 'Faltas Globais', icon: UserX, section: 'Gestão' },
    { id: 'rh_requests', label: 'Pedidos RH', icon: FileCheck, section: 'Gestão' },
    { id: 'gestao_metas', label: 'Gestão de Metas', icon: Target, section: 'Gestão', color: colors?.success || '#10b981' },
    { id: 'apuracao_resultados', label: 'Apuração de Resultados', icon: UploadCloud, section: 'Gestão', color: colors?.primary || '#3b82f6' },
    
    // --- SISTEMAS ---
    { id: 'vendas', label: 'Painel Vendas', icon: TrendingUp, section: 'Sistemas', color: colors?.success || '#10b981' },
    { id: 'war_room', label: 'Sala de Guerra', icon: Flame, section: 'Sistemas', color: colors?.danger || '#ef4444' },
    { id: 'banco_horas', label: 'Banco de Horas', icon: Clock, section: 'Sistemas', color: colors?.warning || '#f59e0b' },
    { id: 'desencaixe', label: 'Caixa Local', icon: Wallet, section: 'Sistemas', color: colors?.success || '#10b981' },

    // --- MARKETING ---
    { id: 'japa', label: 'Ações do Japa', icon: Gift, section: 'Marketing', color: '#ff4757' },
    { id: 'patrocinio', label: 'Patrocínio', icon: HeartHandshake, section: 'Marketing', color: '#ffa502' },
    { id: 'solicitar_campanha', label: 'Solicitar Campanha', icon: Megaphone, section: 'Marketing', color: colors?.warning || '#f59e0b' },
    { id: 'conteudos_digitais', label: 'Conteúdos Digitais', icon: MonitorPlay, section: 'Marketing', color: colors?.cyan || '#06b6d4' },

    // --- AGENDA ---
    { id: 'reunioes', label: 'Agenda', icon: CalendarClock, section: 'Agenda' },

    // --- FERRAMENTAS / UTILITÁRIOS ---
    { id: 'roteadores', label: 'Catálogo Roteadores', icon: Router, section: 'Ferramentas', color: colors?.cyan || '#06b6d4' },
    { id: 'configuracoes', label: 'Configurações S&OP', icon: Settings, section: 'Ferramentas' },
    { id: 'links', label: 'Links Úteis', icon: LayoutGrid, section: 'Ferramentas' },
  ];

  const renderContent = () => {
    switch (activeView) {
      // Dash do Supervisor
      case 'dashboard': return <DashboardSupervisor userData={userData} setActiveView={setActiveView} />;

      // Inteligência
      case 'hub_oquei': return <HubOquei userData={userData} />;
      case 'churn': return <LaboratorioChurn userData={userData} />;

      // Gestão Master (Agora acessível ao supervisor)
      case 'admin_supervisores': return <GestaoSupervisores />;
      case 'atendentes': return <GestaoAtendentes />;
      case 'estrutura': return <GestaoEstrutura />;
      case 'produtos': return <GestaoProdutos />;
      case 'gestao_metas': return <GestaoMetas userData={userData} />;
      case 'apuracao_resultados': return <ApuracaoResultados userData={userData} />;
      
      // Gestão Geral
      case 'lojas_view': return <LojasOquei isEditingAllowed={true} />;
      case 'faltas': return <FaltasSupervisor userData={userData} />;
      case 'rh_requests': return <RhSupervisor userData={userData} />;

      // Sistemas
      case 'vendas': return <PainelVendas userData={userData} />;
      case 'war_room': return <SalaDeGuerra userData={userData} />;
      case 'banco_horas': return <BancoHorasSupervisor userData={userData} />;
      case 'desencaixe': return <DesencaixeSupervisor userData={userData} />;

      // Marketing
      case 'japa': return <JapaSupervisor userData={userData} />;
      case 'patrocinio': return <PatrocinioSupervisor userData={userData} />;
      case 'solicitar_campanha': return <SolicitarCampanha userData={userData} />;
      case 'conteudos_digitais': return <div style={{padding: '40px', textAlign: 'center'}}><h3>Repositório de Conteúdos Digitais</h3><p>Em breve...</p></div>;

      // Utilitários
      case 'reunioes': return <AgendaSupervisor userData={userData} />;
      case 'comunicados': return <Comunicados userData={userData} />;
      case 'links': return <LinksUteis userData={userData} />;
      case 'configuracoes': return <Configuracoes userData={userData} />;
      case 'roteadores': return <CatalogoRoteadores userData={userData} />;

      default: return <DashboardSupervisor userData={userData} setActiveView={setActiveView} />;
    }
  };

  // Tranca o Wallboard para Ocultar o Menu Lateral
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