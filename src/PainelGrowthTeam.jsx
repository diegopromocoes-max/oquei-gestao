// ============================================================
//  PainelGrowthTeam.jsx — Oquei Gestão
//  Painel completo do Time Growth com todos os módulos
// ============================================================

import React, { lazy, Suspense, useState } from 'react';
import { auth } from '../firebase';
import { signOut as authSignOut } from 'firebase/auth';

import {
  Zap, Megaphone, Globe, TrendingUp, Calendar, HeartHandshake,
  Trophy, Router, FileSpreadsheet, LayoutDashboard,
  MonitorPlay, FileCheck, MessageSquare,
  Target, BarChart2, Radar, FlaskConical, Telescope
} from 'lucide-react';

import LayoutGlobal from '../components/LayoutGlobal';
import { Page, Empty, Spinner } from '../components/ui';
import { TourGuide, resetTour } from '../components/TourGuide';

// ── Imports lazy ─────────────────────────────────────────────
const VisaoGeralGrowth    = lazy(() => import('./VisaoGeralGrowth'));
const HubCrescimento      = lazy(() => import('../HubCrescimento'));
const Comunicados         = lazy(() => import('./Comunicados'));
const AgendaSupervisor    = lazy(() => import('./AgendaSupervisor'));
const PatrocinioSupervisor = lazy(() => import('./PatrocinioSupervisor'));
const SolicitarCampanha    = lazy(() => import('./SolicitarCampanha'));
const CatalogoRoteadores   = lazy(() => import('./CatalogoRoteadores'));
const LinksUteis           = lazy(() => import('./LinksUteis'));
const PlanilhasEssenciais  = lazy(() => import('./PlanilhasEssenciais'));
const JapaSupervisor       = lazy(() => import('./JapaSupervisor'));
const EventosGrowth        = lazy(() => import('./EventosGrowth'));
const GestaoMetas          = lazy(() => import('./GestaoMetas'));
const ApuracaoResultados   = lazy(() => import('./ApuracaoResultados'));
const HubOquei             = lazy(() => import('./HubOquei'));
const LaboratorioChurn     = lazy(() => import('./LaboratorioChurn'));
const OqueiInsights        = lazy(() => import('../OqueiInsights'));

// ── Menu ─────────────────────────────────────────────────────
const MENU_ITEMS = [
  { id: 'visao_geral', 'data-tour': 'tour-visao-geral', label: 'Visão Geral',         icon: LayoutDashboard, section: 'PRINCIPAL' },
  { id: 'hub', 'data-tour': 'tour-hub',         label: 'Hub de Crescimento',  icon: Zap,             section: 'PRINCIPAL' },
  { id: 'comunicados', label: 'Comunicados',          icon: MessageSquare,   section: 'PRINCIPAL' },
  { id: 'agenda',      label: 'Minha Agenda',         icon: Calendar,        section: 'PRINCIPAL' },

  { id: 'acoes_japa',  label: 'Ações do Japa',        icon: Zap,             section: 'MARKETING' },
  { id: 'patrocinio',  label: 'Solicitar Patrocínio', icon: HeartHandshake,  section: 'MARKETING' },
  { id: 'eventos',     label: 'Eventos',              icon: Trophy,          section: 'MARKETING' },
  { id: 'campanha',    label: 'Solicitar Campanha',   icon: Megaphone,       section: 'MARKETING' },

  { id: 'roteadores',  label: 'Catálogo de Roteadores', icon: Router,        section: 'FERRAMENTAS' },
  { id: 'links',       label: 'Links Úteis',            icon: Globe,         section: 'FERRAMENTAS' },
  { id: 'planilhas',   label: 'Planilhas Essenciais',   icon: FileSpreadsheet, section: 'FERRAMENTAS' },

  { id: 'gestao_metas', 'data-tour': 'tour-gestao-metas',       label: 'Gestão de Metas',        icon: Target,        section: 'INTELIGÊNCIA' },
  { id: 'apuracao_resultados', 'data-tour': 'tour-apuracao',label: 'Apuração de Resultados', icon: BarChart2,     section: 'INTELIGÊNCIA' },
  { id: 'hub_oquei', 'data-tour': 'tour-hub-oquei',          label: 'Hub Oquei / Radar',      icon: Radar,         section: 'INTELIGÊNCIA' },
  { id: 'laboratorio_churn', 'data-tour': 'tour-churn',  label: 'Laboratório Churn',      icon: FlaskConical,  section: 'INTELIGÊNCIA' },
  { id: 'oquei_insights',                               label: 'Oquei Insights',         icon: Telescope,     section: 'INTELIGÊNCIA' },
];

