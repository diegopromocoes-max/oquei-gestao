import React, { useState, useEffect } from 'react';
import { db } from '../../firebase'; // <-- CAMINHO CORRIGIDO: ../../firebase
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { History, Database, Save, RefreshCcw } from 'lucide-react';

import { styles as global, colors } from '../../styles/globalStyles'; // <-- CAMINHO CORRIGIDO: ../../styles

export default function ConfigHistorico({ userData }) {
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  
  // O mês histórico, por padrão, sugere sempre o mês anterior ao atual
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date(); 
    d.setMonth(d.getMonth() - 1); 
    return d.toISOString().slice(0, 7);
  });

  const [histSales, setHistSales] = useState({ loja: '', pap: '', central: '', b2b: '' });
  const [histChurn, setHistChurn] = useState({ concorrencia: '', tecnico: '', financeiro: '' });
  
  const [saving, setSaving] = useState(false);

  // 1. CARREGAR CIDADES
  useEffect(() => {
    const fetchCities = async () => {
      const snap = await getDocs(collection(db, "cities"));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCities(userData?.role === 'supervisor' ? list.filter(c => c.clusterId === userData.clusterId) : list);
    };
    fetchCities();
  }, [userData]);

  // 2. BUSCAR HISTÓRICO EXISTENTE
  useEffect(() => {
    if (selectedCity && selectedMonth) {
      const fetchHistory = async () => {
        const docSnap = await getDoc(doc(db, "historical_metrics", `${selectedCity}_${selectedMonth}`));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setHistSales(data.sales || { loja: '', pap: '', central: '', b2b: '' });
          setHistChurn(data.churn || { concorrencia: '', tecnico: '', financeiro: '' });
        } else {
          setHistSales({ loja: '', pap: '', central: '', b2b: '' });
          setHistChurn({ concorrencia: '', tecnico: '', financeiro: '' });
        }
      };
      fetchHistory();
    }
  }, [selectedCity, selectedMonth]);

  // 3. SALVAR HISTÓRICO
  const handleSaveHistory = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, "historical_metrics", `${selectedCity}_${selectedMonth}`), {
        cityId: selectedCity,
        month: selectedMonth,
        sales: {
          loja: parseInt(histSales.loja) || 0,
          pap: parseInt(histSales.pap) || 0,
          central: parseInt(histSales.central) || 0,
          b2b: parseInt(histSales.b2b) || 0
        },
        churn: {
          concorrencia: parseInt(histChurn.concorrencia) || 0,
          tecnico: parseInt(histChurn.tecnico) || 0,
          financeiro: parseInt(histChurn.financeiro) || 0
        },
        updatedAt: new Date(),
        updatedBy: userData?.name
      }, { merge: true });
      
      alert("Histórico guardado com sucesso!");
    } catch (e) { 
      console.error(e); 
      alert("Erro ao gravar histórico.");
    }
    setSaving(false);
  };

  return (
    <div className="animated-view" style={local.panel}>
      <div style={local.headerRow}>
        <div>
          <h2 style={local.panelTitle}><History size={24} color={colors.primary}/> Alimentação de Dados Históricos</h2>
          <p style={{margin:'5px 0 0 0', fontSize:'13px', color:'var(--text-muted)'}}>
            Insira os dados reais de meses anteriores para calibrar o simulador do Laboratório Churn.
          </p>
        </div>
      </div>

      <div style={local.filterRow}>
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '5px'}}>
          <label style={local.labelMeta}>Unidade / Loja</label>
          <select style={global.select} value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>
            <option value="">Selecione a Unidade...</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '5px'}}>
          <label style={local.labelMeta}>Mês de Referência</label>
          <input type="month" style={global.input} value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
        </div>
      </div>

      <form onSubmit={handleSaveHistory}>
        <div style={local.grid2}>
          
          {/* BLOCO DE VENDAS (Gross Adds) */}
          <div style={local.card}>
            <h3 style={local.cardTitle}>Vendas Realizadas (Gross Adds)</h3>
            <div style={local.inputGrid}>
              <MetaInput label="Lojas Físicas" val={histSales.loja} set={v => setHistSales({...histSales, loja: v})} />
              <MetaInput label="Porta a Porta (PAP)" val={histSales.pap} set={v => setHistSales({...histSales, pap: v})} />
              <MetaInput label="Central / Tele" val={histSales.central} set={v => setHistSales({...histSales, central: v})} />
              <MetaInput label="Corporativo (B2B)" val={histSales.b2b} set={v => setHistSales({...histSales, b2b: v})} />
            </div>
          </div>

          {/* BLOCO DE CHURN (Evasão) */}
          <div style={local.card}>
            <h3 style={local.cardTitle}>Motivos de Cancelamento (Evasão)</h3>
            <div style={local.inputGrid}>
              <MetaInput label="Concorrência" val={histChurn.concorrencia} set={v => setHistChurn({...histChurn, concorrencia: v})} />
              <MetaInput label="Falha Técnica" val={histChurn.tecnico} set={v => setHistChurn({...histChurn, tecnico: v})} />
              <MetaInput label="Inadimplência / Financeiro" val={histChurn.financeiro} set={v => setHistChurn({...histChurn, financeiro: v})} />
            </div>
            <p style={{fontSize: '11px', color: 'var(--text-muted)', marginTop: '15px', lineHeight: '1.4'}}>
              * O sistema usa estes ofensores para prever qual setor precisará de mais ações de mitigação na projeção do próximo mês.
            </p>
          </div>

        </div>

        <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '20px'}}>
          <button type="submit" disabled={!selectedCity || saving} style={local.btnSave}>
            {saving ? <RefreshCcw size={18} className="animate-spin" /> : <Database size={18}/>} 
            Gravar Dados Históricos
          </button>
        </div>
      </form>
    </div>
  );
}

// Subcomponente de Input
const MetaInput = ({ label, val, set }) => (
  <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
    <label style={local.labelMeta}>{label}</label>
    <input type="number" style={local.inputNum} value={val} onChange={e => set(e.target.value)} placeholder="0" />
  </div>
);

const local = {
  panel: { background:'var(--bg-panel)', padding:'30px', borderRadius:'24px', border:'1px solid var(--border)' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
  panelTitle: { fontSize:'22px', fontWeight:'900', display:'flex', alignItems:'center', gap:'12px', margin:0 },
  filterRow: { display:'flex', gap:'20px', margin: '0 0 25px 0', padding:'20px', background:'var(--bg-card)', borderRadius:'16px', border: '1px solid var(--border)' },
  grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' },
  card: { background:'var(--bg-card)', padding:'25px', borderRadius:'18px', border:'1px solid var(--border)' },
  cardTitle: { fontSize:'14px', fontWeight:'800', marginBottom:'20px', color:'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' },
  inputGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px' },
  labelMeta: { fontSize:'10px', fontWeight:'900', color:'var(--text-muted)', textTransform:'uppercase' },
  inputNum: { padding:'12px', borderRadius:'10px', background:'var(--bg-app)', border:'1px solid var(--border)', color:'var(--text-main)', fontWeight:'900', textAlign:'center', width:'100%', boxSizing: 'border-box' },
  btnSave: { padding:'15px 30px', borderRadius:'12px', background:colors.primary, color:'white', fontWeight:'900', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', border:'none' }
};