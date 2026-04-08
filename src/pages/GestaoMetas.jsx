import React, { useState } from 'react';
import { Target, Calendar, BarChart2, MapPin, ShieldAlert, Sliders, Briefcase, Users } from 'lucide-react';

import { styles as global, colors } from '../styles/globalStyles';

// IMPORTAÇÃO DAS ABAS (VIEWS)
import TabMetasCanais    from './tabs_metas/TabMetasCanais';
import TabMetasCidades   from './tabs_metas/TabMetasCidades';
import TabMetasIndividuais from './tabs_metas/TabMetasIndividuais';
import TabMetasChurn     from './tabs_metas/TabMetasChurn';
import TabSimuladorSOP   from './tabs_metas/TabSimuladorSOP';
import TabPlanoAcoes     from './tabs_metas/TabPlanoAcoes';

// MAPEAMENTO DE COMPONENTES
const TAB_CONTENT = {
  canais:     TabMetasCanais,
  cidades:    TabMetasCidades,
  individuais: TabMetasIndividuais,
  churn:      TabMetasChurn,
  simulador:  TabSimuladorSOP,
  planos:     TabPlanoAcoes,
};

// MAPEAMENTO DE TÍTULOS E ÍCONES PARA AS ABAS
const TABS_CONFIG = [
  { id: 'canais', label: '1. Metas Canais', icon: BarChart2 },
  { id: 'cidades', label: '2. Micro (Cidades)', icon: MapPin },
  { id: 'individuais', label: '3. Metas Individuais', icon: Users },
  { id: 'churn', label: '4. Churn e Alvo', icon: ShieldAlert },
  { id: 'simulador', label: '5. Simulador S&OP', icon: Sliders },
  { id: 'planos', label: '6. Plano de Ações', icon: Briefcase }
];

export default function GestaoMetas({ userData }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  });

  const [activeTab, setActiveTab] = useState('canais');

  // Verifica se é Coordenador ou Diretor
  const roleNorm  = String(userData?.role || '').toLowerCase().replace(/[\s_-]/g, '');
  const isMaster  = ['coordinator','coordenador','master','diretor','growthteam','growth_team','equipegrowth'].includes(roleNorm);

  const ActiveComponent = TAB_CONTENT[activeTab];

  return (
    <div style={{ ...global.container, maxWidth: '1400px' }}>
      
      {/* ── CABEÇALHO PADRÃO OQUEI STRATEGY ── */}
      <div style={local.headerWrapper}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ ...local.iconBox, background: `linear-gradient(135deg, ${colors.success}, ${colors.primary})`, boxShadow: `0 8px 20px ${colors.success}40` }}>
            <Target size={28} color="#fff" />
          </div>
          <div>
            <div style={local.headerTitle}>Planejamento e Metas</div>
            <div style={local.headerSubtitle}>
              Canais, cidades, churn, simulação e planos de ação · {new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>

        {/* Seletor de Mês Integrado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-app)', padding: '10px 16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
          <Calendar size={16} color="var(--text-muted)" />
          <input 
            type="month" 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)} 
            style={local.monthInputSmall}
          />
        </div>
      </div>

      {/* ── NAVEGAÇÃO POR ABAS (PILLS) ── */}
      <div style={local.navBar}>
        {TABS_CONFIG.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)} 
            style={activeTab === tab.id ? { ...local.navBtnActive, color: colors.primary, borderColor: colors.primary } : local.navBtn}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ── CONTEÚDO DINÂMICO ── */}
      <div className="animated-view" style={{ background: 'var(--bg-card)', padding: '30px', borderRadius: '24px', minHeight: '500px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', marginTop: '25px' }}>
        <ActiveComponent
          selectedMonth={selectedMonth}
          isMaster={isMaster}
          userData={userData}
        />
      </div>

      <style>{`
        @keyframes fadeInView { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animated-view { animation: fadeInView 0.3s ease forwards; }
      `}</style>
    </div>
  );
}

// --- ESTILOS LOCAIS PADRONIZADOS OQUEI STRATEGY ---
const local = {
  headerWrapper: {
    background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-panel) 100%)',
    border: '1px solid var(--border)', borderRadius: '24px',
    padding: '24px 32px', marginBottom: '25px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: '20px', boxShadow: 'var(--shadow-sm)',
  },
  iconBox: {
    width: '56px', height: '56px', borderRadius: '16px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.02em' },
  headerSubtitle: { fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '500' },

  monthInputSmall: { border: 'none', background: 'transparent', color: 'var(--text-main)', fontSize: '14px', fontWeight: '900', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' },

  navBar: { display: 'flex', gap: '8px', background: 'var(--bg-card)', padding: '8px', borderRadius: '18px', border: '1px solid var(--border)', overflowX: 'auto', whiteSpace: 'nowrap' },
  navBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: '1px solid transparent', cursor: 'pointer', fontSize: '13px', fontWeight: '800', transition: '0.2s', background: 'transparent', color: 'var(--text-muted)' },
  navBtnActive: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '13px', fontWeight: '900', transition: '0.2s', background: 'var(--bg-panel)', boxShadow: 'var(--shadow-sm)' },
};
