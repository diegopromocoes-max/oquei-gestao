import React, { useMemo, useState, useEffect } from 'react';
import { Card, Btn, Input, Select, Textarea, Modal, Badge, InfoBox, moeda } from '../../components/ui';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import KanbanBoard from '../components/KanbanBoard';
import KanbanColumn from '../components/KanbanColumn';
import PlanCard from '../components/PlanCard';
import Timeline from '../components/Timeline';
import { usePlans } from '../hooks/usePlans';
import { createPlan, updatePlanStatus, deleteActionPlan } from '../services/planService';
import { createTask, deleteTask, getTasksByAction, completeTask, reopenTask } from '../services/taskService';
import { useUsers } from '../hooks/useUsers';
import { useKpis } from '../hooks/useKpis';
import { createKpi } from '../services/kpiService';
import { useTimeline } from '../hooks/useTimeline';
import { hubStyles } from '../styles/hubStyles';

const CATEGORY_OPTIONS = ['Marketing', 'Comercial', 'Operacional', 'Relacionamento', 'Outras'];
const FOCUS_OPTIONS = ['Vendas Novas', 'Migracoes/Up-Sell', 'Retencao/Anti-Churn', 'Marca', 'Inadimplencia', 'Outro'];
const KPI_CATEGORIES = ['Vendas', 'Leads', 'Marca', 'Outro'];

const COLUMNS = [
  { id: 'Backlog', title: 'Backlog' },
  { id: 'Planejamento', title: 'Planejamento' },
  { id: 'Em Andamento', title: 'Em Andamento' },
  { id: 'Finalizada', title: 'Finalizada' },
  { id: 'Cancelada', title: 'Cancelada' },
];

