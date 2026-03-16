import React, { useEffect, useMemo, useState } from 'react';
import { Page, Card, Select, Input, Tabs, InfoBox } from '../components/ui';
import OverviewPage from './pages/OverviewPage';
import KanbanPage from './pages/KanbanPage';
import MinhaMesaPage from './pages/MinhaMesaPage';
import MeetingsPage from './pages/MeetingsPage';
import DashboardGrowth from './pages/DashboardGrowth';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import './styles/hubStyles.css';

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
      const conditions = isCoordinator ? [] : [where('clusterId', '==', myCluster)];
      const q = query(collection(db, 'cities'), ...conditions);
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => String(a.name || a.nome || '').localeCompare(String(b.name || b.nome || '')));
      setCities(list);

      if (list.length > 0) {
        if (userData?.cityId && list.find((c) => c.id === userData.cityId)) {
          setSelectedCityId(userData.cityId);
        } else if (!selectedCityId) {
          setSelectedCityId(list[0].id);
        }
      }
    };
    load();
  }, [userData, isCoordinator, selectedCityId]);

  useEffect(() => {
    if (isGrowthTeam) setActiveTab('Minha Mesa');
  }, [isGrowthTeam]);

  useEffect(() => {
    if (selectedGrowthPlan) {
      if (selectedCityId && selectedGrowthPlan.cityId && selectedGrowthPlan.cityId !== selectedCityId) {
        setSelectedGrowthPlan(null);
      }
      if (selectedMonth && selectedGrowthPlan.month && selectedGrowthPlan.month !== selectedMonth) {
        setSelectedGrowthPlan(null);
      }
    }
  }, [selectedCityId, selectedMonth, selectedGrowthPlan]);

  const cityOptions = useMemo(() => {
    if (isCoordinator) {
      return [{ value: '__all__', label: 'Todas as cidades' }, ...cities.map((c) => ({ value: c.id, label: c.name || c.nome }))];
    }
    return cities.map((c) => ({ value: c.id, label: c.name || c.nome }));
  }, [cities, isCoordinator]);

  return (
    <Page
      title="Hub de Crescimento"
      subtitle="Planejamento estrategico e execucao com baixo atrito"
    >
      <Card>
        <div className="hub-toolbar">
          <div style={{ minWidth: '240px' }}>
            <Select
              label="Cidade"
              value={selectedCityId}
              onChange={(e) => setSelectedCityId(e.target.value)}
              options={cityOptions}
              disabled={!isCoordinator && !!userData?.cityId}
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

      {!isGrowthTeam && selectedGrowthPlan && (
        <InfoBox type="info">Plano geral atual: {selectedGrowthPlan.name}</InfoBox>
      )}

      {isGrowthTeam && (
        <InfoBox type="info">
          Seu perfil possui acesso apenas a Minha Mesa (RN02).
        </InfoBox>
      )}

      {!isGrowthTeam && (
        <Tabs tabs={TAB_LABELS} active={activeTab} onChange={setActiveTab} />
      )}

      <div className="hub-content">
        {isGrowthTeam && <MinhaMesaPage userData={userData} selectedCityId={selectedCityId} />}

        {!isGrowthTeam && activeTab === 'Visao Geral' && (
          <OverviewPage
            userData={userData}
            selectedCityId={selectedCityId}
            selectedMonth={selectedMonth}
            selectedGrowthPlan={selectedGrowthPlan}
            onSelectPlan={(p) => { if (p) { setSelectedGrowthPlan(p); setActiveTab('Kanban'); } }}
            onClearPlan={() => setSelectedGrowthPlan(null)}
          />
        )}

      {!isGrowthTeam && ['Kanban', 'Reunioes', 'Dashboard'].includes(activeTab) && !selectedGrowthPlan && (
        <InfoBox type="warning">Selecione um plano geral na Visao Geral.</InfoBox>
      )}

      {!isGrowthTeam && activeTab === 'Kanban' && selectedGrowthPlan && (
        <KanbanPage
          userData={userData}
          selectedCityId={selectedCityId}
          selectedMonth={selectedMonth}
          selectedGrowthPlan={selectedGrowthPlan}
        />
      )}
      {!isGrowthTeam && activeTab === 'Minha Mesa' && (
        <MinhaMesaPage userData={userData} selectedCityId={selectedCityId} />
      )}
      {!isGrowthTeam && activeTab === 'Reunioes' && selectedGrowthPlan && (
        <MeetingsPage
          userData={userData}
          selectedCityId={selectedCityId}
          selectedMonth={selectedMonth}
          selectedGrowthPlan={selectedGrowthPlan}
        />
      )}
      {!isGrowthTeam && activeTab === 'Dashboard' && selectedGrowthPlan && (
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
