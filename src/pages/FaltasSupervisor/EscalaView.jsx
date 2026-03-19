import React, { useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { collection, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { styles as global, colors } from '../../styles/globalStyles';

// Função auxiliar
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

export default function EscalaView({ stores, absencesList, holidaysList, fetchHolidays, floaters }) {
  const [selectedStore, setSelectedStore] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [holidayModal, setHolidayModal] = useState({ open: false, date: '' });
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayType, setNewHolidayType] = useState('municipal');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); 
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const monthKey = currentDate.toISOString().slice(0, 7); 

  const isHoliday = (dateStr) => {
    return holidaysList.find(h => h.date === dateStr && (h.type === 'company' || h.type === 'national' || h.storeId === selectedStore));
  };

  let diasUteisCount = 0;
  daysArray.forEach(day => {
    const dateStr = `${monthKey}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(dateStr + 'T12:00:00');
    const weekDay = dateObj.getDay();
    if (weekDay !== 0 && weekDay !== 6 && !isHoliday(dateStr)) diasUteisCount++;
  });

  const handleDayClick = (dateStr) => {
    if (!selectedStore) return alert("Selecione uma loja primeiro.");
    setHolidayModal({ open: true, date: dateStr });
    setNewHolidayName('');
  };

  const saveHoliday = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "holidays"), {
        date: holidayModal.date, name: newHolidayName, type: newHolidayType,
        storeId: newHolidayType === 'municipal' ? selectedStore : null, createdAt: serverTimestamp()
      });
      setHolidayModal({ open: false, date: '' });
      fetchHolidays();
    } catch (err) { alert(err.message); }
  };

  const deleteHoliday = async (e, id) => {
    e.stopPropagation();
    if(window.confirm("Remover feriado?")) { 
      await deleteDoc(doc(db, "holidays", id)); 
      fetchHolidays(); 
    }
  };

  const getFloaterName = (id) => {
    if (id === 'loja_fechada') return 'FECHADA';
    const f = floaters.find(u => u.id === id);
    return f ? f.name.split(' ')[0] : '...';
  };

  const storeAbsences = absencesList.filter(abs => abs.storeId === selectedStore && (abs.startDate.startsWith(monthKey) || abs.endDate.startsWith(monthKey)));

  const dayStatus = {};
  storeAbsences.forEach(abs => {
    const dates = getDatesInRange(abs.startDate, abs.endDate);
    dates.forEach(date => {
      if (date.startsWith(monthKey)) {
        const day = parseInt(date.split('-')[2]);
        dayStatus[day] = {
          type: abs.type, status: abs.coverageMap?.[date] || 'pendente', reason: abs.reason || 'Férias'
        };
      }
    });
  });

  return (
    <div className="animated-view">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap: 'wrap', gap: '20px', marginBottom:'25px'}}>
        <div>
          <h3 style={{...global.sectionTitle, margin: 0}}>Calendário de Escala</h3>
          {selectedStore && <p style={{fontSize:'12px', color:'var(--text-muted)', marginTop: '4px', fontWeight: 'bold'}}>Dias Úteis em {monthKey.split('-')[1]}: <strong style={{color:colors.success}}>{diasUteisCount}</strong></p>}
        </div>
        <div style={{display:'flex', gap:'10px'}}>
          <input type="month" style={{...global.input, padding: '10px 15px', width: 'auto'}} value={monthKey} onChange={(e) => setCurrentDate(new Date(e.target.value + '-01T00:00:00'))} />
          <select style={{...global.select, padding: '10px 15px', width: 'auto'}} value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}>
            <option value="">Selecione a Loja Foco...</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {!selectedStore ? (
        <div style={{...global.emptyState, minHeight: '300px'}}>
          <MapPin size={40} style={{marginBottom:'15px', opacity:0.5}} />
          <p>Selecione uma loja no menu acima para planejar e visualizar a escala.</p>
        </div>
      ) : (
        <div style={local.calendarContainer}>
          <div style={local.calendarHeader}>
            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d, i) => (
              <div key={d} style={{...local.calendarHeaderCell, color: i === 0 || i === 6 ? colors.danger : 'var(--text-muted)'}}>{d}</div>
            ))}
          </div>
          <div style={local.calendarDays}>
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} style={local.calendarCellEmpty} />)}
            {daysArray.map(day => {
              const dateStr = `${monthKey}-${String(day).padStart(2, '0')}`;
              const dateObj = new Date(dateStr + 'T12:00:00');
              const weekDay = dateObj.getDay();
              const holiday = isHoliday(dateStr);
              const info = dayStatus[day];
              
              let bg = 'var(--bg-card)'; 
              let color = 'var(--text-main)';
              if (holiday) { bg = `${colors.danger}10`; color = colors.danger; }
              else if (weekDay === 0) { bg = `${colors.danger}05`; color = colors.danger; }
              else if (weekDay === 6) { bg = `${colors.warning}05`; color = colors.warning; }

              return (
                <div key={day} onClick={() => handleDayClick(dateStr)} style={{...local.calendarCell, background: bg, color: color}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                    <span style={{fontWeight: '900', fontSize: '15px'}}>{day}</span>
                    {weekDay === 0 && <span style={{fontSize: '9px', fontWeight:'900', opacity:0.5}}>DOM</span>}
                  </div>
                  {holiday && (
                    <div style={local.holidayBadge}>
                      <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{holiday.name}</span>
                      <button onClick={(e) => deleteHoliday(e, holiday.id)} style={{border:'none', background:'none', cursor:'pointer', color:colors.danger, padding: 0, display: 'flex'}}><X size={12}/></button>
                    </div>
                  )}
                  {info && (
                    <div style={{marginTop: '8px'}}>
                      <div style={{fontSize: '9px', fontWeight: '900', letterSpacing: '0.05em', color: info.type === 'ferias' ? colors.success : colors.danger, marginBottom: '2px'}}>
                        {info.type === 'ferias' ? 'FÉRIAS' : 'FALTA'}
                      </div>
                      {info.status === 'loja_fechada' ? (
                        <div style={{background:colors.danger, color: '#ffffff', padding:'4px', borderRadius:'6px', fontSize:'9px', textAlign:'center', fontWeight:'900'}}>FECHADA</div>
                      ) : info.status === 'pendente' ? (
                        <div style={{background:colors.warning, color: '#ffffff', padding:'4px', borderRadius:'6px', fontSize:'9px', textAlign:'center', fontWeight:'900'}}>PENDENTE</div>
                      ) : (
                        <div style={{background:colors.success, color: '#ffffff', padding:'4px', borderRadius:'6px', fontSize:'9px', textAlign:'center', fontWeight:'900', overflow: 'hidden', textOverflow: 'ellipsis'}}>SUB: {getFloaterName(info.status)}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* MODAL DE FERIADO */}
      {holidayModal.open && (
        <div style={global.modalOverlay}>
          <div style={{...global.modalBox, borderRadius: '24px'}}>
            <div style={global.modalHeader}>
              <h3 style={{...global.modalTitle, fontWeight: '900'}}>Adicionar Feriado</h3>
              <button onClick={() => setHolidayModal({...holidayModal, open: false})} style={global.closeBtn}><X size={20}/></button>
            </div>
            <form onSubmit={saveHoliday} style={{...global.form, padding: '10px 0'}}>
              <div style={global.field}>
                <label style={local.label}>Nome do Feriado</label>
                <input placeholder="Ex: Aniversário da Cidade" value={newHolidayName} onChange={e => setNewHolidayName(e.target.value)} style={global.input} required autoFocus />
              </div>
              <div style={global.field}>
                <label style={local.label}>Tipo de Feriado</label>
                <select style={global.select} value={newHolidayType} onChange={e => setNewHolidayType(e.target.value)}>
                  <option value="municipal">Municipal (Apenas esta loja)</option>
                  <option value="company">Empresa (Todas as Lojas)</option>
                </select>
              </div>
              <button style={{...global.btnPrimary, height: '50px', fontWeight: '900', borderRadius: '14px', marginTop: '10px'}}>Salvar Feriado</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const local = {
  label: { fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'block', letterSpacing: '0.05em' },
  calendarContainer: { border: '1px solid var(--border)', borderRadius: '24px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', background: 'var(--bg-card)' },
  calendarHeader: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)' },
  calendarHeaderCell: { textAlign: 'center', padding: '16px 12px', fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' },
  calendarDays: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' },
  calendarCellEmpty: { background: 'var(--bg-app)', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' },
  calendarCell: { minHeight: '120px', padding: '15px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', cursor: 'pointer', transition: '0.2s', position: 'relative' },
  holidayBadge: { marginTop: '10px', fontSize: '10px', background: `${colors.danger}15`, color: colors.danger, padding: '6px 8px', borderRadius: '8px', fontWeight: '900', display:'flex', justifyContent:'space-between', alignItems:'center', border: `1px solid ${colors.danger}40`, gap: '5px' },
};