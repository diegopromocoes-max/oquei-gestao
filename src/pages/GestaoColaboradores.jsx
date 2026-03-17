import React, { useState, useEffect } from 'react';
import { db, firebaseConfig } from '../firebase'; 
import { doc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as authSignOut } from 'firebase/auth';
import { 
  UserPlus, Mail, Trash2, Edit, Camera, X, 
  Search, Shield, MapPin, Users, Info, Loader2, Rocket, Briefcase
} from 'lucide-react';

import { styles as global } from '../styles/globalStyles';

// --- HELPERS E CONSTANTES ---
const SECTORS = [
  'Marketing', 'Central de Vendas', 'PaP', 'Lojas', 
  'Empresas', 'TI', 'Diretoria', 'Analista'
];

const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

const criarUsuarioNoFirebase = async (email, password, profileData) => {
  const secondaryApp = getApps().find(a => a.name === 'Secondary') || initializeApp(firebaseConfig, 'Secondary');
  const secondaryAuth = getAuth(secondaryApp);
  
  try {
    const res = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = res.user.uid;

    try {
      await setDoc(doc(db, "users", uid), { 
        ...profileData, 
        uid: uid,
        createdAt: serverTimestamp() 
      });
      
      await authSignOut(secondaryAuth);
      return uid;
    } catch (fsError) {
      console.error("Erro crítico no Firestore:", fsError);
      throw new Error(`Login criado, mas erro no Banco de Dados: ${fsError.message}`);
    }
  } catch (authError) {
    console.error("Erro no Auth:", authError);
    if (authError.code === 'auth/email-already-in-use') {
      throw new Error("Este e-mail já está a ser usado por outro colaborador.");
    }
    throw authError;
  }
};

