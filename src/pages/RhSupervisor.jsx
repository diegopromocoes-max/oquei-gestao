import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardPlus,
  FileClock,
  FileSearch,
  ShieldAlert,
  Stethoscope,
  UserCircle2,
  XCircle,
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';

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
} from '../components/ui';
import { db } from '../firebase';
import { ROLE_KEYS, normalizeRole } from '../lib/roleUtils';
import {
  approveAbsenceRequest,
  listAbsenceRequestsForScope,
  rejectAbsenceRequest,
} from '../services/absenceRequests';
import {
  createGeneralRhRequest,
  decideRhRequest,
  listRhRequestsForScope,
} from '../services/atendenteRhService';

const TAB_LABELS = ['Aprovações', 'Histórico', 'Novo Documento'];
const GENERAL_RH_OPTIONS = [
  { value: 'folga', label: 'Folga' },
  { value: 'correcao_ponto', label: 'Correção de ponto' },
  { value: 'outros', label: 'Documento administrativo' },
];

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function createDocumentForm() {
  const today = getToday();
  return {
    targetId: '',
    type: 'outros',
    startDate: today,
    endDate: today,
    allDay: true,
    startTime: '',
    endTime: '',
    description: '',
  };
}

function getStatusColor(status) {
  if (status === 'Aprovado') return 'success';
  if (status === 'Rejeitado') return 'danger';
  return 'warning';
}

function getRequestTitle(item) {
  if (item.kind === 'absence') {
    return item.type === 'atestado' ? 'Atestado' : 'Ausência operacional';
  }
  if (item.type === 'falta_futura') return 'Falta futura';
  if (item.type === 'atestado') return 'Atestado';
  if (item.type === 'folga') return 'Folga';
  if (item.type === 'correcao_ponto') return 'Correção de ponto';
  return 'RH geral';
}

function formatDateRange(item) {
  if (!item.startDate) return 'Sem data';
  const start = new Date(`${item.startDate}T12:00:00`).toLocaleDateString('pt-BR');
  if (!item.endDate || item.endDate === item.startDate) return start;
  const end = new Date(`${item.endDate}T12:00:00`).toLocaleDateString('pt-BR');
  return `${start} até ${end}`;
}

function formatScopeLine(item) {
  const attendant = item.attendantName || item.employeeName || item.targetName || 'Colaborador';
  const store = item.storeName || item.cityName || item.storeId || item.cityId || 'Sem loja';
  return `${attendant} • ${store}`;
}

function RequestBadgeGroup({ item }) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <Badge cor={item.kind === 'absence' ? 'danger' : 'info'}>
        {item.kind === 'absence' ? 'Ausência' : 'RH'}
      </Badge>
      <Badge cor={getStatusColor(item.status)}>{item.status}</Badge>
      {item.coverageStatus && (
        <Badge cor={item.coverageStatus === 'coverage_resolved' ? 'success' : 'warning'}>
          {item.coverageStatus === 'coverage_resolved' ? 'Cobertura resolvida' : 'Cobertura pendente'}
        </Badge>
      )}
    </div>
  );
}

function RequestCard({ item, onApprove, onReject }) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '16px',
        background: 'var(--bg-app)',
        display: 'grid',
        gap: '12px',
      }}
    >
      <div style={{ ...uiStyles.rowBetween, alignItems: 'flex-start' }}>
        <div style={{ display: 'grid', gap: '4px' }}>
          <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-main)' }}>
            {getRequestTitle(item)}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>{formatScopeLine(item)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDateRange(item)}</div>
        </div>
        <RequestBadgeGroup item={item} />
      </div>

      <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
        {item.justification || item.description || 'Sem detalhes adicionais.'}
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <Btn variant="success" onClick={() => onApprove(item)}>
          <CheckCircle2 size={16} /> Aprovar
        </Btn>
        <Btn variant="danger" onClick={() => onReject(item)}>
          <XCircle size={16} /> Rejeitar
        </Btn>
      </div>
    </div>
  );
}

function HistoryCard({ item }) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '16px',
        background: 'var(--bg-app)',
        display: 'grid',
        gap: '10px',
      }}
    >
      <div style={{ ...uiStyles.rowBetween, alignItems: 'flex-start' }}>
        <div style={{ display: 'grid', gap: '4px' }}>
          <div style={{ fontWeight: 900, color: 'var(--text-main)' }}>{getRequestTitle(item)}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-main)' }}>{formatScopeLine(item)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDateRange(item)}</div>
        </div>
        <RequestBadgeGroup item={item} />
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
        {item.justification || item.description || 'Sem detalhes adicionais.'}
      </div>
      {item.decisionReason && (
        <div
          style={{
            borderRadius: '12px',
            padding: '10px 12px',
            background: 'rgba(15,23,42,0.04)',
            fontSize: '12px',
            color: 'var(--text-main)',
          }}
        >
          <strong>Decisão registrada:</strong> {item.decisionReason}
        </div>
      )}
    </div>
  );
}

