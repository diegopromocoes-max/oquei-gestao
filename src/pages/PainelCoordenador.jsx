import React, { useState, lazy, Suspense } from 'react';
import { auth } from '../firebase';
import { signOut as authSignOut } from 'firebase/auth';
import { 
  Store, BookOpen, Clock, TrendingUp, Zap, Globe, Megaphone, 
  FileCheck, CalendarClock, Wallet, LayoutGrid, UserX, Activity, 
  Tv, Flame, Settings, Gift, HeartHandshake, MonitorPlay, 
  MapPin, Users, UserPlus, ShoppingBag, Router, Target, UploadCloud
} from 'lucide-react';

import LayoutGlobal from '../components/LayoutGlobal';
import { colors, Page, Empty, Spinner } from '../components/ui';

// ── Lazy loader helper para named exports ──────────────────────
// React.lazy() só aceita default exports.
// Para named exports usamos .then() para criar um default virtual.
const lazyNamed = (importFn, name) =>
  lazy(() => importFn().then(m => ({ default: m[name] })));

// ── Módulos lazy ───────────────────────────────────────────────
const DashboardCoordenador  = lazy(() => import('./DashboardCoordenador'));
const GestaoSupervisores    = lazyNamed(() => import('./GestaoColaboradores'), 'GestaoSupervisores');
const GestaoAtendentes      = lazyNamed(() => import('./GestaoColaboradores'), 'GestaoAtendentes');
const GestaoEstrutura       = lazy(() => import('./GestaoEstrutura'));
const GestaoProdutos        = lazy(() => import('./GestaoProdutos'));
const GestaoMetas           = lazy(() => import('./GestaoMetas'));
const ApuracaoResultados    = lazy(() => import('./ApuracaoResultados'));
const LojasOquei            = lazy(() => import('./LojasOquei'));
const FaltasSupervisor      = lazy(() => import('./FaltasSupervisor'));
const RhSupervisor          = lazy(() => import('./RhSupervisor'));
const DesencaixeSupervisor  = lazy(() => import('./DesencaixeSupervisor'));
const Comunicados           = lazy(() => import('./Comunicados'));
const Wallboard             = lazy(() => import('./Wallboard'));
const HubOquei              = lazy(() => import('./HubOquei'));
const LaboratorioChurn      = lazy(() => import('./LaboratorioChurn'));
const PainelVendas          = lazy(() => import('./PainelVendas'));
const SalaDeGuerra          = lazy(() => import('./SalaDeGuerra'));
const BancoHorasSupervisor  = lazy(() => import('./BancoHorasSupervisor'));
const AgendaSupervisor      = lazy(() => import('./AgendaSupervisor'));
const PatrocinioSupervisor  = lazy(() => import('./PatrocinioSupervisor'));
const SolicitarCampanha     = lazy(() => import('./SolicitarCampanha'));
const JapaSupervisor        = lazy(() => import('./JapaSupervisor'));
const LinksUteis            = lazy(() => import('./LinksUteis'));
const Configuracoes         = lazy(() => import('./Configuracoes'));
const CatalogoRoteadores    = lazy(() => import('./CatalogoRoteadores'));

// ── Fallback de carregamento ───────────────────────────────────
const ModuleFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
    <Spinner />
  </div>
);

