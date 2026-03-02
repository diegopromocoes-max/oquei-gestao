import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  query 
} from 'firebase/firestore';
import { 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { 
  TrendingUp, Download, Calendar, BarChart3, 
  PieChart as PieIcon, LineChart as LineIcon,
  ArrowUpRight, ArrowDownRight, Globe, Users, Target,
  User, Award, Zap, Search, MapPin, RefreshCw, FileText
} from 'lucide-react';

// IMPORTAÇÃO DOS ESTILOS GLOBAIS
import { styles as global, colors } from '../styles/globalStyles';

// CONFIGURAÇÃO DE AMBIENTE (Sandbox vs Produção)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

export default function RelatoriosBI({ userData }) {
  const [activeView, setActiveView] = useState('global');
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);
  const [attendants, setAttendants] = useState([]);
  const [selectedAttendantId, setSelectedAttendantId] = useState('');
  const [user, setUser] = useState(null);

  // 1. REGRA 3 - Autenticação Obrigatória antes de qualquer Query
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (!auth.currentUser) {
          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
          } else {
            await signInAnonymously(auth);
          }
        }
      } catch (err) {
        console.error("BI: Falha na autenticação silenciosa", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // 2. REGRA 1 e 2 - Caminhos Seguros e Filtragem em Memória (JS)
  useEffect(() => {
    if (!user) return; // Só busca se houver user logado (Regra 3)

    setLoading(true);

    // NOTA PARA PRODUÇÃO: Se estiver no PC da empresa com DB real, 
    // os caminhos abaixo devem ser apenas 'leads' e 'users'.
    // Para o Preview funcionar, usamos o prefixo mandatório artifacts:
    const leadsRef = collection(db, 'artifacts', appId, 'public', 'data', 'leads');
    const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');

    // Escuta Leads em Tempo Real (Regra 2 - Sem filtros complexos no Firebase)
    const unsubLeads = onSnapshot(leadsRef, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      console.log("BI: Leads carregados do banco:", docs.length);
      setLeads(docs);
      setLoading(false);
    }, (err) => {
      console.error("BI: Erro de permissão em Leads. Verifique o caminho no Firestore.", err);
      setLoading(false);
    });

    // Escuta Usuários para popular filtro de Atendentes
    const unsubUsers = onSnapshot(usersRef, (snap) => {
      const allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Filtragem por Cluster no JavaScript (Regra 2)
      let list = allUsers.filter(u => u.role === 'attendant');
      
      if (userData?.role === 'supervisor' && userData?.clusterId) {
        list = list.filter(att => {
          const attCluster = att.clusterId || att.cluster || att.regionalId;
          return String(attCluster) === String(userData.clusterId);
        });
      }
      
      console.log("BI: Atendentes filtrados para o supervisor:", list.length);
      setAttendants(list);
    }, (err) => console.error("BI: Erro de permissão em Usuários.", err));

    return () => {
      unsubLeads();
      unsubUsers();
    };
  }, [user, userData]);

  // --- PROCESSAMENTO DE DADOS (Business Intelligence Logic) ---
  const currentMonthLeads = useMemo(() => {
    return leads.filter(l => l.date && l.date.startsWith(selectedMonth));
  }, [leads, selectedMonth]);

  const globalStats = useMemo(() => {
    const total = currentMonthLeads.length;
    const sales = currentMonthLeads.filter(l => ['Contratado', 'Instalado'].includes(l.status)).length;
    const installed = currentMonthLeads.filter(l => l.status === 'Instalado').length;
    const conversion = total > 0 ? ((sales / total) * 100).toFixed(1) : 0;
    return { total, sales, installed, conversion };
  }, [currentMonthLeads]);

  const attendantReport = useMemo(() => {
    if (!selectedAttendantId) return null;
    const attLeads = currentMonthLeads.filter(l => l.attendantId === selectedAttendantId);
    const attUser = attendants.find(a => a.id === selectedAttendantId);

    const total = attLeads.length;
    const sales = attLeads.filter(l => ['Contratado', 'Instalado'].includes(l.status)).length;
    const conv = total > 0 ? ((sales / total) * 100).toFixed(1) : 0;

    const products = {};
    attLeads.filter(l => ['Contratado', 'Instalado'].includes(l.status)).forEach(l => {
      products[l.productName] = (products[l.productName] || 0) + 1;
    });
    const mixChart = Object.entries(products).map(([name, value]) => ({ name, value }));

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
      store: attUser?.cityId || 'N/A',
      total, sales, conv, mixChart, dailyChart 
    };
  }, [selectedAttendantId, currentMonthLeads, attendants]);

  if (loading || !user) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '20px' }}>
      <RefreshCw size={32} color="var(--text-brand)" className="animate-spin" />
      <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 'bold' }}>CONECTANDO AO BANCO DE DADOS...</span>
    </div>
  );

  return (
    <div style={global.container}>
      
      {/* HEADER BI */}
      <div style={global.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ ...global.iconHeader, background: colors.primary }}>
            <BarChart3 size={28} color="white" />
          </div>
          <div>
            <h1 style={global.title}>Business Intelligence</h1>
            <p style={global.subtitle}>Relatórios Consolidados de Performance.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={local.toggleGroup}>
            <button onClick={() => setActiveView('global')} style={activeView === 'global' ? local.toggleBtnActive : local.toggleBtn}>Visão Global</button>
            <button onClick={() => setActiveView('atendente')} style={activeView === 'atendente' ? local.toggleBtnActive : local.toggleBtn}>Por Atendente</button>
          </div>
          <div style={global.searchBox}>
            <Calendar size={18} color="var(--text-muted)" />
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={global.searchInput} />
          </div>
        </div>
      </div>

      {activeView === 'global' ? (
        <div style={{ animation: 'fadeIn 0.4s' }}>
          <div style={{ ...global.grid4, marginBottom: '30px' }}>
            <KpiCard title="Leads Captados" value={globalStats.total} icon={Users} color={colors.primary} />
            <KpiCard title="Vendas Brutas" value={globalStats.sales} icon={TrendingUp} color={colors.success} />
            <KpiCard title="Instalados" value={globalStats.installed} icon={Zap} color="#f59e0b" />
            <KpiCard title="Conversão" value={`${globalStats.conversion}%`} icon={Target} color="#8b5cf6" />
          </div>

          <div style={global.card}>
            <h3 style={local.cardTitle}><Globe size={18} color={colors.primary}/> Performance por Unidade (Cluster {userData?.clusterId || 'Geral'})</h3>
            <div style={{ overflowX: 'auto', marginTop: '20px' }}>
              <table style={local.table}>
                <thead>
                  <tr style={local.thRow}>
                    <th style={local.th}>Unidade</th>
                    <th style={local.th}>Leads</th>
                    <th style={local.th}>Vendas</th>
                    <th style={local.th}>Conversão</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(new Set(currentMonthLeads.map(l => l.cityId))).map(storeName => {
                    const storeLeads = currentMonthLeads.filter(l => l.cityId === storeName);
                    const salesCount = storeLeads.filter(l => ['Contratado', 'Instalado'].includes(l.status)).length;
                    const rate = storeLeads.length > 0 ? ((salesCount / storeLeads.length) * 100).toFixed(1) : 0;
                    return (
                      <tr key={storeName} style={local.tr}>
                        <td style={local.td}><strong>{storeName}</strong></td>
                        <td style={local.td}>{storeLeads.length}</td>
                        <td style={local.td}>{salesCount}</td>
                        <td style={local.td}>{rate}%</td>
                      </tr>
                    );
                  })}
                  {currentMonthLeads.length === 0 && <tr><td colSpan="4" style={{padding: '30px', textAlign:'center', color:'var(--text-muted)'}}>Nenhum dado encontrado para este mês.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ animation: 'fadeIn 0.4s' }}>
          <div style={{ ...global.card, marginBottom: '30px', borderStyle: 'dashed' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ padding: '12px', background: 'var(--bg-app)', borderRadius: '12px' }}><Search size={24} color="var(--text-brand)"/></div>
                <div style={{ flex: 1 }}>
                   <label style={global.label}>Análise Individual - Atendentes do Cluster {userData?.clusterId}:</label>
                   <select 
                     style={{ ...global.select, marginTop: '8px' }} 
                     value={selectedAttendantId} 
                     onChange={e => setSelectedAttendantId(e.target.value)}
                   >
                     <option value="">Selecione um colaborador ({attendants.length} ativos)</option>
                     {attendants.map(att => (
                       <option key={att.id} value={att.id}>{att.name} ({att.cityId || 'Sem Loja'})</option>
                     ))}
                   </select>
                </div>
             </div>
          </div>

          {!selectedAttendantId ? (
            <div style={global.emptyState}>
              <User size={48} color="var(--border)" style={{ marginBottom: '15px' }} />
              <p>Selecione um atendente para ver o raio-x de performance.</p>
            </div>
          ) : attendantReport && (
            <div style={{ animation: 'fadeInUp 0.4s ease-out' }}>
               <div style={local.profileHero}>
                  <div style={local.avatarLarge}>{attendantReport.name?.[0]}</div>
                  <div>
                    <h2 style={{ ...global.title, color: 'white' }}>{attendantReport.name}</h2>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginTop: '4px' }}>
                      <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }}/> {attendantReport.store} • Consultor de Vendas
                    </p>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <div style={local.badgeAward}><Award size={14}/> Top Performance</div>
                  </div>
               </div>

               <div style={{ ...global.grid4, marginBottom: '30px' }}>
                  <KpiCard title="Leads" value={attendantReport.total} icon={Users} color={colors.primary} />
                  <KpiCard title="Vendas" value={attendantReport.sales} icon={TrendingUp} color={colors.success} />
                  <KpiCard title="Conversão" value={`${attendantReport.conv}%`} icon={Target} color="#f59e0b" />
                  <KpiCard title="Vendas/Dia" value={(attendantReport.sales / 22).toFixed(1)} icon={Zap} color="#8b5cf6" />
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', flexWrap: 'wrap' }}>
                  <div style={global.card}>
                    <h3 style={local.cardTitle}><LineIcon size={18} color={colors.primary}/> Produtividade Diária (Contratos)</h3>
                    <div style={{ height: '300px', marginTop: '25px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={attendantReport.dailyChart}>
                          <defs>
                            <linearGradient id="colorBI" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3}/>
                              <stop offset="95%" stopColor={colors.primary} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                          <XAxis dataKey="day" tick={{fill: 'var(--text-muted)', fontSize: 10}} axisLine={false} tickLine={false} />
                          <YAxis tick={{fill: 'var(--text-muted)', fontSize: 10}} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                          <Area type="monotone" dataKey="vendas" stroke={colors.primary} strokeWidth={3} fill="url(#colorBI)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div style={global.card}>
                    <h3 style={local.cardTitle}><PieIcon size={18} color="#8b5cf6"/> Mix de Produtos</h3>
                    <div style={{ height: '240px', marginTop: '20px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={attendantReport.mixChart.length > 0 ? attendantReport.mixChart : [{ name: 'Sem Vendas', value: 1 }]}
                            cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value"
                          >
                            {attendantReport.mixChart.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={[colors.primary, colors.success, '#f59e0b', '#8b5cf6'][index % 4]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
               </div>
               
               <div style={{ display:'flex', gap:'15px', marginTop:'30px' }}>
                  <button style={{ ...global.btnSecondary, flex: 1 }}><FileText size={18}/> Ver Histórico de Feedbacks</button>
                  <button style={{ ...global.btnPrimary, flex: 1, background: colors.primary }}><Download size={18}/> Exportar Relatório PDF</button>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- AUXILIARES ---
const KpiCard = ({ title, value, icon: Icon, color }) => (
  <div style={global.card}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <span style={{ fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{title}</span>
        <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--text-main)', marginTop: '5px' }}>{value}</div>
      </div>
      <div style={{ padding: '12px', borderRadius: '12px', background: `${color}15`, color: color }}>
        <Icon size={22} />
      </div>
    </div>
  </div>
);

const local = {
  toggleGroup: { background: 'var(--bg-panel)', padding: '4px', borderRadius: '12px', display: 'flex', border: '1px solid var(--border)' },
  toggleBtn: { padding: '8px 16px', border: 'none', background: 'transparent', borderRadius: '8px', fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)', cursor: 'pointer', transition: '0.2s' },
  toggleBtnActive: { padding: '8px 16px', border: 'none', background: 'var(--bg-card)', borderRadius: '8px', fontSize: '13px', fontWeight: '800', color: 'var(--text-brand)', cursor: 'pointer' },
  cardTitle: { margin: 0, fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thRow: { borderBottom: '1px solid var(--border)' },
  th: { textAlign: 'left', padding: '15px', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '15px', fontSize: '14px', color: 'var(--text-main)' },
  profileHero: { background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '30px', borderRadius: '24px', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '25px', border: '1px solid rgba(255,255,255,0.05)' },
  avatarLarge: { width: '70px', height: '70px', borderRadius: '22px', background: 'var(--text-brand)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '900' },
  badgeAward: { background: '#f59e0b15', color: '#f59e0b', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }
};