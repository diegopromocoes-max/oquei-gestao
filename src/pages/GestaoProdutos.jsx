import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';
import { 
  ShoppingBag, Plus, Search, Edit, Trash2, 
  Wifi, Tv, Package, X, CheckCircle, AlertCircle, Filter, Tag, Eraser, Layers
} from 'lucide-react';

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
  
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    price: '',
    description: '',
    active: true
  });

  // --- CARREGAMENTO DO BANCO DE DADOS ---
  const fetchCategories = async () => {
    try {
      const snap = await getDocs(query(collection(db, "product_categories"), orderBy("name")));
      if (snap.empty) {
        // Popula as categorias padrão na primeira vez
        const defaultCats = ['Plano de Internet', 'SVA', 'Equipamento', 'Serviço Adicional'];
        for (const cat of defaultCats) {
            await addDoc(collection(db, "product_categories"), { name: cat });
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
      // 1. Verifica se existem vendas atreladas a este produto
      const q = query(collection(db, "leads"), where("productId", "==", id));
      const snap = await getDocs(q);

      if (!snap.empty) {
        // Alerta de Alto Risco
        const confirmRisk = window.confirm(`⚠️ ALERTA DE INTEGRIDADE: Este serviço possui ${snap.size} venda(s) vinculada(s) no sistema!\n\nExcluí-lo permanentemente pode afetar o histórico de relatórios passados e comissões.\n\nDeseja continuar com a exclusão mesmo assim? (Recomendamos apenas INATIVAR o produto)`);
        if (!confirmRisk) return;
      } else {
        // Confirmação normal
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
    if (name.includes('internet') || name.includes('plano')) return <Wifi size={24} color="#2563eb" />;
    if (name.includes('sva') || name.includes('tv')) return <Tv size={24} color="#ea580c" />;
    if (name.includes('equipamento') || name.includes('roteador')) return <Package size={24} color="#10b981" />;
    return <Tag size={24} color="#7c3aed" />;
  };

  const getColorForCategory = (catName) => {
    const name = catName?.toLowerCase() || '';
    if (name.includes('internet') || name.includes('plano')) return '#eff6ff';
    if (name.includes('sva') || name.includes('tv')) return '#fff7ed';
    if (name.includes('equipamento') || name.includes('roteador')) return '#ecfdf5';
    return '#f3e8ff';
  };

  // --- GERENCIADOR DE CATEGORIAS ---
  const CategoryManager = () => {
    const [catName, setCatName] = useState('');
    const [editingCat, setEditingCat] = useState(null);

    const handleSaveCat = async (e) => {
      e.preventDefault();
      try {
        if (editingCat) {
          await updateDoc(doc(db, "product_categories", editingCat.id), { name: catName });
        } else {
          await addDoc(collection(db, "product_categories"), { name: catName });
        }
        setCatName('');
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

    return (
      <div style={styles.modalOverlay}>
        <div style={styles.modalBox}>
          <div style={styles.modalHeader}>
            <h3 style={styles.modalTitle}>Catálogo de Categorias</h3>
            <button onClick={() => setShowCategoryModal(false)} style={styles.closeBtn}><X size={20}/></button>
          </div>
          
          <form onSubmit={handleSaveCat} style={{display:'flex', gap:'10px', marginBottom:'25px'}}>
            <input style={styles.input} placeholder="Nome da Categoria..." value={catName} onChange={e=>setCatName(e.target.value)} required autoFocus />
            <button style={{...styles.btnPrimary, width:'auto'}}>{editingCat ? 'Salvar' : 'Adicionar'}</button>
            {editingCat && <button type="button" onClick={()=>{setEditingCat(null); setCatName('');}} style={styles.btnCancel}>Cancelar</button>}
          </form>

          <div style={{maxHeight:'300px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'10px'}}>
            {categorias.map(c => (
              <div key={c.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px', background:'#f8fafc', borderRadius:'10px', border:'1px solid #e2e8f0'}}>
                <span style={{fontWeight:'bold', color:'#334155'}}>{c.name}</span>
                <div style={{display:'flex', gap:'5px'}}>
                  <button onClick={()=>{setEditingCat(c); setCatName(c.name);}} style={styles.actionBtnIcon} title="Editar"><Edit size={14} color="#3b82f6"/></button>
                  <button onClick={()=>handleDeleteCategory(c.id)} style={styles.actionBtnIcon} title="Excluir"><Trash2 size={14} color="#ef4444"/></button>
                </div>
              </div>
            ))}
            {categorias.length === 0 && <p style={styles.emptyState}>Nenhuma categoria criada.</p>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      
      <div style={styles.header}>
        <div style={styles.iconHeader}>
          <ShoppingBag size={28} color="white"/>
        </div>
        <div>
          <h1 style={styles.title}>Produtos & Serviços</h1>
          <p style={styles.subtitle}>Gerencie o catálogo de ofertas da Oquei Telecom.</p>
        </div>
      </div>

      <div style={styles.toolbar}>
        <div style={{display: 'flex', gap: '15px', flexWrap: 'wrap', flex: 1}}>
          <div style={styles.searchBox}>
            <Search size={18} color="#94a3b8" />
            <input 
              style={styles.searchInput} 
              placeholder="Buscar produto pelo nome..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div style={styles.filterBox}>
            <Filter size={18} color="#64748b" />
            <select style={styles.selectFilter} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="all">Todas as Categorias</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {(searchTerm !== '' || filterCategory !== 'all') && (
            <button onClick={clearFilters} style={styles.btnClear}>
              <Eraser size={16} /> Limpar Filtros
            </button>
          )}
        </div>

        <div style={{display: 'flex', gap: '10px'}}>
          <button onClick={() => setShowCategoryModal(true)} style={styles.btnSecondary}>
            <Layers size={18} /> Categorias
          </button>
          <button onClick={() => openModal()} style={styles.btnAdd}>
            <Plus size={18} /> Novo Serviço
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{padding: '50px', textAlign: 'center', color: '#94a3b8'}}>Carregando catálogo...</div>
      ) : (
        <div style={styles.grid}>
          {filteredProducts.map(prod => (
            <div key={prod.id} style={{...styles.card, opacity: prod.active === false ? 0.6 : 1}}>
              
              <div style={styles.cardTop}>
                <div style={{...styles.iconWrapper, background: getColorForCategory(prod.categoryName)}}>
                  {getIconForCategory(prod.categoryName)}
                </div>
                <div style={{display:'flex', gap:'5px'}}>
                   <button onClick={() => openModal(prod)} style={styles.actionBtnIcon} title="Editar">
                     <Edit size={16} color="#3b82f6"/>
                   </button>
                   <button onClick={() => handleDeleteProduct(prod.id)} style={styles.actionBtnIcon} title="Excluir">
                     <Trash2 size={16} color="#ef4444"/>
                   </button>
                </div>
              </div>
              
              <div style={styles.cardContent}>
                <span style={styles.typeBadge}>{prod.categoryName}</span>
                <h3 style={styles.prodName}>{prod.name}</h3>
                <p style={styles.prodDesc}>{prod.description || 'Sem descrição cadastrada.'}</p>
              </div>
              
              <div style={styles.cardFooter}>
                <div style={styles.priceTag}>R$ {Number(prod.price).toFixed(2)}</div>
                <button 
                  onClick={() => toggleActiveStatus(prod.id, prod.active)}
                  style={{
                    ...styles.statusBtn,
                    background: prod.active !== false ? '#ecfdf5' : '#f1f5f9',
                    color: prod.active !== false ? '#10b981' : '#64748b'
                  }}
                >
                  {prod.active !== false ? <CheckCircle size={14}/> : <AlertCircle size={14}/>}
                  {prod.active !== false ? 'Ativo' : 'Inativo'}
                </button>
              </div>

            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div style={styles.emptyState}>Nenhum produto encontrado.</div>
          )}
        </div>
      )}

      {showCategoryModal && <CategoryManager />}

      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{editingId ? 'Editar Serviço' : 'Novo Item do Catálogo'}</h3>
              <button onClick={closeModal} style={styles.closeBtn}><X size={24} /></button>
            </div>

            <form onSubmit={handleSaveProduct} style={styles.form}>
              
              <div style={styles.field}>
                <label style={styles.label}>Nome do Produto/Serviço</label>
                <input 
                  style={styles.input} 
                  placeholder="Ex: Plano 600 Mega" 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  required 
                  autoFocus
                />
              </div>

              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>Categoria</label>
                  <select style={styles.select} value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})} required>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Valor da mensalidade (R$)</label>
                  <input 
                    style={styles.input} 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    value={form.price} 
                    onChange={e => setForm({...form, price: e.target.value})} 
                    required 
                  />
                </div>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Descrição (Informativo para Vendas)</label>
                <textarea 
                  style={styles.textarea} 
                  placeholder="Detalhes sobre o plano, benefícios, regras de fidelidade..." 
                  value={form.description} 
                  onChange={e => setForm({...form, description: e.target.value})} 
                />
              </div>

              <div style={{display:'flex', alignItems:'center', gap:'10px', marginTop:'10px', padding:'15px', background:'#f8fafc', borderRadius:'12px'}}>
                <input 
                  type="checkbox" 
                  checked={form.active} 
                  onChange={e => setForm({...form, active: e.target.checked})} 
                  style={{width:'18px', height:'18px', cursor:'pointer', accentColor: '#2563eb'}}
                />
                <span style={{fontSize:'14px', fontWeight:'bold', color:'#334155'}}>Produto Ativo no Catálogo</span>
              </div>

              <div style={{display: 'flex', gap: '15px', marginTop: '15px'}}>
                <button type="button" onClick={closeModal} style={styles.btnCancel}>Cancelar</button>
                <button type="submit" style={styles.btnSave} disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Salvar no Catálogo'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  container: { animation: 'fadeIn 0.4s ease-out' },
  
  header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '35px' },
  iconHeader: { width: '56px', height: '56px', borderRadius: '16px', background: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(234, 88, 12, 0.2)' },
  title: { fontSize: '28px', fontWeight: '900', color: '#1e293b', margin: 0, letterSpacing: '-0.02em' },
  subtitle: { fontSize: '15px', color: '#64748b', margin: '5px 0 0 0' },
  
  toolbar: { display: 'flex', gap: '15px', marginBottom: '30px', flexWrap: 'wrap', alignItems: 'center' },
  searchBox: { flex: 1, minWidth: '250px', display: 'flex', alignItems: 'center', gap: '12px', background: 'white', padding: '12px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' },
  searchInput: { border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', color: '#1e293b' },
  filterBox: { display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '12px 15px', borderRadius: '14px', border: '1px solid #e2e8f0' },
  selectFilter: { border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', color: '#334155', fontWeight: 'bold', cursor: 'pointer' },
  
  btnClear: { background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', padding: '12px 16px', borderRadius: '14px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  btnSecondary: { background: 'white', color: '#1e293b', border: '1px solid #e2e8f0', padding: '12px 20px', borderRadius: '14px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
  btnAdd: { background: '#ea580c', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '14px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(234,88,12,0.2)', transition: 'transform 0.2s' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' },
  card: { background: 'white', borderRadius: '24px', padding: '25px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', transition: 'all 0.2s' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  iconWrapper: { padding: '12px', borderRadius: '14px' },
  actionBtnIcon: { background: '#f8fafc', border: '1px solid #f1f5f9', padding: '8px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  
  cardContent: { flex: 1, marginBottom: '20px' },
  typeBadge: { fontSize: '10px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' },
  prodName: { fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: '0 0 10px 0' },
  prodDesc: { fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: 0 },
  
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid #f1f5f9' },
  priceTag: { fontSize: '20px', fontWeight: '900', color: '#059669' },
  statusBtn: { border: 'none', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' },

  emptyState: { gridColumn: '1 / -1', padding: '60px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic', background: 'white', borderRadius: '24px', border: '1px dashed #cbd5e1' },

  // MODAL
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modalBox: { background: 'white', padding: '35px', borderRadius: '28px', width: '90%', maxWidth: '550px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  modalTitle: { fontSize: '22px', fontWeight: '900', color: '#1e293b', margin: 0 },
  closeBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' },
  
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: '800', color: '#475569' },
  input: { padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px', color: '#1e293b', background: '#f8fafc', width: '100%', boxSizing: 'border-box' },
  select: { padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px', color: '#1e293b', background: '#f8fafc', cursor: 'pointer', width: '100%', boxSizing: 'border-box' },
  textarea: { padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', color: '#1e293b', background: '#f8fafc', minHeight: '100px', resize: 'vertical', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' },
  
  btnPrimary: { padding: '14px 20px', borderRadius: '14px', background: '#ea580c', color: 'white', border: 'none', fontWeight: '900', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(234,88,12,0.2)', flex: 2 },
  btnCancel: { padding: '14px 20px', borderRadius: '14px', background: '#f1f5f9', color: '#64748b', border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', flex: 1 }
};