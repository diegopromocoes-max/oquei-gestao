import React from 'react';
import { LayoutList } from 'lucide-react';

export default function SalesTable({ storeData }) {
  return (
    <div style={{ animation: 'slideIn 0.6s ease-out 0.8s forwards', opacity: 0, marginTop: '40px' }}>
      <div style={{ background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '20px 25px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LayoutList size={18} color="#64748b" />
          <h3 style={{ fontSize: '15px', fontWeight: '900', margin: 0, color: '#1e293b' }}>Consolidado por Operação</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th style={tStyle.th}>Unidade</th>
                <th style={tStyle.th}>Vendas</th>
                <th style={tStyle.th}>Meta</th>
                <th style={tStyle.th}>Gap</th>
                <th style={tStyle.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {storeData.map((s, i) => {
                const gap = s.metaPlanos - s.salesPlanos;
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={tStyle.td}><strong>{s.city}</strong></td>
                    <td style={tStyle.td}>{s.salesPlanos}</td>
                    <td style={tStyle.td}>{s.metaPlanos}</td>
                    <td style={{...tStyle.td, color: gap <= 0 ? '#10b981' : '#ef4444'}}>
                       {gap <= 0 ? 'Meta Atingida' : `${gap} p/ meta`}
                    </td>
                    <td style={tStyle.td}>
                       <div style={{width: '60px', height: '6px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden'}}>
                          <div style={{width: `${Math.min((s.salesPlanos/s.metaPlanos)*100, 100)}%`, height: '100%', background: s.salesPlanos >= s.metaPlanos ? '#10b981' : '#3b82f6'}} />
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const tStyle = {
  th: { padding: '15px 25px', textAlign: 'left', fontSize: '11px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  td: { padding: '18px 25px', fontSize: '13px', color: '#334155' }
};