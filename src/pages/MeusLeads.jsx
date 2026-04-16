import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Edit2,
  Kanban,
  MapPin,
  Phone,
  PlusCircle,
  Search,
  Tag,
  Trash2,
  User,
} from 'lucide-react';

import LeadAddressMapModal from '../components/LeadAddressMapModal';
import { Btn, Card, InfoBox, Modal, Page, colors, styles as uiStyles } from '../components/ui';
import { LEAD_GEO_STATUS, hasValidLeadCoordinates, normalizeLeadGeoStatus } from '../lib/leadGeo';
import { deleteLead, listenMyLeads, updateLeadDetails, updateLeadStatus } from '../services/leads';
import {
  createLeadDiscardReason,
  listLeadDiscardReasons,
  NEW_LEAD_DISCARD_REASON_VALUE,
} from '../services/leadDiscardReasonsService';

const KANBAN_COLUMNS = [
  { id: 'Em negociacao', label: 'Em negociacao', color: colors.warning, bg: 'rgba(245, 158, 11, 0.1)' },
  { id: 'Contratado', label: 'Contratado', color: colors.primary, bg: 'rgba(37, 99, 235, 0.1)' },
  { id: 'Instalado', label: 'Instalado', color: colors.success, bg: 'rgba(16, 185, 129, 0.1)' },
  { id: 'Descartado', label: 'Descartado', color: colors.danger, bg: 'rgba(239, 68, 68, 0.1)' },
];

function normalizeLeadForEdit(lead) {
  return {
    ...lead,
    id: lead?.id || lead?.leadId || lead?.docId || '',
    nome: lead.customerName || '',
    tel: lead.customerPhone || '',
    email: lead.customerEmail || '',
    cpf: lead.customerCpf || '',
    logradouro: lead.addressStreet || '',
    numero: lead.addressNumber || '',
    bairro: lead.addressNeighborhood || '',
    geoLat: lead.geoLat || null,
    geoLng: lead.geoLng || null,
    geoStatus: normalizeLeadGeoStatus(lead.geoStatus),
    geoFormattedAddress: lead.geoFormattedAddress || '',
    status: lead.status || 'Em negociacao',
    discardMotive: lead.discardMotive || '',
    fidelityMonth: lead.fidelityMonth || '',
    // Datas de ciclo de vida (editáveis para correção retroativa)
    contractedDate: lead.contractedDate || '',
    installedDate: lead.installedDate || '',
  };
}

function formatPhone(value) {
  let next = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (next.length <= 10) {
    next = next.replace(/^(\d{2})(\d)/, '($1) $2');
    next = next.replace(/(\d{4})(\d)/, '$1-$2');
    return next.slice(0, 14);
  }
  next = next.replace(/^(\d{2})(\d)/, '($1) $2');
  next = next.replace(/(\d{5})(\d)/, '$1-$2');
  return next.slice(0, 15);
}

