import React, { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  CalendarClock,
  ClipboardCheck,
  Filter,
  Plus,
  Save,
  Target,
  TrendingUp,
} from 'lucide-react';
import { db } from '../../firebase';
import { Badge, Btn, Card, Modal, colors } from '../../components/ui';
import { styles as global } from '../../styles/globalStyles';

const PLAN_STATUS = [
  { value: 'planejamento', label: 'Planejamento', color: 'warning' },
  { value: 'em_andamento', label: 'Em andamento', color: 'primary' },
  { value: 'concluido', label: 'Concluido', color: 'success' },
  { value: 'cancelado', label: 'Cancelado', color: 'danger' },
];

const PRIORITY_OPTIONS = [
  { value: 'alta', label: 'Alta', color: colors.danger },
  { value: 'media', label: 'Media', color: colors.warning },
  { value: 'baixa', label: 'Baixa', color: colors.success },
];

const DEFAULT_FORM = {
  title: '',
  cityId: '',
  surveyId: '',
  themeId: '',
  responsibleUid: '',
  status: 'planejamento',
  priority: 'media',
  dueDate: '',
  hypothesis: '',
  actionDescription: '',
  channelStrategy: '',
  partnershipStrategy: '',
  expectedImpact: '',
  measurementKpi: '',
  notes: '',
};

const getCityLabel = (city) => city?.name || city?.nome || city?.id || 'Cidade';
const getStatusMeta = (status) => PLAN_STATUS.find((item) => item.value === status) || PLAN_STATUS[0];
const getPriorityMeta = (priority) => PRIORITY_OPTIONS.find((item) => item.value === priority) || PRIORITY_OPTIONS[1];

