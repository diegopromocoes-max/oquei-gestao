import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, query, getDocs, doc, setDoc, getDoc, where, onSnapshot } from 'firebase/firestore';
import { 
  Settings, Database, Save, Calendar, MapPin, 
  TrendingUp, TrendingDown, CheckCircle2, ShieldCheck, 
  Users, Server, History, Target, AlertTriangle, Store, Headset, Briefcase, Zap, Package, RefreshCcw, X,
  LayoutList, Map
} from 'lucide-react';

import { styles as global, colors } from '../styles/globalStyles';

export default function Configuracoes({ userData }) {
  const [activeTab, setActiveTab] = useState('metas');
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // --- ESTADOS: METAS GERAIS (MÊS) ---
  const [selectedMonthGoal, setSelectedMonthGoal] = useState(() => new Date().toISOString().slice(0, 7));

  // --- ESTADOS: METAS DA REGIONAL / CLUSTER (NOVO) ---
  const [selectedClusterGoal, setSelectedClusterGoal] = useState('');
  const [clusterGoals, setClusterGoals] = useState({
    plans: '', migrations: '', sva: '', growth: ''
  });

  // --- ESTADOS: METAS DA UNIDADE / CIDADE (PRESERVADO) ---
  const [selectedCityGoal, setSelectedCityGoal] = useState('');
  const [goals, setGoals] = useState({
    plans_loja: '', plans_pap: '', plans_central: '', plans_b2b: '',
    churn_limit: '', migrations: '', sva: ''
  });

  // --- ESTADOS: DADOS HISTÓRICOS ---
  const [selectedCityHist, setSelectedCityHist] = useState('');
  const [selectedMonthHist, setSelectedMonthHist] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7);
  });
  const [histSales, setHistSales] = useState({ loja: '', pap: '', central: '', b2b: '' });
  const [histChurn, setHistChurn] = useState({ concorrencia: '', tecnico: '', mudanca: '', financeiro: '', outros: '' });

  // --- ESTADOS: BASE DE CLIENTES ---
  const [selectedMonthBase, setSelectedMonthBase] = useState(() => new Date().toISOString().slice(0, 7));
  const [basesData, setBasesData] = useState({});

  // 1. CARREGAMENTO DE CIDADES E EXTRAÇÃO DE CLUSTERS
  useEffect(() => {
    const fetchCities = async () => {
      const snap = await getDocs(collection(db, "cities"));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCities(userData?.role === 'supervisor' ? list.filter(c => c.clusterId === userData.clusterId) : list);
    };
    fetchCities();
  }, [userData]);

  const uniqueClusters = useMemo(() => {
    return [...new Set(cities.map(c => c.clusterId).filter(Boolean))];
  }, [cities]);

  // 2. BUSCA AUTOMÁTICA DE METAS (CLUSTER E CIDADE)
  useEffect(() => {
    if (activeTab === 'metas' && selectedClusterGoal) {
      const fetchCG = async () => {
        const docSnap = await getDoc(doc(db, "monthly_cluster_goals", `${selectedClusterGoal}_${selectedMonthGoal}`));
        if (docSnap.exists()) setClusterGoals(docSnap.data());
        else setClusterGoals({ plans: '', migrations: '', sva: '', growth: '' });
      };
      fetchCG();
    }
  }, [selectedClusterGoal, selectedMonthGoal, activeTab]);

  useEffect(() => {
    if (activeTab === 'metas' && selectedCityGoal) {
      const fetchG = async () => {
        const docSnap = await getDoc(doc(db, "monthly_goals", `${selectedCityGoal}_${selectedMonthGoal}`));
        if (docSnap.exists()) setGoals(docSnap.data());
        else setGoals({ plans_loja: '', plans_pap: '', plans_central: '', plans_b2b: '', churn_limit: '', migrations: '', sva: '' });
      };
      fetchG();
    }
  }, [selectedCityGoal, selectedMonthGoal, activeTab]);

  // 3. BUSCA DE BASE DE CLIENTES MENSAL
  useEffect(() => {
    if (activeTab === 'base') {
      const fetchBases = async () => {
        const q = query(collection(db, "monthly_bases"), where("month", "==", selectedMonthBase));
        const snap = await getDocs(q);
        const bMap = {};
        snap.docs.forEach(d => { bMap[d.data().cityId] = d.data(); });
        setBasesData(bMap);
      };
      fetchBases();
    }
  }, [selectedMonthBase, activeTab]);

  const showNotification = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // --- HANDLERS DE SALVAMENTO ---
  const handleSaveClusterGoals = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, "monthly_cluster_goals", `${selectedClusterGoal}_${selectedMonthGoal}`), {
        ...clusterGoals, clusterId: selectedClusterGoal, month: selectedMonthGoal,
        updatedAt: new Date(), updatedBy: userData?.name
      });
      showNotification("Metas da Regional aplicadas com sucesso!");
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleSaveCityGoals = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, "monthly_goals", `${selectedCityGoal}_${selectedMonthGoal}`), {
        ...goals, cityId: selectedCityGoal, month: selectedMonthGoal,
        clusterId: cities.find(c => c.id === selectedCityGoal)?.clusterId || '',
        updatedAt: new Date(), updatedBy: userData?.name
      });
      showNotification("Metas da Unidade aplicadas com sucesso!");
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleSaveHistory = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, "historical_metrics", `${selectedCityHist}_${selectedMonthHist}`), {
        cityId: selectedCityHist, month: selectedMonthHist,
        sales: histSales, churn: histChurn, updatedAt: new Date()
      });
      showNotification("Histórico guardado!");
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleSaveBases = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const promises = cities.map(city => {
        const data = basesData[city.id] || {};
        if (data.baseStart || data.baseEnd) {
          const docRef = doc(db, "monthly_bases", `${city.id}_${selectedMonthBase}`);
          return setDoc(docRef, {
            cityId: city.id, cityName: city.name, clusterId: city.clusterId, month: selectedMonthBase,
            baseStart: parseInt(data.baseStart) || 0, baseEnd: parseInt(data.baseEnd) || 0,
            updatedAt: new Date(), updatedBy: userData?.name
          }, { merge: true });
        }
        return Promise.resolve();
      });
      await Promise.all(promises);
      showNotification(`Bases de ${selectedMonthBase} atualizadas!`);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const updateBaseField = (cityId, field, value) => {
    setBasesData(prev => ({ ...prev, [cityId]: { ...prev[cityId], [field]: value } }));
  };

  return (
    <div style={{...global.container, padding: '20px'}}>
      {toast && <div style={local.toast}>{toast}</div>}
      
      <div style={local.layout}>
        {/* SIDEBAR */}
        <aside style={local.sidebar}>
          <div style={local.sideTitle}>Configurações S&OP</div>
          <button style={activeTab === 'metas' ? local.sideBtnActive : local.sideBtn} onClick={() => setActiveTab('metas')}><Target size={18}/> Metas da Diretoria</button>
          <button style={activeTab === 'base' ? local.sideBtnActive : local.sideBtn} onClick={() => setActiveTab('base')}><Database size={18}/> Base de Clientes</button>
          <button style={activeTab === 'historico' ? local.sideBtnActive : local.sideBtn} onClick={() => setActiveTab('historico')}><History size={18}/> Lançar Histórico</button>
          <button style={activeTab === 'usuarios' ? local.sideBtnActive : local.sideBtn} onClick={() => setActiveTab('usuarios')}><Users size={18}/> Gestão de Acessos</button>
        </aside>

        {/* MAIN AREA */}
        <main style={local.main}>
          
          {/* ABA: METAS */}
          {activeTab === 'metas' && (
            <div className="animated-view" style={local.panel}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '30px'}}>
                <div>
                  <h2 style={local.panelTitle}><Zap size={24} color="#f59e0b"/> Metas Mensais S&OP</h2>
                  <p style={{margin:'5px 0 0 0', fontSize:'13px', color:'var(--text-muted)'}}>Defina os alvos globais do supervisor e as cotas locais dos atendentes.</p>
                </div>
                <input type="month" style={global.input} value={selectedMonthGoal} onChange={e => setSelectedMonthGoal(e.target.value)} />
              </div>

              {/* BLOCO 1: METAS DA REGIONAL (CLUSTER) */}
              <div style={{...local.card, marginBottom: '30px', borderLeft: `4px solid ${colors.primary}`}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                  <h3 style={{...local.cardTitle, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: colors.primary}}>
                    <Map size={18} /> Meta da Regional (Supervisor)
                  </h3>
                  <select style={{...global.select, width: '250px', padding: '8px 12px'}} value={selectedClusterGoal} onChange={e => setSelectedClusterGoal(e.target.value)}>
                    <option value="">Selecione o Cluster...</option>
                    {uniqueClusters.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                
                <form onSubmit={handleSaveClusterGoals}>
                  <div style={{...local.inputGrid, gridTemplateColumns: 'repeat(4, 1fr)'}}>
                    <MetaInput label="Vendas de Planos" val={clusterGoals.plans} set={v => setClusterGoals({...clusterGoals, plans: v})} />
                    <MetaInput label="Migrações" val={clusterGoals.migrations} set={v => setClusterGoals({...clusterGoals, migrations: v})} />
                    <MetaInput label="Meta SVA" val={clusterGoals.sva} set={v => setClusterGoals({...clusterGoals, sva: v})} />
                    <MetaInput label="Crescimento (%)" val={clusterGoals.growth} set={v => setClusterGoals({...clusterGoals, growth: v})} step="0.1" />
                  </div>
                  <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '15px'}}>
                    <button type="submit" disabled={!selectedClusterGoal || saving} style={{...local.btnSave, marginTop: 0, width: 'auto', padding: '10px 20px'}}><Save size={16}/> Gravar Regional</button>
                  </div>
                </form>
              </div>

              {/* BLOCO 2: METAS DA UNIDADE (CIDADE) */}
              <div style={{...local.card, borderLeft: '4px solid #10b981'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                  <h3 style={{...local.cardTitle, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981'}}>
                    <MapPin size={18} /> Metas por Unidade (Atendentes)
                  </h3>
                  <select style={{...global.select, width: '250px', padding: '8px 12px'}} value={selectedCityGoal} onChange={e => setSelectedCityGoal(e.target.value)}>
                    <option value="">Selecione a Unidade...</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <form onSubmit={handleSaveCityGoals}>
                  <div style={local.grid2}>
                    <div style={{...local.card, background: 'var(--bg-app)', border: 'none'}}>
                      <h4 style={{fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '15px'}}>Vendas por Canal</h4>
                      <div style={local.inputGrid}>
                        <MetaInput label="Loja" val={goals.plans_loja} set={v => setGoals({...goals, plans_loja: v})} />
                        <MetaInput label="PAP" val={goals.plans_pap} set={v => setGoals({...goals, plans_pap: v})} />
                        <MetaInput label="Central" val={goals.plans_central} set={v => setGoals({...goals, plans_central: v})} />
                        <MetaInput label="B2B" val={goals.plans_b2b} set={v => setGoals({...goals, plans_b2b: v})} />
                      </div>
                    </div>
                    <div style={{...local.card, background: 'var(--bg-app)', border: 'none'}}>
                      <h4 style={{fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '15px'}}>Retenção e Serviços</h4>
                      <div style={local.inputGrid}>
                        <MetaInput label="Teto Churn (Cancel.)" val={goals.churn_limit} set={v => setGoals({...goals, churn_limit: v})} />
                        <MetaInput label="Migrações" val={goals.migrations} set={v => setGoals({...goals, migrations: v})} />
                        <MetaInput label="Meta SVA" val={goals.sva} set={v => setGoals({...goals, sva: v})} />
                      </div>
                    </div>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '15px'}}>
                    <button type="submit" disabled={!selectedCityGoal || saving} style={{...local.btnSave, marginTop: 0, width: 'auto', padding: '10px 20px', background: '#10b981'}}><Save size={16}/> Gravar Unidade</button>
                  </div>
                </form>
              </div>

            </div>
          )}

          {/* ABA: BASE DE CLIENTES (PRESERVADA) */}
          {activeTab === 'base' && (
            <div className="animated-view" style={local.panel}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '20px'}}>
                <div>
                  <h2 style={local.panelTitle}><Database size={24} color={colors.primary}/> Gestão de Base Ativa</h2>
                  <p style={{margin:'5px 0 0 0', fontSize:'13px', color:'var(--text-muted)'}}>Abasteça a base no 1º dia (para cálculos) e no último dia (para auditoria Voalle).</p>
                </div>
                <input type="month" style={global.input} value={selectedMonthBase} onChange={e => setSelectedMonthBase(e.target.value)} />
              </div>
              <form onSubmit={handleSaveBases}>
                <div style={{background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden'}}>
                  <table style={{width: '100%', borderCollapse: 'collapse'}}>
                    <thead style={{background: 'var(--bg-app)'}}>
                      <tr>
                        <th style={local.th}>Unidade / Cidade</th>
                        <th style={local.th}>Base Inicial (Dia 01)</th>
                        <th style={local.th}>Base Final (Dia 30/31)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cities.map(city => {
                        const cityData = basesData[city.id] || { baseStart: '', baseEnd: '' };
                        return (
                          <tr key={city.id} style={{borderBottom: '1px solid var(--border)'}}>
                            <td style={local.td}><strong>{city.name}</strong></td>
                            <td style={local.td}>
                              <input type="number" placeholder="Ex: 1250" value={cityData.baseStart} onChange={e => updateBaseField(city.id, 'baseStart', e.target.value)} style={local.baseInput} />
                            </td>
                            <td style={local.td}>
                              <input type="number" placeholder="Fechamento Voalle" value={cityData.baseEnd} onChange={e => updateBaseField(city.id, 'baseEnd', e.target.value)} style={{...local.baseInput, borderColor: cityData.baseEnd ? colors.success : 'var(--border)'}} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <button type="submit" disabled={saving || cities.length === 0} style={{...local.btnSave, marginTop: '20px'}}>{saving ? <RefreshCcw size={18} className="animate-spin" /> : <Save size={18}/>} Gravar Bases do Mês</button>
              </form>
            </div>
          )}

          {/* ABA: HISTÓRICO (PRESERVADA) */}
          {activeTab === 'historico' && (
            <div className="animated-view" style={local.panel}>
              <h2 style={local.panelTitle}><History size={24} color={colors.primary}/> Alimentação de Dados Históricos</h2>
              <div style={local.filterRow}>
                <select style={global.select} value={selectedCityHist} onChange={e => setSelectedCityHist(e.target.value)}>
                  <option value="">Selecione a Unidade...</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="month" style={global.input} value={selectedMonthHist} onChange={e => setSelectedMonthHist(e.target.value)} />
              </div>
              <form onSubmit={handleSaveHistory}>
                <div style={local.grid2}>
                  <div style={local.card}>
                    <h3 style={local.cardTitle}>Vendas Realizadas (Canais)</h3>
                    <div style={local.inputGrid}>
                      <MetaInput label="Loja" val={histSales.loja} set={v => setHistSales({...histSales, loja: v})} />
                      <MetaInput label="PAP" val={histSales.pap} set={v => setHistSales({...histSales, pap: v})} />
                      <MetaInput label="Central" val={histSales.central} set={v => setHistSales({...histSales, central: v})} />
                      <MetaInput label="B2B" val={histSales.b2b} set={v => setHistSales({...histSales, b2b: v})} />
                    </div>
                  </div>
                  <div style={local.card}>
                    <h3 style={local.cardTitle}>Motivos de Cancelamento</h3>
                    <div style={local.inputGrid}>
                      <MetaInput label="Concorrência" val={histChurn.concorrencia} set={v => setHistChurn({...histChurn, concorrencia: v})} />
                      <MetaInput label="Técnico" val={histChurn.tecnico} set={v => setHistChurn({...histChurn, tecnico: v})} />
                      <MetaInput label="Financeiro" val={histChurn.financeiro} set={v => setHistChurn({...histChurn, financeiro: v})} />
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={!selectedCityHist || saving} style={local.btnSave}><Database size={18}/> Gravar Histórico</button>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Subcomponente de Input ajustado para suportar steps (decimais)
const MetaInput = ({ label, val, set, step = "1" }) => (
  <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
    <label style={{fontSize:'10px', fontWeight:'800', color:'var(--text-muted)', textTransform: 'uppercase'}}>{label}</label>
    <input type="number" step={step} style={local.inputNum} value={val} onChange={e => set(e.target.value)} placeholder="0" />
  </div>
);

const local = {
  layout: { display: 'flex', gap: '30px' },
  sidebar: { width: '250px', background: 'var(--bg-card)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border)', display:'flex', flexDirection:'column', gap:'8px' },
  sideTitle: { fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' },
  sideBtn: { padding:'12px', borderRadius:'10px', display:'flex', alignItems:'center', gap:'10px', color:'var(--text-main)', cursor:'pointer', fontWeight:'600', background:'transparent', border:'none', width:'100%', textAlign:'left' },
  sideBtnActive: { padding:'12px', borderRadius:'10px', display:'flex', alignItems:'center', gap:'10px', color:'white', background:colors.primary, fontWeight:'800', border:'none', width:'100%', textAlign:'left', boxShadow:'0 4px 10px rgba(37,99,235,0.2)' },
  main: { flex: 1 },
  panel: { background:'var(--bg-panel)', padding:'30px', borderRadius:'24px', border:'1px solid var(--border)' },
  panelTitle: { fontSize:'22px', fontWeight:'900', display:'flex', alignItems:'center', gap:'12px', margin:0 },
  filterRow: { display:'flex', gap:'20px', margin: '25px 0', padding:'15px', background:'var(--bg-card)', borderRadius:'15px', border: '1px solid var(--border)' },
  grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' },
  card: { background:'var(--bg-card)', padding:'25px', borderRadius:'18px', border:'1px solid var(--border)' },
  cardTitle: { fontSize:'14px', fontWeight:'800', marginBottom:'15px', color:'var(--text-muted)' },
  inputGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px' },
  inputNum: { padding:'12px', borderRadius:'8px', background:'var(--bg-panel)', border:'1px solid var(--border)', color:'var(--text-main)', fontWeight:'800', textAlign:'center', width: '100%', boxSizing: 'border-box' },
  btnSave: { marginTop:'25px', width:'100%', padding:'15px', borderRadius:'12px', background:colors.primary, color:'white', fontWeight:'900', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', border:'none' },
  toast: { position:'fixed', top:'20px', right:'20px', background:'#10b981', color:'white', padding:'12px 25px', borderRadius:'10px', fontWeight:'800', zIndex:1000, boxShadow:'0 4px 15px rgba(16,185,129,0.3)' },
  
  th: { padding: '15px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' },
  td: { padding: '15px', fontSize: '14px', color: 'var(--text-main)' },
  baseInput: { padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-panel)', width: '100%', fontWeight: '800', color: 'var(--text-main)', boxSizing: 'border-box' }
};