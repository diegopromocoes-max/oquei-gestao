import React, { useState } from 'react';
import { Layers, Trash2, X } from 'lucide-react';
import { Btn, Card, Input, Select, Textarea, colors, styles as ui } from '../../components/ui';
import { salvarPlanoAcao, upsertResponsavel } from '../../services/acoes';
import { ALL_CITIES, CATEGORY_OPTIONS, FOCUS_OPTIONS, STATUS_OPTIONS, OUTCOME_OPTIONS, REPLICABLE_OPTIONS, TAB_LABELS } from './constants';

export default function ActionCreator({ form, setForm, currentId, resetForm, responsibles, sectorOptions, learnedObjectives, userData, selectedCityId, selectedMonth, setActiveTab }) {
  const isEditable = form.status === 'Planejamento' || !currentId;
  const [newObj, setNewObj] = useState('');

  const handleAddObjective = () => {
    if (!newObj.trim()) return;
    if (!form.objectives.includes(newObj)) setForm({ ...form, objectives: [...form.objectives, newObj] });
    setNewObj('');
  };

  const handleSave = async () => {
    if (!selectedCityId || selectedCityId === ALL_CITIES) return window.showToast?.('Selecione uma praça.', 'error');
    if (!form.name) return window.showToast?.('Dê um nome ao plano.', 'error');
    if (form.objectives.length === 0) return window.showToast?.('Adicione um objetivo.', 'error');

    try {
      const cleanResponsibles = form.responsibles.filter(r => r.name.trim());
      for (const resp of cleanResponsibles) await upsertResponsavel(resp.name, resp.sector, userData);

      const payload = { 
        ...form, 
        responsibles: cleanResponsibles, 
        cost: Number(form.cost || 0),
        actualBaseImpact: Number(form.actualBaseImpact || 0), 
        returnValue: Number(form.returnValue || 0),
        objectiveResults: form.objectiveResults || {}, // Salva a aferição dos objetivos!
        cityId: selectedCityId, 
        month: selectedMonth, 
        planType: 'crescimento' 
      };

      await salvarPlanoAcao(currentId, payload, userData);
      window.showToast?.('Ação salva com sucesso!', 'success');
      resetForm();
      setActiveTab(TAB_LABELS[2]); 
    } catch (err) { window.showToast?.('Erro ao salvar.', 'error'); }
  };

  return (
    <div className="animate-fadeInUp" style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1.2fr) minmax(350px, 1fr)', gap: '24px' }}>
      
      <Card title="O Plano Estratégico" subtitle="Defina o escopo, objetivos e envolvidos.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input label="Título da Ação" value={form.name} onChange={e => setForm({...form, name: e.target.value})} disabled={!isEditable} />
            <Select label="Área de Alcance" value={form.category} onChange={e => setForm({...form, category: e.target.value})} options={CATEGORY_OPTIONS} disabled={!isEditable} />
          </div>

          <div style={{ background: 'var(--bg-app)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <label style={{ fontSize: '12px', fontWeight: '800', marginBottom: '10px', display: 'block', color: 'var(--text-main)' }}>Objetivos da Ação</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px' }}>
              {form.objectives.map(obj => (
                <div key={obj} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-panel)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                  {obj} {isEditable && <button onClick={() => setForm({...form, objectives: form.objectives.filter(o => o !== obj)})} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 0 }}><X size={14}/></button>}
                </div>
              ))}
            </div>
            {isEditable && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px' }}>
                <Input list="obj-list" placeholder="Digite e aperte Enter..." value={newObj} onChange={e => setNewObj(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddObjective()} />
                <datalist id="obj-list">{learnedObjectives.map(o => <option key={o} value={o} />)}</datalist>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}><Btn variant="secondary" onClick={handleAddObjective}>Adicionar</Btn></div>
              </div>
            )}
          </div>

          <Textarea label="Descrição da Ação" value={form.description} onChange={e => setForm({...form, description: e.target.value})} disabled={!isEditable} />

          <div style={{ padding: '16px', background: 'var(--bg-app)', borderRadius: '12px', border: '1px solid var(--border)' }}>
             <h4 style={{ margin: '0 0 15px 0', fontSize: '13px', color: 'var(--text-main)' }}>Responsáveis</h4>
             {form.responsibles.map((resp, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', marginBottom: '10px' }}>
                  <Input placeholder="Nome..." list="resp-list" value={resp.name} onChange={e => { const r = [...form.responsibles]; r[i].name = e.target.value; setForm({...form, responsibles: r}); }} disabled={!isEditable} />
                  <Input placeholder="Setor..." list="sec-list" value={resp.sector} onChange={e => { const r = [...form.responsibles]; r[i].sector = e.target.value; setForm({...form, responsibles: r}); }} disabled={!isEditable} />
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>{isEditable && form.responsibles.length > 1 && <Btn variant="danger" onClick={() => setForm({...form, responsibles: form.responsibles.filter((_, idx) => idx !== i)})}>X</Btn>}</div>
                </div>
             ))}
             {isEditable && <Btn variant="secondary" size="sm" onClick={() => setForm({...form, responsibles: [...form.responsibles, {name:'', sector:''}]})}>+ Incluir</Btn>}
             <datalist id="resp-list">{responsibles.map(r => <option key={r.id} value={r.name} />)}</datalist>
             <datalist id="sec-list">{sectorOptions.map(s => <option key={s} value={s} />)}</datalist>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Input type="date" label="Início" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} disabled={!isEditable} />
            <Input type="date" label="Prazo Final" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} disabled={!isEditable} />
          </div>
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <Card title="Recursos e Foco" subtitle="Onde o esforço será concentrado?">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Select label="Foco Principal" value={form.actionFocus} onChange={e => setForm({...form, actionFocus: e.target.value})} options={FOCUS_OPTIONS} disabled={!isEditable} />
              <Input type="number" label="Orçamento (R$)" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} disabled={!isEditable} />
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <h4 style={{ margin: '0 0 15px 0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}><Layers size={16} color={colors.primary}/> KPIs Dinâmicos</h4>
              {(form.dynamicMetrics || []).map((metric) => (
                <div key={metric.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', marginBottom: '10px', background: 'var(--bg-app)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div><Input placeholder="Métrica" value={metric.name} onChange={e => setForm({...form, dynamicMetrics: form.dynamicMetrics.map(m => m.id===metric.id ? {...m, name:e.target.value} : m)})} disabled={!isEditable} /></div>
                  <div><Input type="number" placeholder="Meta" value={metric.target} onChange={e => setForm({...form, dynamicMetrics: form.dynamicMetrics.map(m => m.id===metric.id ? {...m, target:e.target.value} : m)})} disabled={!isEditable} /></div>
                  <div><Input type="number" placeholder="Real" value={metric.achieved} onChange={e => setForm({...form, dynamicMetrics: form.dynamicMetrics.map(m => m.id===metric.id ? {...m, achieved:e.target.value} : m)})} /></div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '5px' }}>{isEditable && <button onClick={() => setForm({...form, dynamicMetrics: form.dynamicMetrics.filter(m => m.id !== metric.id)})} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={18}/></button>}</div>
                </div>
              ))}
              {isEditable && <Btn variant="secondary" size="sm" onClick={() => setForm({ ...form, dynamicMetrics: [...(form.dynamicMetrics || []), { id: Date.now(), name: '', target: '', achieved: '' }] })}>+ Criar Novo KPI</Btn>}
            </div>
            <Select label="Status Atual" value={form.status} onChange={e => setForm({...form, status: e.target.value})} options={STATUS_OPTIONS} />
          </div>
        </Card>

        {form.status === 'Finalizada' && (
          <Card title="Debriefing (Pós-Ação)" subtitle="Resultados reais para fechar o ciclo.">
            <div style={{ padding: '20px', background: 'var(--bg-app)', borderRadius: '16px', border: '1px solid var(--border)' }}>
              
              {/* NOVA ÁREA DE AFERIÇÃO DE OBJETIVOS */}
              {form.objectives.length > 0 && (
                <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
                  <h5 style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-main)' }}>Aferição de Objetivos Traçados</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                    {form.objectives.map(obj => (
                      <Input 
                        key={obj} 
                        label={`Resultado alcançado para: ${obj}`} 
                        placeholder="Ex: Atingimos 5.000 visualizações..."
                        value={form.objectiveResults?.[obj] || ''} 
                        onChange={e => setForm({...form, objectiveResults: {...(form.objectiveResults || {}), [obj]: e.target.value}})} 
                      />
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Input type="number" label="Impacto na Base (+ Clientes)" value={form.actualBaseImpact} onChange={e => setForm({...form, actualBaseImpact: e.target.value})} />
                <Select label="Avaliação Final" value={form.outcome} onChange={e => setForm({...form, outcome: e.target.value})} options={OUTCOME_OPTIONS} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                <Input type="number" label="Retorno Gerado (R$)" value={form.returnValue} onChange={e => setForm({...form, returnValue: e.target.value})} />
                <Select label="Tornar Replicável?" value={form.replicable} onChange={e => setForm({...form, replicable: e.target.value})} options={REPLICABLE_OPTIONS} />
              </div>
              <div style={{ marginTop: '16px' }}>
                <Textarea label="Lições Aprendidas" value={form.resultsSummary} onChange={e => setForm({...form, resultsSummary: e.target.value})} />
              </div>
            </div>
          </Card>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
          {currentId && <Btn variant="secondary" onClick={resetForm}>Cancelar</Btn>}
          <Btn onClick={handleSave}>{currentId ? 'Atualizar Plano' : 'Lançar Ação'}</Btn>
        </div>
      </div>
    </div>
  );
}