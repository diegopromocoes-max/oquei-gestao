import React, { useState, useEffect } from 'react';
import { db, firebaseConfig } from '../firebase'; 
import { doc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut as authSignOut } from 'firebase/auth';
import { 
  UserPlus, Mail, Trash2, Edit,
  Search, Shield, MapPin, Users, Loader2, Rocket, Briefcase,
  Filter
} from 'lucide-react';

import { styles as global, colors } from '../styles/globalStyles';
import { Modal } from '../components/ui';

// --- HELPERS E CONSTANTES ---
const SECTORS = [
  'Marketing', 'Central de Vendas', 'PaP', 'Lojas', 
  'Empresas', 'TI', 'Diretoria', 'Analista'
];

const createEmptyCollaboratorForm = () => ({
  name: '',
  email: '',
  pass: '',
  city: '',
  sector: '',
  role: 'attendant',
  photo: null,
  employeeCode: '',
  documentId: '',
  jobTitle: '',
  teamName: '',
  supervisorUid: '',
  hireDate: '',
  employmentStatus: 'ativo',
  scheduleLabel: '',
  notes: '',
});

const buildCollaboratorForm = (user = {}) => ({
  ...createEmptyCollaboratorForm(),
  name: user.name || '',
  email: user.email || '',
  city: user.cityId === 'global' ? '' : (user.cityId || ''),
  sector: user.sector || '',
  role: user.role || 'attendant',
  photo: user.photo || null,
  employeeCode: user.employeeCode || '',
  documentId: user.documentId || '',
  jobTitle: user.jobTitle || '',
  teamName: user.teamName || '',
  supervisorUid: user.supervisorUid || '',
  hireDate: user.hireDate || '',
  employmentStatus: user.employmentStatus || 'ativo',
  scheduleLabel: user.scheduleLabel || '',
  notes: user.notes || '',
});

const criarUsuarioNoFirebase = async (email, password, profileData) => {
  const secondaryApp = getApps().find(a => a.name === 'Secondary') || initializeApp(firebaseConfig, 'Secondary');
  const secondaryAuth = getAuth(secondaryApp);
  
  try {
    const res = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = res.user.uid;
    try {
      await setDoc(doc(db, "users", uid), { ...profileData, uid: uid, createdAt: serverTimestamp() });
      await authSignOut(secondaryAuth);
      return uid;
    } catch (fsError) {
      throw new Error(`Login criado, mas erro no Firestore: ${fsError.message}`);
    }
  } catch (authError) {
    if (authError.code === 'auth/email-already-in-use') throw new Error("Este e-mail jÃ¡ estÃ¡ em uso.");
    throw authError;
  }
};

