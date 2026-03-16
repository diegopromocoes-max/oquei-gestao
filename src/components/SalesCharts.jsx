import React from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Award, Package } from 'lucide-react';

export const PerformanceCharts = ({ storeData }) => (
  <div style={{ animation: 'slideIn 0.6s ease-out 0.6s forwards', opacity: 0, marginTop: '40px' }}>
    <h3 style={{fontSize:'15px', fontWeight:'900', marginBottom:'15px', display:'flex', alignItems:'center', gap:'10px'}}>
        <Award size={18} color="#f59e0b" /> Meta vs Realizado por Unidade
    </h3>
    <div style={{ background: 'white', padding: '20px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
      <div style={{ height: '300px', width: '100%' }}>
        <ResponsiveContainer>
          <BarChart data={storeData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="city" axisLine={false} tickLine={false} tick={{fontSize:10, fontWeight:'bold'}} />
            <Tooltip cursor={{fill: '#f8fafc'}} />
            <Bar dataKey="salesPlanos" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1500}>
              {storeData.map((entry, index) => (
                <Cell key={index} fill={entry.salesPlanos >= entry.metaPlanos ? '#10b981' : '#3b82f6'} />
              ))}
            </Bar>
            <Bar dataKey="metaPlanos" fill="#e2e8f0" radius={[4, 4, 0, 0]} isAnimationActive={true} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

export const SvaAnalyzer = ({ svaAnalysis }) => (
  <div style={{ animation: 'slideIn 0.6s ease-out 0.7s forwards', opacity: 0, marginTop: '40px' }}>
    <h3 style={{fontSize:'15px', fontWeight:'900', marginBottom:'15px', display:'flex', alignItems:'center', gap:'10px', color: '#7c3aed'}}>
        <Package size={18} /> Inteligência de Mix SVA
    </h3>
    <div style={{ background: 'white', padding: '25px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
      {/* Gráfico Radar ou Barra conforme sua versão original */}
      <div style={{ height: '250px', width: '100%' }}>
         <ResponsiveContainer>
            <BarChart data={svaAnalysis.radarData}>
               <XAxis dataKey="subject" tick={{fontSize: 10}} />
               <Tooltip />
               <Bar dataKey="A" fill="#7c3aed" radius={[10, 10, 0, 0]} isAnimationActive={true} />
            </BarChart>
         </ResponsiveContainer>
      </div>
    </div>
  </div>
);