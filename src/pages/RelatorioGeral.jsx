import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { jsPDF } from "jspdf";
import {
FileText, Search, Calendar, Download, Filter,
ArrowUpDown, PieChart, Target, TrendingUp, CheckCircle,
Package, RefreshCw, Briefcase, MapPin, ChevronDown
} from 'lucide-react';

export default function RelatorioGeral({ userData }) {
const [leads, setLeads] = useState([]);
const [loading, setLoading] = useState(true);
const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
const [searchTerm, setSearchTerm] = useState('');

const [filterStatus, setFilterStatus] = useState('all');
const [filterLeadType, setFilterLeadType] = useState('all');
const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

const goals = { planos: 30, migracoes: 15, svas: 20 };

const fetchData = async () => {
setLoading(true);
try {
if (!auth?.currentUser) return;
const q = query(collection(db, "leads"), where("attendantId", "==", auth.currentUser.uid));
const snap = await getDocs(q);
const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
setLeads(data);
} catch (error) {
window.alert("Erro ao carregar dados: " + error.message);
}
setLoading(false);
};

useEffect(() => {
fetchData();
}, []);

const filteredAndSortedLeads = useMemo(() => {
let result = leads.filter(l => {
const matchesMonth = l.date && l.date.startsWith(selectedMonth);
const matchesSearch = l.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || l.customerPhone.includes(searchTerm);
const matchesStatus = filterStatus === 'all' || l.status === filterStatus;
const matchesType = filterLeadType === 'all' || l.leadType === filterLeadType;
return matchesMonth && matchesSearch && matchesStatus && matchesType;
});

result.sort((a, b) => {
  let valA = a[sortConfig.key] || '';
  let valB = b[sortConfig.key] || '';
  
  if (sortConfig.key === 'date') {
    valA = new Date(valA);
    valB = new Date(valB);
  }

  if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
  if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
  return 0;
});

return result;


}, [leads, selectedMonth, searchTerm, filterStatus, filterLeadType, sortConfig]);

const stats = useMemo(() => {
const currentLeads = leads.filter(l => l.date && l.date.startsWith(selectedMonth));
const total = currentLeads.length;

const byType = {
  'Plano Novo': currentLeads.filter(l => l.leadType === 'Plano Novo').length,
  'Migração': currentLeads.filter(l => l.leadType === 'Migração').length,
  'SVA': currentLeads.filter(l => l.leadType === 'SVA').length
};

const sales = currentLeads.filter(l => ['Contratado', 'Instalado'].includes(l.status));
const salesCount = sales.length;

const convRate = total > 0 ? ((salesCount / total) * 100).toFixed(1) : 0;

const salesByType = {
  planos: sales.filter(l => l.leadType === 'Plano Novo').length,
  migracoes: sales.filter(l => l.leadType === 'Migração').length,
  svas: sales.filter(l => l.leadType === 'SVA').length
};

const goalAchievement = {
  planos: Math.min((salesByType.planos / goals.planos) * 100, 100).toFixed(0),
  migracoes: Math.min((salesByType.migracoes / goals.migracoes) * 100, 100).toFixed(0),
  svas: Math.min((salesByType.svas / goals.svas) * 100, 100).toFixed(0)
};

return { total, byType, salesCount, convRate, goalAchievement };


}, [leads, selectedMonth]);

const requestSort = (key) => {
let direction = 'asc';
if (sortConfig.key === key && sortConfig.direction === 'asc') {
direction = 'desc';
}
setSortConfig({ key, direction });
};

const exportToPDF = () => {
const doc = new jsPDF('l', 'mm', 'a4');
const blueOquei = [37, 99, 235];

doc.setFillColor(...blueOquei);
doc.rect(0, 0, 297, 25, 'F');

doc.setTextColor(255, 255, 255);
doc.setFontSize(16);
doc.setFont("helvetica", "bold");
doc.text("RELATÓRIO GERAL DE LEADS - OQUEI TELECOM", 15, 16);

doc.setTextColor(0, 0, 0);
doc.setFontSize(10);
doc.setFont("helvetica", "normal");
doc.text(`Consultor: ${userData.name}`, 15, 35);
doc.text(`Período: ${selectedMonth.split('-').reverse().join('/')}`, 15, 40);
doc.text(`Total de Leads: ${stats.total} | Conversão: ${stats.convRate}%`, 15, 45);

let y = 55;
doc.setFillColor(241, 245, 249);
doc.rect(15, y - 5, 267, 8, 'F');
doc.setFont("helvetica", "bold");
doc.text("DATA", 17, y);
doc.text("CLIENTE", 45, y);
doc.text("CIDADE", 105, y);
doc.text("TIPO", 150, y);
doc.text("PRODUTO", 190, y);
doc.text("STATUS", 240, y);

y += 10;
doc.setFont("helvetica", "normal");
filteredAndSortedLeads.forEach(l => {
  if (y > 185) { doc.addPage('l'); y = 20; }
  doc.text(l.date?.split('-').reverse().join('/') || '', 17, y);
  doc.text(l.customerName?.substring(0, 25) || '', 45, y);
  doc.text(l.cityId?.substring(0, 15) || '', 105, y);
  doc.text(l.leadType || '', 150, y);
  doc.text(l.productName?.substring(0, 25) || '', 190, y);
  doc.text(l.status || '', 240, y);
  y += 8;
  doc.setDrawColor(241, 245, 249);
  doc.line(15, y - 4, 282, y - 4);
});

doc.save(`Relatorio_Leads_${selectedMonth}.pdf`);


};

return (
<div style={styles.container}>
<div style={styles.header}>
<div style={styles.iconHeader}><FileText size={28} color="white"/></div>
<div>
<h1 style={styles.title}>Relatório Geral</h1>
<p style={styles.subtitle}>Visão analítica e exportação de dados.</p>
</div>
<button onClick={exportToPDF} style={styles.btnExport}>
<Download size={18} /> Exportar PDF
</button>
</div>

  <div style={styles.statsGrid}>
    <div style={styles.statCard}>
      <div style={styles.statHeader}>
        <PieChart size={20} color="#64748b"/>
        <span style={styles.statLabel}>Volume por Tipo</span>
      </div>
      <div style={styles.typeStatsRow}>
        <div style={styles.typeItem}>
          <span style={{...styles.dot, background: '#3b82f6'}}></span>
          <span style={styles.typeText}>Planos: <strong>{stats.byType['Plano Novo']}</strong></span>
        </div>
        <div style={styles.typeItem}>
          <span style={{...styles.dot, background: '#f59e0b'}}></span>
          <span style={styles.typeText}>Migrações: <strong>{stats.byType['Migração']}</strong></span>
        </div>
        <div style={styles.typeItem}>
          <span style={{...styles.dot, background: '#10b981'}}></span>
          <span style={styles.typeText}>SVAs: <strong>{stats.byType['SVA']}</strong></span>
        </div>
      </div>
    </div>

    <div style={styles.statCard}>
      <div style={styles.statHeader}>
        <Target size={20} color="#10b981"/>
        <span style={styles.statLabel}>Atingimento de Metas</span>
      </div>
      <div style={styles.goalRow}>
        <div style={styles.goalMini}>
          <span style={styles.goalName}>Planos</span>
          <span style={styles.goalPerc}>{stats.goalAchievement.planos}%</span>
        </div>
        <div style={styles.goalMini}>
          <span style={styles.goalName}>Migra</span>
          <span style={styles.goalPerc}>{stats.goalAchievement.migracoes}%</span>
        </div>
        <div style={styles.goalMini}>
          <span style={styles.goalName}>SVAs</span>
          <span style={styles.goalPerc}>{stats.goalAchievement.svas}%</span>
        </div>
      </div>
    </div>

    <div style={styles.statCard}>
      <div style={styles.statHeader}>
        <TrendingUp size={20} color="#2563eb"/>
        <span style={styles.statLabel}>Eficiência de Vendas</span>
      </div>
      <div style={styles.convContainer}>
         <h2 style={styles.convValue}>{stats.convRate}%</h2>
         <p style={styles.convSubText}>Taxa de Conversão Geral</p>
      </div>
    </div>
  </div>

  <div style={styles.filterBar}>
    <div style={styles.searchBox}>
      <Search size={18} color="#94a3b8" />
      <input 
        placeholder="Filtrar por nome ou telefone..." 
        style={styles.searchInput}
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />
    </div>
    
    <div style={styles.filterActions}>
      <div style={styles.selectWrapper}>
        <Calendar size={16} color="#64748b"/>
        <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={styles.dateInput} />
      </div>
      <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={styles.selectInput}>
        <option value="all">Todos os Status</option>
        <option value="Em negociação">Em negociação</option>
        <option value="Contratado">Contratado</option>
        <option value="Instalado">Instalado</option>
        <option value="Descartado">Descartado</option>
      </select>
      <select value={filterLeadType} onChange={e => setFilterLeadType(e.target.value)} style={styles.selectInput}>
        <option value="all">Todos os Tipos</option>
        <option value="Plano Novo">Plano Novo</option>
        <option value="Migração">Migração</option>
        <option value="SVA">SVA</option>
      </select>
    </div>
  </div>

  <div style={styles.tableCard}>
    <table style={styles.table}>
      <thead>
        <tr style={styles.tableHeadRow}>
          <th style={styles.th} onClick={() => requestSort('date')}>
            Data {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
          </th>
          <th style={styles.th} onClick={() => requestSort('customerName')}>
            Cliente {sortConfig.key === 'customerName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
          </th>
          <th style={styles.th}>Cidade</th>
          <th style={styles.th}>Tipo</th>
          <th style={styles.th}>Produto</th>
          <th style={styles.th}>Status</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr><td colSpan="6" style={styles.tdCenter}>Carregando...</td></tr>
        ) : filteredAndSortedLeads.map(l => (
          <tr key={l.id} style={styles.tr}>
            <td style={styles.td}>{l.date?.split('-').reverse().join('/')}</td>
            <td style={styles.td}>
               <div style={{fontWeight:'bold', color:'#1e293b'}}>{l.customerName}</div>
               <div style={{fontSize:'11px', color:'#94a3b8'}}>{l.customerPhone}</div>
            </td>
            <td style={styles.td}><span style={styles.badgeCity}>{l.cityId}</span></td>
            <td style={styles.td}>{l.leadType}</td>
            <td style={styles.td}>{l.productName}</td>
            <td style={styles.td}><StatusBadge status={l.status}/></td>
          </tr>
        ))}
      </tbody>
    </table>
    {filteredAndSortedLeads.length === 0 && !loading && (
      <div style={styles.emptyState}>Nenhum lead encontrado para este filtro.</div>
    )}
  </div>
</div>


);
}

