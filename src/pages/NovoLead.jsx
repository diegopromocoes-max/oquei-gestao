import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Home,
  Loader2,
  Mail,
  MapPin,
  Phone,
  PlusCircle,
  Search,
  ShieldAlert,
  Store,
  Tag,
  User,
  Users,
  Zap,
} from 'lucide-react';

import LeadAddressMapModal from '../components/LeadAddressMapModal';
import LeadChoiceGrid from '../components/leadCapture/LeadChoiceGrid';
import LeadDraftSummary from '../components/leadCapture/LeadDraftSummary';
import LeadFlowProgress from '../components/leadCapture/LeadFlowProgress';
import { Btn, Card, InfoBox, Modal, colors, styles as uiStyles } from '../components/ui';
import { LEAD_GEO_STATUS, normalizeLeadGeoStatus } from '../lib/leadGeo';
import { getCategories, getCities, getProducts } from '../services/catalog';
import { listGrowthActionsForCity } from '../services/atendenteDashboardService';
import { createLead, listAttendantLeadOptions } from '../services/leads';
import { createLeadOrigin, listLeadOrigins, NEW_LEAD_ORIGIN_VALUE } from '../services/leadOriginsService';
import { listLeadPartnershipSources } from '../services/leadPartnershipSourceService';
import {
  createLeadDiscardReason,
  listLeadDiscardReasons,
  NEW_LEAD_DISCARD_REASON_VALUE,
} from '../services/leadDiscardReasonsService';

const FLOW_ORDER = ['context', 'origin', 'offer', 'client'];

const STATUS_OPTIONS = [
  {
    value: 'Em negociacao',
    label: 'Em negociacao',
    helper: 'Lead entra em acompanhamento comercial.',
    accent: colors.warning,
    Icon: Tag,
  },
  {
    value: 'Contratado',
    label: 'Contratado',
    helper: 'Venda fechada aguardando evolucao operacional.',
    accent: colors.primary,
    Icon: CheckCircle2,
  },
  {
    value: 'Instalado',
    label: 'Instalado',
    helper: 'Venda concluida com entrega ja realizada.',
    accent: colors.success,
    Icon: Zap,
  },
  {
    value: 'Descartado',
    label: 'Descartado',
    helper: 'Lead sai do funil com motivo registrado.',
    accent: colors.danger,
    Icon: ShieldAlert,
  },
];

const OPTIONAL_CLIENT_FIELDS = [
  { key: 'tel', label: 'Adicionar telefone', Icon: Phone },
  { key: 'email', label: 'Adicionar email', Icon: Mail },
  { key: 'cpf', label: 'Adicionar CPF', Icon: CreditCard },
];

function buildEmptyForm(userData) {
  return {
    date: new Date().toISOString().slice(0, 10),
    nome: '',
    tel: '',
    email: '',
    cpf: '',
    cidade: userData?.cityId || '',
    logradouro: '',
    numero: '',
    bairro: '',
    categoria: '',
    produto: '',
    status: 'Em negociacao',
    originCatalogId: 'whatsapp',
    originName: 'WhatsApp',
    originKind: 'standard',
    originSourceType: null,
    originSourceId: null,
    originSourceName: null,
    indicationName: '',
    indicationLeadId: null,
    discardMotive: '',
    fidelityMonth: '',
    geoLat: null,
    geoLng: null,
    geoStatus: 'pending',
    geoFormattedAddress: '',
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

function formatDateLabel(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))
    ? String(value).split('-').reverse().join('/')
    : '--/--/----';
}

function buildOriginHelper(origin = {}) {
  if (origin?.systemKey === 'indicacao') return 'Abre mini fluxo para vincular quem indicou.';
  if (origin?.systemKey === 'acao_crescimento') return 'Conecta o lead a uma acao do Hub.';
  if (origin?.systemKey === 'acao_parceria') return 'Relaciona o lead a um parceiro ou evento.';
  return 'Canal de entrada para leitura comercial futura.';
}

function sectionCardStyle(active, accent) {
  return {
    borderRadius: '26px',
    border: `1px solid ${active ? accent : 'rgba(148,163,184,0.18)'}`,
    background: active
      ? `linear-gradient(180deg, ${accent}0f, rgba(255,255,255,0.96))`
      : 'var(--bg-card)',
    boxShadow: active ? `0 18px 40px ${accent}15` : 'var(--shadow-sm)',
    overflow: 'hidden',
  };
}

function FieldLabel({ children }) {
  return (
    <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {children}
    </label>
  );
}