// ── Logo Oquei (URL da logo) ──────────────────────────────────
// Substitua pela URL real da logo quando disponível
const LOGO_URL = null; // ex: 'https://oquei.com.br/logo.png'
const APP_NAME = 'HUB Oquei';

// ── Fallback de loading ───────────────────────────────────────
const Loading = () => (
  <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center', padding: '60px' }}>
    <Spinner size={32} />
  </div>
);

// ── Componente principal ──────────────────────────────────────
export default function PainelGrowthTeam({ userData }) {
  const [activeView, setActiveView] = useState('visao_geral');
  const [showTour,   setShowTour]   = useState(() => !localStorage.getItem(`oquei_tour_done_${String(userData?.role || '').toLowerCase().replace(/[\s_-]/g, '')}`));

  const renderContent = () => {
    switch (activeView) {
      case 'visao_geral':  return <VisaoGeralGrowth userData={userData} onNavigate={setActiveView} />;
      case 'hub':          return <HubCrescimento userData={userData} />;
      case 'comunicados':  return <Comunicados userData={userData} />;
      case 'agenda':       return <AgendaSupervisor userData={userData} />;
      case 'acoes_japa':   return <JapaSupervisor userData={userData} />;
      case 'patrocinio':   return <PatrocinioSupervisor userData={userData} />;
      case 'eventos':      return <EventosGrowth userData={userData} />;
      case 'campanha':     return <SolicitarCampanha userData={userData} />;
      case 'roteadores':   return <CatalogoRoteadores userData={userData} />;
      case 'links':        return <LinksUteis userData={userData} />;
      case 'planilhas':    return <PlanilhasEssenciais userData={userData} />;
      case 'gestao_metas':        return <GestaoMetas userData={userData} />;
      case 'apuracao_resultados': return <ApuracaoResultados userData={userData} />;
      case 'hub_oquei':           return <HubOquei userData={userData} />;
      case 'laboratorio_churn':   return <LaboratorioChurn userData={userData} />;
      case 'oquei_insights':      return <OqueiInsights userData={userData} />;
      default:
        return (
          <Page title="Em Desenvolvimento">
            <Empty icon="🛠️" title="Página em construção" description="Esta funcionalidade será liberada em breve." />
          </Page>
        );
    }
  };

  return (
    <LayoutGlobal
      userData={userData}
      menuItems={MENU_ITEMS}
      activeTab={activeView}
      onTabChange={setActiveView}
      onLogout={() => authSignOut(auth)}
      appName={"HUB OQUEI"}
      logoUrl={"https://lh6.googleusercontent.com/proxy/OQmnkD6TxExvN5uvw-zWOpJHZ6qW-J6aJaUPlJX4Y06C_IRXAN3CooFhuzMisQmGCpNS9aQkpjPNcH2YOZs-CeiOuVKjlDO6oqSsDIFrSS2hGse8ug"}
      extraFooter={
        <button
          onClick={() => { resetTour(userData?.role); setShowTour(true); setActiveView('visao_geral'); }}
          style={{
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text-muted)', padding: '8px 14px',
            borderRadius: '10px', fontSize: '12px', fontWeight: '700',
            cursor: 'pointer', width: '100%', marginTop: '8px',
            transition: 'all 0.15s', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '6px',
          }}
          onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-app)'; e.currentTarget.style.color = 'var(--text-main)'; }}
          onMouseOut={e =>  { e.currentTarget.style.background = 'transparent';    e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          🚀 Ver tour novamente
        </button>
      }>
      <Suspense fallback={<Loading />}>
        {renderContent()}
      </Suspense>
      {/* Tour Guide — aparece só na primeira visita */}
      {showTour && (
        <TourGuide
          userData={userData}
          onNavigate={setActiveView}
          isVisible={showTour}
          onClose={() => setShowTour(false)}
        />
      )}
    </LayoutGlobal>
  );
}