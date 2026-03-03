import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, Download, Calendar, BarChart3, PieChart as PieIcon, 
  LineChart as LineIcon, Globe, Users, Target, User, Award, Zap, 
  Search, MapPin, RefreshCw, ShieldAlert, Database, ChevronRight
} from 'lucide-react';

// IMPORTAÇÃO DO DESIGN SYSTEM
import { styles as global, colors } from '../styles/globalStyles';

export default function RelatoriosBI({ userData }) {
  const [activeView, setActiveView] = useState('global');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  
  // Dados do Firebase
  const [leads, setLeads] = useState([]);
  const [attendants, setAttendants] = useState([]);
  const [selectedAttendantId, setSelectedAttendantId] = useState('');
  
  // Diagnóstico
  const [errorLog, setErrorLog] = useState(null);

  // 1. ESCUTA DE DADOS BLINDADA (Sem filtros complexos no backend)
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      
      setLoading(true);

      // Assumindo estrutura local na raiz (leads, users)
      const leadsRef = collection(db, 'leads');
      const usersRef = collection(db, 'users');

      const unsubLeads = onSnapshot(leadsRef, (snap) => {
        setLeads(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => {
        console.error("BI Erro Leads:", err);
        setErrorLog("Sem permissão para ler 'leads'.");
      });

      const unsubUsers = onSnapshot(usersRef, (snap) => {
        const allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        let filtered = allUsers.filter(u => u.role === 'attendant');
        const myCluster = String(userData?.clusterId || userData?.cluster || "").trim();

        if (myCluster && userData?.role === 'supervisor') {
          filtered = filtered.filter(u => {
            const uCluster = String(u.clusterId || u.cluster || u.regionalId || "").trim();
            return uCluster === myCluster;
          });
        }

        // Diagnóstico se não encontrar ninguém
        if (filtered.length === 0 && allUsers.length > 0 && myCluster) {
           setErrorLog(`Nenhum atendente encontrado para o cluster '${myCluster}'. Total de utilizadores na DB: ${allUsers.length}`);
           setAttendants(allUsers.filter(u => u.role === 'attendant')); // Fallback: mostra todos
        } else {
           setErrorLog(null);
           setAttendants(filtered);
        }
        
        setLoading(false);
      }, (err) => {
        console.error("BI Erro Users:", err);
        setErrorLog("Sem permissão para ler 'users'.");
        setLoading(false);
      });

      return () => { unsubLeads(); unsubUsers(); };
    });
    return () => unsubAuth();
  }, [userData]);

  // --- PROCESSAMENTO DE DADOS (BI) ---
  const currentMonthLeads = useMemo(() => {
    return leads.filter(l => l.date && l.date.startsWith(selectedMonth));
  }, [leads, selectedMonth]);

  // View Global: KPIs
  const globalStats = useMemo(() => {
    // Filtra apenas leads que pertencem aos atendentes do cluster atual
    const validAttendantIds = attendants.map(a => a.id);
    const clusterLeads = currentMonthLeads.filter(l => validAttendantIds.includes(l.attendantId));

    const total = clusterLeads.length;
    const sales = clusterLeads.filter(l => ['Contratado', 'Instalado'].includes(l.status)).length;
    const installed = clusterLeads.filter(l => l.status === 'Instalado').length;
    const conversion = total > 0 ? ((sales / total) * 100).toFixed(1) : 0;
    
    return { total, sales, installed, conversion, clusterLeads };
  }, [currentMonthLeads, attendants]);

  // View Global: Ranking de Cidades
  const storeRanking = useMemo(() => {
    const stores = {};
    globalStats.clusterLeads.forEach(l => {
       const city = l.cityId || 'Sem Unidade';
       if (!stores[city]) stores[city] = { name: city, leads: 0, sales: 0 };
       stores[city].leads++;
       if (['Contratado', 'Instalado'].includes(l.status)) stores[city].sales++;
    });
    return Object.values(stores).sort((a,b) => b.sales - a.sales);
  }, [globalStats.clusterLeads]);

  // View Atendente: Relatório Individual
  const attendantReport = useMemo(() => {
    if (!selectedAttendantId) return null;
    
    const attLeads = currentMonthLeads.filter(l => l.attendantId === selectedAttendantId);
    const attUser = attendants.find(a => a.id === selectedAttendantId);

    const total = attLeads.length;
    const sales = attLeads.filter(l => ['Contratado', 'Instalado'].includes(l.status)).length;
    const conv = total > 0 ? ((sales / total) * 100).toFixed(1) : 0;

    // Mix de Produtos
    const products = {};
    attLeads.filter(l => ['Contratado', 'Instalado'].includes(l.status)).forEach(l => {
      const prodName = l.productName || 'Outro';
      products[prodName] = (products[prodName] || 0) + 1;
    });
    const mixChart = Object.entries(products).map(([name, value]) => ({ name, value }));

    // Histórico Diário
    const dailyMap = {};
    attLeads.forEach(l => {
      const day = l.date.split('-')[2];
      dailyMap[day] = (dailyMap[day] || 0) + 1;
    });
    const dailyChart = Object.entries(dailyMap)
      .map(([day, count]) => ({ day: `${day}`, vendas: count }))
      .sort((a, b) => a.day.localeCompare(b.day));

    return { 
      name: attUser?.name || 'Colaborador', 
      store: attUser?.cityId || 'Unidade não definida',
      total, sales, conv, mixChart, dailyChart 
    };
  }, [selectedAttendantId, currentMonthLeads, attendants]);


  if (loading) return (
    <div style={local.loader}>
      <RefreshCw size={48} className="animate-spin" color={colors.primary} />
      <h3 style={{ color: 'var(--text-muted)', marginTop: '20px' }}>CONSOLIDANDO DADOS ESTRATÉGICOS...</h3>
    </div>
  );

  return (
    <div style={global.container}>
      
      {/* HEADER BI */}
      <div style={local.headerWrapper}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ ...global.iconHeader, background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)' }}>
            <BarChart3 size={32} color="white" />
          </div>
          <div>
            <h1 style={global.title}>Business Intelligence</h1>
            <p style={global.subtitle}>Relatórios de Performance (Cluster {userData?.clusterId || 'Geral'})</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={local.toggleGroup}>
            <button onClick={() => setActiveView('global')} style={activeView === 'global' ? local.toggleBtnActive : local.toggleBtn}>Visão Global</button>
            <button onClick={() => setActiveView('atendente')} style={activeView === 'atendente' ? local.toggleBtnActive : local.toggleBtn}>Por Atendente</button>
          </div>
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={local.input} />
        </div>
      </div>

      {/* PAINEL DE DIAGNÓSTICO */}
      {errorLog && (
        <div style={local.alertBox}>
          <ShieldAlert size={20} />
          <div>
            <strong>Aviso do Sistema:</strong> {errorLog}
          </div>
        </div>
      )}

      {/* ==========================================
          VIEW: GLOBAL (RANKINGS E KPIS DO CLUSTER)
          ========================================== */}
      {activeView === 'global' && (
        <div className="animate-in fade-in slide-in-from-bottom-4">
          
          <div style={local.grid4}>
            <KpiCard title="Leads Captados" value={globalStats.total} icon={Users} color={colors.primary} />
            <KpiCard title="Vendas Brutas" value={globalStats.sales} icon={TrendingUp} color={colors.success} />
            <KpiCard title="Instalados" value={globalStats.installed} icon={Zap} color="#f59e0b" />
            <KpiCard title="Conv. Média" value={`${globalStats.conversion}%`} icon={Target} color="#8b5cf6" />
          </div>

          <div style={{ ...global.card, marginTop: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
               <h3 style={{ ...local.cardTitle, margin: 0 }}><Globe size={18} color={colors.primary}/> Ranking de Lojas (Cluster)</h3>
               <button style={local.btnOutline}><Download size={14}/> Exportar CSV</button>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={local.table}>
                <thead>
                  <tr style={local.thRow}>
                    <th style={local.th}>Unidade / Loja</th>
                    <th style={local.th} style={{textAlign:'center'}}>Leads</th>
                    <th style={local.th} style={{textAlign:'center'}}>Vendas</th>
                    <th style={local.th} style={{textAlign:'right'}}>Conversão</th>
                  </tr>
                </thead>
                <tbody>
                  {storeRanking.map((store, idx) => {
                    const conv = store.leads > 0 ? ((store.sales / store.leads) * 100).toFixed(1) : 0;
                    return (
                      <tr key={idx} style={local.tr}>
                        <td style={{ ...local.td, fontWeight: '800' }}>{store.name}</td>
                        <td style={{ ...local.td, textAlign: 'center', color: 'var(--text-muted)' }}>{store.leads}</td>
                        <td style={{ ...local.td, textAlign: 'center', fontWeight: '900', color: colors.primary }}>{store.sales}</td>
                        <td style={{ ...local.td, textAlign: 'right' }}>
                          <span style={{ padding: '4px 8px', background: conv >= 15 ? '#10b98115' : '#ef444415', color: conv >= 15 ? colors.success : colors.danger, borderRadius: '6px', fontWeight: '900' }}>
                             {conv}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {storeRanking.length === 0 && (
                    <tr><td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum dado de vendas encontrado neste mês para o seu cluster.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}


      {/* ==========================================
          VIEW: POR ATENDENTE (RAIO-X INDIVIDUAL)
          ========================================== */}
      {activeView === 'atendente' && (
        <div className="animate-in fade-in slide-in-from-bottom-4">
          
          <div style={{ ...global.card, marginBottom: '30px', border: `1px solid ${colors.primary}40`, background: 'var(--bg-panel)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ padding: '12px', background: 'var(--bg-app)', borderRadius: '12px' }}><Search size={24} color={colors.primary}/></div>
                <div style={{ flex: 1, minWidth: '250px' }}>
                   <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filtrar Relatório por Atendente</label>
                   <select 
                     style={{ ...local.input, width: '100%', marginTop: '8px' }} 
                     value={selectedAttendantId} 
                     onChange={e => setSelectedAttendantId(e.target.value)}
                   >
                     <option value="">Selecione um consultor ({attendants.length} ativos)...</option>
                     {attendants.map(att => (
                       <option key={att.id} value={att.id}>{att.name} ({att.cityId || 'Sem Unidade'})</option>
                     ))}
                   </select>
                </div>
             </div>
          </div>

          {!selectedAttendantId ? (
            <div style={global.emptyState}>
              <User size={48} color="var(--border)" style={{ marginBottom: '15px' }} />
              <h3 style={{ margin: '0 0 5px 0', color: 'var(--text-main)' }}>Selecione um Atendente</h3>
              <p style={{ margin: 0 }}>Escolha um consultor no menu acima para gerar o relatório individual.</p>
            </div>
          ) : attendantReport && (
            <div className="animate-in slide-in-from-bottom-4">
               
               {/* HERO DO ATENDENTE */}
               <div style={local.profileHero}>
                  <div style={local.avatarLarge}>{attendantReport.name?.[0]}</div>
                  <div>
                    <h2 style={{ fontSize: '28px', fontWeight: '900', color: 'white', margin: 0 }}>{attendantReport.name}</h2>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', margin: '5px 0 0 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <MapPin size={16}/> {attendantReport.store} • Consultor de Vendas
                    </p>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <div style={local.badgeAward}><Award size={16}/> Em Avaliação</div>
                  </div>
               </div>

               {/* KPIS INDIVIDUAIS */}
               <div style={{ ...local.grid4, marginBottom: '30px' }}>
                  <KpiCard title="Leads Tratados" value={attendantReport.total} icon={Users} color={colors.primary} />
                  <KpiCard title="Vendas Fechadas" value={attendantReport.sales} icon={TrendingUp} color={colors.success} />
                  <KpiCard title="Taxa Conversão" value={`${attendantReport.conv}%`} icon={Target} color="#f59e0b" />
                  <KpiCard title="Produtividade" value={Math.min(100, Math.round(attendantReport.sales * 5))} icon={Zap} color="#8b5cf6" />
               </div>

               <div style={local.chartsGrid}>
                  
                  {/* GRÁFICO DIÁRIO */}
                  <div style={global.card}>
                    <h3 style={local.cardTitle}><LineIcon size={18} color={colors.primary}/> Evolução de Fechamentos (Diário)</h3>
                    <div style={{ height: '280px', marginTop: '25px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={attendantReport.dailyChart}>
                          <defs>
                            <linearGradient id="colorV" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3}/>
                              <stop offset="95%" stopColor={colors.primary} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 11}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 11}} />
                          <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-main)' }} />
                          <Area type="monotone" dataKey="vendas" stroke={colors.primary} strokeWidth={3} fillOpacity={1} fill="url(#colorV)" name="Vendas" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* GRÁFICO MIX DE PRODUTOS */}
                  <div style={global.card}>
                    <h3 style={local.cardTitle}><PieIcon size={18} color="#8b5cf6"/> Mix de Produtos (Vendas)</h3>
                    <div style={{ height: '220px', marginTop: '20px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={attendantReport.mixChart.length > 0 ? attendantReport.mixChart : [{ name: 'Sem Vendas', value: 1 }]}
                            cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value"
                          >
                            {attendantReport.mixChart.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={[colors.primary, colors.success, '#f59e0b', '#8b5cf6'][index % 4]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}/>
                        </PieChart>
                      </ResponsiveContainer>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                        {attendantReport.mixChart.map((p, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid var(--border)', paddingBottom: '5px' }}>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>{p.name}</span>
                            <strong style={{ color: 'var(--text-main)' }}>{p.value} un.</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

               </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// --- SUB-COMPONENTES ---
const KpiCard = ({ title, value, icon: Icon, color }) => (
  <div style={{ ...global.card, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
    <div>
      <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
      <div style={{ fontSize: '36px', fontWeight: '900', color: 'var(--text-main)', marginTop: '5px', lineHeight: '1' }}>{value}</div>
    </div>
    <div style={{ padding: '12px', borderRadius: '12px', background: `${color}15`, color: color }}>
      <Icon size={24} />
    </div>
  </div>
);

// --- ESTILOS LOCAIS ---
const local = {
  loader: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-app)' },
  headerWrapper: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', gap: '20px', flexWrap: 'wrap' },
  
  toggleGroup: { background: 'var(--bg-panel)', padding: '5px', borderRadius: '14px', display: 'flex', border: '1px solid var(--border)' },
  toggleBtn: { padding: '10px 20px', border: 'none', background: 'transparent', borderRadius: '10px', fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)', cursor: 'pointer', transition: '0.2s' },
  toggleBtnActive: { padding: '10px 20px', border: 'none', background: 'var(--bg-card)', borderRadius: '10px', fontSize: '13px', fontWeight: '900', color: 'var(--text-brand)', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' },
  
  // FIX: Cores seguras para inputs em modo escuro/claro
  input: { background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '10px 15px', borderRadius: '12px', outline: 'none', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' },
  btnOutline: { background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
  
  alertBox: { background: '#f59e0b15', border: '1px solid #f59e0b40', color: '#f59e0b', padding: '15px 20px', borderRadius: '12px', display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '30px', fontSize: '13px' },
  
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' },
  chartsGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '25px', alignItems: 'start' },
  
  cardTitle: { margin: 0, fontSize: '15px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' },
  
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
  thRow: { borderBottom: '2px solid var(--border)' },
  th: { padding: '15px 10px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '0.05em' },
  tr: { borderBottom: '1px solid var(--border)', transition: 'background 0.2s', ':hover': { background: 'var(--bg-panel)' } },
  td: { padding: '15px 10px', fontSize: '14px', color: 'var(--text-main)' },

  profileHero: { background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '30px', borderRadius: '24px', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.05)' },
  avatarLarge: { width: '80px', height: '80px', borderRadius: '24px', background: colors.primary, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', fontWeight: '900', boxShadow: '0 8px 20px rgba(37, 99, 235, 0.4)' },
  badgeAward: { background: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d', padding: '8px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(245, 158, 11, 0.3)' }
};

// CSS auxiliar
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @media (max-width: 1024px) { .chartsGrid { grid-template-columns: 1fr !important; } }
  `;
  document.head.appendChild(style);
}