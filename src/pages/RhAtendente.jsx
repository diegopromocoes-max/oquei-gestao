import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  FileCheck,
  FileText,
  History,
  Send,
  ShieldCheck,
  Stethoscope,
  UploadCloud,
} from 'lucide-react';

import {
  Badge,
  Btn,
  Card,
  InfoBox,
  Input,
  Page,
  Select,
  Textarea,
  colors,
  styles as uiStyles,
} from '../components/ui';
import {
  createGeneralRhRequest,
  listMyRhRequests,
} from '../services/atendenteRhService';
import {
  createAbsenceRequest,
  listMyAbsenceRequests,
} from '../services/absenceRequests';

const ABSENCE_OPTIONS = [
  { value: 'falta', label: 'Falta Programada', icon: AlertTriangle, accent: colors.warning },
  { value: 'atestado', label: 'Atestado', icon: Stethoscope, accent: colors.success },
];

const RH_OPTIONS = [
  { value: 'folga', label: 'Folga', icon: CalendarDays, accent: colors.primary },
  { value: 'correcao_ponto', label: 'Correcao de ponto', icon: Clock3, accent: colors.warning },
  { value: 'outros', label: 'Outros assuntos', icon: FileText, accent: colors.purple },
];

function initialRangeForm() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    startDate: today,
    endDate: today,
    allDay: true,
    startTime: '',
    endTime: '',
    justification: '',
  };
}

function StatusBadge({ status }) {
  if (status === 'Aprovado') return <Badge status="ativo">Aprovado</Badge>;
  if (status === 'Rejeitado') return <Badge cor="danger">Rejeitado</Badge>;
  return <Badge cor="warning">Pendente</Badge>;
}

function RequestHistoryCard({ item }) {
  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '14px',
        border: '1px solid var(--border)',
        background: 'var(--bg-app)',
        display: 'grid',
        gap: '10px',
      }}
    >
      <div style={{ ...uiStyles.rowBetween, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 900, color: 'var(--text-main)' }}>{item.label}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {item.startDate ? new Date(`${item.startDate}T12:00:00`).toLocaleDateString('pt-BR') : 'Sem data'}
            {item.endDate && item.endDate !== item.startDate
              ? ` ate ${new Date(`${item.endDate}T12:00:00`).toLocaleDateString('pt-BR')}`
              : ''}
          </div>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
        {item.justification || item.description || 'Sem observacoes adicionais.'}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Badge cor={item.kind === 'absence' ? 'danger' : 'info'}>
          {item.kind === 'absence' ? 'Ausencia operacional' : 'RH geral'}
        </Badge>
        {item.type && <Badge cor="neutral">{item.type}</Badge>}
        {item.fileName && <Badge cor="primary">Anexo: {item.fileName}</Badge>}
      </div>
      {item.decisionReason && (
        <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(15,23,42,0.04)', fontSize: '12px', color: 'var(--text-main)' }}>
          <strong>Retorno da lideranca:</strong> {item.decisionReason}
        </div>
      )}
    </div>
  );
}

