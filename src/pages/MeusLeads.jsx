import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { 
  Calendar, Phone, X, Search, PlusCircle, 
  Quote, CheckCircle2, UserCircle, MapPin, AlertTriangle,
  Layers, Edit2, GripVertical
} from 'lucide-react';

export default function MeusLeads({ userData, onNavigate }) {
  const [myLeads, setMyLeads] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [updateModal, setUpdateModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const [filterLeadType, setFilterLeadType] = useState('all');

  // Estado para o Drag and Drop (Arrastar e Soltar)
  const [draggedLead, setDraggedLead] = useState(null);

  const quotes = [
    { text: "O sucesso é a soma de pequenos esforços repetidos dia após dia.", author: "Robert Collier" },
    { text: "Vender é ajudar o cliente a comprar o que ele realmente precisa.", author: "Oquei Telecom" },
    { text: "Cada 'não' deixa-te mais perto do próximo 'sim'. Mantém o foco!", author: "Comercial" }
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

  useEffect(() => {
    if (!auth?.currentUser) return;
    
    // Escuta em Tempo Real (Real-time listener do Firebase)
    const qLeads = query(collection(db, "leads"), where("attendantId", "==", auth.currentUser.uid));
    const unsubscribe = onSnapshot(qLeads, (snap) => {
      const leadsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMyLeads(leadsData);
    }, (error) => {
      showToast(error.message, 'error');
    });

    return () => unsubscribe();
  }, []);

  const handleUpdate = async (e) => {
    e?.preventDefault();
    if (updateModal.status === 'Descartado' && !updateModal.discardMotive) {
      return showToast("Define o motivo da perda.", 'error');
    }
    try {
      await updateDoc(doc(db, "leads", updateModal.id), { 
        status: updateModal.status,
        discardMotive: updateModal.status === 'Descartado' ? updateModal.discardMotive : null,
        fidelityMonth: updateModal.status === 'Descartado' && updateModal.discardMotive === 'Fidelidade em outro Provedor' ? updateModal.fidelityMonth : null
      });
      setUpdateModal(null);
      showToast("Status atualizado com sucesso!");
    } catch (err) { 
      showToast(err.message, 'error');
    }
  };

  // ==========================================
  // LÓGICA DE DRAG AND DROP (ARRASTAR E SOLTAR)
  // ==========================================
  const handleDragStart = (e, lead) => {
    setDraggedLead(lead);
    // Configuração obrigatória para o HTML5 Drag and Drop funcionar corretamente
    e.dataTransfer.setData("text/plain", lead.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (!draggedLead) return;

    if (draggedLead.status === newStatus) {
      setDraggedLead(null);
      return; 
    }

    // REGRA DE NEGÓCIO: Se arrastar para descartado, força a abertura do Modal
    if (newStatus === 'Descartado') {
      setUpdateModal({ ...draggedLead, status: 'Descartado' });
    } else {
      // Se for para qualquer outro status, atualiza a base de dados na hora
      try {
        await updateDoc(doc(db, "leads", draggedLead.id), { 
          status: newStatus,
          discardMotive: null,
          fidelityMonth: null
        });
        showToast(`Movido para ${newStatus}`);
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
    setDraggedLead(null);
  };

  // --- FILTROS ---
  const filteredLeads = useMemo(() => {
    return myLeads.filter(l => {
      const matchesMonth = l.date && l.date.startsWith(selectedMonth);
      const matchesSearch = l.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || l.customerPhone?.includes(searchTerm);
      const matchesType = filterLeadType === 'all' || l.leadType === filterLeadType;
      
      return matchesMonth && matchesSearch && matchesType;
    }).sort((a, b) => new Date(b.date) - new Date(a.date)); 
  }, [myLeads, selectedMonth, searchTerm, filterLeadType]);

  const totalLeads = filteredLeads.length;
  const closedLeads = filteredLeads.filter(l => ['Contratado', 'Instalado'].includes(l.status)).length;

  // Definição das colunas do Kanban
  const KANBAN_COLUMNS = [
    { id: 'Novo', label: 'Novos / Sem Contato', color: '#8b5cf6', bg: '#f3e8ff' }, // Opcional, caso tenha o status Novo
    { id: 'Em Negociação', label: 'Em Negociação', color: '#f59e0b', bg: '#fffbeb' },
    { id: 'Contratado', label: 'Contratado (SLA)', color: '#3b82f6', bg: '#eff6ff' },
    { id: 'Instalado', label: 'Instalado (Ganho)', color: '#10b981', bg: '#ecfdf5' },
    { id: 'Descartado', label: 'Perdido (Descartado)', color: '#ef4444', bg: '#fef2f2' }
  ];

  return (
    <div style={styles.container}>
      
      {/* HERO SECTION */}
      <div style={styles.heroSection}>
        <div style={styles.heroMain}>
           <div style={styles.greetingWrapper}>
              <div style={styles.userIconCircle}><UserCircle size={40} color="white"/></div>
              <div>
                <h2 style={styles.greetingText}>{getGreeting()}, {userData?.name?.split(' ')[0] || 'Consultor'}! ✨</h2>
                <p style={styles.heroSubText}>Arraste os cards pelas colunas para avançar na negociação.</p>
              </div>
           </div>
           
           <div style={styles.quoteCard}>
              <div style={styles.quoteIcon}><Quote size={20} color="#3b82f6"/></div>
              <p style={styles.quoteText}>"{randomQuote.text}"</p>
              <span style={styles.quoteAuthor}>— {randomQuote.author}</span>
           </div>
        </div>

        <div style={styles.miniStatsRow}>
           <div style={styles.miniStatItem}>
              <span style={styles.miniStatLabel}>Leads Visíveis</span>
              <span style={styles.miniStatValue}>{totalLeads} Leads</span>
           </div>
           <div style={styles.dividerVertical}></div>
           <div style={styles.miniStatItem}>
              <span style={styles.miniStatLabel}>Vendas Fechadas</span>
              <span style={styles.miniStatValue}><CheckCircle2 size={16} color="#10b981"/> {closedLeads}</span>
           </div>
           <div style={styles.dividerVertical}></div>
           <div style={styles.miniStatItem}>
              <span style={styles.miniStatLabel}>Sua Loja</span>
              <span style={styles.miniStatValue}><MapPin size={16} color="#ef4444"/> {userData?.cityId || 'Geral'}</span>
           </div>
        </div>
      </div>

      {/* TOOLBAR (Filtros) */}
      <div style={styles.toolbarWrapper}>
        <div style={styles.filtersGrid}>
          <div style={styles.searchBox}>
            <Search size={18} color="#94a3b8" />
            <input 
              placeholder="Buscar cliente..."
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
             <Layers size={18} color="#64748b" />
             <select style={styles.selectInput} value={filterLeadType} onChange={e => setFilterLeadType(e.target.value)}>
                <option value="all">Todos os Produtos</option>
                <option value="Plano Novo">Plano Novo</option>
                <option value="Migração">Migração</option>
                <option value="SVA">SVA</option>
             </select>
          </div>
        </div>
        
        <button onClick={() => onNavigate && onNavigate('nova_venda')} style={styles.btnPrimary}>
           <PlusCircle size={18} /> Novo Lead
        </button>
      </div>

      {/* KANBAN BOARD */}
      <div style={styles.kanbanBoard}>
        {KANBAN_COLUMNS.map(col => {
          const colLeads = filteredLeads.filter(l => l.status === col.id || (!l.status && col.id === 'Novo') || (l.status === 'Em negociação' && col.id === 'Em Negociação'));
          
          return (
            <div 
              key={col.id} 
              style={styles.kanbanColumn}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div style={{...styles.columnHeader, borderBottom: `2px solid ${col.color}`}}>
                <div style={styles.columnTitle}>
                  <div style={{width: 10, height: 10, borderRadius: '50%', backgroundColor: col.color}} />
                  {col.label}
                </div>
                <span style={{...styles.columnCount, backgroundColor: col.bg, color: col.color}}>
                  {colLeads.length}
                </span>
              </div>

              <div style={styles.columnBody}>
                {colLeads.length === 0 && (
                   <div style={styles.emptyColumn}>Solte um lead aqui</div>
                )}
                
                {colLeads.map(lead => (
                  <div 
                    key={lead.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead)}
                    style={{...styles.kanbanCard, borderLeft: `4px solid ${col.color}`, opacity: draggedLead?.id === lead.id ? 0.5 : 1}}
                  >
                    <div style={styles.cardHeader}>
                      <span style={styles.cardDate}>{lead.date?.split('-').reverse().join('/')}</span>
                      <div style={{display:'flex', gap:'5px'}}>
                        <button style={{...styles.editBtn, cursor: 'grab'}} title="Arraste para mover">
                           <GripVertical size={14} color="#cbd5e1" />
                        </button>
                        {/* Botão Editar (Essencial para uso em Telemóvel onde drag and drop é difícil) */}
                        <button onClick={() => setUpdateModal(lead)} style={styles.editBtn} title="Editar Status">
                           <Edit2 size={14} color="#64748b" />
                        </button>
                      </div>
                    </div>
                    
                    <h4 style={styles.cardClientName}>{lead.customerName || 'Sem Nome'}</h4>
                    <p style={styles.cardPhone}><Phone size={12}/> {lead.customerPhone || 'S/ Telefone'}</p>
                    
                    <div style={styles.cardFooter}>
                      <span style={styles.cardTypeBadge}>{lead.leadType}</span>
                      <span style={styles.cardProduct}>{lead.productName}</span>
                    </div>

                    {lead.status === 'Descartado' && lead.discardMotive && (
                      <div style={styles.cardMotive}>
                        Motivo: {lead.discardMotive}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* TOAST NOTIFICATION */}
      {notification && (
        <div style={{...styles.toast, background: notification.type === 'error' ? '#ef4444' : '#10b981'}}>
           {notification.type === 'error' ? <AlertTriangle size={18}/> : <CheckCircle2 size={18}/>}
           {notification.message}
        </div>
      )}

      {/* MODAL DE ATUALIZAÇÃO (OBRIGATÓRIO PARA DESCARTES OU USO MOBILE) */}
      {updateModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
             <div style={styles.modalHeader}>
               <div>
                 <h3 style={styles.modalTitle}>Mover Lead</h3>
                 <p style={styles.modalSub}>{updateModal.customerName}</p>
               </div>
               <button onClick={() => setUpdateModal(null)} style={styles.closeBtn}><X size={24}/></button>
             </div>
             
             <form onSubmit={handleUpdate} style={styles.modalBody}>
               <div style={styles.field}>
                  <label style={styles.label}>Alterar Status Para:</label>
                  <select value={updateModal.status || ''} onChange={e => setUpdateModal({...updateModal, status: e.target.value, discardMotive: ''})} style={styles.inputPremium}>
                    {KANBAN_COLUMNS.map(c => (
                       <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
               </div>

               {updateModal.status === 'Descartado' && (
                 <div style={styles.discardSection}>
                    <div style={styles.field}>
                      <label style={styles.labelColor}>Qual o motivo da perda?</label>
                      <select value={updateModal.discardMotive || ''} onChange={e => setUpdateModal({...updateModal, discardMotive: e.target.value})} style={styles.inputPremium} required>
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
                         <input type="month" value={updateModal.fidelityMonth || ''} onChange={e => setUpdateModal({...updateModal, fidelityMonth: e.target.value})} style={styles.inputPremium} required/>
                       </div>
                    )}
                 </div>
               )}

               <div style={styles.modalFooter}>
                 <button type="button" onClick={() => setUpdateModal(null)} style={styles.btnCancelLarge}>Voltar</button>
                 <button type="submit" style={styles.btnSaveLarge}>Confirmar Alteração</button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// ESTILOS INLINE (Adaptados para o Kanban)
// ==========================================
const styles = {
  container: { animation:'fadeIn 0.5s ease-out', paddingBottom: '40px', maxWidth: '100%', overflowX: 'hidden' },
  
  heroSection: { background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderRadius: '24px', padding: '35px', marginBottom: '30px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', color: 'white' },
  heroMain: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '30px', marginBottom: '30px' },
  greetingWrapper: { display: 'flex', alignItems: 'center', gap: '20px' },
  userIconCircle: { width: '60px', height: '60px', background: 'rgba(255,255,255,0.1)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' },
  greetingText: { fontSize: '24px', fontWeight: '900', margin: 0, letterSpacing: '-0.02em' },
  heroSubText: { fontSize: '14px', color: '#94a3b8', margin: '5px 0 0 0' },
  quoteCard: { background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', maxWidth: '350px' },
  quoteIcon: { marginBottom: '10px' },
  quoteText: { fontSize: '13px', fontStyle: 'italic', lineHeight: '1.5', color: '#e2e8f0', margin: 0 },
  quoteAuthor: { fontSize: '11px', fontWeight: 'bold', color: '#3b82f6', marginTop: '10px', display: 'block', textTransform: 'uppercase' },
  
  miniStatsRow: { display: 'flex', gap: '30px', background: 'rgba(255,255,255,0.03)', padding: '15px 25px', borderRadius: '16px', width: 'fit-content', flexWrap: 'wrap' },
  miniStatItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  miniStatLabel: { fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  miniStatValue: { fontSize: '15px', fontWeight: '900', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' },
  dividerVertical: { width: '1px', background: 'rgba(255,255,255,0.1)' },

  toolbarWrapper: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' },
  filtersGrid: { display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap' },
  searchBox: { flex: 1, minWidth: '200px', background: 'white', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 15px', borderRadius: '14px', border: '1px solid #e2e8f0' },
  searchInput: { border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px', color: '#1e293b' },
  selectWrapper: { background: 'white', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', borderRadius: '14px', border: '1px solid #e2e8f0' },
  dateInput: { border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: '700', color: '#334155', cursor: 'pointer' },
  selectInput: { border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: '700', color: '#334155', cursor: 'pointer' },

  btnPrimary: { background: '#2563eb', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '16px', fontWeight: '900', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 15px rgba(37,99,235,0.2)' },
  
  // --- QUADRO KANBAN ---
  kanbanBoard: { 
    display: 'flex', 
    gap: '20px', 
    overflowX: 'auto', // Permite scroll horizontal no telemóvel
    paddingBottom: '20px',
    alignItems: 'flex-start',
    minHeight: '600px'
  },
  kanbanColumn: { 
    flex: '0 0 320px', // Largura fixa das colunas
    background: '#f8fafc', 
    borderRadius: '20px', 
    padding: '15px', 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '15px',
    border: '1px solid #e2e8f0'
  },
  columnHeader: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingBottom: '12px'
  },
  columnTitle: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: '8px', 
    fontSize: '14px', 
    fontWeight: '800', 
    color: '#1e293b',
    textTransform: 'uppercase'
  },
  columnCount: { 
    padding: '4px 10px', 
    borderRadius: '12px', 
    fontSize: '12px', 
    fontWeight: '900' 
  },
  columnBody: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '12px',
    minHeight: '150px' 
  },
  emptyColumn: { 
    textAlign: 'center', 
    color: '#cbd5e1', 
    fontSize: '13px', 
    fontStyle: 'italic', 
    padding: '20px 0',
    border: '2px dashed #e2e8f0',
    borderRadius: '12px'
  },

  // --- CARTÃO (CARD) DO KANBAN ---
  kanbanCard: { 
    background: 'white', 
    padding: '16px', 
    borderRadius: '16px', 
    border: '1px solid #e2e8f0', 
    cursor: 'grab', 
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  cardHeader: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: '10px' 
  },
  cardDate: { fontSize: '11px', fontWeight: '800', color: '#94a3b8' },
  editBtn: { background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: '6px' },
  
  cardClientName: { fontSize: '15px', fontWeight: '900', color: '#1e293b', margin: '0 0 4px 0' },
  cardPhone: { fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 12px 0', fontWeight: '600' },
  
  cardFooter: { display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px dashed #f1f5f9' },
  cardTypeBadge: { background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', width: 'fit-content', textTransform: 'uppercase' },
  cardProduct: { fontSize: '13px', fontWeight: '800', color: '#3b82f6' },
  cardMotive: { marginTop: '8px', fontSize: '11px', color: '#ef4444', fontWeight: '800', background: '#fef2f2', padding: '6px 10px', borderRadius: '8px', border: '1px solid #fecaca' },

  // --- MODAL ---
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modalBox: { background: 'white', padding: '35px', borderRadius: '28px', width: '90%', maxWidth: '480px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' },
  modalTitle: { fontSize: '22px', fontWeight: '900', color: '#1e293b', margin: 0 },
  modalSub: { fontSize: '14px', color: '#64748b', margin: '5px 0 0 0', fontWeight: '600' },
  closeBtn: { background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', padding: '8px', borderRadius: '50%' },
  
  modalBody: { display: 'flex', flexDirection: 'column', gap: '20px' },
  discardSection: { padding: '20px', background: '#fef2f2', borderRadius: '20px', border: '1px solid #fecaca', animation: 'slideUp 0.3s' },
  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '800', color: '#475569', marginBottom: '4px' },
  labelColor: { display: 'block', fontSize: '13px', fontWeight: '800', color: '#991b1b', marginBottom: '4px' },
  inputPremium: { padding: '14px 16px', borderRadius: '14px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', color: '#1e293b', width: '100%', boxSizing: 'border-box', background: 'white', fontWeight: '600', cursor: 'pointer' },
  
  modalFooter: { display: 'flex', gap: '12px', marginTop: '35px' },
  btnSaveLarge: { flex: 2, background: '#2563eb', color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: '900', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' },
  btnCancelLarge: { flex: 1, background: '#f1f5f9', color: '#475569', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: '800', fontSize: '15px', cursor: 'pointer' },
  
  toast: { position: 'fixed', bottom: '30px', right: '30px', padding: '15px 25px', borderRadius: '12px', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 20px rgba(0,0,0,0.1)', zIndex: 1000, animation: 'slideUp 0.3s' }
};

// Injeção de CSS para Animações
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  ::-webkit-scrollbar { height: 8px; width: 8px; }
  ::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
`;
document.head.appendChild(styleSheet);