import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, getDocs, where } from 'firebase/firestore';
import { jsPDF } from "jspdf";
import { 
  MapPin, Calendar, Users, Star, DollarSign,
  CheckCircle, Paperclip, History, Download, Plus, Target, X, BarChart2, PieChart, Check, Ban
} from 'lucide-react';

import { Page, Card, Btn, Badge, colors } from '../components/ui';
import TabAvaliacaoPatrocinio from '../components/TabAvaliacaoPatrocinio';
import DashboardPatrocinios from '../components/DashboardPatrocinios';

export default function PatrocinioSupervisor({ userData }) {
  const [activeTab, setActiveTab] = useState('nova'); 
  const [evalItemId, setEvalItemId] = useState(''); 

  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [actionPlans, setActionPlans] = useState([]); 
  const [attachments, setAttachments] = useState([]); 

  const [form, setForm] = useState({
    requesterName: '', eventName: '', city: '', location: '', dateTime: '', organizer: '', contact: '',
    targetAudience: '', expectedAudience: '', supportRequested: '', 
    investmentValue: '', isExchange: false, observations: '', priority: 0, actionPlanId: '', actionPlanName: '', actionPlanObjective: ''
  });

  // 🚀 ESTADOS DOS NOVOS MODAIS (APROVAÇÃO E RECUSA)
  const [approveModal, setApproveModal] = useState({ open: false, item: null, finalValue: '', finalSupport: '' });
  const [rejectModal, setRejectModal] = useState({ open: false, item: null, reason: '', notes: '' });

  const isCoordinator = userData?.role === 'coordinator' || userData?.role === 'coordenador';

  useEffect(() => { fetchCities(); fetchHistory(); }, [userData]);

  const fetchCities = async () => {
    try {
      const q = query(collection(db, "cities")); 
      const snap = await getDocs(q);
      setCities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
  };

  const fetchHistory = async () => {
    try {
      // Para testes, o supervisor pode ver e aprovar. Em prod, restrinja o q se necessário.
      let q = isCoordinator ? query(collection(db, "sponsorships")) : auth?.currentUser ? query(collection(db, "sponsorships"), where("supervisorId", "==", auth.currentUser.uid)) : null;
      if (!q) return;
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setHistoryList(list);
    } catch (err) { console.error(err); }
  };

  const fetchActionPlansForCity = async (cityName) => {
    if (!cityName) return setActionPlans([]);
    const selectedCityObj = cities.find(c => c.name === cityName);
    if (!selectedCityObj) return;
    try {
      const q = query(collection(db, 'action_plans'), where('cityId', '==', selectedCityObj.id));
      const snap = await getDocs(q);
      const plans = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setActionPlans(plans.filter(p => p.status === 'Planejamento' || p.status === 'Em Andamento'));
    } catch (err) { console.error(err); }
  };

  const handleCityChange = (e) => {
    const cityName = e.target.value;
    setForm({ ...form, city: cityName, actionPlanId: '', actionPlanName: '', actionPlanObjective: '' });
    fetchActionPlansForCity(cityName);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (attachments.length + files.length > 3) return alert("Máximo de 3 anexos.");
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setAttachments(prev => [...prev, { name: file.name, type: file.type, base64: reader.result }]);
        reader.readAsDataURL(file);
      } else {
        setAttachments(prev => [...prev, { name: file.name, type: file.type, base64: null }]);
      }
    });
  };

  const removeAttachment = (index) => setAttachments(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.priority === 0) return alert("Defina o nível de prioridade.");
    
    setLoading(true);
    try {
      const fileNames = attachments.map(a => a.name);
      const requestDataDB = {
        ...form, requesterName: form.requesterName.trim() || userData?.name || 'Supervisor',
        supervisorId: auth.currentUser?.uid || 'user-id', supervisorName: userData?.name || 'Supervisor',
        clusterId: userData?.clusterId || 'Geral', status: 'Pendente', createdAt: serverTimestamp(),
        fileNames: fileNames.length > 0 ? fileNames : ['Sem anexo']
      };

      await addDoc(collection(db, "sponsorships"), requestDataDB);

      if (window.showToast) window.showToast('Solicitação enviada para aprovação!', 'success');
      else alert("Solicitação enviada!");
      
      setForm({ requesterName: '', eventName: '', city: '', location: '', dateTime: '', organizer: '', contact: '', targetAudience: '', expectedAudience: '', supportRequested: '', investmentValue: '', isExchange: false, observations: '', priority: 0, actionPlanId: '', actionPlanName: '', actionPlanObjective: '' });
      setAttachments([]);
      
      fetchHistory();
      setActiveTab('historico');
    } catch (err) { alert("Erro ao enviar: " + err.message); }
    setLoading(false);
  };

  // 🚀 MOTORES DE FLUXO (APROVAÇÃO E RECUSA)
  const handleApprove = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, "sponsorships", approveModal.item.id), {
        status: 'Aprovado',
        approvedValue: approveModal.finalValue,
        approvedSupport: approveModal.finalSupport,
        approvedAt: serverTimestamp(),
        approvedBy: userData?.name || 'Diretoria'
      });
      if (window.showToast) window.showToast('Patrocínio Aprovado e Fechado!', 'success');
      setApproveModal({ open: false, item: null, finalValue: '', finalSupport: '' });
      fetchHistory();
    } catch (err) { console.error(err); alert("Erro ao aprovar."); }
    setLoading(false);
  };

  const handleReject = async () => {
    if (!rejectModal.reason) return alert("Selecione um motivo de recusa.");
    setLoading(true);
    try {
      await updateDoc(doc(db, "sponsorships", rejectModal.item.id), {
        status: 'Recusado',
        rejectionReason: rejectModal.reason,
        rejectionNotes: rejectModal.notes,
        rejectedAt: serverTimestamp(),
        rejectedBy: userData?.name || 'Diretoria'
      });
      if (window.showToast) window.showToast('Patrocínio Recusado/Arquivado.', 'info');
      setRejectModal({ open: false, item: null, reason: '', notes: '' });
      fetchHistory();
    } catch (err) { console.error(err); alert("Erro ao recusar."); }
    setLoading(false);
  };

  return (
    <Page title="Gestão de Patrocínios e Eventos" subtitle="Aprovação de verbas, execução e mensuração de resultados (ROI).">
      <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-panel)', padding: '6px', borderRadius: '14px', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('nova')} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: activeTab === 'nova' ? 'var(--bg-card)' : 'transparent', color: activeTab === 'nova' ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', fontWeight: '900', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Plus size={16} /> Nova Solicitação
          </button>
          <button onClick={() => setActiveTab('historico')} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: activeTab === 'historico' ? 'var(--bg-card)' : 'transparent', color: activeTab === 'historico' ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', fontWeight: '900', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <History size={16} /> Workflow / Histórico
          </button>
          <button onClick={() => setActiveTab('avaliacao')} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: activeTab === 'avaliacao' ? 'var(--bg-card)' : 'transparent', color: activeTab === 'avaliacao' ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', fontWeight: '900', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Target size={16} /> Apurar ROI (Aprovados)
          </button>
          <button onClick={() => setActiveTab('dashboard')} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: activeTab === 'dashboard' ? colors.primary : 'transparent', color: activeTab === 'dashboard' ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', fontWeight: '900', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <PieChart size={16} /> Dashboard de BI
          </button>
        </div>

        <Card style={{ padding: '30px' }}>
          
          {/* ABA 1: NOVA SOLICITAÇÃO (MANTIDA IGUAL PARA BREVIDADE) */}
          {activeTab === 'nova' && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '30px', animation: 'fadeIn 0.3s ease' }}>
              <div style={{ padding: '25px', border: '1px solid var(--border)', borderRadius: '20px', background: 'var(--bg-app)' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: '900', color: 'var(--text-main)' }}>1. Dados do Evento e Comercial</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>Nome do Solicitante</label>
                  <input style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }} placeholder="Deixe vazio para usar o logado" value={form.requesterName} onChange={e => setForm({...form, requesterName: e.target.value})} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>Evento</label><input style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }} value={form.eventName} onChange={e => setForm({...form, eventName: e.target.value})} required /></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>Cidade</label>
                    <select style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }} value={form.city} onChange={handleCityChange} required>
                      <option value="">Selecione...</option>
                      {cities.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                   <label style={{ fontSize: '12px', fontWeight: '900', color: colors.primary }}>Vincular a Plano de Ação Comercial</label>
                   <select style={{ padding: '14px', borderRadius: '12px', border: `1px solid ${colors.primary}50`, background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }} value={form.actionPlanId} onChange={e => { const plan = actionPlans.find(p => p.id === e.target.value); setForm({ ...form, actionPlanId: e.target.value, actionPlanName: plan?.name || '', actionPlanObjective: plan?.objective || '' }); }}>
                     <option value="">Sem Vínculo</option>
                     {actionPlans.map(plan => (<option key={plan.id} value={plan.id}>{plan.name}</option>))}
                   </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>Local</label><input style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }} value={form.location} onChange={e => setForm({...form, location: e.target.value})} required /></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)' }}>Data e Hora</label><input type="datetime-local" style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }} value={form.dateTime} onChange={e => setForm({...form, dateTime: e.target.value})} required /></div>
                </div>
              </div>

              <div style={{ padding: '25px', border: '1px solid var(--border)', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.05)', borderLeft: `4px solid ${colors.warning}` }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '15px', fontWeight: '900', color: colors.warning }}>2. Detalhes Financeiros</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-main)' }}>Valor Solicitado (R$)</label>
                  <input type="number" min="0" step="0.01" style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', fontSize: '18px', fontWeight: '900', outline: 'none' }} placeholder="0.00" value={form.investmentValue} onChange={e => setForm({...form, investmentValue: e.target.value})} required />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}><label style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>Apoio Solicitado (Tendas, etc)</label><textarea style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none', minHeight: '60px', fontFamily: 'inherit' }} value={form.supportRequested} onChange={e => setForm({...form, supportRequested: e.target.value})} required /></div>
                <div style={{ marginBottom: '20px' }}><label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--bg-card)', borderRadius: '12px', cursor: 'pointer', border: '1px solid var(--border)' }}><input type="checkbox" checked={form.isExchange} onChange={e => setForm({...form, isExchange: e.target.checked})} style={{ width: '20px', height: '20px', accentColor: colors.warning }} /><div><span style={{ fontWeight: '900', color: 'var(--text-main)', fontSize: '14px' }}>Haverá Permuta de Internet?</span></div></label></div>
                <div><label style={{ fontSize: '13px', fontWeight: '900', color: 'var(--text-main)', display: 'block', marginBottom: '10px' }}>Nível de Prioridade</label><div style={{ display: 'flex', gap: '12px' }}>{[1, 2, 3, 4, 5].map(star => (<Star key={star} size={36} fill={star <= form.priority ? colors.warning : "none"} color={star <= form.priority ? colors.warning : "var(--border)"} style={{ cursor: 'pointer' }} onClick={() => setForm({...form, priority: star})} />))}</div></div>
              </div>

              <Btn type="submit" disabled={loading} style={{ background: colors.primary, color: '#fff', padding: '18px', fontSize: '16px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                {loading ? 'Enviando...' : 'Enviar Solicitação para Aprovação'}
              </Btn>
            </form>
          )}

          {/* 🚀 ABA 2: WORKFLOW / HISTÓRICO */}
          {activeTab === 'historico' && (
             <div style={{ animation: 'fadeIn 0.3s ease', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px', border: '1px solid var(--border)' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-panel)' }}>
                      <th style={{ padding: '16px', fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Data / Evento</th>
                      <th style={{ padding: '16px', fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Solicitado</th>
                      <th style={{ padding: '16px', fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Fechado/Aprovado</th>
                      <th style={{ padding: '16px', fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Status</th>
                      <th style={{ padding: '16px', fontSize: '12px', fontWeight: '900', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Ações de Fluxo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.map(req => (
                      <tr key={req.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '16px' }}>
                          <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '700' }}>{req.createdAt?.seconds ? new Date(req.createdAt.seconds * 1000).toLocaleDateString('pt-BR') : 'Hoje'}</div>
                          <div style={{ fontWeight: '900', color: 'var(--text-main)', fontSize: '14px' }}>{req.eventName}</div>
                        </td>
                        <td style={{ padding: '16px', color: 'var(--text-main)', fontSize: '13px', fontWeight: '800' }}>R$ {Number(req.investmentValue || 0).toLocaleString('pt-BR')}</td>
                        <td style={{ padding: '16px', color: req.approvedValue ? colors.success : 'var(--text-muted)', fontSize: '13px', fontWeight: '800' }}>
                          {req.approvedValue ? `R$ ${Number(req.approvedValue).toLocaleString('pt-BR')}` : '---'}
                        </td>
                        <td style={{ padding: '16px' }}>
                           <Badge status={req.status === 'Finalizado' ? 'success' : req.status === 'Aprovado' ? 'info' : req.status === 'Recusado' ? 'danger' : 'warning'}>
                             {req.status}
                           </Badge>
                        </td>
                        <td style={{ padding: '16px', textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                           
                           {/* BOTÕES PARA PENDENTES */}
                           {req.status === 'Pendente' && (
                             <>
                               <button onClick={() => setApproveModal({ open: true, item: req, finalValue: req.investmentValue, finalSupport: req.supportRequested })} style={{ background: 'var(--success-light)', color: colors.success, border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '900', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                 <Check size={14} /> Aprovar / Negociar
                               </button>
                               <button onClick={() => setRejectModal({ open: true, item: req, reason: '', notes: '' })} style={{ background: 'var(--danger-light)', color: colors.danger, border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '900', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                 <Ban size={14} /> Recusar
                               </button>
                             </>
                           )}

                           {/* BOTÃO PARA APROVADOS (IR PARA APURAÇÃO) */}
                           {req.status === 'Aprovado' && (
                              <button onClick={() => { setEvalItemId(req.id); setActiveTab('avaliacao'); }} style={{ background: colors.primary, color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '900', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <BarChart2 size={14} /> Apurar Resultados
                              </button>
                           )}

                           {/* VER DETALHES FINALIZADOS */}
                           {req.status === 'Finalizado' && (
                              <button onClick={() => { setEvalItemId(req.id); setActiveTab('avaliacao'); }} style={{ background: 'var(--bg-app)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '900', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <BarChart2 size={14} /> Ver ROI
                              </button>
                           )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          )}

          {/* ABA 3 E 4 */}
          {activeTab === 'avaliacao' && <TabAvaliacaoPatrocinio sponsorships={historyList} preSelectedId={evalItemId} onSuccess={() => { fetchHistory(); setActiveTab('dashboard'); }} />}
          {activeTab === 'dashboard' && <DashboardPatrocinios sponsorships={historyList} />}

        </Card>
      </div>

      {/* ========================================== */}
      {/* 🚀 MODAIS DE WORKFLOW (APROVAR / RECUSAR) */}
      {/* ========================================== */}
      
      {/* MODAL APROVAR */}
      {approveModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-card)', padding: '30px', borderRadius: '24px', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: colors.success, display: 'flex', alignItems: 'center', gap: '10px' }}><CheckCircle size={22}/> Fechamento e Aprovação</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Confirme ou ajuste os valores finais acordados na negociação deste patrocínio antes de liberar para execução.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '900' }}>Valor Final Aprovado (R$)</label>
              <input type="number" step="0.01" value={approveModal.finalValue} onChange={e => setApproveModal({...approveModal, finalValue: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '16px', fontWeight: '900', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '900' }}>Itens de Apoio Final (Contrapartida)</label>
              <textarea value={approveModal.finalSupport} onChange={e => setApproveModal({...approveModal, finalSupport: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', minHeight: '80px', outline: 'none', fontFamily: 'inherit' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => setApproveModal({open: false, item: null})} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', fontWeight: '800', cursor: 'pointer', color: 'var(--text-main)' }}>Cancelar</button>
              <button onClick={handleApprove} disabled={loading} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: colors.success, color: '#fff', fontWeight: '900', cursor: 'pointer' }}>{loading ? 'Aprovando...' : 'Confirmar Aprovação'}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RECUSAR */}
      {rejectModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-card)', padding: '30px', borderRadius: '24px', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: colors.danger, display: 'flex', alignItems: 'center', gap: '10px' }}><Ban size={22}/> Recusar Solicitação</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '900' }}>Motivo da Recusa (Para métricas)</label>
              <select value={rejectModal.reason} onChange={e => setRejectModal({...rejectModal, reason: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '14px', outline: 'none', cursor: 'pointer' }}>
                <option value="">-- Selecione um motivo --</option>
                <option value="Verba Esgotada">Verba do Mês Esgotada</option>
                <option value="Fora da Estratégia">Fora da Estratégia Atual</option>
                <option value="Baixo ROI">Baixo Retorno Projetado (ROI)</option>
                <option value="Conflito de Data">Conflito de Datas / Equipe</option>
                <option value="Outros">Outros Motivos</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: '900' }}>Justificativa (Feedback para a ponta)</label>
              <textarea value={rejectModal.notes} onChange={e => setRejectModal({...rejectModal, notes: e.target.value})} style={{ padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', minHeight: '80px', outline: 'none', fontFamily: 'inherit' }} placeholder="Explique brevemente o motivo..." />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => setRejectModal({open: false, item: null})} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', fontWeight: '800', cursor: 'pointer', color: 'var(--text-main)' }}>Cancelar</button>
              <button onClick={handleReject} disabled={loading} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: colors.danger, color: '#fff', fontWeight: '900', cursor: 'pointer' }}>{loading ? 'Arquivando...' : 'Confirmar Recusa'}</button>
            </div>
          </div>
        </div>
      )}

    </Page>
  );
}