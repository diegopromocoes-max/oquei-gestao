import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Phone, X, Search, PlusCircle, 
  Quote, CheckCircle2, UserCircle, MapPin,
  Edit2, GripVertical, Users, Trash2, Kanban, Tag
} from 'lucide-react';

import { styles as global, colors } from '../styles/globalStyles';
import { listenMyLeads, updateLeadStatus, deleteLead } from '../services/leads';

export default function MeusLeads({ userData, onNavigate }) {
  const [myLeads, setMyLeads] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [updateModal, setUpdateModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);
  const [draggedLead, setDraggedLead] = useState(null);
  const [permissionError, setPermissionError] = useState('');

  const quotes = [
    { text: "O sucesso é a soma de pequenos esforços repetidos dia após dia.", author: "Robert Collier" },
    { text: "Vender é ajudar o cliente a comprar o que ele realmente precisa.", author: "Oquei Telecom" },
    { text: "Cada 'não' te deixa mais perto do próximo 'sim'.", author: "Comercial" }
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

  // ─── INIT: BUSCA DE DADOS VIA SERVICE ───
  useEffect(() => {
    if (!userData?.uid) {
      setMyLeads([]);
      return undefined;
    }

    return listenMyLeads(
      userData.uid,
      (leadsData) => {
        setMyLeads(leadsData);
        setPermissionError('');
      },
      selectedMonth,
      () => setPermissionError('Nao foi possivel carregar o seu funil neste momento.')
    );
  }, [selectedMonth, userData?.uid]);

  // ─── AÇÕES KANBAN E CRUD ───
  const handleDeleteLead = async (leadId, customerName) => {
    if (window.confirm(`CUIDADO: Deseja realmente excluir o lead de "${customerName}"?`)) {
      try {
        await deleteLead(leadId);
        showToast("Lead removido com sucesso.");
      } catch (error) {
        showToast("Erro ao excluir lead.", "error");
      }
    }
  };

  const handleUpdate = async (e) => {
    e?.preventDefault();
    if (updateModal.status === 'Descartado' && !updateModal.discardMotive) {
      return showToast("Defina o motivo da perda.", 'error');
    }
    
    try {
      await updateLeadStatus(updateModal.id, updateModal.status, {
        motive: updateModal.discardMotive,
        fidelityMonth: updateModal.fidelityMonth
      });
      setUpdateModal(null);
      showToast("Funil atualizado com sucesso!");
    } catch (err) { 
      showToast("Erro ao atualizar status.", 'error');
    }
  };

  // ─── DRAG AND DROP ───
  const handleDragStart = (e, lead) => {
    setDraggedLead(lead);
    e.dataTransfer.setData("text/plain", lead.id);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (!draggedLead) return;
    if (draggedLead.status === newStatus) { 
      setDraggedLead(null); 
      return; 
    }

    // Se moveu para descartado, abre o modal forçando a informar o motivo
    if (newStatus === 'Descartado') {
      setUpdateModal({ ...draggedLead, status: 'Descartado', discardMotive: '' });
    } else {
      try {
        await updateLeadStatus(draggedLead.id, newStatus);
        showToast(`Movido para ${newStatus}`);
      } catch (err) { 
        showToast("Erro ao mover lead.", 'error'); 
      }
    }
    setDraggedLead(null);
  };

  // ─── FILTROS ───
  const filteredLeads = useMemo(() => {
    return myLeads.filter(l => {
      const safeName = l.customerName || '';
      const safePhone = l.customerPhone || '';
      const matchesSearch = safeName.toLowerCase().includes(searchTerm.toLowerCase()) || safePhone.includes(searchTerm);
      return matchesSearch;
    }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)); 
  }, [myLeads, searchTerm]);

  const closedLeads = filteredLeads.filter(l => ['Contratado', 'Instalado'].includes(l.status)).length;

  const KANBAN_COLUMNS = [
    { id: 'Em negociação', label: 'Em Negociação', color: colors.warning || '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
    { id: 'Contratado', label: 'Contratado', color: colors.primary || '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    { id: 'Instalado', label: 'Instalado', color: colors.success || '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
    { id: 'Descartado', label: 'Perdido', color: colors.danger || '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' }
  ];

  return (
    <div className="animated-view animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', paddingBottom: '40px' }}>
      
      {/* ─── HEADER HUB OQUEI STYLE ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '24px 30px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: colors.success, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 16px ${colors.success}35` }}>
<Kanban size={28} color="white" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>{getGreeting()}, {userData?.name?.split(' ')[0]}!</h1>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '4px' }}>Organize o seu funil de vendas arrastando os cartões.</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right', marginRight: '10px' }}>
             <div style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>VENDAS (MÊS)</div>
             <div style={{ fontSize: '24px', fontWeight: '900', color: colors.success, display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={20} /> {closedLeads}</div>
          </div>
          <button onClick={() => onNavigate && onNavigate('nova_venda')} style={{...global.btnPrimary, background: colors.primary, boxShadow: `0 8px 16px ${colors.primary}35`, display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px'}}>
            <PlusCircle size={18} /> Novo Lead
          </button>
        </div>
      </div>

      {/* ─── BARRA DE PESQUISA E FILTROS ─── */}
      <div style={{ display: 'flex', gap: '15px', background: 'var(--bg-card)', padding: '15px', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            placeholder="Buscar por nome ou telefone..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={{...global.input, paddingLeft: '48px', height: '48px', borderRadius: '12px'}} 
          />
        </div>
        <div style={{ position: 'relative', width: '200px' }}>
          <Calendar size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="month" 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)} 
            style={{...global.input, paddingLeft: '48px', height: '48px', borderRadius: '12px'}}
          />
        </div>
      </div>

      {/* ─── KANBAN BOARD ─── */}
      {permissionError && (
        <div style={{ padding: '14px 16px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: colors.danger, fontWeight: 700 }}>
          {permissionError}
        </div>
      )}

      <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px', minHeight: '600px' }} className="hide-scrollbar">
        {KANBAN_COLUMNS.map(col => {
          // Garante que leads antigos ou sem status apareçam no primeiro card "Em Negociação"
          const colLeads = filteredLeads.filter(l => (l.status === col.id) || (!l.status && col.id === 'Em negociação'));
          
          return (
            <div key={col.id} style={{ flex: '0 0 300px', background: 'var(--bg-panel)', borderRadius: '20px', padding: '20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, col.id)}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: `2px solid ${col.color}40`, marginBottom: '16px' }}>
                <span style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: col.color }} />
                  {col.label}
                </span>
                <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '900', backgroundColor: col.bg, color: col.color }}>{colLeads.length}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                {colLeads.map(lead => (
                  <div 
                    key={lead.id} 
                    draggable 
                    onDragStart={(e) => handleDragStart(e, lead)} 
                    style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', borderLeft: `5px solid ${col.color}`, boxShadow: '0 4px 12px rgba(0,0,0,0.03)', opacity: draggedLead?.id === lead.id ? 0.5 : 1, cursor: 'grab', position: 'relative' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', background: 'var(--bg-app)', padding: '4px 8px', borderRadius: '6px' }}>{lead.date?.split('-').reverse().join('/') || '--/--/----'}</span>
                      <div style={{display:'flex', gap:'8px', alignItems: 'center'}}>
                        <button onClick={() => setUpdateModal(lead)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Editar">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteLead(lead.id, lead.customerName)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.danger }} title="Excluir">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <h4 style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 6px 0', lineHeight: '1.3' }}>{lead.customerName}</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0, fontWeight: '600' }}>
                      <Phone size={13}/> {lead.customerPhone}
                    </p>
                    
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Tag size={14} color={col.color} />
                      <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>{lead.productName || 'Produto não informado'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* ─── MODAL DE ATUALIZAÇÃO (COM BUG CORRIGIDO) ─── */}
      {updateModal && (
        <div style={global.modalOverlay}>
          <div style={{...global.modalBox, maxWidth: '450px', padding: '30px', borderRadius: '24px'}}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
               <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>Gerir Lead</h3>
               <button onClick={() => setUpdateModal(null)} style={{ background: 'var(--bg-panel)', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20}/></button>
             </div>
             
             <div style={{ background: 'var(--bg-app)', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--border)' }}>
               <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px 0', fontWeight: '800' }}>CLIENTE</p>
               <h4 style={{ fontSize: '16px', color: 'var(--text-main)', margin: 0, fontWeight: '900' }}>{updateModal.customerName}</h4>
             </div>

             <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={global.field}>
                   <label style={global.label}>Status da Venda</label>
                   <select value={updateModal.status || ''} onChange={e => setUpdateModal({...updateModal, status: e.target.value})} style={{...global.select, height: '48px', borderRadius: '12px'}}>
                      {KANBAN_COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                   </select>
                </div>

                {/* RESOLUÇÃO DO BUG: SELECIONOU DESCARTADO, MOSTRA OS MOTIVOS */}
                {updateModal.status === 'Descartado' && (
                  <div className="animate-fadeInUp" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '15px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div style={global.field}>
                      <label style={{...global.label, color: colors.danger}}>Motivo da Perda</label>
                      <select required value={updateModal.discardMotive || ''} onChange={e => setUpdateModal({...updateModal, discardMotive: e.target.value})} style={{...global.select, height: '48px', borderRadius: '12px', borderColor: 'rgba(239, 68, 68, 0.3)'}}>
                        <option value="">Selecione um motivo...</option>
                        <option value="Preço Alto">Preço Alto</option>
                        <option value="Concorrência Melhor">Fechou com Concorrência</option>
                        <option value="Inviabilidade Técnica">Sem Viabilidade Técnica</option>
                        <option value="Fidelidade em outro Provedor">Preso em Fidelidade Noutra Operadora</option>
                        <option value="Sem Retorno / Sumiu">Cliente Sumiu / Não Responde</option>
                      </select>
                    </div>

                    {updateModal.discardMotive === 'Fidelidade em outro Provedor' && (
                      <div style={global.field}>
                        <label style={{...global.label, color: colors.danger}}>Mês do Fim da Fidelidade</label>
                        <input required type="month" value={updateModal.fidelityMonth || ''} onChange={e => setUpdateModal({...updateModal, fidelityMonth: e.target.value})} style={{...global.input, height: '48px', borderRadius: '12px', borderColor: 'rgba(239, 68, 68, 0.3)'}} />
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                  <button type="button" onClick={() => setUpdateModal(null)} style={{...global.btnSecondary, flex: 1, padding: '14px', borderRadius: '12px'}}>Cancelar</button>
                  <button type="submit" style={{...global.btnPrimary, flex: 1, padding: '14px', borderRadius: '12px'}}>Salvar Lead</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* ─── TOAST NOTIFICATION ─── */}
      {notification && (
        <div style={{ position: 'fixed', bottom: '30px', right: '30px', padding: '16px 24px', borderRadius: '14px', color: 'white', background: notification.type === 'error' ? colors.danger : colors.success, zIndex: 9999, fontWeight: '900', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', animation: 'slideUpFade 0.3s ease-out' }}>
          {notification.message}
        </div>
      )}
    </div>
  );
}
