import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Home,
  Layers,
  Loader2,
  MapPin,
  Phone,
  Tag,
  Target,
  User,
  UserPlus,
  XCircle,
  Zap,
} from 'lucide-react';

import { styles as global, colors } from '../styles/globalStyles';
import { getCategories, getCities, getProducts } from '../services/catalog';
import { listGrowthActionsForCity } from '../services/atendenteDashboardService';
import { createLead } from '../services/leads';

export default function NovoLead({ userData, onNavigate }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [acoesCrescimento, setAcoesCrescimento] = useState([]);
  const [acoesError, setAcoesError] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    date: todayStr,
    nome: '',
    tel: '',
    cidade: userData?.cityId || '',
    logradouro: '',
    numero: '',
    bairro: '',
    categoria: '',
    produto: '',
    status: 'Em negociação',
    origem: 'WhatsApp',
    acaoId: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [cits, cats, prods] = await Promise.all([getCities(), getCategories(), getProducts(true)]);
        setCities(cits);
        setCategories(cats);
        setProducts(prods);
      } catch {
        window.showToast?.('Erro ao carregar catálogo.', 'error');
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!form.cidade) {
      setAcoesCrescimento([]);
      setAcoesError('');
      return;
    }

    let active = true;
    const fetchAcoes = async () => {
      try {
        const plans = await listGrowthActionsForCity(form.cidade);
        if (!active) return;
        setAcoesCrescimento(plans);
        setAcoesError('');
      } catch (error) {
        console.error('Erro ao carregar Planos de Crescimento:', error);
        if (!active) return;
        setAcoesCrescimento([]);
        setAcoesError('Nao foi possivel carregar as acoes de crescimento desta cidade.');
      }
    };

    fetchAcoes();
    return () => {
      active = false;
    };
  }, [form.cidade]);

  const filteredProducts = useMemo(() => {
    if (!form.categoria) return [];
    return products.filter((product) => product.categoryId === form.categoria || product.category === form.categoria);
  }, [form.categoria, products]);

  const handlePhoneChange = (event) => {
    let value = event.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
      value = value.replace(/(\d{5})(\d)/, '$1-$2');
    }
    setForm({ ...form, tel: value.substring(0, 15) });
  };

  const handleNext = () => {
    if (step === 1) {
      if (!form.nome || !form.tel || !form.cidade || !form.logradouro) {
        window.showToast?.('Preencha os dados obrigatórios do cliente.', 'error');
        return;
      }
      if (form.origem === 'Ação de Crescimento' && !form.acaoId) {
        window.showToast?.('Selecione qual foi a ação realizada.', 'error');
        return;
      }
      setStep(2);
      return;
    }

    if (!form.categoria || !form.produto) {
      window.showToast?.('Selecione a categoria e o plano.', 'error');
      return;
    }

    setStep(3);
  };

  const handleSubmit = async () => {
    if (!form.status) {
      window.showToast?.('Defina o status da negociação.', 'error');
      return;
    }

    setLoading(true);
    try {
      const city = cities.find((item) => item.id === form.cidade) || { id: form.cidade, name: form.cidade };
      const category = categories.find((item) => item.id === form.categoria) || { id: form.categoria, name: 'Geral' };
      const product = products.find((item) => item.id === form.produto) || { id: form.produto, name: 'Produto Não Especificado', price: 0 };

      const payload = { ...form };
      if (payload.origem === 'Ação de Crescimento' && payload.acaoId) {
        payload.originActionId = payload.acaoId;
        const action = acoesCrescimento.find((item) => item.id === payload.acaoId);
        if (action) payload.acaoNome = action.name;
      }

      await createLead(payload, userData, city, category, product);
      window.showToast?.('Lead registado com sucesso!', 'success');
      onNavigate('clientes');
    } catch {
      window.showToast?.('Erro ao guardar lead.', 'error');
    }
    setLoading(false);
  };

  const statusOptions = [
    { label: 'Em negociação', icon: Clock, color: colors.warning || '#f59e0b' },
    { label: 'Contratado', icon: CheckCircle2, color: colors.primary || '#3b82f6' },
    { label: 'Instalado', icon: Zap, color: colors.success || '#10b981' },
    { label: 'Descartado', icon: XCircle, color: colors.danger || '#ef4444' },
  ];

  return (
    <div className="animated-view animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '24px 30px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 16px ${colors.primary}35` }}>
            <UserPlus size={28} color="white" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Novo Lead</h1>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '4px' }}>
              Registe uma nova oportunidade para {userData?.cityName || 'a sua unidade'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {[1, 2, 3].map((item) => (
            <div key={item} style={{ width: '12px', height: '12px', borderRadius: '50%', background: step >= item ? colors.primary : 'var(--bg-app)', border: `1px solid ${step >= item ? colors.primary : 'var(--border)'}` }} />
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', padding: '40px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', position: 'relative', maxWidth: '1000px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '45px' }}>
          {[1, 2, 3].map((item) => (
            <React.Fragment key={item}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '14px',
                  background: step >= item ? colors.primary : 'var(--bg-app)',
                  color: step >= item ? 'white' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '900',
                  fontSize: '18px',
                  border: '2px solid',
                  borderColor: step >= item ? colors.primary : 'var(--border)',
                  transition: 'all 0.3s ease',
                  boxShadow: step === item ? `0 0 0 4px ${colors.primary}20` : 'none',
                }}
              >
                {item}
              </div>
              {item < 3 && <div style={{ width: '60px', height: '4px', background: step > item ? colors.primary : 'var(--bg-panel)', transition: 'all 0.3s ease', borderRadius: '2px' }} />}
            </React.Fragment>
          ))}
        </div>

        {step === 1 && (
          <div className="animate-fadeInUp">
            <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '25px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', background: 'var(--bg-primary-light)', borderRadius: '10px', color: colors.primary }}>
                <User size={20} />
              </div>
              Dados do Cliente e Localização
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
              <div style={global.field}>
                <label style={{ ...global.label, fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Data do Contacto</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input type="date" style={{ ...global.input, paddingLeft: '48px', height: '52px', borderRadius: '14px' }} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
                </div>
              </div>

              <div style={global.field}>
                <label style={{ ...global.label, fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Cidade / Unidade</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <select style={{ ...global.select, paddingLeft: '48px', height: '52px', borderRadius: '14px' }} value={form.cidade} onChange={(event) => setForm({ ...form, cidade: event.target.value, acaoId: '' })}>
                    <option value="">Selecione a cidade...</option>
                    {cities.map((city) => <option key={city.id} value={city.id}>{city.name || city.nome}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ ...global.field, gridColumn: 'span 2' }}>
                <label style={{ ...global.label, fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Nome Completo do Cliente</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input style={{ ...global.input, paddingLeft: '48px', height: '52px', borderRadius: '14px' }} placeholder="Ex: João da Silva" value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} />
                </div>
              </div>

              <div style={global.field}>
                <label style={{ ...global.label, fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>WhatsApp / Telemóvel</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input style={{ ...global.input, paddingLeft: '48px', height: '52px', borderRadius: '14px' }} placeholder="(00) 00000-0000" value={form.tel} onChange={handlePhoneChange} />
                </div>
              </div>

              <div style={global.field}>
                <label style={{ ...global.label, fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: colors.primary }}>Canal de Entrada / Origem</label>
                <div style={{ position: 'relative' }}>
                  <Activity size={18} color={colors.primary} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <select style={{ ...global.select, paddingLeft: '48px', height: '52px', borderRadius: '14px', border: `1px solid ${colors.primary}50` }} value={form.origem} onChange={(event) => setForm({ ...form, origem: event.target.value, acaoId: '' })}>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Telefone">Telefone</option>
                    <option value="Balcão/Loja">Balcão/Loja</option>
                    <option value="Indicação">Indicação</option>
                    <option value="Porta a Porta">Porta a Porta</option>
                    <option value="Redes Sociais">Redes Sociais</option>
                    <option value="Ação de Crescimento">Ação de Crescimento (HUB)</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              {form.origem === 'Ação de Crescimento' && (
                <div className="animate-fadeIn" style={{ ...global.field, gridColumn: 'span 2' }}>
                  <label style={{ ...global.label, fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: '#f59e0b' }}>Plano de Ação Ativo nesta Cidade</label>
                  <div style={{ position: 'relative' }}>
                    <Target size={18} color="#f59e0b" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                    <select style={{ ...global.select, paddingLeft: '48px', height: '52px', borderRadius: '14px', border: '1px solid #f59e0b80' }} value={form.acaoId} onChange={(event) => setForm({ ...form, acaoId: event.target.value })}>
                      <option value="">Selecione a campanha que trouxe este cliente...</option>
                      {acoesCrescimento.length === 0 && <option value="" disabled>Nenhuma ação "Em Andamento" para esta cidade.</option>}
                      {acoesCrescimento.map((action) => <option key={action.id} value={action.id}>{action.name}</option>)}
                    </select>
                  </div>
                  {acoesError && <span style={{ fontSize: '12px', color: colors.danger }}>{acoesError}</span>}
                </div>
              )}

              <div style={global.field}>
                <label style={{ ...global.label, fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Bairro</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input style={{ ...global.input, paddingLeft: '48px', height: '52px', borderRadius: '14px' }} placeholder="Ex: Centro" value={form.bairro} onChange={(event) => setForm({ ...form, bairro: event.target.value })} />
                </div>
              </div>

              <div style={{ ...global.field, gridColumn: 'span 2' }}>
                <label style={{ ...global.label, fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Morada (Rua e Número)</label>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div style={{ position: 'relative', flex: 4 }}>
                    <Home size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input style={{ ...global.input, paddingLeft: '48px', height: '52px', borderRadius: '14px' }} placeholder="Rua / Avenida" value={form.logradouro} onChange={(event) => setForm({ ...form, logradouro: event.target.value })} />
                  </div>
                  <input style={{ ...global.input, flex: 1, textAlign: 'center', height: '52px', borderRadius: '14px' }} placeholder="Nº" value={form.numero} onChange={(event) => setForm({ ...form, numero: event.target.value })} />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fadeInUp" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '5px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', background: 'var(--bg-primary-light)', borderRadius: '10px', color: colors.primary }}>
                <Layers size={20} />
              </div>
              Interesse e Produto
            </h3>

            <div style={global.field}>
              <label style={{ ...global.label, fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Categoria de Interesse</label>
              <div style={{ position: 'relative' }}>
                <Layers size={18} color={form.categoria ? colors.primary : 'var(--text-muted)'} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', transition: '0.2s' }} />
                <select style={{ ...global.select, paddingLeft: '48px', height: '52px', borderRadius: '14px' }} value={form.categoria} onChange={(event) => setForm({ ...form, categoria: event.target.value, produto: '' })}>
                  <option value="">O que o cliente procura?</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name || category.nome}</option>)}
                </select>
              </div>
            </div>

            <div style={global.field}>
              <label style={{ ...global.label, fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Plano / Produto Disponível</label>
              <div style={{ position: 'relative' }}>
                <Tag size={18} color={form.produto ? colors.primary : 'var(--text-muted)'} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', transition: '0.2s' }} />
                <select style={{ ...global.select, paddingLeft: '48px', height: '52px', borderRadius: '14px' }} value={form.produto} onChange={(event) => setForm({ ...form, produto: event.target.value })} disabled={!form.categoria}>
                  <option value="">{form.categoria ? 'Selecione o plano desejado...' : 'Selecione uma categoria primeiro'}</option>
                  {filteredProducts.map((product) => <option key={product.id} value={product.id}>{product.name} — R$ {Number(product.price).toFixed(2)}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fadeInUp">
            <h3 style={{ fontSize: '18px', fontWeight: '900', marginBottom: '25px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center' }}>
              <div style={{ padding: '8px', background: 'var(--bg-primary-light)', borderRadius: '10px', color: colors.primary }}>
                <CheckCircle2 size={20} />
              </div>
              Status da Negociação
            </h3>
            <label style={{ ...global.label, marginBottom: '25px', display: 'block', textAlign: 'center', fontSize: '15px' }}>Em que fase se encontra esta venda agora?</label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {statusOptions.map((option) => {
                const isSelected = form.status === option.label;
                const IconComp = option.icon;
                return (
                  <button
                    key={option.label}
                    onClick={() => setForm({ ...form, status: option.label })}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '30px 20px',
                      borderRadius: '20px',
                      border: '2px solid',
                      borderColor: isSelected ? option.color : 'var(--border)',
                      background: isSelected ? `${option.color}10` : 'var(--bg-app)',
                      color: isSelected ? option.color : 'var(--text-muted)',
                      fontWeight: '900',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isSelected ? `0 8px 24px ${option.color}25` : 'none',
                      transform: isSelected ? 'translateY(-4px)' : 'translateY(0)',
                    }}
                  >
                    <IconComp size={36} strokeWidth={isSelected ? 2.5 : 2} color={isSelected ? option.color : 'var(--text-muted)'} />
                    <span style={{ fontSize: '16px' }}>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '50px', paddingTop: '30px', borderTop: '1px solid var(--border)' }}>
          <button onClick={() => (step === 1 ? onNavigate('inicio') : setStep(step - 1))} style={{ ...global.btnSecondary, display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 28px', borderRadius: '14px', background: 'var(--bg-panel)', border: '1px solid var(--border)' }}>
            {step === 1 ? <><XCircle size={18} /> Cancelar</> : <><ArrowLeft size={18} /> Voltar</>}
          </button>

          <button
            onClick={() => {
              if (step < 3) handleNext();
              else handleSubmit();
            }}
            disabled={loading}
            style={{ ...global.btnPrimary, width: 'auto', padding: '14px 40px', borderRadius: '14px', minWidth: '220px', display: 'flex', justifyContent: 'center', boxShadow: `0 8px 24px ${colors.primary}40` }}
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: '900' }}>
                {step === 3 ? 'Finalizar e Guardar' : 'Próximo Passo'}
                {step < 3 && <ChevronRight size={20} strokeWidth={3} />}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
