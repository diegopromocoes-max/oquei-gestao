import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { 
  Store, UserPlus, TrendingUp, Zap, AlertCircle, 
  RefreshCw, Activity, MapPin, Flame, FileCheck, 
  Megaphone, Target, ShieldAlert, Calendar, Clock,
  CheckCircle2, FileText, UserCheck, ListChecks
} from 'lucide-react';
import { colors } from '../styles/globalStyles';

export default function DashboardCoordenador({ userData, setActiveView }) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ cidades: 0, supervisores: 0, vendasMes: 0, alertasRh: 0 });
  
  // Novos estados para a Gestão Diária
  const [rhPendentes, setRhPendentes] = useState([]);
  const [faltasHoje, setFaltasHoje] = useState([]);
  const [rotinas, setRotinas] = useState([
    { id: 1, title: 'Conferência de Vendas', desc: 'Validar contratos lançados ontem', done: false },
    { id: 2, title: 'Ponto Tangerino', desc: 'Validar atrasos da equipa', done: false },
    { id: 3, title: 'Alinhamento Matinal', desc: 'Check-in rápido com os gerentes de loja', done: false }
  ]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const citySnap = await getDocs(collection(db, "cities"));
      const userSnap = await getDocs(collection(db, "users"));
      const supervisores = userSnap.docs.filter(d => String(d.data().role).toLowerCase().includes('superv'));
      
      const hoje = new Date();
      const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
      const dataHojeStr = hoje.toISOString().split('T')[0];
      
      // 1. Vendas Globais do Mês
      let vendas = 0;
      try {
        const qLeads = query(collection(db, "leads"), where("date", ">=", `${mesAtual}-01`), where("date", "<=", `${mesAtual}-31`));
        const leadsSnap = await getDocs(qLeads);
        vendas = leadsSnap.docs.filter(d => ['Contratado', 'Instalado'].includes(d.data().status)).length;
      } catch (e) { console.warn("Aviso Leads:", e); }

      // 2. Pedidos de RH Pendentes
      let rhData = [];
      try {
        const qRh = query(collection(db, "rh_requests"), where("status", "==", "Pendente"));
        const rhSnap = await getDocs(qRh);
        rhData = rhSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) { console.warn("Aviso RH:", e); }

      // 3. Faltas de Hoje
      let faltasData = [];
      try {
        const qFaltas = query(collection(db, "absences"), where("startDate", "<=", dataHojeStr));
        const faltasSnap = await getDocs(qFaltas);
        faltasData = faltasSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(f => f.endDate >= dataHojeStr);
      } catch (e) { console.warn("Aviso Faltas:", e); }

      setStats({ cidades: citySnap.size, supervisores: supervisores.length, vendasMes: vendas, alertasRh: rhData.length });
      setRhPendentes(rhData);
      setFaltasHoje(faltasData);

    } catch (err) { 
      console.error("Erro ao carregar KPIs:", err); 
    }
    setLoading(false);
  };

  useEffect(() => { carregarDados(); }, []);

  const dataAtual = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const metaGlobal = stats.cidades > 0 ? stats.cidades * 30 : 500; 
  const percentualMeta = metaGlobal > 0 ? Math.min(Math.round((stats.vendasMes / metaGlobal) * 100), 100) : 0;

  const toggleRotina = (id) => {
    setRotinas(rotinas.map(r => r.id === id ? { ...r, done: !r.done } : r));
  };

  return (
<div className="animated-view" style={{ paddingBottom: '40px', width: '100%' }}>
        
      {/* 1. CABEÇALHO IMERSIVO */}
      <div style={styles.heroBanner}>
        <div style={styles.heroContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', opacity: 0.9 }}>
            <Calendar size={16} />
            <span style={{ fontSize: '13px', fontWeight: '600', textTransform: 'capitalize' }}>{dataAtual}</span>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '900', margin: '0 0 5px 0', letterSpacing: '-0.02em' }}>
            Olá, {userData?.name?.split(' ')[0] || 'Gestor'}! 👋
          </h1>
          <p style={{ fontSize: '15px', margin: 0, opacity: 0.9 }}>Visão Master da Operação Oquei Telecom</p>
        </div>
        <button onClick={carregarDados} style={styles.heroRefreshBtn} title="Atualizar Dashboard">
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* 2. KPIs GLOBAIS E PERFORMANCE */}
      <div style={styles.kpiGrid}>
        <MetricCard title="Vendas Globais" value={stats.vendasMes} sub="Fechadas este mês" color={colors?.success || colors.success} icon={TrendingUp} />
        <MetricCard title="Lojas Ativas" value={stats.cidades} sub="Unidades na Rede" color={colors?.primary || colors.primary} icon={Store} />
        <MetricCard title="Gestores" value={stats.supervisores} sub="Supervisores Ativos" color={colors?.purple || colors.purple} icon={UserPlus} />
        <MetricCard title="Avisos RH" value={stats.alertasRh} sub="Pendentes de Ação" color={stats.alertasRh > 0 ? (colors?.danger || colors.danger) : (colors?.warning || colors.warning)} icon={ShieldAlert} />
      </div>

      <div style={styles.progressSection}>
        <div style={styles.progressHeader}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={20} color={colors?.primary || colors.primary} /> Pacing de Vendas (Rede Global)
          </h3>
          <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-muted)' }}>
            {stats.vendasMes} / <span style={{ color: 'var(--text-main)' }}>{metaGlobal} Meta</span>
          </span>
        </div>
        <div style={styles.progressBarBg}>
          <div style={{ ...styles.progressBarFill, width: `${percentualMeta}%`, background: percentualMeta >= 100 ? (colors?.success || colors.success) : (colors?.primary || colors.primary) }} />
        </div>
        <p style={{ margin: '10px 0 0 0', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', textAlign: 'right' }}>
          {percentualMeta}% do objetivo alcançado
        </p>
      </div>

      {/* 3. GESTÃO DIÁRIA (RH, FALTAS E ROTINAS) */}
      <div style={styles.dailyManagementGrid}>
        
        {/* Coluna Esquerda: RH e Faltas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card: Solicitações de RH */}
          <div style={styles.cardPanel}>
            <h3 style={styles.cardHeaderTitle}><FileText size={18} color={colors?.primary || colors.primary} /> SOLICITAÇÕES DE RH</h3>
            {rhPendentes.length === 0 ? (
              <div style={styles.emptyStateBox}>
                <FileCheck size={24} color="var(--border)" style={{ marginBottom: '10px' }} />
                <span>A caixa de entrada de RH está vazia. Excelente trabalho!</span>
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
                <CheckCircle2 size={24} color={colors.success} style={{ marginBottom: '10px' }} />
                <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Cobertura Completa</strong>
                <span style={{ fontSize: '12px' }}>A operação global iniciou sem baixas reportadas hoje.</span>
              </div>
            ) : (
              <div style={styles.listContainer}>
                {faltasHoje.map((falta, i) => (
                  <div key={i} style={{ ...styles.listItem, borderLeft: `3px solid ${colors.danger}` }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '13px', color: 'var(--text-main)' }}>{falta.attendantName || 'Colaborador'}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ausente hoje ({falta.clusterId || 'Sem Loja'})</span>
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
            <span style={{ fontSize: '11px', color: 'var(--text-brand)', fontWeight: 'bold', cursor: 'pointer' }}>Editar Rotinas</span>
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

      {/* 4. ACESSOS RÁPIDOS E FERRAMENTAS */}
      <div style={{ marginBottom: '40px' }}>
        <h3 style={styles.sectionHeaderShortcut}>Sistemas de Inteligência</h3>
        <div style={styles.shortcutGrid}>
          <ShortcutCard title="HubOquei Radar" icon={Zap} color={colors?.cyan || colors.info} onClick={() => setActiveView('hub_oquei')} />
          <ShortcutCard title="Laboratório Churn" icon={Activity} color={colors?.purple || colors.purple} onClick={() => setActiveView('churn')} />
          <ShortcutCard title="Sala de Guerra" icon={Flame} color={colors?.danger || colors.danger} onClick={() => setActiveView('war_room')} />
          <ShortcutCard title="Painel de Vendas" icon={TrendingUp} color={colors?.success || colors.success} onClick={() => setActiveView('vendas')} />
        </div>
      </div>

      <div>
        <h3 style={styles.sectionHeaderShortcut}>Administração e Estrutura</h3>
        <div style={styles.shortcutGrid}>
          <ShortcutCard title="Gestão de Estrutura" icon={MapPin} color={colors?.primary || colors.primary} onClick={() => setActiveView('estrutura')} />
          <ShortcutCard title="Gestão de Equipa" icon={UserPlus} color={colors?.primary || colors.primary} onClick={() => setActiveView('admin_supervisores')} />
          <ShortcutCard title="Aprovações de RH" icon={FileCheck} color={colors?.warning || colors.warning} onClick={() => setActiveView('rh_requests')} />
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
    background: `linear-gradient(135deg, ${colors?.primary || colors.primary} 0%, #1e40af 100%)`, 
    borderRadius: '24px', padding: '35px 40px', display: 'flex', justifyContent: 'space-between', 
    alignItems: 'flex-start', color: '#ffffff', marginBottom: '30px', boxShadow: '0 10px 30px rgba(37, 99, 235, 0.2)'
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