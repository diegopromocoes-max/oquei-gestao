import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { 
  Activity, TrendingDown, TrendingUp, Target, MapPin, 
  Plus, Crosshair, Users, X, CheckCircle, PieChart, 
  Share2, ShieldAlert, AlertTriangle, WifiOff, DollarSign,
  Briefcase, Headset, Smartphone, AlertCircle, BarChart3, Store,
  Save, Calendar as CalendarIcon, UploadCloud, ArrowRight, Zap, 
  Lightbulb, Sliders, GripVertical, AlertOctagon, Info, ShieldCheck,
  ChevronRight
} from 'lucide-react';

// IMPORTAÇÃO DOS ESTILOS GLOBAIS
import { styles as global, colors } from '../styles/globalStyles';

// --- COMPONENTE ISOLADO PARA EVITAR LAG NOS SLIDERS E GERAR INSIGHTS ---
const InteligenciaView = ({ processedData }) => {
  const [simCityId, setSimCityId] = useState('');
  const [simGrowthPerc, setSimGrowthPerc] = useState(2.0); 
  const [simChurnPerc, setSimChurnPerc] = useState(1.5); 

  useEffect(() => {
    if (processedData.length > 0 && !simCityId) {
      setSimCityId(processedData[0].id);
    }
  }, [processedData]);

  const selectedCityData = processedData.find(c => c.id === simCityId);

  let targetNetAdds = 0;
  let projectedChurnVol = 0;
  let requiredGrossAdds = 0;
  let distLoja = 0, distPap = 0, distCentral = 0, distB2b = 0;
  let errorMsg = null;
  
  let growthInsight = null;
  let churnInsight = null;

  if (selectedCityData) {
    const base = selectedCityData.currentBase;
    targetNetAdds = Math.ceil(base * (simGrowthPerc / 100));
    projectedChurnVol = Math.ceil(base * (simChurnPerc / 100));
    requiredGrossAdds = targetNetAdds + projectedChurnVol;

    const hist = selectedCityData.channels;
    const histTotal = hist.loja + hist.pap + hist.central + hist.b2b;

    if (histTotal === 0) {
      errorMsg = "A cidade não possui histórico de vendas nos últimos 6 meses para calcular a distribuição dos canais.";
    } else {
      const wLoja = hist.loja / histTotal;
      const wPap = hist.pap / histTotal;
      const wCentral = hist.central / histTotal;
      const wB2b = hist.b2b / histTotal;

      distLoja = Math.round(requiredGrossAdds * wLoja);
      distPap = Math.round(requiredGrossAdds * wPap);
      distCentral = Math.round(requiredGrossAdds * wCentral);
      distB2b = requiredGrossAdds - (distLoja + distPap + distCentral); 
    }

    const growth = simGrowthPerc;
    const histGrowth = selectedCityData.histAvgGrowth || 1.5;

    if (growth <= 0) {
      growthInsight = { type: "error", title: "Meta de Retração", message: "Seu planejamento aponta para o encolhimento da base.", color: "#ef4444", bg: "rgba(239,68,68,0.1)", icon: TrendingDown };
    } else if (growth > histGrowth * 2) {
      growthInsight = { type: "error", title: "Meta Irrealista", message: `Exigir ${growth}% é dobrar o esforço histórico de ${histGrowth}%.`, color: "#ef4444", bg: "rgba(239,68,68,0.1)", icon: AlertOctagon };
    } else if (growth > histGrowth * 1.3) {
      growthInsight = { type: "warning", title: "Meta Agressiva", message: `O crescimento histórico é de ${histGrowth}%. Meta desafiadora.`, color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: Target };
    } else {
      growthInsight = { type: "success", title: "Meta Alinhada", message: "Crescimento perfeitamente alinhado com a média histórica.", color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: CheckCircle };
    }

    const churn = simChurnPerc;
    const histChurn = selectedCityData.histAvgChurn || 1.5;

    if (churn < histChurn * 0.5) {
      churnInsight = { type: "warning", title: "Retenção Utópica", message: `A média local é ${histChurn}%. Reduzir para ${churn}% é improvável.`, color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: AlertOctagon };
    } else if (churn < histChurn * 0.85) {
      churnInsight = { type: "success", title: "Excelência em Retenção", message: "Desafio excelente para a equipa de Ouvidoria.", color: "#10b981", bg: "rgba(16,185,129,0.1)", icon: ShieldCheck };
    } else {
      churnInsight = { type: "info", title: "Evasão Padrão", message: "Projeção dentro do comportamento histórico habitual.", color: "#3b82f6", bg: "rgba(59,130,246,0.1)", icon: Info };
    }
  }

  return (
    <div style={{animation: 'fadeIn 0.3s'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px'}}>
        <div>
          <h2 style={{...global.title, display:'flex', alignItems:'center', gap:'10px'}}>
            <Lightbulb size={24} color="#f59e0b"/> Inteligência de Metas (S&OP)
          </h2>
          <p style={global.subtitle}>Distribuição de metas baseada no comportamento histórico dos últimos 6 meses.</p>
        </div>
      </div>

      <div style={{display: 'flex', gap: '30px', flexWrap: 'wrap'}}>
        <div style={{...global.card, flex: 1, minWidth: '300px', display:'flex', flexDirection:'column'}}>
           <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px'}}>
              <Sliders size={20} color="var(--text-brand)"/>
              <h3 style={{color: 'var(--text-main)', margin: 0, fontSize: '16px'}}>Parâmetros da Cidade</h3>
           </div>

           <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
             <div style={global.field}>
               <label style={global.label}>Selecione a Praça</label>
               <select style={global.select} value={simCityId} onChange={e => setSimCityId(e.target.value)}>
                 {processedData.map(c => <option key={c.id} value={c.id}>{c.city} (Penetração: {c.penetration}%)</option>)}
               </select>
             </div>

             <div style={global.field}>
               <label style={global.label}>Meta de Crescimento Líquido (%): <span style={{color:'#10b981'}}>{simGrowthPerc}%</span></label>
               <input type="range" min="-5" max="10" step="0.1" value={simGrowthPerc} onChange={e => setSimGrowthPerc(parseFloat(e.target.value))} style={local.rangeInput} />
             </div>

             <div style={global.field}>
               <label style={global.label}>Trava de Churn Permitido (%): <span style={{color:'#ef4444'}}>{simChurnPerc}%</span></label>
               <input type="range" min="0" max="5" step="0.1" value={simChurnPerc} onChange={e => setSimChurnPerc(parseFloat(e.target.value))} style={local.rangeInput} />
             </div>
           </div>

           {selectedCityData && (
              <div style={{marginTop: 'auto', paddingTop: '20px'}}>
                  <div style={{padding: '15px', background: 'var(--bg-app)', borderRadius: '12px', border: '1px dashed var(--border)'}}>
                     <p style={{fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.6'}}>
                       Base de <strong>{selectedCityData.city}</strong>: {selectedCityData.currentBase} clientes.<br/>
                       Para crescer <strong>{simGrowthPerc}%</strong>, o alvo é <strong>+{targetNetAdds}</strong> líquidos.<br/>
                       Com churn de <strong>{simChurnPerc}%</strong> ({projectedChurnVol}), requer <strong>{requiredGrossAdds} Vendas Brutas</strong>.
                     </p>
                  </div>
              </div>
           )}
        </div>

        <div style={{flex: 1.5, minWidth: '400px', display:'flex', flexDirection:'column', gap: '20px'}}>
           {errorMsg ? (
             <div style={{...global.emptyState, borderColor: '#ef4444', color: '#ef4444'}}>
               <AlertTriangle size={32} style={{marginBottom: '10px'}} />
               <p>{errorMsg}</p>
             </div>
           ) : selectedCityData && (
             <div style={{...global.card, display:'flex', flexDirection:'column'}}>
               <h3 style={{fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 20px 0'}}>SLA de Vendas (Acordo de Nível)</h3>
               <p style={{fontSize: '13px', color: 'var(--text-muted)', marginBottom: '25px'}}>Distribuição das metas brutas por canal baseada na tração histórica:</p>

               <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px'}}>
                  <div style={local.slaBox}><Store size={20} color="#10b981"/> <div><span>Loja Oquei</span><strong>{distLoja} vendas</strong></div></div>
                  <div style={local.slaBox}><MapPin size={20} color="#ea580c"/> <div><span>Equipe PAP</span><strong>{distPap} vendas</strong></div></div>
                  <div style={local.slaBox}><Headset size={20} color="#2563eb"/> <div><span>Central</span><strong>{distCentral} vendas</strong></div></div>
                  <div style={local.slaBox}><Briefcase size={20} color="#9333ea"/> <div><span>B2B Empresas</span><strong>{distB2b} vendas</strong></div></div>
               </div>
             </div>
           )}

           <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
               {growthInsight && (
                 <div style={{...local.insightBox, background: growthInsight.bg, borderColor: growthInsight.color + '40'}}>
                    <div style={{...local.insightIcon, color: growthInsight.color}}><growthInsight.icon size={20} /></div>
                    <div><h4 style={{margin:0, color: growthInsight.color, fontSize:'14px', fontWeight:'800'}}>{growthInsight.title}</h4><p style={{margin:0, color: 'var(--text-main)', fontSize:'12px'}}>{growthInsight.message}</p></div>
                 </div>
               )}
               {churnInsight && (
                 <div style={{...local.insightBox, background: churnInsight.bg, borderColor: churnInsight.color + '40'}}>
                    <div style={{...local.insightIcon, color: churnInsight.color}}><churnInsight.icon size={20} /></div>
                    <div><h4 style={{margin:0, color: churnInsight.color, fontSize:'14px', fontWeight:'800'}}>{churnInsight.title}</h4><p style={{margin:0, color: 'var(--text-main)', fontSize:'12px'}}>{churnInsight.message}</p></div>
                 </div>
               )}
           </div>
        </div>
      </div>
    </div>
  );
};


// --- COMPONENTE PRINCIPAL ---
export default function LaboratorioChurn({ userData }) {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  
  const DEFAULT_TABS = [
    { id: 'radar', label: 'Radar de Cidades', icon: Crosshair },
    { id: 'projecoes', label: 'Fechamento', icon: Zap },
    { id: 'inteligencia', label: 'Inteligência S&OP', icon: Lightbulb },
    { id: 'omnichannel', label: 'Vendas Omnichannel', icon: Share2 },
    { id: 'relacionamento', label: 'Churn & Motivos', icon: Headset }
  ];

  const [tabsOrder, setTabsOrder] = useState(() => {
    const saved = localStorage.getItem('oquei_churn_tabs');
    if (saved) return JSON.parse(saved);
    return DEFAULT_TABS.map(t => t.id);
  });

  const [activeLabTab, setActiveLabTab] = useState(tabsOrder[0] || 'radar');
  const [draggedTab, setDraggedTab] = useState(null);

  const [cityMetrics, setCityMetrics] = useState([]);
  const [actionPlans, setActionPlans] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState({ title: '', problem: '', expected: '', relatedReason: '' });

  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryType, setEntryType] = useState('sales'); 
  const [entryForm, setEntryForm] = useState({ 
    month: selectedMonth, cityId: '', 
    pap: '', b2b: '', central: '', 
    concorrencia: '', tecnico: '', mudanca: '', financeiro: '', outros: '' 
  });

  const CHURN_REASONS = [
    { id: 'concorrencia', label: 'Concorrência', color: '#ef4444' },
    { id: 'tecnico', label: 'Suporte Técnico', color: '#f59e0b' },
    { id: 'mudanca', label: 'Mudança Endereço', color: '#64748b' },
    { id: 'financeiro', label: 'Financeiro', color: '#3b82f6' },
    { id: 'outros', label: 'Outros', color: '#94a3b8' }
  ];

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      const mockMetrics = [
        { id: '1', city: 'Bady Bassitt', hps: 5000, baseStart: 1200, targetNetAdds: 50, channels: { loja: 25, pap: 15, central: 5, b2b: 5 }, cancelReasons: { concorrencia: 8, tecnico: 5, mudanca: 4, financeiro: 3, outros: 0 }, histAvgGrowth: 3.2, histAvgChurn: 1.8 },
        { id: '2', city: 'Borborema', hps: 3500, baseStart: 850, targetNetAdds: 20, channels: { loja: 10, pap: 5, central: 2, b2b: 0 }, cancelReasons: { concorrencia: 15, tecnico: 5, mudanca: 2, financeiro: 3, outros: 0 }, histAvgGrowth: 1.5, histAvgChurn: 2.8 },
        { id: '3', city: 'Nova Aliança', hps: 2000, baseStart: 1700, targetNetAdds: 10, channels: { loja: 15, pap: 1, central: 2, b2b: 0 }, cancelReasons: { concorrencia: 2, tecnico: 1, mudanca: 1, financeiro: 1, outros: 0 }, histAvgGrowth: 0.8, histAvgChurn: 0.6 },
        { id: '4', city: 'Nova Granada', hps: 4200, baseStart: 950, targetNetAdds: 30, channels: { loja: 20, pap: 10, central: 8, b2b: 2 }, cancelReasons: { concorrencia: 5, tecnico: 2, mudanca: 5, financeiro: 3, outros: 0 }, histAvgGrowth: 2.5, histAvgChurn: 1.4 }
      ];
      setCityMetrics(mockMetrics);
      setLoading(false);
    }, 600);
  }, [selectedMonth]);

  const globalCalendar = useMemo(() => {
    const parts = selectedMonth.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1; 
    const lastDay = new Date(y, m + 1, 0).getDate();
    let total = 0, worked = 0;
    const now = new Date();
    for (let i = 1; i <= lastDay; i++) {
        const dateObj = new Date(y, m, i);
        if (dateObj.getDay() === 0 || dateObj.getDay() === 6) continue;
        total++;
        if (new Date(y, m, i) <= now) worked++;
    }
    return { total: total || 22, worked: worked || 1, remaining: (total - worked) || 0 };
  }, [selectedMonth]);

  const processedData = useMemo(() => {
    const { worked, total } = globalCalendar;
    const workRatio = worked > 0 ? (total / worked) : 1;
    return cityMetrics.map(city => {
      const gross = Object.values(city.channels).reduce((a, b) => a + b, 0);
      const churn = Object.values(city.cancelReasons).reduce((a, b) => a + b, 0);
      const net = gross - churn;
      const rate = ((churn / city.baseStart) * 100).toFixed(1);
      const targetReached = city.targetNetAdds > 0 ? Math.min((net / city.targetNetAdds) * 100, 100).toFixed(0) : 0;
      return {
        ...city, totalSales: gross, cancelations: churn, netAdds: net, currentBase: city.baseStart + net, churnRate: rate, penetration: (( (city.baseStart + net) / city.hps ) * 100).toFixed(1), targetPerc: targetReached,
        projSales: Math.floor(gross * workRatio), projCancelations: Math.floor(churn * workRatio), projNetAdds: Math.floor(net * workRatio)
      };
    });
  }, [cityMetrics, globalCalendar]);

  const globalStats = useMemo(() => {
    if (processedData.length === 0) return null;
    const tBase = processedData.reduce((acc, c) => acc + c.currentBase, 0);
    const tSales = processedData.reduce((acc, c) => acc + c.totalSales, 0);
    const tCancels = processedData.reduce((acc, c) => acc + c.cancelations, 0);
    const channelsTotal = { loja: 0, pap: 0, central: 0, b2b: 0 };
    const reasonsTotal = { concorrencia: 0, tecnico: 0, mudanca: 0, financeiro: 0, outros: 0 };
    processedData.forEach(c => {
      Object.keys(channelsTotal).forEach(k => channelsTotal[k] += c.channels[k]);
      Object.keys(reasonsTotal).forEach(k => reasonsTotal[k] += c.cancelReasons[k]);
    });
    return { tBase, tSales, tCancels, tNet: tSales - tCancels, avgChurn: ((tCancels / (tBase - (tSales - tCancels))) * 100).toFixed(2), channelsTotal, reasonsTotal };
  }, [processedData]);

  const handleDragStart = (id) => setDraggedTab(id);
  const handleDrop = (targetId) => {
    if (draggedTab === targetId) return;
    const newOrder = [...tabsOrder];
    const dIdx = newOrder.indexOf(draggedTab);
    const tIdx = newOrder.indexOf(targetId);
    newOrder.splice(dIdx, 1);
    newOrder.splice(tIdx, 0, draggedTab);
    setTabsOrder(newOrder);
    localStorage.setItem('oquei_churn_tabs', JSON.stringify(newOrder));
  };

  const handleSavePlan = (e) => {
    e.preventDefault();
    setActionPlans([{ id: Date.now().toString(), city: selectedCity.city, ...planForm, status: 'Planejado' }, ...actionPlans]);
    setShowPlanModal(false);
    setPlanForm({ title: '', problem: '', expected: '', relatedReason: '' });
  };

  const handleSaveDataEntry = (e) => {
    e.preventDefault();
    const updated = cityMetrics.map(city => {
      if (city.id === entryForm.cityId) {
        if (entryType === 'sales') return { ...city, channels: { ...city.channels, pap: parseInt(entryForm.pap), central: parseInt(entryForm.central), b2b: parseInt(entryForm.b2b) } };
        return { ...city, cancelReasons: { ...city.cancelReasons, concorrencia: parseInt(entryForm.concorrencia), tecnico: parseInt(entryForm.tecnico), mudanca: parseInt(entryForm.mudanca), financeiro: parseInt(entryForm.financeiro), outros: parseInt(entryForm.outros) } };
      }
      return city;
    });
    setCityMetrics(updated);
    setShowEntryModal(false);
  };

  // --- VIEWS ---
  const RadarView = () => (
    <div style={local.radarLayout}>
      <div style={local.sidebarRadar}>
        <h3 style={local.secTitle}><Crosshair size={18}/> Radar da Regional</h3>
        <div style={local.cityList}>
          {processedData.map(city => (
            <div key={city.id} onClick={() => setSelectedCity(city)} style={{...local.cityEntry, borderColor: selectedCity?.id === city.id ? 'var(--text-brand)' : 'var(--border)', background: selectedCity?.id === city.id ? 'var(--bg-app)' : 'var(--bg-card)'}}>
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                <span style={{fontWeight:'800', fontSize:'14px', color:'var(--text-main)'}}>{city.city}</span>
                <span style={{fontSize:'10px', fontWeight:'900', color: city.netAdds >=0 ? '#10b981' : '#ef4444'}}>{city.netAdds > 0 ? '+' : ''}{city.netAdds} NET</span>
              </div>
              <div style={local.miniProgress}><div style={{width: city.targetPerc + '%', background: 'var(--text-brand)', height:'100%'}}/></div>
            </div>
          ))}
        </div>
      </div>
      <div style={{...global.card, flex:1, minHeight:'500px'}}>
        {!selectedCity ? <div style={global.emptyState}><MapPin size={48} color="var(--border)" style={{marginBottom:20}}/> Selecione uma cidade para Raio-X.</div> : (
          <div style={{animation:'fadeIn 0.3s'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:30}}>
              <h2 style={global.title}>{selectedCity.city}</h2>
              <div style={{textAlign:'right'}}><span style={global.label}>Penetração HP</span><div style={{fontSize:24, fontWeight:900, color:colors.primary}}>{selectedCity.penetration}%</div></div>
            </div>
            <div style={local.funnel}>
               <div style={local.funBox}><span>Entradas</span><strong>{selectedCity.totalSales}</strong></div>
               <div style={{fontWeight:900, color:'var(--border)'}}>-</div>
               <div style={{...local.funBox, borderColor:colors.danger}}><span>Saídas</span><strong>{selectedCity.cancelations}</strong></div>
               <div style={{fontWeight:900, color:'var(--border)'}}>=</div>
               <div style={{...local.funBox, background:colors.primary, color:'white', border:'none'}}><span>Net Adds</span><strong>{selectedCity.netAdds}</strong></div>
            </div>
            <div style={{marginTop:40, paddingTop:30, borderTop:'1px solid var(--border)'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                <h3 style={{margin:0, fontWeight:900, color:'var(--text-main)', fontSize:16}}>Plano de Ações Táticas</h3>
                <button onClick={() => setShowPlanModal(true)} style={{...global.btnPrimary, padding:'8px 16px', fontSize:12}}><Plus size={14}/> Nova Ação</button>
              </div>
              <div style={{display:'flex', flexDirection:'column', gap:10}}>
                {actionPlans.filter(p => p.city === selectedCity.city).map(p => (
                  <div key={p.id} style={{padding:15, borderRadius:12, background:'var(--bg-app)', border:'1px solid var(--border)'}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:5}}><strong>{p.title}</strong><span style={{fontSize:10, color:colors.primary, fontWeight:900}}>{p.status}</span></div>
                    <p style={{margin:0, fontSize:12, color:'var(--text-muted)'}}>{p.problem}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={global.container}>
      <div style={global.header}>
        <div style={{display:'flex', alignItems:'center', gap:20}}>
          <div style={{...global.iconHeader, background:colors.primary}}><Activity size={28} color="white"/></div>
          <div><h1 style={global.title}>Laboratório Churn</h1><p style={global.subtitle}>Análise de risco e inteligência de crescimento.</p></div>
        </div>
        <div style={global.searchBox}><CalendarIcon size={18} color="var(--text-muted)"/><input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={global.searchInput}/></div>
      </div>

      {globalStats && (
        <div style={global.grid4}>
          <div style={global.card}><span style={global.label}>Base Regional</span><div style={{fontSize:32, fontWeight:900}}>{globalStats.tBase.toLocaleString()}</div></div>
          <div style={global.card}><span style={global.label}>Net Mês</span><div style={{fontSize:32, fontWeight:900, color:colors.success}}>{globalStats.tNet}</div></div>
          <div style={global.card}><span style={global.label}>Vendas Brutas</span><div style={{fontSize:32, fontWeight:900, color:colors.primary}}>{globalStats.tSales}</div></div>
          <div style={global.card}><span style={global.label}>Taxa de Churn</span><div style={{fontSize:32, fontWeight:900, color:colors.danger}}>{globalStats.avgChurn}%</div></div>
        </div>
      )}

      <div style={local.tabNav}>
        {tabsOrder.map(tid => {
          const t = DEFAULT_TABS.find(x => x.id === tid);
          return (
            <button key={tid} draggable onDragStart={() => handleDragStart(tid)} onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(tid)} onClick={() => setActiveLabTab(tid)} style={activeLabTab === tid ? local.tabActive : local.tab}>
               <GripVertical size={14} style={{opacity:0.3}}/> <t.icon size={16}/> {t.label}
            </button>
          )
        })}
      </div>

      <div style={{marginTop:30}}>
        {activeLabTab === 'radar' && <RadarView />}
        {activeLabTab === 'inteligencia' && <InteligenciaView processedData={processedData} />}
        {activeLabTab === 'omnichannel' && <div style={global.card}><h3 style={{...global.title, fontSize:20, marginBottom:20}}><Share2 size={24} color={colors.primary}/> Performance por Canal</h3><button onClick={() => {setEntryType('sales'); setShowEntryModal(true)}} style={global.btnPrimary}><UploadCloud size={16}/> Lançar Canais Externos</button></div>}
        {activeLabTab === 'relacionamento' && <div style={global.card}><h3 style={{...global.title, fontSize:20, marginBottom:20}}><Headset size={24} color={colors.danger}/> Gestão de Evasão</h3><button onClick={() => {setEntryType('churn'); setShowEntryModal(true)}} style={{...global.btnPrimary, background:colors.danger}}><UploadCloud size={16}/> Lançar Motivos de Saída</button></div>}
        {activeLabTab === 'projecoes' && (
          <div style={global.grid4}>
            {processedData.map(c => (
              <div key={c.id} style={global.card}>
                <h4 style={{margin:0, fontSize:15, fontWeight:900}}>{c.city}</h4>
                <div style={{marginTop:15, display:'flex', flexDirection:'column', gap:8}}>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:12}}><span>Proj. Gross</span><strong>{c.projSales}</strong></div>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:12}}><span>Proj. Churn</span><strong>{c.projCancelations}</strong></div>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:12, color:colors.success, fontWeight:800}}><span>Proj. Net</span><strong>{c.projNetAdds}</strong></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAIS (MANTIDOS ORIGINAIS) */}
      {showPlanModal && (
        <div style={global.modalOverlay}><div style={global.modalBox}>
          <div style={global.modalHeader}><h3 style={global.modalTitle}>Prescrever Ação - {selectedCity?.city}</h3><button onClick={() => setShowPlanModal(false)} style={global.closeBtn}><X/></button></div>
          <form onSubmit={handleSavePlan} style={global.form}>
            <div style={global.field}><label style={global.label}>Título</label><input style={global.input} value={planForm.title} onChange={e => setPlanForm({...planForm, title: e.target.value})} required/></div>
            <div style={global.field}><label style={global.label}>Problema Foco</label><textarea style={global.textarea} value={planForm.problem} onChange={e => setPlanForm({...planForm, problem: e.target.value})} required/></div>
            <button style={global.btnPrimary}>Iniciar Plano</button>
          </form>
        </div></div>
      )}

      {showEntryModal && (
        <div style={global.modalOverlay}><div style={global.modalBox}>
          <div style={global.modalHeader}><h3 style={global.modalTitle}>{entryType==='sales'?'Lançar Vendas':'Lançar Churn'}</h3><button onClick={() => setShowEntryModal(false)} style={global.closeBtn}><X/></button></div>
          <form onSubmit={handleSaveDataEntry} style={global.form}>
            <div style={global.field}><label style={global.label}>Cidade</label><select style={global.select} value={entryForm.cityId} onChange={e => setEntryForm({...entryForm, cityId: e.target.value})} required><option value="">Selecione...</option>{processedData.map(c=><option value={c.id} key={c.id}>{c.city}</option>)}</select></div>
            {entryType === 'sales' ? (
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                <div style={global.field}><label style={global.label}>PAP</label><input type="number" style={global.input} value={entryForm.pap} onChange={e=>setEntryForm({...entryForm, pap:e.target.value})}/></div>
                <div style={global.field}><label style={global.label}>Central</label><input type="number" style={global.input} value={entryForm.central} onChange={e=>setEntryForm({...entryForm, central:e.target.value})}/></div>
              </div>
            ) : (
              <div style={global.field}><label style={global.label}>Concorrência</label><input type="number" style={global.input} value={entryForm.concorrencia} onChange={e=>setEntryForm({...entryForm, concorrencia:e.target.value})}/></div>
            )}
            <button style={global.btnPrimary}>Salvar Lançamentos</button>
          </form>
        </div></div>
      )}
    </div>
  );
}

const local = {
  tabNav: { display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '1px', overflowX: 'auto', marginBottom: 20 },
  tab: { background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '12px 18px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '3px solid transparent', whiteSpace: 'nowrap' },
  tabActive: { background: 'transparent', border: 'none', color: 'var(--text-brand)', padding: '12px 18px', fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '3px solid var(--text-brand)', whiteSpace: 'nowrap' },
  radarLayout: { display: 'flex', gap: 30, flexWrap: 'wrap' },
  sidebarRadar: { width: 300, display: 'flex', flexDirection: 'column', gap: 15 },
  secTitle: { fontSize: 14, fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 },
  cityList: { display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '600px', overflowY: 'auto' },
  cityEntry: { padding: 15, borderRadius: 16, border: '1px solid', cursor: 'pointer', transition: '0.2s' },
  miniProgress: { width: '100%', height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' },
  funnel: { display: 'flex', gap: 15, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  funBox: { padding: 20, borderRadius: 20, border: '2px solid var(--border)', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', gap: 5 },
  rangeInput: { width: '100%', cursor: 'pointer', accentColor: 'var(--text-brand)' },
  insightBox: { padding: 15, borderRadius: 16, border: '1px solid', display: 'flex', gap: 15, alignItems: 'center' },
  insightIcon: { width: 40, height: 40, borderRadius: 10, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  slaBox: { background: 'var(--bg-app)', padding: 15, borderRadius: 12, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }
};