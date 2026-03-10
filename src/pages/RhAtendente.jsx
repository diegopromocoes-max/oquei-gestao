import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { 
  FileCheck, Clock, History, AlertTriangle, FileText, CheckCircle, XCircle, 
  Info, UploadCloud, ArrowLeft, CalendarDays, Send, Loader2
} from 'lucide-react';

import { styles as global, colors } from '../styles/globalStyles';

export default function RhAtendente({ userData }) {
  const [activeTab, setActiveTab] = useState('nova');
  const [loading, setLoading] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [fileName, setFileName] = useState(null);

  const [form, setForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    allDay: true,
    startTime: '',
    endTime: '',
    description: ''
  });

  const REQUEST_TYPES = {
    falta_futura: { id: 'falta_futura', label: 'Falta Futura', icon: AlertTriangle, color: '#ea580c', bg: '#ea580c15', desc: 'Avisar ausência programada.' },
    atestado: { id: 'atestado', label: 'Enviar Atestado', icon: FileCheck, color: '#10b981', bg: '#10b98115', desc: 'Anexar atestado médico.' },
    folga: { id: 'folga', label: 'Solicitar Folga', icon: CalendarDays, color: '#3b82f6', bg: '#3b82f615', desc: 'Pedir folga compensatória.' },
    correcao_ponto: { id: 'correcao_ponto', label: 'Revisão de Ponto', icon: Clock, color: '#f59e0b', bg: '#f59e0b15', desc: 'Contestar saldo de horas.' },
    outros: { id: 'outros', label: 'Solicitação Avulsa', icon: FileText, color: '#8b5cf6', bg: '#8b5cf615', desc: 'Outros assuntos de RH.' },
  };

  useEffect(() => {
    if (activeTab === 'historico') fetchHistory();
  }, [activeTab]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      if (!auth.currentUser) return;
      const qRh = query(collection(db, "rh_requests"), where("attendantId", "==", auth.currentUser.uid));
      const snapRh = await getDocs(qRh);
      const qAbsences = query(collection(db, "absences"), where("attendantId", "==", auth.currentUser.uid));
      const snapAbsences = await getDocs(qAbsences);
      
      let combined = [];
      snapRh.docs.forEach(d => combined.push({ id: d.id, _source: 'rh', ...d.data() }));
      snapAbsences.docs.forEach(d => combined.push({ id: d.id, _source: 'absence', ...d.data() }));

      combined.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setHistoryList(combined);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) return window.showToast("Descreva o motivo da solicitação.", "error");
    if (selectedType === 'atestado' && !fileName) return window.showToast("Anexe a foto do atestado.", "error");

    setLoading(true);
    try {
      const isAbsence = selectedType === 'falta_futura' || selectedType === 'atestado';
      const collectionName = isAbsence ? "absences" : "rh_requests";

      const payload = {
        type: isAbsence ? (selectedType === 'atestado' ? 'atestado' : 'falta') : selectedType,
        attendantId: auth.currentUser.uid,
        attendantName: userData?.name || 'Atendente',
        storeId: userData?.cityId || 'Geral',
        clusterId: userData?.clusterId || '',
        description: form.description,
        status: 'Pendente',
        fileName: fileName || '',
        createdAt: serverTimestamp(),
        startDate: form.startDate,
        endDate: form.endDate || form.startDate,
        allDay: form.allDay,
        startTime: form.allDay ? '' : form.startTime,
        endTime: form.allDay ? '' : form.endTime,
      };

      await addDoc(collection(db, collectionName), payload);
      window.showToast("Solicitação enviada com sucesso!", "success");
      
      setSelectedType(null);
      setActiveTab('historico');
    } catch (error) { window.showToast("Erro ao enviar.", "error"); }
    setLoading(false);
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Aprovado': { bg: '#10b98115', color: '#10b981', icon: <CheckCircle size={12}/> },
      'Rejeitado': { bg: '#ef444415', color: '#ef4444', icon: <XCircle size={12}/> },
      'Pendente': { bg: '#f59e0b15', color: '#f59e0b', icon: <Clock size={12}/> }
    };
    const s = styles[status] || styles['Pendente'];
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', background: s.bg, color: s.color, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>
        {s.icon} {status}
      </span>
    );
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out', maxWidth: '850px', margin: '0 auto', width: '100%' }}>
      
      {/* CABEÇALHO PADRÃO */}
      <div style={global.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
          <div style={{...global.iconHeader, background: colors?.primary || '#2563eb'}}>
            <FileCheck size={28} color="white"/>
          </div>
          <div>
            <h1 style={global.title}>RH & Departamento Pessoal</h1>
            <p style={global.subtitle}>Gestão de ausências, atestados e solicitações operacionais.</p>
          </div>
        </div>
      </div>

      {/* TABS NAVEGAÇÃO */}
      <div style={local.tabsContainer}>
        <button onClick={() => { setActiveTab('nova'); setSelectedType(null); }} style={activeTab === 'nova' ? local.tabActive : local.tab}>
          <FileText size={18} /> Nova Solicitação
        </button>
        <button onClick={() => setActiveTab('historico')} style={activeTab === 'historico' ? local.tabActive : local.tab}>
          <History size={18} /> Meu Histórico
        </button>
      </div>

      {/* CONTEÚDO */}
      <div style={{...global.card, padding: '30px', borderRadius: '24px'}}>
        
        {activeTab === 'nova' && !selectedType && (
          <div style={{animation: 'fadeInUp 0.3s'}}>
            <h3 style={{fontSize: '16px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-main)'}}>Selecione o tipo de pedido:</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              {Object.values(REQUEST_TYPES).map((type) => (
                <button key={type.id} onClick={() => setSelectedType(type.id)} style={local.actionCard}>
                  <div style={{ background: type.bg, padding: '12px', borderRadius: '12px', color: type.color, marginBottom: '15px' }}>
                    <type.icon size={24} />
                  </div>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 5px 0' }}>{type.label}</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>{type.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'nova' && selectedType && (
          <div style={{animation: 'fadeInUp 0.3s'}}>
            <button onClick={() => setSelectedType(null)} style={{...global.btnSecondary, width: 'auto', marginBottom: '20px', padding: '8px 15px'}}>
              <ArrowLeft size={16} /> Voltar
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px', padding: '20px', background: 'var(--bg-app)', borderRadius: '16px' }}>
              <div style={{ background: REQUEST_TYPES[selectedType].bg, padding: '12px', borderRadius: '12px', color: REQUEST_TYPES[selectedType].color }}>
                {React.createElement(REQUEST_TYPES[selectedType].icon, { size: 24 })}
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>{REQUEST_TYPES[selectedType].label}</h2>
            </div>

            <form onSubmit={handleSubmit} style={global.form}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={global.field}>
                  <label style={global.label}>Data Inicial</label>
                  <input type="date" style={global.input} value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
                </div>
                <div style={global.field}>
                  <label style={global.label}>Data Final (opcional)</label>
                  <input type="date" style={global.input} value={form.endDate} min={form.startDate} onChange={e => setForm({...form, endDate: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0' }}>
                <input type="checkbox" id="allDay" checked={form.allDay} onChange={e => setForm({...form, allDay: e.target.checked})} />
                <label htmlFor="allDay" style={{ fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Ausência de dia inteiro</label>
              </div>

              {!form.allDay && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={global.field}><label style={global.label}>Hora Início</label><input type="time" style={global.input} onChange={e => setForm({...form, startTime: e.target.value})} /></div>
                  <div style={global.field}><label style={global.label}>Hora Fim</label><input type="time" style={global.input} onChange={e => setForm({...form, endTime: e.target.value})} /></div>
                </div>
              )}

              <div style={global.field}>
                <label style={global.label}>Justificativa / Descrição</label>
                <textarea style={{...global.input, height: '100px', paddingTop: '12px'}} placeholder="Explique os detalhes..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>

              <div style={global.field}>
                <label style={global.label}>Anexar Comprovante (Obrigatório para Atestado)</label>
                <label style={{ ...local.uploadBox, borderColor: fileName ? '#10b981' : 'var(--border)' }}>
                  <input type="file" style={{display: 'none'}} onChange={e => setFileName(e.target.files[0]?.name)} />
                  <UploadCloud size={24} color={fileName ? "#10b981" : "var(--text-muted)"} />
                  <span style={{ fontSize: '13px', marginTop: '10px', color: fileName ? '#10b981' : 'var(--text-muted)' }}>
                    {fileName || "Clique para anexar arquivo ou foto"}
                  </span>
                </label>
              </div>

              <button type="submit" disabled={loading} style={{...global.btnPrimary, background: 'var(--text-brand)', marginTop: '10px'}}>
                {loading ? <Loader2 className="animate-spin"/> : 'Enviar Solicitação Oficial'} <Send size={18} />
              </button>
            </form>
          </div>
        )}

        {activeTab === 'historico' && (
          <div style={{animation: 'fadeInUp 0.3s', display: 'flex', flexDirection: 'column', gap: '15px'}}>
            {historyList.length === 0 ? (
              <div style={{textAlign: 'center', padding: '40px', color: 'var(--text-muted)'}}>Nenhum pedido encontrado.</div>
            ) : (
              historyList.map(req => (
                <div key={req.id} style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: '16px', background: 'var(--bg-app)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>{REQUEST_TYPES[req.type === 'falta' ? 'falta_futura' : req.type]?.label || 'Solicitação'}</h4>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{req.startDate ? new Date(req.startDate).toLocaleDateString() : 'Sem data'}</span>
                    </div>
                    {getStatusBadge(req.status)}
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-main)', opacity: 0.8 }}>{req.description}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const local = {
  tabsContainer: { display: 'flex', gap: '20px', borderBottom: '1px solid var(--border)', marginBottom: '30px' },
  tab: { padding: '12px 5px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid transparent' },
  tabActive: { padding: '12px 5px', background: 'none', border: 'none', color: 'var(--text-brand)', cursor: 'pointer', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid var(--text-brand)' },
  actionCard: { background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '20px', padding: '25px', cursor: 'pointer', transition: '0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
  uploadBox: { border: '2px dashed var(--border)', borderRadius: '15px', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }
};