export default function PainelCoordenador({ userData }) {
  const [activeView, setActiveView] = useState('dashboard');

  const MENU_ITEMS = [
    { id: 'dashboard',           label: 'Visão Master',           icon: Globe,         section: 'Principal',    color: colors.warning },
    { id: 'comunicados',         label: 'Comunicados',            icon: Megaphone,     section: 'Principal',    color: colors.primary },
    { id: 'wallboard',           label: 'Modo TV',                icon: Tv,            section: 'Principal',    color: colors.info },
    { id: 'hub_oquei',           label: 'HubOquei Radar',         icon: Zap,           section: 'Inteligência', color: colors.info },
    { id: 'churn',               label: 'Laboratório Churn',      icon: Activity,      section: 'Inteligência', color: colors.purple },
    { id: 'admin_supervisores',  label: 'Supervisores',           icon: UserPlus,      section: 'Gestão',       color: colors.purple },
    { id: 'atendentes',          label: 'Time de Vendas',         icon: Users,         section: 'Gestão' },
    { id: 'estrutura',           label: 'Estrutura Lojas',        icon: MapPin,        section: 'Gestão',       color: colors.primary },
    { id: 'produtos',            label: 'Produtos/SVA',           icon: ShoppingBag,   section: 'Gestão',       color: colors.warning },
    { id: 'lojas_view',          label: 'Portfolio Lojas',        icon: Store,         section: 'Gestão' },
    { id: 'faltas',              label: 'Faltas Globais',         icon: UserX,         section: 'Gestão' },
    { id: 'rh_requests',         label: 'Pedidos RH',             icon: FileCheck,     section: 'Gestão' },
    { id: 'gestao_metas',        label: 'Gestão de Metas',        icon: Target,        section: 'Gestão',       color: colors.success },
    { id: 'apuracao_resultados', label: 'Apuração de Resultados', icon: UploadCloud,   section: 'Gestão',       color: colors.primary },
    { id: 'vendas',              label: 'Painel Vendas',          icon: TrendingUp,    section: 'Sistemas',     color: colors.success },
    { id: 'war_room',            label: 'Sala de Guerra',         icon: Flame,         section: 'Sistemas',     color: colors.danger },
    { id: 'banco_horas',         label: 'Banco de Horas',         icon: Clock,         section: 'Sistemas',     color: colors.warning },
    { id: 'desencaixe',          label: 'Caixa Local',            icon: Wallet,        section: 'Sistemas',     color: colors.success },
    { id: 'japa',                label: 'Ações do Japa',          icon: Gift,          section: 'Marketing',    color: colors.rose },
    { id: 'patrocinio',          label: 'Patrocínio',             icon: HeartHandshake,section: 'Marketing',    color: colors.amber },
    { id: 'solicitar_campanha',  label: 'Solicitar Campanha',     icon: Megaphone,     section: 'Marketing',    color: colors.warning },
    { id: 'conteudos_digitais',  label: 'Conteúdos Digitais',     icon: MonitorPlay,   section: 'Marketing',    color: colors.info },
    { id: 'reunioes',            label: 'Agenda',                 icon: CalendarClock, section: 'Agenda' },
    { id: 'roteadores',          label: 'Catálogo Roteadores',    icon: Router,        section: 'Ferramentas',  color: colors.info },
    { id: 'configuracoes',       label: 'Configurações S&OP',     icon: Settings,      section: 'Ferramentas' },
    { id: 'links',               label: 'Links Úteis',            icon: LayoutGrid,    section: 'Ferramentas' },
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':           return <DashboardCoordenador userData={userData} setActiveView={setActiveView} />;
      case 'hub_oquei':           return <HubOquei userData={userData} />;
      case 'churn':               return <LaboratorioChurn userData={userData} />;
      case 'admin_supervisores':  return <GestaoSupervisores userData={userData} />;
      case 'atendentes':          return <GestaoAtendentes userData={userData} />;
      case 'estrutura':           return <GestaoEstrutura />;
      case 'produtos':            return <GestaoProdutos />;
      case 'gestao_metas':        return <GestaoMetas userData={userData} />;
      case 'apuracao_resultados': return <ApuracaoResultados userData={userData} />;
      case 'lojas_view':          return <LojasOquei isEditingAllowed={true} />;
      case 'faltas':              return <FaltasSupervisor userData={userData} />;
      case 'rh_requests':         return <RhSupervisor userData={userData} />;
      case 'vendas':              return <PainelVendas userData={userData} />;
      case 'war_room':            return <SalaDeGuerra userData={userData} />;
      case 'banco_horas':         return <BancoHorasSupervisor userData={userData} />;
      case 'desencaixe':          return <DesencaixeSupervisor userData={userData} />;
      case 'japa':                return <JapaSupervisor userData={userData} />;
      case 'patrocinio':          return <PatrocinioSupervisor userData={userData} />;
      case 'solicitar_campanha':  return <SolicitarCampanha userData={userData} />;
      case 'conteudos_digitais':
        return (
          <Page title="Conteúdos Digitais">
            <Empty icon="🎞️" title="Repositório de Conteúdos Digitais" description="Em breve..." />
          </Page>
        );
      case 'reunioes':            return <AgendaSupervisor userData={userData} />;
      case 'comunicados':         return <Comunicados userData={userData} />;
      case 'links':               return <LinksUteis userData={userData} />;
      case 'configuracoes':       return <Configuracoes userData={userData} />;
      case 'roteadores':          return <CatalogoRoteadores userData={userData} />;
      default:                    return <DashboardCoordenador userData={userData} setActiveView={setActiveView} />;
    }
  };

  if (activeView === 'wallboard') {
    return (
      <Suspense fallback={<ModuleFallback />}>
        <Wallboard userData={userData} onExit={() => setActiveView('dashboard')} />
      </Suspense>
    );
  }

  return (
    <LayoutGlobal
      userData={userData}
      menuItems={MENU_ITEMS}
      activeTab={activeView}
      onTabChange={setActiveView}
      onLogout={() => authSignOut(auth)}
    >
      <Suspense fallback={<ModuleFallback />}>
        {renderContent()}
      </Suspense>
    </LayoutGlobal>
  );
}