function SectionShell({
  id,
  title,
  helper,
  accent,
  active,
  state,
  summary,
  onSelect,
  children,
  warning,
}) {
  const stateLabel = state === 'complete' ? 'Concluido' : state === 'optional' ? 'Opcional' : active ? 'Em foco' : 'Pendente';
  const stateColor = state === 'complete' ? colors.success : state === 'optional' ? colors.warning : active ? accent : 'var(--text-muted)';

  return (
    <div id={`lead-flow-${id}`}>
      <Card size="lg" style={sectionCardStyle(active, accent)}>
        <div style={{ display: 'grid', gap: '16px' }}>
          <button
            type="button"
            onClick={() => onSelect?.(id)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '16px',
              alignItems: 'flex-start',
              width: '100%',
              textAlign: 'left',
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'grid', gap: '6px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 900, color: stateColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '999px', background: stateColor }} />
                {stateLabel}
              </div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>{title}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '680px' }}>{helper}</div>
            </div>

            {!active ? (
              <div style={{ maxWidth: '320px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6, textAlign: 'right' }}>
                {summary}
              </div>
            ) : null}
          </button>

          {warning ? <InfoBox type="warning">{warning}</InfoBox> : null}

          {active ? children : null}
        </div>
      </Card>
    </div>
  );
}

export default function NovoLead({ userData, onNavigate }) {
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [cities, setCities] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [origins, setOrigins] = useState([]);
  const [growthActions, setGrowthActions] = useState([]);
  const [partnershipSources, setPartnershipSources] = useState([]);
  const [discardReasons, setDiscardReasons] = useState([]);
  const [myLeads, setMyLeads] = useState([]);
  const [myLeadsLoading, setMyLeadsLoading] = useState(false);
  const [myLeadsOpen, setMyLeadsOpen] = useState(false);
  const [myLeadSearch, setMyLeadSearch] = useState('');
  const [newOriginName, setNewOriginName] = useState('');
  const [creatingOrigin, setCreatingOrigin] = useState(false);
  const [showNewOriginCreator, setShowNewOriginCreator] = useState(false);
  const [newDiscardReasonName, setNewDiscardReasonName] = useState('');
  const [creatingDiscardReason, setCreatingDiscardReason] = useState(false);
  const [showNewDiscardReasonCreator, setShowNewDiscardReasonCreator] = useState(false);
  const [originsError, setOriginsError] = useState('');
  const [partnershipError, setPartnershipError] = useState('');
  const [growthActionsError, setGrowthActionsError] = useState('');
  const [discardReasonError, setDiscardReasonError] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('context');
  const [showSubmitErrors, setShowSubmitErrors] = useState(false);
  const [optionalFieldsOpen, setOptionalFieldsOpen] = useState({
    tel: false,
    email: false,
    cpf: false,
  });
  const [manualAddressOpen, setManualAddressOpen] = useState(false);
  const [form, setForm] = useState(() => buildEmptyForm(userData));

  useEffect(() => {
    setForm(buildEmptyForm(userData));
    setActiveSection('context');
    setShowSubmitErrors(false);
    setManualAddressOpen(false);
    setOptionalFieldsOpen({ tel: false, email: false, cpf: false });
  }, [userData]);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getCities(), getCategories(), getProducts(true), listLeadOrigins(), listLeadDiscardReasons()])
      .then((results) => {
        if (!active) return;
        const [citiesResult, categoriesResult, productsResult, originsResult, discardReasonsResult] = results;

        if (citiesResult.status === 'fulfilled') setCities(citiesResult.value);
        if (categoriesResult.status === 'fulfilled') setCategories(categoriesResult.value);
        if (productsResult.status === 'fulfilled') setProducts(productsResult.value);
        if (originsResult.status === 'fulfilled') setOrigins(originsResult.value);
        if (discardReasonsResult.status === 'fulfilled') setDiscardReasons(discardReasonsResult.value);

        const rejected = results.filter((item) => item.status === 'rejected');
        if (rejected.length > 0) {
          rejected.forEach((item) => console.error('Erro ao carregar catalogos do lead:', item.reason));
          const onlyPermissionIssues = rejected.every((item) => item.reason?.code === 'permission-denied');
          if (!onlyPermissionIssues) {
            window.showToast?.('Alguns catalogos do novo lead nao puderam ser carregados.', 'warning');
          }
        }
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedOrigin = useMemo(
    () => origins.find((origin) => origin.id === form.originCatalogId) || null,
    [form.originCatalogId, origins],
  );
  const filteredProducts = useMemo(
    () => (form.categoria ? products.filter((product) => product.categoryId === form.categoria || product.category === form.categoria) : []),
    [form.categoria, products],
  );
  const filteredLeadOptions = useMemo(() => {
    const search = myLeadSearch.trim().toLowerCase();
    if (!search) return myLeads;
    return myLeads.filter((lead) =>
      [lead.customerName, lead.customerPhone, lead.customerEmail, lead.date]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(search),
    );
  }, [myLeadSearch, myLeads]);
  const selectedCity = useMemo(
    () => cities.find((city) => city.id === form.cidade || city.cityId === form.cidade) || null,
    [cities, form.cidade],
  );
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === form.categoria) || null,
    [categories, form.categoria],
  );
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === form.produto) || null,
    [products, form.produto],
  );

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    window.requestAnimationFrame(() => {
      document.getElementById(`lead-flow-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const contextIssues = useMemo(() => {
    const issues = [];
    if (!form.cidade) issues.push('Selecione a loja/cidade do lead.');
    return issues;
  }, [form.cidade]);

  const originIssues = useMemo(() => {
    const issues = [];
    if (!form.originCatalogId) issues.push('Escolha a origem do lead.');
    if (selectedOrigin?.systemKey === 'acao_parceria' && !form.originSourceId) {
      issues.push('Selecione o evento ou acao parceira.');
    }
    if (selectedOrigin?.systemKey === 'acao_crescimento' && !form.originSourceId) {
      issues.push('Selecione a acao do Hub.');
    }
    if (selectedOrigin?.systemKey === 'indicacao' && !String(form.indicationName || '').trim()) {
      issues.push('Informe quem indicou esse lead.');
    }
    return issues;
  }, [form.indicationName, form.originCatalogId, form.originSourceId, selectedOrigin?.systemKey]);

  const offerIssues = useMemo(() => {
    const issues = [];
    if (!form.categoria) issues.push('Selecione a categoria.');
    if (!form.produto) issues.push('Selecione o produto principal.');
    if (!form.status) issues.push('Defina o status inicial.');
    if (form.status === 'Descartado' && !String(form.discardMotive || '').trim()) {
      issues.push('Escolha o motivo do descarte.');
    }
    return issues;
  }, [form.categoria, form.discardMotive, form.produto, form.status]);

  const contextComplete = contextIssues.length === 0;
  const originComplete = Boolean(form.originCatalogId) && originIssues.length === 0;
  const offerComplete = offerIssues.length === 0;
  const clientTouched = Boolean(
    form.nome
    || form.tel
    || form.email
    || form.cpf
    || form.logradouro
    || form.numero
    || form.bairro
    || form.geoLat
    || form.geoLng
  );
  const readyToSave = contextComplete && originComplete && offerComplete;
  const missingEssentials = [...contextIssues, ...originIssues, ...offerIssues];

  const flowSections = [
    {
      id: 'context',
      title: 'Contexto',
      helper: 'Data do lead e loja responsavel pela captura.',
      Icon: Store,
      accent: colors.primary,
      state: contextComplete ? 'complete' : 'pending',
    },
    {
      id: 'origin',
      title: 'Origem',
      helper: 'Canal de entrada e variacoes condicionais do fluxo.',
      Icon: Tag,
      accent: colors.warning,
      state: originComplete ? 'complete' : 'pending',
    },
    {
      id: 'offer',
      title: 'Oferta',
      helper: 'Categoria, produto e status inicial do lead.',
      Icon: Zap,
      accent: colors.success,
      state: offerComplete ? 'complete' : 'pending',
    },
    {
      id: 'client',
      title: 'Cliente e localizacao',
      helper: 'Dados opcionais, endereco e ponto confirmado no mapa.',
      Icon: User,
      accent: colors.info,
      state: clientTouched ? 'complete' : 'optional',
    },
  ];

  const summaryItems = [
    {
      id: 'summary-customer',
      sectionId: 'client',
      kind: 'customer',
      label: 'Cliente',
      value: form.nome || 'Lead sem nome definido ainda',
      helper: form.tel || 'Dados pessoais seguem opcionais neste momento.',
      accent: colors.primary,
    },
    {
      id: 'summary-city',
      sectionId: 'context',
      kind: 'city',
      label: 'Loja / cidade',
      value: selectedCity?.name || selectedCity?.nome || 'Nao definida',
      helper: `Data do lead: ${formatDateLabel(form.date)}`,
      accent: colors.success,
    },
    {
      id: 'summary-origin',
      sectionId: 'origin',
      kind: 'origin',
      label: 'Origem',
      value: form.originName || 'Origem pendente',
      helper: selectedOrigin?.systemKey === 'indicacao'
        ? `Indicacao: ${form.indicationName || 'Pendente'}`
        : form.originSourceName || 'Canal principal do lead',
      accent: colors.warning,
    },
    {
      id: 'summary-product',
      sectionId: 'offer',
      kind: 'product',
      label: 'Oferta',
      value: selectedProduct?.name || 'Produto pendente',
      helper: selectedCategory?.name || 'Categoria ainda nao definida',
      accent: colors.purple,
    },
    {
      id: 'summary-status',
      sectionId: 'offer',
      kind: 'status',
      label: 'Status de entrada',
      value: form.status || 'Nao definido',
      helper: form.status === 'Descartado' ? `Motivo: ${form.discardMotive || 'Pendente'}` : 'Lead segue ativo no funil comercial.',
      accent: form.status === 'Descartado' ? colors.danger : colors.info,
    },
    {
      id: 'summary-location',
      sectionId: 'client',
      kind: 'location',
      label: 'Localizacao',
      value: form.geoLat && form.geoLng
        ? 'Ponto confirmado no mapa'
        : [form.logradouro, form.numero, form.bairro].filter(Boolean).join(', ') || 'Endereco ainda nao informado',
      helper: form.geoLat && form.geoLng
        ? `Coordenadas confirmadas (${normalizeLeadGeoStatus(form.geoStatus)})`
        : 'Use o mapa livre para marcar o ponto com mais precisao.',
      accent: colors.info,
    },
  ];

  const selectedOriginCards = useMemo(
    () => origins.map((origin) => ({
      value: origin.id,
      label: origin.name,
      helper: buildOriginHelper(origin),
      accent: origin.systemKey === 'indicacao'
        ? colors.success
        : origin.systemKey === 'acao_parceria'
          ? colors.warning
          : origin.systemKey === 'acao_crescimento'
            ? colors.info
            : colors.primary,
      Icon: origin.systemKey === 'indicacao' ? Users : origin.systemKey === 'acao_parceria' ? Tag : origin.systemKey === 'acao_crescimento' ? Zap : Home,
    })),
    [origins],
  );

  const categoryCards = useMemo(
    () => categories.map((category) => ({
      value: category.id,
      label: category.name,
      helper: 'Agrupa os produtos disponiveis para este lead.',
      accent: colors.primary,
      Icon: Tag,
    })),
    [categories],
  );

  const productCards = useMemo(
    () => filteredProducts.map((product) => ({
      value: product.id,
      label: product.name,
      helper: selectedCategory?.name || 'Produto principal do lead.',
      accent: colors.success,
      Icon: Zap,
    })),
    [filteredProducts, selectedCategory?.name],
  );

  const hiddenClientFieldCount = OPTIONAL_CLIENT_FIELDS.filter((field) => !optionalFieldsOpen[field.key] && !form[field.key]).length;

  useEffect(() => {
    if (!selectedOrigin) return;
    setForm((current) => ({
      ...current,
      originName: selectedOrigin.name,
      originKind: selectedOrigin.kind || 'standard',
    }));
  }, [selectedOrigin]);

  useEffect(() => {
    if (!form.cidade || selectedOrigin?.systemKey !== 'acao_crescimento') {
      setGrowthActions([]);
      setGrowthActionsError('');
      return;
    }

    let active = true;
    listGrowthActionsForCity(form.cidade)
      .then((items) => {
        if (!active) return;
        setGrowthActions(items);
        setGrowthActionsError('');
      })
      .catch((error) => {
        console.error('Erro ao carregar acoes do Hub:', error);
        if (!active) return;
        setGrowthActions([]);
        setGrowthActionsError('Nao foi possivel carregar as acoes do Hub.');
      });

    return () => {
      active = false;
    };
  }, [form.cidade, selectedOrigin?.systemKey]);

  useEffect(() => {
    if (!form.cidade || selectedOrigin?.systemKey !== 'acao_parceria') {
      setPartnershipSources([]);
      setPartnershipError('');
      return;
    }

    let active = true;
    listLeadPartnershipSources(form.cidade)
      .then((items) => {
        if (!active) return;
        setPartnershipSources(items);
        setPartnershipError('');
      })
      .catch((error) => {
        console.error('Erro ao carregar fontes de parceria:', error);
        if (!active) return;
        setPartnershipSources([]);
        setPartnershipError('Nao foi possivel carregar as acoes e eventos parceiros.');
      });

    return () => {
      active = false;
    };
  }, [form.cidade, selectedOrigin?.systemKey]);

  const resetSourceSelection = () => ({
    originSourceType: null,
    originSourceId: null,
    originSourceName: null,
  });

  const resetIndicationSelection = () => ({
    indicationName: '',
    indicationLeadId: null,
  });

  const advanceToNextRequiredSection = (currentSectionId) => {
    const currentIndex = FLOW_ORDER.indexOf(currentSectionId);
    const nextSectionId = FLOW_ORDER[currentIndex + 1];
    if (nextSectionId) {
      scrollToSection(nextSectionId);
    }
  };

  const handleFieldChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const openClientField = (fieldKey) => {
    setOptionalFieldsOpen((current) => ({ ...current, [fieldKey]: true }));
  };

  const handlePhoneChange = (event) => {
    openClientField('tel');
    setForm((current) => ({ ...current, tel: formatPhone(event.target.value) }));
  };

  const handleAddressFieldChange = (field, value) => {
    setManualAddressOpen(true);
    setForm((current) => ({
      ...current,
      [field]: value,
      geoStatus: current.geoLat || current.geoLng ? 'pending' : current.geoStatus,
      geoFormattedAddress: field === 'logradouro' || field === 'numero' || field === 'bairro' ? '' : current.geoFormattedAddress,
      geoLat: field === 'logradouro' || field === 'numero' || field === 'bairro' ? null : current.geoLat,
      geoLng: field === 'logradouro' || field === 'numero' || field === 'bairro' ? null : current.geoLng,
    }));
  };

  const handleOriginChange = (value) => {
    if (value === NEW_LEAD_ORIGIN_VALUE) {
      setShowNewOriginCreator(true);
      return;
    }

    const origin = origins.find((item) => item.id === value);
    const requiresExtra = ['indicacao', 'acao_parceria', 'acao_crescimento'].includes(origin?.systemKey);
    setShowNewOriginCreator(false);
    setOriginsError('');

    setForm((current) => ({
      ...current,
      originCatalogId: value,
      originName: origin?.name || current.originName,
      originKind: origin?.kind || 'standard',
      ...(origin?.systemKey === 'indicacao' ? {} : resetIndicationSelection()),
      ...(origin?.systemKey === 'acao_parceria' || origin?.systemKey === 'acao_crescimento' ? {} : resetSourceSelection()),
    }));

    if (!requiresExtra) {
      advanceToNextRequiredSection('origin');
    }
  };

  const handleCreateOrigin = async () => {
    if (!newOriginName.trim()) {
      setOriginsError('Digite o nome da nova origem antes de salvar.');
      return;
    }

    try {
      setCreatingOrigin(true);
      const createdOrigin = await createLeadOrigin(newOriginName, userData);
      setOrigins((current) =>
        [...current.filter((item) => item.id !== createdOrigin.id), createdOrigin]
          .sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''))),
      );
      setForm((current) => ({
        ...current,
        originCatalogId: createdOrigin.id,
        originName: createdOrigin.name,
        originKind: createdOrigin.kind || 'custom',
      }));
      setNewOriginName('');
      setShowNewOriginCreator(false);
      setOriginsError('');
      window.showToast?.('Nova origem criada com sucesso.', 'success');
      advanceToNextRequiredSection('origin');
    } catch (error) {
      console.error('Erro ao criar origem:', error);
      setOriginsError(error.message || 'Nao foi possivel criar a nova origem.');
    } finally {
      setCreatingOrigin(false);
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
      setForm((current) => ({
        ...current,
        discardMotive: createdReason.name,
      }));
      setNewDiscardReasonName('');
      setShowNewDiscardReasonCreator(false);
      setDiscardReasonError('');
      window.showToast?.('Novo motivo de descarte salvo.', 'success');
      advanceToNextRequiredSection('offer');
    } catch (error) {
      console.error('Erro ao criar motivo de descarte:', error);
      setDiscardReasonError(error.message || 'Nao foi possivel criar o novo motivo.');
    } finally {
      setCreatingDiscardReason(false);
    }
  };

  const openMyLeadsSelector = async () => {
    setMyLeadsOpen(true);
    setMyLeadSearch('');
    if (myLeads.length > 0 || myLeadsLoading) return;

    try {
      setMyLeadsLoading(true);
      const leads = await listAttendantLeadOptions(userData?.uid);
      setMyLeads(leads);
    } catch (error) {
      console.error('Erro ao carregar os leads do atendente:', error);
      window.showToast?.('Nao foi possivel carregar seus leads.', 'error');
    } finally {
      setMyLeadsLoading(false);
    }
  };

  const handleCategoryChange = (value) => {
    setForm((current) => ({
      ...current,
      categoria: value,
      produto: '',
    }));
  };

  const handleProductChange = (value) => {
    setForm((current) => ({
      ...current,
      produto: value,
    }));
  };

  const handleStatusChange = (value) => {
    setForm((current) => ({
      ...current,
      status: value,
      ...(value === 'Descartado' ? {} : { discardMotive: '', fidelityMonth: '' }),
    }));
    if (value !== 'Descartado') {
      setShowNewDiscardReasonCreator(false);
      setDiscardReasonError('');
    }
    if (value !== 'Descartado' && form.categoria && form.produto) {
      advanceToNextRequiredSection('offer');
    }
  };

  const validateAndFocusFirstInvalidSection = () => {
    if (!contextComplete) {
      scrollToSection('context');
      return false;
    }
    if (!originComplete) {
      scrollToSection('origin');
      return false;
    }
    if (!offerComplete) {
      scrollToSection('offer');
      return false;
    }
    return true;
  };

  const handleSubmit = async (event) => {
    event?.preventDefault();
    setShowSubmitErrors(true);

    if (!validateAndFocusFirstInvalidSection()) {
      window.showToast?.('Complete os dados essenciais para registrar o lead.', 'warning');
      return;
    }

    try {
      setLoading(true);
      await createLead(form, userData, selectedCity, selectedCategory, selectedProduct);
      window.showToast?.('Lead criado com sucesso.', 'success');
      setForm(buildEmptyForm(userData));
      setActiveSection('context');
      setShowSubmitErrors(false);
      setManualAddressOpen(false);
      setOptionalFieldsOpen({ tel: false, email: false, cpf: false });
      onNavigate?.('clientes');
    } catch (error) {
      console.error('Erro ao criar lead:', error);
      window.showToast?.('Nao foi possivel registrar o lead.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderContextBlock = () => (
    <SectionShell
      id="context"
      title="Contexto"
      helper="Comece pelo minimo necessario para posicionar o lead no tempo e na loja correta."
      accent={colors.primary}
      active={activeSection === 'context'}
      state={contextComplete ? 'complete' : 'pending'}
      summary={selectedCity?.name || selectedCity?.nome ? `${selectedCity?.name || selectedCity?.nome} • ${formatDateLabel(form.date)}` : 'Selecione a loja e confirme a data do lead.'}
      onSelect={scrollToSection}
      warning={showSubmitErrors && contextIssues.length ? contextIssues[0] : ''}
    >
      <div style={{ display: 'grid', gap: '18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <div style={{ display: 'grid', gap: '6px' }}>
            <FieldLabel>Data do lead</FieldLabel>
            <div style={{ position: 'relative' }}>
              <CalendarDays size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="date"
                value={form.date}
                onChange={(event) => handleFieldChange('date', event.target.value)}
                style={{ ...uiStyles.input, paddingLeft: '38px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gap: '6px' }}>
            <FieldLabel>Loja / cidade</FieldLabel>
            <div style={{ position: 'relative' }}>
              <Store size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
              <select
                value={form.cidade}
                onChange={(event) => {
                  handleFieldChange('cidade', event.target.value);
                  if (event.target.value) {
                    advanceToNextRequiredSection('context');
                  }
                }}
                style={{ ...uiStyles.select, paddingLeft: '38px' }}
              >
                <option value="">Selecione a cidade</option>
                {cities.map((city) => (
                  <option key={city.id || city.cityId} value={city.id || city.cityId}>
                    {city.name || city.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <InfoBox type="info">
          A loja e a data destravam o restante da captura. Assim que a cidade estiver definida, o fluxo ja pode seguir para a origem do lead.
        </InfoBox>
      </div>
    </SectionShell>
  );

  const renderOriginBlock = () => (
    <SectionShell
      id="origin"
      title="Origem"
      helper="Escolha o canal principal de entrada. Se a origem exigir detalhe adicional, o fluxo abre isso logo abaixo."
      accent={colors.warning}
      active={activeSection === 'origin'}
      state={originComplete ? 'complete' : 'pending'}
      summary={form.originName ? `${form.originName}${form.originSourceName ? ` • ${form.originSourceName}` : ''}` : 'Defina de onde esse lead chegou.'}
      onSelect={scrollToSection}
      warning={showSubmitErrors && originIssues.length ? originIssues[0] : ''}
    >
      <div style={{ display: 'grid', gap: '18px' }}>
        <LeadChoiceGrid options={selectedOriginCards} value={form.originCatalogId} onChange={handleOriginChange} />

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Btn variant="secondary" onClick={() => setShowNewOriginCreator((current) => !current)}>
            <PlusCircle size={15} /> {showNewOriginCreator ? 'Ocultar nova origem' : 'Criar nova origem'}
          </Btn>
        </div>

        {showNewOriginCreator ? (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              value={newOriginName}
              onChange={(event) => setNewOriginName(event.target.value)}
              placeholder="Nome da nova origem"
              style={{ ...uiStyles.input, flex: 1, minWidth: '220px' }}
            />
            <Btn onClick={handleCreateOrigin} loading={creatingOrigin}>Salvar origem</Btn>
          </div>
        ) : null}

        {originsError ? <InfoBox type="warning">{originsError}</InfoBox> : null}

        {selectedOrigin?.systemKey === 'indicacao' ? (
          <Card size="sm" style={{ background: 'rgba(22,163,74,0.05)', borderColor: 'rgba(22,163,74,0.18)' }}>
            <div style={{ display: 'grid', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 900, color: colors.success, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Mini fluxo de indicacao
                </div>
                <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Digite o nome de quem indicou ou vincule um lead que ja esta no seu portal.
                </div>
              </div>

              <div style={{ display: 'grid', gap: '6px' }}>
                <FieldLabel>Quem indicou?</FieldLabel>
                <input
                  value={form.indicationName}
                  onChange={(event) => setForm((current) => ({ ...current, indicationName: event.target.value }))}
                  placeholder="Digite o nome de quem indicou"
                  style={uiStyles.input}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <Btn variant="secondary" onClick={openMyLeadsSelector}>
                  <Users size={15} /> Meus leads
                </Btn>
                {form.indicationLeadId ? (
                  <span style={{ fontSize: '12px', fontWeight: 800, color: colors.success }}>
                    Lead vinculado: {form.indicationName}
                  </span>
                ) : null}
              </div>
            </div>
          </Card>
        ) : null}

        {selectedOrigin?.systemKey === 'acao_crescimento' ? (
          <Card size="sm" style={{ background: 'rgba(59,130,246,0.05)', borderColor: 'rgba(59,130,246,0.16)' }}>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: colors.info, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Acao do Hub vinculada
              </div>
              <select
                value={form.originSourceId || ''}
                onChange={(event) => {
                  const selected = growthActions.find((item) => item.id === event.target.value);
                  setForm((current) => ({
                    ...current,
                    originSourceType: selected ? 'action_plan' : null,
                    originSourceId: selected?.id || null,
                    originSourceName: selected?.name || null,
                  }));
                  if (selected?.id) {
                    advanceToNextRequiredSection('origin');
                  }
                }}
                style={uiStyles.select}
              >
                <option value="">Selecione a acao</option>
                {growthActions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              {growthActionsError ? <InfoBox type="warning">{growthActionsError}</InfoBox> : null}
            </div>
          </Card>
        ) : null}

        {selectedOrigin?.systemKey === 'acao_parceria' ? (
          <Card size="sm" style={{ background: 'rgba(217,119,6,0.05)', borderColor: 'rgba(217,119,6,0.16)' }}>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: 900, color: colors.warning, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Evento ou acao parceira
              </div>
              <select
                value={form.originSourceId || ''}
                onChange={(event) => {
                  const selected = partnershipSources.find((item) => item.id === event.target.value);
                  setForm((current) => ({
                    ...current,
                    originSourceType: selected?.sourceType || null,
                    originSourceId: selected?.id || null,
                    originSourceName: selected?.name || null,
                  }));
                  if (selected?.id) {
                    advanceToNextRequiredSection('origin');
                  }
                }}
                style={uiStyles.select}
              >
                <option value="">Selecione a parceria</option>
                {partnershipSources.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              {partnershipError ? <InfoBox type="warning">{partnershipError}</InfoBox> : null}
            </div>
          </Card>
        ) : null}
      </div>
    </SectionShell>
  );

  const renderOfferBlock = () => (
    <SectionShell
      id="offer"
      title="Oferta"
      helper="Defina rapidamente categoria, produto e status inicial. Se houver descarte, o motivo aparece no mesmo momento."
      accent={colors.success}
      active={activeSection === 'offer'}
      state={offerComplete ? 'complete' : 'pending'}
      summary={selectedProduct?.name ? `${selectedProduct.name} • ${form.status}` : 'Selecione categoria, produto e status inicial.'}
      onSelect={scrollToSection}
      warning={showSubmitErrors && offerIssues.length ? offerIssues[0] : ''}
    >
      <div style={{ display: 'grid', gap: '18px' }}>
        <div style={{ display: 'grid', gap: '8px' }}>
          <FieldLabel>Categoria</FieldLabel>
          <LeadChoiceGrid options={categoryCards} value={form.categoria} onChange={handleCategoryChange} size="sm" />
        </div>

        <div style={{ display: 'grid', gap: '8px' }}>
          <FieldLabel>Produto</FieldLabel>
          {filteredProducts.length > 0 ? (
            <LeadChoiceGrid
              options={productCards}
              value={form.produto}
              onChange={handleProductChange}
              columns="repeat(auto-fit, minmax(220px, 1fr))"
              size="sm"
            />
          ) : (
            <InfoBox type="info">Escolha uma categoria primeiro para liberar a lista de produtos.</InfoBox>
          )}
        </div>

        <div style={{ display: 'grid', gap: '8px' }}>
          <FieldLabel>Status inicial</FieldLabel>
          <LeadChoiceGrid
            options={STATUS_OPTIONS.map((status) => ({
              value: status.value,
              label: status.label,
              helper: status.helper,
              accent: status.accent,
              Icon: status.Icon,
            }))}
            value={form.status}
            onChange={handleStatusChange}
            size="sm"
          />
        </div>

        {form.status === 'Descartado' ? (
          <Card size="sm" style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.18)' }}>
            <div style={{ display: 'grid', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 900, color: colors.danger, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Motivo do descarte
                </div>
                <div style={{ marginTop: '6px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  O motivo aparece no mesmo bloco da oferta para manter a decisao contextual e rastreavel.
                </div>
              </div>

              <select
                value={form.discardMotive}
                onChange={(event) => {
                  if (event.target.value === NEW_LEAD_DISCARD_REASON_VALUE) {
                    setShowNewDiscardReasonCreator(true);
                    return;
                  }
                  setShowNewDiscardReasonCreator(false);
                  setDiscardReasonError('');
                  setForm((current) => ({ ...current, discardMotive: event.target.value }));
                  if (event.target.value) {
                    advanceToNextRequiredSection('offer');
                  }
                }}
                style={uiStyles.select}
              >
                <option value="">Selecione um motivo</option>
                {discardReasons.map((reason) => <option key={reason.id} value={reason.name}>{reason.name}</option>)}
                <option value={NEW_LEAD_DISCARD_REASON_VALUE}>Inserir motivo</option>
              </select>

              {showNewDiscardReasonCreator ? (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input
                    value={newDiscardReasonName}
                    onChange={(event) => setNewDiscardReasonName(event.target.value)}
                    placeholder="Digite o novo motivo"
                    style={{ ...uiStyles.input, flex: 1, minWidth: '220px' }}
                  />
                  <Btn onClick={handleCreateDiscardReason} loading={creatingDiscardReason}>Salvar motivo</Btn>
                </div>
              ) : null}

              {discardReasonError ? <InfoBox type="warning">{discardReasonError}</InfoBox> : null}
            </div>
          </Card>
        ) : null}
      </div>
    </SectionShell>
  );

  const renderClientBlock = () => (
    <SectionShell
      id="client"
      title="Cliente e localizacao"
      helper="Aqui entram os detalhes opcionais e a localizacao. O mapa vira o centro da confirmacao geografica do lead."
      accent={colors.info}
      active={activeSection === 'client'}
      state={clientTouched ? 'complete' : 'optional'}
      summary={clientTouched ? 'Dados complementares e localizacao ja iniciados.' : 'Opcional por enquanto: complete so o que fizer sentido agora.'}
      onSelect={scrollToSection}
    >
      <div style={{ display: 'grid', gap: '18px' }}>
        <Card size="sm" style={{ background: 'rgba(59,130,246,0.04)', borderColor: 'rgba(59,130,246,0.14)' }}>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ display: 'grid', gap: '6px' }}>
              <FieldLabel>Nome do cliente</FieldLabel>
              <div style={{ position: 'relative' }}>
                <User size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  value={form.nome}
                  onChange={(event) => handleFieldChange('nome', event.target.value)}
                  placeholder="Nome do cliente"
                  style={{ ...uiStyles.input, paddingLeft: '38px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {OPTIONAL_CLIENT_FIELDS.map((field) => {
                const opened = optionalFieldsOpen[field.key] || Boolean(form[field.key]);
                return (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => openClientField(field.key)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '999px',
                      border: `1px solid ${opened ? colors.info : 'var(--border)'}`,
                      background: opened ? 'rgba(59,130,246,0.10)' : 'var(--bg-app)',
                      color: opened ? colors.info : 'var(--text-main)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    <field.Icon size={14} /> {field.label}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              {optionalFieldsOpen.tel || form.tel ? (
                <div style={{ display: 'grid', gap: '6px' }}>
                  <FieldLabel>Telefone</FieldLabel>
                  <input value={form.tel} onChange={handlePhoneChange} placeholder="(00) 00000-0000" style={uiStyles.input} />
                </div>
              ) : null}
              {optionalFieldsOpen.email || form.email ? (
                <div style={{ display: 'grid', gap: '6px' }}>
                  <FieldLabel>Email</FieldLabel>
                  <input value={form.email} onChange={(event) => { openClientField('email'); handleFieldChange('email', event.target.value); }} placeholder="cliente@exemplo.com" style={uiStyles.input} />
                </div>
              ) : null}
              {optionalFieldsOpen.cpf || form.cpf ? (
                <div style={{ display: 'grid', gap: '6px' }}>
                  <FieldLabel>CPF</FieldLabel>
                  <input value={form.cpf} onChange={(event) => { openClientField('cpf'); handleFieldChange('cpf', event.target.value); }} placeholder="000.000.000-00" style={uiStyles.input} />
                </div>
              ) : null}
            </div>
          </div>
        </Card>

        <Card size="sm" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.07), rgba(6,182,212,0.05))', borderColor: 'rgba(37,99,235,0.14)' }}>
          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                O mapa e a forma principal de confirmar o ponto. O endereco manual fica como apoio secundario.
              </div>
              <Btn onClick={() => setMapOpen(true)}>
                <MapPin size={15} /> Escolher no mapa
              </Btn>
            </div>

            <button
              type="button"
              onClick={() => setManualAddressOpen((current) => !current)}
              style={{
                padding: '10px 12px',
                borderRadius: '999px',
                border: `1px solid ${manualAddressOpen ? colors.primary : 'var(--border)'}`,
                background: manualAddressOpen ? 'rgba(37,99,235,0.10)' : 'var(--bg-card)',
                color: manualAddressOpen ? colors.primary : 'var(--text-main)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                width: 'fit-content',
              }}
            >
              <Home size={14} /> {manualAddressOpen ? 'Ocultar endereco manual' : 'Preencher endereco manual'}
            </button>

            {form.geoLat && form.geoLng ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '999px', background: 'rgba(16,185,129,0.12)', color: colors.success, fontSize: '12px', fontWeight: 900 }}>
                <CheckCircle2 size={14} /> Localizacao confirmada
              </span>
            ) : null}

            {manualAddressOpen || form.logradouro || form.numero || form.bairro ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <FieldLabel>Logradouro</FieldLabel>
                  <input value={form.logradouro} onChange={(event) => handleAddressFieldChange('logradouro', event.target.value)} placeholder="Rua / Avenida" style={uiStyles.input} />
                </div>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <FieldLabel>Numero</FieldLabel>
                  <input value={form.numero} onChange={(event) => handleAddressFieldChange('numero', event.target.value)} placeholder="123" style={uiStyles.input} />
                </div>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <FieldLabel>Bairro</FieldLabel>
                  <input value={form.bairro} onChange={(event) => handleAddressFieldChange('bairro', event.target.value)} placeholder="Centro" style={uiStyles.input} />
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </SectionShell>
  );

  if (catalogLoading) {
    return (
      <div style={{ minHeight: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={22} color={colors.primary} className="spin" />
      </div>
    );
  }

  return (
    <div className="animated-view animate-fadeIn" style={{ display: 'grid', gap: '24px', width: '100%', paddingBottom: '42px' }}>
      <LeadFlowProgress
        sections={flowSections}
        activeSection={activeSection}
        onSelect={scrollToSection}
        headline="Capturar nova oportunidade"
        subtitle="Uma jornada mais humana, guiada e direta para registrar leads sem cara de sistema."
        cityLabel={selectedCity?.name || selectedCity?.nome || userData?.cityName || 'Loja ainda nao definida'}
        readyCount={[contextComplete, originComplete, offerComplete, clientTouched].filter(Boolean).length}
        totalCount={flowSections.length}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(320px, 0.9fr)', gap: '22px', alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 700 }}>
              O fluxo agora prioriza escolhas clicaveis e mantem os campos opcionais compactos ate voce precisar deles.
            </div>
            <Btn variant="secondary" onClick={() => onNavigate?.('clientes')}><ArrowLeft size={15} /> Voltar ao funil</Btn>
          </div>

          {renderContextBlock()}
          {renderOriginBlock()}
          {renderOfferBlock()}
          {renderClientBlock()}
        </div>

        <LeadDraftSummary
          items={summaryItems}
          readyToSave={readyToSave}
          missingEssentials={missingEssentials}
          loading={loading}
          onSubmit={handleSubmit}
          onJumpToSection={scrollToSection}
        />
      </div>

      <LeadAddressMapModal
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        cityName={selectedCity?.name || selectedCity?.nome || userData?.cityName || ''}
        initialValue={form}
        onConfirm={(location) => {
            setForm((current) => ({
              ...current,
              logradouro: location.logradouro || current.logradouro || '',
              numero: location.numero || current.numero || '',
              bairro: location.bairro || current.bairro || '',
              geoLat: location.geoLat ?? null,
              geoLng: location.geoLng ?? null,
              geoFormattedAddress: location.geoFormattedAddress || '',
              geoStatus: normalizeLeadGeoStatus(location.geoStatus || LEAD_GEO_STATUS.PENDING),
            }));
          setManualAddressOpen(true);
          setMapOpen(false);
        }}
      />

      <Modal
        open={myLeadsOpen}
        onClose={() => setMyLeadsOpen(false)}
        title="Selecionar lead indicador"
        size="lg"
        footer={<Btn variant="secondary" onClick={() => setMyLeadsOpen(false)}>Fechar</Btn>}
      >
        <div style={{ display: 'grid', gap: '14px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={myLeadSearch}
              onChange={(event) => setMyLeadSearch(event.target.value)}
              placeholder="Buscar por nome, telefone ou email"
              style={{ ...uiStyles.input, paddingLeft: '38px' }}
            />
          </div>

          {myLeadsLoading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando seus leads...</div>
          ) : filteredLeadOptions.length === 0 ? (
            <InfoBox type="info">Nenhum lead encontrado para usar como indicacao.</InfoBox>
          ) : (
            <div style={{ display: 'grid', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
              {filteredLeadOptions.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => {
                    setForm((current) => ({
                      ...current,
                      indicationLeadId: lead.id,
                      indicationName: lead.customerName || lead.customerPhone || lead.customerEmail || 'Lead sem nome',
                    }));
                    setMyLeadsOpen(false);
                    advanceToNextRequiredSection('origin');
                  }}
                  style={{
                    textAlign: 'left',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-app)',
                    cursor: 'pointer',
                    display: 'grid',
                    gap: '6px',
                  }}
                >
                  <div style={{ fontWeight: 900, color: 'var(--text-main)' }}>{lead.customerName || 'Lead sem nome'}</div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <span><Phone size={13} style={{ verticalAlign: 'middle', marginRight: '6px' }} />{lead.customerPhone || 'Telefone nao informado'}</span>
                    <span><MapPin size={13} style={{ verticalAlign: 'middle', marginRight: '6px' }} />{lead.cityName || 'Cidade nao informada'}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
