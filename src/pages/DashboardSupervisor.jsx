import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { 
  Store, Users, TrendingUp, Zap, AlertCircle, 
  RefreshCw, Activity, MapPin, Flame, FileCheck, 
  Megaphone, Target, ShieldAlert, Calendar, Clock,
  CheckCircle2, FileText, UserCheck, ListChecks, Wallet
} from 'lucide-react';
import { colors } from '../styles/globalStyles';

export default function DashboardSupervisor({ userData, setActiveView }) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ lojas: 0, consultores: 0, vendasMes: 0, alertasRh: 0 });
  
  // Estados para a Gestão Diária
  const [rhPendentes, setRhPendentes] = useState([]);
  const [faltasHoje, setFaltasHoje] = useState([]);
  const [rotinas, setRotinas] = useState([
    { id: 1, title: 'Conferência de Vendas', desc: 'Validar contratos lançados ontem no sistema', done: false },
    { id: 2, title: 'Ponto Tangerino', desc: 'Validar atrasos e justificar faltas da equipa', done: false },
    { id: 3, title: 'Alinhamento Matinal', desc: 'Check-in de alinhamento e metas com os gerentes', done: false }
  ]);

  const myCluster = String(userData?.clusterId || userData?.cluster || '').trim();

  const carregarDados = async () => {
    if (!auth.currentUser || !myCluster) return;
    setLoading(true);
    
    try {
      // 1. Busca Lojas da Regional
      let qCities = collection(db, "cities");
      if (myCluster) qCities = query(qCities, where("clusterId", "==", myCluster));
      const citySnap = await getDocs(qCities);
      
      // 2. Busca Consultores da Regional
      const userSnap = await getDocs(collection(db, "users"));
      const consultores = userSnap.docs.filter(d => {
        const data = d.data();
        return String(data.role).toLowerCase().includes('atend') && 
               String(data.clusterId || data.cluster || '').trim() === myCluster;
      });
      
      // 3. Vendas do Mês Atual (Regional)
      const hoje = new Date();
      const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
      const dataHojeStr = hoje.toISOString().split('T')[0];
      
      let vendas = 0;
      try {
        const qLeads = query(collection(db, "leads"), where("date", ">=", `${mesAtual}-01`), where("date", "<=", `${mesAtual}-31`));
        const leadsSnap = await getDocs(qLeads);
        // Filtra as vendas apenas da regional do supervisor
        const leadsRegional = leadsSnap.docs.filter(d => String(d.data().clusterId || d.data().cluster || '').trim() === myCluster);
        vendas = leadsRegional.filter(d => ['Contratado', 'Instalado'].includes(d.data().status)).length;
      } catch (e) { console.warn("Aviso Leads:", e); }

      // 4. Pedidos de RH Pendentes (Para este Supervisor)
      let rhData = [];
      try {
        const qRh = query(collection(db, "rh_requests"), where("supervisorId", "==", auth.currentUser.uid));
        const rhSnap = await getDocs(qRh);
        rhData = rhSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.status === 'Pendente');
      } catch (e) { console.warn("Aviso RH:", e); }

      // 5. Faltas de Hoje (Na Regional)
      let faltasData = [];
      try {
        let qFaltas = collection(db, "absences");
        if (myCluster) qFaltas = query(qFaltas, where("clusterId", "==", myCluster));
        const faltasSnap = await getDocs(qFaltas);
        faltasData = faltasSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(f => f.startDate <= dataHojeStr && f.endDate >= dataHojeStr);
      } catch (e) { console.warn("Aviso Faltas:", e); }

      setStats({ lojas: citySnap.size, consultores: consultores.length, vendasMes: vendas, alertasRh: rhData.length });
      setRhPendentes(rhData);
      setFaltasHoje(faltasData);

    } catch (err) { 
      console.error("Erro ao carregar KPIs do Supervisor:", err); 
    }
    setLoading(false);
  };

  useEffect(() => { carregarDados(); }, [userData]);

  // Formatação de data e meta
  const dataAtual = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const metaRegional = stats.lojas > 0 ? stats.lojas * 30 : 100; // Meta baseada no n.º de lojas da regional
  const percentualMeta = metaRegional > 0 ? Math.min(Math.round((stats.vendasMes / metaRegional) * 100), 100) : 0;

  const toggleRotina = (id) => {
    setRotinas(rotinas.map(r => r.id === id ? { ...r, done: !r.done } : r));
  };

  return (
    <div className="animated-view" style={{ paddingBottom: '40px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* 1. CABEÇALHO IMERSIVO */}
      <div style={styles.heroBanner}>
        <div style={styles.heroContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', opacity: 0.9 }}>
            <Calendar size={16} />
            <span style={{ fontSize: '13px', fontWeight: '600', textTransform: 'capitalize' }}>{dataAtual}</span>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '900', margin: '0 0 5px 0', letterSpacing: '-0.02em' }}>
            Olá, {userData?.name?.split(' ')[0] || 'Supervisor'}! 👋
          </h1>
          <p style={{ fontSize: '15px', margin: 0, opacity: 0.9 }}>Visão Estratégica da {myCluster || 'Sua Regional'}</p>
        </div>
        <button onClick={carregarDados} style={styles.heroRefreshBtn} title="Atualizar Dashboard">
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* 2. KPIs GLOBAIS DA REGIONAL */}
      <div style={styles.kpiGrid}>
        <MetricCard title="Vendas da Regional" value={stats.vendasMes} sub="Fechadas este mês" color={colors?.success || colors.success} icon={TrendingUp} />
        <MetricCard title="Lojas Ativas" value={stats.lojas} sub="Na sua área de gestão" color={colors?.primary || colors.primary} icon={Store} />
        <MetricCard title="Consultores" value={stats.consultores} sub="Equipa de Vendas" color={colors?.purple || colors.purple} icon={Users} />
        <MetricCard title="Avisos RH" value={stats.alertasRh} sub="Pendentes de Ação" color={stats.alertasRh > 0 ? (colors?.danger || colors.danger) : (colors?.warning || colors.warning)} icon={ShieldAlert} />
      </div>

      {/* 3. PERFORMANCE DO MÊS (Pacing de Vendas) */}
      <div style={styles.progressSection}>
        <div style={styles.progressHeader}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={20} color={colors?.primary || colors.primary} /> Pacing de Vendas ({myCluster || 'Sua Regional'})
          </h3>
          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' }}>
            {stats.vendasMes} / <span style={{ color: 'var(--text-main)' }}>{metaRegional} Meta</span>
          </span>
        </div>
        <div style={styles.progressBarBg}>
          <div style={{ ...styles.progressBarFill, width: `${percentualMeta}%`, background: percentualMeta >= 100 ? (colors?.success || colors.success) : (colors?.primary || colors.primary) }} />
        </div>
        <p style={{ margin: '10px 0 0 0', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', textAlign: 'right' }}>
          {percentualMeta}% do objetivo alcançado
        </p>
      </div>

      {/* 4. GESTÃO DIÁRIA (RH, FALTAS E ROTINAS) */}
      <div style={styles.dailyManagementGrid}>
        
        {/* Coluna Esquerda: RH e Faltas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card: Solicitações de RH */}
          <div style={styles.cardPanel}>
            <h3 style={styles.cardHeaderTitle}><FileText size={18} color={colors?.primary || colors.primary} /> SOLICITAÇÕES DE RH</h3>
            {rhPendentes.length === 0 ? (
              <div style={styles.emptyStateBox}>
                <FileCheck size={24} color="var(--border)" style={{ marginBottom: '10px' }} />
                <span>A sua caixa de entrada de RH está vazia. Excelente trabalho!</span>
              </div>
            ) : (
              <div style={styles.listContainer}>
                {rhPendentes.slice(0, 3).map((rh, i) => (
                  <div key={i} style={styles.listItem}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '13px', color: 'var(--text-main)' }}>{rh.attendantName || 'Colaborador'}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{rh.type} • Aguardando aprovação</span>
                    </div>
                    <button onClick={() => setActiveView('rh_requests')} style={styles.btnAcaoList}>Analisar</button>
                  </div>
                ))}
                {rhPendentes.length > 3 && <div style={{ fontSize: '11px', textAlign: 'center', color: 'var(--text-brand)', cursor: 'pointer', marginTop: '10px' }} onClick={() => setActiveView('rh_requests')}>Ver mais {rhPendentes.length - 3} pedidos...</div>}
              </div>
            )}
          </div>

          {/* Card: Faltas e Escala */}
          <div style={styles.cardPanel}>
            <h3 style={styles.cardHeaderTitle}><UserCheck size={18} color={colors?.success || colors.success} /> FALTAS E ESCALA</h3>
            {faltasHoje.length === 0 ? (
              <div style={{ ...styles.emptyStateBox, background: colors.successLight, color: colors.success, border: '1px solid #a7f3d0' }}>
                <CheckCircle2 size={24} color=colors.success style={{ marginBottom: '10px' }} />
                <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Cobertura Completa</strong>
                <span style={{ fontSize: '12px' }}>A sua equipa iniciou a operação sem baixas reportadas hoje.</span>
              </div>
            ) : (
              <div style={styles.listContainer}>
                {faltasHoje.map((falta, i) => (
                  <div key={i} style={{ ...styles.listItem, borderLeft: `3px solid ${colors.danger}` }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '13px', color: 'var(--text-main)' }}>{falta.attendantName || 'Colaborador'}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ausente hoje ({falta.cityId || 'Sem Loja'})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita: Rotinas Operacionais */}
        <div style={styles.cardPanel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ ...styles.cardHeaderTitle, marginBottom: 0 }}><ListChecks size={18} color={colors?.warning || colors.warning} /> ROTINAS OPERACIONAIS</h3>
            <span style={{ fontSize: '11px', color: 'var(--text-brand)', fontWeight: 'bold', cursor: 'pointer' }}>Minha Rotina</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {rotinas.map(rotina => (
              <div 
                key={rotina.id} 
                onClick={() => toggleRotina(rotina.id)}
                style={{ ...styles.routineCheckItem, background: rotina.done ? 'var(--bg-app)' : 'var(--bg-card)', opacity: rotina.done ? 0.6 : 1 }}
              >
                <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${rotina.done ? (colors?.success || colors.success) : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: rotina.done ? (colors?.success || colors.success) : 'transparent', transition: '0.2s' }}>
                  {rotina.done && <CheckCircle2 size={14} color="white" />}
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '14px', color: 'var(--text-main)', textDecoration: rotina.done ? 'line-through' : 'none' }}>{rotina.title}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{rotina.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 5. MENU RÁPIDO (ACESSOS RÁPIDOS) */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={styles.sectionHeaderShortcut}>Sistemas Oquei</h3>
        <div style={styles.shortcutGrid}>
          <ShortcutCard title="HubOquei Radar" icon={Zap} color={colors?.cyan || colors.info} onClick={() => setActiveView('hub_oquei')} />
          <ShortcutCard title="Painel de Vendas" icon={TrendingUp} color={colors?.success || colors.success} onClick={() => setActiveView('vendas')} />
          <ShortcutCard title="Sala de Guerra" icon={Flame} color={colors?.danger || colors.danger} onClick={() => setActiveView('war_room')} />
          <ShortcutCard title="Caixa Local" icon={Wallet} color={colors?.success || colors.success} onClick={() => setActiveView('desencaixe')} />
        </div>
      </div>

      <div>
        <h3 style={styles.sectionHeaderShortcut}>Gestão de Equipa</h3>
        <div style={styles.shortcutGrid}>
          <ShortcutCard title="Faltas e Escala" icon={AlertCircle} color={colors?.danger || colors.danger} onClick={() => setActiveView('faltas')} />
          <ShortcutCard title="Aprovações de RH" icon={FileCheck} color={colors?.warning || colors.warning} onClick={() => setActiveView('rh_requests')} />
          <ShortcutCard title="Banco de Horas" icon={Clock} color={colors?.warning || colors.warning} onClick={() => setActiveView('banco_horas')} />
          <ShortcutCard title="Comunicados" icon={Megaphone} color={colors?.primary || colors.primary} onClick={() => setActiveView('comunicados')} />
        </div>
      </div>

      <style>{`
        @keyframes fadeInView { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animated-view { animation: fadeInView 0.4s ease forwards; }
        .shortcut-card:hover { transform: translateY(-4px); box-shadow: 0 12px 25px rgba(0,0,0,0.06); border-color: var(--text-brand) !important; }
      `}</style>
    </div>
  );
}

// ==========================================
// SUB-COMPONENTES UI
// ==========================================
const MetricCard = ({ title, value, sub, color, icon: Icon }) => (
  <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', borderTop: `4px solid ${color}`, boxShadow: 'var(--shadow-sm)', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: '-15px', right: '-15px', opacity: 0.05, transform: 'rotate(-15deg)' }}>
      <Icon size={100} color={color} />
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px', position: 'relative', zIndex: 2 }}>
       <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
       <div style={{ background: `${color}15`, padding: '8px', borderRadius: '10px' }}>
         <Icon size={18} color={color} />
       </div>
    </div>
    <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--text-main)', lineHeight: 1, position: 'relative', zIndex: 2 }}>{value}</div>
    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: '600', position: 'relative', zIndex: 2 }}>{sub}</div>
  </div>
);

