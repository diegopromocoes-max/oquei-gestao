import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, orderBy, query } from 'firebase/firestore';
import { 
  Globe, Zap, PhoneCall, BarChart3, Database, FileText, 
  Monitor, Video, Shield, Users, Link as LinkIcon, BookOpen,
  Plus, X, ExternalLink, Trash2, LayoutGrid
} from 'lucide-react';

// Mapa de ícones disponíveis para os links
const AVAILABLE_ICONS = {
  Globe: { icon: Globe, color: '#0d9488', bg: '#ccfbf1' },
  Zap: { icon: Zap, color: '#f59e0b', bg: '#fef3c7' },
  PhoneCall: { icon: PhoneCall, color: '#2563eb', bg: '#dbeafe' },
  BarChart3: { icon: BarChart3, color: '#db2777', bg: '#fce7f3' },
  Database: { icon: Database, color: '#7c3aed', bg: '#ede9fe' },
  FileText: { icon: FileText, color: '#475569', bg: '#f1f5f9' },
  Monitor: { icon: Monitor, color: '#059669', bg: '#d1fae5' },
  Video: { icon: Video, color: '#dc2626', bg: '#fee2e2' },
  Shield: { icon: Shield, color: '#ea580c', bg: '#ffedd5' },
  Users: { icon: Users, color: '#4f46e5', bg: '#e0e7ff' },
  BookOpen: { icon: BookOpen, color: '#0284c7', bg: '#ccfbf1' },
  LinkIcon: { icon: LinkIcon, color: '#1e293b', bg: '#e2e8f0' }
};

