import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { UserX, Briefcase, LayoutGrid, AlertTriangle, CalendarDays } from 'lucide-react';

// IMPORTAÇÃO DOS ESTILOS GLOBAIS
import { styles as global, colors } from '../../styles/globalStyles';

// IMPORTAÇÃO DAS VIEWS (ABAS)
import GestaoView from './GestaoView';
import EscalaView from './EscalaView';
import FormFaltaView from './FormFaltaView';
import FormFeriasView from './FormFeriasView';

export default function FaltasSupervisor({ userData }) {
  const [activeTab, setActiveTab] = useState('gestao');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState(null);
  
  // --- DADOS DO FIREBASE ---
  const [stores, setStores] = useState([]);
  const [attendants, setAttendants] = useState([]); 
  const [floaters, setFloaters] = useState([]);
  const [absencesList, setAbsencesList] = useState([]);
  const [holidaysList, setHolidaysList] = useState([]); 

  // --- ESTADOS DOS FORMULÁRIOS ---
  const [faltaForm, setFaltaForm] = useState({
    storeId: '', attendantId: '', startDate: '', endDate: '',
    isFullDay: true, startTime: '', endTime: '', reason: '', obs: '', coverageMap: {} 
  });

  const [feriasForm, setFeriasForm] = useState({
    storeId: '', attendantId: '', startDate: '', endDate: '',
    coverageMap: {}, obs: ''
  });

  // --- VERIFICAÇÃO DE PERMISSÃO GLOBAL ---
  const isGlobal = ['coordinator', 'coordenador', 'master', 'growth_team'].includes(userData?.role);

  // --- FUNÇÕES DE CARREGAMENTO (FETCH) ---
  const fetchAbsences = async () => {
    try {
      let qAbs = query(collection(db, "absences"));
      
      // Se não for acesso global, filtra apenas as ausências do cluster do Supervisor
      if (!isGlobal && userData?.clusterId) {
        qAbs = query(collection(db, "absences"), where("clusterId", "==", userData.clusterId));
      }

      const snap = await getDocs(qAbs);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
      setAbsencesList(list);
    } catch (err) { console.error("Erro ao buscar faltas:", err); }
  };

  const fetchHolidays = async () => {
    try {
      const q = query(collection(db, "holidays"));
      const snap = await getDocs(q);
      setHolidaysList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error("Erro ao buscar feriados:", err); }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!userData) return;
      if (!isGlobal && !userData.clusterId) return; // Trava segurança se não tiver cargo válido

      try {
        // Busca Lojas (Global ou Regional)
        let qStore;
        if (isGlobal) {
          qStore = query(collection(db, "cities"));
        } else {
          qStore = query(collection(db, "cities"), where("clusterId", "==", userData.clusterId));
        }
        
        const snapStore = await getDocs(qStore);
        setStores(snapStore.docs.map(d => ({ id: d.id, ...d.data() })));

        // Busca Volantes/Atendentes globais
        const qUsers = query(collection(db, "users"), where("role", "==", "attendant"));
        const snapUsers = await getDocs(qUsers);
        setFloaters(snapUsers.docs.map(d => ({ id: d.id, ...d.data() })));

        fetchAbsences();
        fetchHolidays();
      } catch (error) {
        console.error("Erro crítico ao carregar a estrutura:", error);
      }
    };
    fetchData();
  }, [userData]);

  const fetchAttendantsByStore = async (storeId) => {
    const q = query(collection(db, "users"), where("cityId", "==", storeId), where("role", "==", "attendant"));
    const snap = await getDocs(q);
    setAttendants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  // --- HANDLERS (AÇÕES) ---
  const handleStoreChange = (e, type) => {
    const storeId = e.target.value;
    if (type === 'falta') setFaltaForm({ ...faltaForm, storeId, attendantId: '' });
    else setFeriasForm({ ...feriasForm, storeId, attendantId: '' });
    
    if (storeId) fetchAttendantsByStore(storeId);
    else setAttendants([]);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setFileName(file.name);
  };

  const deleteAbsence = async (id) => {
    if(!window.confirm("Pretende excluir este registo permanentemente?")) return;
    try { await deleteDoc(doc(db, "absences", id)); fetchAbsences(); } catch (err) { alert(err.message); }
  };

  const updateCoverageQuickly = async (absenceId, date, floaterId, currentMap) => {
    try {
      const newMap = { ...currentMap, [date]: floaterId };
      await updateDoc(doc(db, "absences", absenceId), { coverageMap: newMap });
      fetchAbsences(); 
    } catch (e) { alert("Erro ao atualizar a cobertura: " + e.message); }
  };

  const saveFalta = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const clusterDaLoja = stores.find(s => s.id === faltaForm.storeId)?.clusterId || userData.clusterId || 'global';
      await addDoc(collection(db, "absences"), {
        type: 'falta', ...faltaForm,
        createdBy: userData.name, createdAt: serverTimestamp(),
        clusterId: clusterDaLoja, status: 'Pendente'
      });
      alert("Falta registada com sucesso!");
      setFaltaForm({ storeId: '', attendantId: '', startDate: '', endDate: '', isFullDay: true, startTime: '', endTime: '', reason: '', obs: '', coverageMap: {} });
      setFileName(null);
      fetchAbsences();
      setActiveTab('gestao'); 
    } catch (err) { alert("Erro: " + err.message); }
    setLoading(false);
  };

  const saveFerias = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const clusterDaLoja = stores.find(s => s.id === feriasForm.storeId)?.clusterId || userData.clusterId || 'global';
      await addDoc(collection(db, "absences"), {
        type: 'ferias', ...feriasForm,
        createdBy: userData.name, createdAt: serverTimestamp(),
        clusterId: clusterDaLoja, status: 'Programada'
      });
      alert("Férias agendadas com sucesso!");
      setFeriasForm({ storeId: '', attendantId: '', startDate: '', endDate: '', coverageMap: {}, obs: '' });
      fetchAbsences();
      setActiveTab('gestao');
    } catch (err) { alert("Erro: " + err.message); }
    setLoading(false);
  };

  return (
    <div style={{...global.container, maxWidth: '1200px'}}>
      
      {/* ── CABEÇALHO PADRÃO OQUEI STRATEGY ── */}
      <div style={local.headerWrapper}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ ...local.iconBox, background: `linear-gradient(135deg, ${colors.danger}, #ea580c)`, boxShadow: `0 8px 20px ${colors.danger}40` }}>
            <UserX size={28} color="#fff" />
          </div>
          <div>
            <div style={local.headerTitle}>Gestão de Ausências</div>
            <div style={local.headerSubtitle}>
              Faltas, Atestados e Calendário de Escala · {new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>
      </div>

      {/* ── NAVEGAÇÃO POR ABAS (PILLS) ── */}
      <div style={local.navBar}>
        <button onClick={() => setActiveTab('gestao')} style={activeTab === 'gestao' ? { ...local.navBtnActive, color: colors.primary, borderColor: colors.primary } : local.navBtn}>
          <Briefcase size={16} /> Gestão de Cobertura
        </button>
        <button onClick={() => setActiveTab('escala')} style={activeTab === 'escala' ? { ...local.navBtnActive, color: '#9333ea', borderColor: '#9333ea' } : local.navBtn}>
          <LayoutGrid size={16} /> Calendário de Escala
        </button>
        <button onClick={() => setActiveTab('faltas')} style={activeTab === 'faltas' ? { ...local.navBtnActive, color: colors.danger, borderColor: colors.danger } : local.navBtn}>
          <AlertTriangle size={16} /> Nova Falta / Atestado
        </button>
        <button onClick={() => setActiveTab('ferias')} style={activeTab === 'ferias' ? { ...local.navBtnActive, color: colors.success, borderColor: colors.success } : local.navBtn}>
          <CalendarDays size={16} /> Agendar Férias
        </button>
      </div>

      {/* ── RENDERIZAÇÃO CONDICIONAL DAS VIEWS ── */}
      <div style={{marginTop: '30px', paddingBottom: '40px'}}>
        
        {activeTab === 'gestao' && (
          <GestaoView 
            absencesList={absencesList} stores={stores} attendants={attendants} 
            floaters={floaters} deleteAbsence={deleteAbsence} updateCoverageQuickly={updateCoverageQuickly} 
          />
        )}
        
        {activeTab === 'escala' && (
          <EscalaView 
            stores={stores} absencesList={absencesList} holidaysList={holidaysList} 
            fetchHolidays={fetchHolidays} floaters={floaters}
          />
        )}

        {activeTab === 'faltas' && (
          <FormFaltaView 
            faltaForm={faltaForm} setFaltaForm={setFaltaForm} stores={stores} 
            attendants={attendants} floaters={floaters} handleStoreChange={handleStoreChange} 
            saveFalta={saveFalta} loading={loading} fileName={fileName} handleFileChange={handleFileChange} 
          />
        )}

        {activeTab === 'ferias' && (
          <FormFeriasView 
            feriasForm={feriasForm} setFeriasForm={setFeriasForm} stores={stores} 
            attendants={attendants} floaters={floaters} handleStoreChange={handleStoreChange} 
            saveFerias={saveFerias} loading={loading}
          />
        )}

      </div>
    </div>
  );
}

// ESTILOS DO CABEÇALHO E NAVEGAÇÃO
const local = {
  headerWrapper: {
    background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-panel) 100%)',
    border: '1px solid var(--border)', borderRadius: '24px',
    padding: '24px 32px', marginBottom: '25px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: '20px', boxShadow: 'var(--shadow-sm)',
  },
  iconBox: { width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.02em' },
  headerSubtitle: { fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '500' },
  navBar: { display: 'flex', gap: '8px', background: 'var(--bg-card)', padding: '8px', borderRadius: '18px', border: '1px solid var(--border)', overflowX: 'auto', whiteSpace: 'nowrap' },
  navBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: '1px solid transparent', cursor: 'pointer', fontSize: '13px', fontWeight: '800', transition: '0.2s', background: 'transparent', color: 'var(--text-muted)' },
  navBtnActive: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '13px', fontWeight: '900', transition: '0.2s', background: 'var(--bg-panel)', boxShadow: 'var(--shadow-sm)' },
};