import React, { lazy, Suspense, useState } from 'react';
import { BarChart3, ClipboardList, PieChart, Radar, ShieldCheck, Target } from 'lucide-react';
import { Spinner, colors } from '../components/ui';
import { styles as global } from '../styles/globalStyles';

const ResearcherPanel = lazy(() => import('./pages/ResearcherPanel'));
const SurveyBuilder = lazy(() => import('./pages/SurveyBuilder'));
const AuditoriaPesquisas = lazy(() => import('./pages/Auditoriapesquisas'));
const PlanoAcao = lazy(() => import('./pages/PlanoAcao'));
const AnaliseResultados = lazy(() => import('./pages/Analiseresultados'));
const MonitorAoVivo = lazy(() => import('./pages/MonitorAoVivo'));
import InsightsDashboard from './pages/InsightsDashboard';

const Loading = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
    <Spinner size={28} />
  </div>
);

const TAB_SUPERVISOR = [
  { id: 'builder', label: 'Criador de Pesquisas', icon: ClipboardList, color: colors.primary },
  { id: 'live', label: 'Central Ao Vivo', icon: Radar, color: colors.emerald },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, color: colors.danger },
  { id: 'auditoria', label: 'Auditoria', icon: ShieldCheck, color: colors.purple },
  { id: 'plano', label: 'Plano de Acao', icon: Target, color: colors.success },
  { id: 'analise', label: 'Analise dos Resultados', icon: PieChart, color: colors.info },
];

const TAB_ANALYST = [
  { id: 'live', label: 'Central Ao Vivo', icon: Radar, color: colors.emerald },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, color: colors.danger },
  { id: 'builder', label: 'Criador de Pesquisas', icon: ClipboardList, color: colors.primary },
  { id: 'auditoria', label: 'Auditoria', icon: ShieldCheck, color: colors.purple },
  { id: 'plano', label: 'Plano de Acao', icon: Target, color: colors.success },
  { id: 'analise', label: 'Analise dos Resultados', icon: PieChart, color: colors.info },
];

function InsightsTabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '3px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '12px', padding: '4px', width: 'fit-content', flexWrap: 'wrap' }}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '9px',
              cursor: 'pointer',
              fontWeight: '800',
              fontSize: '12px',
              background: selected ? 'var(--bg-card)' : 'transparent',
              color: selected ? tab.color : 'var(--text-muted)',
              boxShadow: selected ? 'var(--shadow-sm)' : 'none',
              border: selected ? '1px solid var(--border)' : '1px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            <Icon size={13} /> {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default function OqueiInsights({ userData }) {
  const role = String(userData?.role || '').toLowerCase().replace(/[\s_-]/g, '');
  const isResearcher = role === 'researcher';
  const isCoordinator = role.includes('coordinator') || role.includes('coordenador') || role === 'master';
  const isGrowth = role.includes('growth');

  const tabs = (isCoordinator || isGrowth) ? TAB_ANALYST : TAB_SUPERVISOR;
  const [active, setActive] = useState(tabs[0].id);

  const [aiState, setAiState] = useState({
    mapMode: 'normal',
    aiScores: {},
    aiLog: [],
    aiSurveySnap: null,
  });

  if (isResearcher) {
    return (
      <Suspense fallback={<Loading />}>
        <ResearcherPanel userData={userData} />
      </Suspense>
    );
  }

  return (
    <div style={{ ...global.container }}>
      <InsightsTabs tabs={tabs} active={active} onChange={setActive} />

      <Suspense fallback={<Loading />}>
        {active === 'builder' && <SurveyBuilder userData={userData} />}
        {active === 'live' && <MonitorAoVivo userData={userData} />}
        {active === 'auditoria' && <AuditoriaPesquisas userData={userData} />}
        {active === 'plano' && <PlanoAcao userData={userData} />}
        {active === 'analise' && <AnaliseResultados userData={userData} />}

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
