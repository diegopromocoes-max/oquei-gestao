import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { 
  FileSpreadsheet, Search, Filter, Download, 
  ChevronDown, ArrowUpDown, MapPin, Zap, 
  Calendar, CheckCircle, Clock, XCircle, AlertCircle 
} from 'lucide-react';

import { styles as global } from '../styles/globalStyles';

export default function RelatorioLeads({ userData }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  // Lógica para pegar o primeiro e último dia do mês atual
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  useEffect(() => {
    fetchLeads();
  }, [userData]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      if (!auth.currentUser) return;

      const leadsRef = collection(db, "leads");
      // Filtra apenas leads deste atendente
      const q = query(
        leadsRef, 
        where("attendantId", "==", auth.currentUser.uid),
        orderBy("createdAt", "desc")
      );

      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Filtro local adicional para garantir que seja deste mês (caso o campo date seja string)
      const thisMonthLeads = list.filter(lead => {
        const leadDate = new Date(lead.date || lead.createdAt?.seconds * 1000);
        return leadDate >= firstDay && leadDate <= lastDay;
      });

      setLeads(thisMonthLeads);
    } catch (error) {
      console.error("Erro ao buscar relatório:", error);
    }
    setLoading(false);
  };

  // Lógica de Filtro em Tempo Real
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Instalado': return { bg: '#05966915', color: '#059669', icon: <CheckCircle size={14}/> };
      case 'Contratado': return { bg: '#10b98115', color: '#10b981', icon: <Zap size={14}/> };
      case 'Em negociação': return { bg: '#f59e0b15', color: '#f59e0b', icon: <Clock size={14}/> };
      case 'Descartado': return { bg: '#ef444415', color: '#ef4444', icon: <XCircle size={14}/> };
      default: return { bg: '#3b82f615', color: '#3b82f6', icon: <AlertCircle size={14}/> };
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* CABEÇALHO DO RELATÓRIO */}
      <div style={global.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ ...global.iconHeader, background: '#8b5cf6' }}>
            <FileSpreadsheet size={28} color="white" />
          </div>
          <div>
            <h1 style={global.title}>Meus Leads do Mês</h1>
            <p style={global.subtitle}>Relatório detalhado de todas as suas captações em {now.toLocaleString('pt-BR', { month: 'long' })}.</p>
          </div>
        </div>
        
        {/* BOTÃO EXPORTAR (Mockup) */}
        <button onClick={() => window.showToast("Função disponível na versão Pro", "info")} style={local.exportBtn}>
          <Download size={18} /> Exportar CSV
        </button>
      </div>

      {/* BARRA DE FILTROS */}
      <div style={local.filterBar}>
        <div style={local.searchWrapper}>
          <Search size={18} color="var(--text-muted)" />
          <input 
            placeholder="Buscar cliente pelo nome..." 
            style={local.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Filter size={18} color="var(--text-muted)" />
          <select 
            style={local.selectFilter}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Todos">Todos os Status</option>
            <option value="Em negociação">Em Negociação</option>
            <option value="Contratado">Contratado</option>
            <option value="Instalado">Instalado</option>
            <option value="Descartado">Descartado</option>
          </select>
        </div>
      </div>

      {/* TABELA DE LEADS */}
      <div style={{ ...global.card, padding: '0', overflow: 'hidden', border: '1px solid var(--border)' }}>
        <table style={local.table}>
          <thead>
            <tr>
              <th style={local.th}>Data <ArrowUpDown size={12} /></th>
              <th style={local.th}>Cliente</th>
              <th style={local.th}>Cidade / Unidade</th>
              <th style={local.th}>Plano / Serviço</th>
              <th style={local.th}>Status</th>
              <th style={{ ...local.th, textAlign: 'right' }}>Valor Estimado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={local.loadingTd}>Carregando seus dados...</td></tr>
            ) : filteredLeads.length === 0 ? (
              <tr><td colSpan="6" style={local.emptyTd}>Nenhum lead encontrado para este filtro.</td></tr>
            ) : (
              filteredLeads.map((lead) => {
                const style = getStatusStyle(lead.status);
                return (
                  <tr key={lead.id} style={local.tr}>
                    <td style={local.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={14} color="var(--text-muted)" />
                        {new Date(lead.date).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td style={{ ...local.td, fontWeight: '800', color: 'var(--text-main)' }}>{lead.customerName}</td>
                    <td style={local.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={14} color="var(--text-muted)" /> {lead.cityId}
                      </div>
                    </td>
                    <td style={local.td}>{lead.productName}</td>
                    <td style={local.td}>
                      <span style={{ 
                        ...local.badge, 
                        backgroundColor: style.bg, 
                        color: style.color 
                      }}>
                        {style.icon} {lead.status}
                      </span>
                    </td>
                    <td style={{ ...local.td, textAlign: 'right', fontWeight: 'bold' }}>
                      R$ {Number(lead.productPrice || 0).toFixed(2)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* RESUMO NO RODAPÉ */}
      <div style={local.footerStats}>
        <div style={local.statItem}>
          <span style={local.statLabel}>Total de Leads</span>
          <span style={local.statValue}>{filteredLeads.length}</span>
        </div>
        <div style={local.statItem}>
          <span style={local.statLabel}>Conversão (Vendas)</span>
          <span style={{ ...local.statValue, color: '#10b981' }}>
            {filteredLeads.filter(l => l.status === 'Contratado' || l.status === 'Instalado').length}
          </span>
        </div>
        <div style={local.statItem}>
          <span style={local.statLabel}>Receita Potencial</span>
          <span style={local.statValue}>
            R$ {filteredLeads.reduce((acc, curr) => acc + Number(curr.productPrice || 0), 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

const local = {
  exportBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-main)', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' },
  filterBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '20px', flexWrap: 'wrap' },
  searchWrapper: { flex: 1, minWidth: '300px', display: 'flex', alignItems: 'center', gap: '12px', padding: '0 15px', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '14px' },
  searchInput: { flex: 1, border: 'none', padding: '12px 0', backgroundColor: 'transparent', color: 'var(--text-main)', outline: 'none', fontSize: '14px' },
  selectFilter: { padding: '10px 15px', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-main)', fontSize: '14px', outline: 'none', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', backgroundColor: 'var(--bg-panel)' },
  th: { padding: '18px 20px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.02)' },
  td: { padding: '16px 20px', fontSize: '14px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' },
  tr: { transition: '0.2s' },
  loadingTd: { padding: '100px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' },
  emptyTd: { padding: '100px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' },
  badge: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '800' },
  footerStats: { display: 'flex', gap: '40px', marginTop: '30px', padding: '25px', backgroundColor: 'var(--bg-panel)', borderRadius: '20px', border: '1px solid var(--border)' },
  statItem: { display: 'flex', flexDirection: 'column', gap: '5px' },
  statLabel: { fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' },
  statValue: { fontSize: '20px', fontWeight: '900', color: 'var(--text-main)' },
};