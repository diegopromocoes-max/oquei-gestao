import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, addDoc, orderBy } from 'firebase/firestore';
import { jsPDF } from "jspdf";
import { 
  FileCheck, Clock, Calendar, Search, User, MapPin, AlignLeft, 
  CheckCircle2, XCircle, AlertCircle, ShieldAlert, Send, 
  FileText, Users, AlertTriangle, UserMinus, TrendingUp, 
  Briefcase, Paperclip, History, Mail, Shield, CheckCircle
} from 'lucide-react';

export default function RhSupervisor({ userData, onRHAutomation }) {
  const [activeTab, setActiveTab] = useState('nova'); // 'nova', 'aprovacoes', 'historico'
  const [loading, setLoading] = useState(false);
  const isCoordinator = userData?.role === 'coordinator';

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

  const REQUEST_TYPES = {
    advertencia: { label: 'Advertência', icon: AlertTriangle, color: '#f59e0b', bg: '#fffbeb', desc: 'Faltas leves ou reincidência.' },
    suspensao: { label: 'Suspensão', icon: AlertCircle, color: '#ea580c', bg: '#fff7ed', desc: 'Faltas graves.' },
    desligamento: { label: 'Desligamento', icon: UserMinus, color: '#dc2626', bg: '#fef2f2', desc: 'Rescisão contratual.' },
    promocao: { label: 'Promoção', icon: TrendingUp, color: '#2563eb', bg: '#eff6ff', desc: 'Mérito ou cargo.' },
    atestado: { label: 'Atestado Médico', icon: FileCheck, color: '#db2777', bg: '#fdf2f8', desc: 'Envio de atestado (48h).' },
  };

  const currentType = REQUEST_TYPES[requestType];

  // ==========================================
  // CARREGAMENTO DE DADOS
  // ==========================================
  useEffect(() => {
    const fetchBaseData = async () => {
      setLoading(true);
      try {
        let storeIds = [];
        let qStore;

        if (isCoordinator) {
          qStore = query(collection(db, "cities"));
        } else if (userData?.clusterId) {
          qStore = query(collection(db, "cities"), where("clusterId", "==", userData.clusterId));
        }

        if (qStore) {
          const snapStore = await getDocs(qStore);
          const st = snapStore.docs.map(d => ({ id: d.id, ...d.data() }));
          setStores(st);
          storeIds = st.map(s => s.id);
        }

        if (isCoordinator) {
          const qSup = query(collection(db, "users"), where("role", "==", "supervisor"));
          const snapSup = await getDocs(qSup);
          setSupervisors(snapSup.docs.map(d => ({ id: d.id, ...d.data() })));
        }

        fetchHistory();
        if (storeIds.length > 0) {
           fetchApprovals(storeIds);
        }

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

  const fetchApprovals = async (storeIds) => {
    try {
      const qAbsences = query(collection(db, "absences"));
      const snapAbsences = await getDocs(qAbsences);
      
      const qRh = query(collection(db, "rh_requests"));
      const snapRh = await getDocs(qRh);

      let combined = [];
      
      snapAbsences.docs.forEach(d => {
         const data = d.data();
         // Inclui férias e outras solicitações do absences
         if (data.type !== 'falta' && data.type !== 'atestado' && storeIds.includes(data.storeId)) {
             combined.push({ id: d.id, _collection: 'absences', ...data });
         }
      });

      snapRh.docs.forEach(d => {
         const data = d.data();
         if (storeIds.includes(data.storeId)) {
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
    doc.text("OQUEI TELECOM - SOLICITAÇÃO RH", 105, 13, null, null, "center");

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    
    let y = 40;
    const lineHeight = 10;

    doc.text(`Data: ${new Date().toLocaleDateString()}`, 20, y); y += lineHeight;
    doc.text(`Solicitante: ${userData.name} (${isCoordinator ? 'Coordenação' : 'Supervisor'})`, 20, y); y += lineHeight;
    doc.text(`Tipo: ${REQUEST_TYPES[requestData.type].label.toUpperCase()}`, 20, y); y += lineHeight * 1.5;

    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO ALVO:", 20, y);
    doc.setFont("helvetica", "normal"); y += lineHeight;
    doc.text(`Nome: ${requestData.targetName}`, 20, y); y += lineHeight;
    doc.text(`Cargo/Função: ${requestData.targetRole === 'supervisor' ? 'Supervisor' : 'Atendente'}`, 20, y); y += lineHeight;
    doc.text(`Unidade/Setor: ${requestData.storeName}`, 20, y); y += lineHeight * 1.5;

    doc.setFont("helvetica", "bold");
    doc.text("DETALHES:", 20, y);
    doc.setFont("helvetica", "normal"); y += lineHeight;

    if (requestData.type === 'atestado') {
      doc.text(`Início: ${new Date(requestData.dateEvent).toLocaleDateString()}`, 20, y); y += lineHeight;
      doc.text(`Duração: ${requestData.atestadoDays} dias`, 20, y);
    } else {
      doc.text(`Motivo: ${requestData.reason}`, 20, y); y += lineHeight;
      doc.text(`Data do Fato: ${new Date(requestData.dateEvent).toLocaleDateString()}`, 20, y);
    }

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("DESCRIÇÃO:", 20, y); y += 7;
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
        status: 'Pendente',
        createdAt: serverTimestamp()
      };

      if (targetType === 'atendente') {
        requestData.attendantName = targetName;
        requestData.attendantId = form.targetId;
      }

      await addDoc(collection(db, "rh_requests"), requestData);
      generatePDF(requestData);

      alert("✅ Solicitação enviada com sucesso!");
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

      // Gatilho de Automação de E-mail
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

  const filteredApprovals = approvalList.filter(req => {
    const matchStatus = filterStatus === 'Todos' || req.status === filterStatus;
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = 
      (req.targetName || req.attendantName || '').toLowerCase().includes(searchLower) ||
      (req.storeName || req.storeId || '').toLowerCase().includes(searchLower) ||
      (req.type || '').toLowerCase().includes(searchLower);
    
    return matchStatus && matchSearch;
  });

  // Auxiliares Visuais
  const getStatusBadge = (status) => {
    switch(status) {
      case 'Aprovado': return <span style={styles.badgeSuccess}><CheckCircle2 size={12}/> Aprovado</span>;
      case 'Rejeitado': return <span style={styles.badgeError}><XCircle size={12}/> Rejeitado</span>;
      default: return <span style={styles.badgeWarning}><Clock size={12}/> Pendente</span>;
    }
  };

  const getTypeBadge = (type) => {
    let color = '#3b82f6'; let bg = '#eff6ff'; let label = type;
    switch(type) {
      case 'ferias': label = 'Férias'; color = '#059669'; bg = '#ecfdf5'; break;
      case 'desligamento': label = 'Desligamento'; color = '#dc2626'; bg = '#fef2f2'; break;
      case 'adiantamento': label = 'Adiantamento'; color = '#d97706'; bg = '#fffbeb'; break;
      case 'advertencia': label = 'Advertência'; color = '#f59e0b'; bg = '#fffbeb'; break;
      case 'suspensao': label = 'Suspensão'; color = '#ea580c'; bg = '#fff7ed'; break;
      case 'promocao': label = 'Promoção'; color = '#2563eb'; bg = '#eff6ff'; break;
      case 'atestado': label = 'Atestado'; color = '#db2777'; bg = '#fdf2f8'; break;
      default: label = type;
    }
    return <span style={{ background: bg, color: color, padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>{label}</span>;
  };

  return (
    <div style={styles.container}>
      
      <div style={styles.header}>
        <div style={styles.iconHeader}><FileCheck size={28} color="white"/></div>
        <div>
          <h1 style={styles.title}>Departamento de RH</h1>
          <p style={styles.subtitle}>Gerencie advertências, atestados e avalie solicitações.</p>
        </div>
      </div>

      <div style={styles.tabsContainer}>
        <button onClick={() => setActiveTab('nova')} style={activeTab === 'nova' ? styles.tabActive : styles.tab}>
          <FileText size={16} /> Nova Solicitação
        </button>
        <button onClick={() => setActiveTab('aprovacoes')} style={activeTab === 'aprovacoes' ? styles.tabActive : styles.tab}>
          <ShieldAlert size={16} /> Central de Aprovações
        </button>
        <button onClick={() => setActiveTab('historico')} style={activeTab === 'historico' ? styles.tabActive : styles.tab}>
          <History size={16} /> Meu Histórico
        </button>
      </div>

      <div style={styles.content}>
        
        {/* ========================================== */}
        {/* ABA 1: NOVA SOLICITAÇÃO                    */}
        {/* ========================================== */}
        {activeTab === 'nova' && (
          <div style={{animation: 'fadeIn 0.4s'}}>
            <div style={styles.rhNoticeBox}>
              <div style={{display: 'flex', gap: '15px'}}>
                <div style={{background: '#dbeafe', padding: '10px', borderRadius: '50%', height: 'fit-content'}}>
                  <Mail size={24} color="#1e40af" />
                </div>
                <div>
                  <h3 style={{fontWeight: 'bold', color: '#1e3a8a', marginBottom: '10px', fontSize: '15px'}}>Informação ao Gestor</h3>
                  <ul style={{fontSize: '13px', color: '#1e3a8a', lineHeight: '1.6', paddingLeft: '20px', margin: 0}}>
                    <li>O documento PDF será gerado automaticamente.</li>
                    <li>A solicitação entrará como <strong>Pendente</strong> para avaliação da Coordenação.</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {isCoordinator && (
              <div style={{marginBottom: '25px', padding: '15px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0'}}>
                 <label style={styles.label}>Quem será o alvo da solicitação?</label>
                 <div style={{display:'flex', gap:'20px', marginTop:'10px'}}>
                    <label style={styles.radioLabel}><input type="radio" checked={targetType === 'atendente'} onChange={() => setTargetType('atendente')} /><Users size={16} /> Atendente</label>
                    <label style={styles.radioLabel}><input type="radio" checked={targetType === 'supervisor'} onChange={() => setTargetType('supervisor')} /><Shield size={16} /> Supervisor</label>
                 </div>
              </div>
            )}
            
            <div style={styles.typeGrid}>
              {Object.entries(REQUEST_TYPES).map(([key, data]) => (
                <button key={key} onClick={() => setRequestType(key)} style={{...styles.typeCard, borderColor: requestType === key ? data.color : 'transparent', backgroundColor: requestType === key ? data.bg : '#f8fafc'}}>
                  <data.icon size={24} color={data.color} style={{marginBottom: '10px'}} />
                  <span style={{fontWeight: 'bold', color: '#334155'}}>{data.label}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleCreateRequest} style={styles.formGrid}>
              <div style={styles.row}>
                {targetType === 'atendente' ? (
                   <>
                     <div style={styles.field}>
                       <label style={styles.label}>Loja</label>
                       <select style={styles.input} value={form.storeId} onChange={handleStoreChange} required>
                         <option value="">Selecione...</option>
                         {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                       </select>
                     </div>
                     <div style={styles.field}>
                       <label style={styles.label}>Colaborador</label>
                       <select style={styles.input} value={form.targetId} onChange={e => setForm({...form, targetId: e.target.value})} required disabled={!form.storeId}>
                         <option value="">Selecione...</option>
                         {attendants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                       </select>
                     </div>
                   </>
                ) : (
                   <div style={{...styles.field, gridColumn: '1 / -1'}}>
                      <label style={styles.label}>Selecione o Supervisor</label>
                      <select style={styles.input} value={form.targetId} onChange={e => setForm({...form, targetId: e.target.value})} required>
                         <option value="">Selecione...</option>
                         {supervisors.map(s => <option key={s.id} value={s.id}>{s.name} ({s.clusterId})</option>)}
                      </select>
                   </div>
                )}
              </div>

              {requestType === 'atestado' ? (
                <div style={styles.row}>
                  <div style={styles.field}><label style={styles.label}>Data Início</label><input type="date" style={styles.input} value={form.dateEvent} onChange={e => setForm({...form, dateEvent: e.target.value})} required /></div>
                  <div style={styles.field}><label style={styles.label}>Dias</label><input type="number" style={styles.input} placeholder="Ex: 3" value={form.atestadoDays} onChange={e => setForm({...form, atestadoDays: e.target.value})} required /></div>
                </div>
              ) : (
                <div style={styles.field}>
                  <label style={styles.label}>Data do Fato / Sugerida</label>
                  <input type="date" style={styles.input} value={form.dateEvent} onChange={e => setForm({...form, dateEvent: e.target.value})} required />
                </div>
              )}

              {(requestType === 'advertencia' || requestType === 'suspensao') && (
                <div style={styles.field}>
                  <label style={styles.label}>Motivo Principal</label>
                  <select style={styles.input} value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} required>
                    <option value="">Selecione...</option>
                    <option value="Insubordinação">Insubordinação</option>
                    <option value="Faltas">Faltas/Atrasos</option>
                    <option value="Comportamento">Comportamento</option>
                    <option value="Performance">Baixa Performance</option>
                  </select>
                </div>
              )}

              <div style={styles.field}>
                <label style={styles.label}>Descrição Detalhada</label>
                <textarea style={{...styles.input, height: '120px'}} placeholder="Descreva o ocorrido..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Anexar Arquivo</label>
                <label htmlFor="file-upload" style={styles.uploadBox}>
                   <input id="file-upload" type="file" style={{display: 'none'}} onChange={handleFileChange} />
                   <Paperclip size={24} color="#94a3b8" />
                   <span style={{fontSize: '13px', color: '#64748b', marginTop: '5px'}}>{fileName ? `Arquivo: ${fileName}` : "Clique para anexar"}</span>
                </label>
              </div>

              <button type="submit" style={{...styles.btnSubmit, backgroundColor: currentType.color}} disabled={loading}>
                {loading ? 'Processando...' : `Enviar e Gerar PDF`}
              </button>
            </form>
          </div>
        )}

        {/* ========================================== */}
        {/* ABA 2: CENTRAL DE APROVAÇÕES               */}
        {/* ========================================== */}
        {activeTab === 'aprovacoes' && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div style={styles.toolbar}>
              <div style={styles.searchBox}>
                <Search size={18} color="#94a3b8" />
                <input type="text" placeholder="Buscar colaborador..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={styles.searchInput} />
              </div>
              <div style={styles.filterGroup}>
                {['Pendente', 'Aprovado', 'Rejeitado', 'Todos'].map(status => (
                  <button key={status} onClick={() => setFilterStatus(status)} style={filterStatus === status ? styles.filterBtnActive : styles.filterBtn}>{status}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: selectedApproval ? '1fr 400px' : '1fr', gap: '25px', transition: 'all 0.3s' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {loading ? (
                  <div style={styles.emptyState}>Carregando solicitações...</div>
                ) : filteredApprovals.length === 0 ? (
                  <div style={styles.emptyState}>
                    <ShieldAlert size={40} style={{ margin: '0 auto 15px auto', color: '#cbd5e1' }} />
                    Nenhuma solicitação {filterStatus !== 'Todos' ? filterStatus.toLowerCase() : ''} encontrada.
                  </div>
                ) : (
                  filteredApprovals.map(req => (
                    <div key={req.id} onClick={() => setSelectedApproval(req)} style={{...styles.requestCard, borderColor: selectedApproval?.id === req.id ? '#2563eb' : '#e2e8f0', boxShadow: selectedApproval?.id === req.id ? '0 4px 15px rgba(37,99,235,0.1)' : '0 2px 4px rgba(0,0,0,0.02)'}}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          {getTypeBadge(req.type)}
                          {getStatusBadge(req.status || 'Pendente')}
                        </div>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>
                          {new Date(req.createdAt?.toDate() || Date.now()).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#1e293b', margin: '0 0 5px 0' }}>
                        {req.targetName || req.attendantName || 'Indefinido'}
                      </h3>
                      <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14}/> {req.storeName || req.storeId}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={14}/> {req.supervisorName || 'Gestor'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* PAINEL DE DETALHES (Aprovações) */}
              {selectedApproval && (
                <div style={styles.detailsPanel}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #e2e8f0' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', margin: 0 }}>Detalhes da Solicitação</h3>
                    <button onClick={() => setSelectedApproval(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><XCircle size={20}/></button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                        <div style={{ width: '40px', height: '40px', background: '#2563eb', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {(selectedApproval.targetName || selectedApproval.attendantName || 'U')[0]}
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>{selectedApproval.targetName || selectedApproval.attendantName}</h4>
                          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Unidade: {selectedApproval.storeName || selectedApproval.storeId}</p>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div><label style={styles.detailLabel}>Status</label><div>{getStatusBadge(selectedApproval.status || 'Pendente')}</div></div>
                      <div><label style={styles.detailLabel}>Data Informada</label><p style={styles.detailValue}>{selectedApproval.dateEvent || selectedApproval.startDate ? new Date(selectedApproval.dateEvent || selectedApproval.startDate).toLocaleDateString() : 'N/A'}</p></div>
                    </div>
                    <div>
                      <label style={styles.detailLabel}><AlignLeft size={14} /> Justificativa / Descrição</label>
                      <div style={styles.observationBox}>{selectedApproval.reason || selectedApproval.description || 'Sem descrição.'}</div>
                    </div>
                    {selectedApproval.supervisorReason && (
                      <div>
                        <label style={styles.detailLabel}>Parecer Final</label>
                        <div style={{...styles.observationBox, background: selectedApproval.status === 'Rejeitado' ? '#fef2f2' : '#ecfdf5', borderColor: selectedApproval.status === 'Rejeitado' ? '#fecaca' : '#a7f3d0' }}>
                          {selectedApproval.supervisorReason}
                        </div>
                      </div>
                    )}
                    {(selectedApproval.status === 'Pendente' || !selectedApproval.status) && (
                      <div style={{ display: 'flex', gap: '15px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                        <button onClick={() => handleActionClick(selectedApproval, 'rejeitar')} style={styles.btnReject}><XCircle size={18}/> Rejeitar</button>
                        <button onClick={() => handleActionClick(selectedApproval, 'aprovar')} style={styles.btnApprove}><CheckCircle2 size={18}/> Aprovar</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* ABA 3: MEU HISTÓRICO DE ENVIOS             */}
        {/* ========================================== */}
        {activeTab === 'historico' && (
          <div style={{animation: 'fadeIn 0.4s'}}>
            <div style={styles.tableCard}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Data Envio</th>
                    <th style={styles.th}>Tipo</th>
                    <th style={styles.th}>Alvo</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map(item => {
                    const typeConfig = REQUEST_TYPES[item.type] || REQUEST_TYPES.advertencia;
                    return (
                      <tr key={item.id} style={styles.tableRow}>
                        <td style={styles.td}>{item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'Hoje'}</td>
                        <td style={styles.td}><span style={{...styles.typeBadge, color: typeConfig.color, background: typeConfig.bg}}>{typeConfig.label}</span></td>
                        <td style={styles.td}><strong>{item.targetName || item.attendantName}</strong><br/><span style={{fontSize: '10px', color: '#94a3b8'}}>{item.storeName}</span></td>
                        <td style={styles.td}>{getStatusBadge(item.status)}</td>
                      </tr>
                    )
                  })}
                  {historyList.length === 0 && <tr><td colSpan="4" style={styles.emptyState}>Nenhum histórico encontrado.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* MODAL DE AÇÃO (Aprovação / Rejeição) */}
      {actionModal.isOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              {actionModal.type === 'aprovar' ? <CheckCircle2 size={24} color="#059669" /> : <ShieldAlert size={24} color="#dc2626" />}
              <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                {actionModal.type === 'aprovar' ? 'Confirmar Aprovação' : 'Rejeitar Solicitação'}
              </h3>
            </div>
            <p style={{ fontSize: '14px', color: '#475569', marginBottom: '20px', lineHeight: '1.5' }}>
              Você está prestes a <strong>{actionModal.type}</strong> a solicitação referente a <strong>{actionModal.request.targetName || actionModal.request.attendantName}</strong>.
            </p>
            <label style={styles.detailLabel}>{actionModal.type === 'aprovar' ? 'Observação Opcional' : 'Motivo da Rejeição (Obrigatório)'}</label>
            <textarea value={actionModal.reason} onChange={(e) => setActionModal({...actionModal, reason: e.target.value})} placeholder="..." style={styles.modalTextarea} autoFocus />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', marginTop: '25px' }}>
              <button onClick={() => setActionModal({ isOpen: false, type: '', request: null, reason: '' })} disabled={isProcessing} style={styles.btnCancel}>Cancelar</button>
              <button onClick={confirmAction} disabled={isProcessing || (actionModal.type === 'rejeitar' && !actionModal.reason.trim())} style={actionModal.type === 'aprovar' ? styles.btnApproveModal : styles.btnRejectModal}>
                {isProcessing ? 'Processando...' : 'Confirmar'} <Send size={16}/>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- ESTILOS INLINE PREMIUM ---
const styles = {
  container: { padding: '40px', maxWidth: '1000px', margin: '0 auto', fontFamily: "'Inter', sans-serif" },
  header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' },
  iconHeader: { width: '56px', height: '56px', borderRadius: '16px', background: '#db2777', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(219, 39, 119, 0.2)' },
  title: { fontSize: '28px', fontWeight: '900', color: '#1e293b', margin: 0, letterSpacing: '-0.02em' },
  subtitle: { fontSize: '15px', color: '#64748b', margin: '5px 0 0 0' },
  
  tabsContainer: { display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '1px solid #e2e8f0', paddingBottom: '1px', overflowX: 'auto' },
  tab: { padding: '12px 20px', border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '3px solid transparent' },
  tabActive: { padding: '12px 20px', border: 'none', background: 'transparent', color: '#db2777', cursor: 'pointer', fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '3px solid #db2777' },
  
  content: { background: 'white', padding: '30px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', minHeight: '500px' },
  
  rhNoticeBox: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '20px', marginBottom: '30px' },
  typeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '30px' },
  typeCard: { padding: '15px 10px', borderRadius: '12px', border: '2px solid', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transition: '0.2s', fontSize:'12px', textAlign:'center', gap: '8px' },
  
  formGrid: { display: 'flex', flexDirection: 'column', gap: '20px' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '700', color: '#475569' },
  input: { padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', color: '#1e293b', width: '100%', boxSizing: 'border-box', background: '#f8fafc' },
  uploadBox: { border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f8fafc', gap: '10px' },
  btnSubmit: { padding: '16px', borderRadius: '14px', color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer', fontSize: '16px', marginTop: '10px', width: '100%', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' },
  
  radioLabel: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#334155' },

  // APROVAÇÕES E HISTÓRICO
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', marginBottom: '30px', flexWrap: 'wrap', background: '#f8fafc', padding: '15px', borderRadius: '16px', border: '1px solid #f1f5f9' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', flex: 1, minWidth: '250px' },
  searchInput: { border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', color: '#1e293b', width: '100%' },
  filterGroup: { display: 'flex', gap: '10px', overflowX: 'auto' },
  filterBtn: { padding: '8px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },
  filterBtnActive: { padding: '8px 16px', borderRadius: '10px', border: '1px solid #2563eb', background: '#eff6ff', color: '#2563eb', fontSize: '13px', fontWeight: '800', cursor: 'pointer' },
  
  requestCard: { background: 'white', padding: '20px', borderRadius: '20px', border: '2px solid transparent', cursor: 'pointer', transition: 'all 0.2s' },
  detailsPanel: { background: 'white', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', position: 'sticky', top: '20px', alignSelf: 'start' },
  detailLabel: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' },
  detailValue: { fontSize: '15px', fontWeight: '600', color: '#1e293b', margin: 0 },
  observationBox: { background: '#f8fafc', border: '1px solid #e2e8f0', padding: '15px', borderRadius: '12px', fontSize: '13px', color: '#475569', lineHeight: '1.5', whiteSpace: 'pre-wrap' },
  
  badgeSuccess: { display: 'flex', alignItems: 'center', gap: '4px', background: '#ecfdf5', color: '#059669', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' },
  badgeError: { display: 'flex', alignItems: 'center', gap: '4px', background: '#fef2f2', color: '#dc2626', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' },
  badgeWarning: { display: 'flex', alignItems: 'center', gap: '4px', background: '#fffbeb', color: '#d97706', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' },

  btnApprove: { flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '14px', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  btnReject: { flex: 1, background: '#fff1f2', color: '#e11d48', border: '1px solid #ffe4e6', padding: '14px', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },

  tableCard: { overflow: 'hidden', borderRadius: '12px', border: '1px solid #e2e8f0' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHeaderRow: { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  th: { padding: '15px', textAlign: 'left', fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' },
  tableRow: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '15px', fontSize: '14px', color: '#334155' },
  typeBadge: { padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' },
  emptyState: { padding: '60px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' },

  // MODAL DE AÇÃO
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { background: 'white', padding: '30px', borderRadius: '24px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', animation: 'slideUp 0.3s' },
  modalTextarea: { width: '100%', minHeight: '120px', padding: '15px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', color: '#334155', outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' },
  btnCancel: { background: 'white', color: '#64748b', border: '1px solid #cbd5e1', padding: '12px 20px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' },
  btnApproveModal: { background: '#10b981', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
  btnRejectModal: { background: '#ef4444', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }
};