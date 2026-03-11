import React, { useState } from 'react';
import { auth } from '../firebase';
import { signOut as authSignOut } from 'firebase/auth';
import { 
  Store, BookOpen, Clock, TrendingUp, Zap, Globe, Megaphone, 
  FileCheck, CalendarClock, Wallet, LayoutGrid, UserX, Activity, 
  Tv, Flame, Settings, Gift, HeartHandshake, MonitorPlay, 
  MapPin, Users, UserPlus, ShoppingBag, Router, Target, UploadCloud
} from 'lucide-react';

// ✅ IMPORTAÇÃO DO DESIGN SYSTEM
import LayoutGlobal from '../components/LayoutGlobal';
import { colors, Page, Empty } from '../components/ui';

// IMPORTAÇÃO DO NOVO DASHBOARD MASTER
import DashboardCoordenador from './DashboardCoordenador'; 

// IMPORTAÇÃO DOS MÓDULOS MASTER (Exclusivos Coordenação)
import { GestaoSupervisores, GestaoAtendentes } from './GestaoColaboradores';
import GestaoEstrutura from './GestaoEstrutura';
import GestaoProdutos from './GestaoProdutos';
import GestaoMetas from './GestaoMetas';
import ApuracaoResultados from './ApuracaoResultados';

// IMPORTAÇÃO DOS MÓDULOS GERAIS (Iguais ao Supervisor)
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

export default function PainelCoordenador({ userData }) {
  const [activeView, setActiveView] = useState('dashboard');

  // ✅ LISTA SEM CORES HARDCODED (Utiliza o import { colors } do ui.jsx)
  const MENU_ITEMS = [
    // --- PRINCIPAL ---
    { id: 'dashboard', label: 'Visão Master', icon: Globe, section: 'Principal', color: colors.warning },
    { id: 'comunicados', label: 'Comunicados', icon: Megaphone, section: 'Principal', color: colors.primary },
    { id: 'wallboard', label: 'Modo TV', icon: Tv, section: 'Principal', color: colors.info },

    // --- INTELIGÊNCIA ---
    { id: 'hub_oquei', label: 'HubOquei Radar', icon: Zap, section: 'Inteligência', color: colors.info },
    { id: 'churn', label: 'Laboratório Churn', icon: Activity, section: 'Inteligência', color: colors.purple },

    // --- GESTÃO ---
    { id: 'admin_supervisores', label: 'Supervisores', icon: UserPlus, section: 'Gestão', color: colors.purple },
    { id: 'atendentes', label: 'Time de Vendas', icon: Users, section: 'Gestão' },
    { id: 'estrutura', label: 'Estrutura Lojas', icon: MapPin, section: 'Gestão', color: colors.primary },
    { id: 'produtos', label: 'Produtos/SVA', icon: ShoppingBag, section: 'Gestão', color: colors.warning },
    { id: 'lojas_view', label: 'Portfolio Lojas', icon: Store, section: 'Gestão' },
    { id: 'faltas', label: 'Faltas Globais', icon: UserX, section: 'Gestão' },
    { id: 'rh_requests', label: 'Pedidos RH', icon: FileCheck, section: 'Gestão' },
    { id: 'gestao_metas', label: 'Gestão de Metas', icon: Target, section: 'Gestão', color: colors.success },
    { id: 'apuracao_resultados', label: 'Apuração de Resultados', icon: UploadCloud, section: 'Gestão', color: colors.primary },
    
    // --- SISTEMAS ---
    { id: 'vendas', label: 'Painel Vendas', icon: TrendingUp, section: 'Sistemas', color: colors.success },
    { id: 'war_room', label: 'Sala de Guerra', icon: Flame, section: 'Sistemas', color: colors.danger },
    { id: 'banco_horas', label: 'Banco de Horas', icon: Clock, section: 'Sistemas', color: colors.warning },
    { id: 'desencaixe', label: 'Caixa Local', icon: Wallet, section: 'Sistemas', color: colors.success },

    // --- MARKETING ---
    { id: 'japa', label: 'Ações do Japa', icon: Gift, section: 'Marketing', color: colors.rose },
    { id: 'patrocinio', label: 'Patrocínio', icon: HeartHandshake, section: 'Marketing', color: colors.amber },
    { id: 'solicitar_campanha', label: 'Solicitar Campanha', icon: Megaphone, section: 'Marketing', color: colors.warning },
    { id: 'conteudos_digitais', label: 'Conteúdos Digitais', icon: MonitorPlay, section: 'Marketing', color: colors.info },

    // --- AGENDA ---
    { id: 'reunioes', label: 'Agenda', icon: CalendarClock, section: 'Agenda' },

    // --- FERRAMENTAS / UTILITÁRIOS ---
    { id: 'roteadores', label: 'Catálogo Roteadores', icon: Router, section: 'Ferramentas', color: colors.info },
    { id: 'configuracoes', label: 'Configurações S&OP', icon: Settings, section: 'Ferramentas' },
    { id: 'links', label: 'Links Úteis', icon: LayoutGrid, section: 'Ferramentas' },
  ];

  const renderContent = () => {
    switch (activeView) {
      // Dash
      case 'dashboard': return <DashboardCoordenador userData={userData} setActiveView={setActiveView} />;

      // Inteligência
      case 'hub_oquei': return <HubOquei userData={userData} />;
      case 'churn': return <LaboratorioChurn userData={userData} />;

      // Gestão Master
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
      // ✅ SUBSTITUIÇÃO DE INLINE STYLE PELO COMPONENTE DO DESIGN SYSTEM
      case 'conteudos_digitais': 
        return (
          <Page title="Conteúdos Digitais">
            <Empty icon="🎞️" title="Repositório de Conteúdos Digitais" description="Em breve..." />
          </Page>
        );

      // Utilitários
      case 'reunioes': return <AgendaSupervisor userData={userData} />;
      case 'comunicados': return <Comunicados userData={userData} />;
      case 'links': return <LinksUteis userData={userData} />;
      case 'configuracoes': return <Configuracoes userData={userData} />;
      case 'roteadores': return <CatalogoRoteadores userData={userData} />;

      default: return <DashboardCoordenador userData={userData} setActiveView={setActiveView} />;
    }
  };

  // Tranca o Wallboard para Ocultar o Menu Lateral
  if (activeView === 'wallboard') return <Wallboard userData={userData} onExit={() => setActiveView('dashboard')} />;

  return (
    // ✅ LayoutGlobal é o wrapper correto aqui (substitui o Page porque é a raiz da rota)
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