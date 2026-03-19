import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from "../firebase";
import { Page, colors } from "../components/ui";
import { 
  FlaskConical, RefreshCcw, LayoutGrid, BrainCircuit, 
  Share2, TrendingUp, Users, Calendar
} from 'lucide-react';

// IMPORTAÇÃO DAS ABAS (VIEWS)
import RadarView from './LaboratorioChurn/RadarView';
import InteligenciaView from './LaboratorioChurn/InteligenciaView';
import OmnichannelView from './LaboratorioChurn/OmnichannelView';
import ProjecoesView from './LaboratorioChurn/ProjecoesView';
import RelacionamentoView from './LaboratorioChurn/RelacionamentoView';

const REASONS_MAP = {
  'mudanca_endereco': 'Mudança de Endereço',
  'insatisfacao_tecnica': 'Insatisfação Técnica',
  'concorrencia': 'Oferta da Concorrência',
  'financeiro': 'Problemas Financeiros',
  'insatisfacao_atendimento': 'Insatisfação Atendimento',
  'outros': 'Outros Motivos'
};

export default function LaboratorioChurn({ userData }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  });

  const [loading, setLoading] = useState(true);
  const [rawCities, setRawCities] = useState([]);
  const [rawResults, setRawResults] = useState([]);
  const [actionPlans, setActionPlans] = useState([]);
  
  const [selectedCity, setSelectedCity] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [activeTab, setActiveTab] = useState('radar');

  // 1. SINCRONIZAÇÃO DE DADOS
  useEffect(() => {
    setLoading(true);
    const unsubs = [
      onSnapshot(collection(db, 'cities'), snap => setRawCities(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'city_results'), snap => setRawResults(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'action_plans'), snap => setActionPlans(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    ];
    setTimeout(() => setLoading(false), 800);
    return () => unsubs.forEach(u => u());
  }, []);

  // 2. MOTOR DE CÁLCULO S&OP
  const processedData = useMemo(() => {
    if (!rawCities.length) return [];
    return rawCities.map(city => {
      const resultDoc = rawResults.find(r => r.id === `${selectedMonth}_${city.id}`);
      let totalSales = 0;
      let channels = { loja: 0, pap: 0, central: 0, b2b: 0 };
      let churnReasons = {};

      if (resultDoc) {
        if (resultDoc.vendas) {
          Object.entries(resultDoc.vendas).forEach(([canalNome, canalDados]) => {
            let canalTotal = 0;
            Object.values(canalDados).forEach(val => { canalTotal += Number(val || 0); });
            totalSales += canalTotal;
            const cName = canalNome.toLowerCase();
            if (cName.includes('loja')) channels.loja += canalTotal;
            else if (cName.includes('pap') || cName.includes('porta')) channels.pap += canalTotal;
            else if (cName.includes('central') || cName.includes('tele')) channels.central += canalTotal;
            else if (cName.includes('b2b')) channels.b2b += canalTotal;
            else channels.loja += canalTotal;
          });
        }
        if (resultDoc.motivosCancelamento) churnReasons = resultDoc.motivosCancelamento;
      }

      const cancelations = Number(resultDoc?.cancelamentos || 0);
      const netAdds = totalSales - cancelations;
      const currentBase = Number(city.baseStart || 0);
      const churnRate = currentBase > 0 ? ((cancelations / currentBase) * 100).toFixed(1) : 0;
      return {
        ...city, currentBase, totalSales, cancelations, netAdds, 
        churnRate, channels, churnReasons, clusterName: city.clusterId || 'Geral'
      };
    });
  }, [rawCities, rawResults, selectedMonth]);

  useEffect(() => {
    if (processedData.length > 0 && !selectedCity) setSelectedCity(processedData[0]);
  }, [processedData, selectedCity]);

  if (loading) return (
    <div style={local.loading}>
      <RefreshCcw size={32} className="animate-spin" color={colors.primary} />
      <h3 style={{ fontWeight: '900', marginTop: '15px' }}>Sincronizando Laboratório...</h3>
    </div>
  );

  const TABS = [
    { id: 'radar', label: 'Monitor Radar', icon: LayoutGrid },
    { id: 'inteligencia', label: 'Inteligência S&OP', icon: BrainCircuit },
    { id: 'omnichannel', label: 'Canais Omnichannel', icon: Share2 },
    { id: 'projecoes', label: 'Projeções Futuras', icon: TrendingUp },
    { id: 'relacionamento', label: 'Matriz de Ofensores', icon: Users }
  ];

  return (
    <Page> {/* Page agora apenas como container, sem props de título */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', padding: '0 0 40px 0' }}>
        
        {/* ── UNIFIED HEADER (Padrão Oquei Strategy) ── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-panel) 100%)',
          border: '1px solid var(--border)', borderRadius: '24px',
          padding: '24px 32px', marginBottom: '10px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: '20px', boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.info})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 8px 20px ${colors.primary}40`,
            }}>
              <FlaskConical size={28} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Laboratório Churn</div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '500' }}>Análise estratégica de cancelamentos, radar e retenção.</div>
            </div>
          </div>
          
          {/* Seletor de Mês Integrado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-app)', padding: '10px 16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <Calendar size={16} color="var(--text-muted)" />
            <input 
              type="month" value={selectedMonth} 
              onChange={e => { setSelectedMonth(e.target.value); setSelectedCity(null); }} 
              style={local.monthInputSmall}
            />
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS PADRONIZADA */}
        <div style={local.tabBar}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...local.tabBtn,
                background: activeTab === tab.id ? colors.primary : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : 'var(--text-muted)',
                boxShadow: activeTab === tab.id ? `0 4px 12px ${colors.primary}40` : 'none'
              }}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {/* ÁREA DE CONTEÚDO */}
        <div style={local.contentArea}>
          {activeTab === 'radar' && (
            <RadarView 
              processedData={processedData} 
              selectedCity={selectedCity} 
              setSelectedCity={setSelectedCity} 
              actionPlans={actionPlans} 
              setShowPlanModal={setShowPlanModal} 
            />
          )}
          {activeTab === 'inteligencia' && <InteligenciaView processedData={processedData} />}
          {activeTab === 'omnichannel' && <OmnichannelView processedData={processedData} />}
          {activeTab === 'projecoes' && <ProjecoesView processedData={processedData} />}
          {activeTab === 'relacionamento' && <RelacionamentoView processedData={processedData} reasonsMap={REASONS_MAP} />}
        </div>
      </div>
    </Page>
  );
}

const local = {
  loading: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '40vh', color: 'var(--text-muted)' },
  monthInputSmall: { border: 'none', background: 'transparent', color: 'var(--text-main)', fontSize: '14px', fontWeight: '800', outline: 'none', cursor: 'pointer', fontFamily: 'Manrope, sans-serif' },
  tabBar: { display: 'flex', gap: '8px', background: 'var(--bg-card)', padding: '8px', borderRadius: '18px', border: '1px solid var(--border)', overflowX: 'auto', whiteSpace: 'nowrap' },
  tabBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '800', transition: '0.2s' },
  contentArea: { background: 'var(--bg-panel)', padding: '25px', borderRadius: '24px', minHeight: '500px', border: '1px solid var(--border)', animation: 'fadeIn 0.4s ease' }
};