import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileText,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';

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
  Tabs,
  Textarea,
  colors,
} from '../components/ui';
import { generateEquipmentReturnPdf } from '../lib/equipmentReturnPdf';
import {
  EQUIPMENT_RETURN_STATUS,
  SYSTEM_EQUIPMENT_RETURN_TYPES,
  STOCK_UNLINK_STATUS_OPTIONS,
  formatEquipmentReturnDateTime,
  formatStockUnlinkStatus,
  formatYesNo,
} from '../lib/equipmentReturns';
import { ROLE_KEYS, normalizeRole } from '../lib/roleUtils';
import {
  createEquipmentReturn,
  createEquipmentReturnType,
  deleteEquipmentReturn,
  listEquipmentReturnTypes,
  listRouterCatalogSuggestions,
  markEquipmentReturnErpRegistered,
  subscribeEquipmentReturns,
} from '../services/equipmentReturns';

const TAB_NEW_TERM = 'Novo Termo';
const TAB_REPORT = 'Relatorio';

const initialCustomerState = {
  name: '',
  cpf: '',
  contractNumber: '',
};

const initialChecklistState = {
  deliveredInStore: null,
  missingEquipment: null,
  missingEquipmentDetails: '',
  declarationDelivered: null,
  goodCondition: null,
  stockUnlinkStatus: '',
  returnedMacDescription: '',
};

function createEmptyEquipment() {
  return {
    nickname: '',
    typeId: '',
    typeLabel: '',
    customTypeDescription: '',
    catalogEquipmentId: '',
    brand: '',
    model: '',
    identifierLabel: 'MAC ou Similar',
    identifierValue: '',
  };
}

function ChoiceButton({ active, color, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minWidth: '92px',
        padding: '10px 14px',
        borderRadius: '10px',
        border: active ? `1px solid ${color}` : '1px solid var(--border)',
        background: active ? `${color}1a` : 'var(--bg-card)',
        color: active ? color : 'var(--text-muted)',
        fontWeight: active ? 800 : 700,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function BinaryChoiceField({ label, value, onChange, description }) {
  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      <div>
        <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-main)' }}>{label}</div>
        {description ? (
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{description}</div>
        ) : null}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <ChoiceButton active={value === true} color={colors.success} label="Sim" onClick={() => onChange(true)} />
        <ChoiceButton active={value === false} color={colors.danger} label="Nao" onClick={() => onChange(false)} />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === EQUIPMENT_RETURN_STATUS.REGISTERED_ERP) {
    return <Badge cor="success">ERP registrado</Badge>;
  }
  return <Badge cor="danger">Pendente ERP</Badge>;
}

