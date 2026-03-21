// ============================================================
//  DesencaixeAtendente.jsx — Oquei Gestão
//  Sistema de Desencaixe — Visão Responsável Financeiro (Atendente/Gerente)
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import {
  collection, query, where, getDocs, addDoc, updateDoc,
  serverTimestamp, deleteDoc, doc, writeBatch
} from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  Wallet, TrendingDown, FileText, Trash2, UploadCloud,
  CheckCircle, AlertTriangle, Download, Eye, Edit3,
  Receipt, X, History, BarChart3, Archive
} from 'lucide-react';

import {
  Page, Card, KpiCard, DataTable, Btn, Badge,
  Input, Select, Tabs, StatRow, Modal, InfoBox, Empty
} from '../components/ui';
import { colors, moeda, data as formatData } from '../globalStyles';

const CATEGORIAS = [
  'Luz','Água','Limpeza','Manutenção','Marketing',
  'Bonificação','Material Técnico','Combustível','Outros'
];

function nomePadrao(supplier, date, amount) {
  const s = String(supplier || 'fornecedor').replace(/[^a-zA-Z0-9]/g, '_');
  const d = String(date || '').replace(/-/g, '');
  const v = String(amount || '0').replace('.', '-');
  return `${s}-${d}-${v}`;
}

