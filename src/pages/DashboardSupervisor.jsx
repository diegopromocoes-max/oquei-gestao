import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { 
  TrendingUp, Target, ShieldCheck, Wallet, FileCheck, User, ListTodo, 
  Flame, ChevronRight, Activity, Clock, CalendarDays, AlertCircle, 
  RefreshCw, CheckCircle2, Megaphone, Plus, Trash2, Check, X, Bell
} from 'lucide-react';

export default function DashboardSupervisor({ userData, setActiveView }) {
  const [loading, setLoading] = useState(true);
  const [pendingAbsences, setPendingAbsences] = useState([]);
  const [pendingRH, setPendingRH] = useState([]); 
  const [userReady, setUserReady] = useState(false);

  // Notificações personalizadas (Toasts)
  const [toast, setToast] = useState(null);

  // Estado das Rotinas Diárias
  const [routines, setRoutines] = useState([
    { id: '1', title: 'Conferência de Vendas', sub: 'Validar contratos lançados ontem', done: false },
    { id: '2', title: 'Ponto Tangerino', sub: 'Validar atrasos da equipa', done: false },
    { id: '3', title: 'Alinhamento Matinal', sub: 'Check-in rápido com os gerentes de loja', done: false }
  ]);
  const [isEditingRoutines, setIsEditingRoutines] = useState(false);
  const [newRoutine, setNewRoutine] = useState({ title: '', sub: '' });

  // Meta do Cluster (Exemplo)
  const statsMeta = { realizado: 14, total: 20 };

  // Saudação Dinâmica
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const firstName = userData?.name ? userData.name.split(' ')[0] : 'Supervisor';
  const clusterName = userData?.clusterName || userData?.cluster || 'Regional Principal';

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

  // Ações de Rotina
  const showNotification = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleRoutine = (id) => {
    setRoutines(routines.map(r => r.id === id ? { ...r, done: !r.done } : r));
    const routine = routines.find(r => r.id === id);
    if (!routine.done) showNotification(`Rotina "${routine.title}" concluída!`);
  };

  const addRoutine = () => {
    if (!newRoutine.title) return;
    setRoutines([...routines, { id: Date.now().toString(), title: newRoutine.title, sub: newRoutine.sub, done: false }]);
    setNewRoutine({ title: '', sub: '' });
    showNotification("Nova rotina adicionada com sucesso!");
  };

  const deleteRoutine = (id) => {
    setRoutines(routines.filter(r => r.id !== id));
  };


  if (loading) return (
    <div style={styles.loadingBox}>
      <RefreshCw size={32} color="var(--text-brand)" className="animate-spin" />
      <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Sincronizando Radar da {clusterName}...</span>
    </div>
  );

  return (
    <div style={styles.container}>
      
      {/* TOAST DE NOTIFICAÇÃO */}
      {toast && (
        <div style={styles.toastBox}>
          <CheckCircle2 size={18} /> {toast}
        </div>
      )}

      {/* HEADER TÁTICO */}
      <div style={styles.headerBox}>
        <div>
          <h2 style={styles.title}>{greeting}, {firstName}!</h2>
          <div style={styles.subtitleRow}>
             <span style={styles.badgeZinc}>Comando {clusterName}</span>
             <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>O seu resumo operacional de hoje.</span>
          </div>
        </div>
        <div style={styles.headerActions}>
           <button onClick={() => setActiveView('vendas')} style={styles.btnSecondary}>
             <TrendingUp size={16} /> Relatório BI
           </button>
           <button onClick={() => setActiveView('war_room')} style={styles.btnDanger}>
             <Flame size={16} /> Sala de Guerra
           </button>
        </div>
      </div>

      {/* AGENDA EM DESTAQUE NO TOPO */}
      <div style={{ ...styles.card, marginBottom: '30px', borderLeft: '4px solid #8b5cf6' }}>
         <div style={{ ...styles.cardHeader, background: 'transparent', borderBottom: 'none', paddingBottom: 0 }}>
            <h3 style={styles.cardTitle}><CalendarDays size={18} color="#8b5cf6"/> Agenda do Dia</h3>
            <button onClick={() => setActiveView('reunioes')} style={styles.btnLink}>Abrir Calendário</button>
         </div>
         <div style={{ padding: '20px 24px' }}>
            <div style={styles.agendaEmptyRow}>
               <CalendarDays size={24} color="var(--border)" />
               <span>Agenda livre. Não existem reuniões ou compromissos marcados para hoje.</span>
            </div>
         </div>
      </div>

      {/* KPIS DE COMANDO COM ANIMAÇÃO */}
      <div style={styles.kpiGrid}>
        <MetricCard index={0} title="Instalações" current={statsMeta.realizado} goal={statsMeta.total} sub={`Faltam ${statsMeta.total - statsMeta.realizado} para a meta`} color="#10b981" />
        <MetricCard index={1} title="Ritmo Diário" current="4.2" goal="4.8" sub="Média requerida: 4.8" color="#2563eb" />
        <MetricCard index={2} title="Crescimento Base" current="+45" goal={null} sub="Clientes líquidos este mês" color="#10b981" icon={<TrendingUp size={14} color="#10b981"/>} />
        <MetricCard index={3} title="Pendências RH" current={pendingRH.length} goal={null} sub="Aguardando a sua análise" color="#f59e0b" />
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
                    <span>A caixa de entrada de RH está vazia. Excelente trabalho!</span>
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
                       <span style={styles.successSub}>A operação na {clusterName} iniciou sem baixas reportadas hoje.</span>
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

        {/* COLUNA 2: AÇÕES DE ROTINA */}
        <div style={styles.column}>
           <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}><ListTodo size={18} color="#f59e0b"/> Rotinas Operacionais</h3>
                <button onClick={() => setIsEditingRoutines(true)} style={styles.btnLink}>Editar Rotinas</button>
              </div>
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 {routines.map(routine => (
                    <div 
                      key={routine.id} 
                      onClick={() => toggleRoutine(routine.id)}
                      style={{
                        ...styles.routineItemBox,
                        borderColor: routine.done ? '#10b981' : 'var(--border)',
                        background: routine.done ? '#10b98110' : 'var(--bg-app)',
                        opacity: routine.done ? 0.7 : 1
                      }}
                    >
                      <div style={{...styles.checkbox, background: routine.done ? '#10b981' : 'transparent', borderColor: routine.done ? '#10b981' : 'var(--border)' }}>
                        {routine.done && <Check size={12} color="white" />}
                      </div>
                      <div style={{ flex: 1, textDecoration: routine.done ? 'line-through' : 'none' }}>
                         <div style={{ fontSize: '14px', fontWeight: 'bold', color: routine.done ? '#10b981' : 'var(--text-main)' }}>{routine.title}</div>
                         <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{routine.sub}</div>
                      </div>
                    </div>
                 ))}
                 {routines.length === 0 && (
                   <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhuma rotina configurada.</span>
                 )}
              </div>
           </div>
        </div>

      </div>

      {/* MODAL: EDITAR ROTINAS */}
      {isEditingRoutines && (
        <div style={styles.modalOverlay}>
           <div style={styles.modalBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                 <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '18px' }}>Personalizar Rotinas</h3>
                 <button onClick={() => setIsEditingRoutines(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20}/></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '25px', maxHeight: '300px', overflowY: 'auto' }}>
                 {routines.map(r => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-app)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                       <div>
                          <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>{r.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.sub}</div>
                       </div>
                       <button onClick={() => deleteRoutine(r.id)} style={{ background: '#ef444415', border: 'none', color: '#ef4444', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={16}/></button>
                    </div>
                 ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 <strong style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ADICIONAR NOVA ROTINA</strong>
                 <input 
                   placeholder="Título da rotina (ex: Verificar Ponto)" 
                   value={newRoutine.title} 
                   onChange={e => setNewRoutine({...newRoutine, title: e.target.value})}
                   style={styles.inputModal} 
                 />
                 <input 
                   placeholder="Descrição ou detalhe rápido" 
                   value={newRoutine.sub} 
                   onChange={e => setNewRoutine({...newRoutine, sub: e.target.value})}
                   style={styles.inputModal} 
                 />
                 <button onClick={addRoutine} style={styles.btnAddRoutine}>
                    <Plus size={16}/> Adicionar Rotina à Lista
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}

// --- SUBCOMPONENTE DE KPI COM ANIMAÇÕES ---
const MetricCard = ({ title, current, goal, sub, color, icon, index }) => {
  const percentage = goal ? Math.min((current / goal) * 100, 100) : 0;
  
  // Estado para Animação da Barra de Progresso
  const [barWidth, setBarWidth] = useState(0);
  
  // Estado para Animação do Número (Count Up)
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    // 1. Inicia o enchimento da barra após a montagem do card (delay do stagger)
    const barTimer = setTimeout(() => {
      setBarWidth(percentage);
    }, 300 + (index * 100)); // Espera o card aparecer + offset do index

    // 2. Lógica para animar o número (mesmo que contenha +, ., etc)
    const match = String(current).match(/^([^\d\-]*)?(-?\d+(\.\d+)?)(.*)?$/);
    
    // Se não for um formato que dê para extrair número, exibe normal
    if (!match) {
      setDisplayValue(current);
      return () => clearTimeout(barTimer);
    }
    
    const prefix = match[1] || '';
    const targetNum = parseFloat(match[2]);
    const suffix = match[4] || '';
    const isFloat = match[2].includes('.');
    const duration = 1200; // 1.2 segundos para a contagem
    
    let startTime = null;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Curva de Easing (Desaceleração suave no fim)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentNum = targetNum * easeOutQuart;
      
      if (progress < 1) {
        setDisplayValue(`${prefix}${isFloat ? currentNum.toFixed(1) : Math.floor(currentNum)}${suffix}`);
        animationFrame = requestAnimationFrame(animate);
      } else {
        setDisplayValue(current); // Garante o valor exato no fim
      }
    };

    // Atraso sincronizado com o surgimento do card para iniciar a contagem
    const delayTimer = setTimeout(() => {
      animationFrame = requestAnimationFrame(animate);
    }, index * 100);

    return () => {
      clearTimeout(barTimer);
      clearTimeout(delayTimer);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [current, percentage, index]);

  return (
    <div 
      className="kpi-card" 
      style={{
        ...styles.metricCard,
        animation: `slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards`,
        animationDelay: `${index * 0.1}s`,
        opacity: 0 // Começa invisível para a animação controlar
      }}
    >
       <span style={styles.metricLabel}>{title}</span>
       <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          {icon && icon}
          <span style={{...styles.metricValue, color: color === '#10b981' && !goal ? color : 'var(--text-main)'}}>
            {displayValue}
          </span>
          {goal && <span style={styles.metricGoal}>/ {goal}</span>}
       </div>
       {goal && (
         <div style={styles.progressBg}>
            {/* A largura é atualizada via State, acionando o CSS de transition */}
            <div style={{ ...styles.progressFill, width: `${barWidth}%`, backgroundColor: color }} />
         </div>
       )}
       {!goal && <div style={{marginTop: '20px'}}></div>}
       <span style={styles.metricSub}>{sub}</span>
    </div>
  );
};


// --- ESTILOS RESPONSIVOS E ADAPTÁVEIS AO DARK MODE ---
const styles = {
  container: { paddingBottom: '40px', width: '100%', position: 'relative' },
  
  loadingBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '20px' },
  
  headerBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '25px', marginBottom: '25px' },
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
  
  // Agenda
  agendaEmptyRow: { display: 'flex', alignItems: 'center', gap: '15px', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 'bold' },

  // KPI Card
  metricCard: { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-sm)' },
  metricLabel: { fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  metricValue: { fontSize: '32px', fontWeight: '900', lineHeight: 1, fontVariantNumeric: 'tabular-nums' },
  metricGoal: { fontSize: '14px', fontWeight: 'bold', color: 'var(--text-muted)' },
  progressBg: { width: '100%', height: '8px', backgroundColor: 'var(--bg-app)', borderRadius: '4px', marginTop: '20px', overflow: 'hidden' },
  // Usando cubic-bezier para um preenchimento super natural tipo Apple
  progressFill: { height: '100%', borderRadius: '4px', transition: 'width 1.2s cubic-bezier(0.22, 1, 0.36, 1)' },
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

  // Rotinas (Checklist)
  routineItemBox: { display: 'flex', gap: '15px', alignItems: 'center', padding: '15px', borderRadius: '12px', border: '1px solid', cursor: 'pointer', transition: '0.2s' },
  checkbox: { width: '20px', height: '20px', borderRadius: '6px', border: '2px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' },

  // Modal e UI Customizada
  toastBox: { position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: '#10b981', color: 'white', padding: '12px 24px', borderRadius: '50px', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 9999, boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)', animation: 'slideDown 0.3s ease-out' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalBox: { background: 'var(--bg-card)', padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '450px', border: '1px solid var(--border)', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' },
  inputModal: { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '13px', outline: 'none' },
  btnAddRoutine: { width: '100%', padding: '12px', background: 'var(--bg-primary-light)', color: 'var(--text-brand)', border: '1px dashed var(--text-brand)', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: '0.2s' }
};

// CSS de Animações Globais para o Dashboard
if (typeof document !== 'undefined') {
  const styleId = 'dash-sup-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      @keyframes slideDown {
        from { transform: translate(-50%, -20px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }
      @keyframes slideUpFade {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .kpi-card {
        transition: transform 0.2s ease, box-shadow 0.2s ease !important;
      }
      .kpi-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 25px rgba(0,0,0,0.08) !important;
      }
    `;
    document.head.appendChild(style);
  }
}