import React, { useState } from 'react';
import { Grid, User, Check } from 'lucide-react';
import { colors } from '../../../styles/globalStyles';

// Função auxiliar para calcular os dias entre duas datas
const getDatesInRange = (start, end) => {
  if (!start || !end) return [];
  const dateArray = [];
  let currentDate = new Date(start + 'T12:00:00');
  const stopDate = new Date(end + 'T12:00:00');
  while (currentDate <= stopDate) {
    dateArray.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dateArray;
};

export default function CoverageManager({ startDate, endDate, coverageMap, onChange, floaters }) {
  const [selectedDates, setSelectedDates] = useState([]);
  const [selectedFloater, setSelectedFloater] = useState('');
  
  const dates = getDatesInRange(startDate, endDate);

  if (dates.length === 0) return null;

  const toggleDate = (date) => {
    if (selectedDates.includes(date)) setSelectedDates(selectedDates.filter(d => d !== date));
    else setSelectedDates([...selectedDates, date]);
  };

  const selectAll = () => setSelectedDates(dates);
  const deselectAll = () => setSelectedDates([]);
  
  const applyCoverage = (e) => {
    e.preventDefault();
    if (!selectedFloater) return alert("Selecione um folguista ou marque a loja como fechada.");
    const newMap = { ...coverageMap };
    selectedDates.forEach(date => newMap[date] = selectedFloater);
    onChange(newMap);
    setSelectedDates([]); 
  };

  const getFloaterName = (id) => {
    if (id === 'loja_fechada') return 'FECHADA';
    const f = floaters.find(u => u.id === id);
    return f ? f.name.split(' ')[0] : '...';
  };

  return (
    <div style={local.coveragePanel}>
      <div style={local.coverageHeader}>
        <h4 style={{fontWeight:'900', color:'var(--text-main)', display:'flex', gap:'8px', alignItems:'center', margin: 0}}>
          <Grid size={18} color={colors.primary} /> Definir Cobertura em Massa
        </h4>
        <div style={{display:'flex', gap:'10px'}}>
          <button type="button" onClick={selectAll} style={local.btnSmallAction}>Todos os Dias</button>
          <button type="button" onClick={deselectAll} style={local.btnSmallCancel}>Limpar Seleção</button>
        </div>
      </div>

      <div style={{display:'flex', gap:'15px', marginBottom:'25px', alignItems:'center', background: 'var(--bg-card)', padding: '15px', borderRadius: '14px', border: '1px solid var(--border)'}}>
        <User size={18} color="var(--text-muted)" style={{flexShrink: 0}} />
        <select 
          style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '14px', outline: 'none' }} 
          value={selectedFloater} 
          onChange={(e) => setSelectedFloater(e.target.value)}
        >
          <option value="">Quem irá cobrir os dias marcados?</option>
          <option value="loja_fechada">🚫 LOJA FECHADA (Sem Cobertura)</option>
          {floaters.map(f => <option key={f.id} value={f.id}>{f.name} ({f.cityId || 'Volante'})</option>)}
        </select>
        <button type="button" onClick={applyCoverage} style={local.btnApply}>Aplicar</button>
      </div>

      <div style={local.coverageGrid}>
        {dates.map(date => {
          const isSelected = selectedDates.includes(date);
          const assignedId = coverageMap[date];
          const isClosed = assignedId === 'loja_fechada';
          const dateObj = new Date(date + 'T12:00:00');
          return (
            <div key={date} onClick={() => toggleDate(date)} style={{
                border: isSelected ? `2px solid ${colors.primary}` : '1px solid var(--border)',
                background: isSelected ? `${colors.primary}10` : 'var(--bg-card)',
                ...local.coverageItem
              }}>
              <div style={{fontSize:'12px', color:'var(--text-muted)', marginBottom:'6px', fontWeight:'800'}}>{dateObj.getDate().toString().padStart(2, '0')}/{(dateObj.getMonth()+1).toString().padStart(2, '0')}</div>
              {assignedId ? (
                <div style={{fontSize:'10px', fontWeight:'900', color: isClosed ? colors.danger : colors.success, background: isClosed ? `${colors.danger}15` : `${colors.success}15`, padding: '4px 8px', borderRadius: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                  {isClosed ? 'FECHADA' : getFloaterName(assignedId)}
                </div>
              ) : (
                <div style={{fontSize:'10px', color:colors.warning, background:`${colors.warning}15`, padding:'4px 8px', borderRadius:'6px', textAlign:'center', fontWeight: '900'}}>Pendente</div>
              )}
              {isSelected && <div style={{position:'absolute', top:'-8px', right:'-8px', background:colors.primary, color: '#ffffff', borderRadius:'50%', padding:'3px', border:'2px solid var(--bg-card)', boxShadow: 'var(--shadow-sm)'}}><Check size={12}/></div>}
            </div>
          )
        })}
      </div>
    </div>
  );
}

const local = {
  coveragePanel: { marginTop: '30px', background: 'var(--bg-panel)', padding: '30px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
  coverageHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'25px', flexWrap: 'wrap', gap: '15px' },
  coverageGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '15px' },
  coverageItem: { borderRadius: '16px', padding: '15px', cursor: 'pointer', position: 'relative', transition: 'all 0.2s' },
  btnSmallAction: { background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: '10px', cursor:'pointer', fontSize:'13px', fontWeight: '900', transition: '0.2s', boxShadow: 'var(--shadow-sm)' },
  btnSmallCancel: { background: 'transparent', color: 'var(--text-muted)', border: 'none', padding: '8px 16px', borderRadius: '10px', cursor:'pointer', fontSize:'13px', fontWeight: '800', transition: '0.2s', textDecoration: 'underline' },
  btnApply: { background: colors.primary, color: '#ffffff', border: 'none', padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: '900', cursor: 'pointer', transition: 'transform 0.2s', flexShrink: 0 },
};