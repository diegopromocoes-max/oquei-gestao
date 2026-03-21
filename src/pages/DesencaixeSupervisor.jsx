// ============================================================
//  DesencaixeSupervisor.jsx — Oquei Gestão
//  Sistema de Desencaixe — Visão Supervisor / Coordenador
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import {
  collection, query, where, getDocs, addDoc, updateDoc,
  serverTimestamp, deleteDoc, doc, writeBatch, setDoc
} from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  TrendingDown, FileText, Trash2, UploadCloud, History,
  CheckCircle, AlertTriangle, Archive, Download, Undo2,
  BarChart3, Receipt, Database, Upload, Store,
  AlertCircle, UserCheck, FileSpreadsheet, Eye, X, Edit3,

} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

import {
  Page, Card, KpiCard, DataTable, Btn, Badge,
  Input, Select, Tabs, StatRow, Modal, InfoBox, Spinner, Empty
} from '../components/ui';
import { colors, moeda, data as formatData } from '../globalStyles';

// ─── Constantes ───────────────────────────────────────────────
const CATEGORIAS_DEFAULT = [
  'Luz','Água','Limpeza','Manutenção','Marketing',
  'Bonificação','Material Técnico','Combustível','Outros'
];
const ALERTA_DIAS = 7;

const CHART_COLORS = [
  colors.primary, colors.success, colors.warning, colors.danger,
  colors.purple, colors.info, colors.rose, colors.amber,
  '#06d6a0','#118ab2','#ffd166','#ef476f',
];

// ─── Helpers ──────────────────────────────────────────────────
function diasDesdeUltimoFechamento(cycles, storeId) {
  const lista = cycles.filter(c => c.storeId === storeId);
  if (!lista.length) return null;
  const ultimo = lista.sort((a, b) => {
    const da = a.closedAt?.toDate ? a.closedAt.toDate() : new Date(a.closedAt || 0);
    const db2 = b.closedAt?.toDate ? b.closedAt.toDate() : new Date(b.closedAt || 0);
    return db2 - da;
  })[0];
  const dt = ultimo.closedAt?.toDate ? ultimo.closedAt.toDate() : new Date(ultimo.closedAt);
  return Math.floor((Date.now() - dt.getTime()) / 86400000);
}

function nomePadrao(supplier, date, amount) {
  const s = String(supplier || 'fornecedor').replace(/[^a-zA-Z0-9]/g, '_');
  const d = String(date || '').replace(/-/g, '');
  const v = String(amount || '0').replace('.', '-');
  return `${s}-${d}-${v}`;
}

