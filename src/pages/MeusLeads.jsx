import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { 
  Calendar, Phone, X, Search, PlusCircle, 
  Quote, CheckCircle2, UserCircle, MapPin, AlertTriangle,
  Layers, Edit2, GripVertical, Users, Trash2
} from 'lucide-react';

// IMPORTAÇÃO DOS ESTILOS GLOBAIS
import { styles as global } from '../styles/globalStyles';

export default function MeusLeads({ userData, onNavigate }) {
  const [myLeads, setMyLeads] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [updateModal, setUpdateModal] = useState(null); // Para editar status e motivo de descarte
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const [filterLeadType, setFilterLeadType] = useState('all');

  // Estado para o Drag and Drop
  const [draggedLead, setDraggedLead] = useState(null);

  const quotes = [
    { text: "O sucesso é a soma de pequenos esforços repetidos dia após dia.", author: "Robert Collier" },
    { text: "Vender é ajudar o cliente a comprar o que ele realmente precisa.", author: "Oquei Telecom" },
    { text: "Cada 'não' deixa-te mais perto do próximo 'sim'.", author: "Comercial" }
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

  // --- BUSCA DE LEADS COM ESCUTA ATIVA ---
  useEffect(() => {
    let unsubscribeSnapshot;
    
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const qLeads = query(collection(db, "leads"), where("attendantId", "==", user.uid));
        
        unsubscribeSnapshot = onSnapshot(qLeads, (snap) => {
          const leadsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setMyLeads(leadsData);
        }, (error) => {
          showToast("Erro ao carregar dados do banco.", 'error');
        });
      } else {
        setMyLeads([]);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const handleUpdate = async (e) => {
    e?.preventDefault();
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
      showToast("Venda atualizada com sucesso!");
    } catch (err) { 
      showToast("Erro ao atualizar no banco.", 'error');
    }
  };

  // ==========================================
  // LÓGICA DE DRAG AND DROP
  // ==========================================
  const handleDragStart = (e, lead) => {
    setDraggedLead(lead);
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

    // Se for descartar, precisa do modal para o motivo
    if (newStatus === 'Descartado') {
      setUpdateModal({ ...draggedLead, status: 'Descartado', discardMotive: '' });
    } else {
      try {
        await updateDoc(doc(db, "leads", draggedLead.id), { 
          status: newStatus,
          discardMotive: null,
          fidelityMonth: null
        });
        showToast(`Movido para ${newStatus}`);
      } catch (err) {
        showToast("Erro ao mover lead.", 'error');
      }
    }
    setDraggedLead(null);
  };

  // --- FILTROS ---
  const filteredLeads = useMemo(() => {
    return myLeads.filter(l => {
      const matchesMonth = l.date && l.date.startsWith(selectedMonth);
      const safeName = l.customerName || '';
      const safePhone = l.customerPhone || '';
      const matchesSearch = safeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            safePhone.includes(searchTerm);
      const matchesType = filterLeadType === 'all' || l.leadType === filterLeadType;
      
      return matchesMonth && matchesSearch && matchesType;
    }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)); 
  }, [myLeads, selectedMonth, searchTerm, filterLeadType]);

  const totalLeads = filteredLeads.length;
  const closedLeads = filteredLeads.filter(l => ['Contratado', 'Instalado'].includes(l.status)).length;

  const KANBAN_COLUMNS = [
    { id: 'Novo', label: 'Novos', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
    { id: 'Em Negociação', label: 'Em Negociação', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    { id: 'Contratado', label: 'Contratado', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    { id: 'Instalado', label: 'Instalado', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
    { id: 'Descartado', label: 'Perdido', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' }
  ];

  return (
    <div style={{ animation:'fadeIn 0.5s ease-out', paddingBottom: '40px', width: '100%' }}>
      
      {/* HERO SECTION */}
      <div style={local.heroSection}>
        <div style={local.heroMain}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={local.userIconCircle}><UserCircle size={40} color="white"/></div>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '900', margin: 0, letterSpacing: '-0.02em', color: 'white' }}>{getGreeting()}, {userData?.name?.split(' ')[0] || 'Consultor'}! ✨</h2>
                <p style={{ fontSize: '14px', color: '#cbd5e1', margin: '5px 0 0 0' }}>Gere o teu funil e movimenta os cartões para atualizar.</p>
              </div>
           </div>
           
           <div style={local.quoteCard}>
              <div style={{ marginBottom: '10px' }}><Quote size={20} color="#60a5fa"/></div>
              <p style={{ fontSize: '13px', fontStyle: 'italic', lineHeight: '1.5', color: '#e2e8f0', margin: 0 }}>"{randomQuote.text}"</p>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#60a5fa', marginTop: '10px', display: 'block', textTransform: 'uppercase' }}>— {randomQuote.author}</span>
           </div>
        </div>

        <div style={local.miniStatsRow}>
           <div style={local.miniStatItem}>
              <span style={local.miniStatLabel}>Leads Ativos</span>
              <span style={local.miniStatValue}>{totalLeads} Leads</span>
           </div>
           <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
           <div style={local.miniStatItem}>
              <span style={local.miniStatLabel}>Vendas Concluídas</span>
              <span style={local.miniStatValue}><CheckCircle2 size={16} color="#10b981"/> {closedLeads}</span>
           </div>
           <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
           <div style={local.miniStatItem}>
              <span style={local.miniStatLabel}>Loja</span>
              <span style={local.miniStatValue}><MapPin size={16} color="#ef4444"/> {userData?.cityId || 'Geral'}</span>
           </div>
        </div>
      </div>

      {/* HEADER DA PÁGINA COM BOTÃO NO TOPO */}
      <div style={global.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
          <div style={{...global.iconHeader, background: '#f59e0b'}}>
            <Users size={28} color="white"/>
          </div>
          <div>
            <h1 style={global.title}>Os Meus Leads</h1>
            <p style={global.subtitle}>Organização visual do processo de vendas.</p>
          </div>
        </div>
        <button onClick={() => onNavigate && onNavigate('nova_venda')} style={{...global.btnPrimary, marginLeft: 'auto', background: 'var(--text-brand)'}}>
          <PlusCircle size={18} /> Novo Lead
        </button>
      </div>

      {/* TOOLBAR (Filtros) */}
      <div style={global.headerBox}>
        <div style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
          <div style={{...global.searchBox, flex: 1, minWidth: '200px'}}>
            <Search size={18} color="var(--text-muted)" />
            <input 
              placeholder="Buscar cliente por nome ou tel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={global.searchInput}
            />
          </div>

          <div style={local.selectWrapper}>
             <Calendar size={18} color="var(--text-muted)" />
             <input 
               type="month" 
               value={selectedMonth} 
               onChange={(e) => setSelectedMonth(e.target.value)}
               style={local.dateInput}
             />
          </div>

          <div style={local.selectWrapper}>
             <Layers size={18} color="var(--text-muted)" />
             <select style={local.selectInput} value={filterLeadType} onChange={e => setFilterLeadType(e.target.value)}>
                <option value="all">Todos os Tipos</option>
                <option value="Plano Novo">Plano Novo</option>
                <option value="Migração">Migração</option>
                <option value="SVA">SVA</option>
             </select>
          </div>
        </div>
      </div>

      {/* KANBAN BOARD - AGORA COM TODAS AS COLUNAS */}
      <div style={local.kanbanBoard} className="hide-scrollbar">
        {KANBAN_COLUMNS.map(col => {
          const colLeads = filteredLeads.filter(l => {
             // Tratamento para status em negociação antigo (case sensitive fallback)
             const status = l.status === 'Em negociação' ? 'Em Negociação' : l.status;
             return (status === col.id) || (!l.status && col.id === 'Novo');
          });
          
          return (
            <div 
              key={col.id} 
              style={local.kanbanColumn}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: `2px solid ${col.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '900', color: 'var(--text-main)', textTransform: 'uppercase' }}>
                  <div style={{width: 10, height: 10, borderRadius: '50%', backgroundColor: col.color}} />
                  {col.label}
                </div>
                <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '900', backgroundColor: col.bg, color: col.color }}>
                  {colLeads.length}
                </span>
              </div>

              <div style={local.columnBody}>
                {colLeads.length === 0 && (
                   <div style={local.emptyColumn}>Solte aqui</div>
                )}
                
                {colLeads.map(lead => (
                  <div 
                    key={lead.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead)}
                    style={{...local.kanbanCard, borderLeft: `4px solid ${col.color}`, opacity: draggedLead?.id === lead.id ? 0.5 : 1}}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>{lead.date?.split('-').reverse().join('/')}</span>
                      <div style={{display:'flex', gap:'5px'}}>
                        <button style={{ background: 'transparent', border: 'none', cursor: 'grab', padding: '4px' }} title="Arraste para mover">
                           <GripVertical size={14} color="var(--text-muted)" />
                        </button>
                        <button onClick={() => setUpdateModal(lead)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }} title="Editar">
                           <Edit2 size={14} color="var(--text-main)" />
                        </button>
                      </div>
                    </div>
                    
                    <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 4px 0' }}>{lead.customerName || 'Sem Nome'}</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 12px 0', fontWeight: '600' }}>
                      <Phone size={12}/> {lead.customerPhone || 'S/ Telefone'}
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px dashed var(--border)' }}>
                      <span style={{ background: 'var(--bg-app)', color: 'var(--text-muted)', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', width: 'fit-content', textTransform: 'uppercase' }}>{lead.leadType}</span>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-brand)' }}>{lead.productName}</span>
                    </div>

                    {lead.status === 'Descartado' && lead.discardMotive && (
                      <div style={{ marginTop: '8px', fontSize: '11px', color: '#ef4444', fontWeight: '800', background: 'var(--bg-danger-light)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-danger)' }}>
                        Perda: {lead.discardMotive}
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
        <div style={{ position: 'fixed', bottom: '30px', right: '30px', padding: '15px 25px', borderRadius: '12px', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 1000, background: notification.type === 'error' ? '#ef4444' : '#10b981', boxShadow: 'var(--shadow-sm)' }}>
           {notification.type === 'error' ? <AlertTriangle size={18}/> : <CheckCircle2 size={18}/>}
           {notification.message}
        </div>
      )}

      {/* MODAL DE ATUALIZAÇÃO / DESCARTE */}
      {updateModal && (
        <div style={global.modalOverlay}>
          <div style={global.modalBox}>
             <div style={global.modalHeader}>
               <div>
                 <h3 style={global.modalTitle}>Gerir Lead</h3>
                 <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '5px 0 0 0', fontWeight: '600' }}>{updateModal.customerName}</p>
               </div>
               <button onClick={() => setUpdateModal(null)} style={global.closeBtn}><X size={24}/></button>
             </div>
             
             <form onSubmit={handleUpdate} style={global.form}>
               <div style={global.field}>
                  <label style={global.label}>Situação Atual:</label>
                  <select value={updateModal.status || ''} onChange={e => setUpdateModal({...updateModal, status: e.target.value, discardMotive: ''})} style={global.select}>
                    {KANBAN_COLUMNS.map(c => (
                       <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
               </div>

               {updateModal.status === 'Descartado' && (
                 <div style={{ padding: '20px', background: 'var(--bg-danger-light)', borderRadius: '20px', border: '1px solid var(--border-danger)', marginTop: '15px' }}>
                    <div style={global.field}>
                      <label style={{...global.label, color: '#ef4444'}}>Qual o motivo da perda?</label>
                      <select value={updateModal.discardMotive || ''} onChange={e => setUpdateModal({...updateModal, discardMotive: e.target.value})} style={{...global.select, borderColor: 'var(--border-danger)'}} required>
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
                         <label style={{...global.label, color: '#ef4444'}}>Mês Estimado de Fim de Fidelidade</label>
                         <input type="month" value={updateModal.fidelityMonth || ''} onChange={e => setUpdateModal({...updateModal, fidelityMonth: e.target.value})} style={{...global.input, borderColor: 'var(--border-danger)'}} required/>
                       </div>
                    )}
                 </div>
               )}

               <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
                 <button type="button" onClick={() => setUpdateModal(null)} style={{...global.btnSecondary, flex: 1}}>Cancelar</button>
                 <button type="submit" style={{...global.btnPrimary, flex: 2, background: 'var(--text-brand)'}}>Confirmar</button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}

const local = {
  heroSection: { background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderRadius: '24px', padding: '35px', marginBottom: '30px', boxShadow: 'var(--shadow-sm)' },
  heroMain: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '30px', marginBottom: '30px' },
  userIconCircle: { width: '60px', height: '60px', background: 'rgba(255,255,255,0.1)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  quoteCard: { background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', maxWidth: '350px' },
  miniStatsRow: { display: 'flex', gap: '30px', background: 'rgba(255,255,255,0.03)', padding: '15px 25px', borderRadius: '16px', width: 'fit-content', flexWrap: 'wrap' },
  miniStatItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  miniStatLabel: { fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' },
  miniStatValue: { fontSize: '15px', fontWeight: '900', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' },

  selectWrapper: { background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', borderRadius: '12px', border: '1px solid var(--border)' },
  dateInput: { border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', cursor: 'pointer' },
  selectInput: { border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', cursor: 'pointer' },

  kanbanBoard: { display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px', alignItems: 'flex-start', minHeight: '600px' },
  kanbanColumn: { flex: '0 0 320px', background: 'var(--bg-panel)', borderRadius: '20px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px', border: '1px solid var(--border)' },
  columnBody: { display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '150px' },
  emptyColumn: { textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', padding: '20px 0', border: '2px dashed var(--border)', borderRadius: '12px' },
  
  kanbanCard: { background: 'var(--bg-card)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', cursor: 'grab', boxShadow: 'var(--shadow-sm)', transition: 'transform 0.2s' },
};