import React, { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  AlertTriangle,
  Archive,
  BarChart3,
  CheckCircle,
  Download,
  Edit3,
  Eye,
  FileText,
  History,
  Receipt,
  Trash2,
  TrendingDown,
  UploadCloud,
  X,
} from 'lucide-react';

import {
  Page,
  Card,
  KpiCard,
  DataTable,
  Btn,
  Badge,
  Input,
  Select,
  Tabs,
  StatRow,
  Modal,
  InfoBox,
} from '../components/ui';
import { colors, moeda, data as formatData } from '../globalStyles';
import {
  closeCashCycle,
  getMyCashDesignation,
  listMyCashCycles,
  listMyOpenCashExpenses,
  removeCashExpense,
  saveCashExpense,
} from '../services/atendenteCashService';

const CATEGORIAS = ['Luz', 'Agua', 'Limpeza', 'Manutencao', 'Marketing', 'Bonificacao', 'Material Tecnico', 'Combustivel', 'Outros'];

function nomePadrao(supplier, date, amount) {
  const safeSupplier = String(supplier || 'fornecedor').replace(/[^a-zA-Z0-9]/g, '_');
  const safeDate = String(date || '').replace(/-/g, '');
  const safeAmount = String(amount || '0').replace('.', '-');
  return `${safeSupplier}-${safeDate}-${safeAmount}`;
}

function InlineAlert({ children }) {
  return (
    <div style={{ background: 'var(--bg-danger-light)', border: '1px solid var(--border-danger)', color: '#b45309', borderRadius: '14px', padding: '14px 16px', marginBottom: '16px', fontSize: '13px' }}>
      {children}
    </div>
  );
}