const ShortcutCard = ({ title, icon: Icon, color, onClick }) => (
  <div onClick={onClick} className="shortcut-card" style={styles.shortcutCard}>
    <div style={{ ...styles.shortcutIconWrapper, background: `${color}15`, color: color }}>
      <Icon size={20} />
    </div>
    <h4 style={styles.shortcutTitle}>{title}</h4>
  </div>
);

// ==========================================
// ESTILOS LOCAIS
// ==========================================
const styles = {
  heroBanner: { 
    background: `linear-gradient(135deg, ${colors?.purple || colors.purple} 0%, #4c1d95 100%)`, // Um tom mais roxo para diferenciar da Master
    borderRadius: '24px', padding: '35px 40px', display: 'flex', justifyContent: 'space-between', 
    alignItems: 'flex-start', color: '#ffffff', marginBottom: '30px', boxShadow: '0 10px 30px rgba(139, 92, 246, 0.2)'
  },
  heroContent: { flex: 1 },
  heroRefreshBtn: { background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '12px', borderRadius: '14px', color: '#ffffff', cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'background 0.2s' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' },
  
  progressSection: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '25px', marginBottom: '30px', boxShadow: 'var(--shadow-sm)' },
  progressHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  progressBarBg: { height: '12px', background: 'var(--bg-app)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)' },
  progressBarFill: { height: '100%', transition: 'width 1s cubic-bezier(0.22, 1, 0.36, 1)' },

  dailyManagementGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '40px' },
  cardPanel: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', padding: '25px', boxShadow: 'var(--shadow-sm)' },
  cardHeaderTitle: { margin: '0 0 20px 0', fontSize: '13px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.05em' },
  
  emptyStateBox: { padding: '30px 20px', background: 'var(--bg-app)', border: '1px dashed var(--border)', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' },
  listContainer: { display: 'flex', flexDirection: 'column', gap: '10px' },
  listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '12px' },
  btnAcaoList: { background: 'white', border: '1px solid var(--border)', color: 'var(--text-brand)', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', boxShadow: 'var(--shadow-sm)' },
  
  routineCheckItem: { display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', border: '1px solid var(--border)', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' },

  sectionHeaderShortcut: { fontSize: '14px', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px', borderBottom: '2px solid var(--border)', paddingBottom: '10px' },
  shortcutGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' },
  shortcutCard: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '15px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: 'var(--shadow-sm)' },
  shortcutIconWrapper: { padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  shortcutTitle: { fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }
};