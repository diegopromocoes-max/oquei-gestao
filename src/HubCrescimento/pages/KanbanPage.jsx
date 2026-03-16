import React, { useMemo, useState, useEffect } from 'react';
import { Card, Btn, Input, Select, Textarea, Modal, Badge } from '../../components/ui';
import KanbanBoard from '../components/KanbanBoard';
import KanbanColumn from '../components/KanbanColumn';
import PlanCard from '../components/PlanCard';
import { usePlans } from '../hooks/usePlans';
import { createPlan, updatePlanStatus } from '../services/planService';
import { createTask, getTasksByPlan } from '../services/taskService';

const CATEGORY_OPTIONS = ['Marketing', 'Comercial', 'Operacional', 'Relacionamento', 'Outras'];
const FOCUS_OPTIONS = ['Vendas Novas', 'Migracoes/Up-Sell', 'Retencao/Anti-Churn', 'Marca', 'Inadimplencia', 'Outro'];

const COLUMNS = [
  { id: 'Backlog', title: 'Backlog' },
  { id: 'Planejamento', title: 'Planejamento' },
  { id: 'Em Andamento', title: 'Em Andamento' },
  { id: 'Finalizada', title: 'Finalizada' },
  { id: 'Cancelada', title: 'Cancelada' },
];

export default function KanbanPage({ userData, selectedCityId, selectedMonth }) {
  const plans = usePlans(selectedCityId, selectedMonth);
  const [draggedPlan, setDraggedPlan] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    objectives: '',
    category: CATEGORY_OPTIONS[0],
    actionFocus: FOCUS_OPTIONS[0],
    startDate: '',
    endDate: '',
    cost: '',
  });

  const [openPlan, setOpenPlan] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [taskForm, setTaskForm] = useState({ title: '', deadline: '', responsibleName: '', responsibleUid: '' });

  useEffect(() => {
    const load = async () => {
      if (!openPlan) return;
      const list = await getTasksByPlan(openPlan.id);
      setTasks(list);
    };
    load();
  }, [openPlan]);

  const plansByStatus = useMemo(() => {
    const map = {};
    COLUMNS.forEach((c) => { map[c.id] = []; });
    plans.forEach((p) => {
      const key = map[p.status] ? p.status : 'Backlog';
      map[key].push(p);
    });
    return map;
  }, [plans]);

  const handleDragStart = (e, plan) => {
    setDraggedPlan(plan);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e, status) => {
    e.preventDefault();
    if (!draggedPlan || draggedPlan.status === status) return;
    await updatePlanStatus(draggedPlan.id, status, userData);
    setDraggedPlan(null);
  };

  const handleCreatePlan = async () => {
    if (!selectedCityId || selectedCityId === '__all__') {
      window.showToast?.('Selecione uma cidade.', 'error');
      return;
    }
    if (!form.name.trim()) {
      window.showToast?.('Informe um nome para o plano.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const objectives = form.objectives
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);

      await createPlan({
        name: form.name,
        description: form.description,
        objectives,
        category: form.category,
        actionFocus: form.actionFocus,
        startDate: form.startDate,
        endDate: form.endDate,
        cost: Number(form.cost || 0),
        cityId: selectedCityId,
        month: selectedMonth,
        responsibles: [{ name: userData?.name || 'Responsavel', sector: userData?.sector || '' }],
      }, userData);

      setForm({
        name: '', description: '', objectives: '', category: CATEGORY_OPTIONS[0],
        actionFocus: FOCUS_OPTIONS[0], startDate: '', endDate: '', cost: ''
      });

      window.showToast?.('Plano criado.', 'success');
    } catch (err) {
      window.showToast?.('Erro ao criar plano.', 'error');
    }
    setIsSaving(false);
  };

  const handleAddTask = async () => {
    if (!openPlan) return;
    if (!taskForm.title.trim()) {
      window.showToast?.('Informe o titulo da tarefa.', 'error');
      return;
    }

    const responsibleUid = taskForm.responsibleUid || userData?.uid || '';
    const responsibleName = taskForm.responsibleName || userData?.name || 'Responsavel';

    await createTask(openPlan.id, {
      title: taskForm.title,
      deadline: taskForm.deadline || null,
      cityId: openPlan.cityId,
      planName: openPlan.name,
      responsibleUid,
      responsibleName,
    }, userData);

    setTaskForm({ title: '', deadline: '', responsibleName: '', responsibleUid: '' });
    const list = await getTasksByPlan(openPlan.id);
    setTasks(list);
  };

  return (
    <div className="hub-stack">
      <Card title="Novo Plano" subtitle="Crie um plano para iniciar o fluxo">
        <div className="hub-form-grid">
          <Input label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Categoria" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={CATEGORY_OPTIONS} />
          <Select label="Foco" value={form.actionFocus} onChange={(e) => setForm({ ...form, actionFocus: e.target.value })} options={FOCUS_OPTIONS} />
          <Input type="number" label="Custo (R$)" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          <Input type="date" label="Inicio" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          <Input type="date" label="Prazo" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          <Input label="Objetivos (separe por virgula)" value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} />
          <Textarea label="Descricao" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="hub-actions">
          <Btn onClick={handleCreatePlan} loading={isSaving}>Criar Plano</Btn>
        </div>
      </Card>

      <KanbanBoard>
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            title={col.title}
            count={plansByStatus[col.id]?.length || 0}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {(plansByStatus[col.id] || []).map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onDragStart={handleDragStart}
                onClick={() => setOpenPlan(plan)}
              />
            ))}
          </KanbanColumn>
        ))}
      </KanbanBoard>

      <Modal
        open={!!openPlan}
        onClose={() => { setOpenPlan(null); setTasks([]); }}
        title={openPlan ? `Plano: ${openPlan.name}` : 'Plano'}
        size="lg"
      >
        {openPlan && (
          <div className="hub-modal">
            <div className="hub-modal-section">
              <div className="hub-modal-title">Dados principais</div>
              <div className="hub-modal-row">
                <Badge cor="neutral">{openPlan.status}</Badge>
                <span className="hub-muted">Cidade: {openPlan.cityId}</span>
              </div>
            </div>

            <div className="hub-modal-section">
              <div className="hub-modal-title">Adicionar tarefa</div>
              <div className="hub-form-grid">
                <Input label="Titulo" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} />
                <Input type="date" label="Prazo" value={taskForm.deadline} onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })} />
                <Input label="Responsavel (nome)" value={taskForm.responsibleName} onChange={(e) => setTaskForm({ ...taskForm, responsibleName: e.target.value })} />
                <Input label="Responsavel (uid opcional)" value={taskForm.responsibleUid} onChange={(e) => setTaskForm({ ...taskForm, responsibleUid: e.target.value })} />
              </div>
              <div className="hub-actions">
                <Btn onClick={handleAddTask}>Salvar tarefa</Btn>
              </div>
            </div>

            <div className="hub-modal-section">
              <div className="hub-modal-title">Tarefas do plano</div>
              {tasks.length === 0 && <div className="hub-empty">Nenhuma tarefa ainda.</div>}
              {tasks.map((t) => (
                <div key={t.id} className="hub-task-row">
                  <div>
                    <div className="hub-strong">{t.title || 'Tarefa'}</div>
                    <div className="hub-muted">Resp: {t.responsibleName || '---'}</div>
                  </div>
                  <Badge cor={t.status === 'done' ? 'success' : 'warning'}>{t.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
