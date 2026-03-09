import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';
import { 
  ShoppingBag, Plus, Search, Edit, Trash2, 
  Wifi, Tv, Package, X, CheckCircle, AlertCircle, Filter, Tag, Eraser, Layers
} from 'lucide-react';

import { styles as global } from '../styles/globalStyles';

export default function GestaoProdutos() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Modais
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  // Estados para Gestão de Produtos
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', categoryId: '', price: '', description: '', active: true
  });

  // Estados para Gestão de Categorias
  const [catName, setCatName] = useState('');
  const [catTemMeta, setCatTemMeta] = useState(true); // O NOSSO NOVO CAMPO DE META!
  const [editingCat, setEditingCat] = useState(null);

  // --- CARREGAMENTO DO BANCO DE DADOS ---
  const fetchCategories = async () => {
    try {
      const snap = await getDocs(query(collection(db, "product_categories"), orderBy("name")));
      if (snap.empty) {
        // Se estiver vazio, cria as categorias com a meta ativada por defeito
        const defaultCats = ['Plano de Internet', 'SVA', 'Equipamento', 'Serviço Adicional'];
        for (const cat of defaultCats) {
            await addDoc(collection(db, "product_categories"), { name: cat, temMeta: true });
        }
        const snap2 = await getDocs(query(collection(db, "product_categories"), orderBy("name")));
        setCategorias(snap2.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        setCategorias(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (err) {
      console.error("Erro categorias:", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const q = query(collection(db, "products"), orderBy("name"));
      const snap = await getDocs(q);
      setProdutos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      window.alert("Erro ao carregar produtos: " + err.message);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await fetchCategories();
    await fetchProducts();
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // --- CONTROLE DE CATEGORIAS ---
  const handleSaveCat = async (e) => {
    e.preventDefault();
    try {
      if (editingCat) {
        await updateDoc(doc(db, "product_categories", editingCat.id), { 
          name: catName, 
          temMeta: catTemMeta 
        });
      } else {
        await addDoc(collection(db, "product_categories"), { 
          name: catName, 
          temMeta: catTemMeta 
        });
      }
      setCatName('');
      setCatTemMeta(true);
      setEditingCat(null);
      fetchCategories();
    } catch (err) { alert(err.message); }
  };

  const handleDeleteCategory = async (id) => {
    const q = query(collection(db, "products"), where("categoryId", "==", id));
    const snap = await getDocs(q);
    if (!snap.empty) {
      alert(`Não é possível excluir! Existem ${snap.size} produtos usando esta categoria.`);
      return;
    }
    if (window.confirm("Excluir esta categoria permanentemente?")) {
      await deleteDoc(doc(db, "product_categories", id));
      fetchCategories();
    }
  };

  const openCatModal = () => {
    setCatName('');
    setCatTemMeta(true);
    setEditingCat(null);
    setShowCategoryModal(true);
  };

  // --- CONTROLE DE PRODUTOS ---
  const openModal = (prod = null) => {
    if (prod) {
      setForm({
        name: prod.name || '',
        categoryId: prod.categoryId || (categorias.length > 0 ? categorias[0].id : ''),
        price: prod.price || '',
        description: prod.description || '',
        active: prod.active !== false 
      });
      setEditingId(prod.id);
    } else {
      setForm({ 
        name: '', 
        categoryId: categorias.length > 0 ? categorias[0].id : '', 
        price: '', 
        description: '', 
        active: true 
      });
      setEditingId(null);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const catObj = categorias.find(c => c.id === form.categoryId);
      const payload = {
        ...form,
        categoryName: catObj ? catObj.name : 'Sem Categoria',
        price: parseFloat(form.price) || 0
      };

      if (editingId) {
        await updateDoc(doc(db, "products", editingId), payload);
        window.alert("Produto atualizado com sucesso!");
      } else {
        await addDoc(collection(db, "products"), payload);
        window.alert("Produto cadastrado com sucesso!");
      }
      closeModal();
      fetchProducts();
    } catch (err) {
      window.alert("Erro ao salvar: " + err.message);
    }
    setIsSaving(false);
  };

  const handleDeleteProduct = async (id) => {
    try {
      const q = query(collection(db, "leads"), where("productId", "==", id));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const confirmRisk = window.confirm(`⚠️ ALERTA DE INTEGRIDADE: Este serviço possui ${snap.size} venda(s) vinculada(s) no sistema!\n\nExcluí-lo permanentemente pode afetar o histórico de relatórios passados e comissões.\n\nDeseja continuar com a exclusão mesmo assim? (Recomendamos apenas INATIVAR o produto)`);
        if (!confirmRisk) return;
      } else {
        const confirmNormal = window.confirm("Tem certeza que deseja excluir este serviço do catálogo?");
        if (!confirmNormal) return;
      }

      await deleteDoc(doc(db, "products", id));
      fetchProducts();
    } catch (err) {
      window.alert("Erro ao excluir: " + err.message);
    }
  };

  const toggleActiveStatus = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, "products", id), { active: !currentStatus });
      fetchProducts();
    } catch (err) {
      window.alert("Erro ao alterar status.");
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterCategory('all');
  };

  const filteredProducts = produtos.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterCategory === 'all' || p.categoryId === filterCategory;
    return matchesSearch && matchesType;
  });

  const getIconForCategory = (catName) => {
    const name = catName?.toLowerCase() || '';
    if (name.includes('internet') || name.includes('plano')) return <Wifi size={24} color="var(--text-brand)" />;
    if (name.includes('sva') || name.includes('tv')) return <Tv size={24} color="#ea580c" />;
    if (name.includes('equipamento') || name.includes('roteador')) return <Package size={24} color="#10b981" />;
    return <Tag size={24} color="#7c3aed" />;
  };

  const getColorForCategory = (catName) => {
    const name = catName?.toLowerCase() || '';
    if (name.includes('internet') || name.includes('plano')) return 'var(--bg-primary-light)';
    if (name.includes('sva') || name.includes('tv')) return 'rgba(234, 88, 12, 0.1)';
    if (name.includes('equipamento') || name.includes('roteador')) return 'var(--bg-success-light)';
    return 'rgba(124, 58, 237, 0.1)';
  };

  return (
    <div style={{...(global.container || {}), maxWidth: '1200px'}}>
      
      <div style={global.header}>
        <div style={{...(global.iconHeader || {}), background: '#ea580c'}}><ShoppingBag size={28} color="white"/></div>
        <div>
          <h1 style={global.title}>Produtos & Serviços</h1>
          <p style={global.subtitle}>Gerencie o catálogo de ofertas e categorias da Oquei Telecom.</p>
        </div>
      </div>

      <div style={global.toolbar}>
        <div style={{display: 'flex', gap: '15px', flexWrap: 'wrap', flex: 1}}>
          <div style={global.searchBox}>
            <Search size={18} color="var(--text-muted)" />
            <input 
              style={global.searchInput} 
              placeholder="Buscar produto pelo nome..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div style={{display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-card)', padding: '12px 15px', borderRadius: '14px', border: '1px solid var(--border)'}}>
            <Filter size={18} color="var(--text-muted)" />
            <select style={{border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', color: 'var(--text-main)', fontWeight: 'bold', cursor: 'pointer'}} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="all">Todas as Categorias</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {(searchTerm !== '' || filterCategory !== 'all') && (
            <button onClick={clearFilters} style={{background: 'var(--bg-danger-light)', color: '#ef4444', border: '1px solid var(--border-danger)', padding: '12px 16px', borderRadius: '14px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'}}>
              <Eraser size={16} /> Limpar Filtros
            </button>
          )}
        </div>

        <div style={{display: 'flex', gap: '10px'}}>
          <button onClick={openCatModal} style={global.btnSecondary}>
            <Layers size={18} /> Categorias
          </button>
          <button onClick={() => openModal()} style={{...(global.btnPrimary || {}), background: '#ea580c'}}>
            <Plus size={18} /> Novo Serviço
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{padding: '50px', textAlign: 'center', color: 'var(--text-muted)'}}>Carregando catálogo...</div>
      ) : (
        <div style={global.gridCards}>
          {filteredProducts.map(prod => (
            <div key={prod.id} style={{...(global.card || {}), display: 'flex', flexDirection: 'column', opacity: prod.active === false ? 0.6 : 1}}>
              
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px'}}>
                <div style={{padding: '12px', borderRadius: '14px', background: getColorForCategory(prod.categoryName)}}>
                  {getIconForCategory(prod.categoryName)}
                </div>
                <div style={{display:'flex', gap:'5px'}}>
                   <button onClick={() => openModal(prod)} style={global.iconBtn} title="Editar">
                     <Edit size={16} color="var(--text-brand)"/>
                   </button>
                   <button onClick={() => handleDeleteProduct(prod.id)} style={global.iconBtn} title="Excluir">
                     <Trash2 size={16} color="#ef4444"/>
                   </button>
                </div>
              </div>
              
              <div style={{flex: 1, marginBottom: '20px'}}>
                <span style={{fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block'}}>{prod.categoryName}</span>
                <h3 style={{fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 10px 0'}}>{prod.name}</h3>
                <p style={{fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0}}>{prod.description || 'Sem descrição cadastrada.'}</p>
              </div>
              
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid var(--border)'}}>
                <div style={{fontSize: '20px', fontWeight: '900', color: '#10b981'}}>R$ {Number(prod.price).toFixed(2)}</div>
                <button 
                  onClick={() => toggleActiveStatus(prod.id, prod.active)}
                  style={{
                    border: 'none', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                    background: prod.active !== false ? 'var(--bg-success-light)' : 'var(--bg-panel)',
                    color: prod.active !== false ? '#10b981' : 'var(--text-muted)'
                  }}
                >
                  {prod.active !== false ? <CheckCircle size={14}/> : <AlertCircle size={14}/>}
                  {prod.active !== false ? 'Ativo' : 'Inativo'}
                </button>
              </div>

            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div style={{gridColumn: '1 / -1', ...global.emptyState}}>Nenhum produto encontrado.</div>
          )}
        </div>
      )}

      {/* MODAL DE PRODUTOS */}
      {showModal && (
        <div style={global.modalOverlay}>
          <div style={global.modalBox}>
            <div style={global.modalHeader}>
              <h3 style={global.modalTitle}>{editingId ? 'Editar Serviço' : 'Novo Item do Catálogo'}</h3>
              <button onClick={closeModal} style={global.closeBtn}><X size={24} /></button>
            </div>

            <form onSubmit={handleSaveProduct} style={global.form}>
              
              <div style={global.field}>
                <label style={global.label}>Nome do Produto/Serviço</label>
                <input 
                  style={global.input} 
                  placeholder="Ex: Plano 600 Mega" 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  required 
                  autoFocus
                />
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                <div style={global.field}>
                  <label style={global.label}>Categoria</label>
                  <select style={global.select} value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})} required>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={global.field}>
                  <label style={global.label}>Valor da mensalidade (R$)</label>
                  <input 
                    style={global.input} 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    value={form.price} 
                    onChange={e => setForm({...form, price: e.target.value})} 
                    required 
                  />
                </div>
              </div>

              <div style={global.field}>
                <label style={global.label}>Descrição (Informativo para Vendas)</label>
                <textarea 
                  style={global.textarea} 
                  placeholder="Detalhes sobre o plano, benefícios, regras de fidelidade..." 
                  value={form.description} 
                  onChange={e => setForm({...form, description: e.target.value})} 
                />
              </div>

              <div style={{display:'flex', alignItems:'center', gap:'10px', marginTop:'10px', padding:'15px', background:'var(--bg-panel)', borderRadius:'12px', border: '1px solid var(--border)'}}>
                <input 
                  type="checkbox" 
                  checked={form.active} 
                  onChange={e => setForm({...form, active: e.target.checked})} 
                  style={{width:'18px', height:'18px', cursor:'pointer', accentColor: 'var(--text-brand)'}}
                />
                <span style={{fontSize:'14px', fontWeight:'bold', color:'var(--text-main)'}}>Produto Ativo no Catálogo</span>
              </div>

              <div style={{display: 'flex', gap: '15px', marginTop: '15px'}}>
                <button type="button" onClick={closeModal} style={{...(global.btnSecondary || {}), flex: 1}}>Cancelar</button>
                <button type="submit" style={{...(global.btnPrimary || {}), background: '#ea580c', flex: 2}} disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Salvar no Catálogo'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CATEGORIAS (NOVO E FUNCIONAL!) */}
      {showCategoryModal && (
        <div style={global.modalOverlay}>
          <div style={global.modalBox}>
            <div style={global.modalHeader}>
              <h3 style={global.modalTitle}>Catálogo de Categorias</h3>
              <button onClick={() => { setShowCategoryModal(false); setEditingCat(null); setCatName(''); setCatTemMeta(true); }} style={global.closeBtn}><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSaveCat} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '25px', padding: '15px', background: 'var(--bg-app)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  style={{...global.input, flex: 1}} 
                  placeholder="Nome da Categoria..." 
                  value={catName} 
                  onChange={e => setCatName(e.target.value)} 
                  required 
                  autoFocus 
                />
                <button type="submit" style={{...(global.btnPrimary || {}), width:'auto', background: '#ea580c'}}>
                  {editingCat ? 'Salvar' : 'Adicionar'}
                </button>
                {editingCat && (
                  <button type="button" onClick={() => {setEditingCat(null); setCatName(''); setCatTemMeta(true);}} style={global.btnSecondary}>
                    Cancelar
                  </button>
                )}
              </div>

              {/* CHECKBOX: ESTA CATEGORIA GERA META? */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                <input 
                  type="checkbox" 
                  checked={catTemMeta} 
                  onChange={e => setCatTemMeta(e.target.checked)} 
                  style={{ width: '18px', height: '18px', accentColor: '#ea580c' }} 
                />
                Esta categoria GERA META (Aparece no painel da Coordenação)
              </label>
            </form>

            <div style={{maxHeight:'300px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'10px'}}>
              {categorias.map(c => (
                <div key={c.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px', background:'var(--bg-panel)', borderRadius:'10px', border:'1px solid var(--border)'}}>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{fontWeight:'bold', color:'var(--text-main)', fontSize: '15px'}}>{c.name}</span>
                    <span style={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', color: c.temMeta !== false ? '#10b981' : 'var(--text-muted)' }}>
                      {c.temMeta !== false ? '✅ Com Meta' : '❌ Sem Meta'}
                    </span>
                  </div>

                  <div style={{display:'flex', gap:'5px'}}>
                    <button onClick={() => {setEditingCat(c); setCatName(c.name); setCatTemMeta(c.temMeta !== false);}} style={global.iconBtn} title="Editar">
                      <Edit size={16} color="var(--text-brand)"/>
                    </button>
                    <button onClick={() => handleDeleteCategory(c.id)} style={global.iconBtn} title="Excluir">
                      <Trash2 size={16} color="#ef4444"/>
                    </button>
                  </div>
                </div>
              ))}
              {categorias.length === 0 && <p style={global.emptyState}>Nenhuma categoria criada.</p>}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}