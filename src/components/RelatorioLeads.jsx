import React, { useState, useEffect, useMemo } from 'react';
import { auth } from '../firebase';
import { 
  FileSpreadsheet, Search, Filter, Download, 
  ArrowUpDown, MapPin, Zap, Layers, FileText,
  Calendar, CheckCircle, Clock, XCircle, AlertCircle 
} from 'lucide-react';

import { styles as global, colors } from '../styles/globalStyles';
import { listenMyLeads } from '../services/leads';

export default function RelatorioLeads({ userData }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // ─── ESTADOS DE FILTRO ───
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [categoryFilter, setCategoryFilter] = useState('Todas'); // NOVO FILTRO

  // Lógica para pegar o primeiro e último dia do mês atual
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  useEffect(() => {
    let unsubscribeSnapshot;
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        setLoading(true);
        unsubscribeSnapshot = listenMyLeads(user.uid, (leadsData) => {
          // Filtro local para garantir que a tabela exiba apenas vendas Deste Mês
          const thisMonthLeads = leadsData.filter(lead => {
            const leadDate = new Date(lead.date || (lead.createdAt?.seconds * 1000) || Date.now());
            return leadDate >= firstDay && leadDate <= lastDay;
          });

          setLeads(thisMonthLeads);
          setLoading(false);
        });
      } else {
        setLeads([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  // ─── LISTA DINÂMICA DE CATEGORIAS ───
  // Lê todos os leads carregados e extrai as categorias únicas
  const availableCategories = useMemo(() => {
    const cats = leads.map(l => l.categoryName || 'Outros');
    return ['Todas', ...new Set(cats)];
  }, [leads]);

  // ─── FILTROS EM TEMPO REAL ───
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = lead.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || lead.customerPhone?.includes(searchTerm);
      const matchesStatus = statusFilter === 'Todos' || lead.status === statusFilter;
      const matchesCategory = categoryFilter === 'Todas' || (lead.categoryName || 'Outros') === categoryFilter;
      
      return matchesSearch && matchesStatus && matchesCategory;
    }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)); // Ordena do mais recente para o mais antigo
  }, [leads, searchTerm, statusFilter, categoryFilter]);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Instalado': return { bg: 'rgba(16, 185, 129, 0.1)', color: colors.success, icon: <CheckCircle size={14}/> };
      case 'Contratado': return { bg: 'rgba(59, 130, 246, 0.1)', color: colors.primary, icon: <Zap size={14}/> };
      case 'Em negociação': return { bg: 'rgba(245, 158, 11, 0.1)', color: colors.warning, icon: <Clock size={14}/> };
      case 'Descartado': return { bg: 'rgba(239, 68, 68, 0.1)', color: colors.danger, icon: <XCircle size={14}/> };
      default: return { bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', icon: <AlertCircle size={14}/> };
    }
  };

  // ─── EXPORTAÇÃO CSV ───
  const handleExportCSV = () => {
    const headers = "Data,Cliente,Telefone,Unidade,Categoria,Plano,Status,Valor(R$)\n";
    const rows = filteredLeads.map(l => {
      const dataStr = l.date ? l.date.split('-').reverse().join('/') : 'N/D';
      return `${dataStr},"${l.customerName}","${l.customerPhone}","${l.cityName || l.cityId}","${l.categoryName || 'Outros'}","${l.productName}",${l.status},${Number(l.productPrice || 0).toFixed(2)}`;
    }).join("\n");
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = `oquei_meus_leads_${now.toISOString().slice(0,7)}.csv`; 
    a.click();
  };

  // ─── EXPORTAÇÃO PDF ───
  const handleExportPDF = () => {
    const printStyle = document.createElement('style');
    printStyle.id = 'print-styles';
    printStyle.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        #printable-report, #printable-report * { visibility: visible; }
        #printable-report { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
        .no-print { display: none !important; }
        /* Tira o fundo do body para não gastar tinta desnecessária */
        body { background: white !important; } 
      }
    `;
    document.head.appendChild(printStyle);
    window.print();
    setTimeout(() => document.getElementById('print-styles')?.remove(), 1000);
  };

  return (
    <div className="animated-view animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', paddingBottom: '40px' }}>
      
      <div id="printable-report" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* ─── CABEÇALHO HUB OQUEI STYLE ─── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '24px 30px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 16px rgba(139, 92, 246, 0.35)` }}>
              <FileSpreadsheet size={28} color="white" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Meus Leads do Mês</h1>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', fontWeight: '600', marginTop: '4px' }}>
                Relatório de captações em {now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}.
              </p>
            </div>
          </div>
          
          <div className="no-print" style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-main)', fontSize: '13px', fontWeight: '900', cursor: 'pointer', transition: '0.2s' }}>
              <Download size={16} /> CSV
            </button>
            <button onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-main)', fontSize: '13px', fontWeight: '900', cursor: 'pointer', transition: '0.2s', boxShadow: 'var(--shadow-sm)' }}>
              <FileText size={16} /> Salvar PDF
            </button>
          </div>
        </div>

        {/* ─── BARRA DE FILTROS ─── */}
        <div className="no-print" style={{ display: 'flex', gap: '15px', background: 'var(--bg-card)', padding: '15px', borderRadius: '16px', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
          
          <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              placeholder="Buscar por nome ou telefone..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              style={{...global.input, paddingLeft: '48px', height: '48px', borderRadius: '12px', width: '100%'}} 
            />
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', position: 'relative', width: '220px' }}>
            <Layers size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }} />
            <select 
              style={{...global.select, paddingLeft: '48px', height: '48px', borderRadius: '12px', width: '100%', cursor: 'pointer'}}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>{cat === 'Todas' ? 'Todas as Categorias' : cat}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', position: 'relative', width: '220px' }}>
            <Filter size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }} />
            <select 
              style={{...global.select, paddingLeft: '48px', height: '48px', borderRadius: '12px', width: '100%', cursor: 'pointer'}}
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

        {/* ─── TABELA DE LEADS ─── */}
        <div style={{ ...global.card, padding: '0', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '20px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}>Data <ArrowUpDown size={12} style={{marginLeft: '4px', verticalAlign: 'middle'}}/></th>
                  <th style={{ padding: '20px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}>Cliente</th>
                  <th style={{ padding: '20px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}>Categoria</th>
                  <th style={{ padding: '20px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}>Plano Solicitado</th>
                  <th style={{ padding: '20px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}>Status</th>
                  <th style={{ padding: '20px', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)', textAlign: 'right' }}>Valor Estimado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px', fontWeight: '800' }}>Carregando seus dados...</td></tr>
                ) : filteredLeads.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px', fontWeight: '800' }}>Nenhum lead encontrado para este filtro.</td></tr>
                ) : (
                  filteredLeads.map((lead) => {
                    const style = getStatusStyle(lead.status);
                    return (
                      <tr key={lead.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'var(--bg-panel)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '800' }}>
                          {lead.date ? lead.date.split('-').reverse().join('/') : '--/--/----'}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-main)', marginBottom: '4px' }}>{lead.customerName}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>{lead.customerPhone}</div>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '800' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Layers size={14} color="var(--text-muted)" /> {lead.categoryName || 'Outros'}
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--text-main)', fontWeight: '800' }}>
                          {lead.productName || 'Não Informado'}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '900', backgroundColor: style.bg, color: style.color }}>
                            {style.icon} {lead.status || 'Novo'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right', fontSize: '15px', fontWeight: '900', color: lead.status === 'Contratado' || lead.status === 'Instalado' ? colors.success : 'var(--text-main)' }}>
                          R$ {Number(lead.productPrice || 0).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── RESUMO FINANCEIRO NO RODAPÉ ─── */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '10px' }}>
          <div style={{ flex: 1, background: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leads na Seleção</span>
            <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-main)', marginTop: '5px' }}>{filteredLeads.length}</div>
          </div>
          
          <div style={{ flex: 1, background: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', borderLeft: `4px solid ${colors.success}` }}>
            <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Conversão (Vendas)</span>
            <div style={{ fontSize: '28px', fontWeight: '900', color: colors.success, marginTop: '5px' }}>
              {filteredLeads.filter(l => l.status === 'Contratado' || l.status === 'Instalado').length}
            </div>
          </div>
          
          <div style={{ flex: 1, background: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Receita Potencial (Seleção)</span>
            <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-main)', marginTop: '5px' }}>
              R$ {filteredLeads.reduce((acc, curr) => acc + Number(curr.productPrice || 0), 0).toFixed(2)}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}