export default function RhSupervisor({ userData }) {
  const [activeTab, setActiveTab] = useState('Aprovações');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stores, setStores] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [absenceRequests, setAbsenceRequests] = useState([]);
  const [rhRequests, setRhRequests] = useState([]);
  const [documentForm, setDocumentForm] = useState(createDocumentForm());
  const [decisionModal, setDecisionModal] = useState({
    open: false,
    item: null,
    action: 'approve',
    reason: '',
  });

  const actor = useMemo(
    () => ({
      uid: userData?.uid || '',
      name: userData?.name || 'Gestor',
      clusterId: userData?.clusterId || '',
    }),
    [userData],
  );

  const scopeRole = normalizeRole(userData?.role);
  const isCoordinator = scopeRole === ROLE_KEYS.COORDINATOR;

  const loadPage = async () => {
    setLoading(true);
    try {
      const [absenceItems, rhItems] = await Promise.all([
        listAbsenceRequestsForScope(userData, { includeHistory: true }),
        listRhRequestsForScope(userData, { includeHistory: true }),
      ]);

      const storesSnapshot = await getDocs(
        isCoordinator || !userData?.clusterId
          ? query(collection(db, 'cities'))
          : query(collection(db, 'cities'), where('clusterId', '==', userData.clusterId))
      );

      const usersSnapshot = await getDocs(query(collection(db, 'users')));
      const storeItems = storesSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      const employeeItems = usersSnapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .filter((item) => normalizeRole(item.role) === ROLE_KEYS.ATTENDANT)
        .filter((item) => isCoordinator || item.clusterId === userData?.clusterId);

      setAbsenceRequests(absenceItems.map((item) => ({ ...item, kind: 'absence' })));
      setRhRequests(rhItems.map((item) => ({ ...item, kind: 'rh' })));
      setStores(storeItems);
      setEmployees(employeeItems);
    } catch (error) {
      console.error('Erro ao carregar RH do gestor:', error);
      window.showToast?.('Não foi possível carregar a central de RH.', 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPage();
  }, [userData?.uid, userData?.clusterId, userData?.role]);

  const pendingItems = useMemo(
    () => [...absenceRequests, ...rhRequests].filter((item) => item.status === 'Pendente'),
    [absenceRequests, rhRequests],
  );
  const historyItems = useMemo(
    () =>
      [...absenceRequests, ...rhRequests]
        .filter((item) => item.status !== 'Pendente')
        .sort((left, right) => (right.updatedAt?.seconds || right.createdAt?.seconds || 0) - (left.updatedAt?.seconds || left.createdAt?.seconds || 0)),
    [absenceRequests, rhRequests],
  );

  const pendingCounts = {
    absences: pendingItems.filter((item) => item.kind === 'absence').length,
    rh: pendingItems.filter((item) => item.kind === 'rh').length,
  };

  const selectedTarget = employees.find((item) => item.id === documentForm.targetId);

  const openDecision = (item, action) => {
    setDecisionModal({
      open: true,
      item,
      action,
      reason: '',
    });
  };

  const closeDecision = () => {
    setDecisionModal({
      open: false,
      item: null,
      action: 'approve',
      reason: '',
    });
  };

  const handleDecision = async () => {
    const { item, action, reason } = decisionModal;
    if (!item) return;
    if (action === 'reject' && !reason.trim()) {
      window.showToast?.('Informe o motivo da rejeição.', 'error');
      return;
    }

    setSaving(true);
    try {
      if (item.kind === 'absence') {
        if (action === 'approve') {
          await approveAbsenceRequest(item, actor, { decisionReason: reason });
          window.showToast?.(
            'Ausência aprovada. Agora a cobertura deve ser resolvida em Faltas e Escala.',
            'success',
          );
        } else {
          await rejectAbsenceRequest(item.id, actor, reason);
          window.showToast?.('Solicitação de ausência rejeitada.', 'success');
        }
      } else if (action === 'approve') {
        await decideRhRequest(item.id, actor, 'Aprovado', reason);
        window.showToast?.('Solicitação de RH aprovada.', 'success');
      } else {
        await decideRhRequest(item.id, actor, 'Rejeitado', reason);
        window.showToast?.('Solicitação de RH rejeitada.', 'success');
      }

      closeDecision();
      await loadPage();
    } catch (error) {
      console.error('Erro ao decidir solicitação:', error);
      window.showToast?.('Não foi possível concluir a decisão.', 'error');
    }
    setSaving(false);
  };

  const handleCreateDocument = async (event) => {
    event.preventDefault();
    if (!documentForm.targetId) {
      window.showToast?.('Selecione um colaborador.', 'error');
      return;
    }
    if (!documentForm.description.trim()) {
      window.showToast?.('Descreva o documento administrativo.', 'error');
      return;
    }

    setSaving(true);
    try {
      await createGeneralRhRequest({
        type: documentForm.type,
        status: 'Pendente',
        attendantId: selectedTarget?.id || '',
        attendantName: selectedTarget?.name || 'Colaborador',
        targetId: selectedTarget?.id || '',
        targetName: selectedTarget?.name || 'Colaborador',
        storeId: selectedTarget?.cityId || '',
        storeName: selectedTarget?.cityName || selectedTarget?.cityId || '',
        clusterId: selectedTarget?.clusterId || userData?.clusterId || '',
        supervisorUid: actor.uid,
        supervisorName: actor.name,
        startDate: documentForm.startDate,
        endDate: documentForm.endDate || documentForm.startDate,
        allDay: documentForm.allDay,
        startTime: documentForm.allDay ? '' : documentForm.startTime,
        endTime: documentForm.allDay ? '' : documentForm.endTime,
        description: documentForm.description,
        createdByManager: true,
      });

      window.showToast?.('Documento administrativo registrado em RH.', 'success');
      setDocumentForm(createDocumentForm());
      setActiveTab('Histórico');
      await loadPage();
    } catch (error) {
      console.error('Erro ao criar documento de RH:', error);
      window.showToast?.('Não foi possível criar o documento de RH.', 'error');
    }
    setSaving(false);
  };

  return (
    <Page
      title="Central de RH"
      subtitle="Aprovação de ausências operacionais, RH geral e documentos administrativos sem Cloud Functions."
    >
      <div style={uiStyles.grid3}>
        <Card accent={colors.warning} title="Ausências pendentes">
          <div style={{ fontSize: '30px', fontWeight: 900, color: 'var(--text-main)' }}>{pendingCounts.absences}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Pedidos em `absence_requests` aguardando decisão.</div>
        </Card>
        <Card accent={colors.primary} title="RH pendente">
          <div style={{ fontSize: '30px', fontWeight: 900, color: 'var(--text-main)' }}>{pendingCounts.rh}</div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Pedidos administrativos do cluster ou visão global.</div>
        </Card>
        <Card accent={colors.success} title="Escopo">
          <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-main)' }}>
            {isCoordinator ? 'Coordenação Global' : (userData?.clusterId || 'Cluster não informado')}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {isCoordinator ? 'Visualização de todas as lojas e regionais.' : 'Somente documentos do seu cluster.'}
          </div>
        </Card>
      </div>

      <InfoBox type="info">
        Aprovar uma ausência cria ou atualiza o registro oficial em <strong>absences</strong>. A etapa de cobertura continua no painel de <strong>Faltas e Escala</strong>.
      </InfoBox>

      <Card>
        <Tabs tabs={TAB_LABELS} active={activeTab} onChange={setActiveTab} />

        <div style={{ marginTop: '20px' }}>
          {loading ? (
            <Spinner centered />
          ) : activeTab === 'Aprovações' ? (
            pendingItems.length ? (
              <div style={{ display: 'grid', gap: '14px' }}>
                {pendingItems.map((item) => (
                  <RequestCard
                    key={`${item.kind}_${item.id}`}
                    item={item}
                    onApprove={(current) => openDecision(current, 'approve')}
                    onReject={(current) => openDecision(current, 'reject')}
                  />
                ))}
              </div>
            ) : (
              <Empty
                icon="OK"
                title="Nenhuma aprovação pendente"
                description="As filas de ausência operacional e RH geral estão em dia."
              />
            )
          ) : activeTab === 'Histórico' ? (
            historyItems.length ? (
              <div style={{ display: 'grid', gap: '14px' }}>
                {historyItems.map((item) => (
                  <HistoryCard key={`${item.kind}_${item.id}`} item={item} />
                ))}
              </div>
            ) : (
              <Empty
                icon="RH"
                title="Sem histórico consolidado"
                description="As próximas decisões aprovadas ou rejeitadas aparecerão aqui."
              />
            )
          ) : (
            <form onSubmit={handleCreateDocument} style={uiStyles.form}>
              <InfoBox type="warning">
                Este formulário cria um item em <strong>rh_requests</strong> para registrar ações administrativas da liderança. Ausências operacionais continuam na trilha de `absence_requests`.
              </InfoBox>

              <div style={uiStyles.formRow}>
                <Select
                  label="Tipo"
                  value={documentForm.type}
                  onChange={(event) => setDocumentForm((current) => ({ ...current, type: event.target.value }))}
                  options={GENERAL_RH_OPTIONS}
                />
                <Select
                  label="Colaborador"
                  value={documentForm.targetId}
                  onChange={(event) => setDocumentForm((current) => ({ ...current, targetId: event.target.value }))}
                  options={employees.map((item) => ({ value: item.id, label: item.name }))}
                  placeholder="Selecione"
                />
              </div>

              <div style={uiStyles.formRow}>
                <Input
                  label="Data inicial"
                  type="date"
                  value={documentForm.startDate}
                  onChange={(event) => setDocumentForm((current) => ({ ...current, startDate: event.target.value }))}
                  required
                />
                <Input
                  label="Data final"
                  type="date"
                  value={documentForm.endDate}
                  min={documentForm.startDate}
                  onChange={(event) => setDocumentForm((current) => ({ ...current, endDate: event.target.value }))}
                  required
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                <input
                  type="checkbox"
                  checked={documentForm.allDay}
                  onChange={(event) => setDocumentForm((current) => ({ ...current, allDay: event.target.checked }))}
                />
                Documento válido para o dia inteiro
              </label>

              {!documentForm.allDay && (
                <div style={uiStyles.formRow}>
                  <Input
                    label="Hora inicial"
                    type="time"
                    value={documentForm.startTime}
                    onChange={(event) => setDocumentForm((current) => ({ ...current, startTime: event.target.value }))}
                  />
                  <Input
                    label="Hora final"
                    type="time"
                    value={documentForm.endTime}
                    onChange={(event) => setDocumentForm((current) => ({ ...current, endTime: event.target.value }))}
                  />
                </div>
              )}

              <Textarea
                label="Descrição"
                value={documentForm.description}
                onChange={(event) => setDocumentForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Descreva o documento, orientação ou decisão administrativa."
                required
              />

              {selectedTarget && (
                <Card size="sm" accent={colors.info} title="Destino do documento">
                  <div style={{ display: 'grid', gap: '6px', fontSize: '13px' }}>
                    <div><strong>Colaborador:</strong> {selectedTarget.name}</div>
                    <div><strong>Loja:</strong> {selectedTarget.cityName || selectedTarget.cityId || 'Não informada'}</div>
                    <div><strong>Cluster:</strong> {selectedTarget.clusterId || 'Não informado'}</div>
                  </div>
                </Card>
              )}

              <Btn type="submit" loading={saving} style={{ alignSelf: 'flex-start' }}>
                <ClipboardPlus size={16} /> Registrar documento
              </Btn>
            </form>
          )}
        </div>
      </Card>

      <Modal
        open={decisionModal.open}
        onClose={closeDecision}
        title={decisionModal.action === 'approve' ? 'Confirmar aprovação' : 'Registrar rejeição'}
        footer={(
          <>
            <Btn variant="secondary" onClick={closeDecision}>Cancelar</Btn>
            <Btn
              variant={decisionModal.action === 'approve' ? 'success' : 'danger'}
              onClick={handleDecision}
              loading={saving}
            >
              {decisionModal.action === 'approve' ? 'Aprovar agora' : 'Rejeitar solicitação'}
            </Btn>
          </>
        )}
      >
        <div style={{ display: 'grid', gap: '14px' }}>
          <InfoBox type={decisionModal.action === 'approve' ? 'success' : 'warning'}>
            {decisionModal.item ? (
              <>
                <strong>{getRequestTitle(decisionModal.item)}</strong> para {formatScopeLine(decisionModal.item)}.
              </>
            ) : 'Selecione uma solicitação para decidir.'}
          </InfoBox>

          <Textarea
            label={decisionModal.action === 'approve' ? 'Observação da decisão (opcional)' : 'Motivo da rejeição'}
            value={decisionModal.reason}
            onChange={(event) => setDecisionModal((current) => ({ ...current, reason: event.target.value }))}
            placeholder={
              decisionModal.action === 'approve'
                ? 'Ex.: aprovado e encaminhado para cobertura.'
                : 'Explique por que a solicitação foi rejeitada.'
            }
            required={decisionModal.action === 'reject'}
          />
        </div>
      </Modal>
    </Page>
  );
}
