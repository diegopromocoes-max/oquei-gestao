import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from "../firebase";
import { Page, colors } from "../components/ui";
import { RefreshCcw, LayoutGrid, BrainCircuit, Share2, TrendingUp, Users } from 'lucide-react';

// IMPORTAÇÃO DAS ABAS (VIEWS) APONTANDO PARA A PASTA
import RadarView from './LaboratorioChurn/RadarView';
import InteligenciaView from './LaboratorioChurn/InteligenciaView';
import OmnichannelView from './LaboratorioChurn/OmnichannelView';
import ProjecoesView from './LaboratorioChurn/ProjecoesView';
import RelacionamentoView from './LaboratorioChurn/RelacionamentoView';

// Mapeamento de motivos de cancelamento (Para o RelacionamentoView)
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
  
  // 🚀 ESTADO QUE CONTROLA AS ABAS
  const [activeTab, setActiveTab] = useState('radar');

  // 1. BUSCA DOS DADOS NO FIREBASE
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

  // 2. PROCESSAMENTO MATEMÁTICO (Para alimentar todas as abas)
  const processedData = useMemo(() => {
    if (!rawCities.length) return [];

    return rawCities.map(city => {
      const resultDoc = rawResults.find(r => r.id === `${selectedMonth}_${city.id}`);
      
      let totalSales = 0;
      let channels = { loja: 0, pap: 0, central: 0, b2b: 0 };
      let churnReasons = {};

      if (resultDoc) {
        // Processar Vendas e Canais (Para o OmnichannelView)
        if (resultDoc.vendas) {
          Object.entries(resultDoc.vendas).forEach(([canalNome, canalDados]) => {
            let canalTotal = 0;
            Object.values(canalDados).forEach(val => { canalTotal += Number(val || 0); });
            totalSales += canalTotal;

            const cName = canalNome.toLowerCase();
            if (cName.includes('loja')) channels.loja += canalTotal;
            else if (cName.includes('pap') || cName.includes('porta')) channels.pap += canalTotal;
            else if (cName.includes('central') || cName.includes('tele')) channels.central += canalTotal;
            else if (cName.includes('b2b') || cName.includes('corpo')) channels.b2b += canalTotal;
            else channels.loja += canalTotal;
          });
        }
        // Processar Motivos de Churn (Para o RelacionamentoView)
        if (resultDoc.motivosCancelamento) churnReasons = resultDoc.motivosCancelamento;
      }

      const cancelations = Number(resultDoc?.cancelamentos || 0);
      const netAdds = totalSales - cancelations;
      const currentBase = Number(city.baseStart || 0);
      const churnRate = currentBase > 0 ? ((cancelations / currentBase) * 100).toFixed(1) : 0;
      const targetNetAdds = Number(city.targetNetAdds || Math.ceil(currentBase * 0.05)); 
      const projNetAdds = netAdds; // Tendência simples (pode ser ajustada no futuro)

      return {
        ...city, currentBase, totalSales, cancelations, netAdds, 
        churnRate, targetNetAdds, projNetAdds, channels, churnReasons,
        clusterName: city.clusterId || 'Geral'
      };
    });
  }, [rawCities, rawResults, selectedMonth]);

  // 3. AUTO-SELEÇÃO DA PRIMEIRA CIDADE PARA O RADAR
  useEffect(() => {
    if (processedData.length > 0 && !selectedCity) {
      setSelectedCity(processedData[0]);
    }
  }, [processedData, selectedCity]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
        <RefreshCcw size={32} className="animate-spin" color={colors.primary} style={{ marginBottom: '15px' }} />
        <h3 style={{ fontWeight: '900' }}>Sincronizando Laboratório...</h3>
      </div>
    );
  }

  // 4. MENU DE NAVEGAÇÃO ENTRE AS ABAS DO CLAUDE
  const TABS = [
    { id: 'radar', label: 'Monitor Radar', icon: LayoutGrid },
    { id: 'inteligencia', label: 'Inteligência S&OP', icon: BrainCircuit },
    { id: 'omnichannel', label: 'Canais Omnichannel', icon: Share2 },
    { id: 'projecoes', label: 'Projeções Futuras', icon: TrendingUp },
    { id: 'relacionamento', label: 'Matriz de Ofensores', icon: Users }
  ];

  return (
    <Page 
      title="Laboratório S&OP Oquei" 
      subtitle="Analise o funil de vendas, churn e lance planos de ação."
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-card)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)' }}>MÊS REFERÊNCIA:</span>
          <input 
            type="month" value={selectedMonth} 
            onChange={e => { setSelectedMonth(e.target.value); setSelectedCity(null); }} 
            style={{ border: 'none', background: 'transparent', color: 'var(--text-main)', fontSize: '14px', fontWeight: '800', outline: 'none', cursor: 'pointer' }} 
          />
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', animation: 'fadeIn 0.4s' }}>
        
        {/* NAVEGAÇÃO DE ABAS */}
        <div style={{ display: 'flex', gap: '10px', background: 'var(--bg-card)', padding: '10px', borderRadius: '16px', border: '1px solid var(--border)', overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '800', transition: 'all 0.2s', whiteSpace: 'nowrap',
                background: activeTab === tab.id ? colors.primary : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'var(--text-muted)',
                boxShadow: activeTab === tab.id ? `0 4px 12px ${colors.primary}40` : 'none'
              }}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        {/* CONTAINER DA ABA ATIVA */}
        <div style={{ background: 'var(--bg-panel)', padding: '30px', borderRadius: '24px', minHeight: '500px', border: '1px solid var(--border)' }}>
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