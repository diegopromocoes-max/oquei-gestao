import React, { useState } from 'react';
import { db, firebaseConfig } from '../firebase'; 
import { doc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as authSignOut } from 'firebase/auth';
import { 
  Users, UserPlus, Mail, Lock as IconLock, Trash2, Edit, Camera, X, 
  Search, Shield, MapPin, User, FileText, Clock, AlertTriangle, FileCheck, Calendar, Activity
} from 'lucide-react';

// --- HELPERS INTERNOS ---
const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

const formatMinutes = (totalMinutes) => {
  if (!totalMinutes) return "00:00";
  const isNegative = totalMinutes < 0;
  const abs = Math.abs(totalMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${isNegative ? '-' : '+'}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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

// --- COMPONENTES EXPORTADOS (NAMED EXPORTS) ---

export const GestaoSupervisores = ({ lista, clusters, refresh, onDelete, onUpdate, setNotification }) => {
  const [form, setForm] = useState({ name: '', email: '', pass: '', cluster: '' });
  const [searchTerm, setSearchTerm] = useState('');
  
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
      setNotification({ type: 'success', message: 'Supervisor cadastrado!' });
      setForm({ name: '', email: '', pass: '', cluster: '' });
      refresh();
    } catch (err) { setNotification({ type: 'error', message: err.message }); }
  };

  const filteredList = lista.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div style={styles.container}>
      <div style={styles.sectionHeader}>
        <div>
          <h3 style={styles.title}>Gestão de Liderança</h3>
          <p style={styles.subtitle}>{lista.length} supervisores ativos na rede.</p>
        </div>
        <div style={styles.searchWrapper}>
          <Search size={18} color="#94a3b8" />
          <input 
            style={styles.searchInput} 
            placeholder="Buscar supervisor..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div style={styles.splitLayout}>
        <div style={styles.gridArea}>
          {filteredList.map(s => (
            <div key={s.id} style={styles.userCard}>
              <div style={{...styles.cardTopBorder, background: '#9333ea'}}></div>
              <div style={styles.cardHeader}>
                <div style={styles.avatarBox}>
                  <span style={{fontSize:'18px', fontWeight:'bold', color:'#9333ea'}}>{s.name.charAt(0)}</span>
                </div>
                <button onClick={() => onDelete('users', s.id)} style={styles.iconBtn}><Trash2 size={16}/></button>
              </div>
              <div style={styles.cardBody}>
                <h4 style={styles.userName}>{s.name}</h4>
                <div style={styles.badgePurple}><Shield size={12}/> {s.clusterId}</div>
                <div style={styles.userInfoRow}><Mail size={12}/> {s.email}</div>
              </div>
            </div>
          ))}
          {filteredList.length === 0 && <div style={styles.emptyState}>Nenhum supervisor encontrado.</div>}
        </div>

        <div style={styles.formCard}>
          <div style={styles.formHeader}>
            <div style={{background: '#f3e8ff', padding:'10px', borderRadius:'10px'}}>
              <UserPlus size={24} color="#9333ea" />
            </div>
            <h3 style={styles.formTitle}>Novo Supervisor</h3>
          </div>
          <form onSubmit={handleAdd} style={styles.formStack} autoComplete="off">
            <div style={styles.inputGroup}>
              <User size={18} color="#94a3b8"/>
              <input style={styles.input} placeholder="Nome Completo" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required autoComplete="off" />
            </div>
            <div style={styles.inputGroup}>
              <Mail size={18} color="#94a3b8"/>
              <input style={styles.input} placeholder="E-mail Corporativo" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required autoComplete="new-password" />
            </div>
            <div style={styles.inputGroup}>
              <IconLock size={18} color="#94a3b8"/>
              <input style={styles.input} type="password" placeholder="Senha de Acesso" value={form.pass} onChange={e => setForm({...form, pass: e.target.value})} required autoComplete="new-password" />
            </div>
            <select style={styles.select} value={form.cluster} onChange={e => setForm({...form, cluster: e.target.value})} required>
              <option value="">Vincular a qual Regional?</option>
              {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button style={{ ...styles.btnPrimary, backgroundColor: '#9333ea', boxShadow: '0 4px 14px rgba(147, 51, 234, 0.3)' }}>Cadastrar Líder</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export const GestaoAtendentes = ({ lista, cidades, refresh, onDelete, onUpdate, setNotification }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({ name: '', email: '', pass: '', city: '', photo: null });
  const [activeModalTab, setActiveModalTab] = useState('cadastro'); // 'cadastro' ou 'dossie'
  
  // Dados do Dossiê
  const [dossie, setDossie] = useState({ absences: [], rhRequests: [] });
  const [loadingDossie, setLoadingDossie] = useState(false);

  const fetchDossie = async (userId) => {
    setLoadingDossie(true);
    try {
      // Buscar Ausências
      const qAbs = query(collection(db, "absences"), where("attendantId", "==", userId));
      const snapAbs = await getDocs(qAbs);
      const absences = snapAbs.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => new Date(b.startDate) - new Date(a.startDate));

      // Buscar Solicitações RH
      const qRh = query(collection(db, "rh_requests"), where("attendantId", "==", userId));
      const snapRh = await getDocs(qRh);
      const requests = snapRh.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => b.createdAt - a.createdAt);

      setDossie({ absences, rhRequests: requests });
    } catch (e) { console.error("Erro ao carregar dossiê", e); }
    setLoadingDossie(false);
  };

  const openModal = (user = null) => {
    setEditingUser(user);
    setActiveModalTab('cadastro');
    if (user) {
      setForm({ name: user.name, email: user.email, pass: '', city: user.cityId, photo: user.photo });
      fetchDossie(user.id); // Carrega dados extras
    } else {
      setForm({ name: '', email: '', pass: '', city: '', photo: null });
      setDossie({ absences: [], rhRequests: [] });
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
        await onUpdate(editingUser.id, {
          name: form.name,
          cityId: form.city,
          photo: form.photo
        });
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
        setNotification({ type: 'success', message: 'Atendente criado com sucesso!' });
        refresh();
      }
      setIsModalOpen(false);
    } catch (err) { setNotification({ type: 'error', message: err.message }); }
  };
  
  const filteredList = lista.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div style={styles.container}>
      <div style={styles.sectionHeader}>
        <div>
          <h3 style={styles.title}>Time de Vendas</h3>
          <p style={styles.subtitle}>Gerencie o acesso e dados dos {lista.length} consultores.</p>
        </div>
        <div style={{display:'flex', gap:'15px'}}>
          <div style={styles.searchWrapper}>
            <Search size={18} color="#94a3b8" />
            <input 
              style={styles.searchInput} 
              placeholder="Buscar atendente..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => openModal()} style={styles.btnHeader}>
            <UserPlus size={18} /> Novo
          </button>
        </div>
      </div>

      <div style={styles.gridCards}>
        {filteredList.map(att => (
          <div key={att.id} style={styles.userCard} onClick={() => openModal(att)}>
            <div style={{...styles.cardTopBorder, background: '#2563eb'}}></div>
            <div style={styles.cardContentCenter}>
               <div style={styles.avatarLargeWrapper}>
                 {att.photo ? (
                   <img src={att.photo} style={styles.avatarImg} alt={att.name} />
                 ) : (
                   <div style={styles.avatarPlaceholder}>{att.name.charAt(0)}</div>
                 )}
                 <button onClick={(e) => { e.stopPropagation(); openModal(att); }} style={styles.editFloatBtn}><Edit size={12} color="white"/></button>
               </div>
               <h4 style={styles.userNameLarge}>{att.name}</h4>
               <div style={{display:'flex', gap:'5px', marginTop:'5px'}}>
                 <span style={styles.badgeBlue}><MapPin size={10}/> {att.cityId}</span>
               </div>
               <p style={{fontSize:'11px', color:'#94a3b8', marginTop:'10px'}}>{att.email}</p>
            </div>
            <div style={styles.cardFooter}>
              <button onClick={(e) => { e.stopPropagation(); onDelete('users', att.id); }} style={styles.btnDeleteText}>Remover Acesso</button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBoxLarge}>
            <div style={styles.modalHeader}>
              <h3 style={{fontSize:'20px', fontWeight:'bold', color:'#1e293b'}}>
                {editingUser ? 'Ficha do Colaborador' : 'Novo Atendente'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={styles.closeBtn}><X size={24}/></button>
            </div>

            {/* ABAS DO MODAL */}
            {editingUser && (
              <div style={styles.tabsContainer}>
                <button onClick={() => setActiveModalTab('cadastro')} style={activeModalTab === 'cadastro' ? styles.tabActive : styles.tab}>Dados Cadastrais</button>
                <button onClick={() => setActiveModalTab('dossie')} style={activeModalTab === 'dossie' ? styles.tabActive : styles.tab}>Dossiê Completo</button>
              </div>
            )}

            {activeModalTab === 'cadastro' && (
              <form onSubmit={handleSubmit} style={styles.formStack}>
                <div style={{display:'flex', justifyContent:'center', marginBottom:'10px'}}>
                  <div style={{position:'relative', width:'90px', height:'90px'}}>
                    {form.photo ? <img src={form.photo} style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover', border:'3px solid #e2e8f0'}} /> : <div style={{width:'100%', height:'100%', borderRadius:'50%', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px', fontWeight:'bold', color:'#cbd5e1', border:'3px solid #e2e8f0'}}>{form.name ? form.name.charAt(0) : '?'}</div>}
                    <label style={styles.cameraBtn}><Camera size={16} color="white" /><input type="file" style={{display:'none'}} onChange={handleFile} accept="image/*" /></label>
                  </div>
                </div>
                <div style={styles.inputGroup}><User size={18} color="#94a3b8"/><input style={styles.input} placeholder="Nome Completo" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
                {!editingUser && (
                  <>
                    <div style={styles.inputGroup}><Mail size={18} color="#94a3b8"/><input style={styles.input} placeholder="E-mail (Deixe em branco p/ provisório)" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                    <div style={styles.inputGroup}><IconLock size={18} color="#94a3b8"/><input style={styles.input} type="password" placeholder="Senha (Opcional)" value={form.pass} onChange={e => setForm({...form, pass: e.target.value})} /></div>
                  </>
                )}
                <select style={styles.select} value={form.city} onChange={e => setForm({...form, city: e.target.value})} required>
                  <option value="">Selecione a Loja...</option>
                  {cidades.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button style={{...styles.btnPrimary, backgroundColor:'#2563eb'}}>Salvar Dados</button>
              </form>
            )}

            {activeModalTab === 'dossie' && editingUser && (
              <div style={{animation: 'fadeIn 0.3s'}}>
                {loadingDossie ? <p style={styles.loading}>Carregando histórico...</p> : (
                  <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                    
                    {/* BANCO DE HORAS */}
                    <div style={{background:'#f8fafc', padding:'15px', borderRadius:'12px', border:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <div>
                        <h4 style={{fontSize:'12px', fontWeight:'bold', color:'#64748b', textTransform:'uppercase'}}>Banco de Horas</h4>
                        <span style={{fontSize:'12px', color:'#94a3b8'}}>Saldo Atual</span>
                        {/* DATA DA ATUALIZAÇÃO */}
                        {editingUser.lastUpdate && (
                            <div style={{fontSize:'10px', color:'#64748b', marginTop:'4px', display:'flex', alignItems:'center', gap:'4px'}}>
                                <Clock size={10}/> 
                                Atualizado: {new Date(editingUser.lastUpdate.seconds * 1000).toLocaleDateString('pt-BR')}
                            </div>
                        )}
                        {/* AJUSTES MANUAIS */}
                        <div style={{fontSize:'10px', color:'#64748b', marginTop:'4px', display:'flex', alignItems:'center', gap:'4px'}}>
                            <Activity size={10}/>
                            Ajustes Manuais: 
                            <span style={{fontWeight:'bold', color: editingUser.manualAdjustments > 4 ? '#ef4444' : '#64748b'}}>
                                {editingUser.manualAdjustments || 0}
                            </span>
                            {editingUser.manualAdjustments > 4 && <span style={{fontSize:'9px', color:'#ef4444', fontWeight:'bold', marginLeft:'4px'}}>(POQ ZERADO)</span>}
                        </div>
                      </div>
                      <div style={{fontSize:'24px', fontWeight:'900', color: editingUser.balance >= 0 ? '#10b981' : '#ef4444'}}>
                        {formatMinutes(editingUser.balance)}
                      </div>
                    </div>

                    {/* FALTAS E FÉRIAS */}
                    <div>
                      <h4 style={styles.subTitle}>Ausências Registradas</h4>
                      <div style={styles.historyList}>
                        {dossie.absences.length === 0 && <p style={styles.emptyText}>Nenhuma falta registrada.</p>}
                        {dossie.absences.map(abs => (
                          <div key={abs.id} style={styles.historyItem}>
                             <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                               <Calendar size={14} color="#f59e0b"/>
                               <span style={{fontSize:'13px', fontWeight:'bold', color:'#334155'}}>{abs.type === 'ferias' ? 'Férias' : 'Falta/Atestado'}</span>
                             </div>
                             <span style={{fontSize:'12px', color:'#64748b'}}>{new Date(abs.startDate).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SOLICITAÇÕES RH / OCORRÊNCIAS */}
                    <div>
                      <h4 style={styles.subTitle}>Ocorrências RH</h4>
                      <div style={styles.historyList}>
                        {dossie.rhRequests.length === 0 && <p style={styles.emptyText}>Nenhuma ocorrência.</p>}
                        {dossie.rhRequests.map(req => {
                           const isWarning = req.type === 'advertencia' || req.type === 'suspensao' || req.type === 'desligamento';
                           return (
                              <div key={req.id} style={{...styles.historyItem, borderLeft: isWarning ? '3px solid #ef4444' : '1px solid #f1f5f9'}}>
                                 <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                   {isWarning ? <AlertTriangle size={14} color="#ef4444"/> : <FileCheck size={14} color="#2563eb"/>}
                                   <span style={{fontSize:'13px', fontWeight:'bold', color: isWarning ? '#b91c1c' : '#334155', textTransform:'capitalize'}}>{req.type}</span>
                                 </div>
                                 <span style={{fontSize:'12px', color:'#64748b'}}>{req.dateEvent ? new Date(req.dateEvent).toLocaleDateString() : 'N/A'}</span>
                              </div>
                           )
                        })}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- ESTILOS COMPARTILHADOS ---
const styles = {
  container: { width: '100%' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' },
  title: { fontSize: '24px', fontWeight: '800', color: '#1e293b', margin: 0 },
  subtitle: { fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' },
  searchWrapper: { display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '10px 15px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '250px' },
  searchInput: { border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', color: '#334155' },
  btnHeader: { background: '#2563eb', color: 'white', border: 'none', padding: '0 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' },
  splitLayout: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px', alignItems: 'start' },
  gridArea: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' },
  gridCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '25px' },
  userCard: { background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', position: 'relative', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'transform 0.2s', cursor: 'pointer' },
  cardTopBorder: { height: '4px', width: '100%' },
  cardHeader: { padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'start' },
  cardBody: { padding: '0 15px 20px 15px' },
  cardContentCenter: { padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  cardFooter: { borderTop: '1px solid #f1f5f9', padding: '10px', textAlign: 'center' },
  avatarBox: { width: '40px', height: '40px', borderRadius: '10px', background: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatarLargeWrapper: { position: 'relative', marginBottom: '15px' },
  avatarImg: { width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #f1f5f9' },
  avatarPlaceholder: { width: '80px', height: '80px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', color: '#94a3b8', border: '3px solid white', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' },
  editFloatBtn: { position: 'absolute', bottom: 0, right: 0, background: '#2563eb', border: '2px solid white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  userName: { fontSize: '16px', fontWeight: 'bold', color: '#1e293b', margin: 0 },
  userNameLarge: { fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 },
  badgePurple: { display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 'bold', color: '#9333ea', background: '#faf5ff', padding: '4px 8px', borderRadius: '6px', marginTop: '5px' },
  badgeBlue: { display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 'bold', color: '#2563eb', background: '#eff6ff', padding: '4px 8px', borderRadius: '6px' },
  userInfoRow: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', marginTop: '10px' },
  formCard: { background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', height: 'fit-content' },
  formHeader: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' },
  formTitle: { fontSize: '18px', fontWeight: 'bold', color: '#1e293b' },
  formStack: { display: 'flex', flexDirection: 'column', gap: '15px' },
  inputGroup: { display: 'flex', alignItems: 'center', gap: '10px', padding: '0 15px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#fcfcfc' },
  input: { flex: 1, padding: '12px 0', border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', color: '#334155' },
  select: { padding: '12px 15px', border: '1px solid #e2e8f0', borderRadius: '12px', outline: 'none', fontSize: '14px', color: '#334155', background: '#fcfcfc', width: '100%' },
  btnPrimary: { padding: '14px', borderRadius: '12px', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', width: '100%', transition: 'transform 0.2s' },
  iconBtn: { background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '5px', hover: { color: '#ef4444' } },
  btnDeleteText: { background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', width: '100%' },
  
  // MODAL & TABS
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modalBox: { backgroundColor: 'white', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' },
  modalBoxLarge: { backgroundColor: 'white', padding: '30px', borderRadius: '24px', width: '90%', maxWidth: '600px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  closeBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, background: '#2563eb', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid white', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' },
  tabsContainer: { display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px', gap: '20px' },
  tab: { padding: '10px 0', background: 'none', border: 'none', borderBottom: '3px solid transparent', color: '#64748b', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  tabActive: { padding: '10px 0', background: 'none', border: 'none', borderBottom: '3px solid #2563eb', color: '#2563eb', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
  subTitle: { fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '10px', marginTop: '15px' },
  historyList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  historyItem: { display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' },
  emptyText: { textAlign: 'center', fontSize: '12px', color: '#cbd5e1', fontStyle: 'italic', padding: '10px' },
  loading: { textAlign: 'center', color: '#3b82f6', padding: '20px', fontWeight: 'bold' },
  btn: { padding: '12px', borderRadius: '10px', border: 'none', color: '#ffffff', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', width: '100%' },
  emptyState: { gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#94a3b8', fontStyle: 'italic' },
  sectionLabel: { fontSize: '15px', fontWeight: '800', color: '#64748b', marginBottom: '20px', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.15em' },
  innerGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px' },
  listItemCard: { backgroundColor: '#ffffff', padding: '20px', borderRadius: '22px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  itemTagPurple: { fontSize: '10px', fontWeight: '900', color: '#9333ea', backgroundColor: '#faf5ff', padding: '4px 10px', borderRadius: '8px', display: 'inline-block', margin: '8px 0' },
  itemName: { fontWeight: '800', fontSize: '16px', color: '#0f172a', margin: 0 },
  premiumSelect: { padding: '14px 16px', borderRadius: '16px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', outline: 'none', fontSize: '14px', fontWeight: '600', color: '#1e293b', width: '100%', cursor: 'pointer' },
};