export default function PlanoAcao({ userData }) {
  const [plans, setPlans] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [cities, setCities] = useState([]);
  const [themes, setThemes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [filters, setFilters] = useState({
    cityId: 'all',
    surveyId: 'all',
    themeId: 'all',
    status: 'all',
  });

  useEffect(() => {
    const loadSupport = async () => {
      try {
        const [surveySnap, citySnap, themeSnap, usersSnap] = await Promise.all([
          getDocs(collection(db, 'surveys')),
          getDocs(collection(db, 'cities')),
          getDocs(collection(db, 'survey_themes')),
          getDocs(collection(db, 'users')),
        ]);

        setSurveys(surveySnap.docs.map((item) => ({ id: item.id, ...item.data() })));
        setCities(citySnap.docs.map((item) => ({ id: item.id, ...item.data() })));
        setThemes(themeSnap.docs.map((item) => ({ id: item.id, ...item.data() })));
        setUsers(usersSnap.docs.map((item) => ({ id: item.id, ...item.data() })));
      } catch (error) {
        window.showToast?.(error.message, 'error');
      }
    };

    const unsubscribe = onSnapshot(
      collection(db, 'insights_action_plans'),
      (snapshot) => {
        const list = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort((a, b) => (b.updatedAt?.seconds || b.createdAt?.seconds || 0) - (a.updatedAt?.seconds || a.createdAt?.seconds || 0));
        setPlans(list);
        setLoading(false);
      },
      () => setLoading(false),
    );

    loadSupport();
    return () => unsubscribe();
  }, []);

  const surveyMap = useMemo(
    () => Object.fromEntries(surveys.map((survey) => [survey.id, survey])),
    [surveys],
  );

  const cityMap = useMemo(
    () => Object.fromEntries(cities.map((city) => [city.id, city])),
    [cities],
  );

  const themeMap = useMemo(
    () => Object.fromEntries(themes.map((theme) => [theme.id, theme])),
    [themes],
  );

  const userMap = useMemo(
    () => Object.fromEntries(users.map((user) => [user.id, user])),
    [users],
  );

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      if (filters.cityId !== 'all' && plan.cityId !== filters.cityId) return false;
      if (filters.surveyId !== 'all' && plan.surveyId !== filters.surveyId) return false;
      if (filters.themeId !== 'all' && plan.themeId !== filters.themeId) return false;
      if (filters.status !== 'all' && plan.status !== filters.status) return false;
      return true;
    });
  }, [filters, plans]);

  const kpis = useMemo(
    () => ({
      total: filteredPlans.length,
      planejamento: filteredPlans.filter((plan) => plan.status === 'planejamento').length,
      andamento: filteredPlans.filter((plan) => plan.status === 'em_andamento').length,
      concluidos: filteredPlans.filter((plan) => plan.status === 'concluido').length,
    }),
    [filteredPlans],
  );

  const selectedSurvey = surveyMap[form.surveyId];
  const availableThemes = useMemo(() => {
    if (!selectedSurvey?.themeIds?.length) return themes.filter((theme) => theme.status !== 'inactive');
    return themes.filter((theme) => selectedSurvey.themeIds.includes(theme.id));
  }, [selectedSurvey, themes]);

  const inputStyle = {
    padding: '10px 12px',
    borderRadius: '9px',
    border: '1px solid var(--border)',
    outline: 'none',
    fontSize: '13px',
    color: 'var(--text-main)',
    background: 'var(--bg-app)',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  const labelStyle = {
    fontSize: '11px',
    fontWeight: '900',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '6px',
    display: 'block',
  };

  const openNew = () => {
    setEditId(null);
    setForm(DEFAULT_FORM);
    setModalOpen(true);
  };

  const openEdit = (plan) => {
    setEditId(plan.id);
    setForm({
      title: plan.title || '',
      cityId: plan.cityId || '',
      surveyId: plan.surveyId || '',
      themeId: plan.themeId || '',
      responsibleUid: plan.responsibleUid || '',
      status: plan.status || 'planejamento',
      priority: plan.priority || 'media',
      dueDate: plan.dueDate || '',
      hypothesis: plan.hypothesis || '',
      actionDescription: plan.actionDescription || '',
      channelStrategy: plan.channelStrategy || '',
      partnershipStrategy: plan.partnershipStrategy || '',
      expectedImpact: plan.expectedImpact || '',
      measurementKpi: plan.measurementKpi || '',
      notes: plan.notes || '',
    });
    setModalOpen(true);
  };

  const buildPayload = () => {
    const city = cityMap[form.cityId];
    const survey = surveyMap[form.surveyId];
    const theme = themeMap[form.themeId];
    const responsible = userMap[form.responsibleUid];

    return {
      title: form.title.trim(),
      cityId: form.cityId,
      cityName: getCityLabel(city),
      surveyId: form.surveyId,
      surveyTitle: survey?.title || '',
      surveyObjective: survey?.objective || '',
      surveyTrigger: survey?.trigger || '',
      surveyTriggerLabel: survey?.triggerLabel || '',
      themeId: form.themeId,
      themeName: theme?.name || '',
      responsibleUid: form.responsibleUid || null,
      responsibleName: responsible?.name || responsible?.nome || '',
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate || '',
      hypothesis: form.hypothesis.trim(),
      actionDescription: form.actionDescription.trim(),
      channelStrategy: form.channelStrategy.trim(),
      partnershipStrategy: form.partnershipStrategy.trim(),
      expectedImpact: form.expectedImpact.trim(),
      measurementKpi: form.measurementKpi.trim(),
      notes: form.notes.trim(),
      sourceModule: 'oquei_insights',
      referenceMonth: (form.dueDate || new Date().toISOString().slice(0, 10)).slice(0, 7),
    };
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.cityId || !form.surveyId || !form.themeId) {
      window.showToast?.('Preencha titulo, cidade, campanha e tema.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      if (editId) {
        await updateDoc(doc(db, 'insights_action_plans', editId), {
          ...payload,
          updatedAt: serverTimestamp(),
          updatedBy: userData?.uid || null,
        });
        window.showToast?.('Plano atualizado.', 'success');
      } else {
        await addDoc(collection(db, 'insights_action_plans'), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: userData?.uid || null,
        });
        window.showToast?.('Plano criado.', 'success');
      }
      setModalOpen(false);
      setEditId(null);
      setForm(DEFAULT_FORM);
    } catch (error) {
      window.showToast?.(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const updatePlanStatus = async (plan, status) => {
    await updateDoc(doc(db, 'insights_action_plans', plan.id), {
      status,
      updatedAt: serverTimestamp(),
      updatedBy: userData?.uid || null,
    });
  };

  return (
    <div style={{ ...global.container }}>
      <div style={{ background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-panel) 100%)', border: '1px solid var(--border)', borderRadius: '20px', padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: `linear-gradient(135deg, ${colors.success}, ${colors.primary})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 18px ${colors.success}44` }}>
            <Target size={24} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '21px', fontWeight: '900', color: 'var(--text-main)' }}>Plano de Acao</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Transforme achados do Oquei Insights em iniciativas com dono, prazo e objetivo
            </div>
          </div>
        </div>
        <Btn onClick={openNew} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={15} />
          Nova Acao
        </Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        {[
          { key: 'total', label: 'Total', value: kpis.total, color: colors.primary, icon: ClipboardCheck },
          { key: 'planejamento', label: 'Planejamento', value: kpis.planejamento, color: colors.warning, icon: CalendarClock },
          { key: 'andamento', label: 'Em andamento', value: kpis.andamento, color: colors.info, icon: TrendingUp },
          { key: 'concluidos', label: 'Concluidos', value: kpis.concluidos, color: colors.success, icon: Target },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.key} accent={item.color}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{item.label}</div>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: item.color, marginTop: '6px' }}>{item.value}</div>
                </div>
                <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: `${item.color}16`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} color={item.color} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Cidade</label>
            <select style={inputStyle} value={filters.cityId} onChange={(event) => setFilters((current) => ({ ...current, cityId: event.target.value }))}>
              <option value="all">Todas</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {getCityLabel(city)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Campanha</label>
            <select style={inputStyle} value={filters.surveyId} onChange={(event) => setFilters((current) => ({ ...current, surveyId: event.target.value }))}>
              <option value="all">Todas</option>
              {surveys.map((survey) => (
                <option key={survey.id} value={survey.id}>
                  {survey.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Tema</label>
            <select style={inputStyle} value={filters.themeId} onChange={(event) => setFilters((current) => ({ ...current, themeId: event.target.value }))}>
              <option value="all">Todos</option>
              {themes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="all">Todos</option>
              {PLAN_STATUS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700' }}>
            <Filter size={14} />
            {filteredPlans.length} plano(s)
          </div>
        </div>
      </Card>

      {loading ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando planos...</div>
        </Card>
      ) : filteredPlans.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '42px', color: 'var(--text-muted)' }}>
            <Target size={40} style={{ opacity: 0.2, marginBottom: '12px' }} />
            <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-main)', marginBottom: '6px' }}>Nenhuma acao registrada</div>
            <div style={{ fontSize: '13px', marginBottom: '18px' }}>Crie o primeiro plano conectado a cidade, campanha e tema.</div>
            <Btn onClick={openNew}>
              <Plus size={14} />
              Criar acao
            </Btn>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
          {filteredPlans.map((plan) => {
            const status = getStatusMeta(plan.status);
            const priority = getPriorityMeta(plan.priority);
            return (
              <Card key={plan.id} accent={priority.color}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)' }}>{plan.title}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                        <Badge cor={status.color}>{status.label}</Badge>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: priority.color, background: `${priority.color}12`, padding: '4px 8px', borderRadius: '999px' }}>
                          Prioridade {priority.label}
                        </span>
                      </div>
                    </div>
                    <Btn variant="secondary" size="sm" onClick={() => openEdit(plan)}>
                      Editar
                    </Btn>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <div><strong style={{ color: 'var(--text-main)' }}>Cidade:</strong> {plan.cityName || getCityLabel(cityMap[plan.cityId])}</div>
                    <div><strong style={{ color: 'var(--text-main)' }}>Campanha:</strong> {plan.surveyTitle || surveyMap[plan.surveyId]?.title || 'Nao vinculada'}</div>
                    <div><strong style={{ color: 'var(--text-main)' }}>Tema:</strong> {plan.themeName || themeMap[plan.themeId]?.name || 'Nao vinculado'}</div>
                    {plan.responsibleName && <div><strong style={{ color: 'var(--text-main)' }}>Responsavel:</strong> {plan.responsibleName}</div>}
                    {plan.dueDate && <div><strong style={{ color: 'var(--text-main)' }}>Prazo:</strong> {new Date(`${plan.dueDate}T12:00:00`).toLocaleDateString('pt-BR')}</div>}
                  </div>

                  {plan.hypothesis && (
                    <div style={{ padding: '10px 12px', borderRadius: '12px', background: `${colors.warning}08`, border: `1px solid ${colors.warning}20` }}>
                      <div style={{ fontSize: '10px', fontWeight: '900', color: colors.warning, textTransform: 'uppercase', marginBottom: '4px' }}>Hipotese</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.5 }}>{plan.hypothesis}</div>
                    </div>
                  )}

                  {plan.actionDescription && (
                    <div style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.55 }}>
                      {plan.actionDescription}
                    </div>
                  )}

                  {(plan.expectedImpact || plan.measurementKpi) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ padding: '10px 12px', borderRadius: '12px', background: `${colors.info}08`, border: `1px solid ${colors.info}20` }}>
                        <div style={{ fontSize: '10px', fontWeight: '900', color: colors.info, textTransform: 'uppercase', marginBottom: '4px' }}>Impacto esperado</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.45 }}>{plan.expectedImpact || 'Nao informado'}</div>
                      </div>
                      <div style={{ padding: '10px 12px', borderRadius: '12px', background: `${colors.primary}08`, border: `1px solid ${colors.primary}20` }}>
                        <div style={{ fontSize: '10px', fontWeight: '900', color: colors.primary, textTransform: 'uppercase', marginBottom: '4px' }}>KPI de acompanhamento</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.45 }}>{plan.measurementKpi || 'Nao informado'}</div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {plan.status === 'planejamento' && (
                      <Btn size="sm" onClick={() => updatePlanStatus(plan, 'em_andamento')}>
                        Iniciar
                      </Btn>
                    )}
                    {plan.status !== 'concluido' && plan.status !== 'cancelado' && (
                      <Btn variant="success" size="sm" onClick={() => updatePlanStatus(plan, 'concluido')}>
                        Concluir
                      </Btn>
                    )}
                    {plan.status !== 'cancelado' && (
                      <Btn variant="secondary" size="sm" onClick={() => updatePlanStatus(plan, 'cancelado')}>
                        Cancelar
                      </Btn>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Editar plano de acao' : 'Novo plano de acao'}
        size="lg"
        footer={
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
            <Btn variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Btn>
            <Btn loading={saving} onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Save size={14} />
              {editId ? 'Salvar' : 'Criar plano'}
            </Btn>
          </div>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Titulo da acao *</label>
              <input style={inputStyle} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ex: Acao comercial em radios locais" />
            </div>

            <div>
              <label style={labelStyle}>Cidade *</label>
              <select style={inputStyle} value={form.cityId} onChange={(event) => setForm((current) => ({ ...current, cityId: event.target.value }))}>
                <option value="">Selecione</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {getCityLabel(city)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Campanha vinculada *</label>
              <select
                style={inputStyle}
                value={form.surveyId}
                onChange={(event) => {
                  const survey = surveyMap[event.target.value];
                  const surveyThemeIds = survey?.themeIds || [];
                  setForm((current) => ({
                    ...current,
                    surveyId: event.target.value,
                    themeId: surveyThemeIds.includes(current.themeId) ? current.themeId : surveyThemeIds[0] || '',
                  }));
                }}
              >
                <option value="">Selecione</option>
                {surveys.map((survey) => (
                  <option key={survey.id} value={survey.id}>
                    {survey.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Tema associado *</label>
              <select style={inputStyle} value={form.themeId} onChange={(event) => setForm((current) => ({ ...current, themeId: event.target.value }))}>
                <option value="">Selecione</option>
                {availableThemes.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Status</label>
                <select style={inputStyle} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                  {PLAN_STATUS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Prioridade</label>
                <select style={inputStyle} value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}>
                  {PRIORITY_OPTIONS.map((priority) => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Responsavel</label>
                <select style={inputStyle} value={form.responsibleUid} onChange={(event) => setForm((current) => ({ ...current, responsibleUid: event.target.value }))}>
                  <option value="">Nao definido</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.nome || user.email || user.id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Prazo</label>
                <input type="date" style={inputStyle} value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Hipotese de acao</label>
              <textarea style={{ ...inputStyle, minHeight: '82px', resize: 'vertical' }} value={form.hypothesis} onChange={(event) => setForm((current) => ({ ...current, hypothesis: event.target.value }))} placeholder="Qual leitura da pesquisa justifica esta iniciativa?" />
            </div>

            <div>
              <label style={labelStyle}>Descricao da acao</label>
              <textarea style={{ ...inputStyle, minHeight: '92px', resize: 'vertical' }} value={form.actionDescription} onChange={(event) => setForm((current) => ({ ...current, actionDescription: event.target.value }))} placeholder="O que precisa ser executado na pratica?" />
            </div>

            <div>
              <label style={labelStyle}>Estrategia de canais</label>
              <textarea style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }} value={form.channelStrategy} onChange={(event) => setForm((current) => ({ ...current, channelStrategy: event.target.value }))} placeholder="Meios de comunicacao ou ativacao comercial sugeridos" />
            </div>

            <div>
              <label style={labelStyle}>Parcerias ou patrocionios</label>
              <textarea style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }} value={form.partnershipStrategy} onChange={(event) => setForm((current) => ({ ...current, partnershipStrategy: event.target.value }))} placeholder="Parcerias, eventos ou patrocinadores relevantes" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Impacto esperado</label>
                <textarea style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }} value={form.expectedImpact} onChange={(event) => setForm((current) => ({ ...current, expectedImpact: event.target.value }))} placeholder="Resultado esperado" />
              </div>
              <div>
                <label style={labelStyle}>KPI de acompanhamento</label>
                <textarea style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }} value={form.measurementKpi} onChange={(event) => setForm((current) => ({ ...current, measurementKpi: event.target.value }))} placeholder="Indicador de sucesso" />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Notas adicionais</label>
              <textarea style={{ ...inputStyle, minHeight: '82px', resize: 'vertical' }} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Dependencias, riscos ou alinhamentos necessarios" />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
