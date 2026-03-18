// ============================================================
//  EventosGrowth.jsx — Painel Growth Team
//  RF01: Agenda de eventos próprios e patrocinados
//  RF02: Integração automática com Patrocínios Aprovados
// ============================================================

import React, { useEffect, useState, useMemo } from 'react';
import { db, auth } from '../firebase';
import {
  collection, query, getDocs, addDoc, deleteDoc,
  doc, serverTimestamp, orderBy, where
} from 'firebase/firestore';
import {
  Trophy, Calendar, MapPin, Users, Plus, Trash2,
  ExternalLink, Tag, CheckCircle2, Clock, Building2
} from 'lucide-react';
import { Card, Btn, Input, Select, Textarea, Badge, Modal, InfoBox, colors } from '../components/ui';
import { styles as global } from '../styles/globalStyles';

// ── Constantes ────────────────────────────────────────────────
const EVENT_TYPES = ['Patrocínio', 'Evento Próprio', 'Parceria', 'Ativação de Marca', 'Outros'];

const TYPE_COR = {
  'Patrocínio': 'purple', 'Evento Próprio': 'primary',
  'Parceria': 'info', 'Ativação de Marca': 'warning', 'Outros': 'neutral',
};

const emptyForm = () => ({
  eventName: '', date: '', time: '', location: '', city: '',
  organizer: '', expectedAudience: '', type: EVENT_TYPES[0], notes: '',
});

