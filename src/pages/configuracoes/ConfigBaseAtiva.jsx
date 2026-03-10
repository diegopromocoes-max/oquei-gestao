import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, getDocs, doc, setDoc, where } from 'firebase/firestore';
import { Database, Save, RefreshCcw, Target, ArrowRight } from 'lucide-react';
import { styles as global, colors } from '../../styles/globalStyles';

export default function ConfigBaseAtiva({ userData }) {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [cities, setCities] = useState([]);
  const [basesData, setBasesData] = useState({});
  const [saving, setSaving] = useState(false);

  // Função auxiliar para calcular o próximo mês (YYYY-MM)
  const getNextMonth = (currentMonth) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const date = new Date(year, month, 1); // JS Date Month é 0-indexed, então 'month' já é o próximo
    return date.toISOString().slice(0, 7);
  };

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const snapCit = await getDocs(collection(db, "cities"));
        const list = snapCit.docs.map(d => ({ id: d.id, ...d.data() }));
        const filtered = userData?.role === 'supervisor' 
          ? list.filter(c => c.clusterId === userData.clusterId) 
          : list;
        setCities(filtered);
      } catch (err) { console.error("Erro ao carregar cidades:", err); }
    };
    fetchCities();
  }, [userData]);

  useEffect(() => {
    const fetchBases = async () => {
      try {
        const q = query(collection(db, "monthly_bases"), where("month", "==", selectedMonth));
        const snap = await getDocs(q);
        const bMap = {};
        snap.docs.forEach(d => { bMap[d.data().cityId] = d.data(); });
        setBasesData(bMap);
      } catch (err) { console.error("Erro ao carregar bases:", err); }
    };
    fetchBases();
  }, [selectedMonth]);

  const updateField = (cityId, field, value) => {
    if (field === 'potencial') {
      setCities(prev => prev.map(c => c.id === cityId ? { ...c, potencial: value } : c));
    } else {
      setBasesData(prev => ({
        ...prev,
        [cityId]: { ...prev[cityId], [field]: value }
      }));
    }
  };

  const handleSaveBases = async (e) => {
    e.preventDefault();
    setSaving(true);
    const nextMonth = getNextMonth(selectedMonth);

    try {
      const promises = cities.map(city => {
        const data = basesData[city.id] || {};
        
        if (data.baseStart || data.baseEnd || city.potencial) {
          const baseStartNum = parseInt(data.baseStart) || 0;
          const baseEndNum = parseInt(data.baseEnd) || 0;
          const potencialNum = parseInt(city.potencial) || 0;

          // 1. Salva o Mês Atual
          const currentMonthRef = doc(db, "monthly_bases", `${selectedMonth}_${city.id}`);
          const p1 = setDoc(currentMonthRef, {
            cityId: city.id,
            cityName: city.name || city.city,
            month: selectedMonth,
            baseStart: baseStartNum,
            baseEnd: baseEndNum,
            updatedAt: new Date().toISOString(),
            updatedBy: userData?.name || 'Gestor'
          }, { merge: true });

          // 2. SISTEMÁTICA: Transporta Base Final para Base Inicial do Próximo Mês
          let p2 = Promise.resolve();
          if (baseEndNum > 0) {
            const nextMonthRef = doc(db, "monthly_bases", `${nextMonth}_${city.id}`);
            p2 = setDoc(nextMonthRef, {
              cityId: city.id,
              cityName: city.name || city.city,
              month: nextMonth,
              baseStart: baseEndNum, // A mágica acontece aqui
              updatedAt: new Date().toISOString(),
              updatedBy: "Sistema (Transporte Automático)"
            }, { merge: true });
          }

          // 3. Atualiza o cadastro fixo da Cidade (Prioriza a base final se houver)
          const cityRef = doc(db, "cities", city.id);
          const p3 = setDoc(cityRef, {
            baseStart: baseEndNum > 0 ? baseEndNum : baseStartNum,
            potencial: potencialNum,
            lastUpdate: selectedMonth
          }, { merge: true });

          return Promise.all([p1, p2, p3]);
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      alert(`Dados salvos! A base final foi transportada como abertura para ${nextMonth}.`);
    } catch (err) {
      console.error(err);
      alert("Erro ao sincronizar bases.");
    }
    setSaving(false);
  };

  return (
    <div className="animated-view" style={local.panel}>
      <div style={local.headerRow}>
        <div>
          <h2 style={local.panelTitle}><Database size={24} color={colors.primary}/> Gestão de Base e Potencial</h2>
          <p style={{margin:'5px 0 0 0', fontSize:'13px', color:'var(--text-muted)'}}>
            O fechamento da auditoria será automaticamente a abertura do mês seguinte.
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
                <th style={local.th}>Base Inicial (Abertura)</th>
                <th style={local.th}>Base Final (Auditoria)</th>
                <th style={{...local.th, color: colors.primary}}>
                   <div style={{display:'flex', alignItems:'center', gap:'4px'}}><Target size={12}/> HPs Ativos</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {cities.map(city => {
                const cityBase = basesData[city.id] || { baseStart: '', baseEnd: '' };
                return (
                  <tr key={city.id} style={{borderBottom: '1px solid var(--border)'}}>
                    <td style={local.td}><strong>{city.name || city.city}</strong></td>
                    <td style={local.td}>
                      <input 
                        type="number" 
                        value={cityBase.baseStart} 
                        onChange={e => updateField(city.id, 'baseStart', e.target.value)}
                        style={local.baseInput}
                        placeholder="Abertura"
                      />
                    </td>
                    <td style={local.td}>
                      <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                        <input 
                          type="number" 
                          value={cityBase.baseEnd} 
                          onChange={e => updateField(city.id, 'baseEnd', e.target.value)}
                          style={{...local.baseInput, borderColor: cityBase.baseEnd ? colors.success : 'var(--border)'}}
                          placeholder="Fechamento"
                        />
                        {cityBase.baseEnd > 0 && <ArrowRight size={14} color={colors.success} title="Transportar para próximo mês" />}
                      </div>
                    </td>
                    <td style={local.td}>
                      <input 
                        type="number" 
                        value={city.potencial || ''} 
                        onChange={e => updateField(city.id, 'potencial', e.target.value)}
                        style={{...local.baseInput, borderColor: colors.primary + '40', background: colors.primary + '05'}}
                        placeholder="Potencial HP"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <button type="submit" disabled={saving || cities.length === 0} style={local.btnSave}>
          {saving ? <RefreshCcw size={18} className="animate-spin" /> : <Save size={18}/>} 
          Salvar Bases e Transportar para Próximo Mês
        </button>
      </form>
    </div>
  );
}

const local = {
  panel: { background:'var(--bg-card)', padding:'30px', borderRadius:'24px', border:'1px solid var(--border)' },
  headerRow: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '30px' },
  panelTitle: { fontSize:'22px', fontWeight:'900', display:'flex', alignItems:'center', gap:'12px', margin:0 },
  tableContainer: { borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '15px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' },
  td: { padding: '15px', fontSize: '14px', color: 'var(--text-main)' },
  baseInput: { padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-app)', width: '100%', fontWeight: '800', color: 'var(--text-main)' },
  btnSave: { marginTop:'20px', width:'100%', padding:'15px', borderRadius:'12px', background:colors.primary, color:'white', fontWeight:'900', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', border:'none' }
};