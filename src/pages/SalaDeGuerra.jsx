import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  LineChart, Line, ResponsiveContainer, YAxis 
} from 'recharts';
import {
  Flame, Zap, CalendarClock, ChevronRight, MapPin, 
  Calendar, Target, AlertTriangle, Users, Trophy, 
  X, Bell, TrendingDown, TrendingUp, MonitorPlay, 
  Timer, Map, AlertOctagon, Star, Gift, Clock
} from 'lucide-react';

// Importação do Design System
import { styles as global, colors } from '../styles/globalStyles';

export default function SalaDeGuerra({ userData }) {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [leads, setLeads] = useState([]);
  const [cities, setCities] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UX States
  const [tvMode, setTvMode] = useState(false);
  const [drillDown, setDrillDown] = useState(null);
  const [flashSale, setFlashSale] = useState(null);
  // NOVO: Adicionado campo 'reward' (bonificação)
  const [sprint, setSprint] = useState({ active: false, goal: 0, current: 0, deadline: '', reward: '' });
  const [showSprintModal, setShowSprintModal] = useState(false);

  // 1. ESCUTA DE DADOS
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      
      const unsubCities = onSnapshot(collection(db, 'cities'), (snap) => {
        let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (userData?.role === 'supervisor' && userData?.clusterId) {
          list = list.filter(c => String(c.clusterId) === String(userData.clusterId));
        }
        setCities(list);
      });

      const unsubLeads = onSnapshot(collection(db, 'leads'), (snap) => {
        const allLeads = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (leads.length > 0 && allLeads.length > leads.length) {
          const newest = allLeads.sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds)[0];
          if (['Contratado', 'Instalado'].includes(newest.status)) {
            setFlashSale(`🔥 VENDA! ${newest.attendantName?.split(' ')[0]} em ${newest.cityId}!`);
            setTimeout(() => setFlashSale(null), 5000);
          }
        }
        setLeads(allLeads);
        setLoading(false);
      });

      const unsubHols = onSnapshot(collection(db, 'holidays'), (snap) => {
        setHolidays(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      return () => { unsubCities(); unsubLeads(); unsubHols(); };
    });
    return () => unsubAuth();
  }, [userData, leads.length]);

  // --- MOTOR PREDITIVO ---
  const calendar = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    let total = 0, worked = 0;
    const now = new Date();
    for (let i = 1; i <= lastDay; i++) {
      const d = new Date(y, m - 1, i);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      if (!holidays.some(h => h.date === dateStr)) {
        total++;
        if (d <= now) worked++;
      }
    }
    return { total: total || 22, worked: worked || 1, remaining: Math.max(0, total - worked) };
  }, [selectedMonth, holidays]);

  const dashboardData = useMemo(() => {
    const monthLeads = leads.filter(l => l.date?.startsWith(selectedMonth));
    const today = new Date().getDate();

    return cities.map(city => {
      const cityLeads = monthLeads.filter(l => l.cityId === city.name || l.cityId === city.id);
      const sales = cityLeads.filter(l => ['Contratado', 'Instalado'].includes(l.status)).length;
      const installs = cityLeads.filter(l => l.status === 'Instalado').length;
      const goal = city.goalPlanos || 30;
      
      const pace = sales / calendar.worked;
      const projSales = Math.floor(sales + (pace * calendar.remaining));
      
      const recoveryPace = calendar.remaining > 0 ? (Math.max(0, goal - sales) / calendar.remaining).toFixed(1) : 0;
      const backlogAlert = (sales > 5 && (installs / sales) < 0.6) ? "Risco de Cancelamento: Instalação Lenta" : null;

      const trendData = [
        { day: 'D-2', v: cityLeads.filter(l => l.date.endsWith(String(today-2).padStart(2,'0')) && ['Contratado','Instalado'].includes(l.status)).length },
        { day: 'D-1', v: cityLeads.filter(l => l.date.endsWith(String(today-1).padStart(2,'0')) && ['Contratado','Instalado'].includes(l.status)).length },
        { day: 'H', v: cityLeads.filter(l => l.date.endsWith(String(today).padStart(2,'0')) && ['Contratado','Instalado'].includes(l.status)).length }
      ];

      const sellers = {};
      cityLeads.forEach(l => {
        if (!sellers[l.attendantId]) sellers[l.attendantId] = { name: l.attendantName, sales: 0, leads: 0 };
        sellers[l.attendantId].leads++;
        if (['Contratado', 'Instalado'].includes(l.status)) sellers[l.attendantId].sales++;
      });

      return { 
        ...city, sales, installs, goal, projSales, recoveryPace, pace: pace.toFixed(1), backlogAlert, trendData,
        sellers: Object.values(sellers).sort((a,b) => b.sales - a.sales)
      };
    }).sort((a, b) => (b.sales / b.goal) - (a.sales / a.goal));
  }, [cities, leads, calendar, selectedMonth]);

  const clusterStats = useMemo(() => {
    let tGoal = 0, tSales = 0, tProj = 0;
    dashboardData.forEach(c => { tGoal += c.goal; tSales += c.sales; tProj += c.projSales; });
    return { tGoal, tSales, tProj, isAtRisk: tProj < tGoal };
  }, [dashboardData]);

  if (loading) return (
    <div style={local.loader}>
      <Zap size={48} className="animate-pulse" color={colors.primary} />
      <h2 style={{ color: 'var(--text-main)', marginTop: '20px' }}>Preparando Comando Tático...</h2>
    </div>
  );

  return (
    <div style={tvMode ? local.tvRoot : global.container}>
      
      {flashSale && <div style={local.flashToast}><Bell size={20} className="animate-bounce" /> {flashSale}</div>}

      {/* CABEÇALHO */}
      <div style={local.headerWrapper}>
        <div style={local.headerLeft}>
           <div style={local.clusterIcon}><Target size={32} color="white"/></div>
           <div>
              <h1 style={local.clusterTitle}>Comando {userData?.clusterId || 'Geral'}</h1>
              <div style={local.countdownRow}>
                 <CalendarClock size={16} /> <span>Faltam <strong>{calendar.remaining}</strong> dias úteis</span>
              </div>
           </div>
        </div>

        <div style={local.globalProjectionBox}>
           <div style={local.projHeader}>
              <span>PROJEÇÃO GLOBAL DO CLUSTER</span>
              <span style={{ color: clusterStats.isAtRisk ? colors.danger : colors.success }}>
                {clusterStats.isAtRisk ? 'ABAIXO DA META' : 'META ATINGIDA'}
              </span>
           </div>
           <div style={local.projMain}>
              <div style={local.projValues}>
                 <strong style={{ color: clusterStats.isAtRisk ? colors.danger : colors.success }}>{clusterStats.tProj}</strong>
                 <small>/ {clusterStats.tGoal}</small>
              </div>
              <div style={local.globalProgress}>
                 <div style={{ ...local.progressBar, width: `${Math.min((clusterStats.tProj / (clusterStats.tGoal || 1)) * 100, 100)}%`, background: clusterStats.isAtRisk ? colors.danger : colors.success }} />
              </div>
           </div>
        </div>

        <div style={local.headerActions}>
           <button onClick={() => setShowSprintModal(true)} style={local.btnSprint}><Timer size={18}/> Sprint</button>
           <button onClick={() => setTvMode(!tvMode)} style={local.btnTV}><MonitorPlay size={18}/> TV</button>
        </div>
      </div>

      {/* SPRINT BANNER COM PREMIAÇÃO */}
      {sprint.active && (
        <div style={local.sprintBanner}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '15px', borderRadius: '50%' }}>
                 <Timer size={36} className="animate-pulse" color="white" />
              </div>
              <div>
                <strong style={{ fontSize: '24px', letterSpacing: '0.05em', textTransform: 'uppercase', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                  SPRINT ATIVO: {sprint.goal} VENDAS
                </strong>
                <div style={{ display: 'flex', gap: '20px', marginTop: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.9 }}>
                    <Clock size={16}/> Até às {sprint.deadline}
                  </span>
                  {sprint.reward && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fef08a', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                      <Gift size={16}/> Bónus: {sprint.reward}
                    </span>
                  )}
                </div>
              </div>
           </div>
           <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ fontSize: '42px', fontWeight: '900', lineHeight: '1', textShadow: '0 2px 5px rgba(0,0,0,0.3)' }}>
                 {clusterStats.tSales} <span style={{fontSize:'20px', opacity:0.7}}>/ {sprint.goal}</span>
              </div>
              <button onClick={() => setSprint({...sprint, active: false})} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', marginTop: '10px', cursor: 'pointer' }}>Encerrar Sprint</button>
           </div>
        </div>
      )}

      {/* GRID DE CIDADES */}
      <div style={tvMode ? local.tvGrid : local.grid}>
        {dashboardData.map((store, idx) => {
          const isAtRisk = store.projSales < store.goal;
          const statusColor = isAtRisk ? colors.danger : colors.success;

          return (
            <div key={idx} style={{ ...global.card, borderTop: `8px solid ${statusColor}`, transition: '0.3s' }}>
              <div style={local.cardHeader}>
                <div>
                  <h3 style={{ margin: 0, fontSize: tvMode?'24px':'18px', fontWeight: '900', color: tvMode?'white':'var(--text-main)' }}>{store.name}</h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    Tendência 3 Dias: 
                    <div style={{ width: '50px', height: '15px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={store.trendData}>
                          <Line type="monotone" dataKey="v" stroke={statusColor} strokeWidth={2} dot={false} />
                          <YAxis domain={['dataMin', 'dataMax']} hide />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                <div style={{ background: store.isAtRisk ? '#ef444420' : '#10b98120', color: store.isAtRisk ? colors.danger : colors.success, padding: '8px 12px', borderRadius: '10px', fontWeight: '900', fontSize: tvMode?'20px':'14px' }}>
                   {Math.round((store.sales / (store.goal || 1)) * 100)}%
                </div>
              </div>

              <div style={local.projCardBox}>
                 <span style={local.miniLabel}>PROJEÇÃO DE FECHO</span>
                 <div style={{ fontSize: tvMode?'48px':'36px', fontWeight: '900', color: statusColor, lineHeight: '1' }}>
                    {store.projSales} <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>/ {store.goal}</span>
                 </div>
                 
                 {isAtRisk ? (
                   <div style={local.recoveryText}>
                     <AlertTriangle size={14}/> Ritmo necessário: <strong>{store.recoveryPace}/dia</strong>
                   </div>
                 ) : (
                   <div style={local.successText}>
                     <Trophy size={14}/> Meta garantida no ritmo atual!
                   </div>
                 )}
              </div>

              {store.backlogAlert && (
                 <div style={local.backlogAlert}><AlertOctagon size={16}/> {store.backlogAlert}</div>
              )}

              {!tvMode && (
                <div style={local.cardActions}>
                  <button onClick={() => setDrillDown(store)} style={local.btnAction}><Users size={16}/> Raio-X</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL DRILL-DOWN (RAIO-X) */}
      {drillDown && (
        <div style={global.modalOverlay}>
          <div style={{ ...global.modalBox, maxWidth: '600px', background: 'var(--bg-card)' }}>
            <div style={global.modalHeader}>
              <h3 style={{...global.modalTitle, color: 'var(--text-main)'}}>Equipa: {drillDown.name}</h3>
              <button onClick={() => setDrillDown(null)} style={{color: 'var(--text-main)', background:'none', border:'none'}}><X/></button>
            </div>
            <div style={local.table}>
               <div style={local.th}><span>CONSULTOR</span><span>VENDAS</span><span>CONV.</span></div>
               {drillDown.sellers.map((s, i) => (
                 <div key={i} style={local.tr}>
                    <span style={{ fontWeight: '800', color: 'var(--text-main)', display:'flex', gap:8, alignItems: 'center' }}>
                       {i===0 && <Star size={16} color={colors.warning} fill={colors.warning}/>} {s.name}
                    </span>
                    <span style={{ fontWeight: '900', color: colors.primary, fontSize: '16px' }}>{s.sales}</span>
                    <span style={{ fontWeight: 'bold', color: colors.success }}>{((s.sales/s.leads)*100 || 0).toFixed(0)}%</span>
                 </div>
               ))}
               {drillDown.sellers.length === 0 && <p style={{textAlign:'center', color:'var(--text-muted)', padding:'20px'}}>Sem vendas registadas nesta unidade.</p>}
            </div>
          </div>
        </div>
      )}

      {/* MODAL SPRINT (COM BÓNUS) */}
      {showSprintModal && (
        <div style={global.modalOverlay}>
          <div style={{...global.modalBox, background: 'var(--bg-card)'}}>
             <h3 style={{...global.modalTitle, color: 'var(--text-main)'}}>Lançar Sprint Relâmpago</h3>
             <p style={{...global.subtitle, marginBottom: '20px'}}>Incentive a equipa com uma meta de curto prazo.</p>
             
             <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                 <div style={local.field}>
                   <label style={local.label}>Meta de Vendas</label>
                   <input type="number" value={sprint.goal} onChange={e => setSprint({...sprint, goal: e.target.value})} style={local.input} />
                 </div>
                 <div style={local.field}>
                   <label style={local.label}>Horário Limite</label>
                   <input type="time" value={sprint.deadline} onChange={e => setSprint({...sprint, deadline: e.target.value})} style={local.input} />
                 </div>
               </div>
               
               {/* NOVO CAMPO DE PREMIAÇÃO */}
               <div style={local.field}>
                 <label style={local.label}><Gift size={14} style={{verticalAlign: 'middle', marginRight: '5px'}}/> Bonificação / Prémio</label>
                 <input 
                   type="text" 
                   placeholder="Ex: Rodízio de Pizzas, Vale R$ 100..." 
                   value={sprint.reward} 
                   onChange={e => setSprint({...sprint, reward: e.target.value})} 
                   style={local.input} 
                 />
               </div>

               <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                 <button onClick={() => setShowSprintModal(false)} style={{ flex: 1, padding: '15px', borderRadius: '12px', background: 'var(--bg-panel)', color: 'var(--text-main)', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Cancelar</button>
                 <button onClick={() => { setSprint({...sprint, active: true}); setShowSprintModal(false); }} style={{ flex: 2, background: colors.warning, color: '#ffffff', border: 'none', padding: '15px', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}>
                   ATIVAR SPRINT
                 </button>
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

const local = {
  loader: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' },
  headerWrapper: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px', gap: '30px', flexWrap: 'wrap' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '20px' },
  clusterIcon: { width: '64px', height: '64px', background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  clusterTitle: { fontSize: '32px', fontWeight: '900', color: 'var(--text-main)', margin: 0 },
  countdownRow: { display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' },
  
  globalProjectionBox: { flex: 1, minWidth: '350px', background: 'var(--bg-panel)', padding: '20px 25px', borderRadius: '24px', border: '1px solid var(--border)' },
  projHeader: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '900', letterSpacing: '0.05em', marginBottom: '12px', color: 'var(--text-muted)' },
  projValues: { display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '10px' },
  globalProgress: { width: '100%', height: '12px', background: 'var(--bg-app)', borderRadius: '6px', overflow: 'hidden' },
  progressBar: { height: '100%', transition: '1s ease-in-out' },
  
  headerActions: { display: 'flex', gap: '12px' },
  btnSprint: { background: colors.warning, color: '#ffffff', border: 'none', padding: '12px 20px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', gap: '8px', boxShadow: '0 4px 15px rgba(245,158,11,0.3)' },
  btnTV: { background: 'var(--bg-panel)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '12px 20px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', gap: '8px' },

  // Estilo renovado para o Banner do Sprint
  sprintBanner: { background: 'linear-gradient(90deg, #b91c1c 0%, #ef4444 100%)', padding: '25px 40px', borderRadius: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', color: '#ffffff', boxShadow: '0 15px 35px rgba(239,68,68,0.4)', border: '2px solid #fca5a5' },
  flashToast: { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: colors.primary, color: '#ffffff', padding: '15px 30px', borderRadius: '50px', fontWeight: '900', zIndex: 10000, display: 'flex', gap: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' },
  
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  sparklineBox: { width: '60px', height: '20px', marginTop: '5px' },
  statusBadge: { padding: '6px 12px', borderRadius: '10px', fontSize: '14px', fontWeight: '900' },
  projCardBox: { background: 'var(--bg-app)', padding: '20px', borderRadius: '18px', border: '1px solid var(--border)', marginBottom: '15px', textAlign: 'center' },
  miniLabel: { fontSize: '10px', fontWeight: '900', color: 'var(--text-muted)', display: 'block', marginBottom: '5px', letterSpacing: '0.05em' },
  recoveryText: { color: colors.danger, fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginTop: '10px' },
  successText: { color: colors.success, fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', marginTop: '10px' },
  backlogAlert: { background: '#f59e0b15', color: colors.warning, padding: '10px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', display: 'flex', gap: '8px', marginBottom: '15px' },
  
  cardActions: { display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid var(--border)' },
  btnAction: { width: '100%', background: 'var(--bg-panel)', border: '1px solid var(--border)', padding: '12px', borderRadius: '10px', color: 'var(--text-brand)', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '8px', transition: '0.2s' },

  field: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' },
  input: { background: 'var(--bg-app)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '14px', borderRadius: '12px', outline: 'none', fontSize: '15px', fontWeight: 'bold' },

  table: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' },
  th: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '900', color: 'var(--text-muted)', padding: '0 10px' },
  tr: { display: 'flex', justifyContent: 'space-between', padding: '15px 10px', borderBottom: '1px solid var(--border)', alignItems: 'center' }
};

// Injetar animações CSS na página
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes bounceIn {
      0% { transform: translate(-50%, -100%); opacity: 0; }
      60% { transform: translate(-50%, 10%); opacity: 1; }
      100% { transform: translate(-50%, 0); }
    }
  `;
  document.head.appendChild(style);
}