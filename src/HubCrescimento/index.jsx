import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { 
  Zap, Eye, Trello, User, CalendarDays, PieChart, MapPin, Calendar
} from 'lucide-react';

import { styles as global, colors } from '../styles/globalStyles';
import { InfoBox } from '../components/ui';

// IMPORTAÇÃO DAS PÁGINAS (VIEWS)
import OverviewPage from './pages/OverviewPage';
import KanbanPage from './pages/KanbanPage';
import MinhaMesaPage from './pages/MinhaMesaPage';
import MeetingsPage from './pages/MeetingsPage';
import DashboardGrowth from './pages/DashboardGrowth';

// CONFIGURAÇÃO DAS ABAS PADRONIZADAS
const TABS_CONFIG = [
  { id: 'Visao Geral', label: 'Visão Geral', icon: Eye },
  { id: 'Kanban', label: 'Quadro Kanban', icon: Trello },
  { id: 'Minha Mesa', label: 'Minha Mesa', icon: User },
  { id: 'Reunioes', label: 'Reuniões', icon: CalendarDays },
  { id: 'Dashboard', label: 'Dashboard', icon: PieChart }
];

const isCoordinatorRole = (role) => {
  const r = String(role || '').toLowerCase();
  return r === 'coordinator' || r === 'coordenador' || r === 'master';
};

const isGrowthTeamRole = (role) => {
  const r = String(role || '').toLowerCase();
  return r === 'growth_team' || r === 'growth team' || r === 'equipe_growth';
};

