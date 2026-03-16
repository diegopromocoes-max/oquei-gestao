import React, { useState } from 'react';
import { X, CheckCircle, Circle, Calendar, User, DollarSign } from 'lucide-react';
import { Btn, Input, Tabs, colors, data, styles as ui } from '../../components/ui';
import { salvarPlanoAcao } from '../../services/acoes';

export default function ModalEtapas({ plan, close, userData }) {
  const [tab, setTab] = useState('Planejamento');
  const [text, setText] = useState('');
  const [deadline, setDeadline] = useState('');
  const [responsible, setResponsible] = useState(userData?.name || '');
  const [addedBudget, setAddedBudget] = useState('');
  
  const handleSave = async () => {
    if (!text.trim()) return;
    const step = { 
      id: Date.now().toString(), 
      text, 
      date: new Date().toISOString(), 
      author: userData?.name,
      deadline,
      responsible,
      addedBudget: Number(addedBudget || 0),
      completed: false
    };
    const field = tab === 'Planejamento' ? 'planningSteps' : 'executionSteps';
    await salvarPlanoAcao(plan.id, { [field]: [...(plan[field] || []), step] }, userData);
    setText(''); setDeadline(''); setAddedBudget('');
  };

  const toggleComplete = async (stepId) => {
    const field = tab === 'Planejamento' ? 'planningSteps' : 'executionSteps';
    const updatedSteps = (plan[field] || []).map(s => s.id === stepId ? { ...s, completed: !s.completed } : s);
    await salvarPlanoAcao(plan.id, { [field]: updatedSteps }, userData);
  };

  const stepsList = plan[tab === 'Planejamento' ? 'planningSteps' : 'executionSteps'] || [];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '700px', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '20px 24px', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '18px', fontWeight: '900' }}>Gestão de Etapas: {plan.name}</h3>
          <button onClick={close} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px' }}><X size={20}/></button>
        </div>
        <div style={{ padding: '24px' }}>
          <Tabs tabs={['Planejamento', 'Execucao']} active={tab} onChange={setTab} />
          
          <div style={{ maxHeight: '280px', overflowY: 'auto', margin: '20px 0', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '5px' }}>
            {stepsList.map(step => (
              <div key={step.id} style={{ display: 'flex', gap: '15px', background: 'var(--bg-app)', padding: '16px', borderRadius: '12px', border: `1px solid ${step.completed ? colors.success : 'var(--border)'}`, opacity: step.completed ? 0.7 : 1 }}>
                <button onClick={() => toggleComplete(step.id)} style={{ background:'none', border:'none', cursor:'pointer', color: step.completed ? colors.success : 'var(--text-muted)', marginTop:'2px' }}>
                  {step.completed ? <CheckCircle size={22}/> : <Circle size={22}/>}
                </button>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-main)', fontWeight: '600', textDecoration: step.completed ? 'line-through' : 'none' }}>{step.text}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800' }}>
                    <span style={{ display:'flex', alignItems:'center', gap:'4px' }}><User size={12}/> Resp: {step.responsible || step.author}</span>
                    {step.deadline && <span style={{ display:'flex', alignItems:'center', gap:'4px', color: step.completed ? 'inherit' : colors.warning }}><Calendar size={12}/> Prazo: {data(step.deadline)}</span>}
                    {step.addedBudget > 0 && <span style={{ display:'flex', alignItems:'center', gap:'4px', color: colors.danger }}><DollarSign size={12}/> +R$ {step.addedBudget}</span>}
                  </div>
                </div>
              </div>
            ))}
            {stepsList.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Nenhuma etapa registrada.</div>}
          </div>

          <div style={{ background: 'var(--bg-panel)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <Input value={text} onChange={e => setText(e.target.value)} placeholder="Descreva a nova etapa..." />
              <Input type="date" label="Prazo (Opcional)" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
              <Input label="Responsável" value={responsible} onChange={e => setResponsible(e.target.value)} />
              <Input type="number" label="Orçamento Extra (R$)" value={addedBudget} onChange={e => setAddedBudget(e.target.value)} placeholder="0.00" />
              <Btn onClick={handleSave}>Gravar Etapa</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}