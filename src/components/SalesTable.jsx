import React from 'react';
import { Store } from 'lucide-react';

export default function SalesTable({ storeData }) {
  return (
    <div id="relatorio-consolidado" style={styles.tableCard}>
      <div style={styles.tableHeader}>
         <h3 style={styles.tableTitle}><Store size={20} color="#059669" /> Relatório Consolidado (Filtro Aplicado)</h3>
      </div>
      <div style={{overflowX: 'auto'}}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th style={styles.th}>Unidade / Loja</th>
              <th style={{...styles.th, textAlign: 'center'}}>Meta Planos</th>
              <th style={{...styles.th, textAlign: 'center', background: '#eff6ff', color: '#1e3a8a'}}>Vendas (Planos)</th>
              <th style={{...styles.th, textAlign: 'center'}}>Projeção (Planos)</th>
              <th style={{...styles.th, textAlign: 'center', background: '#ecfdf5', color: '#064e3b'}}>Instalações</th>
              <th style={{...styles.th, textAlign: 'center', background: '#fff7ed', color: '#9a3412'}}>SVA Fechado</th>
            </tr>
          </thead>
          <tbody>
            {storeData.length === 0 ? <tr><td colSpan="6" style={{textAlign: 'center', padding: '30px', color: '#94a3b8'}}>Nenhuma loja encontrada para o filtro selecionado.</td></tr> : storeData.map((s, idx) => {
              const percVendas = s.metaPlanos > 0 ? Math.floor((s.salesPlanos / s.metaPlanos) * 100) : 0;
              return (
                <tr key={idx} style={styles.tr}>
                  <td style={{...styles.td, fontWeight: 'bold', color: '#1e293b'}}>{s.city}</td>
                  <td style={{...styles.td, textAlign: 'center', color: '#64748b', fontWeight: 'bold'}}>{s.metaPlanos}</td>
                  <td style={{...styles.td, textAlign: 'center', background: '#eff6ff'}}>
                    <div style={{display: 'flex', flexDirection: 'column'}}>
                      <span style={{fontSize: '15px', fontWeight: '900', color: '#2563eb'}}>{s.salesPlanos}</span>
                      <span style={{fontSize: '10px', color: '#3b82f6', fontWeight: 'bold'}}>{percVendas}% da Meta</span>
                    </div>
                  </td>
                  <td style={{...styles.td, textAlign: 'center', color: '#64748b', fontWeight: 'bold'}}>{s.projSales}</td>
                  <td style={{...styles.td, textAlign: 'center', background: '#ecfdf5'}}><span style={{fontSize: '15px', fontWeight: '900', color: '#10b981'}}>{s.installedPlanos}</span></td>
                  <td style={{...styles.td, textAlign: 'center', background: '#fff7ed'}}><span style={{fontSize: '14px', fontWeight: 'bold', color: '#ea580c'}}>{s.salesSVA}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  tableCard: { background: 'white', borderRadius: '28px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.02)' },
  tableHeader: { padding: '25px 30px', background: '#fcfcfc', borderBottom: '1px solid #f1f5f9' },
  tableTitle: { fontSize: '16px', fontWeight: '900', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  th: { padding: '16px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  tr: { borderBottom: '1px solid #f1f5f9', transition: '0.2s' },
  td: { padding: '16px 20px', fontSize: '14px', verticalAlign: 'middle' }
};