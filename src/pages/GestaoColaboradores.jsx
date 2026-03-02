import React, { useState, useEffect } from 'react';
import { db, firebaseConfig } from '../firebase'; 
import { doc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as authSignOut } from 'firebase/auth';
import { 
  UserPlus, Mail, Trash2, Edit, Camera, X, 
  Search, Shield, MapPin, Users
} from 'lucide-react';

import { styles as global } from '../styles/globalStyles';

// --- HELPERS INTERNOS ---
const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

const criarUsuarioNoFirebase = async (email, password, profileData) => {
  try {
    const secondaryApp = getApps().find(a => a.name === 'Secondary') || initializeApp(firebaseConfig, 'Secondary');
    const secondaryAuth = getAuth(secondaryApp);
    const res = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    
    await setDoc(doc(db, "users", res.user.uid), { 
      ...profileData, 
      createdAt: serverTimestamp() 
    });
    
    await authSignOut(secondaryAuth);
    return res.user.uid;
  } catch (error) { throw error; }
};


// ==============================================================
// 1. GESTÃO DE SUPERVISORES (AUTÓNOMA)
// ==============================================================
export const GestaoSupervisores = () => {
  const [lista, setLista] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({ name: '', email: '', pass: '', cluster: '' });

  const fetchData = async () => {
    try {
      const qUsers = query(collection(db, "users"), where("role", "==", "supervisor"));
      const snapUsers = await getDocs(qUsers);
      setLista(snapUsers.docs.map(d => ({ id: d.id, ...d.data() })));

      const snapC = await getDocs(collection(db, "clusters"));
      setClusters(snapC.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await criarUsuarioNoFirebase(form.email, form.pass, { 
        name: form.name, 
        email: form.email, 
        role: 'supervisor', 
        clusterId: form.cluster, 
        active: true 
      });
      alert('Supervisor cadastrado!');
      setForm({ name: '', email: '', pass: '', cluster: '' });
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
    if(window.confirm("Remover supervisor do sistema?")) {
      await deleteDoc(doc(db, "users", id));
      fetchData();
    }
  }

  const filteredList = lista.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div style={global.container}>
      <div style={global.header}>
        <div style={{...global.iconHeader, background: '#9333ea'}}><UserPlus size={28} color="white"/></div>
        <div>
          <h1 style={global.title}>Gestão de Supervisores</h1>
          <p style={global.subtitle}>{lista.length} supervisores ativos na rede.</p>
        </div>
      </div>

      <div style={global.toolbar}>
        <div style={global.searchBox}>
          <Search size={18} color="var(--text-muted)" />
          <input style={global.searchInput} placeholder="Buscar supervisor..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', alignItems: 'start'}}>
        <div style={global.gridCards}>
          {filteredList.map(s => (
            <div key={s.id} style={{...global.card, padding: '20px'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                <div>
                  <h4 style={{fontWeight: 'bold', color: 'var(--text-main)', fontSize: '16px', margin: '0 0 5px 0'}}>{s.name}</h4>
                  <span style={{...global.badge, background: 'var(--bg-primary-light)', color: '#9333ea'}}><Shield size={12} style={{display:'inline', marginRight: '4px'}}/> {s.clusterId}</span>
                </div>
                <button onClick={() => handleDelete(s.id)} style={{border:'none', background:'none', cursor:'pointer', color: '#ef4444', padding: '8px'}}><Trash2 size={16}/></button>
              </div>
              <div style={{fontSize: '12px', color: 'var(--text-muted)', marginTop: '15px', display: 'flex', alignItems: 'center', gap: '6px'}}><Mail size={14}/> {s.email}</div>
            </div>
          ))}
          {filteredList.length === 0 && <div style={{...global.emptyState, gridColumn: '1 / -1'}}>Nenhum supervisor encontrado.</div>}
        </div>

        <div style={{...global.card, height: 'fit-content'}}>
          <h3 style={{...global.sectionTitle, color: '#9333ea'}}><UserPlus size={20} /> Novo Supervisor</h3>
          <form onSubmit={handleAdd} style={global.form} autoComplete="off">
            <div style={global.field}>
              <label style={global.label}>Nome Completo</label>
              <input style={global.input} placeholder="Ex: Carlos Silva" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required autoComplete="off" />
            </div>
            <div style={global.field}>
              <label style={global.label}>E-mail Corporativo</label>
              <input style={global.input} placeholder="email@oquei.com.br" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required autoComplete="new-password" />
            </div>
            <div style={global.field}>
              <label style={global.label}>Senha de Acesso</label>
              <input style={global.input} type="password" placeholder="Senha Provisória" value={form.pass} onChange={e => setForm({...form, pass: e.target.value})} required autoComplete="new-password" />
            </div>
            <div style={global.field}>
              <label style={global.label}>Regional (Cluster)</label>
              <select style={global.select} value={form.cluster} onChange={e => setForm({...form, cluster: e.target.value})} required>
                <option value="">Selecione...</option>
                {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button style={{ ...global.btnPrimary, background: '#9333ea' }}>Cadastrar Líder</button>
          </form>
        </div>
      </div>
    </div>
  );
};


// ==============================================================
// 2. GESTÃO DE ATENDENTES (AUTÓNOMA)
// ==============================================================
export const GestaoAtendentes = () => {
  const [lista, setLista] = useState([]);
  const [cidades, setCidades] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({ name: '', email: '', pass: '', city: '', photo: null });

  const fetchData = async () => {
    try {
      const qUsers = query(collection(db, "users"), where("role", "==", "attendant"));
      const snapUsers = await getDocs(qUsers);
      setLista(snapUsers.docs.map(d => ({ id: d.id, ...d.data() })));

      const snapC = await getDocs(collection(db, "cities"));
      setCidades(snapC.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const openModal = (user = null) => {
    setEditingUser(user);
    if (user) {
      setForm({ name: user.name, email: user.email, pass: '', city: user.cityId, photo: user.photo });
    } else {
      setForm({ name: '', email: '', pass: '', city: '', photo: null });
    }
    setIsModalOpen(true);
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const base64 = await convertToBase64(file);
        setForm({ ...form, photo: base64 });
      } catch (err) { alert("Erro na imagem"); }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await updateDoc(doc(db, "users", editingUser.id), {
            name: form.name,
            cityId: form.city,
            photo: form.photo,
            updatedAt: serverTimestamp()
        });
        alert('Atendente atualizado!');
      } else {
        const emailFinal = form.email || `${form.name.toLowerCase().replace(/\s+/g, '.')}@pendente.oquei`;
        const passFinal = form.pass || '123456';
        await criarUsuarioNoFirebase(emailFinal, passFinal, { 
          name: form.name, 
          email: emailFinal, 
          role: 'attendant', 
          cityId: form.city, 
          active: true,
          isTemp: !form.email,
          photo: form.photo
        });
        alert('Atendente criado com sucesso!');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
    if(window.confirm("Remover atendente do sistema?")) {
      await deleteDoc(doc(db, "users", id));
      fetchData();
    }
  }
  
  const filteredList = lista.filter(a => a.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div style={global.container}>
      <div style={global.header}>
        <div style={{...global.iconHeader, background: '#2563eb'}}><Users size={28} color="white"/></div>
        <div>
          <h1 style={global.title}>Time de Vendas</h1>
          <p style={global.subtitle}>Gerencie o acesso e dados dos {lista.length} consultores.</p>
        </div>
        <button onClick={() => openModal()} style={{...global.btnPrimary, marginLeft: 'auto'}}>
          <UserPlus size={18} /> Novo Atendente
        </button>
      </div>

      <div style={global.toolbar}>
        <div style={global.searchBox}>
          <Search size={18} color="var(--text-muted)" />
          <input style={global.searchInput} placeholder="Buscar atendente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div style={global.gridCards}>
        {filteredList.map(att => (
          <div key={att.id} style={{...(global.card || {}), padding: 0, overflow: 'hidden', cursor: 'pointer'}} onClick={() => openModal(att)}>
            <div style={{height: '60px', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)'}}></div>
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 20px 20px', marginTop: '-30px'}}>
              <div style={{width: '60px', height: '60px', borderRadius: '50%', border: '4px solid var(--bg-card)', background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: '10px'}}>
                {att.photo ? <img src={att.photo} style={{width: '100%', height: '100%', objectFit: 'cover'}} alt={att.name}/> : <span style={{fontSize: '20px', fontWeight: 'bold', color: 'var(--text-muted)'}}>{att.name.charAt(0)}</span>}
              </div>
              <h3 style={{fontSize: '16px', fontWeight: 'bold', color: 'var(--text-main)', margin: '0 0 5px 0'}}>{att.name}</h3>
              <span style={{fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase'}}><MapPin size={10} style={{display:'inline'}}/> {att.cityId}</span>
              
              <div style={{display: 'flex', gap: '10px', marginTop: '15px', width: '100%'}}>
                <button onClick={(e) => { e.stopPropagation(); openModal(att); }} style={{...global.btnSecondary, flex: 1, padding: '8px', fontSize: '12px'}}><Edit size={14} style={{marginRight: '4px'}}/> Editar</button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(att.id); }} style={{...global.btnDanger, padding: '8px', width: 'auto'}}><Trash2 size={14}/></button>
              </div>
            </div>
          </div>
        ))}
        {filteredList.length === 0 && <div style={{...global.emptyState, gridColumn: '1 / -1'}}>Nenhum atendente encontrado.</div>}
      </div>

      {isModalOpen && (
        <div style={global.modalOverlay}>
          <div style={global.modalBox}>
            <div style={global.modalHeader}>
              <h3 style={global.modalTitle}>{editingUser ? 'Editar Atendente' : 'Novo Atendente'}</h3>
              <button onClick={() => setIsModalOpen(false)} style={global.closeBtn}><X size={24}/></button>
            </div>
            <form onSubmit={handleSubmit} style={global.form}>
              <div style={{display:'flex', justifyContent:'center', marginBottom:'10px'}}>
                <div style={{position:'relative', width:'80px', height:'80px'}}>
                  {form.photo ? <img src={form.photo} style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover', border:'2px solid var(--border)'}} alt="Preview"/> : <div style={{width:'100%', height:'100%', borderRadius:'50%', background:'var(--bg-app)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', fontWeight:'bold', color:'var(--text-muted)', border:'2px solid var(--border)'}}>{form.name ? form.name.charAt(0) : '?'}</div>}
                  <label style={{position: 'absolute', bottom: 0, right: 0, background: 'var(--text-brand)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-card)', cursor: 'pointer'}}>
                    <Camera size={12} color="white" />
                    <input type="file" style={{display:'none'}} onChange={handleFile} accept="image/*" />
                  </label>
                </div>
              </div>

              <div style={global.field}>
                <label style={global.label}>Nome Completo</label>
                <input style={global.input} value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
              </div>
              
              {!editingUser && (
                <>
                  <div style={global.field}>
                    <label style={global.label}>E-mail (Opcional - Login)</label>
                    <input style={global.input} value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                  </div>
                  <div style={global.field}>
                    <label style={global.label}>Senha (Padrão: 123456)</label>
                    <input style={global.input} type="password" value={form.pass} onChange={e => setForm({...form, pass: e.target.value})} />
                  </div>
                </>
              )}
              
              <div style={global.field}>
                <label style={global.label}>Loja / Cidade</label>
                <select style={global.select} value={form.city} onChange={e => setForm({...form, city: e.target.value})} required>
                  <option value="">Selecione...</option>
                  {cidades.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div style={{display: 'flex', gap: '15px', marginTop: '10px'}}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{...global.btnSecondary, flex: 1}}>Cancelar</button>
                <button type="submit" style={{...global.btnPrimary, flex: 2}}>Salvar Atendente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};