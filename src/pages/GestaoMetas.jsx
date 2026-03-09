import React, { useState } from 'react';
import { Target, Calendar, BarChart3, Building2, TrendingDown } from 'lucide-react';
import { colors } from '../styles/globalStyles';

// Importação das nossas novas abas modulares
import TabMetasCanais from './tabs_metas/TabMetasCanais';
import TabMetasCidades from './tabs_metas/TabMetasCidades';
import TabMetasChurn from './tabs_metas/TabMetasChurn';

export default function GestaoMetas({ userData }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [activeTab, setActiveTab] = useState('canais'); 
  const isMaster = String(userData?.role).toLowerCase().includes('coord');

  return (
    <div className="animated-view" style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* CABEÇALHO MASTER */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>
            <Target color={colors?.success || '#10b981'} size={28} />
            Gestão Estratégica de Metas (Net Adds)
          </h2>
          <p style={styles.subtitle}>Planejamento 360º: Canais de Venda, Distribuição por Cidades e Churn.</p>
        </div>

        <div style={styles.headerActions}>
          <div style={styles.monthSelector}>
            <Calendar size={18} color="var(--text-muted)" />
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)} 
              style={styles.monthInput}
            />
          </div>
        </div>
      </div>

      {/* NAVEGAÇÃO DAS ABAS */}
      <div style={styles.tabsContainer}>
        <button 
          onClick={() => setActiveTab('canais')} 
          style={activeTab === 'canais' ? {...styles.activeTab, color: '#3b82f6', borderBottomColor: '#3b82f6'} : styles.tab}
        >
          <BarChart3 size={16} style={{marginRight: '6px'}} /> 1. Metas Canais de Venda
        </button>
        <button 
          onClick={() => setActiveTab('cidades')} 
          style={activeTab === 'cidades' ? {...styles.activeTab, color: '#8b5cf6', borderBottomColor: '#8b5cf6'} : styles.tab}
        >
          <Building2 size={16} style={{marginRight: '6px'}} /> 2. Micro (Cidades e Produtos)
        </button>
        <button 
          onClick={() => setActiveTab('churn')} 
          style={activeTab === 'churn' ? {...styles.activeTab, color: '#ef4444', borderBottomColor: '#ef4444'} : styles.tab}
        >
          <TrendingDown size={16} style={{marginRight: '6px'}} /> 3. Churn e Crescimento Alvo
        </button>
      </div>

      {/* RENDERIZAÇÃO CONDICIONAL DAS ABAS */}
      <div style={styles.tabContent}>
        {activeTab === 'canais' && <TabMetasCanais selectedMonth={selectedMonth} isMaster={isMaster} userData={userData} />}
        {activeTab === 'cidades' && <TabMetasCidades selectedMonth={selectedMonth} isMaster={isMaster} userData={userData} />}
        {activeTab === 'churn' && <TabMetasChurn selectedMonth={selectedMonth} isMaster={isMaster} userData={userData} />}
      </div>

      <style>{`
        @keyframes fadeInView { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animated-view { animation: fadeInView 0.3s ease forwards; }
      `}</style>
    </div>
  );
}

const styles = {
  header: { marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' },
  title: { fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' },
  subtitle: { fontSize: '14px', color: 'var(--text-muted)', margin: '5px 0 0 0' },
  headerActions: { display: 'flex', gap: '15px', alignItems: 'center' },
  monthSelector: { display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-card)', padding: '10px 15px', borderRadius: '12px', border: '1px solid var(--border)' },
  monthInput: { border: 'none', background: 'transparent', outline: 'none', fontSize: '15px', fontWeight: 'bold', color: 'var(--text-main)', cursor: 'pointer' },
  
  tabsContainer: { display: 'flex', gap: '20px', borderBottom: '2px solid var(--border)', marginBottom: '25px', overflowX: 'auto' },
  tab: { display: 'flex', alignItems: 'center', background: 'none', border: 'none', borderBottom: '3px solid transparent', padding: '12px 5px', fontSize: '15px', fontWeight: '700', color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', marginBottom: '-2px' },
  activeTab: { display: 'flex', alignItems: 'center', background: 'none', border: 'none', borderBottom: '3px solid', padding: '12px 5px', fontSize: '15px', fontWeight: '900', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', marginBottom: '-2px' },
  
  tabContent: { minHeight: '400px' }
};