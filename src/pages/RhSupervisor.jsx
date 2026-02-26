import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, orderBy } from 'firebase/firestore';
import { jsPDF } from "jspdf";
import {
FileCheck, History, FileText, AlertTriangle, UserMinus,
TrendingUp, Clock, CheckCircle, Search, Send, Paperclip,
AlertCircle, Shield, Users, MapPin, Mail, UserPlus, X, Download
} from 'lucide-react';

export default function RhSupervisor({ userData }) {
const [activeTab, setActiveTab] = useState('nova');
const [requestType, setRequestType] = useState('advertencia');
const [loading, setLoading] = useState(false);

// --- ESTADOS DE DADOS ---
const [stores, setStores] = useState([]);
const [attendants, setAttendants] = useState([]);
const [supervisors, setSupervisors] = useState([]);
const [historyList, setHistoryList] = useState([]);

// --- CONTROLE DE PERMISSÃO ---
const isCoordinator = userData?.role === 'coordinator';
const [targetType, setTargetType] = useState('atendente'); // 'atendente' ou 'supervisor'

// --- FORMULÁRIO ---
const [form, setForm] = useState({
targetId: '',
storeId: '',
reason: '',
description: '',
dateEvent: new Date().toISOString().split('T')[0],
atestadoDays: '',
cid: ''
});

// --- CONFIGURAÇÃO DOS TIPOS ---
const REQUEST_TYPES = {
advertencia: { label: 'Advertência', icon: AlertTriangle, color: '#f59e0b', bg: '#fffbeb' },
suspensao: { label: 'Suspensão', icon: AlertCircle, color: '#ea580c', bg: '#fff7ed' },
desligamento: { label: 'Desligamento', icon: UserMinus, color: '#dc2626', bg: '#fef2f2' },
promocao: { label: 'Promoção', icon: TrendingUp, color: '#2563eb', bg: '#eff6ff' },
atestado: { label: 'Atestado Médico', icon: FileCheck, color: '#db2777', bg: '#fdf2f8' },
};

const currentType = REQUEST_TYPES[requestType];

// --- CARREGAMENTO INICIAL ---
useEffect(() => {
const fetchData = async () => {
setLoading(true);
try {
// 1. CARREGAR LOJAS (Filtro por Cluster se for Supervisor)
const qStore = isCoordinator
? query(collection(db, "cities"), orderBy("name"))
: query(collection(db, "cities"), where("clusterId", "==", userData.clusterId));

    const snapStore = await getDocs(qStore);
    setStores(snapStore.docs.map(d => ({ id: d.id, ...d.data() })));

    // 2. CARREGAR SUPERVISORES (Só para Coordenador)
    if (isCoordinator) {
      const qSup = query(collection(db, "users"), where("role", "==", "supervisor"));
      const snapSup = await getDocs(qSup);
      setSupervisors(snapSup.docs.map(d => ({ id: d.id, ...d.data() })));
    }

    await fetchHistory();
  } catch (err) { console.error(err); }
  setLoading(false);
};
fetchData();


}, [userData, activeTab]);

const fetchHistory = async () => {
try {
const q = isCoordinator
? query(collection(db, "rh_requests"))
: query(collection(db, "rh_requests"), where("supervisorId", "==", auth.currentUser.uid));

  const snap = await getDocs(q);
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  setHistoryList(list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
} catch (err) { console.error(err); }


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
};

// --- GERAÇÃO DE PDF ---
const generatePDF = (data) => {
const doc = new jsPDF();
const blueOquei = [37, 99, 235];

// Cabeçalho
doc.setFillColor(...blueOquei);
doc.rect(0, 0, 210, 25, 'F');
doc.setTextColor(255, 255, 255);
doc.setFontSize(16);
doc.setFont("helvetica", "bold");
doc.text("OQUEI TELECOM - FORMULÁRIO DE RH", 105, 16, null, null, "center");

doc.setTextColor(0, 0, 0);
doc.setFontSize(10);
doc.setFont("helvetica", "normal");

let y = 40;
doc.text(`Protocolo: ${Date.now()}`, 15, y);
doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 150, y);
y += 15;

doc.setFont("helvetica", "bold");
doc.text("DADOS DA SOLICITAÇÃO", 15, y);
doc.line(15, y + 2, 195, y + 2);
y += 10;

doc.setFont("helvetica", "normal");
doc.text(`Tipo de Pedido: ${REQUEST_TYPES[data.type].label.toUpperCase()}`, 15, y);
doc.text(`Solicitante: ${userData.name}`, 110, y);
y += 8;
doc.text(`Cidade/Unidade: ${data.storeName}`, 15, y);
y += 12;

doc.setFont("helvetica", "bold");
doc.text("DADOS DO COLABORADOR", 15, y);
y += 8;
doc.setFont("helvetica", "normal");
doc.text(`Nome: ${data.targetName}`, 15, y);
doc.text(`ID/Função: ${data.targetRole.toUpperCase()}`, 110, y);
y += 15;

doc.setFont("helvetica", "bold");
doc.text("DETALHAMENTO", 15, y);
y += 8;
doc.setFont("helvetica", "normal");

if (data.type === 'atestado') {
  doc.text(`Data Início: ${data.dateEvent}`, 15, y);
  doc.text(`Duração: ${data.atestadoDays} dias`, 60, y);
  doc.text(`CID: ${data.cid || 'N/A'}`, 110, y);
} else {
  doc.text(`Motivo: ${data.reason}`, 15, y);
  doc.text(`Data do Fato: ${data.dateEvent}`, 110, y);
}

y += 12;
doc.setFont("helvetica", "bold");
doc.text("DESCRIÇÃO DOS FATOS:", 15, y);
y += 8;
doc.setFont("helvetica", "normal");
const splitText = doc.splitTextToSize(data.description, 180);
doc.text(splitText, 15, y);

y += (splitText.length * 7) + 30;
doc.line(15, y, 90, y);
doc.line(120, y, 195, y);
doc.setFontSize(8);
doc.text("Assinatura do Gestor", 52, y + 5, null, null, "center");
doc.text("Assinatura do Colaborador", 157, y + 5, null, null, "center");

doc.save(`RH_${data.type}_${data.targetName.replace(/\s+/g, '_')}.pdf`);


};

// --- SUBMISSÃO ---
const handleSubmit = async (e) => {
e.preventDefault();
setLoading(true);
try {
let targetName, storeName;

  if (targetType === 'supervisor') {
    const sup = supervisors.find(s => s.id === form.targetId);
    targetName = sup?.name || 'Desconhecido';
    storeName = `Regional ${sup?.clusterId || ''}`;
  } else {
    targetName = attendants.find(a => a.id === form.targetId)?.name || 'Desconhecido';
    storeName = stores.find(s => s.id === form.storeId)?.name || 'Geral';
  }

  const requestData = {
    type: requestType,
    ...form,
    targetName,
    targetRole: targetType,
    storeName,
    supervisorId: auth.currentUser.uid,
    supervisorName: userData.name,
    status: 'Enviado',
    createdAt: serverTimestamp()
  };

  await addDoc(collection(db, "rh_requests"), requestData);
  generatePDF(requestData);

  alert("Solicitação salva! O PDF foi gerado. Agora, envie-o manualmente para rh@oquei.net.br");
  setForm({ targetId: '', storeId: '', reason: '', description: '', dateEvent: new Date().toISOString().split('T')[0], atestadoDays: '', cid: '' });
  await fetchHistory();
  setActiveTab('historico');
} catch (err) { alert(err.message); }
setLoading(false);


};

return (
<div style={styles.container}>
<div style={styles.header}>
<div style={styles.iconHeader}><FileCheck size={24} color="white"/></div>
<div>
<h1 style={styles.title}>Solicitações RH</h1>
<p style={styles.subtitle}>Formalização e envio de documentos para o setor administrativo.</p>
</div>
</div>

  <div style={styles.tabs}>
    <button onClick={() => setActiveTab('nova')} style={activeTab === 'nova' ? styles.tabActive : styles.tab}>
      <FileText size={18} /> Novo Documento
    </button>
    <button onClick={() => setActiveTab('historico')} style={activeTab === 'historico' ? styles.tabActive : styles.tab}>
      <History size={18} /> {isCoordinator ? 'Monitoramento Global' : 'Meu Histórico'}
    </button>
  </div>

  <div style={styles.content}>
    {activeTab === 'nova' ? (
      <div style={{animation: 'fadeIn 0.3s'}}>
        
        <div style={styles.rhInstructions}>
          <Mail size={20} color="#1e40af" />
          <p>Após gerar o PDF, envie o arquivo manualmente para: <strong>rh@oquei.net.br</strong></p>
        </div>

        {isCoordinator && (
          <div style={styles.targetSelector}>
             <span style={styles.label}>Tipo de Colaborador:</span>
             <div style={{display:'flex', gap:'15px'}}>
                <label style={styles.radio}><input type="radio" checked={targetType === 'atendente'} onChange={() => setTargetType('atendente')} /> Atendente</label>
                <label style={styles.radio}><input type="radio" checked={targetType === 'supervisor'} onChange={() => setTargetType('supervisor')} /> Supervisor</label>
             </div>
          </div>
        )}

        <div style={styles.typeGrid}>
          {Object.entries(REQUEST_TYPES).map(([key, data]) => (
            <button key={key} type="button" onClick={() => setRequestType(key)} style={{...styles.typeCard, borderColor: requestType === key ? data.color : 'transparent', backgroundColor: requestType === key ? data.bg : '#f8fafc'}}>
              <data.icon size={20} color={data.color} />
              <span style={{fontWeight:'bold', fontSize:'13px'}}>{data.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.row}>
            {targetType === 'atendente' ? (
              <>
                <div style={styles.field}><label style={styles.label}>Loja</label><select style={styles.input} value={form.storeId} onChange={handleStoreChange} required><option value="">Selecione...</option>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <div style={styles.field}><label style={styles.label}>Colaborador</label><select style={styles.input} value={form.targetId} onChange={e => setForm({...form, targetId: e.target.value})} required disabled={!form.storeId}><option value="">Selecione...</option>{attendants.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
              </>
            ) : (
              <div style={{...styles.field, gridColumn:'1/-1'}}><label style={styles.label}>Supervisor Alvo</label><select style={styles.input} value={form.targetId} onChange={e => setForm({...form, targetId: e.target.value})} required><option value="">Selecione...</option>{supervisors.map(s => <option key={s.id} value={s.id}>{s.name} ({s.clusterId})</option>)}</select></div>
            )}
          </div>

          <div style={styles.row}>
            <div style={styles.field}><label style={styles.label}>Data do Fato</label><input type="date" style={styles.input} value={form.dateEvent} onChange={e => setForm({...form, dateEvent: e.target.value})} required /></div>
            {requestType === 'atestado' ? (
               <>
                 <div style={styles.field}><label style={styles.label}>Qtd. Dias</label><input type="number" style={styles.input} value={form.atestadoDays} onChange={e => setForm({...form, atestadoDays: e.target.value})} required /></div>
                 <div style={styles.field}><label style={styles.label}>CID (Opcional)</label><input style={styles.input} value={form.cid} onChange={e => setForm({...form, cid: e.target.value})} /></div>
               </>
            ) : (
              <div style={styles.field}><label style={styles.label}>Motivo Principal</label><select style={styles.input} value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} required><option value="">Selecione...</option><option>Insubordinação</option><option>Faltas/Atrasos</option><option>Desempenho</option><option>Conduta</option><option>Outros</option></select></div>
            )}
          </div>

          <div style={styles.field}><label style={styles.label}>Relatório / Descrição Detalhada</label><textarea style={{...styles.input, height:'100px'}} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Descreva os detalhes para o RH..." required /></div>

          <button type="submit" style={{...styles.btnPrimary, backgroundColor: currentType.color}} disabled={loading}>{loading ? 'Processando...' : 'Salvar e Gerar PDF'}</button>
        </form>
      </div>
    ) : (
      <div style={{animation: 'fadeIn 0.3s'}}>
        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead><tr style={styles.thRow}><th style={styles.th}>Data</th><th style={styles.th}>Tipo</th><th style={styles.th}>Colaborador</th><th style={styles.th}>Solicitante</th><th style={styles.th}>Ação</th></tr></thead>
            <tbody>
              {historyList.map(item => (
                <tr key={item.id} style={styles.tr}>
                  <td style={styles.td}>{item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : '-'}</td>
                  <td style={styles.td}><span style={{...styles.badge, color: REQUEST_TYPES[item.type]?.color || '#64748b'}}>{REQUEST_TYPES[item.type]?.label || item.type}</span></td>
                  <td style={styles.td}><strong>{item.targetName}</strong><br/><small>{item.storeName}</small></td>
                  <td style={styles.td}>{item.supervisorName}</td>
                  <td style={styles.td}><button onClick={() => generatePDF(item)} style={styles.btnMini}><Download size={14}/> PDF</button></td>
                </tr>
              ))}
              {historyList.length === 0 && <tr><td colSpan="5" style={{padding:'40px', textAlign:'center', color:'#94a3b8'}}>Nenhuma solicitação encontrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
</div>


);
}

const styles = {
container: { maxWidth: '900px', margin: '0 auto', fontFamily: 'sans-serif' },
header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '30px' },
iconHeader: { background: '#db2777', padding: '12px', borderRadius: '12px' },
title: { fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#1e293b' },
subtitle: { fontSize: '14px', color: '#64748b', margin: 0 },
tabs: { display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '1px solid #e2e8f0' },
tab: { padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontWeight: '600' },
tabActive: { padding: '12px 20px', background: 'none', border: 'none', borderBottom: '3px solid #db2777', cursor: 'pointer', color: '#db2777', fontWeight: 'bold' },
content: { background: 'white', padding: '30px', borderRadius: '20px', border: '1px solid #e2e8f0' },
rhInstructions: { background: '#eff6ff', border: '1px solid #bfdbfe', padding: '15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px', fontSize: '13px', color: '#1e40af' },
targetSelector: { marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '20px' },
radio: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' },
typeGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '25px' },
typeCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '15px', border: '2px solid', borderRadius: '12px', cursor: 'pointer', transition: '0.2s' },
form: { display: 'flex', flexDirection: 'column', gap: '20px' },
row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
field: { display: 'flex', flexDirection: 'column', gap: '5px' },
label: { fontSize: '12px', fontWeight: 'bold', color: '#475569' },
input: { padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' },
btnPrimary: { color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' },
tableCard: { border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' },
table: { width: '100%', borderCollapse: 'collapse' },
thRow: { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
th: { padding: '12px 15px', textAlign: 'left', fontSize: '11px', color: '#64748b', textTransform: 'uppercase' },
tr: { borderBottom: '1px solid #f1f5f9' },
td: { padding: '12px 15px', fontSize: '14px' },
badge: { fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' },
btnMini: { padding: '5px 10px', borderRadius: '6px', background: '#f1f5f9', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }
};