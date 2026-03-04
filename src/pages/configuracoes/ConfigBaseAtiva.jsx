import React, { useState, useEffect } from 'react';
import { db } from '../../firebase'; // <-- CAMINHO CORRIGIDO: ../../firebase
import { collection, query, getDocs, doc, setDoc, where } from 'firebase/firestore';
import { Database, Save, RefreshCcw } from 'lucide-react';

import { styles as global, colors } from '../../styles/globalStyles'; // <-- CAMINHO CORRIGIDO: ../../styles

export default function ConfigBaseAtiva({ userData }) {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [cities, setCities] = useState([]);
  const [basesData, setBasesData] = useState({});
  const [saving, setSaving] = useState(false);

  // 1. CARREGAMENTO DE CIDADES
  useEffect(() => {
    const fetchCities = async () => {
      const snapCit = await getDocs(collection(db, "cities"));
      const list = snapCit.docs.map(d => ({ id: d.id, ...d.data() }));
      // Filtra pelas cidades do supervisor, se for o caso
      setCities(userData?.role === 'supervisor' ? list.filter(c => c.clusterId === userData.clusterId) : list);
    };
    fetchCities();
  }, [userData]);

  // 2. BUSCA DA BASE MENSAL
  useEffect(() => {
    const fetchBases = async () => {
      const q = query(collection(db, "monthly_bases"), where("month", "==", selectedMonth));
      const snap = await getDocs(q);
      const bMap = {};
      snap.docs.forEach(d => { bMap[d.data().cityId] = d.data(); });
      setBasesData(bMap);
    };
    fetchBases();
  }, [selectedMonth]);

  // 3. HANDLERS DE ATUALIZAÇÃO E SALVAMENTO
  const updateBaseField = (cityId, field, value) => {
    setBasesData(prev => ({
      ...prev,
      [cityId]: { ...prev[cityId], [field]: value }
    }));
  };

  const handleSaveBases = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const promises = cities.map(city => {
        const data = basesData[city.id] || {};
        // Só salva se houver algum valor preenchido
        if (data.baseStart || data.baseEnd) {
          const docRef = doc(db, "monthly_bases", `${city.id}_${selectedMonth}`);
          return setDoc(docRef, {
            cityId: city.id,
            cityName: city.name,
            clusterId: city.clusterId,
            month: selectedMonth,
            baseStart: parseInt(data.baseStart) || 0,
            baseEnd: parseInt(data.baseEnd) || 0,
            updatedAt: new Date(),
            updatedBy: userData?.name
          }, { merge: true });
        }
        return Promise.resolve();
      });
      await Promise.all(promises);
      alert(`Bases de ${selectedMonth} atualizadas com sucesso!`);
    } catch (e) { 
      console.error(e); 
      alert("Erro ao salvar bases.");
    }
    setSaving(false);
  };

  return (
    <div className="animated-view" style={local.panel}>
      <div style={local.headerRow}>
        <div>
          <h2 style={local.panelTitle}><Database size={24} color={colors.primary}/> Gestão de Base Ativa</h2>
          <p style={{margin:'5px 0 0 0', fontSize:'13px', color:'var(--text-muted)'}}>
            Abasteça a base no 1º dia (para cálculos S&OP) e no último dia (auditoria de fechamento).
          </p>
        </div>
        <input 
          type="month" 
          style={global.input} 
          value={selectedMonth} 
          onChange={e => setSelectedMonth(e.target.value)} 
        />
      </div>

      <form onSubmit={handleSaveBases}>
        <div style={local.tableContainer}>
          <table style={local.table}>
            <thead style={{background: 'var(--bg-app)'}}>
              <tr>
                <th style={local.th}>Unidade / Cidade</th>
                <th style={local.th}>Base Inicial (Dia 01)</th>
                <th style={local.th}>Base Final (Fechamento)</th>
              </tr>
            </thead>
            <tbody>
              {cities.map(city => {
                const cityData = basesData[city.id] || { baseStart: '', baseEnd: '' };
                return (
                  <tr key={city.id} style={{borderBottom: '1px solid var(--border)'}}>
                    <td style={local.td}><strong>{city.name}</strong></td>
                    <td style={local.td}>
                      <input 
                        type="number" 
                        placeholder="Ex: 1250"
                        value={cityData.baseStart} 
                        onChange={e => updateBaseField(city.id, 'baseStart', e.target.value)}
                        style={local.baseInput}
                      />
                    </td>
                    <td style={local.td}>
                      <input 
                        type="number" 
                        placeholder="Número Voalle"
                        value={cityData.baseEnd} 
                        onChange={e => updateBaseField(city.id, 'baseEnd', e.target.value)}
                        style={{...local.baseInput, borderColor: cityData.baseEnd ? colors.success : 'var(--border)'}}
                      />
                    </td>
                  </tr>
                )
              })}
              {cities.length === 0 && (
                <tr>
                  <td colSpan="3" style={{textAlign: 'center', padding: '20px', color: 'var(--text-muted)'}}>
                    Nenhuma cidade vinculada ao seu perfil.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <button type="submit" disabled={saving || cities.length === 0} style={local.btnSave}>
          {saving ? <RefreshCcw size={18} className="animate-spin" /> : <Save size={18}/>} 
          Gravar Bases do Mês
        </button>
      </form>
    </div>
  );
}

const local = {
  panel: { background:'var(--bg-panel)', padding:'30px', borderRadius:'24px', border:'1px solid var(--border)' },
  headerRow: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '30px' },
  panelTitle: { fontSize:'22px', fontWeight:'900', display:'flex', alignItems:'center', gap:'12px', margin:0 },
  tableContainer: { background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '15px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' },
  td: { padding: '15px', fontSize: '14px', color: 'var(--text-main)' },
  baseInput: { padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-panel)', width: '100%', fontWeight: '800', color: 'var(--text-main)', boxSizing: 'border-box' },
  btnSave: { marginTop:'20px', width:'100%', padding:'15px', borderRadius:'12px', background:colors.primary, color:'white', fontWeight:'900', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', border:'none' }
};