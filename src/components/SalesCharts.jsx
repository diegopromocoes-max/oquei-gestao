import React from 'react';
import { 
  BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LabelList, CartesianGrid,
  Radar, RadarChart, PolarGrid, PolarAngleAxis
} from 'recharts';
import { TrendingUp, Tv, Package, Trophy, MapPin } from 'lucide-react';

export const PerformanceCharts = ({ storeData }) => (
  <div id="performance-vendas" style={{marginBottom: '40px'}}>
    <h3 style={styles.mainSectionTitle}><TrendingUp size={24} color="#2563eb" /> Performance de Vendas</h3>
    
    {/* GRÁFICO 1: PLANOS (Largo) */}
    <div style={{...styles.chartCard, marginBottom: '20px'}}>
      <div style={styles.chartHeader}>
        <div><h3 style={styles.chartTitle}>Planos de Internet</h3><p style={styles.chartSubtitle}>Comparativo Automático: Meta vs Venda vs Instalação</p></div>
      </div>
      <div style={{ height: '300px', width: '100%', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={storeData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }} barGap={0}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="city" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} interval={0} />
            <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
            <Bar dataKey="metaPlanos" name="Meta (Planos)" fill="#cbd5e1" radius={[4, 4, 0, 0]}><LabelList dataKey="metaPlanos" position="top" style={{ fill: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }} /></Bar>
            <Bar dataKey="salesPlanos" name="Vendas (Planos)" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="salesPlanos" position="top" style={{ fill: '#3b82f6', fontSize: '10px', fontWeight: 'bold' }} />
              {storeData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.salesPlanos >= entry.metaPlanos && entry.metaPlanos > 0 ? '#10b981' : '#3b82f6'} />)}
            </Bar>
            <Bar dataKey="installedPlanos" name="Instalações" fill="#059669" radius={[4, 4, 0, 0]}><LabelList dataKey="installedPlanos" position="top" style={{ fill: '#059669', fontSize: '10px', fontWeight: 'bold' }} /></Bar>
          </BarChart>
        </ResponsiveContainer>
        {storeData.length === 0 && <div style={styles.emptyChartOverlay}>Nenhuma venda registada para este filtro.</div>}
      </div>
    </div>

    {/* GRÁFICO 2: MIGRAÇÕES (Largo) */}
    <div style={{...styles.chartCard, marginBottom: '20px'}}>
      <div style={styles.chartHeader}>
        <div><h3 style={{...styles.chartTitle, color: '#f59e0b'}}>Migrações</h3><p style={styles.chartSubtitle}>Retenção e Upgrade de Base</p></div>
      </div>
      <div style={{ height: '300px', width: '100%', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={storeData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }} barGap={0}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="city" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} interval={0} />
            <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'}} />
            <Bar dataKey="metaMigracoes" name="Meta (Migrações)" fill="#cbd5e1" radius={[4, 4, 0, 0]}><LabelList dataKey="metaMigracoes" position="top" style={{ fill: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }} /></Bar>
            <Bar dataKey="salesMigracoes" name="Vendas (Migrações)" fill="#f59e0b" radius={[4, 4, 0, 0]}><LabelList dataKey="salesMigracoes" position="top" style={{ fill: '#f59e0b', fontSize: '10px', fontWeight: 'bold' }} /></Bar>
          </BarChart>
        </ResponsiveContainer>
        {storeData.length === 0 && <div style={styles.emptyChartOverlay}>Nenhuma venda registada para este filtro.</div>}
      </div>
    </div>

    {/* GRÁFICO 3: SVA (Largo) */}
    <div style={{...styles.chartCard, marginBottom: '20px'}}>
      <div style={styles.chartHeader}>
        <div><h3 style={{...styles.chartTitle, color: '#7c3aed'}}>Serviços Adicionais (SVA)</h3><p style={styles.chartSubtitle}>Aumento de Ticket Médio</p></div>
      </div>
      <div style={{ height: '300px', width: '100%', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={storeData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }} barGap={0}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="city" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} interval={0} />
            <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'}} />
            <Bar dataKey="metaSVA" name="Meta (SVA)" fill="#cbd5e1" radius={[4, 4, 0, 0]}><LabelList dataKey="metaSVA" position="top" style={{ fill: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }} /></Bar>
            <Bar dataKey="salesSVA" name="Vendas (SVA)" fill="#7c3aed" radius={[4, 4, 0, 0]}><LabelList dataKey="salesSVA" position="top" style={{ fill: '#7c3aed', fontSize: '10px', fontWeight: 'bold' }} /></Bar>
          </BarChart>
        </ResponsiveContainer>
        {storeData.length === 0 && <div style={styles.emptyChartOverlay}>Nenhuma venda registada para este filtro.</div>}
      </div>
    </div>

  </div>
);

