import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Home,
  Loader2,
  MapPin,
  Phone,
  PlusCircle,
  Search,
  ShieldAlert,
  Tag,
  User,
  Users,
  Zap,
} from 'lucide-react';

import LeadAddressMapModal from '../components/LeadAddressMapModal';
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

const STATUS_OPTIONS = ['Em negociacao', 'Contratado', 'Instalado', 'Descartado'];
const STEP_CONFIG = [
  {
    id: 1,
    title: 'Cliente e localizacao',
    subtitle: 'Dados principais e endereco',
    Icon: User,
    accent: colors.primary,
  },
  {
    id: 2,
    title: 'Origem e produto',
    subtitle: 'Canal, indicacao e oferta',
    Icon: Tag,
    accent: colors.warning,
  },
  {
    id: 3,
    title: 'Revisao e envio',
    subtitle: 'Status inicial e resumo final',
    Icon: CheckCircle2,
    accent: colors.success,
  },
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

export default function NovoLead({ userData, onNavigate }) {
  const [step, setStep] = useState(1);
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
  const [form, setForm] = useState(() => buildEmptyForm(userData));

  useEffect(() => {
    setForm(buildEmptyForm(userData));
    setStep(1);
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
  const currentStepTitle = ['Cliente e localizacao', 'Origem e produto', 'Revisao e envio'][step - 1];
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

  const handleFieldChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
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
  };

  const handlePhoneChange = (event) => {
    setForm((current) => ({ ...current, tel: formatPhone(event.target.value) }));
  };

  const handleAddressFieldChange = (field, value) => {
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

  const validateStepOne = () => {
    if (!form.cidade) {
      window.showToast?.('Selecione a loja/cidade do lead.', 'error');
      return false;
    }
    return true;
  };

  const validateStepTwo = () => {
    if (!form.originCatalogId) {
      window.showToast?.('Selecione a origem do lead.', 'error');
      return false;
    }
    if (selectedOrigin?.systemKey === 'acao_parceria' && !form.originSourceId) {
      window.showToast?.('Selecione o evento ou acao parceira.', 'error');
      return false;
    }
    if (selectedOrigin?.systemKey === 'acao_crescimento' && !form.originSourceId) {
      window.showToast?.('Selecione a acao do Hub.', 'error');
      return false;
    }
    if (selectedOrigin?.systemKey === 'indicacao' && !String(form.indicationName || '').trim()) {
      window.showToast?.('Informe quem indicou esse lead.', 'error');
      return false;
    }
    if (!form.categoria || !form.produto) {
      window.showToast?.('Selecione categoria e produto.', 'error');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStepOne()) return;
    if (step === 2 && !validateStepTwo()) return;
    setStep((current) => Math.min(3, current + 1));
  };

  const handleStepSelect = (targetStep) => {
    if (targetStep === step) return;
    if (targetStep < step) {
      setStep(targetStep);
      return;
    }
    if (targetStep === 2 && validateStepOne()) {
      setStep(2);
      return;
    }
    if (targetStep === 3 && validateStepOne() && validateStepTwo()) {
      setStep(3);
    }
  };

  const handleSubmit = async (event) => {
    event?.preventDefault();
    if (!validateStepOne() || !validateStepTwo()) return;
    if (form.status === 'Descartado' && !String(form.discardMotive || '').trim()) {
      window.showToast?.('Defina o motivo do descarte antes de salvar.', 'error');
      return;
    }

    try {
      setLoading(true);
      await createLead(form, userData, selectedCity, selectedCategory, selectedProduct);
      window.showToast?.('Lead criado com sucesso.', 'success');
      setForm(buildEmptyForm(userData));
      setStep(1);
      onNavigate?.('clientes');
    } catch (error) {
      console.error('Erro ao criar lead:', error);
      window.showToast?.('Nao foi possivel registrar o lead.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderStepOne = () => (
    <div style={{ display: 'grid', gap: '18px' }}>
      <Card title="Dados basicos" subtitle="Os dados pessoais podem ser preenchidos agora ou depois.">
        <div style={{ ...uiStyles.formRow, marginBottom: '16px' }}>
          <div style={{ display: 'grid', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nome</label>
            <input value={form.nome} onChange={(event) => handleFieldChange('nome', event.target.value)} placeholder="Nome do cliente" style={uiStyles.input} />
          </div>
          <div style={{ display: 'grid', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Telefone</label>
            <input value={form.tel} onChange={handlePhoneChange} placeholder="(00) 00000-0000" style={uiStyles.input} />
          </div>
          <div style={{ display: 'grid', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email</label>
            <input value={form.email} onChange={(event) => handleFieldChange('email', event.target.value)} placeholder="cliente@exemplo.com" style={uiStyles.input} />
          </div>
          <div style={{ display: 'grid', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>CPF</label>
            <input value={form.cpf} onChange={(event) => handleFieldChange('cpf', event.target.value)} placeholder="000.000.000-00" style={uiStyles.input} />
          </div>
        </div>

        <div style={{ ...uiStyles.formRow, marginBottom: '16px' }}>
          <div style={{ display: 'grid', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Data do lead</label>
            <input type="date" value={form.date} onChange={(event) => handleFieldChange('date', event.target.value)} style={uiStyles.input} />
          </div>
          <div style={{ display: 'grid', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Loja / Cidade</label>
            <select value={form.cidade} onChange={(event) => handleFieldChange('cidade', event.target.value)} style={uiStyles.select}>
              <option value="">Selecione a cidade</option>
              {cities.map((city) => (
                <option key={city.id || city.cityId} value={city.id || city.cityId}>
                  {city.name || city.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card
        title="Endereco do lead"
        subtitle="Voce pode preencher manualmente ou localizar no mapa livre."
        actions={<Btn onClick={() => setMapOpen(true)}><MapPin size={15} /> Selecionar no mapa</Btn>}
        style={{
          background: 'linear-gradient(135deg, rgba(37,99,235,0.04), rgba(6,182,212,0.04))',
        }}
      >
        <div style={{ ...uiStyles.formRow, marginBottom: '16px' }}>
          <div style={{ display: 'grid', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Logradouro</label>
            <input value={form.logradouro} onChange={(event) => handleAddressFieldChange('logradouro', event.target.value)} placeholder="Rua / Avenida" style={uiStyles.input} />
          </div>
          <div style={{ display: 'grid', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Numero</label>
            <input value={form.numero} onChange={(event) => handleAddressFieldChange('numero', event.target.value)} placeholder="123" style={uiStyles.input} />
          </div>
          <div style={{ display: 'grid', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bairro</label>
            <input value={form.bairro} onChange={(event) => handleAddressFieldChange('bairro', event.target.value)} placeholder="Centro" style={uiStyles.input} />
          </div>
        </div>

              <InfoBox type={form.geoLat && form.geoLng ? 'success' : 'info'}>
                {form.geoLat && form.geoLng
                  ? 'Local confirmado no mapa. Se voce alterar o endereco depois, sera preciso definir o ponto novamente.'
                  : 'Use o mapa para confirmar o ponto do lead. A busca por endereco e apenas um apoio visual.'}
              </InfoBox>
      </Card>
    </div>
  );

  const renderOriginSelector = () => (
    <Card title="Canal de entrada / origem" subtitle="A origem ajuda a identificar o que esta convertendo melhor.">
      <div style={{ display: 'grid', gap: '16px' }}>
        <div style={{ display: 'grid', gap: '6px' }}>
          <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Origem do lead</label>
          <select value={form.originCatalogId} onChange={(event) => handleOriginChange(event.target.value)} style={uiStyles.select}>
            <option value="">Selecione a origem</option>
            {origins.map((origin) => (
              <option key={origin.id} value={origin.id}>{origin.name}</option>
            ))}
            <option value={NEW_LEAD_ORIGIN_VALUE}>Nova Origem</option>
          </select>
        </div>

        {showNewOriginCreator && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              value={newOriginName}
              onChange={(event) => setNewOriginName(event.target.value)}
              placeholder="Nome da nova origem"
              style={{ ...uiStyles.input, flex: 1, minWidth: '220px' }}
            />
            <Btn onClick={handleCreateOrigin} loading={creatingOrigin}>Salvar origem</Btn>
          </div>
        )}

        {originsError && <InfoBox type="warning">{originsError}</InfoBox>}

        {selectedOrigin?.systemKey === 'indicacao' && (
          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ display: 'grid', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Quem indicou?</label>
              <input
                value={form.indicationName}
                onChange={(event) => setForm((current) => ({ ...current, indicationName: event.target.value }))}
                placeholder="Digite o nome de quem indicou"
                style={uiStyles.input}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <Btn variant="secondary" onClick={openMyLeadsSelector}>
                <Users size={15} /> Meus leads
              </Btn>
              {form.indicationLeadId && (
                <span style={{ fontSize: '12px', fontWeight: 800, color: colors.success }}>
                  Lead vinculado: {form.indicationName}
                </span>
              )}
            </div>
          </div>
        )}

        {selectedOrigin?.systemKey === 'acao_crescimento' && (
          <div style={{ display: 'grid', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Acao em andamento</label>
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
              }}
              style={uiStyles.select}
            >
              <option value="">Selecione a acao</option>
              {growthActions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            {growthActionsError && <InfoBox type="warning">{growthActionsError}</InfoBox>}
          </div>
        )}

        {selectedOrigin?.systemKey === 'acao_parceria' && (
          <div style={{ display: 'grid', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Evento / acao parceira</label>
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
              }}
              style={uiStyles.select}
            >
              <option value="">Selecione a parceria</option>
              {partnershipSources.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            {partnershipError && <InfoBox type="warning">{partnershipError}</InfoBox>}
          </div>
        )}
      </div>
    </Card>
  );

  const renderStepTwo = () => (
    <div style={{ display: 'grid', gap: '18px' }}>
      {renderOriginSelector()}

      <Card title="Produto de interesse" subtitle="Escolha a categoria e o produto principal do lead.">
        <div style={{ ...uiStyles.formRow, marginBottom: '16px' }}>
          <div style={{ display: 'grid', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Categoria</label>
            <select
              value={form.categoria}
              onChange={(event) => setForm((current) => ({ ...current, categoria: event.target.value, produto: '' }))}
              style={uiStyles.select}
            >
              <option value="">Selecione a categoria</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Produto</label>
            <select value={form.produto} onChange={(event) => handleFieldChange('produto', event.target.value)} style={uiStyles.select}>
              <option value="">Selecione o produto</option>
              {filteredProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </div>
        </div>

        <InfoBox type="info">
          O lead pode ser criado com dados pessoais incompletos. O importante aqui e garantir a loja, a origem e o produto.
        </InfoBox>
      </Card>
    </div>
  );

  const renderSummaryCard = (icon, label, value, accent, helper) => (
    <div
      key={label}
      style={{
        padding: '16px',
        borderRadius: '18px',
        border: '1px solid var(--border)',
        background: 'linear-gradient(135deg, rgba(15,23,42,0.02), rgba(37,99,235,0.04))',
        display: 'grid',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: accent }}>
        {icon}
        <span style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-main)', lineHeight: 1.45 }}>
        {value || '-'}
      </div>
      {helper && <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{helper}</div>}
    </div>
  );

  const renderStepThree = () => (
    <div style={{ display: 'grid', gap: '18px' }}>
      <Card
        title="Status inicial do lead"
        subtitle="Defina como esse lead entra no seu funil e complete o descarte quando necessario."
        style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,0.03), rgba(37,99,235,0.04))',
        }}
      >
        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={{ display: 'grid', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
              {STATUS_OPTIONS.map((status) => {
                const active = form.status === status;
                const accent = status === 'Descartado' ? colors.danger : status === 'Instalado' ? colors.success : status === 'Contratado' ? colors.primary : colors.warning;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleStatusChange(status)}
                    style={{
                      textAlign: 'left',
                      borderRadius: '16px',
                      padding: '14px 16px',
                      border: `1px solid ${active ? accent : 'var(--border)'}`,
                      background: active ? `${accent}16` : 'var(--bg-app)',
                      boxShadow: active ? `0 10px 24px ${accent}22` : 'none',
                      cursor: 'pointer',
                      display: 'grid',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text-main)' }}>{status}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {status === 'Descartado' ? 'Registra perda e motivo' : 'Entra no funil com este status'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {form.status === 'Descartado' && (
            <div style={{ display: 'grid', gap: '14px', padding: '16px', borderRadius: '18px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
              <div style={{ display: 'grid', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 900, color: colors.danger, textTransform: 'uppercase' }}>Motivo do descarte</label>
                <select
                  value={form.discardMotive}
                  onChange={(event) => {
                    if (event.target.value === NEW_LEAD_DISCARD_REASON_VALUE) {
                      setShowNewDiscardReasonCreator(true);
                      return;
                    }
                    setShowNewDiscardReasonCreator(false);
                    setDiscardReasonError('');
                    setForm((current) => ({
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

              {form.discardMotive === 'Fidelidade em outro Provedor' && (
                <div style={{ display: 'grid', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 900, color: colors.danger, textTransform: 'uppercase' }}>Mes do fim da fidelidade</label>
                  <input
                    type="month"
                    value={form.fidelityMonth}
                    onChange={(event) => handleFieldChange('fidelityMonth', event.target.value)}
                    style={uiStyles.input}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card
        title="Resumo do lead"
        subtitle="Uma leitura mais ilustrativa do que sera salvo no CRM."
        style={{
          background: 'linear-gradient(135deg, rgba(37,99,235,0.04), rgba(16,185,129,0.04))',
        }}
      >
        <div style={{ display: 'grid', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            {[
              {
                label: 'Cliente',
                value: form.nome || 'Nao informado',
                icon: <User size={16} />,
                accent: colors.primary,
                helper: form.tel || 'Sem telefone registrado ainda',
              },
              {
                label: 'Loja / Cidade',
                value: selectedCity?.name || selectedCity?.nome || 'Nao informada',
                icon: <Home size={16} />,
                accent: colors.success,
                helper: 'Base principal de atribuicao do lead',
              },
              {
                label: 'Origem',
                value: form.originName || 'Nao informada',
                icon: <Tag size={16} />,
                accent: colors.warning,
                helper: selectedOrigin?.systemKey === 'indicacao' ? `Indicacao: ${form.indicationName || 'Nao definida'}` : 'Canal de entrada selecionado',
              },
              {
                label: 'Produto',
                value: selectedProduct?.name || 'Nao informado',
                icon: <Zap size={16} />,
                accent: colors.purple,
                helper: selectedCategory?.name || 'Categoria nao informada',
              },
              {
                label: 'Endereco',
                value: [form.logradouro, form.numero, form.bairro].filter(Boolean).join(', ') || 'Nao informado',
                icon: <MapPin size={16} />,
                accent: colors.info,
                helper: form.geoLat && form.geoLng
                  ? `Coordenadas confirmadas (${normalizeLeadGeoStatus(form.geoStatus)})`
                  : 'Endereco ainda sem ponto confirmado',
              },
              {
                label: 'Status de entrada',
                value: form.status,
                icon: <ShieldAlert size={16} />,
                accent: form.status === 'Descartado' ? colors.danger : colors.primary,
                helper: form.status === 'Descartado' ? `Motivo: ${form.discardMotive || 'Pendente'}` : 'Lead entra ativo no funil',
              },
            ].map((item) => renderSummaryCard(item.icon, item.label, item.value, item.accent, item.helper))}
          </div>

          <div style={{ padding: '18px 20px', borderRadius: '20px', background: 'rgba(15,23,42,0.04)', border: '1px solid var(--border)', display: 'grid', gap: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Pronto para salvar
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.6 }}>
              {form.status === 'Descartado'
                ? 'Esse lead sera salvo como descarte, com motivo registrado para analise futura.'
                : 'Esse lead sera salvo no funil e podera evoluir normalmente entre negociacao, contratado e instalado.'}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  if (catalogLoading) {
    return (
      <div style={{ minHeight: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={22} color={colors.primary} className="spin" />
      </div>
    );
  }

  return (
    <div className="animated-view animate-fadeIn" style={{ display: 'grid', gap: '24px', width: '100%', paddingBottom: '40px' }}>
      <Card
        size="lg"
        style={{
          background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.96))',
          borderColor: 'rgba(148,163,184,0.18)',
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap' }}>
          <div style={{ display: 'grid', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'rgba(255,255,255,0.72)', fontWeight: 800 }}>
              <PlusCircle size={18} /> Registrar novo lead
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '30px', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>
                Novo lead do CRM Atendente
              </h1>
              <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.74)', fontWeight: 600 }}>
                Passo {step} de 3: {currentStepTitle}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '10px', minWidth: '240px' }}>
            <div style={{ padding: '14px 16px', borderRadius: '18px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.58)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                Loja atual
              </div>
              <div style={{ marginTop: '6px', fontSize: '18px', fontWeight: 900 }}>
                {selectedCity?.name || selectedCity?.nome || userData?.cityName || 'Nao definida'}
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)', fontWeight: 700 }}>
              Fluxo mais direto: preencha, revise e salve sem excesso de etapas.
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
        {STEP_CONFIG.map((item) => {
          const active = step === item.id;
          const done = step > item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleStepSelect(item.id)}
              style={{
                textAlign: 'left',
                borderRadius: '20px',
                padding: '16px 18px',
                border: `1px solid ${active ? item.accent : 'var(--border)'}`,
                background: active ? `${item.accent}14` : done ? 'rgba(16,185,129,0.08)' : 'var(--bg-card)',
                boxShadow: active ? `0 14px 34px ${item.accent}20` : 'var(--shadow-sm)',
                cursor: 'pointer',
                display: 'grid',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: active ? `${item.accent}22` : 'rgba(15,23,42,0.05)', color: active ? item.accent : 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <item.Icon size={18} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 900, color: done ? colors.success : active ? item.accent : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {done ? 'Concluido' : active ? 'Em foco' : `Etapa ${item.id}`}
                </span>
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text-main)' }}>{item.title}</div>
                <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.subtitle}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 700 }}>
          Os dados pessoais continuam opcionais e podem ser complementados depois.
        </div>
        <Btn variant="secondary" onClick={() => onNavigate?.('clientes')}><ArrowLeft size={15} /> Voltar ao funil</Btn>
      </div>

      {step === 1 && renderStepOne()}
      {step === 2 && renderStepTwo()}
      {step === 3 && renderStepThree()}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <Btn variant="secondary" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1}>
          <ArrowLeft size={15} /> Etapa anterior
        </Btn>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {step < 3 ? (
            <Btn onClick={handleNext}>
              Proxima etapa <ChevronRight size={15} />
            </Btn>
          ) : (
            <Btn onClick={handleSubmit} loading={loading}>
              <CheckCircle2 size={15} /> Salvar lead
            </Btn>
          )}
        </div>
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