// ==============================================================
// 1. GESTÃƒO DE LÃDERES (SUPERVISORES E COORDENADORES)
// ==============================================================
export const GestaoSupervisores = () => {
  const [lista, setLista] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingLeader, setEditingLeader] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', pass: '', cluster: '' });

  const fetchData = async () => {
    try {
      const qUsers = query(collection(db, "users"), where("role", "in", ["supervisor", "coordinator", "coordenador", "master"]));
      const snapUsers = await getDocs(qUsers);
      setLista(snapUsers.docs.map(d => ({ id: d.id, ...d.data() })));
      const snapC = await getDocs(collection(db, "clusters"));
      setClusters(snapC.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingLeader) {
        // Modo EdiÃ§Ã£o
        await updateDoc(doc(db, "users", editingLeader.id), {
          name: form.name,
          email: form.email,
          clusterId: form.cluster,
          updatedAt: serverTimestamp()
        });
        alert('Dados do LÃ­der atualizados com sucesso!');
        setEditingLeader(null);
      } else {
        // Modo CriaÃ§Ã£o
        await criarUsuarioNoFirebase(form.email, form.pass, { 
          name: form.name, 
          email: form.email, 
          role: 'supervisor', 
          clusterId: form.cluster, 
          active: true 
        });
        alert('LÃ­der cadastrado!');
      }
      setForm({ name: '', email: '', pass: '', cluster: '' });
      fetchData();
    } catch (err) { 
      alert(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const startEditing = (leader) => {
    setEditingLeader(leader);
    setForm({
      name: leader.name || '',
      email: leader.email || '',
      pass: '', 
      cluster: leader.clusterId || ''
    });
  };

  const cancelEditing = () => {
    setEditingLeader(null);
    setForm({ name: '', email: '', pass: '', cluster: '' });
  };

  return (
    <div style={global.container}>
      <div style={local.headerWrapper}>
        <div style={local.headerContent}>
          <div style={{ ...local.iconBox, background: 'linear-gradient(135deg, #9333EA, #7C3AED)', boxShadow: '0 8px 20px rgba(147,51,234,0.3)' }}>
            <Shield size={28} color="#fff" />
          </div>
          <div>
            <div style={local.headerTitle}>GestÃ£o de LÃ­deres</div>
            <div style={local.headerSubtitle}>
              Supervisores e Coordenadores ativos (Estrategistas HUB) Â· {new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>
      </div>

      <div style={local.leadersLayout}>
        <div style={global.gridCards}>
          {lista.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
            <div key={s.id} style={{ ...global.card, padding: '24px', borderLeft: `4px solid ${colors.secondary || '#9333ea'}`, position: 'relative' }}>
              <button onClick={() => startEditing(s)} style={local.btnEditCard} title="Editar LÃ­der">
                <Edit size={16} />
              </button>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', paddingRight: '30px' }}>
                <div>
                  <h4 style={{ fontWeight: '900', color: 'var(--text-main)', fontSize: '16px', margin: 0 }}>{s.name}</h4>
                  <span style={{ fontSize: '10px', background: '#f3e8ff', color: '#9333ea', padding: '3px 10px', borderRadius: '10px', fontWeight: '900', textTransform: 'uppercase', marginTop: '5px', display: 'inline-block' }}>{s.role}</span>
                </div>
                <div style={{ background: 'var(--bg-panel)', padding: '8px', borderRadius: '10px' }}><Shield size={16} color="#9333ea" /></div>
              </div>
              <div style={local.cardInfo}><Mail size={13} /> {s.email}</div>
              <div style={local.cardInfo}><MapPin size={13} /> Cluster: <strong style={{color: 'var(--text-main)'}}>{s.clusterId}</strong></div>
            </div>
          ))}
        </div>

        <div style={{ ...global.card, padding: '30px', height: 'fit-content', border: editingLeader ? `2px solid ${colors.secondary || '#9333ea'}` : '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ ...global.sectionTitle, margin: 0 }}>{editingLeader ? 'Editar LÃ­der' : 'Novo LÃ­der'}</h3>
            {editingLeader && (
              <button onClick={cancelEditing} style={{ background: 'var(--bg-app)', border: 'none', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)' }}>Cancelar</button>
            )}
          </div>
          <form onSubmit={handleSubmit} style={global.form}>
            <input style={global.input} placeholder="Nome Completo" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
            <input style={global.input} placeholder="E-mail Corporativo" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} required />
            {!editingLeader && (
              <input style={global.input} type="password" placeholder="Definir Senha" value={form.pass} onChange={e=>setForm({...form, pass:e.target.value})} required />
            )}
            <select style={global.select} value={form.cluster} onChange={e=>setForm({...form, cluster:e.target.value})} required>
              <option value="">Selecione o Cluster...</option>
              {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button style={{ ...global.btnPrimary, background: '#9333ea', width: '100%', height: '48px', fontWeight: '900' }} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : editingLeader ? 'Salvar AlteraÃ§Ãµes' : 'Cadastrar LÃ­der'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ==============================================================
// 2. GESTÃƒO DE EQUIPE OPERACIONAL E GROWTH 
// ==============================================================
export const GestaoAtendentes = () => {
  const [lista, setLista] = useState([]);
  const [cidades, setCidades] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // ESTADOS DE FILTRO
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterCluster, setFilterCluster] = useState('all');

  const [form, setForm] = useState(createEmptyCollaboratorForm);

  const fetchData = async () => {
    try {
      const qUsers = query(collection(db, "users"), where("role", "in", ["attendant", "atendente", "growth_team", "growthteam"]));
      const snapUsers = await getDocs(qUsers);
      setLista(snapUsers.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const snapC = await getDocs(collection(db, "cities"));
      setCidades(snapC.docs.map(d => ({ id: d.id, ...d.data() })));

      const snapClust = await getDocs(collection(db, "clusters"));
      setClusters(snapClust.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const closeCollaboratorModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setForm(createEmptyCollaboratorForm());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const isGrowth = form.role === 'growth_team';
      const finalCityId = isGrowth ? 'global' : form.city;
      const finalSector = isGrowth ? form.sector : null;
      const payload = {
        name: form.name,
        email: form.email,
        role: form.role,
        cityId: finalCityId,
        sector: finalSector,
        photo: form.photo,
        employeeCode: form.employeeCode || '',
        documentId: form.documentId || '',
        jobTitle: form.jobTitle || '',
        teamName: form.teamName || '',
        supervisorUid: form.supervisorUid || '',
        hireDate: form.hireDate || '',
        employmentStatus: form.employmentStatus || '',
        scheduleLabel: form.scheduleLabel || '',
        notes: form.notes || '',
        updatedAt: serverTimestamp(),
      };

      if (editingUser) {
        await updateDoc(doc(db, "users", editingUser.id), payload);
        alert('Perfil atualizado!');
      } else {
        await criarUsuarioNoFirebase(form.email, form.pass || '123456', { ...payload, active: true });
        alert('Colaborador criado!');
      }
      closeCollaboratorModal();
      fetchData();
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if(window.confirm("Deseja remover este colaborador?")) {
      await deleteDoc(doc(db, "users", id));
      fetchData();
    }
  };

  // LÃ“GICA DE FILTRAGEM COMBINADA
  const filteredList = lista.filter(att => {
    // 1. Filtro por Busca (Nome ou Cidade)
    const matchText = att.name?.toLowerCase().includes(searchTerm.toLowerCase()) || att.cityId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 2. Filtro por Cargo
    let matchRole = true;
    if (filterRole === 'attendant') matchRole = ['attendant', 'atendente'].includes(att.role);
    if (filterRole === 'growth') matchRole = ['growth_team', 'growthteam'].includes(att.role);

    // 3. Filtro por Cluster
    let matchCluster = true;
    if (filterCluster !== 'all') {
      const userCity = cidades.find(c => c.id === att.cityId);
      const userCluster = userCity?.clusterId || att.clusterId; // O time growth "global" pode ser escondido caso se filtre por regional
      matchCluster = userCluster === filterCluster;
    }

    return matchText && matchRole && matchCluster;
  });

  const roleBadgeLabel = form.role === 'growth_team' ? 'Equipe HUB' : 'Atendente';

  return (
    <div style={global.container}>
      {/* â”€â”€ CABEÃ‡ALHO PADRÃƒO OQUEI (OPERACIONAL) â”€â”€ */}
      <div style={local.headerWrapper}>
        <div style={local.headerContent}>
          <div style={{ ...local.iconBox, background: `linear-gradient(135deg, ${colors.primary}, ${colors.info})`, boxShadow: `0 8px 20px ${colors.primary}40` }}>
            <Users size={28} color="#fff" />
          </div>
          <div>
            <div style={local.headerTitle}>Equipe Operacional & Growth</div>
            <div style={local.headerSubtitle}>
              {lista.length} colaboradores registados para Vendas e AÃ§Ãµes do HUB.
            </div>
          </div>
        </div>
        <button onClick={() => { setEditingUser(null); setForm(createEmptyCollaboratorForm()); setIsModalOpen(true); }} style={{ ...global.btnPrimary, borderRadius: '14px', padding: '12px 24px', fontWeight: '900', gap: '8px' }}>
          <UserPlus size={18} /> Novo Colaborador
        </button>
      </div>

      {/* â”€â”€ BARRA DE FILTROS AVANÃ‡ADA â”€â”€ */}
      <div style={local.filtersBar}>
        
        <div style={{ ...global.searchBox, flex: 1, minWidth: '250px', margin: 0 }}>
          <Search size={18} color="var(--text-muted)" />
          <input style={global.searchInput} placeholder="Procurar colaborador ou cidade..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>

        <div style={local.filtersGroup}>
          <Filter size={18} color="var(--text-muted)" />
          
          {/* Select de Acesso/Cargo */}
          <select 
            style={{ ...global.select, width: 'auto', minWidth: '180px', margin: 0, padding: '10px 15px', background: 'var(--bg-app)' }} 
            value={filterRole} 
            onChange={e => setFilterRole(e.target.value)}
          >
            <option value="all">Todos os Acessos</option>
            <option value="attendant">Vendas (Atendentes)</option>
            <option value="growth">EstratÃ©gia (Growth)</option>
          </select>

          {/* Select de Cluster */}
          <select 
            style={{ ...global.select, width: 'auto', minWidth: '200px', margin: 0, padding: '10px 15px', background: 'var(--bg-app)' }} 
            value={filterCluster} 
            onChange={e => setFilterCluster(e.target.value)}
          >
            <option value="all">Todas as Regionais</option>
            {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

      </div>

      <div style={{ ...global.gridCards, marginTop: '25px' }}>
        {filteredList.map(att => (
          <div key={att.id} className="animated-card" style={{ ...global.card, padding: '25px', textAlign: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 15, right: 15 }}>
               <span style={{ fontSize: '10px', background: att.role === 'growth_team' ? '#dcfce7' : '#e0f2fe', color: att.role === 'growth_team' ? '#16a34a' : '#0284c7', padding: '4px 12px', borderRadius: '12px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' }}>
                 {att.role === 'growth_team' ? <><Rocket size={10} /> Equipe HUB</> : 'Atendente'}
               </span>
            </div>

            <div style={local.avatarBox}>
              {att.photo ? <img src={att.photo} style={local.avatarImg} /> : <Users size={32} color="var(--text-muted)" />}
            </div>
            <h4 style={{ fontWeight: '900', color: 'var(--text-main)', fontSize: '17px', marginBottom: '4px' }}>{att.name}</h4>
            
            <p style={local.userMeta}>
              {att.role === 'growth_team' ? (
                <><Briefcase size={14} color={colors.primary} /> <strong>{att.sector || 'Global'}</strong></>
              ) : (
                <><MapPin size={14} color={colors.primary} /> <strong>{att.cityId}</strong></>
              )}
            </p>
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => { setEditingUser(att); setForm(buildCollaboratorForm(att)); setIsModalOpen(true); }} style={{ ...global.btnSecondary, flex: 1, fontWeight: '800', borderRadius: '10px' }}>Editar Perfil</button>
              <button onClick={() => handleDelete(att.id)} style={{ ...global.btnDanger, borderRadius: '10px', padding: '0 12px' }}><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
        {filteredList.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Nenhum colaborador encontrado com os filtros atuais.
          </div>
        )}
      </div>

            <Modal
        open={isModalOpen}
        onClose={closeCollaboratorModal}
        title={editingUser ? 'Editar Colaborador' : 'Novo Colaborador'}
        size="lg"
        footer={
          <>
            <button type="button" onClick={closeCollaboratorModal} style={global.btnSecondary}>Cancelar</button>
            <button type="submit" form="collaborator-form" style={global.btnPrimary} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : 'Salvar Colaborador'}
            </button>
          </>
        }
      >
        <div style={local.collabModalHero}>
          <div>
            <div style={local.collabModalEyebrow}>Painel do colaborador</div>
            <div style={local.collabModalLead}>
              {editingUser
                ? `Revise os dados de ${editingUser.name || 'colaborador'} e ajuste vinculos internos sem sair da tela.`
                : 'Cadastre um novo membro da operacao com acesso, vinculo e dados internos organizados.'}
            </div>
          </div>
          <span
            style={{
              ...local.rolePill,
              background: form.role === 'growth_team' ? 'rgba(16,185,129,0.12)' : 'rgba(14,165,233,0.12)',
              color: form.role === 'growth_team' ? '#15803d' : '#0369a1',
            }}
          >
            {roleBadgeLabel}
          </span>
        </div>

        <form id="collaborator-form" onSubmit={handleSubmit} style={local.collabModalForm}>
          <div style={local.collabModalBody}>
            <div style={local.collabModalGrid}>
              <section style={local.collabSectionCard}>
                <div style={local.collabSectionHeader}>
                  <div style={local.collabSectionTitle}>Dados Principais</div>
                  <div style={local.collabSectionHint}>Base do perfil exibido no painel.</div>
                </div>
                <div style={local.collabFieldsGrid}>
                  <div style={local.fieldGroupFull}>
                    <label style={local.label}>Nome Completo</label>
                    <input style={global.input} placeholder="Nome Completo" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
                  </div>
                  <div style={local.fieldGroupFull}>
                    <label style={local.label}>E-mail</label>
                    <input style={global.input} placeholder="E-mail" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} required />
                  </div>
                  {!editingUser && (
                    <div style={local.fieldGroupFull}>
                      <label style={local.label}>Senha Inicial</label>
                      <input style={global.input} type="password" placeholder="Senha padrao 123456" value={form.pass} onChange={e=>setForm({...form, pass:e.target.value})} />
                    </div>
                  )}
                  <div style={local.fieldGroup}>
                    <label style={local.label}>Cargo Atual</label>
                    <input style={global.input} placeholder="Cargo atual" value={form.jobTitle} onChange={e=>setForm({...form, jobTitle:e.target.value})} />
                  </div>
                  <div style={local.fieldGroup}>
                    <label style={local.label}>Equipe</label>
                    <input style={global.input} placeholder="Equipe" value={form.teamName} onChange={e=>setForm({...form, teamName:e.target.value})} />
                  </div>
                </div>
              </section>

              <section style={local.collabSectionCard}>
                <div style={local.collabSectionHeader}>
                  <div style={local.collabSectionTitle}>Acesso e Vinculo</div>
                  <div style={local.collabSectionHint}>Permissao, lotacao e acompanhamento.</div>
                </div>
                <div style={local.collabFieldsGrid}>
                  <div style={local.fieldGroup}>
                    <label style={local.label}>Nivel de Acesso</label>
                    <select style={{ ...global.select, border: form.role === 'growth_team' ? `2px solid ${colors.success}` : '1px solid var(--border)' }} value={form.role} onChange={e=>setForm({...form, role:e.target.value})} required>
                      <option value="attendant">Atendente (Vendas & Leads)</option>
                      <option value="growth_team">Equipe de Growth (Acesso ao HUB)</option>
                    </select>
                  </div>
                  <div style={local.fieldGroup}>
                    <label style={local.label}>Status</label>
                    <select style={global.select} value={form.employmentStatus} onChange={e=>setForm({...form, employmentStatus:e.target.value})}>
                      <option value="ativo">Ativo</option>
                      <option value="afastado">Afastado</option>
                      <option value="ferias">Ferias</option>
                      <option value="desligado">Desligado</option>
                    </select>
                  </div>
                  {form.role === 'attendant' ? (
                    <div style={local.fieldGroupFull}>
                      <label style={local.label}>Cidade / Loja</label>
                      <select style={global.select} value={form.city} onChange={e=>setForm({...form, city:e.target.value})} required>
                        <option value="">Selecione a cidade/loja...</option>
                        {cidades.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div style={local.fieldGroupFull}>
                      <label style={local.label}>Setor de Atuacao</label>
                      <select style={global.select} value={form.sector} onChange={e=>setForm({...form, sector:e.target.value})} required>
                        <option value="">Selecione o setor...</option>
                        {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}
                  <div style={local.fieldGroupFull}>
                    <label style={local.label}>Supervisor Responsavel</label>
                    <input style={global.input} placeholder="UID do supervisor responsavel" value={form.supervisorUid} onChange={e=>setForm({...form, supervisorUid:e.target.value})} />
                  </div>
                </div>
              </section>
            </div>

            <section style={local.collabSectionCardWide}>
              <div style={local.collabSectionHeader}>
                <div style={local.collabSectionTitle}>Dados Internos</div>
                <div style={local.collabSectionHint}>Campos operacionais e de acompanhamento interno.</div>
              </div>
              <div style={local.collabMetaGrid}>
                <div style={local.fieldGroup}>
                  <label style={local.label}>Matricula / ID Interno</label>
                  <input style={global.input} placeholder="Matricula / ID interno" value={form.employeeCode} onChange={e=>setForm({...form, employeeCode:e.target.value})} />
                </div>
                <div style={local.fieldGroup}>
                  <label style={local.label}>Documento Interno / CPF</label>
                  <input style={global.input} placeholder="Documento interno / CPF" value={form.documentId} onChange={e=>setForm({...form, documentId:e.target.value})} />
                </div>
                <div style={local.fieldGroup}>
                  <label style={local.label}>Data de Admissao</label>
                  <input style={global.input} type="date" value={form.hireDate} onChange={e=>setForm({...form, hireDate:e.target.value})} />
                </div>
                <div style={local.fieldGroup}>
                  <label style={local.label}>Escala / Horario</label>
                  <input style={global.input} placeholder="Escala / horario" value={form.scheduleLabel} onChange={e=>setForm({...form, scheduleLabel:e.target.value})} />
                </div>
              </div>
            </section>

            <section style={local.collabSectionCardWide}>
              <div style={local.collabSectionHeader}>
                <div style={local.collabSectionTitle}>Observacoes</div>
                <div style={local.collabSectionHint}>Notas gerais para contexto da lideranca.</div>
              </div>
              <div style={local.fieldGroupFull}>
                <label style={local.label}>Anotacoes</label>
                <textarea style={{ ...global.input, minHeight: '110px', resize: 'vertical' }} placeholder="Observacoes gerais" value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} />
              </div>
            </section>
          </div>
        </form>
      </Modal></div>
  );
};

// --- ESTILOS LOCAIS PADRONIZADOS ---
const local = {
  headerWrapper: {
    background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-panel) 100%)',
    border: '1px solid var(--border)',
    borderRadius: '24px',
    padding: '24px 32px',
    marginBottom: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px',
    boxShadow: 'var(--shadow-sm)',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  iconBox: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.02em' },
  headerSubtitle: { fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '500' },
  leadersLayout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 350px)',
    gap: '30px',
    marginTop: '20px',
  },
  cardTitle: { fontWeight: '900', color: 'var(--text-main)', fontSize: '16px', margin: 0 },
  leaderBadge: {
    fontSize: '10px',
    background: '#f3e8ff',
    color: '#9333ea',
    padding: '3px 10px',
    borderRadius: '10px',
    fontWeight: '900',
    textTransform: 'uppercase',
    marginTop: '5px',
    display: 'inline-block',
  },
  leaderIconBox: { background: 'var(--bg-panel)', padding: '8px', borderRadius: '10px' },
  cardInfo: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' },
  inlineEditorHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  cancelTextButton: {
    background: 'var(--bg-app)',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold',
    color: 'var(--text-muted)',
  },
  avatarBox: { width: 70, height: 70, borderRadius: '20px', background: 'var(--bg-app)', border: '1px solid var(--border)', margin: '0 auto 15px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  userMeta: { fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  label: { fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px', display: 'block', letterSpacing: '0.04em' },
  btnEditCard: { position: 'absolute', top: '15px', right: '15px', background: 'var(--bg-app)', border: '1px solid var(--border)', padding: '6px', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' },
  filtersBar: {
    ...global.toolbar,
    marginTop: '25px',
    background: 'var(--bg-card)',
    padding: '15px 25px',
    borderRadius: '18px',
    border: '1px solid var(--border)',
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  filtersGroup: { display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' },
  collabModalHero: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '18px 20px',
    marginBottom: '18px',
    borderRadius: '18px',
    background: 'linear-gradient(135deg, rgba(37,99,235,0.1), rgba(6,182,212,0.08))',
    border: '1px solid rgba(37,99,235,0.12)',
    flexWrap: 'wrap',
  },
  collabModalEyebrow: { fontSize: '11px', fontWeight: '900', color: colors.primary, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' },
  collabModalLead: { fontSize: '14px', lineHeight: 1.6, color: 'var(--text-main)', maxWidth: '560px' },
  rolePill: { padding: '8px 14px', borderRadius: '999px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' },
  collabModalForm: { display: 'flex', flexDirection: 'column' },
  collabModalBody: { maxHeight: '72vh', overflowY: 'auto', paddingRight: '6px', display: 'flex', flexDirection: 'column', gap: '18px' },
  collabModalGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', alignItems: 'start' },
  collabSectionCard: { background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))', border: '1px solid var(--border)', borderRadius: '18px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' },
  collabSectionCardWide: { background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))', border: '1px solid var(--border)', borderRadius: '18px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' },
  collabSectionHeader: { display: 'flex', flexDirection: 'column', gap: '4px' },
  collabSectionTitle: { fontSize: '12px', fontWeight: '900', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.08em' },
  collabSectionHint: { fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 },
  collabFieldsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' },
  collabMetaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' },
  fieldGroup: { minWidth: 0 },
  fieldGroupFull: { minWidth: 0, gridColumn: '1 / -1' },
};

export default { GestaoSupervisores, GestaoAtendentes };


