import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { 
  Calendar as CalendarIcon, Clock, MapPin, Users, Plus, ChevronLeft, ChevronRight, 
  Trash2, X, Briefcase, Video, AlignLeft, CalendarDays, Edit
} from 'lucide-react';

export default function AgendaSupervisor({ userData }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Estado de Edição
  const [editingId, setEditingId] = useState(null);

  // Estado do Formulário
  const [form, setForm] = useState({
    title: '',
    type: 'reuniao', // 'reuniao' ou 'compromisso'
    time: '09:00',
    location: '', // Link ou Endereço
    description: ''
  });

  // --- CARREGAMENTO DE DADOS ---
  const fetchEvents = async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        const q = query(
          collection(db, "events"), 
          where("userId", "==", auth.currentUser.uid)
        );
        const snap = await getDocs(q);
        const eventsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setEvents(eventsData);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  // --- HANDLERS ---
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newDate);
  };

  // Abrir modal para CRIAÇÃO
  const openNewEventModal = () => {
    setEditingId(null);
    setForm({ title: '', type: 'reuniao', time: '09:00', location: '', description: '' });
    setModalOpen(true);
  };

  // Abrir modal para EDIÇÃO
  const handleEdit = (event) => {
    setEditingId(event.id);
    setForm({
      title: event.title,
      type: event.type,
      time: event.time,
      location: event.location || '',
      description: event.description || ''
    });
    // Ajusta a data selecionada para a data do evento sendo editado (caso esteja visualizando outro dia)
    if (event.date) {
        // Tenta contornar problemas de fuso convertendo a string YYYY-MM-DD
        const [y, m, d] = event.date.split('-').map(Number);
        setSelectedDate(new Date(y, m - 1, d));
    }
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const dateStr = selectedDate.toLocaleDateString('en-CA'); // YYYY-MM-DD

      if (editingId) {
        // ATUALIZAR
        await updateDoc(doc(db, "events", editingId), {
          ...form,
          date: dateStr,
          updatedAt: serverTimestamp()
        });
        alert("Evento atualizado com sucesso!");
      } else {
        // CRIAR NOVO
        await addDoc(collection(db, "events"), {
          ...form,
          date: dateStr,
          userId: auth.currentUser.uid,
          userName: userData?.name || 'Supervisor',
          createdAt: serverTimestamp()
        });
        alert("Evento agendado com sucesso!");
      }
      
      setModalOpen(false);
      setEditingId(null);
      setForm({ title: '', type: 'reuniao', time: '09:00', location: '', description: '' });
      fetchEvents();
    } catch (err) { alert("Erro ao salvar: " + err.message); }
  };

  const handleDelete = async (id) => {
    if(window.confirm("Tem certeza que deseja excluir este compromisso?")) {
      try {
        await deleteDoc(doc(db, "events", id));
        fetchEvents();
      } catch (err) { alert("Erro ao excluir: " + err.message); }
    }
  };

  // --- LÓGICA DO CALENDÁRIO ---
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 = Dom
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Filtra eventos do dia selecionado
  const selectedDateStr = selectedDate.toLocaleDateString('en-CA');
  const eventsOnSelectedDate = events.filter(e => e.date === selectedDateStr).sort((a,b) => a.time.localeCompare(b.time));

  // Helpers de Visualização
  const getEventsForDay = (day) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toLocaleDateString('en-CA');
    return events.filter(e => e.date === dateStr);
  };

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.iconHeader}><CalendarDays size={24} color="white"/></div>
        <div>
          <h1 style={styles.title}>Agenda do Supervisor</h1>
          <p style={styles.subtitle}>Gerencie suas reuniões e compromissos externos.</p>
        </div>
      </div>

      <div style={styles.layoutGrid}>
        
        {/* COLUNA DA ESQUERDA: CALENDÁRIO */}
        <div style={styles.calendarCard}>
          <div style={styles.calendarHeader}>
            <button onClick={handlePrevMonth} style={styles.navBtn}><ChevronLeft size={20}/></button>
            <h2 style={styles.monthTitle}>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
            <button onClick={handleNextMonth} style={styles.navBtn}><ChevronRight size={20}/></button>
          </div>

          <div style={styles.weekGrid}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} style={styles.weekDay}>{d}</div>
            ))}
          </div>

          <div style={styles.daysGrid}>
            {/* Espaços vazios */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
            
            {/* Dias */}
            {daysArray.map(day => {
              const dayEvents = getEventsForDay(day);
              const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === currentDate.getMonth();
              const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();

              return (
                <div 
                  key={day} 
                  onClick={() => handleDateClick(day)}
                  style={{
                    ...styles.dayCell,
                    backgroundColor: isSelected ? '#2563eb' : isToday ? '#eff6ff' : 'transparent',
                    color: isSelected ? 'white' : isToday ? '#2563eb' : '#334155',
                    fontWeight: isSelected || isToday ? 'bold' : 'normal'
                  }}
                >
                  <span>{day}</span>
                  {/* Indicadores de Evento */}
                  <div style={styles.dotsContainer}>
                    {dayEvents.map((ev, i) => (
                      <div key={i} style={{
                        width: '6px', height: '6px', borderRadius: '50%',
                        backgroundColor: isSelected ? 'white' : ev.type === 'reuniao' ? '#7c3aed' : '#10b981'
                      }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div style={styles.legend}>
            <div style={styles.legendItem}><div style={{...styles.dot, background: '#7c3aed'}}/> Reunião Interna</div>
            <div style={styles.legendItem}><div style={{...styles.dot, background: '#10b981'}}/> Compromisso Externo</div>
          </div>
        </div>

        {/* COLUNA DA DIREITA: DETALHES DO DIA */}
        <div style={styles.detailsCard}>
          <div style={styles.detailsHeader}>
            <div>
              <h3 style={styles.detailsTitle}>
                {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <p style={styles.detailsSub}>{eventsOnSelectedDate.length} eventos agendados</p>
            </div>
            <button onClick={openNewEventModal} style={styles.addBtn} title="Novo Evento"><Plus size={20}/></button>
          </div>

          <div style={styles.eventsList}>
            {eventsOnSelectedDate.length === 0 ? (
              <div style={styles.emptyState}>
                <CalendarIcon size={40} style={{opacity: 0.2, marginBottom: '10px'}} />
                <p>Nenhum compromisso para este dia.</p>
                <button onClick={openNewEventModal} style={styles.linkBtn}>+ Adicionar agora</button>
              </div>
            ) : (
              eventsOnSelectedDate.map(evt => (
                <div key={evt.id} style={{
                  ...styles.eventItem,
                  borderLeft: `4px solid ${evt.type === 'reuniao' ? '#7c3aed' : '#10b981'}`
                }}>
                  <div style={styles.eventTime}>
                    <Clock size={14} /> {evt.time}
                  </div>
                  <div style={styles.eventInfo}>
                    <h4 style={styles.eventTitle}>{evt.title}</h4>
                    <div style={styles.eventMeta}>
                      {evt.type === 'reuniao' ? <Users size={12}/> : <Briefcase size={12}/>}
                      <span style={{textTransform: 'capitalize'}}>{evt.type}</span>
                      
                      {evt.location && (
                        <>
                          <span>•</span> 
                          {evt.location.includes('http') ? <Video size={12}/> : <MapPin size={12}/>}
                          <a href={evt.location.includes('http') ? evt.location : '#'} target="_blank" rel="noreferrer" style={{color: 'inherit', textDecoration: evt.location.includes('http') ? 'underline' : 'none'}}>
                            {evt.location.includes('http') ? 'Link da Sala' : evt.location}
                          </a>
                        </>
                      )}
                    </div>
                    {evt.description && <p style={styles.eventDesc}>{evt.description}</p>}
                  </div>
                  
                  <div style={styles.actionButtons}>
                    <button onClick={() => handleEdit(evt)} style={styles.editBtn} title="Editar"><Edit size={16}/></button>
                    <button onClick={() => handleDelete(evt.id)} style={styles.deleteBtn} title="Excluir"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* MODAL DE EVENTO (CRIAÇÃO E EDIÇÃO) */}
      {modalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{editingId ? 'Editar Evento' : 'Novo Agendamento'}</h3>
              <button onClick={() => setModalOpen(false)} style={styles.closeBtn}><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSave} style={styles.formStack}>
              <div>
                <label style={styles.label}>Título do Evento</label>
                <input style={styles.input} placeholder="Ex: Reunião de Metas" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required autoFocus />
              </div>

              <div style={styles.row}>
                <div>
                  <label style={styles.label}>Tipo</label>
                  <select style={styles.input} value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                    <option value="reuniao">Reunião Interna (Roxo)</option>
                    <option value="compromisso">Externo / Stakeholder (Verde)</option>
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Horário</label>
                  <input type="time" style={styles.input} value={form.time} onChange={e => setForm({...form, time: e.target.value})} required />
                </div>
              </div>

              <div>
                <label style={styles.label}>Local ou Link</label>
                <div style={styles.inputIconWrapper}>
                  {form.location.includes('http') ? <Video size={18} color="#94a3b8"/> : <MapPin size={18} color="#94a3b8"/>}
                  <input style={styles.inputIcon} placeholder="Google Meet ou Endereço" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                </div>
              </div>

              <div>
                <label style={styles.label}>Anotações (Pauta/Obs)</label>
                <div style={styles.inputIconWrapper}>
                  <AlignLeft size={18} color="#94a3b8" style={{marginTop: '12px'}}/>
                  <textarea style={{...styles.inputIcon, height: '80px', resize: 'none'}} placeholder="Detalhes..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                </div>
              </div>

              <div style={styles.modalFooter}>
                <p style={styles.dateDisplay}><CalendarIcon size={14}/> {selectedDate.toLocaleDateString()}</p>
                <button type="submit" style={styles.saveBtn}>{editingId ? 'Salvar Alterações' : 'Agendar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- ESTILOS (CSS INLINE PREMIUM) ---
const styles = {
  container: { padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: "'Inter', sans-serif" },
  header: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' },
  iconHeader: { width: '45px', height: '45px', borderRadius: '12px', background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)' },
  title: { fontSize: '24px', fontWeight: '800', color: '#1e293b', margin: 0 },
  subtitle: { fontSize: '14px', color: '#64748b', margin: 0 },

  layoutGrid: { display: 'grid', gridTemplateColumns: '1fr 350px', gap: '30px', alignItems: 'start' },
  
  // CALENDÁRIO ESQUERDA
  calendarCard: { background: 'white', borderRadius: '20px', padding: '25px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0' },
  calendarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  monthTitle: { fontSize: '18px', fontWeight: 'bold', color: '#1e293b', textTransform: 'capitalize' },
  navBtn: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '5px', cursor: 'pointer', color: '#64748b' },
  
  weekGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '10px' },
  weekDay: { textAlign: 'center', fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' },
  
  daysGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' },
  dayCell: { aspectRatio: '1', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', fontSize: '14px', position: 'relative' },
  dotsContainer: { display: 'flex', gap: '3px', marginTop: '4px' },
  
  legend: { display: 'flex', gap: '15px', marginTop: '20px', justifyContent: 'center' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b' },
  dot: { width: '8px', height: '8px', borderRadius: '50%' },

  // DETALHES DIREITA
  detailsCard: { background: 'white', borderRadius: '20px', padding: '25px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', border: '1px solid #e2e8f0', height: 'fit-content', minHeight: '400px' },
  detailsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px' },
  detailsTitle: { fontSize: '16px', fontWeight: 'bold', color: '#1e293b', textTransform: 'capitalize' },
  detailsSub: { fontSize: '12px', color: '#64748b' },
  addBtn: { background: '#2563eb', color: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)' },
  
  eventsList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  eventItem: { background: '#f8fafc', borderRadius: '12px', padding: '12px', display: 'flex', gap: '12px', position: 'relative' },
  eventTime: { fontSize: '12px', fontWeight: 'bold', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', minWidth: '60px' },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: '14px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 4px 0' },
  eventMeta: { fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' },
  eventDesc: { fontSize: '11px', color: '#475569', marginTop: '6px', fontStyle: 'italic', borderTop: '1px solid #e2e8f0', paddingTop: '4px' },
  
  actionButtons: { display: 'flex', flexDirection: 'column', gap: '5px' },
  deleteBtn: { background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '5px' },
  editBtn: { background: 'transparent', border: 'none', color: '#2563eb', cursor: 'pointer', padding: '5px' },
  
  emptyState: { textAlign: 'center', color: '#94a3b8', fontSize: '13px', marginTop: '40px' },
  linkBtn: { background: 'none', border: 'none', color: '#2563eb', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', fontSize: '12px' },

  // MODAL
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' },
  modalBox: { backgroundColor: 'white', padding: '30px', borderRadius: '24px', maxWidth: '400px', width: '90%', position: 'relative', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  modalTitle: { fontSize: '18px', fontWeight: 'bold', color: '#1e293b' },
  closeBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' },
  
  formStack: { display: 'flex', flexDirection: 'column', gap: '15px' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  label: { fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px', display: 'block' },
  input: { width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', boxSizing: 'border-box' },
  inputIconWrapper: { display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '0 10px', border: '1px solid #e2e8f0', borderRadius: '10px', background: 'white' },
  inputIcon: { flex: 1, border: 'none', padding: '10px 0', outline: 'none', fontSize: '14px' },
  
  modalFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' },
  dateDisplay: { fontSize: '12px', fontWeight: 'bold', color: '#64748b', display: 'flex', gap: '6px', alignItems: 'center' },
  saveBtn: { padding: '10px 20px', borderRadius: '10px', background: '#2563eb', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }
};
