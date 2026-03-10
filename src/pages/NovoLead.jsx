import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, where } from 'firebase/firestore';
import { 
  UserPlus, MapPin, Phone, Package, CheckCircle2, 
  ArrowRight, ArrowLeft, Loader2, Calendar, Tag, Layers
} from 'lucide-react';

import { styles as global, colors } from '../styles/globalStyles';

export default function NovoLead({ userData, onNavigate }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [cities, setCities] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const todayStr = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    date: todayStr, 
    nome: '', 
    tel: '', 
    cidade: userData?.cityId || '', 
    logradouro: '',
    numero: '',
    bairro: '',
    categoria: '', // ID da categoria
    produto: '',   // ID do produto
    status: '', 
  });

  // --- BUSCA DE DADOS ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const citySnap = await getDocs(collection(db, "cities"));
        setCities(citySnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        const catSnap = await getDocs(collection(db, "product_categories"));
        setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const qProd = query(collection(db, "products"), where("active", "==", true));
        const prodSnap = await getDocs(qProd);
        setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (err) { 
        console.error("Erro ao carregar dados:", err);
        window.showToast("Erro ao carregar catálogo.", "error");
      }
    };
    fetchData();
  }, []);

  // --- FILTRAGEM DINÂMICA ---
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
        return window.showToast("Preencha os dados do cliente e endereço.", "error");
      }
      setStep(2);
    } else if (step === 2) {
      if (!form.categoria || !form.produto) {
        return window.showToast("Selecione a Categoria e o Plano.", "error");
      }
      setStep(3);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const prodDetails = products.find(p => p.id === form.produto);
      const cityDetails = cities.find(c => c.id === form.cidade);
      const catDetails = categories.find(c => c.id === form.categoria);

      await addDoc(collection(db, "leads"), {
        date: form.date,
        createdAt: serverTimestamp(),
        lastUpdate: serverTimestamp(),
        attendantId: auth.currentUser?.uid,
        attendantName: userData?.name || 'Atendente',
        customerName: form.nome,
        customerPhone: form.tel,
        cityId: cityDetails?.name || cityDetails?.nome || form.cidade,
        address: `${form.logradouro}, ${form.numero} - ${form.bairro}`,
        // Dados do Produto
        categoryName: catDetails?.name || catDetails?.nome || 'Geral',
        productId: form.produto,
        productName: prodDetails?.name || 'Produto',
        productPrice: prodDetails?.price || 0,
        status: form.status,
        isMetaBatida: false
      });
      
      window.showToast("Lead registrado com sucesso!", "success");
      onNavigate('clientes');
    } catch (err) { 
      window.showToast("Erro ao salvar lead.", "error"); 
    }
    setLoading(false);
  };

  return (
    <div style={{ width: '100%', maxWidth: '750px', margin: '0 auto', animation: 'fadeIn 0.4s ease-out' }}>
      
      <div style={global.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
          <div style={{...global.iconHeader, background: colors?.primary || '#2563eb'}}>
            <UserPlus size={28} color="white"/>
          </div>
          <div>
            <h1 style={global.title}>Novo Lead</h1>
            <p style={global.subtitle}>Registro de oportunidade comercial</p>
          </div>
        </div>
      </div>

      <div style={{...global.card, padding: '40px', borderRadius: '24px'}}>
        
        {/* INDICADOR DE PASSOS */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginBottom: '40px' }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ 
              width: '35px', height: '35px', borderRadius: '50%', 
              background: step >= n ? 'var(--text-brand)' : 'var(--bg-app)',
              color: step >= n ? 'white' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900',
              border: '1px solid var(--border)', transition: '0.3s'
            }}>{n}</div>
          ))}
        </div>

        {/* PASSO 1: DADOS PESSOAIS */}
        {step === 1 && (
          <div style={{animation: 'fadeInUp 0.3s'}}>
            <div style={{...global.field, marginBottom: '25px'}}>
              <label style={global.label}>Data do Contato</label>
              <div style={{position: 'relative'}}>
                <input type="date" style={{...global.input, paddingLeft: '45px'}} value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                <Calendar size={18} color="var(--text-brand)" style={{position: 'absolute', left: '15px', top: '14px'}} />
              </div>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
              <div style={global.field}><label style={global.label}>Nome do Cliente</label><input style={global.input} placeholder="Nome Completo" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} /></div>
              <div style={global.field}><label style={global.label}>WhatsApp</label><input style={global.input} placeholder="(00) 00000-0000" value={form.tel} onChange={handlePhoneChange} /></div>
              
              <div style={global.field}>
                <label style={global.label}>Cidade / Unidade</label>
                <select style={global.select} value={form.cidade} onChange={e => setForm({...form, cidade: e.target.value})}>
                  <option value="">Selecione...</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name || c.nome}</option>)}
                </select>
              </div>

              <div style={global.field}><label style={global.label}>Bairro</label><input style={global.input} placeholder="Bairro" value={form.bairro} onChange={e => setForm({...form, bairro: e.target.value})} /></div>

              <div style={{...global.field, gridColumn: 'span 2'}}>
                <label style={global.label}>Rua e Número</label>
                <div style={{display: 'flex', gap: '10px'}}>
                  <input style={{...global.input, flex: 3}} placeholder="Ex: Av. Principal" value={form.logradouro} onChange={e => setForm({...form, logradouro: e.target.value})} />
                  <input style={{...global.input, flex: 1}} placeholder="Nº" value={form.numero} onChange={e => setForm({...form, numero: e.target.value})} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PASSO 2: CATEGORIA E PRODUTO (LIMPO) */}
        {step === 2 && (
          <div style={{animation: 'fadeInUp 0.3s'}}>
            <h3 style={{fontSize: '18px', fontWeight: '800', marginBottom: '25px', color: 'var(--text-main)'}}>2. Seleção de Plano</h3>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '25px'}}>
              {/* CATEGORIA */}
              <div style={global.field}>
                <label style={global.label}>Categoria</label>
                <div style={{position: 'relative'}}>
                  <select 
                    style={{...global.select, paddingLeft: '45px'}} 
                    value={form.categoria} 
                    onChange={e => setForm({...form, categoria: e.target.value, produto: ''})}
                  >
                    <option value="">Selecione a categoria (Fibra, SVA, etc...)</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name || cat.nome}</option>
                    ))}
                  </select>
                  <Layers size={18} color="var(--text-brand)" style={{position: 'absolute', left: '15px', top: '14px'}} />
                </div>
              </div>

              {/* PRODUTO */}
              <div style={global.field}>
                <label style={global.label}>Plano Disponível</label>
                <div style={{position: 'relative'}}>
                  <select 
                    style={{...global.select, paddingLeft: '45px'}} 
                    value={form.produto} 
                    onChange={e => setForm({...form, produto: e.target.value})}
                    disabled={!form.categoria}
                  >
                    <option value="">{form.categoria ? 'Escolha o plano...' : 'Selecione a categoria primeiro'}</option>
                    {filteredProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - R$ {p.price}</option>
                    ))}
                  </select>
                  <Tag size={18} color={form.categoria ? "var(--text-brand)" : "#ccc"} style={{position: 'absolute', left: '15px', top: '14px'}} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PASSO 3: STATUS */}
        {step === 3 && (
          <div style={{animation: 'fadeInUp 0.3s'}}>
            <h3 style={{fontSize: '18px', fontWeight: '800', marginBottom: '25px'}}>3. Status da Negociação</h3>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
              {['Em negociação', 'Contratado', 'Instalado', 'Descartado'].map(st => (
                <button key={st} onClick={() => setForm({...form, status: st})} style={{
                  padding: '20px', borderRadius: '15px', border: '1px solid var(--border)',
                  background: form.status === st ? 'var(--bg-primary-light)' : 'var(--bg-panel)',
                  color: form.status === st ? 'var(--text-brand)' : 'var(--text-muted)',
                  fontWeight: 'bold', cursor: 'pointer'
                }}>{st}</button>
              ))}
            </div>
          </div>
        )}

        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '40px', borderTop: '1px solid var(--border)', paddingTop: '30px'}}>
          <button onClick={() => step === 1 ? onNavigate('inicio') : setStep(step - 1)} style={global.btnSecondary}>Voltar</button>
          <button onClick={step === 3 ? handleSubmit : handleNext} disabled={loading} style={{...global.btnPrimary, width: 'auto', padding: '0 40px'}}>
            {loading ? <Loader2 className="animate-spin" /> : step === 3 ? 'Finalizar Registro' : 'Próximo Passo'}
          </button>
        </div>
      </div>
    </div>
  );
}