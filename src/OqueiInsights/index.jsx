// ============================================================
//  OqueiInsights/index.jsx — Entry point do módulo
//  Roteamento interno por role:
//    researcher  → ResearcherPanel (mobile-first, sem LayoutGlobal)
//    supervisor  → SurveyBuilder + MonitorPanel
//    coordinator/growth → InsightsDashboard + SurveyBuilder
// ============================================================
import React, { lazy, Suspense, useState, useRef } from 'react';
import { ClipboardList, BarChart3, Telescope, Monitor, ShieldCheck, Target, PieChart } from 'lucide-react';
import { Spinner, colors } from '../components/ui';
import { styles as global } from '../styles/globalStyles';

const ResearcherPanel  = lazy(() => import('./pages/ResearcherPanel'));
const SurveyBuilder    = lazy(() => import('./pages/SurveyBuilder'));
import InsightsDashboard from './pages/InsightsDashboard';
const AuditoriaPesquisas = lazy(() => import('./pages/AuditoriaPesquisas'));
const AnaliseResultados  = lazy(() => import('./pages/AnaliseResultados'));

const Loading = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
    <Spinner size={28}/>
  </div>
);

// ── Tabs internas do módulo ───────────────────────────────────
const TAB_SUPERVISOR = [
  { id:'builder',   label:'Criador de Pesquisas', icon: ClipboardList, color: colors.primary },
  { id:'dashboard', label:'Dashboard',             icon: BarChart3,     color: colors.danger  },
  { id:'auditoria', label:'Auditoria',             icon: ShieldCheck,   color: colors.purple  },
  { id:'plano',     label:'Plano de Ação',         icon: Target,        color: colors.success },
  { id:'analise',   label:'Análise dos Resultados', icon: PieChart,      color: colors.info    },
];
const TAB_ANALYST = [
  { id:'dashboard', label:'Dashboard',             icon: BarChart3,     color: colors.danger  },
  { id:'builder',   label:'Criador de Pesquisas',  icon: ClipboardList, color: colors.primary },
  { id:'auditoria', label:'Auditoria',             icon: ShieldCheck,   color: colors.purple  },
  { id:'plano',     label:'Plano de Ação',         icon: Target,        color: colors.success },
  { id:'analise',   label:'Análise dos Resultados', icon: PieChart,      color: colors.info    },
];

function InsightsTabs({ tabs, active, onChange }) {
  return (
    <div style={{ display:'flex', gap:'3px', background:'var(--bg-panel)', border:'1px solid var(--border)', borderRadius:'12px', padding:'4px', width:'fit-content' }}>
      {tabs.map(t => {
        const Icon = t.icon;
        const sel  = active === t.id;
        return (
          <button key={t.id} onClick={() => onChange(t.id)}
            style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 16px', borderRadius:'9px', border:'none', cursor:'pointer', fontWeight:'800', fontSize:'12px', background: sel ? 'var(--bg-card)' : 'transparent', color: sel ? t.color : 'var(--text-muted)', boxShadow: sel ? 'var(--shadow-sm)' : 'none', border: sel ? '1px solid var(--border)' : '1px solid transparent', transition:'all 0.15s' }}>
            <Icon size={13}/> {t.label}
          </button>
        );
      })}
    </div>
  );
}

export default function OqueiInsights({ userData }) {
  const role     = String(userData?.role||'').toLowerCase().replace(/[\s_-]/g,'');
  const isResearcher  = role === 'researcher';
  const isSupervisor  = role === 'supervisor';
  const isCoordinator = role.includes('coordinator') || role.includes('coordenador') || role === 'master';
  const isGrowth      = role.includes('growth');

  const tabs    = (isCoordinator || isGrowth) ? TAB_ANALYST : TAB_SUPERVISOR;
  const [active, setActive] = useState(tabs[0].id);

  // Estado da IA persistido aqui — sobrevive à troca de abas
  const [aiState, setAiState] = useState({
    mapMode:      'normal',
    aiScores:     {},
    aiLog:        [],
    aiSurveySnap: null,
  });

  // Pesquisador: interface mobile direta, sem LayoutGlobal
  if (isResearcher) {
    return (
      <Suspense fallback={<Loading/>}>
        <ResearcherPanel userData={userData}/>
      </Suspense>
    );
  }

  return (
    <div style={{ ...global.container }}>
      {/* Seletor de sub-módulo */}
      <InsightsTabs tabs={tabs} active={active} onChange={setActive}/>

      <Suspense fallback={<Loading/>}>
        {/* SurveyBuilder e Auditoria desmontam normalmente */}
        {active === 'builder'   && <SurveyBuilder    userData={userData}/>}
        {active === 'auditoria' && <AuditoriaPesquisas userData={userData}/>}
        {active === 'plano'     && <PlanoAcao          userData={userData}/>}
        {active === 'analise'   && <AnaliseResultados  userData={userData}/>}

        {/* Dashboard fica sempre montado para preservar estado da IA —
            apenas oculto via CSS quando outra aba está ativa */}
        <div style={{ display: active === 'dashboard' ? 'block' : 'none' }}>
          <InsightsDashboard
            userData={userData}
            aiState={aiState}
            setAiState={setAiState}
          />
        </div>
      </Suspense>
    </div>
  );
}