import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  Activity, TrendingDown, TrendingUp, Target, MapPin, 
  Plus, Crosshair, Users, X, CheckCircle, PieChart, 
  Share2, ShieldAlert, AlertTriangle, Headset, Briefcase, 
  BarChart3, Store, Calendar as CalendarIcon, UploadCloud, Zap, 
  Lightbulb, Sliders, GripVertical, AlertOctagon, Info, ShieldCheck,
  RefreshCw
} from 'lucide-react';

import { styles as global, colors } from '../styles/globalStyles';

// --- COMPONENTE: INTELIGÊNCIA S&OP ---
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
  let targetNetAdds = 0, projectedChurnVol = 0, requiredGrossAdds = 0;
  let distLoja = 0, distPap = 0, distCentral = 0, distB2b = 0;
  
  if (selectedCityData) {
    const base = selectedCityData.currentBase;
    targetNetAdds = Math.ceil(base * (simGrowthPerc / 100));
    projectedChurnVol = Math.ceil(base * (simChurnPerc / 100));
    requiredGrossAdds = targetNetAdds + projectedChurnVol;

    const hist = selectedCityData.channels;
    const histTotal = (hist.loja || 0) + (hist.pap || 0) + (hist.central || 0) + (hist.b2b || 0);

    if (histTotal > 0) {
      distLoja = Math.round(requiredGrossAdds * (hist.loja / histTotal));
      distPap = Math.round(requiredGrossAdds * (hist.pap / histTotal));
      distCentral = Math.round(requiredGrossAdds * (hist.central / histTotal));
      distB2b = requiredGrossAdds - (distLoja + distPap + distCentral); 
    }
  }

  return (
    <div className="animated-view">
      <div style={{display:'flex', gap:'30px', flexWrap:'wrap'}}>
        <div style={{...global.card, flex:1, minWidth:'300px'}}>
           <h3 style={{fontSize:'16px', fontWeight:'900', marginBottom:'20px', display:'flex', alignItems:'center', gap:'10px'}}><Sliders size={20} color={colors.primary}/> Parâmetros da Cidade</h3>
           <div style={global.field}><label style={global.label}>Cidade</label>
             <select style={global.select} value={simCityId} onChange={e => setSimCityId(e.target.value)}>
               {processedData.map(c => <option key={c.id} value={c.id}>{c.city}</option>)}
             </select>
           </div>
           <div style={global.field}><label style={global.label}>Meta Crescimento: <strong>{simGrowthPerc}%</strong></label>
             <input type="range" min="-2" max="10" step="0.1" value={simGrowthPerc} onChange={e => setSimGrowthPerc(parseFloat(e.target.value))} style={local.rangeInput} />
           </div>
           <div style={global.field}><label style={global.label}>Trava de Churn: <strong>{simChurnPerc}%</strong></label>
             <input type="range" min="0" max="5" step="0.1" value={simChurnPerc} onChange={e => setSimChurnPerc(parseFloat(e.target.value))} style={local.rangeInput} />
           </div>
        </div>
        <div style={{flex:1.5, minWidth:'400px', display:'flex', flexDirection:'column', gap:'20px'}}>
           {selectedCityData && (
             <div style={global.card}>
                <h4 style={{margin:'0 0 15px 0', fontSize:'15px', color:'var(--text-muted)'}}>SLA DE VENDAS (MENSAL)</h4>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                   <div style={local.slaBox}><Store size={18} color={colors.success}/> <div><span>Lojas</span><strong>{distLoja}</strong></div></div>
                   <div style={local.slaBox}><MapPin size={18} color={colors.warning}/> <div><span>PAP</span><strong>{distPap}</strong></div></div>
                   <div style={local.slaBox}><Headset size={18} color={colors.primary}/> <div><span>Central</span><strong>{distCentral}</strong></div></div>
                   <div style={local.slaBox}><Briefcase size={18} color={colors.purple}/> <div><span>B2B</span><strong>{distB2b}</strong></div></div>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function LaboratorioChurn({ userData }) {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  
  const [leads, setLeads] = useState([]);
  const [cities, setCities] = useState([]);
  const [actionPlans, setActionPlans] = useState([]);

  const DEFAULT_TABS = [
    { id: 'radar', label: 'Radar de Cidades', icon: Crosshair },
    { id: 'projecoes', label: 'Fechamento', icon: Zap },
    { id: 'inteligencia', label: 'Inteligência S&OP', icon: Lightbulb },
    { id: 'omnichannel', label: 'Canais de Venda', icon: Share2 },
    { id: 'relacionamento', label: 'Gestão Churn', icon: Headset }
  ];

  const [tabsOrder, setTabsOrder] = useState(() => {
    const saved = localStorage.getItem('oquei_churn_tabs');
    return saved ? JSON.parse(saved) : DEFAULT_TABS.map(t => t.id);
  });

  const [activeLabTab, setActiveLabTab] = useState(tabsOrder[0]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [draggedTab, setDraggedTab] = useState(null);
  const [planForm, setPlanForm] = useState({ title: '', problem: '', expected: '', relatedReason: 'concorrencia' });

  // 1. ESCUTA DE DADOS REAIS (FIREBASE)
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      setLoading(true);
      const unsubs = [];
      const isCoord = userData?.role === 'coordinator';
      const myCluster = String(userData?.clusterId || "").trim();

      const safeListen = (ref, setter) => {
        unsubs.push(onSnapshot(ref, snap => setter(snap.docs.map(d => ({ id: d.id, ...d.data() }))), err => console.warn("Erro Coleção:", err)));
      };

      safeListen(collection(db, 'leads'), setLeads);
      safeListen(collection(db, 'action_plans'), setActionPlans);
      
      const qCities = isCoord ? collection(db, 'cities') : query(collection(db, 'cities'), where('clusterId', '==', myCluster));
      safeListen(qCities, setCities);

      setLoading(false);
      return () => unsubs.forEach(u => u());
    });
    return () => unsubAuth();
  }, [userData]);

  // 2. MOTOR DE CALCULO (BI ENGINE)
  const processedData = useMemo(() => {
    const monthLeads = leads.filter(l => l.date?.startsWith(selectedMonth));
    const today = new Date();
    const worked = today.getDate() > 22 ? 22 : today.getDate(); // Simplificação para Run Rate
    const workRatio = 22 / worked;

    return cities.map(city => {
      const cityLeads = monthLeads.filter(l => l.cityId === city.id || l.cityId === city.name);
      const gross = cityLeads.filter(l => ['Contratado', 'Instalado'].includes(l.status)).length;
      const churn = cityLeads.filter(l => l.status === 'Descartado').length;
      const net = gross - churn;

      // SINCRONIZAÇÃO COM O HUB: Usa baseStart como fonte da verdade
      const baseStart = city.baseStart || 0; 
      const currentBase = baseStart + net;
      const hps = city.hps || 1;

      return {
        ...city,
        city: city.name || city.city,
        totalSales: gross, cancelations: churn, netAdds: net,
        currentBase, penetration: ((currentBase / hps) * 100).toFixed(1),
        churnRate: baseStart > 0 ? ((churn / baseStart) * 100).toFixed(1) : 0,
        targetPerc: city.targetNetAdds > 0 ? ((net / city.targetNetAdds) * 100).toFixed(0) : 0,
        projNetAdds: Math.floor(net * workRatio),
        channels: {
          loja: cityLeads.filter(l => l.channel === 'Loja').length,
          pap: cityLeads.filter(l => l.channel === 'PAP').length,
          central: cityLeads.filter(l => l.channel === 'Central').length,
          b2b: cityLeads.filter(l => l.channel === 'B2B').length
        }
      };
    });
  }, [leads, cities, selectedMonth]);

  // 3. KPI GLOBAIS (OS QUE VOLTARAM)
  const globalStats = useMemo(() => {
    if (processedData.length === 0) return null;
    const tBase = processedData.reduce((acc, c) => acc + c.currentBase, 0);
    const tSales = processedData.reduce((acc, c) => acc + c.totalSales, 0);
    const tCancels = processedData.reduce((acc, c) => acc + c.cancelations, 0);
    const tNet = tSales - tCancels;
    const avgChurn = tBase > 0 ? ((tCancels / (tBase - tNet)) * 100).toFixed(2) : 0;

    return { tBase, tSales, tCancels, tNet, avgChurn };
  }, [processedData]);

  // 4. FUNÇÕES DE UI
  const handleSavePlan = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'action_plans'), {
        ...planForm, cityId: selectedCity.id, city: selectedCity.city, status: 'Ativo', createdAt: serverTimestamp(), createdBy: auth.currentUser.uid
      });
      setShowPlanModal(false);
      setPlanForm({ title: '', problem: '', expected: '', relatedReason: 'concorrencia' });
    } catch (err) { console.error(err); }
  };

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

  if (loading) return <div style={global.emptyState}><RefreshCw className="animate-spin"/> Sincronizando Inteligência...</div>;

  return (
    <div style={global.container}>
      {/* HEADER */}
      <div style={global.header}>
        <div style={{display:'flex', alignItems:'center', gap:20}}>
          <div style={{...global.iconHeader, background:colors.primary}}><Activity size={28} color="white"/></div>
          <div><h1 style={global.title}>Laboratório Churn</h1><p style={global.subtitle}>Inteligência de Crescimento e S&OP</p></div>
        </div>
        <div style={global.searchBox}><CalendarIcon size={18}/><input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={global.searchInput}/></div>
      </div>

      {/* KPIS GLOBAIS (RESTAURADOS) */}
      {globalStats && (
        <div style={{...global.grid4, marginBottom: '30px'}}>
          <div style={global.card}><span style={global.label}>Base Regional</span><div style={{fontSize:32, fontWeight:900, color:'var(--text-main)'}}>{globalStats.tBase.toLocaleString()}</div></div>
          <div style={global.card}><span style={global.label}>Net Mês</span><div style={{fontSize:32, fontWeight:900, color:colors.success}}>{globalStats.tNet > 0 ? '+' : ''}{globalStats.tNet}</div></div>
          <div style={global.card}><span style={global.label}>Vendas Brutas</span><div style={{fontSize:32, fontWeight:900, color:colors.primary}}>{globalStats.tSales}</div></div>
          <div style={global.card}><span style={global.label}>Taxa de Churn</span><div style={{fontSize:32, fontWeight:900, color:colors.danger}}>{globalStats.avgChurn}%</div></div>
        </div>
      )}

      {/* NAVEGAÇÃO DE ABAS */}
      <div style={local.tabNav}>
        {tabsOrder.map(tid => {
          const t = DEFAULT_TABS.find(x => x.id === tid);
          if (!t) return null;
          return (
            <button key={tid} draggable onDragStart={() => handleDragStart(tid)} onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(tid)} onClick={() => setActiveLabTab(tid)} style={activeLabTab === tid ? local.tabActive : local.tab}>
               <GripVertical size={14} style={{opacity:0.3}}/> <t.icon size={16}/> {t.label}
            </button>
          )
        })}
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <div style={{marginTop:30}}>
        {activeLabTab === 'radar' && (
          <div style={local.radarLayout}>
            <div style={local.sidebarRadar}>
              <h3 style={local.secTitle}>Regional</h3>
              <div style={local.cityList}>
                {processedData.map(city => (
                  <div key={city.id} onClick={() => setSelectedCity(city)} style={{...local.cityEntry, borderColor: selectedCity?.id === city.id ? colors.primary : 'var(--border)', background: selectedCity?.id === city.id ? 'var(--bg-app)' : 'var(--bg-card)'}}>
                    <div style={{display:'flex', justifyContent:'space-between'}}><strong>{city.city}</strong> <span style={{color: city.netAdds >= 0 ? colors.success : colors.danger}}>{city.netAdds} NET</span></div>
                    <div style={local.miniProgress}><div style={{width: city.targetPerc + '%', background: colors.primary, height:'100%'}}/></div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{...global.card, flex:1, minHeight: '500px'}}>
              {!selectedCity ? <div style={global.emptyState}>Selecione uma unidade no radar lateral.</div> : (
                <div className="animated-view">
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:30}}>
                    <h2 style={global.title}>{selectedCity.city}</h2>
                    <div style={{textAlign:'right'}}><span style={global.label}>Penetração</span><div style={{fontSize:24, fontWeight:900, color:colors.primary}}>{selectedCity.penetration}%</div></div>
                  </div>
                  <div style={local.funnel}>
                    <div style={local.funBox}><span>Entradas (Gross)</span><strong>{selectedCity.totalSales}</strong></div>
                    <div style={{fontWeight:900, color:'var(--border)'}}>-</div>
                    <div style={{...local.funBox, borderColor:colors.danger}}><span>Saídas (Churn)</span><strong>{selectedCity.cancelations}</strong></div>
                    <div style={{fontWeight:900, color:'var(--border)'}}>=</div>
                    <div style={{...local.funBox, background:colors.primary, color:'white', border:'none'}}><span>Net Adds</span><strong>{selectedCity.netAdds}</strong></div>
                  </div>
                  <div style={{marginTop:40, paddingTop:20, borderTop:'1px solid var(--border)'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                      <h3 style={local.secTitle}>Planos de Ação</h3>
                      <button onClick={() => setShowPlanModal(true)} style={{...global.btnPrimary, padding:'8px 16px', fontSize:12}}><Plus size={14}/> Nova Ação</button>
                    </div>
                    <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                       {actionPlans.filter(p => p.cityId === selectedCity.id).map(p => (
                         <div key={p.id} style={local.planCard}><strong>{p.title}</strong><p style={{margin:0, fontSize:12, color:'var(--text-muted)'}}>{p.problem}</p></div>
                       ))}
                       {actionPlans.filter(p => p.cityId === selectedCity.id).length === 0 && <p style={{fontSize:'13px', color:'var(--text-muted)', fontStyle:'italic'}}>Nenhum plano ativo para esta praça.</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeLabTab === 'inteligencia' && <InteligenciaView processedData={processedData} />}
        
        {activeLabTab === 'projecoes' && (
          <div style={global.grid4}>
            {processedData.map(c => (
              <div key={c.id} style={global.card}>
                <h4 style={{margin:0, fontWeight:900}}>{c.city}</h4>
                <div style={{marginTop:15, display:'flex', flexDirection:'column', gap:8, fontSize:12}}>
                  <div style={{display:'flex', justifyContent:'space-between'}}><span>Projeção Final</span><strong style={{color:colors.success}}>{c.projNetAdds} NET</strong></div>
                  <div style={{display:'flex', justifyContent:'space-between'}}><span>Churn Real</span><strong>{c.churnRate}%</strong></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL PLANOS DE AÇÃO */}
      {showPlanModal && (
        <div style={global.modalOverlay}><div style={global.modalBox}>
          <div style={global.modalHeader}><h3>Nova Ação: {selectedCity?.city}</h3><button onClick={() => setShowPlanModal(false)}><X/></button></div>
          <form onSubmit={handleSavePlan} style={global.form}>
            <div style={global.field}><label style={global.label}>Título da Iniciativa</label><input style={global.input} value={planForm.title} onChange={e => setPlanForm({...planForm, title:e.target.value})} required placeholder="Ex: Mutirão de Retenção Bairro X"/></div>
            <div style={global.field}><label style={global.label}>Problema Foco</label><textarea style={global.textarea} value={planForm.problem} onChange={e => setPlanForm({...planForm, problem:e.target.value})} required placeholder="Descreva o que motivou a ação..."/></div>
            <button style={global.btnPrimary}>Salvar e Iniciar</button>
          </form>
        </div></div>
      )}
    </div>
  );
}

const local = {
  tabNav: { display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: 20 },
  tab: { background: 'transparent', border: 'none', color: 'var(--text-muted)', padding: '12px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight:'700', whiteSpace:'nowrap' },
  tabActive: { background: 'transparent', border: 'none', color: 'var(--text-brand)', padding: '12px 18px', fontWeight: '800', borderBottom: '3px solid var(--text-brand)', display:'flex', alignItems:'center', gap:'8px', whiteSpace:'nowrap' },
  radarLayout: { display: 'flex', gap: 30, flexWrap:'wrap' },
  sidebarRadar: { width: 300, display: 'flex', flexDirection: 'column', gap: 15 },
  cityList: { display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '600px', overflowY: 'auto' },
  cityEntry: { padding: 15, borderRadius: 12, border: '1px solid', cursor: 'pointer', transition:'0.2s' },
  miniProgress: { width: '100%', height: 4, background: 'var(--border)', borderRadius: 2, marginTop: 10, overflow:'hidden' },
  funnel: { display: 'flex', gap: 15, alignItems:'center', justifyContent:'center', marginTop: 20 },
  funBox: { padding: 20, borderRadius: 16, border: '2px solid var(--border)', flex: 1, textAlign: 'center', display:'flex', flexDirection:'column', gap:5 },
  secTitle: { fontSize: 13, fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-muted)', margin:0 },
  rangeInput: { width: '100%', accentColor: colors.primary, cursor: 'pointer' },
  slaBox: { background: 'var(--bg-app)', padding: 12, borderRadius: 10, border: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' },
  insightBox: { padding: 15, background: 'var(--bg-card)', borderRadius: 12, display: 'flex', gap: 12, alignItems: 'center', boxShadow:'var(--shadow-sm)' },
  planCard: { padding: 15, background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 10 }
};