import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserPlus, MapPin, Phone, CheckCircle2, 
  ArrowLeft, Loader2, Calendar, Tag, Layers, ChevronRight,
  User, Home, Clock, Zap, XCircle, Activity, Target
} from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore'; 
import { db } from '../firebase'; 

import { styles as global, colors } from '../styles/globalStyles';
import { getCities, getCategories, getProducts } from '../services/catalog';
import { createLead } from '../services/leads';

export default function NovoLead({ userData, onNavigate }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // ESTADO: Guarda as ações de crescimento que vêm do banco
  const [acoesCrescimento, setAcoesCrescimento] = useState([]);

  const todayStr = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    date: todayStr, nome: '', tel: '', 
    cidade: userData?.cityId || '', 
    logradouro: '', numero: '', bairro: '',
    categoria: '', produto: '', status: 'Em negociação', 
    origem: 'WhatsApp', // NOVO: Guarda a origem principal
    acaoId: ''          // NOVO: Guarda a ação escolhida (se a origem for Ação)
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [cits, cats, prods] = await Promise.all([getCities(), getCategories(), getProducts()]);
        setCities(cits);
        setCategories(cats);
        setProducts(prods);
      } catch (err) {
        if (window.showToast) window.showToast("Erro ao carregar catálogo.", "error");
      }
    };
    load();
  }, []);

  // BUSCA AS AÇÕES DE CRESCIMENTO NO FIREBASE
  useEffect(() => {
    const fetchAcoes = async () => {
      try {
        const q = query(collection(db, 'action_plans'), where('planType', '==', 'crescimento'));
        const snap = await getDocs(q);
        
        const plans = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => p.status === 'Em Andamento' || p.status === 'Finalizada');
          
        setAcoesCrescimento(plans);
      } catch (error) {
        console.error("Erro ao buscar planos de ação:", error);
      }
    };
    fetchAcoes();
  }, []);

  // FILTRA AS AÇÕES PARA MOSTRAR APENAS AS DA CIDADE SELECIONADA
  const acoesDaCidade = useMemo(() => {
    if (!form.cidade) return [];
    return acoesCrescimento.filter(p => p.cityId === form.cidade || p.cityId === '__all__');
  }, [acoesCrescimento, form.cidade]);

  const filteredProducts = useMemo(() => {
    if (!form.categoria) return [];
    return products.filter(p => p.categoryId === form.categoria || p.category === form.categoria);
  }, [form.categoria, products]);

  const handlePhoneChange = (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length <= 11) {
      v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
      v = v.replace(/(\d{5})(\d)/, '$1-$2');
    }
    setForm({ ...form, tel: v.substring(0, 15) });
  };

  const handleNext = () => {
    if (step === 1) {
      if (!form.nome || !form.tel || !form.cidade || !form.logradouro) {
        if (window.showToast) window.showToast("Preencha os dados obrigatórios do cliente.", "error");
        return;
      }
      // Validação: Se escolheu "Ação de Crescimento", é obrigatório selecionar qual foi a ação
      if (form.origem === 'Ação de Crescimento' && !form.acaoId) {
        if (window.showToast) window.showToast("Selecione qual foi a ação realizada.", "error");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!form.categoria || !form.produto) {
        if (window.showToast) window.showToast("Selecione a categoria e o plano.", "error");
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    if (!form.status) return window.showToast && window.showToast("Defina o status da negociação.", "error");
    
    setLoading(true);
    try {
      const city = cities.find(c => c.id === form.cidade) || { id: form.cidade, name: form.cidade };
      const cat = categories.find(c => c.id === form.categoria) || { id: form.categoria, name: 'Geral' };
      const prod = products.find(p => p.id === form.produto) || { id: form.produto, name: 'Produto Não Especificado', price: 0 };

      // Opcional: Se a origem for Ação, salvamos também o nome da ação para ficar legível no banco
      const payload = { ...form };
      if (payload.origem === 'Ação de Crescimento' && payload.acaoId) {
        const acaoObj = acoesDaCidade.find(a => a.id === payload.acaoId);
        if (acaoObj) payload.acaoNome = acaoObj.name;
      }

      await createLead(payload, userData, city, cat, prod);
      
      if (window.showToast) window.showToast("Lead registrado com sucesso!", "success");
      onNavigate('clientes');
    } catch (err) {
      if (window.showToast) window.showToast("Erro ao salvar lead.", "error");
    }
    setLoading(false);
  };

  const statusOptions = [
    { label: 'Em negociação', icon: Clock, color: colors.warning || '#f59e0b' },
    { label: 'Contratado', icon: CheckCircle2, color: colors.primary || '#3b82f6' },
    { label: 'Instalado', icon: Zap, color: colors.success || '#10b981' },
    { label: 'Descartado', icon: XCircle, color: colors.danger || '#ef4444' }
  ];

  return (
    <div className="animated-view animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      
      {/* ─── HEADER ESTILO HUB OQUEI ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '24px 30px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 16px ${colors.primary}35` }}>
            <UserPlus size={28} color="white" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Novo Lead</h1>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '4px' }}>Cadastre uma nova oportunidade para {userData?.cityName || 'sua unidade'}</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ width: '12px', height: '12px', borderRadius: '50%', background: step >= n ? colors.primary : 'var(--bg-app)', border: `1px solid ${step >= n ? colors.primary : 'var(--border)'}` }} />
          ))}
        </div>
      </div>

      {/* ─── CARD PRINCIPAL DO FORMULÁRIO ─── */}
      <div style={{ background: 'var(--bg-card)', padding: '40px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', position: 'relative', maxWidth: '1000px', width: '100%' }}>
        
        {/* ─── STEPPER VISUAL HORIZONTAL ─── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '45px' }}>
          {[1, 2, 3].map(n => (
            <React.Fragment key={n}>
              <div style={{ 
                width: '46px', height: '46px', borderRadius: '14px', 
                background: step >= n ? colors.primary : 'var(--bg-app)',
                color: step >= n ? 'white' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '18px',
                border: '2px solid', borderColor: step >= n ? colors.primary : 'var(--border)', 
                transition: 'all 0.3s ease',
                boxShadow: step === n ? `0 0 0 4px ${colors.primary}20` : 'none'
              }}>{n}</div>
              {n < 3 && <div style={{width: '60px', height: '4px', background: step > n ? colors.primary : 'var(--bg-panel)', transition: 'all 0.3s ease', borderRadius: '2px'}} />}
            </React.Fragment>
          ))}
        </div>

        {/* ─── PASSO 1: DADOS DO CLIENTE ─── */}
        {step === 1 && (
          <div className="animate-fadeInUp">
            <h3 style={{fontSize: '18px', fontWeight: '900', marginBottom: '25px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px'}}>
              <div style={{ padding: '8px', background: 'var(--bg-primary-light)', borderRadius: '10px', color: colors.primary }}><User size={20} /></div>
              Dados do Cliente e Localização
            </h3>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px'}}>
              <div style={global.field}>
                <label style={{...global.label, fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)'}}>Data do Contato</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input type="date" style={{...global.input, paddingLeft: '48px', height: '52px', borderRadius: '14px'}} value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                </div>
              </div>

              <div style={global.field}>
                <label style={{...global.label, fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)'}}>Cidade / Unidade</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <select style={{...global.select, paddingLeft: '48px', height: '52px', borderRadius: '14px'}} value={form.cidade} onChange={e => setForm({...form, cidade: e.target.value})}>
                    <option value="">Selecione a cidade...</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name || c.nome}</option>)}
                  </select>
                </div>
              </div>

              <div style={{...global.field, gridColumn: 'span 2'}}>
                <label style={{...global.label, fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)'}}>Nome Completo do Cliente</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input style={{...global.input, paddingLeft: '48px', height: '52px', borderRadius: '14px'}} placeholder="Ex: João da Silva" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} />
                </div>
              </div>

              <div style={global.field}>
                <label style={{...global.label, fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)'}}>WhatsApp / Celular</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input style={{...global.input, paddingLeft: '48px', height: '52px', borderRadius: '14px'}} placeholder="(00) 00000-0000" value={form.tel} onChange={handlePhoneChange} />
                </div>
              </div>
              
              {/* CAMPO: ORIGEM PADRÃO */}
              <div style={global.field}>
                <label style={{...global.label, fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: colors.primary}}>Canal de Entrada / Origem</label>
                <div style={{ position: 'relative' }}>
                  <Activity size={18} color={colors.primary} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <select 
                    style={{...global.select, paddingLeft: '48px', height: '52px', borderRadius: '14px', border: `1px solid ${colors.primary}50`}} 
                    value={form.origem} 
                    onChange={e => setForm({...form, origem: e.target.value, acaoId: ''})} // Limpa a ação se trocar a origem
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Telefone">Telefone</option>
                    <option value="Balcão/Loja">Balcão/Loja</option>
                    <option value="Indicação">Indicação</option>
                    <option value="Porta a Porta">Porta a Porta</option>
                    <option value="Redes Sociais">Redes Sociais</option>
                    <option value="Ação de Crescimento">Ação de Crescimento</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              {/* APARECE APENAS SE A ORIGEM FOR "Ação de Crescimento" */}
              {form.origem === 'Ação de Crescimento' && (
                <div className="animate-fadeIn" style={{...global.field, gridColumn: 'span 2'}}>
                  <label style={{...global.label, fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: '#f59e0b'}}>Selecione a Ação Realizada</label>
                  <div style={{ position: 'relative' }}>
                    <Target size={18} color="#f59e0b" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                    <select 
                      style={{...global.select, paddingLeft: '48px', height: '52px', borderRadius: '14px', border: `1px solid #f59e0b80`}} 
                      value={form.acaoId} 
                      onChange={e => setForm({...form, acaoId: e.target.value})}
                    >
                      <option value="">Selecione qual ação trouxe este cliente...</option>
                      {acoesDaCidade.length === 0 && <option value="" disabled>Nenhuma ação ativa para esta cidade.</option>}
                      {acoesDaCidade.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div style={global.field}>
                <label style={{...global.label, fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)'}}>Bairro</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input style={{...global.input, paddingLeft: '48px', height: '52px', borderRadius: '14px'}} placeholder="Ex: Centro" value={form.bairro} onChange={e => setForm({...form, bairro: e.target.value})} />
                </div>
              </div>

              <div style={{...global.field, gridColumn: 'span 2'}}>
                <label style={{...global.label, fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)'}}>Endereço (Rua e Número)</label>
                <div style={{display: 'flex', gap: '15px'}}>
                  <div style={{ position: 'relative', flex: 4 }}>
                    <Home size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input style={{...global.input, paddingLeft: '48px', height: '52px', borderRadius: '14px'}} placeholder="Rua / Avenida" value={form.logradouro} onChange={e => setForm({...form, logradouro: e.target.value})} />
                  </div>
                  <input style={{...global.input, flex: 1, textAlign: 'center', height: '52px', borderRadius: '14px'}} placeholder="Nº" value={form.numero} onChange={e => setForm({...form, numero: e.target.value})} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── PASSO 2: CATEGORIA E PRODUTO ─── */}
        {step === 2 && (
          <div className="animate-fadeInUp" style={{display: 'flex', flexDirection: 'column', gap: '25px'}}>
            <h3 style={{fontSize: '18px', fontWeight: '900', marginBottom: '5px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px'}}>
              <div style={{ padding: '8px', background: 'var(--bg-primary-light)', borderRadius: '10px', color: colors.primary }}><Layers size={20} /></div>
              Interesse e Produto
            </h3>

            <div style={global.field}>
              <label style={{...global.label, fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)'}}>Categoria de Interesse</label>
              <div style={{ position: 'relative' }}>
                <Layers size={18} color={form.categoria ? colors.primary : "var(--text-muted)"} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', transition: '0.2s' }} />
                <select style={{...global.select, paddingLeft: '48px', height: '52px', borderRadius: '14px'}} value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value, produto: ''})}>
                  <option value="">O que o cliente busca?</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name || cat.nome}</option>)}
                </select>
              </div>
            </div>

            <div style={global.field}>
              <label style={{...global.label, fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)'}}>Plano / Produto Disponível</label>
              <div style={{ position: 'relative' }}>
                <Tag size={18} color={form.produto ? colors.primary : "var(--text-muted)"} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', transition: '0.2s' }} />
                <select style={{...global.select, paddingLeft: '48px', height: '52px', borderRadius: '14px'}} value={form.produto} onChange={e => setForm({...form, produto: e.target.value})} disabled={!form.categoria}>
                  <option value="">{form.categoria ? 'Selecione o plano desejado...' : 'Selecione uma categoria primeiro'}</option>
                  {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.name} — R$ {Number(p.price).toFixed(2)}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ─── PASSO 3: STATUS DA NEGOCIAÇÃO ─── */}
        {step === 3 && (
          <div className="animate-fadeInUp">
             <h3 style={{fontSize: '18px', fontWeight: '900', marginBottom: '25px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center'}}>
               <div style={{ padding: '8px', background: 'var(--bg-primary-light)', borderRadius: '10px', color: colors.primary }}><CheckCircle2 size={20} /></div>
               Status da Negociação
            </h3>
             <label style={{...global.label, marginBottom: '25px', display: 'block', textAlign: 'center', fontSize: '15px'}}>Em qual estágio se encontra esta venda agora?</label>
             
             <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
              {statusOptions.map(opt => {
                const isSelected = form.status === opt.label;
                const IconComp = opt.icon;
                return (
                  <button 
                    key={opt.label} 
                    onClick={() => setForm({...form, status: opt.label})} 
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                      padding: '30px 20px', borderRadius: '20px', border: '2px solid',
                      borderColor: isSelected ? opt.color : 'var(--border)',
                      background: isSelected ? `${opt.color}10` : 'var(--bg-app)',
                      color: isSelected ? opt.color : 'var(--text-muted)',
                      fontWeight: '900', cursor: 'pointer', transition: 'all 0.2s ease',
                      boxShadow: isSelected ? `0 8px 24px ${opt.color}25` : 'none',
                      transform: isSelected ? 'translateY(-4px)' : 'translateY(0)'
                    }}
                  >
                    <IconComp size={36} strokeWidth={isSelected ? 2.5 : 2} color={isSelected ? opt.color : 'var(--text-muted)'} />
                    <span style={{ fontSize: '16px' }}>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── AÇÕES INFERIORES ─── */}
        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '50px', paddingTop: '30px', borderTop: '1px solid var(--border)'}}>
          <button 
            onClick={() => step === 1 ? onNavigate('inicio') : setStep(step - 1)} 
            style={{...global.btnSecondary, display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 28px', borderRadius: '14px', background: 'var(--bg-panel)', border: '1px solid var(--border)'}}
          >
            {step === 1 ? <><XCircle size={18} /> Cancelar</> : <><ArrowLeft size={18} /> Voltar</>}
          </button>
          
          <button 
            onClick={() => {
              if (step < 3) handleNext();
              else handleSubmit();
            }} 
            disabled={loading} 
            style={{...global.btnPrimary, width: 'auto', padding: '14px 40px', borderRadius: '14px', minWidth: '220px', display: 'flex', justifyContent: 'center', boxShadow: `0 8px 24px ${colors.primary}40`}}
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : (
              <span style={{display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: '900'}}>
                {step === 3 ? 'Finalizar e Salvar' : 'Próximo Passo'} 
                {step < 3 && <ChevronRight size={20} strokeWidth={3} />}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}