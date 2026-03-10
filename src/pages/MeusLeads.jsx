import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, updateDoc, doc, onSnapshot, deleteDoc } from 'firebase/firestore'; // Adicionado deleteDoc
import { 
  Calendar, Phone, X, Search, PlusCircle, 
  Quote, CheckCircle2, UserCircle, MapPin, AlertTriangle,
  Layers, Edit2, GripVertical, Users, Trash2 // Adicionado Trash2
} from 'lucide-react';

// IMPORTAÇÃO DOS ESTILOS GLOBAIS
import { styles as global } from '../styles/globalStyles';

export default function MeusLeads({ userData, onNavigate }) {
  const [myLeads, setMyLeads] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [updateModal, setUpdateModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const [filterLeadType, setFilterLeadType] = useState('all');
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

  // --- FUNÇÃO DE EXCLUSÃO ---
  const handleDeleteLead = async (leadId, customerName) => {
    const confirmed = window.confirm(`CUIDADO: Deseja realmente excluir o lead de "${customerName}"? Esta ação é permanente.`);
    
    if (confirmed) {
      try {
        await deleteDoc(doc(db, "leads", leadId));
        showToast("Lead removido com sucesso.");
      } catch (error) {
        console.error("Erro ao deletar:", error);
        showToast("Erro ao excluir lead do banco.", "error");
      }
    }
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

  // --- DRAG AND DROP ---
  const handleDragStart = (e, lead) => {
    setDraggedLead(lead);
    e.dataTransfer.setData("text/plain", lead.id);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (!draggedLead) return;
    if (draggedLead.status === newStatus) { setDraggedLead(null); return; }

    if (newStatus === 'Descartado') {
      setUpdateModal({ ...draggedLead, status: 'Descartado', discardMotive: '' });
    } else {
      try {
        await updateDoc(doc(db, "leads", draggedLead.id), { status: newStatus, discardMotive: null, fidelityMonth: null });
        showToast(`Movido para ${newStatus}`);
      } catch (err) { showToast("Erro ao mover lead.", 'error'); }
    }
    setDraggedLead(null);
  };

  // --- FILTROS ---
  const filteredLeads = useMemo(() => {
    return myLeads.filter(l => {
      const matchesMonth = l.date && l.date.startsWith(selectedMonth);
      const safeName = l.customerName || '';
      const safePhone = l.customerPhone || '';
      const matchesSearch = safeName.toLowerCase().includes(searchTerm.toLowerCase()) || safePhone.includes(searchTerm);
      const matchesType = filterLeadType === 'all' || l.leadType === filterLeadType;
      return matchesMonth && matchesSearch && matchesType;
    }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)); 
  }, [myLeads, selectedMonth, searchTerm, filterLeadType]);

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
                <h2 style={{ fontSize: '24px', fontWeight: '900', margin: 0, color: 'white' }}>{getGreeting()}, {userData?.name?.split(' ')[0] || 'Consultor'}! ✨</h2>
                <p style={{ fontSize: '14px', color: '#cbd5e1', margin: '5px 0 0 0' }}>Organize suas vendas arrastando os cartões.</p>
              </div>
           </div>
           <div style={local.quoteCard}>
              <Quote size={20} color="#60a5fa" style={{marginBottom: '10px'}}/>
              <p style={{ fontSize: '13px', fontStyle: 'italic', color: '#e2e8f0', margin: 0 }}>"{randomQuote.text}"</p>
           </div>
        </div>

        <div style={local.miniStatsRow}>
           <div style={local.miniStatItem}><span style={local.miniStatLabel}>Ativos</span><span style={local.miniStatValue}>{filteredLeads.length}</span></div>
           <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
           <div style={local.miniStatItem}><span style={local.miniStatLabel}>Vendas</span><span style={local.miniStatValue}><CheckCircle2 size={16} color="#10b981"/> {closedLeads}</span></div>
           <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
           <div style={local.miniStatItem}><span style={local.miniStatLabel}>Loja</span><span style={local.miniStatValue}><MapPin size={16} color="#ef4444"/> {userData?.cityId || 'Geral'}</span></div>
        </div>
      </div>

      {/* HEADER & FILTROS */}
      <div style={global.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
          <div style={{...global.iconHeader, background: '#f59e0b'}}><Users size={28} color="white"/></div>
          <div><h1 style={global.title}>Meu Funil</h1></div>
        </div>
        <button onClick={() => onNavigate && onNavigate('nova_venda')} style={{...global.btnPrimary, marginLeft: 'auto', background: 'var(--text-brand)'}}>
          <PlusCircle size={18} /> Novo Lead
        </button>
      </div>

      <div style={global.headerBox}>
        <div style={{ display: 'flex', gap: '12px', flex: 1, flexWrap: 'wrap' }}>
          <div style={{...global.searchBox, flex: 1}}>
            <Search size={18} color="var(--text-muted)" />
            <input placeholder="Buscar cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={global.searchInput} />
          </div>
          <div style={local.selectWrapper}><Calendar size={18} color="var(--text-muted)" /><input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} style={local.dateInput}/></div>
        </div>
      </div>

      {/* KANBAN BOARD */}
      <div style={local.kanbanBoard} className="hide-scrollbar">
        {KANBAN_COLUMNS.map(col => {
          const colLeads = filteredLeads.filter(l => (l.status === col.id) || (!l.status && col.id === 'Novo'));
          return (
            <div key={col.id} style={local.kanbanColumn} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: `2px solid ${col.color}` }}>
                <span style={{ fontSize: '13px', fontWeight: '900', color: 'var(--text-main)' }}>{col.label}</span>
                <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '900', backgroundColor: col.bg, color: col.color }}>{colLeads.length}</span>
              </div>

              <div style={local.columnBody}>
                {colLeads.map(lead => (
                  <div key={lead.id} draggable onDragStart={(e) => handleDragStart(e, lead)} style={{...local.kanbanCard, borderLeft: `4px solid ${col.color}`, opacity: draggedLead?.id === lead.id ? 0.5 : 1}}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)' }}>{lead.date?.split('-').reverse().join('/')}</span>
                      <div style={{display:'flex', gap:'5px'}}>
                        {/* BOTÃO EXCLUIR (LIXEIRA) */}
                        <button onClick={() => handleDeleteLead(lead.id, lead.customerName)} style={local.iconBtnRed} title="Excluir">
                            <Trash2 size={14} />
                        </button>
                        <button onClick={() => setUpdateModal(lead)} style={local.iconBtn} title="Editar">
                            <Edit2 size={14} />
                        </button>
                        <div style={{cursor: 'grab'}}><GripVertical size={14} color="var(--text-muted)" /></div>
                      </div>
                    </div>
                    
                    <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 4px 0' }}>{lead.customerName}</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                      <Phone size={11}/> {lead.customerPhone}
                    </p>
                    
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed var(--border)' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-brand)' }}>{lead.productName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* MODAL DE ATUALIZAÇÃO */}
      {updateModal && (
        <div style={global.modalOverlay}>
          <div style={global.modalBox}>
             <div style={global.modalHeader}>
               <h3 style={global.modalTitle}>Gerir Lead: {updateModal.customerName}</h3>
               <button onClick={() => setUpdateModal(null)} style={global.closeBtn}><X size={20}/></button>
             </div>
             <form onSubmit={handleUpdate} style={global.form}>
                <div style={global.field}>
                   <label style={global.label}>Mudar Status:</label>
                   <select value={updateModal.status || ''} onChange={e => setUpdateModal({...updateModal, status: e.target.value})} style={global.select}>
                      {KANBAN_COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                   </select>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="button" onClick={() => setUpdateModal(null)} style={global.btnSecondary}>Sair</button>
                  <button type="submit" style={global.btnPrimary}>Salvar</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* TOAST */}
      {notification && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', padding: '12px 20px', borderRadius: '10px', color: 'white', background: notification.type === 'error' ? '#ef4444' : '#10b981', zIndex: 9999, fontWeight: 'bold' }}>
          {notification.message}
        </div>
      )}
    </div>
  );
}

const local = {
  heroSection: { background: '#1e293b', borderRadius: '20px', padding: '30px', marginBottom: '25px' },
  heroMain: { display: 'flex', justifyContent: 'space-between', marginBottom: '25px' },
  userIconCircle: { width: '50px', height: '50px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  quoteCard: { background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '15px', maxWidth: '300px' },
  miniStatsRow: { display: 'flex', gap: '20px' },
  miniStatItem: { display: 'flex', flexDirection: 'column' },
  miniStatLabel: { fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase' },
  miniStatValue: { fontSize: '14px', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '5px' },
  selectWrapper: { background: 'var(--bg-card)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' },
  dateInput: { border: 'none', background: 'transparent', outline: 'none', fontWeight: 'bold', color: 'var(--text-main)', fontSize: '12px' },
  kanbanBoard: { display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '15px' },
  kanbanColumn: { flex: '0 0 280px', background: 'var(--bg-panel)', borderRadius: '18px', padding: '15px', border: '1px solid var(--border)' },
  columnBody: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px', minHeight: '100px' },
  kanbanCard: { background: 'var(--bg-card)', padding: '15px', borderRadius: '15px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)', padding: '2px' },
  iconBtnRed: { background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px' }
};