export default function DesencaixeAtendente({ userData }) {
  const [loading, setLoading]         = useState(false);
  const [activeTab, setActiveTab]     = useState('Lançamentos');
  const [expenses, setExpenses]       = useState([]);
  const [cycles, setCycles]           = useState([]);
  const [designacaoLoja, setDesignacaoLoja] = useState(null); // loja designada ao user

  const [form, setForm] = useState({
    description: '', amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '', supplier: '', recibo: '', authorizedBy: ''
  });
  const [comprovanteBase64, setComprovanteBase64] = useState(null);
  const [comprovanteNome, setComprovanteNome]     = useState('');
  const [editingExpense, setEditingExpense]        = useState(null);
  const [previewUrl, setPreviewUrl]               = useState(null);

  // ── Conferência ───────────────────────────────────────────
  const [conferencia, setConferencia] = useState({ systemValue: '', cashValue: '' });

  // ─────────────────────────────────────────────────────────
  // LOAD
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userData?.uid) return;
    loadInitialData();
  }, [userData]);

  const loadInitialData = async () => {
    try {
      // Busca se este user tem uma designação (foi designado como responsável de alguma loja)
      const qDesig = query(
        collection(db, 'petty_cash_designacoes'),
        where('userId', '==', auth.currentUser.uid)
      );
      const snapDesig = await getDocs(qDesig);
      if (!snapDesig.empty) {
        setDesignacaoLoja(snapDesig.docs[0].data());
      }
    } catch (err) { console.error(err); }
    await fetchExpenses();
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      // Notas abertas lançadas por este atendente
      const qOpen = query(
        collection(db, 'petty_cash'),
        where('attendantId', '==', auth.currentUser.uid),
        where('status', '==', 'open')
      );
      const snapOpen = await getDocs(qOpen);
      const list = snapOpen.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses(list);

      // Ciclos fechados por este atendente
      const qCycles = query(
        collection(db, 'petty_cash_cycles'),
        where('attendantId', '==', auth.currentUser.uid)
      );
      const snapCycles = await getDocs(qCycles);
      setCycles(snapCycles.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
        const da = a.closedAt?.toDate ? a.closedAt.toDate() : new Date(a.closedAt || 0);
        const db2 = b.closedAt?.toDate ? b.closedAt.toDate() : new Date(b.closedAt || 0);
        return db2 - da;
      }));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  // ── MÉTRICAS ──────────────────────────────────────────────
  const totalDespesas   = useMemo(() => expenses.reduce((a, c) => a + parseFloat(c.amount || 0), 0), [expenses]);
  const totalHistorico  = useMemo(() => cycles.reduce((a, c) => a + (c.totalExpenses || 0), 0), [cycles]);
  const diffConferencia = useMemo(() => {
    const sistema = parseFloat(conferencia.systemValue) || 0;
    const fisico  = parseFloat(conferencia.cashValue) || 0;
    return (fisico + totalDespesas) - sistema;
  }, [conferencia, totalDespesas]);

  // ─────────────────────────────────────────────────────────
  // LANÇAMENTO
  // ─────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) return window.alert('Informe um valor válido.');
    setLoading(true);
    try {
      const storeId   = designacaoLoja?.cityId   || userData.cityId   || 'Geral';
      const storeName = designacaoLoja?.cityName  || userData.cityName || storeId;

      const payload = {
        ...form,
        amount: parseFloat(form.amount),
        storeId, storeName,
        attendantId: auth.currentUser.uid,
        attendantName: userData.name,
        // supervisorId herdado da designação ou campo padrão
        supervisorId: designacaoLoja?.supervisorId || 'pendente',
        status: 'open',
        comprovante: comprovanteBase64 || null,
        comprovanteNome: comprovanteBase64 ? nomePadrao(form.supplier, form.date, form.amount) : null,
        updatedAt: serverTimestamp(),
      };

      if (editingExpense) {
        await updateDoc(doc(db, 'petty_cash', editingExpense.id), payload);
        setEditingExpense(null);
        window.showToast?.('Lançamento atualizado!');
      } else {
        await addDoc(collection(db, 'petty_cash'), { ...payload, createdAt: serverTimestamp() });
        window.showToast?.('Lançamento registrado!');
      }

      setForm({ description:'', amount:'', date: new Date().toISOString().split('T')[0],
        category:'', supplier:'', recibo:'', authorizedBy:'' });
      setComprovanteBase64(null); setComprovanteNome('');
      fetchExpenses();
    } catch (err) { window.alert(err.message); }
    setLoading(false);
  };

  const handleEditExpense = (exp) => {
    setEditingExpense(exp);
    setForm({ description: exp.description, amount: exp.amount, date: exp.date,
      category: exp.category||'', supplier: exp.supplier||'', recibo: exp.recibo||'',
      authorizedBy: exp.authorizedBy||'' });
    setComprovanteBase64(exp.comprovante || null);
    setComprovanteNome(exp.comprovanteNome || '');
    setActiveTab('Lançamentos');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Excluir este lançamento?')) return;
    await deleteDoc(doc(db, 'petty_cash', id));
    fetchExpenses();
    window.showToast?.('Removido.', 'warning');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { setComprovanteBase64(reader.result); setComprovanteNome(file.name); };
    reader.readAsDataURL(file);
  };

  const handleDownloadComprovante = (exp) => {
    if (!exp.comprovante) return;
    const link = document.createElement('a');
    link.href = exp.comprovante;
    link.download = `${nomePadrao(exp.supplier, exp.date, exp.amount)}.${exp.comprovante.includes('pdf') ? 'pdf' : 'jpg'}`;
    link.click();
  };

  // ── RECIBO PDF ────────────────────────────────────────────
  const gerarReciboPDF = (exp) => {
    const pdf = new jsPDF();
    pdf.setFontSize(18); pdf.setFont('helvetica', 'bold');
    pdf.text('RECIBO DE PAGAMENTO', 105, 25, { align: 'center' });
    pdf.setFontSize(11); pdf.setFont('helvetica', 'normal');
    pdf.text('Oquei Telecom', 105, 35, { align: 'center' });
    pdf.line(20, 42, 190, 42);
    pdf.setFontSize(12); pdf.setFont('helvetica', 'bold');
    pdf.text(`Valor: ${moeda(exp.amount)}`, 20, 55);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Fornecedor: ${exp.supplier || '___________________________'}`, 20, 67);
    pdf.text(`Descrição: ${exp.description}`, 20, 79);
    pdf.text(`Categoria: ${exp.category || '—'}`, 20, 91);
    pdf.text(`Loja: ${exp.storeName || exp.storeId}`, 20, 103);
    pdf.text(`Data: ${exp.date}`, 20, 115);
    pdf.text(`Nº Recibo/NF: ${exp.recibo || 'SN'}`, 20, 127);
    pdf.text(`Autorizado por: ${exp.authorizedBy || '—'}`, 20, 139);
    pdf.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 151);
    pdf.line(20, 165, 190, 165);
    pdf.text('Assinatura do Fornecedor: _________________________________', 20, 178);
    pdf.text('Assinatura do Responsável: ________________________________', 20, 192);
    pdf.setFontSize(9); pdf.setTextColor(150);
    pdf.text('Documento gerado pelo sistema Oquei Gestão — uso interno', 105, 210, { align: 'center' });
    pdf.save(`Recibo_${nomePadrao(exp.supplier, exp.date, exp.amount)}.pdf`);
    window.showToast?.('Recibo gerado!');
  };

  // ── FECHAMENTO ────────────────────────────────────────────
  const handleGerarRelatorio = () => {
    const pdf = new jsPDF();
    pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
    pdf.text('Relatório de Desencaixe', 14, 18);
    pdf.setFontSize(10); pdf.setFont('helvetica', 'normal');
    pdf.text(`Responsável: ${userData.name}`, 14, 27);
    pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 34);
    autoTable(pdf, {
      startY: 42,
      head: [['Data','Fornecedor','Descrição','Categoria','Valor']],
      body: expenses.map(e => [formatData(e.date), e.supplier, e.description, e.category||'—', moeda(e.amount)]),
      headStyles: { fillColor: [5, 150, 105] },
      foot: [['','','','TOTAL', moeda(totalDespesas)]],
      footStyles: { fillColor: [5, 150, 105], fontStyle: 'bold' },
    });
    pdf.save(`Relatorio_Desencaixe_${new Date().toISOString().split('T')[0]}.pdf`);
    window.showToast?.('PDF gerado!');
  };

  const handleCloseCycle = async () => {
    if (expenses.length === 0) return window.alert('Nenhuma nota em aberto para fechar.');
    if (!window.confirm('Encerrar este ciclo e enviá-lo ao histórico?')) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const cycleRef = doc(collection(db, 'petty_cash_cycles'));
      batch.set(cycleRef, {
        attendantId: auth.currentUser.uid,
        attendantName: userData.name,
        supervisorId: designacaoLoja?.supervisorId || 'pendente',
        closedAt: new Date(),
        totalExpenses: totalDespesas,
        systemBalance: parseFloat(conferencia.systemValue) || 0,
        physicalCash:  parseFloat(conferencia.cashValue) || 0,
        difference: diffConferencia,
        itemCount: expenses.length,
        itemsSnapshot: expenses,
        storeId: expenses[0]?.storeId || 'Geral',
      });
      expenses.forEach(exp =>
        batch.update(doc(db, 'petty_cash', exp.id), { status: 'closed', cycleId: cycleRef.id }));
      await batch.commit();
      setConferencia({ systemValue:'', cashValue:'' });
      fetchExpenses(); setActiveTab('Histórico');
      window.showToast?.('Ciclo encerrado com sucesso!');
    } catch (err) { window.alert(err.message); }
    setLoading(false);
  };

  // ── ZIP ───────────────────────────────────────────────────
  const handleDownloadZIP = async (lista, filename) => {
    const zip = new JSZip();
    const folder = zip.folder('Comprovantes');
    const pdf = new jsPDF();
    pdf.setFontSize(14); pdf.text('Relatório de Desencaixe', 14, 18);
    autoTable(pdf, {
      startY: 28,
      head: [['Data','Fornecedor','Descrição','Valor']],
      body: lista.map(e => [formatData(e.date), e.supplier, e.description, moeda(e.amount)]),
      headStyles: { fillColor: [5, 150, 105] },
    });
    zip.file('Relatorio.pdf', pdf.output('blob'));
    lista.forEach(exp => {
      if (exp.comprovante) {
        const base64 = exp.comprovante.split(',')[1];
        const ext = exp.comprovante.includes('pdf') ? 'pdf' : 'jpg';
        folder.file(`${nomePadrao(exp.supplier, exp.date, exp.amount)}.${ext}`, base64, { base64: true });
      }
    });
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${filename}.zip`);
    window.showToast?.('ZIP gerado!');
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <Page title="Caixa da Loja" subtitle={`Gerencie as despesas e comprovantes da unidade ${designacaoLoja?.cityId || userData?.cityId || ''}.`}>

      {/* Banner de designação */}
      {designacaoLoja ? (
        <div style={{
          background: `${colors.success}10`, border: `1px solid ${colors.success}40`,
          borderLeft: `4px solid ${colors.success}`, borderRadius: '12px',
          padding: '13px 18px', display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <CheckCircle size={16} color={colors.success} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: 'var(--text-main)' }}>
            Você é o <strong>Responsável Financeiro</strong> designado para a loja <strong>{designacaoLoja.cityId}</strong>.
            Seus lançamentos serão visíveis ao supervisor.
          </span>
        </div>
      ) : (
        <InfoBox type="warning">
          <strong>Atenção:</strong> Você ainda não foi designado como responsável financeiro de nenhuma loja.
          Solicite ao seu supervisor que faça a designação em "Desencaixe › Designações".
        </InfoBox>
      )}

      <InfoBox type="warning">
        Todo lançamento exige um comprovante válido. Solicite sempre a fatura ou recibo assinado pelo fornecedor.
      </InfoBox>

      <Tabs tabs={['Lançamentos','Conferência','Histórico']} active={activeTab} onChange={setActiveTab} />

      {/* ─── LANÇAMENTOS ─── */}
      {activeTab === 'Lançamentos' && (
        <div className="animated-view">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'16px', marginBottom:'24px' }}>
            <KpiCard label="Total no Ciclo" valor={moeda(totalDespesas)} icon={<TrendingDown size={20}/>} accent={colors.danger} />
            <KpiCard label="Notas Abertas" valor={expenses.length} icon={<FileText size={20}/>} accent={colors.primary} />
            <KpiCard label="Com Comprovante" valor={expenses.filter(e=>e.comprovante).length} icon={<Receipt size={20}/>} accent={colors.success} />
            <KpiCard label="Sem Comprovante" valor={expenses.filter(e=>!e.comprovante).length} icon={<AlertTriangle size={20}/>} accent={colors.warning} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap:'24px', alignItems:'start' }}>
            {/* Formulário */}
            <Card title={editingExpense ? '✏️ Editando Lançamento' : 'Adicionar Despesa'} accent={editingExpense ? colors.warning : colors.success}>
              <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                <Input label="Valor Pago (R$)" type="number" step="0.01" min="0.01"
                  value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                  <Input label="Data" type="date" value={form.date}
                    onChange={e => setForm({...form, date: e.target.value})} required />
                  <Input label="Nº Recibo/NF" placeholder="5412" value={form.recibo}
                    onChange={e => setForm({...form, recibo: e.target.value})} />
                </div>

                <Input label="O que foi pago?" placeholder="Ex: Tonner para Impressora"
                  value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />

                <Input label="Fornecedor / Onde comprou?" placeholder="Nome do local"
                  value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} required />

                <Input label="Quem autorizou?" placeholder="Nome do gestor"
                  value={form.authorizedBy} onChange={e => setForm({...form, authorizedBy: e.target.value})} required />

                <Select label="Categoria" value={form.category}
                  onChange={e => setForm({...form, category: e.target.value})}
                  options={CATEGORIAS.map(c => ({value:c, label:c}))} placeholder="Selecione..." />

                {/* Upload */}
                <div>
                  <p style={{ fontSize:'11px', fontWeight:'800', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'6px' }}>Comprovante *</p>
                  <label style={{
                    border: `2px dashed ${comprovanteBase64 ? colors.success : 'var(--border)'}`,
                    padding: '14px', borderRadius: '10px', textAlign: 'center', display: 'block', cursor: 'pointer',
                    background: comprovanteBase64 ? `${colors.success}08` : 'transparent',
                  }}>
                    <input type="file" hidden onChange={handleFileUpload} accept="image/*,application/pdf" />
                    <UploadCloud size={20} color={comprovanteBase64 ? colors.success : 'var(--text-muted)'} style={{ margin: '0 auto 6px' }} />
                    <p style={{ fontSize:'12px', margin:0, fontWeight:'700', color: comprovanteBase64 ? colors.success : 'var(--text-muted)' }}>
                      {comprovanteBase64 ? `✅ ${comprovanteNome || 'Arquivo Anexado'}` : 'Clique para anexar foto do recibo'}
                    </p>
                  </label>
                </div>

                <div style={{ display:'flex', gap:'8px' }}>
                  <Btn type="submit" loading={loading} style={{ flex:1 }}>
                    {editingExpense ? 'Salvar Alterações' : 'Registrar Lançamento'}
                  </Btn>
                  {editingExpense && (
                    <Btn variant="secondary" onClick={() => {
                      setEditingExpense(null);
                      setForm({ description:'', amount:'', date: new Date().toISOString().split('T')[0], category:'', supplier:'', recibo:'', authorizedBy:'' });
                      setComprovanteBase64(null); setComprovanteNome('');
                    }}><X size={14}/></Btn>
                  )}
                </div>
              </form>
            </Card>

            {/* Lista de despesas */}
            <Card title="Meus Lançamentos (Abertos)"
              actions={
                <div style={{ display:'flex', gap:'8px' }}>
                  <Btn variant="secondary" size="sm" onClick={handleGerarRelatorio}><FileText size={14}/> PDF</Btn>
                  <Btn variant="secondary" size="sm" onClick={() => handleDownloadZIP(expenses, 'Pack_Atual')}><Archive size={14}/> ZIP</Btn>
                </div>
              }
            >
              <DataTable loading={loading} emptyMsg="Nenhuma despesa registrada neste ciclo."
                columns={[
                  { key:'date', label:'Data', render: v => formatData(v) },
                  { key:'supplier', label:'Fornecedor' },
                  { key:'description', label:'Descrição', render: v => <span style={{ color:'var(--text-muted)', fontSize:'12px' }}>{v}</span> },
                  { key:'amount', label:'Valor', render: v => <strong style={{ color:colors.danger }}>-{moeda(v)}</strong> },
                  { key:'comprovante', label:'Anexo', render: (v, row) =>
                    v ? <Btn variant="ghost" size="sm" onClick={() => setPreviewUrl(v)}><Eye size={13} color={colors.primary}/></Btn>
                      : <Badge cor="warning">Pendente</Badge>
                  },
                  { key:'actions', label:'Ações', render: (_, row) => (
                    <div style={{ display:'flex', gap:'4px', justifyContent:'flex-end' }}>
                      <Btn variant="secondary" size="sm" onClick={() => gerarReciboPDF(row)} title="Gerar Recibo"><Receipt size={13}/></Btn>
                      {row.comprovante && (
                        <Btn variant="secondary" size="sm" onClick={() => handleDownloadComprovante(row)} title="Baixar Comprovante"><Download size={13}/></Btn>
                      )}
                      <Btn variant="secondary" size="sm" onClick={() => handleEditExpense(row)} title="Editar"><Edit3 size={13} color={colors.warning}/></Btn>
                      <Btn variant="ghost" size="sm" onClick={() => handleDeleteExpense(row.id)} title="Excluir"><Trash2 size={13} color={colors.danger}/></Btn>
                    </div>
                  )},
                ]}
                data={expenses}
              />
              {expenses.length > 0 && (
                <div style={{ display:'flex', justifyContent:'flex-end', padding:'12px 18px 0', borderTop:'1px solid var(--border)', marginTop: 0 }}>
                  <strong style={{ color:colors.danger, fontSize:'15px' }}>Total: {moeda(totalDespesas)}</strong>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ─── CONFERÊNCIA ─── */}
      {activeTab === 'Conferência' && (
        <div className="animated-view" style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          <InfoBox type="info">
            Use este painel para conferir se o dinheiro físico bate com os lançamentos.
            Fórmula: <strong>(Dinheiro Físico + Notas Lançadas) − Saldo Inicial = Diferença</strong>
          </InfoBox>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px' }}>
            <Card title="Resumo do Caixa" accent={colors.success}>
              <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                <div style={{ background:'var(--bg-app)', padding:'16px', borderRadius:'12px' }}>
                  <StatRow label="(-) Total de Notas Lançadas" value={moeda(totalDespesas)} />
                  <StatRow label="Saldo Informado no Sistema" value={moeda(parseFloat(conferencia.systemValue)||0)} />
                  <StatRow label="Dinheiro Físico em Mãos" value={moeda(parseFloat(conferencia.cashValue)||0)} />
                </div>
                <div style={{
                  textAlign:'center', padding:'36px 20px', borderRadius:'16px',
                  background: conferencia.systemValue ? (diffConferencia===0 ? `${colors.success}10` : `${colors.danger}08`) : 'var(--bg-panel)',
                  border: `2px dashed ${conferencia.systemValue ? (diffConferencia===0 ? colors.success : colors.danger) : 'var(--border)'}40`,
                }}>
                  <p style={{ fontSize:'11px', fontWeight:'800', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px' }}>
                    Diferença Final Apurada
                  </p>
                  <p style={{ fontSize:'52px', fontWeight:'900', margin:'0 0 12px', letterSpacing:'-0.03em',
                    color: conferencia.systemValue ? (diffConferencia===0 ? colors.success : colors.danger) : 'var(--text-muted)'
                  }}>{moeda(diffConferencia)}</p>
                  {conferencia.systemValue && (
                    <Badge cor={diffConferencia===0?'success':'danger'}>
                      {diffConferencia===0 ? '✅ Caixa Batido!' : '⚠️ Diferença no Caixa'}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>

            <Card title="Informar Valores e Fechar Ciclo">
              <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
                <Input label="1. Saldo no Sistema (Centralizador)" type="number" step="0.01"
                  value={conferencia.systemValue} placeholder="0,00"
                  onChange={e => setConferencia({...conferencia, systemValue: e.target.value})} />
                <Input label="2. Dinheiro Físico em Mãos" type="number" step="0.01"
                  value={conferencia.cashValue} placeholder="0,00"
                  onChange={e => setConferencia({...conferencia, cashValue: e.target.value})} />

                <div style={{ background:'var(--bg-app)', padding:'12px', borderRadius:'10px', fontSize:'12px', color:'var(--text-muted)', lineHeight:1.6 }}>
                  Após conferir, clique em "Encerrar Ciclo" para arquivar as notas e gerar o relatório para o setor financeiro.
                </div>

                <Btn style={{ height:'52px' }} onClick={handleCloseCycle}
                  disabled={!conferencia.systemValue || expenses.length===0 || loading} loading={loading}>
                  <CheckCircle size={18} style={{ marginRight:'8px' }}/> Encerrar e Arquivar Ciclo
                </Btn>

                <Btn variant="secondary" style={{ height:'44px' }} onClick={handleGerarRelatorio}>
                  <FileText size={16} style={{ marginRight:'8px' }}/> Gerar PDF sem Fechar
                </Btn>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ─── HISTÓRICO ─── */}
      {activeTab === 'Histórico' && (
        <div className="animated-view" style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'16px' }}>
            <KpiCard label="Total Acumulado" valor={moeda(totalHistorico)} icon={<BarChart3 size={20}/>} accent={colors.success} />
            <KpiCard label="Ciclos Fechados" valor={cycles.length} icon={<History size={20}/>} accent={colors.info} />
          </div>
          <Card title="Histórico de Fechamentos">
            <DataTable loading={loading} emptyMsg="Nenhum ciclo fechado ainda." columns={[
              { key:'closedAt', label:'Data Fechamento', render: v => formatData(v?.toDate ? v.toDate() : v) },
              { key:'itemCount', label:'Notas', render: v => <strong>{v} itens</strong> },
              { key:'totalExpenses', label:'Total', render: v => moeda(v) },
              { key:'difference', label:'Diferença', render: v => <Badge cor={v===0?'success':'danger'}>{moeda(v)}</Badge> },
              { key:'actions', label:'Ações', render: (_, row) => (
                <Btn variant="secondary" size="sm"
                  onClick={() => handleDownloadZIP(row.itemsSnapshot||[], `Ciclo_${row.id}`)}
                  title="Baixar Pack ZIP">
                  <Download size={15}/> ZIP
                </Btn>
              )},
            ]} data={cycles} />
          </Card>
        </div>
      )}

      {/* ─── MODAL PREVIEW COMPROVANTE ─── */}
      <Modal open={!!previewUrl} onClose={() => setPreviewUrl(null)} title="Visualizar Comprovante" size="lg">
        {previewUrl && (
          previewUrl.includes('application/pdf')
            ? <iframe src={previewUrl} style={{ width:'100%', height:'500px', border:'none', borderRadius:'8px' }} />
            : <img src={previewUrl} alt="Comprovante" style={{ width:'100%', maxHeight:'500px', objectFit:'contain', borderRadius:'8px' }} />
        )}
      </Modal>
    </Page>
  );
}