import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, Download, BarChart3, PieChart as PieIcon, 
  Globe, Users, Target, Award, Zap, 
  Search, MapPin, RefreshCw, ShieldAlert, UserMinus, Stethoscope, FileText
} from 'lucide-react';

import { styles as global, colors } from '../styles/globalStyles';
import { listenGlobalReports } from '../services/reports';

export default function RelatorioGeral({ userData }) {
  const [activeView, setActiveView] = useState('global');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  
  // DADOS DO SERVICE
  const [data, setData] = useState({ leads: [], users: [], cities: [], absences: [], rh: [] });
  const [selectedAttendantId, setSelectedAttendantId] = useState('');

  // ─── 1. BUSCA DE DADOS VIA SERVICE ───
  useEffect(() => {
    setLoading(true);
    const unsub = listenGlobalReports(userData, (fetchedData) => {
      setData(fetchedData);
      setLoading(false);
    });
    return () => unsub();
  }, [userData]);

  // ─── 2. CÉREBRO: AUTO-DESCOBERTA ───
  const myRole = String(userData?.role || '').toLowerCase();
  const myCluster = String(userData?.clusterId || userData?.cluster || '').trim().toLowerCase();
  const isCoord = ['master', 'diretor', 'supervisor', 'coordenador', 'coordinator'].includes(myRole);

  const attendants = useMemo(() => {
    return data.users.filter(u => {
      const r = String(u.role).toLowerCase();
      if (r !== 'attendant' && r !== 'atendente') return false;
      if (isCoord) return true;
      return String(u.clusterId || u.cluster || '').trim().toLowerCase() === myCluster;
    });
  }, [data.users, isCoord, myCluster]);

  const displayCities = useMemo(() => {
    if (isCoord) return data.cities;
    return data.cities.filter(c => String(c.clusterId || c.cluster || '').trim().toLowerCase() === myCluster);
  }, [data.cities, isCoord, myCluster]);

  // ─── 3. ESTATÍSTICAS GLOBAIS ───
  const globalStats = useMemo(() => {
    const validAttIds = attendants.map(a => a.id);
    const monthLeads = data.leads.filter(l => l.date && l.date.startsWith(selectedMonth));

    const clusterLeads = monthLeads.filter(l => {
      if (isCoord) return true;
      const leadCluster = String(l.clusterId || l.cluster || '').trim().toLowerCase();
      return leadCluster === myCluster || validAttIds.includes(l.attendantId);
    });

    const sales = clusterLeads.filter(l => ['Contratado', 'Instalado'].includes(l.status)).length;
    const discards = clusterLeads.filter(l => ['Descartado', 'Cancelado'].includes(l.status)).length;
    const closedDeals = sales + discards;
    const conversion = closedDeals > 0 ? ((sales / closedDeals) * 100).toFixed(1) : 0;
    
    return { total: clusterLeads.length, sales, conversion, clusterLeads, discards };
  }, [data.leads, selectedMonth, isCoord, myCluster, attendants]);

  const ranking = useMemo(() => {
    const storesMap = {};
    const sellersMap = {};
    
    displayCities.forEach(c => { storesMap[c.name] = { name: c.name, sales: 0, discards: 0, leads: 0 }; });

    globalStats.clusterLeads.forEach(l => {
       const city = l.cityName || l.cityId || 'Sem Unidade';
       if (!storesMap[city]) storesMap[city] = { name: city, sales: 0, discards: 0, leads: 0 };
       
       storesMap[city].leads++;
       if (['Contratado', 'Instalado'].includes(l.status)) storesMap[city].sales++;
       else if (['Descartado', 'Cancelado'].includes(l.status)) storesMap[city].discards++;

       const attName = l.attendantName || 'Desconhecido';
       if (!sellersMap[attName]) sellersMap[attName] = { name: attName, sales: 0 };
       if (['Contratado', 'Instalado'].includes(l.status)) sellersMap[attName].sales++;
    });

    return {
      stores: Object.values(storesMap).sort((a,b) => b.sales - a.sales),
      topSellers: Object.values(sellersMap).sort((a,b) => b.sales - a.sales).slice(0, 5)
    };
  }, [globalStats.clusterLeads, displayCities]);

  // ─── 4. RAIO-X INDIVIDUAL ───
  const attendantReport = useMemo(() => {
    if (!selectedAttendantId) return null;
    const attUser = attendants.find(a => a.id === selectedAttendantId);
    const attLeads = globalStats.clusterLeads.filter(l => l.attendantId === selectedAttendantId);
    
    const sales = attLeads.filter(l => ['Contratado', 'Instalado'].includes(l.status)).length;
    const discards = attLeads.filter(l => ['Descartado', 'Cancelado'].includes(l.status)).length;
    const conv = (sales + discards) > 0 ? ((sales / (sales + discards)) * 100).toFixed(1) : 0;

    const discardReasonsMap = {};
    attLeads.filter(l => ['Descartado', 'Cancelado'].includes(l.status)).forEach(l => {
       const reason = l.discardMotive || l.motive || 'Não Informado';
       discardReasonsMap[reason] = (discardReasonsMap[reason] || 0) + 1;
    });

    const attRh = data.rh.filter(r => (r.targetId === selectedAttendantId || r.attendantId === selectedAttendantId) && r.dateEvent?.startsWith(selectedMonth));
    const attAbs = data.absences.filter(a => a.attendantId === selectedAttendantId && a.type === 'falta' && (a.startDate?.startsWith(selectedMonth)));

    const balanceMinutes = attUser?.balance || 0;
    const absM = Math.abs(balanceMinutes);
    const balanceStr = `${balanceMinutes < 0 ? '-' : '+'}${String(Math.floor(absM / 60)).padStart(2, '0')}:${String(absM % 60).padStart(2, '0')}`;

    return { 
      name: attUser?.name || 'Consultor', 
      store: attUser?.cityName || attUser?.cityId || 'N/D',
      photo: attUser?.photo || null,
      sales, discards, conv, backlog: attLeads.filter(l => l.status === 'Contratado').length,
      discardChart: Object.entries(discardReasonsMap).map(([name, value]) => ({ name, value })),
      rh: { faltas: attAbs.length, atestados: attRh.filter(r => r.type === 'atestado').length, ads: attRh.filter(r => r.type === 'advertencia' || r.type === 'suspensao').length, saldo: balanceStr, rawSaldo: balanceMinutes, poq: attUser?.manualAdjustments > 4 }
    };
  }, [selectedAttendantId, globalStats.clusterLeads, attendants, data, selectedMonth]);

  // ─── 5. EXPORTAÇÕES ───
  const handleExportPDF = () => {
    const printStyle = document.createElement('style');
    printStyle.id = 'print-styles';
    printStyle.innerHTML = `@media print { body * { visibility: hidden; } #report-content, #report-content * { visibility: visible; } #report-content { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; } .no-print { display: none !important; } }`;
    document.head.appendChild(printStyle);
    window.print();
    setTimeout(() => document.getElementById('print-styles')?.remove(), 1000);
  };

  const handleExportCSV = () => {
    const headers = "Unidade,Leads Captados,Vendas Fechadas,Taxa Conversao\n";
    const rows = ranking.stores.map(s => {
      const conv = (s.sales + s.discards) > 0 ? ((s.sales / (s.sales + s.discards)) * 100).toFixed(1) : 0;
      return `${s.name},${s.leads || 0},${s.sales},${conv}%`;
    }).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `oquei_ranking_${selectedMonth}.csv`; a.click();
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <RefreshCw size={48} className="animate-spin" color={colors.primary} />
      <h3 style={{ color: 'var(--text-muted)', marginTop: '20px' }}>Compilando Inteligência de Dados...</h3>
    </div>
  );

  return (
    <div className="animated-view animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', paddingBottom: '40px' }}>
      
      <div id="report-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* ─── CABEÇALHO ─── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '24px 30px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: colors.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 16px ${colors.primary}35` }}>
              <BarChart3 size={28} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>Business Intelligence</h1>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0 0', fontWeight: '600' }}>
                Performance e RH {isCoord ? '(Rede Global)' : `(Regional: ${userData?.clusterId || 'Configurando...'})`}
              </p>
            </div>
          </div>

          <div className="no-print" style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ background: 'var(--bg-panel)', padding: '6px', borderRadius: '14px', display: 'flex', border: '1px solid var(--border)' }}>
              <button onClick={() => setActiveView('global')} style={{ padding: '10px 20px', border: 'none', background: activeView === 'global' ? 'var(--bg-card)' : 'transparent', borderRadius: '10px', fontSize: '13px', fontWeight: '900', color: activeView === 'global' ? colors.primary : 'var(--text-muted)', cursor: 'pointer', boxShadow: activeView === 'global' ? 'var(--shadow-sm)' : 'none', transition: '0.2s' }}>Visão Global</button>
              <button onClick={() => setActiveView('atendente')} style={{ padding: '10px 20px', border: 'none', background: activeView === 'atendente' ? 'var(--bg-card)' : 'transparent', borderRadius: '10px', fontSize: '13px', fontWeight: '900', color: activeView === 'atendente' ? colors.primary : 'var(--text-muted)', cursor: 'pointer', boxShadow: activeView === 'atendente' ? 'var(--shadow-sm)' : 'none', transition: '0.2s' }}>Por Atendente</button>
            </div>
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: '12px', outline: 'none', fontWeight: '900' }} />
          </div>
        </div>

        {/* ─── VISÃO GLOBAL ─── */}
        {activeView === 'global' && (
          <div className="animate-fadeInUp" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              <KpiCard title="Leads Captados" value={globalStats.total} icon={Users} color={colors.primary} />
              <KpiCard title="Vendas Brutas" value={globalStats.sales} icon={TrendingUp} color={colors.success} />
              <KpiCard title="Perdas (Descarte)" value={globalStats.discards} icon={ShieldAlert} color={colors.danger} />
              <KpiCard title="Conversão Real" value={`${globalStats.conversion}%`} icon={Target} color="#8b5cf6" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
              
              <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                   <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}><Globe size={20} color={colors.primary}/> Performance de Lojas</h3>
                   <div style={{ display: 'flex', gap: '10px' }} className="no-print">
                      <button onClick={handleExportCSV} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '900', cursor: 'pointer', display: 'flex', gap: '6px', alignItems: 'center' }}><Download size={14}/> CSV</button>
                      <button onClick={handleExportPDF} style={{ background: 'var(--bg-panel)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '900', cursor: 'pointer', display: 'flex', gap: '6px', alignItems: 'center' }}><FileText size={14}/> PDF</button>
                   </div>
                </div>
                
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '12px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Unidade</th>
                      <th style={{ padding: '12px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Vendas</th>
                      <th style={{ padding: '12px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Conv.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.stores.map((s, idx) => {
                      const conv = (s.sales + s.discards) > 0 ? ((s.sales / (s.sales + s.discards)) * 100).toFixed(1) : 0;
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--bg-panel)' }}>
                          <td style={{ padding: '14px 12px', fontSize: '14px', color: 'var(--text-main)', fontWeight: '600' }}>{s.name}</td>
                          <td style={{ padding: '14px 12px', fontSize: '15px', fontWeight:'900', color: colors.success }}>{s.sales}</td>
                          <td style={{ padding: '14px 12px' }}>
                            <span style={{ padding: '4px 10px', background: conv >= 15 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: conv >= 15 ? colors.success : colors.danger, borderRadius: '8px', fontSize: '11px', fontWeight: '900' }}>{conv}%</span>
                          </td>
                        </tr>
                      )
                    })}
                    {ranking.stores.length === 0 && <tr><td colSpan="3" style={{textAlign: 'center', color: 'var(--text-muted)', padding: '20px'}}>Nenhuma loja ativa.</td></tr>}
                  </tbody>
                </table>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                 <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}><Award size={20} color={colors.warning}/> Pódio de Vendas (Top 5)</h3>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {ranking.topSellers.map((seller, idx) => (
                       <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '16px', background: 'var(--bg-panel)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: idx === 0 ? colors.warning : 'var(--bg-card)', color: idx === 0 ? 'white' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '14px', border: idx !== 0 ? '1px solid var(--border)' : 'none' }}>
                            {idx + 1}º
                          </div>
                          <span style={{ flex: 1, fontSize: '15px', fontWeight: '900', color: 'var(--text-main)' }}>{seller.name}</span>
                          <span style={{ fontSize: '18px', fontWeight: '900', color: colors.success }}>{seller.sales}</span>
                       </div>
                    ))}
                    {ranking.topSellers.length === 0 && <div style={{textAlign: 'center', color: 'var(--text-muted)', padding: '20px'}}>Nenhuma venda registrada.</div>}
                 </div>
              </div>

            </div>
          </div>
        )}

        {/* ─── VISÃO POR ATENDENTE ─── */}
        {activeView === 'atendente' && (
          <div className="animate-fadeInUp" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="no-print" style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ flex: 1, display:'flex', gap:'15px', alignItems:'center', background: 'var(--bg-panel)', padding: '6px 16px', borderRadius: '14px', border: '1px solid var(--border)'}}>
                <Search color={colors.primary} size={20} />
                <select style={{ width: '100%', background: 'transparent', color: 'var(--text-main)', border: 'none', outline: 'none', fontSize: '15px', fontWeight: '900', cursor: 'pointer', height: '40px' }} value={selectedAttendantId} onChange={e => setSelectedAttendantId(e.target.value)}>
                  <option value="">Selecione o consultor...</option>
                  {attendants.map(att => <option key={att.id} value={att.id}>{att.name} ({att.cityName || att.cityId || 'Sem loja'})</option>)}
                </select>
              </div>
              
              {selectedAttendantId && (
                <button onClick={handleExportPDF} style={{ background: colors.primary, color: 'white', border: 'none', padding: '14px 24px', borderRadius: '14px', fontWeight: '900', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', boxShadow: `0 6px 16px ${colors.primary}35` }}>
                  <FileText size={18}/> Salvar Raio-X PDF
                </button>
              )}
            </div>

            {selectedAttendantId && attendantReport && (
              <div className="animate-fadeInUp" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                 
                 <div style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, #1e3a8a 100%)`, padding: '40px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '30px', boxShadow: `0 10px 30px ${colors.primary}25` }}>
                    {attendantReport.photo 
                      ? <img src={attendantReport.photo} style={{ width: '90px', height: '90px', borderRadius: '24px', objectFit: 'cover' }} alt="Avatar" /> 
                      : <div style={{ width: '90px', height: '90px', borderRadius: '24px', background: 'rgba(255,255,255,0.2)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: '900' }}>{attendantReport.name?.[0]}</div>
                    }
                    <div>
                      <h2 style={{ color: 'white', margin: 0, fontSize: '32px', fontWeight: '900', letterSpacing: '-0.02em' }}>{attendantReport.name}</h2>
                      <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px', margin: '8px 0 0 0', fontWeight: '600' }}><MapPin size={18}/> {attendantReport.store}</p>
                    </div>
                 </div>

                 <h3 style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '10px 0 0 0', letterSpacing: '0.05em' }}>Comportamento e Assiduidade</h3>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                    <KpiCard title="Faltas" value={attendantReport.rh.faltas} icon={UserMinus} color={attendantReport.rh.faltas > 0 ? colors.danger : colors.success} />
                    <KpiCard title="Atestados / Adv." value={attendantReport.rh.atestados + attendantReport.rh.ads} icon={Stethoscope} color={colors.warning} />
                    
                    <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', borderLeft: `4px solid ${attendantReport.rh.rawSaldo >= 0 ? colors.success : colors.danger}`, boxShadow: 'var(--shadow-sm)' }}>
                      <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Banco de Horas Geral</span>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-main)', marginTop: '8px' }}>{attendantReport.rh.saldo}</div>
                      {attendantReport.rh.poq && <span style={{ fontSize: '10px', background: 'rgba(239,68,68,0.1)', color: colors.danger, padding: '4px 10px', borderRadius: '8px', fontWeight: '900', marginTop: '10px', display: 'inline-block' }}>⚠️ POQ EM RISCO</span>}
                    </div>
                 </div>

                 <h3 style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '20px 0 0 0', letterSpacing: '0.05em' }}>Desempenho Comercial</h3>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                    <KpiCard title="Vendas Fechadas" value={attendantReport.sales} icon={TrendingUp} color={colors.success} />
                    <KpiCard title="Backlog Técnico" value={attendantReport.backlog} icon={Zap} color={attendantReport.backlog > 5 ? colors.danger : colors.warning} />
                    <KpiCard title="Descartes" value={attendantReport.discards} icon={ShieldAlert} color={colors.danger} />
                    <KpiCard title="Conversão" value={`${attendantReport.conv}%`} icon={Target} color={colors.primary} />
                 </div>

                 {attendantReport.discardChart.length > 0 && (
                   <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', marginTop: '10px' }}>
                     <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}><PieIcon size={20} color={colors.danger}/> Leakage: Motivos de Descarte</h3>
                     <div style={{ height: '250px' }}>
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie data={attendantReport.discardChart} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={5}>
                             {attendantReport.discardChart.map((e,i) => <Cell key={i} fill={[colors.danger, colors.warning, colors.primary, '#8b5cf6', '#10b981'][i%5]} />)}
                           </Pie>
                           <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', fontWeight: 'bold', color: 'var(--text-main)' }} itemStyle={{ color: 'var(--text-main)' }} />
                         </PieChart>
                       </ResponsiveContainer>
                     </div>
                   </div>
                 )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── COMPONENTE REUTILIZÁVEL ───
const KpiCard = ({ title, value, icon: Icon, color }) => (
  <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
    <div>
      <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
      <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--text-main)', marginTop: '8px' }}>{value}</div>
    </div>
    <div style={{ padding: '12px', borderRadius: '14px', background: `${color}15`, color }}>
      <Icon size={24} strokeWidth={2.5} />
    </div>
  </div>
);