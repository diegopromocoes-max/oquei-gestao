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
  const isCoordinator = ['coordinator', 'coordenador', 'master', 'diretor'].includes(userData?.role);

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
      const qAbsences = isCoordinator
        ? query(collection(db, "absences"), where("status", "==", "Pendente"))
        : query(collection(db, "absences"), where("status", "==", "Pendente"), where("storeId", "in", storeIds.slice(0, 10)));
      const snapAbsences = await getDocs(qAbsences);

      const qRh = isCoordinator
        ? query(collection(db, "rh_requests"), where("status", "==", "Pendente"))
        : query(collection(db, "rh_requests"), where("status", "==", "Pendente"), where("storeId", "in", storeIds.slice(0, 10)));
      const snapRh = await getDocs(qRh);

      let combined = [];
      
      snapAbsences.docs.forEach(d => {
         const data = d.data();
         if (data.type !== 'falta' && data.type !== 'ferias' && storeIds.includes(data.storeId)) {
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

  const filteredApprovals = approvalList.filter(req => {
    const matchStatus = filterStatus === 'Todos' || req.status === filterStatus;
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = 
      (req.targetName || req.attendantName || '').toLowerCase().includes(searchLower) ||
      (req.storeName || req.storeId || '').toLowerCase().includes(searchLower) ||
      (req.type || '').toLowerCase().includes(searchLower);
    
    return matchStatus && matchSearch;
  });

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
      
      {/* ── CABEÇALHO PADRÃO OQUEI STRATEGY ── */}
      <div style={local.headerWrapper}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ ...local.iconBox, background: `linear-gradient(135deg, ${colors.rose}, #be185d)`, boxShadow: `0 8px 20px ${colors.rose}40` }}>
            <FileCheck size={28} color="#fff" />
          </div>
          <div>
            <div style={local.headerTitle}>Departamento de RH</div>
            <div style={local.headerSubtitle}>
              Gestão de advertências, atestados e aprovações · {new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>
      </div>

      {/* ── NAVEGAÇÃO POR ABAS (PILLS) ── */}
      <div style={local.navBar}>
        <button onClick={() => setActiveTab('nova')} style={activeTab === 'nova' ? { ...local.navBtnActive, color: colors.rose, borderColor: colors.rose } : local.navBtn}>
          <FileText size={16} /> Nova Solicitação
        </button>
        <button onClick={() => setActiveTab('aprovacoes')} style={activeTab === 'aprovacoes' ? { ...local.navBtnActive, color: colors.warning, borderColor: colors.warning } : local.navBtn}>
          <ShieldAlert size={16} /> Central de Aprovações
        </button>
        <button onClick={() => setActiveTab('historico')} style={activeTab === 'historico' ? { ...local.navBtnActive, color: colors.primary, borderColor: colors.primary } : local.navBtn}>
          <History size={16} /> Meu Histórico
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <div style={{ marginTop: '30px', paddingBottom: '40px' }}>
        
        {/* ========================================== */}
        {/* ABA 1: NOVA SOLICITAÇÃO                    */}
        {/* ========================================== */}
        {activeTab === 'nova' && (
          <div className="animated-view" style={{ ...global.card, padding: '30px', borderRadius: '24px' }}>
            <div style={local.rhNoticeBox}>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <div style={{ background: 'var(--bg-app)', padding: '12px', borderRadius: '50%' }}>
                  <Mail size={24} color={colors.primary} />
                </div>
                <div>
                  <h3 style={{ fontWeight: '900', color: 'var(--text-main)', margin: '0 0 4px 0', fontSize: '15px' }}>Informação ao Gestor</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5' }}>O documento PDF será gerado automaticamente. A solicitação entrará como <strong>Pendente</strong> para avaliação da Coordenação.</p>
                </div>
              </div>
            </div>
            
            {isCoordinator && (
              <div style={{ marginBottom: '30px', padding: '20px', background: 'var(--bg-app)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                 <label style={local.label}>Quem será o alvo da solicitação?</label>
                 <div style={{ display:'flex', gap:'20px', marginTop:'10px' }}>
                    <label style={local.radioLabel}><input type="radio" checked={targetType === 'atendente'} onChange={() => setTargetType('atendente')} style={{ accentColor: colors.primary, transform: 'scale(1.2)' }} /><Users size={16} /> Atendente / Vendedor</label>
                    <label style={local.radioLabel}><input type="radio" checked={targetType === 'supervisor'} onChange={() => setTargetType('supervisor')} style={{ accentColor: colors.primary, transform: 'scale(1.2)' }} /><Shield size={16} /> Supervisor / Líder</label>
                 </div>
              </div>
            )}
            
            <label style={local.label}>Tipo de Documento</label>
            <div style={local.typeGrid}>
              {Object.entries(REQUEST_TYPES).map(([key, data]) => (
                <button key={key} onClick={() => setRequestType(key)} style={{...local.typeCard, borderColor: requestType === key ? data.color : 'var(--border)', backgroundColor: requestType === key ? data.bg : 'var(--bg-app)', boxShadow: requestType === key ? 'var(--shadow-sm)' : 'none' }}>
                  <data.icon size={24} color={data.color} style={{marginBottom: '10px'}} />
                  <span style={{fontWeight: '900', color: 'var(--text-main)', fontSize: '13px'}}>{data.label}</span>
                  <span style={{fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px'}}>{data.desc}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleCreateRequest} style={{ ...global.form, marginTop: '30px' }}>
              <div style={global.row}>
                {targetType === 'atendente' ? (
                   <>
                     <div style={global.field}>
                       <label style={local.label}>Loja</label>
                       <select style={global.select} value={form.storeId} onChange={handleStoreChange} required>
                         <option value="">Selecione...</option>
                         {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                       </select>
                     </div>
                     <div style={global.field}>
                       <label style={local.label}>Colaborador</label>
                       <select style={global.select} value={form.targetId} onChange={e => setForm({...form, targetId: e.target.value})} required disabled={!form.storeId}>
                         <option value="">Selecione...</option>
                         {attendants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                       </select>
                     </div>
                   </>
                ) : (
                   <div style={{...global.field, gridColumn: '1 / -1'}}>
                      <label style={local.label}>Selecione o Supervisor</label>
                      <select style={global.select} value={form.targetId} onChange={e => setForm({...form, targetId: e.target.value})} required>
                         <option value="">Selecione...</option>
                         {supervisors.map(s => <option key={s.id} value={s.id}>{s.name} ({s.clusterId})</option>)}
                      </select>
                   </div>
                )}
              </div>

              {requestType === 'atestado' ? (
                <div style={global.row}>
                  <div style={global.field}><label style={local.label}>Data Início</label><input type="date" style={global.input} value={form.dateEvent} onChange={e => setForm({...form, dateEvent: e.target.value})} required /></div>
                  <div style={global.field}><label style={local.label}>Dias</label><input type="number" style={global.input} placeholder="Ex: 3" value={form.atestadoDays} onChange={e => setForm({...form, atestadoDays: e.target.value})} required /></div>
                </div>
              ) : (
                <div style={global.field}>
                  <label style={local.label}>Data do Fato / Sugerida</label>
                  <input type="date" style={global.input} value={form.dateEvent} onChange={e => setForm({...form, dateEvent: e.target.value})} required />
                </div>
              )}

              {(requestType === 'advertencia' || requestType === 'suspensao') && (
                <div style={global.field}>
                  <label style={local.label}>Motivo Principal</label>
                  <select style={global.select} value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} required>
                    <option value="">Selecione...</option>
                    <option value="Insubordinação">Insubordinação</option>
                    <option value="Faltas">Faltas/Atrasos</option>
                    <option value="Comportamento">Comportamento Inadequado</option>
                    <option value="Performance">Baixa Performance</option>
                  </select>
                </div>
              )}

              <div style={global.field}>
                <label style={local.label}>Descrição Detalhada</label>
                <textarea style={{ ...global.textarea, minHeight: '120px' }} placeholder="Descreva os fatos detalhadamente..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
              </div>

              <div style={global.field}>
                <label style={local.label}>Anexar Arquivo (Opcional)</label>
                <label htmlFor="file-upload" style={{ border: '2px dashed var(--border)', borderRadius: '16px', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--bg-app)', gap: '10px', transition: '0.2s' }}>
                   <input id="file-upload" type="file" style={{ display: 'none' }} onChange={handleFileChange} />
                   <Paperclip size={28} color="var(--text-muted)" />
                   <span style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: '800', marginTop: '5px' }}>{fileName ? `Arquivo: ${fileName}` : "Clique para anexar documento ou print"}</span>
                </label>
              </div>

              <button type="submit" style={{ ...global.btnPrimary, backgroundColor: currentType.color, height: '54px', borderRadius: '14px', fontWeight: '900', fontSize: '15px', marginTop: '10px' }} disabled={loading}>
                {loading ? 'Processando e Gerando PDF...' : `Enviar Solicitação e Gerar PDF`} <Send size={18}/>
              </button>
            </form>
          </div>
        )}

        {/* ========================================== */}
        {/* ABA 2: CENTRAL DE APROVAÇÕES               */}
        {/* ========================================== */}
        {activeTab === 'aprovacoes' && (
          <div className="animated-view">
            <div style={{ ...global.toolbar, background: 'var(--bg-card)', padding: '15px 25px', borderRadius: '20px', border: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between' }}>
              <div style={{ ...global.searchBox, margin: 0, flex: 1, minWidth: '250px' }}>
                <Search size={18} color="var(--text-muted)" />
                <input type="text" placeholder="Procurar colaborador ou unidade..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={global.searchInput} />
              </div>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                {['Pendente', 'Aprovado', 'Rejeitado', 'Todos'].map(status => (
                  <button key={status} onClick={() => setFilterStatus(status)} style={filterStatus === status ? local.filterBtnActive : local.filterBtn}>{status}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: selectedApproval ? '1fr 450px' : '1fr', gap: '30px', transition: 'all 0.3s', marginTop: '30px' }}>
              
              {/* LISTA DE CARDS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {loading ? (
                  <div style={local.emptyState}>Carregando solicitações do sistema...</div>
                ) : filteredApprovals.length === 0 ? (
                  <div style={local.emptyState}>
                    <ShieldAlert size={40} style={{ margin: '0 auto 15px auto', color: 'var(--border)' }} />
                    Nenhuma solicitação {filterStatus !== 'Todos' ? filterStatus.toLowerCase() : ''} no momento.
                  </div>
                ) : (
                  filteredApprovals.map(req => (
                    <div key={req.id} onClick={() => setSelectedApproval(req)} className="hover-lift" style={{...local.requestCard, borderColor: selectedApproval?.id === req.id ? 'var(--text-brand)' : 'var(--border)', boxShadow: selectedApproval?.id === req.id ? 'var(--shadow-sm)' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          {getTypeBadge(req.type)}
                          {getStatusBadge(req.status || 'Pendente')}
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800' }}>
                          {new Date(req.createdAt?.toDate() || Date.now()).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 8px 0' }}>
                        {req.targetName || req.attendantName || 'Indefinido'}
                      </h3>
                      <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14}/> {req.storeName || req.storeId}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={14}/> Solicitante: {req.supervisorName || 'Gestor'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* PAINEL DE DETALHES (STICKY) */}
              {selectedApproval && (
                <div style={local.detailsPanel}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><AlignLeft size={20} color="var(--text-brand)"/> Resumo e Avaliação</h3>
                    <button onClick={() => setSelectedApproval(null)} style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '10px', padding: '6px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18}/></button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    <div style={{ background: 'var(--bg-app)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: '48px', height: '48px', background: 'var(--text-brand)', color: '#ffffff', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '900' }}>
                          {(selectedApproval.targetName || selectedApproval.attendantName || 'U')[0]}
                        </div>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '18px', color: 'var(--text-main)', fontWeight: '900' }}>{selectedApproval.targetName || selectedApproval.attendantName}</h4>
                          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>Unidade: {selectedApproval.storeName || selectedApproval.storeId}</p>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div style={{ background: 'var(--bg-app)', padding: '15px', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                         <label style={local.label}>Status do Pedido</label>
                         <div style={{ marginTop: '8px' }}>{getStatusBadge(selectedApproval.status || 'Pendente')}</div>
                      </div>
                      <div style={{ background: 'var(--bg-app)', padding: '15px', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                         <label style={local.label}>Data Informada</label>
                         <p style={{ fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', margin: '8px 0 0 0' }}>{selectedApproval.dateEvent || selectedApproval.startDate ? new Date(selectedApproval.dateEvent || selectedApproval.startDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>

                    <div>
                      <label style={local.label}>Justificativa / Descrição</label>
                      <div style={local.observationBox}>{selectedApproval.reason || selectedApproval.description || 'Sem descrição.'}</div>
                    </div>

                    {selectedApproval.supervisorReason && (
                      <div>
                        <label style={local.label}>Parecer Final da Coordenação</label>
                        <div style={{...local.observationBox, background: selectedApproval.status === 'Rejeitado' ? 'var(--bg-danger-light)' : 'var(--bg-success-light)', borderColor: selectedApproval.status === 'Rejeitado' ? 'var(--border-danger)' : 'var(--border-success)', color: selectedApproval.status === 'Rejeitado' ? colors.danger : colors.success, fontWeight: '800' }}>
                          {selectedApproval.supervisorReason}
                        </div>
                      </div>
                    )}

                    {(selectedApproval.status === 'Pendente' || !selectedApproval.status) && (
                      <div style={{ display: 'flex', gap: '15px', marginTop: '10px', paddingTop: '25px', borderTop: '1px solid var(--border)' }}>
                        <button onClick={() => handleActionClick(selectedApproval, 'rejeitar')} style={{...global.btnPrimary, background: colors.danger, flex: 1, borderRadius: '14px', fontWeight: '900'}}><XCircle size={18}/> Rejeitar</button>
                        <button onClick={() => handleActionClick(selectedApproval, 'aprovar')} style={{...global.btnPrimary, background: colors.success, flex: 1, borderRadius: '14px', fontWeight: '900'}}><CheckCircle2 size={18}/> Aprovar</button>
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
          <div className="animated-view">
            <div style={{ background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)' }}>
                    <th style={local.th}>Data de Envio</th>
                    <th style={local.th}>Tipo do Documento</th>
                    <th style={local.th}>Colaborador Alvo</th>
                    <th style={local.th}>Status Atual</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map((item, i) => {
                    const typeConfig = REQUEST_TYPES[item.type] || REQUEST_TYPES.advertencia;
                    return (
                      <tr key={item.id} style={{ borderBottom: i === historyList.length - 1 ? 'none' : '1px solid var(--border)', transition: 'background 0.2s' }}>
                        <td style={local.td}>{item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : 'Hoje'}</td>
                        <td style={local.td}><span style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', color: typeConfig.color, background: typeConfig.bg, border: `1px solid ${typeConfig.color}40` }}>{typeConfig.label}</span></td>
                        <td style={local.td}>
                           <strong style={{ display: 'block', color: 'var(--text-main)', fontSize: '14px', marginBottom: '2px' }}>{item.targetName || item.attendantName}</strong>
                           <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold' }}>{item.storeName}</span>
                        </td>
                        <td style={local.td}>{getStatusBadge(item.status)}</td>
                      </tr>
                    )
                  })}
                  {historyList.length === 0 && <tr><td colSpan="4" style={local.emptyState}>Nenhuma solicitação enviada no seu histórico.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* MODAL DE AÇÃO (Aprovação / Rejeição) */}
      {actionModal.isOpen && (
        <div style={global.modalOverlay}>
          <div style={{ ...global.modalBox, borderRadius: '24px', maxWidth: '450px' }}>
            <div style={global.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '10px', borderRadius: '12px', background: actionModal.type === 'aprovar' ? 'var(--bg-success-light)' : 'var(--bg-danger-light)', color: actionModal.type === 'aprovar' ? colors.success : colors.danger }}>
                   {actionModal.type === 'aprovar' ? <CheckCircle2 size={24} /> : <ShieldAlert size={24} />}
                </div>
                <h3 style={{ ...global.modalTitle, margin: 0, fontWeight: '900' }}>
                  {actionModal.type === 'aprovar' ? 'Confirmar Aprovação' : 'Rejeitar Solicitação'}
                </h3>
              </div>
              <button onClick={() => setActionModal({ isOpen: false, type: '', request: null, reason: '' })} style={global.closeBtn}><X size={20}/></button>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '20px 0', lineHeight: '1.6' }}>
              Você está prestes a <strong>{actionModal.type}</strong> a solicitação referente a <strong style={{ color: 'var(--text-main)' }}>{actionModal.request.targetName || actionModal.request.attendantName}</strong>.
            </p>
            
            <div style={global.field}>
              <label style={local.label}>{actionModal.type === 'aprovar' ? 'Observação (Opcional)' : 'Motivo da Rejeição (Obrigatório)'}</label>
              <textarea value={actionModal.reason} onChange={(e) => setActionModal({...actionModal, reason: e.target.value})} placeholder="Adicione os seus comentários finais aqui..." style={{ ...global.textarea, minHeight: '100px' }} autoFocus />
            </div>
            
            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
              <button onClick={() => setActionModal({ isOpen: false, type: '', request: null, reason: '' })} disabled={isProcessing} style={{...global.btnSecondary, flex: 1, borderRadius: '14px', fontWeight: '800'}}>Cancelar</button>
              <button onClick={confirmAction} disabled={isProcessing || (actionModal.type === 'rejeitar' && !actionModal.reason.trim())} style={{...global.btnPrimary, flex: 2, borderRadius: '14px', background: actionModal.type === 'aprovar' ? colors.success : colors.danger, fontWeight: '900'}}>
                {isProcessing ? 'Processando...' : 'Confirmar Decisão'} <Send size={16}/>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInView { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animated-view { animation: fadeInView 0.3s ease forwards; }
        .hover-lift:hover { transform: translateY(-3px); border-color: var(--text-brand) !important; }
      `}</style>
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
  
  // APROVAÇÕES E HISTÓRICO
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