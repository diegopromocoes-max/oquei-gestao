import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { 
  Wallet, TrendingDown, FileText, Plus, Trash2, 
  UploadCloud, Store, Image, AlertTriangle
} from 'lucide-react';

export default function DesencaixeAtendente({ userData }) {
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [fileName, setFileName] = useState(null);
  
  const [form, setForm] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'outros',
    supplier: '',
    authorizedBy: ''
  });

  const categories = [
    'Luz', 'Água', 'Limpeza', 'Serviços de Manutenção', 
    'Materiais de Escritório', 'Outros'
  ];

  const totalSpent = expenses.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const q = query(
        collection(db, "petty_cash"), 
        where("attendantId", "==", auth.currentUser.uid),
        where("status", "==", "open")
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses(list);
    } catch (err) {}
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setFileName(file.name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category) return window.alert("Defina uma categoria.");
    if (!form.amount || parseFloat(form.amount) <= 0) return window.alert("Introduza um valor válido.");

    setLoading(true);
    try {
      await addDoc(collection(db, "petty_cash"), {
        ...form, 
        amount: parseFloat(form.amount),
        storeId: userData.cityId || 'Geral',
        storeName: userData.cityId || 'Geral',
        attendantId: auth.currentUser.uid,
        attendantName: userData.name,
        supervisorId: 'pendente',
        status: 'open', 
        fileName: fileName || 'Sem comprovante', 
        createdAt: serverTimestamp()
      });
      window.alert("Lançamento adicionado com sucesso!");
      setForm({ 
        description: '', amount: '', date: new Date().toISOString().split('T')[0], 
        category: 'outros', supplier: '', authorizedBy: '' 
      });
      setFileName(null);
      fetchExpenses();
    } catch (err) { 
      window.alert(err.message); 
    }
    setLoading(false);
  };

  const handleDeleteExpense = async (id) => {
    if (window.confirm("Pretende excluir este lançamento?")) {
      await deleteDoc(doc(db, "petty_cash", id));
      fetchExpenses();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.iconHeader}><Wallet size={28} color="white"/></div>
        <div>
          <h1 style={styles.title}>Caixa da Loja</h1>
          <p style={styles.subtitle}>Lance as despesas e anexe os comprovativos da unidade de {userData?.cityId}.</p>
        </div>
      </div>

      <div style={styles.alertBox}>
        <AlertTriangle size={20} color="#ea580c" />
        <div>
          <strong style={{color: '#9a3412'}}>Atenção às Regras:</strong> Todo o lançamento exige obrigatoriamente um comprovativo válido. Solicite sempre a fatura ou recibo.
        </div>
      </div>

      <div style={styles.contentGrid}>
        
        <div style={styles.formCard}>
          <h3 style={styles.cardTitle}><Plus size={20} color="#059669"/> Adicionar Despesa</h3>
          <form onSubmit={handleSubmit} style={styles.formStack}>
            
            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Valor Pago (R$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  style={{...styles.input, fontSize: '18px', fontWeight: 'bold', color: '#059669'}} 
                  placeholder="0.00" 
                  value={form.amount} 
                  onChange={e => setForm({...form, amount: e.target.value})} 
                  required 
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Data</label>
                <input 
                  type="date" 
                  style={styles.input} 
                  value={form.date} 
                  onChange={e => setForm({...form, date: e.target.value})} 
                  required 
                />
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>O que foi comprado/pago?</label>
              <input 
                style={styles.input} 
                placeholder="Ex: Água, Detergente, etc." 
                value={form.description} 
                onChange={e => setForm({...form, description: e.target.value})} 
                required 
              />
            </div>

            <div style={styles.row}>
               <div style={styles.field}>
                 <label style={styles.label}>Onde comprou? (Fornecedor)</label>
                 <input 
                   style={styles.input} 
                   placeholder="Nome do local" 
                   value={form.supplier} 
                   onChange={e => setForm({...form, supplier: e.target.value})} 
                   required 
                 />
               </div>
               <div style={styles.field}>
                 <label style={styles.label}>Quem autorizou?</label>
                 <input 
                   style={styles.input} 
                   placeholder="Nome do gestor" 
                   value={form.authorizedBy} 
                   onChange={e => setForm({...form, authorizedBy: e.target.value})} 
                   required 
                 />
               </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Categoria</label>
              <select style={styles.input} value={form.category} onChange={e => setForm({...form, category: e.target.value})} required>
                <option value="">Selecione...</option>
                {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Comprovativo</label>
              <label htmlFor="receipt-upload" style={styles.uploadBox}>
                <input id="receipt-upload" type="file" style={{display: 'none'}} onChange={handleFileChange} />
                <UploadCloud size={24} color="var(--text-muted)" />
                <span style={{fontSize: '13px', color: 'var(--text-muted)', marginTop: '5px', textAlign: 'center'}}>
                  {fileName ? fileName : "Clique para anexar foto do recibo"}
                </span>
              </label>
            </div>

            <button type="submit" style={styles.btnPrimary} disabled={loading}>
              {loading ? 'A Guardar...' : 'Registar Lançamento'}
            </button>
          </form>
        </div>

        <div style={styles.listCard}>
          <div style={styles.listHeader}>
            <h3 style={styles.cardTitle}><TrendingDown size={20} color="#ef4444"/> Meus Lançamentos (Abertos)</h3>
            <div style={{fontSize: '18px', fontWeight: '900', color: '#ef4444'}}>
              Total: R$ {totalSpent.toFixed(2)}
            </div>
          </div>
          
          <div style={styles.listBody}>
            {expenses.length === 0 ? (
              <div style={{textAlign: 'center', padding: '40px', color: 'var(--text-muted)'}}>
                <FileText size={40} style={{margin: '0 auto 10px', opacity: 0.5}} />
                <p>Nenhuma despesa registada neste ciclo.</p>
              </div>
            ) : (
              expenses.map(item => (
                <div key={item.id} style={styles.expenseItem}>
                  <div style={styles.dateBox}>
                    <span style={{fontWeight: 'bold', fontSize: '14px', color: 'var(--text-muted)'}}>{item.date.split('-')[2]}</span>
                    <span style={{fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)'}}>{new Date(item.date).toLocaleString('default', { month: 'short' })}</span>
                  </div>
                  
                  <div style={{flex: 1}}>
                    <h4 style={{fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)', margin: 0}}>{item.description}</h4>
                    <div style={{display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', flexWrap:'wrap'}}>
                      <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}><Store size={10}/> {item.storeName}</span>
                      {item.fileName !== 'Sem comprovante' && (
                        <span style={{display: 'flex', alignItems: 'center', gap: '4px', color: '#2563eb'}}>
                          <Image size={10}/> Anexo
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{textAlign: 'right'}}>
                    <p style={{fontSize: '14px', fontWeight: 'bold', color: '#ef4444', margin: 0}}>- R$ {item.amount.toFixed(2)}</p>
                    <button onClick={() => handleDeleteExpense(item.id)} style={styles.trashBtn}><Trash2 size={14}/></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// --- ESTILOS DINÂMICOS ---
const styles = {
  container: { animation: 'fadeIn 0.4s ease-out', maxWidth: '1000px', margin: '0 auto', padding: '40px' },
  header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' },
  iconHeader: { width: '56px', height: '56px', borderRadius: '16px', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(5, 150, 105, 0.2)' },
  title: { fontSize: '28px', fontWeight: '900', color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' },
  subtitle: { fontSize: '15px', color: 'var(--text-muted)', margin: '5px 0 0 0' },
  
  alertBox: { background: 'rgba(234, 88, 12, 0.1)', border: '1px solid rgba(234, 88, 12, 0.3)', padding: '15px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px', color: '#ea580c', fontSize: '13px', marginBottom: '30px' },

  contentGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px', alignItems: 'start' },
  
  formCard: { background: 'var(--bg-card)', padding: '30px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
  listCard: { background: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' },
  
  cardTitle: { fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' },
  formStack: { display: 'flex', flexDirection: 'column', gap: '15px' },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' },
  input: { padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--border)', outline: 'none', fontSize: '14px', width: '100%', boxSizing: 'border-box', background: 'var(--bg-app)', color: 'var(--text-main)', transition: '0.2s', fontWeight: '500' },
  
  uploadBox: { border: '2px dashed var(--border)', borderRadius: '16px', padding: '25px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--bg-app)', transition: '0.2s' },
  btnPrimary: { padding: '16px', borderRadius: '14px', background: '#059669', color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer', fontSize: '15px', width: '100%', boxShadow: '0 8px 20px rgba(5, 150, 105, 0.2)', transition: 'transform 0.2s', marginTop: '10px' },

  listHeader: { padding: '25px', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  listBody: { padding: '15px', maxHeight: '500px', overflowY: 'auto' },
  expenseItem: { display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', borderBottom: '1px solid var(--border)', transition: 'background 0.2s', borderRadius: '12px' },
  dateBox: { background: 'var(--bg-panel)', padding: '10px', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', minWidth: '40px', border: '1px solid var(--border)' },
  trashBtn: { border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', marginTop: '8px', opacity: 0.8, padding: '5px' }
};