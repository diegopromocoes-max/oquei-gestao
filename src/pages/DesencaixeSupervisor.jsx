import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { jsPDF } from "jspdf";
import { 
  Wallet, TrendingDown, Calendar, FileText, Plus, Trash2, 
  DollarSign, UploadCloud, PieChart, Store, Image, MapPin, 
  Calculator, History, CheckCircle, AlertTriangle, Archive, RefreshCw, BarChart3,
  UserCheck, Tag, Truck, Download
} from 'lucide-react';

// --- SUB-COMPONENTES (Definidos fora para evitar bug de foco) ---

const StatCard = ({ title, value, icon: Icon, color }) => {
  const colors = { 
    orange: { bg: '#fff7ed', txt: '#ea580c' }, 
    blue: { bg: '#eff6ff', txt: '#2563eb' },
    purple: { bg: '#faf5ff', txt: '#7e22ce' } 
  };
  return (
    <div style={styles.statCard}>
      <div style={{padding:'12px', borderRadius:'12px', background: colors[color].bg, color: colors[color].txt}}><Icon size={24} /></div>
      <div><p style={styles.statLabel}>{title}</p><h3 style={styles.statValue}>{value}</h3></div>
    </div>
  );
};

const DashboardView = ({ currentTotal, expenses, cycles, sortedStores, sortedSuppliers, setActiveTab }) => (
  <div style={{animation: 'fadeIn 0.5s'}}>
    <div style={styles.gridStats}>
      <StatCard title="Total Gasto (Ciclo Atual)" value={`R$ ${currentTotal.toFixed(2)}`} icon={DollarSign} color="orange" />
      <StatCard title="Despesas Lançadas" value={expenses.length} icon={FileText} color="blue" />
      <StatCard title="Último Fechamento" value={cycles[0] ? new Date(cycles[0].closedAt?.seconds * 1000).toLocaleDateString() : 'Nunca'} icon={History} color="purple" />
    </div>
    
    <div style={{marginTop: '30px', display: 'flex', gap: '30px', flexWrap: 'wrap'}}>
      <div style={styles.chartCard}>
          <h3 style={styles.sectionTitle}><BarChart3 size={18} /> Gastos por Local</h3>
          <div style={styles.chartContainer}>
            {sortedStores.length === 0 ? <p style={styles.emptyState}>Sem dados.</p> : sortedStores.map((item, idx) => {
              const percent = (item.value / currentTotal) * 100;
              return (
                <div key={idx}>
                  <div style={styles.chartLabel}>
                    <span>{item.name}</span><span>R$ {item.value.toFixed(2)}</span>
                  </div>
                  <div style={styles.chartBarBg}>
                    <div style={{...styles.chartBarFill, width:`${percent}%`, background: idx === 0 ? '#ef4444' : '#3b82f6'}}></div>
                  </div>
                </div>
              )
            })}
          </div>
      </div>

      <div style={styles.chartCard}>
          <h3 style={styles.sectionTitle}><Truck size={18} /> Top Fornecedores</h3>
          <div style={styles.chartContainer}>
            {sortedSuppliers.length === 0 ? <p style={styles.emptyState}>Sem dados.</p> : sortedSuppliers.map((item, idx) => {
              const percent = (item.value / currentTotal) * 100;
              return (
                <div key={idx}>
                  <div style={styles.chartLabel}>
                    <span>{item.name}</span><span>R$ {item.value.toFixed(2)}</span>
                  </div>
                  <div style={styles.chartBarBg}>
                    <div style={{...styles.chartBarFill, width:`${percent}%`, background: '#10b981'}}></div>
                  </div>
                </div>
              )
            })}
          </div>
      </div>
    </div>

    <div style={{marginTop: '30px', display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
      <div style={{flex: 1, background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0'}}>
          <h3 style={styles.sectionTitle}>Últimos Lançamentos</h3>
          {expenses.slice(0, 3).map(e => (
              <div key={e.id} style={{display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9'}}>
                  <div>
                    <p style={{fontSize: '13px', color: '#334155', margin:0, fontWeight:'bold'}}>{e.description}</p>
                    <span style={{fontSize: '11px', color: '#94a3b8'}}>{e.category} • {e.storeName}</span>
                  </div>
                  <span style={{fontSize: '13px', fontWeight: 'bold', color: '#ef4444'}}>- R$ {e.amount.toFixed(2)}</span>
              </div>
          ))}
          <button onClick={() => setActiveTab('despesas')} style={styles.linkBtn}>Ver todos</button>
      </div>
      <div style={{flex: 1, background: '#f0fdf4', padding: '25px', borderRadius: '16px', border: '1px solid #bbf7d0'}}>
          <h3 style={{...styles.sectionTitle, color: '#166534'}}>Fechar Caixa</h3>
          <p style={{fontSize: '13px', color: '#15803d', marginBottom: '15px'}}>Finalize o ciclo atual para arquivar os recibos e zerar o saldo.</p>
          <button onClick={() => setActiveTab('conferencia')} style={{...styles.btnPrimary, width: 'auto', background: '#16a34a'}}>Iniciar Conferência</button>
      </div>
    </div>
  </div>
);

const LancamentosView = ({ 
  form, setForm, handleAddExpense, loading, suppliers, 
  categories, cities, customCategory, setCustomCategory, 
  fileName, handleFileChange, expenses, handleDeleteExpense, exportPdf 
}) => (
  <div style={styles.contentGrid}>
      <div style={styles.formCard}>
        <h3 style={styles.cardTitle}><Plus size={20} color="#059669"/> Novo Lançamento</h3>
        <form onSubmit={handleAddExpense} style={styles.formStack}>
          <div style={styles.row}>
            <div style={styles.field}><label style={styles.label}>Valor (R$)</label><input type="number" step="0.01" style={{...styles.input, fontSize: '18px', fontWeight: 'bold', color: '#059669'}} placeholder="0,00" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required /></div>
            <div style={styles.field}><label style={styles.label}>Data</label><input type="date" style={styles.input} value={form.date} onChange={e => setForm({...form, date: e.target.value})} required /></div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Descrição</label>
            <input style={styles.input} placeholder="Ex: Compra de Detergente" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
          </div>
          <div style={styles.row}>
             <div style={styles.field}>
               <label style={styles.label}>Fornecedor</label>
               <input list="suppliers-list" style={styles.input} placeholder="Nome do Fornecedor" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} required />
               <datalist id="suppliers-list">{suppliers.map((s, i) => <option key={i} value={s} />)}</datalist>
             </div>
             <div style={styles.field}>
               <label style={styles.label}>Autorizado Por</label>
               <input style={styles.input} placeholder="Nome do Superior" value={form.authorizedBy} onChange={e => setForm({...form, authorizedBy: e.target.value})} required />
             </div>
          </div>
          <div style={styles.row}>
             <div style={styles.field}>
               <label style={styles.label}>Vincular à Loja</label>
               <select style={styles.input} value={form.storeId} onChange={e => setForm({...form, storeId: e.target.value})} required>
                 <option value="">Selecione...</option>
                 <option value="Geral">Geral / Cluster</option>
                 {cities.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
               </select>
             </div>
             <div style={styles.field}>
               <label style={styles.label}>Categoria</label>
               <select style={styles.input} value={form.category} onChange={e => setForm({...form, category: e.target.value})} required>
                 <option value="">Selecione...</option>
                 {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
                 <option value="new">+ Criar Nova...</option>
               </select>
             </div>
          </div>
          {form.category === 'new' && (
             <div style={{background: '#f8fafc', padding: '10px', borderRadius: '8px'}}>
               <label style={styles.label}>Nome da Nova Categoria</label>
               <input style={styles.input} value={customCategory} onChange={e => setCustomCategory(e.target.value)} placeholder="Digite a nova categoria..." required />
             </div>
          )}
          <div style={styles.field}><label style={styles.label}>Comprovante</label><label style={styles.uploadBox}><input type="file" style={{display: 'none'}} onChange={handleFileChange} /><UploadCloud size={24} color="#94a3b8" /><span style={{fontSize: '13px', color: '#64748b', marginTop: '5px'}}>{fileName ? fileName : "Foto do Recibo"}</span></label></div>
          <button type="submit" style={styles.btnPrimary} disabled={loading}>{loading ? 'Salvando...' : 'Lançar'}</button>
        </form>
      </div>

      <div style={styles.listCard}>
        <div style={{...styles.listHeader, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h3 style={styles.cardTitle}><TrendingDown size={20} color="#ef4444"/> Despesas Abertas</h3>
          <button onClick={exportPdf} style={{...styles.btnSecondary, fontSize:'12px', padding:'8px 12px', display:'flex', gap:'5px', alignItems:'center'}}>
            <Download size={14}/> Exportar PDF
          </button>
        </div>
        <div style={styles.listBody}>
          {expenses.length === 0 ? <div style={{textAlign: 'center', padding: '40px', color: '#cbd5e1'}}><Wallet size={40} style={{margin: '0 auto 10px', opacity: 0.5}} /><p>Nenhuma despesa neste ciclo.</p></div> : expenses.map(item => (
              <div key={item.id} style={styles.expenseItem}>
                <div style={styles.dateBox}><span style={{fontWeight: 'bold', fontSize: '14px', color: '#64748b'}}>{item.date.split('-')[2]}</span><span style={{fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8'}}>{new Date(item.date).toLocaleString('default', { month: 'short' })}</span></div>
                <div style={{flex: 1}}>
                  <h4 style={{fontSize: '14px', fontWeight: 'bold', color: '#334155', margin: 0}}>{item.description}</h4>
                  <div style={{display: 'flex', gap: '10px', fontSize: '11px', color: '#64748b', marginTop: '4px', flexWrap:'wrap'}}>
                    <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Store size={10}/> {item.storeName}</span>
                    <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Tag size={10}/> {item.category}</span>
                    <span style={{display: 'flex', alignItems: 'center', gap: '4px', color: '#d97706'}}><UserCheck size={10}/> Aut: {item.authorizedBy}</span>
                  </div>
                </div>
                <div style={{textAlign: 'right'}}><p style={{fontSize: '14px', fontWeight: 'bold', color: '#ef4444', margin: 0}}>- R$ {item.amount.toFixed(2)}</p><button onClick={() => handleDeleteExpense(item.id)} style={styles.trashBtn}><Trash2 size={14}/></button></div>
              </div>
          ))}
        </div>
      </div>
  </div>
);

const ConferenciaView = ({ conferencia, setConferencia, currentTotal, handleCloseCycle, loading }) => {
  const sysVal = parseFloat(conferencia.systemValue) || 0;
  const cashVal = parseFloat(conferencia.cashValue) || 0;
  const diff = (cashVal + currentTotal) - sysVal;
  
  let statusColor = '#3b82f6';
  let statusText = 'Aguardando dados...';
  
  if (conferencia.systemValue && conferencia.cashValue) {
      if (Math.abs(diff) < 0.05) { statusColor = '#10b981'; statusText = 'CAIXA BATIDO'; }
      else if (diff < 0) { statusColor = '#ef4444'; statusText = `FALTA R$ ${Math.abs(diff).toFixed(2)}`; }
      else { statusColor = '#f59e0b'; statusText = `SOBRA R$ ${diff.toFixed(2)}`; }
  }

  return (
      <div style={{maxWidth: '600px', margin: '0 auto'}}>
          <div style={styles.formCard}>
              <h3 style={styles.cardTitle}><Calculator size={20} color="#6366f1"/> Conferência de Caixa</h3>
              <div style={{background: '#f8fafc', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                      <span style={{fontSize: '13px', color: '#64748b'}}>Total em Despesas (Notas):</span>
                      <span style={{fontWeight: 'bold', color: '#ef4444'}}>- R$ {currentTotal.toFixed(2)}</span>
                  </div>
              </div>
              
              <div style={styles.row}>
                  <div style={styles.field}>
                      <label style={styles.label}>Saldo Inicial (Sistema)</label>
                      <input type="number" placeholder="0.00" style={styles.input} value={conferencia.systemValue} onChange={e => setConferencia({...conferencia, systemValue: e.target.value})} />
                  </div>
                  <div style={styles.field}>
                      <label style={styles.label}>Dinheiro em Mãos</label>
                      <input type="number" placeholder="0.00" style={styles.input} value={conferencia.cashValue} onChange={e => setConferencia({...conferencia, cashValue: e.target.value})} />
                  </div>
              </div>

              <div style={{marginTop: '30px', padding: '20px', background: `${statusColor}15`, border: `1px solid ${statusColor}40`, borderRadius: '16px', textAlign: 'center'}}>
                  <p style={{fontSize: '12px', fontWeight: 'bold', color: statusColor, textTransform: 'uppercase', marginBottom: '5px'}}>Resultado da Conferência</p>
                  <h2 style={{fontSize: '24px', fontWeight: '900', color: statusColor, margin: 0}}>{statusText}</h2>
              </div>

              <button onClick={handleCloseCycle} style={{...styles.btnPrimary, background: '#1e293b', marginTop: '20px'}} disabled={loading || !conferencia.systemValue}>
                  {loading ? 'Processando...' : 'Fechar Ciclo e Arquivar'}
              </button>
          </div>
      </div>
  );
};

const HistoricoView = ({ cycles }) => (
  <div style={styles.listCard}>
      <div style={styles.listHeader}><h3 style={styles.cardTitle}><History size={20} color="#64748b"/> Histórico de Fechamentos</h3></div>
      <div style={styles.listBody}>
          {cycles.length === 0 ? <p style={{textAlign:'center', padding:'30px', color:'#94a3b8'}}>Nenhum ciclo fechado.</p> : cycles.map(cycle => (
              <div key={cycle.id} style={{padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div>
                      <h4 style={{fontWeight: 'bold', color: '#334155'}}>Fechamento {new Date(cycle.closedAt?.seconds * 1000).toLocaleDateString()}</h4>
                      <p style={{fontSize: '12px', color: '#64748b'}}>{cycle.itemCount} despesas</p>
                  </div>
                  <div style={{textAlign: 'right'}}>
                      <span style={{display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#059669'}}>Total: R$ {cycle.totalExpenses.toFixed(2)}</span>
                      <span style={{fontSize: '11px', color: cycle.difference < 0 ? '#ef4444' : cycle.difference > 0 ? '#f59e0b' : '#10b981'}}>
                          {cycle.difference === 0 ? 'Caixa Batido' : `Dif: ${cycle.difference.toFixed(2)}`}
                      </span>
                  </div>
              </div>
          ))}
      </div>
  </div>
);

// --- COMPONENTE PRINCIPAL ---

export default function DesencaixeSupervisor({ userData }) {
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Dados
  const [expenses, setExpenses] = useState([]);
  const [cycles, setCycles] = useState([]);
  
  // Listas Dinâmicas
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([
    'Luz', 'Água', 'Limpeza', 'Serviços de Manutenção', 
    'Serviços de Marketing', 'Bonificação de Loja', 
    'Materiais para Técnicos', 'Manutenção de Veículos', 'Outros'
  ]);

  // Estados Formulário
  const [form, setForm] = useState({ 
    description: '', amount: '', date: new Date().toISOString().split('T')[0], 
    storeId: '', category: '', supplier: '', authorizedBy: ''
  });
  const [customCategory, setCustomCategory] = useState('');
  const [fileName, setFileName] = useState(null);

  // Estado Conferência
  const [conferencia, setConferencia] = useState({ systemValue: '', cashValue: '' });

  // --- CARREGAMENTO ---
  useEffect(() => {
    const fetchCities = async () => {
      if (userData?.clusterId) {
        const q = query(collection(db, "cities"), where("clusterId", "==", userData.clusterId));
        const snap = await getDocs(q);
        setCities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    };
    fetchCities();
    fetchData();
  }, [userData]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const qExpenses = query(collection(db, "petty_cash"), where("supervisorId", "==", auth.currentUser.uid), where("status", "==", "open"));
      const snapExpenses = await getDocs(qExpenses);
      const listExpenses = snapExpenses.docs.map(d => ({ id: d.id, ...d.data() }));
      listExpenses.sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses(listExpenses);

      const uniqueSuppliers = [...new Set(listExpenses.map(e => e.supplier).filter(Boolean))];
      setSuppliers(uniqueSuppliers);

      const qCycles = query(collection(db, "petty_cash_cycles"), where("supervisorId", "==", auth.currentUser.uid));
      const snapCycles = await getDocs(qCycles);
      const listCycles = snapCycles.docs.map(d => ({ id: d.id, ...d.data() }));
      listCycles.sort((a, b) => b.closedAt - a.closedAt);
      setCycles(listCycles);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const currentTotal = expenses.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
  
  const expensesByStore = expenses.reduce((acc, curr) => {
    const store = curr.storeName || 'Geral';
    acc[store] = (acc[store] || 0) + curr.amount;
    return acc;
  }, {});
  const sortedStores = Object.entries(expensesByStore).sort(([, a], [, b]) => b - a).map(([name, value]) => ({ name, value }));

  const expensesBySupplier = expenses.reduce((acc, curr) => {
    const sup = curr.supplier || 'Não Identificado';
    acc[sup] = (acc[sup] || 0) + curr.amount;
    return acc;
  }, {});
  const sortedSuppliers = Object.entries(expensesBySupplier).sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, value]) => ({ name, value }));

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!form.storeId) return alert("Selecione uma loja.");
    const finalCategory = form.category === 'new' ? customCategory : form.category;
    if (!finalCategory) return alert("Defina uma categoria.");

    try {
      await addDoc(collection(db, "petty_cash"), {
        ...form, category: finalCategory, amount: parseFloat(form.amount),
        storeName: form.storeId === 'Geral' ? 'Geral / Cluster' : cities.find(c => c.id === form.storeId)?.name || 'Geral',
        supervisorId: auth.currentUser.uid, status: 'open', fileName: fileName || 'Sem comprovante', createdAt: serverTimestamp()
      });
      alert("Lançamento adicionado!");
      setForm({ description: '', amount: '', date: new Date().toISOString().split('T')[0], storeId: '', category: '', supplier: '', authorizedBy: '' });
      setCustomCategory(''); setFileName(null);
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const handleDeleteExpense = async (id) => {
    if (window.confirm("Excluir lançamento?")) {
      await deleteDoc(doc(db, "petty_cash", id));
      fetchData();
    }
  };

  const handleCloseCycle = async () => {
    if (!window.confirm("Fechar caixa e arquivar?")) return;
    setLoading(true);
    try {
      const sysVal = parseFloat(conferencia.systemValue) || 0;
      const cashVal = parseFloat(conferencia.cashValue) || 0;
      const diff = (cashVal + currentTotal) - sysVal;
      const batch = writeBatch(db);
      const cycleRef = doc(collection(db, "petty_cash_cycles"));
      batch.set(cycleRef, {
        supervisorId: auth.currentUser.uid, supervisorName: userData.name, closedAt: serverTimestamp(),
        totalExpenses: currentTotal, systemValue: sysVal, cashValue: cashVal, difference: diff, itemCount: expenses.length, itemsSnapshot: expenses
      });
      expenses.forEach(exp => { const expRef = doc(db, "petty_cash", exp.id); batch.update(expRef, { status: 'closed', cycleId: cycleRef.id }); });
      await batch.commit();
      alert("Ciclo fechado!");
      setConferencia({ systemValue: '', cashValue: '' });
      fetchData();
      setActiveTab('historico');
    } catch (err) { alert(err.message); }
    setLoading(false);
  };

  const handleFileChange = (e) => { const file = e.target.files[0]; if (file) setFileName(file.name); };
  
  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(37, 99, 235);
    doc.text("RELATÓRIO DE DESPESAS DE CAIXA", 105, 20, null, null, "center");
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text(`Supervisor: ${userData.name}`, 14, 35);
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString()}`, 14, 40);
    
    // Tabela Manual
    let y = 55;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y-5, 182, 8, 'F');
    doc.setFont("helvetica", "bold");
    doc.text("DATA", 16, y);
    doc.text("DESCRIÇÃO / FORNECEDOR", 45, y);
    doc.text("LOJA", 120, y);
    doc.text("VALOR", 170, y);
    
    y += 10;
    doc.setFont("helvetica", "normal");
    
    expenses.forEach((e) => {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(new Date(e.date).toLocaleDateString(), 16, y);
        doc.text(`${e.description.substring(0, 20)}... / ${e.supplier?.substring(0,10) || '-'}`, 45, y);
        doc.text(e.storeName?.substring(0, 15) || '-', 120, y);
        doc.text(`R$ ${e.amount.toFixed(2)}`, 170, y);
        y += 8;
        doc.setDrawColor(241, 245, 249);
        doc.line(14, y-4, 196, y-4);
    });
    
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL GASTO: R$ ${currentTotal.toFixed(2)}`, 140, y);
    
    doc.save(`Despesas_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.iconHeader}><Wallet size={24} color="white"/></div>
        <div>
          <h1 style={styles.title}>Desencaixe Financeiro</h1>
          <p style={styles.subtitle}>Gestão de Caixa Centralizado</p>
        </div>
      </div>

      <div style={styles.navTabs}>
        <button onClick={() => setActiveTab('dashboard')} style={activeTab === 'dashboard' ? styles.navTabActive : styles.navTab}><PieChart size={16}/> Visão Geral</button>
        <button onClick={() => setActiveTab('despesas')} style={activeTab === 'despesas' ? styles.navTabActive : styles.navTab}><FileText size={16}/> Lançamentos</button>
        <button onClick={() => setActiveTab('conferencia')} style={activeTab === 'conferencia' ? styles.navTabActive : styles.navTab}><Calculator size={16}/> Conferência</button>
        <button onClick={() => setActiveTab('historico')} style={activeTab === 'historico' ? styles.navTabActive : styles.navTab}><Archive size={16}/> Histórico</button>
      </div>

      <div style={styles.contentArea}>
          {activeTab === 'dashboard' && <DashboardView currentTotal={currentTotal} expenses={expenses} cycles={cycles} sortedStores={sortedStores} sortedSuppliers={sortedSuppliers} setActiveTab={setActiveTab} />}
          {activeTab === 'despesas' && <LancamentosView form={form} setForm={setForm} handleAddExpense={handleAddExpense} loading={loading} suppliers={suppliers} categories={categories} cities={cities} customCategory={customCategory} setCustomCategory={setCustomCategory} fileName={fileName} handleFileChange={handleFileChange} expenses={expenses} handleDeleteExpense={handleDeleteExpense} exportPdf={exportPdf} />}
          {activeTab === 'conferencia' && <ConferenciaView conferencia={conferencia} setConferencia={setConferencia} currentTotal={currentTotal} handleCloseCycle={handleCloseCycle} loading={loading} />}
          {activeTab === 'historico' && <HistoricoView cycles={cycles} />}
      </div>
    </div>
  );
}

// --- ESTILOS ---
const styles = {
  container: { padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: "'Inter', sans-serif" },
  header: { display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' },
  iconHeader: { width: '45px', height: '45px', borderRadius: '12px', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(5, 150, 105, 0.2)' },
  title: { fontSize: '24px', fontWeight: '800', color: '#1e293b', margin: 0 },
  subtitle: { fontSize: '14px', color: '#64748b', margin: 0 },
  navTabs: { display: 'flex', gap: '5px', background: '#f1f5f9', padding: '5px', borderRadius: '12px', marginBottom: '30px', width: 'fit-content' },
  navTab: { padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '14px', fontWeight: '600', display: 'flex', gap: '8px', alignItems: 'center' },
  navTabActive: { padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'white', color: '#1e293b', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', display: 'flex', gap: '8px', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  gridStats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' },
  statCard: { background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' },
  statLabel: { fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' },
  statValue: { fontSize: '24px', fontWeight: '900', color: '#1e293b', margin: 0 },
  contentGrid: { display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px', alignItems: 'start' },
  formCard: { background: 'white', padding: '30px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' },
  listCard: { background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', overflow: 'hidden' },
  cardTitle: { fontSize: '16px', fontWeight: '800', color: '#334155', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' },
  sectionTitle: { fontSize: '15px', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' },
  formStack: { display: 'flex', flexDirection: 'column', gap: '20px' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  field: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '12px', fontWeight: '700', color: '#64748b' },
  input: { padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', width: '100%', boxSizing: 'border-box' },
  uploadBox: { border: '2px dashed #cbd5e1', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f8fafc', transition: '0.2s' },
  btnPrimary: { padding: '16px', borderRadius: '14px', background: '#059669', color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer', fontSize: '15px', width: '100%', boxShadow: '0 4px 10px rgba(5, 150, 105, 0.2)' },
  btnSecondary: { background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  listHeader: { padding: '20px', borderBottom: '1px solid #f1f5f9', background: '#fcfcfc' },
  listBody: { padding: '20px' },
  expenseItem: { display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', borderBottom: '1px solid #f1f5f9' },
  dateBox: { background: '#f1f5f9', padding: '8px 12px', borderRadius: '8px', textAlign: 'center', display: 'flex', flexDirection: 'column' },
  trashBtn: { border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', marginTop: '5px', opacity: 0.7 },
  linkBtn: { background: 'none', border: 'none', color: '#2563eb', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', fontSize: '13px' },
  emptyState: { color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' },
  chartCard: { background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', minWidth: '300px', flex: 1 },
  chartContainer: { marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '15px' },
  chartLabel: { display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom:'5px', color:'#334155', fontWeight:'600' },
  chartBarBg: { width:'100%', height:'8px', background:'#f1f5f9', borderRadius:'4px', overflow:'hidden' },
  chartBarFill: { height:'100%', borderRadius:'4px' }
};