export default function MeusLeads({ userData, onNavigate }) {
  const [myLeads, setMyLeads] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [searchTerm, setSearchTerm] = useState('');
  const [permissionError, setPermissionError] = useState('');
  const [notification, setNotification] = useState(null);
  const [draggedLead, setDraggedLead] = useState(null);
  const [updateModal, setUpdateModal] = useState(null);
  const [editMapOpen, setEditMapOpen] = useState(false);
  const [discardReasons, setDiscardReasons] = useState([]);
  const [showNewDiscardReasonCreator, setShowNewDiscardReasonCreator] = useState(false);
  const [newDiscardReasonName, setNewDiscardReasonName] = useState('');
  const [creatingDiscardReason, setCreatingDiscardReason] = useState(false);
  const [discardReasonError, setDiscardReasonError] = useState('');
  const [addressBaseline, setAddressBaseline] = useState(null);
  const [pendingAddressInvalidation, setPendingAddressInvalidation] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    window.setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    if (!userData?.uid) {
      setMyLeads([]);
      return undefined;
    }

    return listenMyLeads(
      userData.uid,
      (leadsData) => {
        setMyLeads(leadsData);
        setPermissionError('');
      },
      selectedMonth,
      () => setPermissionError('Nao foi possivel carregar o seu funil neste momento.'),
    );
  }, [selectedMonth, userData?.uid]);

  useEffect(() => {
    let active = true;
    listLeadDiscardReasons()
      .then((items) => {
        if (!active) return;
        setDiscardReasons(items);
      })
      .catch((error) => {
        console.error('Erro ao carregar motivos de descarte:', error);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!updateModal) {
      setAddressBaseline(null);
      setPendingAddressInvalidation(null);
      return;
    }

    setAddressBaseline({
      logradouro: updateModal.logradouro || '',
      numero: updateModal.numero || '',
      bairro: updateModal.bairro || '',
    });
  }, [updateModal?.id]);

  const filteredLeads = useMemo(() => (
    myLeads
      .filter((lead) => {
        const haystack = [lead.customerName, lead.customerPhone, lead.customerEmail]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(searchTerm.trim().toLowerCase());
      })
      .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')))
  ), [myLeads, searchTerm]);

  const closedLeads = filteredLeads.filter((lead) => ['Contratado', 'Instalado'].includes(lead.status)).length;

  const handleDeleteLead = async (leadId, customerName) => {
    if (!window.confirm(`Deseja realmente excluir o lead de "${customerName || 'cliente sem nome'}"?`)) return;

    try {
      await deleteLead(leadId);
      showToast('Lead removido com sucesso.');
    } catch (error) {
      console.error('Erro ao excluir lead:', error);
      showToast('Erro ao excluir lead.', 'error');
    }
  };

  const handleDragStart = (event, lead) => {
    setDraggedLead(lead);
    event.dataTransfer.setData('text/plain', lead.id);
  };

  const handleDrop = async (event, newStatus) => {
    event.preventDefault();
    if (!draggedLead) return;

    if ((draggedLead.status || 'Em negociacao') === newStatus) {
      setDraggedLead(null);
      return;
    }

    if (newStatus === 'Descartado') {
      setUpdateModal(normalizeLeadForEdit({ ...draggedLead, status: 'Descartado', discardMotive: '' }));
      setDraggedLead(null);
      return;
    }

    try {
      await updateLeadStatus(draggedLead.id, newStatus);
      showToast(`Lead movido para ${newStatus}.`);
    } catch (error) {
      console.error('Erro ao mover lead:', error);
      showToast('Erro ao mover lead.', 'error');
    } finally {
      setDraggedLead(null);
    }
  };

  const handleEditAddressChange = (field, value) => {
    setUpdateModal((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleEditAddressBlur = (field) => {
    if (!updateModal || !addressBaseline || !hasValidLeadCoordinates(updateModal) || pendingAddressInvalidation) return;

    const previousValue = String(addressBaseline[field] || '');
    const nextValue = String(updateModal[field] || '');
    if (previousValue === nextValue) return;

    setPendingAddressInvalidation({ field, previousValue, nextValue });
  };

  const confirmAddressInvalidation = () => {
    if (!pendingAddressInvalidation) return;

    setUpdateModal((current) => ({
      ...current,
      geoLat: null,
      geoLng: null,
      geoFormattedAddress: '',
      geoStatus: LEAD_GEO_STATUS.PENDING,
    }));
    setAddressBaseline((current) => ({
      ...(current || {}),
      logradouro: String(updateModal?.logradouro || ''),
      numero: String(updateModal?.numero || ''),
      bairro: String(updateModal?.bairro || ''),
    }));
    setPendingAddressInvalidation(null);
    showToast('Coordenadas antigas removidas. Confirme um novo ponto no mapa antes de salvar.', 'success');
  };

  const cancelAddressInvalidation = () => {
    if (!pendingAddressInvalidation) return;

    setUpdateModal((current) => ({
      ...current,
      [pendingAddressInvalidation.field]: pendingAddressInvalidation.previousValue,
    }));
    setPendingAddressInvalidation(null);
  };

  const handleSave = async (event) => {
    event?.preventDefault();
    if (!updateModal) return;
    if (!String(updateModal.id || '').trim()) {
      console.error('Lead sem id valido para edicao:', updateModal);
      showToast('Nao foi possivel identificar o lead para salvar.', 'error');
      return;
    }
    if (updateModal.status === 'Descartado' && !updateModal.discardMotive) {
      showToast('Defina o motivo da perda.', 'error');
      return;
    }

    try {
      await updateLeadDetails(updateModal.id, updateModal);
      setUpdateModal(null);
      showToast('Lead atualizado com sucesso.');
    } catch (error) {
      console.error('Erro ao salvar lead:', error);
      showToast('Erro ao salvar lead.', 'error');
    }
  };

  const handleCreateDiscardReason = async () => {
    if (!newDiscardReasonName.trim()) {
      setDiscardReasonError('Digite o nome do novo motivo antes de salvar.');
      return;
    }

    try {
      setCreatingDiscardReason(true);
      const createdReason = await createLeadDiscardReason(newDiscardReasonName, userData);
      setDiscardReasons((current) =>
        [...current.filter((item) => item.id !== createdReason.id), createdReason]
          .sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''))),
      );
      setUpdateModal((current) => ({ ...current, discardMotive: createdReason.name }));
      setNewDiscardReasonName('');
      setShowNewDiscardReasonCreator(false);
      setDiscardReasonError('');
      showToast('Novo motivo de descarte salvo.');
    } catch (error) {
      console.error('Erro ao criar motivo de descarte:', error);
      setDiscardReasonError(error.message || 'Nao foi possivel criar o novo motivo.');
    } finally {
      setCreatingDiscardReason(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '24px', width: '100%', paddingBottom: '40px' }}>
      <Page
        title="Meu Funil"
        subtitle="Arraste os leads entre as etapas e complemente os dados quando precisar."
        actions={(
          <>
            <div style={{ textAlign: 'right', marginRight: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>VENDAS NO MES</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: colors.success, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={20} /> {closedLeads}
              </div>
            </div>
            <Btn onClick={() => onNavigate?.('nova_venda')}>
              <PlusCircle size={16} /> Novo Lead
            </Btn>
          </>
        )}
      >
        <Card
          size="lg"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(37,99,235,0.06))',
            borderColor: 'rgba(16,185,129,0.18)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap' }}>
            <div style={{ display: 'grid', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: colors.success, fontWeight: 800 }}>
                <Kanban size={18} /> Funil operacional do atendente
              </div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
                {filteredLeads.length} leads no periodo
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Os dados pessoais e o endereco podem ser atualizados a qualquer momento pelo botao editar.
              </div>
            </div>
          </div>
        </Card>

        <div style={{ display: 'flex', gap: '15px', background: 'var(--bg-card)', padding: '15px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              placeholder="Buscar por nome, telefone ou email..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              style={{ ...uiStyles.input, paddingLeft: '48px', minHeight: '48px' }}
            />
          </div>
          <div style={{ position: 'relative', width: '200px' }}>
            <Calendar size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              style={{ ...uiStyles.input, paddingLeft: '48px', minHeight: '48px' }}
            />
          </div>
        </div>

        {permissionError && <InfoBox type="danger">{permissionError}</InfoBox>}

        <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px', minHeight: '600px' }}>
          {KANBAN_COLUMNS.map((column) => {
            const columnLeads = filteredLeads.filter((lead) => (lead.status || 'Em negociacao') === column.id);

            return (
              <div
                key={column.id}
                style={{ flex: '0 0 300px', background: 'var(--bg-panel)', borderRadius: '20px', padding: '20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDrop(event, column.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: `2px solid ${column.color}40`, marginBottom: '16px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: column.color }} />
                    {column.label}
                  </span>
                  <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 900, backgroundColor: column.bg, color: column.color }}>
                    {columnLeads.length}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                  {columnLeads.map((lead) => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(event) => handleDragStart(event, lead)}
                      style={{
                        background: 'var(--bg-card)',
                        padding: '18px',
                        borderRadius: '16px',
                        border: '1px solid var(--border)',
                        borderLeft: `5px solid ${column.color}`,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                        opacity: draggedLead?.id === lead.id ? 0.5 : 1,
                        cursor: 'grab',
                        display: 'grid',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', background: 'var(--bg-app)', padding: '4px 8px', borderRadius: '6px' }}>
                          {lead.date?.split('-').reverse().join('/') || '--/--/----'}
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button type="button" onClick={() => setUpdateModal(normalizeLeadForEdit(lead))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Editar">
                            <Edit2 size={16} />
                          </button>
                          <button type="button" onClick={() => handleDeleteLead(lead.id, lead.customerName)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.danger }} title="Excluir">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-main)' }}>
                        {lead.customerName || 'Lead sem nome'}
                      </div>

                      <div style={{ display: 'grid', gap: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        <span><Phone size={13} style={{ verticalAlign: 'middle', marginRight: '6px' }} />{lead.customerPhone || 'Telefone nao informado'}</span>
                        <span><MapPin size={13} style={{ verticalAlign: 'middle', marginRight: '6px' }} />{lead.address || 'Endereco nao informado'}</span>
                      </div>

                      <div style={{ marginTop: '4px', paddingTop: '12px', borderTop: '1px dashed var(--border)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '13px', fontWeight: 800 }}>
                        <Tag size={14} color={column.color} />
                        {lead.productName || 'Produto nao informado'}
                      </div>
                    </div>
                  ))}

                  {columnLeads.length === 0 && (
                    <div style={{ padding: '18px', borderRadius: '16px', border: '1px dashed var(--border)', color: 'var(--text-muted)', textAlign: 'center', fontSize: '13px' }}>
                      Sem leads nesta etapa.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Page>

      <Modal
        open={!!updateModal}
        onClose={() => {
          setUpdateModal(null);
          setShowNewDiscardReasonCreator(false);
          setNewDiscardReasonName('');
          setDiscardReasonError('');
          setPendingAddressInvalidation(null);
        }}
        title="Editar lead"
        size="lg"
        footer={(
          <>
            <Btn
              variant="secondary"
              onClick={() => {
                setUpdateModal(null);
                setShowNewDiscardReasonCreator(false);
                setNewDiscardReasonName('');
                setDiscardReasonError('');
                setPendingAddressInvalidation(null);
              }}
            >
              Cancelar
            </Btn>
            <Btn onClick={handleSave}>Salvar lead</Btn>
          </>
        )}
      >
        {updateModal && (
          <form onSubmit={handleSave} style={{ display: 'grid', gap: '18px' }}>
            <Card title="Dados pessoais" size="sm">
              <div style={{ ...uiStyles.formRow, marginBottom: '14px' }}>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nome</label>
                  <input value={updateModal.nome} onChange={(event) => setUpdateModal((current) => ({ ...current, nome: event.target.value }))} style={uiStyles.input} />
                </div>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>CPF</label>
                  <input value={updateModal.cpf} onChange={(event) => setUpdateModal((current) => ({ ...current, cpf: event.target.value }))} style={uiStyles.input} />
                </div>
              </div>

              <div style={uiStyles.formRow}>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Telefone</label>
                  <input value={updateModal.tel} onChange={(event) => setUpdateModal((current) => ({ ...current, tel: formatPhone(event.target.value) }))} style={uiStyles.input} />
                </div>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email</label>
                  <input value={updateModal.email} onChange={(event) => setUpdateModal((current) => ({ ...current, email: event.target.value }))} style={uiStyles.input} />
                </div>
              </div>
            </Card>

            <Card
              title="Endereco"
              size="sm"
              actions={<Btn variant="secondary" onClick={() => setEditMapOpen(true)}><MapPin size={15} /> Selecionar no mapa</Btn>}
            >
              <div style={{ ...uiStyles.formRow, marginBottom: '14px' }}>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Logradouro</label>
                  <input
                    value={updateModal.logradouro}
                    onChange={(event) => handleEditAddressChange('logradouro', event.target.value)}
                    onBlur={() => handleEditAddressBlur('logradouro')}
                    style={uiStyles.input}
                  />
                </div>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Numero</label>
                  <input
                    value={updateModal.numero}
                    onChange={(event) => handleEditAddressChange('numero', event.target.value)}
                    onBlur={() => handleEditAddressBlur('numero')}
                    style={uiStyles.input}
                  />
                </div>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bairro</label>
                  <input
                    value={updateModal.bairro}
                    onChange={(event) => handleEditAddressChange('bairro', event.target.value)}
                    onBlur={() => handleEditAddressBlur('bairro')}
                    style={uiStyles.input}
                  />
                </div>
              </div>

              <InfoBox type={updateModal.geoLat && updateModal.geoLng ? 'success' : 'info'}>
                {updateModal.geoLat && updateModal.geoLng
                  ? 'Esse lead ja tem coordenadas confirmadas. Se o endereco mudar, voce precisara confirmar um novo ponto.'
                  : 'Use o mapa para confirmar o ponto do lead. O endereco textual nao define a localizacao sozinho.'}
              </InfoBox>
            </Card>

            <Card title="Status e fechamento" size="sm">
              <div style={{ ...uiStyles.formRow, marginBottom: '14px' }}>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</label>
                  <select
                    value={updateModal.status}
                    onChange={(event) => {
                      const nextStatus = event.target.value;
                      setUpdateModal((current) => ({
                        ...current,
                        status: nextStatus,
                        ...(nextStatus === 'Descartado' ? {} : { discardMotive: '', fidelityMonth: '' }),
                      }));
                      if (nextStatus !== 'Descartado') {
                        setShowNewDiscardReasonCreator(false);
                        setDiscardReasonError('');
                      }
                    }}
                    style={uiStyles.select}
                  >
                    {KANBAN_COLUMNS.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Origem atual</label>
                  <input value={updateModal.origin || updateModal.originName || 'Nao informada'} readOnly style={{ ...uiStyles.input, background: 'var(--bg-app)' }} />
                </div>
              </div>

              {/* ── Datas de ciclo de vida ─────────────────────────────────────────
                  Preenchidas automaticamente ao arrastar no Kanban.
                  O atendente pode corrigir aqui caso a data tenha sido registrada errada
                  (ex: instalação retroativa ou contrato assinado em data diferente de hoje). */}
              <div style={{ marginTop: '8px', padding: '14px', borderRadius: '14px', background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.12)' }}>
                <div style={{ fontSize: '11px', fontWeight: 900, color: colors.primary, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                  Datas do ciclo de vida
                </div>
                <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                  <div style={{ display: 'grid', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Prospecção (abertura)
                    </label>
                    <input
                      type="date"
                      value={updateModal.date || ''}
                      readOnly
                      title="Data de abertura do lead — definida na criacao e nao editavel"
                      style={{ ...uiStyles.input, background: 'var(--bg-app)', cursor: 'not-allowed' }}
                    />
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Data de abertura — nao editavel</span>
                  </div>
                  <div style={{ display: 'grid', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Contratação (venda ganha)
                    </label>
                    <input
                      type="date"
                      value={updateModal.contractedDate || ''}
                      onChange={(event) => setUpdateModal((current) => ({ ...current, contractedDate: event.target.value }))}
                      style={uiStyles.input}
                    />
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Preenchido auto ao mover para Contratado</span>
                  </div>
                  <div style={{ display: 'grid', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: colors.success, textTransform: 'uppercase' }}>
                      Instalação (ativação) ★ meta
                    </label>
                    <input
                      type="date"
                      value={updateModal.installedDate || ''}
                      onChange={(event) => setUpdateModal((current) => ({ ...current, installedDate: event.target.value }))}
                      style={{ ...uiStyles.input, borderColor: colors.success + '60' }}
                    />
                    <span style={{ fontSize: '10px', color: colors.success, fontWeight: 700 }}>
                      Esta data define o mes da meta — editavel para retroativos
                    </span>
                  </div>
                </div>
              </div>

              {updateModal.status === 'Descartado' && (
                <div style={{ display: 'grid', gap: '14px', padding: '14px', borderRadius: '14px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                  <div style={{ display: 'grid', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 800, color: colors.danger, textTransform: 'uppercase' }}>Motivo da perda</label>
                    <select
                      value={updateModal.discardMotive}
                      onChange={(event) => {
                        if (event.target.value === NEW_LEAD_DISCARD_REASON_VALUE) {
                          setShowNewDiscardReasonCreator(true);
                          return;
                        }
                        setShowNewDiscardReasonCreator(false);
                        setDiscardReasonError('');
                        setUpdateModal((current) => ({
                          ...current,
                          discardMotive: event.target.value,
                          ...(event.target.value === 'Fidelidade em outro Provedor' ? {} : { fidelityMonth: '' }),
                        }));
                      }}
                      style={uiStyles.select}
                    >
                      <option value="">Selecione um motivo</option>
                      {discardReasons.map((reason) => <option key={reason.id} value={reason.name}>{reason.name}</option>)}
                      <option value={NEW_LEAD_DISCARD_REASON_VALUE}>Inserir motivo</option>
                    </select>
                  </div>

                  {showNewDiscardReasonCreator && (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <input
                        value={newDiscardReasonName}
                        onChange={(event) => setNewDiscardReasonName(event.target.value)}
                        placeholder="Digite o novo motivo"
                        style={{ ...uiStyles.input, flex: 1, minWidth: '220px' }}
                      />
                      <Btn onClick={handleCreateDiscardReason} loading={creatingDiscardReason}>Salvar motivo</Btn>
                    </div>
                  )}

                  {discardReasonError && <InfoBox type="warning">{discardReasonError}</InfoBox>}

                  {updateModal.discardMotive === 'Fidelidade em outro Provedor' && (
                    <div style={{ display: 'grid', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 800, color: colors.danger, textTransform: 'uppercase' }}>Mes do fim da fidelidade</label>
                      <input type="month" value={updateModal.fidelityMonth} onChange={(event) => setUpdateModal((current) => ({ ...current, fidelityMonth: event.target.value }))} style={uiStyles.input} />
                    </div>
                  )}
                </div>
              )}
            </Card>
          </form>
        )}
      </Modal>

      <LeadAddressMapModal
        open={editMapOpen}
        onClose={() => setEditMapOpen(false)}
        cityName={updateModal?.cityName || userData?.cityName || ''}
        initialValue={updateModal}
        onConfirm={(location) => {
          setUpdateModal((current) => ({
            ...current,
            logradouro: location.logradouro || current.logradouro || '',
            numero: location.numero || current.numero || '',
            bairro: location.bairro || current.bairro || '',
            geoLat: location.geoLat ?? null,
            geoLng: location.geoLng ?? null,
            geoFormattedAddress: location.geoFormattedAddress || '',
            geoStatus: normalizeLeadGeoStatus(location.geoStatus),
          }));
          setAddressBaseline({
            logradouro: location.logradouro || updateModal?.logradouro || '',
            numero: location.numero || updateModal?.numero || '',
            bairro: location.bairro || updateModal?.bairro || '',
          });
          setEditMapOpen(false);
        }}
      />

      <Modal
        open={Boolean(pendingAddressInvalidation)}
        onClose={cancelAddressInvalidation}
        title="Endereco alterado"
        footer={(
          <>
            <Btn variant="secondary" onClick={cancelAddressInvalidation}>
              Manter coordenadas atuais
            </Btn>
            <Btn variant="danger" onClick={confirmAddressInvalidation}>
              Limpar coordenadas
            </Btn>
          </>
        )}
      >
        {pendingAddressInvalidation ? (
          <div style={{ display: 'grid', gap: '14px' }}>
            <InfoBox type="warning">
              O endereco foi alterado depois que este lead ja tinha coordenadas confirmadas. Se continuar, as coordenadas atuais serao removidas e sera preciso confirmar um novo ponto no mapa.
            </InfoBox>
            <div style={{ display: 'grid', gap: '8px', fontSize: '13px', color: 'var(--text-main)' }}>
              <div><strong>Campo alterado:</strong> {pendingAddressInvalidation.field}</div>
              <div><strong>Valor anterior:</strong> {pendingAddressInvalidation.previousValue || '-'}</div>
              <div><strong>Novo valor:</strong> {pendingAddressInvalidation.nextValue || '-'}</div>
            </div>
          </div>
        ) : null}
      </Modal>

      {notification && (
        <div style={{ position: 'fixed', bottom: '30px', right: '30px', padding: '16px 24px', borderRadius: '14px', color: 'white', background: notification.type === 'error' ? colors.danger : colors.success, zIndex: 9999, fontWeight: 900, boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          {notification.message}
        </div>
      )}
    </div>
  );
}
