import React, { useEffect, useMemo, useState } from 'react';
import { Card, Btn, Input, Badge, InfoBox, data } from '../../components/ui';
import { useMeetings } from '../hooks/useMeetings';
import { createMeeting } from '../services/meetingService';
import { useGrowthPlans } from '../hooks/useGrowthPlans';
import { useUsers } from '../hooks/useUsers';

export default function MeetingsPage({ userData, selectedCityId, selectedMonth, selectedGrowthPlan }) {
  const meetings = useMeetings(selectedCityId);
  const plans = useGrowthPlans(selectedCityId, selectedMonth);
  const { users } = useUsers({
    cityId: selectedCityId,
    clusterId: userData?.clusterId || null,
    fallbackAll: true,
  });

  const [form, setForm] = useState({
    title: '',
    date: '',
    time: '',
    participantUids: [],
    planIds: [],
  });

  useEffect(() => {
    if (selectedGrowthPlan?.id && form.planIds.length === 0) {
      setForm((prev) => ({ ...prev, planIds: [selectedGrowthPlan.id] }));
    }
  }, [selectedGrowthPlan?.id]);

  const toggleParticipant = (uid) => {
    setForm((prev) => ({
      ...prev,
      participantUids: prev.participantUids.includes(uid)
        ? prev.participantUids.filter((id) => id !== uid)
        : [...prev.participantUids, uid],
    }));
  };

  const togglePlan = (planId) => {
    setForm((prev) => ({
      ...prev,
      planIds: prev.planIds.includes(planId)
        ? prev.planIds.filter((id) => id !== planId)
        : [...prev.planIds, planId],
    }));
  };

  const handleCreateMeeting = async () => {
    if (!selectedCityId || selectedCityId === '__all__') {
      window.showToast?.('Selecione uma cidade.', 'error');
      return;
    }
    if (!form.date) {
      window.showToast?.('Informe a data da reuniao.', 'error');
      return;
    }
    if (form.participantUids.length === 0) {
      window.showToast?.('Selecione pelo menos um participante.', 'error');
      return;
    }

    const participants = users
      .filter((u) => form.participantUids.includes(u.id))
      .map((u) => ({
        uid: u.id,
        name: u.name || u.nome || u.displayName || 'Sem nome',
        role: u.role || '',
      }));

    const selectedPlans = plans.filter((p) => form.planIds.includes(p.id));

    await createMeeting({
      cityId: selectedCityId,
      title: form.title || 'Reuniao de Growth',
      date: form.date,
      time: form.time,
      participants,
      planIds: selectedPlans.map((p) => p.id),
      planNames: selectedPlans.map((p) => p.name || 'Plano'),
    }, userData);

    setForm({ title: '', date: '', time: '', participantUids: [], planIds: [] });
  };

  return (
    <div className="hub-stack">
      <Card title="Reunioes" subtitle="Agenda de encontros e participantes">
        <div className="hub-form-grid">
          <Input label="Titulo da reuniao" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input type="date" label="Data" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Input type="time" label="Horario" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
        </div>

        <div className="hub-modal-section">
          <div className="hub-modal-title">Participantes</div>
          <div className="hub-checklist">
            {users.map((u) => (
              <label key={u.id} className="hub-check">
                <input
                  type="checkbox"
                  checked={form.participantUids.includes(u.id)}
                  onChange={() => toggleParticipant(u.id)}
                />
                <span>{u.name || u.nome || u.displayName || 'Sem nome'}</span>
              </label>
            ))}
            {users.length === 0 && <div className="hub-muted">Nenhum usuario encontrado.</div>}
          </div>
        </div>

        <div className="hub-modal-section">
          <div className="hub-modal-title">Planos relacionados (opcional)</div>
          <div className="hub-checklist">
            {plans.map((p) => (
              <label key={p.id} className="hub-check">
                <input
                  type="checkbox"
                  checked={form.planIds.includes(p.id)}
                  onChange={() => togglePlan(p.id)}
                />
                <span>{p.name || 'Plano sem nome'}</span>
              </label>
            ))}
            {plans.length === 0 && <div className="hub-muted">Sem planos disponiveis para vincular.</div>}
          </div>
        </div>

        <div className="hub-actions">
          <Btn onClick={handleCreateMeeting}>Criar reuniao</Btn>
        </div>
      </Card>

      {meetings.length === 0 && <InfoBox type="info">Nenhuma reuniao agendada ainda.</InfoBox>}
      {meetings.map((m) => (
        <MeetingCard key={m.id} meeting={m} />
      ))}
    </div>
  );
}

function MeetingCard({ meeting }) {
  const participants = useMemo(() => {
    if (!Array.isArray(meeting.participants)) return [];
    return meeting.participants.map((p) => p.name).filter(Boolean);
  }, [meeting.participants]);

  return (
    <Card title={meeting.title || 'Reuniao'} subtitle="Agenda">
      <div className="hub-modal-section">
        <div className="hub-muted">
          Data: {meeting.scheduledDate ? data(meeting.scheduledDate) : '--'}
          {meeting.scheduledTime ? ` - ${meeting.scheduledTime}` : ''}
        </div>
      </div>

      <div className="hub-modal-section">
        <div className="hub-modal-title">Participantes</div>
        {participants.length === 0 && <div className="hub-muted">Sem participantes.</div>}
        {participants.length > 0 && (
          <div className="hub-chip-row">
            {participants.map((name) => (
              <span key={name} className="hub-chip">{name}</span>
            ))}
          </div>
        )}
      </div>

      <div className="hub-modal-section">
        <div className="hub-modal-title">Planos relacionados</div>
        {(meeting.planNames || []).length === 0 && <div className="hub-muted">Sem plano associado.</div>}
        {(meeting.planNames || []).length > 0 && (
          <div className="hub-chip-row">
            {meeting.planNames.map((name) => (
              <Badge key={name} cor="neutral">{name}</Badge>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
