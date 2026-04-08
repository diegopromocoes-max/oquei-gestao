import React, { lazy, Suspense, useState } from 'react';
import { signOut as authSignOut } from 'firebase/auth';

import { auth } from '../firebase';
import LayoutGlobal from '../components/LayoutGlobal';
import { Empty, Page, Spinner } from '../components/ui';
import { useModuleNav } from '../hooks/useModuleNav';
import { usePanelAccess } from '../hooks/usePanelAccess';
import { PANEL_KEYS } from '../lib/moduleCatalog';
import { getCachedUserPreferences } from '../services/userSettings';

const lazyNamed = (importFn, name) =>
  lazy(() => importFn().then((module) => ({ default: module[name] })));

const DashboardSupervisor = lazy(() => import('./DashboardSupervisor'));
const GestaoSupervisores = lazyNamed(() => import('./GestaoColaboradores'), 'GestaoSupervisores');
const GestaoAtendentes = lazyNamed(() => import('./GestaoColaboradores'), 'GestaoAtendentes');
const GestaoEstrutura = lazy(() => import('./GestaoEstrutura'));
const GestaoProdutos = lazy(() => import('./GestaoProdutos'));
const GestaoMetas = lazy(() => import('./GestaoMetas'));
const ApuracaoResultados = lazy(() => import('./ApuracaoResultados'));
const HubCrescimento = lazy(() => import('./HubCrescimento'));
const LojasOquei = lazy(() => import('./LojasOquei'));
const FaltasSupervisor = lazy(() => import('./FaltasSupervisor'));
const RhSupervisor = lazy(() => import('./RhSupervisor'));
const DesencaixeSupervisor = lazy(() => import('./DesencaixeSupervisor'));
const Comunicados = lazy(() => import('./Comunicados'));
const Wallboard = lazy(() => import('./Wallboard'));
const HubOquei = lazy(() => import('./HubOquei'));
const LaboratorioChurn = lazy(() => import('./LaboratorioChurn'));
const OqueiInsights = lazy(() => import('../OqueiInsights'));
const PainelVendas = lazy(() => import('./PainelVendas'));
const SalaDeGuerra = lazy(() => import('./SalaDeGuerra'));
const BancoHorasSupervisor = lazy(() => import('./BancoHorasSupervisor'));
const AgendaSupervisor = lazy(() => import('./AgendaSupervisor'));
const PatrocinioSupervisor = lazy(() => import('./PatrocinioSupervisor'));
const SolicitarCampanha = lazy(() => import('./SolicitarCampanha'));
const JapaSupervisor = lazy(() => import('./JapaSupervisor'));
const LinksUteis = lazy(() => import('./LinksUteis'));
const Configuracoes = lazy(() => import('./Configuracoes'));
const CatalogoRoteadores = lazy(() => import('./CatalogoRoteadores'));
const CRMAtivo = lazy(() => import('./CRMAtivo'));
const Desempenho = lazy(() => import('./Desempenho'));

const ModuleFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
    <Spinner />
  </div>
);

export default function PainelSupervisor({ userData }) {
  const [defaultView, setDefaultView] = useState(
    () => getCachedUserPreferences(userData?.uid).defaultModule || 'dashboard'
  );
  const [activeView, setActiveView] = useModuleNav(defaultView);
  const { allowedModules, preferences, updatePreferences, refresh } = usePanelAccess({
    panel: PANEL_KEYS.SUPERVISOR,
    userData,
    activeView,
    setActiveView,
    setDefaultModule: setDefaultView,
  });

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardSupervisor userData={userData} setActiveView={setActiveView} />;
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
      case 'crm_ativo':
        return <CRMAtivo userData={userData} />;
      case 'war_room':
        return <SalaDeGuerra userData={userData} />;
      case 'banco_horas':
        return <BancoHorasSupervisor userData={userData} />;
      case 'desencaixe':
        return <DesencaixeSupervisor userData={userData} />;
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
            panel={PANEL_KEYS.SUPERVISOR}
            activeModules={allowedModules}
            preferences={preferences}
            onPreferencesChange={updatePreferences}
            onSettingsSaved={refresh}
          />
        );
      case 'roteadores':
        return <CatalogoRoteadores userData={userData} />;
      default:
        return <DashboardSupervisor userData={userData} setActiveView={setActiveView} />;
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
