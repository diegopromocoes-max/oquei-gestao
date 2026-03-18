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
  MonitorPlay, FileCheck, MessageSquare
} from 'lucide-react';

import LayoutGlobal from '../components/LayoutGlobal';
import { Page, Empty, Spinner } from '../components/ui';

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

// ── Menu ─────────────────────────────────────────────────────
const MENU_ITEMS = [
  { id: 'visao_geral', label: 'Visão Geral',         icon: LayoutDashboard, section: 'PRINCIPAL' },
  { id: 'hub',         label: 'Hub de Crescimento',  icon: Zap,             section: 'PRINCIPAL' },
  { id: 'comunicados', label: 'Comunicados',          icon: MessageSquare,   section: 'PRINCIPAL' },
  { id: 'agenda',      label: 'Minha Agenda',         icon: Calendar,        section: 'PRINCIPAL' },

  { id: 'acoes_japa',  label: 'Ações do Japa',        icon: Zap,             section: 'MARKETING' },
  { id: 'patrocinio',  label: 'Solicitar Patrocínio', icon: HeartHandshake,  section: 'MARKETING' },
  { id: 'eventos',     label: 'Eventos',              icon: Trophy,          section: 'MARKETING' },
  { id: 'campanha',    label: 'Solicitar Campanha',   icon: Megaphone,       section: 'MARKETING' },

  { id: 'roteadores',  label: 'Catálogo de Roteadores', icon: Router,        section: 'FERRAMENTAS' },
  { id: 'links',       label: 'Links Úteis',            icon: Globe,         section: 'FERRAMENTAS' },
  { id: 'planilhas',   label: 'Planilhas Essenciais',   icon: FileSpreadsheet, section: 'FERRAMENTAS' },
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
      logoUrl={"https://lh6.googleusercontent.com/proxy/OQmnkD6TxExvN5uvw-zWOpJHZ6qW-J6aJaUPlJX4Y06C_IRXAN3CooFhuzMisQmGCpNS9aQkpjPNcH2YOZs-CeiOuVKjlDO6oqSsDIFrSS2hGse8ug"}>
      <Suspense fallback={<Loading />}>
        {renderContent()}
      </Suspense>
    </LayoutGlobal>
  );
}
