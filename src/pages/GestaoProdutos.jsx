import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Plus, Search, Edit, Trash2, 
  Wifi, Tv, Package, X, CheckCircle, AlertCircle, Filter, Tag, Eraser, Layers
} from 'lucide-react';

import { styles as global, colors } from '../styles/globalStyles';
import { 
  getCategories, getProducts, saveCategory, deleteCategory, countProductsInCategory,
  saveProduct, deleteProduct, toggleProductStatus, countLeadsWithProduct 
} from '../services/catalog';

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
  const [form, setForm] = useState({ name: '', categoryId: '', price: '', description: '', active: true });

  // Estados para Gestão de Categorias
  const [catName, setCatName] = useState('');
  const [catTemMeta, setCatTemMeta] = useState(true);
  const [editingCat, setEditingCat] = useState(null);

  // ─── CARREGAMENTO DE DADOS ───
  const loadAllData = async () => {
    setLoading(true);
    try {
        const [cats, prods] = await Promise.all([getCategories(), getProducts(false)]);
      
      // Auto-criação de categorias iniciais se o banco estiver vazio
      if (cats.length === 0) {
        const defaultCats = ['Plano de Internet', 'SVA', 'Equipamento', 'Serviço Adicional'];
        for (const cat of defaultCats) {
          await saveCategory(null, { name: cat, temMeta: true });
        }
        const refreshedCats = await getCategories();
        setCategorias(refreshedCats);
      } else {
        setCategorias(cats);
      }
      setProdutos(prods);
    } catch (err) {
      if (window.showToast) window.showToast("Erro ao carregar catálogo.", "error");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // ─── CONTROLE DE CATEGORIAS ───
  const handleSaveCat = async (e) => {
    e.preventDefault();
    try {
      await saveCategory(editingCat?.id, { name: catName, temMeta: catTemMeta });
      setCatName(''); setCatTemMeta(true); setEditingCat(null);
      const refreshedCats = await getCategories();
      setCategorias(refreshedCats);
      if (window.showToast) window.showToast(editingCat ? "Categoria atualizada!" : "Categoria criada!", "success");
    } catch (err) { 
      if (window.showToast) window.showToast("Erro ao salvar categoria.", "error"); 
    }
  };

  const handleDeleteCategory = async (id) => {
    const usageCount = await countProductsInCategory(id);
    if (usageCount > 0) {
      return alert(`Não é possível excluir! Existem ${usageCount} produto(s) usando esta categoria.`);
    }
    if (window.confirm("Excluir esta categoria permanentemente?")) {
      await deleteCategory(id);
      const refreshedCats = await getCategories();
      setCategorias(refreshedCats);
    }
  };

  const openCatModal = () => {
    setCatName(''); setCatTemMeta(true); setEditingCat(null);
    setShowCategoryModal(true);
  };

  // ─── CONTROLE DE PRODUTOS ───
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
      setForm({ name: '', categoryId: categorias.length > 0 ? categorias[0].id : '', price: '', description: '', active: true });
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

      await saveProduct(editingId, payload);
      if (window.showToast) window.showToast("Produto salvo no catálogo!", "success");
      closeModal();
      const refreshedProds = await getProducts(false);
      setProdutos(refreshedProds);
    } catch (err) {
      if (window.showToast) window.showToast("Erro ao salvar produto.", "error");
    }
    setIsSaving(false);
  };

  const handleDeleteProduct = async (id) => {
    try {
      const usageCount = await countLeadsWithProduct(id);
      if (usageCount > 0) {
        const confirmRisk = window.confirm(`⚠️ ALERTA DE INTEGRIDADE: Este serviço possui ${usageCount} venda(s) vinculada(s) no sistema!\n\nExcluí-lo permanentemente pode afetar o histórico de relatórios passados e comissões.\n\nDeseja continuar com a exclusão mesmo assim? (Recomendamos apenas INATIVAR o produto)`);
        if (!confirmRisk) return;
      } else {
        const confirmNormal = window.confirm("Tem certeza que deseja excluir este serviço do catálogo?");
        if (!confirmNormal) return;
      }

      await deleteProduct(id);
      if (window.showToast) window.showToast("Produto excluído com sucesso.");
      const refreshedProds = await getProducts(false);
      setProdutos(refreshedProds);
    } catch (err) {
      if (window.showToast) window.showToast("Erro ao excluir.", "error");
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await toggleProductStatus(id, currentStatus);
      const refreshedProds = await getProducts(false);
      setProdutos(refreshedProds);
    } catch (err) {
      if (window.showToast) window.showToast("Erro ao alterar status.", "error");
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
    if (name.includes('internet') || name.includes('plano')) return <Wifi size={24} color={colors.primary} />;
    if (name.includes('sva') || name.includes('tv')) return <Tv size={24} color={colors.warning} />;
    if (name.includes('equipamento') || name.includes('roteador')) return <Package size={24} color={colors.success} />;
    return <Tag size={24} color="#8b5cf6" />;
  };

  const getColorForCategory = (catName) => {
    const name = catName?.toLowerCase() || '';
    if (name.includes('internet') || name.includes('plano')) return 'var(--bg-primary-light)';
    if (name.includes('sva') || name.includes('tv')) return 'rgba(245, 158, 11, 0.15)';
    if (name.includes('equipamento') || name.includes('roteador')) return 'var(--bg-success-light)';
    return 'rgba(139, 92, 246, 0.15)';
  };

  return (
    <div className="animated-view animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', paddingBottom: '40px' }}>
      
      {/* ─── CABEÇALHO ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '24px 30px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: colors.warning, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 16px ${colors.warning}35` }}>
            <ShoppingBag size={28} color="white"/>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Produtos & Serviços</h1>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '4px' }}>Gerencie o catálogo de ofertas e categorias da Oquei Telecom.</p>
          </div>
        </div>
      </div>

      {/* ─── TOOLBAR E FILTROS ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{display: 'flex', gap: '15px', flexWrap: 'wrap', flex: 1}}>
          <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              style={{...global.input, paddingLeft: '48px', height: '48px', borderRadius: '14px', width: '100%'}} 
              placeholder="Buscar produto pelo nome..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', minWidth: '220px' }}>
            <Filter size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }} />
            <select style={{...global.select, paddingLeft: '48px', height: '48px', borderRadius: '14px', width: '100%', cursor: 'pointer'}} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
              <option value="all">Todas as Categorias</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {(searchTerm !== '' || filterCategory !== 'all') && (
            <button onClick={clearFilters} style={{background: 'rgba(239, 68, 68, 0.1)', color: colors.danger, border: `1px solid rgba(239, 68, 68, 0.2)`, padding: '0 20px', borderRadius: '14px', fontWeight: '900', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: '0.2s'}}>
              <Eraser size={16} /> Limpar Filtros
            </button>
          )}
        </div>

        <div style={{display: 'flex', gap: '12px'}}>
          <button onClick={openCatModal} style={{...global.btnSecondary, background: 'var(--bg-card)', padding: '12px 20px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '8px'}}>
            <Layers size={18} /> Gerir Categorias
          </button>
          <button onClick={() => openModal()} style={{...global.btnPrimary, background: colors.warning, padding: '12px 24px', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: `0 6px 16px ${colors.warning}35`}}>
            <Plus size={18} /> Novo Serviço
          </button>
        </div>
      </div>

      {/* ─── GRID DE PRODUTOS ─── */}
      {loading ? (
        <div style={{padding: '80px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px', fontWeight: '800'}}>Carregando catálogo...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {filteredProducts.map(prod => (
            <div key={prod.id} style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', opacity: prod.active === false ? 0.6 : 1, transition: 'transform 0.2s', ':hover': {transform: 'translateY(-4px)'} }}>
              
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px'}}>
                <div style={{padding: '14px', borderRadius: '16px', background: getColorForCategory(prod.categoryName)}}>
                  {getIconForCategory(prod.categoryName)}
                </div>
                <div style={{display:'flex', gap:'8px'}}>
                   <button onClick={() => openModal(prod)} style={{ background: 'var(--bg-panel)', border: 'none', padding: '8px', borderRadius: '10px', cursor: 'pointer' }} title="Editar">
                     <Edit size={16} color="var(--text-muted)"/>
                   </button>
                   <button onClick={() => handleDeleteProduct(prod.id)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', padding: '8px', borderRadius: '10px', cursor: 'pointer' }} title="Excluir">
                     <Trash2 size={16} color={colors.danger}/>
                   </button>
                </div>
              </div>
              
              <div style={{flex: 1, marginBottom: '25px'}}>
                <span style={{fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block'}}>{prod.categoryName}</span>
                <h3 style={{fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 10px 0', lineHeight: '1.3'}}>{prod.name}</h3>
                <p style={{fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0, fontWeight: '600'}}>{prod.description || 'Sem descrição cadastrada.'}</p>
              </div>
              
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid var(--border)'}}>
                <div style={{fontSize: '22px', fontWeight: '900', color: colors.success}}>R$ {Number(prod.price).toFixed(2)}</div>
                <button 
                  onClick={() => handleToggleStatus(prod.id, prod.active)}
                  style={{
                    border: 'none', padding: '8px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: '0.2s',
                    background: prod.active !== false ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-panel)',
                    color: prod.active !== false ? colors.success : 'var(--text-muted)'
                  }}
                >
                  {prod.active !== false ? <CheckCircle size={14}/> : <AlertCircle size={14}/>}
                  {prod.active !== false ? 'Ativo' : 'Inativo'}
                </button>
              </div>

            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div style={{gridColumn: '1 / -1', padding: '80px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: '20px', border: '1px dashed var(--border)', fontWeight: '800'}}>
              Nenhum produto encontrado. Tente ajustar os filtros.
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL DE PRODUTOS ─── */}
      {showModal && (
        <div style={global.modalOverlay}>
          <div style={{...global.modalBox, maxWidth: '550px', padding: '35px', borderRadius: '24px'}}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: 'var(--text-main)' }}>{editingId ? 'Editar Serviço' : 'Novo Item do Catálogo'}</h3>
              <button onClick={closeModal} style={{ background: 'var(--bg-panel)', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={global.field}>
                <label style={global.label}>Nome do Produto/Serviço</label>
                <input style={{...global.input, height: '48px', borderRadius: '12px'}} placeholder="Ex: Plano 600 Mega" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required autoFocus />
              </div>

              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                <div style={global.field}>
                  <label style={global.label}>Categoria</label>
                  <select style={{...global.select, height: '48px', borderRadius: '12px'}} value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})} required>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={global.field}>
                  <label style={global.label}>Mensalidade (R$)</label>
                  <input style={{...global.input, height: '48px', borderRadius: '12px'}} type="number" step="0.01" placeholder="0.00" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required />
                </div>
              </div>

              <div style={global.field}>
                <label style={global.label}>Descrição Comercial</label>
                <textarea style={{...global.input, minHeight: '100px', borderRadius: '12px', padding: '15px'}} placeholder="Detalhes sobre o plano, benefícios, regras de fidelidade..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>

              <label style={{display:'flex', alignItems:'center', gap:'12px', padding:'16px 20px', background:'var(--bg-panel)', borderRadius:'14px', border: '1px solid var(--border)', cursor: 'pointer'}}>
                <input type="checkbox" checked={form.active} onChange={e => setForm({...form, active: e.target.checked})} style={{width:'20px', height:'20px', accentColor: colors.primary}} />
                <span style={{fontSize:'14px', fontWeight:'900', color:'var(--text-main)'}}>Produto Ativo no Catálogo</span>
              </label>

              <div style={{display: 'flex', gap: '15px', marginTop: '10px'}}>
                <button type="button" onClick={closeModal} style={{...global.btnSecondary, flex: 1, padding: '14px', borderRadius: '14px'}}>Cancelar</button>
                <button type="submit" style={{...global.btnPrimary, background: colors.warning, flex: 2, padding: '14px', borderRadius: '14px', boxShadow: `0 6px 16px ${colors.warning}35`}} disabled={isSaving}>
                  {isSaving ? 'A Guardar...' : 'Salvar no Catálogo'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL DE CATEGORIAS ─── */}
      {showCategoryModal && (
        <div style={global.modalOverlay}>
          <div style={{...global.modalBox, maxWidth: '450px', padding: '35px', borderRadius: '24px'}}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: 'var(--text-main)' }}>Gerir Categorias</h3>
              <button onClick={() => { setShowCategoryModal(false); setEditingCat(null); setCatName(''); setCatTemMeta(true); }} style={{ background: 'var(--bg-panel)', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20}/></button>
            </div>
            
            <form onSubmit={handleSaveCat} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px', padding: '20px', background: 'var(--bg-panel)', borderRadius: '16px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input style={{...global.input, flex: 1, height: '48px', borderRadius: '12px'}} placeholder="Nome da Categoria..." value={catName} onChange={e => setCatName(e.target.value)} required autoFocus />
                <button type="submit" style={{...global.btnPrimary, background: colors.primary, width: 'auto', padding: '0 20px', borderRadius: '12px'}}>
                  {editingCat ? 'Salvar' : 'Criar'}
                </button>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                <input type="checkbox" checked={catTemMeta} onChange={e => setCatTemMeta(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: colors.primary }} />
                Esta categoria gera META de vendas
              </label>
              
              {editingCat && (
                 <button type="button" onClick={() => {setEditingCat(null); setCatName(''); setCatTemMeta(true);}} style={{...global.btnSecondary, marginTop: '5px', borderRadius: '10px', padding: '10px'}}>
                   Cancelar Edição
                 </button>
              )}
            </form>

            <div style={{maxHeight:'350px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'12px', paddingRight: '10px'}} className="hide-scrollbar">
              {categorias.map(c => (
                <div key={c.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px', background:'var(--bg-card)', borderRadius:'14px', border:'1px solid var(--border)', boxShadow: 'var(--shadow-sm)'}}>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{fontWeight:'900', color:'var(--text-main)', fontSize: '15px'}}>{c.name}</span>
                    <span style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', padding: '4px 8px', borderRadius: '6px', background: c.temMeta !== false ? 'rgba(16,185,129,0.1)' : 'var(--bg-app)', color: c.temMeta !== false ? colors.success : 'var(--text-muted)', width: 'fit-content' }}>
                      {c.temMeta !== false ? '✅ Com Meta' : '❌ Sem Meta'}
                    </span>
                  </div>

                  <div style={{display:'flex', gap:'8px'}}>
                    <button onClick={() => {setEditingCat(c); setCatName(c.name); setCatTemMeta(c.temMeta !== false);}} style={{ background: 'var(--bg-panel)', border: 'none', padding: '8px', borderRadius: '10px', cursor: 'pointer' }} title="Editar">
                      <Edit size={16} color="var(--text-muted)"/>
                    </button>
                    <button onClick={() => handleDeleteCategory(c.id)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', padding: '8px', borderRadius: '10px', cursor: 'pointer' }} title="Excluir">
                      <Trash2 size={16} color={colors.danger}/>
                    </button>
                  </div>
                </div>
              ))}
              {categorias.length === 0 && <p style={{textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontWeight: '800'}}>Nenhuma categoria criada.</p>}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
