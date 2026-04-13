import React, { Suspense, useState } from 'react';
import { signOut as authSignOut } from 'firebase/auth';

import { auth } from '../firebase';
import LayoutGlobal from '../components/LayoutGlobal';
import { Empty, Page, Spinner } from '../components/ui';
import { useModuleNav } from '../hooks/useModuleNav';
import { usePanelAccess } from '../hooks/usePanelAccess';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { PANEL_KEYS } from '../lib/moduleCatalog';
import { getCachedUserPreferences } from '../services/userSettings';

const lazyNamed = (importFn, name) =>
  lazyWithRetry(() => importFn().then((module) => ({ default: module[name] })), `named_${name}`);

const DashboardCoordenador = lazyWithRetry(() => import('./DashboardCoordenador'), 'dashboard_coordenador');
const GestaoSupervisores = lazyNamed(() => import('./GestaoColaboradores'), 'GestaoSupervisores');
const GestaoAtendentes = lazyNamed(() => import('./GestaoColaboradores'), 'GestaoAtendentes');
const GestaoEstrutura = lazyWithRetry(() => import('./GestaoEstrutura'), 'gestao_estrutura_coord');
const GestaoProdutos = lazyWithRetry(() => import('./GestaoProdutos'), 'gestao_produtos_coord');
const GestaoMetas = lazyWithRetry(() => import('./GestaoMetas'), 'gestao_metas_coord');
const ApuracaoResultados = lazyWithRetry(() => import('./ApuracaoResultados'), 'apuracao_resultados_coord');
const HubCrescimento = lazyWithRetry(() => import('./HubCrescimento'), 'hub_crescimento_coord');
const LojasOquei = lazyWithRetry(() => import('./LojasOquei'), 'lojas_oquei_coord');
const FaltasSupervisor = lazyWithRetry(() => import('./FaltasSupervisor/index.jsx'), 'faltas_coord');
const RhSupervisor = lazyWithRetry(() => import('./RhSupervisor'), 'rh_coord');
const DesencaixeSupervisor = lazyWithRetry(() => import('./DesencaixeSupervisor'), 'desencaixe_coord');
const Comunicados = lazyWithRetry(() => import('./Comunicados'), 'comunicados_coord');
const Wallboard = lazyWithRetry(() => import('./Wallboard'), 'wallboard_coord');
const HubOquei = lazyWithRetry(() => import('./HubOquei'), 'hub_oquei_coord');
const LaboratorioChurn = lazyWithRetry(() => import('./LaboratorioChurn'), 'churn_coord');
const OqueiInsights = lazyWithRetry(() => import('../OqueiInsights'), 'insights_coord');
const PainelVendas = lazyWithRetry(() => import('./PainelVendas'), 'vendas_coord');
const SalaDeGuerra = lazyWithRetry(() => import('./SalaDeGuerra'), 'guerra_coord');
const BancoHorasSupervisor = lazyWithRetry(() => import('./BancoHorasSupervisor'), 'banco_horas_coord');
const AgendaSupervisor = lazyWithRetry(() => import('./AgendaSupervisor'), 'agenda_coord');
const PatrocinioSupervisor = lazyWithRetry(() => import('./PatrocinioSupervisor'), 'patrocinio_coord');
const SolicitarCampanha = lazyWithRetry(() => import('./SolicitarCampanha'), 'campanha_coord');
const JapaSupervisor = lazyWithRetry(() => import('./JapaSupervisor'), 'japa_coord');
const LinksUteis = lazyWithRetry(() => import('./LinksUteis'), 'links_coord');
const Configuracoes = lazyWithRetry(() => import('./Configuracoes'), 'config_coord');
const CatalogoRoteadores = lazyWithRetry(() => import('./CatalogoRoteadores'), 'roteadores_coord');
const Desempenho = lazyWithRetry(() => import('./Desempenho'), 'desempenho_coord');
const Devolucoes = lazyWithRetry(() => import('./Devolucoes'), 'devolucoes_coord');

const ModuleFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
    <Spinner />
  </div>
);

export default function PainelCoordenador({ userData }) {
  const [defaultView, setDefaultView] = useState(
    () => getCachedUserPreferences(userData?.uid).defaultModule || 'dashboard'
  );
  const [activeView, setActiveView] = useModuleNav(defaultView);
  const { allowedModules, preferences, updatePreferences, refresh } = usePanelAccess({
    panel: PANEL_KEYS.COORDINATOR,
    userData,
    activeView,
    setActiveView,
    setDefaultModule: setDefaultView,
  });

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardCoordenador userData={userData} setActiveView={setActiveView} />;
      case 'hub_oquei':
        return <HubOquei userData={userData} />;
      case 'churn':
        return <LaboratorioChurn userData={userData} />;
      case 'oquei_insights':
        return <OqueiInsights userData={userData} />;
      case 'admin_supervisores':
        return <GestaoSupervisores userData={userData} />;
      case 'atendentes':
        return <GestaoAtendentes userData={userData} />;
      case 'estrutura':
        return <GestaoEstrutura />;
      case 'produtos':
        return <GestaoProdutos />;
      case 'gestao_metas':
        return <GestaoMetas userData={userData} />;
      case 'planos_crescimento':
        return <HubCrescimento userData={userData} />;
      case 'desempenho':
        return <Desempenho userData={userData} />;
      case 'apuracao_resultados':
        return <ApuracaoResultados userData={userData} />;
      case 'lojas_view':
        return <LojasOquei isEditingAllowed={true} />;
      case 'faltas':
        return <FaltasSupervisor userData={userData} />;
      case 'rh_requests':
        return <RhSupervisor userData={userData} />;
      case 'vendas':
        return <PainelVendas userData={userData} />;
      case 'war_room':
        return <SalaDeGuerra userData={userData} />;
      case 'banco_horas':
        return <BancoHorasSupervisor userData={userData} />;
      case 'desencaixe':
        return <DesencaixeSupervisor userData={userData} modoGestao />;
      case 'japa':
        return <JapaSupervisor userData={userData} />;
      case 'patrocinio':
        return <PatrocinioSupervisor userData={userData} />;
      case 'solicitar_campanha':
        return <SolicitarCampanha userData={userData} />;
      case 'conteudos_digitais':
        return (
          <Page title="Conteudos Digitais">
            <Empty icon="TV" title="Repositorio de Conteudos Digitais" description="Em breve..." />
          </Page>
        );
      case 'reunioes':
        return <AgendaSupervisor userData={userData} />;
      case 'comunicados':
        return <Comunicados userData={userData} />;
      case 'links':
        return <LinksUteis userData={userData} />;
      case 'configuracoes':
        return (
          <Configuracoes
            userData={userData}
            panel={PANEL_KEYS.COORDINATOR}
            activeModules={allowedModules}
            preferences={preferences}
            onPreferencesChange={updatePreferences}
            onSettingsSaved={refresh}
          />
        );
      case 'roteadores':
        return <CatalogoRoteadores userData={userData} />;
      case 'devolucoes':
        return <Devolucoes userData={userData} />;
      default:
        return <DashboardCoordenador userData={userData} setActiveView={setActiveView} />;
    }
  };

  if (activeView === 'wallboard') {
    return (
      <Suspense fallback={<ModuleFallback />}>
        <Wallboard userData={userData} onExit={() => setActiveView(defaultView || 'dashboard')} />
      </Suspense>
    );
  }

  return (
    <LayoutGlobal
      userData={userData}
      menuItems={allowedModules}
      activeTab={activeView}
      onTabChange={setActiveView}
      onLogout={() => authSignOut(auth)}
      appName="Hub Oquei"
      logoUrl="/favicon.png"
      preferences={preferences}
      onPreferenceChange={updatePreferences}
    >
      <Suspense fallback={<ModuleFallback />}>{renderContent()}</Suspense>
    </LayoutGlobal>
  );
}
