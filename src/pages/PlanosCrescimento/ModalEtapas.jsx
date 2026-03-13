import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Btn, Input, Tabs, styles as ui } from '../../components/ui';
import { salvarPlanoAcao } from '../../services/acoes';

export default function ModalEtapas({ plan, close, userData }) {
  const [tab, setTab] = useState('Planejamento');
  const [text, setText] = useState('');
  
  const handleSave = async () => {
    if (!text.trim()) return;
    const step = { id: Date.now().toString(), text, date: new Date().toISOString(), author: userData?.name };
    const field = tab === 'Planejamento' ? 'planningSteps' : 'executionSteps';
    await salvarPlanoAcao(plan.id, { [field]: [...(plan[field] || []), step] }, userData);
    setText('');
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '600px', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '20px 24px', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '18px', fontWeight: '900' }}>Diário de Ação: {plan.name}</h3>
          <button onClick={close} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '5px' }}><X size={20}/></button>
        </div>
        <div style={{ padding: '24px' }}>
          <Tabs tabs={['Planejamento', 'Execucao']} active={tab} onChange={setTab} />
          <div style={{ maxHeight: '300px', overflowY: 'auto', margin: '20px 0', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '5px' }}>
            {(plan[tab === 'Planejamento' ? 'planningSteps' : 'executionSteps'] || []).map(step => (
              <div key={step.id} style={{ background: 'var(--bg-app)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-main)', fontWeight: '600' }}>{step.text}</p>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800' }}>{step.author} • {new Date(step.date).toLocaleString('pt-BR')}</span>
              </div>
            ))}
            {(plan[tab === 'Planejamento' ? 'planningSteps' : 'executionSteps'] || []).length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>Nenhum registo nesta etapa.</div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'flex-end' }}>
            <Input value={text} onChange={e => setText(e.target.value)} placeholder="Descreva a evolução..." onKeyDown={e => e.key === 'Enter' && handleSave()} />
            <Btn onClick={handleSave}>Gravar</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}