const StatusBadge = ({ status }) => {
let bg = '#f1f5f9', color = '#64748b';
if (status === 'Instalado' || status === 'Contratado') { bg = '#ecfdf5'; color = '#10b981'; }
else if (status === 'Em negociação') { bg = '#eff6ff'; color = '#2563eb'; }
else if (status === 'Descartado') { bg = '#fef2f2'; color = '#ef4444'; }
return <span style={{...styles.badgeBase, backgroundColor: bg, color: color}}>{status}</span>;
};

const styles = {
container: { padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Inter', sans-serif" },
header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '35px' },
iconHeader: { width: '56px', height: '56px', borderRadius: '16px', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.1)' },
title: { fontSize: '28px', fontWeight: '900', color: '#1e293b', margin: 0, letterSpacing: '-0.02em' },
subtitle: { fontSize: '15px', color: '#64748b', margin: '5px 0 0 0' },
btnExport: { marginLeft: 'auto', background: 'white', border: '1px solid #cbd5e1', padding: '12px 24px', borderRadius: '12px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#334155', transition: '0.2s' },

statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '35px' },
statCard: { background: 'white', padding: '25px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.01)' },
statHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' },
statLabel: { fontSize: '12px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },

typeStatsRow: { display: 'flex', flexDirection: 'column', gap: '10px' },
typeItem: { display: 'flex', alignItems: 'center', gap: '10px' },
dot: { width: '8px', height: '8px', borderRadius: '50%' },
typeText: { fontSize: '14px', color: '#475569' },

goalRow: { display: 'flex', justifyContent: 'space-between', gap: '10px' },
goalMini: { flex: 1, textAlign: 'center', padding: '10px', background: '#f8fafc', borderRadius: '14px' },
goalName: { display: 'block', fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' },
goalPerc: { display: 'block', fontSize: '18px', fontWeight: '900', color: '#1e293b', marginTop: '4px' },

convContainer: { textAlign: 'center' },
convValue: { fontSize: '36px', fontWeight: '900', color: '#2563eb', margin: 0 },
convSubText: { fontSize: '12px', color: '#64748b', fontWeight: 'bold', marginTop: '5px' },

filterBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' },
searchBox: { display: 'flex', alignItems: 'center', gap: '12px', background: 'white', padding: '12px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', flex: 1, minWidth: '300px' },
searchInput: { border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', color: '#1e293b' },
filterActions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
selectWrapper: { background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '8px' },
dateInput: { border: 'none', outline: 'none', fontSize: '13px', fontWeight: 'bold', color: '#334155', cursor: 'pointer' },
selectInput: { padding: '10px 15px', borderRadius: '14px', border: '1px solid #e2e8f0', background: 'white', fontSize: '13px', fontWeight: 'bold', color: '#334155', cursor: 'pointer', outline: 'none' },

tableCard: { background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden' },
table: { width: '100%', borderCollapse: 'collapse' },
tableHeadRow: { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
th: { padding: '16px 20px', textAlign: 'left', fontSize: '11px', color: '#64748b', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' },
tr: { borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' },
td: { padding: '16px 20px', fontSize: '14px', color: '#475569' },
tdCenter: { textAlign: 'center', padding: '40px', color: '#94a3b8' },
badgeCity: { background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', color: '#475569' },
badgeBase: { padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase' },
emptyState: { padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', fontStyle: 'italic' }
};