import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { CalendarDays, CheckCircle2, Clock3, FilePlus2, XCircle } from 'lucide-react';

import {
  Badge,
  Btn,
  Card,
  Empty,
  InfoBox,
  Input,
  Modal,
  Page,
  Select,
  Spinner,
  Tabs,
  Textarea,
  colors,
  styles as uiStyles,
} from '../../components/ui';
import { db } from '../../firebase';
import { getDatesInRange } from '../../lib/operationsCalendar';
import { ROLE_KEYS, normalizeRole } from '../../lib/roleUtils';
import {
  approveAbsenceRequest,
  deleteOfficialAbsence,
  listAbsenceRequestsForScope,
  listAbsencesForScope,
  rejectAbsenceRequest,
  saveOfficialAbsence,
  updateAbsenceCoverage,
  upsertShiftAssignment,
} from '../../services/absenceRequests';
import { reindexAbsenceCalendar } from '../../services/absenceCalendar';
import { loadOperationalCalendar } from '../../services/operationsCalendar';

const TABS = ['Solicitações', 'Cobertura', 'Calendário da Loja', 'Férias'];
const ABSENCE_TYPES = [{ value: 'falta', label: 'Falta programada' }, { value: 'atestado', label: 'Atestado' }];
const today = () => new Date().toISOString().slice(0, 10);
const monthNow = () => new Date().toISOString().slice(0, 7);
const formatDate = (value) => (value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : 'Sem data');
const baseAbsenceForm = () => ({ type: 'falta', storeId: '', attendantId: '', startDate: today(), endDate: today(), isFullDay: true, startTime: '', endTime: '', reason: '', obs: '' });
const baseVacationForm = () => ({ storeId: '', attendantId: '', startDate: today(), endDate: today(), obs: '' });
const baseShiftForm = () => ({ storeId: '', attendantId: '', date: today(), shiftLabel: 'Escala comercial', startTime: '08:00', endTime: '18:00' });
const baseHolidayForm = () => ({ storeId: '', date: today(), name: '', type: 'municipal' });

