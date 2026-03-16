import React, { useMemo, useState } from 'react';
import { Card, Btn, Input, Textarea, Badge, Select, Modal, moeda } from '../../components/ui';
import { useGrowthPlans } from '../hooks/useGrowthPlans';
import { createGrowthPlan, deleteGrowthPlan, finalizeGrowthPlan } from '../services/growthPlanService';
import { useUsers } from '../hooks/useUsers';
import Timeline from '../components/Timeline';
import { useTimeline } from '../hooks/useTimeline';

export default function OverviewPage({ userData, selectedCityId, selectedMonth, selectedGrowthPlan, onSelectPlan, onClearPlan }) {
  const plans = useGrowthPlans(selectedCityId, selectedMonth);
  const cityFilter = selectedCityId && selectedCityId !== '__all__' ? selectedCityId : null;
  const { users } = useUsers({
    cityId: cityFilter,
    clusterId: userData?.clusterId || null,
    fallbackAll: true,
  });
  const [form, setForm] = useState({ name: '', description: '', responsibleUid: '' });
  const [saving, setSaving] = useState(false);
  const [finalizePlan, setFinalizePlan] = useState(null);
  const [finalizeReport, setFinalizeReport] = useState('');
  const [timelinePlan, setTimelinePlan] = useState(null);
  const timelineEvents = useTimeline({ growthPlanId: timelinePlan?.id });

  const responsibleOptions = useMemo(() => {
    return users.map((u) => ({
      value: u.id,
      label: `${u.name || u.nome || u.displayName || 'Sem nome'}${u.role ? ` (${u.role})` : ''}`,
    }));
  }, [users]);

  const handleCreate = async () => {
    if (!selectedCityId || selectedCityId === '__all__') {
      window.showToast?.('Selecione uma cidade.', 'error');
      return;
    }
    if (!form.name.trim()) {
      window.showToast?.('Informe o nome do plano geral.', 'error');
      return;
    }
    setSaving(true);
    try {
      const responsible = users.find((u) => u.id === form.responsibleUid) || {};
      await createGrowthPlan({
        name: form.name,
        description: form.description,
        cityId: selectedCityId,
        month: selectedMonth,
        responsibleUid: responsible.id || userData?.uid || null,
        responsibleName: responsible.name || responsible.nome || responsible.displayName || userData?.name || userData?.nome || null,
      }, userData);
      setForm({ name: '', description: '', responsibleUid: '' });
      window.showToast?.('Plano geral criado.', 'success');
    } catch (err) {
      window.showToast?.('Erro ao criar plano geral.', 'error');
    }
    setSaving(false);
  };

  const handleDelete = async (planId) => {
    if (!window.confirm('Excluir este plano geral?')) return;
    await deleteGrowthPlan(planId, userData);
    if (selectedGrowthPlan?.id === planId) onClearPlan?.();
  };

  const handleConfirmFinalize = async () => {
    if (!finalizePlan) return;
    await finalizeGrowthPlan(finalizePlan.id, finalizeReport, userData);
    setFinalizePlan(null);
    setFinalizeReport('');
  };

  return (
    <div className="hub-stack">
      <Card title="Visao Geral" subtitle="Crie um plano geral e depois cadastre as acoes">
        <div className="hub-form-grid">
          <Input label="Nome do plano geral" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Textarea label="Descricao" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Select
            label="Responsavel"
            value={form.responsibleUid}
            onChange={(e) => setForm({ ...form, responsibleUid: e.target.value })}
            options={responsibleOptions}
            placeholder="Selecione um usuario"
          />
          {users.length === 0 && <div className="hub-muted">Nenhum usuario encontrado.</div>}
        </div>
        <div className="hub-actions">
          <Btn onClick={handleCreate} loading={saving}>Criar plano geral</Btn>
        </div>
      </Card>

      <Card title="Planos gerais" subtitle="Selecione para acessar as acoes">
        {plans.length === 0 && <div className="hub-empty">Nenhum plano geral criado.</div>}
        {plans.map((p) => (
          <div key={p.id} className="hub-task-row">
            <div>
              <div className="hub-strong">{p.name}</div>
              <div className="hub-muted">{p.description || 'Sem descricao'}</div>
              <div className="hub-muted">Mes: {p.month || '--'} | Cidade: {p.cityId || '--'}</div>
              <div className="hub-muted">Orcamento geral: {moeda(Number(p.budgetTotal || 0))}</div>
              <div className="hub-muted">Status: {p.status || 'Ativo'}</div>
            </div>
            <div className="hub-actions-inline">
              {selectedGrowthPlan?.id === p.id && <Badge cor="success">Selecionado</Badge>}
              <Btn size="sm" onClick={() => onSelectPlan?.(p)}>Entrar</Btn>
              <Btn
                size="sm"
                variant="secondary"
                onClick={() => setTimelinePlan(p)}
              >
                Linha do tempo
              </Btn>
              <Btn
                size="sm"
                variant="secondary"
                disabled={p.status === 'Finalizado'}
                onClick={() => { setFinalizePlan(p); setFinalizeReport(''); }}
              >
                Finalizar
              </Btn>
              <Btn size="sm" variant="danger" onClick={() => handleDelete(p.id)}>Excluir</Btn>
            </div>
          </div>
        ))}
      </Card>

      <Modal
        open={!!finalizePlan}
        onClose={() => { setFinalizePlan(null); setFinalizeReport(''); }}
        title={finalizePlan ? `Finalizar plano: ${finalizePlan.name}` : 'Finalizar plano'}
        size="lg"
      >
        <div className="hub-modal">
          <div className="hub-modal-section">
            <div className="hub-modal-title">Relatorio (opcional)</div>
            <Textarea
              label="Relatorio"
              value={finalizeReport}
              onChange={(e) => setFinalizeReport(e.target.value)}
              placeholder="Descreva resultados, aprendizados e proximos passos."
            />
          </div>
          <div className="hub-actions">
            <Btn variant="secondary" onClick={() => { setFinalizePlan(null); setFinalizeReport(''); }}>Cancelar</Btn>
            <Btn onClick={handleConfirmFinalize}>Finalizar plano</Btn>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!timelinePlan}
        onClose={() => setTimelinePlan(null)}
        title={timelinePlan ? `Linha do tempo: ${timelinePlan.name}` : 'Linha do tempo'}
        size="lg"
      >
        <div className="hub-modal">
          <Timeline events={timelineEvents} />
        </div>
      </Modal>
    </div>
  );
}
