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

const DashboardSupervisor = lazyWithRetry(() => import('./DashboardSupervisor'), 'dashboard_supervisor');
const GestaoSupervisores = lazyNamed(() => import('./GestaoColaboradores'), 'GestaoSupervisores');
const GestaoAtendentes = lazyNamed(() => import('./GestaoColaboradores'), 'GestaoAtendentes');
const GestaoEstrutura = lazyWithRetry(() => import('./GestaoEstrutura'), 'gestao_estrutura');
const GestaoProdutos = lazyWithRetry(() => import('./GestaoProdutos'), 'gestao_produtos');
const GestaoMetas = lazyWithRetry(() => import('./GestaoMetas'), 'gestao_metas');
const ApuracaoResultados = lazyWithRetry(() => import('./ApuracaoResultados'), 'apuracao_resultados');
const HubCrescimento = lazyWithRetry(() => import('./HubCrescimento'), 'hub_crescimento');
const LojasOquei = lazyWithRetry(() => import('./LojasOquei'), 'lojas_oquei');
const FaltasSupervisor = lazyWithRetry(() => import('./FaltasSupervisor'), 'faltas_supervisor');
const RhSupervisor = lazyWithRetry(() => import('./RhSupervisor'), 'rh_supervisor');
const DesencaixeSupervisor = lazyWithRetry(() => import('./DesencaixeSupervisor'), 'desencaixe_supervisor');
const Comunicados = lazyWithRetry(() => import('./Comunicados'), 'comunicados_supervisor');
const Wallboard = lazyWithRetry(() => import('./Wallboard'), 'wallboard_supervisor');
const HubOquei = lazyWithRetry(() => import('./HubOquei'), 'hub_oquei_supervisor');
const LaboratorioChurn = lazyWithRetry(() => import('./LaboratorioChurn'), 'laboratorio_churn_supervisor');
const OqueiInsights = lazyWithRetry(() => import('../OqueiInsights'), 'oquei_insights_supervisor');
const PainelVendas = lazyWithRetry(() => import('./PainelVendas'), 'painel_vendas_supervisor');
const SalaDeGuerra = lazyWithRetry(() => import('./SalaDeGuerra'), 'sala_guerra_supervisor');
const BancoHorasSupervisor = lazyWithRetry(() => import('./BancoHorasSupervisor'), 'banco_horas_supervisor');
const AgendaSupervisor = lazyWithRetry(() => import('./AgendaSupervisor'), 'agenda_supervisor');
const PatrocinioSupervisor = lazyWithRetry(() => import('./PatrocinioSupervisor'), 'patrocinio_supervisor');
const SolicitarCampanha = lazyWithRetry(() => import('./SolicitarCampanha'), 'solicitar_campanha_supervisor');
const JapaSupervisor = lazyWithRetry(() => import('./JapaSupervisor'), 'japa_supervisor');
const LinksUteis = lazyWithRetry(() => import('./LinksUteis'), 'links_uteis_supervisor');
const Configuracoes = lazyWithRetry(() => import('./Configuracoes'), 'configuracoes_supervisor');
const CatalogoRoteadores = lazyWithRetry(() => import('./CatalogoRoteadores'), 'catalogo_roteadores_supervisor');
const CRMAtivo = lazyWithRetry(() => import('./CRMAtivo'), 'crm_ativo_supervisor');
const Desempenho = lazyWithRetry(() => import('./Desempenho'), 'desempenho_supervisor');
const Devolucoes = lazyWithRetry(() => import('./Devolucoes'), 'devolucoes_supervisor');

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
      case 'devolucoes':
        return <Devolucoes userData={userData} />;
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
