import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, Download, BarChart3, PieChart as PieIcon, 
  Globe, Users, Target, Award, Zap, 
  Search, MapPin, RefreshCw, ShieldAlert, Clock, UserMinus, Stethoscope, FileText
} from 'lucide-react';

import { styles as global, colors } from '../styles/globalStyles';

export default function RelatorioGeral({ userData }) {
  const [activeView, setActiveView] = useState('global');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  
  // DADOS BRUTOS DO FIREBASE (Sem filtros para evitar Permission Denied)
  const [allLeads, setAllLeads] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allCities, setAllCities] = useState([]);
  const [allRhRequests, setAllRhRequests] = useState([]);
  const [allAbsences, setAllAbsences] = useState([]);
  
  const [selectedAttendantId, setSelectedAttendantId] = useState('');

  // ==========================================
  // 1. MOTOR DE BUSCA (A TUA LÓGICA ORIGINAL)
  // ==========================================
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      setLoading(true);

      const unsubs = [];

      // Puxa tudo sem "where" para não acionar bloqueios do Firebase
      unsubs.push(onSnapshot(collection(db, 'leads'), snap => setAllLeads(snap.docs.map(d => ({id: d.id, ...d.data()}))), err => console.warn(err)));
      unsubs.push(onSnapshot(collection(db, 'users'), snap => setAllUsers(snap.docs.map(d => ({id: d.id, ...d.data()}))), err => console.warn(err)));
      unsubs.push(onSnapshot(collection(db, 'cities'), snap => setAllCities(snap.docs.map(d => ({id: d.id, ...d.data()}))), err => console.warn(err)));
      unsubs.push(onSnapshot(collection(db, 'absences'), snap => setAllAbsences(snap.docs.map(d => ({id: d.id, ...d.data()}))), err => console.warn(err)));
      unsubs.push(onSnapshot(collection(db, 'rh_requests'), snap => setAllRhRequests(snap.docs.map(d => ({id: d.id, ...d.data()}))), err => console.warn(err)));

      setTimeout(() => setLoading(false), 1200);

      return () => unsubs.forEach(fn => fn());
    });

    return () => unsubAuth();
  }, []);

  // ==========================================
  // 2. O CÉREBRO: AUTO-DESCOBERTA DO UTILIZADOR
  // ==========================================
  const myProfile = useMemo(() => {
    return allUsers.find(u => u.id === auth.currentUser?.uid) || userData || {};
  }, [allUsers, userData]);

  const myRole = String(myProfile.role || '').toLowerCase();
  const myCluster = String(myProfile.clusterId || myProfile.cluster || '').trim().toLowerCase();
  const isCoord = myRole === 'coordinator' || myRole === 'coordenador';

  // ==========================================
  // 3. FILTROS DA MURALHA (Feitos no Navegador)
  // ==========================================
  const attendants = useMemo(() => {
    return allUsers.filter(u => {
      const r = String(u.role).toLowerCase();
      if (r !== 'attendant' && r !== 'atendente') return false;
      
      if (isCoord) return true;
      const attCluster = String(u.clusterId || u.cluster || '').trim().toLowerCase();
      return attCluster === myCluster;
    });
  }, [allUsers, isCoord, myCluster]);

  const displayCities = useMemo(() => {
    if (isCoord) return allCities;
    return allCities.filter(c => {
      const cCluster = String(c.clusterId || c.cluster || '').trim().toLowerCase();
      return cCluster === myCluster;
    });
  }, [allCities, isCoord, myCluster]);

  const globalStats = useMemo(() => {
    const validAttIds = attendants.map(a => a.id);
    const monthLeads = allLeads.filter(l => l.date && l.date.startsWith(selectedMonth));

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
  }, [allLeads, selectedMonth, isCoord, myCluster, attendants]);

  const ranking = useMemo(() => {
    const storesMap = {};
    const sellersMap = {};
    
    // Pré-carrega as lojas da regional para aparecerem sempre, mesmo com 0 vendas
    displayCities.forEach(c => {
      storesMap[c.name] = { name: c.name, sales: 0, discards: 0, leads: 0 };
    });

    globalStats.clusterLeads.forEach(l => {
       const city = l.cityId || 'Sem Unidade';
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

  // RAIO-X INDIVIDUAL DO ATENDENTE
  const attendantReport = useMemo(() => {
    if (!selectedAttendantId) return null;
    const attUser = attendants.find(a => a.id === selectedAttendantId);
    const attLeads = globalStats.clusterLeads.filter(l => l.attendantId === selectedAttendantId);
    
    const sales = attLeads.filter(l => ['Contratado', 'Instalado'].includes(l.status)).length;
    const discards = attLeads.filter(l => ['Descartado', 'Cancelado'].includes(l.status)).length;
    const conv = (sales + discards) > 0 ? ((sales / (sales + discards)) * 100).toFixed(1) : 0;

    const discardReasonsMap = {};
    attLeads.filter(l => ['Descartado', 'Cancelado'].includes(l.status)).forEach(l => {
       const reason = l.motive || l.discardReason || 'Não Informado';
       discardReasonsMap[reason] = (discardReasonsMap[reason] || 0) + 1;
    });

    const attRh = allRhRequests.filter(r => (r.targetId === selectedAttendantId || r.attendantId === selectedAttendantId) && r.dateEvent?.startsWith(selectedMonth));
    const attAbs = allAbsences.filter(a => a.attendantId === selectedAttendantId && a.type === 'falta' && (a.startDate?.startsWith(selectedMonth)));

    const balanceMinutes = attUser?.balance || 0;
    const absM = Math.abs(balanceMinutes);
    const balanceStr = `${balanceMinutes < 0 ? '-' : '+'}${String(Math.floor(absM / 60)).padStart(2, '0')}:${String(absM % 60).padStart(2, '0')}`;

    return { 
      name: attUser?.name || 'Consultor', 
      store: attUser?.cityId || 'N/D',
      photo: attUser?.photo || null,
      sales, discards, conv, backlog: attLeads.filter(l => l.status === 'Contratado').length,
      discardChart: Object.entries(discardReasonsMap).map(([name, value]) => ({ name, value })),
      rh: { faltas: attAbs.length, atestados: attRh.filter(r => r.type === 'atestado').length, ads: attRh.filter(r => r.type === 'advertencia' || r.type === 'suspensao').length, saldo: balanceStr, rawSaldo: balanceMinutes, poq: attUser?.manualAdjustments > 4 }
    };
  }, [selectedAttendantId, globalStats.clusterLeads, attendants, allAbsences, allRhRequests, selectedMonth]);

  // ==========================================
  // EXPORTAÇÕES
  // ==========================================
  const handleExportPDF = () => {
    const printStyle = document.createElement('style');
    printStyle.id = 'print-styles';
    printStyle.innerHTML = `
      @media print {
        body * { visibility: hidden; }
        #report-content, #report-content * { visibility: visible; }
        #report-content { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
        .no-print { display: none !important; }
        .animated-view { animation: none !important; }
      }
    `;
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
    <div style={local.loader}>
      <RefreshCw size={48} className="animate-spin" color={colors?.primary || '#2563eb'} />
      <h3 style={{ color: 'var(--text-muted)', marginTop: '20px' }}>A Sincronizar Relatórios...</h3>
    </div>
  );

  return (
    <div style={{...(global?.container || {padding: '40px', maxWidth: '1200px', margin: '0 auto'}), padding: '20px'}}>
      
      <div id="report-content">
        
        {/* CABEÇALHO */}
        <div style={local.headerWrapper}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={local.headerIcon}><BarChart3 size={32} color="white" /></div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-main)', margin: 0 }}>Business Intelligence</h1>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Performance e RH {isCoord ? '(Rede Global)' : `(Regional: ${myProfile?.clusterId || 'Configurando...'})`}
              </p>
            </div>
          </div>

          <div className="no-print" style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={local.toggleGroup}>
              <button onClick={() => setActiveView('global')} style={activeView === 'global' ? local.toggleBtnActive : local.toggleBtn}>Visão Global</button>
              <button onClick={() => setActiveView('atendente')} style={activeView === 'atendente' ? local.toggleBtnActive : local.toggleBtn}>Por Atendente</button>
            </div>
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={local.input} />
          </div>
        </div>

        {/* VISÃO GLOBAL */}
        {activeView === 'global' && (
          <div className="animated-view">
            <div style={local.grid4}>
              <KpiCard title="Leads Captados" value={globalStats.total} icon={Users} color="#2563eb" />
              <KpiCard title="Vendas Brutas" value={globalStats.sales} icon={TrendingUp} color="#10b981" />
              <KpiCard title="Perdas (Descarte)" value={globalStats.discards} icon={ShieldAlert} color="#ef4444" />
              <KpiCard title="Conversão Real" value={`${globalStats.conversion}%`} icon={Target} color="#8b5cf6" />
            </div>

            <div style={local.rankingGrid}>
              <div style={local.cardFallback}>
                {/* BOTÕES DE PDF E CSV NO PAINEL DE LOJAS */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                   <h3 style={local.cardTitle}><Globe size={18} color="#2563eb"/> Performance de Lojas</h3>
                   <div style={{ display: 'flex', gap: '10px' }} className="no-print">
                      <button onClick={handleExportCSV} style={local.btnOutline}><Download size={14}/> CSV</button>
                      <button onClick={handleExportPDF} style={local.btnPDFSmall}><FileText size={14}/> Salvar PDF</button>
                   </div>
                </div>
                <table style={local.table}>
                  <thead><tr><th style={local.th}>Unidade</th><th style={local.th}>Vendas</th><th style={local.th}>Conv.</th></tr></thead>
                  <tbody>
                    {ranking.stores.map((s, idx) => {
                      const conv = (s.sales + s.discards) > 0 ? ((s.sales / (s.sales + s.discards)) * 100).toFixed(1) : 0;
                      return (
                        <tr key={idx} style={local.tr}>
                          <td style={local.td}>{s.name}</td>
                          <td style={{...local.td, fontWeight:'900', color: '#10b981'}}>{s.sales}</td>
                          <td style={local.td}><span style={local.badge(conv>=15?'success':'danger')}>{conv}%</span></td>
                        </tr>
                      )
                    })}
                    {ranking.stores.length === 0 && <tr><td colSpan="3" style={{textAlign: 'center', color: 'var(--text-muted)', padding: '20px'}}>Sem lojas na sua regional.</td></tr>}
                  </tbody>
                </table>
              </div>

              <div style={local.cardFallback}>
                 <h3 style={local.cardTitle}><Award size={18} color="#f59e0b"/> Pódio de Vendas (Top 5)</h3>
                 <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {ranking.topSellers.map((seller, idx) => (
                       <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '12px', background: 'var(--bg-app)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: idx === 0 ? '#f59e0b' : 'var(--bg-panel)', color: idx === 0 ? 'white' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '14px' }}>
                            {idx + 1}º
                          </div>
                          <span style={{ flex: 1, fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)' }}>{seller.name}</span>
                          <span style={{ fontSize: '16px', fontWeight: '900', color: '#10b981' }}>{seller.sales}</span>
                       </div>
                    ))}
                    {ranking.topSellers.length === 0 && <div style={{textAlign: 'center', color: 'var(--text-muted)', padding: '20px'}}>Sem vendas concluídas.</div>}
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* VISÃO POR ATENDENTE */}
        {activeView === 'atendente' && (
          <div className="animated-view">
            <div className="no-print" style={{ ...local.cardFallback, marginBottom: '20px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap: 'wrap', gap: '15px' }}>
              <div style={{ flex: 1, display:'flex', gap:'15px', alignItems:'center', minWidth: '250px'}}>
                <Search color="#2563eb" />
                <select style={local.inputLarge} value={selectedAttendantId} onChange={e => setSelectedAttendantId(e.target.value)}>
                  <option value="">Selecione o consultor ({attendants.length} ativos)...</option>
                  {attendants.map(att => <option key={att.id} value={att.id}>{att.name} ({att.cityId || att.clusterId || 'Sem loja'})</option>)}
                </select>
              </div>
              
              {selectedAttendantId && (
                <button onClick={handleExportPDF} style={local.btnPDF}>
                  <FileText size={18}/> Salvar Raio-X PDF
                </button>
              )}
            </div>

            {selectedAttendantId && attendantReport && (
              <div className="animated-view">
                 <div style={local.profileHero}>
                    {attendantReport.photo ? <img src={attendantReport.photo} style={local.avatarImg} alt="Avatar" /> : <div style={local.avatarLarge}>{attendantReport.name?.[0]}</div>}
                    <div>
                      <h2 style={{ color: 'white', margin: 0, fontSize: '28px', fontWeight: '900' }}>{attendantReport.name}</h2>
                      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={16}/> {attendantReport.store}</p>
                    </div>
                 </div>

                 <h3 style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '15px' }}>Comportamento e Assiduidade</h3>
                 <div style={{...local.grid4, marginBottom: '30px'}}>
                    <KpiCard title="Faltas" value={attendantReport.rh.faltas} icon={UserMinus} color={attendantReport.rh.faltas > 0 ? "#ef4444" : "#10b981"} />
                    <KpiCard title="Atestados / Advertências" value={attendantReport.rh.atestados + attendantReport.rh.ads} icon={Stethoscope} color="#f59e0b" />
                    <div style={{ ...local.cardFallback, borderLeft: `4px solid ${attendantReport.rh.rawSaldo >= 0 ? '#10b981' : '#ef4444'}` }}>
                      <span style={local.miniLabel}>Banco de Horas Geral</span>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-main)' }}>{attendantReport.rh.saldo}</div>
                      {attendantReport.rh.poq && <span style={local.poqAlert}>⚠️ ALERTA: POQ ZERADO</span>}
                    </div>
                 </div>

                 <h3 style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '15px' }}>Desempenho Comercial</h3>
                 <div style={{...local.grid4, marginBottom: '30px'}}>
                    <KpiCard title="Vendas Fechadas" value={attendantReport.sales} icon={TrendingUp} color="#10b981" />
                    <KpiCard title="Backlog Técnico" value={attendantReport.backlog} icon={Zap} color={attendantReport.backlog > 5 ? "#ef4444" : "#f59e0b"} />
                    <KpiCard title="Descartes" value={attendantReport.discards} icon={ShieldAlert} color="#ef4444" />
                    <KpiCard title="Conversão" value={`${attendantReport.conv}%`} icon={Target} color="#2563eb" />
                 </div>

                 <div style={{ marginTop: '20px' }}>
                    <div style={local.cardFallback}>
                      <h3 style={local.cardTitle}><PieIcon size={18} color="#ef4444"/> Leakage: Motivos de Descarte</h3>
                      <div style={{ height: '220px', marginTop: '20px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={attendantReport.discardChart.length ? attendantReport.discardChart : [{name:'Sem perdas', value:1}]} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value">
                              {attendantReport.discardChart.map((e,i) => <Cell key={i} fill={['#ef4444','#f59e0b','#2563eb','#8b5cf6'][i%4]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                 </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

const KpiCard = ({ title, value, icon: Icon, color }) => (
  <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
    <div><span style={local.miniLabel}>{title}</span><div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-main)' }}>{value}</div></div>
    <div style={{ padding: '10px', borderRadius: '10px', background: `${color}15`, color }}><Icon size={20} /></div>
  </div>
);

const local = {
  cardFallback: { background: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' },
  loader: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' },
  headerWrapper: { display: 'flex', justifyContent: 'space-between', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' },
  headerIcon: { width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 20px rgba(37,99,235,0.2)'},
  toggleGroup: { background: 'var(--bg-panel)', padding: '5px', borderRadius: '12px', display: 'flex', border: '1px solid var(--border)' },
  toggleBtn: { padding: '8px 15px', border: 'none', background: 'transparent', borderRadius: '8px', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)', cursor: 'pointer' },
  toggleBtnActive: { padding: '8px 15px', border: 'none', background: 'var(--bg-card)', borderRadius: '8px', fontSize: '13px', fontWeight: '900', color: 'var(--text-brand)', boxShadow: 'var(--shadow-sm)' },
  input: { background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '10px', borderRadius: '10px', outline: 'none', fontWeight: 'bold' },
  inputLarge: { width: '100%', background: 'transparent', color: 'var(--text-main)', border: 'none', outline: 'none', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' },
  btnPDF: { background: '#1e293b', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '12px', fontWeight: '900', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', transition: 'transform 0.2s', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' },
  btnPDFSmall: { background: '#1e293b', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', gap: '6px', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' },
  btnOutline: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-main)', padding: '5px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', gap: '6px', alignItems: 'center' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' },
  miniLabel: { fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' },
  cardTitle: { margin: '0 0 15px 0', fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'left' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '12px', fontSize: '14px', color: 'var(--text-main)' },
  badge: (t) => ({ padding: '4px 8px', background: t === 'success' ? '#ecfdf5' : '#fef2f2', color: t === 'success' ? '#10b981' : '#ef4444', borderRadius: '6px', fontSize: '11px', fontWeight: '900' }),
  profileHero: { background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '30px', borderRadius: '24px', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '25px', border: '1px solid rgba(255,255,255,0.05)' },
  avatarLarge: { width: '80px', height: '80px', borderRadius: '24px', background: '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '900' },
  avatarImg: { width: '80px', height: '80px', borderRadius: '24px', objectFit: 'cover' },
  poqAlert: { fontSize: '9px', background: '#fef2f2', color: '#ef4444', padding: '4px 8px', borderRadius: '6px', fontWeight: '900', marginTop: '8px', display: 'inline-block' },
  rankingGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px', marginTop: '20px' }
};

if (typeof document !== 'undefined') {
  const styleId = 'bi-animations';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style'); style.id = styleId;
    style.innerHTML = `@keyframes fadeInView { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } .animated-view { animation: fadeInView 0.4s ease forwards; }`;
    document.head.appendChild(style);
  }
}