function SummaryCard({ icon, label, value, accent }) {
  return (
    <div
      style={{
        borderRadius: '18px',
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${accent}1a`,
          color: accent,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: '24px', color: 'var(--text-main)', fontWeight: 900, letterSpacing: '-0.03em' }}>{value}</div>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div style={{ display: 'grid', gap: '6px' }}>
      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div
        style={{
          minHeight: '44px',
          borderRadius: '10px',
          border: '1px solid var(--border)',
          background: 'var(--bg-app)',
          padding: '11px 13px',
          display: 'flex',
          alignItems: 'center',
          color: 'var(--text-main)',
          fontSize: '14px',
        }}
      >
        {value || '-'}
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
      <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 800, textAlign: 'right' }}>{value || '-'}</span>
    </div>
  );
}

function EquipmentBlock({
  equipment,
  index,
  typeOptions,
  routerCatalog,
  canDelete,
  onUpdate,
  onRemove,
}) {
  const brandSuggestions = useMemo(
    () => Array.from(new Set(routerCatalog.map((item) => item.brand).filter(Boolean))).sort(),
    [routerCatalog],
  );
  const modelSuggestions = useMemo(
    () => Array.from(new Set(routerCatalog.map((item) => item.model).filter(Boolean))).sort(),
    [routerCatalog],
  );
  const catalogOptions = routerCatalog.map((item) => ({
    value: item.id,
    label: `${item.brand || 'Sem marca'} - ${item.model || 'Sem modelo'}`,
  }));
  const isOtherType = equipment.typeId === 'outro';

  const handleFieldChange = (field, value) => {
    onUpdate(index, { [field]: value });
  };

  const handleTypeChange = (value) => {
    const selectedType = typeOptions.find((item) => item.id === value);
    onUpdate(index, {
      typeId: value,
      typeLabel: selectedType?.name || '',
      customTypeDescription: value === 'outro' ? equipment.customTypeDescription : '',
    });
  };

  const handleCatalogChange = (value) => {
    const selectedCatalog = routerCatalog.find((item) => item.id === value);
    onUpdate(index, {
      catalogEquipmentId: value,
      brand: selectedCatalog?.brand || equipment.brand,
      model: selectedCatalog?.model || equipment.model,
    });
  };

  return (
    <Card
      title={`Equipamento ${index + 1}`}
      subtitle="Identifique cada item devolvido individualmente."
      accent={colors.info}
      actions={
        canDelete ? (
          <Btn variant="danger" size="sm" onClick={() => onRemove(index)}>
            <Trash2 size={14} /> Remover
          </Btn>
        ) : null
      }
    >
      <div style={{ display: 'grid', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <Input
            label="Apelido do equipamento"
            value={equipment.nickname}
            onChange={(event) => handleFieldChange('nickname', event.target.value)}
            placeholder="Ex: Roteador principal"
          />
          <Select
            label="Tipo"
            value={equipment.typeId}
            onChange={(event) => handleTypeChange(event.target.value)}
            options={typeOptions.map((item) => ({ value: item.id, label: item.name }))}
            placeholder="Selecione um tipo"
            required
          />
        </div>

        {isOtherType ? (
          <Input
            label="Descricao do tipo"
            value={equipment.customTypeDescription}
            onChange={(event) => handleFieldChange('customTypeDescription', event.target.value)}
            placeholder="Ex: Controle, fonte, repetidor"
            required
          />
        ) : null}

        <Select
          label="Sugestao do catalogo de roteadores"
          value={equipment.catalogEquipmentId}
          onChange={(event) => handleCatalogChange(event.target.value)}
          options={catalogOptions}
          placeholder="Opcional: preencher a partir do catalogo"
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div>
            <Input
              label="Marca"
              value={equipment.brand}
              onChange={(event) => handleFieldChange('brand', event.target.value)}
              placeholder="Ex: TP-Link"
              list={`return-brand-list-${index}`}
              required
            />
            <datalist id={`return-brand-list-${index}`}>
              {brandSuggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>
          <div>
            <Input
              label="Modelo"
              value={equipment.model}
              onChange={(event) => handleFieldChange('model', event.target.value)}
              placeholder="Ex: Archer C60"
              list={`return-model-list-${index}`}
              required
            />
            <datalist id={`return-model-list-${index}`}>
              {modelSuggestions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <Input
            label="Nome do identificador"
            value={equipment.identifierLabel}
            onChange={(event) => handleFieldChange('identifierLabel', event.target.value)}
            placeholder="Ex: MAC Roteador"
            required
          />
          <Input
            label="MAC ou Similar"
            value={equipment.identifierValue}
            onChange={(event) => handleFieldChange('identifierValue', event.target.value)}
            placeholder="Ex: A1:B2:C3:D4:E5:F6"
            required
          />
        </div>
      </div>
    </Card>
  );
}

export default function Devolucoes({ userData }) {
  const roleKey = normalizeRole(userData?.role);
  const isAdmin = [ROLE_KEYS.COORDINATOR, ROLE_KEYS.SUPERVISOR].includes(roleKey);
  const isAttendant = roleKey === ROLE_KEYS.ATTENDANT;
  const [activeTab, setActiveTab] = useState(TAB_NEW_TERM);
  const [customer, setCustomer] = useState(initialCustomerState);
  const [checklist, setChecklist] = useState(initialChecklistState);
  const [equipments, setEquipments] = useState([createEmptyEquipment()]);
  const [equipmentTypes, setEquipmentTypes] = useState(SYSTEM_EQUIPMENT_RETURN_TYPES);
  const [routerCatalog, setRouterCatalog] = useState([]);
  const [returns, setReturns] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    store: 'all',
    startDate: '',
    endDate: '',
  });
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [loadingReturns, setLoadingReturns] = useState(true);
  const [savingTerm, setSavingTerm] = useState(false);
  const [savingErp, setSavingErp] = useState(false);
  const [deletingReturn, setDeletingReturn] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [returnsError, setReturnsError] = useState('');
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [erpModal, setErpModal] = useState({ open: false, record: null, protocol: '' });
  const [deleteModal, setDeleteModal] = useState({ open: false, record: null });
  const [newTypeName, setNewTypeName] = useState('');
  const [savingType, setSavingType] = useState(false);
  const [typeModalOpen, setTypeModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingCatalogs(true);
    setCatalogError('');

    Promise.all([
      listEquipmentReturnTypes(userData),
      listRouterCatalogSuggestions(),
    ])
      .then(([types, routers]) => {
        if (cancelled) return;
        setEquipmentTypes(types);
        setRouterCatalog(routers);
      })
      .catch((error) => {
        if (cancelled) return;
        setCatalogError(
          error?.code === 'permission-denied'
            ? 'Sem permissao para carregar os catalogos de devolucoes.'
            : 'Nao foi possivel carregar os catalogos do modulo.'
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingCatalogs(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userData]);

  useEffect(() => {
    setLoadingReturns(true);
    setReturnsError('');

    const unsubscribe = subscribeEquipmentReturns(
      userData,
      (items) => {
        setReturns(items);
        setLoadingReturns(false);
      },
      (error) => {
        setReturns([]);
        setReturnsError(
          error?.code === 'permission-denied'
            ? 'Sem permissao para consultar as devolucoes.'
            : 'Nao foi possivel carregar o relatorio de devolucoes.'
        );
        setLoadingReturns(false);
      },
    );

    return () => unsubscribe?.();
  }, [userData]);

  const storeOptions = useMemo(() => {
    const uniqueStores = Array.from(
      new Set(
        returns
          .map((item) => item?.attendant?.storeName || item?.attendant?.storeId)
          .filter(Boolean),
      ),
    ).sort();

    return uniqueStores.map((store) => ({ value: store, label: store }));
  }, [returns]);

  const filteredReturns = useMemo(() => {
    return returns.filter((record) => {
      const searchHaystack = [
        record?.customer?.name,
        record?.customer?.cpf,
        record?.customer?.contractNumber,
        record?.attendant?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const searchMatch = !filters.search.trim() || searchHaystack.includes(filters.search.toLowerCase());
      const statusMatch =
        filters.status === 'all' ||
        (filters.status === 'pending' && record.status === EQUIPMENT_RETURN_STATUS.PENDING_ERP) ||
        (filters.status === 'registered' && record.status === EQUIPMENT_RETURN_STATUS.REGISTERED_ERP);
      const storeLabel = record?.attendant?.storeName || record?.attendant?.storeId || '';
      const storeMatch = filters.store === 'all' || storeLabel === filters.store;

      const recordDate = parseRecordDate(record);
      const startMatch = !filters.startDate || (recordDate && recordDate >= new Date(`${filters.startDate}T00:00:00`));
      const endMatch = !filters.endDate || (recordDate && recordDate <= new Date(`${filters.endDate}T23:59:59`));

      return searchMatch && statusMatch && storeMatch && startMatch && endMatch;
    });
  }, [filters, returns]);

  const summary = useMemo(() => {
    const pending = returns.filter((item) => item.status === EQUIPMENT_RETURN_STATUS.PENDING_ERP).length;
    const registered = returns.filter((item) => item.status === EQUIPMENT_RETURN_STATUS.REGISTERED_ERP).length;
    return {
      total: returns.length,
      pending,
      registered,
    };
  }, [returns]);

  const issuedAtPreview = useMemo(
    () =>
      new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date()),
    [],
  );

  const resetForm = () => {
    setCustomer(initialCustomerState);
    setChecklist(initialChecklistState);
    setEquipments([createEmptyEquipment()]);
  };

  const updateChecklist = (field, value) => {
    setChecklist((current) => ({
      ...current,
      [field]: value,
      ...(field === 'missingEquipment' && value === false ? { missingEquipmentDetails: '' } : {}),
    }));
  };

  const updateEquipment = (index, patch) => {
    setEquipments((current) =>
      current.map((equipment, currentIndex) =>
        currentIndex === index
          ? {
              ...equipment,
              ...patch,
            }
          : equipment,
      ),
    );
  };

  const addEquipment = () => {
    setEquipments((current) => [...current, createEmptyEquipment()]);
  };

  const removeEquipment = (index) => {
    setEquipments((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleCreateReturn = async () => {
    const validationMessage = validateReturnForm({ customer, checklist, equipments });
    if (validationMessage) {
      window.showToast?.(validationMessage, 'error');
      return;
    }

    setSavingTerm(true);
    try {
      const createdReturn = await createEquipmentReturn(
        {
          customer,
          checklist,
          equipments,
        },
        userData,
      );

      generateEquipmentReturnPdf(createdReturn);
      resetForm();
      setActiveTab(TAB_REPORT);
      window.showToast?.('Termo de devolucao salvo e PDF gerado com sucesso.', 'success');
    } catch (error) {
      const message =
        error?.code === 'permission-denied'
          ? 'Sem permissao para registrar esta devolucao.'
          : 'Nao foi possivel salvar o termo de devolucao.';
      window.showToast?.(message, 'error');
    } finally {
      setSavingTerm(false);
    }
  };

  const handleRegisterErp = async () => {
    if (!erpModal.record) return;

    setSavingErp(true);
    try {
      await markEquipmentReturnErpRegistered(erpModal.record.id, erpModal.protocol);
      setErpModal({ open: false, record: null, protocol: '' });
      window.showToast?.('Devolucao marcada como registrada no ERP.', 'success');
    } catch (error) {
      window.showToast?.(
        error?.message || 'Nao foi possivel atualizar a devolucao no ERP.',
        'error',
      );
    } finally {
      setSavingErp(false);
    }
  };

  const handleCreateType = async () => {
    if (!newTypeName.trim()) {
      window.showToast?.('Informe o nome do novo tipo.', 'error');
      return;
    }

    setSavingType(true);
    try {
      await createEquipmentReturnType(newTypeName, userData);
      const types = await listEquipmentReturnTypes(userData);
      setEquipmentTypes(types);
      setNewTypeName('');
      setTypeModalOpen(false);
      window.showToast?.('Tipo de equipamento adicionado com sucesso.', 'success');
    } catch (error) {
      window.showToast?.(
        error?.message || 'Nao foi possivel criar o tipo de equipamento.',
        'error',
      );
    } finally {
      setSavingType(false);
    }
  };

  const openErpModal = (record) => {
    setErpModal({ open: true, record, protocol: '' });
  };

  const openDeleteModal = (record) => {
    setDeleteModal({ open: true, record });
  };

  const canRegisterRecord = (record) =>
    isAttendant &&
    record?.attendant?.uid === userData?.uid &&
    record?.status === EQUIPMENT_RETURN_STATUS.PENDING_ERP;

  const canDeleteRecord = (record) =>
    isAttendant &&
    record?.attendant?.uid === userData?.uid;

  const handleDeleteReturn = async () => {
    if (!deleteModal.record?.id) return;

    setDeletingReturn(true);
    try {
      await deleteEquipmentReturn(deleteModal.record.id);
      if (selectedReturn?.id === deleteModal.record.id) {
        setSelectedReturn(null);
      }
      setDeleteModal({ open: false, record: null });
      window.showToast?.('Devolucao excluida com sucesso.', 'success');
    } catch (error) {
      const message =
        error?.code === 'permission-denied'
          ? 'Sem permissao para excluir esta devolucao.'
          : error?.message || 'Nao foi possivel excluir a devolucao.';
      window.showToast?.(message, 'error');
    } finally {
      setDeletingReturn(false);
    }
  };

  return (
    <Page
      title="Devolucoes"
      subtitle="Formalize o recebimento de equipamentos devolvidos e acompanhe a baixa no ERP."
      actions={
        <Btn variant="secondary" onClick={() => setActiveTab(activeTab === TAB_NEW_TERM ? TAB_REPORT : TAB_NEW_TERM)}>
          {activeTab === TAB_NEW_TERM ? <ClipboardList size={16} /> : <FileText size={16} />}
          {activeTab === TAB_NEW_TERM ? 'Ir para o relatorio' : 'Novo termo'}
        </Btn>
      }
    >
      {catalogError ? <InfoBox type="warning">{catalogError}</InfoBox> : null}
      {returnsError ? <InfoBox type="danger">{returnsError}</InfoBox> : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <SummaryCard
          icon={<FileText size={18} />}
          label="Devolucoes"
          value={summary.total}
          accent={colors.primary}
        />
        <SummaryCard
          icon={<AlertTriangle size={18} />}
          label="Pendentes ERP"
          value={summary.pending}
          accent={colors.danger}
        />
        <SummaryCard
          icon={<CheckCircle2 size={18} />}
          label="Registradas"
          value={summary.registered}
          accent={colors.success}
        />
      </div>

      <Tabs tabs={[TAB_NEW_TERM, TAB_REPORT]} active={activeTab} onChange={setActiveTab} />

      {activeTab === TAB_NEW_TERM ? (
        <div style={{ display: 'grid', gap: '20px' }}>
          <Card
            title="Cabecalho da devolucao"
            subtitle="Dados do atendente e identificacao do cliente dentro do processo operacional."
            accent={colors.primary}
          >
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <ReadOnlyField label="Atendente logado" value={userData?.name || '-'} />
                <ReadOnlyField label="Loja" value={userData?.cityName || userData?.cityId || '-'} />
                <ReadOnlyField label="Data e horario" value={issuedAtPreview} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <Input
                  label="Nome do cliente"
                  value={customer.name}
                  onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Nome completo do cliente"
                  required
                />
                <Input
                  label="CPF"
                  value={customer.cpf}
                  onChange={(event) => setCustomer((current) => ({ ...current, cpf: event.target.value }))}
                  placeholder="000.000.000-00"
                  required
                />
                <Input
                  label="Numero do contrato"
                  value={customer.contractNumber}
                  onChange={(event) => setCustomer((current) => ({ ...current, contractNumber: event.target.value }))}
                  placeholder="Contrato ou protocolo comercial"
                  required
                />
              </div>
            </div>
          </Card>

          <Card title="Checklist operacional da devolucao" subtitle="Confirme os pontos obrigatorios do processo. O termo formal e apenas um dos itens deste checklist." accent={colors.warning}>
            <div style={{ display: 'grid', gap: '18px' }}>
              <BinaryChoiceField
                label="Equipamento devolvido na loja pelo cliente"
                value={checklist.deliveredInStore}
                onChange={(value) => updateChecklist('deliveredInStore', value)}
              />
              <BinaryChoiceField
                label="Faltou algum dos equipamentos"
                value={checklist.missingEquipment}
                onChange={(value) => updateChecklist('missingEquipment', value)}
              />
              <Input
                label="Qual equipamento faltou"
                value={checklist.missingEquipmentDetails}
                onChange={(event) => updateChecklist('missingEquipmentDetails', event.target.value)}
                placeholder="Descreva o item faltante"
                disabled={!checklist.missingEquipment}
              />
              <BinaryChoiceField
                label="Termo de devolucao emitido ou entregue"
                value={checklist.declarationDelivered}
                onChange={(value) => updateChecklist('declarationDelivered', value)}
                description="Controle operacional do checklist. Essa resposta nao aparece no documento formal."
              />
              <BinaryChoiceField
                label="Equipamento em bom estado"
                value={checklist.goodCondition}
                onChange={(value) => updateChecklist('goodCondition', value)}
              />
              <Select
                label="Equipamento desvinculado do cliente no estoque"
                value={checklist.stockUnlinkStatus}
                onChange={(event) => updateChecklist('stockUnlinkStatus', event.target.value)}
                options={STOCK_UNLINK_STATUS_OPTIONS}
                placeholder="Selecione o status"
                required
              />
              <Textarea
                label="MAC dos equipamentos devolvidos"
                value={checklist.returnedMacDescription}
                onChange={(event) => updateChecklist('returnedMacDescription', event.target.value)}
                placeholder="Liste os MACs, numeros de serie ou observacoes relevantes."
                required
              />
            </div>
          </Card>
          <Card
            title="Equipamentos devolvidos"
            subtitle="Adicione todos os itens recebidos no cancelamento."
            accent={colors.info}
            actions={
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {isAdmin ? (
                  <Btn variant="secondary" size="sm" onClick={() => setTypeModalOpen(true)}>
                    <Plus size={14} /> Novo tipo
                  </Btn>
                ) : null}
                <Btn size="sm" onClick={addEquipment}>
                  <Plus size={14} /> Adicionar equipamento
                </Btn>
              </div>
            }
          >
            {loadingCatalogs ? (
              <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Carregando tipos e sugestoes do catalogo...</div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {equipments.map((equipment, index) => (
                  <EquipmentBlock
                    key={`equipment-block-${index}`}
                    equipment={equipment}
                    index={index}
                    typeOptions={equipmentTypes}
                    routerCatalog={routerCatalog}
                    canDelete={equipments.length > 1}
                    onUpdate={updateEquipment}
                    onRemove={removeEquipment}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card title="Finalizacao" subtitle="Ao salvar, o sistema registra o checklist operacional e gera o termo formal em A4.">
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
              <InfoBox type="info">
                O termo formal nao reproduz o checklist operacional. Ele trara apenas cliente, atendente, equipamentos e assinaturas.
              </InfoBox>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Btn variant="secondary" onClick={resetForm}>
                  <X size={16} /> Limpar formulario
                </Btn>
                <Btn onClick={handleCreateReturn} loading={savingTerm}>
                  <Save size={16} /> Salvar e gerar termo
                </Btn>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          <Card title="Filtros do relatorio" subtitle="Acompanhe pendencias de ERP e consulte devolucoes e termos formais ja emitidos.">
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1.2fr) repeat(4, minmax(150px, 1fr))', gap: '12px' }}>
              <Input
                label="Buscar por cliente, CPF ou contrato"
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Digite para filtrar"
              />
              <Select
                label="Status ERP"
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                options={[
                  { value: 'all', label: 'Todos' },
                  { value: 'pending', label: 'Pendente ERP' },
                  { value: 'registered', label: 'Registrado ERP' },
                ]}
              />
              <Select
                label="Loja"
                value={filters.store}
                onChange={(event) => setFilters((current) => ({ ...current, store: event.target.value }))}
                options={[{ value: 'all', label: 'Todas as lojas' }, ...storeOptions]}
              />
              <Input
                label="Data inicial"
                type="date"
                value={filters.startDate}
                onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
              />
              <Input
                label="Data final"
                type="date"
                value={filters.endDate}
                onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
              />
            </div>
          </Card>

          <Card title="Tabela de devolucoes" subtitle="Linhas vermelhas indicam pendencia de ERP; verdes indicam processo concluido.">
            {loadingReturns ? (
              <div style={{ padding: '24px', color: 'var(--text-muted)' }}>Carregando devolucoes...</div>
            ) : filteredReturns.length === 0 ? (
              <Empty
                icon={<Search size={20} />}
                title="Nenhuma devolucao encontrada"
                description="Ajuste os filtros ou registre uma nova devolucao."
              />
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1080px' }}>
                  <thead>
                    <tr>
                      {['Status', 'Cliente', 'Contrato', 'Atendente', 'Loja', 'Data', 'Equipamentos', 'ERP', 'Acoes'].map((header) => (
                        <th
                          key={header}
                          style={{
                            padding: '14px 16px',
                            textAlign: 'left',
                            fontSize: '11px',
                            fontWeight: 900,
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            background: 'var(--bg-app)',
                            borderBottom: '1px solid var(--border)',
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReturns.map((record) => {
                      const isRegistered = record.status === EQUIPMENT_RETURN_STATUS.REGISTERED_ERP;
                      const rowBackground = isRegistered ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)';
                      const rowBorder = isRegistered ? 'rgba(16, 185, 129, 0.26)' : 'rgba(239, 68, 68, 0.24)';
                      return (
                        <tr key={record.id} style={{ background: rowBackground, borderBottom: `1px solid ${rowBorder}` }}>
                          <td style={tableCellStyle}>
                            <StatusBadge status={record.status} />
                          </td>
                          <td style={tableCellStyle}>
                            <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{record.customer?.name || '-'}</div>
                            <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>{record.customer?.cpf || '-'}</div>
                          </td>
                          <td style={tableCellStyle}>{record.customer?.contractNumber || '-'}</td>
                          <td style={tableCellStyle}>{record.attendant?.name || '-'}</td>
                          <td style={tableCellStyle}>{record.attendant?.storeName || record.attendant?.storeId || '-'}</td>
                          <td style={tableCellStyle}>{formatEquipmentReturnDateTime(record.termIssuedAt || record.createdAt)}</td>
                          <td style={tableCellStyle}>
                            <div style={{ display: 'grid', gap: '4px' }}>
                              {record.equipments?.slice(0, 2).map((equipment, index) => (
                                <div key={`${record.id}-equipment-${index}`} style={{ fontSize: '12px', color: 'var(--text-main)' }}>
                                  <strong>{equipment.nickname}</strong> · {equipment.identifierValue || '-'}
                                </div>
                              ))}
                              {(record.equipments?.length || 0) > 2 ? (
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                  +{record.equipments.length - 2} item(ns)
                                </div>
                              ) : null}
                            </div>
                          </td>
                          <td style={tableCellStyle}>
                            {record.erp?.registered ? (
                              <div style={{ display: 'grid', gap: '4px' }}>
                                <div style={{ fontWeight: 800, color: colors.success }}>{record.erp.protocol}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                  {formatEquipmentReturnDateTime(record.erp.registeredAt)}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: colors.danger, fontWeight: 800 }}>Nao registrado</span>
                            )}
                          </td>
                          <td style={tableCellStyle}>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <Btn variant="secondary" size="sm" onClick={() => setSelectedReturn(record)}>
                                <Eye size={14} /> Ver
                              </Btn>
                              <Btn variant="secondary" size="sm" onClick={() => generateEquipmentReturnPdf(record)}>
                                <Printer size={14} /> Reimprimir
                              </Btn>
                              {canRegisterRecord(record) ? (
                                <Btn size="sm" onClick={() => openErpModal(record)}>
                                  <CheckCircle2 size={14} /> Registrar ERP
                                </Btn>
                              ) : null}
                              {canDeleteRecord(record) ? (
                                <Btn variant="danger" size="sm" onClick={() => openDeleteModal(record)}>
                                  <Trash2 size={14} /> Excluir
                                </Btn>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      <Modal
        open={Boolean(selectedReturn)}
        onClose={() => setSelectedReturn(null)}
        title="Detalhes da devolucao"
        size="lg"
        footer={
          selectedReturn ? (
            <>
              {canDeleteRecord(selectedReturn) ? (
                <Btn variant="danger" onClick={() => openDeleteModal(selectedReturn)}>
                  <Trash2 size={14} /> Excluir devolucao
                </Btn>
              ) : null}
              <Btn variant="secondary" onClick={() => generateEquipmentReturnPdf(selectedReturn)}>
                <Printer size={14} /> Reimprimir termo
              </Btn>
              {canRegisterRecord(selectedReturn) ? (
                <Btn onClick={() => openErpModal(selectedReturn)}>
                  <CheckCircle2 size={14} /> Registrar ERP
                </Btn>
              ) : null}
            </>
          ) : null
        }
      >
        {selectedReturn ? (
          <div style={{ display: 'grid', gap: '18px' }}>
            <InfoBox type={selectedReturn.status === EQUIPMENT_RETURN_STATUS.REGISTERED_ERP ? 'success' : 'warning'}>
              <strong>Status atual:</strong> {selectedReturn.status === EQUIPMENT_RETURN_STATUS.REGISTERED_ERP ? 'Devolucao registrada no ERP.' : 'Aguardando baixa no ERP.'}
            </InfoBox>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <ReadOnlyField label="Cliente" value={selectedReturn.customer?.name} />
              <ReadOnlyField label="CPF" value={selectedReturn.customer?.cpf} />
              <ReadOnlyField label="Contrato" value={selectedReturn.customer?.contractNumber} />
              <ReadOnlyField label="Atendente" value={selectedReturn.attendant?.name} />
              <ReadOnlyField label="Loja" value={selectedReturn.attendant?.storeName || selectedReturn.attendant?.storeId} />
              <ReadOnlyField label="Emitido em" value={formatEquipmentReturnDateTime(selectedReturn.termIssuedAt || selectedReturn.createdAt)} />
            </div>

            <Card title="Termo formal" accent={colors.primary}>
              <div style={{ display: 'grid', gap: '10px' }}>
                <DetailRow label="Documento" value="Termo de Devolucao de Equipamentos" />
                <DetailRow label="Emitido em" value={formatEquipmentReturnDateTime(selectedReturn.termIssuedAt || selectedReturn.createdAt)} />
                <DetailRow label="Conteudo" value="Atendente, cliente, contrato, equipamentos e assinaturas" />
              </div>
              <div style={{ marginTop: '14px' }}>
                <InfoBox type="info">
                  O checklist operacional nao faz parte do documento formal. Use a acao de reimpressao para gerar o termo novamente.
                </InfoBox>
              </div>
            </Card>

            <Card title="Checklist operacional registrado" accent={colors.warning}>
              <div style={{ display: 'grid', gap: '10px' }}>
                <DetailRow label="Equipamento devolvido na loja" value={formatYesNo(selectedReturn.checklist?.deliveredInStore)} />
                <DetailRow label="Faltou equipamento" value={formatYesNo(selectedReturn.checklist?.missingEquipment)} />
                <DetailRow label="Qual equipamento faltou" value={selectedReturn.checklist?.missingEquipmentDetails || '-'} />
                <DetailRow label="Termo emitido ou entregue" value={formatYesNo(selectedReturn.checklist?.declarationDelivered)} />
                <DetailRow label="Equipamento em bom estado" value={formatYesNo(selectedReturn.checklist?.goodCondition)} />
                <DetailRow label="Status no estoque" value={formatStockUnlinkStatus(selectedReturn.checklist?.stockUnlinkStatus)} />
                <DetailRow label="MACs descritos" value={selectedReturn.checklist?.returnedMacDescription || '-'} />
              </div>
            </Card>

            <Card title="Equipamentos" accent={colors.info}>
              <div style={{ display: 'grid', gap: '12px' }}>
                {selectedReturn.equipments?.map((equipment, index) => (
                  <div
                    key={`${selectedReturn.id}-detail-equipment-${index}`}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: '14px',
                      padding: '14px 16px',
                      background: 'var(--bg-app)',
                    }}
                  >
                    <div style={{ fontWeight: 800, color: 'var(--text-main)' }}>{equipment.nickname || `Equipamento ${index + 1}`}</div>
                    <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      {equipment.typeLabel || '-'} · {[equipment.brand, equipment.model].filter(Boolean).join(' / ') || '-'}
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-main)' }}>
                      <strong>{equipment.identifierLabel || 'MAC ou Similar'}:</strong> {equipment.identifierValue || '-'}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="ERP" accent={selectedReturn.erp?.registered ? colors.success : colors.danger}>
              <div style={{ display: 'grid', gap: '10px' }}>
                <DetailRow label="Registrado no ERP" value={selectedReturn.erp?.registered ? 'Sim' : 'Nao'} />
                <DetailRow label="Protocolo" value={selectedReturn.erp?.protocol || '-'} />
                <DetailRow label="Data de registro" value={formatEquipmentReturnDateTime(selectedReturn.erp?.registeredAt)} />
              </div>
            </Card>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, record: null })}
        title="Excluir devolucao"
        footer={
          <>
            <Btn variant="secondary" onClick={() => setDeleteModal({ open: false, record: null })}>
              Cancelar
            </Btn>
            <Btn variant="danger" onClick={handleDeleteReturn} loading={deletingReturn}>
              <Trash2 size={14} /> Confirmar exclusao
            </Btn>
          </>
        }
      >
        <div style={{ display: 'grid', gap: '14px' }}>
          <InfoBox type="danger">
            Esta acao exclui permanentemente a devolucao selecionada. Confirme apenas se o registro realmente deve ser removido.
          </InfoBox>
          <div
            style={{
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '14px 16px',
              background: 'var(--bg-app)',
              display: 'grid',
              gap: '10px',
            }}
          >
            <DetailRow label="Cliente" value={deleteModal.record?.customer?.name || '-'} />
            <DetailRow label="CPF" value={deleteModal.record?.customer?.cpf || '-'} />
            <DetailRow label="Contrato" value={deleteModal.record?.customer?.contractNumber || '-'} />
            <DetailRow
              label="Emitido em"
              value={formatEquipmentReturnDateTime(deleteModal.record?.termIssuedAt || deleteModal.record?.createdAt)}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={erpModal.open}
        onClose={() => setErpModal({ open: false, record: null, protocol: '' })}
        title="Registrar devolucao no ERP"
        footer={
          <>
            <Btn variant="secondary" onClick={() => setErpModal({ open: false, record: null, protocol: '' })}>
              Cancelar
            </Btn>
            <Btn onClick={handleRegisterErp} loading={savingErp}>
              <CheckCircle2 size={14} /> Confirmar registro
            </Btn>
          </>
        }
      >
        <div style={{ display: 'grid', gap: '14px' }}>
          <InfoBox type="info">
            Informe o protocolo de desvinculacao do equipamento para concluir esta etapa.
          </InfoBox>
          <Input
            label="Numero do protocolo"
            value={erpModal.protocol}
            onChange={(event) => setErpModal((current) => ({ ...current, protocol: event.target.value }))}
            placeholder="Ex: ERP-2026-000123"
            required
          />
        </div>
      </Modal>

      <Modal
        open={typeModalOpen}
        onClose={() => setTypeModalOpen(false)}
        title="Novo tipo de equipamento"
        footer={
          <>
            <Btn variant="secondary" onClick={() => setTypeModalOpen(false)}>
              Cancelar
            </Btn>
            <Btn onClick={handleCreateType} loading={savingType}>
              <Plus size={14} /> Adicionar tipo
            </Btn>
          </>
        }
      >
        <div style={{ display: 'grid', gap: '14px' }}>
          <InfoBox type="info">
            Este novo tipo ficara disponivel para todos os usuarios do modulo.
          </InfoBox>
          <Input
            label="Nome do tipo"
            value={newTypeName}
            onChange={(event) => setNewTypeName(event.target.value)}
            placeholder="Ex: Repetidor Mesh"
            required
          />
        </div>
      </Modal>
    </Page>
  );
}

function validateReturnForm({ customer, checklist, equipments }) {
  if (!customer.name.trim()) return 'Informe o nome do cliente.';
  if (!customer.cpf.trim()) return 'Informe o CPF do cliente.';
  if (!customer.contractNumber.trim()) return 'Informe o numero do contrato.';

  const requiredBinaryFields = [
    ['deliveredInStore', 'Confirme se o equipamento foi devolvido na loja.'],
    ['missingEquipment', 'Confirme se faltou algum equipamento.'],
    ['declarationDelivered', 'Confirme se o termo de devolucao foi emitido ou entregue.'],
    ['goodCondition', 'Confirme o estado do equipamento.'],
  ];

  for (const [field, message] of requiredBinaryFields) {
    if (checklist[field] === null) {
      return message;
    }
  }

  if (checklist.missingEquipment && !checklist.missingEquipmentDetails.trim()) {
    return 'Descreva qual equipamento ficou faltando.';
  }

  if (!checklist.stockUnlinkStatus) {
    return 'Informe o status de desvinculacao no estoque.';
  }

  if (!checklist.returnedMacDescription.trim()) {
    return 'Descreva os MACs ou identificadores devolvidos no checklist.';
  }

  if (!equipments.length) {
    return 'Adicione ao menos um equipamento devolvido.';
  }

  for (const [index, equipment] of equipments.entries()) {
    if (!equipment.typeId) return `Selecione o tipo do equipamento ${index + 1}.`;
    if (equipment.typeId === 'outro' && !equipment.customTypeDescription.trim()) {
      return `Descreva o tipo do equipamento ${index + 1}.`;
    }
    if (!equipment.brand.trim()) return `Informe a marca do equipamento ${index + 1}.`;
    if (!equipment.model.trim()) return `Informe o modelo do equipamento ${index + 1}.`;
    if (!equipment.identifierLabel.trim()) return `Informe o nome do identificador do equipamento ${index + 1}.`;
    if (!equipment.identifierValue.trim()) return `Informe o codigo do equipamento ${index + 1}.`;
  }

  return '';
}

function parseRecordDate(record) {
  const candidate = record?.termIssuedAt || record?.createdAt || record?.updatedAt;
  if (!candidate) return null;
  if (typeof candidate?.toDate === 'function') return candidate.toDate();
  if (candidate instanceof Date) return candidate;
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? null : date;
}

const tableCellStyle = {
  padding: '14px 16px',
  color: 'var(--text-main)',
  verticalAlign: 'top',
  fontSize: '13px',
};