function DayBox({ day }) {
  const status = day.coverageStatus === 'closed' ? 'danger' : day.coverageStatus === 'covered' ? 'success' : day.coverageStatus === 'pending' ? 'warning' : day.isWorkingDay ? 'info' : 'neutral';
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '10px', background: day.isClosedStore ? 'rgba(239,68,68,0.08)' : 'var(--bg-app)', display: 'grid', gap: '6px' }}>
      <div style={{ ...uiStyles.rowBetween, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 900, color: 'var(--text-main)' }}>{new Date(`${day.date}T12:00:00`).getDate()}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(`${day.date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' })}</div>
        </div>
        <Badge cor={status}>{day.coverageStatus === 'closed' ? 'Fechada' : day.coverageStatus === 'covered' ? 'Coberta' : day.coverageStatus === 'pending' ? 'Pendente' : day.isWorkingDay ? 'Útil' : 'Não útil'}</Badge>
      </div>
      {!!day.holidays.length && <div style={{ fontSize: '11px' }}><strong>Feriado:</strong> {day.holidays.map((item) => item.name).join(', ')}</div>}
      {!!day.shifts.length && <div style={{ fontSize: '11px' }}><strong>Escalas:</strong> {day.shifts.length}</div>}
      {!!day.absences.length && <div style={{ fontSize: '11px' }}><strong>Ausências:</strong> {day.absences.length}</div>}
      {!!day.events.length && <div style={{ fontSize: '11px' }}><strong>Eventos:</strong> {day.events.length}</div>}
      {!day.holidays.length && !day.shifts.length && !day.absences.length && !day.events.length && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sem marcações.</div>}
    </div>
  );
}

export default function FaltasSupervisor({ userData }) {
  const [activeTab, setActiveTab] = useState('Solicitações');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [stores, setStores] = useState([]);
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [calendarRows, setCalendarRows] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState('all');
  const [selectedStore, setSelectedStore] = useState('all');
  const [monthKey, setMonthKey] = useState(monthNow());
  const [absenceForm, setAbsenceForm] = useState(baseAbsenceForm());
  const [vacationForm, setVacationForm] = useState(baseVacationForm());
  const [shiftForm, setShiftForm] = useState(baseShiftForm());
  const [holidayForm, setHolidayForm] = useState(baseHolidayForm());
  const [decision, setDecision] = useState({ open: false, item: null, action: 'approve', reason: '' });

  const role = normalizeRole(userData?.role);
  const isCoordinator = role === ROLE_KEYS.COORDINATOR;
  const actor = useMemo(() => ({ uid: userData?.uid || '', name: userData?.name || 'Gestor', clusterId: userData?.clusterId || '' }), [userData]);
  const clusterOptions = useMemo(() => [...new Set(stores.map((item) => item.clusterId).filter(Boolean))].sort(), [stores]);
  const visibleStores = useMemo(() => selectedCluster === 'all' ? stores : stores.filter((item) => item.clusterId === selectedCluster), [stores, selectedCluster]);
  const coverageCandidates = useMemo(() => users.filter((item) => ['backoffice', 'floater'].includes(item.operationRole)), [users]);
  const candidatesMap = useMemo(() => new Map(coverageCandidates.map((item) => [item.id, item])), [coverageCandidates]);
  const pendingRequests = useMemo(() => requests.filter((item) => item.status === 'Pendente'), [requests]);
  const activeAbsences = useMemo(() => absences.filter((item) => item.type !== 'ferias' && item.status !== 'Rejeitado'), [absences]);
  const vacations = useMemo(() => absences.filter((item) => item.type === 'ferias'), [absences]);

  const resolveStore = (id) => stores.find((item) => item.id === id);
  const resolveUser = (id) => users.find((item) => item.id === id);
  const attendantsByStore = (storeId) => users.filter((item) => item.cityId === storeId);

  const loadModule = async () => {
    setLoading(true);
    try {
      const storesSnap = await getDocs(isCoordinator || !userData?.clusterId ? query(collection(db, 'cities')) : query(collection(db, 'cities'), where('clusterId', '==', userData.clusterId)));
      const usersSnap = await getDocs(query(collection(db, 'users')));
      const scopedUsers = usersSnap.docs.map((item) => ({ id: item.id, ...item.data() })).filter((item) => normalizeRole(item.role) === ROLE_KEYS.ATTENDANT).filter((item) => isCoordinator || item.clusterId === userData?.clusterId);
      const [requestItems, absenceItems] = await Promise.all([
        listAbsenceRequestsForScope(userData, { includeHistory: true }),
        listAbsencesForScope(userData, { includePast: true }),
      ]);
      setStores(storesSnap.docs.map((item) => ({ id: item.id, ...item.data() })));
      setUsers(scopedUsers);
      setRequests(requestItems);
      setAbsences(absenceItems);
    } catch (error) {
      console.error(error);
      window.showToast?.('Não foi possível carregar faltas e escala.', 'error');
    }
    setLoading(false);
  };

  const loadCalendar = async () => {
    try {
      setCalendarRows(await loadOperationalCalendar({ userData, monthKey, selectedCluster, selectedStore }));
    } catch (error) {
      console.error(error);
      setCalendarRows([]);
      window.showToast?.('Não foi possível carregar o calendário operacional.', 'error');
    }
  };

  useEffect(() => { loadModule(); }, [userData?.uid, userData?.clusterId, userData?.role]);
  useEffect(() => { if (!loading) loadCalendar(); }, [loading, monthKey, selectedCluster, selectedStore, userData?.uid, userData?.clusterId, userData?.role]);

  const saveDecision = async () => {
    if (decision.action === 'reject' && !decision.reason.trim()) return window.showToast?.('Informe o motivo da rejeição.', 'error');
    setSaving(true);
    try {
      if (decision.action === 'approve') {
        await approveAbsenceRequest(decision.item, actor, { decisionReason: decision.reason });
        setActiveTab('Cobertura');
      } else {
        await rejectAbsenceRequest(decision.item.id, actor, decision.reason);
      }
      setDecision({ open: false, item: null, action: 'approve', reason: '' });
      window.showToast?.('Decisão registrada.', 'success');
      await loadModule();
    } catch (error) {
      console.error(error);
      window.showToast?.('Não foi possível registrar a decisão.', 'error');
    }
    setSaving(false);
  };

  const saveManualAbsence = async (event) => {
    event.preventDefault();
    const store = resolveStore(absenceForm.storeId);
    const attendant = resolveUser(absenceForm.attendantId);
    if (!store || !attendant) return window.showToast?.('Selecione loja e atendente.', 'error');
    setSaving(true);
    try {
      await saveOfficialAbsence({ type: absenceForm.type, storeId: store.id, storeName: store.name || store.cityName || store.id, cityName: store.name || store.cityName || store.id, clusterId: store.clusterId || userData?.clusterId || '', attendantId: attendant.id, attendantName: attendant.name, employeeName: attendant.name, startDate: absenceForm.startDate, endDate: absenceForm.endDate, isFullDay: absenceForm.isFullDay, startTime: absenceForm.isFullDay ? '' : absenceForm.startTime, endTime: absenceForm.isFullDay ? '' : absenceForm.endTime, reason: absenceForm.reason || absenceForm.type, obs: absenceForm.obs, coverageMap: {}, supervisorUid: actor.uid }, actor);
      setAbsenceForm(baseAbsenceForm());
      window.showToast?.('Ausência registrada.', 'success');
      await loadModule();
    } catch (error) {
      console.error(error);
      window.showToast?.('Não foi possível registrar a ausência.', 'error');
    }
    setSaving(false);
  };

  const saveVacation = async (event) => {
    event.preventDefault();
    const store = resolveStore(vacationForm.storeId);
    const attendant = resolveUser(vacationForm.attendantId);
    if (!store || !attendant) return window.showToast?.('Selecione loja e atendente.', 'error');
    setSaving(true);
    try {
      await saveOfficialAbsence({ type: 'ferias', status: 'Programada', storeId: store.id, storeName: store.name || store.cityName || store.id, cityName: store.name || store.cityName || store.id, clusterId: store.clusterId || userData?.clusterId || '', attendantId: attendant.id, attendantName: attendant.name, employeeName: attendant.name, startDate: vacationForm.startDate, endDate: vacationForm.endDate, isFullDay: true, reason: 'Férias', obs: vacationForm.obs, coverageMap: {}, supervisorUid: actor.uid }, actor);
      setVacationForm(baseVacationForm());
      window.showToast?.('Férias programadas.', 'success');
      await loadModule();
    } catch (error) {
      console.error(error);
      window.showToast?.('Não foi possível programar as férias.', 'error');
    }
    setSaving(false);
  };

  const saveShift = async (event) => {
    event.preventDefault();
    const store = resolveStore(shiftForm.storeId);
    const attendant = resolveUser(shiftForm.attendantId);
    if (!store || !attendant) return window.showToast?.('Selecione loja e atendente para a escala.', 'error');
    setSaving(true);
    try {
      await upsertShiftAssignment({ storeId: store.id, storeName: store.name || store.cityName || store.id, clusterId: store.clusterId || userData?.clusterId || '', attendantId: attendant.id, attendantName: attendant.name, date: shiftForm.date, shiftLabel: shiftForm.shiftLabel, startTime: shiftForm.startTime, endTime: shiftForm.endTime, source: 'manual' });
      setShiftForm(baseShiftForm());
      window.showToast?.('Escala salva.', 'success');
      await loadCalendar();
    } catch (error) {
      console.error(error);
      window.showToast?.('Não foi possível salvar a escala.', 'error');
    }
    setSaving(false);
  };

  const saveHoliday = async (event) => {
    event.preventDefault();
    const store = resolveStore(holidayForm.storeId);
    if (!store || !holidayForm.name.trim()) return window.showToast?.('Selecione a loja e nomeie o feriado.', 'error');
    setSaving(true);
    try {
      await addDoc(collection(db, 'holidays'), { storeId: store.id, storeName: store.name || store.cityName || store.id, clusterId: store.clusterId || userData?.clusterId || '', date: holidayForm.date, name: holidayForm.name, type: holidayForm.type, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      setHolidayForm(baseHolidayForm());
      window.showToast?.('Feriado salvo.', 'success');
      await loadCalendar();
    } catch (error) {
      console.error(error);
      window.showToast?.('Não foi possível salvar o feriado.', 'error');
    }
    setSaving(false);
  };

  const reindexMirror = async () => {
    setSyncing(true);
    try {
      const result = await reindexAbsenceCalendar(absences);
      window.showToast?.(`Espelho público reindexado: ${result.syncedAbsences} ausências e ${result.syncedEntries} dias.`, 'success');
    } catch (error) {
      console.error(error);
      window.showToast?.('Não foi possível reindexar a escala pública.', 'error');
    }
    setSyncing(false);
  };

  return (
    <Page title="Faltas e Escala" subtitle="Solicitações, cobertura, calendário operacional e férias sem Cloud Functions." actions={<div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>{isCoordinator && <Select value={selectedCluster} onChange={(event) => setSelectedCluster(event.target.value)} options={[{ value: 'all', label: 'Todos os clusters' }, ...clusterOptions.map((item) => ({ value: item, label: item }))]} />}<Btn variant="secondary" onClick={reindexMirror} loading={syncing}><Clock3 size={16} /> Reindexar espelho</Btn></div>}>
      <div style={uiStyles.grid4}>
        <Card accent={colors.warning} title="Solicitações pendentes"><div style={{ fontSize: '30px', fontWeight: 900 }}>{pendingRequests.length}</div></Card>
        <Card accent={colors.info} title="Coberturas abertas"><div style={{ fontSize: '30px', fontWeight: 900 }}>{activeAbsences.filter((item) => item.coverageStatus !== 'coverage_resolved').length}</div></Card>
        <Card accent={colors.success} title="Férias programadas"><div style={{ fontSize: '30px', fontWeight: 900 }}>{vacations.length}</div></Card>
        <Card accent={colors.primary} title="Coberturas autorizadas"><div style={{ fontSize: '18px', fontWeight: 900 }}>{coverageCandidates.length} backoffice/floater</div></Card>
      </div>

      <InfoBox type="info">A ausência aprovada fica em <strong>absences</strong>, a solicitação do atendente fica em <strong>absence_requests</strong> e o espelho público da rede é sincronizado pelo cliente web.</InfoBox>

      <Card>
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
        <div style={{ marginTop: '20px' }}>
          {loading ? (
            <Spinner centered />
          ) : activeTab === 'Solicitações' ? (
            <div style={{ display: 'grid', gap: '20px' }}>
              <Card title="Pedidos operacionais pendentes" subtitle="A aprovação cria o registro oficial e exige cobertura posterior.">
                {pendingRequests.length ? (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {pendingRequests.map((item) => (
                      <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '14px', background: 'var(--bg-app)', display: 'grid', gap: '10px' }}>
                        <div style={{ ...uiStyles.rowBetween, alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 900, color: 'var(--text-main)' }}>{item.type === 'atestado' ? 'Atestado' : 'Ausência operacional'}</div>
                            <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>{item.attendantName || 'Colaborador'} • {item.storeName || item.storeId || 'Loja'}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(item.startDate)}{item.endDate && item.endDate !== item.startDate ? ` até ${formatDate(item.endDate)}` : ''}</div>
                          </div>
                          <Badge cor="warning">Pendente</Badge>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>{item.justification || 'Sem justificativa.'}</div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <Btn variant="success" onClick={() => setDecision({ open: true, item, action: 'approve', reason: '' })}><CheckCircle2 size={16} /> Aprovar</Btn>
                          <Btn variant="danger" onClick={() => setDecision({ open: true, item, action: 'reject', reason: '' })}><XCircle size={16} /> Rejeitar</Btn>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty icon="OK" title="Sem solicitações pendentes" description="Nenhum pedido operacional aguarda decisão agora." />
                )}
              </Card>

              <Card title="Registro manual de ausência" subtitle="Uso da liderança para lançamentos diretos no fluxo oficial.">
                <form onSubmit={saveManualAbsence} style={uiStyles.form}>
                  <div style={uiStyles.formRow}>
                    <Select label="Tipo" value={absenceForm.type} onChange={(event) => setAbsenceForm((current) => ({ ...current, type: event.target.value }))} options={ABSENCE_TYPES} />
                    <Select label="Loja" value={absenceForm.storeId} onChange={(event) => setAbsenceForm((current) => ({ ...current, storeId: event.target.value, attendantId: '' }))} options={visibleStores.map((item) => ({ value: item.id, label: item.name || item.cityName || item.id }))} placeholder="Selecione" />
                    <Select label="Atendente" value={absenceForm.attendantId} onChange={(event) => setAbsenceForm((current) => ({ ...current, attendantId: event.target.value }))} options={attendantsByStore(absenceForm.storeId).map((item) => ({ value: item.id, label: item.name }))} placeholder="Selecione" />
                  </div>
                  <div style={uiStyles.formRow}>
                    <Input label="Data inicial" type="date" value={absenceForm.startDate} onChange={(event) => setAbsenceForm((current) => ({ ...current, startDate: event.target.value }))} />
                    <Input label="Data final" type="date" min={absenceForm.startDate} value={absenceForm.endDate} onChange={(event) => setAbsenceForm((current) => ({ ...current, endDate: event.target.value }))} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                    <input type="checkbox" checked={absenceForm.isFullDay} onChange={(event) => setAbsenceForm((current) => ({ ...current, isFullDay: event.target.checked }))} />
                    Dia inteiro
                  </label>
                  {!absenceForm.isFullDay && (
                    <div style={uiStyles.formRow}>
                      <Input label="Hora inicial" type="time" value={absenceForm.startTime} onChange={(event) => setAbsenceForm((current) => ({ ...current, startTime: event.target.value }))} />
                      <Input label="Hora final" type="time" value={absenceForm.endTime} onChange={(event) => setAbsenceForm((current) => ({ ...current, endTime: event.target.value }))} />
                    </div>
                  )}
                  <Input label="Motivo" value={absenceForm.reason} onChange={(event) => setAbsenceForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Motivo operacional" />
                  <Textarea label="Observação" value={absenceForm.obs} onChange={(event) => setAbsenceForm((current) => ({ ...current, obs: event.target.value }))} placeholder="Detalhes e contexto." />
                  <Btn type="submit" loading={saving} style={{ alignSelf: 'flex-start' }}><FilePlus2 size={16} /> Registrar ausência</Btn>
                </form>
              </Card>
            </div>
          ) : activeTab === 'Cobertura' ? (
            activeAbsences.length ? (
              <div style={{ display: 'grid', gap: '16px' }}>
                {activeAbsences.map((absence) => (
                  <Card key={absence.id} accent={absence.coverageStatus === 'coverage_resolved' ? colors.success : colors.warning} title={`${absence.attendantName || absence.employeeName || 'Colaborador'} • ${absence.storeName || absence.storeId || 'Loja'}`} subtitle={`${formatDate(absence.startDate)}${absence.endDate && absence.endDate !== absence.startDate ? ` até ${formatDate(absence.endDate)}` : ''}`} actions={<div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}><Badge cor={absence.coverageStatus === 'coverage_resolved' ? 'success' : 'warning'}>{absence.coverageStatus === 'coverage_resolved' ? 'Cobertura resolvida' : 'Cobertura pendente'}</Badge><Btn variant="danger" size="sm" onClick={() => deleteOfficialAbsence(absence.id).then(loadModule)}>Remover</Btn></div>}>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      {getDatesInRange(absence.startDate, absence.endDate).map((date) => (
                        <div key={date} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', background: 'var(--bg-app)', display: 'grid', gap: '8px' }}>
                          <div style={{ ...uiStyles.rowBetween, alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{formatDate(date)}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{absence.isFullDay === false ? `${absence.startTime || '--:--'} às ${absence.endTime || '--:--'}` : 'Cobertura do dia inteiro'}</div>
                            </div>
                            <Badge cor={(absence.coverageMap || {})[date] ? 'success' : 'warning'}>{(absence.coverageMap || {})[date] === 'loja_fechada' ? 'Loja fechada' : candidatesMap.get((absence.coverageMap || {})[date])?.name || 'Pendente'}</Badge>
                          </div>
                          <Select value={(absence.coverageMap || {})[date] || ''} onChange={(event) => updateAbsenceCoverage(absence, date, event.target.value).then(loadModule)} options={[{ value: '', label: 'Pendente' }, { value: 'loja_fechada', label: 'Loja fechada' }, ...coverageCandidates.map((item) => ({ value: item.id, label: `${item.name} • ${item.operationRole === 'backoffice' ? 'Backoffice' : 'Floater'}` }))]} />
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Empty icon="OK" title="Sem ausências em aberto" description="Nenhuma ausência aprovada precisa de cobertura agora." />
            )
          ) : activeTab === 'Calendário da Loja' ? (
            <div style={{ display: 'grid', gap: '20px' }}>
              <Card title="Filtros e lançamentos operacionais">
                <div style={{ display: 'grid', gap: '20px' }}>
                  <div style={uiStyles.formRow}>
                    <Input label="Mês" type="month" value={monthKey} onChange={(event) => setMonthKey(event.target.value)} />
                    <Select label="Loja" value={selectedStore} onChange={(event) => setSelectedStore(event.target.value)} options={[{ value: 'all', label: 'Todas as lojas do escopo' }, ...visibleStores.map((item) => ({ value: item.id, label: item.name || item.cityName || item.id }))]} />
                  </div>
                  <div style={uiStyles.grid2}>
                    <Card size="sm" title="Escala real do atendente">
                      <form onSubmit={saveShift} style={uiStyles.form}>
                        <Select label="Loja" value={shiftForm.storeId} onChange={(event) => setShiftForm((current) => ({ ...current, storeId: event.target.value, attendantId: '' }))} options={visibleStores.map((item) => ({ value: item.id, label: item.name || item.cityName || item.id }))} placeholder="Selecione" />
                        <Select label="Atendente" value={shiftForm.attendantId} onChange={(event) => setShiftForm((current) => ({ ...current, attendantId: event.target.value }))} options={attendantsByStore(shiftForm.storeId).map((item) => ({ value: item.id, label: item.name }))} placeholder="Selecione" />
                        <Input label="Data" type="date" value={shiftForm.date} onChange={(event) => setShiftForm((current) => ({ ...current, date: event.target.value }))} />
                        <Input label="Etiqueta da escala" value={shiftForm.shiftLabel} onChange={(event) => setShiftForm((current) => ({ ...current, shiftLabel: event.target.value }))} />
                        <div style={uiStyles.formRow}>
                          <Input label="Início" type="time" value={shiftForm.startTime} onChange={(event) => setShiftForm((current) => ({ ...current, startTime: event.target.value }))} />
                          <Input label="Fim" type="time" value={shiftForm.endTime} onChange={(event) => setShiftForm((current) => ({ ...current, endTime: event.target.value }))} />
                        </div>
                        <Btn type="submit" loading={saving} style={{ alignSelf: 'flex-start' }}><CheckCircle2 size={16} /> Salvar escala</Btn>
                      </form>
                    </Card>
                    <Card size="sm" title="Feriado local da loja">
                      <form onSubmit={saveHoliday} style={uiStyles.form}>
                        <Select label="Loja" value={holidayForm.storeId} onChange={(event) => setHolidayForm((current) => ({ ...current, storeId: event.target.value }))} options={visibleStores.map((item) => ({ value: item.id, label: item.name || item.cityName || item.id }))} placeholder="Selecione" />
                        <Input label="Data" type="date" value={holidayForm.date} onChange={(event) => setHolidayForm((current) => ({ ...current, date: event.target.value }))} />
                        <Input label="Nome do feriado" value={holidayForm.name} onChange={(event) => setHolidayForm((current) => ({ ...current, name: event.target.value }))} />
                        <Select label="Tipo" value={holidayForm.type} onChange={(event) => setHolidayForm((current) => ({ ...current, type: event.target.value }))} options={[{ value: 'municipal', label: 'Municipal' }, { value: 'company', label: 'Corporativo' }, { value: 'national', label: 'Nacional' }]} />
                        <Btn type="submit" loading={saving} style={{ alignSelf: 'flex-start' }}><CalendarDays size={16} /> Salvar feriado</Btn>
                      </form>
                    </Card>
                  </div>
                </div>
              </Card>

              {calendarRows.length ? calendarRows.map((row) => (
                <Card key={row.storeId} accent={colors.primary} title={row.storeName} subtitle={`${row.clusterId || 'Sem cluster'} • ${row.workingDaysCount} dias úteis`}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '10px' }}>
                    {row.days.map((day) => <DayBox key={`${row.storeId}_${day.date}`} day={day} />)}
                  </div>
                </Card>
              )) : <Empty icon="CAL" title="Sem calendário para exibir" description="Ajuste o escopo ou cadastre lojas para visualizar o mês." />}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              <Card title="Programar férias" subtitle="Registro oficial em absences com tipo `ferias`.">
                <form onSubmit={saveVacation} style={uiStyles.form}>
                  <div style={uiStyles.formRow}>
                    <Select label="Loja" value={vacationForm.storeId} onChange={(event) => setVacationForm((current) => ({ ...current, storeId: event.target.value, attendantId: '' }))} options={visibleStores.map((item) => ({ value: item.id, label: item.name || item.cityName || item.id }))} placeholder="Selecione" />
                    <Select label="Atendente" value={vacationForm.attendantId} onChange={(event) => setVacationForm((current) => ({ ...current, attendantId: event.target.value }))} options={attendantsByStore(vacationForm.storeId).map((item) => ({ value: item.id, label: item.name }))} placeholder="Selecione" />
                  </div>
                  <div style={uiStyles.formRow}>
                    <Input label="Data inicial" type="date" value={vacationForm.startDate} onChange={(event) => setVacationForm((current) => ({ ...current, startDate: event.target.value }))} />
                    <Input label="Data final" type="date" min={vacationForm.startDate} value={vacationForm.endDate} onChange={(event) => setVacationForm((current) => ({ ...current, endDate: event.target.value }))} />
                  </div>
                  <Textarea label="Observação" value={vacationForm.obs} onChange={(event) => setVacationForm((current) => ({ ...current, obs: event.target.value }))} placeholder="Observações do período." />
                  <Btn type="submit" loading={saving} style={{ alignSelf: 'flex-start' }}><CalendarDays size={16} /> Programar férias</Btn>
                </form>
              </Card>
              <Card title="Férias registradas">
                {vacations.length ? (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {vacations.map((item) => (
                      <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '14px', background: 'var(--bg-app)', display: 'grid', gap: '6px' }}>
                        <div style={{ ...uiStyles.rowBetween, alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 900, color: 'var(--text-main)' }}>{item.attendantName || item.employeeName || 'Colaborador'}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.storeName || item.storeId || 'Loja'} • {formatDate(item.startDate)} até {formatDate(item.endDate)}</div>
                          </div>
                          <Btn variant="danger" size="sm" onClick={() => deleteOfficialAbsence(item.id).then(loadModule)}>Remover</Btn>
                        </div>
                        {item.obs && <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{item.obs}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty icon="FER" title="Nenhuma férias programada" description="Os registros lançados aparecerão aqui." />
                )}
              </Card>
            </div>
          )}
        </div>
      </Card>

      <Modal
        open={decision.open}
        onClose={() => setDecision({ open: false, item: null, action: 'approve', reason: '' })}
        title={decision.action === 'approve' ? 'Aprovar solicitação' : 'Rejeitar solicitação'}
        footer={(
          <>
            <Btn variant="secondary" onClick={() => setDecision({ open: false, item: null, action: 'approve', reason: '' })}>Cancelar</Btn>
            <Btn variant={decision.action === 'approve' ? 'success' : 'danger'} onClick={saveDecision} loading={saving}>
              {decision.action === 'approve' ? 'Aprovar e seguir' : 'Confirmar rejeição'}
            </Btn>
          </>
        )}
      >
        <div style={{ display: 'grid', gap: '14px' }}>
          <InfoBox type={decision.action === 'approve' ? 'success' : 'warning'}>
            {decision.item ? `${decision.item.attendantName || 'Colaborador'} • ${decision.item.storeName || decision.item.storeId || 'Loja'}` : 'Selecione uma solicitação.'}
          </InfoBox>
          <Textarea
            label={decision.action === 'approve' ? 'Observação da decisão (opcional)' : 'Motivo da rejeição'}
            value={decision.reason}
            onChange={(event) => setDecision((current) => ({ ...current, reason: event.target.value }))}
            placeholder={decision.action === 'approve' ? 'Ex.: cobertura será tratada hoje.' : 'Explique o motivo da recusa.'}
            required={decision.action === 'reject'}
          />
        </div>
      </Modal>
    </Page>
  );
}