export default function HubCrescimento({ userData }) {
  const [cities, setCities] = useState([]);
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [activeTab, setActiveTab] = useState('Visao Geral');
  const [selectedGrowthPlan, setSelectedGrowthPlan] = useState(null);

  const isGrowthTeam = isGrowthTeamRole(userData?.role);
  const isCoordinator = isCoordinatorRole(userData?.role);

  useEffect(() => {
    const load = async () => {
      const myCluster = String(userData?.clusterId || '').trim();
      
      // Coordenadores e Equipa de Growth têm visão global de cidades
      const conditions = (isCoordinator || isGrowthTeam) ? [] : [where('clusterId', '==', myCluster)];
      
      const q = query(collection(db, 'cities'), ...conditions);
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => String(a.name || a.nome || '').localeCompare(String(b.name || b.nome || '')));
      setCities(list);

      if (list.length > 0) {
        setSelectedCityId((prev) => {
          if (prev) return prev; 
          if (userData?.cityId && userData.cityId !== 'global' && list.find((c) => c.id === userData.cityId)) {
            return userData.cityId;
          }
          return (isCoordinator || isGrowthTeam) ? '__all__' : list[0].id;
        });
      }
    };
    
    if (userData) load();
  }, [userData, isCoordinator, isGrowthTeam]); 

  // Ao mudar a cidade ou mês, limpa o plano selecionado se não for correspondente
  useEffect(() => {
    if (selectedGrowthPlan) {
      if (selectedCityId && selectedCityId !== '__all__' && selectedGrowthPlan.cityId && selectedGrowthPlan.cityId !== selectedCityId) {
        setSelectedGrowthPlan(null);
      }
      if (selectedMonth && selectedGrowthPlan.month && selectedGrowthPlan.month !== selectedMonth) {
        setSelectedGrowthPlan(null);
      }
    }
  }, [selectedCityId, selectedMonth, selectedGrowthPlan]);

  const cityOptions = useMemo(() => {
    if (isCoordinator || isGrowthTeam) {
      return [{ value: '__all__', label: 'Todas as cidades' }, ...cities.map((c) => ({ value: c.id, label: c.name || c.nome }))];
    }
    return cities.map((c) => ({ value: c.id, label: c.name || c.nome }));
  }, [cities, isCoordinator, isGrowthTeam]);

  return (
    <div style={{ ...global.container, maxWidth: '1400px' }}>
      
      {/* ── CABEÇALHO PADRÃO OQUEI STRATEGY ── */}
      <div style={local.headerWrapper}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ ...local.iconBox, background: `linear-gradient(135deg, ${colors.primary}, #0ea5e9)`, boxShadow: `0 8px 20px ${colors.primary}40` }}>
            <Zap size={28} color="#fff" />
          </div>
          <div>
            <div style={local.headerTitle}>Hub de Crescimento</div>
            <div style={local.headerSubtitle}>
              Planejamento estratégico e execução · {new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>

        {/* ── CONTROLOS INTEGRADOS NO CABEÇALHO ── */}
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          
          {/* Seletor de Cidade */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-app)', padding: '10px 16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <MapPin size={16} color="var(--text-muted)" />
            <select 
              value={selectedCityId} 
              onChange={(e) => setSelectedCityId(e.target.value)} 
              disabled={(!isCoordinator && !isGrowthTeam) && !!userData?.cityId}
              style={local.selectControl}
            >
              {cityOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          {/* Seletor de Mês */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-app)', padding: '10px 16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <Calendar size={16} color="var(--text-muted)" />
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)} 
              style={local.inputControl}
            />
          </div>

        </div>
      </div>

      {/* AVISOS GERAIS */}
      {selectedGrowthPlan && (
        <div style={{ marginBottom: '20px' }}>
          <InfoBox type="info">Plano geral atual: <strong>{selectedGrowthPlan.name}</strong></InfoBox>
        </div>
      )}

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
        
        {activeTab === 'Visao Geral' && (
          <OverviewPage
            userData={userData}
            selectedCityId={selectedCityId}
            selectedMonth={selectedMonth}
            selectedGrowthPlan={selectedGrowthPlan}
            onSelectPlan={(p) => { if (p) { setSelectedGrowthPlan(p); setActiveTab('Kanban'); } }}
            onClearPlan={() => setSelectedGrowthPlan(null)}
          />
        )}

        {['Kanban', 'Reunioes', 'Dashboard'].includes(activeTab) && !selectedGrowthPlan && (
          <InfoBox type="warning">Selecione um plano geral na aba "Visão Geral" para liberar esta visualização.</InfoBox>
        )}

        {activeTab === 'Kanban' && selectedGrowthPlan && (
          <KanbanPage
            userData={userData}
            selectedCityId={selectedCityId}
            selectedMonth={selectedMonth}
            selectedGrowthPlan={selectedGrowthPlan}
          />
        )}
        
        {activeTab === 'Minha Mesa' && (
          <MinhaMesaPage userData={userData} selectedCityId={selectedCityId} />
        )}
        
        {activeTab === 'Reunioes' && selectedGrowthPlan && (
          <MeetingsPage
            userData={userData}
            selectedCityId={selectedCityId}
            selectedMonth={selectedMonth}
            selectedGrowthPlan={selectedGrowthPlan}
          />
        )}
        
        {activeTab === 'Dashboard' && selectedGrowthPlan && (
          <DashboardGrowth
            selectedCityId={selectedCityId}
            selectedMonth={selectedMonth}
            selectedGrowthPlan={selectedGrowthPlan}
          />
        )}

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

  selectControl: { border: 'none', background: 'transparent', color: 'var(--text-main)', fontSize: '14px', fontWeight: '800', outline: 'none', cursor: 'pointer', maxWidth: '200px' },
  inputControl: { border: 'none', background: 'transparent', color: 'var(--text-main)', fontSize: '14px', fontWeight: '900', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' },

  navBar: { display: 'flex', gap: '8px', background: 'var(--bg-card)', padding: '8px', borderRadius: '18px', border: '1px solid var(--border)', overflowX: 'auto', whiteSpace: 'nowrap' },
  navBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: '1px solid transparent', cursor: 'pointer', fontSize: '13px', fontWeight: '800', transition: '0.2s', background: 'transparent', color: 'var(--text-muted)' },
  navBtnActive: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '13px', fontWeight: '900', transition: '0.2s', background: 'var(--bg-panel)', boxShadow: 'var(--shadow-sm)' },
};