import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  Activity, TrendingDown, TrendingUp, Target, MapPin, 
  Plus, Crosshair, Users, X, CheckCircle, PieChart as PieIcon, 
  Share2, ShieldAlert, AlertTriangle, Headset, Briefcase, 
  BarChart3, Store, Calendar as CalendarIcon, Zap, 
  Lightbulb, Sliders, GripVertical, AlertOctagon, Info, ShieldCheck,
  RefreshCw, ChevronRight, BarChart as BarIcon
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line } from 'recharts';

import { styles as global, colors } from '../styles/globalStyles';

// --- COMPONENTE: INTELIGÊNCIA S&OP (COM ANÁLISE DE REALISMO) ---
const InteligenciaView = ({ processedData }) => {
  const [simCityId, setSimCityId] = useState('');
  const [simGrowthPerc, setSimGrowthPerc] = useState(2.0); 
  const [simChurnPerc, setSimChurnPerc] = useState(1.5); 

  useEffect(() => {
    if (processedData.length > 0 && !simCityId) setSimCityId(processedData[0].id);
  }, [processedData, simCityId]);

  const selectedCityData = processedData.find(c => c.id === simCityId);
  
  // Lógica de Cálculo e Insights (O Cérebro do S&OP)
  const baseClientes = Math.max(selectedCityData?.currentBase || 0, 100);
  const histGrowth = parseFloat(selectedCityData?.histAvgGrowth) || 1.5;
  const histChurn = parseFloat(selectedCityData?.histAvgChurn) || 1.2;

  const tNetAdds = Math.ceil(baseClientes * (simGrowthPerc / 100));
  const pChurnVol = Math.ceil(baseClientes * (simChurnPerc / 100));
  const rGrossAdds = Math.max(tNetAdds + pChurnVol, 1);

  // Distribuição de Canais (SLA)
  const channels = selectedCityData?.channels || { loja: 0, pap: 0, central: 0, b2b: 0 };
  const totalHist = (channels.loja || 0) + (channels.pap || 0) + (channels.central || 0) + (channels.b2b || 0);
  
  const dLoja = totalHist > 0 ? Math.round(rGrossAdds * (channels.loja / totalHist)) : Math.round(rGrossAdds * 0.4);
  const dPap = totalHist > 0 ? Math.round(rGrossAdds * (channels.pap / totalHist)) : Math.round(rGrossAdds * 0.3);
  const dCentral = totalHist > 0 ? Math.round(rGrossAdds * (channels.central / totalHist)) : Math.round(rGrossAdds * 0.2);
  const dB2b = Math.max(0, rGrossAdds - (dLoja + dPap + dCentral));

  // ANALISADOR DE METAS (O QUE TINHA SIDO PERDIDO)
  const getInsights = () => {
    const analysis = [];
    if (simGrowthPerc > histGrowth * 2.5) {
      analysis.push({ title: "Meta Utópica", msg: `Crescer ${simGrowthPerc}% em ${selectedCityData?.city} é irreal contra o histórico de ${histGrowth}%.`, color: "#ef4444", icon: AlertOctagon });
    } else if (simGrowthPerc > histGrowth * 1.5) {
      analysis.push({ title: "Meta Agressiva", msg: "Exige investimento em marketing e reforço de equipes externas.", color: "#f59e0b", icon: Target });
    } else {
      analysis.push({ title: "Meta Realista", msg: "Alinhada com a tração natural da unidade.", color: "#10b981", icon: CheckCircle });
    }

    if (simChurnPerc < histChurn * 0.5) {
      analysis.push({ title: "Retenção Crítica", msg: `Reduzir churn para ${simChurnPerc}% requer auditoria imediata de rede.`, color: "#8b5cf6", icon: ShieldAlert });
    }
    return analysis;
  };

  const insights = getInsights();

  return (
    <div style={{ animation: 'slideUp 0.5s ease-out forwards' }}>
      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        <div style={{ ...global.card, flex: 1, minWidth: '320px' }}>
          <h3 style={local.secTitle}><Sliders size={18}/> PARÂMETROS DE SIMULAÇÃO</h3>
          <div style={global.field}><label style={global.label}>Unidade</label>
            <select style={global.select} value={simCityId} onChange={e => setSimCityId(e.target.value)}>
              {processedData.map(c => <option key={c.id} value={c.id}>{c.city}</option>)}
            </select>
          </div>
          <div style={{...global.field, marginTop: '20px'}}><label style={global.label}>Crescimento Líquido: <strong>{simGrowthPerc}%</strong></label>
            <input type="range" min="-2" max="10" step="0.1" value={simGrowthPerc} onChange={e => setSimGrowthPerc(parseFloat(e.target.value))} style={local.rangeInput} />
          </div>
          <div style={{...global.field, marginTop: '20px'}}><label style={global.label}>Limite de Churn: <strong>{simChurnPerc}%</strong></label>
            <input type="range" min="0" max="5" step="0.1" value={simChurnPerc} onChange={e => setSimChurnPerc(parseFloat(e.target.value))} style={local.rangeInput} />
          </div>
        </div>

        <div style={{ flex: 1.5, minWidth: '400px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={global.card}>
            <h4 style={local.secTitle}>SLA DE VENDAS NECESSÁRIO</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={local.slaBox}><Store size={18} color="#10b981" /> <div><span>Lojas</span><strong>{dLoja}</strong></div></div>
              <div style={local.slaBox}><MapPin size={18} color="#f59e0b" /> <div><span>PAP</span><strong>{dPap}</strong></div></div>
              <div style={local.slaBox}><Headset size={18} color="#2563eb" /> <div><span>Central</span><strong>{dCentral}</strong></div></div>
              <div style={local.slaBox}><Briefcase size={18} color="#8b5cf6" /> <div><span>B2B</span><strong>{dB2b}</strong></div></div>
            </div>
          </div>

          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            {insights.map((ins, i) => (
              <div key={i} style={{ padding: '15px', borderRadius: '16px', display: 'flex', gap: '15px', alignItems: 'center', background: `${ins.color}10`, borderLeft: `5px solid ${ins.color}` }}>
                <div style={{ color: ins.color }}><ins.icon size={22} /></div>
                <div><h4 style={{ margin: 0, color: ins.color, fontSize: '14px', fontWeight: '900' }}>{ins.title}</h4><p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-main)' }}>{ins.msg}</p></div>
              </div>
            ))}
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
  const [leads, setLeads] = useState([]);
  const [cities, setCities] = useState([]);
  const [actionPlans, setActionPlans] = useState([]);
  const [monthlyGoals, setMonthlyGoals] = useState({});

  const [activeLabTab, setActiveLabTab] = useState('radar');
  const [selectedCity, setSelectedCity] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState({ title: '', problem: '', expected: '', relatedReason: 'concorrencia' });

  // 1. SINCRONIZAÇÃO DE DADOS (CIRURGIÃO)
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      setLoading(true);
      const isCoord = userData?.role === 'coordinator' || userData?.role === 'coordenador';
      const myCluster = String(userData?.clusterId || "").trim();

      const unsubs = [
        onSnapshot(collection(db, 'leads'), snap => setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
        onSnapshot(collection(db, 'action_plans'), snap => setActionPlans(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
        onSnapshot(isCoord ? collection(db, 'cities') : query(collection(db, 'cities'), where('clusterId', '==', myCluster)), snap => {
          const cList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setCities(cList);
          if (cList.length > 0 && !selectedCity) setSelectedCity({ ...cList[0], city: cList[0].name || cList[0].city });
        }),
        onSnapshot(query(collection(db, "monthly_goals"), where("month", "==", selectedMonth)), snap => {
          const gMap = {}; snap.docs.forEach(d => { gMap[d.data().cityId] = d.data(); }); setMonthlyGoals(gMap);
        })
      ];
      setLoading(false);
      return () => unsubs.forEach(u => u());
    });
    return () => unsubAuth();
  }, [userData, selectedMonth]);

  // 2. MOTOR DE BI (FONTE DA VERDADE)
  const processedData = useMemo(() => {
    const monthLeads = leads.filter(l => l.date?.startsWith(selectedMonth));
    const today = new Date();
    const worked = today.getDate() > 22 ? 22 : today.getDate();
    const workRatio = 22 / (worked || 1);

    return cities.map(city => {
      const cityLeads = monthLeads.filter(l => l.cityId === city.id || l.cityId === city.name);
      
      const salesLeads = cityLeads.filter(l => ['Contratado', 'Instalado'].includes(l.status));
      const churnLeads = cityLeads.filter(l => l.status === 'Descartado');
      
      const gross = salesLeads.length;
      const churn = churnLeads.length;
      const net = gross - churn;

      const baseStart = parseFloat(city.baseStart) || 0;
      const currentBase = baseStart + net;

      // Agrupamento de Canais
      const channels = {
        loja: salesLeads.filter(l => l.channel === 'Loja').length,
        pap: salesLeads.filter(l => l.channel === 'PAP').length,
        central: salesLeads.filter(l => l.channel === 'Central').length,
        b2b: salesLeads.filter(l => l.channel === 'B2B').length
      };

      // Motivos de Churn
      const reasons = {
        concorrencia: churnLeads.filter(l => String(l.motive || "").toLowerCase().includes('concor')).length,
        tecnico: churnLeads.filter(l => String(l.motive || "").toLowerCase().includes('tec')).length,
        financeiro: churnLeads.filter(l => String(l.motive || "").toLowerCase().includes('finan')).length,
        outros: churnLeads.filter(l => !['concor', 'tec', 'finan'].some(x => String(l.motive || "").toLowerCase().includes(x))).length
      };

      return {
        ...city,
        city: city.name || city.city,
        totalSales: gross, cancelations: churn, netAdds: net,
        currentBase, 
        churnRate: baseStart > 0 ? ((churn / baseStart) * 100).toFixed(2) : "0.00",
        projNetAdds: Math.floor(net * workRatio),
        targetNetAdds: city.targetNetAdds || 20,
        channels,
        churnReasons: reasons
      };
    });
  }, [leads, cities, selectedMonth]);

  const globalStats = useMemo(() => {
    if (processedData.length === 0) return null;
    const tBase = processedData.reduce((acc, c) => acc + c.currentBase, 0);
    const tSales = processedData.reduce((acc, c) => acc + c.totalSales, 0);
    const tCancels = processedData.reduce((acc, c) => acc + c.cancelations, 0);
    return { 
      tBase, tSales, tCancels, tNet: tSales - tCancels, 
      avgChurn: tBase > 0 ? ((tCancels / tBase) * 100).toFixed(2) : "0.00" 
    };
  }, [processedData]);

  // 3. HANDLERS
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

  if (loading) return <div style={global.emptyState}><RefreshCw className="animate-spin" /></div>;

  return (
    <div style={global.container}>
      {/* HEADER INTEGRADO */}
      <div style={global.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ ...global.iconHeader, background: colors.primary }}><Activity size={28} color="white" /></div>
          <div><h1 style={global.title}>Laboratório Churn</h1><p style={global.subtitle}>Gestão Estratégica Bady Bassitt e Região</p></div>
        </div>
        <div style={global.searchBox}><CalendarIcon size={18} /><input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={global.searchInput} /></div>
      </div>

      {/* KPIS TÁTICOS */}
      {globalStats && (
        <div style={{ ...global.grid4, marginBottom: '30px' }}>
          <div style={global.card}><span style={global.label}>Base Regional</span><div style={{ fontSize: 32, fontWeight: 900 }}>{globalStats.tBase.toLocaleString()}</div></div>
          <div style={global.card}><span style={global.label}>Net Mês</span><div style={{ fontSize: 32, fontWeight: 900, color: colors.success }}>{globalStats.tNet > 0 ? '+' : ''}{globalStats.tNet}</div></div>
          <div style={global.card}><span style={global.label}>Vendas Brutas</span><div style={{ fontSize: 32, fontWeight: 900, color: colors.primary }}>{globalStats.tSales}</div></div>
          <div style={global.card}><span style={global.label}>Taxa de Churn</span><div style={{ fontSize: 32, fontWeight: 900, color: colors.danger }}>{globalStats.avgChurn}%</div></div>
        </div>
      )}

      {/* MENU DE ABAS */}
      <div style={local.tabNav}>
        <button onClick={() => setActiveLabTab('radar')} style={activeLabTab === 'radar' ? local.tabActive : local.tab}><Crosshair size={16}/> Radar de Cidades</button>
        <button onClick={() => setActiveLabTab('inteligencia')} style={activeLabTab === 'inteligencia' ? local.tabActive : local.tab}><Lightbulb size={16}/> Inteligência S&OP</button>
        <button onClick={() => setActiveLabTab('canais')} style={activeLabTab === 'canais' ? local.tabActive : local.tab}><Share2 size={16}/> Canais de Venda</button>
        <button onClick={() => setActiveLabTab('relacionamento')} style={activeLabTab === 'relacionamento' ? local.tabActive : local.tab}><Headset size={16}/> Gestão Churn</button>
        <button onClick={() => setActiveLabTab('projecoes')} style={activeLabTab === 'projecoes' ? local.tabActive : local.tab}><Zap size={16}/> Projeções</button>
      </div>

      <div style={{ marginTop: 30 }}>
        {/* ABA: RADAR (FUNCIONALIDADE COMPLETA) */}
        {activeLabTab === 'radar' && (
          <div style={local.radarLayout}>
            <div style={local.sidebarRadar}>
              <div style={local.cityList}>
                {processedData.map(city => (
                  <div key={city.id} onClick={() => setSelectedCity(city)} style={{ ...local.cityEntry, borderColor: selectedCity?.id === city.id ? colors.primary : 'var(--border)', background: selectedCity?.id === city.id ? 'var(--bg-app)' : 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{city.city}</strong> <span style={{ color: city.netAdds >= 0 ? colors.success : colors.danger }}>{city.netAdds} NET</span></div>
                    <div style={local.miniProgress}><div style={{ width: Math.min(100, (city.totalSales/city.targetNetAdds)*100) + '%', background: colors.primary, height: '100%' }} /></div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ ...global.card, flex: 1, minHeight: '500px' }}>
              {selectedCity ? (
                <div style={{animation: 'slideUp 0.4s ease-out'}}>
                  <h2 style={global.title}>{selectedCity.city}</h2>
                  <div style={local.funnel}>
                    <div style={local.funBox}><span>Vendas</span><strong>{selectedCity.totalSales}</strong></div>
                    <div style={local.funBox}><span>Evasão</span><strong>{selectedCity.cancelations}</strong></div>
                    <div style={{ ...local.funBox, background: colors.primary, color: 'white', border: 'none' }}><span>Net Adds</span><strong>{selectedCity.netAdds}</strong></div>
                  </div>
                  <div style={{marginTop: 40, borderTop: '1px solid var(--border)', paddingTop: 20}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20}}>
                       <h3 style={local.secTitle}>Planos de Ação Ativos</h3>
                       <button onClick={() => setShowPlanModal(true)} style={{...global.btnPrimary, padding: '8px 15px', fontSize: '12px'}}><Plus size={14}/> Nova Ação</button>
                    </div>
                    {actionPlans.filter(p => p.cityId === selectedCity.id).map(p => (
                      <div key={p.id} style={local.planCard}>
                        <div style={{display:'flex', justifyContent:'space-between'}}><strong>{p.title}</strong><span style={local.badge}>{p.status}</span></div>
                        <p style={{margin: '5px 0 0 0', fontSize: '12px', color: '#64748b'}}>{p.problem}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <div style={global.emptyState}>Selecione uma unidade para análise.</div>}
            </div>
          </div>
        )}

        {/* ABA: INTELIGÊNCIA (RESTAURADA) */}
        {activeLabTab === 'inteligencia' && <InteligenciaView processedData={processedData} />}

        {/* ABA: CANAIS (GRÁFICOS) */}
        {activeLabTab === 'canais' && (
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px'}}>
            <div style={global.card}>
              <h3 style={local.secTitle}>Mix de Vendas (Geral)</h3>
              <div style={{height: 300}}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[
                      { name: 'Loja', value: processedData.reduce((a,b)=>a+b.channels.loja, 0) },
                      { name: 'PAP', value: processedData.reduce((a,b)=>a+b.channels.pap, 0) },
                      { name: 'Central', value: processedData.reduce((a,b)=>a+b.channels.central, 0) },
                      { name: 'B2B', value: processedData.reduce((a,b)=>a+b.channels.b2b, 0) },
                    ]} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                      <Cell fill="#10b981" /><Cell fill="#f59e0b" /><Cell fill="#2563eb" /><Cell fill="#8b5cf6" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={global.card}>
              <h3 style={local.secTitle}>Gross Adds por Praça</h3>
              <div style={{height: 300}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processedData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="city" hide />
                    <Tooltip />
                    <Bar dataKey="totalSales" fill={colors.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ABA: RELACIONAMENTO (RESTAURADA) */}
        {activeLabTab === 'relacionamento' && (
           <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px'}}>
             <div style={global.card}>
                <h3 style={local.secTitle}>Pareto de Evasão</h3>
                <div style={{height: 300}}>
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={processedData} layout="vertical">
                         <YAxis dataKey="city" type="category" width={100} tick={{fontSize:10}} />
                         <XAxis type="number" hide />
                         <Tooltip />
                         <Bar dataKey="cancelations" fill={colors.danger} radius={[0, 4, 4, 0]} />
                      </BarChart>
                   </ResponsiveContainer>
                </div>
             </div>
             <div style={global.card}>
                <h3 style={local.secTitle}>Principais Ofensores</h3>
                <div style={{display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px'}}>
                   <div style={local.offender}><span style={{background:'#ef4444'}}></span> Concorrência: {processedData.reduce((a,b)=>a+b.churnReasons.concorrencia,0)}</div>
                   <div style={local.offender}><span style={{background:'#f59e0b'}}></span> Falha Técnica: {processedData.reduce((a,b)=>a+b.churnReasons.tecnico,0)}</div>
                   <div style={local.offender}><span style={{background:'#2563eb'}}></span> Financeiro: {processedData.reduce((a,b)=>a+b.churnReasons.financeiro,0)}</div>
                </div>
             </div>
           </div>
        )}

        {/* ABA: PROJEÇÕES (FUNCIONALIDADE ORIGINAL) */}
        {activeLabTab === 'projecoes' && (
          <div style={global.grid4}>
            {processedData.map(c => (
              <div key={c.id} style={{...global.card, borderLeft: `5px solid ${c.projNetAdds >= c.targetNetAdds ? '#10b981' : '#ef4444'}`}}>
                <h4 style={{margin: 0}}>{c.city}</h4>
                <div style={{marginTop: 15, display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  <div style={{display:'flex', justifyContent:'space-between'}}><span>Projeção Net</span><strong style={{color: colors.success}}>{c.projNetAdds}</strong></div>
                  <div style={{display:'flex', justifyContent:'space-between'}}><span>Churn Atual</span><strong>{c.churnRate}%</strong></div>
                  <div style={{display:'flex', justifyContent:'space-between'}}><span>Gap Meta</span><strong>{Math.max(0, c.targetNetAdds - c.projNetAdds)}</strong></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL (PRESERVADO) */}
      {showPlanModal && (
        <div style={global.modalOverlay}><div style={{...global.modalBox, maxWidth: '500px'}}>
          <div style={global.modalHeader}><h3>Nova Ação: {selectedCity?.city}</h3><button onClick={() => setShowPlanModal(false)}><X /></button></div>
          <form onSubmit={handleSavePlan} style={global.form}>
            <div style={global.field}><label style={global.label}>Título da Estratégia</label><input style={global.input} value={planForm.title} onChange={e => setPlanForm({ ...planForm, title: e.target.value })} required /></div>
            <div style={global.field}><label style={global.label}>Problema Detalhado</label><textarea style={{...global.input, height: '100px'}} value={planForm.problem} onChange={e => setPlanForm({ ...planForm, problem: e.target.value })} required /></div>
            <button style={global.btnPrimary}>Ativar Plano</button>
          </form>
        </div></div>
      )}
    </div>
  );
}

// ESTILOS LOCAIS (COMPLEMENTARES AO GLOBAL)
const local = {
  tabNav: { display: 'flex', gap: '10px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px', overflowX: 'auto', paddingBottom: '2px' },
  tab: { background: 'transparent', border: 'none', color: '#64748b', padding: '12px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', whiteSpace: 'nowrap' },
  tabActive: { background: 'transparent', border: 'none', color: colors.primary, padding: '12px 20px', fontWeight: '800', borderBottom: `3px solid ${colors.primary}`, display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' },
  radarLayout: { display: 'flex', gap: '30px' },
  sidebarRadar: { width: '300px', display: 'flex', flexDirection: 'column', gap: '15px' },
  cityList: { display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '600px', overflowY: 'auto' },
  cityEntry: { padding: '15px', borderRadius: '20px', border: '1px solid', cursor: 'pointer', transition: '0.2s' },
  miniProgress: { width: '100%', height: '5px', background: '#f1f5f9', borderRadius: '10px', marginTop: '10px', overflow: 'hidden' },
  funnel: { display: 'flex', gap: '15px', marginTop: '30px' },
  funBox: { padding: '25px', borderRadius: '24px', border: '1px solid #e2e8f0', flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '5px' },
  secTitle: { fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', color: '#94a3b8', margin: 0, letterSpacing: '0.05em' },
  rangeInput: { width: '100%', accentColor: colors.primary, cursor: 'pointer' },
  slaBox: { background: '#f8fafc', padding: '15px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'center' },
  planCard: { padding: '15px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', marginBottom: '10px' },
  badge: { fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '20px', fontWeight: '900' },
  offender: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '700', color: '#334155' },
  insightBox: { padding: '20px', borderRadius: '16px', display: 'flex', gap: '15px', alignItems: 'center' }
};