// ==============================================================
// 1. GESTÃO DE SUPERVISORES (Mantido intacto)
// ==============================================================
export const GestaoSupervisores = () => {
  const [lista, setLista] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', pass: '', cluster: '' });

  const fetchData = async () => {
    try {
      const qUsers = query(collection(db, "users"), where("role", "in", ["supervisor", "coordinator"]));
      const snapUsers = await getDocs(qUsers);
      setLista(snapUsers.docs.map(d => ({ id: d.id, ...d.data() })));
      const snapC = await getDocs(collection(db, "clusters"));
      setClusters(snapC.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await criarUsuarioNoFirebase(form.email, form.pass, { 
        name: form.name, 
        email: form.email, 
        role: 'supervisor', 
        clusterId: form.cluster, 
        active: true 
      });
      alert('Supervisor cadastrado com sucesso!');
      setForm({ name: '', email: '', pass: '', cluster: '' });
      fetchData();
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  return (
    <div style={global.container}>
      <div style={global.header}>
        <div style={{...global.iconHeader, background: '#9333ea'}}><Shield size={28} color="white"/></div>
        <div>
          <h1 style={global.title}>Gestão de Líderes</h1>
          <p style={global.subtitle}>Supervisores e Coordenadores ativos (Estrategistas HUB).</p>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 350px', gap: '30px', marginTop: '20px'}}>
        <div style={global.gridCards}>
          {lista.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
            <div key={s.id} style={{...global.card, padding: '20px'}}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <h4 style={{fontWeight:'bold', color:'var(--text-main)'}}>{s.name}</h4>
                <span style={{fontSize:'10px', background:'#f3e8ff', color:'#9333ea', padding:'2px 8px', borderRadius:'10px'}}>{s.role}</span>
              </div>
              <div style={{fontSize:'12px', color:'var(--text-muted)', marginTop:'10px'}}><Mail size={12} style={{display:'inline'}}/> {s.email}</div>
              <div style={{fontSize:'12px', color:'var(--text-muted)'}}><MapPin size={12} style={{display:'inline'}}/> Cluster: {s.clusterId}</div>
            </div>
          ))}
        </div>

        <div style={global.card}>
          <h3 style={global.sectionTitle}>Novo Líder</h3>
          <form onSubmit={handleAdd} style={global.form}>
            <input style={global.input} placeholder="Nome" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
            <input style={global.input} placeholder="E-mail" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} required />
            <input style={global.input} type="password" placeholder="Senha" value={form.pass} onChange={e=>setForm({...form, pass:e.target.value})} required />
            <select style={global.select} value={form.cluster} onChange={e=>setForm({...form, cluster:e.target.value})} required>
              <option value="">Selecione o Cluster...</option>
              {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button style={global.btnPrimary} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : 'Cadastrar Líder'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 2. GESTÃO DE EQUIPE OPERACIONAL E GROWTH 
// ==============================================================
export const GestaoAtendentes = () => {
  const [lista, setLista] = useState([]);
  const [cidades, setCidades] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // O form agora inclui 'sector'
  const [form, setForm] = useState({ name: '', email: '', pass: '', city: '', sector: '', role: 'attendant', photo: null });

  const fetchData = async () => {
    try {
      const qUsers = query(collection(db, "users"), where("role", "in", ["attendant", "growth_team"]));
      const snapUsers = await getDocs(qUsers);
      setLista(snapUsers.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const snapC = await getDocs(collection(db, "cities"));
      setCidades(snapC.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Regra de Ouro: Se for Growth, não tem cidade vinculada (fica global). Se for Atendente, não tem setor.
      const isGrowth = form.role === 'growth_team';
      const finalCityId = isGrowth ? 'global' : form.city;
      const finalSector = isGrowth ? form.sector : null;

      if (editingUser) {
        await updateDoc(doc(db, "users", editingUser.id), {
            name: form.name,
            email: form.email,
            role: form.role,
            cityId: finalCityId,
            sector: finalSector,
            photo: form.photo,
            updatedAt: serverTimestamp()
        });
        alert('Perfil atualizado com sucesso!');
      } else {
        const emailFinal = form.email;
        const passFinal = form.pass || '123456';
        
        await criarUsuarioNoFirebase(emailFinal, passFinal, { 
          name: form.name, 
          email: emailFinal, 
          role: form.role, 
          cityId: finalCityId, 
          sector: finalSector,
          active: true,
          photo: form.photo
        });
        alert('Colaborador criado com sucesso!');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) { 
      alert(err.message); 
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if(window.confirm("Deseja remover este colaborador? (Nota: O login no Auth deve ser removido manualmente no console)")) {
      await deleteDoc(doc(db, "users", id));
      fetchData();
    }
  };

  return (
    <div style={global.container}>
      <div style={global.header}>
        <div style={{...global.iconHeader, background: '#2563eb'}}><Users size={28} color="white"/></div>
        <div>
          <h1 style={global.title}>Equipe Operacional & Growth</h1>
          <p style={global.subtitle}>{lista.length} colaboradores registados para Vendas e Ações do HUB.</p>
        </div>
        <button onClick={() => { setEditingUser(null); setForm({name:'', email:'', pass:'', city:'', sector:'', role:'attendant', photo:null}); setIsModalOpen(true); }} style={global.btnPrimary}>
          <UserPlus size={18} /> Novo Colaborador
        </button>
      </div>

      <div style={global.toolbar}>
        <div style={global.searchBox}>
          <Search size={18} color="var(--text-muted)" />
          <input style={global.searchInput} placeholder="Buscar colaborador..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div style={global.gridCards}>
        {lista.filter(a => a.name?.toLowerCase().includes(searchTerm.toLowerCase())).map(att => (
          <div key={att.id} style={{...global.card, padding: '20px', textAlign:'center', position: 'relative'}}>
            
            <div style={{position: 'absolute', top: 15, right: 15}}>
               <span style={{ 
                  fontSize:'10px', 
                  background: att.role === 'growth_team' ? '#dcfce7' : '#e0f2fe', 
                  color: att.role === 'growth_team' ? '#16a34a' : '#0284c7', 
                  padding:'4px 10px', 
                  borderRadius:'12px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
               }}>
                 {att.role === 'growth_team' ? <><Rocket size={10} /> Equipe HUB</> : 'Atendente'}
               </span>
            </div>

            <div style={{width:60, height:60, borderRadius:'50%', background:'#eee', margin:'0 auto 10px', overflow:'hidden'}}>
              {att.photo ? <img src={att.photo} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : <Users size={30} style={{marginTop:15, color: 'var(--text-muted)'}}/>}
            </div>
            <h4 style={{fontWeight:'bold'}}>{att.name}</h4>
            
            {/* Exibe o Setor ou a Cidade dinamicamente */}
            <p style={{fontSize:'12px', color:'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginTop: '5px'}}>
              {att.role === 'growth_team' ? (
                <><Briefcase size={14} /> {att.sector || 'Global'}</>
              ) : (
                <><MapPin size={14} /> {att.cityId}</>
              )}
            </p>
            
            <div style={{display:'flex', gap:'10px', marginTop:'15px'}}>
              <button onClick={() => { setEditingUser(att); setForm({name:att.name, email:att.email, city:att.cityId === 'global' ? '' : att.cityId, sector: att.sector || '', role: att.role || 'attendant', photo:att.photo}); setIsModalOpen(true); }} style={{...global.btnSecondary, flex:1}}>Editar</button>
              <button onClick={() => handleDelete(att.id)} style={global.btnDanger}><Trash2 size={16}/></button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div style={global.modalOverlay}>
          <div style={global.modalBox}>
            <div style={global.modalHeader}>
              <h3 style={global.modalTitle}>{editingUser ? 'Editar Colaborador' : 'Novo Colaborador'}</h3>
              <button onClick={() => setIsModalOpen(false)} style={global.closeBtn}><X size={24}/></button>
            </div>
            <form onSubmit={handleSubmit} style={global.form}>
              
              <select style={{...global.select, border: form.role === 'growth_team' ? '1px solid #16a34a' : '1px solid var(--border)', marginBottom: '15px'}} value={form.role} onChange={e=>setForm({...form, role:e.target.value})} required>
                <option value="attendant">Atendente (Apenas Vendas/Leads)</option>
                <option value="growth_team">Equipe de Growth (Acesso ao HUB)</option>
              </select>

              <input style={global.input} placeholder="Nome Completo" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
              <input style={global.input} placeholder="E-mail" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} required />
              {!editingUser && <input style={global.input} type="password" placeholder="Senha (padrão 123456)" value={form.pass} onChange={e=>setForm({...form, pass:e.target.value})} />}
              
              {/* RENDERIZAÇÃO CONDICIONAL: Mostra Cidade ou Setor dependendo da Role */}
              {form.role === 'attendant' ? (
                <select style={global.select} value={form.city} onChange={e=>setForm({...form, city:e.target.value})} required>
                  <option value="">Selecione a Cidade/Loja...</option>
                  {cidades.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : (
                <select style={global.select} value={form.sector} onChange={e=>setForm({...form, sector:e.target.value})} required>
                  <option value="">Selecione o Setor de Atuação...</option>
                  {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}

              <button style={global.btnPrimary} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : 'Salvar Colaborador'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default { GestaoSupervisores, GestaoAtendentes };