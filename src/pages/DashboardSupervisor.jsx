import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { 
  TrendingUp, Target, ShieldCheck, Wallet, FileCheck, User, ListTodo, 
  Flame, ChevronRight, Activity, Clock, CalendarDays, AlertCircle, 
  RefreshCw, CheckCircle2, Megaphone 
} from 'lucide-react';

export default function DashboardSupervisor({ userData, setActiveView }) {
  const [loading, setLoading] = useState(true);
  const [pendingAbsences, setPendingAbsences] = useState([]);
  const [pendingRH, setPendingRH] = useState([]); 
  const [userReady, setUserReady] = useState(false);

  // Meta do Cluster (Exemplo / Mock inicial)
  const statsMeta = { realizado: 14, total: 20 };

  // 1. Confirmação de Auth
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      if (user) setUserReady(true);
    });
    return () => unsubAuth();
  }, []);

  // 2. Escutas em Tempo Real
  useEffect(() => {
    if (!userReady || !userData?.clusterId) return;

    const unsubList = [];

    const qAbs = query(collection(db, "absences"), where("status", "==", "Pendente"));
    const unsubAbs = onSnapshot(qAbs, (snap) => {
      const today = new Date().toLocaleDateString('en-CA');
      const filtered = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(abs => abs.clusterId === userData.clusterId && abs.endDate >= today);
      setPendingAbsences(filtered);
    });
    unsubList.push(unsubAbs);

    const qRH = query(collection(db, "rh_requests"), where("status", "==", "Pendente"));
    const unsubRH = onSnapshot(qRH, (snap) => {
      const filtered = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(req => req.clusterId === userData.clusterId);
      setPendingRH(filtered);
    });
    unsubList.push(unsubRH);

    setLoading(false);
    return () => unsubList.forEach(unsub => unsub());
  }, [userReady, userData]);

  if (loading) return (
    <div style={styles.loadingBox}>
      <RefreshCw size={32} color="var(--text-muted)" className="animate-spin" />
      <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Sincronizando Radar...</span>
    </div>
  );

  return (
    <div style={styles.container}>
      
      {/* HEADER TÁTICO */}
      <div style={styles.headerBox}>
        <div>
          <h2 style={styles.title}>Visão Geral do Cluster</h2>
          <div style={styles.subtitleRow}>
             <span style={styles.badgeZinc}>Regional {userData?.clusterId}</span>
             <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Monitorização em tempo real das unidades.</span>
          </div>
        </div>
        <div style={styles.headerActions}>
           <button onClick={() => setActiveView('vendas')} style={styles.btnSecondary}>
             <TrendingUp size={16} /> Ver Relatório
           </button>
           <button onClick={() => setActiveView('war_room')} style={styles.btnDanger}>
             <Flame size={16} /> Sala de Guerra
           </button>
        </div>
      </div>

      {/* KPIS DE COMANDO */}
      <div style={styles.kpiGrid}>
        <MetricCard title="Instalações" current={statsMeta.realizado} goal={statsMeta.total} sub={`Faltam ${statsMeta.total - statsMeta.realizado} para a meta`} color="#10b981" />
        <MetricCard title="Ritmo Diário" current="4.2" goal="4.8" sub="Média requerida: 4.8" color="#2563eb" />
        <MetricCard title="Pendências RH" current={pendingRH.length} goal={null} sub="Aguardando análise" color="#f59e0b" />
        <MetricCard title="Desencaixe Caixa" current="R$ 145" goal={null} sub="Auditoria pendente" color="#8b5cf6" />
      </div>

      {/* CENTRO DE OPERAÇÕES */}
      <div style={styles.mainGrid}>
        
        {/* COLUNA 1: INBOX E ESCALA */}
        <div style={styles.column}>
          
          <div style={styles.card}>
            <div style={styles.cardHeader}>
               <h3 style={styles.cardTitle}><FileCheck size={18} color="#2563eb" /> Solicitações de RH</h3>
               {pendingRH.length > 0 && <span style={styles.badgeBlue}>{pendingRH.length} Novos</span>}
            </div>
            <div style={styles.cardBody}>
               {pendingRH.length === 0 ? (
                 <div style={styles.emptyState}>
                    <FileCheck size={32} color="var(--border)" style={{ marginBottom: '16px' }} />
                    <span>Nenhuma solicitação pendente na caixa de entrada.</span>
                 </div>
               ) : (
                 <div style={styles.listContainer}>
                   {pendingRH.map((req, idx) => (
                     <div key={req.id} style={{...styles.listItem, borderBottom: idx === pendingRH.length - 1 ? 'none' : '1px solid var(--border)'}}>
                        <div style={styles.listLeft}>
                           <div style={styles.avatarBlue}>{req.attendantName?.[0] || 'U'}</div>
                           <div>
                              <div style={styles.itemName}>{req.attendantName}</div>
                              <div style={styles.itemMeta}>
                                 <span>{req.storeId}</span>
                                 <span style={{ color: 'var(--border)' }}>•</span>
                                 <span style={styles.badgeMini}>{req.type}</span>
                              </div>
                           </div>
                        </div>
                        <button onClick={() => setActiveView('rh_requests')} style={styles.btnActionSmall}>Ver <ChevronRight size={16}/></button>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </div>

          <div style={styles.card}>
             <div style={styles.cardHeader}>
               <h3 style={styles.cardTitle}><User size={18} color="#10b981" /> Faltas e Escala</h3>
            </div>
            <div style={{ padding: '24px' }}>
               {pendingAbsences.length === 0 ? (
                 <div style={styles.successBox}>
                    <CheckCircle2 size={24} color="#10b981" />
                    <div>
                       <span style={styles.successTitle}>Cobertura Completa</span>
                       <span style={styles.successSub}>Todas as lojas reportaram presença normal hoje.</span>
                    </div>
                 </div>
               ) : (
                 <div style={styles.alertGrid}>
                   {pendingAbsences.map((abs) => (
                     <div key={abs.id} style={styles.alertBox}>
                        <div>
                          <div style={styles.alertTitle}>{abs.storeId}</div>
                          <div style={styles.alertSub}>Ausência: {abs.attendantName?.split(' ')[0]}</div>
                        </div>
                        <button onClick={() => setActiveView('faltas')} style={styles.btnResolve}>Gerir</button>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* COLUNA 2: PROTOCOLOS E AGENDA */}
        <div style={styles.column}>
           
           <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}><ListTodo size={18} color="#f59e0b"/> Ações de Rotina</h3>
              </div>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                 <RoutineBox title="Conferência de Caixa" sub="Auditoria semanal" color="#6366f1" />
                 <RoutineBox title="Ponto Tangerino" sub="Validar atrasos" color="#f59e0b" />
                 <RoutineBox title="Alinhamento" sub="Check-in com as lojas" color="#10b981" />
              </div>
           </div>

           <div style={styles.card}>
              <div style={styles.cardHeader}>
                 <h3 style={styles.cardTitle}><CalendarDays size={18} color="#8b5cf6"/> Agenda</h3>
                 <button onClick={() => setActiveView('reunioes')} style={styles.btnLink}>Ver calendário</button>
              </div>
              <div style={styles.emptyState}>
                 <CalendarDays size={32} color="var(--border)" style={{ marginBottom: '10px' }} />
                 <span>Sem eventos programados para hoje.</span>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}

// --- SUBCOMPONENTES AUXILIARES ---
const MetricCard = ({ title, current, goal, sub, color }) => {
  const percentage = goal ? Math.min((current / goal) * 100, 100) : 0;
  return (
    <div style={styles.metricCard}>
       <span style={styles.metricLabel}>{title}</span>
       <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={styles.metricValue}>{current}</span>
          {goal && <span style={styles.metricGoal}>/ {goal}</span>}
       </div>
       {goal && (
         <div style={styles.progressBg}>
            <div style={{ ...styles.progressFill, width: `${percentage}%`, backgroundColor: color }} />
         </div>
       )}
       {!goal && <div style={{marginTop: '20px'}}></div>}
       <span style={styles.metricSub}>{sub}</span>
    </div>
  );
};

const RoutineBox = ({ title, sub, color }) => (
  <div style={styles.routineBox}>
     <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
     <div>
        <div style={styles.routineTitle}>{title}</div>
        <div style={styles.routineSub}>{sub}</div>
     </div>
  </div>
);

// --- ESTILOS RESPONSIVOS E ADAPTÁVEIS AO DARK MODE ---
const styles = {
  container: { paddingBottom: '40px', animation: 'fadeIn 0.4s ease-out', width: '100%' },
  
  loadingBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '20px' },
  
  headerBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '25px', marginBottom: '30px' },
  title: { fontSize: '28px', fontWeight: '900', color: 'var(--text-main)', margin: '0 0 10px 0', letterSpacing: '-0.02em' },
  subtitleRow: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  badgeZinc: { padding: '4px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-badge)', border: '1px solid var(--border)', color: 'var(--text-badge)', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' },
  
  headerActions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  btnSecondary: { backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border)', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-sm)', transition: 'background 0.2s' },
  btnDanger: { backgroundColor: '#ef4444', color: '#ffffff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.2)', transition: 'transform 0.2s' },
  
  // Grelhas
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' },
  mainGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' },
  column: { display: 'flex', flexDirection: 'column', gap: '24px' },

  // Cards Base
  card: { backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' },
  cardHeader: { padding: '20px 24px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-panel)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' },
  cardBody: { padding: '0' },
  
  // KPI Card
  metricCard: { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-sm)' },
  metricLabel: { fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  metricValue: { fontSize: '32px', fontWeight: '900', color: 'var(--text-main)', lineHeight: 1 },
  metricGoal: { fontSize: '14px', fontWeight: 'bold', color: 'var(--text-muted)' },
  progressBg: { width: '100%', height: '8px', backgroundColor: 'var(--bg-app)', borderRadius: '4px', marginTop: '20px', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: '4px', transition: 'width 1s ease' },
  metricSub: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px', fontWeight: '600' },

  // Listas
  listContainer: { display: 'flex', flexDirection: 'column' },
  listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', backgroundColor: 'transparent' },
  listLeft: { display: 'flex', alignItems: 'center', gap: '15px' },
  avatarBlue: { width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--bg-primary-light)', color: 'var(--text-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '14px', border: '1px solid var(--border)' },
  itemName: { fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)' },
  itemMeta: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' },
  badgeMini: { backgroundColor: 'var(--bg-app)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', border: '1px solid var(--border)' },
  badgeBlue: { backgroundColor: 'var(--bg-primary-light)', color: 'var(--text-brand)', padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '900', border: '1px solid var(--border)' },

  // Botões
  btnActionSmall: { backgroundColor: 'transparent', color: 'var(--text-brand)', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' },
  btnLink: { backgroundColor: 'transparent', border: 'none', color: 'var(--text-brand)', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' },
  btnResolve: { backgroundColor: 'var(--bg-danger-light)', color: '#ef4444', border: '1px solid var(--border-danger)', padding: '6px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', transition: 'background 0.2s' },

  // Alertas e Feedback
  emptyState: { padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', textAlign: 'center' },
  successBox: { backgroundColor: 'var(--bg-success-light)', border: '1px solid var(--border-success)', padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '15px' },
  successTitle: { display: 'block', fontSize: '14px', fontWeight: '800', color: '#10b981' },
  successSub: { fontSize: '12px', color: '#059669', marginTop: '4px', display: 'block' },
  
  alertGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' },
  alertBox: { backgroundColor: 'var(--bg-danger-light)', border: '1px solid var(--border-danger)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  alertTitle: { fontSize: '14px', fontWeight: 'bold', color: '#ef4444' },
  alertSub: { fontSize: '12px', color: '#b91c1c', marginTop: '4px' },

  // Rotinas
  routineBox: { display: 'flex', gap: '15px', alignItems: 'center', padding: '12px', backgroundColor: 'var(--bg-app)', borderRadius: '12px', border: '1px solid var(--border)' },
  routineTitle: { fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)' },
  routineSub: { fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }
};