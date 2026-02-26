import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { 
  Calendar, Phone, Users, ArrowRight, X, Search, PlusCircle, 
  Sparkles, Quote, TrendingUp, CheckCircle2, UserCircle, MapPin, AlertTriangle,
  Filter, ArrowUpDown, Layers, Activity
} from 'lucide-react';

export default function MeusLeads({ userData, onNavigate }) {
  const [myLeads, setMyLeads] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [updateModal, setUpdateModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLeadType, setFilterLeadType] = useState('all');
  const [sortOrder, setSortOrder] = useState('date-desc');

  const quotes = [
    { text: "O sucesso é a soma de pequenos esforços repetidos dia após dia.", author: "Robert Collier" },
    { text: "Vender é ajudar o cliente a comprar o que ele realmente precisa.", author: "Oquei Telecom" },
    { text: "Cada 'não' te deixa mais perto do próximo 'sim'. Mantenha o foco!", author: "Comercial" },
    { text: "Sua ambição é o motor, sua disciplina é o combustível.", author: "Performance" },
    { text: "A melhor maneira de prever o futuro é criá-lo.", author: "Peter Drucker" }
  ];

  const randomQuote = useMemo(() => quotes[Math.floor(Math.random() * quotes.length)], []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchData = async () => {
    try {
      if (!auth?.currentUser) return;
      const qLeads = query(collection(db, "leads"), where("attendantId", "==", auth.currentUser.uid));
      const leadsSnap = await getDocs(qLeads);
      const leadsData = leadsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMyLeads(leadsData);
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdate = async () => {
    if (updateModal.status === 'Descartado' && !updateModal.discardMotive) {
      return showToast("Defina o motivo da perda.", 'error');
    }
    try {
      await updateDoc(doc(db, "leads", updateModal.id), { 
        status: updateModal.status,
        discardMotive: updateModal.status === 'Descartado' ? updateModal.discardMotive : null,
        fidelityMonth: updateModal.status === 'Descartado' && updateModal.discardMotive === 'Fidelidade em outro Provedor' ? updateModal.fidelityMonth : null
      });
      setUpdateModal(null);
      showToast("Status atualizado com sucesso!");
      fetchData();
    } catch (err) { 
      showToast(err.message, 'error');
    }
  };

  const filteredAndSortedLeads = useMemo(() => {
    let result = myLeads.filter(l => {
      const matchesMonth = l.date && l.date.startsWith(selectedMonth);
      const matchesSearch = l.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || l.customerPhone.includes(searchTerm);
      const matchesStatus = filterStatus === 'all' || l.status === filterStatus;
      const matchesType = filterLeadType === 'all' || l.leadType === filterLeadType;
      
      return matchesMonth && matchesSearch && matchesStatus && matchesType;
    });

    result.sort((a, b) => {
      if (sortOrder === 'date-desc') return new Date(b.date) - new Date(a.date);
      if (sortOrder === 'date-asc') return new Date(a.date) - new Date(b.date);
      if (sortOrder === 'name-asc') return a.customerName.localeCompare(b.customerName);
      if (sortOrder === 'name-desc') return b.customerName.localeCompare(a.customerName);
      return 0;
    });

    return result;
  }, [myLeads, selectedMonth, searchTerm, filterStatus, filterLeadType, sortOrder]);

  const totalLeads = filteredAndSortedLeads.length;
  const closedLeads = filteredAndSortedLeads.filter(l => ['Contratado', 'Instalado'].includes(l.status)).length;

  return (
    <div style={{animation:'fadeIn 0.5s ease-out', maxWidth: '1100px', margin: '0 auto', paddingBottom: '40px'}}>
      
      <div style={styles.heroSection}>
        <div style={styles.heroMain}>
           <div style={styles.greetingWrapper}>
              <div style={styles.userIconCircle}><UserCircle size={40} color="white"/></div>
              <div>
                <h2 style={styles.greetingText}>{getGreeting()}, {userData?.name?.split(' ')[0] || 'Consultor'}! ✨</h2>
                <p style={styles.heroSubText}>Vamos transformar oportunidades em novos clientes Oquei hoje?</p>
              </div>
           </div>
           
           <div style={styles.quoteCard}>
              <div style={styles.quoteIcon}><Quote size={20} color="#2563eb"/></div>
              <p style={styles.quoteText}>"{randomQuote.text}"</p>
              <span style={styles.quoteAuthor}>— {randomQuote.author}</span>
           </div>
        </div>

        <div style={styles.miniStatsRow}>
           <div style={styles.miniStatItem}>
              <span style={styles.miniStatLabel}>Filtro Atual</span>
              <span style={styles.miniStatValue}>{totalLeads} Leads</span>
           </div>
           <div style={styles.dividerVertical}></div>
           <div style={styles.miniStatItem}>
              <span style={styles.miniStatLabel}>Vendas Fechadas</span>
              <span style={styles.miniStatValue}><CheckCircle2 size={16} color="#10b981"/> {closedLeads}</span>
           </div>
           <div style={styles.dividerVertical}></div>
           <div style={styles.miniStatItem}>
              <span style={styles.miniStatLabel}>Cidade</span>
              <span style={styles.miniStatValue}><MapPin size={16} color="#ef4444"/> {userData?.cityId || 'Geral'}</span>
           </div>
        </div>
      </div>

      <div style={styles.toolbarWrapper}>
        <div style={styles.filtersGrid}>
          <div style={styles.searchBox}>
            <Search size={18} color="#94a3b8" />
            <input 
              placeholder="Nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.selectWrapper}>
             <Calendar size={18} color="#64748b" />
             <input 
               type="month" 
               value={selectedMonth} 
               onChange={(e) => setSelectedMonth(e.target.value)}
               style={styles.dateInput}
             />
          </div>

          <div style={styles.selectWrapper}>
             <Activity size={18} color="#64748b" />
             <select style={styles.selectInput} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">Todos os Status</option>
                <option value="Em negociação">Em negociação</option>
                <option value="Contratado">Contratado</option>
                <option value="Instalado">Instalado</option>
                <option value="Descartado">Descartado</option>
             </select>
          </div>

          <div style={styles.selectWrapper}>
             <Layers size={18} color="#64748b" />
             <select style={styles.selectInput} value={filterLeadType} onChange={e => setFilterLeadType(e.target.value)}>
                <option value="all">Todos os Tipos</option>
                <option value="Plano Novo">Plano Novo</option>
                <option value="Migração">Migração</option>
                <option value="SVA">SVA</option>
             </select>
          </div>

          <div style={styles.selectWrapper}>
             <ArrowUpDown size={18} color="#64748b" />
             <select style={styles.selectInput} value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                <option value="date-desc">Mais Recentes</option>
                <option value="date-asc">Mais Antigos</option>
                <option value="name-asc">Nome (A-Z)</option>
                <option value="name-desc">Nome (Z-A)</option>
             </select>
          </div>
        </div>
        
        <button onClick={() => onNavigate && onNavigate('nova_venda')} style={styles.btnPrimary}>
           <PlusCircle size={18} /> Novo Lead
        </button>
      </div>

      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead style={styles.tableHead}>
            <tr>
              <th style={styles.th}>📅 Data</th>
              <th style={styles.th}>👤 Cliente</th>
              <th style={styles.th}>📦 Serviço</th>
              <th style={styles.th}>📊 Status</th>
              <th style={{...styles.th, textAlign:'right'}}>Gestão</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedLeads.map(lead => (
              <tr key={lead.id} style={styles.trHover}>
                <td style={styles.td}>
                  <div style={styles.dateText}>
                    {lead.date?.split('-').reverse().join('/')}
                  </div>
                </td>
                <td style={styles.td}>
                  <div style={styles.clientCell}>
                    <div style={styles.avatarMini}>{lead.customerName.charAt(0)}</div>
                    <div>
                      <div style={styles.clientName}>{lead.customerName}</div>
                      <div style={styles.clientPhone}>
                        <Phone size={10}/> {lead.customerPhone}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={styles.td}>
                  <span style={styles.typeBadge}>{lead.leadType}</span>
                  <div style={styles.productName}>{lead.productName}</div>
                </td>
                <td style={styles.td}>
                   <StatusBadge status={lead.status} />
                   {lead.status === 'Descartado' && lead.discardMotive && (
                     <div style={styles.motiveText}>
                       {lead.discardMotive}
                     </div>
                   )}
                </td>
                <td style={{...styles.td, textAlign:'right'}}>
                   <button style={styles.btnUpdateStatus} onClick={() => setUpdateModal({...lead})}>
                     Mover Lead <ArrowRight size={14} />
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredAndSortedLeads.length === 0 && (
          <div style={styles.emptyContainer}>
            <TrendingUp size={48} color="#e2e8f0" style={{marginBottom:'15px'}} />
            <h3 style={styles.emptyTitle}>Nenhum lead encontrado</h3>
            <p style={styles.emptySub}>Altere os filtros ou adicione um novo lead para começar.</p>
          </div>
        )}
      </div>

      {notification && (
        <div style={{...styles.toast, background: notification.type === 'error' ? '#ef4444' : '#10b981'}}>
           {notification.type === 'error' ? <AlertTriangle size={18}/> : <CheckCircle2 size={18}/>}
           {notification.message}
        </div>
      )}

      {updateModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
             <div style={styles.modalHeader}>
               <div>
                 <h3 style={styles.modalTitle}>Gerenciar Negociação</h3>
                 <p style={styles.modalSub}>{updateModal.customerName}</p>
               </div>
               <button onClick={() => setUpdateModal(null)} style={styles.closeBtn}><X size={24}/></button>
             </div>
             
             <div style={styles.modalBody}>
               <div style={styles.field}>
                  <label style={styles.label}>Novo Status</label>
                  <select value={updateModal.status} onChange={e => setUpdateModal({...updateModal, status: e.target.value, discardMotive: ''})} style={styles.inputPremium}>
                    <option value="Em negociação">Em negociação</option>
                    <option value="Contratado">Contratado</option>
                    <option value="Instalado">Instalado</option>
                    <option value="Descartado">Descartado (Perda)</option>
                  </select>
               </div>

               {updateModal.status === 'Descartado' && (
                 <div style={styles.discardSection}>
                    <div style={styles.field}>
                      <label style={styles.labelColor}>Qual o motivo da perda?</label>
                      <select value={updateModal.discardMotive || ''} onChange={e => setUpdateModal({...updateModal, discardMotive: e.target.value})} style={styles.inputPremium}>
                        <option value="" disabled>Selecione um motivo...</option>
                        <option value="Negativado">CPF Negativado</option>
                        <option value="Falta de Cobertura">Falta de Cobertura</option>
                        <option value="Preço">Preço Alto / Concorrência</option>
                        <option value="Cliente Desistiu">Cliente desistiu</option>
                        <option value="Fidelidade em outro Provedor">Fidelidade em outro Provedor</option>
                      </select>
                    </div>

                    {updateModal.discardMotive === 'Fidelidade em outro Provedor' && (
                       <div style={{marginTop: '15px'}}>
                         <label style={styles.labelColor}>Mês Estimado de Fim de Fidelidade</label>
                         <input type="month" value={updateModal.fidelityMonth || ''} onChange={e => setUpdateModal({...updateModal, fidelityMonth: e.target.value})} style={styles.inputPremium} />
                       </div>
                    )}
                 </div>
               )}
             </div>

             <div style={styles.modalFooter}>
               <button onClick={() => setUpdateModal(null)} style={styles.btnCancelLarge}>Voltar</button>
               <button onClick={handleUpdate} style={styles.btnSaveLarge}>Confirmar Alteração</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

const StatusBadge = ({ status }) => {
  let bg = '#f1f5f9', color = '#64748b', dot = '#94a3b8';
  if (status === 'Instalado' || status === 'Contratado') { bg = '#ecfdf5'; color = '#166534'; dot = '#10b981'; }
  else if (status === 'Em negociação') { bg = '#fffbeb'; color = '#92400e'; dot = '#f59e0b'; }
  else if (status === 'Descartado') { bg = '#fef2f2'; color = '#991b1b'; dot = '#ef4444'; }
  
  return (
    <span style={{background: bg, color: color, padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', textTransform:'uppercase', display: 'inline-flex', alignItems: 'center', gap: '6px', border: `1px solid ${dot}40`}}>
      <span style={{width: '6px', height: '6px', borderRadius: '50%', background: dot}}></span>
      {status}
    </span>
  );
};

const styles = {
  heroSection: { background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderRadius: '24px', padding: '35px', marginBottom: '35px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', color: 'white' },
  heroMain: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '30px', marginBottom: '30px' },
  greetingWrapper: { display: 'flex', alignItems: 'center', gap: '20px' },
  userIconCircle: { width: '60px', height: '60px', background: 'rgba(255,255,255,0.1)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' },
  greetingText: { fontSize: '26px', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' },
  heroSubText: { fontSize: '15px', color: '#94a3b8', margin: '5px 0 0 0' },
  
  quoteCard: { background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', maxWidth: '400px' },
  quoteIcon: { marginBottom: '10px' },
  quoteText: { fontSize: '14px', fontStyle: 'italic', lineHeight: '1.5', color: '#e2e8f0', margin: 0 },
  quoteAuthor: { fontSize: '11px', fontWeight: 'bold', color: '#3b82f6', marginTop: '10px', display: 'block', textTransform: 'uppercase' },
  
  miniStatsRow: { display: 'flex', gap: '30px', background: 'rgba(255,255,255,0.03)', padding: '15px 25px', borderRadius: '16px', width: 'fit-content' },
  miniStatItem: { display: 'flex', flexDirection: 'column', gap: '2px' },
  miniStatLabel: { fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  miniStatValue: { fontSize: '15px', fontWeight: '900', color: 'white', display: 'flex', alignItems: 'center', gap: '5px' },
  dividerVertical: { width: '1px', background: 'rgba(255,255,255,0.1)' },

  toolbarWrapper: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' },
  filtersGrid: { display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap' },
  searchBox: { flex: 1, minWidth: '200px', background: 'white', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 15px', borderRadius: '14px', border: '1px solid #e2e8f0' },
  searchInput: { border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px', color: '#1e293b' },
  selectWrapper: { background: 'white', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', borderRadius: '14px', border: '1px solid #e2e8f0' },
  dateInput: { border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: '700', color: '#334155', cursor: 'pointer' },
  selectInput: { border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: '700', color: '#334155', cursor: 'pointer', minWidth: '120px' },

  btnPrimary: { background: '#2563eb', color: 'white', border: 'none', padding: '14px 25px', borderRadius: '16px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 15px rgba(37,99,235,0.2)' },
  
  tableCard: { background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHead: { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  th: { padding: '16px 20px', textAlign: 'left', fontSize: '11px', color: '#64748b', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' },
  trHover: { borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' },
  td: { padding: '16px 20px', fontSize: '14px' },
  
  dateText: { fontWeight: '800', color: '#475569', fontSize: '13px' },
  clientCell: { display: 'flex', alignItems: 'center', gap: '15px' },
  avatarMini: { width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '15px' },
  clientName: { fontWeight: '800', color: '#1e293b' },
  clientPhone: { fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' },
  
  typeBadge: { background: '#f8fafc', color: '#64748b', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', border: '1px solid #e2e8f0' },
  productName: { fontWeight: '700', color: '#475569', fontSize: '13px', marginTop: '5px' },
  motiveText: { fontSize: '10px', color: '#ef4444', marginTop: '6px', fontWeight: '700', textTransform: 'uppercase' },
  btnUpdateStatus: { background: 'white', color: '#2563eb', border: '1px solid #bfdbfe', padding: '8px 16px', borderRadius: '10px', fontWeight: '800', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' },

  emptyContainer: { padding: '80px 20px', textAlign: 'center' },
  emptyTitle: { fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: 0 },
  emptySub: { fontSize: '14px', color: '#94a3b8', marginTop: '5px' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modalBox: { background: 'white', padding: '35px', borderRadius: '28px', width: '90%', maxWidth: '480px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' },
  modalTitle: { fontSize: '22px', fontWeight: '900', color: '#1e293b', margin: 0 },
  modalSub: { fontSize: '14px', color: '#64748b', margin: '5px 0 0 0' },
  closeBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' },
  
  modalBody: { display: 'flex', flexDirection: 'column', gap: '20px' },
  discardSection: { padding: '20px', background: '#fef2f2', borderRadius: '20px', border: '1px solid #fecaca', animation: 'slideUp 0.3s' },
  label: { display: 'block', fontSize: '13px', fontWeight: '800', color: '#475569', marginBottom: '8px' },
  labelColor: { display: 'block', fontSize: '13px', fontWeight: '800', color: '#991b1b', marginBottom: '8px' },
  inputPremium: { padding: '14px 16px', borderRadius: '14px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', color: '#1e293b', width: '100%', boxSizing: 'border-box', background: 'white', fontWeight: '600' },
  
  modalFooter: { display: 'flex', gap: '12px', marginTop: '35px' },
  btnSaveLarge: { flex: 2, background: '#2563eb', color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: '900', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' },
  btnCancelLarge: { flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: '800', fontSize: '15px', cursor: 'pointer' },
  
  toast: { position: 'fixed', bottom: '30px', right: '30px', padding: '15px 25px', borderRadius: '12px', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 20px rgba(0,0,0,0.1)', zIndex: 1000, animation: 'slideUp 0.3s' }
};

const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
`;
document.head.appendChild(styleSheet);