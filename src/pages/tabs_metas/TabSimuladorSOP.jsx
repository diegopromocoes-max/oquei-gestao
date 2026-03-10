import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, doc, onSnapshot, query, where, setDoc } from 'firebase/firestore';
import { 
  Sliders, Lightbulb, PieChart, MapPin, Users, Target, Info, TrendingDown, Lock, Unlock, Settings2, ArrowRight, AlertTriangle, CheckCircle2, TrendingUp, Zap, ListChecks, Brain, RefreshCcw
} from 'lucide-react';
import { styles } from '../../styles/globalStyles';

export default function TabSimuladorSOP({ selectedMonth, userData }) {
  const [cities, setCities] = useState([]);
  const [channels, setChannels] = useState([]); 
  const [allResults, setAllResults] = useState([]); 
  const [monthlyGoalsData, setMonthlyGoalsData] = useState({}); 
  const [monthlyBases, setMonthlyBases] = useState({}); 
  const [simulations, setSimulations] = useState({}); 
  const [loading, setLoading] = useState(true);
  
  const [selectedCityId, setSelectedCityId] = useState('');
  const [growthPercent, setGrowthPercent] = useState(0.0);
  const [churnPercent, setChurnPercent] = useState(0.0);
  const [distMethod, setDistMethod] = useState('auto'); 
  const [savingLock, setSavingLock] = useState(false);

  // Estados para o Gerador de Insights
  const [activeInsights, setActiveInsights] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // 1. SINCRONIZAÇÃO DE DADOS
  useEffect(() => {
    setLoading(true);
    const myCluster = String(userData?.clusterId || "").trim();
    const isCoord = userData?.role === 'coordinator' || userData?.role === 'coordenador';

    const unsubs = [
      onSnapshot(isCoord ? collection(db, 'cities') : query(collection(db, 'cities'), where('clusterId', '==', myCluster)), snap => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.name || a.city || '').localeCompare(b.name || b.city || ''));
        setCities(list);
        if (list.length > 0 && !selectedCityId) setSelectedCityId(list[0].id);
      }),
      onSnapshot(collection(db, 'sales_channels'), snap => {
        setChannels(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }),
      onSnapshot(collection(db, "city_results"), snap => {
        setAllResults(snap.docs.map(d => d.data()));
      }),
      onSnapshot(doc(db, 'goals_cities', selectedMonth), snap => {
        if (snap.exists()) setMonthlyGoalsData(snap.data().data || {});
        else setMonthlyGoalsData({});
      }),
      onSnapshot(query(collection(db, "monthly_bases"), where("month", "==", selectedMonth)), snap => {
        const bMap = {}; snap.docs.forEach(d => { bMap[d.data().cityId] = d.data(); }); setMonthlyBases(bMap);
      }),
      onSnapshot(query(collection(db, "sop_simulations"), where("month", "==", selectedMonth)), snap => {
        const sMap = {}; snap.docs.forEach(d => { sMap[d.data().cityId] = d.data(); }); setSimulations(sMap);
      })
    ];
    setLoading(false);
    return () => unsubs.forEach(u => u());
  }, [userData, selectedMonth]);

  // 2. PERSISTÊNCIA AO TROCAR CIDADE
  useEffect(() => {
    if (loading || !selectedCityId) return;
    const saved = simulations[selectedCityId];
    if (saved) {
      setGrowthPercent(saved.growthPercent || 0);
      setChurnPercent(saved.churnPercent || 0);
      setDistMethod(saved.distMethod || 'auto');
    } else {
      setGrowthPercent(0); setChurnPercent(0); setDistMethod('auto');
    }
    setActiveInsights(null); 
  }, [selectedCityId, loading, simulations]);

  // Limpa os insights se o utilizador mover as barras
  useEffect(() => {
    setActiveInsights(null);
  }, [growthPercent, churnPercent]);

  const cityData = useMemo(() => {
    if (!selectedCityId || cities.length === 0) return null;
    const c = cities.find(city => city.id === selectedCityId) || cities[0];
    const monthBaseData = monthlyBases[c.id];
    const baseAtual = parseFloat(monthBaseData?.baseStart || c.baseStart || 0);
    const potencial = parseFloat(c.potencial || 0); 
    const history = allResults.filter(r => r.cityId === c.id).sort((a,b) => b.month.localeCompare(a.month));
    return { ...c, baseAtual, potencial, history };
  }, [selectedCityId, cities, allResults, monthlyBases]);

  // 3. 🧠 MOTOR CENTRAL DE INTELIGÊNCIA S&OP
  const intelligence = useMemo(() => {
    if (!cityData) return null;

    const safeDivide = (num, den) => (den && den !== 0 ? num / den : 0);
    const baseInicial = Number(cityData.baseAtual || 0);

    // 📈 Metas projetadas
    const metaNet = Math.ceil(baseInicial * (growthPercent / 100));
    const expectedChurn = Math.ceil(baseInicial * (churnPercent / 100));
    const metaBruta = metaNet + expectedChurn;

    // 📊 Histórico últimos 3 meses
    const last3 = cityData.history.slice(0, 3);
    const avgGross = last3.length ? last3.reduce((acc, m) => acc + Number(m.grossAdds || 0), 0) / last3.length : 0;
    const avgChurnAbs = last3.length ? last3.reduce((acc, m) => acc + Number(m.churnTotal || 0), 0) / last3.length : 0;
    const avgChurnPct = safeDivide(avgChurnAbs, baseInicial) * 100;
    const avgNetPct = last3.length ? last3.reduce((acc, m) => acc + (safeDivide(Number(m.netAdds || 0), Number(m.baseStart || 0)) * 100), 0) / last3.length : 0;

    // 📌 Penetração
    const potencial = Number(cityData.potencial || 0);
    const potReal = potencial > 0 ? potencial : baseInicial * 2;
    const penetration = safeDivide(baseInicial, potReal) * 100;

    // 🚨 SISTEMA EXECUTIVO DE ALERTAS E RECOMENDAÇÕES
    const alerts = [];
    const recommendations = [];
    const growthDelta = growthPercent - avgNetPct;
    const churnDelta = churnPercent - avgChurnPct;

    if (growthDelta > 2) {
      alerts.push({ type: 'warning', title: 'Meta de Crescimento Acima da Capacidade Histórica', text: `A meta projetada (${growthPercent.toFixed(1)}%) está significativamente acima da média recente (${avgNetPct.toFixed(1)}%).`, action: 'Validação comercial necessária.' });
      recommendations.push('Avaliar reforço de equipe comercial', 'Criar campanhas promocionais regionais', 'Reforçar mídia digital com foco em conversão', 'Expandir parcerias locais');
    }
    if (penetration < 35 && growthPercent < avgNetPct) {
      alerts.push({ type: 'info', title: 'Crescimento Conservador para Alto Potencial', text: `Baixa penetração (${penetration.toFixed(1)}%), mas meta abaixo do desempenho médio.`, action: 'Oportunidade de expansão acelerada.' });
      recommendations.push('Intensificar marketing territorial', 'Campanhas de aquisição agressivas', 'Ações porta a porta estratégicas');
    }
    if (Math.abs(churnDelta) > 1.5) {
      alerts.push({ type: 'critical', title: 'Projeção de Cancelamento Fora do Padrão', text: `Churn projetado (${churnPercent.toFixed(1)}%) diverge da média histórica (${avgChurnPct.toFixed(1)}%).`, action: 'Validar com atendimento e retenção.' });
      recommendations.push('Força-tarefa de retenção', 'Campanhas de fidelização e upgrade', 'Análise de causas de cancelamento');
    }
    if (penetration > 80 && growthPercent > avgNetPct) {
      alerts.push({ type: 'critical', title: 'Expansão em Mercado Saturado', text: `Com ${penetration.toFixed(1)}% de penetração, metas agressivas elevam drasticamente o CAC.`, action: 'Crescimento exigirá diferenciação forte.' });
      recommendations.push('Campanhas de migração da concorrência', 'Incentivos financeiros para portabilidade', 'Pacotes premium com maior valor');
    }
    if (alerts.length === 0 && growthPercent > 0) {
      alerts.push({ type: 'success', title: 'Planejamento Aderente', text: 'Metas alinhadas com capacidade histórica e contexto de mercado.', action: 'Cenário validado para execução.' });
    }

    // 🧠 MATRIZ ESTRATÉGICA AUTOMÁTICA (CALIBRADA PARA MATURIDADE)
    let marketProfile = ''; let operationalProfile = ''; let strategicQuadrant = ''; let quadrantColor = ''; let strategicGuidance = []; let executivePositioning = '';

    if (penetration >= 60) marketProfile = 'Maduro / Dominado';
    else if (penetration >= 30) marketProfile = 'Intermediário';
    else marketProfile = 'Expansão';

    if (avgNetPct >= 2.5) operationalProfile = 'Alta Tração';
    else if (avgNetPct >= 0.5) operationalProfile = 'Sustentável';
    else operationalProfile = 'Estagnação / Retração';

    if (marketProfile === 'Maduro / Dominado') {
      if (avgNetPct >= 0) {
        strategicQuadrant = 'DOMÍNIO E RENTABILIZAÇÃO'; quadrantColor = '#3b82f6'; 
        executivePositioning = 'A unidade domina a praça. O objetivo principal não é volume acelerado, mas sim blindar a base e aumentar a margem de lucro.';
        strategicGuidance = ['Foco absoluto na experiência do cliente (NPS) para reter a base', 'Campanhas de Cross-Sell e Upgrade (Aumentar ARPU)', 'Otimizar Custo de Aquisição (CAC) usando canais orgânicos', 'Monitoramento radar da concorrência'];
      } else {
        strategicQuadrant = 'ALERTA DE PERDA DE SHARE'; quadrantColor = '#f59e0b'; 
        executivePositioning = 'A unidade tem grande fatia do mercado, mas a base começou a encolher. Risco de perda de liderança.';
        strategicGuidance = ['Auditoria imediata dos motivos de cancelamento (Churn)', 'Ações de reversão e retenção proativa', 'Análise de preço vs. velocidade local'];
      }
    } 
    else if (marketProfile === 'Expansão' && operationalProfile === 'Alta Tração') {
      strategicQuadrant = 'EXPANSÃO ACELERADA'; quadrantColor = '#16a34a'; 
      executivePositioning = 'Ambiente ideal. O mercado tem espaço e a equipe comercial provou ter alta capacidade de fechamento.';
      strategicGuidance = ['Acelerar orçamento em marketing de aquisição', 'Expandir presença de Lojas/PDV ou equipe PAP', 'Campanhas de agressividade comercial para ganho rápido'];
    } 
    else if (marketProfile === 'Expansão' && operationalProfile !== 'Alta Tração') {
      strategicQuadrant = 'ALAVANCAGEM COMERCIAL'; quadrantColor = '#8b5cf6'; 
      executivePositioning = 'O mercado tem muito potencial não explorado, mas a operação atual não está convertendo o suficiente.';
      strategicGuidance = ['Treinamento de técnicas de vendas e quebra de objeções', 'Aumentar o volume de Leads no topo do funil', 'Revisar comissionamento para incentivar volume'];
    } 
    else {
      strategicQuadrant = 'REESTRUTURAÇÃO TÁTICA'; quadrantColor = '#dc2626'; 
      executivePositioning = 'Sinal Vermelho: O mercado é competitivo e a unidade não consegue crescer de forma sustentável.';
      strategicGuidance = ['Revisão profunda da estrutura de canais de venda', 'Mapeamento de gargalos técnicos que geram churn', 'Ajuste de portfólio de ofertas locais'];
    }

    // 🎯 MIX DE CANAIS: MÚLTIPLOS MÉTODOS RESTAURADOS
    const getDiretoriaMix = () => {
      const cityDataGoals = monthlyGoalsData[cityData.id] || {};
      let channelTotals = {}; let totalGeral = 0;
      Object.entries(cityDataGoals).forEach(([channelId, productsObj]) => {
        const sumChannel = Object.values(productsObj).reduce((acc, val) => acc + Number(val || 0), 0);
        if (sumChannel > 0) { channelTotals[channelId] = sumChannel; totalGeral += sumChannel; }
      });
      if (totalGeral === 0) return null;
      let m = {}; Object.entries(channelTotals).forEach(([id, vol]) => m[id] = vol / totalGeral);
      return { mix: m, originalAbs: channelTotals };
    };

    const getHistoryMix = () => {
      let total = 0; let mCount = {};
      cityData.history.forEach(res => {
        if (res.vendas) {
          Object.entries(res.vendas).forEach(([id, prods]) => {
            const sum = typeof prods === 'object' ? Object.values(prods).reduce((a, b) => a + Number(b), 0) : Number(prods || 0);
            mCount[id] = (mCount[id] || 0) + sum; total += sum;
          });
        }
      });
      if (total === 0) return null;
      let m = {}; Object.entries(mCount).forEach(([id, v]) => m[id] = v / total);
      return m;
    };

    const getEqualMix = () => {
      if (!channels || channels.length === 0) return {};
      let m = {}; channels.forEach(ch => m[ch.id] = 1 / channels.length);
      return m;
    };

    const dirData = getDiretoriaMix();
    const mDir = dirData ? dirData.mix : null;
    const originalGoalsAbs = dirData ? dirData.originalAbs : {};

    let mix = {}; let finalDataSource = '';
    if (distMethod === 'aba2') { 
      mix = mDir || {}; finalDataSource = mDir ? 'Metas da Diretoria' : 'Diretoria (Dados ausentes)'; 
    }
    else if (distMethod === 'history') { 
      const mH = getHistoryMix(); mix = mH || getEqualMix(); finalDataSource = mH ? 'Histórico Real' : 'Histórico (Sem dados)'; 
    }
    else if (distMethod === 'equal') { 
      mix = getEqualMix(); finalDataSource = 'Distribuição Igualitária'; 
    }
    else {
      if (mDir) { mix = mDir; finalDataSource = 'Auto: Metas da Diretoria'; }
      else {
        const mH = getHistoryMix();
        if (mH) { mix = mH; finalDataSource = 'Auto: Histórico Real'; }
        else { mix = getEqualMix(); finalDataSource = 'Auto: Igualitário Padrão'; }
      }
    }

    const metasPorCanal = Object.fromEntries(Object.entries(mix).map(([id, pct]) => [id, Math.round(metaBruta * pct)]));

    return { 
      baseInicial, metaNet, expectedChurn, metaBruta, avgGross, avgChurnAbs, avgNetPct, avgChurnPct, penetration, alerts, recommendations,
      strategicMatrix: { marketProfile, operationalProfile, strategicQuadrant, quadrantColor, executivePositioning, strategicGuidance },
      metasPorCanal, mix, originalGoals: originalGoalsAbs, dataSource: finalDataSource
    };
  }, [cityData, growthPercent, churnPercent, monthlyGoalsData, channels, distMethod]);

  const handleGenerateInsights = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setActiveInsights({
        matrix: intelligence.strategicMatrix,
        alerts: intelligence.alerts,
        recommendations: intelligence.recommendations
      });
      setIsGenerating(false);
    }, 800);
  };

  const handleToggleLock = async () => {
    if (!cityData) return;
    setSavingLock(true);
    try {
      await setDoc(doc(db, "sop_simulations", `${selectedMonth}_${cityData.id}`), {
        cityId: cityData.id, month: selectedMonth, growthPercent, churnPercent, distMethod, locked: !simulations[selectedCityId]?.locked, updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) { alert("Erro ao salvar."); }
    setSavingLock(false);
  };

  if (loading || !cityData || !intelligence) return <div style={styles.emptyState}>Iniciando Inteligência S&OP...</div>;

  const isLocked = simulations[selectedCityId]?.locked || false;

  return (
    <div className="animated-view" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      {/* HEADER EXECUTIVO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '15px 25px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <MapPin size={22} color="#3b82f6" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '900', textTransform: 'uppercase' }}>Unidade Operacional</span>
            <select value={selectedCityId} onChange={e => setSelectedCityId(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', cursor: 'pointer' }}>
              {cities.map(city => <option key={city.id} value={city.id}>{city.name}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '30px' }}>
           <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '900' }}>POTENCIAL (HP)</div>
              <div style={{ fontSize: '18px', fontWeight: '900' }}>{cityData.potencial || '---'}</div>
           </div>
           <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '900' }}>PENETRAÇÃO</div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: intelligence.penetration > 60 ? '#3b82f6' : '#10b981' }}>{intelligence.penetration.toFixed(1)}%</div>
           </div>
        </div>
      </div>

      <div style={styles.gridMain}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* SLIDERS COM NÚMEROS REAIS */}
          <div style={styles.mainCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={styles.cardTitle}><TrendingUp size={18} color="#3b82f6" /> Meta de Crescimento</h3>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '15px' }}>
              <div style={{ fontSize: '32px', fontWeight: '900', color: '#3b82f6' }}>+{growthPercent.toFixed(1)}%</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '5px' }}>
                {intelligence.metaNet} novos clientes
              </div>
            </div>
            <input type="range" min="0" max="20" step="0.1" value={growthPercent} onChange={e => setGrowthPercent(Number(e.target.value))} disabled={isLocked} style={{ width: '100%', accentColor: '#3b82f6' }} />
          </div>

          <div style={styles.mainCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={styles.cardTitle}><TrendingDown size={18} color="#ef4444" /> Projeção de Churn</h3>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '15px' }}>
              <div style={{ fontSize: '32px', fontWeight: '900', color: '#ef4444' }}>-{churnPercent.toFixed(1)}%</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '5px' }}>
                {intelligence.expectedChurn} cancelamentos
              </div>
            </div>
            <input type="range" min="0" max="15" step="0.1" value={churnPercent} onChange={e => setChurnPercent(Number(e.target.value))} disabled={isLocked} style={{ width: '100%', accentColor: '#ef4444' }} />
          </div>

          {/* 🧠 INSIGHTS DE EVOLUÇÃO (COM BOTÃO) */}
          <div style={{ background: 'var(--bg-card)', borderRadius: '24px', padding: '25px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Brain size={20} color="#8b5cf6" /> Insights de Evolução S&OP
            </h3>

            {!activeInsights ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5' }}>
                  Ajuste os cenários de crescimento e cancelamento acima, e gere uma análise de viabilidade executiva para esta unidade.
                </p>
                <button onClick={handleGenerateInsights} disabled={isGenerating} style={{ background: '#8b5cf6', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)', transition: 'all 0.2s' }}>
                  {isGenerating ? <RefreshCcw size={18} className="animate-spin" /> : <Zap size={18} />}
                  {isGenerating ? 'Analisando Dados...' : 'Gerar Insights Estratégicos'}
                </button>
              </div>
            ) : (
              <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                
                {/* 1. Matriz */}
                <div style={{ background: activeInsights.matrix.quadrantColor, color: '#fff', padding: '12px 18px', borderRadius: '12px', fontWeight: '900', fontSize: '14px', textAlign: 'center', marginBottom: '15px' }}>
                  {activeInsights.matrix.strategicQuadrant}
                </div>

                <div style={{ display:'flex', gap:'15px', marginBottom:'15px' }}>
                  <div style={{ flex:1, fontSize: '12px', background:'var(--bg-app)', padding:'10px', borderRadius:'8px' }}>
                    <div style={{fontWeight:'800', color:'var(--text-muted)'}}>MERCADO</div>
                    <div style={{fontWeight:'900'}}>{activeInsights.matrix.marketProfile}</div>
                  </div>
                  <div style={{ flex:1, fontSize: '12px', background:'var(--bg-app)', padding:'10px', borderRadius:'8px' }}>
                    <div style={{fontWeight:'800', color:'var(--text-muted)'}}>OPERAÇÃO</div>
                    <div style={{fontWeight:'900'}}>{activeInsights.matrix.operationalProfile}</div>
                  </div>
                </div>

                <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '13px', color: 'var(--text-main)', marginBottom: '20px', lineHeight:'1.5' }}>
                  {activeInsights.matrix.executivePositioning}
                </div>

                {/* 2. Alertas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {activeInsights.alerts.map((alert, idx) => (
                    <div key={idx} style={{ padding: '12px', borderRadius: '12px', border: '1px solid', background: alert.type === 'critical' ? '#fef2f2' : alert.type === 'warning' ? '#fffbeb' : alert.type === 'success' ? '#f0fdf4' : '#f0f9ff', borderColor: alert.type === 'critical' ? '#fecaca' : alert.type === 'warning' ? '#fde68a' : alert.type === 'success' ? '#bbf7d0' : '#bae6fd' }}>
                      <div style={{ fontWeight: '900', fontSize: '13px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', color: alert.type === 'critical' ? '#991b1b' : alert.type === 'warning' ? '#92400e' : '#166534' }}>
                        {alert.title}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-main)', marginBottom: '6px' }}>{alert.text}</div>
                      <div style={{ fontSize: '11px', fontWeight: '800', fontStyle: 'italic', color: 'var(--text-muted)' }}>Ação: {alert.action}</div>
                    </div>
                  ))}
                </div>

                {/* 3. Recomendações */}
                <div style={{ fontSize: '13px', fontWeight: '900', marginBottom: '10px', color:'var(--text-main)', display:'flex', alignItems:'center', gap:'6px' }}>
                  <ListChecks size={16}/> PLANO DE AÇÃO:
                </div>
                <ul style={{ paddingLeft: '18px', margin: 0, marginBottom: '15px' }}>
                  {activeInsights.recommendations.length > 0 ? (
                    activeInsights.recommendations.map((item, i) => (
                      <li key={i} style={{ marginBottom: '6px', fontSize: '12px', fontWeight:'700', color:'var(--text-muted)' }}>{item}</li>
                    ))
                  ) : (
                    activeInsights.matrix.strategicGuidance.map((item, i) => (
                      <li key={i} style={{ marginBottom: '6px', fontSize: '12px', fontWeight:'700', color:'var(--text-muted)' }}>{item}</li>
                    ))
                  )}
                </ul>
                
                <div style={{ textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '15px' }}>
                  <button onClick={() => setActiveInsights(null)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>
                    Recalcular Cenário
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={styles.mainCard}>
            <h3 style={{...styles.cardTitle, marginBottom: '20px'}}><Users size={18} color="#8b5cf6" /> Fluxo de Base Projetado</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-app)', padding: '20px', borderRadius: '16px' }}>
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: '10px', fontWeight: '800' }}>ABERTURA</div><div style={{ fontSize: '22px', fontWeight: '900' }}>{intelligence.baseInicial}</div></div>
              <ArrowRight size={16} color="var(--text-muted)" />
              <div style={{ textAlign: 'center' }}><div style={{ fontSize: '10px', fontWeight: '800' }}>FECHAMENTO</div><div style={{ fontSize: '22px', fontWeight: '900', color: '#8b5cf6' }}>{intelligence.baseInicial + intelligence.metaNet}</div></div>
            </div>
            
            <div style={{ marginTop: '15px', padding: '12px', background: 'var(--bg-app)', borderRadius: '12px', border: '1px dashed var(--border)', textAlign: 'center' }}>
               <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '5px' }}>ALVO DE VENDAS BRUTAS (GROSS)</div>
               <div style={{ fontSize: '24px', fontWeight: '900', color: '#10b981' }}>{intelligence.metaBruta} <span style={{fontSize:'12px', color:'var(--text-muted)'}}>contratos</span></div>
            </div>
          </div>

          <div style={styles.mainCard}>
            <div style={{...styles.cardHeader, marginBottom: '20px'}}>
              <h3 style={styles.cardTitle}><PieChart size={18} color="#f59e0b" /> Mix de Canais (Vendas)</h3>
              <select className="method-select-sop" value={distMethod} onChange={e => setDistMethod(e.target.value)} disabled={isLocked}>
                <option value="auto">Automático (Smart)</option>
                <option value="aba2">Metas da Diretoria</option>
                <option value="history">Histórico Real</option>
                <option value="equal">Igualitário</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {Object.keys(intelligence.metasPorCanal).length > 0 ? (
                Object.entries(intelligence.metasPorCanal).map(([canalId, valorSimulado]) => {
                  const ch = channels.find(c => c.id === canalId);
                  const valorOriginal = Number(intelligence.originalGoals[canalId] || 0);
                  const mixPct = (intelligence.mix[canalId] * 100).toFixed(1);
                  const diff = valorSimulado - valorOriginal;

                  return (
                    <div key={canalId} style={{ borderBottom: '1px dashed var(--border)', paddingBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '900', textTransform: 'uppercase' }}>{ch?.name || canalId}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>PARTICIPAÇÃO: {mixPct}%</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {distMethod === 'aba2' && <div style={{ fontSize: '11px', opacity: 0.5, fontWeight:'700' }}>Plano: {valorOriginal} <ArrowRight size={10} /></div>}
                          <div style={{ fontSize: '20px', fontWeight: '900' }}>{valorSimulado}</div>
                        </div>
                      </div>
                      {distMethod === 'aba2' && valorOriginal > 0 && (
                        <div style={{ textAlign: 'right', fontSize: '10px', fontWeight: '900', color: diff >= 0 ? '#10b981' : '#ef4444', marginTop: '4px' }}>
                          {diff >= 0 ? `+${diff}` : diff} vs plano da diretoria
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '12px' }}>Nenhum dado encontrado para o método atual.</div>
              )}
            </div>
            <div style={{ marginTop: '15px', fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', fontWeight: '800', background: 'var(--bg-app)', padding: '8px', borderRadius: '10px' }}>
              FONTE: {intelligence.dataSource.toUpperCase()}
            </div>
          </div>

          <button onClick={handleToggleLock} disabled={savingLock} style={{ ...styles.saveBtnLarge, background: isLocked ? 'var(--bg-panel)' : '#10b981', color: isLocked ? 'var(--text-main)' : '#fff', height:'55px' }}>
            {isLocked ? <><Unlock size={18} /> Destravar Estudo</> : <><Lock size={18} /> Travar Cenário S&OP</>}
          </button>
        </div>
      </div>
    </div>
  );
}