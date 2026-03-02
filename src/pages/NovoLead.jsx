import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, where } from 'firebase/firestore';
import { User, Package, RefreshCw, Briefcase, Target, ArrowRight, ArrowLeft, CheckCircle, MapPin, Phone } from 'lucide-react';

import { styles as global } from '../styles/globalStyles';

export default function NovoLead({ userData, onNavigate }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState([]);
  const [products, setProducts] = useState([]);

  const todayStr = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    date: todayStr, 
    nome: '', 
    tel: '', 
    cidade: userData?.cityId || '', 
    cityName: '',
    cep: '',
    logradouro: '',
    numero: '',
    bairro: '',
    leadType: '', 
    produto: '', 
    status: '', 
    motive: '', 
    fidelityMonth: ''
  });

  // --- BUSCA DE DADOS (CIDADES E PRODUTOS DO BANCO) ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Busca apenas produtos ativos
        const qProd = query(collection(db, "products"), where("active", "==", true));
        const prodSnap = await getDocs(qProd);
        const prodList = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        prodList.sort((a, b) => a.name.localeCompare(b.name));
        setProducts(prodList);
        
        // Busca Cidades
        const citySnap = await getDocs(collection(db, "cities"));
        setCities(citySnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Erro ao carregar os dados:", error);
      }
    };
    fetchData();
  }, []);

  // --- MÁSCARAS E FORMATAÇÕES ---
  const maskPhone = (value) => {
    let v = value.replace(/\D/g, '');
    if (v.length <= 10) {
      v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
      v = v.replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
      v = v.replace(/(\d{5})(\d)/, '$1-$2');
    }
    return v.substring(0, 15);
  };

  const maskCEP = (value) => {
    let v = value.replace(/\D/g, '');
    v = v.replace(/^(\d{5})(\d)/, '$1-$2');
    return v.substring(0, 9);
  };

  const handlePhoneChange = (e) => {
    setForm({ ...form, tel: maskPhone(e.target.value) });
  };

  const fetchAddressByCEP = async (cepValue) => {
    const cleanCep = cepValue.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setForm(prev => ({ 
            ...prev, 
            logradouro: data.logradouro || '', 
            bairro: data.bairro || '' 
          }));
        }
      } catch (err) {
        console.error("Erro ao buscar CEP", err);
      }
    }
  };

  const handleCepChange = (e) => {
    const masked = maskCEP(e.target.value);
    setForm({ ...form, cep: masked });
    if (masked.length === 9) {
      fetchAddressByCEP(masked);
    }
  };

  // --- NAVEGAÇÃO E SUBMISSÃO ---
  const handleNext = () => {
    if (step === 1) {
      if (!form.nome || !form.tel || !form.cidade || !form.logradouro || !form.numero) {
        return window.alert("Preencha todos os dados do cliente e endereço.");
      }
      const selectedCityObj = cities.find(c => c.id === form.cidade);
      if (selectedCityObj) setForm(prev => ({...prev, cityName: selectedCityObj.name}));
      setStep(2);
    } else if (step === 2) {
      if (!form.leadType || !form.produto) return window.alert("Selecione o tipo de negociação e o serviço.");
      setStep(3);
    }
  };

  const handleBack = () => setStep(step - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.status) return window.alert("Selecione o status final.");
    if (form.status === 'Descartado' && !form.motive) return window.alert("Informe o motivo do descarte.");

    setLoading(true);
    try {
      const prodDetails = products.find(p => p.id === form.produto);
      const fullAddress = `${form.logradouro}, ${form.numero} - ${form.bairro} (CEP: ${form.cep})`;
      
      await addDoc(collection(db, "leads"), {
        attendantId: auth.currentUser?.uid || 'mock',
        attendantName: userData?.name || 'Atendente',
        cityId: form.cityName || form.cidade,
        date: form.date,
        customerName: form.nome,
        customerPhone: form.tel,
        address: fullAddress, 
        addressDetails: {
          cep: form.cep,
          logradouro: form.logradouro,
          numero: form.numero,
          bairro: form.bairro
        },
        leadType: form.leadType,
        productId: form.produto,
        productName: prodDetails?.name || 'Produto',
        productPrice: prodDetails?.price || 0,
        status: form.status,
        discardMotive: form.status === 'Descartado' ? form.motive : null,
        fidelityMonth: form.motive === 'Fidelidade em outro Provedor' ? form.fidelityMonth : null,
        createdAt: serverTimestamp()
      });
      
      window.alert("Lead registado com sucesso no Funil!");
      if (onNavigate) onNavigate('clientes');
      
    } catch (err) { 
      window.alert("Erro ao salvar: " + err.message); 
    }
    setLoading(false);
  };

  const groupedProducts = products.reduce((acc, p) => {
    const cat = p.categoryName || 'Outros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const SelectableCard = ({ label, value, current, onClick, icon: Icon }) => {
    const isActive = current === value;
    return (
      <div
        onClick={() => onClick(value)}
        style={isActive ? local.selectableCardActive : local.selectableCard}
      >
        {Icon && <Icon size={24} style={{marginBottom: '8px', color: isActive ? 'var(--text-brand)' : 'var(--text-muted)'}}/>}
        <span style={{fontWeight: 'bold', fontSize: '14px', color: isActive ? 'var(--text-brand)' : 'var(--text-muted)'}}>{label}</span>
      </div>
    );
  };

  const StatusCard = ({ label, value, current, onClick, color }) => {
    const isActive = current === value;
    return (
      <div
        onClick={() => onClick(value)}
        style={{
          padding: '20px 15px',
          border: isActive ? `2px solid ${color}` : '2px solid var(--border)',
          borderRadius: '16px', cursor: 'pointer', textAlign: 'center', transition: '0.2s',
          background: isActive ? `${color}15` : 'var(--bg-app)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
        }}
      >
        <div style={{width: '16px', height: '16px', borderRadius: '50%', background: isActive ? color : 'var(--border)'}} />
        <span style={{fontWeight: 'bold', fontSize: '14px', color: isActive ? color : 'var(--text-muted)'}}>{label}</span>
      </div>
    );
  };

  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

  return (
    <div style={{animation: 'fadeIn 0.4s ease-out', maxWidth: '700px', margin: '0 auto'}}>

      {/* HEADER WIZARD */}
      <div style={{display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '30px'}}>
        {[1, 2, 3].map(num => (
          <div key={num} style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', 
              background: step >= num ? 'var(--text-brand)' : 'var(--bg-panel)', 
              color: step >= num ? 'white' : 'var(--text-muted)',
              border: step >= num ? 'none' : '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
              transition: '0.3s'
            }}>
              {num}
            </div>
            {num < 3 && <div style={{width: '40px', height: '4px', background: step > num ? 'var(--text-brand)' : 'var(--bg-panel)', borderRadius: '2px', transition: '0.3s'}} />}
          </div>
        ))}
      </div>

      <div style={{...global.card, padding: '40px', borderRadius: '24px'}}>
        
        {/* PASSO 1: DADOS DO CLIENTE */}
        {step === 1 && (
          <div style={{animation: 'fadeIn 0.3s'}}>
            <h2 style={{fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '5px'}}>Dados do Cliente</h2>
            <p style={{color: 'var(--text-muted)', marginBottom: '25px', fontSize: '14px'}}>Informações de contacto e localização para viabilidade.</p>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                <div style={global.field}>
                  <label style={global.label}>Data do Contato</label>
                  <input type="date" min={firstDay} max={lastDay} value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={global.input} required />
                </div>
                <div style={global.field}>
                  <label style={global.label}>Loja / Praça</label>
                  <select value={form.cidade} onChange={e => setForm({...form, cidade: e.target.value})} style={global.input} required>
                    <option value="" disabled>Selecione a cidade...</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '15px'}}>
                <div style={global.field}>
                  <label style={global.label}>Nome Completo do Cliente</label>
                  <div style={local.inputIconWrapper}>
                    <User size={18} color="var(--text-muted)" />
                    <input placeholder="Ex: João da Silva" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} style={local.inputClean} required autoFocus />
                  </div>
                </div>
                <div style={global.field}>
                  <label style={global.label}>WhatsApp / Telefone</label>
                  <div style={local.inputIconWrapper}>
                    <Phone size={18} color="var(--text-muted)" />
                    <input placeholder="(00) 00000-0000" value={form.tel} onChange={handlePhoneChange} maxLength="15" style={local.inputClean} required />
                  </div>
                </div>
              </div>

              {/* BLOCO DE ENDEREÇO (Com Máscara e API) */}
              <div style={{padding: '20px', background: 'var(--bg-panel)', borderRadius: '16px', border: '1px solid var(--border)'}}>
                <h4 style={{fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <MapPin size={16} color="var(--text-brand)"/> Localização (Para Geomarketing)
                </h4>
                
                <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px', marginBottom: '15px'}}>
                  <div style={global.field}>
                    <label style={global.label}>CEP</label>
                    <input placeholder="00000-000" value={form.cep} onChange={handleCepChange} maxLength="9" style={global.input} required />
                  </div>
                  <div style={global.field}>
                    <label style={global.label}>Logradouro (Rua/Av)</label>
                    <input placeholder="Ex: Rua das Flores" value={form.logradouro} onChange={e => setForm({...form, logradouro: e.target.value})} style={global.input} required />
                  </div>
                </div>

                <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px'}}>
                  <div style={global.field}>
                    <label style={global.label}>Número</label>
                    <input placeholder="Ex: 123" value={form.numero} onChange={e => setForm({...form, numero: e.target.value})} style={global.input} required />
                  </div>
                  <div style={global.field}>
                    <label style={global.label}>Bairro</label>
                    <input placeholder="Ex: Centro" value={form.bairro} onChange={e => setForm({...form, bairro: e.target.value})} style={global.input} required />
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* PASSO 2: SERVIÇO E NEGOCIAÇÃO */}
        {step === 2 && (
          <div style={{animation: 'fadeIn 0.3s'}}>
            <h2 style={{fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '5px'}}>Interesse e Serviço</h2>
            <p style={{color: 'var(--text-muted)', marginBottom: '25px', fontSize: '14px'}}>O que este cliente está buscando?</p>

            <label style={global.label}>Tipo de Negociação</label>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px'}}>
              <SelectableCard label="Plano Novo" value="Plano Novo" current={form.leadType} onClick={v => setForm({...form, leadType: v})} icon={Package} />
              <SelectableCard label="Migração" value="Migração" current={form.leadType} onClick={v => setForm({...form, leadType: v})} icon={RefreshCw} />
              <SelectableCard label="SVA" value="SVA" current={form.leadType} onClick={v => setForm({...form, leadType: v})} icon={Briefcase} />
            </div>

            <div style={global.field}>
              <label style={global.label}>Serviço Desejado do Catálogo Oficial</label>
              <select value={form.produto} onChange={e => setForm({...form, produto: e.target.value})} style={global.select} required>
                <option value="" disabled>Selecione o plano ou serviço...</option>
                {Object.entries(groupedProducts).map(([categoryName, prods]) => (
                  <optgroup key={categoryName} label={categoryName}>
                    {prods.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - R$ {Number(p.price).toFixed(2)}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* PASSO 3: FECHAMENTO */}
        {step === 3 && (
          <div style={{animation: 'fadeIn 0.3s'}}>
            <h2 style={{fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '5px'}}>Desfecho da Negociação</h2>
            <p style={{color: 'var(--text-muted)', marginBottom: '25px', fontSize: '14px'}}>Qual o status atual deste lead?</p>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px'}}>
              <StatusCard label="Em Negociação" value="Em negociação" current={form.status} onClick={v => setForm({...form, status: v, motive: ''})} color="#f59e0b" />
              <StatusCard label="Contratado" value="Contratado" current={form.status} onClick={v => setForm({...form, status: v, motive: ''})} color="#10b981" />
              <StatusCard label="Instalado" value="Instalado" current={form.status} onClick={v => setForm({...form, status: v, motive: ''})} color="#059669" />
              <StatusCard label="Descartado (Perda)" value="Descartado" current={form.status} onClick={v => setForm({...form, status: v})} color="#ef4444" />
            </div>

            {form.status === 'Descartado' && (
              <div style={{padding: '20px', background: 'var(--bg-danger-light)', borderRadius: '16px', border: '1px solid var(--border-danger)', animation: 'fadeIn 0.3s'}}>
                <div style={global.field}>
                  <label style={{...global.label, color: '#ef4444'}}>Motivo da Perda (Obrigatório)</label>
                  <select value={form.motive} onChange={e => setForm({...form, motive: e.target.value})} style={{...global.select, borderColor: 'var(--border-danger)'}} required>
                    <option value="" disabled>Selecione o motivo exato...</option>
                    <option value="Negativado">Cliente Negativado</option>
                    <option value="Falta de Cobertura">Sem Viabilidade / Cobertura</option>
                    <option value="Preço">Preço Alto / Concorrência mais barata</option>
                    <option value="Cliente Desistiu">Cliente desistiu da contratação</option>
                    <option value="Fidelidade em outro Provedor">Preso em Fidelidade na Concorrência</option>
                  </select>
                </div>

                {form.motive === 'Fidelidade em outro Provedor' && (
                  <div style={{...global.field, marginTop: '15px'}}>
                    <label style={{...global.label, color: '#ef4444'}}>Mês Previsto para Fim da Fidelidade (Estimativa)</label>
                    <input type="month" value={form.fidelityMonth} onChange={e => setForm({...form, fidelityMonth: e.target.value})} style={{...global.input, borderColor: 'var(--border-danger)'}} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* NAVEGAÇÃO INFERIOR */}
        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--border)'}}>
          {step > 1 ? (
            <button type="button" onClick={handleBack} style={global.btnSecondary}>
              <ArrowLeft size={18}/> Voltar
            </button>
          ) : (
            <button type="button" onClick={() => onNavigate && onNavigate('clientes')} style={global.btnSecondary}>
              Cancelar
            </button>
          )}

          {step < 3 ? (
            <button type="button" onClick={handleNext} style={{...global.btnPrimary, width: 'auto', padding: '12px 30px'}}>
              Avançar <ArrowRight size={18}/>
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={loading || !form.status} style={{...global.btnPrimary, width: 'auto', padding: '12px 30px', background: form.status ? '#10b981' : 'var(--text-muted)'}}>
              {loading ? 'A Guardar...' : 'Concluir Registo'} <CheckCircle size={18}/>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

const local = {
  // Wrapper para inputs com ícones
  inputIconWrapper: { display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--bg-app)', transition: 'border 0.2s' },
  inputClean: { flex: 1, border: 'none', padding: '12px 0', outline: 'none', fontSize: '14px', color: 'var(--text-main)', fontWeight: '500', background: 'transparent' },

  selectableCard: { padding: '20px 15px', border: '2px solid var(--border)', borderRadius: '16px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', background: 'var(--bg-app)', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  selectableCardActive: { padding: '20px 15px', border: '2px solid var(--text-brand)', borderRadius: '16px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', background: 'var(--bg-primary-light)', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 'var(--shadow-sm)' },
};