import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, addDoc } from 'firebase/firestore';
import { jsPDF } from "jspdf";
import { 
  FileCheck, Clock, Calendar, Search, User, MapPin, AlignLeft, 
  CheckCircle2, XCircle, AlertCircle, ShieldAlert, Send, 
  FileText, Users, AlertTriangle, UserMinus, TrendingUp, 
  Briefcase, Paperclip, History, Mail, Shield, CheckCircle, X
} from 'lucide-react';

import { styles as global, colors } from '../styles/globalStyles';

export default function RhSupervisor({ userData, onRHAutomation }) {
  const [activeTab, setActiveTab] = useState('nova'); // 'nova', 'aprovacoes', 'historico'
  const [loading, setLoading] = useState(false);
  const isCoordinator = ['coordinator', 'coordenador', 'coordenadora', 'master', 'diretor', 'growth_team'].includes(userData?.role);

  // --- ESTADOS: NOVA SOLICITAÇÃO ---
  const [requestType, setRequestType] = useState('advertencia'); 
  const [targetType, setTargetType] = useState('atendente');
  const [fileName, setFileName] = useState(null);
  const [form, setForm] = useState({
    targetId: '', storeId: '', reason: '', description: '', 
    dateEvent: new Date().toISOString().split('T')[0], 
    noticeType: 'trabalhado', newRole: '', newSalary: '', 
    atestadoDays: '', cid: '', file: null 
  });

  // --- ESTADOS: CENTRAL DE APROVAÇÕES ---
  const [approvalList, setApprovalList] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Pendente');
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [actionModal, setActionModal] = useState({ isOpen: false, type: '', request: null, reason: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  // --- ESTADOS: HISTÓRICO ---
  const [historyList, setHistoryList] = useState([]);

  // --- DADOS GERAIS ---
  const [stores, setStores] = useState([]);
  const [attendants, setAttendants] = useState([]); 
  const [supervisors, setSupervisors] = useState([]);
  const [selectedCluster, setSelectedCluster] = useState('all');

  const storeClusterMap = stores.reduce((acc, store) => ({ ...acc, [store.id]: store.clusterId }), {});
  const clusterOptions = [...new Set(stores.map((store) => store.clusterId).filter(Boolean))].sort();
  const visibleStores = isCoordinator && selectedCluster !== 'all'
    ? stores.filter((store) => store.clusterId === selectedCluster)
    : stores;

  const REQUEST_TYPES = {
    advertencia: { label: 'Advertência', icon: AlertTriangle, color: colors.warning, bg: '#f59e0b15', desc: 'Faltas leves ou reincidência.' },
    suspensao: { label: 'Suspensão', icon: AlertCircle, color: colors.danger, bg: '#ea580c15', desc: 'Faltas graves.' },
    desligamento: { label: 'Desligamento', icon: UserMinus, color: colors.danger, bg: '#ef444415', desc: 'Rescisão contratual.' },
    promocao: { label: 'Promoção', icon: TrendingUp, color: colors.primary, bg: '#3b82f615', desc: 'Mérito ou cargo.' },
    atestado: { label: 'Atestado Médico', icon: FileCheck, color: colors.rose, bg: '#db277715', desc: 'Envio de atestado (48h).' },
  };

  const currentType = REQUEST_TYPES[requestType];

  // ==========================================
  // CARREGAMENTO DE DADOS
  // ==========================================
  useEffect(() => {
    const fetchBaseData = async () => {
      setLoading(true);
      try {
        let st = [];
        let qStore;

        if (isCoordinator) {
          qStore = query(collection(db, "cities"));
        } else if (userData?.clusterId) {
          qStore = query(collection(db, "cities"), where("clusterId", "==", userData.clusterId));
        }

        if (qStore) {
          const snapStore = await getDocs(qStore);
          st = snapStore.docs.map(d => ({ id: d.id, ...d.data() }));
          setStores(st);
        }

        if (isCoordinator) {
          const qSup = query(collection(db, "users"), where("role", "==", "supervisor"));
          const snapSup = await getDocs(qSup);
          setSupervisors(snapSup.docs.map(d => ({ id: d.id, ...d.data() })));
        }

        fetchHistory();
        fetchApprovals(st);

      } catch (err) { console.error("Erro ao carregar dados base:", err); }
      setLoading(false);
    };

    fetchBaseData();
  }, [userData, activeTab]);

  const fetchHistory = async () => {
    try {
      let q = isCoordinator 
        ? query(collection(db, "rh_requests"))
        : query(collection(db, "rh_requests"), where("supervisorId", "==", auth.currentUser.uid));
      
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setHistoryList(list);
    } catch (err) { console.error(err); }
  };

  const fetchApprovals = async (baseStores = stores) => {
    try {
      const storeIds = baseStores.map((store) => store.id);
      const isRegionalWithStores = !isCoordinator && storeIds.length > 0;

      const qAbsences = isCoordinator
        ? query(collection(db, "absences"), where("status", "==", "Pendente"))
        : isRegionalWithStores
          ? query(collection(db, "absences"), where("status", "==", "Pendente"), where("storeId", "in", storeIds.slice(0, 10)))
          : query(collection(db, "absences"), where("status", "==", "Pendente"), where("supervisorId", "==", auth.currentUser.uid));
      const snapAbsences = await getDocs(qAbsences);

      const qRh = isCoordinator
        ? query(collection(db, "rh_requests"), where("status", "==", "Pendente"))
        : isRegionalWithStores
          ? query(collection(db, "rh_requests"), where("status", "==", "Pendente"), where("storeId", "in", storeIds.slice(0, 10)))
          : query(collection(db, "rh_requests"), where("status", "==", "Pendente"), where("supervisorId", "==", auth.currentUser.uid));
      const snapRh = await getDocs(qRh);

      let combined = [];
      
      snapAbsences.docs.forEach(d => {
         const data = d.data();
         if (isCoordinator || storeIds.includes(data.storeId)) {
             combined.push({ id: d.id, _collection: 'absences', ...data });
         }
      });

      snapRh.docs.forEach(d => {
         const data = d.data();
         if (isCoordinator || storeIds.includes(data.storeId)) {
             combined.push({ id: d.id, _collection: 'rh_requests', ...data });
         }
      });

      combined.sort((a,b) => new Date(b.createdAt?.toDate() || 0) - new Date(a.createdAt?.toDate() || 0));
      setApprovalList(combined);
    } catch (error) { console.error("Erro ao buscar aprovações:", error); }
  };

  const fetchAttendantsByStore = async (storeId) => {
    const q = query(collection(db, "users"), where("cityId", "==", storeId), where("role", "==", "attendant"));
    const snap = await getDocs(q);
    setAttendants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleStoreChange = (e) => {
    const storeId = e.target.value;
    setForm({ ...form, storeId, targetId: '' });
    if (storeId) fetchAttendantsByStore(storeId);
    else setAttendants([]);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setFileName(file.name);
  };

  // ==========================================
  // LÓGICA: NOVA SOLICITAÇÃO (CRIAR E GERAR PDF)
  // ==========================================
  const generatePDF = (requestData) => {
    const doc = new jsPDF();
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("OQUEI TELECOM - SOLICITACAO RH", 105, 13, null, null, "center");

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    
    let y = 40;
    const lineHeight = 10;

    doc.text(`Data: ${new Date().toLocaleDateString()}`, 20, y); y += lineHeight;
    doc.text(`Solicitante: ${userData.name} (${isCoordinator ? 'Coordenacao' : 'Supervisor'})`, 20, y); y += lineHeight;
    doc.text(`Tipo: ${REQUEST_TYPES[requestData.type].label.toUpperCase()}`, 20, y); y += lineHeight * 1.5;

    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO ALVO:", 20, y);
    doc.setFont("helvetica", "normal"); y += lineHeight;
    doc.text(`Nome: ${requestData.targetName}`, 20, y); y += lineHeight;
    doc.text(`Cargo/Funcao: ${requestData.targetRole === 'supervisor' ? 'Supervisor' : 'Atendente'}`, 20, y); y += lineHeight;
    doc.text(`Unidade/Setor: ${requestData.storeName}`, 20, y); y += lineHeight * 1.5;

    doc.setFont("helvetica", "bold");
    doc.text("DETALHES:", 20, y);
    doc.setFont("helvetica", "normal"); y += lineHeight;

    if (requestData.type === 'atestado') {
      doc.text(`Inicio: ${new Date(requestData.dateEvent).toLocaleDateString()}`, 20, y); y += lineHeight;
      doc.text(`Duracao: ${requestData.atestadoDays} dias`, 20, y);
    } else {
      doc.text(`Motivo: ${requestData.reason}`, 20, y); y += lineHeight;
      doc.text(`Data do Fato: ${new Date(requestData.dateEvent).toLocaleDateString()}`, 20, y);
    }

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("DESCRICAO:", 20, y); y += 7;
    doc.setFont("helvetica", "normal");
    const splitText = doc.splitTextToSize(requestData.description, 170);
    doc.text(splitText, 20, y);

    if (fileName) {
      y += (splitText.length * 10) + 20;
      doc.setFont("helvetica", "italic");
      doc.text(`* Arquivo anexo: ${fileName}`, 20, y);
    }

    doc.save(`Solicitacao_RH_${requestData.targetName}.pdf`);
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!form.targetId && targetType === 'supervisor') return alert("Selecione um supervisor.");
    if ((!form.storeId || !form.targetId) && targetType === 'atendente') return alert("Selecione loja e atendente.");
    if (!form.description) return alert("Preencha a descrição.");

    setLoading(true);
    try {
      let targetName, storeName, storeIdFinal;

      if (targetType === 'supervisor') {
        const sup = supervisors.find(s => s.id === form.targetId);
        targetName = sup.name;
        storeName = `Regional ${sup.clusterId}`;
        storeIdFinal = 'regional';
      } else {
        targetName = attendants.find(a => a.id === form.targetId)?.name;
        const st = stores.find(s => s.id === form.storeId);
        storeName = st?.name;
        storeIdFinal = st?.id;
      }

      const clusterId = targetType === 'supervisor'
        ? supervisors.find((sup) => sup.id === form.targetId)?.clusterId || userData?.clusterId || null
        : stores.find((store) => store.id === form.storeId)?.clusterId || userData?.clusterId || null;

      const requestData = {
        type: requestType,
        ...form,
        storeId: storeIdFinal,
        storeName,
        targetName,
        targetId: form.targetId,
        targetRole: targetType,
        supervisorId: auth.currentUser.uid,
        supervisorName: userData.name,
        fileName: fileName || '',
        clusterId,
        status: 'Pendente',
        createdAt: serverTimestamp()
      };

      if (targetType === 'atendente') {
        requestData.attendantName = targetName;
        requestData.attendantId = form.targetId;
      }

      await addDoc(collection(db, "rh_requests"), requestData);
      generatePDF(requestData);

      alert("Solicitação enviada com sucesso e PDF gerado!");
      setForm({ ...form, description: '', reason: '', newRole: '', newSalary: '', atestadoDays: '', cid: '', targetId: '' });
      setFileName(null);
      fetchHistory();
      setActiveTab('historico');
    } catch (err) { alert("Erro ao enviar: " + err.message); }
    setLoading(false);
  };

  // ==========================================
  // LÓGICA: CENTRAL DE APROVAÇÕES
  // ==========================================
  const handleActionClick = (request, type) => {
    setActionModal({ isOpen: true, type, request, reason: '' });
  };

  const confirmAction = async () => {
    const { type, request, reason } = actionModal;
    if (type === 'rejeitar' && !reason.trim()) {
      return alert("Por favor, justifique a rejeição da solicitação.");
    }

    setIsProcessing(true);
    try {
      const newStatus = type === 'aprovar' ? 'Aprovado' : 'Rejeitado';
      const docRef = doc(db, request._collection || "rh_requests", request.id);
      
      await updateDoc(docRef, {
        status: newStatus,
        supervisorReason: reason,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser.uid,
        updatedByName: userData?.name || 'Gestor'
      });

      if (onRHAutomation) {
        onRHAutomation(`Solicitação de RH - ${newStatus}`, {
          employeeName: request.targetName || request.attendantName || 'Colaborador',
          storeName: request.storeName || request.storeId,
          date: request.dateEvent || request.startDate || 'Não especificada',
          reason: `Tipo: ${request.type?.toUpperCase()} | Decisão: ${newStatus} | Obs: ${reason || 'Aprovado sem ressalvas.'}`
        });
      }

      setApprovalList(prev => prev.map(r => r.id === request.id ? { ...r, status: newStatus, supervisorReason: reason } : r));
      setActionModal({ isOpen: false, type: '', request: null, reason: '' });
      setSelectedApproval(null);
      
    } catch (error) {
      alert("Erro ao salvar decisão. Tente novamente.");
    }
    setIsProcessing(false);
  };

  const matchesCluster = (request) => {
    if (!isCoordinator || selectedCluster === 'all') return true;
    const requestCluster = request.clusterId || storeClusterMap[request.storeId];
    return requestCluster === selectedCluster;
  };

  const filteredApprovals = approvalList.filter(req => {
    const matchStatus = filterStatus === 'Todos' || req.status === filterStatus;
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = 
      (req.targetName || req.attendantName || '').toLowerCase().includes(searchLower) ||
      (req.storeName || req.storeId || '').toLowerCase().includes(searchLower) ||
      (req.type || '').toLowerCase().includes(searchLower);
    
    return matchesCluster(req) && matchStatus && matchSearch;
  });

  const filteredHistoryList = historyList.filter(matchesCluster);

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Aprovado': return <span style={local.badgeSuccess}><CheckCircle2 size={12}/> Aprovado</span>;
      case 'Rejeitado': return <span style={local.badgeError}><XCircle size={12}/> Rejeitado</span>;
      default: return <span style={local.badgeWarning}><Clock size={12}/> Pendente</span>;
    }
  };

  const getTypeBadge = (type) => {
    let color = colors.primary; let bg = '#3b82f615'; let label = type;
    switch(type) {
      case 'ferias': label = 'Férias'; color = colors.success; bg = '#10b98115'; break;
      case 'desligamento': label = 'Desligamento'; color = colors.danger; bg = '#ef444415'; break;
      case 'adiantamento': label = 'Adiantamento'; color = colors.warning; bg = '#f59e0b15'; break;
      case 'advertencia': label = 'Advertência'; color = colors.warning; bg = '#f59e0b15'; break;
      case 'suspensao': label = 'Suspensão'; color = colors.danger; bg = '#ea580c15'; break;
      case 'promocao': label = 'Promoção'; color = colors.primary; bg = '#3b82f615'; break;
      case 'atestado': label = 'Atestado'; color = colors.rose; bg = '#db277715'; break;
      default: label = type;
    }
    return <span style={{ background: bg, color: color, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', border: `1px solid ${color}30` }}>{label}</span>;
  };

  return (
    <div style={{ ...global.container, maxWidth: '1200px' }}>
      {/* ... restante do arquivo exatamente como já está no seu projeto atualizado ... */}
    </div>
  );
}

// --- ESTILOS LOCAIS PADRONIZADOS ---
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
  label: { fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block' },
  radioLabel: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '800', color: 'var(--text-main)', fontSize: '14px' },
  rhNoticeBox: { background: 'var(--bg-primary-light)', border: '1px solid var(--border)', borderRadius: '16px', padding: '25px', marginBottom: '35px' },
  typeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px', marginBottom: '10px' },
  typeCard: { padding: '20px 10px', borderRadius: '16px', border: '2px solid', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: '0.2s', textAlign: 'center' },
  filterBtn: { padding: '10px 18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-muted)', fontSize: '13px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap' },
  filterBtnActive: { padding: '10px 18px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-panel)', color: 'var(--text-brand)', fontSize: '13px', fontWeight: '900', cursor: 'pointer', boxShadow: 'var(--shadow-sm)', whiteSpace: 'nowrap' },
  requestCard: { background: 'var(--bg-card)', padding: '25px', borderRadius: '20px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border)' },
  detailsPanel: { background: 'var(--bg-card)', padding: '30px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', position: 'sticky', top: '30px', alignSelf: 'start' },
  observationBox: { background: 'var(--bg-app)', border: '1px solid var(--border)', padding: '20px', borderRadius: '16px', fontSize: '14px', color: 'var(--text-main)', lineHeight: '1.6', whiteSpace: 'pre-wrap' },
  badgeSuccess: { display: 'flex', alignItems: 'center', gap: '4px', background: '#10b98115', color: colors.success, padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', border: '1px solid #10b98130' },
  badgeError: { display: 'flex', alignItems: 'center', gap: '4px', background: '#ef444415', color: colors.danger, padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', border: '1px solid #ef444430' },
  badgeWarning: { display: 'flex', alignItems: 'center', gap: '4px', background: '#f59e0b15', color: colors.warning, padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', border: '1px solid #f59e0b30' },
  th: { padding: '20px', textAlign: 'left', fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  td: { padding: '20px', fontSize: '15px', color: 'var(--text-main)', verticalAlign: 'middle' },
  emptyState: { padding: '80px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px', fontWeight: 'bold' }
};