export default function LinksUteis({ userData }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Estado do Formulário
  const [form, setForm] = useState({
    title: '',
    description: '',
    url: '',
    iconName: 'Globe'
  });

  // --- CARREGAMENTO DOS LINKS ---
  const fetchLinks = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "useful_links"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const fetchedLinks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Links padrão caso o banco esteja vazio
      if (fetchedLinks.length === 0) {
        const defaultLinks = [
          { id: '1', title: 'Integrador Oquei', description: 'Sistemas e ferramentas internas', url: 'https://integrador.oquei.com.br/login', iconName: 'Zap' },
          { id: '2', title: 'Painel Analítica 3M', description: 'Relatórios de performance', url: 'https://oquei.analitica3m.com.br/', iconName: 'BarChart3' },
          { id: '3', title: 'Wiki Oquei', description: 'Base de conhecimento e manuais', url: 'http://wiki.oquei.com.br/', iconName: 'Globe' },
        ];
        setLinks(defaultLinks);
      } else {
        setLinks(fetchedLinks);
      }
    } catch (err) {
      console.error("Erro ao carregar links:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  // --- HANDLERS ---
  const handleSave = async (e) => {
    e.preventDefault();
    
    // Garante que a URL tem http/https
    let finalUrl = form.url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    setIsSaving(true);
    try {
      await addDoc(collection(db, "useful_links"), {
        title: form.title,
        description: form.description,
        url: finalUrl,
        iconName: form.iconName,
        createdBy: auth.currentUser?.uid || 'unknown',
        creatorName: userData?.name || 'Usuário',
        createdAt: serverTimestamp()
      });
      
      setShowModal(false);
      setForm({ title: '', description: '', url: '', iconName: 'Globe' });
      fetchLinks();
    } catch (err) {
      alert("Erro ao salvar o link: " + err.message);
    }
    setIsSaving(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Deseja realmente remover este link da plataforma?")) {
      try {
        await deleteDoc(doc(db, "useful_links", id));
        fetchLinks();
      } catch (err) {
        alert("Erro ao excluir: " + err.message);
      }
    }
  };

  return (
    <div style={styles.container}>
      
      {/* CABEÇALHO */}
      <div style={styles.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
          <div style={styles.iconHeader}><LayoutGrid size={28} color="white"/></div>
          <div>
            <h1 style={styles.title}>Links Úteis</h1>
            <p style={styles.subtitle}>Acesse rapidamente as principais ferramentas da Oquei.</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} style={styles.btnAdd}>
          <Plus size={18} /> Novo Link
        </button>
      </div>

      {/* GRID DE LINKS */}
      {loading ? (
        <div style={{padding: '50px', textAlign: 'center', color: '#94a3b8'}}>Carregando ferramentas...</div>
      ) : (
        <div style={styles.grid}>
          {links.map(link => {
            const IconData = AVAILABLE_ICONS[link.iconName] || AVAILABLE_ICONS['LinkIcon'];
            const IconComponent = IconData.icon;

            return (
              <div key={link.id} style={styles.card}>
                <div style={styles.cardTop}>
                  <div style={{ ...styles.iconBox, background: IconData.bg, color: IconData.color }}>
                    <IconComponent size={24} />
                  </div>
                  <button onClick={() => handleDelete(link.id)} style={styles.deleteBtn} title="Remover Link">
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <h3 style={styles.cardTitle}>{link.title}</h3>
                <p style={styles.cardDesc}>{link.description}</p>
                
                <button 
                  onClick={() => window.open(link.url, '_blank')} 
                  style={{ ...styles.accessBtn, color: IconData.color, background: IconData.bg }}
                  onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(0.95)'}
                  onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                >
                  Acessar <ExternalLink size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL NOVO LINK */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Adicionar Nova Ferramenta</h3>
              <button onClick={() => setShowModal(false)} style={styles.closeBtn}><X size={24} /></button>
            </div>

            <form onSubmit={handleSave} style={styles.form}>
              <div>
                <label style={styles.label}>Título da Plataforma/Link</label>
                <input 
                  style={styles.input} 
                  placeholder="Ex: Ponto Sólides" 
                  value={form.title} 
                  onChange={e => setForm({...form, title: e.target.value})} 
                  required 
                  autoFocus
                />
              </div>

              <div>
                <label style={styles.label}>Breve Descrição</label>
                <input 
                  style={styles.input} 
                  placeholder="Ex: Portal de batida de ponto" 
                  value={form.description} 
                  onChange={e => setForm({...form, description: e.target.value})} 
                  required 
                  maxLength={60}
                />
              </div>

              <div>
                <label style={styles.label}>URL (Link de Acesso)</label>
                <input 
                  style={styles.input} 
                  placeholder="www.exemplo.com.br" 
                  value={form.url} 
                  onChange={e => setForm({...form, url: e.target.value})} 
                  required 
                />
              </div>

              <div>
                <label style={styles.label}>Escolha um Ícone</label>
                <div style={styles.iconSelector}>
                  {Object.keys(AVAILABLE_ICONS).map(iconKey => {
                    const IconComp = AVAILABLE_ICONS[iconKey].icon;
                    const isSelected = form.iconName === iconKey;
                    return (
                      <div 
                        key={iconKey} 
                        onClick={() => setForm({...form, iconName: iconKey})}
                        style={{
                          ...styles.iconOption,
                          background: isSelected ? AVAILABLE_ICONS[iconKey].bg : '#f8fafc',
                          color: isSelected ? AVAILABLE_ICONS[iconKey].color : '#94a3b8',
                          borderColor: isSelected ? AVAILABLE_ICONS[iconKey].color : '#e2e8f0',
                        }}
                      >
                        <IconComp size={20} />
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                <button type="submit" style={styles.btnSave} disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Adicionar Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// --- ESTILOS INLINE (PREMIUM) ---
const styles = {
  container: { padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Inter', sans-serif" },
  
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' },
  iconHeader: { width: '56px', height: '56px', borderRadius: '16px', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(15, 23, 42, 0.2)' },
  title: { fontSize: '28px', fontWeight: '900', color: '#1e293b', margin: 0, letterSpacing: '-0.02em' },
  subtitle: { fontSize: '15px', color: '#64748b', margin: '5px 0 0 0' },
  
  btnAdd: { background: '#2563eb', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(37,99,235,0.2)', transition: 'transform 0.2s' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' },
  
  card: { background: 'white', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  iconBox: { padding: '14px', borderRadius: '14px' },
  deleteBtn: { background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '5px', transition: 'color 0.2s' },
  
  cardTitle: { fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: '0 0 8px 0' },
  cardDesc: { fontSize: '13px', color: '#64748b', margin: '0 0 24px 0', flex: 1, lineHeight: '1.5' },
  
  accessBtn: { width: '100%', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'filter 0.2s' },

  // MODAL
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modalBox: { background: 'white', padding: '32px', borderRadius: '24px', width: '90%', maxWidth: '500px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' },
  closeBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' },
  
  form: { display: 'flex', flexDirection: 'column', gap: '20px' },
  label: { fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '8px', display: 'block' },
  input: { width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', color: '#1e293b', boxSizing: 'border-box', background: '#f8fafc' },
  
  iconSelector: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
  iconOption: { padding: '12px', borderRadius: '12px', border: '2px solid', cursor: 'pointer', transition: 'all 0.2s' },
  
  btnSave: { width: '100%', padding: '16px', borderRadius: '14px', background: '#2563eb', color: 'white', border: 'none', fontWeight: '800', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }
};