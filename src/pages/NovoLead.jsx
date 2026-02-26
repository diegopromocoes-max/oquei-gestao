import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, where } from 'firebase/firestore';
import { User, Package, RefreshCw, Briefcase, Target, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

export default function NovoLead({ userData, onNavigate }) {
const [step, setStep] = useState(1);
const [loading, setLoading] = useState(false);
const [cities, setCities] = useState([]);
const [products, setProducts] = useState([]);

const todayStr = new Date().toISOString().split('T')[0];

const [form, setForm] = useState({
date: todayStr, nome: '', tel: '', cidade: userData?.cityId || '', cityName: '',
leadType: '', produto: '', status: '', motive: '', fidelityMonth: ''
});

useEffect(() => {
const fetchData = async () => {
try {
// Busca apenas produtos ativos
const qProd = query(collection(db, "products"), where("active", "==", true));
const prodSnap = await getDocs(qProd);

    // Ordenação alfabética no frontend
    const prodList = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    prodList.sort((a, b) => a.name.localeCompare(b.name));
    setProducts(prodList);
    
    const citySnap = await getDocs(collection(db, "cities"));
    setCities(citySnap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (error) {
    console.error("Erro ao carregar os dados:", error);
  }
};
fetchData();


}, []);

const handleNext = () => {
if (step === 1) {
if (!form.nome || !form.tel || !form.cidade) return window.alert("Preencha os dados do cliente.");
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
  
  await addDoc(collection(db, "leads"), {
    attendantId: auth.currentUser?.uid || 'mock',
    attendantName: userData?.name || 'Atendente',
    cityId: form.cityName || form.cidade,
    date: form.date,
    customerName: form.nome,
    customerPhone: form.tel,
    leadType: form.leadType,
    productId: form.produto,
    productName: prodDetails?.name || 'Produto',
    productPrice: prodDetails?.price || 0, // Salva o valor atual do plano
    status: form.status,
    discardMotive: form.status === 'Descartado' ? form.motive : null,
    fidelityMonth: form.motive === 'Fidelidade em outro Provedor' ? form.fidelityMonth : null,
    createdAt: serverTimestamp()
  });
  
  window.alert("Lead registrado com sucesso!");
  if (onNavigate) onNavigate('clientes');
  
} catch (err) { 
  window.alert("Erro ao salvar: " + err.message); 
}
setLoading(false);


};

// Agrupamento de produtos por Categoria para exibir organizados no Select
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
style={isActive ? s.selectableCardActive : s.selectableCard}
>
{Icon && <Icon size={24} style={{marginBottom: '8px', color: isActive ? '#2563eb' : '#94a3b8'}}/>}
<span style={{fontWeight: 'bold', fontSize: '14px', color: isActive ? '#1e40af' : '#475569'}}>{label}</span>
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
border: isActive ? '2px solid ' + color : '2px solid #e2e8f0',
borderRadius: '16px', cursor: 'pointer', textAlign: 'center', transition: '0.2s',
background: isActive ? color + '15' : 'white',
display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
}}
>
<div style={{width: '16px', height: '16px', borderRadius: '50%', background: isActive ? color : '#e2e8f0'}} />
<span style={{fontWeight: 'bold', fontSize: '14px', color: isActive ? color : '#475569'}}>{label}</span>
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
          background: step >= num ? '#2563eb' : '#e2e8f0', color: step >= num ? 'white' : '#94a3b8',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
          transition: '0.3s'
        }}>
          {num}
        </div>
        {num < 3 && <div style={{width: '40px', height: '4px', background: step > num ? '#2563eb' : '#e2e8f0', borderRadius: '2px', transition: '0.3s'}} />}
      </div>
    ))}
  </div>

  <div style={{...s.card, padding: '40px', borderRadius: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.03)'}}>
    
    {/* PASSO 1: DADOS DO CLIENTE */}
    {step === 1 && (
      <div style={{animation: 'fadeIn 0.3s'}}>
        <h2 style={{fontSize: '22px', fontWeight: '900', color: '#1e293b', marginBottom: '5px'}}>Dados do Cliente</h2>
        <p style={{color: '#64748b', marginBottom: '25px', fontSize: '14px'}}>Informações básicas para iniciar a negociação.</p>
        
        <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
            <div>
              <label style={s.label}>Data do Contato</label>
              <input type="date" min={firstDay} max={lastDay} value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={s.inputPremium} required />
            </div>
            <div>
              <label style={s.label}>Loja / Cidade</label>
              <select value={form.cidade} onChange={e => setForm({...form, cidade: e.target.value})} style={s.inputPremium} required>
                <option value="" disabled>Selecione a cidade...</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={s.label}>Nome Completo do Cliente</label>
            <input placeholder="Digite o nome do cliente" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} style={s.inputPremium} required autoFocus />
          </div>
          
          <div>
            <label style={s.label}>WhatsApp / Telefone</label>
            <input placeholder="(00) 00000-0000" value={form.tel} onChange={e => setForm({...form, tel: e.target.value})} style={s.inputPremium} required />
          </div>
        </div>
      </div>
    )}

    {/* PASSO 2: SERVIÇO E NEGOCIAÇÃO */}
    {step === 2 && (
      <div style={{animation: 'fadeIn 0.3s'}}>
        <h2 style={{fontSize: '22px', fontWeight: '900', color: '#1e293b', marginBottom: '5px'}}>Interesse e Serviço</h2>
        <p style={{color: '#64748b', marginBottom: '25px', fontSize: '14px'}}>O que este cliente está buscando?</p>

        <label style={s.label}>Tipo de Negociação</label>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px'}}>
          <SelectableCard label="Plano Novo" value="Plano Novo" current={form.leadType} onClick={v => setForm({...form, leadType: v})} icon={Package} />
          <SelectableCard label="Migração" value="Migração" current={form.leadType} onClick={v => setForm({...form, leadType: v})} icon={RefreshCw} />
          <SelectableCard label="SVA" value="SVA" current={form.leadType} onClick={v => setForm({...form, leadType: v})} icon={Briefcase} />
        </div>

        <label style={s.label}>Serviço Desejado do Catálogo</label>
        <select value={form.produto} onChange={e => setForm({...form, produto: e.target.value})} style={s.inputPremium} required>
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
    )}

    {/* PASSO 3: FECHAMENTO */}
    {step === 3 && (
      <div style={{animation: 'fadeIn 0.3s'}}>
        <h2 style={{fontSize: '22px', fontWeight: '900', color: '#1e293b', marginBottom: '5px'}}>Desfecho da Negociação</h2>
        <p style={{color: '#64748b', marginBottom: '25px', fontSize: '14px'}}>Qual o status atual deste lead?</p>

        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '25px'}}>
          <StatusCard label="Em Negociação" value="Em negociação" current={form.status} onClick={v => setForm({...form, status: v, motive: ''})} color="#f59e0b" />
          <StatusCard label="Contratado" value="Contratado" current={form.status} onClick={v => setForm({...form, status: v, motive: ''})} color="#10b981" />
          <StatusCard label="Instalado" value="Instalado" current={form.status} onClick={v => setForm({...form, status: v, motive: ''})} color="#059669" />
          <StatusCard label="Descartado (Perda)" value="Descartado" current={form.status} onClick={v => setForm({...form, status: v})} color="#ef4444" />
        </div>

        {form.status === 'Descartado' && (
          <div style={{padding: '20px', background: '#fef2f2', borderRadius: '16px', border: '1px solid #fecaca', animation: 'fadeIn 0.3s'}}>
            <label style={{...s.label, color: '#991b1b'}}>Motivo da Perda (Obrigatório)</label>
            <select value={form.motive} onChange={e => setForm({...form, motive: e.target.value})} style={{...s.inputPremium, border: '1px solid #fca5a5'}} required>
              <option value="" disabled>Selecione o motivo exato...</option>
              <option value="Negativado">Cliente Negativado</option>
              <option value="Falta de Cobertura">Sem Viabilidade / Cobertura</option>
              <option value="Preço">Preço Alto / Concorrência mais barata</option>
              <option value="Cliente Desistiu">Cliente desistiu da contratação</option>
              <option value="Fidelidade em outro Provedor">Preso em Fidelidade na Concorrência</option>
            </select>

            {form.motive === 'Fidelidade em outro Provedor' && (
              <div style={{marginTop: '15px'}}>
                <label style={{...s.label, color: '#991b1b'}}>Mês Previsto para Fim da Fidelidade (Estimativa)</label>
                <input type="month" value={form.fidelityMonth} onChange={e => setForm({...form, fidelityMonth: e.target.value})} style={{...s.inputPremium, border: '1px solid #fca5a5'}} />
              </div>
            )}
          </div>
        )}
      </div>
    )}

    {/* NAVEGAÇÃO INFERIOR */}
    <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #f1f5f9'}}>
      {step > 1 ? (
        <button type="button" onClick={handleBack} style={s.btnSecondaryOutline}>
          <ArrowLeft size={18}/> Voltar
        </button>
      ) : (
        <button type="button" onClick={() => onNavigate && onNavigate('dashboard')} style={{...s.btnSecondaryOutline, color: '#94a3b8', borderColor: '#e2e8f0'}}>
          Cancelar
        </button>
      )}

      {step < 3 ? (
        <button type="button" onClick={handleNext} style={{...s.btnPrimary, width: 'auto', padding: '12px 30px'}}>
          Avançar <ArrowRight size={18}/>
        </button>
      ) : (
        <button type="button" onClick={handleSubmit} disabled={loading || !form.status} style={{...s.btnPrimary, width: 'auto', padding: '12px 30px', background: form.status ? '#10b981' : '#cbd5e1', boxShadow: form.status ? '0 8px 20px rgba(16,185,129,0.3)' : 'none'}}>
          {loading ? 'Salvando...' : 'Concluir Registro'} <CheckCircle size={18}/>
        </button>
      )}
    </div>

  </div>
</div>


);
}

const s = {
card: { background: 'white', padding: '40px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.03)' },
formSection: { padding: '24px', border: '1px solid #f1f5f9', borderRadius: '20px', background: '#fcfcfc', marginBottom: '20px' },
formSectionTitle: { fontSize: '14px', fontWeight: '800', color: '#334155', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' },
label: { display: 'block', fontSize: '13px', fontWeight: '800', color: '#475569', marginBottom: '8px' },
inputPremium: { padding: '16px 20px', borderRadius: '14px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px', color: '#1e293b', width: '100%', boxSizing: 'border-box', background: '#f8fafc', transition: 'border 0.2s', fontWeight: '500' },
selectableCard: { padding: '20px 15px', border: '2px solid #e2e8f0', borderRadius: '16px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center' },
selectableCardActive: { padding: '20px 15px', border: '2px solid #2563eb', borderRadius: '16px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', background: '#eff6ff', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 4px 12px rgba(37,99,235,0.1)' },
btnSecondaryOutline: { background: 'white', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '12px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' },
btnPrimary: { background: '#2563eb', color: 'white', border: 'none', padding: '14px 20px', borderRadius: '14px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', transition: 'transform 0.2s' },
};