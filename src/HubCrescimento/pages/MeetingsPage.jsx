// ============================================================
//  MeetingsPage.jsx — Hub Crescimento
//  RF01: Criacao e edicao de reunioes (growth_meetings)
//  RF02: Conversao de item de ata em Plano de Acao (Backlog)
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import { Card, Btn, Input, Badge, InfoBox, Modal, Textarea, data } from '../../components/ui';
import { useMeetings }    from '../hooks/useMeetings';
import { useGrowthPlans } from '../hooks/useGrowthPlans';
import { useUsers }       from '../hooks/useUsers';
import { createMeeting, updateMeeting, convertAgendaItemToPlan } from '../services/meetingService';
import { createPlan } from '../services/planService';
import { hubStyles } from '../styles/hubStyles';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const emptyForm = () => ({
  title: '',
  date: '',
  time: '',
  participantUids: [],
  planIds: [],
  agendaItems: [], // RF02: lista de itens da ata
});

const emptyAgendaItem = () => ({ text: '', convertedPlanId: null });

// ─── Componente principal ─────────────────────────────────────────────────────
export default function MeetingsPage({
  userData,
  selectedCityId,
  selectedMonth,
  selectedGrowthPlan,
}) {
  const meetings    = useMeetings(selectedCityId);
  const plans       = useGrowthPlans(selectedCityId, selectedMonth);
  const { users }   = useUsers({
    cityId:      selectedCityId,
    clusterId:   userData?.clusterId || null,
    fallbackAll: true,
  });

  const [form, setForm]         = useState(emptyForm());
  const [saving, setSaving]     = useState(false);

  // RF02: estados de conversao
  const [converting, setConverting]           = useState(null); // { meetingId, index, item }
  const [addAgendaText, setAddAgendaText]     = useState('');

  // Modo de edicao de ata em reuniao existente
  const [editingMeeting, setEditingMeeting]   = useState(null);
  const [editAgendaText, setEditAgendaText]   = useState('');

  // Pre-preenche o plano quando vem selecionado de fora
  useEffect(() => {
    if (selectedGrowthPlan?.id && form.planIds.length === 0) {
      setForm((prev) => ({ ...prev, planIds: [selectedGrowthPlan.id] }));
    }
  }, [selectedGrowthPlan?.id]); // eslint-disable-line

  // ── Handlers de form ───────────────────────────────────────────────────────
  const toggleParticipant = (uid) =>
    setForm((prev) => ({
      ...prev,
      participantUids: prev.participantUids.includes(uid)
        ? prev.participantUids.filter((id) => id !== uid)
        : [...prev.participantUids, uid],
    }));

  const togglePlan = (planId) =>
    setForm((prev) => ({
      ...prev,
      planIds: prev.planIds.includes(planId)
        ? prev.planIds.filter((id) => id !== planId)
        : [...prev.planIds, planId],
    }));

  const addAgendaItemToForm = () => {
    const text = addAgendaText.trim();
    if (!text) return;
    setForm((prev) => ({
      ...prev,
      agendaItems: [...prev.agendaItems, emptyAgendaItem()].map((item, i) =>
        i === prev.agendaItems.length ? { ...item, text } : item,
      ),
    }));
    // garante o push correto
    setForm((prev) => ({
      ...prev,
      agendaItems: [...prev.agendaItems, { text, convertedPlanId: null }],
    }));
    setAddAgendaText('');
  };

  // Simplificado: seta direto
  const addItemToForm = () => {
    const text = addAgendaText.trim();
    if (!text) return;
    setForm((prev) => ({
      ...prev,
      agendaItems: [...prev.agendaItems, { text, convertedPlanId: null }],
    }));
    setAddAgendaText('');
  };

  const removeAgendaItem = (index) =>
    setForm((prev) => ({
      ...prev,
      agendaItems: prev.agendaItems.filter((_, i) => i !== index),
    }));

 // ── Criar reunião ──────────────────────────────────────────────────────────
  const handleCreateMeeting = async () => {
    // 1. TRAVA DE CIDADE REMOVIDA AQUI para permitir reuniões do Hub/Globais
    
    if (!form.date) {
      window.showToast?.('Informe a data da reuniao.', 'error'); return;
    }
    if (form.participantUids.length === 0) {
      window.showToast?.('Selecione pelo menos um participante.', 'error');
      return;
    }

    setSaving(true);
    try {
      const participants = users
        .filter((u) => form.participantUids.includes(u.id))
        .map((u) => ({
          uid:  u.id,
          name: u.name || u.nome || u.displayName || 'Sem nome',
          role: u.role || '',
        }));
      const selectedPlans = plans.filter((p) => form.planIds.includes(p.id));

      await createMeeting(
        {
          // Se estiver em "Todas as cidades", salva como global
          cityId:      selectedCityId === '__all__' ? 'global' : (selectedCityId || null),
          title:       form.title || 'Reuniao de Growth',
          date:        form.date,
          time:        form.time,
          participants,
          planIds:     selectedPlans.map((p) => p.id),
          planNames:   selectedPlans.map((p) => p.name || 'Plano'),
          agendaItems: form.agendaItems,
        },
        userData,
      );
      setForm(emptyForm());
      window.showToast?.('Reuniao criada com sucesso.', 'success');
    } catch (err) {
      console.error(err);
      window.showToast?.('Erro ao criar reuniao.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── RF02: Converter item de ata em Plano de Acao ───────────────────────────
  const handleConvert = async () => {
    if (!converting) return;
    setSaving(true);
    try {
      await convertAgendaItemToPlan(
        {
          meetingId:       converting.meetingId,
          agendaItemIndex: converting.index,
          agendaItem:      converting.item,
          cityId:          selectedCityId,
          growthPlanId:    selectedGrowthPlan?.id   || null,
          growthPlanName:  selectedGrowthPlan?.name || null,
          month:           selectedMonth,
        },
        userData,
        createPlan,
      );
      window.showToast?.('Item convertido em Plano de Acao (Backlog)!', 'success');
      setConverting(null);
    } catch (err) {
      console.error(err);
      window.showToast?.(`Erro: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Adicionar item de ata em reunião existente ─────────────────────────────
  const handleAddAgendaToExisting = async () => {
    const text = editAgendaText.trim();
    if (!text || !editingMeeting) return;
    setSaving(true);
    try {
      const current = Array.isArray(editingMeeting.agendaItems)
        ? editingMeeting.agendaItems
        : [];
      await updateMeeting(
        editingMeeting.id,
        { agendaItems: [...current, { text, convertedPlanId: null }] },
        userData,
      );
      setEditAgendaText('');
      window.showToast?.('Item adicionado a ata.', 'success');
    } catch (err) {
      window.showToast?.('Erro ao adicionar item.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={hubStyles.stack}>

      {/* ── Modal de confirmação RF02 ── */}
      {converting && (
        <Modal
          open
          title="Converter Item em Plano de Acao"
          onClose={() => setConverting(null)}
          footer={
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <Btn variant="secondary" onClick={() => setConverting(null)}>Cancelar</Btn>
              <Btn onClick={handleConvert} loading={saving}>Converter em Plano (Backlog)</Btn>
            </div>
          }
        >
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 12px' }}>
            O item abaixo sera criado como um novo Plano de Acao no status <strong>Backlog</strong>
            {selectedGrowthPlan ? ` dentro do plano geral "${selectedGrowthPlan.name}"` : ''}.
          </p>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 18px', fontWeight: '700', color: 'var(--text-main)', fontSize: '14px' }}>
            {converting.item.text}
          </div>
          {!selectedGrowthPlan && (
            <InfoBox type="warning" style={{ marginTop: '12px' }}>
              Nenhum Plano Geral selecionado. A acao sera criada sem vinculo a um Plano Geral.
            </InfoBox>
          )}
        </Modal>
      )}

      {/* ── Modal editar ata de reunião existente ── */}
      {editingMeeting && (
        <Modal
          open
          title={`Ata: ${editingMeeting.title || 'Reuniao'}`}
          onClose={() => { setEditingMeeting(null); setEditAgendaText(''); }}
          footer={
            <Btn variant="secondary" onClick={() => { setEditingMeeting(null); setEditAgendaText(''); }}>
              Fechar
            </Btn>
          }
        >
          {/* Itens existentes */}
          <AgendaList
            items={editingMeeting.agendaItems || []}
            onConvert={(index, item) => {
              setEditingMeeting(null);
              setConverting({ meetingId: editingMeeting.id, index, item });
            }}
          />

          {/* Adicionar novo item */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Input
              label="Novo item de ata"
              value={editAgendaText}
              onChange={(e) => setEditAgendaText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddAgendaToExisting()}
            />
            <div style={{ alignSelf: 'flex-end' }}>
              <Btn onClick={handleAddAgendaToExisting} loading={saving} size="sm">
                + Adicionar
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Formulário nova reunião ── */}
      <Card title="Nova Reuniao" subtitle="Agende e registre itens de ata para conversao em planos">

        <div style={hubStyles.formGrid}>
          <Input
            label="Titulo da reuniao"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            type="date" label="Data"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <Input
            type="time" label="Horario"
            value={form.time}
            onChange={(e) => setForm({ ...form, time: e.target.value })}
          />
        </div>

        {/* Participantes */}
        <div style={hubStyles.modalSection}>
          <div style={hubStyles.modalTitle}>Participantes</div>
          <div style={hubStyles.checklist}>
            {users.map((u) => (
              <label key={u.id} style={hubStyles.check}>
                <input
                  type="checkbox"
                  checked={form.participantUids.includes(u.id)}
                  onChange={() => toggleParticipant(u.id)}
                />
                <span>{u.name || u.nome || u.displayName || 'Sem nome'}</span>
              </label>
            ))}
            {users.length === 0 && <div style={hubStyles.muted}>Nenhum usuario encontrado.</div>}
          </div>
        </div>

        {/* Planos relacionados */}
        <div style={hubStyles.modalSection}>
          <div style={hubStyles.modalTitle}>Planos relacionados (opcional)</div>
          <div style={hubStyles.checklist}>
            {plans.map((p) => (
              <label key={p.id} style={hubStyles.check}>
                <input
                  type="checkbox"
                  checked={form.planIds.includes(p.id)}
                  onChange={() => togglePlan(p.id)}
                />
                <span>{p.name || 'Plano sem nome'}</span>
              </label>
            ))}
            {plans.length === 0 && <div style={hubStyles.muted}>Sem planos disponiveis para vincular.</div>}
          </div>
        </div>

        {/* RF02: Itens de ata antecipados */}
        <div style={hubStyles.modalSection}>
          <div style={hubStyles.modalTitle}>
            Itens de Ata
            <span style={{ fontWeight: '400', fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
              (podem ser convertidos em Planos de Acao apos a reuniao)
            </span>
          </div>

          {form.agendaItems.length > 0 && (
            <AgendaList
              items={form.agendaItems}
              onRemove={removeAgendaItem}
              readOnly
            />
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <Input
              label="Novo item de ata"
              value={addAgendaText}
              onChange={(e) => setAddAgendaText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItemToForm()}
            />
            <div style={{ alignSelf: 'flex-end' }}>
              <Btn variant="secondary" onClick={addItemToForm} size="sm">+ Adicionar</Btn>
            </div>
          </div>
        </div>

        <div style={hubStyles.actions}>
          <Btn onClick={handleCreateMeeting} loading={saving}>Criar Reuniao</Btn>
        </div>
      </Card>

      {/* ── Lista de reuniões ── */}
      {meetings.length === 0 && (
        <InfoBox type="info">Nenhuma reuniao agendada ainda.</InfoBox>
      )}

      {meetings.map((m) => (
        <MeetingCard
          key={m.id}
          meeting={m}
          onOpenAta={() => setEditingMeeting(m)}
          onConvert={(index, item) =>
            setConverting({ meetingId: m.id, index, item })
          }
        />
      ))}
    </div>
  );
}

// ─── MeetingCard ──────────────────────────────────────────────────────────────
function MeetingCard({ meeting, onOpenAta, onConvert }) {
  const participants = useMemo(() => {
    if (!Array.isArray(meeting.participants)) return [];
    return meeting.participants.map((p) => p.name).filter(Boolean);
  }, [meeting.participants]);

  const agendaItems = Array.isArray(meeting.agendaItems) ? meeting.agendaItems : [];
  const hasAta = agendaItems.length > 0;

  return (
    <Card
      title={meeting.title || 'Reuniao'}
      subtitle={meeting.scheduledDate ? `Data: ${data(meeting.scheduledDate)}${meeting.scheduledTime ? ' - ' + meeting.scheduledTime : ''}` : 'Sem data'}
      actions={
        <Btn variant="secondary" size="sm" onClick={onOpenAta}>
          {hasAta ? `Ata (${agendaItems.length})` : '+ Ata'}
        </Btn>
      }
    >
      {/* Participantes */}
      {participants.length > 0 && (
        <div style={hubStyles.modalSection}>
          <div style={hubStyles.modalTitle}>Participantes</div>
          <div style={hubStyles.chipRow}>
            {participants.map((name) => (
              <span key={name} style={hubStyles.chip}>{name}</span>
            ))}
          </div>
        </div>
      )}

      {/* Planos vinculados */}
      {(meeting.planNames || []).length > 0 && (
        <div style={hubStyles.modalSection}>
          <div style={hubStyles.modalTitle}>Planos relacionados</div>
          <div style={hubStyles.chipRow}>
            {meeting.planNames.map((name) => (
              <Badge key={name} cor="neutral">{name}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Preview rápido dos itens de ata */}
      {hasAta && (
        <div style={hubStyles.modalSection}>
          <div style={hubStyles.modalTitle}>Itens de Ata</div>
          <AgendaList
            items={agendaItems}
            onConvert={onConvert}
          />
        </div>
      )}
    </Card>
  );
}

// ─── AgendaList ───────────────────────────────────────────────────────────────
/**
 * Lista de itens de ata.
 * - onConvert(index, item): RF02 — converte em plano
 * - onRemove(index):        remove do form (apenas criacao)
 * - readOnly:               sem botao de converter (so exibe)
 */
function AgendaList({ items, onConvert, onRemove, readOnly }) {
  if (!items || items.length === 0) {
return <div style={{ ...hubStyles.muted, fontSize: '13px' }}>Nenhum item de ata registrado.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {items.map((item, index) => {
        const converted = Boolean(item.convertedPlanId);
        return (
          <div
            key={index}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: converted ? 'var(--bg-success-light, rgba(16,185,129,0.06))' : 'var(--bg-panel)',
              border: `1px solid ${converted ? 'rgba(16,185,129,0.25)' : 'var(--border)'}`,
              borderRadius: '10px', padding: '10px 14px',
            }}
          >
            {/* Ícone de status */}
            <span style={{ fontSize: '16px', flexShrink: 0 }}>
              {converted ? '✅' : '📝'}
            </span>

            {/* Texto */}
            <span style={{
              flex: 1, fontSize: '14px', fontWeight: '600',
              color: converted ? 'var(--text-muted)' : 'var(--text-main)',
              textDecoration: converted ? 'line-through' : 'none',
            }}>
              {item.text}
            </span>

            {/* Badge já convertido */}
            {converted && (
              <Badge cor="success" style={{ flexShrink: 0, fontSize: '11px' }}>
                Plano criado
              </Badge>
            )}

            {/* Botão converter (RF02) */}
            {!converted && !readOnly && onConvert && (
              <Btn
                variant="secondary"
                size="sm"
                onClick={() => onConvert(index, item)}
                style={{ flexShrink: 0, fontSize: '12px' }}
              >
                Converter em Plano
              </Btn>
            )}

            {/* Botão remover (apenas no form de criação) */}
            {onRemove && (
              <Btn
                variant="danger"
                size="sm"
                onClick={() => onRemove(index)}
                style={{ flexShrink: 0, padding: '4px 8px' }}
              >
                ✕
              </Btn>
            )}
          </div>
        );
      })}
    </div>
  );
}