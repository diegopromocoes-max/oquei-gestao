// ============================================================
//  PainelGrowthTeam.jsx — Oquei Gestão
//  ✅ Estrutura corrigida para LayoutGlobal (Flat array + section)
// ============================================================

import React, { lazy, Suspense, useState } from 'react';
import { auth } from '../firebase';
import { signOut as authSignOut } from 'firebase/auth';

// Ícones seguros e presentes no seu projeto
import { 
  Zap, Megaphone, Globe, HelpCircle, 
  TrendingUp, Calendar, HeartHandshake, Trophy, 
  MonitorPlay, Router, FileCheck, MessageSquare
} from 'lucide-react';

import LayoutGlobal from '../components/LayoutGlobal';
import { Page, Empty, Spinner } from '../components/ui';

const HubCrescimento      = lazy(() => import('../HubCrescimento'));
const Comunicados         = lazy(() => import('./Comunicados'));
const AgendaSupervisor    = lazy(() => import('./AgendaSupervisor'));
const PatrocinioSupervisor = lazy(() => import('./PatrocinioSupervisor'));
const SolicitarCampanha    = lazy(() => import('./SolicitarCampanha'));
const CatalogoRoteadores   = lazy(() => import('./CatalogoRoteadores'));
const LinksUteis           = lazy(() => import('./LinksUteis'));

// ── Lista plana com a propriedade 'section' exigida pelo LayoutGlobal ──
const MENU_ITEMS = [
  { id: 'hub',             label: 'Hub de Crescimento',   icon: Zap,             section: 'PRINCIPAL' },
  { id: 'growth_overview', label: 'Visão Geral Growth',   icon: TrendingUp,      section: 'PRINCIPAL' },
  { id: 'comunicados',     label: 'Comunicados',          icon: MessageSquare,   section: 'PRINCIPAL' },
  { id: 'agenda',          label: 'Agenda',               icon: Calendar,        section: 'PRINCIPAL' },
  
  { id: 'acoes_japa',      label: 'Ações do Japa',        icon: Zap,             section: 'MARKETING' },
  { id: 'patrocinio',      label: 'Solicitar Patrocínio', icon: HeartHandshake, section: 'MARKETING' },
  { id: 'eventos',         label: 'Eventos',              icon: Trophy,          section: 'MARKETING' },
  { id: 'campanha',        label: 'Solicitar Campanha',   icon: Megaphone,       section: 'MARKETING' },
  { id: 'conteudos',       label: 'Conteúdos Digitais',   icon: MonitorPlay,     section: 'MARKETING' },
  
  { id: 'roteadores',      label: 'Catálogo de Roteadores', icon: Router,        section: 'FERRAMENTAS' },
  { id: 'links',           label: 'Links Úteis',           icon: Globe,          section: 'FERRAMENTAS' },
  { id: 'planilhas',       label: 'Planilhas Essenciais',  icon: FileCheck,      section: 'FERRAMENTAS' },
];

export default function PainelGrowthTeam({ userData }) {
  const [activeView, setActiveView] = useState('hub');

  const renderContent = () => {
    switch (activeView) {
      case 'hub':             return <HubCrescimento userData={userData} />;
      case 'comunicados':     return <Comunicados userData={userData} />;
      case 'agenda':          return <AgendaSupervisor userData={userData} />;
      case 'patrocinio':      return <PatrocinioSupervisor userData={userData} />;
      case 'campanha':        return <SolicitarCampanha userData={userData} />;
      case 'roteadores':      return <CatalogoRoteadores userData={userData} />;
      case 'links':           return <LinksUteis userData={userData} />;
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
    >
      <Suspense fallback={<div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center' }}><Spinner size={32} /></div>}>
        {renderContent()}
      </Suspense>
    </LayoutGlobal>
  );
}