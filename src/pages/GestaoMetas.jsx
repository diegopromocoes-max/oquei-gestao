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
  const isMaster = userData?.role === 'coordinator' || userData?.role === 'coordenador' || userData?.role === 'diretor' || userData?.role === 'master';

  const ActiveComponent = TAB_CONTENT[activeTab];

  return (
    <Page
      title="Planejamento e Metas"
      subtitle="Planejamento 360º: Canais de Venda, Distribuição por Cidades, Churn, Simulação e Planos de Ação."
      actions={
        <div style={{ ...styles.row, gap: '8px' }}>
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