export const SvaAnalyzer = ({ svaAnalysis }) => (
  <div id="analise-sva" style={{marginBottom: '40px'}}>
    <h3 style={{...styles.mainSectionTitle, color: '#ea580c'}}><Tv size={24} color="#ea580c" /> Analisador de SVA</h3>
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px'}}>
      <div style={styles.chartCardHalf}>
         <div style={styles.chartHeader}>
             <div><h3 style={{...styles.chartTitle, color: '#ea580c'}}>Mix de SVAs (Radar)</h3><p style={styles.chartSubtitle}>Distribuição de serviços</p></div>
         </div>
         <div style={{height: '250px', width: '100%', position: 'relative'}}>
           <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={svaAnalysis.radarData}>
                 <PolarGrid stroke="#e2e8f0" />
                 <PolarAngleAxis dataKey="subject" tick={{fill: '#64748b', fontSize: 11, fontWeight: 'bold'}} />
                 <Radar name="Vendas" dataKey="A" stroke="#ea580c" fill="#ea580c" fillOpacity={0.5} />
                 <RechartsTooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'}}/>
              </RadarChart>
           </ResponsiveContainer>
           {svaAnalysis.radarData.length === 0 && <div style={styles.emptyChartOverlay}>Nenhum SVA vendido.</div>}
         </div>
      </div>
      <div style={styles.chartCardHalf}>
         <div style={styles.chartHeader}>
             <div><h3 style={{...styles.chartTitle, color: '#ea580c'}}><Package size={18} color="#ea580c"/> Top SVAs Vendidos</h3><p style={styles.chartSubtitle}>Ranking de aceitação (Filtro Aplicado)</p></div>
         </div>
         <div style={styles.svaListContainer}>
            {svaAnalysis.radarData.length === 0 ? <p style={styles.emptyState}>Nenhum SVA vendido.</p> : svaAnalysis.radarData.map((item, idx) => (
                <div key={idx} style={styles.svaListItem}>
                   <div style={{display:'flex', alignItems:'center', gap:'10px'}}><span style={styles.svaItemRank}>{idx + 1}</span><span style={styles.svaItemName}>{item.subject}</span></div>
                   <span style={styles.svaItemValue}>{item.A} vendas</span>
                </div>
            ))}
         </div>
      </div>
      <div style={styles.chartCardHalf}>
         <div style={styles.chartHeader}>
             <div><h3 style={{...styles.chartTitle, color: '#2563eb'}}><Trophy size={18} color="#2563eb"/> Ranking de Vendedores</h3><p style={styles.chartSubtitle}>Destaques na venda de SVA</p></div>
         </div>
         <div style={styles.svaListContainer}>
            {svaAnalysis.topSellers.length === 0 ? <p style={styles.emptyState}>Nenhuma venda registada.</p> : svaAnalysis.topSellers.map((item, idx) => (
                <div key={idx} style={{...styles.svaListItem, background: '#eff6ff', borderColor: '#dbeafe'}}>
                   <div style={{display:'flex', alignItems:'center', gap:'10px'}}><span style={{...styles.svaItemRank, background: '#2563eb'}}>{idx + 1}</span><span style={{...styles.svaItemName, color: '#1e3a8a'}}>{item.name}</span></div>
                   <span style={{...styles.svaItemValue, color: '#2563eb'}}>{item.count} vendas</span>
                </div>
            ))}
         </div>
      </div>
      <div style={styles.chartCardHalf}>
         <div style={styles.chartHeader}>
             <div><h3 style={{...styles.chartTitle, color: '#059669'}}><MapPin size={18} color="#059669"/> Ranking de Lojas/Cidades</h3><p style={styles.chartSubtitle}>Melhores praças em SVA</p></div>
         </div>
         <div style={styles.svaListContainer}>
            {svaAnalysis.topCities.length === 0 ? <p style={styles.emptyState}>Nenhuma praça com vendas.</p> : svaAnalysis.topCities.map((item, idx) => (
                <div key={idx} style={{...styles.svaListItem, background: '#ecfdf5', borderColor: '#d1fae5'}}>
                   <div style={{display:'flex', alignItems:'center', gap:'10px'}}><span style={{...styles.svaItemRank, background: '#059669'}}>{idx + 1}</span><span style={{...styles.svaItemName, color: '#064e3b'}}>{item.name}</span></div>
                   <span style={{...styles.svaItemValue, color: '#059669'}}>{item.count} vendas</span>
                </div>
            ))}
         </div>
      </div>
    </div>
  </div>
);

const styles = {
  mainSectionTitle: { fontSize: '20px', fontWeight: '900', color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  chartCard: { background: 'white', padding: '30px', borderRadius: '28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.02)' },
  chartHeader: { marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  chartTitle: { fontSize: '18px', fontWeight: '800', color: '#1e293b', margin: 0 },
  chartSubtitle: { fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 },
  chartCardHalf: { background: 'white', padding: '25px', borderRadius: '28px', border: '1px solid #e2e8f0', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.02)', display: 'flex', flexDirection: 'column' },
  emptyChartOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#94a3b8', fontWeight: 'bold', backdropFilter: 'blur(2px)' },
  svaListContainer: { flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', paddingRight: '5px' },
  svaListItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: '#fff7ed', borderRadius: '12px', border: '1px solid #ffedd5' },
  svaItemRank: { width: '24px', height: '24px', borderRadius: '50%', background: '#ea580c', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' },
  svaItemName: { fontSize: '14px', fontWeight: 'bold', color: '#1e293b' },
  svaItemValue: { fontSize: '14px', fontWeight: '900', color: '#ea580c' },
  emptyState: { textAlign: 'center', padding: '40px', color: '#94a3b8', fontStyle: 'italic', fontSize: '14px' }
};