function mesAno(dateStr) {
  if (!dateStr) return '—';
  const [y, m] = String(dateStr).split('-');
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${nomes[parseInt(m,10)-1]}/${y?.slice(2)}`;
}

// ─── Tooltip customizado para Recharts ───────────────────────
const TooltipCustom = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'10px', padding:'10px 14px', fontSize:'12px' }}>
      <p style={{ fontWeight:'800', color:'var(--text-main)', margin:'0 0 6px' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin:'2px 0', fontWeight:'700' }}>
          {p.name}: {moeda(p.value)}
        </p>
      ))}
    </div>
  );
};

// ─── Sub-navegação dos dashboards ────────────────────────────
const DASH_TABS = [
  { id: 'tabela',       label: '📋 Tabela',            icon: FileText },
  { id: 'geral',        label: '🏪 Geral de Lojas',    icon: Store },
  { id: 'loja',         label: '📈 Análise de Loja',   icon: TrendingUp },
  { id: 'mensal',       label: '📅 Análise Mensal',    icon: Calendar },
  { id: 'fornecedor',   label: '🤝 Fornecedores',      icon: Users },
  { id: 'categoria',    label: '🏷️ Tipo de Despesa',   icon: Tag },
];

// ─────────────────────────────────────────────────────────────
export default function DesencaixeSupervisor({ userData, modoGestao = false }) {
  // ── Estado principal ──────────────────────────────────────
  const [loading, setLoading]         = useState(false);
  const [activeTab, setActiveTab]     = useState(modoGestao ? 'Gestão Financeira' : 'Lançamentos');
  const [dashTab, setDashTab]         = useState('tabela');
  const [cities, setCities]           = useState([]);
  const [allUsers, setAllUsers]       = useState([]);
  const [expenses, setExpenses]       = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [cycles, setCycles]           = useState([]);
  const [designacoes, setDesignacoes] = useState({});

  // ── Banco de fornecedores e categorias ────────────────────
  const [fornecedoresSalvos, setFornecedoresSalvos] = useState([]);
  const [categoriasSalvas, setCategoriasSalvas]     = useState([...CATEGORIAS_DEFAULT]);

  // ── Formulário ────────────────────────────────────────────
  const [form, setForm] = useState({
    description: '', amount: '',
    date: new Date().toISOString().split('T')[0],
    storeId: '', category: '', supplier: '', recibo: ''
  });
  const [comprovanteBase64, setComprovanteBase64] = useState(null);
  const [comprovanteNome, setComprovanteNome]     = useState('');
  const [editingExpense, setEditingExpense]        = useState(null);
  const [conferencia, setConferencia]             = useState({ systemValue: '', cashValue: '' });
  const [previewUrl, setPreviewUrl]               = useState(null);

  // ── Filtros da tabela (dropdowns) ─────────────────────────
  const [filtros, setFiltros] = useState({
    loja: '', fornecedor: '', categoria: '', status: '', ordenacao: 'data'
  });

  // ── Filtros dos dashboards ────────────────────────────────
  const [dashFiltroLoja,       setDashFiltroLoja]       = useState('');
  const [dashFiltroCluster,    setDashFiltroCluster]    = useState('');
  const [dashFiltroFornLoja,   setDashFiltroFornLoja]   = useState('');
  const [dashFiltroFornCluster,setDashFiltroFornCluster]= useState('');
  const [dashFiltroCatLoja,    setDashFiltroCatLoja]    = useState('');
  const [dashFiltroCatCluster, setDashFiltroCatCluster] = useState('');

  // ── Clusters derivados das cidades ───────────────────────
  const clusters = useMemo(() =>
    [...new Set(cities.map(c => c.clusterId).filter(Boolean))], [cities]);

  // ─────────────────────────────────────────────────────────
  useEffect(() => { if (userData?.uid) loadInitialData(); }, [userData]);

  const loadInitialData = async () => {
    try {
      const qCities = userData.clusterId
        ? query(collection(db, 'cities'), where('clusterId', '==', userData.clusterId))
        : collection(db, 'cities');
      const snapCities = await getDocs(qCities);
      setCities(snapCities.docs.map(d => ({ id: d.id, ...d.data() })));

      const snapUsers = await getDocs(collection(db, 'users'));
      setAllUsers(snapUsers.docs.map(d => ({ id: d.id, ...d.data() })));

      const snapDesig = await getDocs(
        query(collection(db, 'petty_cash_designacoes'),
          where('supervisorId', '==', auth.currentUser.uid))
      );
      const desigMap = {};
      snapDesig.docs.forEach(d => { desigMap[d.data().cityId] = d.data().userId; });
      setDesignacoes(desigMap);

      // Banco de fornecedores
      const snapForn = await getDocs(
        query(collection(db, 'petty_cash_fornecedores'),
          where('supervisorId', '==', auth.currentUser.uid))
      );
      setFornecedoresSalvos(snapForn.docs.map(d => d.data().nome).filter(Boolean).sort());

      // Banco de categorias
      const snapCat = await getDocs(
        query(collection(db, 'petty_cash_categorias'),
          where('supervisorId', '==', auth.currentUser.uid))
      );
      const catsSalvas = snapCat.docs.map(d => d.data().nome).filter(Boolean);
      const catsMerge  = [...new Set([...CATEGORIAS_DEFAULT, ...catsSalvas])].sort();
      setCategoriasSalvas(catsMerge);

      await fetchExpenses();
    } catch (err) { console.error('loadInitialData:', err); }
  };

  const fetchExpenses = async () => {
    if (!auth.currentUser?.uid) return;
    setLoading(true);
    try {
      const qOpen = query(collection(db, 'petty_cash'),
        where('supervisorId', '==', auth.currentUser.uid), where('status', '==', 'open'));
      setExpenses((await getDocs(qOpen)).docs.map(d => ({ id: d.id, ...d.data() })));

      const qAll = query(collection(db, 'petty_cash'),
        where('supervisorId', '==', auth.currentUser.uid));
      setAllExpenses((await getDocs(qAll)).docs.map(d => ({ id: d.id, ...d.data() })));

      const qCycles = query(collection(db, 'petty_cash_cycles'),
        where('supervisorId', '==', auth.currentUser.uid));
      setCycles((await getDocs(qCycles)).docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
        const da  = a.closedAt?.toDate ? a.closedAt.toDate() : new Date(a.closedAt || 0);
        const db2 = b.closedAt?.toDate ? b.closedAt.toDate() : new Date(b.closedAt || 0);
        return db2 - da;
      }));
    } catch (err) { console.error('fetchExpenses:', err); }
    setLoading(false);
  };

  // ─── Salvar fornecedor/categoria no Firestore ─────────────
  const salvarFornecedor = async (nome) => {
    if (!nome || fornecedoresSalvos.includes(nome)) return;
    try {
      await addDoc(collection(db, 'petty_cash_fornecedores'), {
        nome, supervisorId: auth.currentUser.uid, criadoEm: serverTimestamp()
      });
      setFornecedoresSalvos(prev => [...new Set([...prev, nome])].sort());
    } catch (_) {}
  };

  const salvarCategoria = async (nome) => {
    if (!nome || categoriasSalvas.includes(nome)) return;
    try {
      await addDoc(collection(db, 'petty_cash_categorias'), {
        nome, supervisorId: auth.currentUser.uid, criadoEm: serverTimestamp()
      });
      setCategoriasSalvas(prev => [...new Set([...prev, nome])].sort());
    } catch (_) {}
  };

  // ─── Métricas ─────────────────────────────────────────────
  const totalDespesas   = useMemo(() => expenses.reduce((a, c) => a + parseFloat(c.amount || 0), 0), [expenses]);
  const totalHistorico  = useMemo(() => cycles.reduce((a, c) => a + (c.totalExpenses || 0), 0), [cycles]);
  const diffConferencia = useMemo(() => {
    const s = parseFloat(conferencia.systemValue) || 0;
    const f = parseFloat(conferencia.cashValue) || 0;
    return (f + totalDespesas) - s;
  }, [conferencia, totalDespesas]);

  const lojasAlerta = useMemo(() => cities.filter(city => {
    const dias = diasDesdeUltimoFechamento(cycles, city.id);
    if (dias === null) return allExpenses.some(e => e.storeId === city.id && e.status === 'open');
    return dias >= ALERTA_DIAS;
  }), [cities, cycles, allExpenses]);

  // ─── Opções únicas para selects de filtro ────────────────
  const lojaOpcoes    = useMemo(() => [...new Set(allExpenses.map(e => e.storeName || e.storeId).filter(Boolean))].sort(), [allExpenses]);
  const fornOpcoes    = useMemo(() => [...new Set(allExpenses.map(e => e.supplier).filter(Boolean))].sort(), [allExpenses]);
  const catOpcoes     = useMemo(() => [...new Set(allExpenses.map(e => e.category).filter(Boolean))].sort(), [allExpenses]);
  const statusOpcoes  = [{ value:'open', label:'Aberto' }, { value:'closed', label:'Fechado' }];

  // ─── Despesas filtradas (tabela) ──────────────────────────
  const despesasFiltradas = useMemo(() => {
    let list = [...allExpenses];
    if (filtros.loja)       list = list.filter(e => (e.storeName || e.storeId) === filtros.loja);
    if (filtros.fornecedor) list = list.filter(e => e.supplier === filtros.fornecedor);
    if (filtros.categoria)  list = list.filter(e => e.category === filtros.categoria);
    if (filtros.status)     list = list.filter(e => e.status === filtros.status);
    if (filtros.ordenacao === 'data')  list.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (filtros.ordenacao === 'valor') list.sort((a, b) => b.amount - a.amount);
    return list;
  }, [allExpenses, filtros]);

  const totalFiltrado = useMemo(() => despesasFiltradas.reduce((a, c) => a + parseFloat(c.amount || 0), 0), [despesasFiltradas]);

  // ─── Dados dos Dashboards ─────────────────────────────────

  // 1. Geral de Lojas — participação % de cada loja
  const dadosGeralLojas = useMemo(() => {
    const mapa = {};
    allExpenses.forEach(e => {
      const nome = e.storeName || e.storeId || 'Sem loja';
      mapa[nome] = (mapa[nome] || 0) + parseFloat(e.amount || 0);
    });
    const total = Object.values(mapa).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(mapa)
      .map(([name, value]) => ({ name, value, pct: ((value / total) * 100).toFixed(1) }))
      .sort((a, b) => b.value - a.value);
  }, [allExpenses]);

  // 2. Análise por loja — evolução diária
  const dadosEvolucaoLoja = useMemo(() => {
    const base = dashFiltroLoja
      ? allExpenses.filter(e => (e.storeName || e.storeId) === dashFiltroLoja)
      : allExpenses;
    const mapa = {};
    base.forEach(e => {
      if (!e.date) return;
      mapa[e.date] = (mapa[e.date] || 0) + parseFloat(e.amount || 0);
    });
    return Object.entries(mapa)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({ date: formatData(date), total }));
  }, [allExpenses, dashFiltroLoja]);

  // 3. Análise mensal — gastos por mês (linha horizontal)
  const dadosMensais = useMemo(() => {
    const filtro = dashFiltroCluster
      ? allExpenses.filter(e => {
          const city = cities.find(c => c.id === e.storeId || c.name === e.storeName);
          return city?.clusterId === dashFiltroCluster;
        })
      : allExpenses;
    const mapa = {};
    filtro.forEach(e => {
      const chave = e.date ? e.date.slice(0, 7) : null;
      if (!chave) return;
      mapa[chave] = (mapa[chave] || 0) + parseFloat(e.amount || 0);
    });
    return Object.entries(mapa)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, total]) => ({ mes: mesAno(mes + '-01'), total }));
  }, [allExpenses, dashFiltroCluster, cities]);

  // 4. Análise de fornecedores — top 10
  const dadosFornecedores = useMemo(() => {
    let base = [...allExpenses];
    if (dashFiltroFornLoja)    base = base.filter(e => (e.storeName || e.storeId) === dashFiltroFornLoja);
    if (dashFiltroFornCluster) base = base.filter(e => {
      const city = cities.find(c => c.id === e.storeId || c.name === e.storeName);
      return city?.clusterId === dashFiltroFornCluster;
    });
    const mapa = {};
    base.forEach(e => {
      if (!e.supplier) return;
      mapa[e.supplier] = (mapa[e.supplier] || 0) + parseFloat(e.amount || 0);
    });
    return Object.entries(mapa)
      .sort(([,a],[,b]) => b - a)
      .slice(0, 10)
      .map(([name, total]) => ({ name, total }));
  }, [allExpenses, dashFiltroFornLoja, dashFiltroFornCluster, cities]);

  // 5. Análise de tipo de despesa — por categoria
  const dadosCategorias = useMemo(() => {
    let base = [...allExpenses];
    if (dashFiltroCatLoja)    base = base.filter(e => (e.storeName || e.storeId) === dashFiltroCatLoja);
    if (dashFiltroCatCluster) base = base.filter(e => {
      const city = cities.find(c => c.id === e.storeId || c.name === e.storeName);
      return city?.clusterId === dashFiltroCatCluster;
    });
    const mapa = {};
    base.forEach(e => {
      const cat = e.category || 'Sem categoria';
      mapa[cat] = (mapa[cat] || 0) + parseFloat(e.amount || 0);
    });
    const total = Object.values(mapa).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(mapa)
      .sort(([,a],[,b]) => b - a)
      .map(([name, value]) => ({ name, value, pct: ((value / total) * 100).toFixed(1) }));
  }, [allExpenses, dashFiltroCatLoja, dashFiltroCatCluster, cities]);

  // ─── Handlers de lançamento ───────────────────────────────
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!form.storeId) return window.alert('Selecione a loja.');
    setLoading(true);
    try {
      const storeName = form.storeId === 'Geral'
        ? 'Geral/Cluster'
        : cities.find(c => c.id === form.storeId)?.name || 'Geral';
      const payload = {
        ...form, amount: parseFloat(form.amount), storeName,
        supervisorId: auth.currentUser.uid, supervisorName: userData.name,
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
        window.showToast?.('Despesa lançada!');
      }
      // Salvar fornecedor e categoria no banco
      if (form.supplier) await salvarFornecedor(form.supplier);
      if (form.category) await salvarCategoria(form.category);

      setForm({ description:'', amount:'', date: new Date().toISOString().split('T')[0], storeId: form.storeId, category:'', supplier:'', recibo:'' });
      setComprovanteBase64(null); setComprovanteNome('');
      fetchExpenses();
    } catch (err) { window.alert(err.message); }
    setLoading(false);
  };

  const handleEditExpense = (exp) => {
    setEditingExpense(exp);
    setForm({ description: exp.description, amount: exp.amount, date: exp.date,
      storeId: exp.storeId, category: exp.category||'', supplier: exp.supplier, recibo: exp.recibo||'' });
    setComprovanteBase64(exp.comprovante || null);
    setComprovanteNome(exp.comprovanteNome || '');
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

  // ─── Recibo PDF ───────────────────────────────────────────
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
    pdf.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 139);
    pdf.line(20, 155, 190, 155);
    pdf.text('Assinatura do Fornecedor: _________________________________', 20, 168);
    pdf.text('Assinatura do Responsável: ________________________________', 20, 182);
    pdf.setFontSize(9); pdf.setTextColor(150);
    pdf.text('Documento gerado pelo sistema Oquei Gestão — uso interno', 105, 200, { align: 'center' });
    pdf.save(`Recibo_${nomePadrao(exp.supplier, exp.date, exp.amount)}.pdf`);
    window.showToast?.('Recibo gerado!');
  };

  // ─── Ciclo ────────────────────────────────────────────────
  const handleGerarRelatorio = () => {
    const pdf = new jsPDF();
    pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
    pdf.text('Relatório de Desencaixe', 14, 18);
    pdf.setFontSize(10); pdf.setFont('helvetica', 'normal');
    pdf.text(`Supervisor: ${userData.name}  |  Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 27);
    autoTable(pdf, {
      startY: 34,
      head: [['Data','Fornecedor','Descrição','Categoria','Loja','Valor']],
      body: expenses.map(e => [formatData(e.date), e.supplier, e.description, e.category||'—', e.storeName||e.storeId, moeda(e.amount)]),
      headStyles: { fillColor: [37, 99, 235] },
      foot: [['','','','','TOTAL', moeda(totalDespesas)]],
      footStyles: { fillColor: [37, 99, 235], fontStyle: 'bold' },
    });
    pdf.save(`Relatorio_Desencaixe_${new Date().toISOString().split('T')[0]}.pdf`);
    window.showToast?.('PDF gerado!');
  };

  const handleCloseCycle = async () => {
    if (!window.confirm('Encerrar este ciclo e arquivá-lo no histórico?')) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const cycleRef = doc(collection(db, 'petty_cash_cycles'));
      batch.set(cycleRef, {
        supervisorId: auth.currentUser.uid, supervisorName: userData.name,
        closedAt: new Date(), totalExpenses: totalDespesas,
        systemBalance: parseFloat(conferencia.systemValue) || 0,
        physicalCash: parseFloat(conferencia.cashValue) || 0,
        difference: diffConferencia, itemCount: expenses.length,
        itemsSnapshot: expenses, storeId: expenses[0]?.storeId || 'Geral',
      });
      expenses.forEach(exp => batch.update(doc(db, 'petty_cash', exp.id), { status: 'closed', cycleId: cycleRef.id }));
      await batch.commit();
      setConferencia({ systemValue:'', cashValue:'' });
      fetchExpenses(); setActiveTab('Histórico');
      window.showToast?.('Ciclo encerrado!');
    } catch (err) { window.alert(err.message); }
    setLoading(false);
  };

  const handleRevertCycle = async (cycle) => {
    if (!window.confirm('ESTORNO: As notas voltarão para lançamentos e o ciclo será excluído. Continuar?')) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      (cycle.itemsSnapshot || []).forEach(item =>
        batch.update(doc(db, 'petty_cash', item.id), { status: 'open', cycleId: null }));
      batch.delete(doc(db, 'petty_cash_cycles', cycle.id));
      await batch.commit();
      fetchExpenses(); setActiveTab(modoGestao ? 'Gestão Financeira' : 'Lançamentos');
      window.showToast?.('Ciclo estornado.', 'warning');
    } catch (err) { window.alert(err.message); }
    setLoading(false);
  };

  // ─── ZIP ──────────────────────────────────────────────────
  const handleDownloadZIP = async (lista, filename) => {
    const zip = new JSZip(); const folder = zip.folder('Comprovantes');
    const pdf = new jsPDF(); pdf.setFontSize(14); pdf.text('Relatório de Desencaixe', 14, 18);
    autoTable(pdf, { startY: 28, head: [['Data','Fornecedor','Descrição','Valor']],
      body: lista.map(e => [formatData(e.date), e.supplier, e.description, moeda(e.amount)]),
      headStyles: { fillColor: [5, 150, 105] } });
    zip.file('Relatorio.pdf', pdf.output('blob'));
    lista.forEach(exp => {
      if (exp.comprovante) {
        const b64 = exp.comprovante.split(',')[1];
        const ext = exp.comprovante.includes('pdf') ? 'pdf' : 'jpg';
        folder.file(`${nomePadrao(exp.supplier, exp.date, exp.amount)}.${ext}`, b64, { base64: true });
      }
    });
    saveAs(await zip.generateAsync({ type: 'blob' }), `${filename}.zip`);
    window.showToast?.('ZIP gerado!');
  };

  // ─── CSV ──────────────────────────────────────────────────
  const handleExportCSV = () => {
    const header = ['Data','Fornecedor','Descrição','Categoria','Loja','Cluster','Valor','Status','Nº Recibo'];
    const rows = despesasFiltradas.map(e => [
      e.date, e.supplier, e.description, e.category||'',
      e.storeName||e.storeId, userData.clusterId||'', e.amount, e.status, e.recibo||''
    ]);
    saveAs(new Blob(['\uFEFF' + [header,...rows].map(r => r.join(';')).join('\n')], { type: 'text/csv;charset=utf-8;' }),
      `Despesas_${new Date().toISOString().split('T')[0]}.csv`);
    window.showToast?.('CSV exportado!');
  };

  // ─── Designações ──────────────────────────────────────────
  const handleDesignar = async (cityId, userId) => {
    try {
      const q = query(collection(db, 'petty_cash_designacoes'),
        where('supervisorId', '==', auth.currentUser.uid), where('cityId', '==', cityId));
      const snap = await getDocs(q);
      if (snap.empty) {
        await addDoc(collection(db, 'petty_cash_designacoes'), {
          supervisorId: auth.currentUser.uid, cityId, userId, updatedAt: serverTimestamp()
        });
      } else {
        await updateDoc(doc(db, 'petty_cash_designacoes', snap.docs[0].id), { userId, updatedAt: serverTimestamp() });
      }
      setDesignacoes(prev => ({ ...prev, [cityId]: userId }));
      window.showToast?.('Responsável designado!');
    } catch (err) { window.alert(err.message); }
  };

  // ─── Backup ───────────────────────────────────────────────
  const exportarBackupJSON = () => {
    saveAs(new Blob([JSON.stringify({
      tipo: 'BACKUP_DESENCAIXE_OQUEI', dataExportacao: new Date().toISOString(),
      supervisor: userData.name, dados: { expenses, cycles }
    }, null, 2)], { type: 'application/json' }),
    `Backup_Desencaixe_${userData.name?.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.json`);
  };

  const importarBackupJSON = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const json = JSON.parse(ev.target.result);
        if (json.tipo !== 'BACKUP_DESENCAIXE_OQUEI') throw new Error('Arquivo inválido.');
        if (!window.confirm(`Importar ${json.dados.expenses.length} notas e ${json.dados.cycles.length} ciclos?`)) return;
        setLoading(true);
        const batch = writeBatch(db);
        json.dados.expenses.forEach(item => { const { id, ...d } = item; batch.set(doc(collection(db, 'petty_cash')), { ...d, supervisorId: auth.currentUser.uid, status: 'open' }); });
        json.dados.cycles.forEach(item => { const { id, ...d } = item; batch.set(doc(collection(db, 'petty_cash_cycles')), { ...d, supervisorId: auth.currentUser.uid }); });
        await batch.commit(); fetchExpenses(); window.showToast?.('Backup restaurado!');
      } catch (err) { window.alert('Erro: ' + err.message); }
      finally { setLoading(false); }
    };
    reader.readAsText(file); e.target.value = '';
  };

  // ─── Componente select de filtro de dashboard ─────────────
  const FiltroSelect = ({ label, value, onChange, opcoes, placeholder = 'Todos' }) => (
    <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
      <p style={{ fontSize:'11px', fontWeight:'800', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', margin:0 }}>{label}</p>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ padding:'8px 12px', borderRadius:'8px', border:'1px solid var(--border)',
          background:'var(--bg-input)', color:'var(--text-main)', fontSize:'13px',
          fontFamily:'inherit', cursor:'pointer', minWidth:'160px' }}>
        <option value="">{placeholder}</option>
        {opcoes.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  // ─── Sub-tabs dos dashboards ──────────────────────────────
  const DashSubTabs = () => (
    <div style={{ display:'flex', gap:'4px', flexWrap:'wrap', padding:'4px 0' }}>
      {DASH_TABS.map(t => (
        <button key={t.id} onClick={() => setDashTab(t.id)} style={{
          padding:'7px 14px', borderRadius:'20px', border:'none', cursor:'pointer',
          fontFamily:'inherit', fontSize:'12px', fontWeight:'700',
          background: dashTab === t.id ? 'var(--text-brand,#2563eb)' : 'var(--bg-panel)',
          color:       dashTab === t.id ? '#fff' : 'var(--text-muted)',
          transition:'all 0.15s',
        }}>{t.label}</button>
      ))}
    </div>
  );

  // ─────────────────────────────────────────────────────────
  // TABS DA PÁGINA
  // ─────────────────────────────────────────────────────────
  const TABS_SUPERVISOR   = ['Lançamentos','Conferência','Gestão Financeira','Histórico','Designações','Backup'];
  const TABS_COORDENADORA = ['Gestão Financeira','Designações','Backup'];

  return (
    <Page title="Desencaixe de Loja" subtitle="Controle financeiro e gestão de caixa das unidades.">

      {/* Alerta de lojas sem fechamento */}
      {lojasAlerta.length > 0 && (
        <div style={{
          background:`${colors.warning}10`, border:`1px solid ${colors.warning}40`,
          borderLeft:`4px solid ${colors.warning}`, borderRadius:'12px',
          padding:'13px 18px', display:'flex', alignItems:'center', gap:'12px',
        }}>
          <AlertTriangle size={18} color={colors.warning} style={{ flexShrink:0 }} />
          <span style={{ fontSize:'13px', color:'var(--text-main)' }}>
            <strong>Atenção:</strong> {lojasAlerta.length} {lojasAlerta.length === 1 ? 'loja está' : 'lojas estão'} há mais de {ALERTA_DIAS} dias sem fechamento:{' '}
            <strong>{lojasAlerta.map(l => l.name).join(', ')}</strong>
          </span>
        </div>
      )}

      <Tabs
        tabs={modoGestao ? TABS_COORDENADORA : TABS_SUPERVISOR}
        active={activeTab}
        onChange={setActiveTab}
      />

      {/* ════════ LANÇAMENTOS ════════ */}
      {activeTab === 'Lançamentos' && (
        <div className="animated-view">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'16px', marginBottom:'24px' }}>
            <KpiCard label="Despesas no Ciclo" valor={moeda(totalDespesas)} icon={<TrendingDown size={20}/>} accent={colors.danger} />
            <KpiCard label="Notas Pendentes"   valor={expenses.length}      icon={<FileText size={20}/>}    accent={colors.primary} />
            <KpiCard label="Com Comprovante"   valor={expenses.filter(e => e.comprovante).length} icon={<Receipt size={20}/>} accent={colors.success} />
            <KpiCard label="Sem Comprovante"   valor={expenses.filter(e => !e.comprovante).length} icon={<AlertCircle size={20}/>} accent={colors.warning} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'340px 1fr', gap:'24px', alignItems:'start' }}>
            {/* Formulário */}
            <Card title={editingExpense ? '✏️ Editando Lançamento' : 'Novo Registro'} accent={editingExpense ? colors.warning : colors.primary}>
              <form onSubmit={handleAddExpense} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                <Input label="Valor (R$)" type="number" step="0.01" min="0.01"
                  value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                  <Input label="Data" type="date" value={form.date}
                    onChange={e => setForm({...form, date: e.target.value})} required />
                  <Input label="Nº Recibo/NF" placeholder="5412" value={form.recibo}
                    onChange={e => setForm({...form, recibo: e.target.value})} />
                </div>

                {/* Fornecedor com datalist */}
                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                  <p style={{ fontSize:'11px', fontWeight:'800', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', margin:0 }}>Fornecedor *</p>
                  <input list="list-fornecedores" value={form.supplier} required
                    onChange={e => setForm({...form, supplier: e.target.value})}
                    placeholder="Digite ou selecione..."
                    style={{ padding:'11px 13px', borderRadius:'9px', border:'1px solid var(--border)', outline:'none', fontSize:'14px', color:'var(--text-main)', background:'var(--bg-input)', width:'100%', boxSizing:'border-box', fontFamily:'inherit' }} />
                  <datalist id="list-fornecedores">
                    {fornecedoresSalvos.map(f => <option key={f} value={f} />)}
                  </datalist>
                </div>

                <Input label="Descrição" placeholder="Ex: Tonner para Impressora" value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})} required />

                <Select label="Loja" value={form.storeId}
                  onChange={e => setForm({...form, storeId: e.target.value})}
                  options={[{value:'Geral',label:'Geral / Cluster'}, ...cities.map(c => ({value:c.id, label:c.name}))]}
                  required />

                {/* Categoria com datalist */}
                <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                  <p style={{ fontSize:'11px', fontWeight:'800', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', margin:0 }}>Categoria</p>
                  <input list="list-categorias" value={form.category}
                    onChange={e => setForm({...form, category: e.target.value})}
                    placeholder="Selecione ou crie..."
                    style={{ padding:'11px 13px', borderRadius:'9px', border:'1px solid var(--border)', outline:'none', fontSize:'14px', color:'var(--text-main)', background:'var(--bg-input)', width:'100%', boxSizing:'border-box', fontFamily:'inherit' }} />
                  <datalist id="list-categorias">
                    {categoriasSalvas.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>

                {/* Upload */}
                <div>
                  <p style={{ fontSize:'11px', fontWeight:'800', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'6px' }}>Comprovante</p>
                  <label style={{
                    border:`2px dashed ${comprovanteBase64 ? colors.success : 'var(--border)'}`,
                    padding:'12px', borderRadius:'10px', textAlign:'center', display:'block', cursor:'pointer',
                    background: comprovanteBase64 ? `${colors.success}08` : 'transparent',
                  }}>
                    <input type="file" hidden onChange={handleFileUpload} accept="image/*,application/pdf" />
                    <UploadCloud size={16} color={comprovanteBase64 ? colors.success : 'var(--text-muted)'} style={{ margin:'0 auto 4px' }} />
                    <p style={{ fontSize:'12px', color: comprovanteBase64 ? colors.success : 'var(--text-muted)', margin:0, fontWeight:'700' }}>
                      {comprovanteBase64 ? `✅ ${comprovanteNome || 'Arquivo Anexado'}` : 'Anexar Comprovante'}
                    </p>
                  </label>
                </div>

                <div style={{ display:'flex', gap:'8px' }}>
                  <Btn type="submit" loading={loading} style={{ flex:1 }}>
                    {editingExpense ? 'Salvar Alterações' : 'Lançar Despesa'}
                  </Btn>
                  {editingExpense && (
                    <Btn variant="secondary" onClick={() => {
                      setEditingExpense(null);
                      setForm({ description:'', amount:'', date: new Date().toISOString().split('T')[0], storeId:'', category:'', supplier:'', recibo:'' });
                      setComprovanteBase64(null); setComprovanteNome('');
                    }}><X size={14}/></Btn>
                  )}
                </div>
              </form>
            </Card>

            {/* Tabela notas abertas */}
            <Card title="Notas em Aberto"
              actions={
                <div style={{ display:'flex', gap:'8px' }}>
                  <Btn variant="secondary" size="sm" onClick={handleGerarRelatorio}><FileText size={14}/> PDF</Btn>
                  <Btn variant="secondary" size="sm" onClick={() => handleDownloadZIP(expenses, 'Pack_Atual')}><Archive size={14}/> ZIP</Btn>
                </div>
              }
            >
              <DataTable loading={loading} emptyMsg="Nenhuma nota em aberto neste ciclo." columns={[
                { key:'date', label:'Data', render: v => formatData(v) },
                { key:'supplier', label:'Fornecedor' },
                { key:'description', label:'Descrição', render: v => <span style={{ color:'var(--text-muted)', fontSize:'12px' }}>{v}</span> },
                { key:'storeName', label:'Loja', render: (v,r) => v||r.storeId },
                { key:'amount', label:'Valor', render: v => <strong style={{ color:colors.danger }}>-{moeda(v)}</strong> },
                { key:'comprovante', label:'Anexo', render: (v, row) =>
                  v ? <Btn variant="ghost" size="sm" onClick={() => setPreviewUrl(v)}><Eye size={13} color={colors.primary}/></Btn>
                    : <Badge cor="warning">Sem anexo</Badge>
                },
                { key:'actions', label:'Ações', render: (_, row) => (
                  <div style={{ display:'flex', gap:'4px', justifyContent:'flex-end' }}>
                    <Btn variant="secondary" size="sm" onClick={() => gerarReciboPDF(row)} title="Recibo"><Receipt size={13}/></Btn>
                    {row.comprovante && <Btn variant="secondary" size="sm" onClick={() => handleDownloadComprovante(row)} title="Baixar"><Download size={13}/></Btn>}
                    <Btn variant="secondary" size="sm" onClick={() => handleEditExpense(row)} title="Editar"><Edit3 size={13} color={colors.warning}/></Btn>
                    <Btn variant="ghost" size="sm" onClick={() => handleDeleteExpense(row.id)} title="Excluir"><Trash2 size={13} color={colors.danger}/></Btn>
                  </div>
                )},
              ]} data={expenses} />
              {expenses.length > 0 && (
                <div style={{ display:'flex', justifyContent:'flex-end', padding:'12px 18px 0', borderTop:'1px solid var(--border)' }}>
                  <strong style={{ color:colors.danger, fontSize:'15px' }}>Total: {moeda(totalDespesas)}</strong>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ════════ CONFERÊNCIA ════════ */}
      {activeTab === 'Conferência' && (
        <div className="animated-view" style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          <InfoBox type="info">
            Fórmula: <strong>(Dinheiro Físico + Soma das Notas Lançadas) − Saldo Inicial = Diferença</strong>. Dados de uso exclusivo do gestor da loja.
          </InfoBox>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px' }}>
            <Card title="Resumo do Caixa" accent={colors.primary}>
              <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                <div style={{ background:'var(--bg-app)', padding:'16px', borderRadius:'12px' }}>
                  <StatRow label="(-) Total de Notas" value={moeda(totalDespesas)} />
                  <StatRow label="Saldo no Sistema"   value={moeda(parseFloat(conferencia.systemValue)||0)} />
                  <StatRow label="Dinheiro Físico"    value={moeda(parseFloat(conferencia.cashValue)||0)} />
                </div>
                <div style={{
                  textAlign:'center', padding:'36px 20px', borderRadius:'16px',
                  background: conferencia.systemValue ? (diffConferencia===0 ? `${colors.success}10` : `${colors.danger}08`) : 'var(--bg-panel)',
                  border: `2px dashed ${conferencia.systemValue ? (diffConferencia===0 ? colors.success : colors.danger) : 'var(--border)'}40`,
                }}>
                  <p style={{ fontSize:'11px', fontWeight:'800', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'8px' }}>Diferença Final</p>
                  <p style={{ fontSize:'52px', fontWeight:'900', margin:'0 0 12px', letterSpacing:'-0.03em',
                    color: conferencia.systemValue ? (diffConferencia===0 ? colors.success : colors.danger) : 'var(--text-muted)'
                  }}>{moeda(diffConferencia)}</p>
                  {conferencia.systemValue && (
                    <Badge cor={diffConferencia===0 ? 'success' : 'danger'}>
                      {diffConferencia===0 ? '✅ Caixa Batido!' : '⚠️ Diferença no Caixa'}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
            <Card title="Informar Valores">
              <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
                <Input label="1. Saldo no Sistema" type="number" step="0.01" placeholder="0,00"
                  value={conferencia.systemValue} onChange={e => setConferencia({...conferencia, systemValue: e.target.value})} />
                <Input label="2. Dinheiro Físico em Mãos" type="number" step="0.01" placeholder="0,00"
                  value={conferencia.cashValue} onChange={e => setConferencia({...conferencia, cashValue: e.target.value})} />
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

      {/* ════════ GESTÃO FINANCEIRA ════════ */}
      {activeTab === 'Gestão Financeira' && (
        <div className="animated-view" style={{ display:'flex', flexDirection:'column', gap:'20px' }}>

          {/* KPIs */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'16px' }}>
            <KpiCard label="Total Geral" valor={moeda(allExpenses.reduce((a,c)=>a+parseFloat(c.amount||0),0))} icon={<BarChart3 size={20}/>} accent={colors.primary} />
            <KpiCard label="Registros" valor={allExpenses.length} icon={<FileText size={20}/>} accent={colors.info} />
            <KpiCard label="Lojas Ativas" valor={new Set(allExpenses.map(e=>e.storeId)).size} icon={<Store size={20}/>} accent={colors.success} />
            <KpiCard label="Lojas em Alerta" valor={lojasAlerta.length} icon={<AlertTriangle size={20}/>} accent={lojasAlerta.length>0 ? colors.warning : colors.neutral} />
          </div>

          {/* Sub-navegação dos dashboards */}
          <DashSubTabs />

          {/* ── Sub-aba: Tabela ── */}
          {dashTab === 'tabela' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <Card>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'12px', alignItems:'end' }}>
                  <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                    <p style={{ fontSize:'11px', fontWeight:'800', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', margin:0 }}>Loja</p>
                    <select value={filtros.loja} onChange={e => setFiltros({...filtros, loja: e.target.value})}
                      style={{ padding:'9px 12px', borderRadius:'8px', border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text-main)', fontSize:'13px', fontFamily:'inherit', cursor:'pointer' }}>
                      <option value="">Todas as lojas</option>
                      {lojaOpcoes.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                    <p style={{ fontSize:'11px', fontWeight:'800', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', margin:0 }}>Fornecedor</p>
                    <select value={filtros.fornecedor} onChange={e => setFiltros({...filtros, fornecedor: e.target.value})}
                      style={{ padding:'9px 12px', borderRadius:'8px', border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text-main)', fontSize:'13px', fontFamily:'inherit', cursor:'pointer' }}>
                      <option value="">Todos os fornecedores</option>
                      {fornOpcoes.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                    <p style={{ fontSize:'11px', fontWeight:'800', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', margin:0 }}>Categoria</p>
                    <select value={filtros.categoria} onChange={e => setFiltros({...filtros, categoria: e.target.value})}
                      style={{ padding:'9px 12px', borderRadius:'8px', border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text-main)', fontSize:'13px', fontFamily:'inherit', cursor:'pointer' }}>
                      <option value="">Todas as categorias</option>
                      {catOpcoes.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                    <p style={{ fontSize:'11px', fontWeight:'800', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', margin:0 }}>Status</p>
                    <select value={filtros.status} onChange={e => setFiltros({...filtros, status: e.target.value})}
                      style={{ padding:'9px 12px', borderRadius:'8px', border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text-main)', fontSize:'13px', fontFamily:'inherit', cursor:'pointer' }}>
                      <option value="">Todos</option>
                      <option value="open">Aberto</option>
                      <option value="closed">Fechado</option>
                    </select>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                    <p style={{ fontSize:'11px', fontWeight:'800', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', margin:0 }}>Ordenar</p>
                    <select value={filtros.ordenacao} onChange={e => setFiltros({...filtros, ordenacao: e.target.value})}
                      style={{ padding:'9px 12px', borderRadius:'8px', border:'1px solid var(--border)', background:'var(--bg-input)', color:'var(--text-main)', fontSize:'13px', fontFamily:'inherit', cursor:'pointer' }}>
                      <option value="data">Data (mais recente)</option>
                      <option value="valor">Valor (maior primeiro)</option>
                    </select>
                  </div>
                  <Btn variant="success" onClick={handleExportCSV} style={{ alignSelf:'flex-end' }}>
                    <FileSpreadsheet size={15}/> CSV
                  </Btn>
                </div>
                {(filtros.loja || filtros.fornecedor || filtros.categoria || filtros.status) && (
                  <div style={{ marginTop:'12px', display:'flex', alignItems:'center', gap:'10px' }}>
                    <span style={{ fontSize:'12px', color:'var(--text-muted)' }}>{despesasFiltradas.length} registros — Total: <strong style={{ color:colors.danger }}>{moeda(totalFiltrado)}</strong></span>
                    <Btn variant="ghost" size="sm" onClick={() => setFiltros({ loja:'', fornecedor:'', categoria:'', status:'', ordenacao:'data' })}>
                      <X size={12}/> Limpar filtros
                    </Btn>
                  </div>
                )}
              </Card>

              <Card title="Tabela Geral de Despesas"
                actions={<Btn variant="secondary" size="sm" onClick={() => handleDownloadZIP(despesasFiltradas,'Pack_Global')}><Archive size={14}/> ZIP</Btn>}
              >
                <DataTable loading={loading} emptyMsg="Nenhuma despesa encontrada." columns={[
                  { key:'date', label:'Data', render: v => formatData(v) },
                  { key:'supplier', label:'Fornecedor' },
                  { key:'description', label:'Descrição', render: v => <span style={{ color:'var(--text-muted)', fontSize:'12px' }}>{v}</span> },
                  { key:'category', label:'Categoria', render: v => v ? <Badge cor="info">{v}</Badge> : '—' },
                  { key:'storeName', label:'Loja', render: (v,r) => v||r.storeId },
                  { key:'amount', label:'Valor', render: v => <strong style={{ color:colors.danger }}>{moeda(v)}</strong> },
                  { key:'status', label:'Status', render: v => <Badge cor={v==='open'?'warning':'success'}>{v==='open'?'Aberto':'Fechado'}</Badge> },
                  { key:'comprovante', label:'Anexo', render: (v, row) =>
                    v ? <Btn variant="ghost" size="sm" onClick={() => handleDownloadComprovante(row)}><Download size={13} color={colors.primary}/></Btn>
                      : <span style={{ color:'var(--text-muted)', fontSize:'12px' }}>—</span>
                  },
                ]} data={despesasFiltradas} />
              </Card>
            </div>
          )}

          {/* ── Sub-aba: Geral de Lojas ── */}
          {dashTab === 'geral' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px' }}>
              <Card title="Participação por Loja" subtitle="% do gasto total de cada unidade">
                {dadosGeralLojas.length === 0 ? <Empty title="Sem dados ainda" /> : (
                  <ResponsiveContainer width="100%" height={340}>
                    <RechartsPie>
                      <Pie data={dadosGeralLojas} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120}
                        label={({ name, pct }) => `${name}: ${pct}%`} labelLine={true}>
                        {dadosGeralLojas.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => moeda(v)} />
                    </RechartsPie>
                  </ResponsiveContainer>
                )}
              </Card>

              <Card title="Ranking de Gastos por Loja">
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {dadosGeralLojas.map((item, i) => (
                    <div key={item.name} style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                      <span style={{ fontSize:'12px', fontWeight:'800', color:'var(--text-muted)', width:'20px', textAlign:'right' }}>{i+1}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                          <span style={{ fontSize:'13px', fontWeight:'700', color:'var(--text-main)' }}>{item.name}</span>
                          <span style={{ fontSize:'13px', fontWeight:'800', color: CHART_COLORS[i % CHART_COLORS.length] }}>{moeda(item.value)}</span>
                        </div>
                        <div style={{ height:'8px', borderRadius:'50px', background:'var(--border)', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${item.pct}%`, borderRadius:'50px', background: CHART_COLORS[i % CHART_COLORS.length], transition:'width 0.6s ease' }} />
                        </div>
                        <span style={{ fontSize:'11px', color:'var(--text-muted)' }}>{item.pct}% do total</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ── Sub-aba: Análise de Loja (evolução diária) ── */}
          {dashTab === 'loja' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <Card>
                <div style={{ display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap' }}>
                  <FiltroSelect label="Loja" value={dashFiltroLoja} onChange={setDashFiltroLoja} opcoes={lojaOpcoes} placeholder="Todas as lojas" />
                </div>
              </Card>
              <Card title={`Evolução Diária de Despesas${dashFiltroLoja ? ` — ${dashFiltroLoja}` : ' (Todas as Lojas)'}`}>
                {dadosEvolucaoLoja.length === 0 ? <Empty title="Sem dados para exibir" /> : (
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart data={dadosEvolucaoLoja} margin={{ top:10, right:20, left:10, bottom:60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize:11, fill:'var(--text-muted)' }} angle={-40} textAnchor="end" height={70} />
                      <YAxis tick={{ fontSize:11, fill:'var(--text-muted)' }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<TooltipCustom />} />
                      <Bar dataKey="total" name="Despesas" fill={colors.danger} radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>
          )}

          {/* ── Sub-aba: Análise Mensal ── */}
          {dashTab === 'mensal' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <Card>
                <div style={{ display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap' }}>
                  {clusters.length > 0 && (
                    <FiltroSelect label="Cluster" value={dashFiltroCluster} onChange={setDashFiltroCluster} opcoes={clusters} placeholder="Todos os clusters" />
                  )}
                </div>
              </Card>
              <Card title="Gastos Mensais das Lojas" subtitle="Evolução horizontal mês a mês">
                {dadosMensais.length === 0 ? <Empty title="Sem dados mensais ainda" /> : (
                  <ResponsiveContainer width="100%" height={360}>
                    <LineChart data={dadosMensais} margin={{ top:10, right:20, left:10, bottom:20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="mes" tick={{ fontSize:12, fill:'var(--text-muted)' }} />
                      <YAxis tick={{ fontSize:11, fill:'var(--text-muted)' }} tickFormatter={v => `R$${(v/1000).toFixed(1)}k`} />
                      <Tooltip content={<TooltipCustom />} />
                      <Legend />
                      <Line type="monotone" dataKey="total" name="Total Mensal" stroke={colors.primary} strokeWidth={2.5} dot={{ fill: colors.primary, r:4 }} activeDot={{ r:6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>
          )}

          {/* ── Sub-aba: Análise de Fornecedores ── */}
          {dashTab === 'fornecedor' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <Card>
                <div style={{ display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap' }}>
                  <FiltroSelect label="Loja" value={dashFiltroFornLoja} onChange={setDashFiltroFornLoja} opcoes={lojaOpcoes} placeholder="Todas as lojas" />
                  {clusters.length > 0 && (
                    <FiltroSelect label="Cluster" value={dashFiltroFornCluster} onChange={setDashFiltroFornCluster} opcoes={clusters} placeholder="Todos os clusters" />
                  )}
                </div>
              </Card>
              <Card title="Top 10 Fornecedores" subtitle="Por volume total gasto">
                {dadosFornecedores.length === 0 ? <Empty title="Sem dados de fornecedores" /> : (
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart data={dadosFornecedores} layout="vertical" margin={{ top:5, right:30, left:120, bottom:5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize:11, fill:'var(--text-muted)' }} tickFormatter={v => `R$${(v/1000).toFixed(1)}k`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize:12, fill:'var(--text-main)', fontWeight:600 }} width={115} />
                      <Tooltip content={<TooltipCustom />} />
                      <Bar dataKey="total" name="Gasto Total" fill={colors.purple} radius={[0,4,4,0]}>
                        {dadosFornecedores.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>
          )}

          {/* ── Sub-aba: Tipo de Despesa ── */}
          {dashTab === 'categoria' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <Card>
                <div style={{ display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap' }}>
                  <FiltroSelect label="Loja" value={dashFiltroCatLoja} onChange={setDashFiltroCatLoja} opcoes={lojaOpcoes} placeholder="Todas as lojas" />
                  {clusters.length > 0 && (
                    <FiltroSelect label="Cluster" value={dashFiltroCatCluster} onChange={setDashFiltroCatCluster} opcoes={clusters} placeholder="Todos os clusters" />
                  )}
                </div>
              </Card>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px' }}>
                <Card title="Distribuição por Categoria">
                  {dadosCategorias.length === 0 ? <Empty title="Sem dados de categorias" /> : (
                    <ResponsiveContainer width="100%" height={320}>
                      <RechartsPie>
                        <Pie data={dadosCategorias} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110}
                          label={({ name, pct }) => `${name}: ${pct}%`}>
                          {dadosCategorias.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={v => moeda(v)} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  )}
                </Card>

                <Card title="Ranking por Categoria">
                  <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                    {dadosCategorias.map((item, i) => (
                      <div key={item.name} style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                        <div style={{ width:'12px', height:'12px', borderRadius:'50%', background: CHART_COLORS[i % CHART_COLORS.length], flexShrink:0 }} />
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                            <span style={{ fontSize:'13px', fontWeight:'700', color:'var(--text-main)' }}>{item.name}</span>
                            <span style={{ fontSize:'13px', fontWeight:'800', color: CHART_COLORS[i % CHART_COLORS.length] }}>{moeda(item.value)}</span>
                          </div>
                          <div style={{ height:'6px', borderRadius:'50px', background:'var(--border)', overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${item.pct}%`, borderRadius:'50px', background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          </div>
                          <span style={{ fontSize:'11px', color:'var(--text-muted)' }}>{item.pct}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ════════ HISTÓRICO (só supervisor) ════════ */}
      {activeTab === 'Histórico' && (
        <div className="animated-view" style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'16px' }}>
            <KpiCard label="Total Acumulado" valor={moeda(totalHistorico)} icon={<BarChart3 size={20}/>} accent={colors.success} />
            <KpiCard label="Ciclos Fechados" valor={cycles.length} icon={<History size={20}/>} accent={colors.info} />
          </div>
          <Card title="Ciclos de Caixa Anteriores">
            <DataTable loading={loading} emptyMsg="Nenhum ciclo fechado ainda." columns={[
              { key:'closedAt', label:'Data Fechamento', render: v => formatData(v?.toDate ? v.toDate() : v) },
              { key:'itemCount', label:'Notas', render: v => <strong>{v} itens</strong> },
              { key:'totalExpenses', label:'Total', render: v => moeda(v) },
              { key:'difference', label:'Diferença', render: v => <Badge cor={v===0 ? 'success':'danger'}>{moeda(v)}</Badge> },
              { key:'actions', label:'Ações', align:'right', render: (_, row) => (
                <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                  <Btn variant="secondary" size="sm" onClick={() => handleDownloadZIP(row.itemsSnapshot||[], `Ciclo_${row.id}`)}><Download size={15}/></Btn>
                  <Btn variant="ghost" size="sm" onClick={() => handleRevertCycle(row)}><Undo2 size={15} color={colors.warning}/></Btn>
                </div>
              )},
            ]} data={cycles} />
          </Card>
        </div>
      )}

      {/* ════════ DESIGNAÇÕES ════════ */}
      {activeTab === 'Designações' && (
        <div className="animated-view" style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
          <InfoBox type="info">
            Designar um responsável financeiro permite que o colaborador faça lançamentos de desencaixe pela tela "Caixa da Loja" em nome da unidade selecionada.
          </InfoBox>
          <Card title="Responsáveis por Unidade" subtitle="Atribua um colaborador como gestor financeiro de cada loja">
            {cities.length === 0 ? (
              <Empty title="Nenhuma loja encontrada" description="Cadastre lojas para poder designar responsáveis." />
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {cities.map(city => {
                  const responsavelId = designacoes[city.id];
                  const responsavel   = allUsers.find(u => u.id === responsavelId);
                  return (
                    <div key={city.id} style={{
                      display:'grid', gridTemplateColumns:'1fr 2fr auto', gap:'16px', alignItems:'center',
                      background:'var(--bg-app)', padding:'14px 18px', borderRadius:'10px', border:'1px solid var(--border)',
                    }}>
                      <div>
                        <p style={{ fontWeight:'800', color:'var(--text-main)', margin:0, fontSize:'14px' }}>{city.name}</p>
                        <p style={{ color:'var(--text-muted)', fontSize:'12px', margin:'2px 0 0' }}>Cluster: {city.clusterId||'—'}</p>
                      </div>
                      <select value={responsavelId||''}
                        onChange={e => e.target.value && handleDesignar(city.id, e.target.value)}
                        style={{ padding:'10px 12px', borderRadius:'8px', border:'1px solid var(--border)',
                          background:'var(--bg-input)', color:'var(--text-main)', fontSize:'13px', fontFamily:'inherit', cursor:'pointer', width:'100%' }}>
                        <option value="">Selecionar responsável...</option>
                        {allUsers
                          .filter(u => ['attendant','atendente','supervisor','coordinator','coordenador'].includes(u.role?.toLowerCase()))
                          .map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                      </select>
                      {responsavel
                        ? <Badge cor="success"><UserCheck size={11} style={{ marginRight:'4px' }}/>{responsavel.name}</Badge>
                        : <Badge cor="neutral">Sem designação</Badge>}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ════════ BACKUP ════════ */}
      {activeTab === 'Backup' && (
        <div className="animated-view" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px' }}>
          <Card title="Exportar Banco de Dados" accent={colors.primary}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', padding:'20px', gap:'16px' }}>
              <div style={{ width:'60px', height:'60px', borderRadius:'50%', background:`${colors.primary}15`, display:'flex', alignItems:'center', justifyContent:'center', color:colors.primary }}><Database size={28}/></div>
              <div>
                <h3 style={{ margin:'0 0 8px', color:'var(--text-main)', fontSize:'15px' }}>Baixar Backup (.json)</h3>
                <p style={{ fontSize:'13px', color:'var(--text-muted)', lineHeight:1.6, margin:0 }}>Exporta lançamentos e histórico de ciclos.</p>
              </div>
              <Btn onClick={exportarBackupJSON} style={{ width:'100%' }}><Download size={16}/> Gerar Arquivo de Backup</Btn>
            </div>
          </Card>
          <Card title="Restaurar Banco de Dados" accent={colors.warning}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', padding:'20px', gap:'16px' }}>
              <div style={{ width:'60px', height:'60px', borderRadius:'50%', background:`${colors.warning}15`, display:'flex', alignItems:'center', justifyContent:'center', color:colors.warning }}><Upload size={28}/></div>
              <div>
                <h3 style={{ margin:'0 0 8px', color:'var(--text-main)', fontSize:'15px' }}>Importar Arquivo</h3>
                <p style={{ fontSize:'13px', color:'var(--text-muted)', lineHeight:1.6, margin:0 }}>
                  Selecione um <strong>.json</strong> gerado anteriormente.{' '}
                  <span style={{ color:colors.danger }}>Os dados serão adicionados ao banco atual.</span>
                </p>
              </div>
              <label style={{ width:'100%', cursor:'pointer' }}>
                <input type="file" accept=".json" hidden onChange={importarBackupJSON} />
                <Btn variant="secondary" style={{ width:'100%', pointerEvents:'none' }}><FileText size={16}/> Selecionar Arquivo de Backup</Btn>
              </label>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Preview Comprovante */}
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