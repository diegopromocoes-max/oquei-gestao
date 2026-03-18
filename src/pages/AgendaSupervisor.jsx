// ============================================================
//  AgendaSupervisor.jsx — Oquei Gestão
//  Agenda pessoal de reuniões e compromissos.
//  Padrão: Page/Card/Btn/Modal/Input/Select do ui.jsx
// ============================================================

import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import {
  Calendar as CalendarIcon, Clock, MapPin, Users, Plus,
  ChevronLeft, ChevronRight, Trash2, Briefcase, Video,
  AlignLeft, CalendarDays, Edit
} from 'lucide-react';
import { Card, Btn, Modal, Input, Select, Empty, colors } from '../components/ui';
import { styles as global } from '../styles/globalStyles';

// ─── Constantes ───────────────────────────────────────────────────────────────
const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                     'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const TYPE_COLOR  = { reuniao: colors.purple, compromisso: colors.success };

const emptyForm = () => ({ title: '', type: 'reuniao', time: '09:00', location: '', description: '' });

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AgendaSupervisor({ userData }) {
  const [currentDate,  setCurrentDate]  = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events,       setEvents]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editingId,    setEditingId]    = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [form,         setForm]         = useState(emptyForm());

  // ── Dados ───────────────────────────────────────────────────────────────────
  const fetchEvents = async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        const snap = await getDocs(query(
          collection(db, 'events'),
          where('userId', '==', auth.currentUser.uid)
        ));
        setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (evt) => {
    setEditingId(evt.id);
    setForm({ title: evt.title, type: evt.type, time: evt.time, location: evt.location || '', description: evt.description || '' });
    if (evt.date) {
      const [y, m, d] = evt.date.split('-').map(Number);
      setSelectedDate(new Date(y, m - 1, d));
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { window.showToast?.('Informe o título do evento.', 'error'); return; }
    setSaving(true);
    try {
      const dateStr = selectedDate.toLocaleDateString('en-CA');
      if (editingId) {
        await updateDoc(doc(db, 'events', editingId), { ...form, date: dateStr, updatedAt: serverTimestamp() });
        window.showToast?.('Evento atualizado!', 'success');
      } else {
        await addDoc(collection(db, 'events'), {
          ...form, date: dateStr,
          userId: auth.currentUser.uid,
          userName: userData?.name || 'Usuário',
          createdAt: serverTimestamp(),
        });
        window.showToast?.('Evento agendado!', 'success');
      }
      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm());
      fetchEvents();
    } catch (err) { window.showToast?.('Erro ao salvar: ' + err.message, 'error'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este compromisso?')) return;
    try {
      await deleteDoc(doc(db, 'events', id));
      fetchEvents();
      window.showToast?.('Evento excluído.', 'success');
    } catch (err) { window.showToast?.('Erro ao excluir.', 'error'); }
  };

  // ── Calendário ──────────────────────────────────────────────────────────────
  const daysInMonth    = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const daysArray      = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const toDateStr = (date) => date.toLocaleDateString('en-CA');
  const selectedDateStr    = toDateStr(selectedDate);
  const eventsOnSelected   = events.filter(e => e.date === selectedDateStr).sort((a,b) => a.time.localeCompare(b.time));
  const getEventsForDay    = (day) => {
    const str = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toLocaleDateString('en-CA');
    return events.filter(e => e.date === str);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={global.container}>

      {/* ── Cabeçalho padrão ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-panel) 100%)',
        border: '1px solid var(--border)', borderRadius: '20px',
        padding: '24px 32px', marginBottom: '24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '16px', boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
            background: `linear-gradient(135deg, ${colors.purple}, ${colors.primary})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 6px 18px ${colors.purple}55`,
          }}>
            <CalendarDays size={26} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {userData?.role === 'growth_team' ? 'Minha Agenda' : 'Agenda do Supervisor'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px', fontWeight: '500' }}>
              Reuniões e compromissos · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
        <Btn onClick={openNew}>
          <Plus size={15} /> Novo Evento
        </Btn>
      </div>

      {/* ── Grid principal ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>

        {/* Calendário */}
        <Card>
          {/* Navegação de mês */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <Btn variant="secondary" size="sm" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>
              <ChevronLeft size={16} />
            </Btn>
            <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <Btn variant="secondary" size="sm" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>
              <ChevronRight size={16} />
            </Btn>
          </div>

          {/* Dias da semana */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '8px' }}>
            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 0' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Grade de dias */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
            {daysArray.map(day => {
              const dayEvts   = getEventsForDay(day);
              const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === currentDate.getMonth();
              const isToday    = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();
              return (
                <div
                  key={day}
                  onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                  style={{
                    aspectRatio: '1', borderRadius: '10px', cursor: 'pointer', transition: '0.15s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: isSelected || isToday ? '800' : '500',
                    background: isSelected ? colors.primary : isToday ? `${colors.primary}18` : 'transparent',
                    color: isSelected ? '#fff' : isToday ? colors.primary : 'var(--text-main)',
                  }}
                >
                  <span>{day}</span>
                  {dayEvts.length > 0 && (
                    <div style={{ display: 'flex', gap: '2px', marginTop: '3px' }}>
                      {dayEvts.slice(0, 3).map((ev, i) => (
                        <div key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: isSelected ? '#fff' : TYPE_COLOR[ev.type] || colors.primary }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legenda */}
          <div style={{ display: 'flex', gap: '20px', marginTop: '20px', justifyContent: 'center' }}>
            {[{ label: 'Reunião', color: colors.purple }, { label: 'Externo', color: colors.success }].map(({ label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                {label}
              </div>
            ))}
          </div>
        </Card>

        {/* Painel do dia selecionado */}
        <Card
          title={selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          subtitle={`${eventsOnSelected.length} evento${eventsOnSelected.length !== 1 ? 's' : ''} agendado${eventsOnSelected.length !== 1 ? 's' : ''}`}
          actions={<Btn size="sm" onClick={openNew}><Plus size={14} /></Btn>}
        >
          {loading && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontSize: '13px' }}>Carregando...</div>}

          {!loading && eventsOnSelected.length === 0 && (
            <Empty
              icon="📅"
              title="Nenhum compromisso"
              description="Clique em + para adicionar um evento neste dia."
            />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {eventsOnSelected.map(evt => (
              <div
                key={evt.id}
                style={{
                  background: 'var(--bg-app)', borderRadius: '12px', padding: '12px',
                  display: 'flex', gap: '12px', border: '1px solid var(--border)',
                  borderLeft: `4px solid ${TYPE_COLOR[evt.type] || colors.primary}`,
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', minWidth: '56px', flexShrink: 0 }}>
                  <Clock size={12} /> {evt.time}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '800', color: 'var(--text-main)', fontSize: '14px', marginBottom: '4px' }}>{evt.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {evt.type === 'reuniao' ? <Users size={11} /> : <Briefcase size={11} />}
                    <span style={{ textTransform: 'capitalize' }}>{evt.type}</span>
                    {evt.location && (
                      <>
                        <span>·</span>
                        {evt.location.includes('http') ? <Video size={11} /> : <MapPin size={11} />}
                        <a href={evt.location.includes('http') ? evt.location : '#'} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: evt.location.includes('http') ? 'underline' : 'none' }}>
                          {evt.location.includes('http') ? 'Link da Sala' : evt.location}
                        </a>
                      </>
                    )}
                  </div>
                  {evt.description && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: '4px' }}>
                      {evt.description}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                  <Btn variant="secondary" size="sm" onClick={() => openEdit(evt)} title="Editar">
                    <Edit size={13} />
                  </Btn>
                  <Btn variant="danger" size="sm" onClick={() => handleDelete(evt.id)} title="Excluir">
                    <Trash2 size={13} />
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Modal de evento ── */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingId(null); setForm(emptyForm()); }}
        title={editingId ? 'Editar Evento' : 'Novo Agendamento'}
        footer={
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Btn variant="secondary" onClick={() => { setModalOpen(false); setForm(emptyForm()); }}>Cancelar</Btn>
            <Btn loading={saving} onClick={handleSave}>{editingId ? 'Salvar Alterações' : 'Agendar'}</Btn>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input label="Título do Evento" placeholder="Ex: Reunião de Metas" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Select
              label="Tipo"
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
              options={[{ value: 'reuniao', label: 'Reunião Interna' }, { value: 'compromisso', label: 'Externo / Stakeholder' }]}
            />
            <Input type="time" label="Horário" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} required />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Local ou Link</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 12px', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--bg-app)' }}>
              {form.location.includes('http') ? <Video size={16} color="var(--text-muted)" /> : <MapPin size={16} color="var(--text-muted)" />}
              <input
                style={{ flex: 1, border: 'none', padding: '11px 0', outline: 'none', fontSize: '14px', background: 'transparent', color: 'var(--text-main)' }}
                placeholder="Google Meet ou Endereço"
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Pauta / Observações</label>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '0 12px', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--bg-app)' }}>
              <AlignLeft size={16} color="var(--text-muted)" style={{ marginTop: '12px', flexShrink: 0 }} />
              <textarea
                style={{ flex: 1, border: 'none', padding: '11px 0', outline: 'none', fontSize: '14px', background: 'transparent', color: 'var(--text-main)', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="Detalhes da reunião..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
            <CalendarIcon size={14} color={colors.primary} />
            Data selecionada: <strong style={{ color: 'var(--text-main)' }}>{selectedDate.toLocaleDateString('pt-BR')}</strong>
          </div>
        </div>
      </Modal>
    </div>
  );
}