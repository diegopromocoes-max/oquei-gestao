import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { collection, query, getDocs, doc, setDoc, getDoc, where } from 'firebase/firestore';
import { Save, Zap, Map, MapPin, Info, CheckCircle2 } from 'lucide-react';
import { styles as global, colors } from '../../styles/globalStyles';

export default function ConfigMetas({ userData }) {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [cities, setCities] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  
  const [clusterGoals, setClusterGoals] = useState({ plans: '', migrations: '', sva: '', growth: '' });
  const [cityGoals, setCityGoals] = useState({ plans_loja: '', plans_pap: '', plans_central: '', plans_b2b: '', churn_limit: '', migrations: '', sva: '' });
  const [allCitiesInCluster, setAllCitiesInCluster] = useState({});
  const [saving, setSaving] = useState(false);

  // Carregar Cidades e Clusters
  useEffect(() => {
    getDocs(collection(db, "cities")).then(snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCities(userData?.role === 'supervisor' ? list.filter(c => c.clusterId === userData.clusterId) : list);
    });
  }, [userData]);

  const clusters = useMemo(() => [...new Set(cities.map(c => c.clusterId).filter(Boolean))], [cities]);

  // Sincronizar Metas da Regional e Somas das Cidades
  useEffect(() => {
    if (selectedCluster) {
      getDoc(doc(db, "monthly_cluster_goals", `${selectedCluster}_${selectedMonth}`)).then(snap => {
        setClusterGoals(snap.exists() ? snap.data() : { plans: '', migrations: '', sva: '', growth: '' });
      });
      const q = query(collection(db, "monthly_goals"), where("month", "==", selectedMonth), where("clusterId", "==", selectedCluster));
      getDocs(q).then(snap => {
        const map = {}; snap.docs.forEach(d => map[d.data().cityId] = d.data());
        setAllCitiesInCluster(map);
      });
    }
  }, [selectedCluster, selectedMonth, saving]);

  // Sincronizar Metas da Unidade
  useEffect(() => {
    if (selectedCity) {
      getDoc(doc(db, "monthly_goals", `${selectedCity}_${selectedMonth}`)).then(snap => {
        setCityGoals(snap.exists() ? snap.data() : { plans_loja: '', plans_pap: '', plans_central: '', plans_b2b: '', churn_limit: '', migrations: '', sva: '' });
      });
    }
  }, [selectedCity, selectedMonth]);

  // Cálculo de Discrepância (A Mente do S&OP)
  const discrepancy = useMemo(() => {
    let p = 0, s = 0, m = 0;
    Object.values(allCitiesInCluster).forEach(cg => {
      p += (parseInt(cg.plans_loja)||0) + (parseInt(cg.plans_pap)||0) + (parseInt(cg.plans_central)||0) + (parseInt(cg.plans_b2b)||0);
      s += parseInt(cg.sva)||0; m += parseInt(cg.migrations)||0;
    });
    return { plans: p, sva: s, migrations: m };
  }, [allCitiesInCluster]);

  const handleSave = async (type) => {
    setSaving(true);
    const id = type === 'cluster' ? `${selectedCluster}_${selectedMonth}` : `${selectedCity}_${selectedMonth}`;
    const collectionName = type === 'cluster' ? "monthly_cluster_goals" : "monthly_goals";
    const data = type === 'cluster' ? { ...clusterGoals, clusterId: selectedCluster, month: selectedMonth } : { ...cityGoals, cityId: selectedCity, clusterId: cities.find(c => c.id === selectedCity)?.clusterId, month: selectedMonth };
    
    await setDoc(doc(db, collectionName, id), { ...data, updatedAt: new Date(), updatedBy: userData?.name });
    setSaving(false);
    alert("Metas salvas!");
  };

  return (
    <div className="animated-view" style={local.panel}>
      <div style={local.headerRow}>
        <h2 style={local.panelTitle}><Zap size={24} color="#f59e0b"/> Planejamento de Metas S&OP</h2>
        <input type="month" style={global.input} value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
      </div>

      {/* REGIONAL (CLUSTER) */}
      <div style={{...local.card, borderLeft: `4px solid ${colors.primary}`, marginBottom: '30px'}}>
        <div style={local.cardHeader}>
          <h3 style={{color: colors.primary, display: 'flex', alignItems: 'center', gap: '8px'}}><Map size={18}/> Regional (Supervisor)</h3>
          <select style={global.select} value={selectedCluster} onChange={e => setSelectedCluster(e.target.value)}>
            <option value="">Selecionar Regional...</option>
            {clusters.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={local.inputGrid4}>
          <MetaInput label="Planos (Gross)" val={clusterGoals.plans} set={v => setClusterGoals({...clusterGoals, plans: v})} sum={discrepancy.plans} />
          <MetaInput label="SVA Global" val={clusterGoals.sva} set={v => setClusterGoals({...clusterGoals, sva: v})} sum={discrepancy.sva} />
          <MetaInput label="Migrações" val={clusterGoals.migrations} set={v => setClusterGoals({...clusterGoals, migrations: v})} sum={discrepancy.migrations} />
          <MetaInput label="Cresc. Cluster %" val={clusterGoals.growth} set={v => setClusterGoals({...clusterGoals, growth: v})} step="0.1" />
        </div>
        <button onClick={() => handleSave('cluster')} disabled={!selectedCluster || saving} style={local.btnSave}>Gravar Regional</button>
      </div>

      {/* UNIDADE (CIDADE) */}
      <div style={{...local.card, borderLeft: '4px solid #10b981'}}>
        <div style={local.cardHeader}>
          <h3 style={{color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px'}}><MapPin size={18}/> Unidade (Canais)</h3>
          <select style={global.select} value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>
            <option value="">Selecionar Unidade...</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={local.inputGrid4}>
          <MetaInput label="Planos Loja" val={cityGoals.plans_loja} set={v => setCityGoals({...cityGoals, plans_loja: v})} />
          <MetaInput label="Planos PAP" val={cityGoals.plans_pap} set={v => setCityGoals({...cityGoals, plans_pap: v})} />
          <MetaInput label="Planos Central" val={cityGoals.plans_central} set={v => setCityGoals({...cityGoals, plans_central: v})} />
          <MetaInput label="Planos B2B" val={cityGoals.plans_b2b} set={v => setCityGoals({...cityGoals, plans_b2b: v})} />
          <MetaInput label="Churn Limit" val={cityGoals.churn_limit} set={v => setCityGoals({...cityGoals, churn_limit: v})} />
          <MetaInput label="Meta SVA" val={cityGoals.sva} set={v => setCityGoals({...cityGoals, sva: v})} />
          <MetaInput label="Migrações" val={cityGoals.migrations} set={v => setCityGoals({...cityGoals, migrations: v})} />
        </div>
        <button onClick={() => handleSave('unit')} disabled={!selectedCity || saving} style={{...local.btnSave, background: '#10b981'}}>Gravar Unidade</button>
      </div>
    </div>
  );
}

// Subcomponente de Input com Discrepância
const MetaInput = ({ label, val, set, step = "1", sum = null }) => {
  const gap = sum !== null && val ? parseInt(val) - sum : 0;
  return (
    <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
      <label style={local.labelMeta}>{label}</label>
      <input type="number" step={step} style={local.inputNum} value={val} onChange={e => set(e.target.value)} />
      {sum !== null && (
        <div style={local.discrepancyTag}>
          <span>Soma Cidades: <strong>{sum}</strong></span>
          {val && <span style={{color: gap > 0 ? '#ef4444' : '#10b981'}}>{gap > 0 ? `Gap: -${gap}` : 'Ok'}</span>}
        </div>
      )}
    </div>
  );
};

const local = {
  panel: { background:'var(--bg-panel)', padding:'30px', borderRadius:'24px', border:'1px solid var(--border)' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  panelTitle: { fontSize:'22px', fontWeight:'900', display:'flex', alignItems:'center', gap:'12px', margin:0 },
  card: { background:'var(--bg-card)', padding:'25px', borderRadius:'18px', border:'1px solid var(--border)' },
  cardHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' },
  inputGrid4: { display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'15px' },
  labelMeta: { fontSize:'10px', fontWeight:'900', color:'var(--text-muted)', textTransform:'uppercase' },
  inputNum: { padding:'12px', borderRadius:'10px', background:'var(--bg-panel)', border:'1px solid var(--border)', color:'var(--text-main)', fontWeight:'900', textAlign:'center', width:'100%' },
  btnSave: { marginTop:'20px', width:'100%', padding:'12px', borderRadius:'12px', background:colors.primary, color:'white', fontWeight:'900', border:'none', cursor:'pointer' },
  discrepancyTag: { fontSize:'9px', background:'var(--bg-app)', padding:'5px', borderRadius:'6px', display:'flex', justifyContent:'space-between', marginTop: '4px' }
};