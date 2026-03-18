import React, { useEffect, useMemo, useState } from 'react';
import { Page, Card, Select, Input, Tabs, InfoBox } from '../components/ui';
import OverviewPage from './pages/OverviewPage';
import KanbanPage from './pages/KanbanPage';
import MinhaMesaPage from './pages/MinhaMesaPage';
import MeetingsPage from './pages/MeetingsPage';
import DashboardGrowth from './pages/DashboardGrowth';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Zap } from 'lucide-react';
import { hubStyles } from "./styles/hubStyles";

const TAB_LABELS = ['Visao Geral', 'Kanban', 'Minha Mesa', 'Reunioes', 'Dashboard'];

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
  const [activeTab, setActiveTab] = useState(TAB_LABELS[0]);
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
    // Equipe de Growth e Coordenadores podem ver "Todas as cidades"
    if (isCoordinator || isGrowthTeam) {
      return [{ value: '__all__', label: 'Todas as cidades' }, ...cities.map((c) => ({ value: c.id, label: c.name || c.nome }))];
    }
    return cities.map((c) => ({ value: c.id, label: c.name || c.nome }));
  }, [cities, isCoordinator, isGrowthTeam]);

  return (
    <Page
      title="Hub de Crescimento"
      subtitle="Planejamento estratégico e execução"
    >

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
            background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 18px rgba(37,99,235,0.35)',
          }}>
            <Zap size={26} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Hub de Crescimento
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px', fontWeight: '500' }}>
              Planejamento estratégico e execução com baixo atrito · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
        
      </div>
      <Card>
        <div style={hubStyles.toolbar}>
          <div style={{ minWidth: '240px' }}>
            <Select
              label="Cidade"
              value={selectedCityId}
              onChange={(e) => setSelectedCityId(e.target.value)}
              options={cityOptions}
              // Bloqueia a troca apenas se for atendente comum preso a uma cidade
              disabled={(!isCoordinator && !isGrowthTeam) && !!userData?.cityId}
            />
          </div>
          <div style={{ minWidth: '180px' }}>
            <Input
              type="month"
              label="Mes"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Mostra qual o plano selecionado para todos os perfis */}
      {selectedGrowthPlan && (
        <InfoBox type="info">Plano geral atual: {selectedGrowthPlan.name}</InfoBox>
      )}

      {/* Agora as Tabs são exibidas para toda a equipa */}
      <Tabs tabs={TAB_LABELS} active={activeTab} onChange={setActiveTab} />

      <div style={hubStyles.content}>
        
        {/* Visão Geral acessível a todos */}
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

        {/* Aviso de que precisa de selecionar um plano antes de ver as restantes abas */}
        {['Kanban', 'Reunioes', 'Dashboard'].includes(activeTab) && !selectedGrowthPlan && (
          <InfoBox type="warning">Selecione um plano geral na Visao Geral.</InfoBox>
        )}

        {/* As abas agora não têm o bloqueio de !isGrowthTeam */}
        {activeTab === 'Kanban' && selectedGrowthPlan && (
          <KanbanPage
            userData={userData}
            selectedCityId={selectedCityId}
            selectedMonth={selectedMonth}
            selectedGrowthPlan={selectedGrowthPlan}
          />
        )}
        
        {/* Minha Mesa acessível a todos (já estava) */}
        {activeTab === 'Minha Mesa' && (
          <MinhaMesaPage userData={userData} selectedCityId={selectedCityId} />
        )}
        
        {/* Reuniões acessível a todos */}
        {activeTab === 'Reunioes' && selectedGrowthPlan && (
          <MeetingsPage
            userData={userData}
            selectedCityId={selectedCityId}
            selectedMonth={selectedMonth}
            selectedGrowthPlan={selectedGrowthPlan}
          />
        )}
        
        {/* Dashboard acessível a todos */}
        {activeTab === 'Dashboard' && selectedGrowthPlan && (
          <DashboardGrowth
            selectedCityId={selectedCityId}
            selectedMonth={selectedMonth}
            selectedGrowthPlan={selectedGrowthPlan}
          />
        )}
      </div>
    </Page>
  );
}