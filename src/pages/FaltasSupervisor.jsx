import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  Calendar, UserX, Clock, MapPin, AlertTriangle, UploadCloud, 
  CalendarDays, User, Briefcase, Check, XCircle, Grid, FileText, 
  Trash2, ArrowRight, LayoutGrid, CheckCircle, Search, Plus, CalendarOff, X,
  Users, AlertCircle
} from 'lucide-react';

// IMPORTAÇÃO DOS ESTILOS GLOBAIS
import { styles as global } from '../styles/globalStyles';

export default function FaltasSupervisor({ userData }) {
  const [activeTab, setActiveTab] = useState('gestao');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState(null);
  
  // --- DADOS ---
  const [stores, setStores] = useState([]);
  const [attendants, setAttendants] = useState([]); 
  const [floaters, setFloaters] = useState([]);
  const [absencesList, setAbsencesList] = useState([]);
  const [holidaysList, setHolidaysList] = useState([]); 

  // --- ESTADO DO FORMULÁRIO (FALTAS) ---
  const [faltaForm, setFaltaForm] = useState({
    storeId: '', attendantId: '', startDate: '', endDate: '',
    isFullDay: true, startTime: '', endTime: '', reason: '', obs: '', coverageMap: {} 
  });

  // --- ESTADO DO FORMULÁRIO (FÉRIAS) ---
  const [feriasForm, setFeriasForm] = useState({
    storeId: '', attendantId: '', startDate: '', endDate: '',
    coverageMap: {}, obs: ''
  });

  // --- CARREGAMENTO INICIAL ---
  const fetchAbsences = async () => {
    try {
      const q = query(collection(db, "absences"));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
      setAbsencesList(list);
    } catch (err) { console.error("Erro ao buscar faltas:", err); }
  };

  const fetchHolidays = async () => {
    try {
      const q = query(collection(db, "holidays"));
      const snap = await getDocs(q);
      setHolidaysList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error("Erro ao buscar feriados:", err); }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (userData?.clusterId) {
        const qStore = query(collection(db, "cities"), where("clusterId", "==", userData.clusterId));
        const snapStore = await getDocs(qStore);
        setStores(snapStore.docs.map(d => ({ id: d.id, ...d.data() })));

        const qUsers = query(collection(db, "users"), where("role", "==", "attendant"));
        const snapUsers = await getDocs(qUsers);
        setFloaters(snapUsers.docs.map(d => ({ id: d.id, ...d.data() })));

        fetchAbsences();
        fetchHolidays();
      }
    };
    fetchData();
  }, [userData]);

  const fetchAttendantsByStore = async (storeId) => {
    const q = query(collection(db, "users"), where("cityId", "==", storeId), where("role", "==", "attendant"));
    const snap = await getDocs(q);
    setAttendants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleStoreChange = (e, type) => {
    const storeId = e.target.value;
    if (type === 'falta') setFaltaForm({ ...faltaForm, storeId, attendantId: '' });
    else setFeriasForm({ ...feriasForm, storeId, attendantId: '' });
    if (storeId) fetchAttendantsByStore(storeId);
    else setAttendants([]);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setFileName(file.name);
  };

  // --- AUXILIARES ---
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

  const getFloaterName = (id) => {
    if (id === 'loja_fechada') return 'FECHADA';
    const f = floaters.find(u => u.id === id);
    return f ? f.name.split(' ')[0] : '...';
  };

  const deleteAbsence = async (id) => {
    if(!window.confirm("Excluir este registro?")) return;
    try { await deleteDoc(doc(db, "absences", id)); fetchAbsences(); } catch (err) { alert(err.message); }
  };

  // --- ATUALIZAÇÃO RÁPIDA DE COBERTURA ---
  const updateCoverageQuickly = async (absenceId, date, floaterId, currentMap) => {
    try {
      const newMap = { ...currentMap, [date]: floaterId };
      await updateDoc(doc(db, "absences", absenceId), { coverageMap: newMap });
      fetchAbsences(); 
    } catch (e) {
      alert("Erro ao atualizar: " + e.message);
    }
  };

  // --- COMPONENTES DE ABA ---

  const GestaoView = () => {
    const today = new Date().toISOString().split('T')[0];
    
    const upcomingAbsences = absencesList.filter(abs => abs.endDate >= today && abs.type === 'falta');
    const upcomingVacations = absencesList.filter(abs => abs.endDate >= today && abs.type === 'ferias');

    const renderAbsenceCard = (item) => {
      const dates = getDatesInRange(item.startDate, item.endDate);
      const storeName = stores.find(s => s.id === item.storeId)?.name || item.storeId;
      const attendantName = attendants.find(a => a.id === item.attendantId)?.name || floaters.find(f => f.id === item.attendantId)?.name || 'Atendente';

      const hasPending = dates.some(d => !item.coverageMap?.[d]);

      return (
        <div key={item.id} style={{...(global.card || {}), borderLeft: hasPending ? '4px solid #f59e0b' : '4px solid #10b981', marginBottom:'20px'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'15px'}}>
            <div>
              <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                <span style={{fontSize:'12px', fontWeight:'bold', color: item.type==='ferias' ? 'var(--text-brand)' : colors.danger, background: item.type==='ferias' ? 'var(--bg-primary-light)' : 'var(--bg-danger-light)', padding:'4px 8px', borderRadius:'6px'}}>
                  {item.type === 'ferias' ? 'FÉRIAS' : 'FALTA'}
                </span>
                <h4 style={{fontWeight:'bold', color:'var(--text-main)', margin:0}}>{storeName}</h4>
              </div>
              <p style={{fontSize:'14px', color:'var(--text-muted)', marginTop:'5px'}}>
                <strong style={{color:'var(--text-main)'}}>{attendantName}</strong> • {item.reason || 'Ausência Programada'}
              </p>
              <p style={{fontSize:'12px', color:'var(--text-muted)', marginTop:'2px', opacity: 0.8}}>
                {new Date(item.startDate + 'T12:00:00').toLocaleDateString()} até {new Date(item.endDate + 'T12:00:00').toLocaleDateString()}
              </p>
            </div>
            <button onClick={() => deleteAbsence(item.id)} style={{border:'none', background:'none', color:colors.danger, cursor:'pointer'}}><Trash2 size={16}/></button>
          </div>

          <div style={{background:'var(--bg-app)', borderRadius:'12px', padding:'10px', display:'flex', flexDirection:'column', gap:'8px', border: '1px solid var(--border)'}}>
            {dates.map(date => {
              const assignedId = item.coverageMap?.[date];
              const isClosed = assignedId === 'loja_fechada';
              const dateObj = new Date(date + 'T12:00:00');
              const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });

              return (
                <div key={date} style={{display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:'13px'}}>
                  <div style={{display:'flex', gap:'10px', alignItems:'center', width:'120px'}}>
                    <span style={{fontWeight:'bold', color:'var(--text-muted)'}}>{dateObj.getDate()}/{dateObj.getMonth()+1}</span>
                    <span style={{fontSize:'11px', textTransform:'uppercase', color:'var(--text-muted)'}}>{dayName}</span>
                  </div>
                  
                  <div style={{flex: 1}}>
                    <select 
                      value={assignedId || ''} 
                      onChange={(e) => updateCoverageQuickly(item.id, date, e.target.value, item.coverageMap)}
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '6px',
                        border: !assignedId ? '1px solid #f59e0b' : isClosed ? '1px solid var(--border-danger)' : '1px solid var(--border-success)',
                        background: !assignedId ? '#fffbeb' : isClosed ? 'var(--bg-danger-light)' : 'var(--bg-success-light)',
                        color: !assignedId ? '#b45309' : isClosed ? colors.danger : colors.success,
                        fontWeight: 'bold',
                        fontSize: '12px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">⚠️ Pendente - Selecione</option>
                      <option value="loja_fechada">🚫 LOJA FECHADA</option>
                      {floaters.map(f => (
                        <option key={f.id} value={f.id}>{f.name.split(' ')[0]} ({f.cityId || 'Volante'})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      );
    };

    return (
      <div style={{animation: 'fadeIn 0.5s'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
          <h3 style={global.sectionTitle}>Próximas Ausências</h3>
          <div style={{display:'flex', gap:'10px'}}>
             <div style={{display:'flex', alignItems:'center', gap:'5px', fontSize:'12px', color:colors.danger, fontWeight:'bold'}}><AlertCircle size={14}/> Pendente</div>
             <div style={{display:'flex', alignItems:'center', gap:'5px', fontSize:'12px', color:colors.success, fontWeight:'bold'}}><CheckCircle size={14}/> Coberto</div>
          </div>
        </div>

        {upcomingAbsences.length === 0 && upcomingVacations.length === 0 ? (
          <div style={global.emptyState}>
            <CheckCircle size={40} style={{marginBottom:'10px', opacity:0.5}} />
            <p>Nenhuma falta ou férias programada para os próximos dias.</p>
          </div>
        ) : (
          <div style={global.gridCards}>
            {upcomingAbsences.map(renderAbsenceCard)}
            {upcomingVacations.map(renderAbsenceCard)}
          </div>
        )}
      </div>
    );
  };

  const EscalaView = () => {
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
      if(window.confirm("Remover feriado?")) { await deleteDoc(doc(db, "holidays", id)); fetchHolidays(); }
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
      <div style={{animation: 'fadeIn 0.5s'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
          <div>
            <h3 style={global.sectionTitle}>Calendário de Escala</h3>
            {selectedStore && <p style={{fontSize:'12px', color:'var(--text-muted)'}}>Dias Úteis em {monthKey.split('-')[1]}: <strong style={{color:colors.success}}>{diasUteisCount}</strong></p>}
          </div>
          <div style={{display:'flex', gap:'10px'}}>
            <input type="month" style={{...(global.input || {}), padding: '8px', width: 'auto'}} value={monthKey} onChange={(e) => setCurrentDate(new Date(e.target.value + '-01T00:00:00'))} />
            <select style={{...(global.select || {}), padding: '8px', width: 'auto'}} value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}>
              <option value="">Selecione uma Loja...</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {!selectedStore ? (
          <div style={global.emptyState}>
            <MapPin size={40} style={{marginBottom:'10px', opacity:0.5}} />
            <p>Selecione uma loja acima para visualizar a escala.</p>
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
                if (holiday) { bg = 'var(--bg-danger-light)'; color = '#dc2626'; }
                else if (weekDay === 0) { bg = 'var(--bg-danger-light)'; color = colors.danger; }
                else if (weekDay === 6) { bg = 'rgba(245, 158, 11, 0.1)'; color = '#c2410c'; }

                return (
                  <div key={day} onClick={() => handleDayClick(dateStr)} style={{...local.calendarCell, background: bg, color: color}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                      <span style={{fontWeight: '900', fontSize: '14px'}}>{day}</span>
                      {weekDay === 0 && <span style={{fontSize: '9px', fontWeight:'bold', opacity:0.7}}>DOM</span>}
                    </div>
                    {holiday && (
                      <div style={local.holidayBadge}>
                        {holiday.name}
                        <button onClick={(e) => deleteHoliday(e, holiday.id)} style={{border:'none', background:'none', cursor:'pointer', color:'#b91c1c'}}><X size={10}/></button>
                      </div>
                    )}
                    {info && (
                      <div style={{marginTop: '5px'}}>
                        <div style={{fontSize: '9px', fontWeight: 'bold', color: info.type === 'ferias' ? 'var(--text-brand)' : colors.danger}}>
                          {info.type === 'ferias' ? 'FÉRIAS' : 'FALTA'}
                        </div>
                        {info.status === 'loja_fechada' ? (
                          <div style={{background:colors.danger, color: '#ffffff', padding:'2px', borderRadius:'3px', fontSize:'9px', textAlign:'center', fontWeight:'bold'}}>FECHADA</div>
                        ) : info.status === 'pendente' ? (
                          <div style={{background:colors.warning, color: '#ffffff', padding:'2px', borderRadius:'3px', fontSize:'9px', textAlign:'center', fontWeight:'bold'}}>PENDENTE</div>
                        ) : (
                          <div style={{background:colors.success, color: '#ffffff', padding:'2px', borderRadius:'3px', fontSize:'9px', textAlign:'center', fontWeight:'bold'}}>SUB: {getFloaterName(info.status)}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {holidayModal.open && (
          <div style={global.modalOverlay}>
            <div style={global.modalBox}>
              <div style={global.modalHeader}>
                <h3 style={global.modalTitle}>Adicionar Feriado</h3>
                <button onClick={() => setHolidayModal({...holidayModal, open: false})} style={global.closeBtn}><X size={20}/></button>
              </div>
              <form onSubmit={saveHoliday} style={global.form}>
                <div style={global.field}>
                  <label style={global.label}>Nome do Feriado</label>
                  <input placeholder="Ex: Aniversário da Cidade" value={newHolidayName} onChange={e => setNewHolidayName(e.target.value)} style={global.input} required autoFocus />
                </div>
                <div style={global.field}>
                  <label style={global.label}>Tipo</label>
                  <select style={global.select} value={newHolidayType} onChange={e => setNewHolidayType(e.target.value)}>
                    <option value="municipal">Municipal (Só esta loja)</option>
                    <option value="company">Empresa (Todas as Lojas)</option>
                  </select>
                </div>
                <button style={global.btnPrimary}>Salvar Feriado</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  const CoverageManager = ({ startDate, endDate, coverageMap, onChange, floaters }) => {
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
      if (!selectedFloater) return alert("Selecione um folguista.");
      const newMap = { ...coverageMap };
      selectedDates.forEach(date => newMap[date] = selectedFloater);
      onChange(newMap);
      setSelectedDates([]); 
    };

    return (
      <div style={local.coveragePanel}>
        <div style={local.coverageHeader}>
          <h4 style={{fontWeight:'bold', color:'var(--text-main)', display:'flex', gap:'8px', alignItems:'center'}}>
            <Grid size={18} /> Definir Cobertura em Massa
          </h4>
          <div style={{display:'flex', gap:'8px'}}>
            <button type="button" onClick={selectAll} style={local.btnSmallAction}>Todos</button>
            <button type="button" onClick={deselectAll} style={local.btnSmallCancel}>Limpar</button>
          </div>
        </div>
        <div style={{display:'flex', gap:'10px', marginBottom:'20px', alignItems:'center'}}>
          <User size={16} color="var(--text-muted)" />
          <select style={{...(global.select || {}), padding:'8px'}} value={selectedFloater} onChange={(e) => setSelectedFloater(e.target.value)}>
            <option value="">Quem vai cobrir os dias marcados?</option>
            <option value="loja_fechada">🚫 LOJA FECHADA</option>
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
                  border: isSelected ? '2px solid var(--text-brand)' : '1px solid var(--border)',
                  background: isSelected ? 'var(--bg-primary-light)' : 'var(--bg-card)',
                  ...local.coverageItem
                }}>
                <div style={{fontSize:'12px', color:'var(--text-muted)', marginBottom:'4px', fontWeight:'bold'}}>{dateObj.getDate()}/{dateObj.getMonth()+1}</div>
                {assignedId ? (
                  <div style={{fontSize:'10px', fontWeight:'bold', color: isClosed ? colors.danger : colors.success, background: isClosed ? 'var(--bg-danger-light)' : 'var(--bg-success-light)', padding: '3px 6px', borderRadius: '4px', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                    {isClosed ? 'FECHADA' : getFloaterName(assignedId)}
                  </div>
                ) : (
                  <div style={{fontSize:'10px', color:colors.warning, background:'#fff7ed', padding:'3px', borderRadius:'4px', textAlign:'center', fontWeight: 'bold'}}>Pendente</div>
                )}
                {isSelected && <div style={{position:'absolute', top:'-6px', right:'-6px', background:'var(--text-brand)', color: '#ffffff', borderRadius:'50%', padding:'2px', border:'2px solid var(--bg-card)'}}><Check size={10}/></div>}
              </div>
            )
          })}
        </div>
      </div>
    );
  };

  const saveFalta = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "absences"), {
        type: 'falta',
        ...faltaForm,
        createdBy: userData.name,
        createdAt: serverTimestamp(),
        clusterId: userData.clusterId,
        status: 'Pendente'
      });
      alert("Falta registrada!");
      setFaltaForm({ storeId: '', attendantId: '', startDate: '', endDate: '', isFullDay: true, startTime: '', endTime: '', reason: '', obs: '', coverageMap: {} });
      setFileName(null);
      fetchAbsences();
      setActiveTab('gestao'); 
    } catch (err) { alert("Erro: " + err.message); }
    setLoading(false);
  };

  const saveFerias = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "absences"), {
        type: 'ferias',
        ...feriasForm,
        createdBy: userData.name,
        createdAt: serverTimestamp(),
        clusterId: userData.clusterId,
        status: 'Programada'
      });
      alert("Férias programadas!");
      setFeriasForm({ storeId: '', attendantId: '', startDate: '', endDate: '', coverageMap: {}, obs: '' });
      fetchAbsences();
      setActiveTab('gestao');
    } catch (err) { alert("Erro: " + err.message); }
    setLoading(false);
  };

  return (
    <div style={{...(global.container || {}), maxWidth: '900px'}}>
      <div style={global.header}>
        <div style={{...(global.iconHeader || {}), background: 'var(--text-brand)'}}><UserX size={28} color="white"/></div>
        <div>
          <h1 style={global.title}>Gestão de Ausências</h1>
          <p style={global.subtitle}>Faltas, Atestados e Escala.</p>
        </div>
      </div>

      <div style={local.tabs}>
        <button onClick={() => setActiveTab('gestao')} style={activeTab === 'gestao' ? local.tabActive : local.tab}>
          <Briefcase size={16} /> Gestão de Cobertura
        </button>
        <button onClick={() => setActiveTab('escala')} style={activeTab === 'escala' ? local.tabActive : local.tab}>
          <LayoutGrid size={16} /> Calendário de Escala
        </button>
        <button onClick={() => setActiveTab('faltas')} style={activeTab === 'faltas' ? local.tabActive : local.tab}>
          <AlertTriangle size={16} /> Nova Falta
        </button>
        <button onClick={() => setActiveTab('ferias')} style={activeTab === 'ferias' ? local.tabActive : local.tab}>
          <CalendarDays size={16} /> Agendar Férias
        </button>
      </div>

      <div style={local.content}>
        
        {activeTab === 'gestao' && <GestaoView />}
        {activeTab === 'escala' && <EscalaView />}

        {activeTab === 'faltas' && (
          <div style={{animation:'fadeIn 0.3s'}}>
            <form onSubmit={saveFalta} style={global.form}>
              <div style={local.section}>
                <h3 style={global.sectionTitle}>1. Dados da Falta</h3>
                <div style={local.row}>
                  <div style={global.field}>
                    <label style={global.label}>Loja</label>
                    <select style={global.select} value={faltaForm.storeId} onChange={(e) => handleStoreChange(e, 'falta')} required>
                      <option value="">Selecione...</option>
                      {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div style={global.field}>
                    <label style={global.label}>Atendente</label>
                    <select style={global.select} value={faltaForm.attendantId} onChange={e => setFaltaForm({...faltaForm, attendantId: e.target.value})} required disabled={!faltaForm.storeId}>
                      <option value="">Selecione...</option>
                      {attendants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>
                <div style={local.row}>
                  <div style={global.field}>
                    <label style={global.label}>Motivo</label>
                    <select style={global.select} value={faltaForm.reason} onChange={e => setFaltaForm({...faltaForm, reason: e.target.value})} required>
                      <option value="">Selecione...</option>
                      <option value="Atestado">Atestado Médico</option>
                      <option value="Injustificada">Falta Injustificada</option>
                      <option value="Pessoal">Problema Pessoal</option>
                    </select>
                  </div>
                  <div style={global.field}>
                    <label style={global.label}>Período</label>
                    <div style={{display:'flex', gap:'10px'}}>
                      <input type="date" style={global.input} value={faltaForm.startDate} onChange={e => setFaltaForm({...faltaForm, startDate: e.target.value})} required />
                      <input type="date" style={global.input} value={faltaForm.endDate} onChange={e => setFaltaForm({...faltaForm, endDate: e.target.value})} required />
                    </div>
                  </div>
                </div>
              </div>

              <CoverageManager 
                startDate={faltaForm.startDate} 
                endDate={faltaForm.endDate} 
                coverageMap={faltaForm.coverageMap} 
                onChange={(newMap) => setFaltaForm({...faltaForm, coverageMap: newMap})} 
                floaters={floaters} 
              />

              <div style={local.section}>
                 <h3 style={global.sectionTitle}>Anexos</h3>
                 <label htmlFor="file-upload" style={local.uploadBox}>
                   <input id="file-upload" type="file" style={{display: 'none'}} onChange={handleFileChange} />
                   <UploadCloud size={24} color="var(--text-muted)" />
                   <span style={{fontSize: '13px', color: 'var(--text-muted)', marginTop: '5px', fontWeight: 'bold'}}>{fileName ? `Arquivo: ${fileName}` : "Anexar Comprovante"}</span>
                 </label>
                 <textarea style={{...(global.textarea || {}), marginTop:'15px'}} placeholder="Observações adicionais..." value={faltaForm.obs} onChange={e => setFaltaForm({...faltaForm, obs: e.target.value})} />
              </div>

              <button type="submit" style={{...(global.btnPrimary || {}), background: 'var(--text-brand)'}} disabled={loading}>{loading ? 'Salvando...' : 'Registrar Falta'}</button>
            </form>
          </div>
        )}

        {activeTab === 'ferias' && (
          <form onSubmit={saveFerias} style={global.form}>
            <div style={local.infoBox}>
              <Briefcase size={20} color={colors.success} />
              <p style={{margin:0}}>As férias devem ser programadas com <strong>30 dias de antecedência</strong>.</p>
            </div>
            
            <div style={local.section}>
              <h3 style={global.sectionTitle}>Dados das Férias</h3>
              <div style={local.row}>
                <div style={global.field}>
                  <label style={global.label}>Loja</label>
                  <select style={global.select} value={feriasForm.storeId} onChange={(e) => handleStoreChange(e, 'ferias')} required>
                    <option value="">Selecione...</option>
                    {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div style={global.field}>
                  <label style={global.label}>Atendente</label>
                  <select style={global.select} value={feriasForm.attendantId} onChange={e => setFeriasForm({...feriasForm, attendantId: e.target.value})} required disabled={!feriasForm.storeId}>
                    <option value="">Selecione...</option>
                    {attendants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={local.row}>
                <div style={global.field}>
                  <label style={global.label}>Período</label>
                  <div style={{display:'flex', gap:'10px'}}>
                    <input type="date" style={global.input} value={feriasForm.startDate} onChange={e => setFeriasForm({...feriasForm, startDate: e.target.value})} required />
                    <input type="date" style={global.input} value={feriasForm.endDate} onChange={e => setFeriasForm({...feriasForm, endDate: e.target.value})} required />
                  </div>
                </div>
              </div>
            </div>
            
            <CoverageManager 
              startDate={feriasForm.startDate} 
              endDate={feriasForm.endDate} 
              coverageMap={feriasForm.coverageMap} 
              onChange={(newMap) => setFeriasForm({...feriasForm, coverageMap: newMap})} 
              floaters={floaters} 
            />

            <button type="submit" style={{...(global.btnPrimary || {}), background: colors.success}} disabled={loading}>{loading ? 'Salvando...' : 'Agendar Férias'}</button>
          </form>
        )}

      </div>
    </div>
  );
}

// ESTILOS LOCAIS
const local = {
  tabs: { display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '1px solid var(--border)', paddingBottom: '1px', overflowX: 'auto' },
  tab: { padding: '12px 20px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '3px solid transparent', whiteSpace: 'nowrap', transition: '0.2s' },
  tabActive: { padding: '12px 20px', border: 'none', background: 'transparent', color: 'var(--text-brand)', cursor: 'pointer', fontSize: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '3px solid var(--text-brand)', whiteSpace: 'nowrap', transition: '0.2s' },
  
  content: { background: 'var(--bg-card)', padding: '30px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
  
  infoBox: { background: 'var(--bg-success-light)', border: '1px solid var(--border-success)', padding: '15px 20px', borderRadius: '12px', display: 'flex', gap: '15px', alignItems: 'center', fontSize: '14px', color: colors.success },
  section: { padding: '25px', border: '1px solid var(--border)', borderRadius: '16px', background: 'var(--bg-panel)' },
  row: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' },
  
  uploadBox: { border: '2px dashed var(--border)', borderRadius: '16px', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--bg-app)', transition: '0.2s' },
  
  calendarContainer: { border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' },
  calendarHeader: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)' },
  calendarHeaderCell: { textAlign: 'center', padding: '12px', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' },
  calendarDays: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--bg-card)' },
  calendarCellEmpty: { background: 'var(--bg-app)', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)' },
  calendarCell: { minHeight: '100px', padding: '10px', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', cursor: 'pointer', transition: '0.2s', position: 'relative' },
  
  holidayBadge: { marginTop: '8px', fontSize: '10px', background: 'var(--bg-danger-light)', color: colors.danger, padding: '4px 6px', borderRadius: '6px', fontWeight: 'bold', display:'flex', justifyContent:'space-between', alignItems:'center', border: '1px solid var(--border-danger)' },
  
  coveragePanel: { marginTop: '20px', background: 'var(--bg-app)', padding: '25px', borderRadius: '20px', border: '1px solid var(--border)' },
  coverageHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap: 'wrap', gap: '10px' },
  coverageGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '15px' },
  coverageItem: { borderRadius: '14px', padding: '12px', cursor: 'pointer', position: 'relative', transition: 'all 0.2s' },
  
  btnSmallAction: { background: 'var(--bg-primary-light)', color: 'var(--text-brand)', border: '1px solid var(--text-brand)', padding: '6px 12px', borderRadius: '8px', cursor:'pointer', fontSize:'12px', fontWeight: 'bold', transition: '0.2s' },
  btnSmallCancel: { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '8px', cursor:'pointer', fontSize:'12px', fontWeight: 'bold', transition: '0.2s' },
  btnApply: { background: 'var(--text-brand)', color: '#ffffff', border: 'none', padding: '12px 24px', borderRadius: '10px', fontSize: '13px', fontWeight: '900', cursor: 'pointer', transition: 'transform 0.2s' },
};