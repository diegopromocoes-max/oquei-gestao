import React, { lazy, Suspense, useState } from 'react';
import { signOut as authSignOut } from 'firebase/auth';

import { auth } from '../firebase';
import LayoutGlobal from '../components/LayoutGlobal';
import { Empty, Page, Spinner } from '../components/ui';
import { TourGuide, resetTour } from '../components/TourGuide';
import { usePanelAccess } from '../hooks/usePanelAccess';
import { PANEL_KEYS } from '../lib/moduleCatalog';
import { getCachedUserPreferences } from '../services/userSettings';

const VisaoGeralGrowth = lazy(() => import('./VisaoGeralGrowth'));
const HubCrescimento = lazy(() => import('../HubCrescimento'));
const Comunicados = lazy(() => import('./Comunicados'));
const AgendaSupervisor = lazy(() => import('./AgendaSupervisor'));
const PatrocinioSupervisor = lazy(() => import('./PatrocinioSupervisor'));
const SolicitarCampanha = lazy(() => import('./SolicitarCampanha'));
const CatalogoRoteadores = lazy(() => import('./CatalogoRoteadores'));
const LinksUteis = lazy(() => import('./LinksUteis'));
const PlanilhasEssenciais = lazy(() => import('./PlanilhasEssenciais'));
const JapaSupervisor = lazy(() => import('./JapaSupervisor'));
const EventosGrowth = lazy(() => import('./EventosGrowth'));
const GestaoMetas = lazy(() => import('./GestaoMetas'));
const ApuracaoResultados = lazy(() => import('./ApuracaoResultados'));
const HubOquei = lazy(() => import('./HubOquei'));
const LaboratorioChurn = lazy(() => import('./LaboratorioChurn'));
const OqueiInsights = lazy(() => import('../OqueiInsights'));
const Configuracoes = lazy(() => import('./Configuracoes'));

const Loading = () => (
  <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center', padding: '60px' }}>
    <Spinner size={32} />
  </div>
);

export default function PainelGrowthTeam({ userData }) {
  const [activeView, setActiveView] = useState(
    () => getCachedUserPreferences(userData?.uid).defaultModule || 'visao_geral'
  );
  const [showTour, setShowTour] = useState(
    () => !localStorage.getItem(`oquei_tour_done_${String(userData?.role || '').toLowerCase().replace(/[\s_-]/g, '')}`)
  );
  const { allowedModules, preferences, updatePreferences, refresh } = usePanelAccess({
    panel: PANEL_KEYS.GROWTH,
    userData,
    activeView,
    setActiveView,
  });

  const renderContent = () => {
    switch (activeView) {
      case 'visao_geral':
        return <VisaoGeralGrowth userData={userData} onNavigate={setActiveView} />;
      case 'hub':
        return <HubCrescimento userData={userData} />;
      case 'comunicados':
        return <Comunicados userData={userData} />;
      case 'agenda':
        return <AgendaSupervisor userData={userData} />;
      case 'acoes_japa':
        return <JapaSupervisor userData={userData} />;
      case 'patrocinio':
        return <PatrocinioSupervisor userData={userData} />;
      case 'eventos':
        return <EventosGrowth userData={userData} />;
      case 'campanha':
        return <SolicitarCampanha userData={userData} />;
      case 'roteadores':
        return <CatalogoRoteadores userData={userData} />;
      case 'links':
        return <LinksUteis userData={userData} />;
      case 'planilhas':
        return <PlanilhasEssenciais userData={userData} />;
      case 'gestao_metas':
        return <GestaoMetas userData={userData} />;
      case 'apuracao_resultados':
        return <ApuracaoResultados userData={userData} />;
      case 'hub_oquei':
        return <HubOquei userData={userData} />;
      case 'laboratorio_churn':
        return <LaboratorioChurn userData={userData} />;
      case 'oquei_insights':
        return <OqueiInsights userData={userData} />;
      case 'configuracoes':
        return (
          <Configuracoes
            userData={userData}
            panel={PANEL_KEYS.GROWTH}
            activeModules={allowedModules}
            preferences={preferences}
            onPreferencesChange={updatePreferences}
            onSettingsSaved={refresh}
          />
        );
      default:
        return (
          <Page title="Em Desenvolvimento">
            <Empty icon="Ferramenta" title="Pagina em construcao" description="Esta funcionalidade sera liberada em breve." />
          </Page>
        );
    }
  };

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
      extraFooter={
        <button
          onClick={() => {
            resetTour(userData?.role);
            setShowTour(true);
            setActiveView('visao_geral');
          }}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            padding: '8px 14px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            width: '100%',
            marginTop: '8px',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
          onMouseOver={(event) => {
            event.currentTarget.style.background = 'var(--bg-app)';
            event.currentTarget.style.color = 'var(--text-main)';
          }}
          onMouseOut={(event) => {
            event.currentTarget.style.background = 'transparent';
            event.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          Rever tour
        </button>
      }
    >
      <Suspense fallback={<Loading />}>{renderContent()}</Suspense>
      {showTour ? (
        <TourGuide
          userData={userData}
          onNavigate={setActiveView}
          isVisible={showTour}
          onClose={() => setShowTour(false)}
        />
      ) : null}
    </LayoutGlobal>
  );
}
