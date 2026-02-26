import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { 
  Calendar, UserX, Clock, MapPin, AlertTriangle, UploadCloud, 
  CalendarDays, User, Briefcase, Check, XCircle, Grid, FileText, 
  Trash2, ArrowRight, LayoutGrid, CheckCircle, Search, Plus, CalendarOff, X,
  Users, AlertCircle
} from 'lucide-react';

export default function FaltasSupervisor({ userData }) {
  const [activeTab, setActiveTab] = useState('gestao'); // Iniciamos pela Gestão para foco em pendências
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
      fetchAbsences(); // Recarrega para mostrar atualizado
    } catch (e) {
      alert("Erro ao atualizar: " + e.message);
    }
  };

  // --- COMPONENTES DE ABA ---

  // 1. ABA DE GESTÃO DE FALTAS (NOVA)
  const GestaoView = () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Filtra faltas futuras ou atuais
    const upcomingAbsences = absencesList.filter(abs => abs.endDate >= today && abs.type === 'falta');
    const upcomingVacations = absencesList.filter(abs => abs.endDate >= today && abs.type === 'ferias');

    const renderAbsenceCard = (item) => {
      const dates = getDatesInRange(item.startDate, item.endDate);
      const storeName = stores.find(s => s.id === item.storeId)?.name || item.storeId;
      const attendantName = attendants.find(a => a.id === item.attendantId)?.name || floaters.find(f => f.id === item.attendantId)?.name || 'Atendente';

      // Verifica pendências
      const hasPending = dates.some(d => !item.coverageMap?.[d]);

      return (
        <div key={item.id} style={{...styles.card, borderLeft: hasPending ? '4px solid #f59e0b' : '4px solid #10b981', marginBottom:'20px'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'15px'}}>
            <div>
              <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                <span style={{fontSize:'12px', fontWeight:'bold', color: item.type==='ferias' ? '#2563eb' : '#ef4444', background: item.type==='ferias' ? '#eff6ff' : '#fef2f2', padding:'4px 8px', borderRadius:'6px'}}>
                  {item.type === 'ferias' ? 'FÉRIAS' : 'FALTA'}
                </span>
                <h4 style={{fontWeight:'bold', color:'#1e293b', margin:0}}>{storeName}</h4>
              </div>
              <p style={{fontSize:'14px', color:'#64748b', marginTop:'5px'}}>
                <strong>{attendantName}</strong> • {item.reason || 'Ausência Programada'}
              </p>
              <p style={{fontSize:'12px', color:'#94a3b8', marginTop:'2px'}}>
                {new Date(item.startDate + 'T12:00:00').toLocaleDateString()} até {new Date(item.endDate + 'T12:00:00').toLocaleDateString()}
              </p>
            </div>
            <button onClick={() => deleteAbsence(item.id)} style={{border:'none', background:'none', color:'#ef4444', cursor:'pointer'}}><Trash2 size={16}/></button>
          </div>

          {/* LISTA DE DIAS PARA COBERTURA */}
          <div style={{background:'#f8fafc', borderRadius:'12px', padding:'10px', display:'flex', flexDirection:'column', gap:'8px'}}>
            {dates.map(date => {
              const assignedId = item.coverageMap?.[date];
              const isClosed = assignedId === 'loja_fechada';
              const dateObj = new Date(date + 'T12:00:00');
              const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });

              return (
                <div key={date} style={{display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:'13px'}}>
                  <div style={{display:'flex', gap:'10px', alignItems:'center', width:'120px'}}>
                    <span style={{fontWeight:'bold', color:'#64748b'}}>{dateObj.getDate()}/{dateObj.getMonth()+1}</span>
                    <span style={{fontSize:'11px', textTransform:'uppercase', color:'#94a3b8'}}>{dayName}</span>
                  </div>
                  
                  <div style={{flex: 1}}>
                    <select 
                      value={assignedId || ''} 
                      onChange={(e) => updateCoverageQuickly(item.id, date, e.target.value, item.coverageMap)}
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '6px',
                        border: !assignedId ? '1px solid #f59e0b' : isClosed ? '1px solid #fecaca' : '1px solid #bbf7d0',
                        background: !assignedId ? '#fffbeb' : isClosed ? '#fef2f2' : '#f0fdf4',
                        color: !assignedId ? '#b45309' : isClosed ? '#b91c1c' : '#15803d',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        outline: 'none'
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
          <h3 style={styles.sectionTitle}>Próximas Ausências</h3>
          <div style={{display:'flex', gap:'10px'}}>
             <div style={{display:'flex', alignItems:'center', gap:'5px', fontSize:'12px', color:'#ef4444'}}><AlertCircle size={14}/> Pendente</div>
             <div style={{display:'flex', alignItems:'center', gap:'5px', fontSize:'12px', color:'#10b981'}}><CheckCircle size={14}/> Coberto</div>
          </div>
        </div>

        {upcomingAbsences.length === 0 && upcomingVacations.length === 0 ? (
          <div style={{textAlign:'center', padding:'60px', color:'#94a3b8', background:'#f8fafc', borderRadius:'16px'}}>
            <CheckCircle size={40} style={{marginBottom:'10px', opacity:0.5}} />
            <p>Nenhuma falta ou férias programada para os próximos dias.</p>
          </div>
        ) : (
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(350px, 1fr))', gap:'20px'}}>
            {upcomingAbsences.map(renderAbsenceCard)}
            {upcomingVacations.map(renderAbsenceCard)}
          </div>
        )}
      </div>
    );
  };

  // 2. ABA DE ESCALA (CALENDÁRIO INTERATIVO)
  const EscalaView = () => {
    const [selectedStore, setSelectedStore] = useState('');
    const [currentDate, setCurrentDate] = useState(new Date());
    
    // Modal de Feriado
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
            <h3 style={styles.sectionTitle}>Calendário de Escala</h3>
            {selectedStore && <p style={{fontSize:'12px', color:'#64748b'}}>Dias Úteis em {monthKey.split('-')[1]}: <strong style={{color:'#10b981'}}>{diasUteisCount}</strong></p>}
          </div>
          <div style={{display:'flex', gap:'10px'}}>
            <input type="month" style={styles.inputSmall} value={monthKey} onChange={(e) => setCurrentDate(new Date(e.target.value + '-01T00:00:00'))} />
            <select style={styles.inputSmall} value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}>
              <option value="">Selecione uma Loja...</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {!selectedStore ? (
          <div style={{textAlign:'center', padding:'60px', color:'#94a3b8', background:'#f8fafc', borderRadius:'16px'}}>
            <MapPin size={40} style={{marginBottom:'10px', opacity:0.5}} />
            <p>Selecione uma loja acima para visualizar a escala.</p>
          </div>
        ) : (
          <div style={{border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'}}>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f8fafc', borderBottom: '1px solid #e2e8f0'}}>
              {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map((d, i) => (
                <div key={d} style={{textAlign:'center', padding:'12px', fontSize:'12px', fontWeight:'bold', color: i === 0 || i === 6 ? '#ef4444' : '#64748b'}}>{d}</div>
              ))}
            </div>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'white'}}>
              {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} style={{background: '#fcfcfc', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9'}} />)}
              {daysArray.map(day => {
                const dateStr = `${monthKey}-${String(day).padStart(2, '0')}`;
                const dateObj = new Date(dateStr + 'T12:00:00');
                const weekDay = dateObj.getDay();
                const holiday = isHoliday(dateStr);
                const info = dayStatus[day];
                let bg = 'white'; let color = '#334155';
                if (holiday) { bg = '#fef2f2'; color = '#dc2626'; }
                else if (weekDay === 0) { bg = '#fff1f2'; color = '#ef4444'; }
                else if (weekDay === 6) { bg = '#fff7ed'; color = '#c2410c'; }
                return (
                  <div key={day} onClick={() => handleDayClick(dateStr)} style={{background: bg, color: color, minHeight: '100px', padding: '8px', borderBottom: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9', cursor: 'pointer', transition: '0.2s', position: 'relative'}} onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.background = bg}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}><span style={{fontWeight: 'bold', fontSize: '14px'}}>{day}</span>{weekDay === 0 && <span style={{fontSize: '9px', fontWeight:'bold', opacity:0.7}}>DOM</span>}</div>
                    {holiday && <div style={{marginTop: '4px', fontSize: '10px', background: '#fee2e2', color: '#b91c1c', padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold', display:'flex', justifyContent:'space-between', alignItems:'center'}}>{holiday.name}<button onClick={(e) => deleteHoliday(e, holiday.id)} style={{border:'none', background:'none', cursor:'pointer', color:'#b91c1c'}}><X size={10}/></button></div>}
                    {info && <div style={{marginTop: '5px'}}><div style={{fontSize: '9px', fontWeight: 'bold', color: info.type === 'ferias' ? '#2563eb' : '#ef4444'}}>{info.type === 'ferias' ? 'FÉRIAS' : 'FALTA'}</div>{info.status === 'loja_fechada' ? <div style={{background:'#ef4444', color:'white', padding:'2px', borderRadius:'3px', fontSize:'9px', textAlign:'center', fontWeight:'bold'}}>FECHADA</div> : info.status === 'pendente' ? <div style={{background:'#f59e0b', color:'white', padding:'2px', borderRadius:'3px', fontSize:'9px', textAlign:'center', fontWeight:'bold'}}>PENDENTE</div> : <div style={{background:'#10b981', color:'white', padding:'2px', borderRadius:'3px', fontSize:'9px', textAlign:'center', fontWeight:'bold'}}>SUB: {getFloaterName(info.status)}</div>}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {holidayModal.open && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalBox}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}><h3 style={{fontSize:'18px', fontWeight:'bold', color:'#334155'}}>Adicionar Feriado</h3><button onClick={() => setHolidayModal({...holidayModal, open: false})} style={{border:'none', background:'none', cursor:'pointer'}}><X size={20}/></button></div>
              <form onSubmit={saveHoliday} style={{display:'flex', flexDirection:'column', gap:'15px'}}><div><label style={styles.label}>Nome do Feriado</label><input placeholder="Ex: Aniversário da Cidade" value={newHolidayName} onChange={e => setNewHolidayName(e.target.value)} style={styles.input} required autoFocus /></div><div><label style={styles.label}>Tipo</label><select style={styles.input} value={newHolidayType} onChange={e => setNewHolidayType(e.target.value)}><option value="municipal">Municipal (Só esta loja)</option><option value="company">Empresa (Todas)</option></select></div><button style={styles.btnPrimary}>Salvar</button></form>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 3. COMPONENTE DE SELEÇÃO EM MASSA (Reutilizado)
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
      <div style={{marginTop: '20px', background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
          <h4 style={{fontWeight:'bold', color:'#334155', display:'flex', gap:'8px', alignItems:'center'}}>
            <Grid size={18} /> Definir Cobertura
          </h4>
          <div style={{display:'flex', gap:'8px'}}>
            <button type="button" onClick={selectAll} style={styles.btnSmallAction}>Todos</button>
            <button type="button" onClick={deselectAll} style={styles.btnSmallCancel}>Limpar</button>
          </div>
        </div>
        <div style={{display:'flex', gap:'10px', marginBottom:'20px', alignItems:'center'}}>
          <User size={16} color="#94a3b8" />
          <select style={{flex: 1, padding:'8px', border:'1px solid #cbd5e1', borderRadius:'8px', outline:'none', fontSize:'13px'}} value={selectedFloater} onChange={(e) => setSelectedFloater(e.target.value)}>
            <option value="">Quem vai cobrir os dias marcados?</option>
            <option value="loja_fechada">🚫 LOJA FECHADA</option>
            {floaters.map(f => <option key={f.id} value={f.id}>{f.name} ({f.cityId || 'Volante'})</option>)}
          </select>
          <button type="button" onClick={applyCoverage} style={styles.btnApply}>Aplicar</button>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px'}}>
          {dates.map(date => {
            const isSelected = selectedDates.includes(date);
            const assignedId = coverageMap[date];
            const isClosed = assignedId === 'loja_fechada';
            const dateObj = new Date(date + 'T12:00:00');
            return (
              <div key={date} onClick={() => toggleDate(date)} style={{
                  border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  background: isSelected ? '#eff6ff' : 'white',
                  borderRadius: '12px', padding: '10px', cursor: 'pointer', position: 'relative'
                }}>
                <div style={{fontSize:'12px', color:'#64748b', marginBottom:'4px', fontWeight:'bold'}}>{dateObj.getDate()}/{dateObj.getMonth()+1}</div>
                {assignedId ? (
                  <div style={{fontSize:'10px', fontWeight:'bold', color: isClosed ? '#ef4444' : '#059669', background: isClosed ? '#fef2f2' : '#ecfdf5', padding: '3px 6px', borderRadius: '4px', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                    {isClosed ? 'FECHADA' : getFloaterName(assignedId)}
                  </div>
                ) : (
                  <div style={{fontSize:'10px', color:'#f59e0b', background:'#fff7ed', padding:'3px', borderRadius:'4px', textAlign:'center'}}>Pendente</div>
                )}
                {isSelected && <div style={{position:'absolute', top:'-6px', right:'-6px', background:'#2563eb', color:'white', borderRadius:'50%', padding:'2px', border:'2px solid white'}}><Check size={10}/></div>}
              </div>
            )
          })}
        </div>
      </div>
    );
  };

  // --- HANDLERS ---
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
      setActiveTab('gestao'); // Vai para a aba de gestão automaticamente
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

  // --- RENDER ---
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.iconHeader}><UserX size={24} color="white"/></div>
        <div>
          <h1 style={styles.title}>Gestão de Ausências</h1>
          <p style={styles.subtitle}>Faltas, Atestados e Escala</p>
        </div>
      </div>

      <div style={styles.tabs}>
        <button onClick={() => setActiveTab('gestao')} style={activeTab === 'gestao' ? styles.tabActive : styles.tab}>
          <Briefcase size={18} /> Gestão de Cobertura
        </button>
        <button onClick={() => setActiveTab('escala')} style={activeTab === 'escala' ? styles.tabActive : styles.tab}>
          <LayoutGrid size={18} /> Calendário de Escala
        </button>
        <button onClick={() => setActiveTab('faltas')} style={activeTab === 'faltas' ? styles.tabActive : styles.tab}>
          <AlertTriangle size={18} /> Nova Falta
        </button>
        <button onClick={() => setActiveTab('ferias')} style={activeTab === 'ferias' ? styles.tabActive : styles.tab}>
          <CalendarDays size={18} /> Agendar Férias
        </button>
      </div>

      <div style={styles.content}>
        
        {/* ABA: GESTÃO DE COBERTURA (NOVA) */}
        {activeTab === 'gestao' && <GestaoView />}

        {/* ABA: ESCALA GERAL */}
        {activeTab === 'escala' && <EscalaView />}

        {/* ABA: NOVA FALTA */}
        {activeTab === 'faltas' && (
          <div style={{animation:'fadeIn 0.3s'}}>
            <form onSubmit={saveFalta} style={styles.formGrid}>
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>1. Dados da Falta</h3>
                <div style={styles.row}>
                  <div style={styles.field}>
                    <label style={styles.label}>Loja</label>
                    <select style={styles.input} value={faltaForm.storeId} onChange={(e) => handleStoreChange(e, 'falta')} required>
                      <option value="">Selecione...</option>
                      {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Atendente</label>
                    <select style={styles.input} value={faltaForm.attendantId} onChange={e => setFaltaForm({...faltaForm, attendantId: e.target.value})} required disabled={!faltaForm.storeId}>
                      <option value="">Selecione...</option>
                      {attendants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>
                <div style={styles.row}>
                  <div style={styles.field}><label style={styles.label}>Motivo</label><select style={styles.input} value={faltaForm.reason} onChange={e => setFaltaForm({...faltaForm, reason: e.target.value})} required><option value="">Selecione...</option><option value="Atestado">Atestado Médico</option><option value="Injustificada">Falta Injustificada</option><option value="Pessoal">Problema Pessoal</option></select></div>
                  <div style={styles.field}><label style={styles.label}>Período</label><div style={{display:'flex', gap:'5px'}}><input type="date" style={styles.input} value={faltaForm.startDate} onChange={e => setFaltaForm({...faltaForm, startDate: e.target.value})} required /><input type="date" style={styles.input} value={faltaForm.endDate} onChange={e => setFaltaForm({...faltaForm, endDate: e.target.value})} required /></div></div>
                </div>
              </div>

              {/* COBERTURA OBRIGATÓRIA */}
              <CoverageManager 
                startDate={faltaForm.startDate} 
                endDate={faltaForm.endDate} 
                coverageMap={faltaForm.coverageMap} 
                onChange={(newMap) => setFaltaForm({...faltaForm, coverageMap: newMap})} 
                floaters={floaters} 
              />

              <div style={styles.section}>
                 <h3 style={styles.sectionTitle}>3. Anexos</h3>
                 <label htmlFor="file-upload" style={styles.uploadBox}>
                   <input id="file-upload" type="file" style={{display: 'none'}} onChange={handleFileChange} />
                   <UploadCloud size={24} color="#94a3b8" />
                   <span style={{fontSize: '13px', color: '#64748b', marginTop: '5px'}}>{fileName ? `Arquivo: ${fileName}` : "Anexar Comprovante"}</span>
                 </label>
                 <textarea style={{...styles.input, height:'80px', marginTop:'15px'}} placeholder="Observações..." value={faltaForm.obs} onChange={e => setFaltaForm({...faltaForm, obs: e.target.value})} />
              </div>

              <button type="submit" style={styles.btnPrimary} disabled={loading}>{loading ? 'Salvando...' : 'Registrar Falta'}</button>
            </form>
          </div>
        )}

        {/* === ABA DE FÉRIAS === */}
        {activeTab === 'ferias' && (
          <form onSubmit={saveFerias} style={styles.formGrid}>
            <div style={styles.infoBox}><Briefcase size={20} color="#059669" /><p>Programar com <strong>30 dias de antecedência</strong>.</p></div>
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Dados das Férias</h3>
              <div style={styles.row}>
                <div style={styles.field}><label style={styles.label}>Loja</label><select style={styles.input} value={feriasForm.storeId} onChange={(e) => handleStoreChange(e, 'ferias')} required><option value="">Selecione...</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <div style={styles.field}><label style={styles.label}>Atendente</label><select style={styles.input} value={feriasForm.attendantId} onChange={e => setFeriasForm({...feriasForm, attendantId: e.target.value})} required disabled={!feriasForm.storeId}><option value="">Selecione...</option>{attendants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
              </div>
              <div style={styles.row}>
                <div style={styles.field}><label style={styles.label}>Período</label><div style={{display:'flex', gap:'5px'}}><input type="date" style={styles.input} value={feriasForm.startDate} onChange={e => setFeriasForm({...feriasForm, startDate: e.target.value})} required /><input type="date" style={styles.input} value={feriasForm.endDate} onChange={e => setFeriasForm({...feriasForm, endDate: e.target.value})} required /></div></div>
              </div>
            </div>
            
            <CoverageManager 
              startDate={feriasForm.startDate} 
              endDate={feriasForm.endDate} 
              coverageMap={feriasForm.coverageMap} 
              onChange={(newMap) => setFeriasForm({...feriasForm, coverageMap: newMap})} 
              floaters={floaters} 
            />

            <button type="submit" style={{...styles.btnPrimary, background: '#059669'}} disabled={loading}>{loading ? 'Salvando...' : 'Agendar Férias'}</button>
          </form>
        )}

      </div>
    </div>
  );
}

// --- ESTILOS ---
const styles = {
  container: { padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: "'Inter', sans-serif" },
  header: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' },
  iconHeader: { width: '45px', height: '45px', borderRadius: '12px', background: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(234, 88, 12, 0.2)' },
  title: { fontSize: '24px', fontWeight: '800', color: '#1e293b', margin: 0 },
  subtitle: { fontSize: '14px', color: '#64748b', margin: 0 },
  tabs: { display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '1px solid #e2e8f0', paddingBottom: '1px' },
  tab: { padding: '12px 20px', border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '3px solid transparent' },
  tabActive: { padding: '12px 20px', border: 'none', background: 'transparent', color: '#ea580c', cursor: 'pointer', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '3px solid #ea580c' },
  content: { background: 'white', padding: '30px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' },
  formGrid: { display: 'flex', flexDirection: 'column', gap: '30px' },
  section: { padding: '20px', border: '1px solid #f1f5f9', borderRadius: '16px', background: '#fcfdfe' },
  sectionTitle: { fontSize: '14px', fontWeight: '800', color: '#334155', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' },
  field: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '13px', fontWeight: '600', color: '#475569' },
  input: { padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', color: '#1e293b', width: '100%', boxSizing: 'border-box' },
  inputSmall: { padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px', width: '100%' },
  uploadBox: { border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'white', transition: '0.2s' },
  btnPrimary: { padding: '16px', borderRadius: '14px', background: '#ea580c', color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer', fontSize: '16px', marginTop: '10px', width: '100%' },
  infoBox: { background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '15px', borderRadius: '12px', display: 'flex', gap: '15px', alignItems: 'center', fontSize: '13px', color: '#065f46' },
  absenceCard: { background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  btnSmallAction: { background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe', padding: '5px 10px', borderRadius: '6px', cursor:'pointer', fontSize:'12px' },
  btnSmallCancel: { background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '5px 10px', borderRadius: '6px', cursor:'pointer', fontSize:'12px' },
  btnApply: { background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(5px)' },
  modalBox: { backgroundColor: 'white', padding: '32px', borderRadius: '28px', maxWidth: '400px', width: '90%', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', animation: 'slideUp 0.3s ease-out' },
  card: { background: 'white', padding: '24px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 10px rgba(0,0,0,0.01)' }
};