export default function RhAtendente({ userData }) {
  const [activeTab, setActiveTab] = useState('absence');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [loadError, setLoadError] = useState('');

  const [absenceType, setAbsenceType] = useState('falta');
  const [absenceForm, setAbsenceForm] = useState(initialRangeForm);
  const [absenceFileName, setAbsenceFileName] = useState('');

  const [rhType, setRhType] = useState('folga');
  const [rhForm, setRhForm] = useState(initialRangeForm);

  const absenceMeta = useMemo(
    () => ABSENCE_OPTIONS.find((option) => option.value === absenceType) || ABSENCE_OPTIONS[0],
    [absenceType]
  );
  const rhMeta = useMemo(
    () => RH_OPTIONS.find((option) => option.value === rhType) || RH_OPTIONS[0],
    [rhType]
  );

  const loadHistory = async () => {
    if (!userData?.uid) return;
    setHistoryLoading(true);
    setLoadError('');
    try {
      const [absenceHistory, rhHistory] = await Promise.all([
        listMyAbsenceRequests(userData.uid),
        listMyRhRequests(userData.uid),
      ]);

      const combined = [
        ...absenceHistory.map((item) => ({
          ...item,
          kind: 'absence',
          label: item.type === 'atestado' ? 'Atestado' : 'Ausencia operacional',
        })),
        ...rhHistory.map((item) => ({
          ...item,
          kind: 'rh',
          label: item.type === 'falta_futura'
            ? 'Falta futura'
            : item.type === 'atestado'
              ? 'Atestado'
              : item.type === 'folga'
            ? 'Folga'
            : item.type === 'correcao_ponto'
              ? 'Correcao de ponto'
              : 'Solicitacao de RH',
        })),
      ].sort((left, right) => (right.updatedAt?.seconds || right.createdAt?.seconds || 0) - (left.updatedAt?.seconds || left.createdAt?.seconds || 0));

      setHistoryItems(combined);
    } catch (error) {
      setHistoryItems([]);
      setLoadError(
        error?.code === 'permission-denied'
          ? 'Sem permissao para consultar seu historico.'
          : 'Nao foi possivel carregar o historico de solicitacoes.'
      );
    }
    setHistoryLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const submitAbsenceRequest = async (event) => {
    event.preventDefault();
    if (!absenceForm.justification.trim()) {
      window.showToast?.('Explique o motivo da ausencia.', 'error');
      return;
    }
    if (absenceType === 'atestado' && !absenceFileName) {
      window.showToast?.('Anexe ao menos o nome do atestado.', 'error');
      return;
    }

    setLoading(true);
    try {
      await createAbsenceRequest({
        type: absenceType,
        attendantId: userData?.uid,
        attendantName: userData?.name || 'Atendente',
        storeId: userData?.cityId || '',
        storeName: userData?.cityName || userData?.storeName || userData?.cityId || 'Loja',
        clusterId: userData?.clusterId || '',
        supervisorUid: userData?.supervisorUid || '',
        startDate: absenceForm.startDate,
        endDate: absenceForm.endDate || absenceForm.startDate,
        allDay: absenceForm.allDay,
        startTime: absenceForm.allDay ? '' : absenceForm.startTime,
        endTime: absenceForm.allDay ? '' : absenceForm.endTime,
        justification: absenceForm.justification,
        fileName: absenceFileName || '',
      });

      window.showToast?.('Solicitacao de ausencia enviada.', 'success');
      setAbsenceForm(initialRangeForm());
      setAbsenceFileName('');
      setActiveTab('history');
      await loadHistory();
    } catch (error) {
      window.showToast?.(
        error?.code === 'permission-denied'
          ? 'Sem permissao para abrir solicitacoes operacionais.'
          : 'Nao foi possivel enviar a solicitacao de ausencia.',
        'error'
      );
    }
    setLoading(false);
  };

  const submitRhRequest = async (event) => {
    event.preventDefault();
    if (!rhForm.justification.trim()) {
      window.showToast?.('Explique a necessidade do pedido.', 'error');
      return;
    }

    setLoading(true);
    try {
      await createGeneralRhRequest({
        type: rhType,
        attendantId: userData?.uid,
        attendantName: userData?.name || 'Atendente',
        storeId: userData?.cityId || '',
        storeName: userData?.cityName || userData?.storeName || userData?.cityId || 'Loja',
        clusterId: userData?.clusterId || '',
        supervisorUid: userData?.supervisorUid || '',
        startDate: rhForm.startDate,
        endDate: rhForm.endDate || rhForm.startDate,
        allDay: rhForm.allDay,
        startTime: rhForm.allDay ? '' : rhForm.startTime,
        endTime: rhForm.allDay ? '' : rhForm.endTime,
        description: rhForm.justification,
      });

      window.showToast?.('Solicitacao de RH enviada.', 'success');
      setRhForm(initialRangeForm());
      setActiveTab('history');
      await loadHistory();
    } catch (error) {
      window.showToast?.(
        error?.code === 'permission-denied'
          ? 'Sem permissao para abrir solicitacoes de RH.'
          : 'Nao foi possivel enviar sua solicitacao.',
        'error'
      );
    }
    setLoading(false);
  };

  return (
    <Page
      title="Solicitacoes de RH"
      subtitle="Ausencias operacionais e pedidos gerais agora seguem trilhas separadas."
      actions={(
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Btn variant={activeTab === 'absence' ? 'primary' : 'secondary'} onClick={() => setActiveTab('absence')}>
            <AlertTriangle size={16} /> Ausencia / Atestado
          </Btn>
          <Btn variant={activeTab === 'rh' ? 'primary' : 'secondary'} onClick={() => setActiveTab('rh')}>
            <ShieldCheck size={16} /> RH Geral
          </Btn>
          <Btn variant={activeTab === 'history' ? 'primary' : 'secondary'} onClick={() => setActiveTab('history')}>
            <History size={16} /> Historico
          </Btn>
        </div>
      )}
    >
      {activeTab === 'absence' && (
        <Card
          title={absenceMeta.label}
          subtitle="Use esta trilha para faltas programadas e envio de atestado."
          accent={absenceMeta.accent}
        >
          <form onSubmit={submitAbsenceRequest} style={uiStyles.form}>
            <div style={uiStyles.formRow}>
              <Select
                label="Tipo"
                value={absenceType}
                onChange={(event) => setAbsenceType(event.target.value)}
                options={ABSENCE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
              />
              <Input
                label="Data inicial"
                type="date"
                value={absenceForm.startDate}
                onChange={(event) => setAbsenceForm((current) => ({ ...current, startDate: event.target.value }))}
                required
              />
              <Input
                label="Data final"
                type="date"
                value={absenceForm.endDate}
                min={absenceForm.startDate}
                onChange={(event) => setAbsenceForm((current) => ({ ...current, endDate: event.target.value }))}
                required
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
              <input
                type="checkbox"
                checked={absenceForm.allDay}
                onChange={(event) => setAbsenceForm((current) => ({ ...current, allDay: event.target.checked }))}
              />
              Solicitar dia inteiro
            </label>

            {!absenceForm.allDay && (
              <div style={uiStyles.formRow}>
                <Input
                  label="Hora inicial"
                  type="time"
                  value={absenceForm.startTime}
                  onChange={(event) => setAbsenceForm((current) => ({ ...current, startTime: event.target.value }))}
                  required
                />
                <Input
                  label="Hora final"
                  type="time"
                  value={absenceForm.endTime}
                  onChange={(event) => setAbsenceForm((current) => ({ ...current, endTime: event.target.value }))}
                  required
                />
              </div>
            )}

            <Textarea
              label="Justificativa"
              value={absenceForm.justification}
              onChange={(event) => setAbsenceForm((current) => ({ ...current, justification: event.target.value }))}
              placeholder="Explique o motivo e qualquer detalhe importante para a operacao."
              required
            />

            <label
              style={{
                border: `1px dashed ${absenceType === 'atestado' ? colors.success : 'var(--border)'}`,
                borderRadius: '14px',
                padding: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                background: 'var(--bg-app)',
              }}
            >
              <input
                type="file"
                style={{ display: 'none' }}
                onChange={(event) => setAbsenceFileName(event.target.files?.[0]?.name || '')}
              />
              <UploadCloud size={20} color={absenceType === 'atestado' ? colors.success : colors.neutral} />
              <div style={{ display: 'grid', gap: '4px' }}>
                <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>
                  {absenceFileName || 'Anexar comprovante'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Obrigatorio para atestado. O sistema armazena apenas o nome do arquivo neste fluxo.
                </div>
              </div>
            </label>

            <Btn type="submit" loading={loading} style={{ alignSelf: 'flex-start' }}>
              <Send size={16} /> Enviar ausencia
            </Btn>
          </form>
        </Card>
      )}

      {activeTab === 'rh' && (
        <Card
          title={rhMeta.label}
          subtitle="Pedidos administrativos e de departamento pessoal."
          accent={rhMeta.accent}
        >
          <form onSubmit={submitRhRequest} style={uiStyles.form}>
            <div style={uiStyles.formRow}>
              <Select
                label="Tipo"
                value={rhType}
                onChange={(event) => setRhType(event.target.value)}
                options={RH_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
              />
              <Input
                label="Data inicial"
                type="date"
                value={rhForm.startDate}
                onChange={(event) => setRhForm((current) => ({ ...current, startDate: event.target.value }))}
                required
              />
              <Input
                label="Data final"
                type="date"
                value={rhForm.endDate}
                min={rhForm.startDate}
                onChange={(event) => setRhForm((current) => ({ ...current, endDate: event.target.value }))}
                required
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
              <input
                type="checkbox"
                checked={rhForm.allDay}
                onChange={(event) => setRhForm((current) => ({ ...current, allDay: event.target.checked }))}
              />
              Solicitar dia inteiro
            </label>

            {!rhForm.allDay && (
              <div style={uiStyles.formRow}>
                <Input
                  label="Hora inicial"
                  type="time"
                  value={rhForm.startTime}
                  onChange={(event) => setRhForm((current) => ({ ...current, startTime: event.target.value }))}
                />
                <Input
                  label="Hora final"
                  type="time"
                  value={rhForm.endTime}
                  onChange={(event) => setRhForm((current) => ({ ...current, endTime: event.target.value }))}
                />
              </div>
            )}

            <Textarea
              label="Descricao"
              value={rhForm.justification}
              onChange={(event) => setRhForm((current) => ({ ...current, justification: event.target.value }))}
              placeholder="Descreva a necessidade, prazo ou contexto do pedido."
              required
            />

            <Btn type="submit" loading={loading} style={{ alignSelf: 'flex-start' }}>
              <Send size={16} /> Enviar pedido de RH
            </Btn>
          </form>
        </Card>
      )}

      {activeTab === 'history' && (
        <Card title="Historico de solicitacoes" subtitle="Acompanhe aprovacoes, recusas e observacoes da lideranca.">
          {loadError && <InfoBox type="danger">{loadError}</InfoBox>}
          {historyLoading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando historico...</div>
          ) : historyItems.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Nenhuma solicitacao encontrada ate o momento.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '14px' }}>
              {historyItems.map((item) => (
                <RequestHistoryCard key={`${item.kind}_${item.id}`} item={item} />
              ))}
            </div>
          )}
        </Card>
      )}
    </Page>
  );
}