// ── Formatação de data ────────────────────────────────────────
const fmtDate = (str) => {
  if (!str) return '—';
  try {
    // suporte a datetime-local (2026-03-15T10:00) e date (2026-03-15)
    const d = new Date(str.includes('T') ? str : str + 'T00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return str; }
};

const fmtTime = (str) => {
  if (!str) return '';
  if (str.includes('T')) {
    const d = new Date(str);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return str;
};

// ── Card de evento ────────────────────────────────────────────
function EventCard({ event, onDelete, canDelete }) {
  const isSponsorship = Boolean(event.fromSponsorship);
  return (
    <div style={{
      background: 'var(--bg-card)', border: `1px solid var(--border)`,
      borderLeft: `4px solid ${isSponsorship ? colors.purple : colors.primary}`,
      borderRadius: '14px', padding: '18px 20px',
      display: 'flex', gap: '16px', alignItems: 'flex-start',
      boxShadow: 'var(--shadow-sm)',
    }}>
      {/* Data destaque */}
      <div style={{
        flexShrink: 0, width: '52px', textAlign: 'center',
        background: 'var(--bg-app)', border: '1px solid var(--border)',
        borderRadius: '12px', padding: '8px 4px',
      }}>
        <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', lineHeight: 1 }}>
          {event.date ? new Date(event.date.includes('T') ? event.date : event.date + 'T00:00').getDate() : '—'}
        </div>
        <div style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '2px' }}>
          {event.date ? new Date(event.date.includes('T') ? event.date : event.date + 'T00:00').toLocaleString('pt-BR', { month: 'short' }) : ''}
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
          <span style={{ fontWeight: '900', color: 'var(--text-main)', fontSize: '14px' }}>
            {event.eventName || event.name || 'Sem nome'}
          </span>
          <Badge cor={TYPE_COR[event.type] || 'neutral'}>{event.type || 'Evento'}</Badge>
          {isSponsorship && <Badge cor="purple">Patrocínio Aprovado</Badge>}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
          {(event.location || event.city) && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={12} />{event.location || event.city}
            </span>
          )}
          {(event.time || event.dateTime) && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} />{event.time || fmtTime(event.dateTime)}
            </span>
          )}
          {(event.organizer || event.supervisorName) && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Building2 size={12} />{event.organizer || event.supervisorName}
            </span>
          )}
          {event.expectedAudience && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Users size={12} />~{event.expectedAudience} pessoas
            </span>
          )}
        </div>

        {event.notes && (
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            {event.notes}
          </div>
        )}
      </div>

      {/* Ações */}
      {canDelete && !isSponsorship && (
        <Btn size="sm" variant="danger" onClick={() => onDelete(event.id)} title="Excluir evento">
          <Trash2 size={14} />
        </Btn>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────
export default function EventosGrowth({ userData }) {
  const [activeTab, setActiveTab] = useState('agenda');
  const [events, setEvents] = useState([]);
  const [sponsorships, setSponsorships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

  // ── Carregar dados ─────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true);
    try {
      // Eventos próprios do Growth
      const snapEvents = await getDocs(query(collection(db, 'growth_events'), orderBy('date', 'asc')));
      setEvents(snapEvents.docs.map(d => ({ id: d.id, ...d.data() })));

      // Patrocínios aprovados (integração RF02)
      const snapSpons = await getDocs(
        query(collection(db, 'sponsorships'), where('status', '==', 'Aprovado'))
      );
      setSponsorships(snapSpons.docs.map(d => ({
        id: d.id, ...d.data(),
        fromSponsorship: true,
        type: 'Patrocínio',
        date: d.data().dateTime ? d.data().dateTime.slice(0, 10) : '',
      })));
    } catch (err) {
      console.error('EventosGrowth load error:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Unificar e filtrar ────────────────────────────────────
  const allEvents = useMemo(() => {
    const combined = [...events, ...sponsorships];
    return combined
      .filter(e => {
        if (!filterMonth) return true;
        const d = e.date || (e.dateTime ? e.dateTime.slice(0, 10) : '');
        return d.startsWith(filterMonth);
      })
      .sort((a, b) => {
        const da = a.date || (a.dateTime ? a.dateTime.slice(0, 10) : '9999');
        const db2 = b.date || (b.dateTime ? b.dateTime.slice(0, 10) : '9999');
        return da.localeCompare(db2);
      });
  }, [events, sponsorships, filterMonth]);

  // ── Criar evento ──────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.eventName.trim()) { window.showToast?.('Informe o nome do evento.', 'error'); return; }
    if (!form.date) { window.showToast?.('Informe a data.', 'error'); return; }

    setSaving(true);
    try {
      await addDoc(collection(db, 'growth_events'), {
        ...form,
        createdBy: auth?.currentUser?.uid || userData?.uid,
        createdByName: userData?.name || 'Growth Team',
        createdAt: serverTimestamp(),
      });
      setForm(emptyForm());
      window.showToast?.('Evento criado com sucesso!', 'success');
      setActiveTab('agenda');
      fetchAll();
    } catch (err) {
      window.showToast?.('Erro ao criar evento.', 'error');
    }
    setSaving(false);
  };

  // ── Excluir evento ─────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este evento?')) return;
    try {
      await deleteDoc(doc(db, 'growth_events', id));
      window.showToast?.('Evento excluído.', 'success');
      fetchAll();
    } catch {
      window.showToast?.('Erro ao excluir.', 'error');
    }
  };

  // ── Tabs ──────────────────────────────────────────────────
  const TABS = [
    { id: 'agenda', label: `Agenda de Eventos (${allEvents.length})` },
    { id: 'novo',   label: '+ Inserir Novo Evento' },
  ];

  return (
    <div style={{ ...global.container }}>

      {/* ── Cabeçalho padrão Oquei Gestão ── */}
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
            background: 'linear-gradient(135deg, #F59E0B, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 18px rgba(245,158,11,0.35)',
          }}>
            <Trophy size={26} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              Eventos Growth
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px', fontWeight: '500' }}>
              Agenda de eventos próprios e patrocinados · {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
        
      </div>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={global.pageTitle}>Agenda de Eventos</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0', fontWeight: '500' }}>
            Eventos patrocinados, parcerias e ações de marca Oquei
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <input
            type="month"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            style={{
              padding: '9px 13px', borderRadius: '10px', border: '1px solid var(--border)',
              background: 'var(--bg-card)', color: 'var(--text-main)',
              fontSize: '13px', fontWeight: '700', outline: 'none', cursor: 'pointer',
            }}
          />
          <Btn onClick={() => setActiveTab('novo')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={15} /> Novo Evento
          </Btn>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => {
          const on = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: '9px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: '13px', fontWeight: '700', fontFamily: 'inherit',
              color: on ? 'var(--text-brand)' : 'var(--text-muted)',
              borderBottom: on ? '2px solid var(--text-brand)' : '2px solid transparent',
              marginBottom: '-1px', transition: 'color 0.15s', whiteSpace: 'nowrap',
            }}>{t.label}</button>
          );
        })}
      </div>

      {/* ── Aba: Agenda ── */}
      {activeTab === 'agenda' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sponsorships.length > 0 && (
            <InfoBox type="info">
              <strong>{sponsorships.filter(s => s.date?.startsWith(filterMonth)).length} patrocínio(s) aprovado(s)</strong> integrado(s) automaticamente neste mês.
            </InfoBox>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando eventos...</div>
          )}

          {!loading && allEvents.length === 0 && (
            <Card>
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Trophy size={40} color="var(--text-muted)" style={{ marginBottom: '12px', opacity: 0.4 }} />
                <div style={{ fontWeight: '800', color: 'var(--text-main)', marginBottom: '6px' }}>Nenhum evento neste mês</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Insira um novo evento ou solicite um patrocínio para aparecer aqui.
                </div>
                <Btn onClick={() => setActiveTab('novo')} style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Plus size={14} /> Inserir primeiro evento
                </Btn>
              </div>
            </Card>
          )}

          {allEvents.map(ev => (
            <EventCard
              key={ev.id}
              event={ev}
              onDelete={handleDelete}
              canDelete={true}
            />
          ))}
        </div>
      )}

      {/* ── Aba: Novo evento ── */}
      {activeTab === 'novo' && (
        <Card title="Novo Evento" subtitle="Cadastre um evento próprio ou em parceria">
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px', marginTop: '8px',
          }}>
            <Input label="Nome do evento *" value={form.eventName} onChange={e => setForm({ ...form, eventName: e.target.value })} placeholder="Ex: Ação Comercial Centro" />
            <Select label="Tipo *" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} options={EVENT_TYPES} />
            <Input type="date" label="Data *" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            <Input type="time" label="Horário" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
            <Input label="Local" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Endereço ou local" />
            <Input label="Cidade" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Ex: Bady Bassitt" />
            <Input label="Organizador / Parceiro" value={form.organizer} onChange={e => setForm({ ...form, organizer: e.target.value })} />
            <Input type="number" label="Público estimado" value={form.expectedAudience} onChange={e => setForm({ ...form, expectedAudience: e.target.value })} placeholder="Ex: 200" />
          </div>
          <div style={{ marginTop: '16px' }}>
            <Textarea label="Observações" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Detalhes adicionais, objetivos, materiais necessários..." />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <Btn variant="secondary" onClick={() => setActiveTab('agenda')}>Cancelar</Btn>
            <Btn onClick={handleCreate} loading={saving}>Salvar Evento</Btn>
          </div>
        </Card>
      )}
    </div>
  );
}