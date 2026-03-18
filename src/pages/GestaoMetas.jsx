import { useState } from 'react';
import { Target, Calendar } from 'lucide-react';

import {
  Page, Card, Tabs,
  styles, colors,
} from '../components/ui';

import TabMetasCanais    from './tabs_metas/TabMetasCanais';
import TabMetasCidades   from './tabs_metas/TabMetasCidades';
import TabMetasChurn     from './tabs_metas/TabMetasChurn';
import TabSimuladorSOP   from './tabs_metas/TabSimuladorSOP';
// ✅ NOVA ABA IMPORTADA
import TabPlanoAcoes     from './tabs_metas/TabPlanoAcoes';

// Mapa de aba → componente
const TAB_CONTENT = {
  canais:     TabMetasCanais,
  cidades:    TabMetasCidades,
  churn:      TabMetasChurn,
  simulador:  TabSimuladorSOP,
  planos:     TabPlanoAcoes, // ✅ ADICIONADO AQUI
};

const TAB_LABELS = ['canais', 'cidades', 'churn', 'simulador', 'planos']; // ✅ ADICIONADO AQUI

const TAB_DISPLAY = {
  canais:    '1. Metas Canais',
  cidades:   '2. Micro (Cidades)',
  churn:     '3. Churn e Alvo',
  simulador: '4. Simulador S&OP',
  planos:    '5. Plano de Ações', // ✅ NOME DE EXIBIÇÃO
};

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
    <Page
      title="Planejamento e Metas"
      subtitle="Planejamento 360º: Canais de Venda, Distribuição por Cidades, Churn, Simulação e Planos de Ação."
      actions={
        <div style={{ ...styles.row, gap: '8px' }}>

      {/* ── Cabeçalho padrão Oquei Gestão ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-panel) 100%)',
        border: '1px solid var(--border)', borderRadius: '20px',
        padding: '24px 32px', marginBottom: '24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '16px', boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
            background: 'linear-gradient(135deg, #10B981, #2563EB)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 18px rgba(16,185,129,0.35)',
          }}>
            <Target size={26} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Planejamento e Metas
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px', fontWeight: '500' }}>
              Canais, cidades, churn, simulação e planos de ação · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
        
      </div>
          <Calendar size={16} color="var(--text-muted)" />
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '9px',
              border: '1px solid var(--border)',
              background: 'var(--bg-input, var(--bg-app))',
              color: 'var(--text-main)',
              fontSize: '14px',
              fontFamily: 'inherit',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
        </div>
      }
    >

      <Tabs
        tabs={TAB_LABELS.map(id => TAB_DISPLAY[id])}
        active={TAB_DISPLAY[activeTab]}
        onChange={label => {
          const id = Object.keys(TAB_DISPLAY).find(k => TAB_DISPLAY[k] === label);
          if (id) setActiveTab(id);
        }}
      />

      <Card style={{ padding: '30px' }}>
        <ActiveComponent
          selectedMonth={selectedMonth}
          isMaster={isMaster}
          userData={userData}
        />
      </Card>

    </Page>
  );
}