export default function DesencaixeAtendente({ userData }) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Lancamentos');
  const [expenses, setExpenses] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [designacaoLoja, setDesignacaoLoja] = useState(null);
  const [permissionError, setPermissionError] = useState('');
  const [form, setForm] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    supplier: '',
    recibo: '',
    authorizedBy: '',
  });
  const [comprovanteBase64, setComprovanteBase64] = useState(null);
  const [comprovanteNome, setComprovanteNome] = useState('');
  const [editingExpense, setEditingExpense] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [conferencia, setConferencia] = useState({ systemValue: '', cashValue: '' });

  useEffect(() => {
    if (!userData?.uid) return;
    loadInitialData();
  }, [userData?.uid]);

  const loadInitialData = async () => {
    setLoading(true);
    setPermissionError('');
    try {
      const [designacao, openExpenses, closedCycles] = await Promise.all([
        getMyCashDesignation(userData?.uid),
        listMyOpenCashExpenses(userData?.uid),
        listMyCashCycles(userData?.uid),
      ]);
      setDesignacaoLoja(designacao);
      setExpenses(openExpenses);
      setCycles(closedCycles);
    } catch (error) {
      setPermissionError(error?.code === 'permission-denied' ? 'Sem permissao para operar o caixa da loja.' : 'Nao foi possivel carregar o caixa da loja.');
      setDesignacaoLoja(null);
      setExpenses([]);
      setCycles([]);
    }
    setLoading(false);
  };

  const totalDespesas = useMemo(() => expenses.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0), [expenses]);
  const totalHistorico = useMemo(() => cycles.reduce((sum, item) => sum + (item.totalExpenses || 0), 0), [cycles]);
  const diffConferencia = useMemo(() => {
    const sistema = parseFloat(conferencia.systemValue) || 0;
    const fisico = parseFloat(conferencia.cashValue) || 0;
    return (fisico + totalDespesas) - sistema;
  }, [conferencia, totalDespesas]);

  const resetForm = () => {
    setEditingExpense(null);
    setForm({
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      category: '',
      supplier: '',
      recibo: '',
      authorizedBy: '',
    });
    setComprovanteBase64(null);
    setComprovanteNome('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      window.alert('Informe um valor valido.');
      return;
    }

    setLoading(true);
    setPermissionError('');
    try {
      const storeId = designacaoLoja?.cityId || userData?.cityId || 'Geral';
      const storeName = designacaoLoja?.cityName || userData?.cityName || storeId;

      await saveCashExpense(editingExpense?.id, {
        ...form,
        amount: parseFloat(form.amount),
        storeId,
        storeName,
        attendantId: userData?.uid,
        attendantName: userData?.name,
        supervisorId: designacaoLoja?.supervisorId || 'pendente',
        status: 'open',
        comprovante: comprovanteBase64 || null,
        comprovanteNome: comprovanteBase64 ? nomePadrao(form.supplier, form.date, form.amount) : null,
      });

      window.showToast?.(editingExpense ? 'Lancamento atualizado!' : 'Lancamento registrado!', 'success');
      resetForm();
      await loadInitialData();
    } catch (error) {
      const message = error?.code === 'permission-denied' ? 'Sem permissao para salvar este lancamento.' : 'Nao foi possivel salvar o lancamento.';
      setPermissionError(message);
      window.showToast?.(message, 'error');
    }
    setLoading(false);
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setForm({
      description: expense.description,
      amount: expense.amount,
      date: expense.date,
      category: expense.category || '',
      supplier: expense.supplier || '',
      recibo: expense.recibo || '',
      authorizedBy: expense.authorizedBy || '',
    });
    setComprovanteBase64(expense.comprovante || null);
    setComprovanteNome(expense.comprovanteNome || '');
    setActiveTab('Lancamentos');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Excluir este lancamento?')) return;
    try {
      await removeCashExpense(expenseId);
      await loadInitialData();
      window.showToast?.('Removido.', 'warning');
    } catch (error) {
      const message = error?.code === 'permission-denied' ? 'Sem permissao para excluir este lancamento.' : 'Nao foi possivel excluir o lancamento.';
      setPermissionError(message);
      window.showToast?.(message, 'error');
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setComprovanteBase64(reader.result);
      setComprovanteNome(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadComprovante = (expense) => {
    if (!expense.comprovante) return;
    const link = document.createElement('a');
    link.href = expense.comprovante;
    link.download = `${nomePadrao(expense.supplier, expense.date, expense.amount)}.${expense.comprovante.includes('pdf') ? 'pdf' : 'jpg'}`;
    link.click();
  };

  const gerarReciboPDF = (expense) => {
    const pdf = new jsPDF();
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RECIBO DE PAGAMENTO', 105, 25, { align: 'center' });
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Oquei Telecom', 105, 35, { align: 'center' });
    pdf.line(20, 42, 190, 42);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Valor: ${moeda(expense.amount)}`, 20, 55);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Fornecedor: ${expense.supplier || '___________________________'}`, 20, 67);
    pdf.text(`Descricao: ${expense.description}`, 20, 79);
    pdf.text(`Categoria: ${expense.category || '-'}`, 20, 91);
    pdf.text(`Loja: ${expense.storeName || expense.storeId}`, 20, 103);
    pdf.text(`Data: ${expense.date}`, 20, 115);
    pdf.text(`No. Recibo/NF: ${expense.recibo || 'SN'}`, 20, 127);
    pdf.text(`Autorizado por: ${expense.authorizedBy || '-'}`, 20, 139);
    pdf.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 151);
    pdf.line(20, 165, 190, 165);
    pdf.text('Assinatura do Fornecedor: _________________________________', 20, 178);
    pdf.text('Assinatura do Responsavel: ________________________________', 20, 192);
    pdf.setFontSize(9);
    pdf.setTextColor(150);
    pdf.text('Documento gerado pelo sistema Oquei Gestao - uso interno', 105, 210, { align: 'center' });
    pdf.save(`Recibo_${nomePadrao(expense.supplier, expense.date, expense.amount)}.pdf`);
    window.showToast?.('Recibo gerado!', 'success');
  };

  const handleGerarRelatorio = () => {
    const pdf = new jsPDF();
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Relatorio de Desencaixe', 14, 18);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Responsavel: ${userData?.name}`, 14, 27);
    pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 34);
    autoTable(pdf, {
      startY: 42,
      head: [['Data', 'Fornecedor', 'Descricao', 'Categoria', 'Valor']],
      body: expenses.map((item) => [formatData(item.date), item.supplier, item.description, item.category || '-', moeda(item.amount)]),
      headStyles: { fillColor: [5, 150, 105] },
      foot: [['', '', '', 'TOTAL', moeda(totalDespesas)]],
      footStyles: { fillColor: [5, 150, 105], fontStyle: 'bold' },
    });
    pdf.save(`Relatorio_Desencaixe_${new Date().toISOString().split('T')[0]}.pdf`);
    window.showToast?.('PDF gerado!', 'success');
  };

  const handleCloseCycle = async () => {
    if (!expenses.length) {
      window.alert('Nenhuma nota em aberto para fechar.');
      return;
    }
    if (!window.confirm('Encerrar este ciclo e envia-lo ao historico?')) return;

    setLoading(true);
    try {
      await closeCashCycle({
        uid: userData?.uid,
        userName: userData?.name,
        supervisorId: designacaoLoja?.supervisorId || 'pendente',
        expenses,
        totalExpenses: totalDespesas,
        systemBalance: parseFloat(conferencia.systemValue) || 0,
        physicalCash: parseFloat(conferencia.cashValue) || 0,
        difference: diffConferencia,
        storeId: expenses[0]?.storeId || 'Geral',
      });

      setConferencia({ systemValue: '', cashValue: '' });
      await loadInitialData();
      setActiveTab('Historico');
      window.showToast?.('Ciclo encerrado com sucesso!', 'success');
    } catch (error) {
      const message = error?.code === 'permission-denied' ? 'Sem permissao para fechar este ciclo.' : 'Nao foi possivel fechar o ciclo.';
      setPermissionError(message);
      window.showToast?.(message, 'error');
    }
    setLoading(false);
  };

  const handleDownloadZIP = async (list, filename) => {
    const zip = new JSZip();
    const folder = zip.folder('Comprovantes');
    const pdf = new jsPDF();
    pdf.setFontSize(14);
    pdf.text('Relatorio de Desencaixe', 14, 18);
    autoTable(pdf, {
      startY: 28,
      head: [['Data', 'Fornecedor', 'Descricao', 'Valor']],
      body: list.map((item) => [formatData(item.date), item.supplier, item.description, moeda(item.amount)]),
      headStyles: { fillColor: [5, 150, 105] },
    });
    zip.file('Relatorio.pdf', pdf.output('blob'));

    list.forEach((expense) => {
      if (!expense.comprovante) return;
      const base64 = expense.comprovante.split(',')[1];
      const extension = expense.comprovante.includes('pdf') ? 'pdf' : 'jpg';
      folder.file(`${nomePadrao(expense.supplier, expense.date, expense.amount)}.${extension}`, base64, { base64: true });
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${filename}.zip`);
    window.showToast?.('ZIP gerado!', 'success');
  };

  return (
    <Page title="Caixa da Loja" subtitle={`Gerencie as despesas e comprovantes da unidade ${designacaoLoja?.cityId || userData?.cityId || ''}.`}>
      {permissionError && <InlineAlert>{permissionError}</InlineAlert>}

      {designacaoLoja ? (
        <div style={{ background: `${colors.success}10`, border: `1px solid ${colors.success}40`, borderLeft: `4px solid ${colors.success}`, borderRadius: '12px', padding: '13px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CheckCircle size={16} color={colors.success} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: 'var(--text-main)' }}>
            Voce e o <strong>Responsavel Financeiro</strong> designado para a loja <strong>{designacaoLoja.cityId}</strong>.
          </span>
        </div>
      ) : (
        <InfoBox type="warning">
          <strong>Atencao:</strong> Voce ainda nao foi designado como responsavel financeiro de nenhuma loja.
        </InfoBox>
      )}

      <InfoBox type="warning">
        Todo lancamento exige um comprovante valido. Solicite sempre a fatura ou recibo assinado pelo fornecedor.
      </InfoBox>

      <Tabs tabs={['Lancamentos', 'Conferencia', 'Historico']} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'Lancamentos' && (
        <div className="animated-view">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '16px', marginBottom: '24px' }}>
            <KpiCard label="Total no Ciclo" valor={moeda(totalDespesas)} icon={<TrendingDown size={20} />} accent={colors.danger} />
            <KpiCard label="Notas Abertas" valor={expenses.length} icon={<FileText size={20} />} accent={colors.primary} />
            <KpiCard label="Com Comprovante" valor={expenses.filter((item) => item.comprovante).length} icon={<Receipt size={20} />} accent={colors.success} />
            <KpiCard label="Sem Comprovante" valor={expenses.filter((item) => !item.comprovante).length} icon={<AlertTriangle size={20} />} accent={colors.warning} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px', alignItems: 'start' }}>
            <Card title={editingExpense ? 'Editando Lancamento' : 'Adicionar Despesa'} accent={editingExpense ? colors.warning : colors.success}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Input label="Valor Pago (R$)" type="number" step="0.01" min="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} required />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <Input label="Data" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
                  <Input label="No. Recibo/NF" placeholder="5412" value={form.recibo} onChange={(event) => setForm({ ...form, recibo: event.target.value })} />
                </div>

                <Input label="O que foi pago?" placeholder="Ex: Toner para impressora" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
                <Input label="Fornecedor / Onde comprou?" placeholder="Nome do local" value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} required />
                <Input label="Quem autorizou?" placeholder="Nome do gestor" value={form.authorizedBy} onChange={(event) => setForm({ ...form, authorizedBy: event.target.value })} required />

                <Select label="Categoria" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} options={CATEGORIAS.map((item) => ({ value: item, label: item }))} placeholder="Selecione..." />

                <div>
                  <p style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Comprovante *</p>
                  <label style={{ border: `2px dashed ${comprovanteBase64 ? colors.success : 'var(--border)'}`, padding: '14px', borderRadius: '10px', textAlign: 'center', display: 'block', cursor: 'pointer', background: comprovanteBase64 ? `${colors.success}08` : 'transparent' }}>
                    <input type="file" hidden onChange={handleFileUpload} accept="image/*,application/pdf" />
                    <UploadCloud size={20} color={comprovanteBase64 ? colors.success : 'var(--text-muted)'} style={{ margin: '0 auto 6px' }} />
                    <p style={{ fontSize: '12px', margin: 0, fontWeight: '700', color: comprovanteBase64 ? colors.success : 'var(--text-muted)' }}>
                      {comprovanteBase64 ? `Arquivo anexado: ${comprovanteNome || 'Comprovante'}` : 'Clique para anexar foto do recibo'}
                    </p>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <Btn type="submit" loading={loading} style={{ flex: 1 }}>
                    {editingExpense ? 'Salvar Alteracoes' : 'Registrar Lancamento'}
                  </Btn>
                  {editingExpense && <Btn type="button" variant="secondary" onClick={resetForm}><X size={14} /></Btn>}
                </div>
              </form>
            </Card>

            <Card
              title="Meus Lancamentos (Abertos)"
              actions={(
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Btn variant="secondary" size="sm" onClick={handleGerarRelatorio}><FileText size={14} /> PDF</Btn>
                  <Btn variant="secondary" size="sm" onClick={() => handleDownloadZIP(expenses, 'Pack_Atual')}><Archive size={14} /> ZIP</Btn>
                </div>
              )}
            >
              <DataTable
                loading={loading}
                emptyMsg="Nenhuma despesa registrada neste ciclo."
                columns={[
                  { key: 'date', label: 'Data', render: (value) => formatData(value) },
                  { key: 'supplier', label: 'Fornecedor' },
                  { key: 'description', label: 'Descricao', render: (value) => <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{value}</span> },
                  { key: 'amount', label: 'Valor', render: (value) => <strong style={{ color: colors.danger }}>-{moeda(value)}</strong> },
                  { key: 'comprovante', label: 'Anexo', render: (value) => (value ? <Btn variant="ghost" size="sm" onClick={() => setPreviewUrl(value)}><Eye size={13} color={colors.primary} /></Btn> : <Badge cor="warning">Pendente</Badge>) },
                  {
                    key: 'actions',
                    label: 'Acoes',
                    render: (_, row) => (
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                        <Btn variant="secondary" size="sm" onClick={() => gerarReciboPDF(row)} title="Gerar Recibo"><Receipt size={13} /></Btn>
                        {row.comprovante && <Btn variant="secondary" size="sm" onClick={() => handleDownloadComprovante(row)} title="Baixar Comprovante"><Download size={13} /></Btn>}
                        <Btn variant="secondary" size="sm" onClick={() => handleEditExpense(row)} title="Editar"><Edit3 size={13} color={colors.warning} /></Btn>
                        <Btn variant="ghost" size="sm" onClick={() => handleDeleteExpense(row.id)} title="Excluir"><Trash2 size={13} color={colors.danger} /></Btn>
                      </div>
                    ),
                  },
                ]}
                data={expenses}
              />
              {expenses.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 18px 0', borderTop: '1px solid var(--border)', marginTop: 0 }}>
                  <strong style={{ color: colors.danger, fontSize: '15px' }}>Total: {moeda(totalDespesas)}</strong>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'Conferencia' && (
        <div className="animated-view" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <InfoBox type="info">
            Use este painel para conferir se o dinheiro fisico bate com os lancamentos.
            Formula: <strong>(Dinheiro Fisico + Notas Lancadas) - Saldo Inicial = Diferenca</strong>
          </InfoBox>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <Card title="Resumo do Caixa" accent={colors.success}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'var(--bg-app)', padding: '16px', borderRadius: '12px' }}>
                  <StatRow label="(-) Total de Notas Lancadas" value={moeda(totalDespesas)} />
                  <StatRow label="Saldo Informado no Sistema" value={moeda(parseFloat(conferencia.systemValue) || 0)} />
                  <StatRow label="Dinheiro Fisico em Maos" value={moeda(parseFloat(conferencia.cashValue) || 0)} />
                </div>
                <div style={{ textAlign: 'center', padding: '36px 20px', borderRadius: '16px', background: conferencia.systemValue ? (diffConferencia === 0 ? `${colors.success}10` : `${colors.danger}08`) : 'var(--bg-panel)', border: `2px dashed ${conferencia.systemValue ? (diffConferencia === 0 ? colors.success : colors.danger) : 'var(--border)'}40` }}>
                  <p style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Diferenca Final Apurada</p>
                  <p style={{ fontSize: '52px', fontWeight: '900', margin: '0 0 12px', letterSpacing: '-0.03em', color: conferencia.systemValue ? (diffConferencia === 0 ? colors.success : colors.danger) : 'var(--text-muted)' }}>{moeda(diffConferencia)}</p>
                  {conferencia.systemValue && <Badge cor={diffConferencia === 0 ? 'success' : 'danger'}>{diffConferencia === 0 ? 'Caixa batido' : 'Diferenca no caixa'}</Badge>}
                </div>
              </div>
            </Card>

            <Card title="Informar Valores e Fechar Ciclo">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <Input label="1. Saldo no Sistema (Centralizador)" type="number" step="0.01" value={conferencia.systemValue} placeholder="0,00" onChange={(event) => setConferencia({ ...conferencia, systemValue: event.target.value })} />
                <Input label="2. Dinheiro Fisico em Maos" type="number" step="0.01" value={conferencia.cashValue} placeholder="0,00" onChange={(event) => setConferencia({ ...conferencia, cashValue: event.target.value })} />

                <div style={{ background: 'var(--bg-app)', padding: '12px', borderRadius: '10px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Apos conferir, clique em "Encerrar Ciclo" para arquivar as notas e gerar o relatorio para o setor financeiro.
                </div>

                <Btn style={{ height: '52px' }} onClick={handleCloseCycle} disabled={!conferencia.systemValue || !expenses.length || loading} loading={loading}>
                  <CheckCircle size={18} style={{ marginRight: '8px' }} /> Encerrar e Arquivar Ciclo
                </Btn>

                <Btn variant="secondary" style={{ height: '44px' }} onClick={handleGerarRelatorio}>
                  <FileText size={16} style={{ marginRight: '8px' }} /> Gerar PDF sem Fechar
                </Btn>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'Historico' && (
        <div className="animated-view" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '16px' }}>
            <KpiCard label="Total Acumulado" valor={moeda(totalHistorico)} icon={<BarChart3 size={20} />} accent={colors.success} />
            <KpiCard label="Ciclos Fechados" valor={cycles.length} icon={<History size={20} />} accent={colors.info} />
          </div>
          <Card title="Historico de Fechamentos">
            <DataTable
              loading={loading}
              emptyMsg="Nenhum ciclo fechado ainda."
              columns={[
                { key: 'closedAt', label: 'Data Fechamento', render: (value) => formatData(value?.toDate ? value.toDate() : value) },
                { key: 'itemCount', label: 'Notas', render: (value) => <strong>{value} itens</strong> },
                { key: 'totalExpenses', label: 'Total', render: (value) => moeda(value) },
                { key: 'difference', label: 'Diferenca', render: (value) => <Badge cor={value === 0 ? 'success' : 'danger'}>{moeda(value)}</Badge> },
                {
                  key: 'actions',
                  label: 'Acoes',
                  render: (_, row) => (
                    <Btn variant="secondary" size="sm" onClick={() => handleDownloadZIP(row.itemsSnapshot || [], `Ciclo_${row.id}`)} title="Baixar Pack ZIP">
                      <Download size={15} /> ZIP
                    </Btn>
                  ),
                },
              ]}
              data={cycles}
            />
          </Card>
        </div>
      )}

      <Modal open={!!previewUrl} onClose={() => setPreviewUrl(null)} title="Visualizar Comprovante" size="lg">
        {previewUrl && (
          previewUrl.includes('application/pdf')
            ? <iframe src={previewUrl} style={{ width: '100%', height: '500px', border: 'none', borderRadius: '8px' }} />
            : <img src={previewUrl} alt="Comprovante" style={{ width: '100%', maxHeight: '500px', objectFit: 'contain', borderRadius: '8px' }} />
        )}
      </Modal>
    </Page>
  );
}
