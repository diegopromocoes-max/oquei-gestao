import React, { useState } from 'react';
import { Card, Btn, Input, Badge } from '../../components/ui';
import { useMeetings } from '../hooks/useMeetings';
import { addMeetingItem, createMeeting, updateMeetingItems } from '../services/meetingService';
import { createPlan } from '../services/planService';

export default function MeetingsPage({ userData, selectedCityId, selectedMonth }) {
  const meetings = useMeetings(selectedCityId);
  const [title, setTitle] = useState('');

  const handleCreateMeeting = async () => {
    if (!selectedCityId || selectedCityId === '__all__') {
      window.showToast?.('Selecione uma cidade.', 'error');
      return;
    }
    await createMeeting({ cityId: selectedCityId, title: title || 'Reuniao de Growth' }, userData);
    setTitle('');
  };

  const handleAddItem = async (meetingId, text, reset) => {
    if (!text.trim()) return;
    await addMeetingItem(meetingId, text, userData);
    reset();
  };

  const handleConvert = async (meeting, item) => {
    if (!selectedCityId || selectedCityId === '__all__') return;
    const planRef = await createPlan({
      name: item.text,
      description: `Origem: ${meeting.title || 'Reuniao'}`,
      objectives: [],
      category: 'Marketing',
      actionFocus: 'Outro',
      cityId: meeting.cityId || selectedCityId,
      month: selectedMonth,
      status: 'Backlog',
      responsibles: [{ name: userData?.name || 'Responsavel', sector: userData?.sector || '' }],
    }, userData);

    const updated = (meeting.items || []).map((it) =>
      it.id === item.id ? { ...it, convertedPlanId: planRef.id } : it
    );

    await updateMeetingItems(meeting.id, updated);
    window.showToast?.('Item convertido em plano.', 'success');
  };

  return (
    <div className="hub-stack">
      <Card title="Reunioes" subtitle="Ata de brainstorming e ideias de crescimento">
        <div className="hub-form-grid">
          <Input label="Titulo da reuniao" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="hub-actions">
          <Btn onClick={handleCreateMeeting}>Criar reuniao</Btn>
        </div>
      </Card>

      {meetings.map((m) => (
        <MeetingCard key={m.id} meeting={m} onAdd={handleAddItem} onConvert={handleConvert} />
      ))}
    </div>
  );
}

function MeetingCard({ meeting, onAdd, onConvert }) {
  const [text, setText] = useState('');

  return (
    <Card title={meeting.title || 'Reuniao'} subtitle="Itens de brainstorming">
      <div className="hub-form-grid">
        <Input label="Novo item" value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      <div className="hub-actions">
        <Btn onClick={() => onAdd(meeting.id, text, () => setText(''))}>Adicionar item</Btn>
      </div>

      <div className="hub-meeting-items">
        {(meeting.items || []).length === 0 && <div className="hub-empty">Sem itens por enquanto.</div>}
        {(meeting.items || []).map((item) => (
          <div key={item.id} className="hub-task-row">
            <div>
              <div className="hub-strong">{item.text}</div>
              {item.convertedPlanId && <Badge cor="success">Plano gerado</Badge>}
            </div>
            <div className="hub-actions-inline">
              <Btn size="sm" variant="secondary" onClick={() => onConvert(meeting, item)} disabled={!!item.convertedPlanId}>
                Converter
              </Btn>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