export default function KanbanPage({ userData, selectedCityId, selectedMonth, selectedGrowthPlan }) {
  const plans = usePlans(selectedGrowthPlan?.cityId || selectedCityId, selectedMonth, selectedGrowthPlan?.id);
  const cityFilter = selectedGrowthPlan?.cityId || selectedCityId || null;
  const { users } = useUsers({
    cityId: cityFilter,
    clusterId: userData?.clusterId || null,
    fallbackAll: true,
  });
  // RNF01: useKpis migrado para getDocs (nao mais onSnapshot)
  const { kpis, refresh: refreshKpis } = useKpis();
  // ── dnd-kit: sensores com suporte a touch (mobile) ──────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  );
  const [activeId, setActiveId] = useState(null); // ID do card sendo arrastado
  const [isSaving, setIsSaving] = useState(false);
  const [finalizePlan, setFinalizePlan] = useState(null);
  const [finalizeReport, setFinalizeReport] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    objectives: '',
    category: CATEGORY_OPTIONS[0],
    actionFocus: FOCUS_OPTIONS[0],
    startDate: '',
    endDate: '',
    cost: '',
    responsibleUid: '',
  });

  const [openPlan, setOpenPlan] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [taskForm, setTaskForm] = useState({
    title: '',
    deadline: '',
    responsibleUid: '',
    budget: '',
    kpiEnabled: 'no',
    kpiSelection: '',
    kpiName: '',
    kpiCategory: KPI_CATEGORIES[0],
  });
  const [finishTask, setFinishTask] = useState(null);
  const [finishReport, setFinishReport] = useState('');
  const [finishKpiResult, setFinishKpiResult] = useState('');
  const timelineEvents = useTimeline({ actionPlanId: openPlan?.id });

  const responsibleOptions = useMemo(() => {
    return users.map((u) => ({
      value: u.id,
      label: `${u.name || u.nome || u.displayName || 'Sem nome'}${u.role ? ` (${u.role})` : ''}`,
    }));
  }, [users]);

  const kpiOptions = useMemo(() => {
    return kpis.map((kpi) => ({
      value: kpi.id,
      label: `${kpi.name || 'KPI'}${kpi.category ? ` (${kpi.category})` : ''}`,
    }));
  }, [kpis]);

  useEffect(() => {
    const load = async () => {
      if (!openPlan) return;
      const list = await getTasksByAction(openPlan.id);
      setTasks(list);
    };
    load();
  }, [openPlan]);

  useEffect(() => {
    if (!openPlan) return;
    const latest = plans.find((p) => p.id === openPlan.id);
    if (latest) setOpenPlan(latest);
  }, [plans]);

  const plansByStatus = useMemo(() => {
    const map = {};
    COLUMNS.forEach((c) => { map[c.id] = []; });
    plans.forEach((p) => {
      const key = map[p.status] ? p.status : 'Backlog';
      map[key].push(p);
    });
    return map;
  }, [plans]);

  // ── dnd-kit: handlers de drag ────────────────────────────────────────────
  const handleDragStart = ({ active }) => {
    setActiveId(active.id);
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    // over.id pode ser um planId (SortableContext) ou um columnId (Droppable)
    const targetColumnId = plansByStatus[over.id]
      ? over.id  // solto direto na coluna vazia
      : plans.find((p) => p.id === over.id)?.status; // solto em cima de outro card

    if (!targetColumnId) return;

    const sourcePlan = plans.find((p) => p.id === active.id);
    if (!sourcePlan || sourcePlan.status === targetColumnId) return;

    if (targetColumnId === 'Finalizada') {
      setFinalizePlan(sourcePlan);
      setFinalizeReport('');
      return;
    }

    await updatePlanStatus(active.id, targetColumnId, userData);
  };

  const handleCreatePlan = async () => {
    if (!selectedGrowthPlan) {
      window.showToast?.('Selecione um plano geral antes de criar a acao.', 'error');
      return;
    }
    if (!form.name.trim()) {
      window.showToast?.('Informe um nome para a acao.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const objectives = form.objectives
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);

      const responsible = users.find((u) => u.id === form.responsibleUid) || {};

      await createPlan({
        name: form.name,
        description: form.description,
        objectives,
        category: form.category,
        actionFocus: form.actionFocus,
        startDate: form.startDate,
        endDate: form.endDate,
        cost: Number(form.cost || 0),
        cityId: selectedGrowthPlan.cityId,
        month: selectedGrowthPlan.month || selectedMonth,
        growthPlanId: selectedGrowthPlan.id,
        growthPlanName: selectedGrowthPlan.name,
        responsibles: [{
          uid: responsible.id || userData?.uid || null,
          name: responsible.name || responsible.nome || responsible.displayName || userData?.name || userData?.nome || 'Responsavel',
          role: responsible.role || userData?.role || '',
          cityId: responsible.cityId || selectedGrowthPlan.cityId,
        }],
      }, userData);

      setForm({
        name: '', description: '', objectives: '', category: CATEGORY_OPTIONS[0],
        actionFocus: FOCUS_OPTIONS[0], startDate: '', endDate: '', cost: '', responsibleUid: ''
      });

      window.showToast?.('Acao criada.', 'success');
    } catch (err) {
      window.showToast?.('Erro ao criar acao.', 'error');
    }
    setIsSaving(false);
  };

  const handleAddTask = async () => {
    if (!openPlan) return;
    if (openPlan.status === 'Finalizada') {
      window.showToast?.('Acao finalizada. Reabra para adicionar etapas.', 'error');
      return;
    }
    if (!taskForm.title.trim()) {
      window.showToast?.('Informe o titulo da tarefa.', 'error');
      return;
    }

    const responsible = users.find((u) => u.id === taskForm.responsibleUid) || {};
    const responsibleUid = responsible.id || userData?.uid || '';
    const responsibleName = responsible.name || responsible.nome || responsible.displayName || userData?.name || userData?.nome || 'Responsavel';
    const kpiEnabled = taskForm.kpiEnabled === 'yes';
    let kpiId = null;
    let kpiName = null;
    let kpiCategory = null;

    if (kpiEnabled) {
      if (!taskForm.kpiSelection) {
        window.showToast?.('Selecione um KPI ou crie um novo.', 'error');
        return;
      }
      if (taskForm.kpiSelection && taskForm.kpiSelection !== '__new__') {
        const found = kpis.find((k) => k.id === taskForm.kpiSelection);
        kpiId = found?.id || null;
        kpiName = found?.name || null;
        kpiCategory = found?.category || null;
      } else {
        const name = String(taskForm.kpiName || '').trim();
        if (!name) {
          window.showToast?.('Informe o nome do KPI.', 'error');
          return;
        }
        const existing = kpis.find((k) => String(k.name || '').toLowerCase() === name.toLowerCase());
        if (existing) {
          kpiId = existing.id;
          kpiName = existing.name;
          kpiCategory = existing.category || taskForm.kpiCategory;
        } else {
          const newId = await createKpi({ name, category: taskForm.kpiCategory }, userData);
          kpiId = newId;
          kpiName = name;
          kpiCategory = taskForm.kpiCategory;
          refreshKpis(); // RNF01: atualiza lista apos criar KPI (substitui reatividade do onSnapshot)
        }
      }
    }

    try {
      await createTask(openPlan.id, {
        title: taskForm.title,
        deadline: taskForm.deadline || null,
        cityId: openPlan.cityId,
        actionName: openPlan.name,
        responsibleUid,
        responsibleName,
        budget: Number(taskForm.budget || 0),
        kpiEnabled,
        kpiId,
        kpiName,
        kpiCategory,
      }, userData);

      setTaskForm({
        title: '',
        deadline: '',
        responsibleUid: '',
        budget: '',
        kpiEnabled: 'no',
        kpiSelection: '',
        kpiName: '',
        kpiCategory: KPI_CATEGORIES[0],
      });
      const list = await getTasksByAction(openPlan.id);
      setTasks(list);
    } catch (err) {
      window.showToast?.('Nao foi possivel adicionar a etapa.', 'error');
    }
  };

  const handleDeleteTask = async (taskId) => {
    await deleteTask(taskId, userData);
    const list = await getTasksByAction(openPlan.id);
    setTasks(list);
  };

  const handleOpenFinishTask = (task) => {
    setFinishTask(task);
    setFinishReport('');
    setFinishKpiResult('');
  };

  const handleConfirmFinishTask = async () => {
    if (!finishTask) return;
    if (!String(finishReport || '').trim()) {
      window.showToast?.('Informe o relatorio da etapa.', 'error');
      return;
    }
    if (finishTask.kpiEnabled) {
      const value = finishKpiResult;
      if (value === '' || Number.isNaN(Number(value))) {
        window.showToast?.('Informe o resultado do KPI.', 'error');
        return;
      }
    }
    try {
      await completeTask(finishTask.id, userData, finishReport, finishKpiResult);
      setFinishTask(null);
      setFinishReport('');
      setFinishKpiResult('');
      const list = await getTasksByAction(openPlan.id);
      setTasks(list);
    } catch (err) {
      window.showToast?.('Nao foi possivel finalizar a etapa.', 'error');
    }
  };

  const handleReopenTask = async (task) => {
    await reopenTask(task.id, userData);
    const list = await getTasksByAction(openPlan.id);
    setTasks(list);
  };

  const handleDeleteAction = async () => {
    if (!openPlan) return;
    if (!window.confirm('Excluir esta acao?')) return;
    await deleteActionPlan(openPlan.id, userData);
    setOpenPlan(null);
  };

  const handleReopenAction = async () => {
    if (!openPlan) return;
    await updatePlanStatus(openPlan.id, 'Em Andamento', userData);
    setOpenPlan({ ...openPlan, status: 'Em Andamento' });
  };

  const handleConfirmFinalize = async () => {
    if (!finalizePlan) return;
    await updatePlanStatus(finalizePlan.id, 'Finalizada', userData, { completionReport: finalizeReport });
    setFinalizePlan(null);
    setFinalizeReport('');
  };

  return (
    <div style={hubStyles.stack}>
      {!selectedGrowthPlan && (
        <InfoBox type="warning">Selecione um plano geral para criar acoes.</InfoBox>
      )}

      <Card title="Nova Acao" subtitle="Crie uma acao dentro do plano geral">
        <div style={hubStyles.formGrid}>
          <Input label="Nome da acao" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Categoria" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={CATEGORY_OPTIONS} />
          <Select label="Foco" value={form.actionFocus} onChange={(e) => setForm({ ...form, actionFocus: e.target.value })} options={FOCUS_OPTIONS} />
          <Input type="number" label="Custo (R$)" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          <Input type="date" label="Inicio" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          <Input type="date" label="Prazo" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          <Input label="Objetivos (separe por virgula)" value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} />
          <Textarea label="Descricao" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Select
            label="Responsavel"
            value={form.responsibleUid}
            onChange={(e) => setForm({ ...form, responsibleUid: e.target.value })}
            options={responsibleOptions}
            placeholder="Selecione um usuario"
          />
          {users.length === 0 && <div style={hubStyles.muted}>Nenhum usuario encontrado.</div>}
        </div>
        <div style={hubStyles.actions}>
          <Btn onClick={handleCreatePlan} loading={isSaving}>Criar Acao</Btn>
        </div>
      </Card>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <KanbanBoard>
          {COLUMNS.map((col) => {
            const colPlans  = plansByStatus[col.id] || [];
            const planIds   = colPlans.map((p) => p.id);
            return (
              <KanbanColumn
                key={col.id}
                id={col.id}
                title={col.title}
                count={colPlans.length}
                planIds={planIds}
              >
                {colPlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    onClick={() => setOpenPlan(plan)}
                  />
                ))}
              </KanbanColumn>
            );
          })}
        </KanbanBoard>

        {/* DragOverlay: card "fantasma" que segue o cursor durante o drag */}
        <DragOverlay>
          {activeId ? (
            <PlanCard
              plan={plans.find((p) => p.id === activeId) || { id: activeId, name: '...' }}
              onClick={() => {}}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <Modal
        open={!!openPlan}
        onClose={() => { setOpenPlan(null); setTasks([]); }}
        title={openPlan ? `Acao: ${openPlan.name}` : 'Acao'}
        size="lg"
      >
        {openPlan && (
          <div style={hubStyles.modal}>
            <div style={hubStyles.modalSection}>
              <div style={hubStyles.modalTitle}>Dados principais</div>
              <div style={hubStyles.modalRow}>
                <Badge cor="neutral">{openPlan.status}</Badge>
                <span style={hubStyles.muted}>Cidade: {openPlan.cityId}</span>
                <span style={hubStyles.muted}>Custo total: {moeda(Number(openPlan.cost || 0))}</span>
              </div>
              {Number(openPlan.taskBudgetTotal || 0) > 0 && (
                <div style={hubStyles.muted}>Custo de etapas: {moeda(Number(openPlan.taskBudgetTotal || 0))}</div>
              )}
              <div style={hubStyles.actions}>
                <Btn variant="danger" onClick={handleDeleteAction}>Excluir acao</Btn>
              </div>
            </div>

            <div style={hubStyles.modalSection}>
              <div style={hubStyles.modalTitle}>Adicionar tarefa</div>
              {openPlan.status === 'Finalizada' && (
                <InfoBox type="warning">Acao finalizada. Para inserir novas etapas, volte para "Em Andamento".</InfoBox>
              )}
              <div style={hubStyles.formGrid}>
                <Input label="Titulo" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} disabled={openPlan.status === 'Finalizada'} />
                <Input type="date" label="Prazo" value={taskForm.deadline} onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })} disabled={openPlan.status === 'Finalizada'} />
                <Input type="number" label="Orcamento da etapa (R$)" value={taskForm.budget} onChange={(e) => setTaskForm({ ...taskForm, budget: e.target.value })} disabled={openPlan.status === 'Finalizada'} />
                <Select
                  label="Medir resultados?"
                  value={taskForm.kpiEnabled}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTaskForm({
                      ...taskForm,
                      kpiEnabled: value,
                      ...(value === 'no' ? { kpiSelection: '', kpiName: '', kpiCategory: KPI_CATEGORIES[0] } : {}),
                    });
                  }}
                  options={[
                    { value: 'no', label: 'Nao' },
                    { value: 'yes', label: 'Sim' },
                  ]}
                  disabled={openPlan.status === 'Finalizada'}
                />
                {taskForm.kpiEnabled === 'yes' && (
                  <Select
                    label="KPI"
                    value={taskForm.kpiSelection}
                    onChange={(e) => setTaskForm({ ...taskForm, kpiSelection: e.target.value })}
                    options={[
                      { value: '', label: 'Selecione um KPI' },
                      ...kpiOptions,
                      { value: '__new__', label: 'Novo KPI' },
                    ]}
                    disabled={openPlan.status === 'Finalizada'}
                  />
                )}
                {taskForm.kpiEnabled === 'yes' && taskForm.kpiSelection === '__new__' && (
                  <>
                    <Input
                      label="Nome do novo KPI"
                      value={taskForm.kpiName}
                      onChange={(e) => setTaskForm({ ...taskForm, kpiName: e.target.value })}
                      disabled={openPlan.status === 'Finalizada'}
                    />
                    <Select
                      label="Categoria do KPI"
                      value={taskForm.kpiCategory}
                      onChange={(e) => setTaskForm({ ...taskForm, kpiCategory: e.target.value })}
                      options={KPI_CATEGORIES}
                      disabled={openPlan.status === 'Finalizada'}
                    />
                  </>
                )}
                <Select
                  label="Responsavel"
                  value={taskForm.responsibleUid}
                  onChange={(e) => setTaskForm({ ...taskForm, responsibleUid: e.target.value })}
                  options={responsibleOptions}
                  placeholder="Selecione um usuario"
                  disabled={openPlan.status === 'Finalizada'}
                />
                {users.length === 0 && <div style={hubStyles.muted}>Nenhum usuario encontrado.</div>}
              </div>
              <div style={hubStyles.actions}>
                {openPlan.status === 'Finalizada' ? (
                  <Btn variant="secondary" onClick={handleReopenAction}>Reabrir acao</Btn>
                ) : (
                  <Btn onClick={handleAddTask}>Salvar tarefa</Btn>
                )}
              </div>
            </div>

            <div style={hubStyles.modalSection}>
              <div style={hubStyles.modalTitle}>Tarefas da acao</div>
              {tasks.length === 0 && <div style={hubStyles.empty}>Nenhuma tarefa ainda.</div>}
              {tasks.map((t) => (
                <div key={t.id} style={hubStyles.taskRow}>
                  <div>
                    <div style={hubStyles.strong}>{t.title || 'Tarefa'}</div>
                    <div style={hubStyles.muted}>Resp: {t.responsibleName || '---'}</div>
                    {Number(t.budget || 0) > 0 && <div style={hubStyles.muted}>Orcamento: {moeda(Number(t.budget || 0))}</div>}
                    {t.kpiName && <div style={hubStyles.muted}>KPI: {t.kpiName}</div>}
                    {t.kpiResult !== undefined && t.kpiResult !== null && (
                      <div style={hubStyles.muted}>Resultado: {t.kpiResult}</div>
                    )}
                  </div>
                  <div style={hubStyles.actionsInline}>
                    <Badge cor={t.status === 'done' ? 'success' : 'warning'}>{t.status}</Badge>
                    {t.status === 'done' ? (
                      <Btn size="sm" variant="secondary" onClick={() => handleReopenTask(t)}>Reabrir</Btn>
                    ) : (
                      <Btn size="sm" onClick={() => handleOpenFinishTask(t)}>Finalizar</Btn>
                    )}
                    <Btn size="sm" variant="danger" onClick={() => handleDeleteTask(t.id)}>Excluir</Btn>
                  </div>
                </div>
              ))}
            </div>

            <div style={hubStyles.modalSection}>
              <div style={hubStyles.modalTitle}>Linha do tempo</div>
              <Timeline events={timelineEvents} />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!finishTask}
        onClose={() => { setFinishTask(null); setFinishReport(''); setFinishKpiResult(''); }}
        title={finishTask ? `Finalizar etapa: ${finishTask.title || 'Sem titulo'}` : 'Finalizar etapa'}
        size="lg"
      >
        <div style={hubStyles.modal}>
          <div style={hubStyles.modalSection}>
            <div style={hubStyles.modalTitle}>Relatorio da etapa</div>
            <Textarea
              label="Relatorio (opcional)"
              value={finishReport}
              onChange={(e) => setFinishReport(e.target.value)}
              placeholder="Descreva o que foi feito e os resultados."
            />
          </div>
          {finishTask?.kpiEnabled && (
            <div style={hubStyles.modalSection}>
              <div style={hubStyles.modalTitle}>Resultado do KPI</div>
              <Input
                type="number"
                label={finishTask.kpiName ? `KPI: ${finishTask.kpiName}` : 'Resultado'}
                value={finishKpiResult}
                onChange={(e) => setFinishKpiResult(e.target.value)}
                placeholder="Informe o resultado do KPI"
              />
            </div>
          )}
          <div style={hubStyles.actions}>
            <Btn variant="secondary" onClick={() => { setFinishTask(null); setFinishReport(''); setFinishKpiResult(''); }}>Cancelar</Btn>
            <Btn onClick={handleConfirmFinishTask}>Finalizar etapa</Btn>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!finalizePlan}
        onClose={() => { setFinalizePlan(null); setFinalizeReport(''); }}
        title={finalizePlan ? `Finalizar acao: ${finalizePlan.name}` : 'Finalizar acao'}
        size="lg"
      >
        <div style={hubStyles.modal}>
          <div style={hubStyles.modalSection}>
            <div style={hubStyles.modalTitle}>Relatorio (opcional)</div>
            <Textarea
              label="Relatorio"
              value={finalizeReport}
              onChange={(e) => setFinalizeReport(e.target.value)}
              placeholder="Descreva o que foi feito, resultados e observacoes."
            />
          </div>
          <div style={hubStyles.actions}>
            <Btn variant="secondary" onClick={() => { setFinalizePlan(null); setFinalizeReport(''); }}>Cancelar</Btn>
            <Btn onClick={handleConfirmFinalize}>Finalizar acao</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}