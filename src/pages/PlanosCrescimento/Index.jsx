import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

import { db } from '../../firebase';
import { Btn, Card, Input, Page, Select, Tabs, colors } from '../../components/ui';
import { assinarResponsaveis, listenActionPlans } from '../../services/acoes';

// Importa Constantes
import { ALL_CITIES, TAB_LABELS, BASE_OBJECTIVES, getInitialForm } from './constants';

// Importa Componentes Separados
import GrowthDashboard from './GrowthDashboard';
import ActionCreator from './ActionCreator';
import ActionTracker from './ActionTracker';
import ActionFinished from './ActionFinished';
import ModalEtapas from './ModalEtapas';
import ModalAuditoria from './ModalAuditoria'; 

export default function PlanosCrescimento({ userData }) {
  const [cities, setCities] = useState([]);
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [plans, setPlans] = useState([]);
  const [activeTab, setActiveTab] = useState(TAB_LABELS[0]);
  const [responsibles, setResponsibles] = useState([]);
  
  // NOVO: Estado para armazenar as bases do mês
  const [monthlyBases, setMonthlyBases] = useState({});

  const [currentId, setCurrentId] = useState(null);
  const [form, setForm] = useState(getInitialForm());
  const [stepsModalOpen, setStepsModalOpen] = useState(false);
  const [stepsPlan, setStepsPlan] = useState(null);
  
  const [auditPlan, setAuditPlan] = useState(null);

  useEffect(() => {
    const isCoord = userData?.role === 'coordinator' || userData?.role === 'coordenador' || userData?.role === 'master';
    const myCluster = String(userData?.clusterId || '').trim();
    const citiesRef = isCoord ? collection(db, 'cities') : query(collection(db, 'cities'), where('clusterId', '==', myCluster));

    const unsub = onSnapshot(citiesRef, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => a.name.localeCompare(b.name));
      setCities(list);
      if (list.length > 0 && !selectedCityId) setSelectedCityId(list[0].id);
    });
    return () => unsub();
  }, [userData]);

  useEffect(() => {
    const unsub = assinarResponsaveis(setResponsibles);
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const unsub = listenActionPlans(selectedMonth, selectedCityId, setPlans);
    return () => unsub && unsub();
  }, [selectedCityId, selectedMonth]);

  // NOVO: Efeito para buscar as bases do mês na coleção monthly_bases
  useEffect(() => {
    if (!selectedMonth) return;
    const q = query(collection(db, "monthly_bases"), where("month", "==", selectedMonth));
    const unsub = onSnapshot(q, snap => {
      const bases = {};
      snap.docs.forEach(doc => {
        const data = doc.data();
        bases[data.cityId] = Number(data.baseStart || 0); // Puxa o baseStart!
      });
      setMonthlyBases(bases);
    });
    return () => unsub();
  }, [selectedMonth]);


  const cityMap = useMemo(() => Object.fromEntries(cities.map(c => [c.id, c.name])), [cities]);
  const sectorOptions = useMemo(() => Array.from(new Set(responsibles.map(r => r.sector))).sort(), [responsibles]);
  
  // CORRIGIDO: Calcula a Base Inicial (D-0) usando os dados do S&OP (monthly_bases)
  const baseD0 = useMemo(() => {
    if (selectedCityId === ALL_CITIES) {
       // Se for "Todas as Cidades", soma o baseStart de todas as cidades filtradas para o usuário
       return cities.reduce((acc, c) => acc + (monthlyBases[c.id] || 0), 0);
    }
    // Se for uma cidade específica, pega o baseStart dela no mês selecionado
    return monthlyBases[selectedCityId] || 0;
  }, [selectedCityId, cities, monthlyBases]);

  const learnedObjectives = useMemo(() => {
    const dynamic = new Set(BASE_OBJECTIVES);
    plans.forEach(p => { if (Array.isArray(p.objectives)) p.objectives.forEach(o => dynamic.add(o)); });
    return Array.from(dynamic).sort();
  }, [plans]);

  const resetForm = () => { setCurrentId(null); setForm(getInitialForm()); };
  
  const startEdit = (plan) => {
    setActiveTab(TAB_LABELS[1]);
    setCurrentId(plan.id);
    setForm({ ...getInitialForm(), ...plan, objectives: Array.isArray(plan.objectives) ? plan.objectives : (plan.objective ? [plan.objective] : []) });
  };

  return (
    <Page 
      title="Growth & Estratégia de Praças" 
      subtitle="Integração de setores para expansão de base, controle de churn e ações de mercado."
      actions={<Btn onClick={() => { setActiveTab(TAB_LABELS[1]); resetForm(); }}><Plus size={16}/> Planejar Nova Ação</Btn>}
    >
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <MapPin size={20} color={colors.primary} />
            <div style={{ width: '250px' }}>
              <Select value={selectedCityId} onChange={e => setSelectedCityId(e.target.value)} options={[{ value: ALL_CITIES, label: 'Visão Global (Todas as Praças)' }, ...cities.map(c => ({ value: c.id, label: c.name }))]} />
            </div>
          </div>
          <div style={{ width: '200px' }}>
            <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
          </div>
        </div>
      </Card>

      <Tabs tabs={TAB_LABELS} active={activeTab} onChange={setActiveTab} />

      <div style={{ marginTop: '24px' }}>
        {activeTab === TAB_LABELS[0] && <GrowthDashboard plans={plans} baseD0={baseD0} selectedMonth={selectedMonth} />}
        {activeTab === TAB_LABELS[1] && <ActionCreator form={form} setForm={setForm} currentId={currentId} resetForm={resetForm} responsibles={responsibles} sectorOptions={sectorOptions} learnedObjectives={learnedObjectives} userData={userData} selectedCityId={selectedCityId} selectedMonth={selectedMonth} setActiveTab={setActiveTab} />}
        {activeTab === TAB_LABELS[2] && <ActionTracker plans={plans.filter(p => p.status === 'Planejamento' || p.status === 'Em Andamento')} cityMap={cityMap} startEdit={startEdit} setStepsModalOpen={setStepsModalOpen} setStepsPlan={setStepsPlan} />}
        {activeTab === TAB_LABELS[3] && <ActionFinished plans={plans.filter(p => p.status === 'Finalizada')} cityMap={cityMap} openAudit={setAuditPlan} />}
      </div>

      {stepsModalOpen && stepsPlan && <ModalEtapas plan={stepsPlan} close={() => {setStepsModalOpen(false); setStepsPlan(null);}} userData={userData} />}
      
      {auditPlan && <ModalAuditoria plan={auditPlan} close={() => setAuditPlan(null)} cityMap={cityMap} />}
    </Page>
  );
}